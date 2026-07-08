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

<!-- 새 결정은 이 아래에 날짜 섹션으로 추가 -->
