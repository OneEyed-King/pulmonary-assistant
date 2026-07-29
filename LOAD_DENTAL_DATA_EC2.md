# Loading DentaLens data on the EC2 instance

Two ways to get the DentaLens fixtures onto the production FHIR server. Both are
idempotent — safe to re-run without creating duplicate patients or appointments.

## Option A — recommended: let the init container do it

The `fhir-init` container already runs `scripts/init-fhir-data.sh`, which now checks
PulmoLens and DentaLens seed data independently (loading one specialty doesn't skip
the other, and re-running skips whichever is already present). If you pull the latest
code — which includes the new `fixtures/dental_*` files and the updated init script —
you just need to re-run that one container:

```bash
ssh <your-ec2-user>@<your-ec2-host>
cd /path/to/MedBlocks_FHIR_app
git pull
docker compose up -d --no-deps --force-recreate fhir-init
docker compose logs -f fhir-init
```

Watch the logs for `== DentaLens seed data already present... Skipping. ==` (already
loaded — nothing happens) or `== Loading DentaLens seed data ==` followed by 7 `OK`
lines. This does **not** touch or restart the `web` or `hapi-fhir` containers.

## Option B — manual curl commands

If you'd rather not touch docker-compose (e.g. the stack is live and you don't want to
recreate any container), run this directly against the already-running HAPI server.
It assumes you're in the repo directory on the EC2 box (so `fixtures/dental_*.json`
exist on disk) and that HAPI is reachable at `http://localhost:8080/fhir` — adjust
`FHIR_SERVER` below if yours is exposed differently.

Copy-paste the whole block into your EC2 SSH session. It checks for the DentaLens
marker patient first and exits early if the data is already loaded, so it's safe to
paste more than once.

```bash
FHIR_SERVER="http://localhost:8080/fhir"
DENTAL_MARKER_PATIENT="de111111-1111-4111-8111-000000000001"

marker_status=$(curl -s -o /dev/null -w "%{http_code}" "$FHIR_SERVER/Patient/$DENTAL_MARKER_PATIENT")
if [ "$marker_status" = "200" ]; then
  echo "DentaLens data already present (Patient/$DENTAL_MARKER_PATIENT found). Nothing to do."
else
  for file in \
    00_dental_shared_resources_bundle.json \
    00_base_dental_patients_bundle.json \
    dental_patient1_routine_cleaning_bundle.json \
    dental_patient2_periodontitis_bundle.json \
    dental_patient3_dental_trauma_bundle.json \
    dental_patient4_caries_filling_bundle.json \
    dental_patient5_history_bundle.json \
    dental_appointments_bundle.json
  do
    echo "== Loading $file =="
    http_code=$(curl -s -o /tmp/fhir_init_response.json -w "%{http_code}" \
      -X POST "$FHIR_SERVER" \
      -H "Content-Type: application/fhir+json" \
      --data "@fixtures/$file")
    if [ "$http_code" -ge 400 ]; then
      echo "  FAILED ($http_code). Response:"
      cat /tmp/fhir_init_response.json
      break
    fi
    echo "  OK ($http_code)"
  done
fi
```

### Verifying it worked

```bash
curl -s "$FHIR_SERVER/Patient?_tag=https://pulmolens.app/fhir/specialty|dental&_summary=count"
```

Should report `"total": 5`. You can also hit the app directly once it's rebuilt
(`docker compose up -d --build web` if the DentaLens code itself hasn't been deployed
yet) and open `/denta/patients`.

### If you need to undo it

There's no bundled rollback script since this is meant to run once. Note that only
`Patient` and `Appointment` carry the `meta.tag` — Encounter/Condition/MedicationRequest/
Observation/DiagnosticReport/Composition/AllergyIntolerance don't have their own tag, so a
tag-based delete on those resource types would find nothing and leave them orphaned. Instead,
delete by patient reference (HAPI's conditional delete, requires `allowMultipleDelete` mode —
on by default in recent HAPI images) for each of the 5 dental patient IDs, then the patients
and tagged appointments themselves:

```bash
DENTAL_PATIENT_IDS="de111111-1111-4111-8111-000000000001 de222222-2222-4222-8222-000000000002 de333333-3333-4333-8333-000000000003 de444444-4444-4444-8444-000000000004 de555555-5555-4555-8555-000000000005"

for pid in $DENTAL_PATIENT_IDS; do
  for rt in Encounter Condition MedicationRequest Observation DiagnosticReport AllergyIntolerance; do
    curl -s -X DELETE "$FHIR_SERVER/$rt?patient=Patient/$pid" -H "Cache-Control: no-cache"
  done
  curl -s -X DELETE "$FHIR_SERVER/Composition?subject=Patient/$pid" -H "Cache-Control: no-cache"
done

curl -s -X DELETE "$FHIR_SERVER/Appointment?_tag=https://pulmolens.app/fhir/specialty|dental" -H "Cache-Control: no-cache"

for pid in $DENTAL_PATIENT_IDS; do
  curl -s -X DELETE "$FHIR_SERVER/Patient/$pid" -H "Cache-Control: no-cache"
done
```

The Organization/2010, Practitioner/2011, and PractitionerRole/2012 shared resources are left
in place (harmless to leave, and re-running the loader would just PUT over them again).

Run this only if you're certain — it permanently deletes the dental patients and their records.
