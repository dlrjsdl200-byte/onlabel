# OnLabel — 5일 실행 계획

> 오늘 2026-07-08(수) · 마감 **2026-07-13 21:00 EDT = 7/14(화) 10:00 KST**.
> 실질 빌드 5일(7/8~7/12) + 7/13 제출/버퍼 + 7/14 아침 최종.
> 원칙(CLAUDE.md): **항상 작동하는 데모 경로 유지** · 확실한 결정론적 코어부터 → 레이어로 점수 · Demo 우선.
> 매일 끝: 커밋 + (D3부터) Vercel 배포로 "언제든 보여줄 수 있는" 상태 유지.

---

## Day 1 — 7/8(수) · 데이터 + 결정론적 코어 ✅ 완료
**목표: 가장 확실하고 가장 중요한 자산(순수 코드)부터 못 박는다.**
- [x] 스캐폴드: Next.js 16(App Router, TS, Tailwind) + LICENSE(MIT) + README(영어)
- [x] `@anthropic-ai/claude-agent-sdk` 0.3.204 설치 + `.env.example`
- [x] KB → JSON: `src/data/ingredients.json`(성분 15) + `src/data/products.json`(US OTC 17). source/verify 플래그 포함
- [x] **결정론적 verifier** `src/lib/onlabel/verify.ts`: lookupProduct · 원장 · checkDuplication · checkMaxDose · 계열중복
- [x] 유닛테스트 `verify.test.ts` 6/6 통과 (`npm test`), `tsc` 클린
- [x] **Done =** Tylenol ES + DayQuil → APAP 5600mg > 4000 → 🚫 danger 확인. 커밋+push(public repo)
- 스크립트: `npm test`, `npm run typecheck`, `npm run dev`

## Day 2 — 7/9(목) · Agent SDK 파이프라인 (headless) ✅ 완료
**목표: 질문→답변→검증을 에이전트로 관통(UI 없이 먼저).**
- [x] `check_otc_safety` in-process SDK 도구(`createSdkMcpServer`)로 verify() 래핑 — summary + structuredContent
- [x] 에이전트 러너 `agent.ts`(`runOnLabel`): query()에 도구 물리고, 확인된 제품으로 verify() 재실행해 **결정론적 판정을 응답에 보장**
- [x] `otc-safety-check` 스킬(`.claude/skills/`) — 정본 방법론 (런타임은 Day 2엔 systemPrompt로 주입, 실제 스킬 로딩은 Day 3 서브에이전트로)
- [x] `POST /api/check` 라우트(Node 런타임) → answer + verification JSON
- [x] **Done(구조)** = 도구/러너/라우트 완성. 10/10 테스트 + tsc + eslint + next build 통과.
- ⚠️ **라이브 LLM 경로는 ANTHROPIC_API_KEY 필요**(미커밋) — 사용자가 .env 넣고 `npm run dev` 후 확인.
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
