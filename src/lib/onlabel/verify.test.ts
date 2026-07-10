/**
 * Smoke tests for the OnLabel deterministic verifier.
 * Run: npx tsx src/lib/onlabel/verify.test.ts
 */
import assert from "node:assert";
import { verify, resolveProduct } from "./verify";
import productsData from "../../data/products.json";
import ingredientsData from "../../data/ingredients.json";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok   ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL ${name}`);
    console.error("       " + (err as Error).message);
    process.exitCode = 1;
  }
}

console.log("OnLabel verifier smoke tests\n");

// Flagship: Tylenol Extra Strength + DayQuil -> hidden acetaminophen duplication + overdose
test("Tylenol Extra Strength + DayQuil flags acetaminophen duplication + danger", () => {
  const r = verify(["Tylenol Extra Strength", "DayQuil"]);
  assert.strictEqual(r.matched.length, 2, "both products should match");
  const apap = r.findings.find((f) => f.ingredient === "acetaminophen");
  assert.ok(apap, "acetaminophen finding should exist");
  assert.strictEqual(apap!.duplicated, true, "acetaminophen should be duplicated");
  assert.strictEqual(apap!.exceedsLimit, true, "combined APAP should exceed 4000 mg/day");
  assert.strictEqual(r.overall, "danger", "overall verdict should be danger");
});

// Single product, normal use -> ok
test("Advil alone is ok", () => {
  const r = verify(["Advil"]);
  assert.strictEqual(r.overall, "ok");
});

// Two different NSAIDs -> class rule danger
test("Advil + Aleve flags multiple NSAIDs (danger)", () => {
  const r = verify(["Advil", "Aleve"]);
  const nsaid = r.classFindings.find((c) => c.className === "nsaid");
  assert.ok(nsaid, "nsaid class finding should exist");
  assert.strictEqual(r.overall, "danger");
});

// Hidden APAP in PM combo + Tylenol
test("Tylenol Extra Strength + Tylenol PM flags acetaminophen duplication", () => {
  const r = verify(["Tylenol Extra Strength", "Tylenol PM"]);
  const apap = r.findings.find((f) => f.ingredient === "acetaminophen");
  assert.ok(apap && apap.duplicated, "acetaminophen duplicated across daytime + PM");
  assert.notStrictEqual(r.overall, "ok");
});

// Phenylephrine efficacy note surfaces
test("DayQuil surfaces phenylephrine efficacy note", () => {
  const r = verify(["DayQuil"]);
  const pe = r.findings.find((f) => f.ingredient === "phenylephrine");
  assert.ok(pe, "phenylephrine finding should exist");
  assert.ok(pe!.efficacyNote && pe!.efficacyNote.length > 0, "efficacy note present");
});

// Unknown product is reported, not crashed
test("Unknown product is reported as unmatched", () => {
  const r = verify(["Nonexistent Brand XYZ"]);
  assert.strictEqual(r.unmatched.length, 1);
  assert.strictEqual(r.matched.length, 0);
});

// Invariant: any single product at its own label max must not be "danger".
// A single compliant OTC product cannot exceed an ingredient's daily limit;
// if it does, that ingredient's maxDailyMg is set too low (data error).
test("no single catalog product is danger on its own", () => {
  const products = (productsData as { products: { brand: string }[] }).products;
  for (const p of products) {
    const r = verify([p.brand]);
    assert.notStrictEqual(
      r.overall,
      "danger",
      `${p.brand} flags danger alone — an ingredient limit is likely too low`,
    );
  }
});

// Resolution invariant: every catalog product must resolve to ITSELF from its own
// brand name. Guards against a resolver change (B-19/B-21) or a newly-added product
// whose name is shadowed/mis-scored so the wrong SKU (or none) comes back.
test("every catalog product resolves to itself from its brand name", () => {
  const products = (productsData as { products: { id: string; brand: string }[] }).products;
  for (const p of products) {
    const m = resolveProduct(p.brand);
    assert.ok(m, `${p.brand} does not resolve to any product`);
    assert.strictEqual(m!.product.id, p.id, `${p.brand} resolved to ${m!.product.id}, not ${p.id}`);
  }
});

// Provenance invariant: every ingredient daily ceiling must cite a primary
// source. A maxDailyMg with no `source` is an un-auditable number — exactly the
// gap that let a "manufacturer dosing schedule" be mistaken for an ingredient
// ceiling. Forces `npm run audit:ceilings` groundwork to stay honest (D22/D37).
test("every ingredient maxDailyMg cites a source", () => {
  const ings = (ingredientsData as {
    ingredients: Record<string, { maxDailyMg: number | null; source?: string }>;
  }).ingredients;
  for (const [key, ref] of Object.entries(ings)) {
    if (ref.maxDailyMg == null) continue; // null = no monograph ceiling (e.g. caffeine) — legitimate
    assert.ok(
      typeof ref.source === "string" && ref.source.trim().length > 0,
      `ingredient "${key}" has maxDailyMg=${ref.maxDailyMg} but no source citation`,
    );
  }
});

// Strength-variant resolution (안 1): bare brand -> default SKU, surfaced.
test("bare 'Tylenol' resolves to Extra Strength as a surfaced assumption", () => {
  const r = verify(["Tylenol", "DayQuil"]);
  const t = r.matched.find((p) => p.brandKey === "tylenol");
  assert.ok(t, "a tylenol-family product should match");
  assert.strictEqual(t!.brand, "Tylenol Extra Strength", "default SKU is Extra Strength");
  assert.strictEqual(r.assumptions.length, 1, "one assumption should be surfaced");
  assert.strictEqual(r.assumptions[0].input, "Tylenol");
  assert.strictEqual(r.assumptions[0].resolvedTo, "Tylenol Extra Strength");
  assert.ok(
    r.assumptions[0].alternatives.includes("Tylenol Regular Strength"),
    "alternatives should list the other strength",
  );
});

// Explicit strength is honored and NOT flagged as an assumption.
test("explicit 'Tylenol Regular Strength' is not an assumption", () => {
  const r = verify(["Tylenol Regular Strength"]);
  assert.strictEqual(r.matched[0].brand, "Tylenol Regular Strength");
  assert.strictEqual(r.assumptions.length, 0, "explicit strength has no assumption");
});

// Different-formulation product is never grouped into the strength family.
test("'Tylenol PM' resolves to itself, not a strength variant", () => {
  const r = verify(["Tylenol PM"]);
  assert.strictEqual(r.matched[0].brand, "Tylenol PM");
  assert.strictEqual(r.assumptions.length, 0);
});

// B-19: a strength abbreviation ("ES"/"XS") must resolve to the strength SKU it
// names, NOT drift to a sibling formulation (Tylenol PM). This previously caused
// a danger->caution SAFETY DOWNGRADE on the flagship duplication case.
test("'Tylenol ES' resolves to Extra Strength (not Tylenol PM)", () => {
  assert.strictEqual(verify(["Tylenol ES"]).matched[0]?.id, "tylenol-extra-strength");
  assert.strictEqual(verify(["Tylenol XS"]).matched[0]?.id, "tylenol-extra-strength");
});
test("'Tylenol ES' + NyQuil still flags acetaminophen danger", () => {
  assert.strictEqual(verify(["Tylenol ES", "NyQuil"]).overall, "danger");
});
// A noise modifier absent from the catalog collapses to the family default, not
// a sibling: "Children's Tylenol" (peds not stocked) -> adult default, never PM.
test("brand + noise modifier collapses to family default, not a sibling SKU", () => {
  assert.strictEqual(verify(["Children's Tylenol"]).matched[0]?.id, "tylenol-extra-strength");
});

// B-17: levocetirizine is the R-enantiomer of cetirizine — the SAME drug. Taking
// Xyzal + Zyrtec was a false-NEGATIVE "ok" (hidden double-dose); it must be caution.
test("Xyzal + Zyrtec (levocetirizine + cetirizine) is caution, not ok", () => {
  const r = verify(["Xyzal", "Zyrtec"]);
  assert.strictEqual(r.overall, "caution");
  assert.ok(
    r.classFindings.some((c) => c.className === "same-drug"),
    "should flag a same-drug (isomer) finding",
  );
});
test("a single non-sedating antihistamine alone is ok", () => {
  assert.strictEqual(verify(["Xyzal"]).overall, "ok");
  assert.strictEqual(verify(["Zyrtec"]).overall, "ok");
});
// B-17 (Q2): two DIFFERENT non-sedating antihistamines -> class caution.
test("Zyrtec + Claritin (two non-sedating antihistamines) is caution", () => {
  const r = verify(["Zyrtec", "Claritin"]);
  assert.strictEqual(r.overall, "caution");
  assert.ok(r.classFindings.some((c) => c.className === "antihistamine-nonsedating"));
});

// B-20: the same SKU named twice is ONE product — no double-count, no false danger.
test("duplicate product name is not double-counted", () => {
  assert.strictEqual(verify(["Advil", "Advil"]).overall, "ok");
  assert.strictEqual(verify(["Mucinex", "Mucinex 600"]).overall, "ok");
  // but two genuinely different products still sum
  assert.strictEqual(verify(["Advil", "Aleve"]).overall, "danger");
});

// B-21: "Advil 200mg" must resolve to plain Advil, not Advil PM (the "/ Motrin IB"
// alias must not sink the canonical SKU). Generic symptom phrases resolve to
// nothing rather than latching onto an arbitrary SKU.
test("'Advil 200mg' resolves to plain Advil (not Advil PM)", () => {
  assert.strictEqual(verify(["Advil 200mg"]).matched[0]?.id, "advil");
});
test("a generic symptom phrase resolves to no product", () => {
  assert.strictEqual(verify(["cold and flu"]).matched.length, 0);
  assert.strictEqual(verify(["severe cold medicine"]).matched.length, 0);
});

// Regression: the LLM writes "and" where the label prints "&" / "+". A short
// SKU id must not shadow a more specific multi-word product, and a distinct SKU
// must not collapse to the brand's strength-family default. Both previously
// produced a false-NEGATIVE verdict (danger -> ok), the worst failure mode.
test("'Advil Cold and Sinus' resolves to the combo SKU (not plain Advil)", () => {
  const r = verify(["Advil Cold and Sinus"]);
  assert.strictEqual(r.matched[0]?.id, "advil-cold-sinus");
});

test("Sudafed + 'Advil Cold and Sinus' still flags pseudoephedrine danger", () => {
  const r = verify(["Sudafed", "Advil Cold and Sinus"]);
  const pse = r.findings.find((f) => f.ingredient === "pseudoephedrine");
  assert.ok(pse && pse.duplicated && pse.exceedsLimit, "PSE duplicated over limit");
  assert.strictEqual(r.overall, "danger");
});

test("'Tylenol Cold and Flu Severe' does not collapse to a plain Tylenol SKU", () => {
  const r = verify(["Tylenol Cold and Flu Severe"]);
  assert.strictEqual(r.matched[0]?.id, "tylenol-cold-flu-severe");
  assert.strictEqual(r.assumptions.length, 0, "a named distinct SKU is not an assumption");
});

// Guard: the fix must not break bare-brand default resolution.
test("bare 'Tylenol' still resolves to Extra Strength default after the fix", () => {
  const r = verify(["Tylenol"]);
  assert.strictEqual(r.matched[0]?.id, "tylenol-extra-strength");
  assert.strictEqual(r.assumptions.length, 1);
});

// B-8 regression: a bare active-ingredient name must still count toward
// duplication/class overlap, or a generic + brand of the SAME drug is a
// false-NEGATIVE (green OK on a real double dose).
test("generic 'acetaminophen' + Tylenol flags acetaminophen duplication", () => {
  const r = verify(["acetaminophen", "Tylenol Extra Strength"]);
  assert.strictEqual(r.genericIngredients[0]?.ingredient, "acetaminophen");
  const apap = r.findings.find((f) => f.ingredient === "acetaminophen");
  assert.ok(apap?.duplicated, "acetaminophen must be duplicated");
  assert.notStrictEqual(r.overall, "ok");
});

test("generic 'ibuprofen' + Aleve flags a two-NSAID danger", () => {
  const r = verify(["ibuprofen", "Aleve"]);
  assert.strictEqual(r.overall, "danger");
  assert.ok(r.classFindings.some((c) => c.className === "nsaid"));
});

test("generic name contributes 0 mg — no fabricated cumulative total", () => {
  const r = verify(["acetaminophen", "Tylenol Extra Strength"]);
  const apap = r.findings.find((f) => f.ingredient === "acetaminophen");
  // Only Tylenol's real 3,000 mg/day counts; the bare name adds nothing.
  assert.strictEqual(apap?.totalMaxDailyMg, 3000);
});

test("a single bare ingredient is not a spurious duplication", () => {
  const r = verify(["acetaminophen"]);
  assert.strictEqual(r.overall, "ok");
});

test("a non-drug string stays unmatched (no over-matching)", () => {
  const r = verify(["zzz not a drug", "Advil"]);
  assert.ok(r.unmatched.includes("zzz not a drug"));
  assert.strictEqual(r.genericIngredients.length, 0);
});

// B-11: colloquial "regular Tylenol" means the default SKU (Extra Strength),
// not the literal "Regular Strength" product. Deterministic resolution must not
// hinge on whether the LLM keeps or drops the word "regular".
test("'regular Tylenol' resolves to Extra Strength default with an assumption", () => {
  const r = verify(["regular Tylenol"]);
  assert.strictEqual(r.matched[0]?.id, "tylenol-extra-strength");
  assert.strictEqual(r.assumptions.length, 1, "colloquial default is a surfaced assumption");
  assert.strictEqual(r.assumptions[0].input, "regular Tylenol");
  assert.strictEqual(r.assumptions[0].resolvedTo, "Tylenol Extra Strength");
});

test("'Tylenol PM' + 'regular Tylenol' -> acetaminophen duplication caution", () => {
  const r = verify(["Tylenol PM", "regular Tylenol"]);
  const apap = r.findings.find((f) => f.ingredient === "acetaminophen");
  assert.ok(apap?.duplicated, "acetaminophen must be flagged duplicated");
  assert.strictEqual(r.overall, "caution", "at-ceiling dup is caution, deterministic");
  assert.strictEqual(r.assumptions.length, 1, "'regular Tylenol' surfaces an assumption");
});

// Guard: the full official name is still an EXACT, non-assumed Regular Strength.
test("explicit 'Tylenol Regular Strength' is unchanged by the B-11 fix", () => {
  const r = verify(["Tylenol Regular Strength"]);
  assert.strictEqual(r.matched[0]?.id, "tylenol-regular");
  assert.strictEqual(r.assumptions.length, 0);
});

// Golden parity: naming Extra Strength explicitly matches the re-baselined verdict.
test("'Tylenol PM' + 'Tylenol Extra Strength' is caution (golden x100-txpm-tylenol)", () => {
  const r = verify(["Tylenol PM", "Tylenol Extra Strength"]);
  assert.strictEqual(r.overall, "caution");
});

console.log(`\n${passed} passed`);
