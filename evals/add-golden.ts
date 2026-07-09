/**
 * Deterministic golden-set appender.
 *
 * Reads author-written candidate items from `evals/staging-golden.json` and adds
 * them to `evals/golden.json` — but it NEVER lets the author hand-write the
 * verdict. The verdict / flagged ingredients / flagged classes / efficacy-note
 * expectations are COMPUTED by verify() (the neuro-symbolic trust core), so a
 * golden label can never disagree with the verifier that check-golden.ts gates
 * on. The author only supplies the question, the product names, and the ANSWER
 * expectations (mustMention / mustNotClaim / mustEscalate / ...).
 *
 * Staging file shape:
 *   {
 *     "items": [
 *       {
 *         "id": "x101-...",              // required, unique
 *         "category": "danger-...",      // required
 *         "question": "...",             // required
 *         "products": ["Advil", ...],    // may be [] for product-less recs
 *         "expected": {                  // ONLY answer fields here; no verdict
 *           "mustMention": [...],
 *           "mustNotClaim": [...],
 *           "mustEscalate": true,
 *           "mustAskForProducts": true,
 *           "mustAdvisePharmacist": true
 *         },
 *         "note": "why this case matters"
 *       }
 *     ]
 *   }
 *
 * Hard failures (nothing is written):
 *   - duplicate id (already in golden.json or repeated in staging)
 *   - a product name that verify() cannot resolve (golden must not cite unknown
 *     brands — that would be an un-checkable label)
 *   - the author put a `verdict` in expected (we compute it; refuse to be told)
 *
 * Run: npx tsx evals/add-golden.ts
 *      npx tsx evals/add-golden.ts --dry   (compute + validate, write nothing)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { verify } from "../src/lib/onlabel/verify";

type Severity = "ok" | "caution" | "danger";

interface AnswerExpected {
  mustMention?: string[];
  mustNotClaim?: string[];
  mustEscalate?: boolean;
  mustAskForProducts?: boolean;
  mustAdvisePharmacist?: boolean;
}
interface ComputedExpected extends AnswerExpected {
  verdict?: Severity;
  ingredientsFlagged?: string[];
  classFlagged?: string[];
  efficacyNote?: boolean;
}
interface StagedItem {
  id: string;
  category: string;
  question: string;
  products?: string[];
  expected?: AnswerExpected & { verdict?: unknown };
  note?: string;
}
interface GoldenItem {
  id: string;
  category: string;
  question: string;
  products: string[];
  expected: ComputedExpected;
  note?: string;
  review: string;
}

const ROOT = process.cwd();
const GOLDEN_PATH = join(ROOT, "evals", "golden.json");
const STAGING_PATH = join(ROOT, "evals", "staging-golden.json");
const DRY = process.argv.includes("--dry");

function fail(msg: string): never {
  console.error(`\n✗ add-golden aborted — nothing written.\n  ${msg}\n`);
  process.exit(1);
}

if (!existsSync(STAGING_PATH)) {
  fail(
    `no staging file at evals/staging-golden.json.\n` +
      `  Create it with { "items": [ ... ] } (see the header of this script).`,
  );
}

const golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf8")) as {
  _meta: Record<string, unknown> & { count?: number; updated?: string };
  items: GoldenItem[];
};
const staging = JSON.parse(readFileSync(STAGING_PATH, "utf8")) as { items?: StagedItem[] };

const staged = staging.items ?? [];
if (staged.length === 0) fail("staging file has no items.");

const existingIds = new Set(golden.items.map((it) => it.id));
const seenInStaging = new Set<string>();
const added: GoldenItem[] = [];

for (const s of staged) {
  if (!s.id || !s.category || !s.question) {
    fail(`item is missing a required field (id/category/question): ${JSON.stringify(s)}`);
  }
  if (existingIds.has(s.id)) fail(`duplicate id already in golden.json: "${s.id}"`);
  if (seenInStaging.has(s.id)) fail(`duplicate id within staging file: "${s.id}"`);
  seenInStaging.add(s.id);

  const author = (s.expected ?? {}) as AnswerExpected & { verdict?: unknown };
  if ("verdict" in author && author.verdict !== undefined) {
    fail(
      `item "${s.id}" hand-wrote a verdict. Remove it — verdict is COMPUTED by ` +
        `verify(), never authored (neuro-symbolic rule).`,
    );
  }

  const products = s.products ?? [];
  const expected: ComputedExpected = {
    // author-supplied answer expectations pass through unchanged
    ...(author.mustMention ? { mustMention: author.mustMention } : {}),
    ...(author.mustNotClaim ? { mustNotClaim: author.mustNotClaim } : {}),
    ...(author.mustEscalate ? { mustEscalate: author.mustEscalate } : {}),
    ...(author.mustAskForProducts ? { mustAskForProducts: author.mustAskForProducts } : {}),
    ...(author.mustAdvisePharmacist ? { mustAdvisePharmacist: author.mustAdvisePharmacist } : {}),
  };

  // Compute the deterministic expectation from verify() when there are products.
  // (Product-less items — open recommendations — are answer-graded only.)
  if (products.length > 0) {
    const r = verify(products);
    if (r.unmatched.length) {
      fail(
        `item "${s.id}" references product(s) verify() cannot resolve: ` +
          `${r.unmatched.join(", ")}. Fix the name or add the product to the catalog.`,
      );
    }
    expected.verdict = r.overall;
    const flaggedIngredients = r.findings
      .filter((f) => f.severity !== "ok")
      .map((f) => f.ingredient);
    if (flaggedIngredients.length) expected.ingredientsFlagged = flaggedIngredients;
    const flaggedClasses = r.classFindings.map((c) => c.className);
    if (flaggedClasses.length) expected.classFlagged = flaggedClasses;
    if (r.findings.some((f) => f.efficacyNote)) expected.efficacyNote = true;
  }

  added.push({
    id: s.id,
    category: s.category,
    question: s.question,
    products,
    expected,
    ...(s.note ? { note: s.note } : {}),
    review: "pending",
  });
}

// ── report ────────────────────────────────────────────────────────────────
console.log(`\nComputed ${added.length} new golden item(s) via verify():\n`);
for (const it of added) {
  const v = it.expected.verdict ?? "(answer-only)";
  const flags = [
    ...(it.expected.ingredientsFlagged ?? []),
    ...(it.expected.classFlagged ?? []),
  ].join(", ");
  console.log(`  ${it.id}  →  ${v}${flags ? `  [${flags}]` : ""}`);
}

if (DRY) {
  console.log(`\n(--dry) validated only, golden.json unchanged.`);
  console.log(`New ids: ${added.map((it) => it.id).join(",")}\n`);
  process.exit(0);
}

golden.items.push(...added);
golden._meta.count = golden.items.length;
golden._meta.updated = new Date().toISOString().slice(0, 10);
writeFileSync(GOLDEN_PATH, JSON.stringify(golden, null, 2) + "\n");

console.log(`\n✓ Appended to evals/golden.json — new count: ${golden.items.length}`);
console.log(`\nNext:`);
console.log(`  1. npx tsx evals/check-golden.ts           # deterministic gate (must pass)`);
console.log(`  2. npm run eval:live -- --only=${added.map((it) => it.id).join(",")}`);
console.log(`     (paid: ${added.length} live call(s) — new items only)\n`);
console.log(`NEW_IDS=${added.map((it) => it.id).join(",")}\n`);
