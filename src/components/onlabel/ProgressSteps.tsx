"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The "answer process" made visible (Naver Cue: pattern). Instead of a blank
 * spinner, we surface the deterministic pipeline itself — parse → match FDA →
 * sum doses — because that pipeline IS the product's thesis. Watching named,
 * checkable steps run reads as evidence, not latency.
 *
 * Shown only during the pre-answer "thinking" phase (streaming, no verification
 * and no prose yet). The real pipeline resolves in ~1–2s; the steps auto-advance
 * on a short timer so the sequence is legible rather than a flash.
 */
const STEPS = [
  "Parsing the products you named",
  "Matching them to FDA labeling data",
  "Summing daily doses against label maximums",
] as const;

const STEP_MS = 550;

export function ProgressSteps() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= STEPS.length - 1) return;
    const t = setTimeout(() => setActive((i) => i + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border bg-muted/20 p-5">
      <ul className="space-y-2.5">
        {STEPS.map((label, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors",
                  done && "border-verdict-ok/50 bg-verdict-ok-bg text-verdict-ok-fg",
                  current && "border-primary/50 bg-primary/10 text-primary",
                  !done && !current && "border-border text-muted-foreground/50",
                )}
                aria-hidden
              >
                {done ? "✓" : current ? (
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                ) : (
                  ""
                )}
              </span>
              <span
                className={cn(
                  "transition-colors",
                  done && "text-foreground/70",
                  current && "font-medium text-foreground",
                  !done && !current && "text-muted-foreground/60",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="pl-8 text-xs text-muted-foreground">
        Every number below comes from FDA data, not a guess.
      </p>
    </div>
  );
}
