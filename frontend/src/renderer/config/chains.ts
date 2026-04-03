/**
 * サポートチェーン マスター設定
 *
 * このファイルが唯一の設定ソース。
 * - UI（チェーン選択チェックボックス）
 * - AlchemyService（API URL）
 * - 型定義（ChainId）
 * が全てここを参照する。
 */

export interface ChainConfig {
  id: number;
  name: string;          // 表示名
  csvName: string;       // CSV で使うネットワーク名
  isTestnet: boolean;
  nativeCurrency: string;
  tokens: string[];      // このチェーンでサポートするトークン
  /** Alchemy Enhanced API の alchemy_getAssetTransfers が使えるか */
  alchemySupported: boolean;
  alchemyBaseUrl: string | null;
  blockExplorerUrl: string;
}

// ============================================================
// メインネット
// ============================================================
export const MAINNET_CHAINS: ChainConfig[] = [
  {
    id: 1,
    name: 'Ethereum Mainnet',
    csvName: 'Ethereum Mainnet',
    isTestnet: false,
    nativeCurrency: 'ETH',
    tokens: ['ETH', 'USDC', 'USDT', 'JPYC'],
    alchemySupported: true,
    alchemyBaseUrl: 'https://eth-mainnet.g.alchemy.com/v2',
    blockExplorerUrl: 'https://etherscan.io',
  },
  {
    id: 137,
    name: 'Polygon',
    csvName: 'Polygon',
    isTestnet: false,
    nativeCurrency: 'POL',
    tokens: ['POL', 'USDC', 'USDT', 'JPYC'],
    alchemySupported: true,
    alchemyBaseUrl: 'https://polygon-mainnet.g.alchemy.com/v2',
    blockExplorerUrl: 'https://polygonscan.com',
  },
  {
    id: 42161,
    name: 'Arbitrum One',
    csvName: 'Arbitrum One',
    isTestnet: false,
    nativeCurrency: 'ETH',
    tokens: ['ETH', 'USDC', 'USDT', 'JPYC'],
    alchemySupported: true,
    alchemyBaseUrl: 'https://arb-mainnet.g.alchemy.com/v2',
    blockExplorerUrl: 'https://arbiscan.io',
  },
  {
    id: 10,
    name: 'Optimism',
    csvName: 'Optimism',
    isTestnet: false,
    nativeCurrency: 'ETH',
    tokens: ['ETH', 'USDC', 'USDT'],
    alchemySupported: true,
    alchemyBaseUrl: 'https://opt-mainnet.g.alchemy.com/v2',
    blockExplorerUrl: 'https://optimistic.etherscan.io',
  },
  {
    id: 56,
    name: 'BSC (Binance Smart Chain)',
    csvName: 'BSC (Binance Smart Chain)',
    isTestnet: false,
    nativeCurrency: 'BNB',
    tokens: ['BNB', 'USDC', 'USDT'],
    alchemySupported: true,
    alchemyBaseUrl: 'https://bnb-mainnet.g.alchemy.com/v2',
    blockExplorerUrl: 'https://bscscan.com',
  },
  {
    id: 8453,
    name: 'Base',
    csvName: 'Base',
    isTestnet: false,
    nativeCurrency: 'ETH',
    tokens: ['ETH', 'USDC', 'USDT'],
    alchemySupported: true,
    alchemyBaseUrl: 'https://base-mainnet.g.alchemy.com/v2',
    blockExplorerUrl: 'https://basescan.org',
  },
  {
    id: 59144,
    name: 'Linea',
    csvName: 'Linea',
    isTestnet: false,
    nativeCurrency: 'ETH',
    tokens: ['ETH', 'USDC'],
    alchemySupported: true,
    alchemyBaseUrl: 'https://linea-mainnet.g.alchemy.com/v2',
    blockExplorerUrl: 'https://lineascan.build',
  },
  {
    id: 1329,
    name: 'Sei',
    csvName: 'Sei',
    isTestnet: false,
    nativeCurrency: 'SEI',
    tokens: ['SEI', 'USDC'],
    alchemySupported: true,
    alchemyBaseUrl: 'https://sei-mainnet.g.alchemy.com/v2',
    blockExplorerUrl: 'https://seitrace.com',
  },
];

// ============================================================
// テストネット
// ============================================================
export const TESTNET_CHAINS: ChainConfig[] = [
  {
    id: 11155111,
    name: 'Ethereum Sepolia',
    csvName: 'Ethereum Sepolia',
    isTestnet: true,
    nativeCurrency: 'ETH',
    tokens: ['ETH', 'USDC', 'USDT', 'JPYC'],
    alchemySupported: true,
    alchemyBaseUrl: 'https://eth-sepolia.g.alchemy.com/v2',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
  },
  {
    id: 80002,
    name: 'Polygon Amoy',
    csvName: 'Polygon Amoy',
    isTestnet: true,
    nativeCurrency: 'POL',
    tokens: ['POL', 'USDC', 'JPYC'],
    alchemySupported: true,
    alchemyBaseUrl: 'https://polygon-amoy.g.alchemy.com/v2',
    blockExplorerUrl: 'https://amoy.polygonscan.com',
  },
  {
    id: 421614,
    name: 'Arbitrum Sepolia',
    csvName: 'Arbitrum Sepolia',
    isTestnet: true,
    nativeCurrency: 'ETH',
    tokens: ['ETH', 'USDC'],
    alchemySupported: true,
    alchemyBaseUrl: 'https://arb-sepolia.g.alchemy.com/v2',
    blockExplorerUrl: 'https://sepolia.arbiscan.io',
  },
  {
    id: 11155420,
    name: 'Optimism Sepolia',
    csvName: 'Optimism Sepolia',
    isTestnet: true,
    nativeCurrency: 'ETH',
    tokens: ['ETH', 'USDC'],
    alchemySupported: true,
    alchemyBaseUrl: 'https://opt-sepolia.g.alchemy.com/v2',
    blockExplorerUrl: 'https://sepolia-optimism.etherscan.io',
  },
  {
    id: 97,
    name: 'BSC Testnet',
    csvName: 'BSC Testnet',
    isTestnet: true,
    nativeCurrency: 'BNB',
    tokens: ['BNB', 'USDC'],
    alchemySupported: true,
    alchemyBaseUrl: 'https://bnb-testnet.g.alchemy.com/v2',
    blockExplorerUrl: 'https://testnet.bscscan.com',
  },
  {
    id: 84532,
    name: 'Base Sepolia',
    csvName: 'Base Sepolia',
    isTestnet: true,
    nativeCurrency: 'ETH',
    tokens: ['ETH', 'USDC', 'USDT'],
    alchemySupported: true,
    alchemyBaseUrl: 'https://base-sepolia.g.alchemy.com/v2',
    blockExplorerUrl: 'https://sepolia.basescan.org',
  },
  {
    id: 59141,
    name: 'Linea Sepolia',
    csvName: 'Linea Sepolia',
    isTestnet: true,
    nativeCurrency: 'ETH',
    tokens: ['ETH', 'USDC'],
    alchemySupported: true,
    alchemyBaseUrl: 'https://linea-sepolia.g.alchemy.com/v2',
    blockExplorerUrl: 'https://sepolia.lineascan.build',
  },
  {
    id: 1328,
    name: 'Sei Testnet',
    csvName: 'Sei Testnet',
    isTestnet: true,
    nativeCurrency: 'SEI',
    tokens: ['SEI', 'USDC'],
    alchemySupported: true,
    alchemyBaseUrl: 'https://sei-testnet.g.alchemy.com/v2',
    blockExplorerUrl: 'https://testnet.seitrace.com',
  },
];

/** 全チェーン（メインネット + テストネット） */
export const ALL_CHAINS: ChainConfig[] = [...MAINNET_CHAINS, ...TESTNET_CHAINS];

/** chainId → ChainConfig のマップ */
export const CHAIN_CONFIG_MAP: Record<number, ChainConfig> = Object.fromEntries(
  ALL_CHAINS.map((c) => [c.id, c]),
);

/** Alchemy がサポートするチェーンのみ */
export const ALCHEMY_SUPPORTED_CHAIN_IDS: number[] = ALL_CHAINS
  .filter((c) => c.alchemySupported)
  .map((c) => c.id);

/** chainId から Alchemy Base URL を取得。未対応は null を返す */
export function getAlchemyBaseUrl(chainId: number): string | null {
  return CHAIN_CONFIG_MAP[chainId]?.alchemyBaseUrl ?? null;
}

/**
 * chainId → ANKR JSON-RPC エンドポイント用ネットワーク名
 * eth_getBalance / eth_call など標準 RPC で全チェーン（テストネット含む）に対応。
 */
export const ANKR_RPC_NETWORK: Partial<Record<number, string>> = {
  1:        'eth',
  137:      'polygon',
  42161:    'arbitrum',
  10:       'optimism',
  56:       'bsc',
  8453:     'base',
  59144:    'linea',
  1329:     'sei',
  11155111: 'eth_sepolia',
  80002:    'polygon_amoy',
  421614:   'arbitrum_sepolia',
  11155420: 'optimism_sepolia',
  97:       'bsc_testnet_chapel',
  84532:    'base_sepolia',
  59141:    'linea_sepolia',
};
