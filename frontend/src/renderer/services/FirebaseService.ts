import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';
import { LoggingService } from './LoggingService';

const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
const PLATFORM = (import.meta.env.VITE_PLATFORM as string) || 'WEB';
const FUNCTIONS_REGION = (import.meta.env.VITE_FUNCTIONS_REGION as string) || 'asia-northeast1';
const FUNCTIONS_PROJECT_ID = (import.meta.env.VITE_FUNCTIONS_PROJECT_ID as string)
  || import.meta.env.VITE_FIREBASE_PROJECT_ID
  || '';
const CLOUD_FUNCTIONS_BASE_URL = (import.meta.env.VITE_FUNCTIONS_PUBLIC_URL as string)
  || (FUNCTIONS_PROJECT_ID
    ? `https://${FUNCTIONS_REGION}-${FUNCTIONS_PROJECT_ID}.cloudfunctions.net`
    : '');

const requiredEnvVars = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const missing = Object.entries(requiredEnvVars).filter(([, v]) => !v).map(([k]) => k);
if (missing.length > 0) {
  throw new Error(`Firebase環境変数が未設定です: ${missing.join(', ')}`);
}

const firebaseConfig = requiredEnvVars;

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
  getNonce: `getNonce${ENV_SUFFIX}`,
  verifyWalletConnect: `verifyWalletConnect${ENV_SUFFIX}`,
  verifyGoogleToken: `verifyGoogleToken${ENV_SUFFIX}`,
  verifyLineToken: `verifyLineToken${ENV_SUFFIX}`,
  startAsGuest: `startAsGuest${ENV_SUFFIX}`,
  linkLogin: `linkLogin${ENV_SUFFIX}`,
  exchangeGoogleAuthCode: `exchangeGoogleAuthCode${ENV_SUFFIX}`,
  linkGoogleAuthCode:     `linkGoogleAuthCode${ENV_SUFFIX}`,
getVersions: `getVersions${ENV_SUFFIX}`,
  getMaintenance: `getMaintenance${ENV_SUFFIX}`,
  getMaintenanceAll: `getMaintenanceAll${ENV_SUFFIX}`,
  getInformation: `getInformation${ENV_SUFFIX}`,
  getTransactions:        `getTransactions${ENV_SUFFIX}`,
  getUserTransactionDeltas: `getUserTransactionDeltas${ENV_SUFFIX}`,
  syncTransactions:       `syncTransactions${ENV_SUFFIX}`,
  updateTransactionState: `updateTransactionState${ENV_SUFFIX}`,
  addWatchedWallet:       `addWatchedWallet${ENV_SUFFIX}`,
  getWatchedWallets:      `getWatchedWallets${ENV_SUFFIX}`,
  deleteWatchedWallet:    `deleteWatchedWallet${ENV_SUFFIX}`,
  toggleWatchedWallet:    `toggleWatchedWallet${ENV_SUFFIX}`,
  updateWalletLabel:      `updateWalletLabel${ENV_SUFFIX}`,
  getContacts:            `getContacts${ENV_SUFFIX}`,
  addContact:             `addContact${ENV_SUFFIX}`,
  updateContact:          `updateContact${ENV_SUFFIX}`,
  deleteContact:          `deleteContact${ENV_SUFFIX}`,
  getLabels:              `getLabels${ENV_SUFFIX}`,
  createLabel:            `createLabel${ENV_SUFFIX}`,
  updateLabel:            `updateLabel${ENV_SUFFIX}`,
  deleteLabel:            `deleteLabel${ENV_SUFFIX}`,
  assignLabel:            `assignLabel${ENV_SUFFIX}`,
  removeLabel:            `removeLabel${ENV_SUFFIX}`,
  getPlanStatus:          `getPlanStatus${ENV_SUFFIX}`,
  createPlanCheckout:     `createPlanCheckout${ENV_SUFFIX}`,
  verifyPlanPayment:      `verifyPlanPayment${ENV_SUFFIX}`,
};

export function getApiUrl(apiName: string): string {
  const functionName = API_TO_FUNCTION[apiName] || apiName;

  if (FUNCTIONS_URL) {
    // ローカル開発: Cloud Functions 直アクセス
    return `${FUNCTIONS_URL}/${functionName}`;
  }

  if (isTauri || PLATFORM.toUpperCase() === 'SNAP') {
    // デスクトップ配布版では Hosting の rewrite が存在しないため絶対 URL を使う
    if (!CLOUD_FUNCTIONS_BASE_URL) {
      throw new Error('Desktop Functions URL is not configured');
    }
    return `${CLOUD_FUNCTIONS_BASE_URL}/${functionName}`;
  }

  // Web デプロイ環境: Hosting rewrite 経由
  return `/api/${apiName}`;
}

let app: FirebaseApp;
let auth: Auth;
let database: Database;

export function initFirebase() {
  app = initializeApp(firebaseConfig);

  if (isTauri) {
    // Tauri (tauri://localhost) では getAuth() のデフォルト永続化が
    // gapi_iframes を使い CORS エラーになるため、
    // browserLocalPersistence を明示して iframe を回避する。
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } else {
    auth = getAuth(app);
  }

  database = getDatabase(app);
  LoggingService.info(`Firebase initialized [${DB_ROOT}]`);
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
