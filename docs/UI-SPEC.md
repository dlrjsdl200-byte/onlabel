# OnLabel — UI Spec (Day 3)

> 빌드 전 확정 스펙. "한 번에 제대로" 기준선. UI 카피는 영어(제품), 설명은 한국어(내부).
> 결정(2026-07-09): 레이아웃=**답변 엔진형**(OpenEvidence 스타일) · 무드=**클리니컬-클린** · **일반 AI 대조 장치 명시**.

---

## 1. 시그니처 인터랙션 (이게 Demo 30%의 심장)

**"판정 먼저, 설명 나중"(verdict-first, prose-second).**
1. 사용자가 질문 제출
2. Claude가 `check_otc_safety` 도구를 호출하는 순간 → **판정 카드 + 성분 원장이 즉시 스냅**(결정론적, 빠름). "어, 잡아냈다" 순간.
3. 그 아래로 설명 산문이 **스트리밍**으로 흘러 들어옴.

→ 결정론적 판정은 즉시(신뢰), 산문은 스트리밍(생동감). 보기에 쿨함.

## 2. 레이아웃 (답변 엔진형)

### 랜딩(빈 상태)
```
              OnLabel
     Know what's really in your OTC meds.

   +--------------------------------------+
   | Ask about your OTC medicines...      | [Ask]
   +--------------------------------------+

   Try:  [Tylenol + DayQuil]  [NyQuil + Tylenol PM]
         [Advil + Aleve]      [Is DayQuil's decongestant real?]
```
- 중앙 정렬 브랜드 + 큰 질문 입력 + **예시 칩**(시드 시나리오 = 데모 원클릭)

### 답변 상태 (위→아래 순서)
1. **질문 에코** (작게, 위로 이동)
2. **대조 스트립** — 일반 AI vs OnLabel (§4)
3. **판정 카드** (히어로, 색상 코드) — 판정어 + 한 줄 요지
4. **설명 산문** (Claude 스트리밍)
5. **성분 원장** 테이블 (§3)
6. **효능 노트** 콜아웃 (phenylephrine 등)
7. **출처** 칩 (FDA DailyMed/openFDA)
8. **Disclaimer** 푸터
9. 하단에 후속 질문 입력(보조)

## 3. 판정 카드 + 성분 원장 (핵심 컴포넌트)

**판정 카드** — severity에 따라:
- `danger` 🚫 빨강 — "Don't take these together as written"
- `caution` ⚠️ 앰버 — "Check before combining"
- `ok` ✅ 그린 — "No duplication or dose-ceiling problems found"
- 색 + 아이콘 + 텍스트 라벨 3중(색맹 접근성)

**성분 원장 테이블**:
| Ingredient | Found in | Combined/day | Limit | Status |
|---|---|---|---|---|
| Acetaminophen | Tylenol ES, DayQuil | 5,600 mg | 4,000 mg | 🚫 |
| Dextromethorphan | DayQuil | 80 mg | 120 mg | ✅ |

→ 초과 행은 빨강 강조. 이 표가 "숫자로 반박한다"의 시각적 증거.

## 4. 대조 장치 (명시, 그러나 정직하게)

판정 카드 위 작은 스트립:
```
+--------------------------------------------------+
| Generic chatbots often answer "that's generally  |
| fine."   OnLabel checked the FDA data ->  🚫     |
+--------------------------------------------------+
```
- ⚠️ **정직성 가드레일**: 특정 모델의 가짜 인용을 만들지 않는다. "Generic chatbots often…"처럼 **일반적·illustrative**하게, 명확히 라벨링. 실제 답변을 위조 인용하지 않음.

## 5. 비주얼 시스템 (클리니컬-클린)

- **색**: 배경 화이트/니어화이트, 텍스트 slate/ink, 액센트 블루(#2563EB 계열). 판정 시맨틱: green/amber/red(톤다운, 절제된 채도).
- **타이포**: Geist Sans(스캐폴드 기본, next/font). 명확한 위계, 큰 판정어.
- **여백**: 넉넉. 정밀한 그리드, 얇은 보더 + 미세 섀도, rounded-lg.
- **다크모드**: light-first, dark-aware (globals.css 기존 지원 활용).
- **접근성**: 판정은 색 단독 금지 — 아이콘+라벨 병기. 대비 AA.

## 6. 기술 접근

- **컴포넌트 라이브러리**: **shadcn/ui** (Tailwind 4 호환). Card, Badge, Button, Input, Table, Alert, Skeleton 사용 → 클리니컬-클린과 정합, 빠르고 접근성 확보. `npx shadcn init`.
- **폰트**: next/font Geist.
- **스트리밍**: SSE 엔드포인트 `POST /api/check/stream` — 이벤트:
  - `verification` : VerifyResult (도구 결과 나오는 즉시) → 판정 카드/원장 렌더
  - `token` : 산문 델타
  - `done` : { productsChecked }
  - `error` : { message }
  - 클라이언트: `fetch` + `ReadableStream` 파서 훅 `useOnLabelStream`.
- 기존 `POST /api/check`(비스트리밍)는 fallback으로 유지.

## 7. 컴포넌트 트리

```
app/page.tsx
├─ QuestionInput           입력 + 제출 + 예시 칩
├─ AnswerView              스트림 오케스트레이션(useOnLabelStream)
│  ├─ QuestionEcho
│  ├─ ContrastStrip        일반 AI vs OnLabel
│  ├─ VerdictCard          severity→색/아이콘/라벨
│  ├─ AnswerProse          스트리밍 텍스트(markdown)
│  ├─ IngredientLedger     테이블
│  ├─ EfficacyNote         phenylephrine 콜아웃
│  ├─ Sources              FDA 인용 칩
│  └─ Disclaimer
```
- 공유 타입: `VerifyResult`(verify.ts) 재사용. 서버→클라 그대로 전달.

## 8. 상태

- **빈/랜딩**: 예시 칩
- **스트리밍**: 판정 카드/원장 먼저(verification 이벤트), 산문 스켈레톤→토큰
- **완료**: 전체 렌더
- **미매칭 제품**: 판정 카드에 "Couldn't recognize: X" 우아하게(크래시 X)
- **에러**: 키 없음/실패 시 친절 메시지(라우트가 이미 처리)

## 9. 데모 안무 (3분, UI가 이끄는)

1. 깔끔한 랜딩 → 예시 칩 "Tylenol + DayQuil" 클릭(또는 타이핑)
2. **판정 카드가 즉시 빨강 DANGER로 스냅**
3. 대조 스트립: 일반 AI 프레이밍
4. 산문 스트리밍: acetaminophen 중복 설명
5. 원장 테이블: Acetaminophen 5,600/4,000 빨강
6. phenylephrine 효능 노트 + FDA 출처
7. (스트레치) 같은 판정을 MCP로 Claude Desktop에서도 시연

## 10. 빌드 순서 (다음 세션)

1. shadcn init + 토큰/테마(클리니컬-클린 팔레트)
2. 정적 컴포넌트(더미 데이터로 VerdictCard/Ledger/ContrastStrip 등) — 픽셀 확정
3. SSE 스트림 라우트 + `useOnLabelStream` 훅
4. 배선 + 상태 + 예시 칩
5. 반응형/다크/접근성 패스
6. Vercel preview 배포

---

*작성 2026-07-09. 관련: architect.md, PLAN.md Day 3.*
