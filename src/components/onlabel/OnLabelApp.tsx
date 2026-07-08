"use client";

import { QuestionInput } from "./QuestionInput";
import { AnswerView } from "./AnswerView";
import { Disclaimer } from "./Disclaimer";
import { useOnLabelStream } from "./useOnLabelStream";

export function OnLabelApp() {
  const { state, ask, reset } = useOnLabelStream();
  const active = state.status !== "idle";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-10 sm:py-16">
      <header
        className={active ? "mb-6" : "mb-8 text-center"}
      >
        <button
          onClick={reset}
          className="text-2xl font-semibold tracking-tight text-foreground hover:opacity-80"
        >
          OnLabel
        </button>
        {!active && (
          <p className="mt-1.5 text-muted-foreground">
            Know what&rsquo;s really in your OTC meds.
          </p>
        )}
      </header>

      <QuestionInput
        onSubmit={ask}
        disabled={state.status === "streaming"}
        compact={active}
      />

      {active && (
        <div className="mt-8">
          {state.status === "error" ? (
            <div className="rounded-xl border border-verdict-danger/40 bg-verdict-danger-bg p-4 text-sm text-verdict-danger-fg">
              <p className="font-medium">Something went wrong.</p>
              <p className="mt-1 text-foreground/70">{state.error}</p>
            </div>
          ) : state.verification ? (
            <AnswerView
              question={state.question}
              result={state.verification}
              prose={state.prose}
              streaming={state.status === "streaming"}
            />
          ) : (
            <PendingVerdict question={state.question} />
          )}
        </div>
      )}
    </div>
  );
}

/** Shown after submit, before the deterministic verdict snaps in. */
function PendingVerdict({ question }: { question: string }) {
  return (
    <div className="flex w-full flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">You asked:</span>{" "}
        {question}
      </p>
      <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-5">
        <div className="size-10 shrink-0 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Checking active ingredients against FDA labeling data…
      </p>
      <Disclaimer />
    </div>
  );
}
