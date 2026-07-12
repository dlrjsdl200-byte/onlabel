/**
 * Extract OTC Drug Facts WARNING sections per product from openFDA — verbatim,
 * deterministic, no LLM. Companion to fda-add (which extracts dosing numbers).
 *
 * For each product in products.json we resolve its openFDA SPL exactly the way
 * fda-add does (fetchCandidates by a strong brand token → selectSku by the
 * product's ingredient set + dose form), then copy the label's warning sections
 * VERBATIM: warnings, do_not_use, stop_use, when_using, ask_doctor,
 * ask_doctor_or_pharmacist — plus the set_id for a DailyMed citation. No number
 * or sentence is authored here; a product that doesn't resolve is written as
 * null and logged (never fabricated).
 *
 * Writes src/data/warnings.json.
 * Run: npx tsx scripts/fda-warnings.ts
 */
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { fetchCandidates, selectSku } from "./fda-lib";
import productsData from "../src/data/products.json" with { type: "json" };

interface Product {
  id: string;
  brand: string;
  doseForm: string;
  ingredients: { ingredient: string }[];
}
const PRODUCTS = (productsData as { products: Product[] }).products;

/** The strong brand search token per product id (the distinctive brand word —
 * NOT always the first word, e.g. "Vicks DayQuil" → "dayquil"). */
const TOKEN: Record<string, string> = {
  "tylenol-regular": "tylenol", "tylenol-extra-strength": "tylenol", advil: "advil",
  aleve: "aleve", "bayer-aspirin": "bayer", "excedrin-extra-strength": "excedrin",
  dayquil: "dayquil", nyquil: "nyquil", "tylenol-cold-flu-severe": "tylenol",
  mucinex: "mucinex", "mucinex-dm": "mucinex", sudafed: "sudafed", "sudafed-pe": "sudafed",
  benadryl: "benadryl", zyrtec: "zyrtec", "tylenol-pm": "tylenol", "advil-cold-sinus": "advil",
  "advil-pm": "advil", "aleve-pm": "aleve", "theraflu-severe": "theraflu", "allegra-d": "allegra",
  "zyrtec-d": "zyrtec", "advil-dual-action": "advil", "excedrin-migraine": "excedrin",
  "tylenol-sinus-severe": "tylenol", "sudafed-pe-pressure-pain": "sudafed", "coricidin-hbp": "coricidin",
  claritin: "claritin", xyzal: "xyzal", "unisom-sleeptabs": "unisom", "claritin-d": "claritin",
  "motrin-ib": "motrin", "excedrin-tension-headache": "excedrin", "tylenol-8hr-arthritis": "tylenol",
  "theraflu-nighttime-severe": "theraflu", "benadryl-allergy-congestion": "benadryl",
  "advil-allergy-sinus": "advil", "mucinex-dm-max": "mucinex", allegra: "allegra",
  "chlor-trimeton": "chlor", "mucinex-sinus-max": "mucinex", "dayquil-severe": "dayquil",
  "nyquil-severe": "nyquil", "dimetapp-cold-cough": "dimetapp", "robitussin-dm": "robitussin",
  delsym: "delsym", zzzquil: "zzzquil",
};

/** Join an SPL string[] field and normalize whitespace (incl. zero-width chars). */
function field(label: Record<string, unknown>, key: string): string | undefined {
  const v = label[key];
  if (!Array.isArray(v) || v.length === 0) return undefined;
  const s = v.join(" ").replace(/[​ ]/g, " ").replace(/\s+/g, " ").trim();
  return s || undefined;
}

interface WarningEntry {
  brandName: string;
  setId: string;
  warnings?: string;
  doNotUse?: string;
  stopUse?: string;
  whenUsing?: string;
  askDoctor?: string;
  askDoctorOrPharmacist?: string;
  source: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const candCache = new Map<string, Record<string, unknown>[]>();
  const out: Record<string, WarningEntry | null> = {};
  const misses: string[] = [];

  for (const p of PRODUCTS) {
    const token = TOKEN[p.id];
    if (!token) {
      console.log(`⚠️  ${p.id}: no token mapping — skipped`);
      out[p.id] = null;
      misses.push(p.id);
      continue;
    }
    if (!candCache.has(token)) {
      candCache.set(token, await fetchCandidates(token));
      await sleep(300); // be gentle with openFDA rate limits
    }
    const candidates = candCache.get(token)!;
    const expected = new Set(p.ingredients.map((i) => i.ingredient));
    const label = selectSku(candidates, p.brand, expected, token, p.doseForm);
    if (!label) {
      console.log(`⚠️  ${p.id} (${p.brand}): no SPL matched {${[...expected].join(", ")}}`);
      out[p.id] = null;
      misses.push(p.id);
      continue;
    }
    const openfda = (label.openfda as { brand_name?: string[] }) ?? {};
    const setId = (label.set_id as string) ?? "";
    const entry: WarningEntry = {
      brandName: openfda.brand_name?.[0] ?? p.brand,
      setId,
      warnings: field(label, "warnings"),
      doNotUse: field(label, "do_not_use"),
      stopUse: field(label, "stop_use"),
      whenUsing: field(label, "when_using"),
      askDoctor: field(label, "ask_doctor"),
      askDoctorOrPharmacist: field(label, "ask_doctor_or_pharmacist"),
      source: `openFDA/DailyMed SPL ${setId}`,
    };
    const hasAny =
      entry.warnings || entry.doNotUse || entry.stopUse || entry.whenUsing || entry.askDoctor;
    if (!hasAny) {
      console.log(`⚠️  ${p.id} (${p.brand}): SPL matched but no warning sections — null`);
      out[p.id] = null;
      misses.push(p.id);
      continue;
    }
    out[p.id] = entry;
    console.log(`✓  ${p.id} → ${entry.brandName} (set ${setId.slice(0, 8)})`);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const dest = join(here, "..", "src", "data", "warnings.json");
  writeFileSync(dest, JSON.stringify({ products: out }, null, 2) + "\n");

  const resolved = PRODUCTS.length - misses.length;
  console.log(`\nResolved ${resolved}/${PRODUCTS.length}. Misses (null): ${misses.join(", ") || "none"}`);
  console.log(`Wrote ${dest}`);
}

main().catch((e) => {
  console.error("fda-warnings failed:", e);
  process.exit(1);
});
