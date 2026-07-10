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

- **Project → Settings → Deployment Protection → Vercel Authentication** (or set a
  **Password**). This gates the whole deployment behind a login/password — enough
  for a demo and real-device testing.
- The request-size caps added in the code (question ≤ 2000 chars, ≤ 20 products —
  B-22) are a second layer, not a substitute for protection.

## 3. ⚠️ Verify FIRST: does the Agent SDK run in the serverless function?

**This is the #1 thing to check on the first deploy.** The Claude Agent SDK's
`query()` extracts and **spawns a bundled binary** at request time (it is a client
to the Claude Code runtime, not a pure HTTP client). Locally this is fine; in a
serverless function it may not be.

Mitigation already in place: `next.config.ts` forces the whole
`@anthropic-ai/claude-agent-sdk` package to ship with the API routes
(`outputFileTracingIncludes`), and Vercel's Linux `npm install` pulls the Linux
build, so the correct binary travels with the function.

**Smoke test the deployed URL immediately:**
```
curl -s -X POST https://<your-app>.vercel.app/api/check \
  -H "content-type: application/json" \
  -d '{"question":"Can I take Tylenol Extra Strength with DayQuil?"}'
```
- Expect JSON with `verification.overall = "danger"` and a grounded `answer`.
- If it returns a 500 or an empty answer, open **Vercel → Deployment → Functions
  logs**. A spawn/ENOENT/permission error there means the bundled binary didn't
  run — see fallback below. (The B-24 fix makes a failed run surface as a real
  error instead of a silent blank card, so the log will be explicit.)

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
