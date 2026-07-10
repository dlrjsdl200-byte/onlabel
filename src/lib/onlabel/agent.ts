/**
 * OnLabel agent runner.
 *
 * Runs the Claude Agent SDK with the deterministic check_otc_safety tool.
 * Claude drafts the answer and calls the tool; we additionally re-run the
 * deterministic verifier on the products it checked so the returned
 * `verification` is guaranteed ground truth, not parsed from LLM prose.
 *
 * Day 2: methodology lives in the system prompt. The otc-safety-check skill
 * is the canonical artifact and will be wired via an isolated subagent in Day 3.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { onlabelServer, CHECK_OTC_SAFETY_TOOL } from "./tool";
import { verify, type VerifyResult } from "./verify";
import { userNamedProducts, hasRedFlagContext } from "./provenance";

/**
 * The answer LLM only writes grounded prose and decides which products to pass to
 * the tool — the safety VERDICT is deterministic (verify()), never the model. So a
 * fast model is safe here and roughly halves latency (measured 18.3s → 10.7s, same
 * danger verdict, prose still grounded). Override with ONLABEL_MODEL if needed.
 */
const ANSWER_MODEL = process.env.ONLABEL_MODEL ?? "claude-haiku-4-5-20251001";
/** Cap the agent loop: read question → call the tool → write the answer is ~2 turns;
 * a small ceiling stops a runaway loop from stretching latency. */
const ANSWER_MAX_TURNS = 6;

/**
 * Turn a raw product set into the verdict shown to the user, applying the
 * deterministic checker (D34) and red-flag (D35) gates:
 *  - keep only products the USER named (never verdict LLM-inferred products), and
 *  - if the question carries a red-flag context AND the verdict would be a green
 *    "ok", suppress it (defer to the prose) — but NEVER hide a caution/danger.
 * Returns the products actually verified and the (possibly suppressed) result.
 */
function gatedVerification(
  question: string,
  rawProducts: string[],
): { productsChecked: string[]; verification: VerifyResult | null } {
  const productsChecked = userNamedProducts(question, rawProducts);
  if (productsChecked.length === 0) return { productsChecked, verification: null };
  const verification = verify(productsChecked);
  if (verification.overall === "ok" && hasRedFlagContext(question)) {
    // Don't reassure with a green badge on a pregnancy/pediatric/condition
    // question the arithmetic can't personalize for; let the prose defer.
    return { productsChecked, verification: null };
  }
  return { productsChecked, verification };
}

const SYSTEM_PROMPT = `You are OnLabel, a medication-safety assistant for US consumers.
Consumers think in brand names; danger hides in active ingredients. Catch
active-ingredient duplication and dose ceilings that generic AI answers miss.

You are a CHECKER, not a recommender. You verify products the user actually
names; you do not pick medicines for them.

Method (always, in order):
1. Identify the OTC products the user EXPLICITLY named (use the exact brand names
   given). Only pass products the user named to the tool — never products you
   inferred. If the user names no specific product (only symptoms, e.g. "what can
   I take for a cold?"), do NOT call the tool: briefly give general, non-branded
   guidance and ask what they are taking or considering.
2. Call the check_otc_safety tool with those product names. Its verdict is your
   source of truth.
3. Ground your answer in the tool result and never contradict it. If DANGER, lead
   with the danger and say not to take them together as written. If CAUTION,
   explain what to watch. If OK, say so plainly.
4. Explain the why in ingredient terms (name the shared active ingredient and its
   daily limit), not just brand names.
5. If the tool flags an ingredient efficacy note (e.g. oral phenylephrine), tell
   the user plainly and cite the FDA source.

The grounding fence (most important rule — this is what makes OnLabel trustworthy):
- State a clinical number ONLY if it appears in the tool result. The tool's
  "Dosing (FDA-grounded KB ...)" block lists the mg/dose, doses/day, and daily
  ceiling you are allowed to cite. Use those exact numbers.
- The tool's Dosing block may include an "interval:" and "duration:" for some
  ingredients. If it does, you may state those exact values. If an ingredient has
  no interval/duration line, do NOT state one.
- Do NOT state any number the tool did not give you — specifically a dosing
  interval or duration the Dosing block did not list for that ingredient,
  single-dose maximums beyond the listed mg/dose, onset or how long a dose lasts,
  or extended-release/crushing details. If asked about these, say plainly that you
  can't confirm the specific number and to check the product label or a
  pharmacist. Do not fill it in from general knowledge, even if you are confident.
- The tool checks the named products against label maximums only. It does not see
  a quantity or schedule the user describes (e.g. "2 every 4 hours", "3 at a
  time"), how much they have already taken, or non-catalog substances (alcohol,
  caffeine, food). When the user's described amount or context could exceed a
  ceiling or add risk the tool did not evaluate, say so and explain the concern —
  but frame it as reasoning about their described amount, not a tool verdict.
- Never invent limits or interactions. The deterministic verdict wins; do not
  soften or override it. When the verdict is OK but the user's described
  behavior is unsafe, keep the verdict accurate and add the caveat in prose.

Scope & safety:
- Scope: US OTC pain relievers and cold/flu products. If a prescription drug is
  mentioned, advise consulting a pharmacist.
- Red-flag context (pregnancy, breastfeeding, a child/infant, or a major
  condition like liver/kidney disease, ulcer, high blood pressure, heart disease):
  the OTC label limits the tool checks do NOT personalize for these. Do not
  present an "OK" as reassurance. Say plainly that the standard limits may not be
  safe for their situation and to confirm the specific choice and dose with a
  pharmacist or physician. Still surface any duplication/overdose danger the tool
  finds.
- Always add: this is not medical advice; confirm with a pharmacist or physician.

Style: plain, calm, non-clinical language. Lead directly with the answer — do not
open with a preamble like "I'll check this for you" or "Let me look". Give the
concrete action first, then the reason. Write in plain prose sentences only — do NOT use markdown formatting
(no **bold**, headings, bullet lists, or hyperlinks). The interface already shows
the ingredient ledger, sources, and efficacy notes as separate elements, so do
not reproduce tables or link lists in your text. Keep it to a short, readable
few sentences.`;

export interface OnLabelResponse {
  answer: string;
  verification: VerifyResult | null;
  productsChecked: string[];
}

/** Events streamed to the client for the verdict-first interaction. */
export type OnLabelEvent =
  | { type: "verification"; verification: VerifyResult; productsChecked: string[] }
  | { type: "token"; text: string }
  | { type: "done"; productsChecked: string[] }
  | { type: "error"; message: string };

function extractProducts(input: unknown): string[] {
  const out: string[] = [];
  if (input && typeof input === "object" && "products" in input) {
    const products = (input as { products?: unknown }).products;
    if (Array.isArray(products)) {
      for (const p of products) if (typeof p === "string") out.push(p);
    }
  }
  return out;
}

/**
 * Streaming variant of runOnLabel. Yields the deterministic `verification`
 * the moment Claude calls check_otc_safety (verdict-first snap), then streams
 * prose `token` deltas. Prose tokens are buffered until the verdict is sent so
 * the verdict always lands first.
 */
export async function* streamOnLabel(
  questionText: string,
): AsyncGenerator<OnLabelEvent> {
  const productSet = new Set<string>();
  let verdictSent = false;
  let streamedProse = false;
  let snappedProductsChecked: string[] | null = null;
  const buffered: string[] = [];

  function makeVerification(): OnLabelEvent | null {
    const { productsChecked, verification } = gatedVerification(
      questionText,
      [...productSet],
    );
    // Record the products behind the verdict so the terminal `done` reports the
    // SAME set the verdict was computed from, even if a later tool call widens
    // productSet (B-25). Set on defer too, so an open-question `done` is stable.
    snappedProductsChecked = productsChecked;
    if (!verification) return null; // no user-named products, or red-flag ok → defer
    return { type: "verification", verification, productsChecked };
  }

  for await (const message of query({
    prompt: questionText,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      model: ANSWER_MODEL,
      maxTurns: ANSWER_MAX_TURNS,
      mcpServers: { onlabel: onlabelServer },
      allowedTools: [CHECK_OTC_SAFETY_TOOL],
      tools: [],
      includePartialMessages: true,
    },
  })) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "tool_use" && block.name === CHECK_OTC_SAFETY_TOOL) {
          for (const p of extractProducts(block.input)) productSet.add(p);
        }
      }
      // Snap the verdict as soon as we know the products.
      if (!verdictSent) {
        const v = makeVerification();
        if (v) {
          verdictSent = true;
          yield v;
          for (const t of buffered) {
            streamedProse = true;
            yield { type: "token", text: t };
          }
          buffered.length = 0;
        }
      }
    } else if (message.type === "stream_event") {
      const ev = message.event as {
        type?: string;
        delta?: { type?: string; text?: string };
      };
      if (
        ev.type === "content_block_delta" &&
        ev.delta?.type === "text_delta" &&
        typeof ev.delta.text === "string"
      ) {
        const text = ev.delta.text;
        if (!verdictSent) {
          buffered.push(text); // hold prose until the verdict lands
        } else {
          streamedProse = true;
          yield { type: "token", text };
        }
      }
    } else if (message.type === "result") {
      // A non-success result (max_turns, execution error) must surface as an error
      // event, not a silently-closed stream — the `error` event type existed but
      // was never emitted. (B-24)
      if (message.subtype !== "success") {
        yield { type: "error", message: `OnLabel agent did not complete (${message.subtype}).` };
        return;
      }
      // Ensure a verdict went out even if partial parsing missed the tool call.
      if (!verdictSent) {
        const v = makeVerification();
        if (v) {
          verdictSent = true;
          yield v;
        }
      }
      // Fallback: if no deltas streamed, emit the full result text at once.
      if (!streamedProse && message.result) {
        for (const t of buffered) yield { type: "token", text: t };
        if (buffered.length === 0) {
          yield { type: "token", text: message.result };
        }
      }
      yield {
        type: "done",
        productsChecked:
          snappedProductsChecked ??
          gatedVerification(questionText, [...productSet]).productsChecked,
      };
    }
  }
}

/**
 * Answer an OTC medication question with a grounded, verified response.
 * Requires ANTHROPIC_API_KEY in the environment.
 */
export async function runOnLabel(questionText: string): Promise<OnLabelResponse> {
  const productSet = new Set<string>();
  let answer = "";

  for await (const message of query({
    prompt: questionText,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      model: ANSWER_MODEL,
      maxTurns: ANSWER_MAX_TURNS,
      mcpServers: { onlabel: onlabelServer },
      allowedTools: [CHECK_OTC_SAFETY_TOOL],
      tools: [], // strip built-in tools; only OnLabel's tool is available
    },
  })) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "tool_use" && block.name === CHECK_OTC_SAFETY_TOOL) {
          const input = block.input as { products?: unknown };
          if (Array.isArray(input.products)) {
            for (const p of input.products) {
              if (typeof p === "string") productSet.add(p);
            }
          }
        }
      }
    } else if (message.type === "result") {
      // A non-success result (max_turns, execution error) previously left `answer`
      // empty and returned a silent blank response. Surface it so the route can
      // report a real error instead of an empty card. (B-24)
      if (message.subtype === "success") answer = message.result;
      else throw new Error(`OnLabel agent did not complete (${message.subtype}).`);
    }
  }

  // Checker (D34) + red-flag (D35) gates: verdict only on user-named products,
  // and no green "ok" badge on a red-flag context.
  const { productsChecked, verification } = gatedVerification(questionText, [...productSet]);

  return { answer, verification, productsChecked };
}
