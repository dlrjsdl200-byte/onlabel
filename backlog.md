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
