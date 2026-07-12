import type { VerifyResult, ProductWarnings } from "@/lib/onlabel/verify";
import { Disclosure } from "./Disclosure";

/**
 * FDA label warnings — the deterministic answer to "what are the side effects /
 * warnings of X?". Every word here is VERBATIM from the product's openFDA Drug
 * Facts label (extracted by scripts/fda-warnings.ts, cited by set_id); the LLM
 * never authors warning text. Long by nature, so each product's warnings sit in
 * a collapsed Disclosure with a DailyMed link to the full label.
 *
 * The section strings are self-headed in the SPL (they begin "Warnings…", "Do
 * not use…", "Stop use…"), so we render them as-is without adding our own
 * headings — keeping the text exactly as the label states it.
 */
const SECTIONS: Array<keyof ProductWarnings> = [
  "warnings",
  "doNotUse",
  "stopUse",
  "whenUsing",
  "askDoctor",
  "askDoctorOrPharmacist",
];

export function LabelWarnings({ result }: { result: VerifyResult }) {
  // Order by the matched products so warnings line up with the answer.
  const entries = result.matched
    .map((p) => result.warnings[p.id])
    .filter((w): w is ProductWarnings => !!w);

  if (entries.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground">
        Label warnings
      </h3>
      <div className="flex flex-col gap-2">
        {entries.map((w) => (
          <Disclosure
            key={w.setId}
            summary={`⚠ ${w.brandName}`}
            meta="FDA Drug Facts"
          >
            <div className="flex flex-col gap-3">
              {SECTIONS.map((key) => {
                const text = w[key];
                if (!text || key === "brandName" || key === "setId" || key === "source")
                  return null;
                return (
                  <p
                    key={key}
                    className="text-[13px] leading-relaxed text-foreground/80"
                  >
                    {text}
                  </p>
                );
              })}
              <a
                href={`https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${w.setId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary hover:underline"
              >
                Read the full FDA Drug Facts label (DailyMed) ↗
              </a>
              <p className="text-[11px] text-muted-foreground">
                Verbatim from the product’s FDA label (openFDA/DailyMed).
              </p>
            </div>
          </Disclosure>
        ))}
      </div>
    </section>
  );
}
