import type { ReactNode } from "react";

/**
 * Collapsible section (progressive disclosure). Keeps the answer above the fold
 * by tucking secondary detail — the dose-math table, the FDA source chips —
 * behind a tap, following the OpenEvidence "details" and Perplexity collapsed-
 * steps patterns. Safety-critical content (verdict, scope note, red-flag prose,
 * disclaimer) is NEVER placed inside a Disclosure — it stays always-visible.
 *
 * Native <details> so it works without JS and is keyboard-accessible for free.
 */
export function Disclosure({
  summary,
  meta,
  defaultOpen = false,
  children,
}: {
  summary: string;
  /** Short count shown muted after the label, e.g. "3 ingredients". */
  meta?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="group rounded-xl border-2 border-foreground bg-card"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-bold text-foreground [&::-webkit-details-marker]:hidden">
        <span>
          {summary}
          {meta && (
            <span className="ml-1.5 font-normal text-muted-foreground">
              · {meta}
            </span>
          )}
        </span>
        <span
          className="text-muted-foreground transition-transform group-open:rotate-90"
          aria-hidden
        >
          ›
        </span>
      </summary>
      <div className="flex flex-col gap-4 border-t-2 border-foreground px-4 py-4">{children}</div>
    </details>
  );
}
