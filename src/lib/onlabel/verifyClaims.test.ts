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
test("dose-limit: wrong acetaminophen ceiling -> CONTRADICTED with correct value", () => {
  const r = verify(["Tylenol Extra Strength"]);
  const v = verifyClinicalClaim(
    { text: "max 3000 mg", kind: "dose-limit", ingredient: "acetaminophen", assertedNumber: 3000, assertedUnit: "mg/day" },
    r,
  );
  assert.strictEqual(v.status, "CONTRADICTED");
  assert.match(v.basis, /4000 mg/);
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

test("duplication: acetaminophen doubled across products -> VERIFIED (duplicated)", () => {
  const r = verify(["Tylenol Extra Strength", "Vicks NyQuil Cold & Flu"]);
  const v = verifyClinicalClaim(
    { text: "acetaminophen is in both", kind: "duplication", ingredient: "acetaminophen" },
    r,
  );
  assert.strictEqual(v.status, "VERIFIED");
  assert.match(v.basis, /duplicated/);
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
