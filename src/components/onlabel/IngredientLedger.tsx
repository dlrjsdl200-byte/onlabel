import type { IngredientFinding } from "@/lib/onlabel/verify";
import { VERDICT, fmtMg, fmtRegimen } from "./verdict";
import { cn } from "@/lib/utils";

export function IngredientLedger({
  findings,
}: {
  findings: IngredientFinding[];
}) {
  if (findings.length === 0) return null;
  // Renders inside a <Disclosure> ("See the dose math") — no own heading/section,
  // the disclosure summary provides the label.
  return (
    <>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Ingredient</th>
              <th className="px-4 py-2.5 font-medium">Found in</th>
              <th className="px-4 py-2.5 text-right font-medium">
                Combined&nbsp;/&nbsp;day
              </th>
              <th className="px-4 py-2.5 text-right font-medium">Limit</th>
              <th className="px-4 py-2.5 text-center font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => {
              const v = VERDICT[f.severity];
              const flagged = f.severity !== "ok";
              return (
                <tr
                  key={f.ingredient}
                  className={cn(
                    "border-b last:border-0",
                    flagged && v.bg,
                  )}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {f.displayName}
                  </td>
                  <td className="px-4 py-3">
                    <ul className="space-y-1.5">
                      {f.contributions.map((c) => (
                        <li key={c.brand}>
                          <span className="text-foreground">{c.brand}</span>
                          <span className="block text-xs tabular-nums text-muted-foreground">
                            {fmtRegimen(c)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right tabular-nums",
                      f.exceedsLimit ? cn("font-semibold", v.fg) : "text-foreground",
                    )}
                  >
                    {fmtMg(f.totalMaxDailyMg)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {f.limitMg != null ? fmtMg(f.limitMg) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
                        v.bg,
                        v.fg,
                      )}
                      title={v.label}
                    >
                      <span aria-hidden>{v.icon}</span>
                      {v.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        “Combined / day” is each product taken at its own label maximum, summed.
      </p>
    </>
  );
}
