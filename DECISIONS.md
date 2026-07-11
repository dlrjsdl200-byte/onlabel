# OnLabel — Decisions (append-only 결정 로그)

> 아키텍처·범위·도메인 결정을 날짜와 함께 append. **기록된 결정은 사용자 확인 없이 뒤집지 않는다.**

---

## 2026-07-08 — 프로젝트 정의

- **D1. 트랙/팀**: Builder 트랙, 솔로. (Researcher 아님 → Claude Science/맥북 불필요)
- **D2. 아이디어**: 미국 소비자용 **자가검증 OTC 약물안전 어시스턴트**. 일반 LLM이 놓치는 성분중복·과용량을 FDA 데이터로 반박.
- **D3. 이름**: **OnLabel** (off-label의 반대, 검증 근거가 FDA 라벨).
- **D4. 범위**: US OTC 진통·감기약, **성분중복 + 용량**에 한정. 핵심 위험 = acetaminophen 중복(미국 급성간부전 1위).
- **D5. 검증 방식**: Claude가 claim추출·grounding, **판정은 결정론적 코드+FDA데이터**(LLM 판정 아님). generator→verifier(critic) 패턴.
- **D6. 포지셔닝**: OpenEvidence의 *형태*(인용 grounding+대화형 UI)만 차용, 대상(소비자)·영역(OTC)·검증(결정론)은 차별화. 클론 금지.
- **D7. 스택**: Next.js + **Claude Agent SDK** + Vercel. **Skills 코어**(약사 전문성), Verifier 서브에이전트. **MCP는 스트레치**(오픈 기여+2차 클라이언트 실증, 코어 배관 아님).
- **D8. APAP 경고 임계 = 4,000 mg/24h** (FDA 라벨=권위 출처). 3000 보수모드는 backlog B-2.
- **D9. Phenylephrine = 효능 경고 + FDA 레퍼런스** (위험 아님, "FDA가 효과 없다 판정"). 근거 2023 NDAC 16-0 / 2024-11 제거제안.
- **D10. Rx(처방)약 상호작용 = 데모 제외** → backlog B-1. red-flag "처방약 복용 시 약사 상담" 소프트 게이트만 유지.
- **D11. 제품 카탈로그 = 미국 top브랜드 리밸런싱** (코어 15 ⭐). 회사: Kenvue/Haleon/Bayer/P&G/Reckitt.

## 2026-07-09 — Day 3 UI

- **D12. UI 방향**: 레이아웃=**답변 엔진형**(OpenEvidence 스타일, 판정이 주인공) · 무드=**클리니컬-클린**(Linear/Stripe 톤) · **일반 AI vs OnLabel 대조 장치 명시**(단, 가짜 인용 금지 — illustrative하게).
- **D13. 시그니처 인터랙션 = "판정 먼저, 설명 나중"**: 결정론적 판정 카드/원장 즉시 렌더 → 산문 SSE 스트리밍. Demo 30%의 핵심.
- **D14. 컴포넌트 = shadcn/ui** (Tailwind 4), 폰트 Geist, 스트리밍 `POST /api/check/stream`(SSE). 상세: docs/UI-SPEC.md.

## 2026-07-09 — AI Architecture v2 (문헌 기반 심화)

- **D15. 뉴로심볼릭 원칙(하드)**: LLM은 **안전 판정을 절대 안 내림.** 판정=결정론 코드(인간검증 KB). LLM은 언어(파싱/설명)와 주장 대조만. 근거: 뉴로심볼릭 임상 AI, Self-Correction Illusion. 상세 docs/AI-ARCHITECTURE.md.
- **D16. CoVe claim 파이프라인 채택**: 초안→주장 분해→독립 verifier 서브에이전트→reconciler(결정론 판정 override). 자기교정 아닌 독립 검증.
- **D17. 심화 범위 L1~L4 + eval-first**: eval 하네스(L2) 먼저 baseline → claim 파이프라인(L1) → openFDA sync(L3) → 스킬 서브에이전트(L4) → 그 다음 UI. UI 스펙은 claim 배지 반영 필요.
- **D18. openFDA는 빌드타임 sync(런타임 아님)**: 판정 핫패스는 항상 로컬 KB(인메모리·즉시, 네트워크 0). openFDA는 `npm run sync:fda`로 KB를 오프라인 채움·검증. 라이브 fallback은 KB-미스에만·캐시·핫패스 밖(선택/backlog). 근거: 런타임 지연·API장애 회피 + "판정 먼저 즉시" UX 보호 + 뉴로심볼릭(런타임 결정론) 원칙 부합.

## 2026-07-08 — Day 3 데이터/UI 정밀화

- **D19. 성분 원장에 용법 명시(dosing basis)**: 원장 "Found in" 열에 각 제품의 `unitsPerDose × dosesPerDay = mg/day`를 표시(예: "2 caplets × 3/day = 3,000 mg"). 이유: combined 합계(예: 5,600)를 사용자가 눈으로 검산 → "숫자로 반박"의 투명성·신뢰 완성. `unitsPerDose` 필드를 products.json에 추가, verify()의 IngredientContribution 확장(계산 로직 maxDailyMg는 불변, 표시용 필드만 additive).
- **D20. 카탈로그는 명명된 단일 SKU에 고정**: 다수 OTC 브랜드가 강도별 다중 SKU(예: Benadryl 25mg/50mg, Mucinex 600/1200mg). 판정 일일상한은 SKU 무관하게 동일하나 "몇 알" 표시는 SKU마다 다름. → **강도가 모호한 브랜드는 브랜드명에 강도를 못박음**(Benadryl→"Benadryl Allergy (25 mg)", Mucinex DM→"Mucinex DM (600 mg)", Mucinex→"Mucinex (600 mg)"). 가장 흔한/표준 SKU 기준, source에 다른 SKU 존재를 주석. 사용자 강도 선택 UI는 backlog B-5.

- **D21. 강도 변이(Type B) 처리 = 안 1 채택 (구현은 SSE 배선 이후)**: 같은 성분 다른 강도(Tylenol 325/500/650, Benadryl 25/50 등)는 **강도별 별도 항목 + 브랜드당 default SKU 지정 + 가정 명시(surfaced assumption)**로 처리. bare "Tylenol"→default(Extra Strength 500mg)로 결정론 해소하되 UI에 "assumed strength, tap to change" 노출. Type A(성분 구성 다름: Tylenol PM/Cold+Flu)는 지금처럼 별도 항목 유지. `lookupProduct` 수정 필요(default 우선 + 가정 신호). **착수 순서: UI SSE 배선 먼저 → 그다음 이 강도 정밀화.** 상세 backlog B-5.
- **D22. FDA 모노그래프 상한 검증 완료(B-4)**: refs/M013·M012 PDF를 pdftotext+grep 결정론 추출, 약사 확인. 5개 성분(aspirin 4000·pseudoephedrine 240·phenylephrine 60·doxylamine 75·caffeine 부재/null) 전부 기존 KB값과 일치 → `verify:true→false` 승격, source에 모노그래프 조항 인용. LLM 미개입.

## 2026-07-08 — AI Architecture v2.1 (파이프라인 전수 감사)

> 감사 방법·근거는 findings.md 2026-07-08 감사 섹션, 상세 교정은 docs/AI-ARCHITECTURE.md §9.

- **D23. 불변 결정 규칙 (파이프라인 조준)**: **CoVe·독립 verifier의 가치 = generator의 환각 자유도에 비례.** → 파이프라인은 환각이 실재하는 곳(**grounding 없는 초안 = 일반 LLM pass**)에 조준한다. 이미 차단된 곳(우리의 제약된·KB-override된 산문) 재확인은 부분 중복(theater). 근거: CoVe **factored 변형**이 joint를 이기는 유일 이유 = 검증이 초안에 conditioning 안 되는 독립성(arXiv:2309.11495). **이 규칙이 배선 결정을 연역적으로 고정 — 재논의 시 규칙부터 적용해 답이 안 흔들리게 한다.**
- **D24. [D] Verifier = 하이브리드 (뉴로심볼릭 끝까지 관철)**: [C]에서 claim을 kind로 분해하고 라우팅 — **dose/duplication/interaction 등 임상 숫자 claim은 LLM verifier에 절대 안 보냄 → verify() findings에 결정론 대조.** 언어/framing claim만 독립 LLM verifier 서브에이전트(격리 컨텍스트). 이유: D15 하드룰(LLM은 안전 판정 안 함)을 파이프라인 마지막까지 유지. **현 v2 설계("[D]가 모든 claim 검증")의 구멍 교정** — LLM이 용량 숫자를 판정하는 순간 원칙 위반.
- **D25. 전달 = 경로 분리**: **데모** = ship 전 gate로 무근거 초안을 grounded 교정본으로 시연(대조 엔진, D12) / **프로덕션** = 잔여 drift용 경량 degradable post-hoc net. 데모 코어(verdict-first 스냅 + SSE 스트리밍) 불변. reconciler[E]의 안전 판정 override는 이미 결정론이 수행하므로 [E]는 산문 교정만 담당.
- **D26. ✓ VERIFIED 배지 = FDA 추적성(tool receipts)**: 발화 안 하는 VERIFIED도 "모든 문장이 FDA로 추적됨" 투명성 아티팩트로 포지셔닝 — theater 아님. 근거: 2026 tool-receipts 실무 패턴(arXiv:2603.10060).

## 2026-07-08 — 접지 울타리 (dosing grounding)

> 근거: findings 2026-07-08 "다양한 질문형식 20개 probe". 데이터 작업: backlog B-6.

- **D27. 뉴로심볼릭 울타리 = 우리 역할 (사용자 확정)**: LLM은 답변 자체는 잘 하지만, **임상 숫자(용량·복용간격·한도)는 도구 결과에 접지된 것만 진술**하고, 접지 근거가 없으면 "라벨 확인 / 약사 상담"으로 **유보**한다. 기억에서 추측 금지. = D15("LLM은 안전 판정 안 함")의 실행 규칙을 **숫자 진술까지 확장**. 20개 probe에서 빈도·단일용량 답변이 접지 없이 LLM 기억에서 나온 것을 교정하기 위함. **구현 순서(우선순위)**:
  - **(D) 프롬프트 울타리 먼저** — 시스템 프롬프트에 "도구 결과에 없는 임상 숫자는 진술하지 말고 유보하라" 명문화. 즉시·저비용, 데이터 없어도 정직해짐.
  - **(A) 접지 표면 확대** — `runSafetyCheck`가 매칭된 제품의 KB 용량을 **ok 제품 포함 전부** 노출(mgPerDose·unitsPerDose·maxDosesPerDay·limit). 단일용량/사실 질문이 접지됨.
  - **(B) 데이터 보강** — KB에 복용 간격 등 "복용법" 추가(backlog B-6). 그래야 간격 질문도 유보가 아닌 접지 답변 가능.
  - **(C) 누적/과빈도 UX** — "우린 라벨 최대치만 검사, 이미 먹은 양은 아님" 캐비엇 + OK 카드가 경고 산문과 모순되지 않도록 톤 조정.
- **D28. "복용법(dosing schedule)" 데이터는 스코프 확장이 아니라 용량 레이어 완성으로 간주**: 기존 KB에 성분·1회용량·일일최대·일일횟수는 이미 있음(=대부분 구축됨). 빠진 건 **복용 간격·1회 최대·복용법**뿐. 이는 새 범위가 아니라 "용량" 축(D4 확정 범위)의 미완성 필드를 **같은 권위 출처(FDA 모노그래프, 이미 refs/ 로컬)에서 결정론 추출**로 채우는 것. LLM 추출 금지(D22 원칙). 착수는 B-6, D→A 이후.

## 2026-07-08 — 접지 울타리 확정 (2차 probe 20개 증거)

> 근거: findings 2026-07-08 "2차 probe 20개", transcript eval-2026-07-08T09-15-56-982Z.md. D27을 증거로 확정·정련.

- **D29. 개선방향 순서 확정 = D→A→C→B (D27의 D→A→B→C에서 C/B 교체)**: 2차 probe가 tool.ts:30-46를 코드로 확증 — ok 제품엔 용량 데이터를 일절 안 넘겨 답변의 모든 임상 숫자가 비접지(LLM 기억)였고, 판정 카드=ok인데 산문="먹지 마세요" 모순이 데모에서 즉시 보이는 리스크로 드러남. 따라서:
  - **(D) 프롬프트 울타리 — 최우선**: 도구 결과에 없는 임상 숫자(간격·기간·1회최대 등)는 진술 금지, "라벨/약사"로 유보. 실증: `onset-advil`은 유보했으나 `onset-aleve`는 "8-12h"를 기억으로 진술 — 울타리 미강제로 행동이 동전던지기. 강제하면 일관됨. 저비용·즉시.
  - **(A) 접지 표면 확대**: `runSafetyCheck`가 ok 제품 포함 KB 용량(mgPerDose·unitsPerDose·maxDosesPerDay·maxDailyMg)을 전부 노출. 이미 KB에 있는 데이터라 신규 0. D의 유보를 "접지된 답변"으로 승격.
  - **(C) 판정↔산문 모순 해소 + 수량 캐비엇 (B 앞으로 당김)**: verify()는 제품 단위라 "2알씩 4시간마다" 같은 수량/비카탈로그(술·커피)에 맹목 → ok 카드+경고 산문 모순 발생. (1)산문이 escalate하면 카드 톤/배지 조정, (2)"제품 조합·라벨 최대치만 검사, 복용 수량·기왕 섭취량은 미반영" 캐비엇 명시. 프롬프트/UX 튜닝이라 저비용, 데모 가시 리스크라 B보다 우선.
  - **(B) 복용법 데이터 레이어 — 데이터 투자 (backlog B-6)**: KB에 `{intervalHours, maxDurationDays, singleDoseMaxMg, form/ER}` 추가, M012/M013(refs/ 로컬)에서 결정론 추출. 간격·기간·제형 질문을 유보가 아닌 접지 답변으로. LLM 추출 금지(D22).
- **D30. DB 구축 판정(사용자 질문 확정 답변)**: "성분·복용량·복용법 DB 구축?" → **성분+복용량 DB는 이미 존재**(KB의 mgPerDose/maxDailyMg/maxDosesPerDay/unitsPerDose), 도구가 안 넘길 뿐 → **A로 노출**이 답이지 재구축 아님. 유일하게 진짜 빠진 건 **복용법(간격·기간·1회최대·제형) 유계 레이어**(~9성분/~18제품, B-6). = 새 범위 아니라 용량 축 완성(D28 재확인). 새 대형 DB 구축 불필요.

## 2026-07-08 — Generic 성분명 + NSAID 교체간격 스코프

- **D31. NSAID↔NSAID '교체 간격'은 스코프아웃(근거부재)**: ibuprofen↔naproxen 등 서로 다른 NSAID 사이의 "몇 시간 후 교체 가능" 간격은 **미국 공신력 소스(FDA·DailyMed·MedlinePlus)에 존재하지 않음** — 이들은 "병용 회피(avoid concomitant use)"만 권고. 따라서 OnLabel은 교체 간격을 **생성하지 않고**, verify()의 danger("함께 복용 말 것") + 간격 유보를 유지한다(D27 울타리와 부합). 데이터 갭 아님 = 영구 스코프 경계. 개별 성분 간격(ibuprofen q4-6h·naproxen q8-12h)은 OTC Drug Facts 라벨에서 접지 가능(B-7). 근거: 사용자(약사) 확인 2026-07-08.
- **D32. Generic 성분명은 원장에 0mg로 참여(B-8)**: 사용자가 브랜드 대신 성분명("acetaminophen","ibuprofen")을 입력하면 resolver가 성분으로 인식해 **중복·클래스 탐지에 참여**시키되, 용량 미상이므로 **0mg 기여**(누적합에 미반영). 이유: `acetaminophen+Tylenol`이 ok로 빠지는 위음성(초록 OK가 실제 이중복용 은폐) 차단 + 임상 숫자 미조작(D15/D22 준수). 중복은 caution, 미상 용량으로 danger 단정은 안 함.

## 2026-07-08 — FDA 인용 receipts UI

- **D33. 출처 인용 = 발췌+공개 FDA URL(로컬 PDF 경로 기각)**: 답변 근거를 클릭 검증 가능하게 노출. Sources 칩 중 모노그래프 접지 성분은 클릭 시 팝오버(§섹션 + 원문 verbatim 발췌 + 공개 FDA PDF 링크). 사용자 초안(로컬 PDF 파일 경로)은 refs/가 gitignore·미배포이고 절대경로가 로컬 전용이라 배포에서 무효 → **발췌문구 + 공개 FDA URL**로 대체(사용자 확정). 범위=Sources 칩(본문 인라인 각주는 B-9 스트레치, LLM 인용 날조 위험 때문에 신중). 발췌는 refs 결정론 추출 검증본, URL은 B-4 확인된 M012/M013만(날조 금지, D26 tool-receipts 강화).

## 2026-07-09 — 포지셔닝 확정: 검사기(Checker) + red-flag 유보 (110콜 probe 증거)

> 근거: findings 2026-07-09 probe 3배치(정형10·러프10·90콜). backlog B-12/B-13/B-15. 사용자(약사) 확정.

- **D34. OnLabel은 "검사기(Checker)"다, "추천기(Recommender)"가 아니다 (B-12 확정)**: verdict는 **사용자가 명시적으로 이름 댄 제품에만** 나온다. 열린 질문("감기인데 뭐 먹지?")엔 일반 교육 + "무엇을 드시는지 알려달라" 되물음으로 돕되 **verdict 카드는 안 띄운다**. 근거: (1)정체성이 "자가검증"(D4)이라 정의상 사용자가 가진 걸 검증하는 것, (2)LLM이 "흔히 집는 조합"을 추론해 도구에 넘기면 verify()가 **사용자가 안 댄 제품에 판정**을 내려(neuro-symbolic-promise의 숨은 전제 위반, B-15) 심사에서 "verdict=FDA 사실" 주장이 흔들림, (3)특정약 추천은 의료 안전차선 이탈. 구현: 결정론 provenance 게이트(질문에 등장한 제품만 verdict에 참여) + 프롬프트 울타리("명시 제품만 검사, 없으면 되물어라"). verify() 코어 불변, LLM 판정 미개입.
- **D35. red-flag 맥락(소아·임부·수유·고령·기저질환)은 지금은 유보(defer), 데이터 레이어는 후속 (B-13 확정)**: 90콜에서 "간질환+Tylenol → 초록 OK 배지"(제품 단독은 성인 라벨 내)가 스케일로 드러남. verify()는 제품명만 보고 맥락 위험을 못 봄. **결정: red-flag cue를 결정론 감지 시 verdict 배지를 억제하고 산문은 약사/의사로 유보한다(지금).** 초록 OK 배지가 red-flag 맥락에서 뜨는 것을 차단하는 게 목적(위음성은 아니나 스크린샷 오해 리스크). **정식 red-flag 판정(임부 카테고리·소아 체중용량·기저질환 금기)은 권위 소스 확보 후 별도 기능으로 추가** — 후보 소스 조사 필요(backlog). LLM 추측 판정 금지(D15/D27 유지). = "모르면 유보"가 안전차선.

- **D36. 브랜드가 openFDA에 부재하면 제네릭-동등 단일성분 SPL로 접지해 추가 (B-18 Fix 4, chlor-trimeton 확정)**: Chlor-Trimeton 브랜드는 openFDA OTC에 **자체 라벨이 없다**(exact `brand_name.exact:"CHLOR-TRIMETON"` = 0건, 2026-07-10 확인). 그러나 성분은 chlorpheniramine maleate 4 mg 단일성분으로 **모노그래프 표준**이고, openFDA에 동일 조성 단일성분 SPL이 12개 존재(Aller-chlor 등). **결정: 조성을 제네릭-동등 SPL(Aller-chlor, set_id 04ca3806-…)의 라벨에서 결정론 추출해 추가하되, source 필드에 "브랜드 부재 → 제네릭-동등 SPL 접지"를 명시한다.** 근거: (1)숫자는 여전히 실제 openFDA 라벨에서 추출(타이핑 0, D22 유지), (2)4 mg/24 mg-day는 M012 표준이라 어느 SPL이든 동일값(독립 재확인: 6정×4 mg=24 mg = 기존 KB chlorpheniramine 한도와 일치), (3)source 공개로 정직성 유지(브랜드 라벨인 척 안 함). 일반 원칙: **브랜드 라벨 부재 + 단일성분 모노그래프 표준 조성이면 제네릭-동등 SPL 접지 허용**(defer 아님). 조합제(combo)나 비표준 조성엔 미적용. 근거: 사용자(약사) 확인 2026-07-10.

- **D37. 성분 상한(maxDailyMg)은 성분 독성 ceiling이지 제조사 복용스케줄이 아니다 + 진정 항히스타민 ceiling = 항히스타민 용도 최대 (2026-07-10 전수조사 확정)**: (1) `maxDailyMg`는 라벨 overdose warning의 mg 상한("not to exceed N mg/24h") 또는 FDA 모노그래프값이지, "6정/24h" 같은 **제조사 복용 스케줄(정 개수)이 아니다** — 둘은 다를 수 있음(Tylenol ES: 복용지시 6정=3,000 vs 경고문 4,000, 한 라벨에 공존; 우리 값 4,000 정답). (2) **진정 항히스타민(diphenhydramine·doxylamine·chlorpheniramine·brompheniramine)의 ceiling은 항히스타민 다회 용도 최대**로 잡는다, 수면보조(1일1회) 용량이 아니다. 예: diphenhydramine 300(=25mg×12, 라벨실측), doxylamine 75(=M012 §M012.12(h) 원문). 근거: 더 높은 항히스타민 최대를 써야 (a)위양성 danger 회피, (b)"ceiling ≥ 어떤 단일제품의 일일총량" 불변식 충족. 단일성분 제품이 대개 수면제라 이 값은 **모노그래프 근거**일 수 있음(라벨 재유도 불가 → audit에서 REVIEW). (3) **재발방지 3중 안전장치**: `npm run audit:ceilings`(라벨서 재유도 대조, 수면/항히스타민 분리) + `docs/EXTRACTION-RULES.md`(추출 하드룰) + `verify.test.ts` source-필수 불변식. 근거: 사용자(약사) 확인 2026-07-10, 원문 17/17 대조.

- **D38. 이성질체/활성대사체 동일약은 dupGroup으로 중복 판정 + 2세대 항히스타민 병용은 클래스 caution (B-17 확정, 2026-07-10)**: (1) **동일 활성분자(거울상이성질체·활성대사체)인데 ingredient key가 다른 쌍**은 `dupGroup` 필드로 묶어 동시복용 시 **duplication caution**(같은 약, 용량 가산). 확정 대상=**cetirizine↔levocetirizine**(FDA 라벨 원문 접지: "Levocetirizine dihydrochloride is the R enantiomer of cetirizine hydrochloride"). **전 16성분 전수조사로 카탈로그 내 동일약 쌍은 이 하나뿐** 확인(다른 성분 오그룹핑 위험 0). 미래 위험 쌍(desloratadine·dexchlorpheniramine·dexbrompheniramine)은 해당 이성질체 미보유라 지금 무관, dupGroup 프레임워크가 추가 시 자동 대응. (2) **서로 다른 2세대(비진정) 항히스타민 병용**(Zyrtec+Claritin 등)은 `CLASS_RULES`에 `antihistamine-nonsedating: caution` 추가("항히스타민 둘=이득 없이 부작용↑"). 근거: Xyzal+Zyrtec가 false-negative ok(위음성)로 이중복용 은폐하던 것을 차단. **결정론, verify() 코어에 dupGroup 그룹 중복 감지 추가, LLM 미개입.** 사용자(약사) 확인 2026-07-10. 잔여 정밀화(levo 5mg≈cet 10mg 등가 danger 승격)는 등가계수 접지 필요 → 후속.

<!-- 새 결정은 이 아래에 날짜 섹션으로 추가 -->

## 2026-07-11 (데모 범위 — 대조엔진 제거)

- **D39. 라이브 대조엔진(ContrastEngine)을 데모 UI에서 제거 — D33(센터피스)를 뒤집음 (2026-07-11, 사용자 확정)**: `/api/contrast`는 아직 SDK 서브프로세스라 **실측 51초**(메인 경로는 직접-API로 ~3s인데 contrast만 미이전, B-28). ContrastEngine엔 클라이언트 워치독도 없어 51초간 피드백 없이 스피너만 돌아 **사실상 무한로딩**으로 보임. **결정: 라이브 UI에서 ContrastEngine 버튼·컴포넌트를 제거한다.** 근거: (1)3분 데모 영상에서 51초 대기는 **Demo 점수(30, 최대 비중)를 오히려 훼손**, (2)논지("일반 AI는 틀리고 우리는 FDA로 반박")는 이미 빠른 코어(verdict-first + ingredient ledger + FDA citation, ~3s)가 증명 — 대조엔진은 어느 심사기준의 필수 축이 아니라 wow 보너스인데 현 상태는 wow가 아니라 리스크, (3)"항상 작동하는 데모 경로 유지"(범위 규율) 위반 상태. **파일·API 라우트는 존치**(ContrastEngine.tsx·ClaimBadge.tsx·/api/contrast — 복원 대비 dead code, ContrastStrip과 동일 방침). verify() 코어·다른 UI 불변. **재추가 조건**: /api/contrast를 직접-API로 이전(B-28)해 ~3s 달성 + 워치독 추가 시 복원 검토. cf. D33(대조엔진 도입)·B-28.
