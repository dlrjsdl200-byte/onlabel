/**
 * Shared openFDA helpers for the composition tools (sync-fda, fda-add).
 * Pure, deterministic — regex over structured openFDA label text, no LLM (D22).
 */

/** Active-ingredient base names we recognize (openFDA appends salt forms).
 * Order matters: longer/more-specific names first so a substring test doesn't let
 * a shorter base shadow a longer one. */
export const ING_BASES = [
  "acetaminophen", "ibuprofen", "naproxen", "aspirin", "caffeine",
  "dextromethorphan", "phenylephrine", "guaifenesin", "doxylamine",
  "pseudoephedrine", "diphenhydramine", "cetirizine",
  // allergy / antihistamine expansion
  "loratadine", "fexofenadine", "levocetirizine", "chlorpheniramine",
  "brompheniramine", "pyrilamine",
];

/** Per-dose amount for a liquid: "(in each 5 mL) ... 160 mg" -> {perDose:160}. The
 * unit IS the dose volume, so per-dose == the labeled strength (no ×units). */
export function liquidStrengthOf(text: string, ingredientKey: string): number | null {
  return strengthOf(text, ingredientKey);
}

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

/** Base ingredient names present in an openFDA active_ingredient text. Uses word
 * boundaries so "cetirizine" does NOT match inside "levocetirizine" — they are
 * distinct active ingredients with distinct ceilings, not the same drug. */
export function recognizedIngredients(activeText: string): Set<string> {
  const t = activeText.toLowerCase();
  return new Set(ING_BASES.filter((b) => new RegExp(`\\b${b}\\b`, "i").test(t)));
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
  // Is THIS product a children's product? (brand says so, or a kids liquid form)
  const childTarget =
    /\b(child|children|childrens|kids?|infant|infants|pediatric)\b/i.test(ourBrand) ||
    /suspension|drops/i.test(ourDoseForm);
  let best: Record<string, unknown> | null = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const active = ((c.active_ingredient as string[]) ?? []).join(" ");
    const rset = recognizedIngredients(active);
    if (!setEq(rset, expectedIngredients)) continue;
    const cbrand = ((c.openfda as { brand_name?: string[] })?.brand_name ?? []).join(" ");
    if (!words(cbrand).includes(primaryToken)) continue;
    // Hard children's gate: a children's target must match a children's SKU, and
    // an adult target must NOT match a children's SKU (a mere penalty let ties go
    // wrong — Children's Tylenol matched the adult 8HR, adult Allegra lost to the
    // Children's ODT).
    const cbrandChild = /\b(child|children|childrens|kids?|infant|infants|pediatric|jr|junior)\b/i.test(cbrand);
    if (childTarget !== cbrandChild) continue;
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

/** Per-unit mg for an ingredient from active_ingredient text ("...500 mg"). Word
 * boundary at the name start keeps distinct ingredients (cetirizine vs
 * levocetirizine) from cross-matching. */
export function strengthOf(text: string, ingredientKey: string): number | null {
  const base = ingredientKey.replace(/[^a-z]/gi, "");
  // Allow salt/qualifier words between the name and the number ("polistirex
  // equivalent to 30 mg", "maleate, USP 2 mg"); non-greedy so it takes the
  // nearest number belonging to this ingredient.
  const re = new RegExp(`\\b${base}[a-z\\s,]{0,45}?(\\d+(?:\\.\\d+)?)\\s*mg`, "i");
  const m = text.match(re);
  return m ? Number(m[1]) : null;
}

const UNIT =
  "(?:tablet|caplet|capsule|liquicap|liqui-?cap|softgel|gelcap|geltab|packet|teaspoon|tablespoon|lozenge|dose)s?";
/** A count as a digit or a spelled-out small number (labels mix both). */
const NUM = "(\\d+|one|two|three|four|six)";
const HOUR = "(?:hour|hr|hrs)";
const WORDNUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, six: 6 };
function num(s: string): number {
  return WORDNUM[s.toLowerCase()] ?? Number(s);
}

/** Units per dose. Handles "take/chew/use/dissolve N unit" and the verb-less
 * "...12 years and over: 2 LiquiCaps" / "...12 years and older: 1 tablet". */
export function unitsPerDose(dir: string): number | null {
  // Optional "<strength> mg" between the count and the unit ("take one 180 mg tablet").
  const S = "(?:\\d+(?:\\.\\d+)?\\s*mg\\s+)?";
  const m =
    dir.match(new RegExp(`(?:take|chew|use|dissolve|swallow|drink)\\s+${NUM}\\s+${S}${UNIT}`, "i")) ||
    dir.match(new RegExp(`(?:older|over)[:\\s)]+${NUM}\\s+${S}${UNIT}`, "i"));
  return m ? num(m[1]) : null;
}

/** Max units per 24 h. Handles "do not exceed N unit per 24 hrs", "not more than
 * N unit in any 24-hour period", "N unit in 24 hours"; hr/hrs and the "24-hour"
 * hyphen form are all accepted. */
export function maxUnitsPerDay(dir: string): number | null {
  const m =
    dir.match(new RegExp(`not\\s+(?:take\\s+)?(?:more\\s+than|to\\s+exceed)\\s+${NUM}\\s+${UNIT}[^.]*24[\\s-]*${HOUR}`, "i")) ||
    dir.match(new RegExp(`${NUM}\\s+${UNIT}\\s+(?:in|per)\\s+(?:any\\s+)?24[\\s-]*${HOUR}`, "i"));
  return m ? num(m[1]) : null;
}

/** Max volume per 24 h for a liquid stated as a VOLUME, not a unit count:
 * "not to exceed 20 mL in 24 hours" / "not more than 20 mL in 24 hrs" -> 20.
 * Returns the FIRST match, which on an OTC label is the adult tier (adults are
 * listed before the children's tiers), mirroring doseVolume's adult preference. */
export function maxVolumePerDay(dir: string): number | null {
  const m = dir.match(
    /not\s+(?:to\s+exceed|more\s+than)\s+(\d+(?:\.\d+)?)\s*mL[^.]*24[\s-]*(?:hour|hr|hrs)/i,
  );
  return m ? Number(m[1]) : null;
}

/** The volume a liquid's strength is stated per: "Active ingredient (in each 5
 * mL) ... 30 mg" -> 5. */
export function labelVolume(active: string): number | null {
  const m = active.match(/in each\s+(\d+(?:\.\d+)?)\s*mL/i);
  return m ? Number(m[1]) : null;
}

/** The adult dose volume in mL from the directions: "...over 30 mL", "adults ...
 * 10 mL", "2 teaspoons" (x5 mL), "1 tablespoon" (x15 mL). Prefers a volume that
 * follows an adult marker so a children's mL doesn't win. */
export function doseVolume(dir: string): number | null {
  const near = "(?:over|adults?)[^.]{0,40}?";
  const ml =
    dir.match(new RegExp(`${near}(\\d+(?:\\.\\d+)?)\\s*mL`, "i")) ||
    dir.match(/(\d+(?:\.\d+)?)\s*mL/i);
  if (ml) return Number(ml[1]);
  const tsp = dir.match(new RegExp(`${near}(\\d+(?:\\.\\d+)?)\\s*(?:teaspoon|tsp)`, "i"));
  if (tsp) return Number(tsp[1]) * 5;
  const tbsp = dir.match(new RegExp(`${near}(\\d+(?:\\.\\d+)?)\\s*(?:tablespoon|tbsp)`, "i"));
  if (tbsp) return Number(tbsp[1]) * 15;
  return null;
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
