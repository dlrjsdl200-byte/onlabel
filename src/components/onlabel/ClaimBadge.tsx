import type { ClaimStatus } from "@/lib/onlabel/claims";
import { cn } from "@/lib/utils";

const STYLE: Record<ClaimStatus, { label: string; icon: string; cls: string }> = {
  VERIFIED: {
    label: "Verified",
    icon: "✓",
    cls: "border-verdict-ok/40 bg-verdict-ok-bg/50 text-verdict-ok-fg",
  },
  CONTRADICTED: {
    label: "Contradicted",
    icon: "✕",
    cls: "border-verdict-danger/40 bg-verdict-danger-bg/60 text-verdict-danger-fg",
  },
  UNSUPPORTED: {
    label: "Unverifiable",
    icon: "?",
    cls: "border-verdict-caution/40 bg-verdict-caution-bg/50 text-verdict-caution-fg",
  },
};

export function ClaimBadge({ status }: { status: ClaimStatus }) {
  const s = STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        s.cls,
      )}
    >
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}
