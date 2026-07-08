# OnLabel — AI Architecture v2 (문헌 기반 심화 설계)

> Day 2의 "LLM + 도구 1개"를 문헌 근거 위에서 **원칙 있게 심화**한 설계. 재설계가 아니라 elaboration.
> 작성 2026-07-09. 근거: 아래 §7 References. 관련: architect.md, PLAN.md.

---

## 1. 경쟁 지형 & 우리 자리 (prior art)

| 부류 | 예 | 성격 | 한계 |
|---|---|---|---|
| DB 인터랙션 체커 | Drugs.com, WebMD, Medscape | 약물 목록↔DDI DB 매칭, 심각도 등급 | 임상가/지식사용자용, **자연어 아님**, AI 아님, "AI 답변 검증" 아님. 성분중복(therapeutic duplication)은 Drugs.com만, 드묾 |
| 빅테크 소비자 헬스 AI (2026) | ChatGPT Health, **Claude for Healthcare**, Copilot Health | 범용 LLM 어시스턴트 | 문헌 지적: **"과도하게 안심시키고 urgency 반영 못 함"** → 우리가 노리는 실패 그 자체 |
| 임상 문헌 Q&A | OpenEvidence | 의사용, 문헌 종합+인용 | 소비자 아님, 산술적 안전(성분·용량) 약함 |

**OnLabel의 빈자리**: 소비자 자연어 + AI 편의 + **안전 판정은 결정론적(LLM이 결정 안 함)**. 위 셋 중 아무도 동시에 안 가짐.

---

## 2. 설계 원칙 (문헌 근거)

1. **뉴로심볼릭 분리 (하드 규칙)** — LLM은 **안전 판정을 절대 내리지 않는다.** 판정은 100% 결정론적(인간이 검증한 KB 위의 심볼릭 verifier). LLM 역할은 (a) 자연어→제품/주장 파싱, (b) grounding된 결과를 사람 말로 설명 — 그뿐. 근거: 뉴로심볼릭 임상 AI는 "런타임에 LLM을 호출하지 않는 결정론"을 지향[^neuro]. "검증은 execution engine에 내장돼야지 사후 guardrail로 붙이면 안 됨"[^neuro].
2. **CoVe claim 파이프라인** — 초안→검증가능 주장 분해→**독립** 검증→종합. LLM은 복잡한 원질문보다 단순 검증질문에 더 정확[^cove].
3. **독립 verifier, 자기교정 금지** — "Self-Correction Illusion": LLM은 자기 답은 잘 못 고치고 남의 답은 잘 고침[^selfcorr]. → verifier는 **생성기와 분리된 컨텍스트**(서브에이전트)이거나 아예 결정론 코드.
4. **권위 외부 데이터 grounding** — 모델 지식(bounded prior) 대신 openFDA/DailyMed. SAFE-AI: 전문가지식+LLM+엄격한 규칙으로 할루시네이션 최소화[^safeai].
5. **KB의 오프라인 인간 검증** — 약사가 검증한 심볼릭 KB[^neuro]. (우리 data/*.json + 약사 검수)
6. **측정 가능성** — 골든셋 eval로 정확도를 증명(Depth).

---

## 3. v2 파이프라인

```
사용자 질문
   │
   ▼
[A] Generator (LLM)  ── 초안 답변 + 언급 제품/의도 추출 (structured output)
   │
   ▼
[B] Grounding (도구)  ── 결정론 verify() (로컬 KB, 인메모리·즉시)
   │                      · KB는 openFDA로 빌드타임 sync·검증(런타임 호출 X)
   │                      · 미지 제품만 캐시된 라이브 fallback(핫패스 밖)
   ▼
[C] Claim 분해 (LLM, structured)  ── 초안을 원자적 주장으로 분해
   │     예: "둘 다 함께 복용 안전" / "APAP 최대 4000mg" / "매 4시간"
   ▼
[D] Verifier 서브에이전트 (독립 컨텍스트)  ── 각 주장을 grounding 근거에만 대조
   │     → VERIFIED / UNSUPPORTED / CONTRADICTED + 인용
   │     (생성기 추론 안 봄. 주장 + 근거만 봄)
   ▼
[E] Reconciler (결정론 코드)
   │     · CONTRADICTED(특히 안전) → 해당 주장 제거/교정
   │     · 최종 안전 판정 = verify()의 결정론 판정 (항상 승리, LLM 무관)
   ▼
최종 = grounded 답변 + claim별 검증 배지 + 결정론 판정 + 인용
```

**핵심**: [E]에서 **안전 판정은 언제나 [B]의 결정론 결과**. LLM은 [A][C]에서 언어만, [D]에서 주장 대조만. 안전 결정은 코드가.

### 컴포넌트 매핑 (구현 단위)
- **[A] Generator** — 기존 `runOnLabel`의 생성 부분. 제품 추출은 `check_otc_safety` 도구 호출로.
- **[B] Grounding 도구** — `check_otc_safety`(있음) + 신규 `lookup_fda_label`(실시간 openFDA, L3).
- **[C] Claim 분해** — 신규. structured output(zod 스키마: `{claims: {text, kind}[]}`).
- **[D] Verifier 서브에이전트** — 신규 `AgentDefinition`("claim-verifier"), 격리 프롬프트 + grounding 도구만. 자기 스킬 로드.
- **[E] Reconciler** — 신규 결정론 코드 `reconcile.ts`. 안전 판정 override 로직.

---

## 4. Eval 하네스 (L2, Depth의 결정적 증거)

- **골든셋** `evals/golden.json` ~20문항: `{question, expectedVerdict, expectedIngredientsFlagged[], mustMention[]}`.
  - 위험 케이스(APAP 중복, 다중 NSAID), 주의(진정 항히스타민), 안전(단일약), 효능(phenylephrine), red-flag(임부).
- **러너** `npm run eval`: 각 문항 파이프라인 실행 → 판정 일치율, 적발 성분 recall, 금지 주장 위반율 채점.
- **결정론 파트는 LLM 없이도 채점 가능**(verify()만) → 빠른 회귀 테스트. LLM 파트는 키 있을 때.
- 산출: `evals/report.md`(정확도 표) — 데모/writeup에 그대로 씀.

---

## 5. openFDA grounding — **빌드타임 우선**(런타임 지연 회피) (L3)

**원칙**: 뉴로심볼릭[^neuro]대로 지식수집은 오프라인, 런타임은 외부호출 없는 결정론. 판정이 네트워크에 막히면 "판정 먼저 즉시" UX(§1)도 깨진다.

- **핫패스 = 로컬 KB** (`src/data/*.json`, 번들 포함) → 인메모리 조회, 마이크로초. **네트워크 0.** 안전 판정은 언제나 여기서.
- **openFDA = 오프라인 sync 스크립트** `npm run sync:fda` — `https://api.fda.gov/drug/label.json`에서 활성성분·함량을 가져와 **KB를 채우고 검증**(데이터의 `verify:true` 숙제 해결). 개발 중 실행, 결과는 커밋된 JSON.
- **라이브 fallback(선택)** — KB에 없는 제품일 때만 `lookup_fda_label` 도구를 캐시(`.cache/`, gitignore)와 함께. **핫패스·데모 밖**. 데모 코어(17~37개)는 전부 KB에 있어 호출 안 일어남. 시간 부족 시 backlog로.
- 근거: 전체 지연은 LLM 생성이 지배하지만, 판정을 로컬로 두면 즉시성 + API 장애 무관 + rate limit(240/분) 걱정 제거.

---

## 6. 스킬/서브에이전트 실제 배선 (L4)

- 3개 스킬을 **격리 `AgentDefinition`** 으로(개발용 루트 CLAUDE.md 오염 회피 — Day 2 findings):
  - `otc-safety-check` → Verifier 서브에이전트[D]가 로드
  - `otc-plain-language-counseling` → Generator[A] 산문 톤
  - `otc-red-flag-triage` → 전처리 게이트(범위 밖이면 조기 의뢰)
- 각 서브에이전트는 `tools`로 필요한 grounding 도구만 화이트리스트.

---

## 7. Day 2 대비 변경점 (무엇이 새로운가)

| 요소 | Day 2 | v2 |
|---|---|---|
| 검증 대상 | 제품만 | **초안의 원자적 주장 각각**(CoVe) |
| verifier | 없음(단일 에이전트) | **독립 critic 서브에이전트**[D] |
| 안전 판정 | verify() 재실행 | 동일 + **reconciler가 명시적 override**[E] |
| grounding | 정적 KB(수기) | KB + **openFDA 빌드타임 sync**(런타임 즉시 유지)[B] |
| 스킬 | 파일만 | **서브에이전트로 실제 배선** |
| 측정 | 없음 | **eval 하네스**[L2] |
| 원칙 | 암묵 | **뉴로심볼릭 명문화**(LLM은 안전 결정 안 함) |

---

## 8. 구현 순서 (L1→L4)

1. **L2 eval 하네스 먼저** — 골든셋 + 러너. (변경 전 baseline 측정 = 회귀 안전망)
2. **L1 claim 파이프라인** — [C] claim 분해 → [D] verifier 서브에이전트 → [E] reconciler. structured output.
3. **L3 openFDA 빌드타임 sync** — `npm run sync:fda`로 KB 채움·검증(런타임 아님). 라이브 fallback은 선택.
4. **L4 스킬 서브에이전트 배선**.
5. 각 단계 후 eval 재실행으로 개선 확인 → 그 다음 UI(Day 3 스펙).

---

## 9. v2.1 감사 교정 (2026-07-08 파이프라인 전수 감사)

전수 감사 결과 v2 파이프라인에 **뉴로심볼릭 하드룰이 [D]에서 새는 구멍**과 **조준 대상 오류**를 발견해 아래로 교정한다(결정: DECISIONS D23~D26 / 근거: findings 2026-07-08 감사).

### 9.1 불변 결정 규칙 (D23)
**CoVe·독립 verifier의 가치 = generator의 환각 자유도에 비례.** 파이프라인은 환각이 실재하는 곳(grounding 없는 초안)에 조준하고, 이미 차단된 곳(제약된·override된 우리 산문)엔 쓰지 않는다. 근거: CoVe **factored 변형**(§7 [^cove], arXiv:2309.11495) — 검증이 초안에 conditioning 안 되는 독립성이 joint 대비 우위의 유일 원인. 이 규칙에서 배선 결정이 연역되므로 재논의 시 규칙부터 적용한다.

### 9.2 [D] 하이브리드 verifier (핵심 교정, D24)
[C]에서 claim을 kind로 분해 → kind별 라우팅:
- **임상 숫자 claim**(dose·duplication·interaction) → **결정론 KB(verify() findings)에 대조. LLM 배제.** (D15 하드룰 관철)
- **언어/framing claim** → 독립 LLM verifier 서브에이전트(격리 컨텍스트, Self-Correction Illusion 회피).

이유: v2의 "[D]가 모든 claim 검증"은 LLM이 용량 숫자를 판정하게 만들어 뉴로심볼릭 원칙을 위반. kind-split이 원칙을 파이프라인 끝까지 유지. 2026 판정 아키텍처의 per-claim routing(FactualAccuracy)과 정합.

### 9.3 조준 + 전달 (D25, D26)
- 파이프라인 검증 대상 = **grounding 없는 pass(일반 LLM 실제 출력)** → 대조 엔진(D12)으로 논지 실증. 우리 답 재확인 아님.
- 전달 경로 분리: **데모**=ship 전 gate로 교정 시연 / **프로덕션**=잔여 drift 경량 degradable net. 데모 코어(verdict-first+SSE) 불변.
- **✓ VERIFIED 배지 = "모든 문장 FDA 추적성"**(tool receipts, arXiv:2603.10060) — 발화 안 해도 투명성 자산.

### 9.4 구현 순서 (감사 반영, §8 대체)
1. **L2 eval baseline** (`npm run eval`) — 변경 전 baseline 측정(회귀 안전망).
2. **[C] claim 분해 + kind 태그** — structured output(zod), `emit_claims` 도구 강제 호출.
3. **[D] 하이브리드 verifier** — 임상=결정론 KB 라우팅 / 언어=격리 LLM 서브에이전트.
4. **[E] reconciler** — 결정론 override + 경로별 전달(데모 gate / 프로덕션 net).
5. eval 재실행으로 개선 측정 → UI claim 배지.

### 9.5 감사에서 확정 안 한 것 (열림)
- 데모 gate 경로에서 무근거 초안을 "얼마나 naive하게" 둘지(완전 무툴 vs 약한 힌트) — 데모 스크립트 짤 때 결정.

---

## References
[^cove]: Chain-of-Verification (CoVe): draft → decompose into verifiable claims → independent verification → synthesize. LLMs answer simple verification questions more accurately than the complex original. https://learnprompting.org/docs/advanced/self_criticism/chain_of_verification
[^selfcorr]: "The Self-Correction Illusion: LLMs Correct Others but Not Themselves." https://arxiv.org/pdf/2606.05976
[^neuro]: Neuro-symbolic clinical AI — confine LLM to offline knowledge ingestion; human-validated symbolic KB; deterministic runtime; verification built into the execution engine. Infermedica; npj Digital Medicine s41746-026-02420-z; Kognitos.
[^safeai]: SAFE-AI — clinical expert knowledge + LLM + strict ontology rules to minimize hallucination. Frontiers/PMC12417475 (Generative AI in consumer health).
[^bigtech]: Consumer health AI 2026 (ChatGPT Health, Claude for Healthcare, Copilot Health) — documented risk of over-reassurance / failing to reflect urgency. PMC13131313.
[^dupe]: Therapeutic duplication (e.g., acetaminophen in a cold remedy + a pain reliever) — Drugs.com is rare in flagging it. JMIR MARS review of consumer DDI apps: PMC5895923.

### 정본 논문 (canonical)
- **CoVe** — Dhuliawala et al., "Chain-of-Verification Reduces Hallucination in Large Language Models" (2023), arXiv:2309.11495.
- **Self-Refine** — Madaan et al., "Self-Refine: Iterative Refinement with Self-Feedback," NeurIPS 2023.
- **Reflexion** — Shinn et al., "Reflexion: Language Agents with Verbal Reinforcement Learning," NeurIPS 2023.
- **Self-Correction 한계** — "The Self-Correction Illusion: LLMs Correct Others but Not Themselves," arXiv:2606.05976 (2026).
- **Self-correction papers 모음** — https://github.com/ryokamoi/llm-self-correction-papers

### 검증·grounding 방법(2026)
- 할루시네이션 검출/완화 SOTA(claim-level decomposition + grounding + runtime judge; 의료 grounding 없으면 60%+) — https://zylos.ai/research/2026-01-27-llm-hallucination-detection-mitigation
- awesome-hallucination-detection — https://github.com/EdinburghNLP/awesome-hallucination-detection

### 뉴로심볼릭·의료 안전
- Neuro-symbolic clinical AI(런타임 결정론) — Infermedica https://infermedica.com/blog/articles/towards-clinically-validated-neuro-symbolic-ai · Kognitos https://www.kognitos.com/blog/what-is-neurosymbolic-ai/
- Regulation of clinical AI in the age of agents(UNDCS) — npj Digital Medicine, https://www.nature.com/articles/s41746-026-02420-z
- VeriGuard: LLM agent safety via verified code — https://arxiv.org/pdf/2510.05156
- SAFE-AI / consumer health LLM 안전 프레임워크 — https://pmc.ncbi.nlm.nih.gov/articles/PMC12417475/
- 소비자 헬스 AI 2026(ChatGPT Health, Claude for Healthcare, Copilot Health; 과도한 안심 위험) — https://pmc.ncbi.nlm.nih.gov/articles/PMC13131313/

### 선행 사례(의약품 체커)
- Consumer DDI 앱 systematic review(MARS) — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5895923/
- Drugs.com 상호작용·therapeutic duplication — https://www.drugs.com/drug-interactions/acetaminophen.html
- Medscape / WebMD interaction checker — https://reference.medscape.com/drug-interactionchecker
