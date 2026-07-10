# OnLabel — Backlog (데모 이후 고려)

> 해커톤 데모 범위에서 **의도적으로 제외**한 기능. 나중에 실제 제품으로 키울 때 재검토.
> 원칙: 지금은 "작동하는 좁은 데모"가 목표. 범위를 넓히면 완성 리스크 ↑.
> **심각도**: P0 블로커 / P1 중요 / P2 개선 / IDEA.
> **✅ 완료(2026-07-08~09)**: B-6(복용법 9성분·NSAID잔여 B-7) · B-8(generic 성분명, D32) · B-11(제품해소) · B-12(검사기 D34) · B-13(red-flag 배지억제 D35·데이터 B-16) · B-15(verdict provenance D34).
> **남은 것(전부 데모 후)**: B-1·B-2·B-3(IDEA) · B-4(제품조성 sync) · B-5 · B-7 · B-9 · B-10 · B-14 · B-16.

---

## B-1. Rx(처방) 약물 상호작용 — **데모에서 제외** `[P2]`
- **무엇**: warfarin/DOAC 같은 처방약 + OTC 조합 경고 (예: NSAID + 항응고제 → 출혈 🚫).
- **왜 제외**: OnLabel 범위는 **OTC 성분중복·용량**. Rx까지 넣으면 (1)범위 확장으로 7일 완성 리스크, (2)무료 DDI 데이터 소스 부재(NLM 상호작용 API 폐기, DrugBank 유료), (3)Rx는 약사/의사 처방검토 영역이라 소비자 도구 포지셔닝과 어긋남.
- **재추가 조건**: 데모 완성 후 + 신뢰 가능한 상호작용 데이터 소스 확보 시. red-flag triage로 "처방약 복용 중이면 약사 상담" 수준의 소프트 게이트는 유지 가능.

## B-2. 아세트아미노펜 "보수적 모드" (3,000mg) `[P2]`
- **무엇**: 기본은 FDA 라벨 상한 4,000mg 경고. 옵션으로 Tylenol 라벨 기준 3,000mg "보수적 모드" 토글.
- **왜 나중**: 데모는 단일 기준(4000)으로 명확하게. 사용자 설정은 v1 이후.

## B-4. 데이터 정밀화 — 2 트랙 `[P1]`
데모 후 verify:true 값들을 권위 출처로 채우는 작업. 두 갈래(A/B 버킷):
- **제품 조성** (15/17 제품 verify:true) → **`npm run sync:fda`**: openFDA API로 제품 라벨 성분·함량 빌드타임 적재. (= L3)
- **성분 일일한도** (5개: aspirin·pseudoephedrine·phenylephrine·doxylamine·caffeine) → **FDA 모노그래프 M013(진통)·M012(감기)**.

**진행(2026-07-08)**: 성분한도 5개 ✅ 완료 — M013·M012·M011 결정론 추출·검증, verify:false 승격(D22). 제품조성 15개(openFDA sync)는 미착수. **전체 OTC 모노그래프 세트(M001~M032+NM900)를 refs/에 로컬 확보**(gitignore) — 진통·감기 밖 29개는 범위 확장 시 쓸 자산(지금 미처리).

⚠️ **추출 방법 = 결정론적, LLM 금지.** 이유: 의료 용량 숫자가 LLM(WebFetch의 요약 모델 등)을 거치면 오염(할루시네이션) 위험 → 뉴로심볼릭 원칙 위반.
- PDF는 **Akamai 봇 차단**이라 자동(curl/WebFetch) 다운로드 불가 → **사람 브라우저로 다운로드** 필요.
- 추출은 **pdftotext(설치됨) + grep**으로 "not to exceed X mg/24h" 원문 추출 → 약사 검증 → verify:false + 모노그래프 인용.

**다운로드 URL (브라우저로):**
- M013 진통: `https://www.accessdata.fda.gov/drugsatfda_docs/omuf/monographs/OTC%20Monograph_M013-Internal%20Analgesic,%20Antipyretic,%20and%20Antirheumatic%20Drug%20Products%20for%20OTC%20Human%20Use%2010.14.2022.pdf`
- M012 감기: `https://www.accessdata.fda.gov/drugsatfda_docs/omuf/monographs/OTC%20Monograph_M012-Cough%20Cold%20Allergy%20Bronchodilator%20and%20Antiasthmatic%20Drug%20Products%20for%20OTC%20Human%20Use%2010.14.2022.pdf`
- 안 열리면 포털 검색: `https://www.accessdata.fda.gov/scripts/cder/omuf/index.cfm?event=monographsearch` (M013/M012)
- 받은 PDF는 `f:\hackathon\refs\`에 저장 → 다음 세션에 pdftotext 추출.

## B-5. 다중 SKU 강도 구분 (multi-SKU disambiguation) `[P2]`
- **무엇**: 한 브랜드가 강도별 여러 SKU를 가짐 — Benadryl(25/50 mg), Mucinex/Mucinex DM(600/1200 mg), Sudafed(30/60 mg) 등. 일일상한 판정은 SKU 무관 동일하나 "몇 알" 표시는 SKU마다 다름.
- **현재 처리(D20)**: 강도 모호 브랜드는 브랜드명에 강도 못박아 표준 SKU 하나로 고정("Benadryl Allergy (25 mg)" 등). 데모엔 충분.
- **개선안**: 사용자가 강도를 고르게 하는 UI(제품 선택 시 강도 드롭다운) 또는 자연어에서 "extra strength"·"maximum strength" 파싱 → 해당 SKU 매핑. openFDA sync(B-4) 시 SKU별 NDC 단위로 적재.

## B-6. 복용법(dosing schedule) 데이터 레이어 `[✅ 대부분 DONE 2026-07-08 — D27(B) / NSAID 잔여는 B-7]`
> **해결됨(9성분)**: `ingredients.json`에 `dosing{intervalText, maxDurationText}` 추가 — M012/M013 결정론 추출(pdftotext+grep), 약사 서명→verify:false. 간격/기간 질문이 접지 답변 or 정직 유보. **잔여 = ibuprofen·naproxen 소스 + ER 제형 오버라이드는 B-7.**
- **무엇**: KB에 **복용 간격(interval)·1회 최대(single-dose max)·복용법(with food/at bedtime 등)** 필드를 추가. 현재 KB엔 성분·mgPerDose·maxDailyMg·maxDosesPerDay만 있고 **간격 데이터가 0**이라, "몇 시간마다 / 얼마나 자주" 질문에 LLM이 접지 없이 기억으로 답함(findings 2026-07-08 20개 probe, D27 위반).
- **왜 P1**: 뉴로심볼릭 울타리(D27)를 완성하려면 필요. 이게 없으면 빈도 질문은 항상 "라벨 확인/약사" 유보밖에 못 함(정직하지만 데모 약함). 있으면 접지된 간격 답변 가능(데모·Impact 강화).
- **어떻게**: **FDA 모노그래프 M012/M013(이미 refs/ 로컬 확보)에서 결정론 추출**(pdftotext+grep). 예: pseudoephedrine "60 mg every 4-6h"는 이미 source에 추출돼 있음 — 이를 구조화 필드로. 스코프 내 ~9성분/~18제품, 유계 작업. **LLM 추출 금지**(D22 원칙). = 범위 확장 아니라 용량 레이어 완성(D28).
- **대안(데이터 안 채울 시)**: 간격 질문을 명시적 스코프아웃 → 프롬프트에서 항상 유보(D의 폴백).
- **선행**: D27의 (D)프롬프트 울타리 + (A)도구 용량 노출 먼저. 그 다음 이 데이터.

## B-3. 확장 후보 (아이디어 저장소) `[IDEA]`
- 소아 체중당 용량 계산기
- 임부/수유부 안전성 등급 레이어
- 약-영양제/건강식품 상호작용
- 다국어(한국 OTC 시장 버전 — 성분명 매핑 다름)
- 복약 타임라인 시각화(반감기 기반)

---

*작성 2026-07-08. 관련: architect.md, data/otc-knowledge-base.md*

## B-7. 복용법 데이터 잔여분 (ibuprofen·naproxen 소스 + ER 간격) `[P1]`
- **무엇**: (1) ibuprofen(200-400mg q4-6h, max 1200, 10일)·naproxen(220mg q8-12h, first-dose 2정, max 660, 10일) 간격/기간을 **권위 소스에서 확보** — 추출된 M013.txt엔 없음(NSAID 개별 모노그래프/Drug Facts 필요, 결정론 추출·약사 검증). (2) **제품 단위 간격 오버라이드**: 성분 IR 간격 ≠ ER 제형 실제 스케줄(Mucinex ER q12h). 현재 doseForm=ER이면 간격 억제로 회피 중 → products.json에 제품별 `dosing` 오버라이드 필드로 정밀화.
- **왜 P1**: 지금 ibuprofen/naproxen 빈도·기간 질문은 정직하게 유보하나 접지 답변이면 데모/Impact↑. NSAID는 최다 질문 대상.
- **선행**: 현 dosing 9종 verify:true의 약사 서명(→verify:false) 먼저.

## B-8. Generic 성분명 해결 (중복 위음성 차단) `[✅ DONE 2026-07-08 — D32]`
> **해결됨**: resolver가 성분명/aka 매칭 시 원장에 **0mg 기여**로 참여(중복·클래스 탐지 작동, mg 미조작). `acetaminophen+Tylenol`→caution, `ibuprofen+Aleve`→danger. 회귀 5, 위음성 차단. 상세: DECISIONS D32.
- **무엇**: resolver가 "acetaminophen"/"ibuprofen"/"naproxen" 같은 **일반 성분명**을 제품으로 인식하도록. 현재 브랜드/id 토큰만 매칭 → `verify(["acetaminophen","Tylenol Extra Strength"])`가 ok(실제 danger, APAP 이중). 소비자 실검색은 일반명 다수(시장조사 #12·#16).
- **왜 P1(안전)**: 위음성 = 초록 OK가 실제 과용을 숨김 = 뉴로심볼릭 코어 신뢰 훼손. 데모에서 심사위원이 "acetaminophen + Tylenol" 쳐보면 드러남.
- **어떻게**: 입력이 ingredient displayName/aka에 매칭되면 **성분레벨 합성 기여**(대표 mgPerDose로)를 원장에 추가해 중복/누적 계산에 참여시킴. 제품 미매칭이어도 성분은 반영. 회귀 테스트: 위 2케이스 danger + 라벨↔산문 일치.
- **선행 없음**. verify.ts resolver + ledger 수정. 결정론, LLM 미개입.

## B-9. 인용 receipts 확장 `[P2]`
- **무엇**: (1) ibuprofen·naproxen·caffeine(M011)·2세대 항히스타민 인용 추가(B-7 소스 확보 후), (2) 본문 산문 인라인 각주(ChatGPT식 위첨자) — LLM이 문장별 인용 앵커 emit해야 해서 복잡+날조 위험, 신중히. (3) 팝오버 바깥클릭 닫기 등 UX 폴리시.
- **선행**: 현 citations.json은 M012/M013 9종. B-7(NSAID 소스)·M011 캡션 확보 시 확장.

## B-10. L1 claim verifier 정밀화 `[P1 신뢰 — 대조엔진 센터피스 직결]`
> **승격 2026-07-09**: 대조 엔진을 데모 센터피스로 강화(c130478)하며 라이브 캡처(Tylenol ES+DayQuil)에서 **잘못된 반박(false CONTRADICTED)** 발견. 대조 엔진의 논지("일반 AI는 틀리고 우리는 FDA로 정확히 반박")는 **우리 교정이 실제로 옳아야** 성립 — 맞는 말을 틀렸다고 반박하면 논지 역훼손. 심사위원이 잡으면 치명.
- **🔴 (0) per-pill vs per-dose 입도 불일치 (신규, 최우선)**: generic AI가 *"Tylenol ES is 500 mg per pill"*(알약당 500mg = **사실**)이라 했는데, verifier가 *per-dose(1000mg = 2정)*와 비교해 **CONTRADICTED "1000/650 mg, not 500 mg"**로 표시. 마찬가지로 "DayQuil 325 mg per dose"도. **claim의 단위(per-pill/per-dose)를 파악해 같은 단위끼리 비교**하거나, 모호하면 반박하지 말 것(오반박 방지). transcript: `evals/transcripts/` + 스크린샷 contrast-2-result.
- (1) dose-limit "conservative target"(APAP 3,000 권장) vs "label ceiling"(4,000) 구분 — 현재 3,000 진술을 4,000 위반으로 과엄격 CONTRADICTED. (라이브에서도 "ceiling is 3,000"→"4,000, not 3,000" 반박 확인. 3,000은 Tylenol 브랜드 권장치라 "틀림"이 아니라 "보수적 목표"로 다뤄야.)
- (2) [C]가 ingredient에 클래스명("NSAID")을 넣는 경우 처리. (3) single-dose naproxen "first dose 440 mg" 라벨 규칙 반영 여부.
- **왜 P1**: verdict·ceiling 판정 자체는 정확하나, **대조 엔진이 데모 전면(Demo 30+Impact 25)에 나오면서 오반박이 신뢰 리스크로 승격**. 범위: `verifyClaims.ts` dose 비교 로직. 결정론, LLM 미개입.

## B-11. 제품 이름 해소 견고화 (resolution robustness) `[✅ DONE 2026-07-09]`
> **해결됨**: `verify.ts`에 `COLLOQUIAL_DEFAULT` 도입 — step2에서 "regular/normal/plain/standard/ordinary"를 강도 토큰이 아닌 default 신호로 처리 → bare-brand default(ES)+assumption으로 수렴. verify.test.ts 신규 4케이스 그린, 골든 214/214 정합, tsc 0. 정식 전체명("Tylenol Regular Strength")은 step1 exact로 danger 유지(안전방향 불변). 상세: findings.md 2026-07-09.
> 발견: 2026-07-09 x100 확장 골든 live(101문항). **실패 3건 전부 verifier가 아니라 "이름→제품 해소" divergence.** verify() 결정론 코어는 단 한 번도 안 틀림 — 취약한 이음새는 자연어→SKU 매핑.

### 증상 (Symptom)
- `x100-txpm-tylenol`("Tylenol PM + regular Tylenol") — 골든 danger인데 live caution. LLM이 "regular"를 떨구고 "Tylenol"만 도구에 넘김 → ES default 해소 → 합계가 경계 아래 → caution.
- `x100-fact-mucinexdm-vs-mucinex`("Mucinex와 Mucinex DM 차이?") — 골든 ok(단일)인데 live danger. LLM이 두 제품명 다 넘겨 guaifenesin 중복 발동.
- `x100-ctx-fever-headache`("열/두통에 뭐 먹지?") — 제품 없이 일반 추천(→ B-12).

### 원인 (Root cause)
1. **"regular"가 strength 토큰으로 오분류**: `resolveProduct` step2(strength family)에서 `strengthToken("Regular Strength")="regular"`가 입력 토큰 "regular"와 explicit 매칭 → **Regular Strength SKU(325mg)로 확정, assumption 없음**. 그러나 소비자 자연어 "regular Tylenol"은 대개 *"보통/일반 타이레놀"*(= 흔한 Extra Strength) 의미. → **의미론 불일치.**
2. **경계 SKU가 판정을 뒤집음**: APAP 합계가 4,000mg 경계 근처라 SKU 하나(Regular 325 vs ES 500)로 duplication이 caution↔danger로 flip. 재현: `verify(["Tylenol PM","Tylenol Regular Strength"])=danger` vs `verify(["Tylenol PM","Tylenol Extra Strength"])=caution`.
3. **LLM의 비결정적 이름 정규화**: 같은 질문에도 LLM이 "Tylenol"/"regular Tylenol"/"Extra Strength Tylenol" 중 무엇을 도구에 넘기느냐로 productsChecked가 달라짐 → 결정론 코어의 입력이 흔들림.

### 결과 (Effect / Impact)
- **판정 비결정성(신뢰 리스크)**: 같은 의도의 질문이 이름 표현에 따라 danger↔caution으로 갈림. 심사위원이 "regular Tylenol" 류 자연어를 치면 재현 가능 → 뉴로심볼릭 "숫자로 반박"의 신뢰 훼손.
- **단, 안전 방향은 유지됨**: 세 케이스 모두 산문은 중복/위험을 정확히 경고(위음성 아님). 문제는 **카드 verdict 등급의 일관성**이지 안전 누락이 아님. 그래서 P1이나 데모 치명은 아님.
- **라이브 판정 assertion이 이 divergence를 전부 포착** — eval 하네스가 제 역할. (텍스트 채점만이면 놓쳤을 것.)

### 해결안 (Fix)
1. **`resolveProduct`에서 "regular/normal/plain/standard"를 strength 토큰 후보에서 제외** → 이 단어들은 강도가 아니라 "기본형" 신호로 보고 **bare 브랜드 default SKU 경로**(assumedDefault=true, ES)로 보냄 → AssumptionNote 노출("You said 'regular Tylenol' → we used Tylenol Extra Strength").
2. **중복 경고 불변식**: 성분(특히 APAP) 중복이 존재하면 SKU 모호성으로 누적합이 경계 아래여도 **최소 caution + "doses add up" 경고는 항상 유지**(verdict가 조용히 ok로 안 빠지게). 이미 duplication=caution이나, 메시지 톤을 SKU 무관 견고화.
3. **회귀테스트**: `"regular Tylenol"`→ES default+assumption / `"Tylenol PM"+"regular Tylenol"`→중복 caution+assumption / bare "Tylenol" 기존 동작 불변 / 다른 브랜드 회귀 없음.
- **범위**: `verify.ts`의 `resolveProduct`/`strengthToken` 결정론 수정 + `verify.test.ts` 회귀. **LLM 미개입.** 선행 없음.
- **검증 기준**: 전체 골든(223) 결정론 회귀 그린 + 신규 회귀 통과 + 위 3케이스 재현 해소.

## B-12. 의도 분류 + 추천 포지셔닝 `[✅ DONE 2026-07-09 — D34]`
> **해결됨**: 검사기(Checker)로 확정(DECISIONS D34). 결정론 provenance 게이트(`provenance.ts` `userNamedProducts`) — verdict는 사용자가 명명한 제품에만. 열린 질문은 verdict 없이 교육+되물음. `agent.ts` 배선 + 프롬프트 울타리. 라이브 스모크 확인(#1 fever→verdict none). 남은 "비교 vs 조합" 뉘앙스는 무해라 미처리.
> x100에서 발견된 스코프 뉘앙스(버그 아님, 정의 공백).
- **무엇**: (1) **비교 vs 조합 구분**: "Mucinex와 Mucinex DM 차이?"가 두 제품명 언급→도구가 둘 다 검사→중복 danger. 정보성 질문에 조합검사 발동(합리적이나 fact 질문엔 과함). (2) **열린 추천 포지셔닝**: 제품 없이 "열/두통에 뭐 먹지?"→시스템이 Tylenol/Advil 일반추천. OnLabel=검사기 vs 추천기 미결. → DECISIONS로 스코프 확정(안전차선=묻기/유보 권장 vs 도움=일반옵션).
- **왜 P2**: 데모엔 무해(둘 다 안전한 답). 정의만 명확히.
- **라이브 근거 추가(2026-07-09 probe 10건)**: `"My back is killing me, what can I take?"` → 시스템이 **Tylenol+Advil 병용을 먼저 추천**("safe to take together if one alone isn't enough")하고 뒤에 조건을 되물음. 열린 추천 포지셔닝 미결(2)을 정면 재현. transcript: `evals/transcripts/probe-2026-07-09T05-34-41-587Z.md` #4. → DECISIONS로 "검사기 vs 추천기" 스코프 확정 필요.
- **라이브 근거 추가(2026-07-09 rough probe 10건)**: 제품 미언급 러프 질문에서 강점·약점 동시 표면화. 강점=소아/임부/Rx/음주 전부 verdict=none+escalate(스코프 규율 우수). 약점=아래 B-15(LLM 추론 제품에 verdict 부여). transcript: `probe-2026-07-09T05-45-22-348Z.md`.

## B-13. 인구집단·기저질환 red-flag가 verdict에 안 담김 (population/condition context) `[✅ 배지억제 DONE 2026-07-09 — D35 / 데이터레이어는 B-16]`
> **1차 해결(배지 억제)**: red-flag cue 결정론 감지(`provenance.ts` `hasRedFlagContext`) → verdict가 **ok일 때만 억제**(초록 오해 차단), caution/danger는 유지(위험 은폐 방지). `agent.ts gatedVerification` + 프롬프트 red-flag 유보. 라이브 확인: 간질환+Tylenol=배지없음(이전 ok), 고혈압+Sudafed+DayQuil=caution 유지. **정식 red-flag 판정(용량 조정·금기·임부카테고리)은 B-16 데이터레이어로 후속.**
> ⚠️ 알려진 한계: cue가 광의 매칭(`liver`/`heart`/`kidney`)이라 "간 건강 지키려고" 류도 억제(안전차선 과억제, verdict none). 정밀화는 B-16.
> 발견: 2026-07-09 probe. **처음 P2로 봤으나 90콜 배치에서 스케일 확증 → P1 승격.** 사용자가 제품 + red-flag(소아/임부/수유/고령/기저질환)를 함께 대면, 시스템은 제품을 해소해 **verdict=ok(초록)** 를 냄 — 제품 단독은 성인 라벨 내라서. **가장 심각한 예: `"I have liver disease, how much Tylenol is safe?"` → verdict=OK.** 간질환+아세트아미노펜은 대표적 금기/감량 대상인데 초록 카드.

### 증상 (90콜 배치, red-flag 10건 전부 verdict=ok)
- 기저질환: #81 간질환+Tylenol=**ok** · #79 궤양+Advil=**ok** · #78 고혈압+Sudafed=**ok** · #77 80세+Aleve=ok
- 소아: #70 5세+Tylenol=ok · #71 kids+DayQuil=ok · #72 toddler+Sudafed=ok
- 임부/수유: #74 수유+Advil=ok · #75 임신+Sudafed=ok · #76 임신+NyQuil=ok
- transcript: `evals/transcripts/probe-2026-07-09T05-42-46-225Z.md`.

### 핵심 관찰 — 산문은 안전, 배지가 문제
- **산문은 전부 정확히 escalate**(위음성 아님). #79는 모델이 **스스로 배지를 보정**: *"that 'OK' is only about dose and duplication... with an ulcer I'd steer away from Advil."* #81은 *"the standard OTC ceiling may not be safe for you."* → **모델조차 verdict 배지가 너무 초록이라고 느껴 말로 상쇄 중.**
- 즉 **결정론 verdict(제품 함수)와 실제 안전(맥락 함수) 사이 구조적 갭.** 심사위원이 배지만 스크린샷하면 "간질환에 Tylenol OK"가 박제됨 → 신뢰 훼손. [[neuro-symbolic-promise]]의 "verdict=사실" 인상과 충돌.

### 왜 P1(신뢰-표시)
위음성은 아니지만(산문 정확), **초록 배지가 red-flag 맥락에서 뜨는 건 데모에서 스크린샷 한 장으로 치명적 오해**를 낳음. B-15와 같은 "verdict 신뢰성" 계열. 안전 누락이 아니라 표시 계층 문제라 코어는 불변.

### 해결안 (Fix)
- (a) **contextFlag 부가 필드**: 질문에서 소아/임부/수유/고령/기저질환(liver·kidney·ulcer·HTN 등) cue를 **결정론 키워드/도구 파라미터**로 감지 → verdict를 초록 OK 대신 **"OK for dose/duplication, but see pharmacist for <context>"** 로 다운그레이드/주석. LLM 추측 판정 아님(cue 매칭은 결정론).
- (b) **최소안**: red-flag cue 감지 시 verdict 배지 자체를 억제(none/“needs review”)하고 산문 escalate에 위임(현행 산문 이미 우수).
- **범위**: cue 감지 = agent.ts 도구 호출 파라미터 or 결정론 프리필터. verdict 표시 레이어. **verify() 코어 불변.** 소아 실제 용량 계산은 B-3(IDEA) — 여기선 **표시 신호만.**
- **검증 기준**: 위 10건에서 배지가 초록 OK가 아니게(주석/다운그레이드/억제) + 일반 성인 질문은 기존 verdict 불변 + 위음성 0 유지.

## B-14. 일반성분명 중복의 verdict 강도 (generic dup severity) `[✅ DONE 2026-07-10]`
> **해결**: (1) verify.ts 중복 메시지 강화(same active ingredient→double-dosing, severity caution·0mg 불변). (2) agent.ts 프롬프트: generic 성분명=named product + 병용/같은약 질문은 반드시 도구 경유(기억판정 금지) + 카드-산문 톤 정합. → 성분명만 입력해도 결정론 카드가 뜸(무카드 갭 해소). generic 5문항 live 5/5 정확(danger/caution/ok). findings 2026-07-10.
- (구) 무엇: generic 성분명이 실제 제품과 같은 성분 중복일 때 산문("No")과 카드(caution) 톤 불일치 + 모델이 도구 우회로 무카드.
> 발견: 2026-07-09 probe. `"Can I take acetaminophen with Tylenol Extra Strength?"` → 산문은 강하게 **"No — same drug, double-dosing"**, 그러나 verdict=**caution**(B-8대로 generic은 0 mg 기여 → 합계 3,000 유지 → 초과 아님 → duplication만).
- **무엇**: generic 성분명이 실제 제품과 **같은 성분 중복**일 때, 용량 미상이라 0 mg → 경계 아래면 caution. 산문("절대 No")과 카드(caution)의 톤 불일치.
- **고려**: APAP처럼 **좁은 치료역 성분의 명시적 중복**은 amount 미상이어도 최소 등급을 올릴지(예: "known-duplication" 신호). 단, 0 mg 원칙(없는 값 날조 금지, B-8)과 충돌하지 않게 — 등급만 올리고 숫자는 미표기가 관건.
- **왜 P2**: 위음성 아님(산문 정확). 데모 무해. B-10(claim verifier 정밀화)과 함께 검토.

## B-15. LLM 추론 제품에 verdict 부여 — verdict provenance `[✅ DONE 2026-07-09 — D34]`
> **해결됨**: 검사기 게이트(`userNamedProducts`)로 사용자 미명명 제품은 verdict에서 제외 → 추론 조합에 판정 안 남. 110콜 transcript 리플레이 검증(`evals/validate-provenance.ts`): 정당한 유저-명명 브랜드 오탈락 0, 추론 제품(#1·63·65·8)만 드롭. 라이브 스모크 확인(#1 열린질문→verdict none). [[B-12]]와 동일 D34 결정으로 함께 해소.
> 발견: 2026-07-09 rough probe(카탈로그 비의존 러프 질문 10건). 사용자가 **제품을 하나도 안 댔는데** 시스템이 조합을 스스로 골라 결정론 verdict를 ground-truth 카드로 냄. **이번 세션 두 배치(정형 10 + 러프 10) 중 뉴로심볼릭 핵심 약속에 가장 직접 닿는 발견.**
> 배경 개념: [[neuro-symbolic-promise]] — "판정·숫자는 LLM이 아니라 FDA 데이터 위 결정론 코드만 낸다. 그래서 verdict는 지어낸 게 아니라 재현 가능한 사실"이라는 제품의 논지. 이 약속엔 **숨은 전제**가 있다: *판정 대상 제품이 사용자가 실제로 말한 것*.

### 증상 (Symptom)
- **#1** `"i feel like crap, stuffy nose and a pounding headache, what do i take"` — **제품 언급 0개.** 그런데 productsChecked=**[DayQuil, Tylenol Extra Strength]**, verdict=**danger**. 산문: "you should NOT take DayQuil and Tylenol Extra Strength together... the natural pair people reach for here."
- **#8** `"hangover cure that wont wreck my liver?"` — productsChecked=[Tylenol ES, Advil, **Alka-Seltzer**]. Alka-Seltzer는 카탈로그에 없어 unmatched, 나머지는 verify()됨 → verdict=**ok**. 사용자는 이 셋 중 무엇도 안 댔음.
- transcript: `evals/transcripts/probe-2026-07-09T05-45-22-348Z.md` #1·#8.

### 원인 (Root cause)
1. **도구 호출 게이트 부재**: 파이프라인(agent.ts)에서 LLM이 `check_otc_safety`에 넘길 제품명을 **자유롭게 결정**. "사용자 입력에서 나온 제품만 넘겨라"는 제약이 없음 → 열린 추천 질문에서 LLM이 "사람들이 흔히 집는 조합"을 **추론해서** 도구에 투입.
2. **verdict 출처 미구분**: `VerifyResult`는 제품이 사용자 입력인지 LLM 추론인지 구분 필드가 없음. UI verdict 카드도 둘을 동일 권위로 렌더.
3. verify() 자체는 무결(산술 정확) — 문제는 **"무엇을 계산할지"를 뉴로(LLM)가 지어낸 것**. 심볼릭은 정직한데 심볼릭에 들어간 입력의 출처가 사용자가 아님.

### 결과 (Effect / Impact)
- **핵심 약속 훼손**: "verdict = 네가 물은 것에 대한 FDA 사실"의 전제(사용자가 말한 제품)가 깨짐. 결과적으로 **사용자가 언급조차 안 한 조합에 red DANGER 카드**가 권위 있게 뜸.
- **데모/심사 재현성 높음**: 소비자·심사위원이 제품 없이 증상만 묻는 건 **가장 흔한 입력 패턴**(rough 배치 6/10이 제품 미언급). 심사 중 "감기인데 뭐 먹지?" 한 번이면 재현.
- **심사기준 영향**: Claude Use 25·Depth 20에 양날 — 잘 프레이밍하면 "능동적 안전 경고"로 강점, 방치하면 "verdict 신뢰성" 지적 포인트. Impact 25도 오해 소지로 감점 가능.
- **위음성 아님**: 산문은 "흔히 집는 조합"이라 맥락을 밝혀 안전 방향은 유지. 문제는 **verdict 카드의 provenance(출처 투명성)**이지 안전 누락이 아님. → P1(신뢰)이나 데모 치명은 아님.
- **관찰 근거**: 같은 배치에서 소아·임부·Rx·음주는 verdict=none+escalate로 **정확히 유보**했음 → 시스템이 "판정 못 할 땐 none"을 낼 능력은 있음. 즉 추론 조합에도 none/억제를 적용하는 건 기존 메커니즘 재사용으로 가능.

### 해결안 (Fix) — [[B-12]] 결정에 종속
> 선결: B-12에서 OnLabel이 **"검사기(checker)"인가 "추천기(recommender)"인가**를 DECISIONS로 확정해야 함. 그 결정에 따라 아래 분기:

- **(A) 검사기로 확정 시** — 도구 호출 게이트 추가: 사용자 입력에서 **명시적으로 식별된 제품에만** verify() 적용. 제품 0개면 verdict 생략하고 "어떤 제품인지 알려달라" 되물음(이미 #4·#5에서 하는 동작). = 가장 깔끔, 약속 원형 보존.
- **(B) 추천기 허용 시** — verdict에 **provenance 필드**(`source: "user" | "inferred"`) 추가 + UI 카드에 배지: "You didn't name products — we checked a common pair (DayQuil + Tylenol)." 추론 조합의 verdict는 **등급을 억제(none/info)** 하고 경고는 산문으로만.
- **(C) 최소안** — 프롬프트에 "추론한 제품으로 도구를 호출하지 말고, 사용자가 명시한 제품만 넘겨라. 제품이 없으면 되물어라" 명시. 코드 변경 없이 프롬프트 울타리만.
- **권장**: 데모 신뢰 최우선이면 **(A 또는 C)**. "능동 경고"를 데모 셀링포인트로 살리려면 **(B)** — 단 provenance 배지가 필수.
- **범위**: `src/lib/onlabel/agent.ts`(도구 호출 게이트/프롬프트) + `VerifyResult`/verdict 카드(provenance). **결정론 verify() 코어는 불변.** LLM 판정 미개입.
- **검증 기준**: 제품 미언급 질문(#1 류)에서 verdict가 (A)없음/(B)provenance 배지 동반. 명시 제품 질문은 기존과 동일. 소아/임부 escalate 회귀 없음.
- **90콜 추가 근거(2026-07-09)**: 열린 추천에서 추론 조합 반복 재현 — #63 `"fever and chills"`→checked [Tylenol, Advil], #65 `"allergies and runny nose"`→checked [Zyrtec, **Claritin**(카탈로그 없음)]. 사용자 미언급 제품으로 verdict/검사 발동 패턴 확정.

## B-16. red-flag 데이터 레이어 (정식 인구집단·기저질환 판정) `[P2 데이터]`
> B-13의 후속(D35). 현재는 red-flag를 **감지→유보**만 함. 정식 판정을 하려면 권위 소스 기반 결정론 데이터가 필요(LLM 추측 금지, D22 원칙).
- **무엇**: (1) **임부/수유** 성분 안전등급 — 후보 소스: FDA PLLR 라벨, LactMed(NLM, 무료), MotherToBaby. (2) **소아** 체중당 용량 — FDA 모노그래프 소아 표(M013/M012, refs/ 로컬 일부 확보) + Drug Facts. (3) **기저질환 금기/주의** — 간(APAP 감량)·신장/궤양(NSAID 회피)·고혈압(decongestant 회피): FDA 라벨 warnings 섹션에서 결정론 추출.
- **왜 P2**: 배지 억제(B-13)로 오해 리스크는 이미 차단됨. 정식 판정은 스코프 확장이라 데모 후. 착수 시 좁게(스코프 내 ~9성분).
- **정밀화 겸사**: B-13의 광의 cue 매칭(`liver`/`heart` 등) 오탐(예: "protect my liver")을 이때 문맥 구분으로 정밀화.
- **선행**: 소스 신뢰성 검증 + 약사 서명(verify:false). B-4/B-6와 동일 추출 규율.

## B-17. 이성질체/동일분자 교차중복 미검출 (cross-duplication) `[✅ DONE 2026-07-10 — D38]`
> 발견: 2026-07-09 제품 확장. `verify(["Xyzal","Zyrtec"])` = **ok** — levocetirizine(Xyzal)와 cetirizine(Zyrtec)은 **다른 ingredient key**라 중복 판정을 안 하지만, levocetirizine은 **cetirizine의 활성 거울상 이성질체**라 동시복용 = 사실상 같은 약 이중.
- **무엇**: verify()의 duplication은 동일 key만 매칭 + 비진정 항히스타민엔 클래스 규칙 없음 → levo/cetirizine, (유사) dexbrompheniramine/brompheniramine 등 **이성질체·동일약리 쌍**을 놓침.
- **왜 P1(안전)**: 위음성 방향(초록 ok가 실제 이중을 은폐). 단 소비자가 두 브랜드 다 살 확률은 낮아 데모 치명은 아님.
- **결정 필요(약사)**: (a) 이성질체 쌍을 "동일 약리군 그룹키"로 묶어 그룹 중복 경고(levocetirizine↔cetirizine 등), (b) 비진정 항히스타민 클래스 규칙 추가(caution). 둘 다 결정론, 그룹 매핑 데이터 필요.
- **범위**: verify.ts에 ingredient `dupGroup` 필드 or 이성질체 매핑 + duplication 로직에서 그룹 단위 비교. LLM 미개입.

## B-18. openFDA SKU 정밀화 잔여 (Fix 3/4/5) `[P2 데이터]`
> 제품 확장 시 fda-add가 아직 정확히 못 잡는 SKU/제형. 결정론 추출 개선분.
- **Fix 3 SKU**: (a)콤보팩 거부(성분 개수>기대면 제외 — DayQuil+NyQuil HBP팩·Robitussin value pack), (b)액상 타겟은 액상 우선(childrens-tylenol이 8HR 캐플릿 매칭), (c)advil-allergy-sinus 실제=ibuprofen+chlorpheniramine+**pseudoephedrine**(spec 수정), (d)claritin-d 12hr/24hr 결정론 선택.
- **Fix 4 결정(chlor-trimeton)**: Chlor-Trimeton 브랜드 openFDA 부재(자사 "Aller-chlor"만). (a)모노그래프 동등 제네릭 허용(chlorpheniramine 4mg 표준) or (b)defer. 함량은 grounding됨.
- **🔴 Fix 5 새 제형(액상 per-mL)**: dimetapp·robitussin 등 액상은 "in each 5 mL"/"2 tsp(10 mL)" → `mgPerDose = strength × doseVol/labelVol`. verify() 모델에 dose-volume 개념 소폭 확장 필요. = "새 제형 추가"의 본체, 미완.

## B-19. 약어/미인식 modifier 오해소 (P0) `[✅ DONE 2026-07-10]`
"Tylenol ES"→Tylenol PM 오해소로 danger→caution 다운그레이드(위험 은폐). 수정: STRENGTH_ALIAS(es/xs→extra) + noise residual→family default(PRODUCT_VOCAB). verify.ts. 회귀테스트 3. 상세: findings 2026-07-10.

## B-20. 제품 중복 이중계산 false danger (P1) `[✅ DONE 2026-07-10]`
verify(["Advil","Advil"])가 원장 이중합산→false danger. 수정: matched를 product.id로 dedup. 서로 다른 제품 합산·generic 0mg(B-8)은 유지. 회귀테스트 1.

## B-21. fuzzyLookup 임계값 부재 (P2) `[✅ DONE 2026-07-10]`
일반문구("cold and flu")·긴 alias 브랜드("Advil / Motrin IB")서 오매칭. 수정: alias 변형 스코어링 + unmatched 페널티 + generic-only 거부(distinctiveOverlap≥1). 회귀테스트 2.

## B-22. API 입력 길이 상한 (P2) `[✅ DONE 2026-07-10]`
/api/check·/stream·/contrast에 question≤2000자(+products≤20) 가드 추가(비용·지연 방어).

## B-23. ingredient-identity false VERIFIED (P1 신뢰 — 대조엔진) `[✅ DONE 2026-07-10]`
verifyClaims의 ingredient-identity가 claim.product를 안 쓰고 "아무 매칭 제품에 있으면", 없어도 "recognized"로 무조건 VERIFIED → "DayQuil contains ibuprofen"(거짓)도 VERIFIED(오정보 인증). 수정: claim.product를 카탈로그 제품으로 해소해 그 제품에 성분 있으면 VERIFIED, 없으면 CONTRADICTED. product 미지정 시만 "recognized" 완화. 회귀테스트 2.

## B-24. 비-success agent result 침묵 (P1 견고성) `[✅ DONE 2026-07-10]`
result subtype≠success(max_turns·execution error)에서 runOnLabel이 answer=""(빈 답변), streamOnLabel은 done/error 없이 조용히 닫힘(error 이벤트 타입은 정의됐으나 미방출). 수정: runOnLabel throw(라우트 500), streamOnLabel error 이벤트 방출.

## B-25. done productsChecked 불일치 (P2) `[✅ DONE 2026-07-10]`
verdict는 1차 tool 호출 제품으로 스냅되나 done은 전체 productSet 사용. 수정: verdict 스냅 시점 productsChecked 기록해 done에서 재사용(snappedProductsChecked).

## B-26. daysOf 하이픈 미인식 (P2) `[✅ DONE 2026-07-10]`
"10-day course"의 days 미추출. 수정: `\d+(?=\s*-?\s*day)`로 하이픈/공백 허용.

## B-27. 스트림 무한로딩 방어 (P1 UX) `[✅ DONE 2026-07-10]`
비카탈로그/지체 입력("mycin")에서 스트림이 done 없이 멈추면 useOnLabelStream이 무한대기. 근본원인은 직접-API 리팩터(subprocess 제거)로 해소, 방어로 클라 30s 워치독 추가(무한로딩→에러). 상세: findings 2026-07-10.

## B-29. verdict 없는 답변이 브라우저에서 렌더 안 됨 (P0 데모치명) `[✅ DONE 2026-07-10]`
> 라이브에서 "Does DayQuil's decongestant actually work?" 무한로딩 신고로 발견. 서버는 200/prose+done 정상인데 UI가 스켈레톤에 영영 갇힘.
- **근본원인**: `OnLabelApp.tsx` 렌더 삼항이 `state.verification ? <AnswerView> : <PendingVerdict>`. verification이 null이면 **status·prose 무관하게 항상 PendingVerdict(스켈레톤)**. verdict가 안 나오는 답변(efficacy·교육·열린질문·**D35 red-flag ok억제**)은 verification이 끝까지 null → prose와 done이 다 와도 스켈레톤 고정 = "무한로딩".
- **범위(넓음)**: efficacy(phenylephrine D9) + open recommendation(D34) + education + **red-flag escalation(D35, 간질환+Tylenol 등 — 데모 강점인데 브라우저에서 안 보였음)**. 판정 있는 답변만 렌더됐음.
- **왜 여태 안 잡혔나**: 서버측 eval/collect는 SSE를 직접 읽어 prose가 정상으로 보임. React 렌더는 미검증 → 갭. (교훈: 브라우저 렌더 스모크 필요.)
- **수정**: null 분기를 `NoVerdictAnswer`로 교체 — prose 있으면 prose-only 답변 렌더(verdict 카드 없이), prose 없고 streaming 중일 때만 스켈레톤, done인데 prose 없으면 fallback. verify() 코어·AnswerView(판정 경로) 불변. playwright로 efficacy 답변 렌더 시각검증. typecheck·build 그린.
- **잔여(후속)**: verdict 없는 답변은 서버가 prose를 버퍼링해 생성 완료 후 한꺼번에 표시(로컬 ~2.6s, 프로덕션 콜드스타트 시 더 김) → 진행 표시 없는 스켈레톤 구간. progressive 스트리밍은 B-30.

## B-30. verdict 없는 답변 progressive 스트리밍 `[✅ DONE 2026-07-10]`
> **해결**: streamOnLabel turn-0 prose 버퍼링 제거→라이브 yield(verdict 카드는 별도 슬롯 스냅이라 공존). preamble-then-tool 부작용은 anti-preamble 프롬프트 강화("도구 호출 전 무텍스트")로 turn-0 비워 verdict-first 복원. live 확인: efficacy 토큰 firstTok 0.69s/spread 2.0s(이전 일괄 ~2.6s), danger 이벤트순서 verification 첫 이벤트. findings 2026-07-10.

## B-28. 대조엔진 직접 API 전환 (P2 속도, 후속) `[IDEA]`
/api/contrast(claimPipeline·verifyLanguage)는 아직 query()(SDK subprocess) 사용 — opt-in이라 데모 필수경로 아님. 메인경로와 동일하게 Messages API 직접 루프로 전환하면 대조엔진도 빨라지고 SDK 의존 완전 제거 가능. 후속.

## B-31. same-drug 다른 브랜드 dedup 갭 (Advil+Motrin) `[✅ DONE 2026-07-10]`
> 180문항 프로브서 발견: verify(["Advil","Motrin"])=ok인데 둘 다 ibuprofen(산문은 "No"). 원인=`advil` 브랜드가 "Advil / Motrin IB"로 Motrin alias 중복소유→bare "Motrin"이 tie-break로 advil 흡수(별도 motrin-ib SKU 존재). 수정=advil 브랜드→"Advil"(데이터 1줄), Motrin→motrin-ib 고유해소→2 ibuprofen=danger. 코어 dedup(B-20) 불변, golden 무영향, 회귀테스트 신규. findings 2026-07-10.

## B-32. 반복 generic 성분명 caution 카드 (LLM 추출 한계) `[P3 잔여]`
> "dextromethorphan and dextromethorphan"/"took X, add X"에서 모델이 동일문자열 2회 전달을 거부→products 1개→카드 ok(caution 아님). 프롬프트+few-shot로도 미해소(LLM 완강). 산문은 정확히 "same drug, don't double up" 경고=안전 커버. 리터럴 "X and X"는 합성 엣지(실사용 아님), "took X" 케이스는 이미복용량=verify 스코프밖이라 ok 정당. 근본해결은 결정론 검출(질문서 반복성분 파싱→verify에 중복주입) 필요, 저가치. 후속.
