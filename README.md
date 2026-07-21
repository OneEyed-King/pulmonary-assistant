# PulmoLens

**AI-assisted pulmonology chart review, built natively on FHIR.**

PulmoLens turns a standards-based FHIR patient record into a single-screen view of what
actually needs a physician's attention — not another tab-hopping EHR clone. Open a chart and
an AI-generated brief is already waiting for you; vitals and labs are automatically compared
against the last visit and flagged by severity; and a population-wide **Care Gaps** panel
surfaces patients who are overdue for follow-up or who fell through the cracks after an ED
visit, before you even click into their chart.

It's built around pulmonology (asthma, COPD, severe allergic asthma) but the architecture —
FHIR R4 underneath, a same-origin proxy, AI layered on top as an assistant rather than a
replacement for clinical judgment — generalizes to any specialty.

## Why this exists

Two of the most-cited physician pain points today are documentation burden and patients
silently falling out of follow-up. PulmoLens leans into both: an AI Note Assist that expands a
doctor's own shorthand into a structured SOAP draft (never inventing a finding that wasn't
written), and a Care Gaps panel that does the population-level bookkeeping no single-patient
chart view can do. Every AI-assisted or auto-generated piece of the workflow is staged for
review before anything writes to the FHIR server — nothing saves silently.

## Features

- **Today's Schedule homepage** — the day's appointments at a glance, one click into each
  patient's chart.
- **Care Gaps panel** — scans every patient's encounter history for two things: routine
  follow-up that's gone quiet (120+ days since last visit), and the more urgent case of an
  ED/inpatient visit with no follow-up booked within 30 days. Pure rule-based encounter-date
  math, no AI required.
- **AI Physician Brief** — generated automatically the moment a chart opens: a plain-language
  read of what matters right now, not a wall of raw FHIR data.
- **Clinical Changes, flagged automatically** — vitals and labs compared against the patient's
  prior visit and tiered by severity (stable / attention / significant), accounting for both
  rate of change and absolute clinical thresholds.
- **Lab & PFT trend comparison** — current results sit next to previous ones so improvement or
  decline is visible immediately, plus a document-style report viewer for any individual
  DiagnosticReport (print-ready, laid out the way an actual lab report reads).
- **The full chart, one view** — demographics, active conditions, active medications, allergies,
  and structured visit history together, no tab-hopping.
- **Visit Workspace** — opening a patient starts the visit: stage medications (curated RxNorm
  quick-picks or free text), and an **AI Note Assist** that expands your own shorthand into a
  draft SOAP note — grounded strictly in what you wrote plus the visit's actual conditions/
  medications, with bracketed placeholders instead of guesses for anything ambiguous.
  Everything is staged and shown for review before a single FHIR write happens.
- **Standard FHIR underneath** — every feature reads and writes real FHIR R4 resources
  (Patient, Encounter, Condition, MedicationRequest, Observation, DiagnosticReport, Composition,
  AllergyIntolerance, Appointment) against a HAPI FHIR + Postgres server. Nothing is mocked.

## Architecture

- **Next.js App Router**, single container — no separate backend service.
- **Route Handlers as a FHIR proxy** (`src/app/api/fhir/[[...path]]/route.ts`): the browser only
  ever calls same-origin `/api/fhir/*`, which forwards to the FHIR server. Avoids CORS entirely
  and keeps `FHIR_BASE_URL` server-side only.
- **Server Components fetch FHIR data directly** (`src/lib/fhir.ts`, server-only) for all read
  paths — no extra network hop.
- **Client Components** (patient forms, the Visit Workspace) write through the `/api/fhir/*`
  proxy, staging changes in local state and committing everything as one atomic FHIR transaction
  Bundle on save.
- **AI features are additive, not load-bearing**: the Physician Brief (`src/lib/ai-summary.ts`)
  and Note Assist (`src/lib/note-assist.ts`) both call OpenAI's Chat Completions API, but every
  prompt is deliberately restrictive — elaborate on given facts, never invent a clinical finding.
- **Care Gaps** (`src/lib/care-gaps.ts`) is a pure, dependency-free rule engine — no AI in the
  loop, since "is this patient overdue" shouldn't depend on a model call.

## Setup

1. Start the FHIR server:

   ```bash
   docker compose up -d
   ```

   This also runs a one-shot `fhir-init` container that waits for HAPI to be ready and loads all
   the fixture bundles (Organization/Practitioner, all patients, appointments) automatically —
   idempotent, so restarting the stack won't duplicate data. Confirm it's up:
   `curl http://localhost:8080/fhir/metadata`, and check the seed: `docker compose logs fhir-init`.

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables — copy `.env.local.example` to `.env.local` if you haven't
   already, and add your OpenAI key:

   ```
   FHIR_BASE_URL=http://localhost:8080/fhir
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 — it redirects to `/patients`.

## Deployment

Vercel (or any serverless host) can only run the Next.js app itself — it cannot run the HAPI FHIR
+ Postgres stack, since that's a stateful, long-running service and Vercel's functions are
stateless and short-lived. You'll need two pieces:

1. **The FHIR stack** (`docker-compose.yml`) — deploy this to any host that runs Docker Compose
   and gives you a persistent volume: an EC2/VPS instance, Railway, Render, Fly.io, etc. The
   `fhir-init` container seeds the data automatically the first time the containers start, and
   skips re-seeding on subsequent restarts as long as the Postgres volume persists. The same
   compose file also builds and runs the Next.js app itself (`web` service) alongside it.
2. **Environment for the `web` service** — `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) are
   read from a root-level `.env` file next to `docker-compose.yml` (Docker Compose's own variable
   substitution) — a different mechanism from the `.env.local` used by plain `npm run dev`.

## Pages

- `/patients` — Today's Schedule + Care Gaps on the homepage, patient list + search
- `/patients/new` — create patient (validated: required name, gender from fixed set, DOB not in
  the future)
- `/patients/[id]` — chart review dashboard: AI Physician Brief, Attention tiles, Clinical
  Changes, vitals, active conditions/medications, allergies, structured previous-visit history,
  labs & PFT trends, diagnostic report viewer, notes archive
- `/patients/[id]/edit` — edit patient
- `/patients/[id]/visit` — Visit Workspace: start the encounter, stage medications, AI Note
  Assist, review & finalize as one FHIR transaction

## Notes

- No UI framework CLI (create-next-app/shadcn) was run — this project was hand-authored file by
  file since the build sandbox couldn't reach the npm registry. Run `npm install` and report any
  dependency or type errors back for a fix.
- `fixtures/*.json` contain the synthetic pulmonology patient bundles already loaded into the
  FHIR server (5 detailed patients + shared Organization/Practitioner). Patients 1-3 (Ezekiel
  Walter — asthma, Cristobal Montero — COPD, Larissa Nikolaus — severe allergic asthma) are the
  original demo set; patients 4-5 (Marcus Feldman, Priya Anand) were added specifically to
  exercise the Care Gaps panel — Marcus is overdue for routine follow-up, Priya has an unresolved
  post-exacerbation gap.
