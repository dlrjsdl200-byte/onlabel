# OnLabel — Data Provenance & Trust

> 각 데이터 필드가 **어디서 오고, 얼마나 믿을 수 있고, L3 sync가 채우는지**를 명시하는 단일 진실원. 의료 데이터라 출처 추적은 필수.
> 작성 2026-07-09. 관련: architect.md §3, DECISIONS D18.

## "DB"는 무엇인가
OnLabel의 데이터 저장소는 **버전관리되는 큐레이션 JSON**(`src/data/ingredients.json`, `products.json`)이다. 성분 ~15개·제품 ~17개 규모에선 실제 DB보다 이게 옳다: 인메모리·즉시, git 버전관리, 런타임 외부호출 0(뉴로심볼릭 원칙, D18). L3 sync의 **적재 대상**도 이 JSON이다. (스케일이 커지면 그때 DB로 승격 = backlog.)

## 필드별 출처 & 신뢰 매트릭스

| 데이터 | 파일 | 권위 출처 | L3(openFDA/DailyMed)가 채움? | 신뢰 |
|---|---|---|---|---|
| 제품 활성성분 목록 | products.json | FDA 라벨(SPL) | ✅ 직접 | L3 후 높음 |
| 단위당 함량 mgPerDose | products.json | FDA 라벨 | ✅ 대부분(라벨 파싱) | L3 후 높음 |
| 하루 최대 횟수 maxDosesPerDay | products.json | 라벨 "용법"(자유서술) | ⚠️ 부분(파싱 필요) | 파싱+검수 |
| **성분 일일한도 maxDailyMg** | ingredients.json | **FDA OTC 모노그래프**(M013 진통, M012 감기) | ❌ **라벨에 없음** | 모노그래프+약사 |
| 금기·상호작용 규칙 R3 | (규칙셋) | 약사 저작 / ONCHigh | ❌ | 약사 |
| 효능 노트(phenylephrine) | ingredients.json | FDA 자문위/보도(2023-24) | ❌ 별도(확보됨) | 높음 |
| Red-flag | (규칙셋) | 약사/임상 | ❌ | 약사 |

**핵심**: L3는 **제품 조성(성분·함량)**을 FDA 실데이터로 채운다. **성분 일일한도·임상규칙은 라벨에 없어 모노그래프+약사 검수가 별도로 필요.**

## `verify` 플래그의 의미
- `verify:false` = 권위 출처로 확인됨(신뢰).
- `verify:true` = **아직 미확인(믿지 마).** 값이 있어도 근사/추정. L3 sync 또는 약사 검수로 승격 대상.

## 다층 방어 (왜 오류가 데모까지 안 가나)
1. `verify` 플래그 — 미확인 값 명시 ✅
2. eval 골든셋 + `check-golden` — 오류 자동 적발 ✅ (doxylamine 25mg 오류를 이걸로 잡음)
3. 불변식 테스트 — "성분 한도 ≥ 어떤 단일 제품의 라벨 최대" ✅
4. 결정론 판정 — LLM이 숫자 안 지어냄 ✅
5. **L3 openFDA/DailyMed sync** — 제품 조성 실데이터 교체 ⏳
6. **약사 검수** — 성분 한도·임상규칙 최종 확인 ⏳

## 성분 일일한도 소싱 현황 (2026-07-09)
> 권위 출처: FDA OTC Monograph **M012**(Cough/Cold/Allergy), 진통은 내부진통 모노그래프 + FDA 캠페인. 값 채워지는 대로 verify:false 승격.

(상세 값·출처는 `src/data/ingredients.json`의 각 `source` 필드 참조. 이 문서는 정책, JSON이 데이터.)

**✅ verify:false (출처 확인, 10개)**: acetaminophen 4000, ibuprofen 1200, naproxen 660 (FDA/캠페인) · dextromethorphan 120, guaifenesin 2400 (M012/Drugs.com monograph) · diphenhydramine 300 (StatPearls), chlorpheniramine 24, loratadine 10, cetirizine 10, fexofenadine 180 (OTC 라벨).

**⚠️ verify:true (미확인, 5개 — L3/약사 검수 대상)**:
- **doxylamine 75** — 수면보조 라벨 25mg vs 항히스타민 일일치 상이. NyQuil 라벨 최대(50)와 정합 위해 75로 하한. 감기약(항히스타민) 맥락 확인 필요.
- **pseudoephedrine 240** — 표준값이나 이번 패스서 1차 재확인 못 함. M012 확인.
- **phenylephrine 60** — FDA 폐지 진행 중(효능 부정). 값 자체 저우선.
- **aspirin 4000** — 진통 표준값, 1차 재확인 미완.
- **caffeine null** — 상한 미설정.

> ⚠️ 주의: verify:false 승격은 **평판 있는 2차 출처(Drugs.com professional monograph, StatPearls) 교차확인** 기준. 1차 FDA 모노그래프 PDF 직접 판독은 미완 → **약사 최종 검수 시 1차 대조 권장.**
