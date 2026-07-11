import type { IngredientFinding } from "@/lib/onlabel/verify";
import { VERDICT, fmtMg } from "./verdict";
import { cn } from "@/lib/utils";

export function IngredientLedger({
  findings,
}: {
  findings: IngredientFinding[];
}) {
  if (findings.length === 0) return null;
  // Compact for the evidence rail: four columns, product breakdown folded into a
  // sub-line under the ingredient name so nothing wraps awkwardly in the narrow
  // column. Numeric cells never wrap ("4,000 mg" stays on one line).
  return (
    <>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Ingredient</th>
              <th className="whitespace-nowrap px-2 py-2 text-right font-medium">
                Combined
              </th>
              <th className="whitespace-nowrap px-2 py-2 text-right font-medium">
                Limit
              </th>
              <th className="px-3 py-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => {
              const v = VERDICT[f.severity];
              const flagged = f.severity !== "ok";
              return (
                <tr
                  key={f.ingredient}
                  className={cn("border-b align-top last:border-0", flagged && v.bg)}
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-foreground">
                      {f.displayName}
                    </div>
                    <ul className="mt-0.5 space-y-0.5">
                      {f.contributions.map((c) => (
                        <li
                          key={c.brand}
                          className="text-[11px] leading-snug text-muted-foreground"
                        >
                          {c.brand}{" "}
                          <span className="whitespace-nowrap tabular-nums">
                            · {fmtMg(c.maxDailyMg)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-2 py-2.5 text-right tabular-nums",
                      f.exceedsLimit
                        ? cn("font-semibold", v.fg)
                        : "text-foreground",
                    )}
                  >
                    {fmtMg(f.totalMaxDailyMg)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                    {f.limitMg != null ? fmtMg(f.limitMg) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold",
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
        “Combined” is each product taken at its own label maximum, summed.
      </p>
    </>
  );
}
