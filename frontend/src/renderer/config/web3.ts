import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react';
import {
  mainnet, polygon, arbitrum, optimism, bsc,
  base, linea, baseSepolia,
} from 'wagmi/chains';
import { APP_DESCRIPTION, APP_NAME, APP_WEBSITE_URL, WALLETCONNECT_PROJECT_ID } from './app';

// WalletConnect Project ID（https://cloud.walletconnect.com/ から取得）
const projectId = WALLETCONNECT_PROJECT_ID;

// ============================================================
// wagmi/chains にないチェーンを手動定義
// ============================================================

const sepolia = {
  id: 11155111,
  name: 'Sepolia',
  network: 'sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://ethereum-sepolia-rpc.publicnode.com'] },
    public:  { http: ['https://ethereum-sepolia-rpc.publicnode.com'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
  testnet: true,
} as const;

const polygonAmoy = {
  id: 80002,
  name: 'Polygon Amoy',
  network: 'polygon-amoy',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-amoy.polygon.technology'] },
    public:  { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' },
  },
  testnet: true,
} as const;

const arbitrumSepolia = {
  id: 421614,
  name: 'Arbitrum Sepolia',
  network: 'arbitrum-sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia-rollup.arbitrum.io/rpc'] },
    public:  { http: ['https://sepolia-rollup.arbitrum.io/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io' },
  },
  testnet: true,
} as const;

const optimismSepolia = {
  id: 11155420,
  name: 'Optimism Sepolia',
  network: 'optimism-sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.optimism.io'] },
    public:  { http: ['https://sepolia.optimism.io'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia-optimism.etherscan.io' },
  },
  testnet: true,
} as const;

const bscTestnet = {
  id: 97,
  name: 'BSC Testnet',
  network: 'bsc-testnet',
  nativeCurrency: { name: 'BNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://data-seed-prebsc-1-s1.binance.org:8545'] },
    public:  { http: ['https://data-seed-prebsc-1-s1.binance.org:8545'] },
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://testnet.bscscan.com' },
  },
  testnet: true,
} as const;

// Linea Sepolia（Chain 59141）- wagmi の lineaTestnet は 59140 で別物
const lineaSepolia = {
  id: 59141,
  name: 'Linea Sepolia',
  network: 'linea-sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.sepolia.linea.build'] },
    public:  { http: ['https://rpc.sepolia.linea.build'] },
  },
  blockExplorers: {
    default: { name: 'Lineascan', url: 'https://sepolia.lineascan.build' },
  },
  testnet: true,
} as const;

// Sei EVM Mainnet（Chain 1329）
const seiMainnet = {
  id: 1329,
  name: 'Sei',
  network: 'sei',
  nativeCurrency: { name: 'Sei', symbol: 'SEI', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evm-rpc.sei-apis.com'] },
    public:  { http: ['https://evm-rpc.sei-apis.com'] },
  },
  blockExplorers: {
    default: { name: 'Seitrace', url: 'https://seitrace.com' },
  },
  testnet: false,
} as const;

// Sei EVM Testnet（Chain 1328）
const seiTestnet = {
  id: 1328,
  name: 'Sei Testnet',
  network: 'sei-testnet',
  nativeCurrency: { name: 'Sei', symbol: 'SEI', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evm-rpc-testnet.sei-apis.com'] },
    public:  { http: ['https://evm-rpc-testnet.sei-apis.com'] },
  },
  blockExplorers: {
    default: { name: 'Seitrace Testnet', url: 'https://testnet.seitrace.com' },
  },
  testnet: true,
} as const;

// ============================================================
// 全チェーンリスト
// ============================================================
const chains = [
  // メインネット
  mainnet,       // 1
  polygon,       // 137
  arbitrum,      // 42161
  optimism,      // 10
  bsc,           // 56
  base,          // 8453
  linea,         // 59144
  seiMainnet,    // 1329
  // テストネット
  sepolia,          // 11155111
  polygonAmoy,      // 80002
  arbitrumSepolia,  // 421614
  optimismSepolia,  // 11155420
  bscTestnet,       // 97
  baseSepolia,      // 84532
  lineaSepolia,     // 59141
  seiTestnet,       // 1328
];

// Wagmi 設定
export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata: {
    name: APP_NAME,
    description: APP_DESCRIPTION,
    url: APP_WEBSITE_URL || 'https://example.com',
    icons: ['https://avatars.githubusercontent.com/u/37784886'],
  },
  enableCoinbase: true,
  enableInjected: true,
  enableWalletConnect: true,
});

// Web3Modal 設定
createWeb3Modal({
  wagmiConfig,
  projectId,
  chains,
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#2196F3',
  },
  enableAnalytics: false,
  defaultChain: undefined,
});

export { projectId, chains };
