import { PatientForm } from "@/components/patient-form";
import { SPECIALTIES } from "@/lib/specialty";

const SPECIALTY = SPECIALTIES.denta;

export default function NewPatientPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Add Patient</h1>
      <PatientForm basePath={SPECIALTY.basePath} specialtyTag={SPECIALTY.tag} />
    </div>
  );
}
