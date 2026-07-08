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
[B] Grounding (도구)  ── ① 결정론 verify()  ② 실시간 openFDA lookup(fallback/enrich)
   │                      = 인간검증 KB + 라이브 FDA
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

## 5. 실시간 openFDA grounding (L3)

- 신규 도구 `lookup_fda_label(product)` → `https://api.fda.gov/drug/label.json` 실시간 조회, 활성성분·함량 파싱.
- KB(정적)= 빠른 캐시 + 약사검증 정본. openFDA = KB 미스 시 fallback + "라이브 FDA" 스토리.
- 캐시 레이어(`.cache/`, gitignore됨)로 rate limit(240/분) 보호.

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
| grounding | 정적 KB | KB + **실시간 openFDA**[B] |
| 스킬 | 파일만 | **서브에이전트로 실제 배선** |
| 측정 | 없음 | **eval 하네스**[L2] |
| 원칙 | 암묵 | **뉴로심볼릭 명문화**(LLM은 안전 결정 안 함) |

---

## 8. 구현 순서 (L1→L4)

1. **L2 eval 하네스 먼저** — 골든셋 + 러너. (변경 전 baseline 측정 = 회귀 안전망)
2. **L1 claim 파이프라인** — [C] claim 분해 → [D] verifier 서브에이전트 → [E] reconciler. structured output.
3. **L3 실시간 openFDA** — `lookup_fda_label` 도구 + 캐시.
4. **L4 스킬 서브에이전트 배선**.
5. 각 단계 후 eval 재실행으로 개선 확인 → 그 다음 UI(Day 3 스펙).

---

## References
[^cove]: Chain-of-Verification (CoVe): draft → decompose into verifiable claims → independent verification → synthesize. LLMs answer simple verification questions more accurately than the complex original. https://learnprompting.org/docs/advanced/self_criticism/chain_of_verification
[^selfcorr]: "The Self-Correction Illusion: LLMs Correct Others but Not Themselves." https://arxiv.org/pdf/2606.05976
[^neuro]: Neuro-symbolic clinical AI — confine LLM to offline knowledge ingestion; human-validated symbolic KB; deterministic runtime; verification built into the execution engine. Infermedica; npj Digital Medicine s41746-026-02420-z; Kognitos.
[^safeai]: SAFE-AI — clinical expert knowledge + LLM + strict ontology rules to minimize hallucination. Frontiers/PMC12417475 (Generative AI in consumer health).
[^bigtech]: Consumer health AI 2026 (ChatGPT Health, Claude for Healthcare, Copilot Health) — documented risk of over-reassurance / failing to reflect urgency. PMC13131313.
[^dupe]: Therapeutic duplication (e.g., acetaminophen in a cold remedy + a pain reliever) — Drugs.com is rare in flagging it. JMIR MARS review of consumer DDI apps: PMC5895923.
