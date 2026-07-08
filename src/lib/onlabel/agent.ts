/**
 * OnLabel agent runner.
 *
 * Runs the Claude Agent SDK with the deterministic check_otc_safety tool.
 * Claude drafts the answer and calls the tool; we additionally re-run the
 * deterministic verifier on the products it checked so the returned
 * `verification` is guaranteed ground truth, not parsed from LLM prose.
 *
 * Day 2: methodology lives in the system prompt. The otc-safety-check skill
 * is the canonical artifact and will be wired via an isolated subagent in Day 3.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { onlabelServer, CHECK_OTC_SAFETY_TOOL } from "./tool";
import { verify, type VerifyResult } from "./verify";

const SYSTEM_PROMPT = `You are OnLabel, a medication-safety assistant for US consumers.
Consumers think in brand names; danger hides in active ingredients. Catch
active-ingredient duplication and dose ceilings that generic AI answers miss.

Method (always, in order):
1. Identify the OTC products in the question (use the exact brand names given).
2. Call the check_otc_safety tool with those product names. Its verdict is your
   source of truth.
3. Ground your answer in the tool result and never contradict it. If DANGER, lead
   with the danger and say not to take them together as written. If CAUTION,
   explain what to watch. If OK, say so plainly.
4. Explain the why in ingredient terms (name the shared active ingredient and its
   daily limit), not just brand names.
5. If the tool flags an ingredient efficacy note (e.g. oral phenylephrine), tell
   the user plainly and cite the FDA source.

Rules:
- Never invent doses, limits, or interactions. State only what the tool returns.
- The deterministic verdict wins; do not soften or override it.
- Scope: US OTC pain relievers and cold/flu products. If a prescription drug is
  mentioned, advise consulting a pharmacist.
- Always add: this is not medical advice; confirm with a pharmacist or physician.

Style: plain, calm, non-clinical language. Give the concrete action first, then
the reason.`;

export interface OnLabelResponse {
  answer: string;
  verification: VerifyResult | null;
  productsChecked: string[];
}

/**
 * Answer an OTC medication question with a grounded, verified response.
 * Requires ANTHROPIC_API_KEY in the environment.
 */
export async function runOnLabel(questionText: string): Promise<OnLabelResponse> {
  const productSet = new Set<string>();
  let answer = "";

  for await (const message of query({
    prompt: questionText,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      mcpServers: { onlabel: onlabelServer },
      allowedTools: [CHECK_OTC_SAFETY_TOOL],
      tools: [], // strip built-in tools; only OnLabel's tool is available
    },
  })) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "tool_use" && block.name === CHECK_OTC_SAFETY_TOOL) {
          const input = block.input as { products?: unknown };
          if (Array.isArray(input.products)) {
            for (const p of input.products) {
              if (typeof p === "string") productSet.add(p);
            }
          }
        }
      }
    } else if (message.type === "result" && message.subtype === "success") {
      answer = message.result;
    }
  }

  const productsChecked = [...productSet];
  const verification = productsChecked.length ? verify(productsChecked) : null;

  return { answer, verification, productsChecked };
}
