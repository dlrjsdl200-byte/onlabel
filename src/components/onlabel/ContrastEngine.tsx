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
 * The contrast engine (L1, additive) — OnLabel's thesis made visible. On demand
 * it asks a generic LLM the same question, then checks every claim in that answer
 * against FDA data, showing exactly what a generic AI gets wrong and how the
 * deterministic layer corrects it. Opt-in so the core verdict-first path is
 * untouched; when run, it is the demo's centerpiece.
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
        className="group w-full rounded-xl border border-dashed border-foreground/20 px-4 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-muted/40 hover:text-foreground"
      >
        <span className="mr-1.5" aria-hidden>
          🔬
        </span>
        Compare to a generic AI answer
        <span className="ml-1 text-muted-foreground/70 group-hover:text-foreground/70">
          — see what it gets wrong, checked against FDA data
        </span>
      </button>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/60" />
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
  const { verified, contradicted, unsupported } = reconciled.stats;

  return (
    <section className="overflow-hidden rounded-xl border">
      <header className="border-b bg-muted/30 px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">
          Generic AI vs. OnLabel
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          A generic assistant answered from memory. OnLabel checked every claim it
          made against FDA labeling data.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat n={contradicted} label="Contradicted" tone="danger" />
          <Stat n={verified} label="Verified" tone="ok" />
          <Stat n={unsupported} label="Unverifiable" tone="caution" />
        </div>
      </header>

      {reconciled.corrections.length > 0 && (
        <div className="border-b border-verdict-danger/20 bg-verdict-danger-bg/30 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-verdict-danger-fg">
            What the generic AI got wrong
          </p>
          <ul className="mt-3 space-y-3">
            {reconciled.corrections.map((c, i) => (
              <li
                key={i}
                className="rounded-lg border border-verdict-danger/25 bg-background/60 p-3"
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-0.5 shrink-0 text-verdict-danger-fg"
                    aria-hidden
                  >
                    ✕
                  </span>
                  <span className="text-sm text-foreground/55 line-through decoration-verdict-danger/40">
                    “{c.claimText}”
                  </span>
                </div>
                <div className="mt-1.5 flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-verdict-ok-fg" aria-hidden>
                    ✓
                  </span>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground">
                      {c.correction}
                    </span>
                    {c.citationIngredient && (
                      <span className="ml-1.5 inline-block rounded bg-muted px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        FDA · {c.citationIngredient}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="group px-5 py-3">
        <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground hover:text-foreground">
          <span className="inline-block transition-transform group-open:rotate-90" aria-hidden>
            ›
          </span>{" "}
          Generic AI&rsquo;s full answer + every claim checked ({verdicts.length})
        </summary>
        <blockquote className="mt-3 whitespace-pre-wrap border-l-2 border-foreground/15 pl-3 text-sm leading-relaxed text-foreground/70">
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

const TONE: Record<"ok" | "caution" | "danger", string> = {
  ok: "border-verdict-ok/30 bg-verdict-ok-bg/50 text-verdict-ok-fg",
  caution: "border-verdict-caution/30 bg-verdict-caution-bg/50 text-verdict-caution-fg",
  danger: "border-verdict-danger/30 bg-verdict-danger-bg/60 text-verdict-danger-fg",
};

/** One scoreboard tile. Muted (not colored) when the count is zero. */
function Stat({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone: "ok" | "caution" | "danger";
}) {
  const active = n > 0;
  return (
    <div
      className={
        "rounded-lg border px-2 py-2 text-center " +
        (active ? TONE[tone] : "border-border bg-muted/30 text-muted-foreground")
      }
    >
      <div className="text-xl font-bold tabular-nums leading-none">{n}</div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}
