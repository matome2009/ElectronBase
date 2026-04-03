import * as functions from 'firebase-functions';

export const REGION = 'asia-northeast1';

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function setCors(res: functions.Response): void {
  Object.entries(corsHeaders).forEach(([k, v]) => res.set(k, v));
}
