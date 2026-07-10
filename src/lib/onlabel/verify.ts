/**
 * OnLabel deterministic verifier.
 *
 * This is the trust core of OnLabel: it does NOT ask an LLM whether a
 * combination is safe. It looks up each product's active ingredients from
 * FDA-grounded data, builds an ingredient ledger, and decides duplication and
 * cumulative-dose findings with plain arithmetic. The verdict is reproducible.
 */

import ingredientsData from "../../data/ingredients.json";
import productsData from "../../data/products.json";

export type Severity = "ok" | "caution" | "danger";

/** Dosing schedule ("복용법") extracted deterministically from FDA monographs. */
export interface IngredientDosing {
  /** Human-readable dosing interval, e.g. "every 4 to 6 hours". */
  intervalText: string;
  /** Human-readable max treatment duration, or null if none applies. */
  maxDurationText: string | null;
  source: string;
  /** true = extracted but not yet pharmacist-confirmed (D22). */
  verify: boolean;
}

export interface IngredientRef {
  displayName: string;
  aka: string[];
  class: string;
  maxDailyMg: number | null;
  risk: string;
  efficacyNote?: string;
  efficacyRefs?: string[];
  source: string;
  verify: boolean;
  dosing?: IngredientDosing;
  /** Distinct ingredients that are the SAME active moiety (an enantiomer or active
   * metabolite of each other) share a dupGroup, so taking both counts as a
   * duplication even though their keys differ — e.g. levocetirizine is the
   * R-enantiomer of cetirizine (B-17). */
  dupGroup?: string;
}

export interface ProductIngredient {
  ingredient: string;
  mgPerDose: number;
}

export interface Product {
  id: string;
  brand: string;
  /** Groups same-formulation strength variants, e.g. "tylenol". */
  brandKey?: string;
  /** Human strength label, e.g. "Extra Strength". */
  strengthLabel?: string;
  /** The variant a bare brand name resolves to. */
  isBrandDefault?: boolean;
  company: string;
  category: string;
  core: boolean;
  doseForm: string;
  unitsPerDose: number;
  maxDosesPerDay: number;
  ingredients: ProductIngredient[];
  source: string;
  verify: boolean;
}

export interface IngredientContribution {
  brand: string;
  maxDailyMg: number;
  /** mg of this ingredient in one label dose */
  mgPerDose: number;
  /** physical units (tablet/caplet/LiquiCap) per label dose */
  unitsPerDose: number;
  /** max label doses per day */
  dosesPerDay: number;
  /** dose-form label, e.g. "caplet", "liquicap" */
  doseForm: string;
}

export interface IngredientFinding {
  ingredient: string;
  displayName: string;
  class: string;
  contributions: IngredientContribution[];
  totalMaxDailyMg: number;
  limitMg: number | null;
  duplicated: boolean;
  exceedsLimit: boolean;
  severity: Severity;
  message: string;
  risk: string;
  efficacyNote?: string;
  efficacyRefs?: string[];
  source: string;
  needsVerification: boolean;
  dosing?: IngredientDosing;
}

export interface ClassFinding {
  className: string;
  ingredients: string[];
  brands: string[];
  severity: Severity;
  message: string;
}

/** A bare brand name we resolved to a default strength SKU (surfaced to the user). */
export interface Assumption {
  input: string;
  resolvedTo: string;
  alternatives: string[];
}

/** A bare active-ingredient name the user typed (e.g. "acetaminophen") with no
 * product/dose attached. It participates in duplication/class detection but
 * contributes 0 mg (we do not fabricate an amount we were not given). */
export interface GenericIngredientMatch {
  input: string;
  ingredient: string;
}

export interface VerifyResult {
  input: string[];
  matched: Product[];
  unmatched: string[];
  genericIngredients: GenericIngredientMatch[];
  assumptions: Assumption[];
  findings: IngredientFinding[];
  classFindings: ClassFinding[];
  overall: Severity;
  summary: string;
}

export interface ProductMatch {
  product: Product;
  /** True when a bare brand was resolved to its default strength SKU. */
  assumedDefault: boolean;
  /** Other strength variants of the same brand family. */
  alternatives: Product[];
}

const INGREDIENTS = (ingredientsData as { ingredients: Record<string, IngredientRef> })
  .ingredients;
const PRODUCTS = (productsData as { products: Product[] }).products;

const SEVERITY_RANK: Record<Severity, number> = { ok: 0, caution: 1, danger: 2 };

function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Distinctive first token of a strength label, e.g. "Extra Strength" -> "extra". */
function strengthToken(label?: string): string | null {
  if (!label) return null;
  return normalize(label).split(" ")[0] || null;
}

/** Filler words that carry no product identity ("Advil Cold & Sinus" == "...and..."). */
const STOP = new Set(["and", "with", "the", "for", "plus", "a", "an"]);

/**
 * Colloquial "the ordinary one" words. A consumer saying "regular Tylenol" almost
 * always means the common default SKU (Extra Strength), NOT the label's literal
 * "Regular Strength" (325 mg) product. We therefore treat these as a default
 * signal, not a strength selector — the full official name "Tylenol Regular
 * Strength" still resolves exactly via the step-1 brand match. (B-11)
 */
const COLLOQUIAL_DEFAULT = new Set(["regular", "normal", "plain", "standard", "ordinary"]);

/**
 * Common consumer abbreviations for a strength label. "Tylenol ES" means Extra
 * Strength; without this, "es" is an unrecognized token that derails resolution
 * to a sibling formulation (Tylenol PM). Mapped to the first token a
 * strengthLabel normalizes to, so the step-2 strength match picks it up. (B-19)
 */
const STRENGTH_ALIAS: Record<string, string> = {
  es: "extra",
  xs: "extra",
  "x-strength": "extra",
  max: "maximum",
  rs: "regular",
};

/**
 * Generic symptom/marketing words that are NOT product identity. A query that
 * overlaps a product only on these ("cold and flu") does not name that product,
 * so fuzzy resolution must not latch onto a specific SKU from them alone. (B-21)
 */
const GENERIC_WORDS = new Set([
  "cold", "flu", "severe", "sinus", "allergy", "congestion", "cough",
  "pain", "nighttime", "daytime", "night", "day", "childrens", "kids",
  "children", "maximum", "relief", "medicine", "symptom", "symptoms",
]);

function contentTokens(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((t) => t && !STOP.has(t));
}

/**
 * Every distinctive token that appears in some catalog product's name. Used to
 * tell a real formulation modifier ("cold", "pm" — a different SKU the user
 * wants) apart from noise/abbreviation ("es", "200mg", "childrens" — absent from
 * the catalog), so a strength-family brand with a noise modifier collapses to its
 * default SKU instead of mis-resolving to a sibling formulation. (B-19)
 */
const PRODUCT_VOCAB = new Set<string>(
  PRODUCTS.flatMap((p) => contentTokens(p.brand + " " + p.id)),
);

/**
 * Specificity-aware fuzzy matcher. Scores every product by how many of its own
 * name tokens the query covers, and picks the most-specific match — so
 * "Advil Cold and Sinus" resolves to the multi-word `advil-cold-sinus` rather
 * than being shadowed by the shorter `advil`. Ties break toward fuller coverage,
 * then earlier catalog order (canonical SKU first).
 */
function fuzzyLookup(q: string): Product | null {
  const qset = new Set(contentTokens(q));
  if (qset.size === 0) return null;
  let best: Product | null = null;
  let bestScore = -1;
  let bestDistinctive = 0;
  for (const p of PRODUCTS) {
    // A brand may carry aliases separated by "/" ("Advil / Motrin IB"). Score each
    // alias variant (plus the id) and take the best, so alias tokens don't inflate
    // the token count and sink the canonical product below a shorter sibling. (B-21)
    const variants = [...p.brand.split("/"), p.id];
    let pScore = -1;
    let pDistinctive = 0;
    for (const v of variants) {
      const pset = new Set(contentTokens(v));
      if (pset.size === 0) continue;
      let overlap = 0;
      let distinctive = 0; // overlap on non-generic (identity-bearing) tokens
      for (const t of pset)
        if (qset.has(t)) {
          overlap++;
          if (!GENERIC_WORDS.has(t)) distinctive++;
        }
      if (overlap === 0) continue;
      // Reward coverage of the PRODUCT's tokens; penalize the product's own
      // distinctive tokens the query did NOT name (a formulation word like "pm"
      // the user didn't ask for), so "Advil" beats "Advil PM" for a bare "Advil".
      const unmatched = pset.size - overlap;
      const score = overlap * 1000 - unmatched * 60 + (overlap / qset.size) * 10;
      if (score > pScore) {
        pScore = score;
        pDistinctive = distinctive;
      }
    }
    if (pScore > bestScore) {
      bestScore = pScore;
      bestDistinctive = pDistinctive;
      best = p;
    }
  }
  // Require at least one identity-bearing (non-generic) token in the match, so a
  // generic symptom phrase ("cold and flu") does not resolve to a specific SKU. (B-21)
  return bestDistinctive > 0 ? best : null;
}

/**
 * Match a free-text input to a bare active-ingredient name (its key, displayName,
 * or an aka like "APAP"/"paracetamol"). Returns the ingredient key when every
 * token of an ingredient name appears in the input — so "acetaminophen" and
 * "acetaminophen 500 mg" match, but a brand like "Tylenol" does not. Only used
 * for inputs that failed product resolution, so it never shadows a real product.
 */
function matchGenericIngredient(name: string): string | null {
  const toks = new Set(contentTokens(name));
  if (toks.size === 0) return null;
  for (const [key, ref] of Object.entries(INGREDIENTS)) {
    const candidates = [key, ref.displayName, ...(ref.aka ?? [])];
    for (const cand of candidates) {
      const ct = contentTokens(cand);
      if (ct.length && ct.every((t) => toks.has(t))) return key;
    }
  }
  return null;
}

/**
 * Resolve a free-text product name to a catalog product, surfacing whether a
 * bare brand name was assumed to a default strength SKU. Different-formulation
 * products (e.g. Tylenol PM) are matched by their own exact brand names and are
 * never grouped into a strength family.
 */
export function resolveProduct(name: string): ProductMatch | null {
  const q = normalize(name);
  if (!q) return null;
  // Expand strength abbreviations ("es" -> "extra") so the strength-family match
  // can recognize them; the exact-name paths below still use the raw string. (B-19)
  const tokens = q.split(" ").map((t) => STRENGTH_ALIAS[t] ?? t);

  // 1. Exact id/brand match — an explicit choice, no assumption.
  for (const p of PRODUCTS) {
    if (normalize(p.id) === q || normalize(p.brand) === q) {
      return { product: p, assumedDefault: false, alternatives: [] };
    }
  }

  // 2. Strength family: query names a brand that has >1 strength variant.
  const familyKeys = new Set(
    PRODUCTS.map((p) => p.brandKey).filter((k): k is string => !!k),
  );
  for (const key of familyKeys) {
    if (!tokens.includes(key)) continue;
    const members = PRODUCTS.filter((p) => p.brandKey === key);
    if (members.length < 2) continue;
    // Did the user name a strength (e.g. "extra")? A colloquial word like
    // "regular" is NOT an explicit strength choice — it means "the default one"
    // and is handled by the bare-brand path below with a surfaced assumption.
    const explicit = members.find((m) => {
      const t = strengthToken(m.strengthLabel);
      return t !== null && tokens.includes(t) && !COLLOQUIAL_DEFAULT.has(t);
    });
    if (explicit) {
      return { product: explicit, assumedDefault: false, alternatives: [] };
    }
    // Only collapse to the family default for a BARE brand. If the query carries
    // other distinctive tokens (e.g. "Tylenol Cold and Flu Severe"), it names a
    // different SKU — fall through to the specificity-aware fuzzy match instead
    // of silently resolving to the family default. Colloquial default words are
    // treated as filler here so "regular Tylenol" collapses to the default SKU.
    const strengthTokens = new Set(
      members.map((m) => strengthToken(m.strengthLabel)).filter(Boolean) as string[],
    );
    const residual = tokens.filter(
      (t) =>
        t !== key &&
        !STOP.has(t) &&
        !strengthTokens.has(t) &&
        !COLLOQUIAL_DEFAULT.has(t),
    );
    // A residual token that names a real, different SKU (e.g. "cold", "pm") means
    // the user wants that other formulation — fall through to fuzzy. But an
    // UNKNOWN modifier absent from the whole catalog ("es"→already aliased,
    // "200mg", "childrens") is noise; collapse to the family default rather than
    // letting fuzzy mis-pick a sibling formulation (Tylenol PM). (B-19)
    const residualNamesRealSku = residual.some((t) => PRODUCT_VOCAB.has(t));
    if (residualNamesRealSku) break;
    // Bare brand -> default SKU, surfaced as an assumption.
    const def = members.find((m) => m.isBrandDefault) ?? members[0];
    return {
      product: def,
      assumedDefault: true,
      alternatives: members.filter((m) => m.id !== def.id),
    };
  }

  // 3. Fallback fuzzy match.
  const p = fuzzyLookup(q);
  return p ? { product: p, assumedDefault: false, alternatives: [] } : null;
}

/** Resolve a free-text product name to a catalog product. */
export function lookupProduct(name: string): Product | null {
  return resolveProduct(name)?.product ?? null;
}

/** Resolve a free-text ingredient name/brand-ingredient/aka to its KB key. */
export function resolveIngredientKey(name: string): string | null {
  return matchGenericIngredient(name);
}

/** The human-verified KB entry for an ingredient key, if any. */
export function ingredientRef(key: string): IngredientRef | undefined {
  return INGREDIENTS[key];
}

/**
 * Verify a set of products taken together.
 * @param productNames free-text product names (brand or catalog id)
 */
export function verify(productNames: string[]): VerifyResult {
  const matched: Product[] = [];
  const matchedIds = new Set<string>();
  const unmatched: string[] = [];
  const genericIngredients: GenericIngredientMatch[] = [];
  const assumptions: Assumption[] = [];
  for (const name of productNames) {
    const m = resolveProduct(name);
    if (m) {
      // Dedup by product id: the same SKU named twice (e.g. "Advil" and
      // "Advil 200mg", both -> advil) is ONE product, not two — counting it twice
      // would double the ledger and flag a false danger. This is a checker, not a
      // quantity tracker; "how much I already took" is out of scope (see tool.ts). (B-20)
      if (matchedIds.has(m.product.id)) continue;
      matchedIds.add(m.product.id);
      matched.push(m.product);
      if (m.assumedDefault) {
        assumptions.push({
          input: name,
          resolvedTo: m.product.brand,
          alternatives: m.alternatives.map((a) => a.brand),
        });
      }
      continue;
    }
    // Not a catalog product — is it a bare active-ingredient name? If so it still
    // counts toward duplication/class overlap (B-8: catch "acetaminophen + Tylenol"),
    // but with an unknown amount it contributes 0 mg — we never invent a dose.
    const ing = matchGenericIngredient(name);
    if (ing) genericIngredients.push({ input: name, ingredient: ing });
    else unmatched.push(name);
  }

  // Build ingredient ledger: ingredient -> contributions per product
  const ledger = new Map<string, IngredientContribution[]>();
  for (const p of matched) {
    for (const ing of p.ingredients) {
      const contribution: IngredientContribution = {
        brand: p.brand,
        maxDailyMg: ing.mgPerDose * p.maxDosesPerDay,
        mgPerDose: ing.mgPerDose,
        unitsPerDose: p.unitsPerDose,
        dosesPerDay: p.maxDosesPerDay,
        doseForm: p.doseForm,
      };
      const list = ledger.get(ing.ingredient) ?? [];
      list.push(contribution);
      ledger.set(ing.ingredient, list);
    }
  }

  // Inject bare active-ingredient inputs (B-8). They count toward duplication and
  // class overlap but carry 0 mg — an unknown amount we will not invent a value for.
  for (const gi of genericIngredients) {
    const contribution: IngredientContribution = {
      brand: `${INGREDIENTS[gi.ingredient]?.displayName ?? gi.ingredient} (as named, amount not specified)`,
      maxDailyMg: 0,
      mgPerDose: 0,
      unitsPerDose: 0,
      dosesPerDay: 0,
      doseForm: "unspecified",
    };
    const list = ledger.get(gi.ingredient) ?? [];
    list.push(contribution);
    ledger.set(gi.ingredient, list);
  }

  // Ingredient-level findings
  const findings: IngredientFinding[] = [];
  for (const [ingredient, contributions] of ledger) {
    const ref = INGREDIENTS[ingredient];
    const total = contributions.reduce((s, c) => s + c.maxDailyMg, 0);
    const limit = ref?.maxDailyMg ?? null;
    const duplicated = contributions.length >= 2;
    const exceedsLimit = limit != null && total > limit;

    let severity: Severity = "ok";
    if (exceedsLimit) severity = "danger";
    else if (duplicated) severity = "caution";

    const displayName = ref?.displayName ?? ingredient;
    let message: string;
    if (exceedsLimit && duplicated) {
      message = `${displayName} appears in ${contributions.length} products (${contributions
        .map((c) => c.brand)
        .join(", ")}). Combined at label maximums (~${total} mg/day) this exceeds the ${limit} mg/day limit — risk of overdose.`;
    } else if (exceedsLimit) {
      message = `${displayName} at label maximum (~${total} mg/day) exceeds the ${limit} mg/day limit.`;
    } else if (duplicated) {
      message = `${displayName} appears in more than one product (${contributions
        .map((c) => c.brand)
        .join(", ")}). Doses add up — do not take these together without checking the total.`;
    } else {
      message = `${displayName}: within the single-product label range.`;
    }

    findings.push({
      ingredient,
      displayName,
      class: ref?.class ?? "unknown",
      contributions,
      totalMaxDailyMg: total,
      limitMg: limit,
      duplicated,
      exceedsLimit,
      severity,
      message,
      risk: ref?.risk ?? "",
      efficacyNote: ref?.efficacyNote,
      efficacyRefs: ref?.efficacyRefs,
      source: ref?.source ?? "",
      needsVerification: ref?.verify ?? true,
      dosing: ref?.dosing,
    });
  }

  // Same-drug (isomer / active-metabolite) duplication: distinct ingredient keys
  // that share a dupGroup are the SAME active moiety, so taking both is a
  // duplication even though the keys differ (B-17: levocetirizine is the
  // R-enantiomer of cetirizine). Treated as a caution — doses add up.
  const classFindings: ClassFinding[] = [];
  const dupGroups = new Map<string, string[]>(); // dupGroup -> ingredient keys present
  for (const key of ledger.keys()) {
    const g = INGREDIENTS[key]?.dupGroup;
    if (g) dupGroups.set(g, [...(dupGroups.get(g) ?? []), key]);
  }
  for (const [, keys] of dupGroups) {
    if (keys.length < 2) continue;
    const names = keys.map((k) => INGREDIENTS[k]?.displayName ?? k);
    const brands = keys.flatMap((k) => (ledger.get(k) ?? []).map((c) => c.brand));
    classFindings.push({
      className: "same-drug",
      ingredients: names,
      brands: [...new Set(brands)],
      severity: "caution",
      message: `Same drug: ${names.join(" + ")} are the same antihistamine (one is the active isomer of the other). Taking both doubles the dose — do not combine.`,
    });
  }

  // Class-level findings: multiple DISTINCT ingredients of the same risk class
  const CLASS_RULES: Record<string, Severity> = {
    nsaid: "danger",
    decongestant: "caution",
    "antihistamine-sedating": "caution",
    "antihistamine-nonsedating": "caution",
  };
  const CLASS_LABEL: Record<string, string> = {
    nsaid: "Multiple NSAIDs",
    decongestant: "Multiple decongestants",
    "antihistamine-sedating": "Multiple sedating antihistamines",
    "antihistamine-nonsedating": "Multiple antihistamines",
  };
  const CLASS_WHY: Record<string, string> = {
    nsaid: "Combining NSAIDs raises the risk of GI bleeding and kidney injury.",
    decongestant: "Combining decongestants adds cardiovascular strain (blood pressure, heart rate).",
    "antihistamine-sedating": "Combining sedating antihistamines adds up drowsiness and anticholinergic effects.",
    "antihistamine-nonsedating": "Two antihistamines give no added benefit and more side effects — take just one.",
  };
  for (const [className, sev] of Object.entries(CLASS_RULES)) {
    const ings = [...ledger.keys()].filter(
      (i) => (INGREDIENTS[i]?.class ?? "") === className,
    );
    if (ings.length >= 2) {
      const brands = ings.flatMap((i) =>
        (ledger.get(i) ?? []).map((c) => c.brand),
      );
      const names = ings.map((i) => INGREDIENTS[i]?.displayName ?? i);
      classFindings.push({
        className,
        ingredients: names,
        brands: [...new Set(brands)],
        severity: sev,
        message: `${CLASS_LABEL[className]}: ${names.join(" + ")}. ${CLASS_WHY[className]}`,
      });
    }
  }

  // Overall severity
  let overall: Severity = "ok";
  for (const f of findings) overall = maxSeverity(overall, f.severity);
  for (const c of classFindings) overall = maxSeverity(overall, c.severity);

  const summary = buildSummary(overall, findings, classFindings, unmatched);

  return {
    input: productNames,
    matched,
    unmatched,
    genericIngredients,
    assumptions,
    findings,
    classFindings,
    overall,
    summary,
  };
}

function buildSummary(
  overall: Severity,
  findings: IngredientFinding[],
  classFindings: ClassFinding[],
  unmatched: string[],
): string {
  const flags = [
    ...findings.filter((f) => f.severity !== "ok").map((f) => f.message),
    ...classFindings.map((c) => c.message),
  ];
  const head =
    overall === "danger"
      ? "DANGER — do not take these together as-is."
      : overall === "caution"
        ? "CAUTION — check before combining."
        : "No ingredient duplication or dose ceiling problems found.";
  const body = flags.length ? " " + flags.join(" ") : "";
  const tail = unmatched.length
    ? ` (Not recognized: ${unmatched.join(", ")}.)`
    : "";
  return head + body + tail;
}
