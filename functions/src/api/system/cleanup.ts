import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { REGION } from '../../common/cors';
import { deleteInactiveGuestUsers } from '../../common/db';

// ============================================================
// ゲストユーザー自動クリーンアップ（毎月1日 AM3:00 JST）
// 対象: login_t に紐付けなし かつ last_login_at が1年以上前
// ============================================================

export const cleanupInactiveGuestUsersDev = functions
  .region(REGION)
  .pubsub.schedule('0 18 1 * *') // UTC 18:00 = JST 03:00
  .timeZone('UTC')
  .onRun(async () => {
    const deleted = await deleteInactiveGuestUsers('dev');
    functions.logger.info(`[cleanupInactiveGuestUsers][dev] deleted ${deleted} guest users`);
  });

export const cleanupInactiveGuestUsersPrd = functions
  .region(REGION)
  .pubsub.schedule('0 18 1 * *')
  .timeZone('UTC')
  .onRun(async () => {
    const deleted = await deleteInactiveGuestUsers('prd');
    functions.logger.info(`[cleanupInactiveGuestUsers][prd] deleted ${deleted} guest users`);
  });

// ============================================================
// 使用済みnonce自動クリーンアップ（毎日 AM4:00 JST）
// 24時間以上前のnonceを削除
// ============================================================

async function cleanupUsedNonces(env: 'dev' | 'prd'): Promise<number> {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const snap = await admin.database().ref(`${env}/usedNonces`).orderByValue().endAt(cutoff).get();
  if (!snap.exists()) return 0;
  const updates: Record<string, null> = {};
  snap.forEach((child) => { updates[child.key!] = null; });
  await admin.database().ref(`${env}/usedNonces`).update(updates);
  return Object.keys(updates).length;
}

export const cleanupUsedNoncesDev = functions
  .region(REGION)
  .pubsub.schedule('0 19 * * *') // UTC 19:00 = JST 04:00
  .timeZone('UTC')
  .onRun(async () => {
    const deleted = await cleanupUsedNonces('dev');
    functions.logger.info(`[cleanupUsedNonces][dev] deleted ${deleted} used nonces`);
  });

export const cleanupUsedNoncesPrd = functions
  .region(REGION)
  .pubsub.schedule('0 19 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const deleted = await cleanupUsedNonces('prd');
    functions.logger.info(`[cleanupUsedNonces][prd] deleted ${deleted} used nonces`);
  });
