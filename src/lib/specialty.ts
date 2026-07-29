// Central config for the two specialty apps sharing one FHIR server. Patients are segmented
// with a `meta.tag` on the Patient resource (not a clinical field — meta.tag is FHIR's built-in
// mechanism for non-clinical, cross-cutting categorization) so each app's queries only ever see
// its own patients.

import type { Patient } from "./fhir-types";

export type SpecialtyKey = "pulmo" | "denta";

export interface SpecialtyTag {
  system: string;
  code: string;
}

export interface SpecialtyConfig {
  key: SpecialtyKey;
  basePath: string;
  appName: string;
  tag: SpecialtyTag;
  /** What to call the clinician in AI-generated prose (e.g. "pulmonologist", "dentist"). */
  clinicianLabel: string;
  practitionerRef: string;
  practitionerDisplay: string;
  organizationRef: string;
  /** Placeholder text shown in the AI Note Assist shorthand box during a visit. */
  noteAssistPlaceholder: string;
}

const TAG_SYSTEM = "https://pulmolens.app/fhir/specialty";

export const SPECIALTIES: Record<SpecialtyKey, SpecialtyConfig> = {
  pulmo: {
    key: "pulmo",
    basePath: "/pulmo",
    appName: "PulmoLens",
    tag: { system: TAG_SYSTEM, code: "pulmonology" },
    clinicianLabel: "pulmonologist",
    practitionerRef: "Practitioner/1011",
    practitionerDisplay: "Dr. Linh Nguyen",
    organizationRef: "Organization/1010",
    noteAssistPlaceholder:
      "e.g. wheezing better, adherence spotty pt admits missing doses, lungs clear, step up therapy, f/u 6wk",
  },
  denta: {
    key: "denta",
    basePath: "/denta",
    appName: "DentaLens",
    tag: { system: TAG_SYSTEM, code: "dental" },
    clinicianLabel: "dentist",
    practitionerRef: "Practitioner/2011",
    practitionerDisplay: "Dr. Naomi Ortiz",
    organizationRef: "Organization/2010",
    noteAssistPlaceholder:
      "e.g. #19 occlusal caries, dentin only, composite placed, pt tolerated well, mild post-op sensitivity expected, recall 6mo",
  },
};

/** `_tag` search-parameter value HAPI (and FHIR search in general) expects: "system|code". */
export function tagSearchValue(tag: SpecialtyTag): string {
  return `${tag.system}|${tag.code}`;
}

/** Determines which specialty app a patient belongs to from their `meta.tag`. Used server-side
 * (e.g. the AI summarize route) where we only have a patientId and need to pick the right
 * prompt/config without the caller having to tell us which app it's in. Falls back to
 * pulmonology if the tag is missing or unrecognized, since that was the original app. */
export function specialtyFromPatient(patient: Patient): SpecialtyConfig {
  const tags = patient.meta?.tag ?? [];
  for (const config of Object.values(SPECIALTIES)) {
    if (tags.some((t) => t.system === config.tag.system && t.code === config.tag.code)) {
      return config;
    }
  }
  return SPECIALTIES.pulmo;
}

export function specialtyByKey(key: SpecialtyKey): SpecialtyConfig {
  return SPECIALTIES[key];
}
