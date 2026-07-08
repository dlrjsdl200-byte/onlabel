import type { VerifyResult } from "@/lib/onlabel/verify";

export function Sources({ result }: { result: VerifyResult }) {
  // Collect distinct provenance strings from matched products + findings.
  const sources = new Set<string>();
  for (const p of result.matched) if (p.source) sources.add(p.source);
  for (const f of result.findings) if (f.source) sources.add(f.source);
  if (sources.size === 0) return null;
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-foreground">Sources</h3>
      <div className="flex flex-wrap gap-2">
        {[...sources].map((s) => (
          <span
            key={s}
            className="rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
          >
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}
