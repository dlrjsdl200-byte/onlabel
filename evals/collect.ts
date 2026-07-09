/**
 * OnLabel live answer collector — NO grading.
 *
 * Fires a list of free-text questions at the REAL pipeline (runOnLabel) and
 * records every question + answer to a transcript. There is no golden set, no
 * expected verdict, no pass/fail — this is a pure "what does OnLabel actually
 * say?" probe for exploration and demo-scripting. Use evals/run-eval.ts when you
 * want graded regression instead.
 *
 * Questions come from evals/probes.txt (one question per line; blank lines and
 * lines starting with `#` are ignored), or from --file=<path>.
 *
 * Every answer is appended the moment it returns, so a crash mid-run never loses
 * a paid call (same discipline as the graded eval transcript).
 *
 * Run: npm run collect                     # reads evals/probes.txt (PAID)
 *      npm run collect -- --file=my.txt    # custom question file
 */
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runOnLabel } from "../src/lib/onlabel/agent";

const ROOT = process.cwd();
const fileArg = process.argv.find((a) => a.startsWith("--file="));
const QUESTIONS_PATH = fileArg
  ? join(ROOT, fileArg.slice("--file=".length))
  : join(ROOT, "evals", "probes.txt");

function fail(msg: string): never {
  console.error(`\n✗ collect aborted.\n  ${msg}\n`);
  process.exit(1);
}

if (!existsSync(QUESTIONS_PATH)) {
  fail(
    `no question file at ${QUESTIONS_PATH}.\n` +
      `  Create evals/probes.txt with one question per line (# for comments).`,
  );
}

const questions = readFileSync(QUESTIONS_PATH, "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));

if (questions.length === 0) fail(`no questions found in ${QUESTIONS_PATH}.`);

if (!process.env.ANTHROPIC_API_KEY) {
  fail(
    `ANTHROPIC_API_KEY is not set. This tool makes live (paid) pipeline calls.\n` +
      `  Run via: npm run collect   (uses --env-file=.env)`,
  );
}

interface Row {
  n: number;
  question: string;
  productsChecked: string[];
  verdict: string | null;
  assumptions: { input: string; resolvedTo: string }[];
  answer: string;
}

function startTranscript() {
  const dir = join(ROOT, "evals", "transcripts");
  mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonl = join(dir, `probe-${ts}.jsonl`);
  const md = join(dir, `probe-${ts}.md`);
  writeFileSync(jsonl, "");
  writeFileSync(
    md,
    `# OnLabel probe transcript (collected, NOT graded)\n\n` +
      `Run: ${new Date().toISOString()}\nQuestions: ${questions.length}\n`,
  );
  return {
    rel: `evals/transcripts/probe-${ts}.{jsonl,md}`,
    append(row: Row) {
      appendFileSync(jsonl, JSON.stringify(row) + "\n");
      const assum = row.assumptions.length
        ? ` · **Assumptions:** ${row.assumptions.map((a) => `${a.input}→${a.resolvedTo}`).join(", ")}`
        : "";
      appendFileSync(
        md,
        `\n## ${row.n}. ${row.question}\n\n` +
          `**Products checked:** ${row.productsChecked.join(", ") || "(none)"} · ` +
          `**Verdict:** ${row.verdict ?? "(none)"}${assum}\n\n` +
          `**A:** ${row.answer.replace(/\s+/g, " ").trim()}\n`,
      );
    },
  };
}

async function main() {
  console.log(`Collecting ${questions.length} live answer(s) — NOT graded.\n`);
  const transcript = startTranscript();
  console.log(`Transcript: ${transcript.rel}\n`);

  const verdictCounts: Record<string, number> = {};
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const res = await runOnLabel(question);
    const verdict = res.verification?.overall ?? null;
    verdictCounts[verdict ?? "none"] = (verdictCounts[verdict ?? "none"] ?? 0) + 1;
    transcript.append({
      n: i + 1,
      question,
      productsChecked: res.productsChecked,
      verdict,
      assumptions: (res.verification?.assumptions ?? []).map((a) => ({
        input: a.input,
        resolvedTo: a.resolvedTo,
      })),
      answer: res.answer ?? "",
    });
    console.log(`${i + 1}/${questions.length}  [${verdict ?? "none"}]  ${question}`);
    console.log(`   → ${(res.answer ?? "").replace(/\s+/g, " ").trim().slice(0, 160)}...\n`);
  }

  const dist = Object.entries(verdictCounts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
  console.log(`\n✓ Collected ${questions.length} answer(s). Verdict mix — ${dist}`);
  console.log(`  Full transcript: ${transcript.rel}\n`);
}

main().catch((err) => {
  console.error("Collect run failed:", err);
  process.exit(1);
});
