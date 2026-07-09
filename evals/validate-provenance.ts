/**
 * Validate the provenance/red-flag gates against ALREADY-RECORDED probe
 * transcripts — no live calls, no cost. Proves the checker gate (D34) drops only
 * LLM-inferred products and never a product the user actually named, and that the
 * red-flag detector (D35) fires on the intended contexts.
 *
 * Run: npx tsx evals/validate-provenance.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { userNamedProducts, hasRedFlagContext } from "../src/lib/onlabel/provenance";

interface Row {
  n: number;
  question: string;
  productsChecked: string[];
  verdict: string | null;
}

const dir = join(process.cwd(), "evals", "transcripts");
const files = readdirSync(dir).filter((f) => f.startsWith("probe-") && f.endsWith(".jsonl"));
if (files.length === 0) {
  console.error("No probe-*.jsonl transcripts found. Run `npm run collect` first.");
  process.exit(1);
}

let total = 0;
let droppedProducts = 0;
let redFlagHits = 0;
const dropCases: string[] = [];
const redFlagCases: string[] = [];

for (const file of files) {
  const rows = readFileSync(join(dir, file), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Row);

  for (const r of rows) {
    total++;
    const kept = userNamedProducts(r.question, r.productsChecked);
    const dropped = r.productsChecked.filter((p) => !kept.includes(p));
    if (dropped.length) {
      droppedProducts += dropped.length;
      dropCases.push(
        `  [${file.slice(6, 16)} #${r.n}] dropped {${dropped.join(", ")}} · kept {${kept.join(", ") || "—"}}\n     Q: ${r.question}`,
      );
    }
    if (hasRedFlagContext(r.question)) {
      redFlagHits++;
      redFlagCases.push(`  #${r.n} (verdict was ${r.verdict ?? "none"}) — ${r.question}`);
    }
  }
}

console.log(`Replayed ${total} recorded probes across ${files.length} transcript(s).\n`);

console.log(`── Checker gate (D34): products the user did NOT name → dropped from verdict ──`);
console.log(`Dropped ${droppedProducts} product mention(s):\n`);
console.log(dropCases.join("\n") || "  (none)");

console.log(`\n── Red-flag detector (D35): verdict would be suppressed / deferred ──`);
console.log(`Fired on ${redFlagHits} question(s):\n`);
console.log(redFlagCases.join("\n") || "  (none)");

console.log(
  `\nReview the dropped cases above: every drop should be an LLM-inferred product ` +
    `for an open recommendation, NOT a product the user actually typed. A user-named ` +
    `product appearing here is a false drop and must be fixed before shipping the gate.`,
);
