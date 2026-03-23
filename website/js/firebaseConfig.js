// 本番環境 (PRD) 用の設定
export const firebaseConfigTickets = {
  apiKey: "AIzaSyB3PubtL8qd3YwXOQpl0cJEqGBs6wAqlFg",
  authDomain: "ticketsystem-4bc88.firebaseapp.com",
  databaseURL: "https://ticketsystem-4bc88-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ticketsystem-4bc88",
  storageBucket: "ticketsystem-4bc88.firebasestorage.app",
  messagingSenderId: "961095544705",
  appId: "1:961095544705:web:fb05eef6906f73d5f78280"
};

// データベースの振り分け設定
export const firestoreDatabaseId = 'prd-firebase-store';
export const realtimeDatabaseEnvPath = 'prd';

export const firebaseConfig = firebaseConfigTickets;