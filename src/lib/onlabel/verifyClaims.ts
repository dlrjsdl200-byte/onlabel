/**
 * L1 [D] verifier — hybrid, per D24.
 *
 * Clinical claims are decided HERE by deterministic code against the verify()
 * result and the human-verified KB — the LLM never judges a clinical number
 * (D15/D24). Only `language` claims are routed to an isolated LLM verifier
 * (wired in a later phase). Each claim gets VERIFIED / CONTRADICTED / UNSUPPORTED
 * plus the grounded basis, so the pipeline can show FDA receipts per claim.
 */

import type { VerifyResult } from "./verify";
import { ingredientRef, resolveIngredientKey } from "./verify";
import {
  type Claim,
  type ClaimVerdict,
  isClinicalKind,
} from "./claims";

/** Integers that immediately precede "hour(s)" — "every 4 to 6 hours" -> [4,6]. */
function hoursOf(text: string): number[] {
  const out: number[] = [];
  const re = /(\d+(?:\.\d+)?)\s*(?:to\s*\d+(?:\.\d+)?\s*)?hour/gi;
  const nums = text.match(/\d+(?:\.\d+)?(?=\s*(?:to\s*\d+(?:\.\d+)?\s*)?hour)/gi);
  if (nums) for (const n of nums) out.push(Number(n));
  // also capture the upper bound of a "X to Y hours" range
  const range = text.matchAll(/(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)\s*hour/gi);
  for (const m of range) out.push(Number(m[2]));
  void re;
  return [...new Set(out)];
}

/** Integers that precede "day(s)" — "up to 10 days" -> [10]. */
function daysOf(text: string): number[] {
  const nums = text.match(/\d+(?=\s*day)/gi);
  return nums ? [...new Set(nums.map(Number))] : [];
}

function verified(
  claim: Claim,
  basis: string,
  citationIngredient?: string,
): ClaimVerdict {
  return { claim, status: "VERIFIED", basis, citationIngredient, deterministic: true };
}
function contradicted(
  claim: Claim,
  basis: string,
  citationIngredient?: string,
): ClaimVerdict {
  return { claim, status: "CONTRADICTED", basis, citationIngredient, deterministic: true };
}
function unsupported(claim: Claim, basis: string): ClaimVerdict {
  return { claim, status: "UNSUPPORTED", basis, deterministic: true };
}

/** Decide one clinical claim against verify()/KB. Pure, no LLM. */
export function verifyClinicalClaim(
  claim: Claim,
  result: VerifyResult,
): ClaimVerdict {
  const key = claim.ingredient ? resolveIngredientKey(claim.ingredient) : null;
  const ref = key ? ingredientRef(key) : undefined;
  const finding = key
    ? result.findings.find((f) => f.ingredient === key)
    : undefined;

  switch (claim.kind) {
    case "combination-safety": {
      if (!claim.assertedVerdict)
        return unsupported(claim, "claim states no explicit verdict to check");
      if (claim.assertedVerdict === result.overall)
        return verified(
          claim,
          `deterministic verify() verdict is ${result.overall.toUpperCase()}`,
        );
      return contradicted(
        claim,
        `FDA-grounded verdict is ${result.overall.toUpperCase()}, not ${claim.assertedVerdict.toUpperCase()}`,
      );
    }

    case "dose-limit": {
      if (!ref) return unsupported(claim, `ingredient "${claim.ingredient}" not in KB`);
      if (ref.maxDailyMg == null)
        return unsupported(claim, `${ref.displayName} has no established daily ceiling`);
      if (claim.assertedNumber == null)
        return unsupported(claim, "claim states no numeric daily limit to check");
      if (claim.assertedNumber === ref.maxDailyMg)
        return verified(
          claim,
          `${ref.displayName} daily ceiling is ${ref.maxDailyMg} mg (${ref.source})`,
          key ?? undefined,
        );
      return contradicted(
        claim,
        `${ref.displayName} daily ceiling is ${ref.maxDailyMg} mg, not ${claim.assertedNumber} mg (${ref.source})`,
        key ?? undefined,
      );
    }

    case "single-dose": {
      if (!finding) return unsupported(claim, `no per-dose data for "${claim.ingredient}"`);
      if (claim.assertedNumber == null)
        return unsupported(claim, "claim states no per-dose amount to check");
      const doses = finding.contributions.map((c) => c.mgPerDose).filter((n) => n > 0);
      if (doses.length === 0)
        return unsupported(claim, `no per-dose amount on record for ${finding.displayName}`);
      if (doses.includes(claim.assertedNumber))
        return verified(
          claim,
          `${finding.displayName} label dose is ${doses.join("/")} mg`,
          key ?? undefined,
        );
      return contradicted(
        claim,
        `${finding.displayName} label dose is ${doses.join("/")} mg, not ${claim.assertedNumber} mg`,
        key ?? undefined,
      );
    }

    case "interval": {
      const grounded = ref?.dosing?.intervalText;
      if (!grounded)
        return unsupported(
          claim,
          `no FDA dosing interval on record for ${ref?.displayName ?? claim.ingredient ?? "this ingredient"}`,
        );
      const a = hoursOf(claim.assertedText ?? claim.text);
      const g = hoursOf(grounded);
      if (a.length === 0)
        return unsupported(claim, "claim states no specific interval to check");
      const min = Math.min(...g), max = Math.max(...g);
      const compatible = a.every((h) => h >= min && h <= max);
      if (compatible)
        return verified(claim, `FDA interval: ${grounded} (${ref!.dosing!.source})`, key ?? undefined);
      return contradicted(
        claim,
        `FDA interval is ${grounded}, which does not match the claim (${ref!.dosing!.source})`,
        key ?? undefined,
      );
    }

    case "duration": {
      const grounded = ref?.dosing?.maxDurationText;
      if (!grounded)
        return unsupported(
          claim,
          `no FDA treatment-duration limit on record for ${ref?.displayName ?? claim.ingredient ?? "this ingredient"}`,
        );
      const a = daysOf(claim.assertedText ?? claim.text);
      const g = daysOf(grounded);
      if (a.length === 0 || g.length === 0)
        return verified(claim, `FDA duration guidance: ${grounded}`, key ?? undefined);
      const compatible = a.some((d) => g.includes(d));
      if (compatible)
        return verified(claim, `FDA duration guidance: ${grounded}`, key ?? undefined);
      return contradicted(
        claim,
        `FDA duration guidance is "${grounded}", which does not match the claim`,
        key ?? undefined,
      );
    }

    case "duplication": {
      if (!finding)
        return unsupported(claim, `ingredient "${claim.ingredient}" not among the checked products`);
      return verified(
        claim,
        finding.duplicated
          ? `${finding.displayName} is duplicated across ${finding.contributions.length} of the named products`
          : `${finding.displayName} appears in only one of the named products`,
        key ?? undefined,
      );
    }

    case "ingredient-identity": {
      if (!ref) return unsupported(claim, `"${claim.ingredient}" is not a known active ingredient`);
      const inProduct = result.matched.some((p) =>
        p.ingredients.some((i) => i.ingredient === key),
      );
      return verified(
        claim,
        inProduct
          ? `${ref.displayName} is an active ingredient in the named product(s)`
          : `${ref.displayName} is a recognized active ingredient`,
        key ?? undefined,
      );
    }

    default:
      return unsupported(claim, "unrecognized clinical claim kind");
  }
}

/**
 * Route a set of claims. Clinical kinds are decided deterministically here;
 * `language` claims are deferred to the isolated LLM verifier (later phase) and
 * marked non-deterministic so callers can dispatch them.
 */
export function verifyClaims(
  claims: Claim[],
  result: VerifyResult,
): ClaimVerdict[] {
  return claims.map((claim) =>
    isClinicalKind(claim.kind)
      ? verifyClinicalClaim(claim, result)
      : {
          claim,
          status: "UNSUPPORTED" as const,
          basis: "language claim — pending isolated LLM verifier",
          deterministic: false,
        },
  );
}
