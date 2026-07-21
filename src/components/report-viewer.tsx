"use client";

import { useEffect, useState } from "react";
import { FileText, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { quantityDisplay } from "@/lib/observations";
import type { DiagnosticReport, Observation } from "@/lib/fhir-types";

function refId(reference?: string): string | undefined {
  return reference?.split("/").pop();
}

function resolveResults(report: DiagnosticReport, observations: Observation[]): Observation[] {
  if (!report.result || report.result.length === 0) return [];
  const ids = new Set(report.result.map((r) => refId(r.reference)).filter(Boolean));
  return observations.filter((o) => o.id && ids.has(o.id));
}

function observationValue(o: Observation): string {
  if (o.component && o.component.length > 0) {
    return o.component
      .map((c) => `${c.code.text ?? c.code.coding?.[0]?.display ?? ""}: ${quantityDisplay(c.valueQuantity)}`)
      .join(" · ");
  }
  if (o.valueQuantity) return quantityDisplay(o.valueQuantity);
  if (o.valueCodeableConcept) return o.valueCodeableConcept.text ?? o.valueCodeableConcept.coding?.[0]?.display ?? "—";
  return "—";
}

function reportTitle(report: DiagnosticReport): string {
  return report.code.text ?? report.code.coding?.[0]?.display ?? "Diagnostic Report";
}

/** Renders a DiagnosticReport (plus its linked result Observations) as a self-contained,
 * document-style view — closer to how a lab actually hands you a report than the app's
 * usual card layout. */
function ReportDocument({
  report,
  observations,
  patientName,
  onClose,
}: {
  report: DiagnosticReport;
  observations: Observation[];
  patientName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = resolveResults(report, observations);
  const category = report.category?.[0]?.coding?.[0]?.display ?? report.category?.[0]?.coding?.[0]?.code;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:static print:bg-white print:p-0"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl print:max-h-none print:shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-3 print:hidden">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <FileText className="h-4 w-4 text-primary" />
            Diagnostic Report
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => window.print()} title="Print">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} title="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto px-8 py-6">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              {category && <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{category}</p>}
              <h2 className="mt-0.5 font-display text-xl font-semibold text-gray-900">{reportTitle(report)}</h2>
            </div>
            <Badge tone={report.status === "final" ? "green" : "gray"} className="capitalize">
              {report.status ?? "unknown"}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Patient</p>
              <p className="mt-0.5 text-sm text-gray-800">{patientName}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Performed</p>
              <p className="mt-0.5 text-sm text-gray-800">{formatDateTime(report.effectiveDateTime)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Reported</p>
              <p className="mt-0.5 text-sm text-gray-800">{formatDateTime(report.issued)}</p>
            </div>
          </div>

          {results.length > 0 && (
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Results</p>
              <table className="mt-2 w-full border-collapse text-sm">
                <tbody>
                  {results.map((o, i) => (
                    <tr key={o.id ?? i} className={cn("border-b border-border/70 last:border-0")}>
                      <td className="py-2 pr-3 align-top text-gray-600">
                        {o.code.text ?? o.code.coding?.[0]?.display ?? "Result"}
                      </td>
                      <td className="py-2 pr-3 align-top font-mono font-medium text-gray-900">{observationValue(o)}</td>
                      <td className="whitespace-nowrap py-2 align-top font-mono text-xs text-muted-foreground">
                        {formatDate(o.effectiveDateTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {report.conclusion && (
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Impression</p>
              <p className="mt-1 border-l-2 border-primary/40 pl-3 text-sm leading-relaxed text-gray-700">
                {report.conclusion}
              </p>
            </div>
          )}

          {results.length === 0 && !report.conclusion && (
            <p className="mt-6 text-sm text-muted-foreground">No further detail recorded for this report.</p>
          )}
        </div>

        <div className="border-t border-border px-8 py-3 text-right print:hidden">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ReportViewerButton({
  report,
  observations,
  patientName,
}: {
  report: DiagnosticReport;
  observations: Observation[];
  patientName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <FileText className="h-3 w-3" />
        View Report
      </button>
      {open && (
        <ReportDocument
          report={report}
          observations={observations}
          patientName={patientName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
