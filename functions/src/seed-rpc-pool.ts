/**
 * Realtime DB に rpcPool の初期データを投入するスクリプト
 *
 * 使い方（functions/ ディレクトリから実行）:
 *   npx ts-node src/seed-rpc-pool.ts dev --key=/path/to/serviceAccountKey.json
 *   npx ts-node src/seed-rpc-pool.ts prd --key=/path/to/serviceAccountKey.json
 *
 * または GOOGLE_APPLICATION_CREDENTIALS 環境変数を設定:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
 *   npx ts-node src/seed-rpc-pool.ts dev
 */

import * as admin from 'firebase-admin';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildFirebaseAdminOptions } = require('../../scripts/lib/google-credentials.cjs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { normalizeEnvProfile } = require('../../scripts/lib/workspace-env.cjs');

const dbRootArg = process.argv[2];
process.env.WORKSPACE_ENV_PROFILE = normalizeEnvProfile(dbRootArg);
const DB_URL = process.env.APP_FIREBASE_DATABASE_URL ||
  process.env.FIREBASE_DATABASE_URL ||
  'https://token-batch-transfer-default-rtdb.asia-southeast1.firebasedatabase.app';

// サービスアカウントキーの自動検出
// 1. GOOGLE_APPLICATION_CREDENTIALS 環境変数
// 2. 引数で --key=path/to/key.json
// 3. なければ Application Default Credentials
const keyArg = process.argv.find(a => a.startsWith('--key='));
if (keyArg) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = keyArg.split('=')[1];
}

if (!admin.apps.length) {
  admin.initializeApp(buildFirebaseAdminOptions({ admin, databaseURL: DB_URL }));
}

/**
 * 2026-03-19 時点で eth_blockNumber に正常応答した PUBLIC RPC のみ収録
 * 優先順位: 安定性・CORS対応・レスポンス速度を考慮
 */
const RPC_POOL: Record<string, { urls: string[] }> = {
  // ══════════════════════════════════════════
  //  Mainnets
  // ══════════════════════════════════════════

  // Ethereum Mainnet (Chain ID: 1)
  '1': {
    urls: [
      'https://ethereum-rpc.publicnode.com',     // ✅ CORS対応・高安定
      'https://1rpc.io/eth',                     // ✅ プライバシー重視
      'https://eth-mainnet.public.blastapi.io',  // ✅ 高速
      'https://eth.drpc.org',                    // ✅ 分散RPC
      'https://rpc.mevblocker.io',               // ✅ MEV保護付き
    ],
  },

  // Arbitrum One (Chain ID: 42161)
  '42161': {
    urls: [
      'https://arbitrum-one-rpc.publicnode.com',  // ✅ CORS対応
      'https://arb1.arbitrum.io/rpc',             // ✅ 公式
      'https://1rpc.io/arb',                      // ✅
      'https://arbitrum.drpc.org',                // ✅
      'https://arbitrum-one.public.blastapi.io',  // ✅
    ],
  },

  // Base (Chain ID: 8453)
  '8453': {
    urls: [
      'https://mainnet.base.org',                // ✅ 公式
      'https://base-rpc.publicnode.com',         // ✅ CORS対応
      'https://1rpc.io/base',                    // ✅
      'https://base.drpc.org',                   // ✅
      'https://base-mainnet.public.blastapi.io', // ✅
    ],
  },

  // BNB Smart Chain (Chain ID: 56)
  '56': {
    urls: [
      'https://bsc-dataseed.binance.org',        // ✅ 公式
      'https://bsc-rpc.publicnode.com',          // ✅ CORS対応
      'https://1rpc.io/bnb',                     // ✅
      'https://bsc.drpc.org',                    // ✅
      'https://bsc-dataseed1.defibit.io',        // ✅
    ],
  },

  // Polygon (Chain ID: 137)
  '137': {
    urls: [
      'https://polygon-bor-rpc.publicnode.com',  // ✅ CORS対応・高安定
      'https://1rpc.io/matic',                   // ✅
      'https://polygon.drpc.org',                // ✅
      'https://polygon.gateway.tenderly.co',     // ✅
      'https://polygon.api.onfinality.io/public',// ✅
    ],
  },

  // Optimism (Chain ID: 10)
  '10': {
    urls: [
      'https://mainnet.optimism.io',             // ✅ 公式
      'https://optimism-rpc.publicnode.com',     // ✅ CORS対応
      'https://1rpc.io/op',                      // ✅
      'https://optimism.drpc.org',               // ✅
      'https://optimism.gateway.tenderly.co',    // ✅
    ],
  },

  // ══════════════════════════════════════════
  //  Testnets
  // ══════════════════════════════════════════

  // Ethereum Sepolia (Chain ID: 11155111)
  '11155111': {
    urls: [
      'https://ethereum-sepolia-rpc.publicnode.com', // ✅ CORS対応
      'https://1rpc.io/sepolia',                     // ✅
      'https://sepolia.drpc.org',                    // ✅
      'https://sepolia.gateway.tenderly.co',         // ✅
      'https://ethereum-sepolia.gateway.tenderly.co',// ✅ (alias)
    ],
  },

  // Arbitrum Sepolia (Chain ID: 421614)
  '421614': {
    urls: [
      'https://sepolia-rollup.arbitrum.io/rpc',      // ✅ 公式
      'https://arbitrum-sepolia-rpc.publicnode.com',  // ✅ CORS対応
      'https://arbitrum-sepolia.drpc.org',            // ✅
      'https://arbitrum-sepolia.gateway.tenderly.co', // ✅
      'https://sepolia-rollup.arbitrum.io/rpc',       // (公式再掲 — 候補少)
    ],
  },

  // Base Sepolia (Chain ID: 84532)
  '84532': {
    urls: [
      'https://sepolia.base.org',                    // ✅ 公式
      'https://base-sepolia-rpc.publicnode.com',     // ✅ CORS対応
      'https://base-sepolia.drpc.org',               // ✅
      'https://base-sepolia.gateway.tenderly.co',    // ✅
      'https://sepolia.base.org',                    // (公式再掲 — 候補少)
    ],
  },

  // BSC Testnet (Chain ID: 97)
  '97': {
    urls: [
      'https://data-seed-prebsc-1-s1.binance.org:8545', // ✅ 公式
      'https://bsc-testnet-rpc.publicnode.com',          // ✅ CORS対応
      'https://data-seed-prebsc-2-s1.binance.org:8545',  // ✅ 公式
      'https://data-seed-prebsc-1-s2.binance.org:8545',  // ✅ 公式
      'https://bsc-testnet.drpc.org',                    // ✅
    ],
  },

  // Polygon Amoy (Chain ID: 80002)
  '80002': {
    urls: [
      'https://rpc-amoy.polygon.technology',             // ✅ 公式
      'https://polygon-amoy-bor-rpc.publicnode.com',     // ✅ CORS対応
      'https://polygon-amoy.drpc.org',                   // ✅
      'https://polygon-amoy.gateway.tenderly.co',        // ✅
      'https://rpc-amoy.polygon.technology',             // (公式再掲 — 候補少)
    ],
  },

  // Optimism Sepolia (Chain ID: 11155420)
  '11155420': {
    urls: [
      'https://sepolia.optimism.io',                     // ✅ 公式
      'https://optimism-sepolia-rpc.publicnode.com',     // ✅ CORS対応
      'https://optimism-sepolia.drpc.org',               // ✅
      'https://optimism-sepolia.gateway.tenderly.co',    // ✅
      'https://sepolia.optimism.io',                     // (公式再掲 — 候補少)
    ],
  },

  // ══════════════════════════════════════════
  //  Linea
  // ══════════════════════════════════════════

  // Linea Mainnet (Chain ID: 59144)
  '59144': {
    urls: [
      'https://rpc.linea.build',                         // ✅ 公式
      'https://linea-rpc.publicnode.com',                // ✅ CORS対応
      'https://1rpc.io/linea',                           // ✅
      'https://linea.drpc.org',                          // ✅
      'https://linea-mainnet.public.blastapi.io',        // ✅
    ],
  },

  // Linea Sepolia (Chain ID: 59141)
  '59141': {
    urls: [
      'https://rpc.sepolia.linea.build',                 // ✅ 公式
      'https://linea-sepolia-rpc.publicnode.com',        // ✅ CORS対応
      'https://linea-sepolia.drpc.org',                  // ✅
    ],
  },

  // ══════════════════════════════════════════
  //  Sei
  // ══════════════════════════════════════════

  // Sei Mainnet (Chain ID: 1329)
  '1329': {
    urls: [
      'https://evm-rpc.sei-apis.com',                   // ✅ 公式
      'https://sei-rpc.publicnode.com',                  // ✅ CORS対応
      'https://sei-evm.drpc.org',                        // ✅
    ],
  },

  // Sei Testnet (Chain ID: 1328)
  '1328': {
    urls: [
      'https://evm-rpc-testnet.sei-apis.com',           // ✅ 公式
    ],
  },

  // ══════════════════════════════════════════
  //  TRON (EVM JSON-RPC)
  // ══════════════════════════════════════════

  // TRON Mainnet (Chain ID: 728126428)
  '728126428': {
    urls: [
      'https://api.trongrid.io/jsonrpc',                 // ✅ 公式
      'https://tron-mainnet.rpcfast.com',                // ✅
    ],
  },

  // TRON Nile Testnet (Chain ID: 3448148188)
  '3448148188': {
    urls: [
      'https://nile.trongrid.io/jsonrpc',                // ✅ 公式
    ],
  },
};

async function seed(dbRoot: string) {
  const db = admin.database();
  const poolRef = db.ref(`${dbRoot}/master/rpcPool`);

  const data: Record<string, any> = {};
  for (const [chainId, entry] of Object.entries(RPC_POOL)) {
    data[chainId] = {
      activeIndex: 0,
      urls: entry.urls,
      lastCheckedAt: new Date().toISOString(),
      lastHealthy: true,
    };
  }

  await poolRef.set(data);
  console.log(`✅ rpcPool seeded under ${dbRoot}/master/rpcPool (${Object.keys(data).length} chains)`);

  // master/networks の rpcUrl も1番目に合わせる
  const networksRef = db.ref(`${dbRoot}/master/networks`);
  const snap = await networksRef.once('value');
  if (snap.exists()) {
    const networks = snap.val();
    const arr: any[] = Array.isArray(networks) ? networks : Object.values(networks);
    for (let i = 0; i < arr.length; i++) {
      const n = arr[i];
      if (n && RPC_POOL[n.chainId]) {
        const bestUrl = RPC_POOL[n.chainId].urls[0];
        if (n.rpcUrl !== bestUrl) {
          await networksRef.child(String(i)).update({ rpcUrl: bestUrl });
          console.log(`  Chain ${n.chainId} (${n.name}): rpcUrl → ${bestUrl}`);
        }
      }
    }
  }
}

const env = process.argv.find(a => a === 'dev' || a === 'prd') || 'dev';
if (env !== 'dev' && env !== 'prd') {
  console.error('Usage: npx ts-node src/seed-rpc-pool.ts [dev|prd] --key=/path/to/key.json');
  process.exit(1);
}

seed(env)
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  });
