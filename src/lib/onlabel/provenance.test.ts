/**
 * Tests for the deterministic provenance & red-flag gates (D34 / D35).
 * Run: npx tsx src/lib/onlabel/provenance.test.ts
 */
import assert from "node:assert";
import { namedInQuestion, userNamedProducts, hasRedFlagContext } from "./provenance";

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

console.log("OnLabel provenance/red-flag gate tests\n");

// ── checker gate (D34): only user-named products count ────────────────────────
test("a product named in the question is kept", () => {
  assert.ok(namedInQuestion("Can I take Excedrin and Tylenol together?", "Tylenol"));
  assert.ok(namedInQuestion("Can I take Excedrin and Tylenol together?", "Excedrin"));
});

test("fuzzy 'regular tylenol' still counts as named (distinctive token 'tylenol')", () => {
  assert.ok(namedInQuestion("Can I take Tylenol PM and regular Tylenol?", "Tylenol Extra Strength"));
});

test("an LLM-inferred product for an open question is dropped", () => {
  const q = "i feel like crap, stuffy nose and a pounding headache, what do i take";
  assert.ok(!namedInQuestion(q, "DayQuil"));
  assert.ok(!namedInQuestion(q, "Tylenol Extra Strength"));
});

test("userNamedProducts keeps named, drops inferred", () => {
  assert.deepStrictEqual(
    userNamedProducts("Can I take Sudafed with DayQuil?", ["Sudafed", "DayQuil"]),
    ["Sudafed", "DayQuil"],
  );
  assert.deepStrictEqual(
    userNamedProducts("What can I take for a fever and chills?", ["Tylenol", "Advil"]),
    [],
  );
});

test("a colloquial-only token does not by itself make a product 'named'", () => {
  // "regular" alone is filler; without "tylenol" in the question it must not match.
  assert.ok(!namedInQuestion("what's the regular dose", "Tylenol Regular Strength"));
});

// ── red-flag detector (D35) ───────────────────────────────────────────────────
test("pregnancy / breastfeeding cues fire", () => {
  assert.ok(hasRedFlagContext("Is it safe to take Tylenol while pregnant?"));
  assert.ok(hasRedFlagContext("Can I take Advil when breastfeeding?"));
  assert.ok(hasRedFlagContext("I'm nursing, is Sudafed ok?"));
});

test("pediatric cues fire (age phrases + child words)", () => {
  assert.ok(hasRedFlagContext("Can I give my 4 year old regular Tylenol?"));
  assert.ok(hasRedFlagContext("Is Benadryl safe for a 2 year old?"));
  assert.ok(hasRedFlagContext("Is it ok to give my toddler Sudafed?"));
  assert.ok(hasRedFlagContext("my kid has a fever what do i give him"));
});

test("major condition cues fire", () => {
  assert.ok(hasRedFlagContext("I have liver disease, how much Tylenol is safe?"));
  assert.ok(hasRedFlagContext("I have an ulcer, is Advil safe?"));
  assert.ok(hasRedFlagContext("I have high blood pressure, can I take Sudafed?"));
  assert.ok(hasRedFlagContext("Can I take ibuprofen if I have kidney problems?"));
});

test("an ordinary adult combination question does NOT fire red-flag", () => {
  assert.ok(!hasRedFlagContext("Can I take Tylenol and Advil together for pain?"));
  assert.ok(!hasRedFlagContext("What's the difference between Mucinex and Mucinex DM?"));
});

console.log(`\n${passed} passed`);
