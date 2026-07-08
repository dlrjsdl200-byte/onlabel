/**
 * L1 claim-pipeline demo runner (the contrast engine).
 * Run: node --env-file=.env --import tsx scripts/claim-demo.ts
 *
 * Generates an ungrounded generic-LLM draft, decomposes it into claims, and
 * checks each against FDA data. Records the full paid I/O to a transcript so we
 * never re-bill to re-read the answers.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { runClaimPipeline } from "../src/lib/onlabel/claimPipeline";

const CASES: { question: string; products: string[] }[] = [
  {
    question: "Can I take Tylenol with NyQuil for my cold? How much is safe?",
    products: ["Tylenol Extra Strength", "Vicks NyQuil Cold & Flu"],
  },
  {
    question: "Can I take Advil and Aleve together for a bad backache?",
    products: ["Advil", "Aleve"],
  },
];

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Put it in .env and retry.");
    process.exit(1);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync("evals/transcripts", { recursive: true });
  const path = `evals/transcripts/claims-${stamp}.md`;
  const out: string[] = [`# L1 claim-pipeline transcript\n\nRun: ${new Date().toISOString()}\n`];

  for (const c of CASES) {
    console.log(`\n=== ${c.question}`);
    const r = await runClaimPipeline(c.question, c.products);
    const counts = { VERIFIED: 0, CONTRADICTED: 0, UNSUPPORTED: 0 };
    for (const v of r.verdicts) counts[v.status]++;

    out.push(`## ${c.question}`);
    out.push(`**Products:** ${c.products.join(", ")} · **Deterministic verdict:** ${r.verification.overall.toUpperCase()}`);
    out.push(`**Claim tally:** ✅ ${counts.VERIFIED} VERIFIED · ❌ ${counts.CONTRADICTED} CONTRADICTED · ⚠️ ${counts.UNSUPPORTED} UNSUPPORTED\n`);
    out.push(`### [A'] Ungrounded generic-LLM draft\n${r.draft}\n`);
    out.push(`### [C]->[D] Claims checked against FDA`);
    for (const v of r.verdicts) {
      const icon = v.status === "VERIFIED" ? "✅" : v.status === "CONTRADICTED" ? "❌" : "⚠️";
      const det = v.deterministic ? "" : " _(language → LLM)_";
      out.push(`- ${icon} **${v.status}** [${v.claim.kind}]${det} — "${v.claim.text}"`);
      out.push(`  - basis: ${v.basis}`);
    }
    out.push("");
    console.log(`   ✅${counts.VERIFIED} ❌${counts.CONTRADICTED} ⚠️${counts.UNSUPPORTED} (verdict ${r.verification.overall})`);
  }

  writeFileSync(path, out.join("\n"));
  console.log(`\nTranscript: ${path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
