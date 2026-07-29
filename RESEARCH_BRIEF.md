# App brief — for research use

**What it is:** A multi-specialty, FHIR-native chart-review and visit-documentation web app.
Two branded front-ends — PulmoLens (pulmonology) and DentaLens (dental) — share one codebase,
one FHIR R4 server, and one patient database, segmented by a `Patient.meta.tag` on each record.
A landing page lets the clinician pick which specialty app to open; each behaves as its own
product from there (own patient list, own chart layout, own AI prompts), but adding a third
specialty is mostly config + a new set of chart widgets, not a rewrite.

**Core features (per specialty):**
- Single-screen chart review: demographics, active conditions/medications, allergies, vitals,
  and specialty-relevant trend charts (spirometry for pulmonology; periodontal pocket
  depth/bleeding-on-probing for dental) compared against the last visit.
- An odontogram (32-tooth chart, per-tooth condition history) for the dental side.
- AI-generated pre-visit "physician brief" that reads the FHIR chart and surfaces what changed.
- Rule-based clinical-change detection (flags values crossing real clinical thresholds).
- A panel-wide "Care Gaps" view: patients overdue for routine follow-up, or seen in the ER/urgent
  visit with no follow-up ever booked.
- In-visit workflow: start an encounter, stage medications from a specialty-specific catalog, use
  AI Note Assist to expand shorthand into a SOAP note (strictly non-inventive — it only
  elaborates on what the clinician typed), review everything, then commit as one atomic FHIR
  transaction.

**Tech stack:** Next.js 14 (App Router) + TypeScript frontend, HAPI FHIR + Postgres as the
backend (real FHIR R4 resources — Patient, Encounter, Condition, MedicationRequest, Observation,
DiagnosticReport, Composition, AllergyIntolerance, Appointment — not a mocked data layer), OpenAI
API for the two AI features, same-origin server-side proxy to the FHIR server (no direct
browser-to-FHIR calls). Fully Dockerized, one-command spin-up, idempotent seed data.

**Origin:** Built solo for a FHIR/health-tech hackathon, starting single-specialty
(pulmonology) and generalized into a multi-tenant-by-specialty architecture.

**What I want researched:** the competitive landscape for lightweight, specialty-specific EHR
"chart review" layers that sit on top of (rather than replace) a full EHR — who's building
this, how they price it, whether "one FHIR backend, many specialty skins" is a real wedge or a
crowded/commoditized idea, and what a realistic path to a paying pilot customer (a small
practice) looks like from here.
