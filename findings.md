# OnLabel — Findings (진행 중 발견한 사실)

> 빌드/조사 중 새로 알게 된 사실을 즉시 기록. 구조: **날짜 · 사실 · 출처 · 영향**.
> 결정이 필요한 사안이면 → DECISIONS.md, 나중 처리할 일이면 → backlog.md.

---

## 2026-07-08
- **NLM Drug Interaction API 폐기(2024-01-02)** — 무료 대체 DDI API 사실상 없음(DrugBank 유료). · 출처: RxLabelGuard 마이그레이션 가이드, DrugBank 공지. · 영향: 범용 상호작용 체커는 불가 → 결정론적 성분중복·용량 자체계산으로 우회(우리 좁은 접근이 옳았던 근거).
- **경구 phenylephrine 효능 부정** — FDA 2023-09 자문위 16-0, 2024-11-08 OTC 모노그래프 제거 제안. · 출처: fda.gov 보도자료/소비자안내. · 영향: PE 포함 제품에 "효능 없음" 안내 + 레퍼런스 = 약사 차별 포인트.
- **데이터 소스 검증**: openFDA(무료·키선택), DailyMed v2(무료), RxNorm/RxNav(무료·20req/s), RxClass(무료) 전부 사용 가능. · 영향: 무료 소스만으로 KB 완결 가능.

## 2026-07-09 (Day 2)
- **Agent SDK 도구 API 확정**: `tool(name, desc, zodShape, handler, {annotations})` + `createSdkMcpServer({name,version,tools})` → query의 `mcpServers`에 넘기고 `allowedTools`에 `mcp__{server}__{tool}` 등록. `structuredContent`로 기계판독 결과, `readOnlyHint:true`로 병렬 허용. zod ^4 필요(4.4.3 설치). · 출처: code.claude.com/docs/en/agent-sdk/custom-tools.
- **스킬 로딩 vs 개발 CLAUDE.md 충돌**: `settingSources:["project"]`로 스킬 로드하면 **개발용 루트 CLAUDE.md(내 작업규칙)까지 런타임 에이전트에 섞임.** · 영향: Day 2는 systemPrompt로 방법론 주입(스킬 파일은 정본 유지), 실제 스킬 로딩은 Day 3에 **격리 프롬프트 서브에이전트(AgentDefinition)**로 배선 예정.
- **결정론적 판정 보장 패턴**: 응답 verification을 LLM 출력 파싱이 아니라, 도구가 확인한 products로 verify()를 **다시 돌려** 붙임 → LLM이 어떻게 말하든 판정은 코드 진실.
- **효능 노트는 severity 무관 항상 노출**: phenylephrine 같은 효능 이슈는 용량/중복과 별개라 ok 판정에서도 표시하도록 수정.
