# OnLabel — 5일 실행 계획

> 오늘 2026-07-08(수) · 마감 **2026-07-13 21:00 EDT = 7/14(화) 10:00 KST**.
> 실질 빌드 5일(7/8~7/12) + 7/13 제출/버퍼 + 7/14 아침 최종.
> 원칙(CLAUDE.md): **항상 작동하는 데모 경로 유지** · 확실한 결정론적 코어부터 → 레이어로 점수 · Demo 우선.
> 매일 끝: 커밋 + (D3부터) Vercel 배포로 "언제든 보여줄 수 있는" 상태 유지.

---

## Day 1 — 7/8(수, 오늘·부분) · 데이터 + 결정론적 코어
**목표: 가장 확실하고 가장 중요한 자산(순수 코드)부터 못 박는다.**
- [ ] 스캐폴드: Next.js(App Router) 생성, repo 구조, LICENSE(MIT), README 스켈레톤(영어)
- [ ] `@anthropic-ai/claude-agent-sdk` 설치, `ANTHROPIC_API_KEY` env 세팅(.env.example)
- [ ] KB → 구조화 JSON (`data/products.json`, `data/ingredients.json`): 성분·함량·일일최대. 코어 15종 ⭐ 우선
- [ ] **결정론적 verifier 모듈 v1** (`lib/verify.ts`): `lookupIngredients` · `buildLedger` · `checkDuplication` · `checkMaxDose`
- [ ] 유닛테스트: `Tylenol Extra Strength + DayQuil` → APAP 중복 🚫 정답 반환
- **Done =** 터미널에서 verify() 핵심 시나리오 통과. 커밋.
- 서빙 기준: Demo/Depth. 리스크 최저(순수 코드).

## Day 2 — 7/9(목) · Agent SDK 파이프라인 (headless)
**목표: 질문→답변→검증을 에이전트로 관통(UI 없이 먼저).**
- [ ] Agent SDK 최소 파이프라인: Answer agent(generator) + verifier 모듈을 in-process 도구로 호출
- [ ] 구조화 출력: claim 추출 + 약물 엔티티 추출
- [ ] 첫 Skill `otc-safety-check` (`.claude/skills/`): 방법론 + KB에서 references/
- [ ] Next.js API route에서 Agent SDK 실행 → JSON 반환(스트리밍 아직 X)
- **Done =** API에 질문 → 답변 + FDA-grounded 판정(JSON). 커밋.
- 서빙 기준: Claude Use.

## Day 3 — 7/10(금) · 프론트 + 서브에이전트 (★데모 존재 마일스톤★)
**목표: 사람이 타이핑해서 보는 웹 데모 완성.**
- [ ] 대화형 챗 UI(OpenEvidence 스타일) + **SSE 스트리밍**
- [ ] 판정 패널: ✅/⚠️/🚫 배지 + FDA DailyMed 인용 링크 + phenylephrine 효능 안내
- [ ] **Verifier 서브에이전트**(critic 패턴) + Skill `otc-plain-language-counseling`
- [ ] disclaimer("의료 판단은 약사·의사 상담, 임상 사용 불가")
- **Done =** 웹에서 "Tylenol + DayQuil?" → grounded 위험 경고. **Vercel preview 배포.** 커밋.
- 서빙 기준: Demo(핵심) + Claude Use.

## Day 4 — 7/11(토) · Depth·견고성 + 스트레치
**목표: "씨름한 craft"로 보이게 다듬는다.**
- [ ] Skill `otc-red-flag-triage`(임부·소아·간/신장·기간 게이트)
- [ ] 시나리오 시드 확대(숨은 APAP, PM 중복, 다중 NSAID 등) + 엣지케이스
- [ ] openFDA **라이브 fallback**(KB 미스 시) + 인용 링크 정확도
- [ ] 로딩/에러/빈 상태, 카피 다듬기(영어)
- [ ] **스트레치: MCP 서버**(verifier 래핑) + Claude Desktop에 꽂아 실증 (시간 되면)
- **Done =** 견고한 데모. Vercel 재배포. 커밋.
- 서빙 기준: Depth + Impact(오픈 기여).

## Day 5 — 7/12(일) · 기능 동결 + 제출물 제작
**목표: 제출 3종 완성. (feature freeze)**
- [ ] **기능 동결** — 새 기능 금지, 버그·카피만
- [ ] **3분 데모 영상** 대본+녹화: Tylenol+DayQuil 위험 → phenylephrine 효능 → (스트레치)오픈 스킬/MCP 각도
- [ ] **100~200단어 요약**(영어) 작성
- [ ] README 마무리, LICENSE 확인, **repo 공개(public)**
- [ ] Vercel **production** 최종 배포
- **Done =** 영상+repo+요약 준비 완료. 커밋.

## 7/13(월) — 제출 + 버퍼
- [ ] 최종 점검(링크·배포·영상 재생 확인)
- [ ] **CV 플랫폼 제출** (여유 있게, 늦어도 7/14 오전 10시 KST 전)

---

## 리스크·버퍼 원칙
- 각 Day는 **작동 상태로 종료**(반쯤 만든 채 다음날 넘기지 않기). 밀리면 스트레치(MCP·red-flag)부터 버린다 — 코어 데모는 사수.
- 막히면 30분 룰: 가설 3개 세우고 안 풀리면 접근 재검토.
- Claude Use 우선순위: Agent SDK > Skills > Verifier 서브에이전트 > (스트레치)MCP.
