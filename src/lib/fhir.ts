import "server-only";
import type {
  Bundle,
  Patient,
  Encounter,
  Condition,
  MedicationRequest,
  Observation,
  DiagnosticReport,
  Composition,
  AllergyIntolerance,
  Appointment,
} from "./fhir-types";
import { computeCareGap, type CareGap } from "./care-gaps";
import { tagSearchValue, type SpecialtyTag } from "./specialty";

const FHIR_BASE_URL = process.env.FHIR_BASE_URL ?? "http://localhost:8080/fhir";

/**
 * Server-side fetch helper — talks directly to the local HAPI FHIR server.
 * Only usable from Server Components / Route Handlers (never bundled to the client
 * because of the "server-only" import above).
 */
async function fhirFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${FHIR_BASE_URL}/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/fhir+json",
      Accept: "application/fhir+json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FHIR request failed: ${res.status} ${res.statusText} — ${path}\n${body}`);
  }

  return res.json() as Promise<T>;
}

function bundleResources<T>(bundle: Bundle<T> | undefined): T[] {
  return bundle?.entry?.map((e) => e.resource) ?? [];
}

// ---------- Patients ----------

/** `tag` scopes results to one specialty app (via Patient.meta.tag) — both PulmoLens and
 * DentaLens patients live on the same FHIR server, so every list query must pass its app's tag
 * or it'll see the other specialty's patients too. */
export async function getPatients(nameQuery?: string, tag?: SpecialtyTag): Promise<Patient[]> {
  const params = new URLSearchParams();
  if (nameQuery) params.set("name", nameQuery);
  if (tag) params.set("_tag", tagSearchValue(tag));
  params.set("_count", "100");
  const bundle = await fhirFetch<Bundle<Patient>>(`Patient?${params.toString()}`);
  return bundleResources(bundle);
}

export async function getPatient(id: string): Promise<Patient> {
  return fhirFetch<Patient>(`Patient/${id}`);
}

// ---------- Chart data (Week 2 + chart review extras) ----------

export async function getEncounters(patientId: string): Promise<Encounter[]> {
  const bundle = await fhirFetch<Bundle<Encounter>>(
    `Encounter?patient=${patientId}&_count=100&_sort=-date`
  );
  return bundleResources(bundle);
}

export async function getEncounter(id: string): Promise<Encounter> {
  return fhirFetch<Encounter>(`Encounter/${id}`);
}

/** Appointments whose start falls on the given calendar date (YYYY-MM-DD), sorted by time.
 * `tag` scopes to one specialty app, same as `getPatients` — Appointments are tagged the same
 * way Patients are, so PulmoLens's schedule never shows a DentaLens appointment or vice versa. */
export async function getAppointmentsForDate(date: string, tag?: SpecialtyTag): Promise<Appointment[]> {
  const params = new URLSearchParams({ date, _count: "100", _sort: "date" });
  if (tag) params.set("_tag", tagSearchValue(tag));
  const bundle = await fhirFetch<Bundle<Appointment>>(`Appointment?${params.toString()}`);
  return bundleResources(bundle);
}

export async function getConditions(patientId: string): Promise<Condition[]> {
  const bundle = await fhirFetch<Bundle<Condition>>(`Condition?patient=${patientId}&_count=100`);
  return bundleResources(bundle);
}

export async function getMedicationRequests(patientId: string): Promise<MedicationRequest[]> {
  const bundle = await fhirFetch<Bundle<MedicationRequest>>(
    `MedicationRequest?patient=${patientId}&_count=100`
  );
  return bundleResources(bundle);
}

export async function getObservations(patientId: string): Promise<Observation[]> {
  const bundle = await fhirFetch<Bundle<Observation>>(
    `Observation?patient=${patientId}&_count=200&_sort=-date`
  );
  return bundleResources(bundle);
}

export async function getDiagnosticReports(patientId: string): Promise<DiagnosticReport[]> {
  const bundle = await fhirFetch<Bundle<DiagnosticReport>>(
    `DiagnosticReport?patient=${patientId}&_count=100&_sort=-date`
  );
  return bundleResources(bundle);
}

export async function getCompositions(patientId: string): Promise<Composition[]> {
  const bundle = await fhirFetch<Bundle<Composition>>(
    `Composition?subject=${patientId}&_count=100&_sort=-date`
  );
  return bundleResources(bundle);
}

export async function getAllergies(patientId: string): Promise<AllergyIntolerance[]> {
  const bundle = await fhirFetch<Bundle<AllergyIntolerance>>(
    `AllergyIntolerance?patient=${patientId}&_count=100`
  );
  return bundleResources(bundle);
}

export interface PatientCareGap {
  patient: Patient;
  gap: CareGap;
}

/** Scans every patient's encounter history for outstanding care gaps (overdue routine
 * follow-up, or no follow-up recorded after an emergency/inpatient visit). Fine to do as
 * an N+1 fetch loop at this panel size — revisit if the patient list grows large. */
export async function getCareGaps(tag?: SpecialtyTag): Promise<PatientCareGap[]> {
  const patients = await getPatients(undefined, tag);
  const results = await Promise.all(
    patients.map(async (p) => {
      if (!p.id) return null;
      const encounters = await getEncounters(p.id);
      const gap = computeCareGap(encounters);
      return gap ? { patient: p, gap } : null;
    })
  );
  return results.filter((r): r is PatientCareGap => r !== null);
}

/** Fetches everything needed to render the chart-review dashboard in parallel. */
export async function getPatientChart(patientId: string) {
  const [patient, encounters, conditions, medications, observations, diagnosticReports, compositions, allergies] =
    await Promise.all([
      getPatient(patientId),
      getEncounters(patientId),
      getConditions(patientId),
      getMedicationRequests(patientId),
      getObservations(patientId),
      getDiagnosticReports(patientId),
      getCompositions(patientId),
      getAllergies(patientId),
    ]);

  return {
    patient,
    encounters,
    conditions,
    medications,
    observations,
    diagnosticReports,
    compositions,
    allergies,
  };
}
