import { NextRequest } from "next/server";
import { streamOnLabel, type OnLabelEvent } from "@/lib/onlabel/agent";

// The Agent SDK needs the Node.js runtime and time to run the loop.
export const runtime = "nodejs";
export const maxDuration = 60;

function sse(event: OnLabelEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: NextRequest) {
  let question: string;
  try {
    const body = await req.json();
    question = typeof body?.question === "string" ? body.question.trim() : "";
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }

  if (!question) {
    return new Response("Missing 'question'.", { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY is not set.", { status: 500 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of streamOnLabel(question)) {
          controller.enqueue(encoder.encode(sse(event)));
        }
      } catch (err) {
        console.error("OnLabel stream failed:", err);
        controller.enqueue(
          encoder.encode(
            sse({
              type: "error",
              message:
                err instanceof Error ? err.message : "OnLabel run failed.",
            }),
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
