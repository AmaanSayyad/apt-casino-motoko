#!/usr/bin/env bash
set -euo pipefail

NETWORK="ic"

if ! command -v dfx >/dev/null 2>&1; then
  echo "dfx not found." >&2; exit 1
fi

echo "Building and deploying canisters to mainnet..."
dfx deploy --network "$NETWORK"

BACKEND_ID=$(dfx canister --network "$NETWORK" id backend)
TOKEN_ID=$(dfx canister --network "$NETWORK" id aptc_token)

echo "Backend: $BACKEND_ID"
echo "Token:   $TOKEN_ID"

echo "Setting token minter to backend..."
dfx canister --network "$NETWORK" call aptc_token set_minter "(principal \"$BACKEND_ID\")"

echo "Wiring backend with token canister..."
dfx canister --network "$NETWORK" call backend set_token_canister "(principal \"$TOKEN_ID\")"

echo "Setting backend self principal..."
dfx canister --network "$NETWORK" call backend set_self_principal "(principal \"$BACKEND_ID\")"

echo "Done."


