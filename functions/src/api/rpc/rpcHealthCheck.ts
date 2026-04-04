import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { regionalFunctions } from '../../common/cors';

interface RpcPoolEntry {
  activeIndex: number;
  urls: string[];
  lastCheckedAt?: string;
  lastHealthy?: boolean;
}

interface NetworkEntry {
  chainId: number;
  rpcUrl: string;
}

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
    return !!json.result && json.result.startsWith('0x');
  } catch {
    return false;
  }
}

async function runHealthCheck(dbRoot: string): Promise<{ checked: number; rotated: string[] }> {
  const db = admin.database();
  const poolRef = db.ref(`${dbRoot}/master/rpcPool`);
  const networksRef = db.ref(`${dbRoot}/master/networks`);

  const poolSnap = await poolRef.once('value');
  if (!poolSnap.exists()) {
    functions.logger.info(`[RpcHealthCheck] No rpcPool found under ${dbRoot}/master/rpcPool`);
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

    functions.logger.info(`[RpcHealthCheck] Chain ${chainId}: checking ${currentUrl} (index ${currentIndex})`);
    const healthy = await isRpcHealthy(currentUrl);

    if (healthy) {
      await poolRef.child(chainId).update({
        lastCheckedAt: new Date().toISOString(),
        lastHealthy: true,
      });
      functions.logger.info(`[RpcHealthCheck] Chain ${chainId}: ✅ healthy`);
    } else {
      functions.logger.info(`[RpcHealthCheck] Chain ${chainId}: ❌ unhealthy, rotating...`);

      let newIndex = currentIndex;
      let found = false;

      for (let i = 1; i < entry.urls.length; i++) {
        const candidateIndex = (currentIndex + i) % entry.urls.length;
        const candidateUrl = entry.urls[candidateIndex];
        functions.logger.info(`[RpcHealthCheck] Chain ${chainId}: trying candidate ${candidateIndex} → ${candidateUrl}`);

        if (await isRpcHealthy(candidateUrl)) {
          newIndex = candidateIndex;
          found = true;
          functions.logger.info(`[RpcHealthCheck] Chain ${chainId}: ✅ switched to index ${newIndex}`);
          break;
        }
      }

      await poolRef.child(chainId).update({
        activeIndex: newIndex,
        lastCheckedAt: new Date().toISOString(),
        lastHealthy: found,
      });

      const newUrl = entry.urls[newIndex];
      const networksSnap = await networksRef.once('value');
      if (networksSnap.exists()) {
        const networks: NetworkEntry[] | Record<string, NetworkEntry> = networksSnap.val();
        const arr: NetworkEntry[] = Array.isArray(networks) ? networks : Object.values(networks);
        let updated = false;
        for (let i = 0; i < arr.length; i++) {
          if (arr[i] && arr[i].chainId === Number(chainId) && arr[i].rpcUrl !== newUrl) {
            await networksRef.child(String(i)).update({ rpcUrl: newUrl });
            updated = true;
          }
        }
        if (updated) {
          rotated.push(chainId);
          functions.logger.info(`[RpcHealthCheck] Chain ${chainId}: master/networks rpcUrl → ${newUrl}`);
        }
      }

      if (!found) {
        functions.logger.warn(`[RpcHealthCheck] Chain ${chainId}: ⚠️ ALL RPCs unhealthy!`);
      }
    }
  }

  return { checked, rotated };
}

export const rpcHealthCheckDev = regionalFunctions
  .pubsub.schedule('every 1 minutes')
  .onRun(async () => {
    const result = await runHealthCheck('dev');
    functions.logger.info(`[RpcHealthCheck DEV] Done: checked=${result.checked}, rotated=[${result.rotated.join(',')}]`);
  });

export const rpcHealthCheckPrd = regionalFunctions
  .pubsub.schedule('every 1 minutes')
  .onRun(async () => {
    const result = await runHealthCheck('prd');
    functions.logger.info(`[RpcHealthCheck PRD] Done: checked=${result.checked}, rotated=[${result.rotated.join(',')}]`);
  });

function handleManualHealthCheck(dbRoot: string) {
  return async (req: functions.https.Request, res: functions.Response) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    try {
      const result = await runHealthCheck(dbRoot);
      res.json({ success: true, ...result });
    } catch (e: unknown) {
      functions.logger.error('[RpcHealthCheck] Manual run failed:', e);
      res.status(500).json({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  };
}

export const rpcHealthCheckManualDev = regionalFunctions
  .https.onRequest(handleManualHealthCheck('dev'));

export const rpcHealthCheckManualPrd = regionalFunctions
  .https.onRequest(handleManualHealthCheck('prd'));
