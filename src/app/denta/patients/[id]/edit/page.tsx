import { getPatient } from "@/lib/fhir";
import { PatientForm } from "@/components/patient-form";
import { humanName } from "@/lib/fhir-types";
import { SPECIALTIES } from "@/lib/specialty";

const SPECIALTY = SPECIALTIES.denta;

export const dynamic = "force-dynamic";

export default async function EditPatientPage({ params }: { params: { id: string } }) {
  const patient = await getPatient(params.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Edit {humanName(patient.name)}</h1>
      <PatientForm patient={patient} basePath={SPECIALTY.basePath} specialtyTag={SPECIALTY.tag} />
    </div>
  );
}
