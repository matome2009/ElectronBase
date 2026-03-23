import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const REGION = 'asia-northeast1';

/**
 * RPC プール構造（Realtime DB: {dbRoot}/master/rpcPool/{chainId}）
 *
 * {
 *   activeIndex: 0,           // 現在使用中のRPCインデックス
 *   urls: [                   // 優先順位順のRPC URLリスト
 *     "https://ethereum-rpc.publicnode.com",
 *     "https://eth.llamarpc.com",
 *     ...
 *   ],
 *   lastCheckedAt: "2026-03-19T12:00:00Z",
 *   lastHealthy: true
 * }
 */

interface RpcPoolEntry {
  activeIndex: number;
  urls: string[];
  lastCheckedAt?: string;
  lastHealthy?: boolean;
}

/**
 * RPC エンドポイントの死活監視
 * eth_blockNumber を呼んで応答があるかチェック（タイムアウト 5秒）
 */
async function isRpcHealthy(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return false;

    const json = await response.json();
    // result が hex のブロック番号であれば正常
    return !!json.result && json.result.startsWith('0x');
  } catch {
    return false;
  }
}

/**
 * 全チェーンの RPC ヘルスチェックを実行し、NGなら次の候補にローテーション
 */
async function runHealthCheck(dbRoot: string): Promise<{ checked: number; rotated: string[] }> {
  const db = admin.database();
  const poolRef = db.ref(`${dbRoot}/master/rpcPool`);
  const networksRef = db.ref(`${dbRoot}/master/networks`);

  const poolSnap = await poolRef.once('value');
  if (!poolSnap.exists()) {
    console.log(`[RpcHealthCheck] No rpcPool found under ${dbRoot}/master/rpcPool`);
    return { checked: 0, rotated: [] };
  }

  const pool: Record<string, RpcPoolEntry> = poolSnap.val();
  const rotated: string[] = [];
  let checked = 0;

  for (const [chainId, entry] of Object.entries(pool)) {
    if (!entry.urls || entry.urls.length === 0) continue;
    checked++;

    const currentIndex = entry.activeIndex ?? 0;
    const currentUrl = entry.urls[currentIndex];

    console.log(`[RpcHealthCheck] Chain ${chainId}: checking ${currentUrl} (index ${currentIndex})`);
    const healthy = await isRpcHealthy(currentUrl);

    if (healthy) {
      // 正常 → ステータス更新のみ
      await poolRef.child(chainId).update({
        lastCheckedAt: new Date().toISOString(),
        lastHealthy: true,
      });
      console.log(`[RpcHealthCheck] Chain ${chainId}: ✅ healthy`);
    } else {
      // 異常 → 次の候補にローテーション
      console.log(`[RpcHealthCheck] Chain ${chainId}: ❌ unhealthy, rotating...`);

      // 全候補を順に試す（現在の次から一周）
      let newIndex = currentIndex;
      let found = false;

      for (let i = 1; i < entry.urls.length; i++) {
        const candidateIndex = (currentIndex + i) % entry.urls.length;
        const candidateUrl = entry.urls[candidateIndex];
        console.log(`[RpcHealthCheck] Chain ${chainId}: trying candidate ${candidateIndex} → ${candidateUrl}`);

        if (await isRpcHealthy(candidateUrl)) {
          newIndex = candidateIndex;
          found = true;
          console.log(`[RpcHealthCheck] Chain ${chainId}: ✅ switched to index ${newIndex}`);
          break;
        }
      }

      // rpcPool を更新
      await poolRef.child(chainId).update({
        activeIndex: newIndex,
        lastCheckedAt: new Date().toISOString(),
        lastHealthy: found,
      });

      // master/networks の rpcUrl も書き換え
      const newUrl = entry.urls[newIndex];
      const networksSnap = await networksRef.once('value');
      if (networksSnap.exists()) {
        const networks: any[] = networksSnap.val();
        const arr = Array.isArray(networks) ? networks : Object.values(networks);
        let updated = false;
        for (let i = 0; i < arr.length; i++) {
          if (arr[i] && arr[i].chainId === chainId && arr[i].rpcUrl !== newUrl) {
            await networksRef.child(String(i)).update({ rpcUrl: newUrl });
            updated = true;
          }
        }
        if (updated) {
          rotated.push(chainId);
          console.log(`[RpcHealthCheck] Chain ${chainId}: master/networks rpcUrl → ${newUrl}`);
        }
      }

      if (!found) {
        console.warn(`[RpcHealthCheck] Chain ${chainId}: ⚠️ ALL RPCs unhealthy!`);
      }
    }
  }

  return { checked, rotated };
}

// ============================================================
// Scheduled Functions（1分ごと）
// ============================================================

export const rpcHealthCheckDev = functions
  .region(REGION)
  .pubsub.schedule('every 1 minutes')
  .onRun(async () => {
    const result = await runHealthCheck('dev');
    console.log(`[RpcHealthCheck DEV] Done: checked=${result.checked}, rotated=[${result.rotated.join(',')}]`);
  });

export const rpcHealthCheckPrd = functions
  .region(REGION)
  .pubsub.schedule('every 1 minutes')
  .onRun(async () => {
    const result = await runHealthCheck('prd');
    console.log(`[RpcHealthCheck PRD] Done: checked=${result.checked}, rotated=[${result.rotated.join(',')}]`);
  });

// ============================================================
// 手動実行用 HTTP エンドポイント（テスト・デバッグ用）
// ============================================================

function handleManualHealthCheck(dbRoot: string) {
  return async (req: functions.https.Request, res: functions.Response) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    try {
      const result = await runHealthCheck(dbRoot);
      res.json({ success: true, ...result });
    } catch (e: any) {
      console.error('[RpcHealthCheck] Manual run failed:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  };
}

export const rpcHealthCheckManualDev = functions
  .region(REGION)
  .https.onRequest(handleManualHealthCheck('dev'));

export const rpcHealthCheckManualPrd = functions
  .region(REGION)
  .https.onRequest(handleManualHealthCheck('prd'));
