/**
 * Catalog integrity check — re-verify each product against the EXACT openFDA/
 * DailyMed label it cites (by set_id, not a brand search), catching any input
 * error between the label and products.json. Deterministic, no LLM (D22).
 *
 * For each product whose `source` carries a DailyMed SPL set_id:
 *   - fetch that exact label from openFDA
 *   - re-extract per-ingredient strength, units/dose, max/day (liquid: by volume)
 *   - compare to the stored KB values, printing KB vs label for any mismatch.
 *
 * Run: npx tsx evals/verify-catalog.ts            (all cited products)
 *      npx tsx evals/verify-catalog.ts advil-pm   (subset)
 */
import productsData from "../src/data/products.json";
import {
  strengthOf,
  unitsPerDose,
  maxUnitsPerDay,
  labelVolume,
  doseVolume,
} from "../scripts/fda-lib";

interface KBIng { ingredient: string; mgPerDose: number }
interface KBProduct {
  id: string; brand: string; doseForm: string;
  unitsPerDose: number; maxDosesPerDay: number;
  ingredients: KBIng[]; source: string;
}
const PRODUCTS = (productsData as { products: KBProduct[] }).products;

function setIdOf(source: string): string | null {
  const m = source.match(/SPL\s+([0-9a-f-]{36})/i);
  return m ? m[1] : null;
}

async function fetchBySetId(setId: string): Promise<Record<string, unknown> | null> {
  const url = `https://api.fda.gov/drug/label.json?search=set_id:"${setId}"&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as { results?: Record<string, unknown>[] };
  return json.results?.[0] ?? null;
}

/** Compare a KB number to a re-extracted one: ✓ equal, ✗ differ, ? not extracted. */
function cmp(kb: number, label: number | null): string {
  if (label == null) return "?";
  return kb === label ? "✓" : "✗";
}

async function main() {
  const only = process.argv.slice(2);
  const targets = only.length ? PRODUCTS.filter((p) => only.includes(p.id)) : PRODUCTS;

  let cited = 0, clean = 0, mismatch = 0, uncited = 0;
  const problems: string[] = [];

  for (const p of targets) {
    const setId = setIdOf(p.source);
    if (!setId) { uncited++; continue; }
    cited++;

    let label: Record<string, unknown> | null = null;
    try { label = await fetchBySetId(setId); } catch { label = null; }
    if (!label) {
      mismatch++;
      problems.push(`⚠️ ${p.id}: set_id ${setId} not retrievable from openFDA`);
      continue;
    }

    const active = ((label.active_ingredient as string[]) ?? []).join(" ");
    const dir = ((label.dosage_and_administration as string[]) ?? []).join(" ");
    const isLiquid = /liquid|syrup|suspension|solution/i.test(p.doseForm) || /in each\s+\d/i.test(active);
    const labelVol = isLiquid ? labelVolume(active) : null;
    const doseVol = isLiquid ? doseVolume(dir) : null;

    const lines: string[] = [];
    // ingredient per-dose amounts
    for (const ing of p.ingredients) {
      const strength = strengthOf(active, ing.ingredient);
      const labelMgPerDose =
        strength == null ? null
          : isLiquid && labelVol != null && doseVol != null
            ? Math.round((strength * doseVol) / labelVol * 100) / 100
            : strength * p.unitsPerDose;
      const c = cmp(ing.mgPerDose, labelMgPerDose);
      if (c !== "✓") lines.push(`    ${ing.ingredient}: KB ${ing.mgPerDose} mg vs label ${labelMgPerDose ?? "?"} mg  ${c}`);
    }
    // units + max doses
    const lup = unitsPerDose(dir);
    const lmu = maxUnitsPerDay(dir);
    const lmax = lup && lmu ? lmu / lup : null;
    if (!isLiquid && cmp(p.unitsPerDose, lup) === "✗")
      lines.push(`    unitsPerDose: KB ${p.unitsPerDose} vs label ${lup}  ✗`);
    if (lmax != null && cmp(p.maxDosesPerDay, lmax) === "✗")
      lines.push(`    maxDosesPerDay: KB ${p.maxDosesPerDay} vs label ${lmax}  ✗`);

    if (lines.length === 0) {
      clean++;
      console.log(`✓ ${p.id}`);
    } else {
      mismatch++;
      console.log(`✗ ${p.id} (${p.brand})`);
      lines.forEach((l) => console.log(l));
      problems.push(p.id);
    }
  }

  console.log(`\n── Summary ──`);
  console.log(`${clean}/${cited} cited products match their DailyMed label; ${mismatch} to review; ${uncited} uncited (no set_id).`);
  if (problems.length) console.log(`Review: ${problems.join(", ")}`);
  console.log(`Note: a ✗ can be a label revision or salt-form phrasing, not only an input typo — check the DailyMed link.`);
}

main().catch((e) => { console.error("verify-catalog failed:", e); process.exit(1); });
