"use client";

import { useState } from "react";

const EXAMPLES = [
  "Can I take Tylenol and DayQuil together?",
  "Can I take Xyzal and Zyrtec together?",
  "Is it safe to take NyQuil with Tylenol PM?",
  "Can I take Advil and Aleve at the same time?",
  "Does DayQuil's decongestant actually work?",
  "I'm pregnant, can I take Tylenol?",
];

export function QuestionInput({
  onSubmit,
  disabled,
  compact,
}: {
  onSubmit?: (q: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [value, setValue] = useState("");

  function submit(q: string) {
    const text = q.trim();
    if (!text || disabled) return;
    onSubmit?.(text);
    // Clear the box after asking — the question is already echoed in "You asked:",
    // so a leftover value just forces the user to delete it before the next ask.
    setValue("");
  }

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="flex gap-2"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask about your OTC medicines…"
          disabled={disabled}
          className="h-[3.25rem] flex-1 rounded-xl border-2 border-foreground bg-card px-4 text-base font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/25 disabled:opacity-60"
          aria-label="Your OTC medication question"
        />
        <button
          type="submit"
          disabled={disabled}
          className="h-[3.25rem] rounded-xl border-2 border-foreground bg-foreground px-6 font-extrabold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Ask
        </button>
      </form>
      {!compact && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => submit(ex)}
              disabled={disabled}
              className="rounded-full border-2 border-foreground bg-card px-3.5 py-1.5 text-sm font-bold text-foreground/80 transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
