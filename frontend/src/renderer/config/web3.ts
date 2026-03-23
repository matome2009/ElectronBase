import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react';
import { mainnet, polygon, arbitrum, optimism, bsc } from 'wagmi/chains';

// WalletConnect Project ID（https://cloud.walletconnect.com/ から取得）
const projectId = '1deeae95c54f33e5e3f5f3310982191e';

// テストネットチェーンを手動で定義
const sepolia = {
  id: 11155111,
  name: 'Sepolia',
  network: 'sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://ethereum-sepolia-rpc.publicnode.com'] },
    public: { http: ['https://ethereum-sepolia-rpc.publicnode.com'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
  testnet: true,
};

const polygonAmoy = {
  id: 80002,
  name: 'Polygon Amoy',
  network: 'polygon-amoy',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-amoy.polygon.technology'] },
    public: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' },
  },
  testnet: true,
};

const arbitrumSepolia = {
  id: 421614,
  name: 'Arbitrum Sepolia',
  network: 'arbitrum-sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia-rollup.arbitrum.io/rpc'] },
    public: { http: ['https://sepolia-rollup.arbitrum.io/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io' },
  },
  testnet: true,
};

const optimismSepolia = {
  id: 11155420,
  name: 'Optimism Sepolia',
  network: 'optimism-sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.optimism.io'] },
    public: { http: ['https://sepolia.optimism.io'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia-optimism.etherscan.io' },
  },
  testnet: true,
};

const bscTestnet = {
  id: 97,
  name: 'BSC Testnet',
  network: 'bsc-testnet',
  nativeCurrency: { name: 'BNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://data-seed-prebsc-1-s1.binance.org:8545'] },
    public: { http: ['https://data-seed-prebsc-1-s1.binance.org:8545'] },
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://testnet.bscscan.com' },
  },
  testnet: true,
};

// サポートされているチェーン（メインネット5つ + テストネット5つ）
// WalletConnectはモバイルウォレット側で選択されているネットワークを使用します
const chains = [
  // メインネット
  mainnet, 
  polygon, 
  arbitrum, 
  optimism, 
  bsc,
  // テストネット
  sepolia,
  polygonAmoy,
  arbitrumSepolia,
  optimismSepolia,
  bscTestnet
] as const;

// Wagmi設定
// モバイルウォレットで選択されているチェーンを優先的に使用
export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata: {
    name: 'Web3 Token Batch Transfer',
    description: 'Secure bulk token payment application',
    url: 'https://web3payrollguardian.com',
    icons: ['https://avatars.githubusercontent.com/u/37784886'],
  },
  // すべてのチェーンを許可（モバイル側の選択を尊重）
  enableCoinbase: true,
  enableInjected: true,
  enableWalletConnect: true,
});

// Web3Modalを作成
// QRコード（モバイル）とブラウザ拡張機能（MetaMask）の両方をサポート
// モバイルウォレットで選択されているネットワークを優先
createWeb3Modal({
  wagmiConfig,
  projectId,
  chains,
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#2196F3',
  },
  enableAnalytics: false,
  // デフォルトチェーンを指定しない = モバイル側のネットワークを使用
  defaultChain: undefined,
});

export { projectId, chains };
