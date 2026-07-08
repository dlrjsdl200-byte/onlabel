/**
 * L1 claim pipeline — shared types ([C] decomposition contract).
 *
 * [C] decomposes an ungrounded draft into atomic claims. Each claim records
 * WHAT the draft asserted (its parameters), never whether the assertion is
 * correct — correctness is decided downstream by [D]. For clinical claims that
 * decision is deterministic (verify()/KB), never the LLM (D24). Only `language`
 * claims are routed to an isolated LLM verifier.
 */

import { z } from "zod";

/** Clinical kinds are checked by code against the KB; `language` goes to the LLM verifier. */
export const CLAIM_KINDS = [
  "combination-safety", // asserts a verdict about taking the products together
  "dose-limit", // asserts a daily maximum for an ingredient
  "single-dose", // asserts a per-dose amount for an ingredient
  "interval", // asserts hours between doses
  "duration", // asserts how many days it is safe to use
  "duplication", // asserts an ingredient is / is not duplicated across products
  "ingredient-identity", // asserts a product contains / is a given active ingredient
  "language", // non-clinical framing, mechanism, or advice
] as const;

export type ClaimKind = (typeof CLAIM_KINDS)[number];

/** A single atomic assertion extracted from the draft (what it SAID, not truth). */
export interface Claim {
  /** Verbatim (or lightly trimmed) span from the draft. */
  text: string;
  kind: ClaimKind;
  /** Active-ingredient name the claim is about, when applicable. */
  ingredient?: string;
  /** Product/brand the claim is about, when applicable. */
  product?: string;
  /** For a combination-safety claim, the specific products it is about — which
   * may be a DIFFERENT set than the question's products (e.g. a draft that also
   * comments on pairing with a third drug). [D] checks the claim's own scope. */
  assertedProducts?: string[];
  /** A numeric amount the draft asserted (e.g. 4000 for "4,000 mg/day"). */
  assertedNumber?: number;
  /** Unit for assertedNumber, e.g. "mg/day", "mg". */
  assertedUnit?: string;
  /** A verdict the draft asserted about the combination. */
  assertedVerdict?: "ok" | "caution" | "danger";
  /** Free-text the draft asserted (e.g. "every 4 hours", "up to 10 days"). */
  assertedText?: string;
}

export type ClaimStatus = "VERIFIED" | "CONTRADICTED" | "UNSUPPORTED";

/** [D]'s per-claim result. `basis` is the FDA grounding or the correction. */
export interface ClaimVerdict {
  claim: Claim;
  status: ClaimStatus;
  /** How code (or the verifier) decided — the grounded fact or the correction. */
  basis: string;
  /** Ingredient key whose KB entry / citation grounds this verdict, if any. */
  citationIngredient?: string;
  /** true when a clinical claim was decided by deterministic code (D24). */
  deterministic: boolean;
}

/** Zod schema forcing [C]'s structured output via a required `emit_claims` tool call. */
export const emitClaimsSchema = {
  claims: z
    .array(
      z.object({
        text: z.string().describe("the exact sentence/span from the draft"),
        kind: z.enum(CLAIM_KINDS),
        ingredient: z
          .string()
          .optional()
          .describe("active ingredient the claim is about, e.g. 'acetaminophen'"),
        product: z.string().optional().describe("brand/product the claim is about"),
        assertedProducts: z
          .array(z.string())
          .optional()
          .describe(
            "for combination-safety: the exact products this claim is about, if it differs from the question (e.g. ['Advil','Tylenol'] when the draft comments on pairing with a third drug)",
          ),
        assertedNumber: z
          .number()
          .optional()
          .describe("a numeric amount the draft stated, e.g. 4000"),
        assertedUnit: z.string().optional().describe("unit, e.g. 'mg/day' or 'mg'"),
        assertedVerdict: z
          .enum(["ok", "caution", "danger"])
          .optional()
          .describe("verdict the draft asserted about combining the products"),
        assertedText: z
          .string()
          .optional()
          .describe("free-text the draft stated, e.g. 'every 4 hours'"),
      }),
    )
    .describe("every atomic factual assertion in the draft, decomposed"),
};

/** Clinical kinds are decided deterministically; `language` is the only LLM-routed kind. */
export function isClinicalKind(kind: ClaimKind): boolean {
  return kind !== "language";
}
