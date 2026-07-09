# openFDA composition cross-check (B-4)

Generated: 2026-07-09 · read-only · deterministic (no LLM).
Legend: ✓ KB matches openFDA · ✗ mismatch (review) · ? could not extract.

## tylenol-regular — ✓ clean
KB brand: Tylenol Regular Strength  ·  openFDA SKU (auto-selected): TYLENOL Regular Strength
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=01f41fae-4abb-4b96-ab09-a7d3dfc286cd
```
  units/dose  KB=2  openFDA=2  ✓    max doses/day  KB=5  openFDA=5 (=10/2)  ✓
  acetaminophen      per-unit  KB=325 mg  openFDA=325 mg  ✓   (KB per-dose 650 mg = 325×2)
```

## tylenol-extra-strength — ✓ clean
KB brand: Tylenol Extra Strength  ·  openFDA SKU (auto-selected): TYLENOL Extra Strength
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=015a6179-bacb-452d-b594-4de628ddc11d
```
  units/dose  KB=2  openFDA=2  ✓    max doses/day  KB=3  openFDA=3 (=6/2)  ✓
  acetaminophen      per-unit  KB=500 mg  openFDA=500 mg  ✓   (KB per-dose 1000 mg = 500×2)
```

## advil — ⚠️ 1 flag(s)
KB brand: Advil / Motrin IB  ·  openFDA SKU (auto-selected): Advil
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=0b83c9ed-3630-4c5c-9020-cf38183a6500
```
  units/dose  KB=2  openFDA=1  ✗    max doses/day  KB=3  openFDA=6 (=6/1)  ✗
  ibuprofen          per-unit  KB=200 mg  openFDA=200 mg  ✓   (KB per-dose 400 mg = 200×2)
```

## aleve — ✓ clean
KB brand: Aleve  ·  openFDA SKU (auto-selected): Aleve
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=00ef5b30-71d0-4cb4-84a3-48c67d1cea2a
```
  units/dose  KB=1  openFDA=1  ✓    max doses/day  KB=3  openFDA=? (=?/1)  ?
  naproxen           per-unit  KB=220 mg  openFDA=220 mg  ✓   (KB per-dose 220 mg = 220×1)
```

## bayer-aspirin — ✓ clean
KB brand: Bayer Aspirin  ·  openFDA SKU (auto-selected): Bayer Genuine Aspirin
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=23daa359-d40f-4f64-81be-6d154f41df9f
```
  units/dose  KB=2  openFDA=?  ?    max doses/day  KB=6  openFDA=? (=12/?)  ?
  aspirin            per-unit  KB=325 mg  openFDA=325 mg  ✓   (KB per-dose 650 mg = 325×2)
```

## excedrin-extra-strength — ⚠️ 1 flag(s)
KB brand: Excedrin Extra Strength  ·  openFDA SKU (auto-selected): Excedrin Extra Strength Geltabs
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=11a8439b-0159-4351-b0f5-fe7fad6a33c0
```
  units/dose  KB=2  openFDA=2  ✓    max doses/day  KB=2  openFDA=4 (=8/2)  ✗
  acetaminophen      per-unit  KB=250 mg  openFDA=250 mg  ✓   (KB per-dose 500 mg = 250×2)
  aspirin            per-unit  KB=250 mg  openFDA=250 mg  ✓   (KB per-dose 500 mg = 250×2)
  caffeine           per-unit  KB=65 mg  openFDA=65 mg  ✓   (KB per-dose 130 mg = 65×2)
```

## dayquil — ✓ clean
KB brand: Vicks DayQuil Cold & Flu  ·  openFDA SKU (auto-selected): Vicks DayQuil COLD and FLU
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=efb982d4-93d0-815f-e053-2995a90a82dd
```
  units/dose  KB=2  openFDA=?  ?    max doses/day  KB=4  openFDA=? (=?/?)  ?
  acetaminophen      per-unit  KB=325 mg  openFDA=325 mg  ✓   (KB per-dose 650 mg = 325×2)
  dextromethorphan   per-unit  KB=10 mg  openFDA=10 mg  ✓   (KB per-dose 20 mg = 10×2)
  phenylephrine      per-unit  KB=5 mg  openFDA=5 mg  ✓   (KB per-dose 10 mg = 5×2)
```

## nyquil — ⚠️ 3 flag(s)
KB brand: Vicks NyQuil Cold & Flu  ·  openFDA SKU (auto-selected): Vicks NyQuil Cold and Flu
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=330d42da-5041-3059-e063-6394a90a2d55
```
  units/dose  KB=2  openFDA=?  ?    max doses/day  KB=4  openFDA=? (=?/?)  ?
  acetaminophen      per-unit  KB=325 mg  openFDA=650 mg  ✗   (KB per-dose 650 mg = 325×2)
  dextromethorphan   per-unit  KB=15 mg  openFDA=30 mg  ✗   (KB per-dose 30 mg = 15×2)
  doxylamine         per-unit  KB=6.25 mg  openFDA=12.5 mg  ✗   (KB per-dose 12.5 mg = 6.25×2)
```

## tylenol-cold-flu-severe — ⚠️ 1 flag(s)
KB brand: Tylenol Cold + Flu Severe  ·  openFDA SKU (auto-selected): Tylenol Cold Flu Severe
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=618ce449-5ad6-4e53-bbf6-152a907c493e
```
  units/dose  KB=2  openFDA=2  ✓    max doses/day  KB=4  openFDA=5 (=10/2)  ✗
  acetaminophen      per-unit  KB=325 mg  openFDA=325 mg  ✓   (KB per-dose 650 mg = 325×2)
  dextromethorphan   per-unit  KB=10 mg  openFDA=10 mg  ✓   (KB per-dose 20 mg = 10×2)
  guaifenesin        per-unit  KB=200 mg  openFDA=200 mg  ✓   (KB per-dose 400 mg = 200×2)
  phenylephrine      per-unit  KB=5 mg  openFDA=5 mg  ✓   (KB per-dose 10 mg = 5×2)
```

## mucinex — ✓ clean
KB brand: Mucinex (600 mg)  ·  openFDA SKU (auto-selected): Mucinex
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=0129f47d-abc2-414c-b4e1-1064c5d6a623
```
  units/dose  KB=2  openFDA=?  ?    max doses/day  KB=2  openFDA=? (=4/?)  ?
  guaifenesin        per-unit  KB=600 mg  openFDA=600 mg  ✓   (KB per-dose 1200 mg = 600×2)
```

## mucinex-dm — ✓ clean
KB brand: Mucinex DM (600 mg)  ·  openFDA SKU (auto-selected): Mucinex DM
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=3c9c8fb0-8a00-4b0f-e063-6394a90af632
```
  units/dose  KB=2  openFDA=?  ?    max doses/day  KB=2  openFDA=? (=?/?)  ?
  guaifenesin        per-unit  KB=600 mg  openFDA=600 mg  ✓   (KB per-dose 1200 mg = 600×2)
  dextromethorphan   per-unit  KB=30 mg  openFDA=30 mg  ✓   (KB per-dose 60 mg = 30×2)
```

## sudafed — ⚠️ 1 flag(s)
KB brand: Sudafed (pseudoephedrine)  ·  openFDA SKU (auto-selected): Childrens Sudafed Nasal Decongestant
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=52e9307b-ad38-4f65-bb2f-4fa262e82010
```
  units/dose  KB=1  openFDA=?  ?    max doses/day  KB=4  openFDA=? (=?/?)  ?
  pseudoephedrine    per-unit  KB=60 mg  openFDA=15 mg  ✗   (KB per-dose 60 mg = 60×1)
```

## sudafed-pe — ⚠️ 1 flag(s)
KB brand: Sudafed PE  ·  openFDA SKU (auto-selected): Childrens Sudafed PE NASAL DECONGESTANT
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=4dfd46e4-b9f9-464d-aa47-e8fa9e526a5d
```
  units/dose  KB=1  openFDA=?  ?    max doses/day  KB=6  openFDA=? (=?/?)  ?
  phenylephrine      per-unit  KB=10 mg  openFDA=2.5 mg  ✗   (KB per-dose 10 mg = 10×1)
```

## benadryl — ⚠️ 1 flag(s)
KB brand: Benadryl Allergy (25 mg)  ·  openFDA SKU (auto-selected): BENADRYL Allergy
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=224ba2a3-1a93-29c8-e063-6394a90a9bef
```
  units/dose  KB=2  openFDA=?  ?    max doses/day  KB=6  openFDA=? (=6/?)  ?
  diphenhydramine    per-unit  KB=25 mg  openFDA=12.5 mg  ✗   (KB per-dose 50 mg = 25×2)
```

## zyrtec — ✓ clean
KB brand: Zyrtec  ·  openFDA SKU (auto-selected): Zyrtec
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=dc613bd5-70fd-1d9b-e053-2995a90a41cd
```
  units/dose  KB=1  openFDA=?  ?    max doses/day  KB=1  openFDA=? (=?/?)  ?
  cetirizine         per-unit  KB=10 mg  openFDA=10 mg  ✓   (KB per-dose 10 mg = 10×1)
```

## tylenol-pm — ✓ clean
KB brand: Tylenol PM  ·  openFDA SKU (auto-selected): Tylenol PM
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=83df6b68-8bb5-410b-bb97-0a5eecf424f2
```
  units/dose  KB=2  openFDA=2  ✓    max doses/day  KB=1  openFDA=? (=?/2)  ?
  acetaminophen      per-unit  KB=500 mg  openFDA=500 mg  ✓   (KB per-dose 1000 mg = 500×2)
  diphenhydramine    per-unit  KB=25 mg  openFDA=25 mg  ✓   (KB per-dose 50 mg = 25×2)
```

## advil-cold-sinus — ✓ clean
KB brand: Advil Cold & Sinus  ·  openFDA SKU (auto-selected): ADVIL COLD AND SINUS
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=0da9ed22-bfb4-d61b-110b-0c7760332a98
```
  units/dose  KB=1  openFDA=1  ✓    max doses/day  KB=4  openFDA=? (=?/1)  ?
  ibuprofen          per-unit  KB=200 mg  openFDA=200 mg  ✓   (KB per-dose 200 mg = 200×1)
  pseudoephedrine    per-unit  KB=30 mg  openFDA=30 mg  ✓   (KB per-dose 30 mg = 30×1)
```

---
10/17 products clean; 7 need review.
