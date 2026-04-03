// このファイルの名前を 'firebaseConfig.js' に変更し、
// 自身のFirebaseプロジェクトの設定値を入力してください。
// 'firebaseConfig.js' は .gitignore によりGitの管理対象外です。

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