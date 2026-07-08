# OnLabel — OTC Knowledge Base v0 (검수 대상 초안)

> ⚠️ **이 파일은 약사 검수 전 초안(v0)이다.** 모든 성분·함량·용량 숫자는 **현행 DailyMed SPL / FDA 라벨에 대조 확인 필요.** 제조사는 처방(reformulate)을 자주 바꾼다(특히 2023 FDA 경구 phenylephrine 판정 이후). 확정본은 openFDA/DailyMed로 재검증 후 JSON화.
>
> 검수 표기: `[OK]` 약사 확인됨 · `[?]` 확인 필요 · `[FDA]` FDA 라벨 근거 확인됨
>
> 판정 스케일: ✅ OK / ⚠️ Caution / 🚫 Danger

---

## Part A. 활성성분 기준표 (성인, OTC 일일최대)

| 성분 | OTC 성인 일일최대 | 단위위험 | 검수 | 비고 |
|---|---|---|---|---|
| **Acetaminophen (APAP)** | **4,000 mg/24h** (FDA 라벨 상한) | 간독성(급성 간부전 미국 1위) | [OK] | ✅**결정: 4,000mg 기준**(FDA 라벨=권위 출처). 참고: Extra Strength Tylenol은 제조사 자율로 라벨 3,000. "보수적 모드 3000" 토글은 backlog B-2 |
| **Ibuprofen** | **1,200 mg/24h** (OTC) | GI 출혈·신장·심혈관 | [FDA] | Rx는 3,200까지, OTC 상한은 1200 |
| **Naproxen sodium** | **660 mg/24h** (220mg×3) | GI·신장·심혈관 | [FDA] | |
| **Aspirin** (진통 용도) | ~4,000 mg/24h (OTC) | GI 출혈, 소아 Reye | [?] | 저용량 심혈관 예방(81mg)은 별개 |
| **Dextromethorphan (DXM)** | ~120 mg/24h | 과량 시 신경계 | [?] | |
| **Guaifenesin** | 2,400 mg/24h | 낮음 | [?] | |
| **Pseudoephedrine** | 240 mg/24h | 혈압·심박 | [?] | behind-counter(BTC) |
| **Phenylephrine** (경구) | ~60 mg/24h (10mg q4h) | 혈압 | [FDA] | ⚠️**효능 경고(위험 아님)**: FDA 2023 자문위 16-0 만장일치로 경구 PE 비충혈제거 **효능 없음** 결론, 2024-11-08 OTC 모노그래프 제거 제안. → OnLabel은 이 성분 포함 제품에 "이 감기약의 코막힘 성분은 FDA가 효과 없다고 판정" 별도 안내 + 레퍼런스 링크. 약사만 아는 차별 포인트. (§레퍼런스) |
| **Diphenhydramine** | 300 mg/24h(알레르기), 수면보조 50mg | 진정·항콜린 | [?] | |
| **Doxylamine** | 수면보조 25mg | 진정 | [?] | 감기약 복합 내 소량 |
| **Chlorpheniramine** | 24 mg/24h | 진정 | [?] | |
| **Loratadine / Cetirizine / Fexofenadine** | 각 10 / 10 / 180 mg 1일1회 | 낮음(비진정) | [?] | 2세대 항히스타민 |
| **Caffeine** | 복합제 내 용량 다양 | 각성 | [?] | |

---

## Part B. 제품 카탈로그 (US OTC, 미국 시장 리밸런싱 완료)

> 각 셀 = 제품 1회 권장단위(캐플릿/정/포)당 함량. `[?]` = DailyMed 재확인 대상.
> **⭐ = 코어 데모 세트(미국 가정 상비, 최우선 15종)** · 나머지 = 확장 세트.
> 미국 OTC 진통·감기 시장은 소수 대기업 브랜드가 장악: **Kenvue**(Tylenol·Sudafed·Benadryl·Zyrtec·Motrin), **Haleon**(Advil·Robitussin·Theraflu·Excedrin), **Bayer**(Aleve·Bayer아스피린·Alka-Seltzer·Midol·Claritin·Coricidin), **P&G**(Vicks DayQuil/NyQuil·ZzzQuil), **Reckitt**(Mucinex·Delsym). 근거: CHPA, 시장조사 2025.

### B1. 단일성분 진통·해열
| 제품 | 활성성분(단위당) | |
|---|---|---|
| Tylenol Regular Strength | APAP 325mg | ⭐ |
| Tylenol Extra Strength | APAP 500mg | ⭐ |
| Advil / Motrin IB | ibuprofen 200mg | ⭐ |
| Aleve | naproxen sodium 220mg | ⭐ |
| Bayer Aspirin | aspirin 325mg | ⭐ |

### B2. 복합 진통 (APAP/aspirin 조합)
| 제품 | 활성성분 | |
|---|---|---|
| Excedrin Extra Strength | APAP 250 + aspirin 250 + caffeine 65 | ⭐ |
| Excedrin Migraine | APAP 250 + aspirin 250 + caffeine 65 | |
| Midol Complete | APAP 500 + caffeine 60 + pyrilamine 15 [?] | (여성 생리통, 흔함) |
| Goody's / BC Powder | aspirin+caffeine(+APAP) [?] | (미 남부 지역 한정, niche — 유지하되 후순위) |

### B3. 감기·독감 복합 (★APAP 중복 위험지대★)
| 제품 | 활성성분 | |
|---|---|---|
| Vicks DayQuil Cold & Flu | **APAP 325** + DXM 10 + phenylephrine 5 | ⭐ |
| Vicks NyQuil Cold & Flu | **APAP 325** + DXM 15 + doxylamine 6.25 | ⭐ |
| Vicks DayQuil/NyQuil **SEVERE** | **APAP 325** + DXM 10 + guaifenesin 200 + phenylephrine 5 [?] | (탑셀러, APAP 더 숨음) |
| Tylenol Cold + Flu Severe | **APAP 325** + DXM 10 + guaifenesin 200 + phenylephrine 5 | ⭐ |
| Theraflu Severe Cold (포당) | **APAP 650** + DXM 20 + phenylephrine 10 [?] | |
| Sudafed PE Sinus + Pain | **APAP 325** + phenylephrine 5 [?] | |
| Mucinex Fast-Max | **APAP** + DXM + guaifenesin + phenylephrine [?] | |
| Coricidin HBP Cold & Flu | **APAP 325** + chlorpheniramine 2 + DXM 10 | (충혈제거제 無 = 고혈압용) |

### B4. 기침·거담 (non-APAP)
| 제품 | 활성성분 | |
|---|---|---|
| Mucinex (ER) | guaifenesin 600 | ⭐ |
| Mucinex DM (ER) | guaifenesin 600 + DXM 30 | ⭐ |
| Robitussin DM Max (5mL) | guaifenesin 200 + DXM 20 [?] | (탑브랜드) |
| Delsym (5mL, ER) | DXM polistirex 30 | |

### B5. 충혈제거제
| 제품 | 활성성분 | |
|---|---|---|
| Sudafed (BTC) | pseudoephedrine 30 | ⭐ |
| Sudafed PE | phenylephrine 10 | (⚠️효능 이슈 성분) |

### B6. 항히스타민(알레르기)
| 제품 | 활성성분 | |
|---|---|---|
| Benadryl | diphenhydramine 25 | ⭐ |
| Zyrtec | cetirizine 10 | ⭐ |
| Claritin | loratadine 10 | |
| Allegra | fexofenadine 180 | |

### B7. PM/수면 복합 (★진통제+항히스타민 중복 함정★)
| 제품 | 활성성분 | |
|---|---|---|
| Tylenol PM | **APAP 500** + diphenhydramine 25 | ⭐ |
| Advil PM | ibuprofen 200 + diphenhydramine 38 | |
| Aleve PM | naproxen 220 + diphenhydramine 25 | |
| ZzzQuil | diphenhydramine 25 | |

### B8. 감기+NSAID
| 제품 | 활성성분 | |
|---|---|---|
| Advil Cold & Sinus | ibuprofen 200 + pseudoephedrine 30 | ⭐ |
| Aleve-D Sinus & Cold | naproxen 220 + pseudoephedrine 120(ER) [?] | |

> **리밸런싱 변경**: (+)DayQuil/NyQuil SEVERE·Robitussin DM Max 추가(탑셀러). (강등)Goody's/BC Powder는 미 남부 지역 한정 niche라 통합·후순위. (제외)Chlor-Trimeton 단독(chlorpheniramine 수요 감소 — 성분은 Coricidin에 잔존). 항히스타민은 Zyrtec 코어 승격.
> **중복 표면(demo 금맥)**: APAP가 ~13개 제품에 분산(단일 Tylenol + 감기약 + PM + 복합진통) → "DayQuil 먹고 두통에 Tylenol 추가" 같은 소비자·일반 LLM이 못 잡는 조합 다수. DXM·diphenhydramine·decongestant도 다중 분산.

---

## Part C. 약사 규칙셋 v1

### R1. 성분 중복 (★핵심 규칙★)
동일 활성성분이 선택된 2개 이상 제품에 존재하면:
- 항상 최소 ⚠️ 경고 (소비자는 "제품"으로 보지 "성분"으로 안 봄)
- 예상 24h 합산이 성분 일일최대 **초과 시 🚫**
- **최우선 성분: acetaminophen** (숨은 APAP: DayQuil+Tylenol, NyQuil+Tylenol PM, Excedrin+감기약 등)

### R2. 누적 용량 상한
단일 출처라도 사용 패턴이 일일최대 초과 시 ⚠️/🚫.

### R3. 동일계열 중복 / 상호작용 (약사 저작, ONCHigh 시드)
| 조합 | 위험 | 판정 |
|---|---|---|
| NSAID + NSAID (ibuprofen/naproxen/aspirin 중 2+) | GI 출혈·신장 | 🚫 |
| 진정 항히스타민 다중 (diphenhydramine+doxylamine+chlorpheniramine) | 진정·항콜린 가중 | ⚠️ |
| 충혈제거제 다중 (pseudoephedrine+phenylephrine) | 혈압·심박 | ⚠️ |
| APAP + 상당량 음주 | 간독성 | ⚠️→🚫 |
| 충혈제거제 + 조절 안 된 고혈압 | 혈압 상승 | ⚠️ (대안: Coricidin HBP) |
| Aspirin + 소아/청소년 바이러스질환 | Reye 증후군 | 🚫 (red flag) |

### R4. Red-flag / 전문가 의뢰 (→ `otc-red-flag-triage` 스킬)
- 임신 / 수유
- 소아(제품별 연령 기준, 통상 <12)
- 간질환(APAP) · 신장질환(NSAID) · 위궤양 · 고혈압 · 항응고제 복용
- 기간: 발열 >3일, 통증 >10일 → 의사 상담
- 경고 증상(고열 지속, 호흡곤란 등)

---

## 결정 로그 (2026-07-08)
1. ✅ **APAP 경고 임계 = 4,000mg** (FDA 라벨=권위 출처). 3000 보수모드는 backlog B-2.
2. ✅ **Phenylephrine = 효능 경고 + FDA 레퍼런스 표시** (위험이 아니라 "효과 없음"). §레퍼런스 참조.
3. ✅ **Rx 약물(warfarin 등) = 데모에서 제외** → backlog B-1. (red-flag "처방약 복용 시 약사 상담" 소프트 게이트만 유지)
4. ✅ **제품 리밸런싱 완료** (§Part B, 미국 top 브랜드 기준). 
5. ⏳ 남은 검수: B3/B7 함량 `[?]` 항목 DailyMed 재확인 (빌드 시 openFDA로 자동 검증).

## 레퍼런스 (phenylephrine 효능 — 스킬 references/로 이전)
- FDA 보도자료(2024-11-08): "FDA Proposes Ending Use of Oral Phenylephrine as OTC Monograph Nasal Decongestant Active Ingredient After Extensive Review" — https://www.fda.gov/news-events/press-announcements/fda-proposes-ending-use-oral-phenylephrine-otc-monograph-nasal-decongestant-active-ingredient-after
- FDA 소비자 안내: "Key Information about Nonprescription, OTC, Oral Phenylephrine" — https://www.fda.gov/drugs/understanding-over-counter-medicines/key-information-about-nonprescription-over-counter-otc-oral-phenylephrine
- 근거: 2023-09 FDA 비처방약 자문위(NDAC) **16-0 만장일치** 경구 PE 효능 없음 결론.

---

*근거: openFDA/DailyMed(성분·함량), GetReliefResponsibly(FDA 캠페인, APAP/NSAID 용량), Drugs.com(복합제 용량). 작성 2026-07-08, v0 초안. 확정 시 JSON + skill references/로 이전.*
