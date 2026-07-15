#!/bin/bash
# Superseded by init-fhir-data.sh (idempotent, loads all fixture bundles in order).
# Kept as a thin wrapper for anyone with muscle memory for this filename.

exec sh "$(dirname "$0")/init-fhir-data.sh"
