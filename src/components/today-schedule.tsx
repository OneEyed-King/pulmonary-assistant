import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ArrowRight } from "lucide-react";
import { getAppointmentsForDate, getPatient } from "@/lib/fhir";
import { humanName } from "@/lib/fhir-types";
import type { SpecialtyTag } from "@/lib/specialty";

function patientRef(participants: { actor?: { reference?: string } }[]): string | undefined {
  const p = participants.find((p) => p.actor?.reference?.startsWith("Patient/"));
  return p?.actor?.reference?.split("/").pop();
}

function formatTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export async function TodaySchedule({
  date,
  basePath,
  tag,
}: {
  date: string;
  basePath: string;
  tag?: SpecialtyTag;
}) {
  let appointments: Awaited<ReturnType<typeof getAppointmentsForDate>> = [];
  let error: string | null = null;
  try {
    appointments = await getAppointmentsForDate(date, tag);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const rows = await Promise.all(
    appointments.map(async (a) => {
      const id = patientRef(a.participant);
      if (!id) return null;
      try {
        const patient = await getPatient(id);
        return { appointment: a, patientId: id, name: humanName(patient.name) };
      } catch {
        return null;
      }
    })
  );
  const valid = rows.filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-primary" />
          Today&apos;s Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {error && <p className="text-sm text-muted-foreground">Could not load today&apos;s appointments.</p>}
        {!error && valid.length === 0 && <p className="text-sm text-muted-foreground">No appointments scheduled today.</p>}
        {valid.map(({ appointment, patientId, name }) => (
          <Link
            key={appointment.id}
            href={`${basePath}/patients/${patientId}/visit`}
            className="group flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-muted"
          >
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-xs font-medium text-primary">{formatTime(appointment.start)}</span>
              <div>
                <div className="text-sm font-medium text-gray-900">{name}</div>
                <div className="text-xs text-muted-foreground">
                  {appointment.reasonCode?.[0]?.text ?? appointment.description ?? "Visit"}
                </div>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
