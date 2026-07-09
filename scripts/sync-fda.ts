/**
 * openFDA composition cross-check (B-4 track 1) — READ-ONLY report.
 *
 * For each catalog product, queries the openFDA drug/label API (free JSON, no
 * key) and deterministically extracts, per known active ingredient:
 *   - per-UNIT strength from `active_ingredient` ("...in each tablet ... 500 mg")
 *   - units/dose and max units/24h from `dosage_and_administration`
 * then compares those against our KB (products.json) and prints a diff, with the
 * DailyMed set_id as a citation. It NEVER writes the KB — a pharmacist reviews the
 * report, then verify:true→false is flipped by hand with the citation. Extraction
 * is pure regex on structured label text (no LLM — D22).
 *
 * Run: npx tsx scripts/sync-fda.ts            (report all)
 *      npx tsx scripts/sync-fda.ts advil aleve (subset by product id)
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import productsData from "../src/data/products.json";

interface KBIngredient {
  ingredient: string;
  mgPerDose: number;
}
interface KBProduct {
  id: string;
  brand: string;
  unitsPerDose: number;
  maxDosesPerDay: number;
  ingredients: KBIngredient[];
  verify: boolean;
}
const PRODUCTS = (productsData as { products: KBProduct[] }).products;

/**
 * Pharmacist-curated DailyMed set_id per product (AUTHORITATIVE). openFDA lists
 * many SKUs per brand (kids, 12-hour, PM, private label), so a brand search can
 * silently hit the wrong label — a value that happens to match is not proof of
 * the right SKU. When a set_id is pinned here, we fetch THAT exact label instead
 * of guessing by brand. Fill these from https://dailymed.nlm.nih.gov (search the
 * product, copy the setid from the URL). Empty = falls back to brand search
 * (report only, not authoritative).
 */
const SET_ID: Record<string, string> = {
  // "advil": "xxxxxxxx-xxxx-...",  ← pharmacist pins the exact OTC 200 mg SKU
};

/** openFDA search query per product (brand + a distinguishing ingredient). */
const QUERY: Record<string, string> = {
  "tylenol-regular": 'openfda.brand_name:"tylenol+regular+strength"',
  "tylenol-extra-strength": 'openfda.brand_name:"tylenol+extra+strength"',
  advil: 'openfda.brand_name.exact:"Advil"',
  aleve: 'openfda.brand_name:"aleve"+AND+active_ingredient:"naproxen"',
  "bayer-aspirin": 'openfda.brand_name:"bayer"+AND+active_ingredient:"aspirin"',
  "excedrin-extra-strength": 'openfda.brand_name:"excedrin+extra+strength"',
  dayquil: 'openfda.brand_name:"dayquil"',
  nyquil: 'openfda.brand_name:"nyquil"',
  "tylenol-cold-flu-severe": 'openfda.brand_name:"tylenol+cold+%26+flu+severe"',
  mucinex: 'openfda.brand_name:"mucinex"+AND+active_ingredient:"guaifenesin"+AND+active_ingredient:"dextromethorphan"',
  "mucinex-dm": 'openfda.brand_name:"mucinex+dm"',
  sudafed: 'openfda.brand_name:"sudafed"+AND+active_ingredient:"pseudoephedrine"',
  "sudafed-pe": 'openfda.brand_name:"sudafed+pe"',
  benadryl: 'openfda.brand_name:"benadryl"+AND+active_ingredient:"diphenhydramine"',
  zyrtec: 'openfda.brand_name:"zyrtec"+AND+active_ingredient:"cetirizine"',
  "tylenol-pm": 'openfda.brand_name:"tylenol+pm"',
  "advil-cold-sinus": 'openfda.brand_name:"advil+cold"',
};

/** Regex base for each ingredient key (openFDA uses salt forms after the base). */
function strengthOf(text: string, ingredientKey: string): number | null {
  const base = ingredientKey.replace(/[^a-z]/gi, "");
  // <base> [optional salt words] <number> mg   — the number nearest the name
  const re = new RegExp(`${base}[a-z\\s]{0,25}?(\\d+(?:\\.\\d+)?)\\s*mg`, "i");
  const m = text.match(re);
  return m ? Number(m[1]) : null;
}

const UNIT = "(?:tablet|caplet|capsule|liquicap|liqui-?cap|softgel|gelcap|geltab|packet|teaspoon|tablespoon|lozenge|dose)s?";
function unitsPerDose(dir: string): number | null {
  const m = dir.match(new RegExp(`take\\s+(\\d+)\\s+${UNIT}`, "i"));
  return m ? Number(m[1]) : null;
}
function maxUnitsPerDay(dir: string): number | null {
  const m =
    dir.match(new RegExp(`not\\s+(?:more\\s+than|to\\s+exceed)\\s+(\\d+)\\s+${UNIT}[^.]*24\\s*hour`, "i")) ||
    dir.match(new RegExp(`(\\d+)\\s+${UNIT}\\s+in\\s+(?:any\\s+)?24\\s*hour`, "i"));
  return m ? Number(m[1]) : null;
}

interface Row {
  id: string;
  brand: string;
  fdaBrand: string;
  setId: string;
  lines: string[];
  flags: number;
  pinned: boolean;
}

async function fetchLabel(query: string): Promise<Record<string, unknown> | null> {
  const url = `https://api.fda.gov/drug/label.json?search=${query}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as { results?: Record<string, unknown>[] };
  return json.results?.[0] ?? null;
}

/** Fetch the exact pinned label by DailyMed set_id (authoritative, unambiguous). */
async function fetchBySetId(setId: string): Promise<Record<string, unknown> | null> {
  return fetchLabel(`set_id:"${setId}"`);
}

function mark(kb: number | string, fda: number | string | null): string {
  if (fda == null) return "?";
  return String(kb) === String(fda) ? "✓" : "✗";
}

async function main() {
  const only = process.argv.slice(2);
  const targets = only.length ? PRODUCTS.filter((p) => only.includes(p.id)) : PRODUCTS;
  const rows: Row[] = [];

  for (const p of targets) {
    const pinned = SET_ID[p.id];
    const q = QUERY[p.id];
    let label: Record<string, unknown> | null = null;
    try {
      label = pinned ? await fetchBySetId(pinned) : q ? await fetchLabel(q) : null;
    } catch {
      label = null;
    }
    const row: Row = {
      id: p.id,
      brand: p.brand,
      fdaBrand: "",
      setId: "",
      lines: [],
      flags: 0,
      pinned: !!pinned,
    };

    if (!label) {
      row.lines.push(`  ⚠️ no openFDA match — pin a DailyMed set_id or fix the search term`);
      row.flags++;
      rows.push(row);
      continue;
    }

    const openfda = (label.openfda as { brand_name?: string[] }) ?? {};
    row.fdaBrand = openfda.brand_name?.[0] ?? "(unnamed)";
    row.setId = (label.set_id as string) ?? "";
    const active = ((label.active_ingredient as string[]) ?? []).join(" ");
    const dir = ((label.dosage_and_administration as string[]) ?? []).join(" ");

    const fdaUnits = unitsPerDose(dir);
    const fdaMaxUnits = maxUnitsPerDay(dir);
    const fdaMaxDoses = fdaUnits && fdaMaxUnits ? fdaMaxUnits / fdaUnits : null;

    // units/dose and max doses/day
    const um = mark(p.unitsPerDose, fdaUnits);
    const dm = mark(p.maxDosesPerDay, fdaMaxDoses);
    if (um === "✗" || dm === "✗") row.flags++;
    row.lines.push(
      `  units/dose  KB=${p.unitsPerDose}  openFDA=${fdaUnits ?? "?"}  ${um}` +
        `    max doses/day  KB=${p.maxDosesPerDay}  openFDA=${fdaMaxDoses ?? "?"} (=${fdaMaxUnits ?? "?"}/${fdaUnits ?? "?"})  ${dm}`,
    );

    // per-ingredient per-unit strength
    for (const ing of p.ingredients) {
      const kbPerUnit = ing.mgPerDose / p.unitsPerDose;
      const fdaPerUnit = strengthOf(active, ing.ingredient);
      const m = mark(kbPerUnit, fdaPerUnit);
      if (m === "✗") row.flags++;
      row.lines.push(
        `  ${ing.ingredient.padEnd(18)} per-unit  KB=${kbPerUnit} mg  openFDA=${fdaPerUnit ?? "?"} mg  ${m}` +
          `   (KB per-dose ${ing.mgPerDose} mg = ${kbPerUnit}×${p.unitsPerDose})`,
      );
    }
    rows.push(row);
  }

  // ── console + markdown report ────────────────────────────────────────────
  const out: string[] = [];
  out.push(`# openFDA composition cross-check (B-4)\n`);
  out.push(`Generated: ${new Date().toISOString().slice(0, 10)} · read-only · deterministic (no LLM).`);
  out.push(`Legend: ✓ KB matches openFDA · ✗ mismatch (review) · ? could not extract.\n`);

  for (const r of rows) {
    const prov = r.pinned ? "PINNED set_id (authoritative)" : "brand search (⚠️ verify SKU)";
    const status = r.flags === 0 ? "✓ clean" : `⚠️ ${r.flags} flag(s)`;
    const cite = r.setId
      ? `https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${r.setId}`
      : "(no set_id)";
    out.push(`## ${r.id} — ${status} · ${prov}`);
    out.push(`KB brand: ${r.brand}  ·  openFDA: ${r.fdaBrand}`);
    out.push(`DailyMed: ${cite}`);
    out.push("```");
    out.push(...r.lines);
    out.push("```\n");
    console.log(
      `${r.flags === 0 ? "✓" : "⚠️"} ${r.id.padEnd(24)} ${r.pinned ? "[pinned]" : "[search]"} openFDA="${r.fdaBrand}"  flags=${r.flags}`,
    );
  }

  const clean = rows.filter((r) => r.flags === 0).length;
  const summary = `\n${clean}/${rows.length} products clean; ${rows.length - clean} need review.`;
  console.log(summary);
  out.push(`---\n${summary.trim()}`);

  const path = join(process.cwd(), "docs", "FDA-COMPOSITION-CHECK.md");
  writeFileSync(path, out.join("\n") + "\n");
  console.log(`\nWrote docs/FDA-COMPOSITION-CHECK.md`);
}

main().catch((e) => {
  console.error("sync-fda failed:", e);
  process.exit(1);
});
