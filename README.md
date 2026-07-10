# OnLabel

**A self-verifying OTC medication safety assistant for US consumers.**

Generic AI chat will happily tell you "Tylenol and DayQuil together is fine."
Both contain **acetaminophen** — combined, they can exceed the 4,000 mg/day limit
and cause liver damage, the leading cause of acute liver failure in the US.
Consumers think in *brands*; the danger lives in *ingredients*.

OnLabel answers OTC medication questions and then **verifies its own answer**
against FDA-grounded ingredient data before showing it to you — flagging
active-ingredient duplication and dose ceilings that generic LLMs miss.

> ⚠️ **Not medical advice.** OnLabel is a demo, not a medical device. Always
> confirm medication decisions with a pharmacist or physician.

## How it works

The trust core is **deterministic, not an LLM guess**:

1. Claude drafts an answer and extracts the products/claims involved.
2. Each product is resolved to its **active ingredients** (FDA / DailyMed / openFDA).
3. A pure-code verifier builds an **ingredient ledger**, then checks:
   - **Duplication** — same active ingredient across multiple products
   - **Cumulative dose** — combined daily total vs. the OTC maximum
   - **Class overlap** — multiple NSAIDs, decongestants, or sedating antihistamines
4. Each claim is returned with a verdict — ✅ / ⚠️ / 🚫 — and its FDA source.

Because the verdict comes from ingredient composition + arithmetic, OnLabel can
actually *prove* a generic answer wrong.

## Scope (v1)

US OTC analgesics and cold/flu products — ingredient duplication and dosing.
Prescription-drug interactions are intentionally out of scope (see `backlog.md`).

## Stack

Next.js (App Router) · Claude Agent SDK · TypeScript · Tailwind · Vercel.

## Develop

```bash
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm run dev            # app
npm test               # verifier smoke tests
npm run typecheck
```

## Deploy & extend

- **Deploy to Vercel (real-device testing):** [`DEPLOY.md`](DEPLOY.md) — GitHub→Vercel
  import, `ANTHROPIC_API_KEY` env var, URL protection, and the first-deploy check
  that the Agent SDK runs in the serverless function.
- **Add a product or ingredient to the KB:** [`docs/ADD-PRODUCT.md`](docs/ADD-PRODUCT.md)
  — the deterministic extract → verify → gate workflow (no hand-typed clinical
  numbers). See also [`docs/EXTRACTION-RULES.md`](docs/EXTRACTION-RULES.md).

## Data sources

openFDA drug label & NDC · DailyMed · RxNorm/RxNav · RxClass — all free, public,
US government data. See `data/otc-knowledge-base.md`.

## License

MIT — see `LICENSE`.
