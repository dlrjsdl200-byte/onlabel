# CLAUDE.md — OnLabel (프로젝트 규칙)

> 전역 `~/.claude/CLAUDE.md`(하네스 원칙: 오케스트레이션·검증루프·커밋규율·상태저장 등)를 **우선 상속**한다. 이 파일은 그걸 반복하지 않고 **OnLabel 고유의 것 + 포인터**만 담는 thin harness다.

---

## 0. 오리엔테이션 — 새 세션은 먼저 읽어라
- **무엇**: 미국 소비자용 자가검증 OTC 약물안전 어시스턴트. 일반 LLM이 놓치는 성분중복·과용량을 FDA 데이터로 반박.
- **트랙/일정**: Built with Claude Life Sciences · **Builder · 솔로** · 마감 **2026-07-13 21:00 ET**.
- **먼저 읽을 문서**: [architect.md](architect.md) · [data/otc-knowledge-base.md](data/otc-knowledge-base.md) · [DECISIONS.md](DECISIONS.md) · [backlog.md](backlog.md) · [findings.md](findings.md) · 메모리(`~/.claude/projects/f--hackathon/memory/`).

## 1. 🔴 의료 안전 가드레일 (최우선, 예외 없음)
- **약물 사실(용량·성분·상호작용)을 절대 추측하지 않는다.** 모든 임상 숫자는 FDA/DailyMed/openFDA 근거이거나 `[?]` 검수 표시. 근거 없이 단정 금지.
- **판정은 결정론적 코드+데이터에서만 나온다.** LLM 추측 판정 금지 — 이게 프로젝트 논지다.
- **이건 데모지 의료기기가 아니다.** 제품에 disclaimer 명시("실제 의료 판단은 약사·의사와 상담", 임상 사용 불가).
- **언어 규칙 (엄격)**:
  - **한국어는 오직 이 대화(사용자↔Claude)에서만.**
  - **그 외 전부 영어** — 코드(식별자·주석), UI 문자열, 제품 카피, 에러 메시지, 데모, README 등 저장소·산출물의 모든 사용자 대면 콘텐츠. 대상은 미국 소비자 + 심사위원(영어).
  - 단, 내부 기획 문서(architect.md·DECISIONS.md·backlog.md·findings.md·메모리)는 한국어 유지 OK — 이건 사용자용 작업 노트라 제출물 아님.

## 2. 🟡 범위 규율
- **확정된 좁은 범위 고수**: US OTC 진통·감기약, 성분중복 + 용량. 새 범위 아이디어는 빌드에 넣지 말고 **backlog로**.
- **Demo 우선 원칙**: Demo 30%. **항상 작동하는 데모 경로를 유지**한다. MCP·추가 스킬은 additive이며 코어를 깨선 안 된다.
- **심사기준 인식**: Demo 30 / Claude Use 25 / Impact 25 / Depth 20. 결정은 이 점수를 위해.

## 3. 🟢 세션 워크플로
- **findings.md 강제 기록**: 진행 중 새로 발견한 사실은 즉시 기록(날짜·사실·출처·영향).
- **backlog.md 강제 기록**: 처리 보류 항목은 심각도로 기록 — **P0 블로커 / P1 중요 / P2 개선 / IDEA**.
- **DECISIONS.md (append-only)**: 아키텍처·범위·도메인 결정 로그. **기록된 결정은 사용자 확인 없이 뒤집지 않는다.**
- **세션 끝 체크(물어보기)**: commit·push 할지? 메모리 갱신? findings/backlog/DECISIONS 갱신? — 사용자에게 확인.

## 4. 🔵 기술·제출 규약
- **스택 고정**: Next.js(App Router) + Claude Agent SDK(`@anthropic-ai/claude-agent-sdk`) + Vercel. 스킬은 `.claude/skills/`. MCP는 스트레치(오픈 기여용).
- **오픈소스 요건**(해커톤 필수): repo 공개 준비, 라이선스 명시. **`.env`·API키 커밋 절대 금지**. 인증은 `ANTHROPIC_API_KEY` 환경변수.
- **마감 규율**: 7/13 21:00 ET. 데모 영상 녹화 위해 **전날 기능 동결(feature freeze)**.
- **Definition of Done = 제출 3종**: 3분 데모영상 + GitHub repo + 100~200단어 요약.
