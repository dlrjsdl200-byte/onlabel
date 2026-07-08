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
}

export interface ProductIngredient {
  ingredient: string;
  mgPerDose: number;
}

export interface Product {
  id: string;
  brand: string;
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
}

export interface ClassFinding {
  className: string;
  ingredients: string[];
  brands: string[];
  severity: Severity;
  message: string;
}

export interface VerifyResult {
  input: string[];
  matched: Product[];
  unmatched: string[];
  findings: IngredientFinding[];
  classFindings: ClassFinding[];
  overall: Severity;
  summary: string;
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

/** Resolve a free-text product name to a catalog product. */
export function lookupProduct(name: string): Product | null {
  const q = normalize(name);
  if (!q) return null;
  // exact-ish match on id or brand first
  for (const p of PRODUCTS) {
    if (normalize(p.id) === q || normalize(p.brand) === q) return p;
  }
  // contains match (query in brand, or brand-head in query)
  for (const p of PRODUCTS) {
    const brand = normalize(p.brand);
    if (brand.includes(q) || q.includes(normalize(p.id))) return p;
  }
  // token overlap: first significant token of query appears in brand
  for (const p of PRODUCTS) {
    const brand = normalize(p.brand);
    if (q.split(" ").some((t) => t.length >= 4 && brand.includes(t))) return p;
  }
  return null;
}

/**
 * Verify a set of products taken together.
 * @param productNames free-text product names (brand or catalog id)
 */
export function verify(productNames: string[]): VerifyResult {
  const matched: Product[] = [];
  const unmatched: string[] = [];
  for (const name of productNames) {
    const p = lookupProduct(name);
    if (p) matched.push(p);
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
    });
  }

  // Class-level findings: multiple DISTINCT ingredients of the same risk class
  const classFindings: ClassFinding[] = [];
  const CLASS_RULES: Record<string, Severity> = {
    nsaid: "danger",
    decongestant: "caution",
    "antihistamine-sedating": "caution",
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
      const label =
        className === "nsaid"
          ? "Multiple NSAIDs"
          : className === "decongestant"
            ? "Multiple decongestants"
            : "Multiple sedating antihistamines";
      const why =
        className === "nsaid"
          ? "Combining NSAIDs raises the risk of GI bleeding and kidney injury."
          : className === "decongestant"
            ? "Combining decongestants adds cardiovascular strain (blood pressure, heart rate)."
            : "Combining sedating antihistamines adds up drowsiness and anticholinergic effects.";
      classFindings.push({
        className,
        ingredients: names,
        brands: [...new Set(brands)],
        severity: sev,
        message: `${label}: ${names.join(" + ")}. ${why}`,
      });
    }
  }

  // Overall severity
  let overall: Severity = "ok";
  for (const f of findings) overall = maxSeverity(overall, f.severity);
  for (const c of classFindings) overall = maxSeverity(overall, c.severity);

  const summary = buildSummary(overall, findings, classFindings, unmatched);

  return { input: productNames, matched, unmatched, findings, classFindings, overall, summary };
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
