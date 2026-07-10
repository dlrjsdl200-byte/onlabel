# Data Extraction Rules (read before adding any ingredient or product)

Every clinical number in OnLabel is extracted deterministically from a primary
source — never typed from memory, never summarized by an LLM (D22). These rules
exist because a real error nearly slipped in: a manufacturer's **dosing schedule**
was read as if it were an **ingredient ceiling**. Follow them so it can't recur.

## The trap: dosing schedule ≠ ingredient ceiling

An OTC label states two different limits, and they are not the same number:

| On the label | Example (Tylenol Extra Strength) | What it is |
|---|---|---|
| Dosing directions | "take 2 tablets every 6 hours, **do not take more than 6 tablets** in 24 hours" (= 3,000 mg) | how the maker tells you to *space* doses |
| Overdose warning | "do not take more than **4,000 mg** of acetaminophen in 24 hours" | the ingredient's toxicological **ceiling** |

**Rule 1 — `maxDailyMg` is the ingredient ceiling, not the tablet-count schedule.**
Take it from the overdose/warning phrase ("not to exceed N mg in 24 hours") or the
FDA monograph, not from "do not take more than N tablets." The two can differ
(3,000 vs 4,000 for acetaminophen); the ceiling is what governs duplication math.

## The second trap: sleep dose ≠ antihistamine max

Sedating antihistamines (diphenhydramine, doxylamine, chlorpheniramine,
brompheniramine) are sold both as **sleep aids** (once daily) and as
**antihistamines** (multi-dose). The daily maximum is indication-dependent:

| Ingredient | Sleep aid (once daily) | Antihistamine (multi-dose max) | KB `maxDailyMg` |
|---|---|---|---|
| diphenhydramine | 50 mg | 25 mg × 12 (or 50 × 6) = **300 mg** | 300 |
| doxylamine | 25 mg (Unisom) | 12.5 mg q4-6h, **≤ 75 mg/24h** (M012 §h) | 75 |

**Rule 2 — for sedating antihistamines, `maxDailyMg` is the ANTIHISTAMINE
multi-dose maximum, never the once-daily sleep dose.** Higher is the safe choice:
it avoids false-danger and satisfies the invariant "ceiling ≥ any single product's
daily total." Note many *single-ingredient* SKUs are sleep aids, so the antihistamine
max often comes from the monograph (M012), not from a standalone product label.

## Rule 3 — every ceiling cites a source

Every `maxDailyMg` (and every product number) carries a `source` string naming the
openFDA/DailyMed SPL set_id or the FDA monograph section. A ceiling with no source
is un-auditable and is rejected by the test suite
(`every ingredient maxDailyMg cites a source` in `verify.test.ts`). `null` is a
legitimate value when the monograph states no 24 h ceiling (e.g. caffeine).

## Rule 4 — deterministic extraction only

Product composition and per-dose amounts come from `scripts/fda-add.ts`
(regex over the openFDA label). Monograph ceilings come from `pdftotext` + `grep`
over the FDA monograph PDFs in `refs/`. **No WebFetch, no LLM** — their summarizer
models can corrupt a dose number, which violates the neuro-symbolic hard rule.

## The safeguards (run these when adding sources)

1. `npm run audit:ceilings` — re-derives every ingredient ceiling from openFDA
   single-substance labels and compares to the KB. Separates sleep-once-daily from
   antihistamine multi-dose so a sleep dose can never masquerade as the ceiling.
   `MATCH` = confirmed by a real label; `REVIEW` = monograph-only, its `source` is
   printed for a human to confirm; `MISMATCH` = fails the run — investigate.
2. `npm run check:catalog` — cross-checks each product's cited SPL against the live
   openFDA label (composition integrity).
3. `npm test` — offline invariants: no single product is danger alone (ceiling not
   too low) + every ceiling cites a source.
