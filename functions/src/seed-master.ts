/**
 * Realtime DB にマスターデータ（networks / tokens / rpcPool）を投入するスクリプト
 *
 * 使い方（functions/ ディレクトリから実行）:
 *   npx ts-node src/seed-master.ts dev
 *   npx ts-node src/seed-master.ts prd
 *   npx ts-node src/seed-master.ts dev --key=/path/to/serviceAccountKey.json
 */

import * as admin from 'firebase-admin';
import { execSync } from 'child_process';

const DB_URL = 'https://token-batch-transfer-default-rtdb.asia-southeast1.firebasedatabase.app';

const keyArg = process.argv.find(a => a.startsWith('--key='));
const keyPath = keyArg ? keyArg.split('=')[1] : process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!admin.apps.length) {
  if (keyPath) {
    const serviceAccount = require(keyPath.startsWith('/') ? keyPath : require('path').resolve(process.cwd(), keyPath));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: DB_URL,
    });
  } else {
    // Firebase CLI のアクセストークンを使用
    try {
      const tokenJson = execSync('npx firebase login:ci --no-localhost 2>/dev/null || echo ""', { encoding: 'utf-8' }).trim();
      // Application Default Credentials を試す前に、refreshToken 方式を試す
    } catch { /* ignore */ }
    // google-application-default を使う
    const { applicationDefault } = require('google-auth-library');
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: DB_URL,
    });
  }
}

const CONTRACT_ADDRESS = '0xDDACf7FF47e19b533ecd24876e582d48014f7456';

// ══════════════════════════════════════════
// Networks
// ══════════════════════════════════════════
const NETWORKS = [
  // Mainnets
  { id: '11111111-1111-1111-1111-111111111111', name: 'Ethereum Mainnet', chainId: '1', rpcUrl: 'https://ethereum-rpc.publicnode.com', multiSendContractAddress: CONTRACT_ADDRESS, isActive: true, isTestnet: false },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Polygon', chainId: '137', rpcUrl: 'https://polygon-bor-rpc.publicnode.com', multiSendContractAddress: CONTRACT_ADDRESS, isActive: true, isTestnet: false },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Arbitrum One', chainId: '42161', rpcUrl: 'https://arbitrum-one-rpc.publicnode.com', multiSendContractAddress: CONTRACT_ADDRESS, isActive: true, isTestnet: false },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Optimism', chainId: '10', rpcUrl: 'https://optimism-rpc.publicnode.com', multiSendContractAddress: CONTRACT_ADDRESS, isActive: true, isTestnet: false },
  { id: '55555555-5555-5555-5555-555555555555', name: 'BSC (Binance Smart Chain)', chainId: '56', rpcUrl: 'https://bsc-rpc.publicnode.com', multiSendContractAddress: CONTRACT_ADDRESS, isActive: true, isTestnet: false },
  // Testnets
  { id: '11111111-1111-1111-1111-111111111112', name: 'Ethereum Sepolia', chainId: '11155111', rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com', multiSendContractAddress: CONTRACT_ADDRESS, isActive: true, isTestnet: true },
  { id: '22222222-2222-2222-2222-222222222223', name: 'Polygon Amoy', chainId: '80002', rpcUrl: 'https://polygon-amoy-bor-rpc.publicnode.com', multiSendContractAddress: CONTRACT_ADDRESS, isActive: true, isTestnet: true },
  { id: '33333333-3333-3333-3333-333333333334', name: 'Arbitrum Sepolia', chainId: '421614', rpcUrl: 'https://arbitrum-sepolia-rpc.publicnode.com', multiSendContractAddress: CONTRACT_ADDRESS, isActive: true, isTestnet: true },
  { id: '44444444-4444-4444-4444-444444444445', name: 'Optimism Sepolia', chainId: '11155420', rpcUrl: 'https://optimism-sepolia-rpc.publicnode.com', multiSendContractAddress: CONTRACT_ADDRESS, isActive: true, isTestnet: true },
  { id: '55555555-5555-5555-5555-555555555556', name: 'BSC Testnet', chainId: '97', rpcUrl: 'https://bsc-testnet-rpc.publicnode.com', multiSendContractAddress: CONTRACT_ADDRESS, isActive: true, isTestnet: true },
  // Linea
  { id: '77777777-7777-7777-7777-777777777777', name: 'Linea', chainId: '59144', rpcUrl: 'https://rpc.linea.build', multiSendContractAddress: CONTRACT_ADDRESS, isActive: true, isTestnet: false },
  { id: '77777777-7777-7777-7777-777777777778', name: 'Linea Sepolia', chainId: '59141', rpcUrl: 'https://rpc.sepolia.linea.build', multiSendContractAddress: CONTRACT_ADDRESS, isActive: true, isTestnet: true },
  // Sei
  { id: '88888888-8888-8888-8888-888888888888', name: 'Sei', chainId: '1329', rpcUrl: 'https://evm-rpc.sei-apis.com', multiSendContractAddress: CONTRACT_ADDRESS, isActive: true, isTestnet: false },
  { id: '88888888-8888-8888-8888-888888888889', name: 'Sei Testnet', chainId: '1328', rpcUrl: 'https://evm-rpc-testnet.sei-apis.com', multiSendContractAddress: CONTRACT_ADDRESS, isActive: true, isTestnet: true },
  // TRON
  { id: '99999999-9999-9999-9999-999999999999', name: 'TRON', chainId: '728126428', rpcUrl: 'https://api.trongrid.io/jsonrpc', multiSendContractAddress: CONTRACT_ADDRESS, isActive: true, isTestnet: false },
  { id: '99999999-9999-9999-9999-99999999999a', name: 'TRON Nile Testnet', chainId: '3448148188', rpcUrl: 'https://nile.trongrid.io/jsonrpc', multiSendContractAddress: CONTRACT_ADDRESS, isActive: true, isTestnet: true },
];

// ══════════════════════════════════════════
// Tokens
// ══════════════════════════════════════════
const TOKENS = [
  {
    id: 'token-linea-eth',
    name: 'Ethereum (Linea)',
    symbol: 'ETH',
    isActive: true,
    addressByNetwork: {
      '59144': '0x0000000000000000000000000000000000000000',
      '59141': '0x0000000000000000000000000000000000000000',
    },
    decimalsByNetwork: { '59144': 18, '59141': 18 },
  },
  {
    id: 'token-sei',
    name: 'Sei',
    symbol: 'SEI',
    isActive: true,
    addressByNetwork: {
      '1329': '0x0000000000000000000000000000000000000000',
      '1328': '0x0000000000000000000000000000000000000000',
    },
    decimalsByNetwork: { '1329': 18, '1328': 18 },
  },
  {
    id: 'token-trx',
    name: 'TRON',
    symbol: 'TRX',
    isActive: true,
    addressByNetwork: {
      '728126428': '0x0000000000000000000000000000000000000000',
      '3448148188': '0x0000000000000000000000000000000000000000',
    },
    decimalsByNetwork: { '728126428': 6, '3448148188': 6 },
  },
  {
    id: 'token-usdc',
    name: 'USD Coin',
    symbol: 'USDC',
    isActive: true,
    addressByNetwork: {
      '1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      '137': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      '42161': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      '10': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      '56': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      '11155111': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      '80002': '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
      '421614': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
      '11155420': '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
      '97': '0x64544969ed7EBf5f083679233325356EbE738930',
      '59144': '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
      '59141': '0xFEce4462D57bD51A6A552365A011b95f0E16d9B7',
      '1329': '0xe15fC38F6D8c56aF07bbCBe3BAf5708A2Bf42392',
      '1328': '0x4fCF1784B31630811181f670Aea7A7bEF803eaED',
    },
    decimalsByNetwork: {
      '1': 6, '137': 6, '42161': 6, '10': 6, '56': 18,
      '11155111': 6, '80002': 6, '421614': 6, '11155420': 6, '97': 18,
      '59144': 6, '59141': 6, '1329': 6, '1328': 6,
    },
  },
  {
    id: 'token-usdt',
    name: 'Tether USD',
    symbol: 'USDT',
    isActive: true,
    addressByNetwork: {
      '1': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      '137': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      '42161': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      '10': '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      '56': '0x55d398326f99059fF775485246999027B3197955',
      '11155111': '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
      '84532': '0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a',
    },
    decimalsByNetwork: {
      '1': 6, '137': 6, '42161': 6, '10': 6, '56': 18,
      '11155111': 6, '84532': 6,
    },
  },
  {
    id: 'token-jpyc',
    name: 'JPY Coin',
    symbol: 'JPYC',
    isActive: true,
    addressByNetwork: {
      '1': '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
      '137': '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
      '42161': '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
      '11155111': '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
    },
    decimalsByNetwork: {
      '1': 18, '137': 18, '42161': 18, '11155111': 18,
    },
  },
];

// ══════════════════════════════════════════
// RPC Pool (seed-rpc-pool.ts と同じデータ)
// ══════════════════════════════════════════
const RPC_POOL: Record<string, { urls: string[] }> = {
  '1': { urls: ['https://ethereum-rpc.publicnode.com', 'https://1rpc.io/eth', 'https://eth-mainnet.public.blastapi.io', 'https://eth.drpc.org', 'https://rpc.mevblocker.io'] },
  '42161': { urls: ['https://arbitrum-one-rpc.publicnode.com', 'https://arb1.arbitrum.io/rpc', 'https://1rpc.io/arb', 'https://arbitrum.drpc.org', 'https://arbitrum-one.public.blastapi.io'] },
  '8453': { urls: ['https://mainnet.base.org', 'https://base-rpc.publicnode.com', 'https://1rpc.io/base', 'https://base.drpc.org', 'https://base-mainnet.public.blastapi.io'] },
  '56': { urls: ['https://bsc-dataseed.binance.org', 'https://bsc-rpc.publicnode.com', 'https://1rpc.io/bnb', 'https://bsc.drpc.org', 'https://bsc-dataseed1.defibit.io'] },
  '137': { urls: ['https://polygon-bor-rpc.publicnode.com', 'https://1rpc.io/matic', 'https://polygon.drpc.org', 'https://polygon.gateway.tenderly.co', 'https://polygon.api.onfinality.io/public'] },
  '10': { urls: ['https://mainnet.optimism.io', 'https://optimism-rpc.publicnode.com', 'https://1rpc.io/op', 'https://optimism.drpc.org', 'https://optimism.gateway.tenderly.co'] },
  '11155111': { urls: ['https://ethereum-sepolia-rpc.publicnode.com', 'https://1rpc.io/sepolia', 'https://sepolia.drpc.org', 'https://sepolia.gateway.tenderly.co'] },
  '421614': { urls: ['https://sepolia-rollup.arbitrum.io/rpc', 'https://arbitrum-sepolia-rpc.publicnode.com', 'https://arbitrum-sepolia.drpc.org'] },
  '84532': { urls: ['https://sepolia.base.org', 'https://base-sepolia-rpc.publicnode.com', 'https://base-sepolia.drpc.org'] },
  '97': { urls: ['https://data-seed-prebsc-1-s1.binance.org:8545', 'https://bsc-testnet-rpc.publicnode.com', 'https://bsc-testnet.drpc.org'] },
  '80002': { urls: ['https://rpc-amoy.polygon.technology', 'https://polygon-amoy-bor-rpc.publicnode.com', 'https://polygon-amoy.drpc.org'] },
  '11155420': { urls: ['https://sepolia.optimism.io', 'https://optimism-sepolia-rpc.publicnode.com', 'https://optimism-sepolia.drpc.org'] },
  '59144': { urls: ['https://rpc.linea.build', 'https://linea-rpc.publicnode.com', 'https://1rpc.io/linea'] },
  '59141': { urls: ['https://rpc.sepolia.linea.build', 'https://linea-sepolia-rpc.publicnode.com'] },
  '1329': { urls: ['https://evm-rpc.sei-apis.com', 'https://sei-rpc.publicnode.com'] },
  '1328': { urls: ['https://evm-rpc-testnet.sei-apis.com'] },
  '728126428': { urls: ['https://api.trongrid.io/jsonrpc', 'https://tron-mainnet.rpcfast.com'] },
  '3448148188': { urls: ['https://nile.trongrid.io/jsonrpc'] },
};

async function seed(dbRoot: string) {
  const db = admin.database();
  const masterRef = db.ref(`${dbRoot}/master`);

  // 1. Networks
  await masterRef.child('networks').set(NETWORKS);
  console.log(`✅ networks seeded (${NETWORKS.length} entries)`);

  // 2. Tokens
  await masterRef.child('tokens').set(TOKENS);
  console.log(`✅ tokens seeded (${TOKENS.length} entries)`);

  // 3. RPC Pool
  const poolData: Record<string, any> = {};
  for (const [chainId, entry] of Object.entries(RPC_POOL)) {
    poolData[chainId] = {
      activeIndex: 0,
      urls: entry.urls,
      lastCheckedAt: new Date().toISOString(),
      lastHealthy: true,
    };
  }
  await masterRef.child('rpcPool').set(poolData);
  console.log(`✅ rpcPool seeded (${Object.keys(poolData).length} chains)`);

  console.log(`\n✅ All master data seeded under ${dbRoot}/master`);
}

const env = process.argv.find(a => a === 'dev' || a === 'prd') || 'dev';
seed(env)
  .then(() => { console.log('Done.'); process.exit(0); })
  .catch((e) => { console.error('Failed:', e); process.exit(1); });
