---
name: collect-live-answers
description: Fire a list of free-text questions at the real OnLabel pipeline and collect the answers to a transcript — NO grading, no golden set. Use when the user wants to explore what OnLabel actually says, gather many question/answer pairs, probe phrasing/edge cases, or script a demo. Triggers on "질문 모으기", "답변 수집", "여러 질문 돌려", "채점없이 돌려", "probe", "collect answers", "답변만 모아".
---

# Collect Live Answers

Pure exploration tool: send arbitrary questions to `runOnLabel` (the real, paid
pipeline) and record every question + answer. **No grading, no golden set, no
pass/fail.** Use this to see how OnLabel responds to real-user phrasing, harvest
demo material, or scout edge cases before turning good ones into graded golden
items (that's the separate `golden-live-verify` skill).

## When to use which
- **This skill** — "just show me the answers." Free-form questions, collect Q/A.
- **golden-live-verify** — "is the answer correct?" Adds graded cases + pass/fail.

## Procedure

### 1. Write the questions
Put questions in `evals/probes.txt`, one per line. Blank lines and `#` comments
are ignored. Write them the way a real user would type — fuzzy/partial names are
exactly what's worth probing ("regular tylenol", "advil cold", a bare symptom).
Use `--file=<path>` for an alternate list.

### 2. Confirm cost, then run (PAID)
Each question is one live pipeline call. Report the count and get a go-ahead with
the approval format below, then:
```
npm run collect                      # reads evals/probes.txt
npm run collect -- --file=my.txt     # alternate file
```

### 3. Report
The run auto-writes `evals/transcripts/probe-<timestamp>.jsonl` + `.md` (question,
products checked, verdict, assumptions, full answer — appended per item so a crash
never loses a paid answer). After it finishes:
- Give the transcript path and the verdict mix it printed.
- Do NOT paste every full answer into chat or docs — point to the transcript.
- If any answer looks wrong or a verdict diverges from what the phrasing implies,
  flag it as a candidate for a graded golden case (golden-live-verify) or a
  backlog item. Do not silently "fix" anything here — this tool only observes.

## Approval format (before any paid run)

```
⚠️ Paid collect run

- What: npm run collect (evals/probes.txt)
- Calls: <N> live pipeline calls (~<N> paid LLM requests)
- Records to: evals/transcripts/probe-<timestamp>.{jsonl,md}
Proceed?
```

## Notes
- This never touches golden.json and never grades — it cannot fail a build.
- Requires `ANTHROPIC_API_KEY` (loaded via `--env-file=.env` by the npm script).
