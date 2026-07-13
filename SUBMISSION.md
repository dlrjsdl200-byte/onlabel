# OnLabel — Submission Summary

**Live:** https://onlabel.vercel.app · **Repo:** https://github.com/dlrjsdl200-byte/onlabel (MIT)

---

## 100–200 word summary

Ask a modern AI chatbot "Can I take Tylenol and DayQuil together?" and it often
answers well — it may even catch that both contain acetaminophen. So why build a
safety tool? Because for a medication-safety decision, being right *on average*
isn't enough. A chatbot buries the answer in hedged prose, makes you do the math,
recalls numbers from memory, and shifts its answer when you rephrase.

OnLabel is a self-verifying OTC medication safety assistant. Claude writes the
answer and extracts the products and claims — but Claude never makes the safety
call. Every product resolves to its FDA-grounded active ingredients, and a
pure-code verifier builds an ingredient ledger to check duplication, cumulative
dose vs. the OTC maximum, and drug-class overlap. The verdict (✅/⚠️/🚫) comes from
composition plus arithmetic — so it is reproducible every time, and every number
traces to an FDA label line you can audit.

Built with Claude (Anthropic Messages API) on Next.js + Vercel. Deterministic
core, FDA receipts, honest scope: US OTC analgesics and cold/flu.

---

## Vision & contact

Today OnLabel is a deliberately narrow OTC demo. But the hard part was never the
drug list — it's the architecture: Claude for language, deterministic code for the
safety call, every number grounded in FDA data. That same core extends to
DailyMed, prescription labels, and clinical decision support, where reproducibility
and an audit trail aren't nice-to-haves — they're requirements. That's the version
clinicians (pharmacists, physicians, nurses) actually need.

Built by a pharmacist–developer. To take it further, let's talk:
**dlrjsdl200@naver.com · +82 10 9047 4192**
