/**
 * Smoke tests for the OnLabel deterministic verifier.
 * Run: npx tsx src/lib/onlabel/verify.test.ts
 */
import assert from "node:assert";
import { verify } from "./verify";
import productsData from "../../data/products.json";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok   ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL ${name}`);
    console.error("       " + (err as Error).message);
    process.exitCode = 1;
  }
}

console.log("OnLabel verifier smoke tests\n");

// Flagship: Tylenol Extra Strength + DayQuil -> hidden acetaminophen duplication + overdose
test("Tylenol Extra Strength + DayQuil flags acetaminophen duplication + danger", () => {
  const r = verify(["Tylenol Extra Strength", "DayQuil"]);
  assert.strictEqual(r.matched.length, 2, "both products should match");
  const apap = r.findings.find((f) => f.ingredient === "acetaminophen");
  assert.ok(apap, "acetaminophen finding should exist");
  assert.strictEqual(apap!.duplicated, true, "acetaminophen should be duplicated");
  assert.strictEqual(apap!.exceedsLimit, true, "combined APAP should exceed 4000 mg/day");
  assert.strictEqual(r.overall, "danger", "overall verdict should be danger");
});

// Single product, normal use -> ok
test("Advil alone is ok", () => {
  const r = verify(["Advil"]);
  assert.strictEqual(r.overall, "ok");
});

// Two different NSAIDs -> class rule danger
test("Advil + Aleve flags multiple NSAIDs (danger)", () => {
  const r = verify(["Advil", "Aleve"]);
  const nsaid = r.classFindings.find((c) => c.className === "nsaid");
  assert.ok(nsaid, "nsaid class finding should exist");
  assert.strictEqual(r.overall, "danger");
});

// Hidden APAP in PM combo + Tylenol
test("Tylenol Extra Strength + Tylenol PM flags acetaminophen duplication", () => {
  const r = verify(["Tylenol Extra Strength", "Tylenol PM"]);
  const apap = r.findings.find((f) => f.ingredient === "acetaminophen");
  assert.ok(apap && apap.duplicated, "acetaminophen duplicated across daytime + PM");
  assert.notStrictEqual(r.overall, "ok");
});

// Phenylephrine efficacy note surfaces
test("DayQuil surfaces phenylephrine efficacy note", () => {
  const r = verify(["DayQuil"]);
  const pe = r.findings.find((f) => f.ingredient === "phenylephrine");
  assert.ok(pe, "phenylephrine finding should exist");
  assert.ok(pe!.efficacyNote && pe!.efficacyNote.length > 0, "efficacy note present");
});

// Unknown product is reported, not crashed
test("Unknown product is reported as unmatched", () => {
  const r = verify(["Nonexistent Brand XYZ"]);
  assert.strictEqual(r.unmatched.length, 1);
  assert.strictEqual(r.matched.length, 0);
});

// Invariant: any single product at its own label max must not be "danger".
// A single compliant OTC product cannot exceed an ingredient's daily limit;
// if it does, that ingredient's maxDailyMg is set too low (data error).
test("no single catalog product is danger on its own", () => {
  const products = (productsData as { products: { brand: string }[] }).products;
  for (const p of products) {
    const r = verify([p.brand]);
    assert.notStrictEqual(
      r.overall,
      "danger",
      `${p.brand} flags danger alone — an ingredient limit is likely too low`,
    );
  }
});

console.log(`\n${passed} passed`);
