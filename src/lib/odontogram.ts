// Odontogram support: maps Condition.bodySite tooth codes (Universal Numbering System,
// 1-32 for permanent adult dentition) onto a per-tooth status for the DentaLens chart view.
// There's no single universal FHIR code system every EHR agrees on for "which tooth" — US
// dental content commonly uses SNOMED tooth codes or local/EHR-specific systems. For this app
// we use our own system URI (consistent with how we already tag specialty via meta.tag) since
// we control both the data and the renderer.

import type { Condition } from "./fhir-types";

export const TOOTH_SYSTEM = "https://pulmolens.app/fhir/tooth";

export type Arch = "upper" | "lower";
export type Side = "right" | "left";

export interface ToothInfo {
  number: number;
  arch: Arch;
  side: Side;
  name: string;
}

const UPPER_NAMES = [
  "3rd Molar", "2nd Molar", "1st Molar", "2nd Premolar", "1st Premolar",
  "Canine", "Lateral Incisor", "Central Incisor",
];
const LOWER_NAMES = [...UPPER_NAMES].reverse();

function buildTeeth(): ToothInfo[] {
  const teeth: ToothInfo[] = [];
  // 1-8: upper right (3rd molar -> central incisor), 9-16: upper left (central incisor -> 3rd molar)
  for (let i = 0; i < 8; i++) teeth.push({ number: i + 1, arch: "upper", side: "right", name: UPPER_NAMES[i] });
  for (let i = 0; i < 8; i++) teeth.push({ number: i + 9, arch: "upper", side: "left", name: [...UPPER_NAMES].reverse()[i] });
  // 17-24: lower left (3rd molar -> central incisor), 25-32: lower right (central incisor -> 3rd molar)
  for (let i = 0; i < 8; i++) teeth.push({ number: i + 17, arch: "lower", side: "left", name: UPPER_NAMES[i] });
  for (let i = 0; i < 8; i++) teeth.push({ number: i + 25, arch: "lower", side: "right", name: LOWER_NAMES[i] });
  return teeth;
}

export const TEETH: ToothInfo[] = buildTeeth();

export function toothInfo(n: number): ToothInfo | undefined {
  return TEETH.find((t) => t.number === n);
}

export function toothLabel(n: number): string {
  const t = toothInfo(n);
  if (!t) return `Tooth #${n}`;
  return `#${n} — ${t.arch === "upper" ? "Upper" : "Lower"} ${t.side === "right" ? "Right" : "Left"} ${t.name}`;
}

// Row order for rendering: upper arch left-to-right is teeth 1..16; lower arch is drawn
// 32..17 so each column lines up with the same side as the tooth above it (standard chart convention).
export const UPPER_ROW: number[] = Array.from({ length: 16 }, (_, i) => i + 1);
export const LOWER_ROW: number[] = Array.from({ length: 16 }, (_, i) => 32 - i);

export type ToothStatus = "healthy" | "watch" | "caries" | "filled" | "crown" | "trauma" | "missing";

export const STATUS_STYLE: Record<ToothStatus, { fill: string; stroke: string; label: string }> = {
  healthy: { fill: "#ffffff", stroke: "#d1d5db", label: "Healthy" },
  watch: { fill: "#fef3c7", stroke: "#d97706", label: "Watch / early finding" },
  caries: { fill: "#fecaca", stroke: "#dc2626", label: "Active caries" },
  filled: { fill: "#bfdbfe", stroke: "#2563eb", label: "Filled / restored" },
  crown: { fill: "#ddd6fe", stroke: "#7c3aed", label: "Crown" },
  trauma: { fill: "#fed7aa", stroke: "#ea580c", label: "Trauma / injury" },
  missing: { fill: "#e5e7eb", stroke: "#9ca3af", label: "Missing / extracted" },
};

function isActive(c: Condition): boolean {
  return c.clinicalStatus?.coding?.[0]?.code === "active";
}

/** Best-effort classification from the condition's code text/display + active vs resolved —
 * intentionally keyword-based rather than requiring a fixed SNOMED code list, since dental
 * condition coding in the wild is inconsistent. */
function classify(c: Condition): ToothStatus {
  const text = (c.code?.text ?? c.code?.coding?.[0]?.display ?? "").toLowerCase();
  const active = isActive(c);

  if (text.includes("avuls") || text.includes("fracture") || text.includes("trauma")) return "trauma";
  if (text.includes("missing") || text.includes("extract")) return "missing";
  if (text.includes("crown")) return "crown";
  if (text.includes("caries")) return active ? "caries" : "filled";
  if (text.includes("watch") || text.includes("early") || text.includes("incipient")) return "watch";
  return active ? "watch" : "filled";
}

export interface ToothFinding {
  tooth: number;
  status: ToothStatus;
  conditionText: string;
  detail?: string;
  date?: string;
}

/** Groups tooth-specific conditions (those with a bodySite tooth code) by tooth number, keeping
 * every finding per tooth (a tooth can have history — e.g. trauma then later a crown) but exposing
 * the most recent as the tooth's current display status. */
export function buildToothFindings(conditions: Condition[]): Map<number, ToothFinding[]> {
  const byTooth = new Map<number, ToothFinding[]>();

  for (const c of conditions) {
    const codings = c.bodySite?.flatMap((bs) => bs.coding ?? []) ?? [];
    const toothCoding = codings.find((coding) => coding.system === TOOTH_SYSTEM);
    if (!toothCoding?.code) continue;
    const tooth = parseInt(toothCoding.code, 10);
    if (Number.isNaN(tooth)) continue;

    const finding: ToothFinding = {
      tooth,
      status: classify(c),
      conditionText: c.code?.text ?? c.code?.coding?.[0]?.display ?? "Finding",
      detail: c.note?.[0]?.text,
      date: c.recordedDate ?? c.onsetDateTime,
    };

    const list = byTooth.get(tooth) ?? [];
    list.push(finding);
    byTooth.set(tooth, list);
  }

  for (const list of byTooth.values()) {
    list.sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
  }

  return byTooth;
}

/** The single most-recent finding for a tooth, or "healthy" if nothing is on file. */
export function currentStatus(findings: ToothFinding[] | undefined): ToothStatus {
  return findings?.[0]?.status ?? "healthy";
}
