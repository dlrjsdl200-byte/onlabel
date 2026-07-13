# OnLabel — Submission Summary

**Live:** https://onlabel.vercel.app · **Repo:** https://github.com/dlrjsdl200-byte/onlabel (MIT)

---

## 100–200 word summary

Ask a generic AI chatbot "Can I take Tylenol and DayQuil together?" and it often
says yes. Both contain acetaminophen — combined, they can blow past the 4,000 mg
daily ceiling, the leading cause of acute liver failure in the US. Consumers think
in *brands*; the danger hides in *ingredients*.

OnLabel is a self-verifying OTC medication safety assistant. Claude writes the
answer and extracts the products and claims — but Claude never makes the safety
call. Every product is resolved to its FDA-grounded active ingredients, and a
pure-code verifier builds an ingredient ledger to check duplication, cumulative
dose vs. the OTC maximum, and drug-class overlap. The verdict (✅/⚠️/🚫) comes from
composition plus arithmetic, so it is reproducible — and OnLabel can *prove* a
generic answer wrong, citing the FDA monograph line by line. Its contrast engine
runs an unguarded LLM draft side-by-side and marks each false claim with the
correcting source.

Built with Claude (Anthropic Messages API for the fast answer path, Agent SDK for
the contrast engine) on Next.js + Vercel. Deterministic core, FDA receipts, honest
scope: US OTC analgesics and cold/flu.
