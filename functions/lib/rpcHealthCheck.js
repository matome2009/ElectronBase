"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.rpcHealthCheckManualPrd = exports.rpcHealthCheckManualDev = exports.rpcHealthCheckPrd = exports.rpcHealthCheckDev = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const REGION = 'asia-northeast1';
/**
 * RPC エンドポイントの死活監視
 * eth_blockNumber を呼んで応答があるかチェック（タイムアウト 5秒）
 */
async function isRpcHealthy(url) {
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
        if (!response.ok)
            return false;
        const json = await response.json();
        // result が hex のブロック番号であれば正常
        return !!json.result && json.result.startsWith('0x');
    }
    catch (_a) {
        return false;
    }
}
/**
 * 全チェーンの RPC ヘルスチェックを実行し、NGなら次の候補にローテーション
 */
async function runHealthCheck(dbRoot) {
    var _a;
    const db = admin.database();
    const poolRef = db.ref(`${dbRoot}/master/rpcPool`);
    const networksRef = db.ref(`${dbRoot}/master/networks`);
    const poolSnap = await poolRef.once('value');
    if (!poolSnap.exists()) {
        console.log(`[RpcHealthCheck] No rpcPool found under ${dbRoot}/master/rpcPool`);
        return { checked: 0, rotated: [] };
    }
    const pool = poolSnap.val();
    const rotated = [];
    let checked = 0;
    for (const [chainId, entry] of Object.entries(pool)) {
        if (!entry.urls || entry.urls.length === 0)
            continue;
        checked++;
        const currentIndex = (_a = entry.activeIndex) !== null && _a !== void 0 ? _a : 0;
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
        }
        else {
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
                const networks = networksSnap.val();
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
exports.rpcHealthCheckDev = functions
    .region(REGION)
    .pubsub.schedule('every 1 minutes')
    .onRun(async () => {
    const result = await runHealthCheck('dev');
    console.log(`[RpcHealthCheck DEV] Done: checked=${result.checked}, rotated=[${result.rotated.join(',')}]`);
});
exports.rpcHealthCheckPrd = functions
    .region(REGION)
    .pubsub.schedule('every 1 minutes')
    .onRun(async () => {
    const result = await runHealthCheck('prd');
    console.log(`[RpcHealthCheck PRD] Done: checked=${result.checked}, rotated=[${result.rotated.join(',')}]`);
});
// ============================================================
// 手動実行用 HTTP エンドポイント（テスト・デバッグ用）
// ============================================================
function handleManualHealthCheck(dbRoot) {
    return async (req, res) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }
        try {
            const result = await runHealthCheck(dbRoot);
            res.json(Object.assign({ success: true }, result));
        }
        catch (e) {
            console.error('[RpcHealthCheck] Manual run failed:', e);
            res.status(500).json({ success: false, error: e.message });
        }
    };
}
exports.rpcHealthCheckManualDev = functions
    .region(REGION)
    .https.onRequest(handleManualHealthCheck('dev'));
exports.rpcHealthCheckManualPrd = functions
    .region(REGION)
    .https.onRequest(handleManualHealthCheck('prd'));
//# sourceMappingURL=rpcHealthCheck.js.map