import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

// dev/prd の切り替え（ビルド時に決定）
export const DB_ROOT: 'dev' | 'prd' = import.meta.env.VITE_DB_ROOT === 'prd' ? 'prd' : 'dev';
export const FUNCTIONS_URL: string = import.meta.env.VITE_FUNCTIONS_URL || '';

/**
 * API エンドポイント URL を取得
 * - VITE_FUNCTIONS_URL が空（デプロイ済み環境）: /api/xxx → Hosting rewrite
 * - VITE_FUNCTIONS_URL が設定済み（ローカル開発）: Cloud Functions 直アクセス
 */
const ENV_SUFFIX = DB_ROOT === 'prd' ? 'Prd' : 'Dev';
const API_TO_FUNCTION: Record<string, string> = {
  getNonce: 'getNonce',
  verifyWalletConnect: 'verifyWalletConnect',
  verifyGoogleToken: 'verifyGoogleToken',
  verifyLineToken: 'verifyLineToken',
  startAsGuest: 'startAsGuest',
  linkLogin: 'linkLogin',
  createCheckoutSession: `createCheckoutSession${ENV_SUFFIX}`,
  verifyCheckoutSession: `verifyCheckoutSession${ENV_SUFFIX}`,
  cancelSubscription: `cancelSubscription${ENV_SUFFIX}`,
  reactivateSubscription: `reactivateSubscription${ENV_SUFFIX}`,
  reportUsage: `reportUsage${ENV_SUFFIX}`,
  stripeWebhook: `stripeWebhook${ENV_SUFFIX}`,
  getPointsSummary: `getPointsSummary${ENV_SUFFIX}`,
  getVersions: `getVersions${ENV_SUFFIX}`,
  getMaintenance: `getMaintenance${ENV_SUFFIX}`,
  getMaintenanceAll: `getMaintenanceAll${ENV_SUFFIX}`,
  getInformation: `getInformation${ENV_SUFFIX}`,
};

export function getApiUrl(apiName: string): string {
  if (!FUNCTIONS_URL) {
    // デプロイ済み環境: Hosting rewrite 経由
    return `/api/${apiName}`;
  }
  // ローカル開発: Cloud Functions 直アクセス
  const functionName = API_TO_FUNCTION[apiName] || apiName;
  return `${FUNCTIONS_URL}/${functionName}`;
}

let app: FirebaseApp;
let auth: Auth;
let database: Database;

export function initFirebase() {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  database = getDatabase(app);
  console.log(`Firebase initialized [${DB_ROOT}]`);
}

export function getFirebaseAuth(): Auth {
  if (!auth) throw new Error('Firebase not initialized');
  return auth;
}

export function getFirebaseDatabase(): Database {
  if (!database) throw new Error('Firebase not initialized');
  return database;
}

/**
 * 現在のユーザーUIDを取得。ユーザー別DBパスの構築に使用。
 */
export function getCurrentUid(): string {
  const user = auth?.currentUser;
  if (!user) throw new Error('認証されていません');
  return user.uid;
}

/**
 * ユーザー別のDBルートパスを取得: ${DB_ROOT}/users/${uid}
 */
export function getUserDbRoot(): string {
  return `${DB_ROOT}/users/${getCurrentUid()}`;
}
