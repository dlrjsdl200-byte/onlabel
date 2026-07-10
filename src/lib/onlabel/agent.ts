/**
 * OnLabel agent runner.
 *
 * Runs a small Claude tool-use loop over the deterministic check_otc_safety tool,
 * calling the Anthropic Messages API directly (@anthropic-ai/sdk) — no CLI
 * subprocess. Claude drafts the answer and calls the tool; we re-run the
 * deterministic verifier on the products it checked so the returned
 * `verification` is guaranteed ground truth, not parsed from LLM prose.
 *
 * The safety VERDICT is always verify()'s deterministic result — the model only
 * writes grounded prose and decides which named products to check.
 */

import Anthropic from "@anthropic-ai/sdk";
import { runSafetyCheck } from "./tool";
import { verify, type VerifyResult } from "./verify";
import { userNamedProducts, hasRedFlagContext } from "./provenance";

/**
 * The answer LLM only writes grounded prose and decides which products to pass to
 * the tool — the safety VERDICT is deterministic (verify()), never the model. So a
 * fast model is safe here and roughly halves latency. Override with ONLABEL_MODEL.
 */
const ANSWER_MODEL = process.env.ONLABEL_MODEL ?? "claude-haiku-4-5";
/** read question → call the tool → write the answer is ~2 turns; a small ceiling
 * stops a runaway tool loop from stretching latency. */
const ANSWER_MAX_TURNS = 6;
/** The prose answer is a few sentences; the tool-call turn is a tiny JSON blob. */
const MAX_TOKENS = 1024;

/** Fully-qualified name of the deterministic tool the model may call. */
const TOOL_NAME = "check_otc_safety";

/** The check_otc_safety tool, defined for the Messages API (raw JSON schema). */
const CHECK_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description:
    "Check whether a set of over-the-counter (OTC) pain-relief or cold/flu products is safe to take together. Returns a deterministic verdict grounded in FDA ingredient data: active-ingredient duplication (especially acetaminophen), cumulative dose vs. the daily maximum, and drug-class overlap (multiple NSAIDs, decongestants, or sedating antihistamines). Call this whenever the user asks about combining or dosing OTC medicines. Pass the product brand names exactly as the user wrote them.",
  input_schema: {
    type: "object",
    properties: {
      products: {
        type: "array",
        items: { type: "string" },
        description:
          "OTC product brand names the user is asking about, e.g. ['Tylenol Extra Strength', 'DayQuil']",
      },
    },
    required: ["products"],
  },
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // Reads ANTHROPIC_API_KEY from the environment. The API routes already verify
  // the key is set before calling in; construct lazily so importing this module
  // never throws.
  if (!client) client = new Anthropic();
  return client;
}

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
   given). A generic active-ingredient name the user typed (e.g. "acetaminophen",
   "ibuprofen", "naproxen") counts as a named product — pass it to the tool exactly
   as written. Only pass products the user named to the tool — never products you
   inferred. If the user names no specific product (only symptoms, e.g. "what can
   I take for a cold?"), do NOT call the tool: briefly give general, non-branded
   guidance and ask what they are taking or considering.
2. Whenever the user asks about taking two or more named things together, or names
   the same drug twice (a generic name plus a brand that contains it), you MUST call
   check_otc_safety and let its verdict drive — never judge duplication or dosing
   from your own knowledge, even when the answer seems obvious. Call the tool with
   those product names; its verdict is your source of truth.
3. Ground your answer in the tool result and never contradict it. Match your wording
   to the verdict's severity: if DANGER, lead with the danger and say not to take
   them together as written; if CAUTION, say plainly that they double up the same
   drug / add up and to check the combined total, without overstating it as an
   absolute prohibition; if OK, say so plainly.
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

Style: plain, calm, non-clinical language. When you call the tool, write NOTHING
before the tool call — your first output for a product question is the tool call
itself, with no words in front of it. Never narrate that you are checking (no
"I'll check that for you", "I need to check", "Let me look"). After the tool
returns, lead directly with the answer — the concrete action first, then the
reason. Write in plain prose sentences only — do NOT use markdown formatting
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

/** Run the tool call locally and return the tool_result block to send back. */
function handleToolUse(
  block: Anthropic.ToolUseBlock,
  productSet: Set<string>,
): Anthropic.ToolResultBlockParam {
  const products = extractProducts(block.input);
  for (const p of products) productSet.add(p);
  const { text } = runSafetyCheck(products);
  return { type: "tool_result", tool_use_id: block.id, content: text };
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
  let snappedProductsChecked: string[] | null = null;
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: questionText }];

  function makeVerification(): OnLabelEvent | null {
    const { productsChecked, verification } = gatedVerification(questionText, [...productSet]);
    // Record the products behind the verdict so the terminal `done` reports the
    // SAME set the verdict was computed from, even if a later tool call widens
    // productSet (B-25). Set on defer too, so an open-question `done` is stable.
    snappedProductsChecked = productsChecked;
    if (!verification) return null; // no user-named products, or red-flag ok → defer
    return { type: "verification", verification, productsChecked };
  }

  for (let turn = 0; turn < ANSWER_MAX_TURNS; turn++) {
    const stream = getClient().messages.stream({
      model: ANSWER_MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: [CHECK_TOOL],
      messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        // B-30: stream prose live. The verdict card renders in its own UI slot and
        // snaps in the moment it arrives, so prose no longer has to be held back —
        // this removes the "dead skeleton" wait on answers that yield no verdict
        // card (efficacy, open questions, red-flag ok). The demo danger path still
        // reads verdict-first: the model calls the tool with no preamble, so the
        // verification event is emitted before any prose token.
        yield { type: "token", text: event.delta.text };
      }
    }

    const msg = await stream.finalMessage();

    if (msg.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: msg.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of msg.content) {
        if (block.type === "tool_use" && block.name === TOOL_NAME) {
          toolResults.push(handleToolUse(block, productSet));
        }
      }
      messages.push({ role: "user", content: toolResults });
      // Snap the verdict as soon as we know the products (after the first call).
      if (!verdictSent) {
        const v = makeVerification();
        if (v) {
          verdictSent = true;
          yield v;
        }
      }
      continue;
    }

    // end_turn (or max_tokens): the answer is complete. If the verdict was
    // deferred (no user-named products, or a red-flag ok), emit it now with no
    // verdict card. Prose has already streamed live (B-30).
    if (!verdictSent) {
      const v = makeVerification();
      if (v) yield v;
    }
    yield {
      type: "done",
      productsChecked:
        snappedProductsChecked ??
        gatedVerification(questionText, [...productSet]).productsChecked,
    };
    return;
  }

  // The loop only exits without returning if it kept calling the tool past the
  // cap — surface that instead of closing the stream silently (B-24).
  yield { type: "error", message: "OnLabel agent did not complete (max turns reached)." };
}

/**
 * Answer an OTC medication question with a grounded, verified response.
 * Requires ANTHROPIC_API_KEY in the environment.
 */
export async function runOnLabel(questionText: string): Promise<OnLabelResponse> {
  const productSet = new Set<string>();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: questionText }];
  let answer: string | null = null;

  for (let turn = 0; turn < ANSWER_MAX_TURNS && answer === null; turn++) {
    const resp = await getClient().messages.create({
      model: ANSWER_MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: [CHECK_TOOL],
      messages,
    });

    if (resp.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: resp.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of resp.content) {
        if (block.type === "tool_use" && block.name === TOOL_NAME) {
          toolResults.push(handleToolUse(block, productSet));
        }
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    answer = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }

  // A run that never reached a final answer (kept calling the tool past the cap)
  // must surface as an error, not a silent blank response. (B-24)
  if (answer === null) throw new Error("OnLabel agent did not complete (max turns reached).");

  // Checker (D34) + red-flag (D35) gates: verdict only on user-named products,
  // and no green "ok" badge on a red-flag context.
  const { productsChecked, verification } = gatedVerification(questionText, [...productSet]);

  return { answer, verification, productsChecked };
}
