import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { computeMetricComparisons, severityDotColor, PULMO_METRICS, type MetricConfig } from "@/lib/clinical-changes";
import { formatDate } from "@/lib/utils";
import type { Encounter, MedicationRequest, Observation } from "@/lib/fhir-types";

interface Alert {
  severity: "significant" | "attention" | "info";
  text: string;
}

const NINETY_DAYS_MS = 1000 * 60 * 60 * 24 * 90;
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 182;

export function ClinicalAlerts({
  observations,
  encounters,
  medications,
  metrics = PULMO_METRICS,
}: {
  observations: Observation[];
  encounters: Encounter[];
  medications: MedicationRequest[];
  metrics?: MetricConfig[];
}) {
  const alerts: Alert[] = [];

  for (const c of computeMetricComparisons(observations, metrics)) {
    if (c.severity === "stable") continue;
    const trendWord = c.direction === "up" ? "rose" : c.direction === "down" ? "declined" : "changed";
    const from = c.previous !== undefined ? `${c.previous}${c.unit}` : "unknown";
    const to = c.current !== undefined ? `${c.current}${c.unit}` : "unknown";
    alerts.push({
      severity: c.severity === "significant" ? "significant" : "attention",
      text: `${c.label} ${trendWord} from ${from} to ${to}${c.previousDate ? ` since ${formatDate(c.previousDate)}` : ""}.`,
    });
  }

  const now = Date.now();
  for (const e of encounters) {
    if (e.class?.code === "EMER" && e.period?.start && now - new Date(e.period.start).getTime() <= SIX_MONTHS_MS) {
      const type = e.type?.[0]?.coding?.[0]?.display ?? e.type?.[0]?.text ?? "Emergency visit";
      alerts.push({ severity: "significant", text: `Emergency visit on ${formatDate(e.period.start)}: ${type}` });
    }
  }

  for (const m of medications) {
    if (m.authoredOn && now - new Date(m.authoredOn).getTime() <= NINETY_DAYS_MS) {
      const name = m.medicationCodeableConcept?.text ?? m.medicationCodeableConcept?.coding?.[0]?.display ?? "Medication";
      alerts.push({ severity: "info", text: `${name} added on ${formatDate(m.authoredOn)}.` });
    }
  }

  const severityRank = { significant: 0, attention: 1, info: 2 };
  alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Clinical Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {alerts.length === 0 && <p className="text-sm text-muted-foreground">No active alerts.</p>}
        {alerts.map((a, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  a.severity === "significant" ? severityDotColor("significant") : a.severity === "attention" ? severityDotColor("attention") : "#2563eb",
              }}
            />
            <span className="text-gray-700">{a.text}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
