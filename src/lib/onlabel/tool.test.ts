/**
 * Tests for the tool core (runSafetyCheck) — the deterministic part of the
 * agent pipeline, exercised without an LLM.
 * Run: npx tsx src/lib/onlabel/tool.test.ts
 */
import assert from "node:assert";
import { runSafetyCheck } from "./tool";

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

console.log("OnLabel tool-core tests\n");

test("summary leads with DANGER verdict for Tylenol + DayQuil", () => {
  const { text, result } = runSafetyCheck(["Tylenol Extra Strength", "DayQuil"]);
  assert.ok(text.startsWith("VERDICT: DANGER"), "summary should start with DANGER");
  assert.ok(/acetaminophen/i.test(text), "summary should name acetaminophen");
  assert.strictEqual(result.overall, "danger");
});

test("summary includes phenylephrine efficacy note", () => {
  const { text } = runSafetyCheck(["DayQuil"]);
  assert.ok(/phenylephrine/i.test(text), "mentions phenylephrine");
  assert.ok(/not effective|efficacy|NOTE:/i.test(text), "surfaces efficacy note");
});

test("OK verdict for a single product", () => {
  const { text, result } = runSafetyCheck(["Advil"]);
  assert.strictEqual(result.overall, "ok");
  assert.ok(text.startsWith("VERDICT: OK"));
});

test("unmatched product is reported", () => {
  const { text } = runSafetyCheck(["Totally Fake Brand"]);
  assert.ok(/Not in catalog/i.test(text));
});

console.log(`\n${passed} passed`);
