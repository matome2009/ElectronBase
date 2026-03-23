# Web3 Payroll Guardian - Frontend

TypeScript/Electron desktop application with Web3 wallet integration.

## Features

- ✅ Cross-platform (Windows, Mac, Linux)
- ✅ Web3Modal v3 integration
- ✅ Dual wallet connection:
  - QR Code for mobile wallets (WalletConnect)
  - Browser extension (MetaMask, Coinbase Wallet, etc.)
- ✅ React + TypeScript
- ✅ TailwindCSS styling
- ✅ Electron for desktop packaging

## Prerequisites

- Node.js 18+ and npm
- WalletConnect Project ID (get from https://cloud.walletconnect.com/)

## Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure WalletConnect Project ID:
   - Get your project ID from https://cloud.walletconnect.com/
   - Update `src/renderer/config/web3.ts`:
     ```typescript
     const projectId = 'YOUR_PROJECT_ID'; // Replace with your actual ID
     ```

3. Start development server:
```bash
npm run dev
```

## Build

Build for your platform:

```bash
# Windows
npm run build:win

# Mac
npm run build:mac

# Linux
npm run build:linux
```

## Project Structure

```
frontend/
├── src/
│   ├── main/
│   │   └── index.ts              # Electron main process
│   ├── preload/
│   │   └── index.ts              # Electron preload (IPC bridge)
│   └── renderer/
│       ├── App.tsx               # React root
│       ├── main.tsx              # React entry point
│       ├── components/           # UI components
│       │   ├── Header.tsx
│       │   ├── Sidebar.tsx
│       │   ├── Dashboard.tsx
│       │   ├── SessionList.tsx
│       │   ├── CsvImport.tsx
│       │   ├── Configuration.tsx
│       │   └── MainLayout.tsx
│       ├── config/
│       │   └── web3.ts           # Web3Modal configuration
│       ├── types/
│       │   └── index.ts          # TypeScript type definitions
│       └── styles/
│           └── globals.css       # TailwindCSS styles
├── package.json
├── tsconfig.json
├── electron.vite.config.ts
└── tailwind.config.js
```

## Wallet Connection

The app uses Web3Modal v3 which automatically provides:

1. **QR Code Mode**: For mobile wallet apps
   - WalletConnect v2 protocol
   - Scan QR with mobile wallet app
   - Secure connection via bridge server

2. **Browser Extension Mode**: For desktop users
   - MetaMask
   - Coinbase Wallet
   - Other injected wallets
   - Direct browser extension connection

Users can choose their preferred method when clicking "Connect Wallet".

## Supported Networks

- Ethereum Mainnet
- Polygon
- Arbitrum
- Optimism
- BSC (Binance Smart Chain)

## Next Steps

1. ✅ Frontend UI complete
2. ⏳ Create ASP.NET Core Web API backend
3. ⏳ Implement API service layer
4. ⏳ Connect frontend to backend API
5. ⏳ Test wallet connection (QR + browser)
6. ⏳ Build and test on Windows/Mac

## Development Notes

- Web3Modal handles all wallet connection UI automatically
- No need to implement custom QR code display
- Browser extension detection is automatic
- Supports both connection methods out of the box
