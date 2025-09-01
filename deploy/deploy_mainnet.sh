#!/bin/bash

# APT Casino - Mainnet Deployment Script
# This script deploys the APT Casino application to the ICP mainnet
# 
# ⚠️  WARNING: This will deploy to MAINNET and consume real cycles
# 
# Prerequisites:
# - DFX SDK installed (v0.15.0 or higher)
# - Internet Identity configured and authenticated
# - Sufficient cycles in your identity wallet
# - Proper network configuration for mainnet
#
# Author: APT Casino Development Team
# Date: $(date +%Y-%m-%d)

set -e  # Exit on any error

echo "🚀 Starting APT Casino mainnet deployment..."
echo "🌐 Network: mainnet"
echo ""

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "❌ Error: DFX is not installed. Please install DFX SDK first."
    echo "   Visit: https://internetcomputer.org/docs/current/developer-docs/setup/install/"
    exit 1
fi

# Check if user is authenticated
echo "🔐 Checking authentication..."
if ! dfx identity whoami &> /dev/null; then
    echo "❌ Error: Not authenticated. Please run 'dfx identity new <name>' and 'dfx identity use <name>'"
    exit 1
fi

# Check cycles balance
echo "💰 Checking cycles balance..."
CYCLES=$(dfx wallet balance --network mainnet)
echo "   Current balance: $CYCLES"

# Confirm deployment
echo ""
echo "⚠️  WARNING: This will deploy to MAINNET and consume real cycles!"
echo "   Current cycles: $CYCLES"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

echo "📦 Building and deploying canisters to mainnet..."

# Deploy all canisters
dfx deploy --network mainnet

echo ""
echo "✅ Mainnet deployment completed successfully!"
echo ""

# Get canister IDs
echo "🆔 Canister IDs:"
dfx canister id backend --network mainnet
dfx canister id token --network mainnet
dfx canister id frontend --network mainnet

echo ""
echo "🌐 Frontend URL:"
echo "   https://$(dfx canister id frontend --network mainnet).ic0.app"

echo ""
echo "🎉 APT Casino is now live on mainnet!"
echo "   Users can access the application at the URL above."
echo ""
echo "💡 Next steps:"
echo "   - Test all functionality on mainnet"
echo "   - Monitor canister performance and cycles usage"
echo "   - Update frontend configuration with new canister IDs"
echo "   - Consider setting up monitoring and alerting"


