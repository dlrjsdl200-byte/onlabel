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
  // ── analgesics (solid, existing ingredients — high yield) ──
  { id: "motrin-ib", brand: "Motrin IB", primaryToken: "motrin",
    ingredients: ["ibuprofen"], doseForm: "tablet", category: "analgesic" },
  { id: "excedrin-pm-headache", brand: "Excedrin PM Headache", primaryToken: "excedrin",
    ingredients: ["acetaminophen", "diphenhydramine"], doseForm: "caplet", category: "pm-combo" },
  { id: "excedrin-tension-headache", brand: "Excedrin Tension Headache", primaryToken: "excedrin",
    ingredients: ["acetaminophen", "caffeine"], doseForm: "caplet", category: "analgesic" },
  { id: "tylenol-8hr-arthritis", brand: "Tylenol 8HR Arthritis Pain", primaryToken: "tylenol",
    ingredients: ["acetaminophen"], doseForm: "caplet", category: "analgesic" },
  { id: "advil-migraine", brand: "Advil Migraine", primaryToken: "advil",
    ingredients: ["ibuprofen"], doseForm: "capsule", category: "analgesic" },
  { id: "midol-complete", brand: "Midol Complete", primaryToken: "midol",
    ingredients: ["acetaminophen", "caffeine", "pyrilamine"], doseForm: "caplet", category: "analgesic" },
  { id: "bc-powder", brand: "BC Original Powder", primaryToken: "bc",
    ingredients: ["aspirin", "caffeine"], doseForm: "powder", category: "analgesic" },
  { id: "goodys-extra-strength", brand: "Goody's Extra Strength", primaryToken: "goody",
    ingredients: ["acetaminophen", "aspirin", "caffeine"], doseForm: "powder", category: "analgesic" },
  { id: "bayer-back-body", brand: "Bayer Back & Body", primaryToken: "bayer",
    ingredients: ["aspirin", "caffeine"], doseForm: "caplet", category: "analgesic" },
  // ── cold/flu (mix of solid + liquid — reveals liquid/combo bugs) ──
  { id: "dayquil-severe", brand: "Vicks DayQuil Severe", primaryToken: "dayquil",
    ingredients: ["acetaminophen", "dextromethorphan", "guaifenesin", "phenylephrine"], doseForm: "liquicap", category: "cold-flu" },
  { id: "nyquil-severe", brand: "Vicks NyQuil Severe", primaryToken: "nyquil",
    ingredients: ["acetaminophen", "dextromethorphan", "doxylamine", "phenylephrine"], doseForm: "liquicap", category: "cold-flu" },
  { id: "mucinex-fast-max", brand: "Mucinex Fast-Max Severe", primaryToken: "mucinex",
    ingredients: ["acetaminophen", "dextromethorphan", "guaifenesin", "phenylephrine"], doseForm: "caplet", category: "cold-flu" },
  { id: "mucinex-dm-max", brand: "Maximum Strength Mucinex DM", primaryToken: "mucinex",
    ingredients: ["guaifenesin", "dextromethorphan"], doseForm: "tablet", category: "cough-expectorant" },
  { id: "tylenol-cold-head-congestion", brand: "Tylenol Cold + Head Congestion Severe", primaryToken: "tylenol",
    ingredients: ["acetaminophen", "dextromethorphan", "guaifenesin", "phenylephrine"], doseForm: "caplet", category: "cold-flu" },
  { id: "delsym", brand: "Delsym 12 Hour Cough", primaryToken: "delsym",
    ingredients: ["dextromethorphan"], doseForm: "liquid", category: "cough" },
  { id: "robitussin-dm", brand: "Robitussin DM", primaryToken: "robitussin",
    ingredients: ["guaifenesin", "dextromethorphan"], doseForm: "liquid", category: "cough-expectorant" },
  { id: "theraflu-nighttime-severe", brand: "Theraflu Nighttime Severe Cold", primaryToken: "theraflu",
    ingredients: ["acetaminophen", "diphenhydramine", "phenylephrine"], doseForm: "packet", category: "cold-flu" },
  { id: "alka-seltzer-plus-cold", brand: "Alka-Seltzer Plus Cold", primaryToken: "alka",
    ingredients: ["aspirin", "dextromethorphan", "phenylephrine", "chlorpheniramine"], doseForm: "tablet", category: "cold-flu" },
  // ── allergy / decongestant ──
  { id: "allegra", brand: "Allegra Allergy", primaryToken: "allegra",
    ingredients: ["fexofenadine"], doseForm: "tablet", category: "allergy" },
  { id: "chlor-trimeton", brand: "Chlor-Trimeton Allergy", primaryToken: "chlor",
    ingredients: ["chlorpheniramine"], doseForm: "tablet", category: "allergy" },
  { id: "advil-allergy-sinus", brand: "Advil Allergy Sinus", primaryToken: "advil",
    ingredients: ["ibuprofen", "chlorpheniramine", "pseudoephedrine"], doseForm: "tablet", category: "cold-flu" },
  { id: "benadryl-allergy-congestion", brand: "Benadryl Allergy Plus Congestion", primaryToken: "benadryl",
    ingredients: ["diphenhydramine", "phenylephrine"], doseForm: "tablet", category: "allergy-decongestant" },
  { id: "sudafed-pe-sinus-headache", brand: "Sudafed PE Sinus + Headache", primaryToken: "sudafed",
    ingredients: ["acetaminophen", "phenylephrine"], doseForm: "caplet", category: "cold-flu" },
  { id: "mucinex-sinus-max", brand: "Mucinex Sinus-Max Pressure Pain", primaryToken: "mucinex",
    ingredients: ["acetaminophen", "dextromethorphan", "guaifenesin", "phenylephrine"], doseForm: "caplet", category: "cold-flu" },
  // ── sleep ──
  { id: "zzzquil", brand: "ZzzQuil Nighttime Sleep-Aid", primaryToken: "zzzquil",
    ingredients: ["diphenhydramine"], doseForm: "liquicap", category: "sleep" },
  { id: "unisom-pm-pain", brand: "Unisom PM Pain", primaryToken: "unisom",
    ingredients: ["acetaminophen", "diphenhydramine"], doseForm: "caplet", category: "pm-combo" },
  // ── liquid / new-form (expected bugs to log) ──
  { id: "childrens-tylenol", brand: "Children's Tylenol", primaryToken: "tylenol",
    ingredients: ["acetaminophen"], doseForm: "suspension", category: "analgesic" },
  { id: "childrens-motrin", brand: "Children's Motrin", primaryToken: "motrin",
    ingredients: ["ibuprofen"], doseForm: "suspension", category: "analgesic" },
  { id: "childrens-benadryl", brand: "Children's Benadryl", primaryToken: "benadryl",
    ingredients: ["diphenhydramine"], doseForm: "liquid", category: "allergy" },
  { id: "dimetapp-cold-cough", brand: "Dimetapp Cold & Cough", primaryToken: "dimetapp",
    ingredients: ["brompheniramine", "dextromethorphan", "phenylephrine"], doseForm: "liquid", category: "cold-flu" },
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
  // A single-dose packet/powder/liquid is one "unit" per dose by definition (the
  // packet or the measured dose IS the unit) — not a typed clinical number. The
  // strength "(in each packet / each 10 mL)" is then the per-dose amount.
  const singleUnitForm = /packet|powder|stick|liquid|syrup|suspension|solution/i.test(spec.doseForm);
  const units = unitsPerDose(dir) ?? (singleUnitForm ? 1 : null);
  // "take once daily / once a day" with no 24-h cap means one dose per day.
  const onceDaily = /once\s+(?:a\s+day|daily)/i.test(dir);
  const maxUnits = maxUnitsPerDay(dir) ?? (onceDaily && units != null ? units : null);
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

  // For a SINGLE-ingredient product, the label's "no more than N units in 24 h"
  // times the per-unit strength IS that ingredient's daily ceiling — grounded, not
  // typed. Emit it so a new ingredients.json entry can cite this SPL.
  if (spec.ingredients.length === 1) {
    const only = ings[0];
    const dailyMax = only.perUnit != null && maxUnits != null ? only.perUnit * maxUnits : null;
    console.log(
      `  ---- ingredient daily ceiling (single-ingredient SKU) ----\n` +
        `  ${only.ingredient}: maxDailyMg = ${dailyMax ?? "?"}  (= ${only.perUnit ?? "?"} mg/unit × ${maxUnits ?? "?"} units/24h)  source: DailyMed SPL ${setId}`,
    );
  }
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
