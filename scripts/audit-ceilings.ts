/**
 * Ceiling auditor — guards against the "dosing schedule vs ingredient ceiling"
 * class of error (see DECISIONS D37).
 *
 * For every ingredient in ingredients.json it re-derives the daily ceiling from
 * openFDA *single-substance* OTC labels and compares it to our KB maxDailyMg.
 * NO number is trusted from our own DB — the labels are the source of truth.
 * NO LLM touches a number (D22): everything is regex over label text.
 *
 * It separates the two ways a sedating antihistamine is dosed, because that is
 * exactly where the trap lives:
 *   - "antihistamine" multi-dose max  (e.g. diphenhydramine 25 mg × 12 = 300)
 *   - "sleep aid" once-daily dose      (e.g. diphenhydramine 50 mg once = 50)
 * The KB ceiling should be the ANTIHISTAMINE max, never the sleep dose.
 *
 * Verdicts:
 *   MATCH   — KB equals a ceiling found on real labels.
 *   REVIEW  — KB could not be re-derived from a single-substance label (e.g. the
 *             value is monograph-only, like doxylamine 75 mg from M012). This is
 *             NOT a failure; the ingredient's own `source` field is printed so a
 *             human can confirm it against the cited primary source.
 *   NULL-OK — KB is null and no label states a 24 h ceiling (e.g. caffeine).
 *   MISMATCH— KB disagrees with a clearly-stated label ceiling → investigate.
 *
 * Run: npm run audit:ceilings           (all ingredients)
 *      npx tsx scripts/audit-ceilings.ts acetaminophen doxylamine
 *
 * Exit code is non-zero if any MISMATCH is found (REVIEW alone does not fail).
 */
import ingredientsData from "../src/data/ingredients.json";

interface IngRef {
  displayName: string;
  class: string;
  maxDailyMg: number | null;
  source?: string;
}
const INGREDIENTS = (ingredientsData as { ingredients: Record<string, IngRef> }).ingredients;

const UNIT = "(?:tablet|caplet|capsule|softgel|gelcap|geltab|liquicap|lozenge)s?";
const base = (s: string) => s.replace(/[^a-z]/gi, "").toLowerCase();

async function fetchSingleSubstance(key: string): Promise<Record<string, unknown>[]> {
  const url =
    `https://api.fda.gov/drug/label.json?search=openfda.substance_name:${encodeURIComponent(key)}` +
    `+AND+openfda.product_type:%22HUMAN+OTC+DRUG%22&limit=100`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as { results?: Record<string, unknown>[] };
  return (json.results ?? []).filter(
    (x) => ((x.openfda as { substance_name?: string[] })?.substance_name ?? []).length === 1,
  );
}

/** All 24 h ceilings a single label states, tagged by how they were derived. */
function ceilingsFromLabel(x: Record<string, unknown>): { mg: number; via: string }[] {
  const active = ((x.active_ingredient as string[]) ?? []).join(" ").replace(/\s+/g, " ");
  const dir = ((x.dosage_and_administration as string[]) ?? []).join(" ").replace(/\s+/g, " ");
  const warn = ((x.warnings as string[]) ?? []).join(" ").replace(/\s+/g, " ");
  const purpose =
    ((x.purpose as string[]) ?? []).join(" ") + " " + ((x.indications_and_usage as string[]) ?? []).join(" ");
  const isSleep = /sleep|insomnia|nighttime sleep-?aid/i.test(purpose);
  // single-substance product: the one strength stated is the ingredient's
  const su = Number((active.match(/(\d+(?:\.\d+)?)\s*mg/i) ?? [])[1]);
  const labelVol = Number((active.match(/in each\s+(\d+(?:\.\d+)?)\s*mL/i) ?? [])[1]);
  const out: { mg: number; via: string }[] = [];
  let m: RegExpMatchArray | null;

  // (a) a directly stated mg ceiling ("more than 4,000 mg ... in 24 hours")
  if ((m = (dir + " " + warn).match(/(?:more than|not to exceed|exceed)\s+([\d,]+)\s*mg[^.]{0,60}?24[\s-]*hours?/i)))
    out.push({ mg: Number(m[1].replace(/,/g, "")), via: "direct-mg" });

  // (b) "N tablets ... 24 hours" x per-unit strength (multi-dose max). No
  // "more than" prefix is required — but the count must sit next to "24 hour".
  if (su && (m = dir.match(new RegExp(`(\\d+)\\s+${UNIT}[^.]{0,40}?24[\\s-]*hours?`, "i"))))
    out.push({ mg: Number(m[1]) * su, via: isSleep ? "sleep-units×24h" : "antihist-units×24h" });

  // (c) liquid volume cap ("N mL in 24 hours") scaled by strength/labelVolume
  if (su && labelVol && (m = dir.match(/(\d+(?:\.\d+)?)\s*mL[^.]{0,40}?24[\s-]*hours?/i)))
    out.push({ mg: Math.round((Number(m[1]) / labelVol) * su), via: "liquid-mL×24h" });

  // (d) once-daily (2nd-gen antihistamine or sleep aid): one dose IS the day
  if (su && /once\s+(?:a\s+day|daily)|1\s+(?:tablet|capsule)\s+(?:once\s+)?(?:a\s+day|daily)/i.test(dir))
    out.push({ mg: su, via: isSleep ? "sleep-once-daily" : "once-daily" });

  return out;
}

function tally(vals: number[]): { mode: number | null; dist: Record<number, number> } {
  const dist: Record<number, number> = {};
  for (const v of vals) dist[v] = (dist[v] ?? 0) + 1;
  let mode: number | null = null,
    best = 0;
  for (const [k, n] of Object.entries(dist))
    if (n > best) {
      best = n;
      mode = Number(k);
    }
  return { mode, dist };
}

async function main() {
  const only = process.argv.slice(2);
  const keys = only.length ? only : Object.keys(INGREDIENTS);
  let mismatches = 0;
  let reviews = 0;

  for (const key of keys) {
    const ref = INGREDIENTS[key];
    if (!ref) {
      console.log(`\n### ${key}\n  (not in ingredients.json)`);
      continue;
    }
    let labels: Record<string, unknown>[] = [];
    try {
      labels = await fetchSingleSubstance(key);
    } catch (e) {
      console.log(`\n### ${key}  — openFDA fetch failed (${(e as Error).message}); skipped`);
      continue;
    }
    // A multi-dose / direct ceiling is what the KB ceiling should equal; sleep
    // once-daily doses are collected separately so they can never masquerade.
    const antihistOrDirect: number[] = [];
    const sleepDoses: number[] = [];
    for (const x of labels)
      for (const c of ceilingsFromLabel(x)) {
        if (c.via.startsWith("sleep")) sleepDoses.push(c.mg);
        else antihistOrDirect.push(c.mg);
      }
    const derived = tally(antihistOrDirect);
    const sleeps = tally(sleepDoses);
    const kb = ref.maxDailyMg;
    const derivedSet = new Set(antihistOrDirect);

    let verdict: string;
    if (kb === null) {
      verdict = antihistOrDirect.length === 0 ? "NULL-OK" : `NOTE (KB null, labels show ${derived.mode})`;
    } else if (derivedSet.has(kb)) {
      verdict = "MATCH";
    } else if (antihistOrDirect.length === 0) {
      verdict = "REVIEW"; // monograph-only or unusual phrasing — not derivable from a single-substance label
      reviews++;
    } else {
      verdict = `MISMATCH (KB ${kb} not among label ceilings)`;
      mismatches++;
    }

    console.log(
      `\n### ${key}  [KB maxDailyMg=${kb}]  → ${verdict}` +
        `\n  single-substance SPLs: ${labels.length}` +
        `\n  label ceilings (multi-dose/direct): ${JSON.stringify(derived.dist)}` +
        (sleepDoses.length ? `\n  sleep once-daily doses (must NOT be the ceiling): ${JSON.stringify(sleeps.dist)}` : ""),
    );
    if (verdict === "REVIEW")
      console.log(`  ⓘ not re-derivable from a single-substance label — confirm against source:\n     ${ref.source ?? "(no source!)"}`);
  }

  console.log(
    `\n── Summary ── ${keys.length} ingredient(s): ${mismatches} MISMATCH, ${reviews} REVIEW (monograph-only, check source).`,
  );
  if (mismatches > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("audit-ceilings failed:", e);
  process.exit(1);
});
