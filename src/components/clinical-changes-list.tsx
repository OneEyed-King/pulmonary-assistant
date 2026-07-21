import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Siren, FlaskConical, Pill } from "lucide-react";
import { computeMetricComparisons } from "@/lib/clinical-changes";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Encounter, MedicationRequest, Observation } from "@/lib/fhir-types";

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 182;
const NINETY_DAYS_MS = 1000 * 60 * 60 * 24 * 90;

interface ChangeRow {
  severity: "significant" | "attention" | "info";
  icon: React.ReactNode;
  label: string;
  date?: string;
  description: string;
}

const rowStyles = {
  significant: "border-rose-200 bg-rose-50/60",
  attention: "border-amber-200 bg-amber-50/60",
  info: "border-sky-200 bg-sky-50/60",
};

const labelStyles = {
  significant: "text-rose-700",
  attention: "text-amber-700",
  info: "text-sky-700",
};

export function ClinicalChangesList({
  observations,
  encounters,
  medications,
}: {
  observations: Observation[];
  encounters: Encounter[];
  medications: MedicationRequest[];
}) {
  const rows: ChangeRow[] = [];
  const now = Date.now();

  for (const e of encounters) {
    if (e.class?.code === "EMER" && e.period?.start && now - new Date(e.period.start).getTime() <= SIX_MONTHS_MS) {
      const type = e.type?.[0]?.coding?.[0]?.display ?? e.type?.[0]?.text ?? "Emergency visit";
      rows.push({
        severity: "significant",
        icon: <Siren className="h-4 w-4" />,
        label: "Emergency Visit",
        date: e.period.start,
        description: type,
      });
    }
  }

  for (const c of computeMetricComparisons(observations)) {
    if (c.severity === "stable") continue;
    const trendWord = c.direction === "up" ? "rose" : c.direction === "down" ? "declined" : "changed";
    const from = c.previous !== undefined ? `${c.previous}${c.unit}` : "unknown";
    const to = c.current !== undefined ? `${c.current}${c.unit}` : "unknown";
    rows.push({
      severity: c.severity === "significant" ? "significant" : "attention",
      icon: <FlaskConical className="h-4 w-4" />,
      label: "Abnormal Lab",
      date: c.currentDate,
      description: `${c.label} ${trendWord} from ${from} to ${to}${c.previousDate ? ` since ${formatDate(c.previousDate)}` : ""}.`,
    });
  }

  for (const m of medications) {
    if (m.authoredOn && now - new Date(m.authoredOn).getTime() <= NINETY_DAYS_MS) {
      const name = m.medicationCodeableConcept?.text ?? m.medicationCodeableConcept?.coding?.[0]?.display ?? "Medication";
      rows.push({
        severity: "info",
        icon: <Pill className="h-4 w-4" />,
        label: "Medication Added",
        date: m.authoredOn,
        description: name,
      });
    }
  }

  const severityRank = { significant: 0, attention: 1, info: 2 };
  rows.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Since Last Visit</p>
            <CardTitle className="mt-0.5 font-display text-base font-semibold">Clinical Changes</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">{rows.length} event{rows.length === 1 ? "" : "s"}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No notable changes since the last visit.</p>}
        {rows.map((r, i) => (
          <div key={i} className={`flex items-start gap-3 rounded-md border p-3 ${rowStyles[r.severity]}`}>
            <span className={labelStyles[r.severity]}>{r.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className={`text-sm font-semibold ${labelStyles[r.severity]}`}>{r.label}</span>
                {r.date && <span className="font-mono text-xs text-muted-foreground">{formatDateTime(r.date)}</span>}
              </div>
              <p className="mt-0.5 text-sm text-gray-700">{r.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
