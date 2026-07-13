# OnLabel — 3-Minute Demo Script

> Narrative arc (기승전결). Thesis: not "the chatbot is wrong" (modern models often
> aren't) — but **reproducibility + auditability + the LLM never makes the safety call.**
>
> ⚠️ Before recording: restart the dev server fresh (`npm run dev`) — stale servers have
> crashed on the Agent SDK subprocess. Prefer recording against the live deploy
> (onlabel.vercel.app) to prove it ships.

---

## 起 · 0:00–0:35 — The chatbot is right, but…
**Screen:** ChatGPT's Tylenol+DayQuil (or Xyzal+Zyrtec) answer — scroll the wall of text.

> "Ask a modern AI chatbot whether you can take Tylenol and DayQuil together, and
> honestly — it does a decent job. It even catches the shared acetaminophen. So here's
> the real question: if the chatbot already knows, why build a safety tool at all?
> Because for a medication-safety decision, being right *on average* isn't enough.
> Look at this answer — it's a wall of hedged text. It makes *you* do the math. And the
> numbers come from memory. Ask again tomorrow, phrase it differently, and the answer shifts."

## 承 · 0:35–1:05 — What OnLabel is
**Screen:** OnLabel landing + name.

> "This is OnLabel. The core idea: Claude writes the answer and extracts the products —
> but Claude never makes the safety call. Every product resolves to its FDA active
> ingredients, and a pure-code verifier does the arithmetic. So the verdict isn't a
> language model's opinion — it's composition plus math. Same input, same answer, every
> single time — and every number traces back to an FDA label."

## 轉 · 1:05–2:20 — Proof (demo body)
**Screen 1 (1:05–1:35):** `Tylenol Extra Strength + DayQuil` → DANGER (red) + NumbersStrip `5,600 > 4,000`.

> "Same question, in OnLabel. Instantly — DANGER. It unpacked both brands, found
> acetaminophen in each, and added them: 5,600 milligrams against a 4,000 limit. No
> hedging, no wall of text — one verdict."

**Screen 2 (1:35–2:00):** Expand the right FDA rail — dose math + Sources citation.

> "And every number has a receipt. Here's the dose math, and here's the FDA monograph,
> quoted line by line. Nothing typed by hand, nothing guessed — extracted
> deterministically from openFDA labels. You can *audit* the answer, not just trust it."

**Screen 3 (2:00–2:20):** Side-effects question → LabelWarnings card / or pregnancy red-flag.

> "Ask about side effects, and it shows the verbatim FDA warning — it won't invent one.
> Hit a red flag like pregnancy, and it holds the green light and defers to a pharmacist.
> It never hides a risk, and it knows when to stop talking."

## 結 · 2:20–3:00 — Vision + contact
**Screen:** OTC demo → transition to DailyMed / openFDA / FDA source list → final contact card (hold still).

> "Today this is a deliberately narrow demo — U.S. OTC pain and cold medicines. But the
> hard part was never the drug list; it's the architecture: Claude does language,
> deterministic code makes the safety call, every number grounded in FDA data. That same
> core extends to DailyMed, prescription labels, and full clinical decision support —
> where reproducibility and an audit trail aren't nice-to-haves, they're requirements.
> That's the version clinicians — pharmacists, physicians, nurses — actually need. Built
> with Claude, on Next.js and Vercel.
>
> I'm a pharmacist and a developer, and I'm building toward that. If you want to take it
> further, let's talk.
> 📧 dlrjsdl200@naver.com · 📱 +82 10 9047 4192"

---

## Pacing notes
- ~390 words → ~3:00 at demo pace. If tight, drop Screen 3.
- Hold the final contact card ~5s as a still frame; also show it as large on-screen text.
- Captions recommended (mute-safe); TTS not recommended — use live voice (pharmacist
  authority carries). Burn key terms on screen: `5,600 > 4,000`, `deterministic`,
  `FDA-grounded`, `reproducible`.
