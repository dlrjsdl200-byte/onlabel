/**
 * L1 [D] verifier — hybrid, per D24.
 *
 * Clinical claims are decided HERE by deterministic code against the verify()
 * result and the human-verified KB — the LLM never judges a clinical number
 * (D15/D24). Only `language` claims are routed to an isolated LLM verifier
 * (wired in a later phase). Each claim gets VERIFIED / CONTRADICTED / UNSUPPORTED
 * plus the grounded basis, so the pipeline can show FDA receipts per claim.
 */

import { verify, ingredientRef, resolveIngredientKey, resolveProduct, type VerifyResult } from "./verify";
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

/** Integers that precede "day(s)" — "up to 10 days" / "10-day course" -> [10].
 * The optional hyphen/space lets the compound form ("10-day") match too. (B-26) */
function daysOf(text: string): number[] {
  const nums = text.match(/\d+(?=\s*-?\s*day)/gi);
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
      // A combination-safety claim may be about a DIFFERENT product set than the
      // question (e.g. "you can pair either NSAID with Tylenol"). Check the
      // claim's own scope so we don't judge it against the wrong verdict.
      const scoped =
        claim.assertedProducts && claim.assertedProducts.length >= 2
          ? verify(claim.assertedProducts)
          : result;
      const scope =
        scoped === result ? "" : ` for ${claim.assertedProducts!.join(" + ")}`;
      if (claim.assertedVerdict === scoped.overall)
        return verified(
          claim,
          `deterministic verify() verdict${scope} is ${scoped.overall.toUpperCase()}`,
        );
      return contradicted(
        claim,
        `FDA-grounded verdict${scope} is ${scoped.overall.toUpperCase()}, not ${claim.assertedVerdict.toUpperCase()}`,
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
      // Only a number ABOVE the FDA ceiling is dangerous misinformation. A figure
      // AT or BELOW the ceiling is a more conservative daily limit — safe to
      // follow, so we don't contradict it (and we don't invent a specific
      // "conservative target" number the KB can't source). We ground the real
      // FDA ceiling either way.
      if (claim.assertedNumber > ref.maxDailyMg)
        return contradicted(
          claim,
          `${claim.assertedNumber} mg/day exceeds the FDA ceiling of ${ref.maxDailyMg} mg for ${ref.displayName} — risk of overdose (${ref.source})`,
          key ?? undefined,
        );
      return verified(
        claim,
        `${claim.assertedNumber} mg/day stays within the FDA ceiling of ${ref.maxDailyMg} mg for ${ref.displayName} — a more conservative daily limit (${ref.source})`,
        key ?? undefined,
      );
    }

    case "single-dose": {
      if (!finding) return unsupported(claim, `no per-dose data for "${claim.ingredient}"`);
      if (claim.assertedNumber == null)
        return unsupported(claim, "claim states no per-dose amount to check");
      // A per-DOSE amount (mgPerDose) and a per-UNIT amount (one caplet/tablet of
      // a multi-unit dose, e.g. a 500 mg caplet of a 1,000 mg dose) are BOTH true
      // statements a consumer or generic AI may cite. Accept either so we never
      // contradict a true "500 mg per pill" as if it were the per-dose figure (B-10).
      const perDose = [
        ...new Set(finding.contributions.map((c) => c.mgPerDose).filter((n) => n > 0)),
      ];
      const perUnit = [
        ...new Set(
          finding.contributions
            .filter((c) => c.unitsPerDose > 0 && c.mgPerDose > 0)
            .map((c) => c.mgPerDose / c.unitsPerDose),
        ),
      ];
      if (perDose.length === 0)
        return unsupported(claim, `no per-dose amount on record for ${finding.displayName}`);
      const perUnitDiffers = perUnit.some((u) => !perDose.includes(u));
      const unitNote = perUnitDiffers ? ` (${perUnit.join("/")} mg per unit)` : "";
      if (perDose.includes(claim.assertedNumber) || perUnit.includes(claim.assertedNumber))
        return verified(
          claim,
          `${finding.displayName} label amount is ${perDose.join("/")} mg per dose${unitNote}`,
          key ?? undefined,
        );
      return contradicted(
        claim,
        `${finding.displayName} label amount is ${perDose.join("/")} mg per dose${unitNote}, not ${claim.assertedNumber} mg`,
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
      // The claim asserts a SPECIFIC product contains this ingredient. Check THAT
      // product, not "any checked product": otherwise "Tylenol contains ibuprofen"
      // passes just because ibuprofen is in a different named product (Advil), and
      // "DayQuil contains ibuprofen" is waved through as merely "a recognized
      // ingredient". Both are false and must be CONTRADICTED. (B-23)
      const target = claim.product ? resolveProduct(claim.product)?.product : null;
      if (target) {
        const has = target.ingredients.some((i) => i.ingredient === key);
        return has
          ? verified(claim, `${ref.displayName} is an active ingredient in ${target.brand}`, key ?? undefined)
          : contradicted(
              claim,
              `${target.brand} does not contain ${ref.displayName} — its active ingredients are ${target.ingredients
                .map((i) => i.ingredient)
                .join(", ")}`,
              key ?? undefined,
            );
      }
      // No specific product named (or it didn't resolve): the claim is only that
      // this is a real active ingredient — a weaker, true statement.
      return verified(claim, `${ref.displayName} is a recognized active ingredient`, key ?? undefined);
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
