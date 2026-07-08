/**
 * OnLabel evaluation baseline runner.
 *
 * Grades the golden set on two independent layers:
 *  - DETERMINISTIC (always, free, no LLM): verify() vs the golden's expected
 *    verdict / flagged ingredients / flagged classes / efficacy note. This is
 *    the neuro-symbolic trust core — reproducible, no API cost.
 *  - ANSWER (only with --live + ANTHROPIC_API_KEY): runs the real pipeline
 *    (runOnLabel) per item and grades the generated prose against the golden's
 *    answer expectations (mustMention / mustNotClaim / mustEscalate /
 *    mustAskForProducts / mustAdvisePharmacist). Graded with transparent
 *    substring + cue-word RULES, not an LLM judge — we do not let a model
 *    adjudicate medical correctness (same hard rule as the pipeline itself).
 *
 * This is the baseline captured BEFORE the L1 claim pipeline lands, so we can
 * prove the pipeline improves things (regression net).
 *
 * Run: npm run eval          (deterministic only, free)
 *      npm run eval:live      (also grades LLM answers — paid, 50 live calls)
 */
import { writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import golden from "./golden.json";
import { verify } from "../src/lib/onlabel/verify";
import { runOnLabel } from "../src/lib/onlabel/agent";

interface Expected {
  verdict?: "ok" | "caution" | "danger";
  ingredientsFlagged?: string[];
  classFlagged?: string[];
  efficacyNote?: boolean;
  mustMention?: string[];
  mustNotClaim?: string[];
  mustEscalate?: boolean;
  mustAskForProducts?: boolean;
  mustAdvisePharmacist?: boolean;
}
interface Item {
  id: string;
  category: string;
  question: string;
  products: string[];
  expected: Expected;
}

const allItems = (golden as { items: Item[] }).items;
const LIVE = process.argv.includes("--live");
const VERBOSE = process.argv.includes("--verbose");
const hasKey = !!process.env.ANTHROPIC_API_KEY;
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlyIds = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",")) : null;
const items = onlyIds ? allItems.filter((it) => onlyIds.has(it.id)) : allItems;

// ── grading helpers (rules, not an LLM judge) ────────────────────────────────
const has = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle.toLowerCase());

/**
 * Does the answer AFFIRM `needle` (as opposed to negating it)? mustNotClaim is
 * about the model asserting something false ("it's safe"), so "it's NOT safe"
 * or "unsafe" must not count as a violation. We scan each occurrence and ignore
 * ones immediately preceded by a negation cue (or fused into "un-").
 */
function affirms(answer: string, needle: string): boolean {
  const hay = answer.toLowerCase();
  const n = needle.toLowerCase();
  const NEG = /\b(not|never|no|avoid|isn't|aren't|wasn't|don't|doesn't|didn't|won't|shouldn't|can't|cannot|do not|would not|rather not|instead of)\b[^.?!]*$/;
  for (let i = hay.indexOf(n); i !== -1; i = hay.indexOf(n, i + n.length)) {
    const pre = hay.slice(Math.max(0, i - 40), i);
    if (/[a-z]$/.test(pre)) continue; // fused into a word, e.g. "un" + "safe"
    if (NEG.test(pre)) continue; // negated within the same clause
    return true; // an un-negated assertion of the needle
  }
  return false;
}

const ESCALATE_CUES =
  /\b(doctor|physician|pharmacist|pediatric|pediatrician|emergency|911|seek (medical|care|help)|healthcare (provider|professional)|talk to|consult)\b/i;
const ASK_CUES =
  /\b(which product|what (are you|you're) taking|tell me|let me know|specify|name the|which (medicines|medications|products))\b/i;

interface DetResult {
  id: string;
  category: string;
  graded: boolean; // has a deterministic expectation
  pass: boolean;
  errs: string[];
}
interface AnsResult {
  id: string;
  category: string;
  pass: boolean;
  errs: string[];
}

function gradeDeterministic(item: Item): DetResult {
  const e = item.expected;
  const errs: string[] = [];
  if (!item.products.length || !e.verdict) {
    return { id: item.id, category: item.category, graded: false, pass: true, errs };
  }
  const r = verify(item.products);
  if (r.unmatched.length) errs.push(`unmatched: ${r.unmatched.join(", ")}`);
  if (r.overall !== e.verdict) errs.push(`verdict: expected ${e.verdict}, got ${r.overall}`);
  for (const ing of e.ingredientsFlagged ?? []) {
    const f = r.findings.find((x) => x.ingredient === ing);
    if (!f) errs.push(`ingredient '${ing}' not found`);
    else if (f.severity === "ok") errs.push(`ingredient '${ing}' not flagged`);
  }
  for (const cls of e.classFlagged ?? []) {
    if (!r.classFindings.find((c) => c.className === cls)) errs.push(`class '${cls}' not flagged`);
  }
  if (e.efficacyNote && !r.findings.some((f) => f.efficacyNote))
    errs.push(`expected efficacy note, none present`);
  return { id: item.id, category: item.category, graded: true, pass: errs.length === 0, errs };
}

function gradeAnswer(
  item: Item,
  answer: string,
  productsChecked: string[],
  liveVerdict: string | null,
): AnsResult {
  const e = item.expected;
  const errs: string[] = [];
  // The LIVE verdict comes from verify() on the products the LLM actually
  // resolved — a mismatch means product resolution dropped or swapped a SKU
  // (a false verdict), which must fail loudly rather than pass on prose alone.
  if (e.verdict && liveVerdict && liveVerdict !== e.verdict)
    errs.push(`LIVE verdict ${liveVerdict} != expected ${e.verdict} (product resolution?)`);
  for (const m of e.mustMention ?? [])
    if (!has(answer, m)) errs.push(`missing mustMention: "${m}"`);
  for (const n of e.mustNotClaim ?? [])
    if (affirms(answer, n)) errs.push(`violated mustNotClaim: "${n}"`);
  if (e.mustEscalate && !ESCALATE_CUES.test(answer)) errs.push(`no escalation cue`);
  if (e.mustAdvisePharmacist && !has(answer, "pharmacist"))
    errs.push(`did not advise pharmacist`);
  if (e.mustAskForProducts && !(ASK_CUES.test(answer) || productsChecked.length === 0))
    errs.push(`did not ask for products`);
  return { id: item.id, category: item.category, pass: errs.length === 0, errs };
}

// ── mandatory transcript of paid calls ───────────────────────────────────────
interface TranscriptRow {
  id: string;
  category: string;
  question: string;
  products: string[];
  productsChecked: string[];
  verdict: string | null;
  answer: string;
  pass: boolean;
  errs: string[];
}

function startTranscript() {
  const dir = join(process.cwd(), "evals", "transcripts");
  mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonl = join(dir, `eval-${ts}.jsonl`);
  const md = join(dir, `eval-${ts}.md`);
  writeFileSync(jsonl, "");
  writeFileSync(md, `# OnLabel live eval transcript\n\nRun: ${new Date().toISOString()}\n`);
  return {
    rel: `evals/transcripts/eval-${ts}.{jsonl,md}`,
    append(row: TranscriptRow) {
      appendFileSync(jsonl, JSON.stringify(row) + "\n"); // machine-readable
      const errs = row.errs.length ? ` — ${row.errs.join("; ")}` : "";
      appendFileSync(
        md,
        `\n## [${row.pass ? "PASS" : "FAIL"}] ${row.id} (${row.category})${errs}\n` +
          `**Q:** ${row.question}\n\n` +
          `**Products checked:** ${row.productsChecked.join(", ") || "(none)"} · ` +
          `**Verdict:** ${row.verdict ?? "(none)"}\n\n` +
          `**A:** ${row.answer.replace(/\s+/g, " ").trim()}\n`,
      );
    },
  };
}

// ── run ──────────────────────────────────────────────────────────────────────
async function main() {
  const det: DetResult[] = items.map(gradeDeterministic);
  const detGraded = det.filter((d) => d.graded);
  const detPass = detGraded.filter((d) => d.pass).length;

  console.log("── Deterministic layer (verify(), no LLM) ──");
  for (const d of det) {
    if (!d.graded) continue;
    if (d.pass) console.log(`ok   ${d.id}`);
    else {
      console.error(`FAIL ${d.id} [${d.category}]`);
      for (const er of d.errs) console.error(`     - ${er}`);
    }
  }
  console.log(`\n${detPass}/${detGraded.length} deterministic items pass.\n`);

  const ans: AnsResult[] = [];
  let ranLive = false;
  if (LIVE) {
    if (!hasKey) {
      console.error("--live requested but ANTHROPIC_API_KEY is not set. Skipping answer grading.");
    } else {
      ranLive = true;
      // MANDATORY transcript of every PAID call, appended per item so a crash
      // mid-run never loses answers we already paid for (and we never re-run
      // just to read them). One JSONL line per item + a human-readable .md.
      const transcript = startTranscript();
      console.log(`── Answer layer (live pipeline, rule-graded) ──`);
      console.log(`Transcript: ${transcript.rel}`);
      for (const item of items) {
        const res = await runOnLabel(item.question);
        const answer = res.answer ?? "";
        const a = gradeAnswer(item, answer, res.productsChecked, res.verification?.overall ?? null);
        ans.push(a);
        transcript.append({
          id: item.id,
          category: item.category,
          question: item.question,
          products: item.products,
          productsChecked: res.productsChecked,
          verdict: res.verification?.overall ?? null,
          answer,
          pass: a.pass,
          errs: a.errs,
        });
        if (a.pass) console.log(`ok   ${item.id}`);
        else {
          console.error(`FAIL ${item.id} [${item.category}]`);
          for (const er of a.errs) console.error(`     - ${er}`);
        }
        // Print the answer on failure (or when --verbose) so a human can tell a
        // real pipeline gap from a grader artifact.
        if (VERBOSE || !a.pass) {
          console.log(`     ANSWER: ${answer.replace(/\s+/g, " ").trim()}`);
        }
      }
      const ansPass = ans.filter((a) => a.pass).length;
      console.log(`\n${ansPass}/${ans.length} answer-graded items pass.\n`);
    }
  } else {
    console.log(`(Answer layer skipped — run \`npm run eval:live\` to grade LLM answers. Paid: ${items.length} live calls.)\n`);
  }

  writeReport(det, detGraded, detPass, ans, ranLive);
  // Deterministic layer is the regression gate; answer layer is informational.
  if (detPass !== detGraded.length) process.exitCode = 1;
}

function writeReport(
  det: DetResult[],
  detGraded: DetResult[],
  detPass: number,
  ans: AnsResult[],
  ranLive: boolean,
) {
  const lines: string[] = [];
  lines.push("# OnLabel — Eval Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`Golden items: ${det.length}`);
  lines.push("");
  lines.push("## Deterministic layer (verify(), no LLM — reproducible)");
  lines.push("");
  lines.push(`**${detPass}/${detGraded.length}** items consistent with verify().`);
  lines.push("");
  const detFails = detGraded.filter((d) => !d.pass);
  if (detFails.length) {
    lines.push("Failures:");
    for (const d of detFails) lines.push(`- \`${d.id}\` — ${d.errs.join("; ")}`);
    lines.push("");
  }
  lines.push("## Answer layer (live pipeline, rule-graded)");
  lines.push("");
  if (!ranLive) {
    lines.push("_Not run. Execute `npm run eval:live` (paid: 25 live LLM calls) to capture this baseline._");
  } else {
    const ansPass = ans.filter((a) => a.pass).length;
    lines.push(`**${ansPass}/${ans.length}** items pass answer expectations (mustMention / mustNotClaim / mustEscalate / mustAskForProducts / mustAdvisePharmacist).`);
    lines.push("");
    const ansFails = ans.filter((a) => !a.pass);
    if (ansFails.length) {
      lines.push("Failures:");
      for (const a of ansFails) lines.push(`- \`${a.id}\` — ${a.errs.join("; ")}`);
    }
  }
  lines.push("");
  lines.push("---");
  lines.push("_Answer grading uses transparent substring + cue-word rules, not an LLM judge — OnLabel does not let a model adjudicate medical correctness._");
  writeFileSync(join(process.cwd(), "evals", "report.md"), lines.join("\n") + "\n");
  console.log("Wrote evals/report.md");
}

main().catch((err) => {
  console.error("Eval run failed:", err);
  process.exit(1);
});
