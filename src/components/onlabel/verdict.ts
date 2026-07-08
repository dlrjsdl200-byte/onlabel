import type { Severity } from "@/lib/onlabel/verify";

export interface VerdictStyle {
  label: string;
  headline: string;
  icon: string;
  /** tailwind text color token */
  fg: string;
  /** tailwind bg tint token */
  bg: string;
  /** tailwind border token */
  border: string;
  /** solid accent for the icon chip */
  solid: string;
}

export const VERDICT: Record<Severity, VerdictStyle> = {
  danger: {
    label: "Danger",
    headline: "Don't take these together as written",
    icon: "✕",
    fg: "text-verdict-danger-fg",
    bg: "bg-verdict-danger-bg",
    border: "border-verdict-danger/40",
    solid: "bg-verdict-danger",
  },
  caution: {
    label: "Caution",
    headline: "Check before combining",
    icon: "!",
    fg: "text-verdict-caution-fg",
    bg: "bg-verdict-caution-bg",
    border: "border-verdict-caution/40",
    solid: "bg-verdict-caution",
  },
  ok: {
    label: "OK",
    headline: "No duplication or dose-ceiling problems found",
    icon: "✓",
    fg: "text-verdict-ok-fg",
    bg: "bg-verdict-ok-bg",
    border: "border-verdict-ok/40",
    solid: "bg-verdict-ok",
  },
};

export function fmtMg(mg: number): string {
  return mg.toLocaleString("en-US") + " mg";
}

const DOSE_FORM_LABEL: Record<string, [string, string]> = {
  tablet: ["tablet", "tablets"],
  caplet: ["caplet", "caplets"],
  liquicap: ["LiquiCap", "LiquiCaps"],
  "tablet-er": ["ER tablet", "ER tablets"],
};

/** e.g. "2 caplets × 3/day = 3,000 mg" for one product's contribution. */
export function fmtRegimen(c: {
  unitsPerDose: number;
  doseForm: string;
  dosesPerDay: number;
  maxDailyMg: number;
}): string {
  const [one, many] = DOSE_FORM_LABEL[c.doseForm] ?? ["unit", "units"];
  const unit = c.unitsPerDose === 1 ? one : many;
  return `${c.unitsPerDose} ${unit} × ${c.dosesPerDay}/day = ${fmtMg(
    c.maxDailyMg,
  )}`;
}
