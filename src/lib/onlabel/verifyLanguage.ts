/**
 * L1 [D-lang] — isolated LLM verifier for non-clinical (language) claims (D24).
 *
 * Only `language` claims reach here; clinical numbers are decided by code
 * (verifyClaims.ts), never the LLM. Per CoVe's factored variant the verifier is
 * shown ONE claim in isolation — it never sees the original draft or the other
 * claims — so its judgement is not conditioned on the draft's reasoning, which
 * is what makes independent verification reduce hallucination (D23).
 */

import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { Claim, ClaimVerdict } from "./claims";

const LANGUAGE_VERIFIER_PROMPT = `You are an independent fact-checker for consumer OTC
medication advice. You are shown ONE claim in isolation — you do NOT see the answer it
came from. Judge only this claim against well-established general medication knowledge:
- SUPPORTED: broadly correct and standard advice.
- CONTRADICTED: incorrect or unsafe as stated.
- UNSUPPORTED: not verifiable, overly specific, or depends on individual circumstances.

Do NOT evaluate specific dosing numbers, daily limits, or dose intervals — those are
checked separately; if the claim is essentially about a number, answer UNSUPPORTED.
Call emit_verdict exactly once with your status and a one-sentence reason.`;

const emitVerdictSchema = {
  status: z.enum(["SUPPORTED", "CONTRADICTED", "UNSUPPORTED"]),
  reason: z.string().describe("one-sentence justification"),
};

/** Verify a single language claim in an isolated context. Requires ANTHROPIC_API_KEY. */
export async function verifyLanguageClaim(claim: Claim): Promise<ClaimVerdict> {
  let status: "SUPPORTED" | "CONTRADICTED" | "UNSUPPORTED" = "UNSUPPORTED";
  let reason = "no verdict returned";
  const emitVerdict = tool(
    "emit_verdict",
    "Record the verdict for the single claim.",
    emitVerdictSchema,
    async (args) => {
      status = args.status;
      reason = args.reason;
      return { content: [{ type: "text", text: "recorded" }] };
    },
  );
  const server = createSdkMcpServer({
    name: "langverify",
    version: "0.1.0",
    tools: [emitVerdict],
  });
  // The prompt contains ONLY the claim — never the draft (factored independence).
  for await (const _m of query({
    prompt: `Claim: "${claim.text}"\n\nJudge it and call emit_verdict once.`,
    options: {
      systemPrompt: LANGUAGE_VERIFIER_PROMPT,
      mcpServers: { langverify: server },
      allowedTools: ["mcp__langverify__emit_verdict"],
      tools: [],
    },
  })) {
    void _m;
  }
  const MAP = {
    SUPPORTED: "VERIFIED",
    CONTRADICTED: "CONTRADICTED",
    UNSUPPORTED: "UNSUPPORTED",
  } as const;
  return {
    claim,
    status: MAP[status],
    basis: `independent verifier: ${reason}`,
    deterministic: false,
  };
}
