/**
 * openFDA composition cross-check (B-4 track 1) — READ-ONLY report.
 *
 * For each catalog product, queries the openFDA drug/label API (free JSON, no
 * key) and deterministically extracts, per known active ingredient:
 *   - per-UNIT strength from `active_ingredient` ("...in each tablet ... 500 mg")
 *   - units/dose and max units/24h from `dosage_and_administration`
 * then compares those against our KB (products.json) and prints a diff, with the
 * DailyMed set_id as a citation. It NEVER writes the KB — a pharmacist reviews the
 * report, then verify:true→false is flipped by hand with the citation. Extraction
 * is pure regex on structured label text (no LLM — D22).
 *
 * Run: npx tsx scripts/sync-fda.ts            (report all)
 *      npx tsx scripts/sync-fda.ts advil aleve (subset by product id)
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import productsData from "../src/data/products.json";

interface KBIngredient {
  ingredient: string;
  mgPerDose: number;
}
interface KBProduct {
  id: string;
  brand: string;
  unitsPerDose: number;
  maxDosesPerDay: number;
  doseForm: string;
  ingredients: KBIngredient[];
  verify: boolean;
}
const PRODUCTS = (productsData as { products: KBProduct[] }).products;

/** openFDA brand-name search token per product (the core brand to fetch, then a
 * deterministic scorer picks the right SKU among the results — see selectSku). */
const BRAND_QUERY: Record<string, string> = {
  "tylenol-regular": "tylenol+regular",
  "tylenol-extra-strength": "tylenol+extra+strength",
  advil: "advil",
  aleve: "aleve",
  "bayer-aspirin": "bayer+aspirin",
  "excedrin-extra-strength": "excedrin",
  dayquil: "dayquil",
  nyquil: "nyquil",
  "tylenol-cold-flu-severe": "tylenol+cold",
  mucinex: "mucinex",
  "mucinex-dm": "mucinex+dm",
  sudafed: "sudafed",
  "sudafed-pe": "sudafed+pe",
  benadryl: "benadryl",
  zyrtec: "zyrtec",
  "tylenol-pm": "tylenol+pm",
  "advil-cold-sinus": "advil+cold",
};

/** Active-ingredient base names we recognize (openFDA appends salt forms). */
const ING_BASES = [
  "acetaminophen", "ibuprofen", "naproxen", "aspirin", "caffeine",
  "dextromethorphan", "phenylephrine", "guaifenesin", "doxylamine",
  "pseudoephedrine", "diphenhydramine", "cetirizine",
];

/** SKU-variant tokens that mark a DIFFERENT product than a plain brand — used to
 * penalize a candidate whose brand carries a variant our target doesn't. */
const VARIANT_TOKENS = new Set([
  "kids", "children", "childrens", "infant", "infants", "junior", "jr", "pediatric",
  "pm", "nighttime", "night", "sleep", "12", "24", "hour", "extended", "er",
  "sinus", "chest", "congestion", "severe", "maximum", "max", "migraine",
  "back", "body", "arthritis", "tension", "liquid", "gummies", "dissolve",
  "chewable", "dye", "free", "berry", "cherry", "grape", "orange", "menthol",
  "intense", "complete", "cooling", "warming", "honey", "vapocool", "flavor",
]);

function words(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
}

/** Base ingredient names present in an openFDA active_ingredient text. */
function recognizedIngredients(activeText: string): Set<string> {
  const t = activeText.toLowerCase();
  return new Set(ING_BASES.filter((b) => t.includes(b)));
}

function setEq(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

/**
 * Deterministically choose the SKU among openFDA candidates that IS our product:
 * its active-ingredient SET must equal our KB's ingredient set (identity, not the
 * amounts we're verifying), and its brand name must carry the fewest extra
 * variant tokens (so "Kids", "12 Hour", "PM" SKUs lose to the plain product).
 * Selection never looks at strengths — those stay the thing we verify.
 */
function selectSku(
  candidates: Record<string, unknown>[],
  ourBrand: string,
  ourIngredients: Set<string>,
  primaryToken: string,
  ourDoseForm: string,
): Record<string, unknown> | null {
  const brandToks = new Set(words(ourBrand.replace(/\(.*?\)/g, "")));
  // Our catalog products are all solid oral forms; reject a liquid/kids SKU whose
  // per-unit strength differs only because the formulation differs.
  const wantSolid = /tablet|caplet|capsule|liquicap|gelcap|geltab/i.test(ourDoseForm);
  let best: Record<string, unknown> | null = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const active = ((c.active_ingredient as string[]) ?? []).join(" ");
    const rset = recognizedIngredients(active);
    if (!setEq(rset, ourIngredients)) continue; // wrong ingredient set = wrong product
    const cbrand = ((c.openfda as { brand_name?: string[] })?.brand_name ?? []).join(" ");
    // HARD requirement: the candidate must actually be this brand — rejects a
    // store-brand / wrong-category product that merely shares the ingredient set
    // (e.g. a phenylephrine hemorrhoid cream matching "Sudafed PE").
    if (!words(cbrand).includes(primaryToken)) continue;
    const extra = words(cbrand).filter(
      (w) => !brandToks.has(w) && !ourIngredients.has(w) && w.length > 1,
    );
    const variantPenalty = extra.filter((w) => VARIANT_TOKENS.has(w)).length;
    const otc =
      ((c.openfda as { product_type?: string[] })?.product_type ?? []).some((t) =>
        /OTC/i.test(t),
      ) ? 1 : 0;
    const form = ((c.dosage_form as string[]) ?? []).join(" ");
    const liquidMismatch =
      wantSolid && /solution|suspension|syrup|liquid|elixir/i.test(form) ? 1 : 0;
    const score = 1000 - 500 * liquidMismatch - 25 * variantPenalty - extra.length + 5 * otc;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

/** Regex base for each ingredient key (openFDA uses salt forms after the base). */
function strengthOf(text: string, ingredientKey: string): number | null {
  const base = ingredientKey.replace(/[^a-z]/gi, "");
  // <base> [optional salt words] <number> mg   — the number nearest the name
  const re = new RegExp(`${base}[a-z\\s]{0,25}?(\\d+(?:\\.\\d+)?)\\s*mg`, "i");
  const m = text.match(re);
  return m ? Number(m[1]) : null;
}

const UNIT = "(?:tablet|caplet|capsule|liquicap|liqui-?cap|softgel|gelcap|geltab|packet|teaspoon|tablespoon|lozenge|dose)s?";
function unitsPerDose(dir: string): number | null {
  const m = dir.match(new RegExp(`take\\s+(\\d+)\\s+${UNIT}`, "i"));
  return m ? Number(m[1]) : null;
}
function maxUnitsPerDay(dir: string): number | null {
  const m =
    dir.match(new RegExp(`not\\s+(?:more\\s+than|to\\s+exceed)\\s+(\\d+)\\s+${UNIT}[^.]*24\\s*hour`, "i")) ||
    dir.match(new RegExp(`(\\d+)\\s+${UNIT}\\s+in\\s+(?:any\\s+)?24\\s*hour`, "i"));
  return m ? Number(m[1]) : null;
}

interface Row {
  id: string;
  brand: string;
  fdaBrand: string;
  setId: string;
  lines: string[];
  flags: number;
}

/** Fetch OTC label candidates for the primary brand token (broad); the scorer
 * narrows to the right SKU by ingredient set + brand-variant distance. Querying
 * the single strong token avoids openFDA's weak multi-token AND behaviour. */
async function fetchCandidates(primaryToken: string): Promise<Record<string, unknown>[]> {
  const url =
    `https://api.fda.gov/drug/label.json?search=` +
    `openfda.brand_name:${primaryToken}+AND+openfda.product_type:"HUMAN+OTC+DRUG"&limit=100`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as { results?: Record<string, unknown>[] };
  return json.results ?? [];
}

function mark(kb: number | string, fda: number | string | null): string {
  if (fda == null) return "?";
  return String(kb) === String(fda) ? "✓" : "✗";
}

async function main() {
  const only = process.argv.slice(2);
  const targets = only.length ? PRODUCTS.filter((p) => only.includes(p.id)) : PRODUCTS;
  const rows: Row[] = [];

  for (const p of targets) {
    const brandToken = BRAND_QUERY[p.id] ?? words(p.brand)[0];
    const primaryToken = brandToken.split("+")[0];
    const ourIngredients = new Set(p.ingredients.map((i) => i.ingredient));
    let label: Record<string, unknown> | null = null;
    try {
      const candidates = await fetchCandidates(primaryToken);
      label = selectSku(candidates, p.brand, ourIngredients, primaryToken, p.doseForm);
    } catch {
      label = null;
    }
    const row: Row = { id: p.id, brand: p.brand, fdaBrand: "", setId: "", lines: [], flags: 0 };

    if (!label) {
      row.lines.push(
        `  ⚠️ no OTC SKU whose ingredient set == {${[...ourIngredients].join(", ")}} — review brand token or KB ingredients`,
      );
      row.flags++;
      rows.push(row);
      continue;
    }

    const openfda = (label.openfda as { brand_name?: string[] }) ?? {};
    row.fdaBrand = openfda.brand_name?.[0] ?? "(unnamed)";
    row.setId = (label.set_id as string) ?? "";
    const active = ((label.active_ingredient as string[]) ?? []).join(" ");
    const dir = ((label.dosage_and_administration as string[]) ?? []).join(" ");

    const fdaUnits = unitsPerDose(dir);
    const fdaMaxUnits = maxUnitsPerDay(dir);
    const fdaMaxDoses = fdaUnits && fdaMaxUnits ? fdaMaxUnits / fdaUnits : null;

    // units/dose and max doses/day
    const um = mark(p.unitsPerDose, fdaUnits);
    const dm = mark(p.maxDosesPerDay, fdaMaxDoses);
    if (um === "✗" || dm === "✗") row.flags++;
    row.lines.push(
      `  units/dose  KB=${p.unitsPerDose}  openFDA=${fdaUnits ?? "?"}  ${um}` +
        `    max doses/day  KB=${p.maxDosesPerDay}  openFDA=${fdaMaxDoses ?? "?"} (=${fdaMaxUnits ?? "?"}/${fdaUnits ?? "?"})  ${dm}`,
    );

    // per-ingredient per-unit strength
    for (const ing of p.ingredients) {
      const kbPerUnit = ing.mgPerDose / p.unitsPerDose;
      const fdaPerUnit = strengthOf(active, ing.ingredient);
      const m = mark(kbPerUnit, fdaPerUnit);
      if (m === "✗") row.flags++;
      row.lines.push(
        `  ${ing.ingredient.padEnd(18)} per-unit  KB=${kbPerUnit} mg  openFDA=${fdaPerUnit ?? "?"} mg  ${m}` +
          `   (KB per-dose ${ing.mgPerDose} mg = ${kbPerUnit}×${p.unitsPerDose})`,
      );
    }
    rows.push(row);
  }

  // ── console + markdown report ────────────────────────────────────────────
  const out: string[] = [];
  out.push(`# openFDA composition cross-check (B-4)\n`);
  out.push(`Generated: ${new Date().toISOString().slice(0, 10)} · read-only · deterministic (no LLM).`);
  out.push(`Legend: ✓ KB matches openFDA · ✗ mismatch (review) · ? could not extract.\n`);

  for (const r of rows) {
    const status = r.flags === 0 ? "✓ clean" : `⚠️ ${r.flags} flag(s)`;
    const cite = r.setId
      ? `https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${r.setId}`
      : "(no set_id)";
    out.push(`## ${r.id} — ${status}`);
    out.push(`KB brand: ${r.brand}  ·  openFDA SKU (auto-selected): ${r.fdaBrand}`);
    out.push(`DailyMed: ${cite}`);
    out.push("```");
    out.push(...r.lines);
    out.push("```\n");
    console.log(
      `${r.flags === 0 ? "✓" : "⚠️"} ${r.id.padEnd(24)} openFDA="${r.fdaBrand}"  flags=${r.flags}`,
    );
  }

  const clean = rows.filter((r) => r.flags === 0).length;
  const summary = `\n${clean}/${rows.length} products clean; ${rows.length - clean} need review.`;
  console.log(summary);
  out.push(`---\n${summary.trim()}`);

  const path = join(process.cwd(), "docs", "FDA-COMPOSITION-CHECK.md");
  writeFileSync(path, out.join("\n") + "\n");
  console.log(`\nWrote docs/FDA-COMPOSITION-CHECK.md`);
}

main().catch((e) => {
  console.error("sync-fda failed:", e);
  process.exit(1);
});
