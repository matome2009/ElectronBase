#!/usr/bin/env node
/**
 * master-data-dev.json を Firebase Realtime Database に同期するスクリプト
 * 実行: node scripts/sync-master-data.js [--env dev|prd|both]
 *
 * オプション:
 *   --env dev   : dev のみ更新 (デフォルト)
 *   --env prd   : prd のみ更新
 *   --env both  : dev と prd 両方更新
 */
const admin = require('../functions/node_modules/firebase-admin');
const path = require('path');
const fs = require('fs');
const { buildFirebaseAdminOptions } = require('./lib/google-credentials.cjs');
const { normalizeEnvProfile } = require('./lib/workspace-env.cjs');

// 引数解析
const envArgIndex = process.argv.indexOf('--env');
const targetEnv = envArgIndex !== -1 ? process.argv[envArgIndex + 1] : 'dev';
if (!['dev', 'prd', 'both'].includes(targetEnv)) {
  console.error('--env は dev / prd / both のいずれかを指定してください');
  process.exit(1);
}

process.env.WORKSPACE_ENV_PROFILE = normalizeEnvProfile(targetEnv === 'both' ? 'dev' : targetEnv);

// Firebase 初期化
const databaseURL = process.env.FIREBASE_DATABASE_URL ||
  'https://token-batch-transfer-default-rtdb.asia-southeast1.firebasedatabase.app';

admin.initializeApp(buildFirebaseAdminOptions({ admin, databaseURL }));

// master-data-dev.json を読み込む
const dataPath = path.join(__dirname, '../functions/master-data-dev.json');
if (!fs.existsSync(dataPath)) {
  console.error(`ファイルが見つかりません: ${dataPath}`);
  process.exit(1);
}

const masterData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const { networks, tokens } = masterData;

if (!networks || !tokens) {
  console.error('master-data-dev.json に networks または tokens が含まれていません');
  process.exit(1);
}

async function syncEnv(env) {
  const db = admin.database();
  await db.ref(`${env}/master/networks`).set(networks);
  await db.ref(`${env}/master/tokens`).set(tokens);
  console.log(`✅ [${env}] networks: ${networks.length}件, tokens: ${tokens.length}件 を同期しました`);
}

async function main() {
  const targets = targetEnv === 'both' ? ['dev', 'prd'] : [targetEnv];
  for (const env of targets) {
    await syncEnv(env);
  }
  console.log('同期完了');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
