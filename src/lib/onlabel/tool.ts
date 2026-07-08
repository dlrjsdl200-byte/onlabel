/**
 * OnLabel in-process SDK tool.
 *
 * Wraps the deterministic verifier as a tool the Claude Agent SDK can call.
 * The tool returns both a human-readable summary (for Claude to ground its
 * answer on) and machine-readable structuredContent (the full VerifyResult).
 */

import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { verify, type VerifyResult } from "./verify";

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
