# openFDA composition cross-check (B-4)

Generated: 2026-07-09 · read-only · deterministic (no LLM).
Legend: ✓ KB matches openFDA · ✗ mismatch (review) · ? could not extract.

## tylenol-regular — ✓ clean · brand search (⚠️ verify SKU)
KB brand: Tylenol Regular Strength  ·  openFDA: TYLENOL Regular Strength
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=01f41fae-4abb-4b96-ab09-a7d3dfc286cd
```
  units/dose  KB=2  openFDA=2  ✓    max doses/day  KB=5  openFDA=5 (=10/2)  ✓
  acetaminophen      per-unit  KB=325 mg  openFDA=325 mg  ✓   (KB per-dose 650 mg = 325×2)
```

## tylenol-extra-strength — ✓ clean · brand search (⚠️ verify SKU)
KB brand: Tylenol Extra Strength  ·  openFDA: TYLENOL Extra Strength
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=015a6179-bacb-452d-b594-4de628ddc11d
```
  units/dose  KB=2  openFDA=2  ✓    max doses/day  KB=3  openFDA=3 (=6/2)  ✓
  acetaminophen      per-unit  KB=500 mg  openFDA=500 mg  ✓   (KB per-dose 1000 mg = 500×2)
```

## advil — ⚠️ 1 flag(s) · brand search (⚠️ verify SKU)
KB brand: Advil / Motrin IB  ·  openFDA: Advil
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=0b83c9ed-3630-4c5c-9020-cf38183a6500
```
  units/dose  KB=2  openFDA=1  ✗    max doses/day  KB=3  openFDA=6 (=6/1)  ✗
  ibuprofen          per-unit  KB=200 mg  openFDA=200 mg  ✓   (KB per-dose 400 mg = 200×2)
```

## aleve — ✓ clean · brand search (⚠️ verify SKU)
KB brand: Aleve  ·  openFDA: Aleve
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=00ef5b30-71d0-4cb4-84a3-48c67d1cea2a
```
  units/dose  KB=1  openFDA=1  ✓    max doses/day  KB=3  openFDA=? (=?/1)  ?
  naproxen           per-unit  KB=220 mg  openFDA=220 mg  ✓   (KB per-dose 220 mg = 220×1)
```

## bayer-aspirin — ⚠️ 1 flag(s) · brand search (⚠️ verify SKU)
KB brand: Bayer Aspirin  ·  openFDA: Bayer Chewable - Aspirin Regimen Low Dose Aspirin Cherry Flavored
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=070d5713-e018-2913-e054-00144ff8d46c
```
  units/dose  KB=2  openFDA=?  ?    max doses/day  KB=6  openFDA=? (=48/?)  ?
  aspirin            per-unit  KB=325 mg  openFDA=81 mg  ✗   (KB per-dose 650 mg = 325×2)
```

## excedrin-extra-strength — ⚠️ 1 flag(s) · brand search (⚠️ verify SKU)
KB brand: Excedrin Extra Strength  ·  openFDA: Excedrin Extra Strength Pain Reliever
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=0faa3592-4d56-4645-9a0e-066e0bdfebb6
```
  units/dose  KB=2  openFDA=2  ✓    max doses/day  KB=2  openFDA=4 (=8/2)  ✗
  acetaminophen      per-unit  KB=250 mg  openFDA=250 mg  ✓   (KB per-dose 500 mg = 250×2)
  aspirin            per-unit  KB=250 mg  openFDA=250 mg  ✓   (KB per-dose 500 mg = 250×2)
  caffeine           per-unit  KB=65 mg  openFDA=65 mg  ✓   (KB per-dose 130 mg = 65×2)
```

## dayquil — ⚠️ 1 flag(s) · brand search (⚠️ verify SKU)
KB brand: Vicks DayQuil Cold & Flu  ·  openFDA: Vicks DayQuil NyQuil BERRY Kids COLD and COUGH plus
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=02fbe8b3-49e2-8712-e063-6294a90add50
```
  units/dose  KB=2  openFDA=?  ?    max doses/day  KB=4  openFDA=? (=?/?)  ?
  acetaminophen      per-unit  KB=325 mg  openFDA=? mg  ?   (KB per-dose 650 mg = 325×2)
  dextromethorphan   per-unit  KB=10 mg  openFDA=15 mg  ✗   (KB per-dose 20 mg = 10×2)
  phenylephrine      per-unit  KB=5 mg  openFDA=5 mg  ✓   (KB per-dose 10 mg = 5×2)
```

## nyquil — ✓ clean · brand search (⚠️ verify SKU)
KB brand: Vicks NyQuil Cold & Flu  ·  openFDA: Vicks DayQuil NyQuil BERRY Kids COLD and COUGH plus
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=02fbe8b3-49e2-8712-e063-6294a90add50
```
  units/dose  KB=2  openFDA=?  ?    max doses/day  KB=4  openFDA=? (=?/?)  ?
  acetaminophen      per-unit  KB=325 mg  openFDA=? mg  ?   (KB per-dose 650 mg = 325×2)
  dextromethorphan   per-unit  KB=15 mg  openFDA=15 mg  ✓   (KB per-dose 30 mg = 15×2)
  doxylamine         per-unit  KB=6.25 mg  openFDA=? mg  ?   (KB per-dose 12.5 mg = 6.25×2)
```

## tylenol-cold-flu-severe — ⚠️ 1 flag(s) · brand search (⚠️ verify SKU)
KB brand: Tylenol Cold + Flu Severe  ·  openFDA: Tylenol Cold Flu Severe
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=618ce449-5ad6-4e53-bbf6-152a907c493e
```
  units/dose  KB=2  openFDA=2  ✓    max doses/day  KB=4  openFDA=5 (=10/2)  ✗
  acetaminophen      per-unit  KB=325 mg  openFDA=325 mg  ✓   (KB per-dose 650 mg = 325×2)
  dextromethorphan   per-unit  KB=10 mg  openFDA=10 mg  ✓   (KB per-dose 20 mg = 10×2)
  guaifenesin        per-unit  KB=200 mg  openFDA=200 mg  ✓   (KB per-dose 400 mg = 200×2)
  phenylephrine      per-unit  KB=5 mg  openFDA=5 mg  ✓   (KB per-dose 10 mg = 5×2)
```

## mucinex — ⚠️ 1 flag(s) · brand search (⚠️ verify SKU)
KB brand: Mucinex (600 mg)  ·  openFDA: Mucinex Sinus-Max Pressure, Pain and Cough Maximum Strength
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=07da45b5-d05e-41b1-b233-f7034d556a8d
```
  units/dose  KB=2  openFDA=?  ?    max doses/day  KB=2  openFDA=? (=?/?)  ?
  guaifenesin        per-unit  KB=600 mg  openFDA=200 mg  ✗   (KB per-dose 1200 mg = 600×2)
```

## mucinex-dm — ⚠️ 2 flag(s) · brand search (⚠️ verify SKU)
KB brand: Mucinex DM (600 mg)  ·  openFDA: Mucinex DM Maximum Strength
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=104b29ed-a377-4436-8e24-413c63579f2e
```
  units/dose  KB=2  openFDA=?  ?    max doses/day  KB=2  openFDA=? (=2/?)  ?
  guaifenesin        per-unit  KB=600 mg  openFDA=1200 mg  ✗   (KB per-dose 1200 mg = 600×2)
  dextromethorphan   per-unit  KB=30 mg  openFDA=60 mg  ✗   (KB per-dose 60 mg = 30×2)
```

## sudafed — ⚠️ 2 flag(s) · brand search (⚠️ verify SKU)
KB brand: Sudafed (pseudoephedrine)  ·  openFDA: Sudafed Sinus Congestion 12 Hour
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=0e4717a1-914b-466d-8bf0-d37ebc32fdb3
```
  units/dose  KB=1  openFDA=1  ✓    max doses/day  KB=4  openFDA=2 (=2/1)  ✗
  pseudoephedrine    per-unit  KB=60 mg  openFDA=120 mg  ✗   (KB per-dose 60 mg = 60×1)
```

## sudafed-pe — ⚠️ 2 flag(s) · brand search (⚠️ verify SKU)
KB brand: Sudafed PE  ·  openFDA: SUDAFED PE Head Congestion Plus Flu Severe
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=1e528f78-0ced-4a06-935a-84056c921727
```
  units/dose  KB=1  openFDA=2  ✗    max doses/day  KB=6  openFDA=5 (=10/2)  ✗
  phenylephrine      per-unit  KB=10 mg  openFDA=5 mg  ✗   (KB per-dose 10 mg = 10×1)
```

## benadryl — ⚠️ 1 flag(s) · brand search (⚠️ verify SKU)
KB brand: Benadryl Allergy (25 mg)  ·  openFDA: Childrens Benadryl DYE-FREE ALLERGY
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=10d478ff-ddc6-45da-87ff-cfe1b2b07a8e
```
  units/dose  KB=2  openFDA=?  ?    max doses/day  KB=6  openFDA=? (=6/?)  ?
  diphenhydramine    per-unit  KB=25 mg  openFDA=12.5 mg  ✗   (KB per-dose 50 mg = 25×2)
```

## zyrtec — ⚠️ 1 flag(s) · brand search (⚠️ verify SKU)
KB brand: Zyrtec  ·  openFDA: Childrens Zyrtec
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=013ce40e-37c9-4b84-b530-ed895f60ce0e
```
  units/dose  KB=1  openFDA=?  ?    max doses/day  KB=1  openFDA=? (=?/?)  ?
  cetirizine         per-unit  KB=10 mg  openFDA=2.5 mg  ✗   (KB per-dose 10 mg = 10×1)
```

## tylenol-pm — ✓ clean · brand search (⚠️ verify SKU)
KB brand: Tylenol PM  ·  openFDA: Tylenol PM Extra Strength
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=435b1a31-353d-af20-e063-6294a90aa907
```
  units/dose  KB=2  openFDA=2  ✓    max doses/day  KB=1  openFDA=? (=?/2)  ?
  acetaminophen      per-unit  KB=500 mg  openFDA=500 mg  ✓   (KB per-dose 1000 mg = 500×2)
  diphenhydramine    per-unit  KB=25 mg  openFDA=25 mg  ✓   (KB per-dose 50 mg = 25×2)
```

## advil-cold-sinus — ✓ clean · brand search (⚠️ verify SKU)
KB brand: Advil Cold & Sinus  ·  openFDA: ADVIL COLD AND SINUS
DailyMed: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=0da9ed22-bfb4-d61b-110b-0c7760332a98
```
  units/dose  KB=1  openFDA=1  ✓    max doses/day  KB=4  openFDA=? (=?/1)  ?
  ibuprofen          per-unit  KB=200 mg  openFDA=200 mg  ✓   (KB per-dose 200 mg = 200×1)
  pseudoephedrine    per-unit  KB=30 mg  openFDA=30 mg  ✓   (KB per-dose 30 mg = 30×1)
```

---
6/17 products clean; 11 need review.
