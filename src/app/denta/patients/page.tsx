import Link from "next/link";
import { getPatients, getCareGaps } from "@/lib/fhir";
import { humanName } from "@/lib/fhir-types";
import { formatDate, calculateAge, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TodaySchedule } from "@/components/today-schedule";
import { CareGapsPanel } from "@/components/care-gaps-panel";
import { Plus, Search, ChevronRight } from "lucide-react";
import { SPECIALTIES } from "@/lib/specialty";

const SPECIALTY = SPECIALTIES.denta;

export const dynamic = "force-dynamic";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function DentaPatientsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim();
  let patients: Awaited<ReturnType<typeof getPatients>> = [];
  let error: string | null = null;
  let careGaps: Awaited<ReturnType<typeof getCareGaps>> = [];

  try {
    patients = await getPatients(q, SPECIALTY.tag);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  if (!error) {
    try {
      careGaps = await getCareGaps(SPECIALTY.tag);
    } catch {
      careGaps = [];
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">DentaLens</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-gray-900">
              {greeting()}, Doctor
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {patients.length} patient{patients.length === 1 ? "" : "s"} on the FHIR server
              {q && (
                <>
                  {" "}
                  matching &ldquo;{q}&rdquo;
                </>
              )}
            </p>
          </div>
          <Link href={`${SPECIALTY.basePath}/patients/new`}>
            <Button>
              <Plus className="h-4 w-4" />
              Add Patient
            </Button>
          </Link>
        </div>

        <form className="flex max-w-lg gap-2" action={`${SPECIALTY.basePath}/patients`}>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search by patient name…"
              className="rounded-full pl-9"
            />
          </div>
          <Button type="submit" variant="outline" className="rounded-full">
            Search
          </Button>
          {q && (
            <Link href={`${SPECIALTY.basePath}/patients`}>
              <Button type="button" variant="ghost" className="rounded-full">
                Clear
              </Button>
            </Link>
          )}
        </form>

        {error && (
          <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load patients from the FHIR server. Make sure the local HAPI/docker-compose
            stack is running.
            <div className="mt-2 font-mono text-xs opacity-80">{error}</div>
          </Card>
        )}

        {!error && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {q ? "Search results" : "All patients"}
            </p>
            {patients.length === 0 && (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                No dental patients yet — add one to get started.
              </Card>
            )}
            {patients.map((p) => {
              const name = humanName(p.name);
              const age = calculateAge(p.birthDate);
              return (
                <Card key={p.id} className="group flex items-center gap-4 p-4 transition-shadow hover:shadow-md">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-display text-sm font-medium text-emerald-600">
                    {initials(name)}
                  </div>
                  <Link href={`${SPECIALTY.basePath}/patients/${p.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-display text-base font-medium text-gray-900">{name}</span>
                      <Badge tone={p.gender === "female" ? "blue" : p.gender === "male" ? "default" : "gray"}>
                        {p.gender ?? "unknown"}
                      </Badge>
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {age !== null ? `${age}y · ` : ""}
                      DOB {formatDate(p.birthDate)}
                    </div>
                  </Link>
                  <Link
                    href={`${SPECIALTY.basePath}/patients/${p.id}/edit`}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <Link href={`${SPECIALTY.basePath}/patients/${p.id}`}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4">
        <TodaySchedule date={todayISO()} basePath={SPECIALTY.basePath} tag={SPECIALTY.tag} />
        <CareGapsPanel gaps={careGaps} basePath={SPECIALTY.basePath} />
      </aside>
    </div>
  );
}
