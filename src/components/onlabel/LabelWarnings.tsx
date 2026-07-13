import type { VerifyResult, ProductWarnings } from "@/lib/onlabel/verify";
import { Disclosure } from "./Disclosure";

/**
 * FDA label warnings — the deterministic answer to "what are the side effects /
 * warnings of X?". Every word here is VERBATIM from the product's openFDA Drug
 * Facts label (extracted by scripts/fda-warnings.ts, cited by set_id); the LLM
 * never authors warning text. Long by nature, so each product's warnings sit in
 * a collapsed Disclosure with a DailyMed link to the full label.
 *
 * The SPL section strings are self-headed but the heading runs inline into the
 * body ("Warnings Allergy alert: …", "Do not use • if you …"), so on screen it
 * reads as one long block and the reader can't tell which FDA section a passage
 * came from. We add a short bold section label ABOVE each passage so the source
 * section is visible — the verbatim label text below is never edited (D40).
 */
const SECTIONS: Array<{ key: keyof ProductWarnings; label: string }> = [
  { key: "warnings", label: "Warnings" },
  { key: "doNotUse", label: "Do not use" },
  { key: "stopUse", label: "Stop use" },
  { key: "whenUsing", label: "When using this product" },
  { key: "askDoctor", label: "Ask a doctor before use" },
  { key: "askDoctorOrPharmacist", label: "Ask a doctor or pharmacist" },
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
              {SECTIONS.map(({ key, label }) => {
                const text = w[key];
                if (!text) return null;
                return (
                  <div key={key} className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-foreground/60">
                      {label} · FDA label
                    </span>
                    <p className="text-[13px] leading-relaxed text-foreground/80">
                      {text}
                    </p>
                  </div>
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
