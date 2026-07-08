"use client";

import { useState } from "react";
import type { ClaimVerdict } from "@/lib/onlabel/claims";
import type { ReconcileResult } from "@/lib/onlabel/reconcile";
import { ClaimBadge } from "./ClaimBadge";

interface ContrastData {
  draft: string;
  verdicts: ClaimVerdict[];
  reconciled: ReconcileResult;
}

/**
 * The contrast engine (L1, additive). On demand, it fetches a generic-LLM answer
 * to the same question and checks each of its claims against FDA data — showing
 * exactly what a generic AI gets wrong and how OnLabel's deterministic layer
 * corrects it. Opt-in so the core verdict-first path is untouched.
 */
export function ContrastEngine({
  question,
  products,
}: {
  question: string;
  products: string[];
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [data, setData] = useState<ContrastData | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/contrast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, products }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Request failed");
      setData(json);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setState("error");
    }
  }

  if (state === "idle") {
    return (
      <button
        onClick={run}
        className="w-full rounded-xl border border-dashed border-foreground/20 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
      >
        🔬 Compare to a generic AI answer — see what it gets wrong
      </button>
    );
  }

  if (state === "loading") {
    return (
      <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        Asking a generic AI the same question, then checking every claim against FDA
        data…
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-xl border border-verdict-danger/40 bg-verdict-danger-bg p-4 text-sm text-verdict-danger-fg">
        Couldn&rsquo;t run the comparison: {error}
      </div>
    );
  }

  if (!data) return null;
  const { draft, verdicts, reconciled } = data;

  return (
    <section className="space-y-4 rounded-xl border bg-muted/20 p-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Generic AI vs. OnLabel
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          A generic assistant answered from memory. OnLabel checks each claim
          against FDA labeling — {reconciled.stats.verified} verified,{" "}
          {reconciled.stats.contradicted} contradicted,{" "}
          {reconciled.stats.unsupported} unverifiable.
        </p>
      </div>

      {reconciled.corrections.length > 0 && (
        <div className="rounded-lg border border-verdict-danger/30 bg-verdict-danger-bg/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-verdict-danger-fg">
            What the generic AI got wrong
          </p>
          <ul className="mt-2 space-y-2">
            {reconciled.corrections.map((c, i) => (
              <li key={i} className="text-sm">
                <span className="text-foreground/60 line-through">
                  “{c.claimText}”
                </span>
                <span className="mt-0.5 block font-medium text-foreground">
                  → {c.correction}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="group">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
          Generic AI&rsquo;s full answer + every claim checked ({verdicts.length})
        </summary>
        <blockquote className="mt-2 whitespace-pre-wrap border-l-2 border-foreground/15 pl-3 text-sm leading-relaxed text-foreground/70">
          {draft}
        </blockquote>
        <ul className="mt-3 space-y-2">
          {verdicts.map((v, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <ClaimBadge status={v.status} />
              <span className="min-w-0 text-foreground/80">
                “{v.claim.text}”
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {v.basis}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
