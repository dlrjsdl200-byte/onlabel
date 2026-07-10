"use client";

import { useCallback, useRef, useState } from "react";
import type { VerifyResult } from "@/lib/onlabel/verify";
import type { OnLabelEvent } from "@/lib/onlabel/agent";

export type StreamStatus = "idle" | "streaming" | "done" | "error";

export interface OnLabelStreamState {
  status: StreamStatus;
  question: string;
  verification: VerifyResult | null;
  prose: string;
  error: string | null;
}

const INITIAL: OnLabelStreamState = {
  status: "idle",
  question: "",
  verification: null,
  prose: "",
  error: null,
};

/** If no bytes arrive for this long, treat the stream as stuck and surface an
 * error instead of spinning forever. A healthy stream delivers the verdict in
 * ~1–2s and prose continuously after; a 30s gap means something wedged. */
const STREAM_IDLE_TIMEOUT_MS = 30_000;

/** Drives the verdict-first SSE flow from POST /api/check/stream. */
export function useOnLabelStream() {
  const [state, setState] = useState<OnLabelStreamState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const ask = useCallback(async (question: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({
      status: "streaming",
      question,
      verification: null,
      prose: "",
      error: null,
    });

    // Watchdog state lives in the outer scope so the catch can tell a timeout
    // abort from a user (reset / new question) abort.
    let timedOut = false;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const armWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, STREAM_IDLE_TIMEOUT_MS);
    };

    try {
      armWatchdog();
      const res = await fetch("/api/check/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        clearTimeout(watchdog);
        const msg = await res.text().catch(() => "Request failed.");
        setState((s) => ({ ...s, status: "error", error: msg || "Request failed." }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        armWatchdog();
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line.
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const line = frame.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const json = line.slice(5).trim();
          if (!json) continue;
          let event: OnLabelEvent;
          try {
            event = JSON.parse(json) as OnLabelEvent;
          } catch {
            continue;
          }
          setState((s) => applyEvent(s, event));
        }
      }
      clearTimeout(watchdog);
      setState((s) => (s.status === "streaming" ? { ...s, status: "done" } : s));
    } catch (err) {
      // A watchdog abort surfaces as an error; a user abort (new question /
      // reset) is silent — distinguish via the timedOut flag.
      if (controller.signal.aborted && !timedOut) return;
      setState((s) => ({
        ...s,
        status: "error",
        error: timedOut
          ? "The answer took too long to load. Please try again."
          : err instanceof Error
            ? err.message
            : "Network error.",
      }));
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL);
  }, []);

  return { state, ask, reset };
}

function applyEvent(
  s: OnLabelStreamState,
  event: OnLabelEvent,
): OnLabelStreamState {
  switch (event.type) {
    case "verification":
      return { ...s, verification: event.verification };
    case "token":
      return { ...s, prose: s.prose + event.text };
    case "done":
      return { ...s, status: "done" };
    case "error":
      return { ...s, status: "error", error: event.message };
    default:
      return s;
  }
}
