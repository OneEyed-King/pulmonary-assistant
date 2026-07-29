// Minimal, pragmatic FHIR R4 type definitions — just what this app touches.
// Not exhaustive; extra fields from the server are simply ignored by TS structural typing.

export interface Coding {
  system?: string;
  code?: string;
  display?: string;
}

export interface CodeableConcept {
  coding?: Coding[];
  text?: string;
}

export interface Reference {
  reference?: string;
  display?: string;
  type?: string;
}

export interface Identifier {
  system?: string;
  value?: string;
}

export interface HumanName {
  use?: string;
  text?: string;
  family?: string;
  given?: string[];
}

export interface Address {
  use?: string;
  line?: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface ContactPoint {
  system?: string;
  value?: string;
  use?: string;
}

export interface Quantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface Period {
  start?: string;
  end?: string;
}

export interface Narrative {
  status?: string;
  div: string;
}

export type Gender = "male" | "female" | "other" | "unknown";

export interface ResourceMeta {
  profile?: string[];
  tag?: { system?: string; code?: string; display?: string }[];
}

export interface Patient {
  resourceType: "Patient";
  id?: string;
  meta?: ResourceMeta;
  identifier?: Identifier[];
  name?: HumanName[];
  gender?: Gender;
  birthDate?: string;
  address?: Address[];
  telecom?: ContactPoint[];
  active?: boolean;
}

export interface Encounter {
  resourceType: "Encounter";
  id?: string;
  status?: string;
  class?: Coding;
  type?: CodeableConcept[];
  subject?: Reference;
  participant?: { individual?: Reference }[];
  serviceProvider?: Reference;
  period?: Period;
}

export interface Condition {
  resourceType: "Condition";
  id?: string;
  clinicalStatus?: CodeableConcept;
  verificationStatus?: CodeableConcept;
  category?: CodeableConcept[];
  code?: CodeableConcept;
  subject?: Reference;
  encounter?: Reference;
  onsetDateTime?: string;
  abatementDateTime?: string;
  recordedDate?: string;
  note?: { text: string }[];
  /** Which tooth (or other body site) a condition applies to — used by DentaLens's odontogram.
   * Not every condition is tooth-specific (e.g. generalized periodontitis), so this is optional. */
  bodySite?: CodeableConcept[];
}

export interface Dosage {
  text?: string;
}

export interface MedicationRequest {
  resourceType: "MedicationRequest";
  id?: string;
  status?: string;
  intent?: string;
  medicationCodeableConcept?: CodeableConcept;
  subject?: Reference;
  encounter?: Reference;
  authoredOn?: string;
  requester?: Reference;
  reasonReference?: Reference[];
  dosageInstruction?: Dosage[];
  note?: { text: string }[];
}

export interface ObservationComponent {
  code: CodeableConcept;
  valueQuantity?: Quantity;
  valueCodeableConcept?: CodeableConcept;
}

export interface Observation {
  resourceType: "Observation";
  id?: string;
  status?: string;
  category?: CodeableConcept[];
  code: CodeableConcept;
  subject?: Reference;
  encounter?: Reference;
  effectiveDateTime?: string;
  valueQuantity?: Quantity;
  valueCodeableConcept?: CodeableConcept;
  component?: ObservationComponent[];
  interpretation?: CodeableConcept[];
}

export interface DiagnosticReport {
  resourceType: "DiagnosticReport";
  id?: string;
  status?: string;
  category?: CodeableConcept[];
  code: CodeableConcept;
  subject?: Reference;
  encounter?: Reference;
  effectiveDateTime?: string;
  issued?: string;
  performer?: Reference[];
  result?: Reference[];
  conclusion?: string;
}

export interface CompositionSection {
  title?: string;
  text: Narrative;
}

export interface Composition {
  resourceType: "Composition";
  id?: string;
  status?: string;
  type?: CodeableConcept;
  subject?: Reference;
  encounter?: Reference;
  date?: string;
  author?: Reference[];
  title?: string;
  section?: CompositionSection[];
}

export interface AllergyReaction {
  manifestation?: CodeableConcept[];
  severity?: string;
}

export interface AllergyIntolerance {
  resourceType: "AllergyIntolerance";
  id?: string;
  clinicalStatus?: CodeableConcept;
  verificationStatus?: CodeableConcept;
  category?: string[];
  criticality?: string;
  code?: CodeableConcept;
  patient?: Reference;
  recordedDate?: string;
  reaction?: AllergyReaction[];
}

export interface AppointmentParticipant {
  actor?: Reference;
  status?: string;
}

export interface Appointment {
  resourceType: "Appointment";
  id?: string;
  status: string;
  serviceType?: CodeableConcept[];
  reasonCode?: CodeableConcept[];
  description?: string;
  start?: string;
  end?: string;
  participant: AppointmentParticipant[];
}

export interface Practitioner {
  resourceType: "Practitioner";
  id?: string;
  name?: HumanName[];
}

export interface Organization {
  resourceType: "Organization";
  id?: string;
  name?: string;
}

export type AnyResource =
  | Patient
  | Encounter
  | Condition
  | MedicationRequest
  | Observation
  | DiagnosticReport
  | Composition
  | AllergyIntolerance
  | Practitioner
  | Organization
  | Appointment;

export interface BundleEntry<T = AnyResource> {
  fullUrl?: string;
  resource: T;
  search?: { mode?: string };
}

export interface Bundle<T = AnyResource> {
  resourceType: "Bundle";
  type: string;
  total?: number;
  entry?: BundleEntry<T>[];
  link?: { relation: string; url: string }[];
}

export function humanName(names?: HumanName[]): string {
  if (!names || names.length === 0) return "Unknown";
  const n = names.find((x) => x.use === "official") ?? names[0];
  if (n.text) return n.text;
  const given = n.given?.join(" ") ?? "";
  return [given, n.family].filter(Boolean).join(" ") || "Unknown";
}
