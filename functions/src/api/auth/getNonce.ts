import * as functions from 'firebase-functions';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { regionalFunctions, setCors } from '../../common/cors';

// getNonce は廃止。フロントエンドでnonce（UUID）を生成し、
// 署名メッセージに含めて verifyWalletConnect に送る方式に変更。
// 後方互換のため関数自体は残すが、Realtime DB への書き込みは行わない。
async function handleGetNonce(
  req: functions.https.Request,
  res: functions.Response,
  _env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  const address = (req.query.address as string)?.toLowerCase();
  if (!address || !ethers.isAddress(address)) {
    res.status(400).json({ error: 'Invalid wallet address' });
    return;
  }

  // フロントエンド側でnonceを生成する方式に移行済み。
  // 旧クライアント互換のためランダムnonceを返すが、DB保存はしない。
  const nonce = uuidv4();
  res.json({ nonce });
}

export const getNonceDev = regionalFunctions.https.onRequest((req, res) => handleGetNonce(req, res, 'dev'));
export const getNoncePrd = regionalFunctions.https.onRequest((req, res) => handleGetNonce(req, res, 'prd'));
