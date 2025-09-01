# APT Casino Deployment Guide

This document provides comprehensive instructions for deploying the APT Casino application across different environments and networks.

## 🎯 Overview

APT Casino is a multi-blockchain casino platform that can be deployed on:
- **Aptos Blockchain**: Primary deployment with Move smart contracts
- **Internet Computer Protocol (ICP)**: Secondary deployment with Motoko canisters
- **Local Development**: For testing and development purposes

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Aptos CLI (for Aptos deployment)
- DFX SDK (for ICP deployment)
- Sufficient tokens/cycles for deployment

### Environment Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables
4. Choose deployment target

## 🏗️ Architecture

### Frontend (Next.js)
- **Framework**: Next.js 15 with React 18
- **Styling**: Tailwind CSS with custom casino theme
- **State Management**: React hooks and context
- **Wallet Integration**: Multi-chain wallet support

### Backend Options

#### Aptos (Primary)
- **Language**: Move
- **Features**: On-chain randomness, provably fair games
- **Games**: Roulette, Mines, Spin Wheel

#### ICP (Secondary)
- **Language**: Motoko
- **Features**: Canister-based architecture
- **Games**: Same game portfolio with ICP backend

## 📋 Deployment Options

### 1. Aptos Deployment

#### Testnet
```bash
# Compile contracts
cd move-contracts
aptos move compile

# Deploy to testnet
node scripts/deploy.js testnet
```

#### Mainnet
```bash
# Deploy to mainnet
node scripts/deploy.js mainnet
```

### 2. ICP Deployment

#### Local Development
```bash
cd deploy
./deploy_local.sh
```

#### Mainnet
```bash
cd deploy
./deploy_mainnet.sh
```

### 3. Frontend Deployment

#### Vercel (Recommended)
```bash
npm install -g vercel
vercel login
vercel --prod
```

#### Manual
```bash
npm run build
# Upload .next and public folders to your hosting provider
```

## 🔧 Configuration

### Environment Variables
```env
# Aptos Configuration
NEXT_PUBLIC_APTOS_NETWORK=testnet|mainnet
NEXT_PUBLIC_CASINO_MODULE_ADDRESS=your_module_address

# ICP Configuration
NEXT_PUBLIC_IC_HOST=https://ic0.app
NEXT_PUBLIC_CASINO_CANISTER_ID=your_canister_id

# Deployment
DEPLOYER_PRIVATE_KEY=your_private_key
```

### Network Configuration
- **Testnet**: For development and testing
- **Mainnet**: For production deployment
- **Local**: For local development and testing

## 🔐 Security Considerations

### Smart Contract Security
- All contracts use proper access control
- On-chain randomness for provably fair gaming
- No admin backdoors or privileged operations
- Comprehensive input validation

### Deployment Security
- Private keys stored securely
- Environment variables properly configured
- Network access controls in place
- Regular security audits

## 🐛 Troubleshooting

### Common Issues
1. **Insufficient funds**: Ensure sufficient tokens/cycles
2. **Network connectivity**: Check network configuration
3. **Authentication**: Verify wallet/identity setup
4. **Contract compilation**: Check Move/Motoko syntax

### Debug Commands
```bash
# Aptos
aptos move test
aptos move compile

# ICP
dfx canister status <canister>
dfx canister call <canister> <method>

# Frontend
npm run dev
npm run build
```

## 📚 Additional Resources

- [Aptos Documentation](https://aptos.dev/)
- [ICP Documentation](https://internetcomputer.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Move Language Guide](https://move-language.github.io/move/)
- [Motoko Language Guide](https://internetcomputer.org/docs/current/developer-docs/build/languages/motoko/)

## 🤝 Support

For deployment issues:
1. Check the troubleshooting section
2. Review relevant documentation
3. Open an issue in the repository
4. Contact the development team

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.