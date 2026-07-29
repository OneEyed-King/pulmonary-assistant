import Link from "next/link";
import { getPatient, getEncounters, getConditions, getMedicationRequests } from "@/lib/fhir";
import { humanName } from "@/lib/fhir-types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VisitWorkspace } from "@/components/visit-workspace";
import { SPECIALTIES } from "@/lib/specialty";
import { medicationCatalogFor } from "@/lib/medication-catalog";

const SPECIALTY = SPECIALTIES.denta;

export const dynamic = "force-dynamic";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function DentaVisitPage({ params }: { params: { id: string } }) {
  let patient, encounters, conditions, medications;
  try {
    [patient, encounters, conditions, medications] = await Promise.all([
      getPatient(params.id),
      getEncounters(params.id),
      getConditions(params.id),
      getMedicationRequests(params.id),
    ]);
  } catch (err) {
    return (
      <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load this patient. Make sure the local HAPI/docker-compose stack is running.
        <div className="mt-2 font-mono text-xs opacity-80">
          {err instanceof Error ? err.message : String(err)}
        </div>
      </Card>
    );
  }

  const today = todayISO();
  const todaysEncounter = encounters.find(
    (e) => e.period?.start?.slice(0, 10) === today && e.status === "in-progress"
  );

  const activeConditions = conditions.filter((c) => c.clinicalStatus?.coding?.[0]?.code === "active");
  const activeMedications = medications.filter((m) => m.status === "active");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`${SPECIALTY.basePath}/patients/${params.id}`}>
          <Button variant="ghost" size="sm">
            ← Back to chart
          </Button>
        </Link>
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Visit in Progress</span>
      </div>

      <VisitWorkspace
        patientId={params.id}
        patientName={humanName(patient.name)}
        basePath={SPECIALTY.basePath}
        specialtyKey={SPECIALTY.key}
        practitionerRef={SPECIALTY.practitionerRef}
        practitionerDisplay={SPECIALTY.practitionerDisplay}
        organizationRef={SPECIALTY.organizationRef}
        medicationCatalog={medicationCatalogFor(SPECIALTY.key)}
        notePlaceholder={SPECIALTY.noteAssistPlaceholder}
        encounter={todaysEncounter ?? null}
        activeConditions={activeConditions.map((c) => c.code?.text ?? c.code?.coding?.[0]?.display ?? "Condition")}
        activeMedications={activeMedications.map(
          (m) => m.medicationCodeableConcept?.text ?? m.medicationCodeableConcept?.coding?.[0]?.display ?? "Medication"
        )}
      />
    </div>
  );
}
