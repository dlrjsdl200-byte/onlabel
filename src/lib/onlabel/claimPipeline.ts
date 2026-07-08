/**
 * L1 claim pipeline — [A'] ungrounded draft + [C] decomposition + [D] routing.
 *
 * Per D23/D25 the pipeline is aimed at an UNGROUNDED draft (what a generic LLM
 * says with no tools), then decomposes it into atomic claims and checks each
 * against FDA data. Clinical claims are decided deterministically ([D-clinical],
 * verifyClaims.ts); this module wires generation + decomposition. The isolated
 * language verifier and reconciler come in a later phase.
 */

import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { verify, type VerifyResult } from "./verify";
import { verifyClinicalClaim } from "./verifyClaims";
import { verifyLanguageClaim } from "./verifyLanguage";
import { reconcile, type ReconcileResult } from "./reconcile";
import { emitClaimsSchema, isClinicalKind, type Claim, type ClaimVerdict } from "./claims";

/**
 * [A'] The generic-LLM baseline: a plain, helpful assistant answering from
 * general knowledge with NO tool and NO grounding fence. This is deliberately
 * the ungrounded side of the contrast (D25) — do not add tools or citations.
 */
const GENERIC_SYSTEM_PROMPT = `You are a helpful general-purpose assistant. Answer the
user's over-the-counter medication question directly and concretely in a few plain
sentences, the way a knowledgeable friend would. Give specific dosing numbers and a
clear yes/no on combining products. Do not hedge excessively.`;

/**
 * [C] Decomposition system prompt. Extracts WHAT the draft asserted, tagging the
 * kind and parameters — it does NOT judge correctness (that is [D]'s job).
 */
const DECOMPOSE_SYSTEM_PROMPT = `You extract atomic factual claims from a draft answer
about OTC medications. Break the draft into individual verifiable assertions. For each
claim, capture what the draft SAID — never judge whether it is correct.

Tag each claim's kind:
- combination-safety: an overall verdict about taking products together (set
  assertedVerdict to ok = safe, caution, or danger = unsafe). If the claim is
  about a specific pair/set of products — ESPECIALLY if it differs from the
  question (e.g. the draft says you may pair an NSAID with Tylenol) — list them
  in assertedProducts so it is checked against the right combination.
- dose-limit: a daily maximum for an ingredient (set ingredient + assertedNumber in mg/day).
- single-dose: a per-dose amount (set ingredient + assertedNumber in mg).
- interval: hours between doses (set ingredient + assertedText, e.g. "every 4 hours").
- duration: how many days it is safe to use (set ingredient + assertedText).
- duplication: an ingredient appears in / is shared across products (set ingredient).
- ingredient-identity: a product contains or is a given active ingredient (set ingredient + product).
- language: mechanism, framing, general advice — anything not a checkable clinical number.

Normalize ingredient to the active-ingredient name (e.g. "Tylenol" -> "acetaminophen",
"Advil" -> "ibuprofen"). Call emit_claims exactly once with all claims.`;

/** [A'] Generate the ungrounded generic-LLM draft. Requires ANTHROPIC_API_KEY. */
export async function generateUngroundedDraft(question: string): Promise<string> {
  let out = "";
  for await (const message of query({
    prompt: question,
    options: { systemPrompt: GENERIC_SYSTEM_PROMPT, tools: [] },
  })) {
    if (message.type === "result" && message.subtype === "success") {
      out = message.result;
    }
  }
  return out.trim();
}

/** [C] Decompose a draft into atomic, kind-tagged claims via forced tool call. */
export async function decomposeClaims(draft: string): Promise<Claim[]> {
  let captured: Claim[] = [];
  const emitClaims = tool(
    "emit_claims",
    "Record the atomic factual claims extracted from the draft.",
    emitClaimsSchema,
    async (args) => {
      captured = args.claims as Claim[];
      return { content: [{ type: "text", text: `recorded ${captured.length} claims` }] };
    },
  );
  const server = createSdkMcpServer({
    name: "claims",
    version: "0.1.0",
    tools: [emitClaims],
  });
  for await (const _message of query({
    prompt: `Decompose this medication answer into atomic claims and call emit_claims once.\n\n---\n${draft}`,
    options: {
      systemPrompt: DECOMPOSE_SYSTEM_PROMPT,
      mcpServers: { claims: server },
      allowedTools: ["mcp__claims__emit_claims"],
      tools: [],
    },
  })) {
    void _message;
  }
  return captured;
}

/**
 * [D] Route every claim: clinical kinds are decided deterministically against
 * verify()/KB (no LLM), language claims go to the isolated verifier in parallel.
 */
export async function verifyAllClaims(
  claims: Claim[],
  verification: VerifyResult,
): Promise<ClaimVerdict[]> {
  return Promise.all(
    claims.map((claim) =>
      isClinicalKind(claim.kind)
        ? Promise.resolve(verifyClinicalClaim(claim, verification))
        : verifyLanguageClaim(claim),
    ),
  );
}

export interface ClaimPipelineResult {
  question: string;
  draft: string;
  verification: VerifyResult;
  verdicts: ClaimVerdict[];
  reconciled: ReconcileResult;
}

/**
 * Full [A']->[C]->[D]->[E] pass for the contrast engine: generate an ungrounded
 * draft, decompose it, check each claim (clinical deterministically, language in
 * isolation), and reconcile into the demo payload (deterministic verdict +
 * corrections + receipts). Products are the ground truth for [D].
 */
export async function runClaimPipeline(
  question: string,
  products: string[],
): Promise<ClaimPipelineResult> {
  const draft = await generateUngroundedDraft(question);
  const claims = await decomposeClaims(draft);
  const verification = verify(products);
  const verdicts = await verifyAllClaims(claims, verification);
  const reconciled = reconcile(verification, verdicts);
  return { question, draft, verification, verdicts, reconciled };
}
