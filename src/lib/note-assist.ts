export interface NoteAssistContext {
  shorthand: string;
  activeConditions: string[];
  stagedMedications: string[];
}

export function buildNoteAssistPrompt(ctx: NoteAssistContext): string {
  const lines: string[] = [];
  lines.push(`Doctor's shorthand from the visit:\n"""\n${ctx.shorthand.trim()}\n"""`);
  if (ctx.activeConditions.length > 0) {
    lines.push(`Patient's active conditions on file: ${ctx.activeConditions.join(", ")}.`);
  }
  if (ctx.stagedMedications.length > 0) {
    lines.push(`Medications being ordered this visit: ${ctx.stagedMedications.join(", ")}.`);
  }
  return lines.join("\n\n");
}

// Deliberately restrictive: this is an elaboration/formatting layer, not a clinical-judgment
// layer. It must never introduce a finding, value, or decision the doctor didn't provide.
export const NOTE_ASSIST_SYSTEM_PROMPT = `You are a clinical documentation assistant helping a pulmonologist turn their shorthand into a formatted SOAP note. You do not have access to the visit itself and must not invent anything about it.

Strict rules:
1. Only rephrase and organize what is explicitly present in the doctor's shorthand, or in the "active conditions" / "medications being ordered" facts given to you. Never add a symptom, exam finding, vital sign, lab value, or diagnosis that was not stated.
2. If a SOAP section has nothing to draw on from the input, return an empty string for it — do not pad it with generic or invented content.
3. If something is ambiguous (e.g. duration, severity not specified), leave a short bracketed placeholder like "[confirm duration]" rather than guessing.
4. Expand abbreviations and shorthand into clear, professional clinical prose. Keep each section brief (1-4 sentences).
5. The Plan section may naturally reference the medications being ordered this visit if that fact was provided — that's grounding data, not an invention.

Return strict JSON only, in this exact shape:
{"subjective": "...", "objective": "...", "assessment": "...", "plan": "..."}`;
