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
- **D17. 심화 범위 L1~L4 + eval-first**: eval 하네스(L2) 먼저 baseline → claim 파이프라인(L1) → 실시간 openFDA(L3) → 스킬 서브에이전트(L4) → 그 다음 UI. UI 스펙은 claim 배지 반영 필요.

<!-- 새 결정은 이 아래에 날짜 섹션으로 추가 -->
