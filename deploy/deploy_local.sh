#!/usr/bin/env bash
set -euo pipefail
NETWORK="${1:-myNetwork1}"
cd "$(dirname "$0")"
./local_start.sh "$NETWORK"
dfx deploy --network "$NETWORK"
CID=$(dfx canister --network "$NETWORK" id backend)
echo "backend canister id: $CID"
# write env to project root
ROOT_DIR="$(cd .. && pwd)"
printf "NEXT_PUBLIC_IC_HOST=http://localhost:4943\nNEXT_PUBLIC_CASINO_CANISTER_ID=%s\n" "$CID" > "$ROOT_DIR/.env.local"
echo ".env.local written at $ROOT_DIR/.env.local"
