import type { IngredientFinding } from "@/lib/onlabel/verify";

export function EfficacyNote({
  findings,
}: {
  findings: IngredientFinding[];
}) {
  const notes = findings.filter((f) => f.efficacyNote);
  if (notes.length === 0) return null;
  return (
    <div className="space-y-3">
      {notes.map((f) => (
        <div
          key={f.ingredient}
          className="rounded-xl border-l-4 border-l-primary bg-accent/60 p-4"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Efficacy note · {f.displayName}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">
            {f.efficacyNote}
          </p>
          {f.efficacyRefs && f.efficacyRefs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {f.efficacyRefs.map((ref, i) => (
                <a
                  key={ref}
                  href={ref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  FDA source {f.efficacyRefs!.length > 1 ? i + 1 : ""}↗
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
