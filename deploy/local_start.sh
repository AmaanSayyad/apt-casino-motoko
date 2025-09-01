#!/usr/bin/env bash
set -euo pipefail
NETWORK="${1:-myNetwork1}"
if ! command -v dfx >/dev/null 2>&1; then
  echo "dfx not found." >&2; exit 1
fi
if ! nc -z 127.0.0.1 4943 >/dev/null 2>&1; then
  dfx start --network "$NETWORK" --clean --background
  sleep 2
fi
printf "Local replica started on %s (port 4943)\n" "$NETWORK"
