#!/bin/sh
# Idempotent FHIR data seeder. Safe to run every time the container starts:
# it checks whether the data is already loaded before POSTing anything.
#
# Usage: FHIR_SERVER=http://hapi-fhir:8080/fhir sh scripts/init-fhir-data.sh
# Defaults to http://localhost:8080/fhir if FHIR_SERVER is unset.

set -e

FHIR_SERVER="${FHIR_SERVER:-http://localhost:8080/fhir}"
FIXTURES_DIR="${FIXTURES_DIR:-$(dirname "$0")/../fixtures}"

# A patient ID that only exists once the pulmonology data has been loaded.
SEED_MARKER_PATIENT="4f083ce3-f12b-bb4b-7353-e17f0cd55b0a"

echo "== FHIR init: waiting for server at $FHIR_SERVER =="
attempt=0
until curl -s -o /dev/null -w "%{http_code}" "$FHIR_SERVER/metadata" | grep -q "200"; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    echo "FHIR server did not become ready after 60 attempts. Aborting."
    exit 1
  fi
  echo "  ...not ready yet (attempt $attempt), retrying in 2s"
  sleep 2
done
echo "== FHIR server is up =="

marker_status=$(curl -s -o /dev/null -w "%{http_code}" "$FHIR_SERVER/Patient/$SEED_MARKER_PATIENT")
if [ "$marker_status" = "200" ]; then
  echo "== Seed data already present (Patient/$SEED_MARKER_PATIENT found). Skipping load. =="
  exit 0
fi

post_bundle() {
  file="$1"
  echo "== Loading $file =="
  http_code=$(curl -s -o /tmp/fhir_init_response.json -w "%{http_code}" \
    -X POST "$FHIR_SERVER" \
    -H "Content-Type: application/fhir+json" \
    --data "@$FIXTURES_DIR/$file")
  if [ "$http_code" -ge 400 ]; then
    echo "  FAILED ($http_code). Response:"
    cat /tmp/fhir_init_response.json
    exit 1
  fi
  echo "  OK ($http_code)"
}

post_bundle "shared_resources_bundle.json"
post_bundle "00_base_patients_bundle.json"
post_bundle "patient1_asthma_bundle_v2.json"
post_bundle "patient2_copd_bundle.json"
post_bundle "patient3_severe_allergic_asthma_bundle.json"
post_bundle "appointments_bundle.json"

count=$(curl -s "$FHIR_SERVER/Patient?_summary=count" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
echo "== Done. Patient total on server: ${count:-unknown} =="
