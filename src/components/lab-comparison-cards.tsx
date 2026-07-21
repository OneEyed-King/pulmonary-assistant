import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Minus, FlaskConical } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { computeMetricComparisons } from "@/lib/clinical-changes";
import type { Observation } from "@/lib/fhir-types";

// Softer, warmer severity tints — muted rose instead of a punchy red, and a lighter
// amber wash — so a grid full of tiles reads calm rather than alarm-heavy.
const severityBorder = {
  stable: "border-border/70",
  attention: "border-amber-200",
  significant: "border-rose-200",
};

const severityBg = {
  stable: "bg-white",
  attention: "bg-amber-50/60",
  significant: "bg-rose-50/60",
};

export function LabComparisonCards({ observations }: { observations: Observation[] }) {
  const comparisons = computeMetricComparisons(observations);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1.5">
            <FlaskConical className="h-4 w-4 text-primary" />
            Laboratory — Current vs Previous
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Stable
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Attention
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-400" /> Significant
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {comparisons.length === 0 ? (
          <p className="text-sm text-muted-foreground">No laboratory data recorded.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {comparisons.map((c) => {
              const worsening =
                c.direction !== "flat" && (c.good === "higher" ? c.direction === "down" : c.direction === "up");
              const TrendIcon = c.direction === "up" ? TrendingUp : c.direction === "down" ? TrendingDown : Minus;
              const trendLabel = c.direction === "up" ? "Increased" : c.direction === "down" ? "Decreased" : "Stable";

              return (
                <div
                  key={c.key}
                  className={cn(
                    "rounded-md border p-3",
                    severityBorder[c.severity],
                    severityBg[c.severity]
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{c.label}</span>
                    {c.previous !== undefined && (
                      <span
                        className={cn(
                          "flex items-center gap-1 text-xs font-medium",
                          worsening ? "text-rose-600" : c.direction === "flat" ? "text-muted-foreground" : "text-emerald-600"
                        )}
                      >
                        <TrendIcon className="h-3.5 w-3.5" />
                        {trendLabel}
                      </span>
                    )}
                  </div>
                  {c.referenceText && <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{c.referenceText}</p>}
                  <div className="mt-2 flex items-end gap-4">
                    {c.previous !== undefined && (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Previous</p>
                        <p className="font-mono text-base text-gray-600">
                          {c.previous}
                          {c.unit}
                        </p>
                        {c.previousDate && <p className="font-mono text-[10px] text-muted-foreground">{formatDate(c.previousDate)}</p>}
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Current</p>
                      <p className={cn("font-mono text-base font-semibold", worsening ? "text-rose-700" : "text-gray-900")}>
                        {c.current}
                        {c.unit}
                      </p>
                      {c.currentDate && <p className="font-mono text-[10px] text-muted-foreground">{formatDate(c.currentDate)}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
