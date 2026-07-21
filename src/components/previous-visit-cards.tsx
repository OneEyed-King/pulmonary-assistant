import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, History } from "lucide-react";
import type { Composition, Condition, DiagnosticReport, Encounter, MedicationRequest, Observation } from "@/lib/fhir-types";
import { formatDateTime } from "@/lib/utils";
import { ReportViewerButton } from "@/components/report-viewer";

function refId(reference?: string): string | undefined {
  return reference?.split("/").pop();
}

interface VisitGroup {
  encounter?: Encounter;
  date: string;
  compositions: Composition[];
  diagnosticReports: DiagnosticReport[];
  conditions: Condition[];
  medications: MedicationRequest[];
}

function buildVisitGroups(
  encounters: Encounter[],
  compositions: Composition[],
  diagnosticReports: DiagnosticReport[],
  conditions: Condition[],
  medications: MedicationRequest[]
): VisitGroup[] {
  const groups = new Map<string, VisitGroup>();

  const getGroup = (encounterRef?: string, fallbackDate?: string) => {
    const id = refId(encounterRef) ?? "unlinked";
    if (!groups.has(id)) {
      const encounter = encounters.find((e) => e.id === id);
      groups.set(id, {
        encounter,
        date: encounter?.period?.start ?? fallbackDate ?? "",
        compositions: [],
        diagnosticReports: [],
        conditions: [],
        medications: [],
      });
    }
    return groups.get(id)!;
  };

  for (const c of compositions) getGroup(c.encounter?.reference, c.date).compositions.push(c);
  for (const r of diagnosticReports) getGroup(r.encounter?.reference, r.effectiveDateTime).diagnosticReports.push(r);
  for (const c of conditions) if (c.encounter?.reference) getGroup(c.encounter.reference).conditions.push(c);
  for (const m of medications) if (m.encounter?.reference) getGroup(m.encounter.reference).medications.push(m);

  return Array.from(groups.values())
    .filter((g) => g.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function sectionText(compositions: Composition[], title: string): string | undefined {
  for (const c of compositions) {
    const section = c.section?.find((s) => s.title?.toLowerCase() === title.toLowerCase());
    if (section) return section.text.div.replace(/^<div[^>]*>/, "").replace(/<\/div>$/, "");
  }
  return undefined;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-gray-700">{children}</div>
    </div>
  );
}

export function PreviousVisitCards({
  encounters,
  compositions,
  diagnosticReports,
  conditions,
  medications,
  observations,
  patientName,
}: {
  encounters: Encounter[];
  compositions: Composition[];
  diagnosticReports: DiagnosticReport[];
  conditions: Condition[];
  medications: MedicationRequest[];
  observations: Observation[];
  patientName: string;
}) {
  const visits = buildVisitGroups(encounters, compositions, diagnosticReports, conditions, medications).slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">History</p>
            <CardTitle className="mt-0.5 flex items-center gap-1.5 font-display text-base font-semibold">
              <History className="h-4 w-4 text-primary" />
              Previous Appointments
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">Last {visits.length}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {visits.length === 0 && <p className="text-sm text-muted-foreground">No previous visits recorded.</p>}
        {visits.map((visit, idx) => {
          const type = visit.encounter?.type?.[0]?.coding?.[0]?.display ?? visit.encounter?.type?.[0]?.text ?? "Visit";
          const cls = visit.encounter?.class?.code;
          const reason = sectionText(visit.compositions, "Subjective");
          const doctorNotes = sectionText(visit.compositions, "Objective");
          const assessment = sectionText(visit.compositions, "Assessment");
          const plan = sectionText(visit.compositions, "Plan");

          return (
            <details key={idx} open={idx === 0} className="group rounded-md border border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/60 [&::-webkit-details-marker]:hidden">
                <div className="flex min-w-0 items-center gap-2">
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                  <span className="font-mono text-xs text-muted-foreground">{formatDateTime(visit.date)}</span>
                  <span className="truncate text-sm font-medium text-gray-900">{type}</span>
                  {cls && <Badge tone={cls === "EMER" ? "red" : "blue"}>{cls}</Badge>}
                </div>
                {idx === 0 && <Badge tone="green">Most recent</Badge>}
              </summary>
              <div className="space-y-4 border-t border-border px-3 py-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  {reason && <Field label="Reason for Visit">{reason}</Field>}
                  {plan && <Field label="Follow-up Plan">{plan}</Field>}
                  {visit.conditions.length > 0 && (
                    <Field label="Diagnoses">
                      <ul className="list-disc space-y-0.5 pl-4">
                        {visit.conditions.map((c, i) => (
                          <li key={i}>{c.code?.text ?? c.code?.coding?.[0]?.display ?? "Condition"}</li>
                        ))}
                      </ul>
                    </Field>
                  )}
                  {visit.medications.length > 0 && (
                    <Field label="Medications">
                      <ul className="list-disc space-y-0.5 pl-4">
                        {visit.medications.map((m, i) => (
                          <li key={i}>
                            {m.medicationCodeableConcept?.text ?? m.medicationCodeableConcept?.coding?.[0]?.display ?? "Medication"}
                          </li>
                        ))}
                      </ul>
                    </Field>
                  )}
                </div>
                {assessment && <Field label="Assessment">{assessment}</Field>}
                {doctorNotes && <Field label="Doctor Notes">{doctorNotes}</Field>}
                {visit.diagnosticReports.map((r, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {r.code.text ?? r.code.coding?.[0]?.display ?? "Diagnostic Report"}
                      </div>
                      <ReportViewerButton report={r} observations={observations} patientName={patientName} />
                    </div>
                    <div className="mt-0.5 text-sm text-gray-700">{r.conclusion ?? "No conclusion recorded."}</div>
                  </div>
                ))}
                {!reason && !assessment && !doctorNotes && !plan && visit.diagnosticReports.length === 0 && (
                  <p className="text-sm text-muted-foreground">No notes or reports for this visit.</p>
                )}
              </div>
            </details>
          );
        })}
      </CardContent>
    </Card>
  );
}
