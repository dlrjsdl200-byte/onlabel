# OnLabel — Architecture

> **한 줄 정의**: 미국 소비자를 위한, 스스로를 검증하는 OTC 약물안전 어시스턴트.
> 일반 LLM이 놓치는 **성분 중복·과용량**을 FDA 데이터로 **실제 반박**하는 검증 레이어.
>
> **이름**: OnLabel — off-label(허가사항 외)의 반대. 우리가 검증하는 근거가 곧 FDA 라벨(DailyMed)이라 개념이 제품 정의 그 자체.
>
> **포지셔닝**: OpenEvidence는 의사에게 문헌을 준다. OnLabel은 소비자에게 — 계산 가능한 안전(성분·용량)을 FDA 데이터로 검증한다. OpenEvidence의 *형태*(인용 grounding + 대화형 UI)만 차용, 대상·영역·검증방식은 차별화.

---

## 1. 핵심 통찰

**"검증 레이어"는 정답이 계산 가능한 영역에서만 인상적이다.**

| 영역 | 결정론적 검증 가능? |
|---|---|
| 문헌 종합이 맞나 (OpenEvidence 영역) | ❌ 애매, LLM이 애매하게 판단 |
| **성분 조성 + 누적용량 (OnLabel 영역)** | ✅ FDA 성분표 + 산수 = 참/거짓 딱 떨어짐 |

→ 우리가 고른 좁은 영역(OTC 성분중복)이 하필 검증 레이어가 빛나는 정확한 지점.
→ LLM으로 LLM을 검증하는 게 아니라 **결정론적 진실로 검증** = 신뢰 + 데모에서 증명 가능.

핵심 위험 사례: **acetaminophen(타이레놀 성분) 중복 → 미국 급성 간부전 1위 원인.** Tylenol + DayQuil 겹치면 소비자는 성분 중복을 모르고, 일반 LLM도 못 잡는다. OnLabel은 잡는다.

---

## 2. 검증 파이프라인 (Generator → Evaluator 패턴)

2026년 할루시네이션 대응 정설: **답변 단위가 아니라 claim(주장) 단위로 쪼개서 검색된 근거에 대조** + grounding(RAG/도구/인용) + 런타임 judge. 의학 도메인은 grounding 없으면 할루시네이션 60%+.

```
[1] 사용자 질문
    "Can I take Tylenol with DayQuil for my cold?"
       ↓
[2] Generator (Claude) — 초안 답변 생성
       ↓
[3] Claim 추출 (Claude, 구조화 출력)
    · 약물 엔티티: [Tylenol, DayQuil]
    · 원자적 주장 분해: "함께 복용 안전하다" 등
       ↓
[4] Grounding 조회 (도구 호출 → MCP 서버)
    · 각 제품 → openFDA 라벨 API → 활성성분·함량
    · RxNorm으로 성분 정규화 (브랜드 → 성분)
    · Tylenol → acetaminophen 500mg / DayQuil → acetaminophen 325mg + ...
       ↓
[5] Verifier (★결정론적 코드, LLM 아님★)
    · 성분 원장(ledger) 구성: 성분별 합산
    · 중복 감지: acetaminophen이 2개 제품에 존재
    · 누적용량 vs 일일최대(4000mg) 계산
    · 약사 규칙셋 적용 (성분중복·일일최대·NSAID/항응고 금기 등)
       ↓
[6] 판정 + 근거 (per-claim verdict)
    ✅ 검증됨 / ⚠️ 주의 / 🚫 위험
    🚫 "Both contain acetaminophen → overdose risk (>4000mg/day)"
    + FDA DailyMed 인용 링크
    · 위험이면 초안을 교정/차단 후 사용자에게 표시
```

**심사 매핑**: [3][4] Claude의 NL 작업 = Claude Use 25% · [5] 코드+FDA데이터 = 신뢰/Demo 30%·Depth 20% · 결정론적 반박 = 차별점.

---

## 3. 데이터 소스 — 검증 완료 (2026-07-08)

### ✅ 검증된 사용 가능 소스 (전부 무료·공개 US, 라이선스 장벽 없음)
| 소스 | 상태 | 키/제한 | 용도 |
|---|---|---|---|
| **openFDA** `drug/label.json` | ✅ | 키 불필요(240/분·1k/일), 무료키 시 120k/일 | 활성성분·용량·경고. 라이선스 계약 불필요. `https://api.fda.gov/drug/label.json` |
| **openFDA** `drug/ndc.json` | ✅ | 동일 | 제품↔성분↔NDC 매핑 |
| **DailyMed v2 REST** | ✅ | 무료·키 불필요 | 구조화 SPL, `label_type=otc` 필터, UNII 성분코드. `https://dailymed.nlm.nih.gov/dailymed/services/v2/` |
| **RxNorm/RxNav** | ✅ | 무료·라이선스 불필요(20 req/초) | 브랜드명↔성분 정규화(RxCUI). 단 `/proprietary`만 UMLS 필요 |
| **RxClass** | ✅ | 무료 | 약물 분류(NSAID 등 계열 판정) |

### ⚠️ 폐기됨 — 설계에서 우회
- **NLM Drug Interaction API**: **2024-01-02 폐기, 대체/마이그레이션 없음.** DrugBank(유료) 외 무료 DDI API 사실상 없음.
- **→ 우리 설계가 우회함**: 범용 DDI DB에 의존 안 함. 성분중복+누적용량은 **결정론적 자체 계산**(API 불필요), 상호작용/금기는 **약사 저작 소규모 규칙셋**(폐기 API가 쓰던 공개 **ONCHigh** 목록을 시드로). → 좁은 결정론적 접근이라 무료 소스만으로 완결. (좁게 간 결정이 옳았던 증거)

### 후보 소스 (필요 시 추가)
| 소스 | 용도 | 비고 |
|---|---|---|
| **ONCHigh** | 고우선순위 DDI 공개 목록 → 약사 규칙셋 시드 | 정적 목록, 무료 |
| **MedlinePlus** (NLM) | 소비자용 평이한 약 정보 → `otc-plain-language-counseling` 스킬 | 무료 |
| **RxNav-in-a-Box** | 로컬 다운로드판 → rate limit 회피·데모 안정성 | 무료 |
| **FDA OTC 모노그래프 성분목록** | OTC 범위 경계 확정 | 무료 |
| **openFDA `drug/event`(FAERS)** | 아세트아미노펜 간손상 신고 통계 = Impact 근거 | 무료 |
| **DrugBank** | 포괄적 상호작용/약물정보 | ⚠️**유료** — 해커톤 불사용, fallback 표기만 |

### KB 전략 — 하이브리드
- **백본**: 대표 OTC 30~50개(Tylenol/Advil/Aleve/DayQuil/NyQuil/Excedrin/Robitussin/Sudafed/Benadryl 등)의 성분·용량을 openFDA에서 **미리 뽑아 큐레이션 KB로 고정** + 약사 규칙셋. → 데모 안정성 + 약사 검증 = **프로젝트의 진짜 자산**.
- **확장**: KB에 없는 약은 런타임 openFDA 라이브 조회 fallback → "실시간 FDA 데이터" 확장 스토리.
- 데모는 큐레이션 KB로(빠르고 안 깨짐), 라이브는 확장성 어필.

---

## 4. 기술 스택 (확정 — Agent SDK 중심)

**Claude Agent SDK(`@anthropic-ai/claude-agent-sdk`, TypeScript)를 코어 에이전트 엔진으로.**
이유: detail.md가 리소스로 **Agent SDK · MCP · Agent Skills**를 콕 집음 = 심사(Claude Use 25%)가 기대하는 것. 순수 Vercel AI SDK 앱은 "Claude를 provider로 갈아끼운 것"처럼 보여 차별점 약함. Agent SDK는 3개를 한 방에 다 씀.

```
┌─────────────────────────────────────────────────┐
│  Next.js (App Router) — 프론트                   │
│  · 대화형 챗 UI (OpenEvidence 스타일)             │
│  · API route에서 Agent SDK 실행 → SSE 스트리밍    │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│  Claude Agent SDK (Node, headless)               │
│  · Answer agent (generator)                      │
│  · Verifier subagent (critic)  ← AgentDefinition │
│  · Agent Skills: 약사 검증·복약지도 (.claude/skills/) │
│  · Hooks: Stop 훅으로 "검증 실행됨" 강제 (선택)   │
└──────────────────────┬──────────────────────────┘
                       │ in-process 직접 호출
┌──────────────────────▼──────────────────────────┐
│  공유 검증 모듈 (TS) — FDA grounding + 결정론적 검증│
│  · lookupIngredients(product)                    │
│  · checkDuplication(products[])                  │
│  · checkMaxDose(ingredient, total)               │
│  · 큐레이션 OTC KB (JSON/SQLite) + openFDA 라이브 │
└──────────────────────┬──────────────────────────┘
                       │ 같은 모듈을 얇게 래핑 (스트레치)
┌──────────────────────▼──────────────────────────┐
│  MCP 서버 (오픈 기여) — Claude Desktop/Cursor 실증 │
└─────────────────────────────────────────────────┘
```

- **Agent SDK 확인된 역량**: Subagents(`AgentDefinition`), MCP(`mcpServers`), Skills(`.claude/skills/*/SKILL.md`), Hooks(`PreToolUse`/`PostToolUse`/`Stop`), 스트리밍(async iterator), Node headless.
- **검증 코드([5])**: 순수 TypeScript, MCP 서버 안. LLM 안 씀.
- **프론트 스트리밍**: Next.js API route에서 Agent SDK 메시지를 ReadableStream/SSE로 클라이언트에 전달. (Vercel AI SDK UI는 렌더링용으로 선택적, 백엔드는 Agent SDK가 주인공)
- **배포**: Vercel + Next.js. (Agent SDK는 Node 런타임 필요 — Fluid Compute)
- **인증**: `ANTHROPIC_API_KEY` (해커톤 제공 크레딧). ⚠️ Agent SDK는 claude.ai 로그인 재판매 불가, API 키 방식 필수.

### Claude Use 25% 레이어 (이 스택이 자연히 다 충족)
1. **Agent SDK** 자체 = Anthropic 에이전트 프레임워크 사용
2. **Agent Skills** = 약사 도메인 규칙·복약지도 패키징 (§4b)
3. **Verifier 서브에이전트** = generator-evaluator/critic 패턴
4. **커스텀 MCP 서버** = 오픈 기여 + 2차 클라이언트 실증 레이어 (§4c, 스트레치)
5. **(선택) Hooks** = 검증 미실행 시 차단하는 안전 게이트

---

## 4b. Agent Skills 설계

**Skill = "약사처럼 사고·판단·전달하는 절차적 지식"의 패키지.** MCP가 데이터/계산이면, Skill은 그걸 약사가 어떻게 해석하는가. progressive disclosure(이름·설명 먼저 → 매칭 시 전체 로드). 이게 **약사만 저작 가능** = Depth 20% + Claude Use 25%의 심장.

### 핵심 1 — `otc-safety-check` (진짜 차별점)
Verifier 서브에이전트가 로드하는 검증 방법론.
```
otc-safety-check/
├── SKILL.md              # 제품추출→성분조회→원장구성→중복감지→
│                         #   누적용량 vs 일일최대→금기규칙→판정
├── references/
│   ├── max-daily-doses.md          # acetaminophen 4000mg 등 성분별 일일최대
│   ├── duplicate-ingredient-cases.md  # "숨은 아세트아미노펜" 위험 케이스
│   └── contraindications.md        # NSAID/항응고 등 대표 금기
└── scripts/
    └── verify.ts          # 결정론적 원장+용량 계산 (공유 모듈, §4c와 공유)
```
- **description(트리거)**: "OTC 진통·감기약 병용/용량 조언이 안전한지 검증. 여러 OTC 제품 병용·용량·AI답변 정확성 질문 시 사용. 활성성분 중복(특히 acetaminophen)·누적용량·금기 확인."

### 핵심 2 — `otc-plain-language-counseling` (복약지도 = 약사 고유업무)
판정을 소비자가 행동할 수 있는 비임상 언어로 번역.
```
otc-plain-language-counseling/
└── SKILL.md    # 독해수준, 비전문용어, 행동지향("하나만, 6시간 뒤"),
                #   에스컬레이션 문구("약사/의사 상담")
```
- **description**: "OTC 안전 판정을 미국 소비자가 이해·실행할 언어로 변환 — 뭘 할지, 얼마나 기다릴지, 언제 멈출지, 언제 전문가에게. 판정 후 표시 전 사용."
- 심장내과의 postvisit.ai가 먹힌 각도(전문가의 환자 커뮤니케이션)와 동일.

### 스트레치 3 — `otc-red-flag-triage` (약사의 의뢰 판단)
OTC 자가치료 범위 밖(임부·수유부·소아·간/신장질환·항응고제·경고증상)을 잡아 전문가 의뢰로 게이트.
```
otc-red-flag-triage/
├── SKILL.md
└── references/red-flags.md
```

### 맞물림
```
Verifier 서브에이전트
  → otc-red-flag-triage (범위 밖이면 즉시 의뢰)
  → otc-safety-check (성분 조회 + 결정론적 판정)
  → otc-plain-language-counseling (소비자 언어로 번역)
```

### 이식성 = 오픈 기여 각도
Skill은 40+ 에이전트(Cursor/Copilot/Gemini CLI...)가 쓰는 오픈 포맷. `otc-safety-check`를 **오픈소스 공개 = "어떤 AI 에이전트든 붙일 수 있는 약사 저작 OTC 안전 스킬"**. → 해커톤 오픈소스 요건 충족 + Impact(재사용 안전 아티팩트) + OpenEvidence(폐쇄) 대비 오픈 포지셔닝.

---

## 4c. MCP 역할 — 재정의 (2026-07-08)

**원칙: MCP의 존재 이유는 상호운용성.** 우리 앱이 우리 로직을 in-process로 부르면 되는데 MCP로 감싸면 껍데기(ceremony) → 심사위원이 간파. detail.md의 "MCP Docs"는 리소스 링크일 뿐 build/use 지시 아님.

**정당해지는 유일한 경우 = 우리 앱이 아닌 다른 것이 쓸 때.** 그게 OnLabel 논지(오픈 안전 레이어 기여)와 겹침.

| 요소 | 역할 |
|---|---|
| **검증 로직(핵심)** | 공유 TS 모듈. Next.js 앱이 **in-process 직접 호출** → 빠르고 안 깨짐(Demo 안정성) |
| **MCP 서버** | 같은 모듈을 얇게 감싼 것. **오픈소스 공개 + 데모에서 Claude Desktop/Cursor에 꽂아 "우리 앱 밖에서도 FDA 안전검증이 돈다" 실증.** 중복 없음, 상호운용 진짜가 됨 |
| **기존 MCP 소비** | openFDA는 REST 직접 호출이 더 간단 → 남의 MCP 억지 소비 안 함 |

→ MCP는 "코어 배관"이 아니라 **"오픈 기여 + 2차 클라이언트 실증" 스트레치 레이어**. 없어도 앱은 돌고, 있으면 Claude Use + Impact 가산. 시간 부족 시 후순위.

---

## 5. 심사 기준 매핑 (Demo 30 / Impact 25 / Claude 25 / Depth 20)

- **Demo 30%**: "Tylenol + DayQuil 괜찮아?" → 🚫 간독성 경고 + FDA 근거. 3분 영상에 딱, 시각적 대조 강렬.
- **Impact 25%**: acetaminophen 과다 = 미국 급성간부전 1위. BMJ AI 건강답변 49.6% 문제. 약사만 만드는 grounding.
- **Claude Use 25%**: Agent SDK + MCP + Skill + 서브에이전트 = 기본 앱을 넘어섬.
- **Depth 20%**: 결정론적 검증 + FDA 데이터 grounding + 약사 규칙셋 = 씨름한 craft.

---

## 6. 확인/결정 필요 (build 시)
- [ ] Agent SDK TS 정확한 API 시그니처 (query options, AgentDefinition, mcpServers) — 공식 문서 재확인
- [ ] openFDA 라벨에서 활성성분·함량 파싱 정확한 필드 (SPL 구조)
- [ ] 커스텀 MCP 서버를 in-process로 붙일지 별도 프로세스로 띄울지
- [ ] 약사 규칙셋 v1 범위: 성분중복 + 일일최대 우선, 상호작용/금기는 대표 케이스만
- [ ] 도메인(onlabel.app 등) 가용성 + 상표 충돌 체크 (제출엔 불필요, 나중)
- [ ] 프론트 스트리밍: 커스텀 SSE vs Vercel AI SDK UI 유틸

---

*근거: openFDA Drug Label API, RxNorm/RxNav API, Claude Agent SDK 공식 문서(code.claude.com/docs/en/agent-sdk), 2026 할루시네이션 검증 연구(claim-level decomposition + grounding + runtime judge). 작성 2026-07-08.*
