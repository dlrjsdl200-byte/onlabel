# Adding a product or ingredient to the OnLabel KB

Every clinical number is extracted from a primary source, never typed from memory
(D22). Follow this workflow so a new entry stays grounded and the safety
invariants keep passing. Read **`docs/EXTRACTION-RULES.md`** first — it defines the
hard rules (dosing schedule ≠ ceiling, antihistamine max ≠ sleep dose, every
ceiling cites a source).

Files:
- `src/data/products.json` — SKUs (id, brand, dose form, per-dose mg, doses/day).
- `src/data/ingredients.json` — active ingredients (daily ceiling, class, dosing).
- `scripts/fda-add.ts` — extracts a product's numbers from its openFDA label.
- `evals/golden.json` + `evals/add-golden.ts` — locked eval cases (verdict computed).

## A. Add a PRODUCT (its ingredients already exist in the KB)

1. **Describe the identity only** — add a `Spec` to the `SPECS` array in
   `scripts/fda-add.ts`: `id`, `brand`, `primaryToken` (one strong brand word to
   search openFDA), the expected `ingredients` (keys that already exist), and the
   `doseForm`. Do **not** type any strength or limit — the tool extracts them.

2. **Run the extractor** and read the result against its DailyMed link:
   ```
   npx tsx scripts/fda-add.ts <id>
   ```
   - It prints a ready-to-paste `products.json` entry + a `DailyMed:` URL.
   - If it prints `⚠️ incomplete extraction` or `⚠️ no OTC SKU`, the tool could not
     ground a number — **do not hand-fill it**. Fix the spec (token/ingredient set/
     dose form) or log the gap in `evals/fda-add-bugs.md`. A `null` is honest; a
     guessed number is a bug.
   - Liquids: the tool models per-mL dosing (`in each N mL` × dose volume) and the
     volume cap (`not to exceed N mL in 24 hours`). Confirm labelVol/doseVol look right.

3. **Verify against the label**, then paste the entry into `src/data/products.json`
   with `"verify": false` and the `source` naming the SPL set_id.

4. **Lock it with a golden case** (optional but recommended):
   - Add an item to `evals/staging-golden.json` (question + products + answer
     expectations — **never a verdict**, the tool computes it).
   - `npx tsx evals/add-golden.ts --dry` to preview, then without `--dry` to append.
   - Reset `staging-golden.json` to its template afterward.

5. **Gate:**
   ```
   npm run typecheck && npm test && npm run check:catalog
   ```
   - `npm test` runs the invariants: no single product is danger alone; every
     product resolves to itself from its brand name; every ceiling cites a source.
   - `check:catalog` re-reads each cited SPL and confirms the numbers still match.

6. **Commit** with what/why, then push (auto-deploys on Vercel).

## B. Add a NEW INGREDIENT (not yet in the KB)

Needed when a product introduces an active ingredient the KB doesn't have (e.g.
`brompheniramine` was added this way for Dimetapp).

1. **Ground the daily ceiling from a primary source** — prefer a
   **single-ingredient** SKU so the label's `not to exceed N` × per-unit strength
   IS the ingredient ceiling (`fda-add.ts` prints this for single-ingredient
   specs), or the FDA monograph (M012/M013) via `pdftotext` + `grep` on `refs/`.
   Never a WebFetch summary and never memory.

2. **Add the entry to `src/data/ingredients.json`** with: `displayName`, `class`
   (e.g. `antihistamine-sedating`), `maxDailyMg` (grounded), `risk`, a `source`
   string citing the SPL set_id or monograph section, `verify: false`, and
   `dosing` if an interval is grounded.

3. **Same active moiety as an existing ingredient?** If the new ingredient is an
   **enantiomer or active metabolite** of one already in the KB (e.g. levocetirizine
   ↔ cetirizine), give both the same **`dupGroup`** so taking them together is
   flagged as a same-drug duplication (B-17 / D38). Confirm the relationship from a
   label ("… is the R enantiomer of …"), not memory.

4. **Cross-check the ceiling** with the auditor (separates sleep-once-daily from
   antihistamine multi-dose so a sleep dose can't masquerade as the ceiling):
   ```
   npm run audit:ceilings <ingredient>
   ```
   `MATCH` = confirmed by a real label; `REVIEW` = monograph-only (its `source` is
   printed for you to confirm); `MISMATCH` = investigate.

5. Then add the product that uses it (Section A) and run the full gate.

## Quick reference — the gate before every commit

```
npm run typecheck          # types
npm test                   # invariants + golden consistency
npm run check:catalog      # cited SPLs still match their labels
npm run audit:ceilings     # ingredient ceilings vs openFDA labels
```

If all four are green and no number was typed by hand, the addition is grounded.
