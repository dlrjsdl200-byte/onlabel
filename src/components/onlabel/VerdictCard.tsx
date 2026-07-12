import type { Severity } from "@/lib/onlabel/verify";
import { VERDICT } from "./verdict";
import { cn } from "@/lib/utils";

/**
 * Deterministic scope note shown under every verdict. The check is product-level
 * only, so a green "OK" must not read as blanket approval: it clarifies that the
 * answer's prose may still caution about a dosing schedule, prior intake, or
 * substances (alcohol, caffeine) the verdict did not evaluate. Resolves the
 * badge<->prose contradiction (Direction C) without inferring anything from the
 * LLM's text.
 */
const SCOPE_NOTE =
  "Checks the products you named against FDA label maximums — not your dosing schedule, how much you've already taken, or other substances like alcohol or caffeine.";

export function VerdictCard({
  severity,
  summary,
}: {
  severity: Severity;
  summary: string;
}) {
  const v = VERDICT[severity];

  // Traffic-Light: DANGER is a full solid-red alarm block (white text) that can't
  // be missed. CAUTION and OK are calmer — a bold-bordered white card with a solid
  // colored icon chip and colored label/headline — so only real danger screams.
  if (severity === "danger") {
    return (
      <div
        className={cn("overflow-hidden rounded-xl text-white", v.solid)}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-4 p-6">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-lg border-2 border-white/30 bg-white/15 text-2xl font-black"
            aria-hidden
          >
            {v.icon}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/90">
              {v.label}
            </div>
            <h2 className="mt-1 text-2xl font-extrabold leading-none tracking-tight">
              {v.headline}
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-white/95">
              {summary}
            </p>
            <p className="mt-3 border-t border-white/25 pt-2.5 text-xs leading-relaxed text-white/75">
              {SCOPE_NOTE}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border-2 border-foreground bg-card",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-4 p-5">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-lg text-xl font-black text-white",
            v.solid,
          )}
          aria-hidden
        >
          {v.icon}
        </div>
        <div className="min-w-0">
          <div className={cn("text-xs font-extrabold uppercase tracking-[0.14em]", v.fg)}>
            {v.label}
          </div>
          <h2 className={cn("mt-1 text-xl font-extrabold tracking-tight", v.fg)}>
            {v.headline}
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-foreground/85">
            {summary}
          </p>
          <p className="mt-2.5 border-t-2 border-foreground/15 pt-2.5 text-xs leading-relaxed text-foreground/60">
            {SCOPE_NOTE}
          </p>
        </div>
      </div>
    </div>
  );
}
