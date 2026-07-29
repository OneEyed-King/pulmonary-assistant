import type { Observation, ObservationComponent } from "./fhir-types";

function matchesCode(codeText: string | undefined, codings: { code?: string; display?: string }[] | undefined, codes: string[]): boolean {
  if (codings?.some((c) => c.code && codes.includes(c.code))) return true;
  const lower = codeText?.toLowerCase() ?? "";
  return codes.some((c) => lower.includes(c.toLowerCase()));
}

/** All observations whose .code matches any of the given LOINC codes (falls back to text match). */
export function findByCode(observations: Observation[], codes: string[]): Observation[] {
  return observations.filter((o) => matchesCode(o.code.text, o.code.coding, codes));
}

function effectiveTime(o: Observation): number {
  return o.effectiveDateTime ? new Date(o.effectiveDateTime).getTime() : 0;
}

/** Sorted ascending by effective date/time (oldest first) — convenient for trend charts. */
export function sortByDate(observations: Observation[]): Observation[] {
  return [...observations].sort((a, b) => effectiveTime(a) - effectiveTime(b));
}

export function latest(observations: Observation[], codes: string[]): Observation | undefined {
  const matches = findByCode(observations, codes);
  if (matches.length === 0) return undefined;
  return matches.reduce((a, b) => (effectiveTime(b) > effectiveTime(a) ? b : a));
}

export function componentValue(o: Observation | undefined, codes: string[]): ObservationComponent | undefined {
  if (!o?.component) return undefined;
  return o.component.find((c) => matchesCode(c.code.text, c.code.coding, codes));
}

export function quantityDisplay(q?: { value?: number; unit?: string }): string {
  if (!q || q.value === undefined) return "—";
  return `${q.value}${q.unit ? ` ${q.unit}` : ""}`;
}

// Common LOINC code groups used across the vitals panel + trend charts.
export const LOINC = {
  BP_PANEL: ["85354-9"],
  SYSTOLIC: ["8480-6"],
  DIASTOLIC: ["8462-4"],
  HEART_RATE: ["8867-4"],
  TEMPERATURE: ["8310-5"],
  RESP_RATE: ["9279-1"],
  SPO2: ["59408-5", "2708-6"],
  HEIGHT: ["8302-2"],
  WEIGHT: ["29463-7"],
  BMI: ["39156-5"],
  FEV1: ["20150-9"],
  FVC: ["19870-5"],
  FEV1_FVC: ["19926-5"],
  PEF: ["33452-4"],
  ACT_SCORE: ["82668-5"],
  SMOKING_STATUS: ["72166-2"],
  PACK_YEARS: ["8664-5"],
  WBC: ["6690-2"],
  HGB: ["718-7"],
  HCT: ["4544-3"],
  PLATELETS: ["777-3"],
  EOSINOPHILS: ["711-2"],
  IGE: ["19113-0"],
  CRP: ["1988-5"],
};

// Dental observation "codes" — mostly matched via text fallback since we don't have a fixed
// LOINC panel for periodontal charting the way spirometry has one; findByCode() already falls
// back to substring-matching o.code.text when no coding match is found, so these plain strings
// work against the free-text codes used in the dental fixtures.
export const DENTAL_CODES = {
  PSR_SCORE: ["72152-4"],
  POCKET_DEPTH: ["pocket depth"],
  BLEEDING_ON_PROBING: ["bleeding on probing"],
  PLAQUE_INDEX: ["plaque index"],
  PAIN_SCORE: ["72514-3", "pain severity"],
};
