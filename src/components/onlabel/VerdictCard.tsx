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
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border shadow-sm",
        v.bg,
        v.border,
      )}
      role="status"
      aria-live="polite"
    >
      {/* Severity strip: absorbs the standalone ContrastStrip's job — one glance
          tells you the verdict color before any text is read. */}
      <div className={cn("h-1.5", v.solid)} aria-hidden />
      <div className="flex items-start gap-4 p-5">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white",
            v.solid,
          )}
          aria-hidden
        >
          {v.icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                v.fg,
              )}
            >
              {v.label}
            </span>
          </div>
          <h2 className={cn("mt-0.5 text-lg font-semibold", v.fg)}>
            {v.headline}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
            {summary}
          </p>
          <p className="mt-2 border-t border-foreground/10 pt-2 text-xs leading-relaxed text-foreground/55">
            {SCOPE_NOTE}
          </p>
        </div>
      </div>
    </div>
  );
}
