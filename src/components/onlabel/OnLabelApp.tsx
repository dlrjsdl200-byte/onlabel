"use client";

import { QuestionInput } from "./QuestionInput";
import { AnswerView } from "./AnswerView";
import { FollowUps } from "./FollowUps";
import { ProgressSteps } from "./ProgressSteps";
import { Disclaimer } from "./Disclaimer";
import { useOnLabelStream } from "./useOnLabelStream";

export function OnLabelApp() {
  const { state, ask, reset } = useOnLabelStream();
  const active = state.status !== "idle";
  // The pre-answer "thinking" phase: streaming has started but neither the
  // deterministic verdict nor any prose has arrived yet.
  const thinking =
    state.status === "streaming" && !state.verification && !state.prose;

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
          ) : thinking ? (
            <ProgressSteps />
          ) : state.verification ? (
            <div className="space-y-6">
              <AnswerView
                question={state.question}
                result={state.verification}
                prose={state.prose}
                streaming={state.status === "streaming"}
              />
              {state.status !== "streaming" &&
                state.verification.findings.length > 0 && (
                  <FollowUps result={state.verification} onAsk={ask} />
                )}
            </div>
          ) : (
            <NoVerdictAnswer
              question={state.question}
              prose={state.prose}
              streaming={state.status === "streaming"}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Rendered when there is no deterministic verdict card — i.e. the question
 * didn't resolve to user-named products (efficacy notes, education, open-ended
 * questions). Shows the streaming prose answer; falls back to the pending
 * skeleton only while we're still waiting for the first prose token.
 *
 * This branch is why a no-verdict answer must never depend on `verification`
 * being set: the prose is the entire answer, and without this it would never
 * render (the old PendingVerdict stayed on screen forever once the stream
 * finished with verification === null).
 */
function NoVerdictAnswer({
  question,
  prose,
  streaming,
}: {
  question: string;
  prose: string;
  streaming: boolean;
}) {
  return (
    <div className="flex w-full flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">You asked:</span>{" "}
        {question}
      </p>

      {prose ? (
        <div className="text-[15px] leading-relaxed text-foreground/90">
          <p className="whitespace-pre-wrap">{prose}</p>
          {streaming && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary align-middle" />
          )}
        </div>
      ) : streaming ? (
        <>
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
        </>
      ) : (
        <p className="text-[15px] leading-relaxed text-foreground/90">
          No answer was returned. Please try rephrasing your question.
        </p>
      )}

      <Disclaimer />
    </div>
  );
}
