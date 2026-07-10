/**
 * Unit tests for the deterministic [D-clinical] claim verifier.
 * Run: npx tsx src/lib/onlabel/verifyClaims.test.ts
 *
 * These are the neuro-symbolic heart: a generic-LLM claim is judged by code
 * against FDA data, never by an LLM. The killer demo cases are a wrong verdict
 * ("safe together") and a wrong number, both caught as CONTRADICTED.
 */
import assert from "node:assert";
import { verify } from "./verify";
import { verifyClinicalClaim } from "./verifyClaims";
import type { Claim } from "./claims";

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

// The flagship contradiction: generic LLM says "safe together", FDA says danger.
test("combination-safety: 'safe together' vs deterministic danger -> CONTRADICTED", () => {
  const r = verify(["Tylenol Extra Strength", "Vicks NyQuil Cold & Flu"]);
  const claim: Claim = {
    text: "These are safe to take together.",
    kind: "combination-safety",
    assertedVerdict: "ok",
  };
  const v = verifyClinicalClaim(claim, r);
  assert.strictEqual(v.status, "CONTRADICTED");
  assert.ok(v.deterministic);
  assert.match(v.basis, /DANGER/);
});

test("combination-safety: correct 'danger' assertion -> VERIFIED", () => {
  const r = verify(["Tylenol Extra Strength", "Vicks NyQuil Cold & Flu"]);
  const v = verifyClinicalClaim(
    { text: "Do not combine.", kind: "combination-safety", assertedVerdict: "danger" },
    r,
  );
  assert.strictEqual(v.status, "VERIFIED");
});

// A wrong clinical number is caught deterministically with the correct value.
test("dose-limit: dangerously high acetaminophen ceiling -> CONTRADICTED", () => {
  const r = verify(["Tylenol Extra Strength"]);
  const v = verifyClinicalClaim(
    { text: "max 6000 mg", kind: "dose-limit", ingredient: "acetaminophen", assertedNumber: 6000, assertedUnit: "mg/day" },
    r,
  );
  assert.strictEqual(v.status, "CONTRADICTED");
  assert.match(v.basis, /4000 mg/);
});

// B-10: a figure AT/BELOW the FDA ceiling is a safe, more conservative daily
// limit — do not contradict it (and do not invent a specific "target" number).
// The FDA ceiling (4,000 mg) is grounded either way.
test("dose-limit: acetaminophen 3,000 mg is within the 4,000 ceiling -> VERIFIED (not contradicted)", () => {
  const r = verify(["Tylenol Extra Strength"]);
  const v = verifyClinicalClaim(
    { text: "keep under 3000 mg a day", kind: "dose-limit", ingredient: "acetaminophen", assertedNumber: 3000 },
    r,
  );
  assert.strictEqual(v.status, "VERIFIED");
  assert.match(v.basis, /within the FDA ceiling of 4000 mg/i);
});

// B-10: a per-PILL amount ("500 mg per pill") is TRUE and must not be contradicted
// against the per-DOSE figure (1,000 mg = two 500 mg caplets).
test("single-dose: per-pill 500 mg for Tylenol ES -> VERIFIED (not per-dose confusion)", () => {
  const r = verify(["Tylenol Extra Strength"]);
  const v = verifyClinicalClaim(
    { text: "Tylenol Extra Strength is 500 mg per pill", kind: "single-dose", ingredient: "acetaminophen", assertedNumber: 500 },
    r,
  );
  assert.strictEqual(v.status, "VERIFIED");
});

test("single-dose: per-dose 1,000 mg for Tylenol ES -> VERIFIED", () => {
  const r = verify(["Tylenol Extra Strength"]);
  const v = verifyClinicalClaim(
    { text: "1000 mg per dose", kind: "single-dose", ingredient: "acetaminophen", assertedNumber: 1000 },
    r,
  );
  assert.strictEqual(v.status, "VERIFIED");
});

test("single-dose: a genuinely wrong per-dose amount (800 mg) -> CONTRADICTED", () => {
  const r = verify(["Tylenol Extra Strength"]);
  const v = verifyClinicalClaim(
    { text: "800 mg per dose", kind: "single-dose", ingredient: "acetaminophen", assertedNumber: 800 },
    r,
  );
  assert.strictEqual(v.status, "CONTRADICTED");
});

test("dose-limit: correct ceiling -> VERIFIED with citation", () => {
  const r = verify(["Advil"]);
  const v = verifyClinicalClaim(
    { text: "max 1200 mg", kind: "dose-limit", ingredient: "ibuprofen", assertedNumber: 1200 },
    r,
  );
  assert.strictEqual(v.status, "VERIFIED");
  assert.strictEqual(v.citationIngredient, "ibuprofen");
});

test("interval: grounded acetaminophen 'every 6 hours' -> VERIFIED", () => {
  const r = verify(["Tylenol Extra Strength"]);
  const v = verifyClinicalClaim(
    { text: "every 6 hours", kind: "interval", ingredient: "acetaminophen", assertedText: "every 6 hours" },
    r,
  );
  assert.strictEqual(v.status, "VERIFIED");
});

test("interval: ibuprofen has no KB interval -> UNSUPPORTED (fence, not invented)", () => {
  const r = verify(["Advil"]);
  const v = verifyClinicalClaim(
    { text: "every 4 hours", kind: "interval", ingredient: "ibuprofen", assertedText: "every 4 hours" },
    r,
  );
  assert.strictEqual(v.status, "UNSUPPORTED");
});

test("duration: acetaminophen '10 days' -> VERIFIED", () => {
  const r = verify(["Tylenol Extra Strength"]);
  const v = verifyClinicalClaim(
    { text: "up to 10 days", kind: "duration", ingredient: "acetaminophen", assertedText: "up to 10 days for pain" },
    r,
  );
  assert.strictEqual(v.status, "VERIFIED");
});

test("ingredient-identity: Advil is ibuprofen -> VERIFIED", () => {
  const r = verify(["Advil"]);
  const v = verifyClinicalClaim(
    { text: "Advil is ibuprofen", kind: "ingredient-identity", ingredient: "ibuprofen", product: "Advil" },
    r,
  );
  assert.strictEqual(v.status, "VERIFIED");
});

// B-23: a FALSE product-containment claim must be CONTRADICTED, not waved through.
test("ingredient-identity: 'DayQuil contains ibuprofen' (false) -> CONTRADICTED", () => {
  const r = verify(["DayQuil"]);
  const v = verifyClinicalClaim(
    { text: "DayQuil contains ibuprofen", kind: "ingredient-identity", ingredient: "ibuprofen", product: "DayQuil" },
    r,
  );
  assert.strictEqual(v.status, "CONTRADICTED");
});
test("ingredient-identity: claim about the WRONG named product -> CONTRADICTED", () => {
  // ibuprofen is in Advil, NOT Tylenol; the claim is about Tylenol -> false.
  const r = verify(["Tylenol Extra Strength", "Advil"]);
  const v = verifyClinicalClaim(
    { text: "Tylenol contains ibuprofen", kind: "ingredient-identity", ingredient: "ibuprofen", product: "Tylenol" },
    r,
  );
  assert.strictEqual(v.status, "CONTRADICTED");
});

test("duplication: acetaminophen doubled across products -> VERIFIED (duplicated)", () => {
  const r = verify(["Tylenol Extra Strength", "Vicks NyQuil Cold & Flu"]);
  const v = verifyClinicalClaim(
    { text: "acetaminophen is in both", kind: "duplication", ingredient: "acetaminophen" },
    r,
  );
  assert.strictEqual(v.status, "VERIFIED");
  assert.match(v.basis, /duplicated/);
});

// Scope fix: a combination-safety claim about a DIFFERENT product set (NSAID +
// Tylenol) must be checked against ITS OWN scope, not the question's verdict.
test("combination-safety: claim-scoped products override the top-level verdict", () => {
  const top = verify(["Advil", "Aleve"]); // danger (two NSAIDs)
  const v = verifyClinicalClaim(
    {
      text: "You can safely combine an NSAID with Tylenol.",
      kind: "combination-safety",
      assertedVerdict: "ok",
      assertedProducts: ["Advil", "Tylenol Extra Strength"],
    },
    top,
  );
  assert.strictEqual(v.status, "VERIFIED");
  assert.match(v.basis, /Advil \+ Tylenol/);
});

test("unknown ingredient -> UNSUPPORTED (no fabrication)", () => {
  const r = verify(["Advil"]);
  const v = verifyClinicalClaim(
    { text: "max 500 mg", kind: "dose-limit", ingredient: "unobtanium", assertedNumber: 500 },
    r,
  );
  assert.strictEqual(v.status, "UNSUPPORTED");
});

console.log(`\n${passed} passed`);
