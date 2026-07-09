# OnLabel — Backlog (데모 이후 고려)

> 해커톤 데모 범위에서 **의도적으로 제외**한 기능. 나중에 실제 제품으로 키울 때 재검토.
> 원칙: 지금은 "작동하는 좁은 데모"가 목표. 범위를 넓히면 완성 리스크 ↑.
> **심각도**: P0 블로커 / P1 중요 / P2 개선 / IDEA. (현재 항목은 전부 데모 후 = IDEA/P2)

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

## B-6. 복용법(dosing schedule) 데이터 레이어 `[P1]`
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

## B-8. Generic 성분명 해결 (중복 위음성 차단) `[P1 안전]`
- **무엇**: resolver가 "acetaminophen"/"ibuprofen"/"naproxen" 같은 **일반 성분명**을 제품으로 인식하도록. 현재 브랜드/id 토큰만 매칭 → `verify(["acetaminophen","Tylenol Extra Strength"])`가 ok(실제 danger, APAP 이중). 소비자 실검색은 일반명 다수(시장조사 #12·#16).
- **왜 P1(안전)**: 위음성 = 초록 OK가 실제 과용을 숨김 = 뉴로심볼릭 코어 신뢰 훼손. 데모에서 심사위원이 "acetaminophen + Tylenol" 쳐보면 드러남.
- **어떻게**: 입력이 ingredient displayName/aka에 매칭되면 **성분레벨 합성 기여**(대표 mgPerDose로)를 원장에 추가해 중복/누적 계산에 참여시킴. 제품 미매칭이어도 성분은 반영. 회귀 테스트: 위 2케이스 danger + 라벨↔산문 일치.
- **선행 없음**. verify.ts resolver + ledger 수정. 결정론, LLM 미개입.

## B-9. 인용 receipts 확장 `[P2]`
- **무엇**: (1) ibuprofen·naproxen·caffeine(M011)·2세대 항히스타민 인용 추가(B-7 소스 확보 후), (2) 본문 산문 인라인 각주(ChatGPT식 위첨자) — LLM이 문장별 인용 앵커 emit해야 해서 복잡+날조 위험, 신중히. (3) 팝오버 바깥클릭 닫기 등 UX 폴리시.
- **선행**: 현 citations.json은 M012/M013 9종. B-7(NSAID 소스)·M011 캡션 확보 시 확장.

## B-10. L1 claim verifier 정밀화 `[P2]`
- **무엇**: (1)dose-limit에서 "conservative target"(예 APAP 3,000 권장)과 "label ceiling"(4,000) 구분 — 현재 3,000을 4,000 위반으로 과엄격 CONTRADICTED. (2)[C]가 ingredient에 클래스명("NSAID")을 넣는 경우 처리(클래스 claim 종류 추가 or 무시). (3)single-dose에 naproxen "first dose 440 mg" 같은 라벨 규칙 반영 여부 결정.
- **왜 P2**: 데모 핵심(verdict·ceiling contradiction)은 이미 정확. 위는 엣지 정밀도.

## B-11. 제품 이름 해소 견고화 (resolution robustness) `[P1 안전]`
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

## B-12. 의도 분류 + 추천 포지셔닝 `[P2]`
> x100에서 발견된 스코프 뉘앙스(버그 아님, 정의 공백).
- **무엇**: (1) **비교 vs 조합 구분**: "Mucinex와 Mucinex DM 차이?"가 두 제품명 언급→도구가 둘 다 검사→중복 danger. 정보성 질문에 조합검사 발동(합리적이나 fact 질문엔 과함). (2) **열린 추천 포지셔닝**: 제품 없이 "열/두통에 뭐 먹지?"→시스템이 Tylenol/Advil 일반추천. OnLabel=검사기 vs 추천기 미결. → DECISIONS로 스코프 확정(안전차선=묻기/유보 권장 vs 도움=일반옵션).
- **왜 P2**: 데모엔 무해(둘 다 안전한 답). 정의만 명확히.
