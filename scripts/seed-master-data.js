#!/usr/bin/env node
/**
 * Firebase Realtime Database にマスターデータを投入するスクリプト
 * 実行: node scripts/seed-master-data.js
 */
const admin = require('../functions/node_modules/firebase-admin');
const { buildFirebaseAdminOptions } = require('./lib/google-credentials.cjs');
const { getWorkspaceEnvProfile } = require('./lib/workspace-env.cjs');

process.env.WORKSPACE_ENV_PROFILE = getWorkspaceEnvProfile(process.argv[2]);

const databaseURL = process.env.FIREBASE_DATABASE_URL ||
  'https://token-batch-transfer-default-rtdb.asia-southeast1.firebasedatabase.app';

admin.initializeApp(buildFirebaseAdminOptions({ admin, databaseURL }));

const networks = [
  // ===== MAINNETS =====
  { id: 'ethereum', name: 'Ethereum Mainnet', chainId: '1', rpcUrl: 'https://eth.llamarpc.com', isActive: true, isTestnet: false },
  { id: 'arbitrum', name: 'Arbitrum One', chainId: '42161', rpcUrl: 'https://arb1.arbitrum.io/rpc', isActive: true, isTestnet: false },
  { id: 'base', name: 'Base', chainId: '8453', rpcUrl: 'https://mainnet.base.org', isActive: true, isTestnet: false },
  { id: 'bsc', name: 'BNB Smart Chain', chainId: '56', rpcUrl: 'https://bsc-dataseed.binance.org', isActive: true, isTestnet: false },
  { id: 'polygon', name: 'Polygon', chainId: '137', rpcUrl: 'https://polygon-rpc.com', isActive: true, isTestnet: false },
  { id: 'optimism', name: 'Optimism', chainId: '10', rpcUrl: 'https://mainnet.optimism.io', isActive: true, isTestnet: false },
  // ===== TESTNETS =====
  { id: 'ethereum-sepolia', name: 'Ethereum Sepolia', chainId: '11155111', rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com', isActive: true, isTestnet: true },
  { id: 'arbitrum-sepolia', name: 'Arbitrum Sepolia', chainId: '421614', rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc', isActive: true, isTestnet: true },
  { id: 'base-sepolia', name: 'Base Sepolia', chainId: '84532', rpcUrl: 'https://sepolia.base.org', isActive: true, isTestnet: true },
  { id: 'bsc-testnet', name: 'BSC Testnet', chainId: '97', rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545', isActive: true, isTestnet: true },
  { id: 'polygon-amoy', name: 'Polygon Amoy', chainId: '80002', rpcUrl: 'https://rpc-amoy.polygon.technology', isActive: true, isTestnet: true },
  { id: 'optimism-sepolia', name: 'Optimism Sepolia', chainId: '11155420', rpcUrl: 'https://sepolia.optimism.io', isActive: true, isTestnet: true },
];

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const tokens = [
  // ===== ネイティブトークン =====
  {
    id: 'eth', name: 'Ether', symbol: 'ETH', decimals: 18, isActive: true,
    addressByNetwork: {
      '1': ZERO_ADDRESS,
      '42161': ZERO_ADDRESS,
      '8453': ZERO_ADDRESS,
      '10': ZERO_ADDRESS,
      '11155111': ZERO_ADDRESS,
      '421614': ZERO_ADDRESS,
      '84532': ZERO_ADDRESS,
      '11155420': ZERO_ADDRESS,
    }
  },
  {
    id: 'bnb', name: 'BNB', symbol: 'BNB', decimals: 18, isActive: true,
    addressByNetwork: {
      '56': ZERO_ADDRESS,
      '97': ZERO_ADDRESS,
    }
  },
  {
    id: 'pol', name: 'POL', symbol: 'POL', decimals: 18, isActive: true,
    addressByNetwork: {
      '137': ZERO_ADDRESS,
      '80002': ZERO_ADDRESS,
    }
  },
  // ===== ERC20 =====
  {
    id: 'usdc', name: 'USD Coin', symbol: 'USDC', decimals: 6, isActive: true,
    addressByNetwork: {
      '1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      '42161': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      '8453': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      '56': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      '137': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      '10': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      '11155111': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      '421614': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
      '84532': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      '97': '0x64544969ed7EBf5f083679233325356EbE738930',
      '80002': '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
      '11155420': '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    }
  },
  {
    id: 'jpyc', name: 'JPY Coin', symbol: 'JPYC', decimals: 18, isActive: true,
    addressByNetwork: {
      '1': '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
      '137': '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
      '11155111': '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29',
      '80002': '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29',
    }
  },
  {
    id: 'usdt', name: 'Tether USD', symbol: 'USDT', decimals: 6, isActive: true,
    addressByNetwork: {
      '1': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      '42161': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      '8453': '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
      '56': '0x55d398326f99059fF775485246999027B3197955',
      '137': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      '10': '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      '11155111': '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
      '97': '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
    },
    decimalsByNetwork: {
      '1': 6,
      '42161': 6,
      '8453': 6,
      '56': 18,
      '137': 6,
      '10': 6,
      '11155111': 6,
      '97': 18,
    }
  },
];

async function main() {
  const db = admin.database();
  // dev と prd 両方に投入
  await db.ref('dev/master/networks').set(networks);
  await db.ref('dev/master/tokens').set(tokens);
  await db.ref('prd/master/networks').set(networks);
  await db.ref('prd/master/tokens').set(tokens);
  // 古い master/ を削除
  await db.ref('master').remove();
  console.log(`✅ Networks: ${networks.length}件`);
  console.log(`✅ Tokens: ${tokens.length}件`);
  console.log('dev/master と prd/master に投入完了');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
