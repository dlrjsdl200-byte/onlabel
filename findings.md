# OnLabel — Findings (진행 중 발견한 사실)

> 빌드/조사 중 새로 알게 된 사실을 즉시 기록. 구조: **날짜 · 사실 · 출처 · 영향**.
> 결정이 필요한 사안이면 → DECISIONS.md, 나중 처리할 일이면 → backlog.md.

---

## 2026-07-08
- **NLM Drug Interaction API 폐기(2024-01-02)** — 무료 대체 DDI API 사실상 없음(DrugBank 유료). · 출처: RxLabelGuard 마이그레이션 가이드, DrugBank 공지. · 영향: 범용 상호작용 체커는 불가 → 결정론적 성분중복·용량 자체계산으로 우회(우리 좁은 접근이 옳았던 근거).
- **경구 phenylephrine 효능 부정** — FDA 2023-09 자문위 16-0, 2024-11-08 OTC 모노그래프 제거 제안. · 출처: fda.gov 보도자료/소비자안내. · 영향: PE 포함 제품에 "효능 없음" 안내 + 레퍼런스 = 약사 차별 포인트.
- **데이터 소스 검증**: openFDA(무료·키선택), DailyMed v2(무료), RxNorm/RxNav(무료·20req/s), RxClass(무료) 전부 사용 가능. · 영향: 무료 소스만으로 KB 완결 가능.

## 2026-07-09 (데이터 추출 방법 — LLM 오염 회피)
- **WebFetch로 의료 용량 추출 금지**: WebFetch는 가져온 내용을 작은 LLM이 요약/응답 → 숫자 오염 위험. 뉴로심볼릭 원칙 위반. 용량 추출은 결정론(pdftotext+grep)만.
- **FDA accessdata PDF는 Akamai 봇 차단**: curl/WebFetch 302→abuse-detection-apology. 자동 다운로드 불가, 사람 브라우저 필요. (URL/도구 문제 아님)
- **pdftotext 설치 확인**(/mingw64/bin/pdftotext) → PDF만 확보되면 결정론 추출 가능.
- 올바른 워크플로: 사람이 M013/M012 브라우저 다운로드 → pdftotext raw 추출 → grep 용량줄 → 약사 검증. backlog B-4.

## 2026-07-09 (Eval 골든셋 — 데이터 버그 적발)
- **eval-first가 즉시 버그 잡음**: 골든셋 결정론 라벨을 verify()에 대조하다가 발견 — **doxylamine 일일한도 25mg이 NyQuil label 최대(50mg/일)보다 낮아 NyQuil 단독이 danger로 오판**(false positive). → 항히스타민 한도 ~75mg으로 수정. · 영향: 데모 신뢰성 사고 예방.
- **불변식 도출**: "성분 일일한도 >= 어떤 단일 제품의 label 최대." 위반 시 데이터 오류. → verify.test.ts에 "모든 단일 제품은 혼자 danger 아님" 불변식 테스트 추가.
- 골든셋 설계 근거: 계층화+고위험 수집, negative(과잉경고 방지), 의료 sycophancy/obfuscated(SycoEval-EM/CARES/PatientSafetyBench). 25개, evals/golden.json.

## 2026-07-09 (AI 아키텍처 리서치)
- **문헌이 우리 논지를 증명**: 빅테크 소비자 헬스 AI(2026 ChatGPT Health, Claude for Healthcare, Copilot Health)의 문서화된 실패 = "과도하게 안심시킴 / urgency 반영 못 함" = OnLabel이 노리는 바로 그 실패. · 영향: 포지셔닝 정당화.
- **CoVe(Chain-of-Verification)** = 우리 claim 파이프라인의 정본. draft→claim 분해→독립 검증→종합. · 영향: L1 설계 근거.
- **"Self-Correction Illusion"(2026)**: LLM은 자기 답 못 고치고 남의 답은 고침 → **독립 verifier 서브에이전트**(자기교정 아님)를 써야 함. · 영향: critic을 분리 컨텍스트로.
- **뉴로심볼릭 임상 AI**: LLM은 오프라인 지식수집만, 인간검증 심볼릭 KB, 런타임 결정론. "검증은 execution engine에 내장, 사후 guardrail 아님." · 영향: **안전 판정은 LLM이 절대 안 함(D15)**의 근거.
- 선행 DB 체커(Drugs.com/Medscape/WebMD)는 자연어·AI·AI답변검증 아님. Drugs.com만 therapeutic duplication(드묾). · 영향: 빈자리 확인.
- 전체 종합 → docs/AI-ARCHITECTURE.md (v2). 문헌 목록은 architect.md(v1) + AI-ARCHITECTURE.md(v2) References.

## 2026-07-08 (Day 3 — caffeine 출처 확정 + 전체 모노그래프 아카이브)
- **caffeine 일일상한 = FDA 모노그래프에 부재**: M011(Stimulant) §M011.50(d)는 회당 100-200mg, q3-4h만 명시하고 **"not to exceed X in 24 hours" 24시간 상한이 없음**. → maxDailyMg=null 유지가 정답(1600 등 계산 삽입은 FDA 근거 아닌 내 산수라 하드룰 위반). 출처를 M011로 정확화. 이제 verify:false 5개 전부 모노그래프 인용 완비.
- **전체 OTC 모노그래프 세트 로컬 확보**(refs/, M001~M032+NM900 33개, gitignore). OnLabel 범위(진통·감기)엔 M013·M012·M011만 관련 — 나머지 29개는 범위 밖. **미래 범위 확장(전체 OTC 커버) 시 결정론 추출 자산**으로 보관. 지금 처리 안 함(scope 규율).

## 2026-07-08 (Day 3 — 안 1 구현: 강도 변이 해소)
- **안 1(D21) 구현 완료**: `resolveProduct()`가 bare 브랜드를 default SKU로 결정론 해소하고 `assumedDefault`+alternatives 신호 반환. verify()가 `assumptions[]`를 VerifyResult에 수집 → UI `AssumptionNote`로 명시. bare "Tylenol"→Extra Strength(가정 표시), 명시적 "extra/regular strength"·다른 포뮬레이션(PM/Cold+Flu)은 정확히 구분. 데이터: tylenol-regular/extra에 brandKey·strengthLabel·isBrandDefault 추가. 회귀 테스트 3개 추가. 골든 23/23 유지(products 배열은 전부 명시적이라 무영향).

## 2026-07-08 (Day 3 — 다중 SKU 강도 발견)
- **OTC 브랜드는 강도별 다중 SKU** (약사 검증 중 발견): Benadryl Allergy 25mg vs Extra Strength 50mg/정; Mucinex/Mucinex DM 600mg(regular) vs 1200mg(Maximum Strength)/정. · 영향: "몇 알" 표시는 SKU 의존 → 브랜드명에 강도 못박아 고정(D20). 일일상한 판정은 SKU 무관 동일이라 판정 정확성엔 영향 없음. · 소스: 사용자 제공 제품 라벨 스크린샷(각 SKU Drug Facts).
- **FDA 모노그래프 5개 성분 상한 결정론 추출 완료**(pdftotext+grep, refs/M013.txt·M012.txt): aspirin 4,000(M013:696) / doxylamine 75(M012:558) / phenylephrine 60(M012:1335) / pseudoephedrine 240(M012:1345) / caffeine=모노그래프 부재(null 유지). **5개 전부 기존 KB값과 정확히 일치** → verify:true→false 승격 준비됨(약사 확인 대기).

## 2026-07-09 (Day 2)
- **Agent SDK 도구 API 확정**: `tool(name, desc, zodShape, handler, {annotations})` + `createSdkMcpServer({name,version,tools})` → query의 `mcpServers`에 넘기고 `allowedTools`에 `mcp__{server}__{tool}` 등록. `structuredContent`로 기계판독 결과, `readOnlyHint:true`로 병렬 허용. zod ^4 필요(4.4.3 설치). · 출처: code.claude.com/docs/en/agent-sdk/custom-tools.
- **스킬 로딩 vs 개발 CLAUDE.md 충돌**: `settingSources:["project"]`로 스킬 로드하면 **개발용 루트 CLAUDE.md(내 작업규칙)까지 런타임 에이전트에 섞임.** · 영향: Day 2는 systemPrompt로 방법론 주입(스킬 파일은 정본 유지), 실제 스킬 로딩은 Day 3에 **격리 프롬프트 서브에이전트(AgentDefinition)**로 배선 예정.
- **결정론적 판정 보장 패턴**: 응답 verification을 LLM 출력 파싱이 아니라, 도구가 확인한 products로 verify()를 **다시 돌려** 붙임 → LLM이 어떻게 말하든 판정은 코드 진실.
- **효능 노트는 severity 무관 항상 노출**: phenylephrine 같은 효능 이슈는 용량/중복과 별개라 ok 판정에서도 표시하도록 수정.
