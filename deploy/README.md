# APT Casino Deployment Guide

This directory contains all the necessary files and scripts for deploying the APT Casino application to the Internet Computer Protocol (ICP).

## 🚀 Quick Deployment

### Prerequisites
- DFX SDK installed (v0.15.0 or higher)
- Internet Identity configured
- Sufficient cycles for deployment

### Local Development Deployment

1. **Start local replica**
```bash
./local_start.sh
```

2. **Deploy to local network**
```bash
./deploy_local.sh
```

### Mainnet Deployment

1. **Deploy to mainnet**
```bash
./deploy_mainnet.sh
```

## 📁 Directory Structure

```
deploy/
├── backend/              # Backend canister files
│   ├── app.mo           # Main backend logic
│   └── backend.did      # Backend interface definition
├── token/                # Token canister files
│   └── app.mo           # APTC token implementation
├── frontend/             # Frontend canister
│   └── index.html       # Frontend entry point
├── dfx.json             # DFX configuration
├── mops.toml            # Mops dependencies
├── local_start.sh       # Local replica startup script
├── deploy_local.sh      # Local deployment script
└── deploy_mainnet.sh    # Mainnet deployment script
```

## 🔧 Configuration

### DFX Configuration
The `dfx.json` file contains the canister definitions and build configurations for:
- Backend canister (casino logic)
- Token canister (APTC token)
- Frontend canister (user interface)

### Mops Dependencies
The `mops.toml` file manages Motoko package dependencies for the backend canisters.

## 📋 Deployment Scripts

### Local Development
- **`local_start.sh`**: Starts a local ICP replica for development
- **`deploy_local.sh`**: Deploys all canisters to the local network

### Production
- **`deploy_mainnet.sh`**: Deploys all canisters to the mainnet

## 🎯 Canister Details

### Backend Canister
- **Purpose**: Handles casino game logic and state management
- **Language**: Motoko
- **Features**: Game state, player management, betting logic

### Token Canister
- **Purpose**: Manages APTC token operations
- **Language**: Motoko
- **Features**: Token minting, transfers, balance tracking

### Frontend Canister
- **Purpose**: Serves the user interface
- **Technology**: HTML/CSS/JavaScript
- **Features**: Responsive design, wallet integration

## 🔐 Security Considerations

- All canisters use proper access control
- Token operations are secured with proper validation
- Game logic is implemented with fairness guarantees
- No admin backdoors or privileged operations

## 🐛 Troubleshooting

### Common Issues
1. **Insufficient cycles**: Ensure your identity has enough cycles
2. **Network connectivity**: Check internet connection for mainnet deployment
3. **Identity issues**: Verify Internet Identity is properly configured

### Debug Commands
```bash
# Check canister status
dfx canister status <canister-name>

# View canister logs
dfx canister call <canister-name> <method> <args>

# Check cycles balance
dfx wallet balance
```

## 📚 Additional Resources

- [DFX Documentation](https://internetcomputer.org/docs/current/developer-docs/setup/install/)
- [Motoko Language Guide](https://internetcomputer.org/docs/current/developer-docs/build/languages/motoko/)
- [Internet Computer Overview](https://internetcomputer.org/)

## 🤝 Support

For deployment issues or questions:
1. Check the troubleshooting section above
2. Review the DFX and Motoko documentation
3. Open an issue in the main repository
4. Contact the development team
