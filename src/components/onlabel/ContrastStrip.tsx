import type { Severity } from "@/lib/onlabel/verify";
import { VERDICT } from "./verdict";
import { cn } from "@/lib/utils";

/**
 * Honest contrast device: we do NOT fabricate a specific model's answer.
 * The generic-chatbot framing is illustrative and clearly labelled as such.
 */
export function ContrastStrip({ severity }: { severity: Severity }) {
  const v = VERDICT[severity];
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed bg-muted/30 p-4 text-sm sm:flex-row sm:items-center">
      <div className="flex-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Generic chatbot
        </span>
        <p className="mt-0.5 text-muted-foreground">
          “That’s generally fine — just don’t take more than directed.”
        </p>
      </div>
      <div
        className="hidden text-muted-foreground sm:block"
        aria-hidden
      >
        →
      </div>
      <div className="flex-1">
        <span className="text-xs font-medium uppercase tracking-wide text-primary">
          OnLabel · checked the FDA data
        </span>
        <p className={cn("mt-0.5 font-medium", v.fg)}>
          <span aria-hidden>{v.icon}</span> {v.headline}
        </p>
      </div>
    </div>
  );
}
