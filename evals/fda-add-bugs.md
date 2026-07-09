# fda-add extraction bug log

Bugs found while bulk-adding products via `npx tsx scripts/fda-add.ts`. The tool
refuses to fabricate, so a failure surfaces as `null`/`⚠️` — logged here for later
iteration (backlog B-18). Deterministic extraction, no LLM (D22).

Legend of the 30-spec batch (2026-07-09): **5 clean-added**, 25 with issues below.

## A. Liquid per-mL / dose-volume not modeled (new dose form) — B-18 Fix 5
The tool has no per-mL model: liquids state strength "in each 5 mL" and dose as
"2 tsp (10 mL)", so `strengthOf` may miss it and there is no unit count.
- `delsym` (DXM ER suspension) — strength not extracted
- `robitussin-dm` — strength not extracted + matched a combo "value pack"
- `dimetapp-cold-cough` — brompheniramine/DXM/phenylephrine strengths not extracted
- `childrens-benadryl` — matched adult Benadryl; liquid strength differs
- `bc-powder` — aspirin strength not extracted (powder "per stick")

## B. Directions phrasing not parsed (units/max = null)
Real label phrasings the regex still misses:
- LiquiCap "2 caps with water every 4 hrs" — `dayquil-severe`, `nyquil-severe`
- effervescent / dissolve directions — `mucinex-dm-max`, `mucinex-sinus-max`,
  `mucinex-fast-max` (also matched a Children's SKU)
- `allegra` once-daily variant (different wording than the recovered singles)
- `advil-allergy-sinus` (correct SKU "ADVIL ALLERGY SINUS", but max not parsed)
- `zzzquil` — sleep-aid bedtime dosing
- `midol-complete` — also needs a `pyrilamine` ingredient KB entry (not present)

## C. No SKU matched (brand absent / ingredient-set mismatch)
- `excedrin-pm-headache` — no OTC SKU with set {acetaminophen, diphenhydramine}
  under "excedrin" (may be aspirin-containing, or discontinued)
- `goodys-extra-strength` — no match under "goody" for {APAP, aspirin, caffeine}

## D. Wrong SKU selected (mislabel — NOT added) — B-18 Fix 3
Ingredient set matched but the auto-selected SKU is the wrong product:
- `childrens-tylenol` → "Tylenol 8HR" (adult ER, not children's suspension)
- `childrens-motrin` → "MOTRIN IB" (adult, not children's)
- `advil-migraine` → plain "Advil" (not the migraine SKU) — redundant with `advil`
- `bayer-back-body` → "Bayer Headache" (same aspirin+caffeine set, different SKU)
- `tylenol-cold-head-congestion` → matched existing "Tylenol Cold Flu Severe"
  (duplicate of a catalog product)
Fix 3 ideas: reject combo/value packs (recognized ingredient count > expected),
prefer the target dose form (liquid for children's), reject a SKU that duplicates
an existing catalog id.

## E. Suspicious values — needs pharmacist review (NOT added)
- `alka-seltzer-plus-cold` — phenylephrine extracted as **15.6 mg** (likely a salt
  form, e.g. bitartrate, not base 10 mg). Salt-vs-base normalization needed.
- `unisom-pm-pain` — acetaminophen **325 mg** once daily looks low (possible
  mis-parse of the dose vs per-caplet).

## F. Store-brand match (Fix 4 decision, B-18)
- `chlor-trimeton` → "Aller-chlor" (Chlor-Trimeton brand absent from openFDA OTC;
  chlorpheniramine 4 mg / 24 mg-day is the monograph-standard value). Decision:
  accept the generic-equivalent SPL or defer.

---
Clean-added this batch (5): motrin-ib, excedrin-tension-headache,
tylenol-8hr-arthritis, theraflu-nighttime-severe, benadryl-allergy-congestion.
