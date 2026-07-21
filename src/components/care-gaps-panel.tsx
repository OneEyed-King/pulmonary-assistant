import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import { humanName } from "@/lib/fhir-types";
import type { PatientCareGap } from "@/lib/fhir";
import { formatDate } from "@/lib/utils";

const reasonLabel: Record<string, string> = {
  "post-exacerbation-followup": "Needs follow-up",
  "no-recent-visit": "Overdue",
  "no-visits-recorded": "No visits on file",
};

const reasonTone: Record<string, "red" | "amber" | "gray"> = {
  "post-exacerbation-followup": "red",
  "no-recent-visit": "amber",
  "no-visits-recorded": "gray",
};

export function CareGapsPanel({ gaps }: { gaps: PatientCareGap[] }) {
  // Patient-safety gaps (missed post-exacerbation follow-up) surface above routine overdue ones.
  const rank: Record<string, number> = { "post-exacerbation-followup": 0, "no-recent-visit": 1, "no-visits-recorded": 2 };
  const sorted = [...gaps].sort((a, b) => rank[a.gap.reason] - rank[b.gap.reason]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4 text-primary" />
            Care Gaps
          </CardTitle>
          {sorted.length > 0 && <Badge tone="amber">{sorted.length}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">No outstanding care gaps — everyone&apos;s up to date.</p>
        )}
        {sorted.map(({ patient, gap }) => (
          <Link
            key={patient.id}
            href={`/patients/${patient.id}`}
            className="block rounded-md border border-border p-2.5 transition-colors hover:bg-muted/60"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-gray-900">{humanName(patient.name)}</span>
              <Badge tone={reasonTone[gap.reason]}>{reasonLabel[gap.reason]}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {gap.detail}
              {gap.referenceDate && ` (${formatDate(gap.referenceDate)})`}
            </p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
