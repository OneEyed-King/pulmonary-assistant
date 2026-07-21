import { AlertTriangle, Siren, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Encounter, MedicationRequest, Observation } from "@/lib/fhir-types";
import { computeMetricComparisons } from "@/lib/clinical-changes";

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 182;
const NINETY_DAYS_MS = 1000 * 60 * 60 * 24 * 90;

function Tile({
  icon: Icon,
  label,
  count,
  description,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  description: string;
  tone: "red" | "amber" | "neutral";
}) {
  const toneClasses = {
    red: "border-rose-200 bg-rose-50/60",
    amber: "border-amber-200 bg-amber-50/60",
    neutral: "border-border/70 bg-white",
  }[tone];
  const iconClasses = {
    red: "text-rose-600",
    amber: "text-amber-600",
    neutral: "text-muted-foreground",
  }[tone];
  const numberClasses = {
    red: "text-rose-700",
    amber: "text-amber-700",
    neutral: "text-gray-900",
  }[tone];

  return (
    <div className={cn("flex-1 rounded-lg border p-4", toneClasses)}>
      <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide", iconClasses)}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={cn("mt-1 font-display text-3xl font-bold", numberClasses)}>{count}</div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function AttentionTiles({
  observations,
  encounters,
  medications,
}: {
  observations: Observation[];
  encounters: Encounter[];
  medications: MedicationRequest[];
}) {
  const comparisons = computeMetricComparisons(observations);
  const criticalCount = comparisons.filter((c) => c.severity === "significant").length;

  const now = Date.now();
  const edVisits = encounters.filter(
    (e) => e.class?.code === "EMER" && e.period?.start && now - new Date(e.period.start).getTime() <= SIX_MONTHS_MS
  );

  const recentMeds = medications.filter(
    (m) => m.authoredOn && now - new Date(m.authoredOn).getTime() <= NINETY_DAYS_MS
  );

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Do Not Miss</p>
        <p className="text-xs text-muted-foreground">Before you walk in</p>
      </div>
      <h2 className="mt-0.5 font-display text-xl font-semibold tracking-tight text-gray-900">Attention Required</h2>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <Tile
          icon={AlertTriangle}
          label="Critical changes"
          count={criticalCount}
          description={
            criticalCount > 0
              ? "Metric(s) crossed a clinically significant threshold since the last visit."
              : "No significant clinical changes since the last visit."
          }
          tone={criticalCount > 0 ? "red" : "neutral"}
        />
        <Tile
          icon={Siren}
          label="ED visits · 6mo"
          count={edVisits.length}
          description={
            edVisits.length > 0
              ? "Recurrent acute exacerbation — consider step-up therapy."
              : "No emergency visits in the last 6 months."
          }
          tone={edVisits.length > 0 ? "amber" : "neutral"}
        />
        <Tile
          icon={Pill}
          label="Recent Rx changes · 90d"
          count={recentMeds.length}
          description={
            recentMeds.length > 0
              ? "Medication regimen changed in the last 90 days."
              : "No medication changes in the last 90 days."
          }
          tone="neutral"
        />
      </div>
    </div>
  );
}
