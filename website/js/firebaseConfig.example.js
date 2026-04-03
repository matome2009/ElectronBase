// 静的 website 用の参考サンプルです。
// 実運用では編集せず、ルート .env から生成してください。
// npm run env:sync:website

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.REGION.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firestore データベース ID（Firebase コンソールで確認）
export const firestoreDatabaseId = 'YOUR_FIRESTORE_DATABASE_ID'; // 例: 'prd-firebase-store'

// Realtime Database の環境パス（'dev' または 'prd'）
export const realtimeDatabaseEnvPath = 'prd'; // 本番: 'prd' / 開発: 'dev'
