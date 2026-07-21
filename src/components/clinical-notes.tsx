import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import type { Composition, DiagnosticReport, Observation } from "@/lib/fhir-types";
import { formatDateTime } from "@/lib/utils";
import { ReportViewerButton } from "@/components/report-viewer";

interface NoteItem {
  date: string;
  kind: "note" | "report";
  title: string;
  body: React.ReactNode;
  report?: DiagnosticReport;
}

export function ClinicalNotes({
  compositions,
  diagnosticReports,
  observations,
  patientName,
}: {
  compositions: Composition[];
  diagnosticReports: DiagnosticReport[];
  observations: Observation[];
  patientName: string;
}) {
  const noteItems: NoteItem[] = compositions.map((c) => ({
    date: c.date ?? "",
    kind: "note",
    title: c.title ?? "Progress note",
    body: (
      <div className="space-y-2">
        {c.section?.map((s, i) => (
          <div key={i}>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{s.title}</div>
            <div
              className="mt-0.5 text-sm text-gray-700"
              dangerouslySetInnerHTML={{ __html: stripDivWrapper(s.text.div) }}
            />
          </div>
        ))}
      </div>
    ),
  }));

  const reportItems: NoteItem[] = diagnosticReports.map((r) => ({
    date: r.effectiveDateTime ?? r.issued ?? "",
    kind: "report",
    title: r.code.text ?? r.code.coding?.[0]?.display ?? "Diagnostic Report",
    body: <p className="text-sm text-gray-700">{r.conclusion ?? "No conclusion recorded."}</p>,
    report: r,
  }));

  const items = [...noteItems, ...reportItems].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes &amp; Diagnostic Reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {items.length === 0 && <p className="text-sm text-gray-500">No notes or reports recorded.</p>}
        {items.map((item, idx) => (
          <details key={idx} className="group rounded-md border border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-muted/60 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-center gap-2">
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                <span className="truncate">{item.title}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs font-normal text-gray-400">
                {formatDateTime(item.date)}
                <Badge tone={item.kind === "note" ? "blue" : "gray"}>
                  {item.kind === "note" ? "SOAP note" : "Report"}
                </Badge>
              </span>
            </summary>
            <div className="space-y-2 border-t border-border px-3 py-2">
              {item.body}
              {item.report && (
                <ReportViewerButton report={item.report} observations={observations} patientName={patientName} />
              )}
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}

// Narrative divs come as `<div xmlns='...'>...inner html...</div>` — strip the wrapper
// since we render our own container and just want the inner markup.
function stripDivWrapper(div: string): string {
  return div.replace(/^<div[^>]*>/, "").replace(/<\/div>$/, "");
}
