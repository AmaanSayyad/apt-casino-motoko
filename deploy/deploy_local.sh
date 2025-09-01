#!/bin/bash

# APT Casino - Local Deployment Script
# This script deploys the APT Casino application to a local ICP replica
# 
# Usage: ./deploy_local.sh [network_name]
# 
# Prerequisites:
# - DFX SDK installed (v0.15.0 or higher)
# - Local replica running or network configured
#
# Author: APT Casino Development Team
# Date: $(date +%Y-%m-%d)

set -e  # Exit on any error

# Default network
NETWORK=${1:-local}

echo "🚀 Starting APT Casino local deployment..."
echo "📡 Network: $NETWORK"
echo ""

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "❌ Error: DFX is not installed. Please install DFX SDK first."
    echo "   Visit: https://internetcomputer.org/docs/current/developer-docs/setup/install/"
    exit 1
fi

# Check if network is running
if [ "$NETWORK" = "local" ]; then
    echo "🔍 Checking if local replica is running..."
    if ! dfx ping --network local &> /dev/null; then
        echo "⚠️  Local replica is not running. Starting it now..."
        dfx start --background --clean
        echo "⏳ Waiting for replica to be ready..."
        sleep 10
    fi
fi

echo "📦 Building and deploying canisters..."

# Deploy all canisters
dfx deploy --network $NETWORK

echo ""
echo "✅ Deployment completed successfully!"
echo ""

# Get canister IDs
echo "🆔 Canister IDs:"
dfx canister id backend --network $NETWORK
dfx canister id token --network $NETWORK
dfx canister id frontend --network $NETWORK

echo ""
echo "🌐 Frontend URL:"
echo "   http://localhost:4943/?canisterId=$(dfx canister id frontend --network $NETWORK)"

echo ""
echo "🎮 APT Casino is now running locally!"
echo "   Use the frontend URL above to access the application."
echo ""
echo "💡 Tips:"
echo "   - Use 'dfx canister call <canister> <method> <args>' to test canisters"
echo "   - Check logs with 'dfx canister call <canister> <method>'"
echo "   - Stop replica with 'dfx stop'"
