import { NextRequest } from "next/server";
import { runClaimPipeline } from "@/lib/onlabel/claimPipeline";

// The Agent SDK (draft + decomposition + isolated verifiers) needs Node + time.
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Contrast engine (L1). Runs an UNGROUNDED generic-LLM draft through claim
 * decomposition and per-claim FDA verification, returning the draft, the
 * per-claim verdicts, and the reconciled corrections. This is additive to the
 * core verdict-first path — it powers the "compare to a generic AI" panel.
 */
export async function POST(req: NextRequest) {
  let question = "";
  let products: string[] = [];
  try {
    const body = await req.json();
    question = typeof body?.question === "string" ? body.question.trim() : "";
    if (Array.isArray(body?.products))
      products = body.products.filter((p: unknown): p is string => typeof p === "string");
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!question || products.length === 0)
    return Response.json({ error: "question and products are required." }, { status: 400 });

  try {
    const { draft, verdicts, reconciled } = await runClaimPipeline(question, products);
    return Response.json({ draft, verdicts, reconciled });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "pipeline failed" },
      { status: 500 },
    );
  }
}
