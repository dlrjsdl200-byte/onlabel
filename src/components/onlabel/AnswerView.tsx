import type { VerifyResult, IngredientFinding } from "@/lib/onlabel/verify";
import { cn } from "@/lib/utils";
import { VerdictCard } from "./VerdictCard";
import { AssumptionNote } from "./AssumptionNote";
import { IngredientLedger } from "./IngredientLedger";
import { EfficacyNote } from "./EfficacyNote";
import { Sources } from "./Sources";
import { LabelWarnings } from "./LabelWarnings";
import { FollowUps } from "./FollowUps";
import { Disclaimer } from "./Disclaimer";

/**
 * Two-column result: the answer reads on the left, the FDA evidence sits in a
 * right rail (expanded, since a rail has the room to show the dose table and
 * sources open). On desktop this fills the horizontal space; on mobile the grid
 * collapses to one column and the rail stacks below the answer.
 *
 * Verdict-first order is preserved: the deterministic verdict + ledger snap in
 * immediately; `prose` fills in below and may be empty while streaming.
 */
export function AnswerView({
  question,
  result,
  prose,
  streaming,
  onAsk,
}: {
  question: string;
  result: VerifyResult;
  prose: string;
  streaming?: boolean;
  onAsk?: (q: string) => void;
}) {
  const hasFindings = result.findings.length > 0;
  const productCount = new Set(result.matched.map((p) => p.brand)).size;

  return (
    <div className="flex w-full flex-col gap-5">
      <div>
        <p className="text-[15px] font-medium tracking-tight">
          <span className="text-muted-foreground">You asked:</span> {question}
        </p>
        <MetaStrip productCount={productCount} ingredientCount={result.findings.length} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start lg:gap-6">
        {/* MAIN — the answer */}
        <div className="flex min-w-0 flex-col gap-5">
          <VerdictCard severity={result.overall} summary={result.summary} />

          <NumbersStrip findings={result.findings} />

          <AssumptionNote assumptions={result.assumptions} />

          {result.unmatched.length > 0 && (
            <p className="rounded-lg border-2 border-foreground bg-card px-4 py-2 text-sm font-medium text-muted-foreground">
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

          {!streaming && hasFindings && onAsk && (
            <FollowUps result={result} onAsk={onAsk} />
          )}
        </div>

        {/* RAIL — the FDA evidence, expanded */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          {hasFindings && (
            <section>
              <h3 className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground">
                Ingredient ledger
              </h3>
              <IngredientLedger findings={result.findings} />
            </section>
          )}

          <EfficacyNote findings={result.findings} />

          <LabelWarnings result={result} />

          <Sources result={result} />
        </aside>
      </div>

      <Disclaimer />
    </div>
  );
}

/** A "what we checked" strip that makes the result read as substantive at a glance. */
function MetaStrip({
  productCount,
  ingredientCount,
}: {
  productCount: number;
  ingredientCount: number;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {productCount > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-foreground bg-card px-3 py-1 text-xs font-bold text-muted-foreground">
          <b className="tabular-nums text-foreground">{productCount}</b>
          {productCount === 1 ? "product" : "products"}
        </span>
      )}
      {ingredientCount > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-foreground bg-card px-3 py-1 text-xs font-bold text-muted-foreground">
          <b className="tabular-nums text-foreground">{ingredientCount}</b>
          active {ingredientCount === 1 ? "ingredient" : "ingredients"}
        </span>
      )}
      <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background">
        ✓ checked against FDA labels
      </span>
    </div>
  );
}

/**
 * The dose overage made loud (Traffic-Light) — combined daily total vs the FDA
 * limit vs the amount over, driven by the worst dose-exceeding ingredient. Only
 * shows when a finding actually exceeds its ceiling; every number is from verify().
 */
function NumbersStrip({ findings }: { findings: IngredientFinding[] }) {
  const worst = findings
    .filter((f) => f.exceedsLimit && f.limitMg != null)
    .sort(
      (a, b) =>
        b.totalMaxDailyMg - (b.limitMg ?? 0) - (a.totalMaxDailyMg - (a.limitMg ?? 0)),
    )[0];
  if (!worst || worst.limitMg == null) return null;
  const over = worst.totalMaxDailyMg - worst.limitMg;
  const fmt = (n: number) => n.toLocaleString("en-US");
  return (
    <div className="flex overflow-hidden rounded-xl border-2 border-foreground">
      <Cell value={fmt(worst.totalMaxDailyMg)} label={`mg/day · ${worst.displayName}`} />
      <Cell value={fmt(worst.limitMg)} label="FDA limit" divider />
      <Cell value={`+${fmt(over)}`} label="over" divider danger />
    </div>
  );
}

function Cell({
  value,
  label,
  divider,
  danger,
}: {
  value: string;
  label: string;
  divider?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex-1 p-3 text-center",
        divider && "border-l-2 border-foreground",
      )}
    >
      <div
        className={cn(
          "text-xl font-black tabular-nums leading-none",
          danger ? "text-verdict-danger-fg" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
