PulmoLens is a chart-review and visit-documentation app built for pulmonologists, running on
top of a real FHIR R4 patient record rather than a mocked-up demo dataset.

The problem it's aimed at is a pretty ordinary one: a doctor prepping for a visit usually has to
piece a patient's story together by clicking through several different screens — vitals here,
lab trends somewhere else, last visit's notes buried in a different tab. That adds up over a
full day of patients, and it's on top of the other big time sink doctors deal with constantly:
documentation. PulmoLens is built around collapsing both of those down.

The primary users are pulmonologists and the practices they work in, though nothing about the
architecture is specific to pulmonology — the demo content (asthma, COPD, severe allergic
asthma) just happens to be the specialty I built it around.

The core of the app is a single chart-review screen that puts everything a doctor needs in one
place: demographics, active conditions and medications, allergies, vitals, lab and pulmonary
function trends compared against the last visit, and previous visits laid out as structured
summaries rather than a flat notes dump. The idea is that pre-visit prep should take seconds of
scrolling, not several tabs of clicking. On top of that, there's an AI-generated brief that
reads the chart and surfaces what actually matters right now, and a rule-based clinical-changes
check that flags anything meaningfully worse than the last visit — an FEV1 that dropped, an ACT
score trending down, a lab value crossing a real clinical threshold.

There's also a homepage-level Care Gaps panel that looks across the whole patient panel rather
than one chart at a time — flagging anyone overdue for routine follow-up, and more urgently,
anyone who had an ER visit with no follow-up ever booked afterward. That's the kind of thing that
falls through the cracks in a lot of practices, and it doesn't need a single click to find.

For the visit itself, opening a patient starts the encounter. A doctor can stage medications from
a curated list, and there's an AI Note Assist that takes quick shorthand typed during the visit
and expands it into a structured SOAP note — but it's deliberately restricted to elaborating on
what the doctor actually wrote (plus the visit's real conditions and medications), never
inventing a finding that wasn't there. Everything from the visit — medications, the note, the
encounter status — gets reviewed on one screen before anything is saved, and then commits to the
FHIR server as a single atomic transaction.

On the FHIR side, this isn't a UI sitting on top of fake data. It's backed by a real HAPI FHIR +
Postgres server, and every feature reads and writes actual FHIR R4 resources — Patient,
Encounter, Condition, MedicationRequest, Observation, DiagnosticReport, Composition,
AllergyIntolerance, Appointment. The Next.js app never talks to the FHIR server directly from the
browser; it goes through a same-origin proxy so the FHIR endpoint stays server-side only and
there's no CORS to fight. The whole stack (FHIR server, seed data, and the app itself) is
Dockerized and comes up with one command, seeded with five full synthetic patients that
deliberately span different states — well-controlled, actively declining, and a couple with real
care gaps — so the panel-wide features have something real to show.
