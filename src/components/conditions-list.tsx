import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Condition } from "@/lib/fhir-types";
import { formatDate } from "@/lib/utils";

function isActive(c: Condition): boolean {
  const status = c.clinicalStatus?.coding?.[0]?.code;
  return status === "active";
}

export function ConditionsList({ conditions }: { conditions: Condition[] }) {
  const active = conditions.filter(isActive);
  const other = conditions.filter((c) => !isActive(c));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conditions &amp; Diagnoses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {conditions.length === 0 && <p className="text-sm text-gray-500">No conditions recorded.</p>}
        {[...active, ...other].map((c) => {
          const code = c.code?.text ?? c.code?.coding?.[0]?.display ?? "Unknown condition";
          const status = c.clinicalStatus?.coding?.[0]?.code ?? "unknown";
          const toothCode = c.bodySite?.[0]?.coding?.[0]?.code;
          return (
            <div key={code + c.recordedDate} className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                  {toothCode && <Badge tone="blue">Tooth #{toothCode}</Badge>}
                  {code}
                </div>
                {c.note?.[0]?.text && <div className="mt-0.5 text-xs text-gray-500">{c.note[0].text}</div>}
                <div className="mt-0.5 text-xs text-gray-400">
                  Onset {formatDate(c.onsetDateTime)}
                  {c.abatementDateTime ? ` · Resolved ${formatDate(c.abatementDateTime)}` : ""}
                </div>
              </div>
              <Badge tone={status === "active" ? "amber" : "green"}>{status}</Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
