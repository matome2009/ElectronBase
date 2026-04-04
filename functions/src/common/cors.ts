import * as functions from 'firebase-functions';

export const REGION = 'asia-northeast1';
const functionsProjectId = process.env.APP_FIREBASE_PROJECT_ID
  || process.env.FIREBASE_PROJECT_ID
  || process.env.GCLOUD_PROJECT
  || process.env.GCP_PROJECT;

// Prefer an explicit override, otherwise fall back to the App Engine default
// service account to avoid depending on the Compute Engine default account.
export const FUNCTIONS_SERVICE_ACCOUNT = process.env.FUNCTIONS_SERVICE_ACCOUNT
  || (functionsProjectId ? `${functionsProjectId}@appspot.gserviceaccount.com` : undefined);

export const regionalFunctions = FUNCTIONS_SERVICE_ACCOUNT
  ? functions.runWith({ serviceAccount: FUNCTIONS_SERVICE_ACCOUNT }).region(REGION)
  : functions.region(REGION);

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function setCors(res: functions.Response): void {
  Object.entries(corsHeaders).forEach(([k, v]) => res.set(k, v));
}
