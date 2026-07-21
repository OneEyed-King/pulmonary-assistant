import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { DiagnosticReport, Observation } from "@/lib/fhir-types";
import { formatDate } from "@/lib/utils";
import { ReportViewerButton } from "@/components/report-viewer";

const statusTone: Record<string, "green" | "gray" | "amber"> = {
  final: "green",
  preliminary: "amber",
  amended: "amber",
  cancelled: "gray",
};

export function LabReportsTable({
  diagnosticReports,
  observations,
  patientName,
}: {
  diagnosticReports: DiagnosticReport[];
  observations: Observation[];
  patientName: string;
}) {
  const sorted = [...diagnosticReports].sort(
    (a, b) => new Date(b.effectiveDateTime ?? b.issued ?? 0).getTime() - new Date(a.effectiveDateTime ?? a.issued ?? 0).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-primary" />
          Lab &amp; Diagnostic Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No diagnostic reports recorded.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Report</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2 font-mono">Date</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((r, i) => {
                const title = r.code.text ?? r.code.coding?.[0]?.display ?? "Diagnostic Report";
                const category = r.category?.[0]?.coding?.[0]?.display ?? r.category?.[0]?.coding?.[0]?.code;
                return (
                  <tr key={r.id ?? title + i}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{title}</td>
                    <td className="px-4 py-2.5 text-gray-600">{category ?? "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                      {formatDate(r.effectiveDateTime ?? r.issued)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={statusTone[r.status ?? ""] ?? "gray"} className="capitalize">
                        {r.status ?? "unknown"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <ReportViewerButton report={r} observations={observations} patientName={patientName} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
