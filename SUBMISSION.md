# PulmoLens — Submission Description

**AI-assisted pulmonology chart review, built natively on FHIR.**

PulmoLens is a chart-review and visit workflow tool for pulmonology practices, built entirely
on FHIR R4 against a HAPI FHIR + Postgres server. Instead of another EHR viewer, it puts an
AI-generated physician brief, automatic severity-tiered clinical change detection, and a
population-wide Care Gaps panel (catching patients overdue for follow-up or missed after an
ED visit) directly in front of the doctor — before they even open a chart. Starting a visit
stages medications and an AI Note Assist that expands the doctor's own shorthand into a
structured SOAP draft, grounded strictly in what was written so nothing is invented; every
change is reviewed before it's committed to the FHIR record as a single transaction.

**Highlights:** AI Physician Brief · rule-based Clinical Changes detection · Care Gaps panel ·
document-style diagnostic report viewer · AI Note Assist for visit documentation · fully
Dockerized one-command deploy with auto-seeded demo data.

Built with Next.js 14, TypeScript, Tailwind CSS, HAPI FHIR, and OpenAI.
