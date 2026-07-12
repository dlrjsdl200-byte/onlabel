"use client";

import type { VerifyResult } from "@/lib/onlabel/verify";

/** "Tylenol" · "Tylenol and DayQuil" · "Tylenol, DayQuil, and Advil". */
function joinBrands(brands: string[]): string {
  if (brands.length <= 1) return brands[0] ?? "";
  if (brands.length === 2) return `${brands[0]} and ${brands[1]}`;
  return `${brands.slice(0, -1).join(", ")}, and ${brands[brands.length - 1]}`;
}

/**
 * Suggested follow-up questions (Perplexity / ChatGPT pattern) — a complete
 * answer paired with specific next questions so the user refines conversationally
 * instead of facing a blank box. Kept to three (Perplexity caps its visible
 * chips) and generated deterministically from the verdict's own findings.
 *
 * OnLabel is stateless — each ask() is a fresh, memory-less request — so every
 * suggestion must be SELF-CONTAINED: it bakes in the real product and ingredient
 * names rather than leaning on "this"/"too", which would have no antecedent when
 * re-submitted on its own.
 */
function buildFollowUps(result: VerifyResult): string[] {
  const out: string[] = [];
  const { findings } = result;
  const brands = [...new Set(result.matched.map((p) => p.brand))];
  const brandList = joinBrands(brands);

  // 1. Dose ceiling for the most relevant ingredient (flagged first).
  const focus = findings.find((f) => f.severity !== "ok") ?? findings[0];
  if (focus) {
    out.push(`What's the maximum daily dose of ${focus.displayName}?`);
  }

  // Anchor every combination/duration question to something the checker can
  // resolve: the named product(s) if any, otherwise the ingredient itself.
  const anchor = brandList || focus?.displayName || "";

  // 2. Duration — only when the KB actually has a dosing schedule to ground on.
  if (anchor && findings.some((f) => f.dosing)) {
    out.push(`How many days in a row can I take ${anchor}?`);
  }

  // 3. A common add-on reliever not already among the ingredients. Routes back
  //    through the checker, so the answer is a grounded verdict — not memory.
  const present = new Set(findings.map((f) => f.ingredient));
  const addOns: Array<{ key: string; label: string }> = [
    { key: "ibuprofen", label: "ibuprofen (Advil)" },
    { key: "acetaminophen", label: "acetaminophen (Tylenol)" },
    { key: "naproxen", label: "naproxen (Aleve)" },
  ];
  const addOn = addOns.find((a) => !present.has(a.key));
  if (addOn && anchor) {
    out.push(`Can I take ${addOn.label} with ${anchor}?`);
  }

  // NOTE: no "what side effects…" suggestion. OnLabel checks ingredient
  // duplication and dose ceilings — it has no grounded side-effect data, so
  // that question can only be answered by ungrounded LLM prose, which violates
  // the neuro-symbolic promise. We never lead the user to a question we can't
  // answer from FDA data. Fewer, grounded chips beats a chip that fabricates.

  return out.slice(0, 3);
}

export function FollowUps({
  result,
  onAsk,
}: {
  result: VerifyResult;
  onAsk: (q: string) => void;
}) {
  const questions = buildFollowUps(result);
  if (questions.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground">
        Related
      </h3>
      <div className="flex flex-col gap-2">
        {questions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onAsk(q)}
            className="group flex items-center justify-between gap-3 rounded-lg border-2 border-foreground bg-card px-4 py-2.5 text-left text-sm font-semibold text-foreground/85 transition-colors hover:bg-foreground hover:text-background"
          >
            <span>{q}</span>
            <span
              className="shrink-0 font-bold text-muted-foreground transition-colors group-hover:text-background"
              aria-hidden
            >
              →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
