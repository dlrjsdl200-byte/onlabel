import type { Assumption } from "@/lib/onlabel/verify";

/**
 * Surfaces strength assumptions honestly: when a user names a bare brand
 * ("Tylenol"), we resolve it to the most common SKU and say so, with the
 * other strengths listed so they can correct us.
 */
export function AssumptionNote({
  assumptions,
}: {
  assumptions: Assumption[];
}) {
  if (assumptions.length === 0) return null;
  return (
    <div className="rounded-lg border border-primary/25 bg-accent/50 px-4 py-3 text-sm">
      <span className="font-medium text-foreground">Assumed strength.</span>{" "}
      <span className="text-foreground/75">
        {assumptions.map((a, i) => (
          <span key={a.input}>
            {i > 0 && "; "}
            You said “{a.input}” → we used <strong>{a.resolvedTo}</strong>
            {a.alternatives.length > 0 && (
              <> (other strengths: {a.alternatives.join(", ")})</>
            )}
          </span>
        ))}
        . If that&rsquo;s not what you took, name the strength in your question.
      </span>
    </div>
  );
}
