#!/bin/bash

echo "🔍 Testing APTC Token Integration"
echo "================================="

# Get the user's principal from logs (or you can update this)
USER_PRINCIPAL="yyxov-6nxxs-7xigr-szuan-abtxh-uyfyh-pt4ku-76wz3-agh3a-4cmos-6qe"
TOKEN_CANISTER="bkyz2-fmaaa-aaaaa-qaaaq-cai"

echo "📍 User Principal: $USER_PRINCIPAL"
echo "🪙 Token Canister: $TOKEN_CANISTER"
echo ""

echo "💰 Current Balance:"
dfx canister call $TOKEN_CANISTER icrc1_balance_of "(record { owner = principal \"$USER_PRINCIPAL\"; subaccount = null })"

echo ""
echo "📊 Token Info:"
echo "Name: $(dfx canister call $TOKEN_CANISTER icrc1_name)"
echo "Symbol: $(dfx canister call $TOKEN_CANISTER icrc1_symbol)" 
echo "Decimals: $(dfx canister call $TOKEN_CANISTER icrc1_decimals)"

echo ""
echo "🎮 Test a small transfer to treasury (simulating a bet):"
echo "Treasury: aaaaa-aa (generic principal for testing)"

# Test transfer
dfx canister call $TOKEN_CANISTER icrc1_transfer "(record { 
    to = record { owner = principal \"aaaaa-aa\"; subaccount = null }; 
    amount = 100000000;  // 1 APTC in e8s
    fee = null;
    memo = null;
    from_subaccount = null;
    created_at_time = null;
})"

echo ""
echo "💰 Balance After Test Transfer:"
dfx canister call $TOKEN_CANISTER icrc1_balance_of "(record { owner = principal \"$USER_PRINCIPAL\"; subaccount = null })"
