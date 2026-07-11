"use client";

import { useState } from "react";
import type { VerifyResult } from "@/lib/onlabel/verify";
import citationsData from "@/data/citations.json";
import { Disclosure } from "./Disclosure";

interface Citation {
  monograph: string;
  monographTitle: string;
  section: string;
  quote: string;
  url: string;
}

const CITATIONS = (citationsData as { ingredients: Record<string, Citation> })
  .ingredients;

/**
 * Sources as verifiable FDA receipts. For an ingredient we grounded in an OTC
 * monograph, the chip is clickable: it opens a popover with the verbatim quoted
 * directions, the section, and a link to the public FDA monograph PDF — so the
 * basis is checkable, not a claimed web page. Other provenance (product
 * composition, secondary labeling) stays as a plain chip.
 */
export function Sources({ result }: { result: VerifyResult }) {
  const [open, setOpen] = useState<string | null>(null);

  const displayName = new Map(
    result.findings.map((f) => [f.ingredient, f.displayName]),
  );
  const ingredientKeys = [
    ...new Set(
      result.matched.flatMap((p) => p.ingredients.map((i) => i.ingredient)),
    ),
  ];
  const cited = ingredientKeys.filter((k) => CITATIONS[k]);

  // Plain provenance: product composition + any finding source with no citation.
  const plain = new Set<string>();
  for (const p of result.matched) if (p.source) plain.add(p.source);
  for (const f of result.findings)
    if (f.source && !CITATIONS[f.ingredient]) plain.add(f.source);

  if (cited.length === 0 && plain.size === 0) return null;

  const total = cited.length + plain.size;

  return (
    <Disclosure
      summary="Sources"
      meta={`${total} FDA reference${total === 1 ? "" : "s"}`}
    >
      <div className="flex flex-wrap gap-2">
        {cited.map((key) => {
          const c = CITATIONS[key];
          const name = displayName.get(key) ?? key;
          const isOpen = open === key;
          return (
            <div key={key} className="relative">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : key)}
                title={`${c.monograph} ${c.section} — click to see the FDA text`}
                aria-expanded={isOpen}
                className="flex items-center gap-1.5 rounded-full border border-verdict-ok/40 bg-verdict-ok-bg/40 px-3 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-verdict-ok-bg"
              >
                <span aria-hidden className="text-verdict-ok-fg">
                  §
                </span>
                {name} — FDA Monograph {c.monograph}
              </button>
              {isOpen && (
                <div
                  role="dialog"
                  className="absolute left-0 top-full z-20 mt-2 w-80 rounded-xl border bg-background p-4 text-left shadow-lg"
                >
                  <div className="text-xs font-semibold text-foreground">
                    FDA OTC Monograph {c.monograph} · {c.section}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {c.monographTitle}
                  </div>
                  <blockquote className="mt-2 border-l-2 border-verdict-ok/50 pl-3 text-xs italic leading-relaxed text-foreground/80">
                    “{c.quote}”
                  </blockquote>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-verdict-ok-fg hover:underline"
                  >
                    View FDA monograph (PDF) ↗
                  </a>
                </div>
              )}
            </div>
          );
        })}
        {[...plain].map((s) => (
          <span
            key={s}
            className="rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
          >
            {s}
          </span>
        ))}
      </div>
    </Disclosure>
  );
}
