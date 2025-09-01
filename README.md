# Autonomous, Provably Transparent(APT)-Casino - Fully On-Chain Casino on ICP Blockchain

A fully on-chain casino replica of stake.com built on the ICP blockchain, featuring four popular casino games: Roulette, Mines, Plinko and Spin Wheel. All games use ICP motoko on-chain randomness and are played exclusively with APT tokens.

## 🎮 Features

### Games
- **Roulette**: Classic roulette with multiple bet types (numbers, colors, odds/evens, etc.)
- **Mines**: Reveal tiles to find gems while avoiding mines
- **Plinko**: Balls dropping into multiplier segments pyramid
- **Spin Wheel**: Risk-based wheel spinning with different multiplier segments

### Blockchain Features
- **ICP Integration**: Fully ICP blockchain integrated
- **On-Chain Randomness**: All games use provably fair ICP Motoko on-chain randomness
- **APTC Token Support**: All games played exclusively with APTC tokens deployed on ICP Testnet
- **Multiple Wallet Support**: NNS wallet
- **Mobile Friendly**: Responsive design for mobile and desktop

### Technical Features
- **ICP Contracts**: Smart contracts written in Motoko language
- **Real-Time Updates**: Live game state and balance updates
- **Event System**: Comprehensive event tracking for all game actions
- **Security**: Provably fair gaming with on-chain verification

```env
NEXT_PUBLIC_IC_HOST=https://ic0.app
NEXT_PUBLIC_CASINO_CANISTER_ID=d7bsl-tiaaa-aaaan-qz5pq-cai
NEXT_PUBLIC_APTC_TOKEN_CANISTER_ID=f2kju-siaaa-aaaan-qz5zq-cai
```

## 🏗️ Architecture

### Frontend (Next.js)
- **Framework**: Next.js 15 with React 18
- **Styling**: Tailwind CSS with custom gradients
- **State Management**: React hooks and context
- **Wallet Integration**: NNS
- **UI Components**: Custom casino-themed components

### Smart Contracts (Motoko)
- **Language**: Motoko
- **Framework**: ICP Motoko Randomness Module
- **Games**: Roulette, Mines, Plinko, Spin Wheel
- **Randomness**: On-chain SHA3-256 hashing
- **Events**: Comprehensive event system

## 🎯 Game Mechanics

### Roulette
- **Bet Types**: Numbers (0-36), Colors (Red/Black), Odds/Evens, High/Low, Dozens, Columns, Split, Street, Corner, Line
- **Payouts**: 1:1 to 35:1 depending on bet type
- **Randomness**: On-chain SHA3-256 with timestamp and transaction data

### Mines
- **Grid**: 5x5 grid (25 tiles)
- **Mines**: 1-24 mines per game
- **Reveal**: Click tiles to reveal gems or mines
- **Multiplier**: Increases as you reveal more tiles safely
- **Cashout**: Collect winnings at any time

### Spin Wheel
- **Risk Levels**: Low, Medium, High
- **Segments**: 6-10 segments based on risk
- **Multipliers**: 1.2x to 10x depending on risk level
- **Instant Results**: Immediate win/loss determination

### Provably Fair
- All game logic is on-chain
- Randomness is verifiable
- No server-side manipulation possible

## 📱 Mobile Support
The application is fully responsive and optimised for:
- **iOS Safari**: Full support
- **Android Chrome**: Full support
- **Mobile browser wallets**: NNS
- **Touch interactions**: Optimized for touch devices
