# Deploying OnLabel to Vercel (real-device testing)

OnLabel is a zero-config Next.js 16 app. Deploy method: **connect the GitHub repo
to Vercel** (auto-deploys on push). Protect the URL so the live Claude API calls
can't be abused.

## 1. Import the repo (browser, one time)

1. Go to **vercel.com → Add New → Project → Import Git Repository**.
2. Pick `dlrjsdl200-byte/onlabel`. Framework preset auto-detects **Next.js** — leave
   Build/Output settings at their defaults.
3. **Environment Variables** → add:
   - `ANTHROPIC_API_KEY` = your key (mark it for Production + Preview).
   - Nothing else is required (`.env.example` lists only this).
4. Deploy. Every later `git push` to `main` redeploys automatically.

## 2. Protect the URL (cost / abuse control)

The app calls the Claude API on **every** `/api/check`, `/api/check/stream`, and
`/api/contrast` request, so a public URL can run up spend. Lock it down:

- **Project → Settings → Deployment Protection → Vercel Authentication →
  "Require Log In" (Standard Protection).** This is **free** on the Hobby plan and
  gates the whole deployment behind a Vercel login (only you / your team can view).
  Enough for a demo and real-device testing.
  - Password Protection is a paid Pro feature ($150/mo) — **not needed**; skip it.
- The request-size caps in the code (question ≤ 2000 chars, ≤ 20 products — B-22)
  are a second layer, not a substitute for protection.

**Consequences of "Require Log In" (read before testing / recording):**
- It protects the **`/api` routes too**, so the plain `curl` smoke test in §3 will
  be redirected to a login page. Either test in the browser (logged in) or use a
  **Protection Bypass for Automation** token: Settings → Deployment Protection →
  *Protection Bypass for Automation* → generate a secret, then pass it as the
  `x-vercel-protection-bypass` header (free).
- **Real-device test:** on the phone, first sign in at `vercel.com` with the same
  account, then open the deployment URL — it will load.
- **Demo video / judges:** a login-protected URL is not viewable by people outside
  your team. Recording while you are logged in is fine. If judges need live access,
  either share a Protection Bypass link or briefly toggle protection off during the
  window — most hackathons evaluate on the video + repo, so this is usually a non-issue.

## 3. Smoke test the deployed URL

The **main answer path** (`/api/check`, `/api/check/stream`) calls the Anthropic
Messages API directly (`@anthropic-ai/sdk`) — a plain HTTPS call, **no subprocess**.
It is serverless-native and fast (~1.3s to the verdict card, ~3–5s to the full
answer). There is no bundled binary to worry about here.

> The **opt-in contrast engine** (`/api/contrast`, the "Compare to generic AI"
> button) still uses the Claude Agent SDK's `query()`, which extracts and spawns a
> bundled binary at request time. `next.config.ts` ships the linux-x64 native
> package with the function (`outputFileTracingIncludes`) so it runs on Vercel, but
> it is heavier/slower than the main path. If you never click the contrast button,
> this code never runs.

**Smoke test** (add the bypass header because "Require Log In" also protects
`/api` — see §2):
```
curl -s -X POST https://<your-app>.vercel.app/api/check \
  -H "content-type: application/json" \
  -H "x-vercel-protection-bypass: <automation-bypass-secret>" \
  -d '{"question":"Can I take Tylenol Extra Strength with DayQuil?"}'
```
(Drop the bypass header if protection is off. Or just run the query in the
browser while logged in — same code path.)
- Expect JSON with `verification.overall = "danger"` and a grounded `answer`.
- If it returns a 500 or an empty answer, open **Vercel → Deployment → Functions
  logs** — the B-24 fix surfaces a real error there instead of a silent blank card.

**Fallback if the subprocess can't run on Vercel:**
- Confirm the function's runtime is **Node.js** (routes already set
  `export const runtime = "nodejs"` and `maxDuration` 60/120) — never Edge.
- Increase memory (Settings → Functions) so the extract-to-/tmp + spawn has room.
- If it still fails, the architectural fix is to switch the pipeline to a direct
  Anthropic API path (no subprocess) — the deterministic core (`verify()`) already
  needs no LLM, so a smaller messages-API agent loop can replace `query()`. Track
  as a follow-up; it does not block the deterministic verdict, only the streamed
  prose and the contrast engine.

## 4. Real-device test checklist

Open the protected URL on a phone and confirm:
- [ ] Verdict card renders and streams prose (verdict-first) for
      "Tylenol Extra Strength + DayQuil" → **danger**.
- [ ] "regular Tylenol" surfaces the Extra-Strength assumption note.
- [ ] A red-flag question ("I have liver disease, how much Tylenol?") shows **no
      green OK badge** and defers to a pharmacist.
- [ ] The "Compare to generic AI" (contrast engine) button loads corrections.
- [ ] Layout is responsive; no horizontal scroll.

## 5. Local production parity (optional, before pushing)

```
npm run build && npm run start   # serve the production build locally
```
Then hit `http://localhost:3000` — this runs the same code path Vercel will.
