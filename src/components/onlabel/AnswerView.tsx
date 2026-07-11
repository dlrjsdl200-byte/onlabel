import type { VerifyResult } from "@/lib/onlabel/verify";
import { VerdictCard } from "./VerdictCard";
import { AssumptionNote } from "./AssumptionNote";
import { Disclosure } from "./Disclosure";
import { IngredientLedger } from "./IngredientLedger";
import { EfficacyNote } from "./EfficacyNote";
import { Sources } from "./Sources";
import { Disclaimer } from "./Disclaimer";

/**
 * Presentational answer view. Renders in "verdict-first" order:
 * deterministic verdict + ledger snap immediately; prose fills in below.
 * `prose` may be empty while streaming.
 */
export function AnswerView({
  question,
  result,
  prose,
  streaming,
}: {
  question: string;
  result: VerifyResult;
  prose: string;
  streaming?: boolean;
}) {
  return (
    <div className="flex w-full flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">You asked:</span>{" "}
        {question}
      </p>

      <VerdictCard severity={result.overall} summary={result.summary} />

      <AssumptionNote assumptions={result.assumptions} />

      {result.unmatched.length > 0 && (
        <p className="rounded-lg border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          Couldn’t recognize: {result.unmatched.join(", ")}. Checked the rest.
        </p>
      )}

      <div className="text-[15px] leading-relaxed text-foreground/90">
        {prose ? (
          <p className="whitespace-pre-wrap">{prose}</p>
        ) : (
          <div className="space-y-2" aria-hidden>
            <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
          </div>
        )}
        {streaming && prose && (
          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary align-middle" />
        )}
      </div>

      {result.findings.length > 0 && (
        <Disclosure
          summary="See the dose math"
          meta={`${result.findings.length} ingredient${
            result.findings.length === 1 ? "" : "s"
          }`}
        >
          <IngredientLedger findings={result.findings} />
          <EfficacyNote findings={result.findings} />
        </Disclosure>
      )}

      <Sources result={result} />

      <Disclaimer />
    </div>
  );
}
