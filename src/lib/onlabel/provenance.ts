/**
 * Verdict provenance & scope gates (deterministic, no LLM).
 *
 * OnLabel is a CHECKER, not a recommender (DECISIONS D34): a verdict card may
 * only reflect products the USER actually named. And red-flag context
 * (pregnancy, pediatric, major conditions) is deferred, not verdicted (D35).
 *
 * Both gates run in plain code on the raw question text and the product names
 * the LLM passed to the tool — so the neuro-symbolic verdict never rests on
 * products the user didn't mention, and never shows a green "OK" on a question
 * whose real risk is a context the arithmetic can't see.
 */

/** Normalize to lowercase alnum tokens (mirrors verify.ts normalize()). */
function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/** Filler words that carry no product identity (mirrors verify.ts STOP + generic filler). */
const FILLER = new Set([
  "and", "with", "the", "for", "plus", "a", "an", "or", "of", "to", "my",
  "i", "im", "is", "it", "can", "take", "some", "cold", "flu", "pm",
  "strength", "extra", "regular", "mg",
]);

/**
 * Did the user actually name this product in their question? True when the input
 * product name shares at least one distinctive (non-filler) token with the
 * question. This lets fuzzy user phrasing through ("regular tylenol" -> the LLM
 * may pass "Tylenol", and "tylenol" is in the question) while dropping products
 * the LLM inferred on its own for an open recommendation ("stuffy nose and a
 * headache" names no product, so an inferred "DayQuil" has zero overlap).
 *
 * B-11 note: "regular"/"extra"/"strength" are filler here on purpose — a bare
 * colloquial "regular" must not be the ONLY thing that makes a product "named".
 */
export function namedInQuestion(question: string, inputName: string): boolean {
  const q = new Set(tokens(question));
  const distinctive = tokens(inputName).filter((t) => !FILLER.has(t));
  if (distinctive.length === 0) return false;
  return distinctive.some((t) => q.has(t));
}

/** Keep only the product names the user actually named (B-15 / D34 checker gate). */
export function userNamedProducts(question: string, inputNames: string[]): string[] {
  return inputNames.filter((n) => namedInQuestion(question, n));
}

/**
 * Red-flag context cues (D35). Presence means the real question is a clinical
 * suitability judgment the arithmetic can't make, so the verdict badge is
 * suppressed and the answer defers to a pharmacist. Deterministic keyword match
 * — never an LLM judgment.
 */
const RED_FLAG_PATTERNS: RegExp[] = [
  // pregnancy / lactation
  /\bpregnan(t|cy)\b/i,
  /\bbreast ?feed(ing)?\b/i,
  /\bnursing\b/i,
  /\blactat(ing|ion)\b/i,
  // pediatric
  /\b(child|children|kid|kids|toddler|infant|baby|babies|newborn)\b/i,
  /\b\d+\s*[- ]?\s*(year|yr|month|mo)s?\s*[- ]?\s*old\b/i,
  /\bmy\s+(son|daughter)\b/i,
  // major conditions the OTC label ceiling doesn't personalize for
  /\bliver\b/i,
  /\bkidney\b/i,
  /\bulcer\b/i,
  /\bcirrhosis\b/i,
  /\bhepat(itis|ic)\b/i,
  /\bhigh blood pressure\b/i,
  /\bhypertension\b/i,
  /\bheart (disease|failure|condition)\b/i,
];

/** True when the question carries a red-flag context cue (D35). */
export function hasRedFlagContext(question: string): boolean {
  return RED_FLAG_PATTERNS.some((re) => re.test(question));
}
