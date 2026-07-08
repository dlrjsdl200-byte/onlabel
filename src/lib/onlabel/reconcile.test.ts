/**
 * Unit tests for the [E] reconciler.
 * Run: npx tsx src/lib/onlabel/reconcile.test.ts
 */
import assert from "node:assert";
import { verify } from "./verify";
import { reconcile } from "./reconcile";
import type { ClaimVerdict } from "./claims";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok   ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const verdicts: ClaimVerdict[] = [
  { claim: { text: "safe together", kind: "combination-safety", assertedVerdict: "ok" }, status: "CONTRADICTED", basis: "FDA-grounded verdict is DANGER, not OK", deterministic: true },
  { claim: { text: "max 3000 mg", kind: "dose-limit", ingredient: "acetaminophen", assertedNumber: 3000 }, status: "CONTRADICTED", basis: "ceiling is 4000 mg, not 3000 mg", citationIngredient: "acetaminophen", deterministic: true },
  { claim: { text: "NyQuil has acetaminophen", kind: "ingredient-identity", ingredient: "acetaminophen" }, status: "VERIFIED", basis: "acetaminophen is an active ingredient", deterministic: true },
  { claim: { text: "take with food", kind: "language" }, status: "UNSUPPORTED", basis: "independent verifier: depends", deterministic: false },
];

test("verdict is the deterministic verify() result, never a claim", () => {
  const r = verify(["Tylenol Extra Strength", "Vicks NyQuil Cold & Flu"]);
  const rec = reconcile(r, verdicts);
  assert.strictEqual(rec.verdict, "danger");
});

test("corrections are read off CONTRADICTED claims with their grounded fix", () => {
  const r = verify(["Tylenol Extra Strength", "Vicks NyQuil Cold & Flu"]);
  const rec = reconcile(r, verdicts);
  assert.strictEqual(rec.corrections.length, 2);
  assert.match(rec.corrections[1].correction, /4000 mg/);
  assert.strictEqual(rec.corrections[1].citationIngredient, "acetaminophen");
});

test("verified receipts and unsupported deferrals are separated", () => {
  const r = verify(["Tylenol Extra Strength", "Vicks NyQuil Cold & Flu"]);
  const rec = reconcile(r, verdicts);
  assert.strictEqual(rec.verified.length, 1);
  assert.strictEqual(rec.unsupported.length, 1);
  assert.deepStrictEqual(rec.stats, { verified: 1, contradicted: 2, unsupported: 1 });
});

console.log(`\n${passed} passed`);
