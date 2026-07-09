# fda-add extraction bug log

Bugs found while bulk-adding products via `npx tsx scripts/fda-add.ts`. The tool
refuses to fabricate, so a failure surfaces as `null`/`⚠️` — logged here for later
iteration (backlog B-18). Deterministic extraction, no LLM (D22).

Legend of the 30-spec batch (2026-07-09): **5 clean-added**, 25 with issues below.

## A. Liquid per-mL / dose-volume — ✅ MODELED
`fda-lib` now extracts labelVolume ("in each N mL") + doseVolume (adult "N mL",
"N tsp"×5, "N tbsp"×15) and computes mgPerDose = strength × doseVol / labelVol;
`strengthOf` gap widened for salt phrasings ("polistirex equivalent to 30 mg").
- RECOVERED + added: `dayquil-severe`, `nyquil-severe`, `robitussin-dm`, `zzzquil`
- still open: `delsym` (max/day not parsed — Delsym phrasing), `dimetapp-cold-cough`
  (needs a `brompheniramine` ingredient KB entry), `childrens-*` (weight-based,
  held), `bc-powder`/`goodys` (powder "per stick" + no-match)

## B. Directions phrasing not parsed (units/max = null)
✅ **FIXED (2 recovered)**: added the "12 years and older: N tablet" verb-less
pattern and the hyphenated "24-hour" form to the parser.
- `advil-allergy-sinus` — RECOVERED (the "24-hour period" hyphen blocked max)
- `mucinex-dm-max` — RECOVERED (the "older: 1 tablet" verb-less units blocked it)

Still open (different phrasings / formulations):
- `dayquil-severe`, `nyquil-severe` — matched the LIQUID SKU (30 mL dose) → belongs
  to §A (per-mL), not a phrasing gap
- `mucinex-sinus-max`, `mucinex-fast-max` — matched a Children's SKU
- `allegra` — matched a Children's ODT ("take 2 tablets") not the adult once-daily
- `zzzquil` — liquid "one dose (30 mL) per day" → §A
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
