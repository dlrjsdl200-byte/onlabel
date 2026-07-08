import type { Severity } from "@/lib/onlabel/verify";
import { VERDICT } from "./verdict";
import { cn } from "@/lib/utils";

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
        "flex items-start gap-4 rounded-xl border p-5 shadow-sm",
        v.bg,
        v.border,
      )}
      role="status"
      aria-live="polite"
    >
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
      </div>
    </div>
  );
}
