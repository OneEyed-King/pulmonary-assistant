import type { Encounter } from "./fhir-types";

export type CareGapReason = "no-recent-visit" | "post-exacerbation-followup" | "no-visits-recorded";

export interface CareGap {
  reason: CareGapReason;
  referenceDate?: string;
  daysSince?: number;
  detail: string;
}

// Tunable thresholds — a routine asthma/COPD maintenance patient is generally expected back
// within ~4 months; a patient seen in the ED/inpatient for an exacerbation should have a
// follow-up within 30 days regardless of how the routine interval looks.
const ROUTINE_FOLLOWUP_DAYS = 120;
const POST_EXACERBATION_FOLLOWUP_DAYS = 30;
// Small grace period so an exacerbation from the last few days isn't instantly flagged
// before there's been a realistic chance to schedule the follow-up.
const EXACERBATION_GRACE_DAYS = 3;

function daysBetween(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
}

/** Computes the single most pressing care gap for a patient from their encounter history,
 * or null if nothing is currently outstanding. Pure function — no fetching, easy to test. */
export function computeCareGap(encounters: Encounter[], now: Date = new Date()): CareGap | null {
  const dated = encounters
    .filter((e): e is Encounter & { period: { start: string } } => !!e.period?.start)
    .sort((a, b) => new Date(b.period.start).getTime() - new Date(a.period.start).getTime());

  if (dated.length === 0) {
    return { reason: "no-visits-recorded", detail: "No encounters on record for this patient." };
  }

  // Patient-safety check first: any emergency/inpatient encounter without a subsequent
  // visit within the expected follow-up window, regardless of the routine interval.
  for (const emer of dated.filter((e) => e.class?.code === "EMER")) {
    const emerDate = new Date(emer.period.start);
    if (daysBetween(now, emerDate) <= EXACERBATION_GRACE_DAYS) continue;

    const hasFollowUp = dated.some((e) => {
      if (e === emer) return false;
      const d = new Date(e.period.start);
      return d.getTime() > emerDate.getTime() && daysBetween(d, emerDate) <= POST_EXACERBATION_FOLLOWUP_DAYS;
    });

    if (!hasFollowUp) {
      return {
        reason: "post-exacerbation-followup",
        referenceDate: emer.period.start,
        daysSince: daysBetween(now, emerDate),
        detail: "No follow-up recorded within 30 days of an emergency/inpatient visit.",
      };
    }
  }

  const last = dated[0];
  const daysSince = daysBetween(now, new Date(last.period.start));
  if (daysSince > ROUTINE_FOLLOWUP_DAYS) {
    return {
      reason: "no-recent-visit",
      referenceDate: last.period.start,
      daysSince,
      detail: `Last seen ${daysSince} days ago — overdue for routine follow-up.`,
    };
  }

  return null;
}
