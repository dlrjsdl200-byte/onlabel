/**
 * Cross-check the golden set's deterministic expectations against verify().
 * This validates that the golden labels are internally consistent with the
 * KB + verifier BEFORE we use them to grade the LLM. A wrong golden label is
 * worse than no eval.
 * Run: npx tsx evals/check-golden.ts
 */
import assert from "node:assert";
import golden from "./golden.json";
import { verify } from "../src/lib/onlabel/verify";

interface Expected {
  verdict?: "ok" | "caution" | "danger";
  ingredientsFlagged?: string[];
  classFlagged?: string[];
  efficacyNote?: boolean;
}
interface Item {
  id: string;
  category: string;
  question: string;
  products: string[];
  expected: Expected;
}

const items = (golden as { items: Item[] }).items;
let checked = 0;
let failures = 0;

for (const item of items) {
  const e = item.expected;
  // Only deterministic items: has products AND a verdict expectation
  if (!item.products.length || !e.verdict) continue;
  checked++;

  const r = verify(item.products);
  const errs: string[] = [];

  // all products should have matched (else the golden references unknown brands)
  if (r.unmatched.length) errs.push(`unmatched products: ${r.unmatched.join(", ")}`);

  if (r.overall !== e.verdict) errs.push(`verdict: expected ${e.verdict}, got ${r.overall}`);

  for (const ing of e.ingredientsFlagged ?? []) {
    const f = r.findings.find((x) => x.ingredient === ing);
    if (!f) errs.push(`ingredient '${ing}' not found`);
    else if (f.severity === "ok") errs.push(`ingredient '${ing}' present but not flagged`);
  }

  for (const cls of e.classFlagged ?? []) {
    if (!r.classFindings.find((c) => c.className === cls))
      errs.push(`class '${cls}' not flagged`);
  }

  if (e.efficacyNote) {
    if (!r.findings.some((f) => f.efficacyNote))
      errs.push(`expected an efficacy note, none present`);
  }

  if (errs.length) {
    failures++;
    console.error(`FAIL ${item.id} [${item.category}]`);
    for (const er of errs) console.error(`     - ${er}`);
  } else {
    console.log(`ok   ${item.id}`);
  }
}

console.log(`\n${checked - failures}/${checked} deterministic golden items consistent with verify()`);
try {
  assert.strictEqual(failures, 0);
} catch {
  process.exitCode = 1;
}
