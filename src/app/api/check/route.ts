import { NextRequest, NextResponse } from "next/server";
import { runOnLabel } from "@/lib/onlabel/agent";

// The Agent SDK needs the Node.js runtime (not edge) and time to run the loop.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let question: string;
  try {
    const body = await req.json();
    question = typeof body?.question === "string" ? body.question.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json({ error: "Missing 'question'." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env to run OnLabel." },
      { status: 500 },
    );
  }

  try {
    const result = await runOnLabel(question);
    return NextResponse.json(result);
  } catch (err) {
    console.error("OnLabel run failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "OnLabel run failed." },
      { status: 500 },
    );
  }
}
