# FHIR Chart Review Assistant

Next.js app for the FHIR hackathon: patient management (Week 1) + pulmonology chart-review
dashboard with AI-assisted summaries (Week 2 + stretch), backed by a local HAPI FHIR server.

## Architecture

- **Next.js App Router**, single container — no separate backend service.
- **Route Handlers as a FHIR proxy** (`src/app/api/fhir/[...path]/route.ts`): the browser only
  ever calls same-origin `/api/fhir/*`, which forwards to the local HAPI server. Avoids CORS
  entirely and keeps `FHIR_BASE_URL` server-side only.
- **Server Components fetch FHIR data directly** (`src/lib/fhir.ts`, server-only) for all read
  paths (patient list, chart review) — no extra network hop.
- **Client Components** (patient create/edit forms) write through the `/api/fhir/*` proxy.
- **AI Chart Summary** (`src/app/api/ai/summarize/route.ts`): condenses a patient's FHIR chart
  into a structured text prompt and calls OpenAI's Chat Completions API to generate a clinical
  summary + flagged concerns.

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
   and gives you a persistent volume: Railway, Render, Fly.io, a small VPS, etc. The `fhir-init`
   container seeds the data automatically the first time the containers start, and skips
   re-seeding on subsequent restarts as long as the Postgres volume persists.
2. **The Next.js app** — deploy to Vercel as usual, with `FHIR_BASE_URL` (and `OPENAI_API_KEY`)
   set in the Vercel project's environment variables, pointed at wherever step 1 is hosted (e.g.
   `https://your-fhir-host.example.com/fhir`).

## Pages

- `/patients` — list + search patients by name
- `/patients/new` — create patient (validated: required name, gender from fixed set, DOB not in
  the future)
- `/patients/[id]` — chart review dashboard: demographics, vitals, active conditions/medications,
  allergies, encounter + medication timelines, pulmonary function/lab trend charts, SOAP notes &
  diagnostic reports, AI chart summary
- `/patients/[id]/edit` — edit patient

## Notes

- No UI framework CLI (create-next-app/shadcn) was run — this project was hand-authored file by
  file since the build sandbox couldn't reach the npm registry. Run `npm install` and report any
  dependency or type errors back for a fix.
- `fixtures/*.json` contain the synthetic pulmonology patient bundles already loaded into the
  local HAPI server (10 base patients + 3 detailed pulmonology patients + shared
  Organization/Practitioner).
# plumolense-FHIR-dashboard
