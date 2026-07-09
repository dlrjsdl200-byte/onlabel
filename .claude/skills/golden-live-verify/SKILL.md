---
name: golden-live-verify
description: Add cases to the OnLabel golden set and run the live pipeline against them, recording results automatically. Use when the user wants to add golden/eval cases, run a live eval, verify OnLabel answers against real LLM output, or repeat the "add → gate → live → record" verification loop. Triggers on "골든 추가", "골든셋 추가", "live 검증", "골든 라이브", "eval 돌려", "라이브 실행", "add golden", "run live eval".
---

# Golden Live Verify

Repeatable verification loop for OnLabel: **stage new golden cases → compute
their deterministic verdict with `verify()` → gate → run the live pipeline on the
new cases only → record the results**. Built on the existing eval harness
(`evals/run-eval.ts`, `evals/check-golden.ts`); this skill orchestrates them
safely and cheaply.

## Non-negotiable rules

1. **Verdicts are computed, never authored.** The staging file must NOT contain a
   `verdict`. `add-golden.ts` runs `verify()` to fill verdict / ingredientsFlagged
   / classFlagged / efficacyNote. This is the neuro-symbolic core — a golden label
   must never disagree with the verifier.
2. **Live calls cost money.** By default run live on the **new ids only**
   (`--only=`). A full-set live run (~223 paid calls) requires an explicit user
   request and the approval format below.
3. **Every paid call is recorded.** `run-eval.ts` writes a JSONL + Markdown
   transcript per run; never re-run just to re-read answers.
4. The deterministic gate (`check-golden.ts`) MUST pass before any live call. If
   it fails, stop and fix the case — do not spend money on a broken golden label.

## Procedure

### 1. Stage the new cases
Write the author-supplied fields to `evals/staging-golden.json`:

```json
{
  "items": [
    {
      "id": "x101-<short-slug>",
      "category": "danger-duplication",
      "question": "Can I take <A> with <B>?",
      "products": ["<Brand A>", "<Brand B>"],
      "expected": {
        "mustMention": ["acetaminophen", "liver"],
        "mustNotClaim": ["safe to take together"]
      },
      "note": "why this case matters"
    }
  ]
}
```
- `id` must be unique. Keep the project's `x<batch>-<slug>` convention.
- `products: []` is allowed for open-recommendation cases (answer-graded only).
- Put ONLY answer expectations in `expected` (mustMention / mustNotClaim /
  mustEscalate / mustAskForProducts / mustAdvisePharmacist). Never a verdict.

### 2. Compute + append (deterministic, free)
```
npx tsx evals/add-golden.ts --dry     # validate + preview computed verdicts
npx tsx evals/add-golden.ts           # append to golden.json, prints NEW_IDS=...
```
Capture the printed `NEW_IDS=<csv>`. On any hard failure (duplicate id, unmatched
product, hand-written verdict) it writes nothing — fix staging and retry.

### 3. Deterministic gate (free, must pass)
```
npx tsx evals/check-golden.ts
```
If this reports any FAIL, STOP. Report the failure to the user and fix the case
before spending on live.

### 4. Live run — new ids only (PAID)
Before running, tell the user the exact number of paid calls and get a go-ahead
using the approval format below. Then:
```
npm run eval:live -- --only=<NEW_IDS>
```
This runs the real pipeline on the new items, prints pass/fail, and auto-writes:
- `evals/transcripts/eval-<timestamp>.jsonl` + `.md` (per-item Q/A/verdict)
- `evals/report.md` (summary)

### 5. Record the results
Append a dated block to `findings.md` summarizing the run:
- date, new ids + count, live pass/fail, and any divergence (live verdict !=
  expected → product-resolution issue; note it as a candidate backlog item).
- Point to the transcript path. Do NOT paste full answers into findings — link
  the transcript file instead.

Then report to the user: pass rate, any failures with the one-line reason, and the
transcript path.

## Approval format (before any paid live run)

```
⚠️ Paid live run

- What: npm run eval:live -- --only=<ids>
- Calls: <N> live pipeline calls (~<N> paid LLM requests)
- Records to: evals/transcripts/ + evals/report.md
Proceed?
```

## Full-set re-run (rare)
Only when the user explicitly asks to re-validate the WHOLE golden set live:
`npm run eval:live` (no `--only`). Warn that this is ~223 paid calls and use the
approval format first.

## Notes
- Deterministic-only regression (free, run anytime): `npm run eval` or `npm test`.
- If a live verdict diverges from the computed expected verdict, that is a
  product-resolution robustness signal (cf. backlog B-11) — surface it, do not
  silently rewrite the golden.
