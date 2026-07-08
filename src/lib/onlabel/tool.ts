/**
 * OnLabel in-process SDK tool.
 *
 * Wraps the deterministic verifier as a tool the Claude Agent SDK can call.
 * The tool returns both a human-readable summary (for Claude to ground its
 * answer on) and machine-readable structuredContent (the full VerifyResult).
 */

import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { verify, type VerifyResult, type IngredientFinding } from "./verify";

/**
 * Pure core: run a safety check and format a summary for an LLM to read.
 * Separated from the SDK tool so it can be unit-tested without an LLM.
 */
export function runSafetyCheck(products: string[]): {
  text: string;
  result: VerifyResult;
} {
  const result = verify(products);

  const lines: string[] = [];
  lines.push(`VERDICT: ${result.overall.toUpperCase()}`);
  lines.push(`Products checked: ${result.matched.map((p) => p.brand).join(", ") || "(none matched)"}`);
  if (result.unmatched.length) {
    lines.push(`Not in catalog: ${result.unmatched.join(", ")}`);
  }
  if (result.genericIngredients.length) {
    lines.push(
      `Bare ingredient(s) named (counted for duplication, but amount unknown — do not state a dose or daily total for these): ${result.genericIngredients
        .map((g) => g.input)
        .join(", ")}`,
    );
  }

  // Direction A — grounded dosing surface. Every ingredient finding (including
  // ok-severity ones) already carries per-product mg/dose, units/dose, and the
  // daily ceiling. Surface them for ALL matched products, not just flagged ones,
  // so the answer states dosing numbers that are grounded in the FDA KB rather
  // than the model's memory. These are the ONLY clinical numbers Claude may state.
  const dispByIngredient = new Map<
    string,
    { name: string; limitMg: number | null; dosing?: IngredientFinding["dosing"] }
  >();
  for (const f of result.findings) {
    dispByIngredient.set(f.ingredient, {
      name: f.displayName,
      limitMg: f.limitMg,
      dosing: f.dosing,
    });
  }
  if (result.matched.length) {
    lines.push("");
    lines.push(
      "Dosing (FDA-grounded KB — state ONLY these numbers; anything not listed is unknown to this tool):",
    );
    for (const p of result.matched) {
      const parts = p.ingredients.map((ing) => {
        const meta = dispByIngredient.get(ing.ingredient);
        const name = meta?.name ?? ing.ingredient;
        const perDay = ing.mgPerDose * p.maxDosesPerDay;
        const ceiling = meta?.limitMg != null ? `${meta.limitMg} mg/day ceiling` : "no established daily ceiling";
        let line = `${name} ${ing.mgPerDose} mg/dose, up to ${p.maxDosesPerDay} doses/day = ${perDay} mg/day at label max (${ceiling})`;
        // Direction B — grounded dosing schedule (interval/duration) when present.
        // The interval is the immediate-release monograph value; it does NOT apply
        // to extended-release SKUs (e.g. Mucinex ER is q12h, not the IR q4h), so
        // suppress the interval for ER dose forms and let the fence defer instead.
        const isExtendedRelease = /\ber\b|extended|-er/.test(p.doseForm.toLowerCase());
        if (meta?.dosing && !isExtendedRelease) {
          line += `; interval: ${meta.dosing.intervalText}`;
          if (meta.dosing.maxDurationText) line += `; duration: ${meta.dosing.maxDurationText}`;
        }
        return line;
      });
      lines.push(
        `- ${p.brand}: ${p.unitsPerDose} ${p.doseForm}${p.unitsPerDose === 1 ? "" : "s"}/dose. ${parts.join("; ")}.`,
      );
    }
    lines.push("");
    lines.push(
      "State the interval/duration above ONLY for the ingredients that list one; if an ingredient has no interval or " +
        "duration line, do not state one — defer to the label or a pharmacist. NEVER provided by this tool (always defer): " +
        "any single-dose maximum beyond the mg/dose above, onset or how long a dose lasts, extended-release/crushing " +
        "guidance, and interactions with alcohol, caffeine, food, or anything not in the catalog. This tool checks the " +
        "named products against label maximums only — it does not know a quantity or schedule the user describes, nor how " +
        "much they have already taken.",
    );
  }

  const flagged = result.findings.filter((f) => f.severity !== "ok");
  if (flagged.length) {
    lines.push("");
    lines.push("Ingredient findings:");
    for (const f of flagged) {
      lines.push(
        `- [${f.severity.toUpperCase()}] ${f.message} (limit ${f.limitMg ?? "n/a"} mg/day; source: ${f.source})`,
      );
      if (f.efficacyNote) lines.push(`  NOTE: ${f.efficacyNote}`);
    }
  }
  for (const c of result.classFindings) {
    lines.push(`- [${c.severity.toUpperCase()}] ${c.message}`);
  }
  if (!flagged.length && !result.classFindings.length && result.matched.length) {
    lines.push("No ingredient duplication or dose-ceiling problems found.");
  }

  // Efficacy notes surface regardless of dose/duplication severity — an
  // ineffective ingredient is a separate concern the consumer should know.
  const efficacy = result.findings.filter((f) => f.efficacyNote);
  if (efficacy.length) {
    lines.push("");
    lines.push("Efficacy notes:");
    for (const f of efficacy) {
      const refs = f.efficacyRefs?.length ? ` (${f.efficacyRefs.join(" ")})` : "";
      lines.push(`- ${f.displayName}: ${f.efficacyNote}${refs}`);
    }
  }

  return { text: lines.join("\n"), result };
}

export const checkOtcSafetyTool = tool(
  "check_otc_safety",
  "Check whether a set of over-the-counter (OTC) pain-relief or cold/flu products is safe to take together. Returns a deterministic verdict grounded in FDA ingredient data: active-ingredient duplication (especially acetaminophen), cumulative dose vs. the daily maximum, and drug-class overlap (multiple NSAIDs, decongestants, or sedating antihistamines). Call this whenever the user asks about combining or dosing OTC medicines. Pass the product brand names exactly as the user wrote them.",
  {
    products: z
      .array(z.string())
      .min(1)
      .describe("OTC product brand names the user is asking about, e.g. ['Tylenol Extra Strength', 'DayQuil']"),
  },
  async (args) => {
    const { text, result } = runSafetyCheck(args.products);
    return {
      content: [{ type: "text", text }],
      structuredContent: result as unknown as Record<string, unknown>,
    };
  },
  { annotations: { readOnlyHint: true } },
);

export const onlabelServer = createSdkMcpServer({
  name: "onlabel",
  version: "0.1.0",
  tools: [checkOtcSafetyTool],
});

/** Fully-qualified tool name for allowedTools. */
export const CHECK_OTC_SAFETY_TOOL = "mcp__onlabel__check_otc_safety";
