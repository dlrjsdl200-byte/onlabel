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

<!-- 새 결정은 이 아래에 날짜 섹션으로 추가 -->
