/**
 * Shared openFDA helpers for the composition tools (sync-fda, fda-add).
 * Pure, deterministic — regex over structured openFDA label text, no LLM (D22).
 */

/** Active-ingredient base names we recognize (openFDA appends salt forms). */
export const ING_BASES = [
  "acetaminophen", "ibuprofen", "naproxen", "aspirin", "caffeine",
  "dextromethorphan", "phenylephrine", "guaifenesin", "doxylamine",
  "pseudoephedrine", "diphenhydramine", "cetirizine",
];

/** SKU-variant tokens that mark a DIFFERENT product than a plain brand. */
export const VARIANT_TOKENS = new Set([
  "kids", "children", "childrens", "infant", "infants", "junior", "jr", "pediatric",
  "pm", "nighttime", "night", "sleep", "12", "24", "hour", "extended", "er",
  "sinus", "chest", "congestion", "severe", "maximum", "max", "migraine",
  "back", "body", "arthritis", "tension", "liquid", "gummies", "dissolve",
  "chewable", "dye", "free", "berry", "cherry", "grape", "orange", "menthol",
  "intense", "complete", "cooling", "warming", "honey", "vapocool", "flavor",
]);

export function words(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
}

/** Base ingredient names present in an openFDA active_ingredient text. */
export function recognizedIngredients(activeText: string): Set<string> {
  const t = activeText.toLowerCase();
  return new Set(ING_BASES.filter((b) => t.includes(b)));
}

export function setEq(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

/**
 * Deterministically choose the SKU among openFDA candidates that IS this product:
 * its active-ingredient SET must equal the expected set (identity, not the amounts
 * we're verifying), it must actually carry the brand token (rejects store-brand /
 * wrong-category matches), with the fewest variant tokens and a solid oral form.
 * Selection never looks at strengths — those stay the thing we verify.
 */
export function selectSku(
  candidates: Record<string, unknown>[],
  ourBrand: string,
  expectedIngredients: Set<string>,
  primaryToken: string,
  ourDoseForm: string,
): Record<string, unknown> | null {
  const brandToks = new Set(words(ourBrand.replace(/\(.*?\)/g, "")));
  const wantSolid = /tablet|caplet|capsule|liquicap|gelcap|geltab/i.test(ourDoseForm);
  let best: Record<string, unknown> | null = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const active = ((c.active_ingredient as string[]) ?? []).join(" ");
    const rset = recognizedIngredients(active);
    if (!setEq(rset, expectedIngredients)) continue;
    const cbrand = ((c.openfda as { brand_name?: string[] })?.brand_name ?? []).join(" ");
    if (!words(cbrand).includes(primaryToken)) continue;
    const extra = words(cbrand).filter(
      (w) => !brandToks.has(w) && !expectedIngredients.has(w) && w.length > 1,
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

/** Per-unit mg for an ingredient from active_ingredient text ("...500 mg"). */
export function strengthOf(text: string, ingredientKey: string): number | null {
  const base = ingredientKey.replace(/[^a-z]/gi, "");
  const re = new RegExp(`${base}[a-z\\s]{0,25}?(\\d+(?:\\.\\d+)?)\\s*mg`, "i");
  const m = text.match(re);
  return m ? Number(m[1]) : null;
}

const UNIT =
  "(?:tablet|caplet|capsule|liquicap|liqui-?cap|softgel|gelcap|geltab|packet|teaspoon|tablespoon|lozenge|dose)s?";

export function unitsPerDose(dir: string): number | null {
  const m = dir.match(new RegExp(`take\\s+(\\d+)\\s+${UNIT}`, "i"));
  return m ? Number(m[1]) : null;
}

export function maxUnitsPerDay(dir: string): number | null {
  const m =
    dir.match(new RegExp(`not\\s+(?:take\\s+)?(?:more\\s+than|to\\s+exceed)\\s+(\\d+)\\s+${UNIT}[^.]*24\\s*hour`, "i")) ||
    dir.match(new RegExp(`(\\d+)\\s+${UNIT}\\s+in\\s+(?:any\\s+)?24\\s*hour`, "i"));
  return m ? Number(m[1]) : null;
}

/** Fetch OTC label candidates for the primary brand token (the scorer narrows). */
export async function fetchCandidates(primaryToken: string): Promise<Record<string, unknown>[]> {
  const url =
    `https://api.fda.gov/drug/label.json?search=` +
    `openfda.brand_name:${primaryToken}+AND+openfda.product_type:"HUMAN+OTC+DRUG"&limit=100`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as { results?: Record<string, unknown>[] };
  return json.results ?? [];
}
