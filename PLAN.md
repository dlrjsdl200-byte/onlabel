# OnLabel — 5일 실행 계획

> 오늘 2026-07-08(수) · 마감 **2026-07-13 21:00 EDT = 7/14(화) 10:00 KST**.
> 실질 빌드 5일(7/8~7/12) + 7/13 제출/버퍼 + 7/14 아침 최종.
> 원칙(CLAUDE.md): **항상 작동하는 데모 경로 유지** · 확실한 결정론적 코어부터 → 레이어로 점수 · Demo 우선.
> 매일 끝: 커밋 + (D3부터) Vercel 배포로 "언제든 보여줄 수 있는" 상태 유지.
>
> **📍 현재 위치(2026-07-08 갱신)**: Day 1·2·3 완료 + Depth 대량 진행 — **접지 울타리(D+A+C+B)·B-8 위음성 수정·FDA 인용 receipts UI·L1 claim 파이프라인 Phase 1~3 완료**(대조 엔진 live 작동). 골든 122개. **다음 = L1 Phase 4(UI 대조 엔진 시각화)** → 그후 **Vercel 배포 + 제출물(README·요약·3분영상)**. 상세는 memory/onlabel-progress.md · DECISIONS.md · findings.md.

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

## Day 3 — 7/10(금) · 프론트 + 서브에이전트 (★데모 존재 마일스톤★) ✅ 대부분 완료
**목표: 사람이 타이핑해서 보는 웹 데모 완성. 스펙 = docs/UI-SPEC.md (확정).**
- [x] shadcn/ui init + 클리니컬-클린 토큰 (globals.css: 블루 액센트 + verdict green/amber/red)
- [x] 컴포넌트 src/components/onlabel/*: VerdictCard · IngredientLedger(용법 원장) · ContrastStrip · EfficacyNote · Sources · Disclaimer · QuestionInput(자연어 예시칩) · AnswerView · OnLabelApp · AssumptionNote
- [x] SSE 스트림 라우트 `POST /api/check/stream`(verification→token→done→error) + `useOnLabelStream` 훅 + `streamOnLabel()`(includePartialMessages)
- [x] "판정 먼저, 설명 나중" 배선 + 예시 칩 + 상태(빈/스트리밍/미매칭/에러) — 라이브 playwright 실증
- [ ] (선택) Verifier 서브에이전트 + 스킬 배선 — 미실시(→ L1 파이프라인으로, backlog/AI-ARCHITECTURE)
- [ ] 반응형/다크/접근성 패스 — 미실시(폴리시 잔여)
- [ ] **Vercel 배포 — 제출 직전 기계작업으로 연기**(로컬 `npm run dev`로 언제든 실물 확인 가능하므로 지금 시간 안 씀. 약 5분, feature freeze 후 1회).
- **추가 선행(원래 Day4/B-4)**: FDA 모노그래프 5개 성분 상한 결정론 추출·검증(verify:false 승격, D22) · 용법 원장 unitsPerDose(D19) · 다중 SKU 강도 고정(D20) · 강도 변이 해소+가정 명시 안1(D21).
- 검증: typecheck 통과 · 테스트 10 verifier + 4 tool + 23 golden 그린. 커밋 4개(main, 미푸시).
- 서빙 기준: Demo(핵심) + Claude Use.

## Day 4 — 7/8~ · Depth·견고성 (대량 진행됨) ✅ 대부분 완료
**목표: "씨름한 craft"로 보이게 다듬는다.** (원계획 항목 대신 접지·검증 Depth로 전환)
- [x] **접지 울타리 D→A→C→B**(D27~D30): 프롬프트 울타리 + ok제품 KB용량 노출 + 판정카드 scope각주 + 복용법 데이터(9성분, M012/M013). live 검증.
- [x] **B-8 위음성 수정**(D32): generic 성분명 중복 탐지(acetaminophen+Tylenol=caution). 회귀5.
- [x] **FDA 인용 receipts UI**(D33): Sources 칩 클릭→모노그래프 verbatim 발췌+공개 FDA URL 팝오버.
- [x] **시나리오 골든 확대 25→122**: 2차 probe(다양형식) + 실검색 상위20 + generic-name.
- [x] **L1 claim 파이프라인 Phase 1~3**(§9.4): [C]분해 · [D]하이브리드(임상=결정론/언어=격리LLM) · [E]reconciler. 대조 엔진 live(무근거초안→FDA교정). 테스트 verifyClaims11+reconcile3.
- [ ] **L1 Phase 4** (진행 중): UI claim 배지 + 대조 엔진 시각화(Demo 30% 핵심).
- [ ] Skill `otc-red-flag-triage` / openFDA 라이브 fallback / MCP 서버 — 스트레치, 미실시(범위규율).
- 서빙 기준: Depth + Claude Use.

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
