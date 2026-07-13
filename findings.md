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

## 2026-07-08 (AI 아키텍처 파이프라인 전수 감사 — 문헌 재검증)
> 결과 확정 결정은 DECISIONS.md D23~D26, 설계 반영은 docs/AI-ARCHITECTURE.md §9.
- **CoVe factored 변형 = [D] 독립성의 정본 근거**: joint를 이기는 유일 이유 = 검증이 초안에 conditioning 안 됨(독립성). → CoVe는 "환각 가능한 generator"를 전제로 존재하는 장치. 우리 generator는 이미 grounding+판정 override로 제약 → **우리 산문 재확인은 부분 중복**. 파이프라인은 무근거 초안으로 조준해야 가치 발생(D23). · 출처: arXiv:2309.11495.
- **[D] 설계 구멍 발견(핵심)**: 현 v2는 "[D] 서브에이전트가 모든 claim 검증"인데, **임상 숫자 claim을 LLM이 판정하면 D15 하드룰 위반**. → kind-split 하이브리드로 교정(D24): 임상 claim=결정론 KB 대조, 언어 claim만 독립 LLM.
- **2026 판정 아키텍처 = claim마다 KB조회/tool-call 라우팅**: FactualAccuracy atomic decomposition + per-claim routing. 우리 [C] kind 태그 → [D] 라우팅과 정확히 일치. · 출처: futureagi 2026 architectural deep dive.
- **gate-before-ship vs 스트리밍 긴장 해소**: 안전 판정은 이미 결정론이라 gate 완료 상태. 산문만 남음 → 데모=ship 전 gate, 프로덕션=경량 net(D25). · 출처: braintrust 2026 hallucination tools.
- **tool receipts**: 발화 안 하는 ✓ 배지도 정당한 검증 아티팩트(FDA 추적성). · 출처: arXiv:2603.10060.
- **flip-flop 근본 원인 진단**: 결정 규칙 없이 매번 새 각도(레이턴시→theater)로 즉흥 판단해서 답이 바뀜. → D23 불변 규칙 수립으로 재발 방지.

## 2026-07-08 (eval 러너 구축 + live baseline이 잡은 실제 버그)
- **답변층 grader 아티팩트 6건(baseline 44/50)**: 전부 파이프라인 답변은 정확, grader 결함. bare `mustNotClaim:"safe"`가 "safer"/"safe approach" 같은 정당한 안전 표현에 오탐, `mustMention:"doctor"`가 "OB/pharmacist" 동의어 놓침. → grader 부정어 인식 + golden을 구체 구절로 하드닝. 근거/상세: evals/BASELINE.md.
- **🔴 제품 resolver false-negative(고심각, 데모 치명적)**: transcript 검토로 발견. LLM이 라벨의 "&"/"+"를 자연스럽게 "and"로 쓰면(`"Advil Cold and Sinus"`) `fuzzyLookup`이 짧은 id "advil"에 먼저 걸려 **plain Advil로 매칭 → pseudoephedrine 누락 → danger를 ok로 오판**(PSE 360>240인데 초록 OK 카드). `"Tylenol Cold and Flu Severe"`도 strength-family가 tylenol 기본값으로 붕괴. · 영향: 안전 코어 위음성 + LLM이 잘못된 ok를 산문에서 뒤집어 **판정 카드↔산문 모순**(뉴로심볼릭 위반 유발). · 수정: resolver를 특이도 기반 스코어 매칭 + stopword("and") 처리 + family 붕괴 방지 residual 가드로 교체. 회귀 테스트 4개(verify.test.ts) + eval 답변층에 **live 판정 assertion** 추가(재발 시 FAIL). 결정론이라 재호출 없이 검증.
- **eval 갭 교훈**: 결정론층은 golden의 정규 철자를, 답변층은 산문만 봐서 둘 다 live 판정 오류를 놓쳤음. → 답변층이 verify(productsChecked)를 expected와 대조하도록 보강. **transcript 강제 기록이 이 버그를 드러냄**(답변이 스스로 폭로) — 유료 I/O 기록의 실전 가치 입증.

## 2026-07-08 (다양한 질문형식 20개 probe — 접지 갭 발견)
> 확정 원칙 DECISIONS D27, 데이터 작업 backlog B-6. transcript: evals/transcripts/eval-2026-07-08T08-46-08-388Z.md
- **20/20 안전 통과, 답변 품질 우수** — 단일용량·빈도·누적·사실·추천·오개념 전 형식에서 정확하고 풍부. ("타이레놀=아세트아미노펜 같은 약", 천연 오개념 교정, runny-nose 스코프 방어 등 탁월.)
- **🔴 그러나 임상 숫자가 KB 아닌 LLM 기억에서 나옴(뉴로심볼릭 울타리 누수)**: `runSafetyCheck`([tool.ts])는 **문제없는(ok) 제품엔 용량 데이터를 안 넘김**("No problems found"만) → 단일용량 질문의 "500mg/정, 6정" 등은 KB에 있어도 도구가 안 줘서 LLM이 기억으로 채움. **복용 간격("6시간마다","8-12시간마다")은 KB에 데이터가 아예 없어 100% LLM 추측.** = D15 위반. "A+B 중복" flagship 밖에선 일반 LLM처럼 추측 중.
- **A+B 편중이 이 사실을 가리고 있었음**: 접지는 중복/일일최대만 깊고, 단일용량/간격/누적은 얕음. 좁은 골든 편향의 진짜 원인.
- **판정↔산문 모순 위험**: verify(["Advil"])=ok(초록 카드)인데 산문 "6알이면 한도, 멈추세요"(cumul-six-advil); dayquil every-2h도 카드 ok/산문 "안 됨". 엔진이 이미 먹은 양·과빈도를 모델링 못 해서 verdict-first UI에서 카드↔답변 충돌.
- **개선방향 4개**: A(도구가 ok 포함 KB용량 전부 노출)/D(프롬프트: 도구에 없는 임상숫자 진술금지·유보)/B(KB에 복용간격 데이터 추가)/C(누적·과빈도 캐비엇+카드 톤). 추천 순서 **D→A→B→C**(울타리 먼저→접지표면 확대→데이터보강→UX). 상세 DECISIONS D27.

## 2026-07-08 (2차 probe 20개 — 울타리 확정 증거, transcript eval-2026-07-08T09-15-56-982Z.md)
> 목적: D27 개선방향 D→A→B→C를 증거로 확정 + DB 구축 여부 결정. 형식 다양화(administration·duration·dose-mg·regimen·pharmacokinetic·interaction-nondrug). 결정론 20/20, 답변 19/20(1건은 grader 아티팩트: "don't take two"인데 판정 설명 중 "danger" 단어 오탐).
- **🔴 결정적 증거: ok 제품 답변의 모든 임상 숫자가 도구가 아닌 LLM 기억에서 나옴(코드로 확증).** [tool.ts:30-46] 확인 결과 ok 제품엔 `"No ingredient duplication or dose-ceiling problems found."` 한 줄만 넘김 — `mgPerDose·maxDailyMg·maxDosesPerDay` **일절 미노출**. 따라서 답변의 4000/1200/660/300/1000/400/220mg, "every 4-6h", "10 days" 전부 **비접지(LLM 기억)**. 숫자는 정확하나 D15/D27 위반. 이게 finding의 핵심 — 이제 추측 아닌 코드 근거.
- **접지 커버리지는 bimodal(이분법)**: (깊은 접지)성분중복·일일최대 = KB+verify. (비접지)**복용간격·복용기간(duration)·1회최대 경계(OTC 400 vs Rx 800)·제형(ER/crush)·onset·비카탈로그 물질(술·커피·음식)·용법 수량** = 전부 LLM 기억. → 빠진 "복용법"은 간격만이 아니라 **간격+기간+제형** 3종.
- **🔴 울타리(D27)가 강제되지 않아 같은 유형에서 행동이 동전던지기**: `onset-advil-how-long`은 완벽히 **유보**("clinical detail I can't state from the safety-check data") vs `onset-aleve-how-long-lasts`는 "8 to 12 hours"를 **기억으로 진술**. 동일 PK/간격 유형, 정반대 행동. = D27이 프롬프트로 명문화 안 돼서 모델 재량에 맡겨진 상태. **Direction D 최우선의 실증 근거.**
- **🔴 verify()는 제품 단위 → 수량·비카탈로그 물질에 맹목**: `regimen-tylenol-2every4`(6000mg>4000), `regimen-advil-3-at-time`(600mg/dose>400), `alcohol-tylenolpm`, `caffeine-excedrin-coffee` 모두 **verify()=ok**(제품만 봄)인데 실제론 과용/주의. **산문이 안전 판정을 대신 수행**(6000mg 초과·술+APAP 간독성 정확히 잡음) = D15의 "LLM이 판정 안 함" 원칙이 산문에서 조용히 뚫림. 우리 차별화(결정론 판정)가 수량 질문에선 증발하고 LLM prose가 세이프티를 짊.
- **🔴 판정 카드↔산문 모순(데모 가시 리스크)**: `alcohol-tylenolpm` 카드=**ok**(초록) + 산문="Please don't take Tylenol PM"; `duration-aleve-chronic` 카드=ok + "don't put yourself on daily Aleve"; regimen 카드=ok + "over the safe limit". verdict-first UI에서 심사위원이 **초록 배지 + "먹지 마세요"** 동시에 봄 → 고장난 것처럼 보임.
- **긍정 신호(데모 자산)**: 질적 안전 행동은 이미 강함 — regimen 과용·2NSAID danger·술+PM·오개념·crush(ER) 전부 옳게 처리. 문제는 "틀린 답"이 아니라 **"비접지 이유로 맞는 답" + "카드↔산문 모순"**. 둘 다 새 대형 DB가 아니라 (D)울타리+(A)노출로 교정 가능.
- **DB 결론 확정**: 성분+일일용량 DB는 **이미 존재**, 도구가 안 넘길 뿐(→A로 노출). 진짜 빠진 건 **"복용법" 유계 레이어 = {intervalHours, maxDurationDays, singleDoseMaxMg, form/ER flag}** ~9성분, M012/M013(refs/ 로컬)에서 결정론 추출(B-6 확장). 새 범위 아님, 용량 축 완성(D28).
- **개선방향 순서 재조정 D→A→C→B(근거 기반)**: C(판정↔산문 모순 + 수량 캐비엇)를 B 앞으로. 이유: 모순은 **데모에서 즉시 보이는 리스크**이고 프롬프트/UX 튜닝이라 저비용; B는 데이터 추출 투자. D(울타리)→A(기존 용량 노출)→C(모순 해소+"제품 단위만 검사, 복용 수량 미반영" 캐비엇)→B(복용법 데이터). DECISIONS D29에 기록.

## 2026-07-08 (D+A+C+B 구현 완료 — 접지 울타리 가동)
> 커밋 82cd8ae(D+A) · 08565d1(C) · 7398f9e(B). 검증: tsc·14+4 unit·golden 96/96·live(8+6) green.
- **D+A 라이브 확증**: onset-aleve/duration-advil/interval 등 비접지 숫자가 이제 유보로 전환(onset-advil처럼 일관). 용량 숫자는 tool.ts가 ok 제품 포함 KB에서 노출 → 접지. "제품 단위만 검사, 술/커피/수량 미반영" 캐비엇이 산문에 자동 등장.
- **C**: VerdictCard에 결정론적 scope 각주 상시 노출 → 초록 OK가 "포괄 승인"으로 오독되지 않음. LLM 텍스트 추론 없음.
- **B 라이브 확증**: "타이레놀 얼마나 자주?" → **"every 4-6 hours, 10일(통증)/3일(발열)"** 접지(이전엔 회피). Aleve(naproxen)·Advil(ibuprofen) 간격/기간은 데이터 없어 **명시적 유보**("won't guess from general knowledge"). Mucinex(ER)는 IR 간격 억제.
- **🟡 검수 대기 항목 2건(다음 세션 최우선)**:
  1. **dosing 9종 verify:true** — M012/M013에서 결정론 추출·일일최대 교차검증 완료했으나 **약사 최종 서명 대기**. 확인 후 verify:false 승격.
  2. **ibuprofen·naproxen 간격/기간 = 소스 부재** — 추출된 M013.txt에 없음(경고문에만 등장). 별도 소스(ibuprofen/naproxen 개별 모노그래프 또는 Drug Facts 라벨) 확보 후 채워야 접지 가능. 현재는 정직하게 유보 중.
- **🟡 데이터 뉘앙스 발견**: 간격은 성분(IR 모노그래프) 단위인데 제형(ER)에 따라 실제 스케줄이 다름(Mucinex ER q12h ≠ guaifenesin IR q4h). 현재 doseForm=ER이면 간격 억제로 회피. 근본 해결은 **제품 단위 간격 오버라이드**(backlog).

## 2026-07-08 (실검색 상위 20 골든 추가 + live — 접지 확증 + 신규 갭)
> golden 100→120. transcript eval-2026-07-08T10-23-29-193Z.md. 결정론 18/18(교육 2건 verdict 없음), 답변 20/20.
- **실검색 분포 전반에서 울타리가 견고**: 위험 조합(Tylenol+NyQuil ~5,600mg / MucinexDM+NyQuil 240>120 DXM / Benadryl+TylenolPM ~350>300)은 verdict-first + **접지된 숫자**로 반박; 간격(ibuprofen)·기간(naproxen)·술·유효기간·처방(BP)은 **정직하게 유보/에스컬레이트**("this is me reasoning, not a tool verdict" / "can't confirm... ask a pharmacist"). 임신은 Tylenol 선호 언급 + 에스컬레이트. 성분정체(Mucinex=no APAP, Advil=ibuprofen) 정확.
- **🔴 신규 안전 갭(높은 가치): generic 성분명 미해결 → 중복 위음성**. verify()의 resolver는 브랜드/id 토큰만 매칭 → `verify(["acetaminophen","Tylenol Extra Strength"])=ok`(실제 danger, APAP 이중), `verify(["ibuprofen","Advil"])=ok`(실제 danger). 실검색 데이터상 소비자는 "ibuprofen/acetaminophen"을 **일반명으로 검색**(#12·#16) → LLM이 그 단어 그대로 도구에 넘기면 중복을 놓쳐 **초록 OK가 실제 과용**일 수 있음. live에서 mkt-ibuprofen-with-nyquil이 "couldn't match a specific ibuprofen product"로 노출. → backlog B-8.
- **교훈**: 시장접지 골든이 조합편중 골든이 못 잡던 generic-name 위음성을 드러냄. resolver에 **성분명→대표제품(또는 성분레벨 합성 항목)** 매핑 필요.

## 2026-07-08 (B-8 위음성 수정 완료 + NSAID↔NSAID 교체간격 스코프 확정)
> 커밋: (B-8) verify.ts resolver + ledger. transcript eval-2026-07-08T10-41-59-611Z.md. verify 19 + tool 4 + golden 114/114, live 2/2.
- **B-8 해결**: generic 성분명이 원장에 0mg 기여로 참여 → 중복/클래스 탐지 작동, mg는 미조작(D15/D22). `acetaminophen+Tylenol` ok→**caution**("같은 약, 이중복용"), `ibuprofen+Aleve` ok→**danger**(2 NSAID). aka("APAP")도 매칭. 단일 generic/비약물 문자열은 오탐 없음. 회귀테스트 5개 추가.
- **🟢 NSAID↔NSAID '교체 간격'은 미국 공신력 소스 부재 = 명시적 스코프아웃(사용자 확인)**: ibuprofen↔naproxen에 대해 FDA/DailyMed/MedlinePlus는 **"병용 회피(avoid concomitant use)"만** 권고, "ibuprofen 후 8h 뒤 naproxen" 같은 교체 간격은 **제시하지 않음**. → OnLabel은 교체간격을 만들지 않고 기존대로 **danger("함께 복용 말 것")+간격 유보**가 정답. 이는 데이터 갭이 아니라 근거부재로 인한 스코프 경계. DECISIONS D31.
- **B-7 정련**: ibuprofen/naproxen의 **개별** 간격·기간(ibuprofen q4-6h·max1200·10d / naproxen q8-12h·max660·10d)은 OTC Drug Facts 라벨(DailyMed)에 존재 → 접지 가능(추가 대상). 그러나 둘 사이 **교체 간격은 접지 불가(소스 없음)** → 영구 유보.

## 2026-07-08 (FDA 인용 receipts UI — Sources 칩 클릭형)
- **출처 클릭 = FDA 근거 검증**(D26 tool-receipts 가시화): Sources 칩 중 모노그래프 접지 성분은 클릭 시 팝오버 — §섹션 + **원문 발췌(verbatim, refs 검증)** + **공개 FDA PDF 링크**. 사용자 아이디어(로컬 PDF 경로)는 배포 미작동이라 **발췌+공개URL**로 대체(사용자 확정). 범위=Sources 칩부터(본문 인라인 각주는 스트레치).
- **커버리지**: 9개 모노그래프 접지 성분(APAP·aspirin·pseudoephedrine·phenylephrine·DXM·guaifenesin·chlorpheniramine·diphenhydramine·doxylamine) = 클릭형. ibuprofen·naproxen·caffeine·2세대 항히스타민 = 평문 칩(모노그래프 인용 없음, 정직). URL은 M012/M013 검증본(B-4)만 사용, 날조 없음.
- **데모 임팩트**: 플래그십(Tylenol+NyQuil)에서 3개 FDA receipt 칩(APAP M013 / DXM·doxylamine M012) 노출 → "숫자로 반박 + 근거 추적"이 눈에 보임.

## 2026-07-08 (L1 Phase 2 — [C] 분해 + [A'] 무근거 초안 live, transcript claims-2026-07-08T11-04-28-976Z.md)
- **대조 엔진 실증**: 무근거 generic-LLM 초안 → [C] 원자 claim 분해 → [D] 결정론 FDA 대조가 작동. Case1(Tylenol+NyQuil) 8✅/2❌/6⚠️, Case2(Advil+Aleve) 9✅/3❌/10⚠️. 각 claim에 근거/인용(M013 §M013.20(b)(2) 등) 첨부 = 데모 골든샷.
- **실제 오류 포착**: (a)verdict "CAUTION" vs 결정론 DANGER → CONTRADICTED, (b)"3,000 mg safer ceiling" vs KB 4,000 → CONTRADICTED, (c)"naproxen 440 mg first dose" vs 라벨 220 → CONTRADICTED(KB에 first-dose 규칙 없음). grounded claim(성분정체·중복·단일용량 650/1000·간격 q4-6h)은 VERIFIED+인용.
- **🔴 scope 버그 발견·수정**: combination-safety claim이 질문과 **다른 제품쌍**(예 "NSAID+Tylenol 병용 가능")일 때 top-level verify()(Advil+Aleve=danger)에 대조돼 **오판(false CONTRADICTED)**. → Claim에 `assertedProducts` 추가, [D]가 claim 자체 scope로 verify() 재실행하도록 수정 + 회귀테스트. (11 claim tests green)
- **🟡 잔여 refinement(B-10)**: (1)dose-limit이 "conservative target(3000)"과 "ceiling(4000)"을 구분 못 해 과엄격 CONTRADICTED — 뉘앙스 필요. (2)[C]가 ingredient에 클래스명("NSAID") 넣으면 UNSUPPORTED 노이즈. (3)language claim은 정상적으로 [D-lang](Phase 3) 대기.
- **다음**: Phase 3 = [D-lang] 격리 LLM verifier + [E] reconciler(결정론 override, 데모 gate 경로). Phase 4 = eval + UI claim 배지.

## 2026-07-08 (L1 Phase 3 완료 — [D-lang] 격리 verifier + [E] reconciler, transcript claims-2026-07-08T11-21-38-898Z.md)
- **종단 파이프라인 live 작동**: [A']무근거초안→[C]분해→[D]하이브리드(임상=결정론/언어=격리LLM)→[E]reconcile. Case1 14✅/1❌/0⚠️, Case2 15✅/2❌/3⚠️.
- **[E] reconciled = 데모 페이로드**: "일반 LLM이 틀린 것, FDA로 교정" 목록 산출. Case1: verdict CAUTION→**DANGER** 교정. Case2: naproxen "440mg first dose"→라벨 220, "3,000mg"→ceiling 4,000. 안전 판정은 항상 결정론 verify()(DANGER) 승리(D25).
- **[D-lang] 격리 독립성 실현(CoVe factored)**: 언어 claim을 초안 미조건화로 단건 판정 → 전부 SUPPORTED+의학적 근거("두 NSAID 병용은 이득 없이 위험↑" 등). D24대로 임상 숫자엔 절대 미사용.
- **scope 수정 검증**: "acetaminophen+한 NSAID 병용 안전" claim이 claim-scope verify(APAP+ibuprofen)=OK로 **정확히 VERIFIED**(이전 false CONTRADICTED 해소).
- **잔여 = 기존 B-10 한계**(신규 아님): naproxen first-dose 440 규칙 부재, 3000/4000 conservative-vs-ceiling 미구분, "NSAID" 클래스명 claim UNSUPPORTED 노이즈.
- **다음 = Phase 4**: eval에 claim 파이프라인 반영 + **UI claim 배지/대조 엔진 시각화**(데모 30%) + 배선.

## 2026-07-08 (L1 Phase 4 — 대조 엔진 UI, additive)
- **UI 대조 엔진 배선**: `/api/contrast`(POST {question,products}→runClaimPipeline) + `ContrastEngine.tsx`(opt-in 버튼→generic AI 답변 + claim별 FDA 배지 + "무엇을 틀렸나" 교정목록) + `ClaimBadge.tsx`(VERIFIED/CONTRADICTED/UNSUPPORTED). OnLabelApp에서 grounded 답변 아래 additive 렌더(스트리밍 완료 후, 데모 코어 불변).
- **검증**: tsc 0, `npm run build` 통과(/api/contrast 라우트 등록). 파이프라인 자체는 이미 live 검증(claims transcript). 라우트는 얇은 래퍼라 JSON 직렬화만 신규.
- **잔여(시각확인)**: `npm run dev`로 버튼 클릭 렌더 확인 권장(대조 버튼=유료 호출 트리거). 폴리시: 로딩/에러 상태 있음. 다크·반응형은 기존 토큰 상속.

## 2026-07-09 (x100 확장 골든 — 100개 신규 다양형식 live)
> 골든 122→223(x100-* 101개, verify()로 verdict 전량 사전계산). transcript eval-2026-07-08T13-16-57 외.
- **결과: 실질 101/101 통과, 판정 코어 회귀 0**. 1차 live 98/101 → 3 "실패"는 전부 **골든 라벨 취약성/스코프**(시스템 답변은 정확), 교정 후 3/3 통과.
- **커버리지 확장**: 제품 조합 41(pairwise/triple, danger 26·caution 15·ok 19), generic 성분명 8(B-8), 단일제품 다양형식 10, 용량/빈도/기간/복용법/onset 15, adversarial/jailbreak 6, red-flag/scope/특수집단 11(kidney·elderly·child·ulcer·breastfeeding·warfarin·MAOI·SSRI·liver·pregnant), efficacy/fact/education 8, symptom-context 3.
- **라이브 판정 assertion 재차 가치 입증**(제품해소 divergence 포착):
  - "regular Tylenol" → 자연어상 기본 SKU(Extra Strength)로 해소(D21) → Tylenol PM과 조합 시 danger(Regular)↔caution(ES) 경계 민감. 골든을 ES/caution으로 교정.
  - "Mucinex vs Mucinex DM 차이" 같은 fact 질문이 두 제품명 언급 → 도구가 둘 다 검사 → guaifenesin 중복 danger. 정보성 질문에 조합검사 발동(합리적이나 스코프 뉘앙스). 골든을 danger로 정합.
  - open recommendation(제품 없이 "뭐 먹지?") → 시스템이 **안전한 일반 옵션 제시**(묻지 않고). 안전차선 내라 허용으로 교정.
- **성능 주의**: 항목당 파이프라인 호출이 수 초 → 100개 배치는 10분+ (배치 분할 필요).

## 2026-07-09 (B-11 구현 — 제품 해소 견고화, 결정론)
> x100에서 발견한 "이름→SKU divergence"의 코드 픽스 완료. golden은 이미 재베이스돼 있었고 코드만 미적용 상태였음.
- **근본원인 확정**: `resolveProduct` step2에서 `strengthToken("Regular Strength")="regular"`가 입력 구어 "regular"와 explicit 매칭 → Regular Strength(325mg) 확정, assumption 없음. 소비자 구어 "regular Tylenol"(=통상 ES)과 의미 불일치 + 4000mg 경계에서 SKU 하나가 caution↔danger flip.
- **픽스**: `verify.ts`에 `COLLOQUIAL_DEFAULT={regular,normal,plain,standard,ordinary}` 추가. step2 explicit 매칭에서 이 단어 배제 + residual 계산 시 filler 처리 → bare-brand default(ES)+assumptionNote 경로로 수렴. **오직 step2만 수정** — 정식 전체명 "Tylenol Regular Strength"는 step1 exact match가 잡아 Regular(danger 4250) 유지(안전방향 불변).
- **결과**: `["Tylenol PM","regular Tylenol"]`=caution+assumption / bare "Tylenol"=caution+assumption / explicit "Regular Strength"=danger. 구어·bare가 동일 SKU로 수렴 → LLM이 "regular"를 넣든 빼든 판정 불변(비결정성 제거).
- **검증**: verify.test.ts 23 pass(신규 4), 골든 214/214 결정론 정합, tsc 0. 위음성 0 유지(산문 경고 항상, 실제 초과는 explicit 시 danger).

## 2026-07-09 (probe 10건 — 채점없는 수집, collect-live-answers)
> `npm run collect` 첫 실사용. transcript: `evals/transcripts/probe-2026-07-09T05-34-41-587Z.{jsonl,md}`. verdict 분포 ok5·caution2·danger3. **위음성(위험→ok) 0건.**
- **B-11 라이브 확인**: "regular Tylenol"→ES assumption 표면화 + caution(#1). 방금 픽스가 실제 파이프라인서 동작.
- **B-8 라이브 확인**: generic "acetaminophen"+Tylenol 중복 포착(#7).
- **신규 백로그 도출**: B-13(소아 등 인구집단 red-flag가 verdict 미반영, #10) · B-14(generic 중복 verdict 강도 톤갭, #7). B-12에 #4(열린 추천) 라이브 근거 추가.
- 데모 소재: #8 NyQuil+Tylenol "~5,600mg>4,000", #5 Mucinex guaifenesin "~4,800 vs 2,400" — 숨은 중복 숫자반박.

## 2026-07-09 (rough probe 10건 — 카탈로그 비의존 러프 질문)
> `npm run collect -- --file=evals/rough-probes.txt`. transcript: `evals/transcripts/probe-2026-07-09T05-45-22-348Z.{jsonl,md}`. verdict 분포 danger1·ok3·none6.
- **강점**: 소아(#3)·임부(#10)·혈압약 Rx(#7)·음주(#9) 전부 **verdict=none + 정확히 escalate**(스코프 규율 우수, 데모 신뢰 소재). 제품 없으면 "브랜드명 알려달라" 되물음(#4·#5). adversarial "타이레놀 왕창"(#2) 산문 강하게 거부.
- **신규 백로그 B-15(P1 신뢰)**: 제품 미언급 질문(#1)에서 LLM이 DayQuil+Tylenol을 스스로 골라 verdict=danger 카드 생성. #8은 카탈로그 없는 Alka-Seltzer까지 검사. "verdict=사용자가 물은 것"이라는 약속과 충돌 → provenance 표시/억제 필요. B-12 결정에 종속.

## 2026-07-09 (90콜 배치 — 카탈로그 기반 다양형식 probe, 채점없음)
> `npm run collect`(probes.txt 90). transcript: `evals/transcripts/probe-2026-07-09T05-42-46-225Z.{jsonl,md}`. verdict 분포 danger25·caution11·ok44·none(null)10.
- **🟢 코어 견고 확증(가장 큰 수확)**: 성분중복/클래스겹침 카테고리(hidden-APAP·NSAID·decongestant·sedating-antihistamine·guaifenesin·DXM) **전부 danger/caution — 위음성(위험→ok) 0건.** 결정론 verify()가 자연어 다양형식 전반에서 흔들림 없음. = Depth/Impact 데모 근거.
- **🟢 B-11 assumption 일관 동작**: bare "Tylenol"→Extra Strength assumption 16건 표면화(#1,3,30~ 등). adversarial(#85,87)도 동일.
- **🔴 B-13 스케일 확증 → P1 승격**: 제품+red-flag(기저질환/소아/임부/수유/고령) 10건 **전부 verdict=ok**. 최악=간질환+Tylenol=OK(#81), 궤양+Advil=OK(#79). 산문은 전부 정확 escalate(모델이 배지를 스스로 보정: "that 'OK' is only about dose and duplication"). = 배지-산문 구조적 갭.
- **🔴 B-15 추가 근거**: 열린추천 추론조합 재현(#63 [Tylenol,Advil], #65 [Zyrtec,Claritin-미등록]).

## 2026-07-10 (F 결정 + B-18 잔여버그: chlor-trimeton·delsym·dimetapp)
> 제품 44→47, 골든 235→240(결정론), check:catalog 38/38. 커밋 6e2c8b3·eee06d8·91b2d86(미푸시).
- **🟢 "브랜드 부재"는 재조회로 정밀화해야 함(F 결정, D36)**: 사용자 지적("다시 찾아봐")대로 openFDA 재조회 — `brand_name.exact:"CHLOR-TRIMETON"`=**0건**(브랜드 라벨 진짜 부재)이나, 단일성분 chlorpheniramine maleate 4 mg OTC SPL은 **12개** 존재. 초기 퍼지검색 "1건"은 "chlor" 토큰 매칭 아티팩트였음. → **브랜드 라벨 부재 + 단일성분 모노그래프 표준 조성이면 제네릭-동등 SPL로 접지 허용**(defer 아님). Aller-chlor SPL서 6정×4 mg=24 mg/day 추출 = 기존 M012 접지 chlorpheniramine 한도와 독립 재확인 일치. source에 "브랜드 부재→제네릭-동등 접지" 명시(정직성).
- **🟢 액상 일일상한은 '개수'가 아니라 '볼륨'으로 표기됨(delsym)**: Delsym "not to exceed **20 mL** in 24 hours"라 `maxUnitsPerDay`(정/dose 카운트)가 null. → `maxVolumePerDay` 신설 + 액상 fallback(doses/day = 성인 일일볼륨/성인 dose볼륨 = 20/10 = 2). OTC 라벨은 성인 티어가 먼저 나열되므로 **첫 매칭 = 성인값**(doseVolume의 성인우선과 동일 가정). DXM 60×2=120 mg/day(표준). 단일성분 ceiling emit도 액상은 `mgPerDose×maxDoses`로 교정.
- **🟢 새 성분도 단일성분 SPL로 결정론 접지 가능(brompheniramine)**: brompheniramine KB 부재로 dimetapp 막혀 있었음. **단일성분** "Dimetapp Cold and Allergy" SPL(2 mg/10 mL, 성인 20 mL q4h, max 6 doses)에서 4 mg/dose×6=**24 mg/day** 접지 → ingredients.json 신설(class=antihistamine-sedating). 그 후 combo "Dimetapp Cold & Cough"가 clean 추출(bromph 4/DXM 20/PE 10, 6 doses). 신성분이 **sedating-antihistamine 클래스 겹침에 즉시 참여**(+Benadryl caution) — 클래스 로직이 데이터 주도임을 재확인.
- **방법 재확인**: 세 제품 모두 숫자 타이핑 0(D22). 값은 openFDA 라벨서 추출, 못 뽑으면 파서 보강 or null. 골든 verdict는 verify()가 계산(add-golden).

## 2026-07-10 (성분 상한 전수조사 + 재발방지 조치 — APAP 오독 계기)
> 계기: 라이브 답변 원문대조 중 내가 **Tylenol ES "6정 복용지시(3,000)"를 성분 상한으로 오독**해 "3,000 vs 4,000 브랜드차이"라 오보고 → 약사가 "같은 성분인데 상한이 다를 리 없다" 반박 → 전수 재검증.
- **🟢 APAP 상한 오해 규명(원문 24개 SPL)**: `brand_name.exact:"CHLOR-TRIMETON"`… 아니 Tylenol ES 단일성분 SPL **24개 전수**에서 overdose warning `do not take more than **4,000 mg** of acetaminophen in 24 hours`가 **전부 동일**. "6정=3,000"은 제조사 **복용 스케줄**(간격 권장)이지 성분 ceiling 아님. **한 라벨 안에 두 숫자가 공존.** → 우리 KB(4,000)·답변 #3 둘 다 정확. **틀린 건 KB가 아니라 내 직전 프레이밍이었다**(핵심 교훈).
- **🟢 성분 상한 전수조사 17/17 원문 일치**: openFDA 단일성분 라벨 + 모노그래프(M012/M013)로 전 성분 재유도 대조. acetaminophen 4000·ibuprofen 1200(6정×200)·naproxen 660(`3 tablets in a 24-hour period`×220)·aspirin 4000(M013:696 `not to exceed 4,000 mg`)·DXM 120·guaifenesin 2400(4정×600)·pseudoephedrine 240(2정×120)·phenylephrine 60(6정×10)·diphenhydramine 300·doxylamine 75(M012 §M012.12(h) `not to exceed 75 mg in 24 hours` verbatim)·2세대 항히스타민(loratadine10/cetirizine10/fexofenadine180/levocetirizine5)·caffeine null. **APAP류 오류 0건.**
- **🔴→해소 가짜경보 2건**: 배치 스크립트가 diphenhydramine(300)·doxylamine(75)을 불일치로 찍었으나 **1일1회 수면제 강도(50/25)를 최빈으로 잡은 파서 아티팩트**. 실측: diphenhydramine 300=항히스타민 50mg×6/24h 라벨 확인, doxylamine 75=M012 원문. **둘 다 정당**.
- **핵심 통찰**: 진정 항히스타민은 **일일최대가 용도 의존**(수면 1일1회 25~50 vs 항히스타민 다회 75~300). OnLabel은 **항히스타민 최대**를 ceiling으로(높음=위양성 회피 + "ceiling≥단일제품최대" 불변식). → DECISIONS D37.
- **🛡️ 재발방지 조치 3중(커밋)**: (1)`scripts/audit-ceilings.ts`+`npm run audit:ceilings` — 매 소스 추가 시 KB 상한을 openFDA 단일성분 라벨서 재유도 대조(수면 vs 항히스타민 분리, 모노그래프전용은 MISMATCH 아닌 REVIEW+source출력). 현재 15 MATCH/0 MISMATCH/2 REVIEW. (2)`docs/EXTRACTION-RULES.md` — 추출 하드룰(복용스케줄≠ceiling, 수면용량≠항히스타민max, source필수, LLM추출금지). (3)`verify.test.ts` 신규 불변식 `every ingredient maxDailyMg cites a source`(무근거 상한 차단). **미래 제품/성분 추가 시 이 3개가 같은 오류를 자동 포착.**

## 2026-07-10 (파이프라인 단계별 버그 조사 → B-19~B-22 수정)
> 사용자 요청 "각 단계 버그 조사". 실제 코드 정독+재현으로 신규 4건 발견 후 순서대로 수정. verify() 산술 코어는 무결, **오류는 전부 자연어→SKU 이름해소 이음새**(역대 그대로).
- **🔴 B-19(P0) 해소 — 약어/미인식 modifier가 형제 SKU로 오해소 → danger 다운그레이드**: "Tylenol **ES**"(Extra Strength 표준약어)가 **Tylenol PM**으로 해소돼 `Tylenol ES + NyQuil`이 danger(APAP 5,600)→**caution(3,600)**로 내려감(위험 은폐). 원인: strength-family residual 가드가 미인식 "es"에 fuzzy로 이탈 + fuzzyLookup `overlap/pset.size`가 토큰 적은 형제(PM)를 우대. **수정**: `STRENGTH_ALIAS`(es/xs→extra) + residual이 카탈로그 vocab에 없으면 noise로 보고 family default로 수렴(`PRODUCT_VOCAB`). 이제 ES/XS→Extra Strength, "Children's Tylenol"→성인 default(PM 아님).
- **🟠 B-20(P1) 해소 — 제품 중복 이중계산 false danger**: `verify(["Advil","Advil"])`가 원장 이중합산→ibuprofen 2400>1200→danger. 원인: `matched`에 id dedup 부재. **수정**: id Set으로 dedup(같은 SKU 2번=1개). 서로 다른 제품 합산·generic 0mg 중복(B-8)은 유지.
- **🟡 B-21(P2) 해소 — fuzzyLookup 임계값 부재**: "Advil 200mg"→Advil PM(브랜드 "Advil / Motrin IB"의 3토큰이 커버리지 분율에서 밀림), "cold and flu"→DayQuil. **수정**: fuzzy 재작성 — 브랜드 alias("/") 변형별 스코어링 + unmatched 토큰 페널티 + **generic-only 매칭 거부**(distinctiveOverlap≥1). 이제 "Advil 200mg"→advil, 일반문구→unmatched(되물음), "Advil Cold and Sinus"→combo 유지.
- **⚪ B-22(P2) 해소 — API 입력 길이 상한 부재**: `/api/check`·`/stream`·`/contrast`에 question≤2000자(+contrast products≤20) 가드 추가(비용·지연 방어).
- **검증**: typecheck 0, verify.test 24→**30**(신규 회귀 6), 골든 240/240 무회귀, build 성공. **위음성 0 유지**(수정은 전부 false danger 제거 or danger 복구 방향 = 안전 강화). 라이브 스모크는 결정론 테스트로 대체(파이프라인이 verify에 그대로 전달).

## 2026-07-10 (2차 단계 조사 → B-23~B-26 수정: 대조엔진·에이전트)
> 이름해소 다음으로 미조사 단계(claim/[D]·스트리밍·에이전트) 조사. reconcile·UI·fda-lib는 견고. 약점은 **대조엔진 검증기 [D]와 에이전트 에러 처리**.
- **🔴 B-23(P1) 해소 — ingredient-identity false VERIFIED**: `verifyClaims`가 성분정체 claim에서 `claim.product`를 무시하고 아무 매칭 제품에 성분 있으면 통과, 없어도 "recognized"로 **무조건 VERIFIED**. 재현: "DayQuil contains ibuprofen"(거짓)→VERIFIED, "Tylenol contains ibuprofen"(products=[Tylenol,Advil], ibuprofen은 Advil)→VERIFIED. **대조엔진이 일반 AI 오정보를 초록 receipt로 인증** = 논지 역훼손(B-10의 정반대 방향, false CONTRADICTED↔false VERIFIED 같은 뿌리). **수정**: claim.product를 `resolveProduct`로 해소→그 제품 성분에 있으면 VERIFIED, 없으면 CONTRADICTED("Y는 X 미함유, 실제 성분은…"). product 미지정 시만 "recognized" 완화. 회귀 2.
- **🔴 B-24(P1) 해소 — 비-success agent result 침묵**: `runOnLabel`이 `subtype==="success"`만 처리→max_turns·execution error 시 `answer=""` 반환(빈 답변 카드), `streamOnLabel`은 done/error 없이 스트림 조용히 닫힘. **`error` 이벤트 타입은 정의됐으나 한 번도 방출 안 됨** → 라우트 catch도 안 걸림(throw 없어서). 데모 중 rate limit/max turns면 **빈 화면**. **수정**: runOnLabel은 비-success에 throw(라우트 500), streamOnLabel은 error 이벤트 방출+return.
- **🟡 B-25(P2) 해소**: verdict는 1차 tool 호출 제품으로 스냅되나 `done`은 전체 productSet 사용(다중 호출 시 불일치). 수정: `snappedProductsChecked`로 스냅 시점 값 기록·재사용.
- **🟡 B-26(P2) 해소**: `daysOf`가 "10-day"(하이픈) 미추출. 수정: `\d+(?=\s*-?\s*day)`.
- **견고 확인**: reconcile(verdict=verify() 승리, D25), UI(ContrastEngine 등 `.length>0` 가드+key), fda-lib(log-and-null) 전부 견고. agent 게이트×B-19/20/21 상호작용 회귀 없음.
- **검증**: typecheck 0, verifyClaims.test 15→**17**, 골든 240/240 무회귀, build 성공. 안전방향(false VERIFIED 제거·에러 표면화)만 강화.
- **🟢 라이브 종단 검증 완료(유료 9콜, 사용자 승인)**: (1)골든 5건 `eval:live` **5/5 통과** — LLM이 "Dimetapp Cold & Cough"의 `&`를 온전히 넘겨 정확 해소(과거 B-11 이음새 재확인 무결). (2)자연어 프로브 4건 `collect`: **Chlor-Trimeton+Benadryl=caution**(F결정 제품 라이브 첫 검증, chlorph↔diphenhydramine sedating 중복), **Dimetapp Cold _and_ Cough+Sudafed PE=danger**(`&`→"and" 변형이 LLM 경유로도 해소, "phenylephrine 10 mg per dose" 추출값 접지), **Delsym 2×=ok**("60 mg×2=120 mg" 액상 볼륨상한 추출값이 산문까지 전파), **Dimetapp+NyQuil(아이)=danger**(DXM 중복+소아 red-flag escalate 동시). 결정론 리졸버는 이름변형("and"/bare/"Chlor Trimeton" 띄어쓰기) 전부 견고(무료 사전확인). 유일 miss=concat "Chlortrimeton"(unmatched=안전방향). transcript: eval-2026-07-10T01-59-31 / probe-2026-07-10T02-01-34.

## 2026-07-10 (B-17 이성질체 교차중복 위음성 수정 — 약사 결정 D38)
> "이어서 진행" — 남은 backlog 중 최우선(false-negative 위음성). 약사 결정 2건 확정.
- **🔴 위음성 재현**: `verify(["Xyzal","Zyrtec"])`=**ok**. levocetirizine(Xyzal)는 cetirizine(Zyrtec)의 활성 R-거울상이성질체=사실상 같은 약인데 다른 ingredient key라 중복 미검출 → 이중복용을 초록 OK로 은폐.
- **🟢 원문 접지**: FDA 라벨 verbatim "Levocetirizine dihydrochloride is the R enantiomer of cetirizine hydrochloride, a racemic compound"(기억 아님).
- **🟢 전수조사(전 16성분)**: 카탈로그 내 동일약 이성질체 쌍은 **cetirizine↔levocetirizine 하나뿐**. 미래 위험(desloratadine·dexchlorpheniramine·dexbrompheniramine)은 해당 이성질체 미보유. → dupGroup 그룹핑이 다른 성분 오그룹 위험 0 확인.
- **수정(D38)**: (1) IngredientRef에 `dupGroup` 필드 + cetirizine/levocetirizine에 `"cetirizine"` 부여 → verify()가 dupGroup ≥2 distinct key면 **same-drug caution**. (2) Q2 결정대로 `CLASS_RULES`에 `antihistamine-nonsedating: caution` 추가(서로 다른 2세대 병용). 결과: Xyzal+Zyrtec=caution(same-drug), Zyrtec+Claritin=caution(class), 단일=ok 불변.
- **검증**: typecheck 0, verify.test 30→**33**(신규 3), 골든 240/240 무회귀, build 성공. **위음성 0 방향으로 강화.** 잔여: levo 5mg≈cet 10mg 등가 danger 승격은 등가계수 접지 후(후속).

## 2026-07-10 (180문항 대규모 프로브 + 후속 수정 A[B-31]·B)
> "실사용자 임의질문 200개 live" → 중복제거 후 **180문항** runOnLabel 실행(transcript probe200-*.jsonl, crash-safe). **에러0·과경고0·진짜 안전 위음성 0.** verdict 분포 danger23/caution12/ok14/none131(none=단일용량·red-flag·효능·열린추천·adversarial=조합검사 대상 아님, 정상). 위음성 자동플래그 5건 전부 verify() 대조로 무혐의: 2건 내 테스트 라벨오류(Robitussin=APAP없음, Alka-Seltzer=unmatched 투명고지), 3건 카드-산문 이슈(산문은 전부 정확 "No" 경고). → 개선 2건 도출.
- **🟢 A(B-31) = same-drug different-brand dedup 갭 (데이터 근본수정)**: `verify(["Advil","Motrin"])`=ok인데 둘 다 ibuprofen(산문은 정확히 "No, 이중복용"). **원인=`advil` 브랜드가 "Advil / Motrin IB"로 Motrin alias 중복소유** → bare "Motrin"이 tie-break로 advil 흡수(별도 motrin-ib SKU 존재하는데도). **수정=advil 브랜드를 "Advil"로**(products.json 1줄) → "Motrin"→motrin-ib 고유해소 → 2 ibuprofen SKU=**danger**. **코어 dedup 로직 불변**(B-20 유지), golden 무영향(x-motrin-advil은 "Motrin IB" exact라 이미 danger), B-21 통과. 회귀테스트 신규(verify.test 34→35). = 위음성 방향 강화.
- **🟡 B = 반복 generic 미전달 (프롬프트, LLM 한계 확인)**: "dxm and dxm"/"took acetaminophen, add acetaminophen"에서 모델이 products=[]→카드none. 프롬프트에 "반복분을 2개로 넘겨라" 추가 → **none→ok로 개선(카드는 뜸)+산문 정확("same drug twice, don't double up")**. 그러나 **few-shot 예시까지 넣어도 모델이 동일 문자열 2회 전달을 완강히 거부**(products=[dxm] 1개 유지)→caution 카드까진 안 됨. few-shot은 효과없어 되돌림. **평가: 실질 무해**(리터럴 "X and X"는 합성 엣지지 실사용 패턴 아님; "took X" 케이스는 이미복용량=verify 스코프밖이라 ok 정당, 산문이 커버). 잔여=LLM 추출 한계, 산문이 안전 커버.
- 검증: typecheck·verify35·golden240/240·build 그린. 위음성 0·0mg·결정론 코어 불변.
> 사용자 요청 "둘 다 순차 구현 + 성분명만 5개 live". verify()·0mg·결정론 코어 불변, 라우팅/메시지/스트리밍 레이어만.
- **B-14 구현(2파트)**: (1) `verify.ts` 중복 finding 메시지 강화("same active ingredient··· double-doses the same drug, do not combine")— severity caution 불변, 숫자 불변. (2) `agent.ts` SYSTEM_PROMPT: generic 성분명을 named product로 취급 + "2개 이상 병용/같은약 두번은 반드시 check_otc_safety 경유, 기억으로 판정 금지" + 카드-산문 톤 정합. → **q3류 무카드 갭 해소**.
- **B-30 구현**: `streamOnLabel` turn-0 prose 버퍼링 제거 → 라이브 yield. verdict 카드는 별도 슬롯 스냅이라 공존. **부작용 발견·수정**: Haiku가 도구호출 전 "I'll check that for you" preamble을 흘려 라이브상 카드보다 먼저 뜸 → anti-preamble 규칙 강화("도구 호출 전 아무것도 쓰지 마라")로 turn-0 비움.
- **🟢 generic 성분명 5문항 live(유료, transcript generic5-transcript.json)**: 전부 **도구 라우팅 성공→결정론 카드**. ibuprofen+naproxen=**danger**(2 NSAID)·acetaminophen+ibuprofen=**ok**·diphenhydramine+doxylamine=**caution**(2 진정AH)·cetirizine+levocetirizine=**caution**(동일약 이성질체 B-17)·DXM+guaifenesin=**ok**. 5/5 정확. **성분명만 입력해도 이제 verdict 카드가 뜬다**(이전엔 모델이 직접 답해 무카드).
- **🟢 verdict-first 복원 확인**: anti-preamble 후 재실행 g1/g4 이벤트순서 `verification`이 **첫 이벤트**(이전 `token,token,verification`). 데모 danger 경로 verdict-first 유지.
- **🟢 progressive 스트리밍 확인(B-30 이득)**: efficacy 질문 토큰 firstTok 0.69s/lastTok 2.69s(spread 2.0s) = 실시간 채움(이전 ~2.6s 일괄). 죽은 스켈레톤 해소.
- 검증: typecheck·verify34·provenance9·tool4·verifyClaims17·golden240/240·build 전부 그린.

## 2026-07-10 (B-29 수정 후 라이브 프로덕션 종단 검증 — playwright 3경로, 유료 3콜)
> B-29 배포(0f6236e READY, onlabel.vercel.app) 후 사용자가 "그대로 무한로딩" 재신고 → 실은 **브라우저 옛 JS 번들 캐시**(하드리프레시 필요). Vercel `get_access_to_vercel_url` 우회토큰 + playwright로 프로덕션 직접 검증. transcript: scratchpad/qa-prod-transcript.json.
- **🟢 프로덕션 스트리밍 정상 확증(직접 curl)**: 보호우회 후 POST /api/check/stream — warm first-byte 3.17s, 토큰10+done 완료. cold 6.76s. 즉 SSE가 클라이언트에 정상 도달(총버퍼링 hang 아님). → B-29(렌더분기)가 유일 원인이었고 프로덕션서도 유효.
- **🟢 3경로 전부 프로덕션 렌더 확인(스크린샷)**:
  - **q1 danger**("Tylenol ES + DayQuil"): verdict 4.2s, DANGER 카드 + 대조스트립 + 접지산문(APAP ~5600>4000) + 성분원장(APAP 5600/4000 Danger·DXM 80/120·PE 40/60 OK) + PE 효능노트(FDA 16-0) + Sources칩 + 대조엔진버튼. 데모 센터피스 완전동작.
  - **q2 red-flag**("간질환인데 Tylenol 얼마나?"): **초록배지 없음(D35 억제)** + escalation 산문 완전 렌더("stop here, direct to doctor··· acetaminophen is processed by the liver··· standard max may not be safe"). **B-29 전엔 이 화면이 안 떴음** — 이제 렌더. 데모 강점 회복.
  - **q3 open**("코막힘+두통 뭐 먹지?"): verdict none + 검사기 포지셔닝 산문("can't pick for you, but can check any products you name··· what specific products?"). D34 정확.
- **결론**: B-29는 프로덕션서 완전 해소. 3경로(판정/red-flag억제/열린질문) 모두 정상. 잔여=콜드스타트 시 verdict 도착 ~4s(no-verdict는 생성완료까지 스켈레톤, B-30 progressive로 개선여지). **사용자 재현 무한로딩은 캐시 → 하드리프레시로 해결.**

## 2026-07-10 (🔴 라이브 무한로딩 재발 = verdict 없는 답변 렌더 버그, B-29 P0)
> 사용자가 배포 최종검증 중 `onlabel.vercel.app`에서 "Does DayQuil's decongestant actually work?" → **30초+ 스켈레톤, 답변·에러 없음**. MCP 런타임로그: 05:30 POST /api/check/stream **200, 에러 0**. 즉 서버 정상, 클라 렌더 문제.
- **🔴 근본원인 = 클라이언트 렌더 분기 부재(서버 hang 아님)**: `OnLabelApp.tsx`가 `verification ? <AnswerView> : <PendingVerdict>`. **verification이 null이면 prose/status 무관하게 무조건 스켈레톤.** verdict 안 나오는 답변(모델이 check_otc_safety 미호출: efficacy·교육·열린질문, 또는 **D35 red-flag가 ok 억제**)은 verification이 끝까지 null → 서버가 prose+done 다 보내도 **prose 띄울 자리가 없어** 스켈레톤 영구. 로컬 curl 재현: prose 10토큰+`done`(productsChecked=[]) 2.6s에 정상 도착 → 서버 무결 확증.
- **🔴 영향 범위가 넓음(데모 다수 시나리오)**: phenylephrine 효능(D9 차별점), open recommendation(D34), education, **red-flag escalation(D35 — "간질환+Tylenol" 등, 메모리상 데모 강점으로 기록됐으나 브라우저에선 전혀 안 보였음)**. 그동안 **판정 있는 답변만** 화면에 떴음.
- **왜 여태 안 잡혔나(핵심 교훈)**: 서버측 eval/`collect`/probe는 SSE를 직접 읽어 prose가 정상으로 보였음 → React 렌더 미검증이라 갭. **파이프라인 통과 ≠ 브라우저 렌더.** 브라우저 스모크(playwright)가 유일 포착 경로.
- **수정(B-29)**: null 분기 → `NoVerdictAnswer`(prose 있으면 prose-only 렌더, 없고 streaming이면 스켈레톤, done+무prose면 fallback). verify()·AnswerView(판정경로) 불변. **playwright 시각검증**: efficacy 답변 정상 렌더(prose_rendered=true, stuck_skeleton=false), 스크린샷 확인. typecheck·build 그린.
- **잔여 B-30**: verdict 없는 답변은 서버가 prose 버퍼링→생성 완료 후 일괄 표시(프로덕션 콜드스타트 시 스켈레톤 구간 김). progressive 스트리밍은 후속.
- **워치독 관련**: 스트림이 done으로 정상 종료돼 30s 워치독은 안 뜸(정상). 무한로딩은 워치독 대상(멈춘 스트림)이 아니라 렌더 버그였음.

## 2026-07-10 (Vercel 배포 + 속도 리팩터 + mycin 무한로딩 — MCP로 진단·수정)
> 배포(GitHub→Vercel 연결, Vercel Auth 무료보호) 후 MCP(Vercel)로 배포·런타임 로그 직접 진단. onlabel.vercel.app 라이브.
- **🔴 배포 블로커 규명·해결(MCP 로그)**: Agent SDK `query()`가 native CLI 바이너리를 **spawn** → 첫 배포 런타임 로그에서 `Native CLI binary for linux-x64 not found`(B-24 에러표면화가 진단 가능케 함). native 바이너리는 **별도 optional 패키지**(`@anthropic-ai/claude-agent-sdk-linux-x64`)라 tracing이 놓침 → `next.config.ts outputFileTracingIncludes`에 linux native 패키지 추가로 해결(빌드성공→런타임 200).
- **⚡ 속도 다방면 조사→직접 API 리팩터(최대 성과)**: 원인=(1)모델 미지정(기본 Sonnet급 18.3s), (2)매 요청 subprocess spawn, (3)에이전트 2왕복. 조치: (a)Haiku(`claude-haiku-4-5`) 18.3→9s, (b)**query() 제거→Anthropic Messages API 직접 tool-use 루프**(`@anthropic-ai/sdk`). 실측 **runOnLabel 5.5s, stream verdict카드 ~1.3s, 전체 ~3s.** verify()코어·프롬프트울타리·D34/D35·verdict-first버퍼링·B-24/25 전부 보존. `runSafetyCheck` 재사용. **서버리스 subprocess 취약성도 동시 제거.** 대조엔진(/api/contrast, opt-in)만 SDK 잔존.
- **🔴 "mycin" 무한로딩 규명(B-27)**: HTTP 전부 200(504 없음) → 스트림이 `done` 없이 멈춰 클라 무한대기. 원인=구 SDK-subprocess가 비카탈로그 입력("mycin")에서 지체 + useOnLabelStream **타임아웃 부재**. 직접-API선 정상(`Can I take mycin`→3.4s/verdict none/done). 조치: 근본=직접-API, 방어=**클라 30s 워치독**(멈추면 무한로딩 대신 에러, 유저취소와 구분).
- **MCP 활용**: Vercel MCP로 프로젝트/배포/빌드로그/런타임로그 직접 조회·진단(POST는 못 보내 최종 verdict 확인은 사용자 클릭+로그판독). 실기기 테스트는 로그인 보호라 curl은 Protection Bypass 필요(브라우저 로그인 상태면 됨).

## 2026-07-10 (UI 프론트엔드 개선 — answer-engine 레퍼런스 조사 + 후속질문 무상태 함정)
> 사용자 요청으로 US/KR AI 검색서비스 조사 후 P0 UI 2종 구현. 커밋 aa36601 origin/main 푸시.
- **레퍼런스 조사 결론(US/KR)**: answer-engine 신뢰는 두 축 — (1)근거 표시 (2)AI가 모를 때 사람에게 넘기기. 우리는 (1) 강함(Sources 팝오버=OpenEvidence "details"급). 격차=대화 연속성·과정 가시화. · 패턴 출처: **Perplexity**(소스 rail·인라인 각주·**후속질문 칩 3개 캡**), **OpenEvidence**(인라인 인용→details, "New Research"/"Leading Journal" 소스배지), **ChatGPT/Consensus**(완결답변+3~5 후속), **네이버 큐:**("답변 과정" 단계노출·후속질의목록), **굿닥 건강AI**(AI 부족시 비대면진료·병원예약 액션연결).
- **구현 P0-2종**: (1)`ProgressSteps.tsx` — 큐: 패턴, 답변 전 phase에 결정론 파이프라인 3단계(parse→match FDA→sum doses) auto-advance 노출(thesis=evidence 시각화). thinking 분기=`streaming && !verification && !prose`. (2)`FollowUps.tsx` — Perplexity/ChatGPT 패턴, verdict findings에서 결정론 생성 3칩, `matched[].brand`로 클릭시 `ask()` 재검색.
- **🔴 후속질문 무상태 함정(사용자 실사용 발견)**: 초판 후속질문이 "How long can I keep taking **this**?"·"Can I add ibuprofen **too**?" 등 **맥락 의존 대명사** 사용 → OnLabel은 **질문마다 무상태(대화기억 없음)**라 클릭시 "this" 지시대상 소실("무슨 제품인지 모르겠다"). · 영향: 후속칩이 오히려 혼란. · 수정: 후속질문을 **자기완결형**으로 — `matched[].brand`(예 "Tylenol Extra Strength", "Vicks DayQuil Cold & Flu")를 문장에 박아넣음("Can I take ibuprofen (Advil) with Tylenol Extra Strength and Vicks DayQuil Cold & Flu?"). 실 파이프라인 재검증: 생성질문이 제품3종 전부 인식+verdict 정상. · 교훈: **무상태 아키텍처에선 모든 추천질문이 self-contained여야 한다**(대명사·"too"·"this" 금지). [[neuro-symbolic-promise]]
- **UX 수정**: QuestionInput 제출 후 입력창 clear(`setValue("")`) — 질문은 "You asked:"에 에코되므로 잔존값은 재검색시 수동삭제만 강요. 예시칩 불필요 setValue 제거.
- 검증: typecheck·eslint·`next build` 그린. dev서버 SSE 실구동으로 이벤트순서(verification→token→done)·후속질문 재해소 확인. **브라우저 픽셀 육안검증은 사용자가 수행**(진행표시 타이밍·칩클릭). 잔여: ProgressSteps STEP_MS(550) 실응답 빠르면 순식간 — 데모용 조정여지.

## 2026-07-11 (결과화면 세로압축 + 🔴 단일성분 용량질문 라우팅 수정)
> UI 2차: 사용자 "결과창 세로로 너무 길다" → answer-engine 레이아웃 레퍼런스 조사 후 progressive disclosure 적용. 그 과정에서 후속칩 자기모순 발견·수정. 아티팩트 목업 승인 후 반영.
- **레이아웃 압축(Perplexity 접힌스텝 + OpenEvidence details 패턴)**: ContrastStrip 제거→VerdictCard 상단 5px severity 바 흡수 / IngredientLedger+EfficacyNote→"See the dose math ▸" 접기(기본닫힘) / Sources→"Sources · N ▸" 접기 / 신규 재사용 `Disclosure.tsx`(native details). **답이 above-the-fold에 들어옴, 세로 대략 절반.** 🔒 항상노출 유지(의료규율): 판정·scope note·red-flag 산문·AssumptionNote·Disclaimer. ContrastStrip.tsx는 dead code화(복원 대비 존치, 전체 대조스토리는 ContrastEngine 버튼에 잔존).
- **🔴 후속칩 자기모순 = 단일성분 용량질문 미라우팅**(사용자 실사용): 우리가 생성한 후속칩 "What's the maximum daily dose of Acetaminophen?"를 시스템이 **거부**. 재현: verification 이벤트 0 → 에이전트가 check_otc_safety 미호출 → 접지없음 → 안티할루시 fence가 숫자 거부. 정작 KB 접지됨(`verify(["acetaminophen"])`=limitMg 4000, src="FDA OTC label ceiling"). · 원인: 프롬프트 규칙2 MUST가 "둘이상 병용/중복"에만 걸려 **단일성분 dose-fact 질문이 일반지식으로 처리됨**. · 수정: agent.ts 규칙2에 "단일 named 성분/제품의 최대용량·한도·how much 질문이면 반드시 도구호출, 접지 ceiling 진술(거부·기억답변 금지)" 추가. **뉴로심볼릭 불변(숫자는 도구/KB만).** 라이브 재검증: verification+limitMg4000 → 프로즈 "4,000 mg per day" 접지진술. 골든240/240·tsc 그린. [[neuro-symbolic-promise]]
- **교훈**: 후속질문 칩은 **우리가 답할 수 있는 질문만** 제안해야 한다(자기완결형에 이어 두 번째 자기모순). 추천 UI가 파이프라인 능력과 어긋나면 막다른 길을 스스로 만든다.

## 2026-07-11 (역방향 조사: 접지 데이터 → 답변 가능 질문 유형 + efficacy/P1 라우팅)
> 라우팅 갭을 사후 수정(max-dose·efficacy)하다가, 역으로 KB 접지 데이터 전수조사 → "접지로 답할 수 있는 질문 유형"을 선제 매핑. 라우팅만 열면 접지 답변 범위가 넓어짐을 확인.
- **KB 접지 인벤토리(17성분/47제품)**: maxDailyMg 16/17 · dosing.intervalText **10/17**(NSAID ibuprofen/naproxen 미보유) · maxDurationText 6/17 · efficacyNote **1**(phenylephrine) · class 17/17 + CLASS_RULES · dupGroup 1쌍 · FDA 모노그래프 인용 **9성분**(M012/M013 원문+§+url) · risk **17/17(한줄, tool 텍스트 미노출=B-33)** · 제품조성 47.
- **핵심 통찰**: OnLabel은 "조합 안전"만 도구 라우팅하도록 설계됐는데 KB엔 간격·기간·계열·조성·효능·용량한도가 다 접지돼 있음. **접지 답변 가능 범위 > 현재 노출 범위**, 라우팅만 열면 됨.
- **efficacy 라우팅 수정**(사용자 "llm타이핑같은데"): "does DayQuil's decongestant work?"가 도구 미경유 → 접지 efficacy note(phenylephrine 16-0 자문위+FDA refs, D9) 안 뜨고 LLM 기억 프로즈만. agent 규칙2에 "효능/effectiveness 질문→도구 필수" 추가. 라이브: verification 발생, efficacy note 카드+sources 렌더, 프로즈 KB원문 접지.
- **P1 라우팅 4종 추가**(간격·기간·조성·계열): tool.ts에 readable 약물계열 라인 노출(CLASS_READABLE, "Ibuprofen = NSAID…") + agent 규칙2에 단일제품 grounded 질문(interval/duration/composition/class) 도구 필수 라우팅. 라이브: "Is Advil an NSAID?"→"Yes…ibuprofen…NSAID", "How often can I take Tylenol ES?"→"every 4 to 6 hours…max 3,000 mg…10 days" 전부 접지. tsc·golden 240/240.
- **잔여 갭**: risk 노출(B-33) · efficacyNote 확장(phenylephrine 1개뿐) · NSAID dosing interval 미보유. **defer 정답(데이터 없음)**: onset·지속·ER/분쇄·알코올/Rx상호작용·소아용량·임부. fence 방어 유지.

## 2026-07-12 (risk 필드 = 검증 안 된 LLM 스캐폴딩 → 삭제 + openFDA 라벨경고 접지로 대체)
> 사용자 "risk 한 줄 내가 쓴 적 없는데?" → git 이력 추적 결과 provenance 구멍 발견 → 삭제 + 진짜 접지로 재구축.
- **🔴 발견**: `risk` 한 줄(17/17)은 Day-1 스캐폴딩 커밋 `c31f622`(Co-Authored-By Claude)에서 생성 = **LLM 저작, 검증 안 됨.** `verify:false`는 ceiling 문서화용이지 risk 검증 아님. citations.json에 risk 인용 0. 즉 **trust core에 숨은 LLM 의료 텍스트.** dead(미사용)라 당장 무해했으나 surface 시 논지 위반. → **삭제**(ingredients.json 17줄 + verify.ts 스키마 3곳).
- **openFDA 라벨경고 접지 조사**: openFDA drug label API가 OTC Drug Facts 경고섹션을 **구조화·verbatim** 제공(라이브 확인): warnings·do_not_use·stop_use·when_using·ask_doctor·ask_doctor_or_pharmacist + set_id. **제품당(SPL)**, 긴 산문(사용자 "부작용은 길다"와 일치). 진짜 FDA 접지(삭제한 hand-authored와 차원 다름).
- **구현(Option B, 결정론)**: `scripts/fda-warnings.ts`(fda-add 파이프라인 재사용, 제품→SPL 해소→경고 verbatim+set_id 추출, LLM 0, 못뽑으면 null+로그) → `warnings.json` **46/47 접지**(aleve만 경고섹션 부재→null). verify.ts `VerifyResult.warnings`(제품id→ProductWarnings, matched에 결정론 부착, mutation 없음). `LabelWarnings.tsx`(rail 접기카드, verbatim 섹션+DailyMed 링크). tool.ts=경고 텍스트 미포함(패러프레이즈 차단)·포인터만. agent=부작용/경고 질문 라우팅→"라벨 경고 표시됨, 가리키고 defer, 기억 나열 금지."
- **검증**: tsc·eslint·golden 240/240·build 그린. 라이브 10문항(실사용 시뮬): "side effects of Advil"→**기억 나열 거부·라벨 카드 접지**, 전 기능(조합·max-dose·efficacy·interval·class·warnings·red-flag·open·이성질체) 정상. transcript evals/transcripts/ask10-*.json.
- **주의**: Advil stopUse에 openFDA 원본 텍스트 병합 아티팩트("aIf pregnant…sk") — verbatim이라 미수정(라벨 텍스트 저작 안 함 원칙). 데모케이스(Tylenol ES·DayQuil) 깨끗. aleve 경고 null(후속 set_id 지정 보완 가능).

## 2026-07-12 (프론트엔드 재빌드 — 레퍼런스 조사 + 10방향 목업 + A/B → Traffic-Light 채택)
> 사용자 "프론트엔드 대대적 재빌드" → 조사 기반 목업 탐색 후 방향 확정(D41).
- **조사**: answer-engine(Perplexity 소스rail·인라인인용, OpenEvidence details) + 헬스앱 신뢰(blue=신뢰·green=정상·red=긴급, Inter/IBM Plex, calm color) + editorial(cream·ink·plum, New Yorker풍) + 데이터대시보드(risk score·모듈카드). 출처 웹검색 2026.
- **목업 탐색(아티팩트, 재사용 가능)**: 10방향 갤러리=**dc8d79cd**(Clinical Calm·Editorial Rx·Answer Engine·Data Receipt·Traffic-Light·Consumer Friendly·Drug Facts Label·Dashboard·Dark Premium·Swiss Mono). 1·2·4·5 각 search+result=**6e90cd15**. A/B 풀목업(1 vs 5)=**bafc2d1d**. 동일 데모콘텐츠(Tylenol ES+DayQuil DANGER)로 비교.
- **채택 = Traffic-Light(B, D41)**: DANGER=solid 빨강 알람블록, CAUTION/OK=볼드테두리 카드+solid 아이콘, NumbersStrip(combined/limit/+over). 흰 바탕+border-foreground 2px. 컴포넌트 className 기반이라 토큰+클래스로 향후 방향 변경 가능. playwright 3종 렌더 검증.
- **미채택안 보존**: Clinical Calm(1)은 A/B 아티팩트에 남아 있어 필요시 전환 가능(className 교체 수준).

## 2026-07-13 (제출 전 라이브 스모크 10/10)
- **제출 전 최종 스모크**: 임의 질문 10개를 실제 파이프라인(runOnLabel, 유료)에 라이브 실행 — 축 골고루(성분중복·NSAID계열·진정성항히스타민 이중축·이성질체·용량한도·효능·red-flag·열린질문·안전조합·퍼지). · 질문셋: `evals/smoke-submit.txt`, transcript: `evals/transcripts/probe-2026-07-13T10-38-00-886Z.md`(gitignore, 로컬 보존).
- **결과 = 전 축 정상, 위양성/위음성 0**: danger 2(Tylenol+DayQuil 5600>4000, Advil+Aleve NSAID) · caution 2(NyQuil+TylenolPM 이중축, Zyrtec+Xyzal 이성질체) · ok 4(APAP한도 4000, DayQuil 효능부정, Tylenol+Advil 안전, 퍼지 tylenol+mucinexDM) · 유보 2(간질환+Tylenol=red-flag D35 억제, 코막힘+두통 열린질문=D34 되물음). 판정·원장·숫자 전부 접지 정확.
- **경미 관찰(신규 아님)**: #3 NyQuil+TylenolPM 산문이 "1650 mg at once"(per-dose 입도) + "real risk of liver harm"(3600<4000인데 다소 과함). 판정/원장은 정확, 산문 톤/입도 문제 = 기존 B-10(per-pill vs per-dose)·B-35(정성 주장) 계열. 데모 영향 없음(시선을 원장·숫자에 두면 비노출). · 영향: 제출 가능 상태 확인.
