/**
 * Build NEW product catalog entries from openFDA — no hand-typed clinical numbers.
 *
 * You give only the product IDENTITY (id, brand, the brand token to search, the
 * ingredient set it should contain, and the solid dose form). The tool finds the
 * matching OTC SKU deterministically (fda-lib selectSku) and EXTRACTS every number
 * — per-unit strengths, units/dose, max/24h — verbatim from that openFDA label,
 * then prints a ready-to-paste products.json entry plus a DailyMed citation. It
 * writes nothing: a pharmacist checks the entry against the DailyMed link, then it
 * is pasted into products.json with verify:false. No LLM touches the numbers (D22).
 *
 * Run: npx tsx scripts/fda-add.ts            (all specs below)
 *      npx tsx scripts/fda-add.ts advil-pm   (one)
 */
import {
  words,
  selectSku,
  strengthOf,
  unitsPerDose,
  maxUnitsPerDay,
  fetchCandidates,
  recognizedIngredients,
} from "./fda-lib";

/** IDENTITY only — no strengths/limits. Those are extracted from the label. */
interface Spec {
  id: string;
  brand: string;
  primaryToken: string; // openFDA brand search token (single strong word)
  ingredients: string[]; // expected active-ingredient keys (identity, verified)
  doseForm: string;
  category: string;
  core?: boolean;
}

const SPECS: Spec[] = [
  { id: "advil-pm", brand: "Advil PM", primaryToken: "advil",
    ingredients: ["ibuprofen", "diphenhydramine"], doseForm: "caplet", category: "pm-combo" },
  { id: "aleve-pm", brand: "Aleve PM", primaryToken: "aleve",
    ingredients: ["naproxen", "diphenhydramine"], doseForm: "caplet", category: "pm-combo" },
  { id: "theraflu-severe", brand: "Theraflu Severe Cold", primaryToken: "theraflu",
    ingredients: ["acetaminophen", "dextromethorphan", "phenylephrine"], doseForm: "packet", category: "cold-flu" },
  { id: "goodys-powder", brand: "Goody's Extra Strength Headache Powder", primaryToken: "goody",
    ingredients: ["acetaminophen", "aspirin", "caffeine"], doseForm: "packet", category: "analgesic" },
  { id: "robitussin-dm", brand: "Robitussin DM", primaryToken: "robitussin",
    ingredients: ["guaifenesin", "dextromethorphan"], doseForm: "liquid", category: "cold-flu" },
];

async function build(spec: Spec) {
  const expected = new Set(spec.ingredients);
  const candidates = await fetchCandidates(spec.primaryToken);
  const label = selectSku(candidates, spec.brand, expected, spec.primaryToken, spec.doseForm);
  console.log(`\n## ${spec.id}  (${spec.brand})`);
  if (!label) {
    console.log(`  ⚠️ no OTC SKU whose ingredient set == {${spec.ingredients.join(", ")}} — adjust token/set/form`);
    return;
  }
  const openfda = (label.openfda as { brand_name?: string[]; manufacturer_name?: string[] }) ?? {};
  const fdaBrand = openfda.brand_name?.[0] ?? "(unnamed)";
  const company = openfda.manufacturer_name?.[0] ?? "";
  const setId = (label.set_id as string) ?? "";
  const active = ((label.active_ingredient as string[]) ?? []).join(" ");
  const dir = ((label.dosage_and_administration as string[]) ?? []).join(" ");

  const foundSet = recognizedIngredients(active);
  const extraIng = [...foundSet].filter((i) => !expected.has(i));
  // A single-dose packet/powder is one unit per dose by definition (not a typed
  // clinical number — a packet IS the unit). Amounts still come from the label.
  const singleUnitForm = /packet|powder|stick/i.test(spec.doseForm);
  const units = unitsPerDose(dir) ?? (singleUnitForm ? 1 : null);
  const maxUnits = maxUnitsPerDay(dir);
  const maxDoses = units && maxUnits ? maxUnits / units : null;

  console.log(`  openFDA SKU: ${fdaBrand}`);
  console.log(`  DailyMed:    https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${setId}`);
  console.log(`  active_ingredient: ${active}`);
  console.log(`  directions(head): ${dir.slice(0, 160)}…`);
  if (extraIng.length)
    console.log(`  ⚠️ label also lists ingredient(s) not in our KB: ${extraIng.join(", ")} — needs a new ingredient entry`);

  const ings = spec.ingredients.map((k) => {
    const perUnit = strengthOf(active, k);
    const mgPerDose = perUnit != null && units != null ? perUnit * units : null;
    if (perUnit == null) console.log(`  ⚠️ could not extract strength for ${k}`);
    return { ingredient: k, perUnit, mgPerDose };
  });

  const ok = units != null && maxDoses != null && ings.every((i) => i.mgPerDose != null);
  if (!ok) {
    console.log(`  ⚠️ incomplete extraction (units=${units} maxDoses=${maxDoses}) — review the label directions manually`);
  }

  // Ready-to-paste entry — every number came from the label above.
  const entry = {
    id: spec.id,
    brand: spec.brand,
    company,
    category: spec.category,
    core: spec.core ?? false,
    doseForm: spec.doseForm,
    unitsPerDose: units,
    maxDosesPerDay: maxDoses,
    ingredients: ings.map((i) => ({ ingredient: i.ingredient, mgPerDose: i.mgPerDose })),
    source: `${fdaBrand} — openFDA/DailyMed SPL ${setId}`,
    verify: false,
  };
  console.log(`  ---- proposed products.json entry (verify against DailyMed link) ----`);
  console.log(JSON.stringify(entry, null, 2).split("\n").map((l) => "  " + l).join("\n"));
}

async function main() {
  const only = process.argv.slice(2);
  const targets = only.length ? SPECS.filter((s) => only.includes(s.id)) : SPECS;
  for (const s of targets) await build(s);
  console.log(`\nReview each entry against its DailyMed link, then paste into src/data/products.json.`);
}

main().catch((e) => {
  console.error("fda-add failed:", e);
  process.exit(1);
});
