/**
 * L1 [E] Reconciler — deterministic (D25).
 *
 * The safety verdict is ALWAYS verify()'s deterministic result — it wins, no
 * matter what any LLM said. [E] turns the per-claim verdicts into the demo
 * payload: the list of corrections (what the ungrounded draft got wrong, with
 * the FDA-grounded right answer), the verified receipts, and the deferred
 * (unsupported) claims. It does not regenerate clinical numbers — the grounded
 * prose is produced by the fenced agent; [E] is the reconciliation ledger.
 */

import type { Severity, VerifyResult } from "./verify";
import type { ClaimKind, ClaimVerdict } from "./claims";

export interface Correction {
  claimText: string;
  kind: ClaimKind;
  /** The FDA-grounded correction (from [D]'s basis). */
  correction: string;
  citationIngredient?: string;
}

export interface ReconcileResult {
  /** Deterministic safety verdict — verify() always wins (D25). */
  verdict: Severity;
  summary: string;
  /** What the ungrounded draft got wrong, with the grounded right answer. */
  corrections: Correction[];
  /** Claims confirmed against FDA data — the receipts. */
  verified: ClaimVerdict[];
  /** Claims with no FDA basis to confirm or refute — deferred, not invented. */
  unsupported: ClaimVerdict[];
  stats: { verified: number; contradicted: number; unsupported: number };
}

/**
 * Reconcile per-claim verdicts into the final demo payload. Pure and
 * deterministic: the safety verdict is verify()'s, and corrections are read
 * straight off the CONTRADICTED verdicts.
 */
export function reconcile(
  verification: VerifyResult,
  verdicts: ClaimVerdict[],
): ReconcileResult {
  const corrections: Correction[] = [];
  const verified: ClaimVerdict[] = [];
  const unsupported: ClaimVerdict[] = [];

  for (const v of verdicts) {
    if (v.status === "CONTRADICTED") {
      corrections.push({
        claimText: v.claim.text,
        kind: v.claim.kind,
        correction: v.basis,
        citationIngredient: v.citationIngredient,
      });
    } else if (v.status === "VERIFIED") {
      verified.push(v);
    } else {
      unsupported.push(v);
    }
  }

  return {
    verdict: verification.overall,
    summary: verification.summary,
    corrections,
    verified,
    unsupported,
    stats: {
      verified: verified.length,
      contradicted: corrections.length,
      unsupported: unsupported.length,
    },
  };
}
