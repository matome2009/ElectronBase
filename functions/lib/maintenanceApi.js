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
exports.deleteExcludeUserPrd = exports.deleteExcludeUserDev = exports.addExcludeUserPrd = exports.addExcludeUserDev = exports.getExcludeUsersPrd = exports.getExcludeUsersDev = exports.deleteMaintenancePrd = exports.deleteMaintenanceDev = exports.upsertMaintenancePrd = exports.upsertMaintenanceDev = exports.getMaintenancePrd = exports.getMaintenanceDev = exports.getMaintenanceAllPrd = exports.getMaintenanceAllDev = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const tidb_1 = require("./tidb");
const REGION = 'asia-northeast1';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
function setCors(res) {
    Object.entries(corsHeaders).forEach(([k, v]) => res.set(k, v));
}
async function verifyAdmin(req) {
    const authHeader = req.headers.authorization;
    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')))
        throw new Error('No token');
    await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
}
// GET /getMaintenanceAll （管理者認証必須 - 全件取得）
async function handleGetMaintenanceAll(req, res, env) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        await verifyAdmin(req);
    }
    catch (_a) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const conn = await (0, tidb_1.getAdminConnection)(env);
        const [rows] = await conn.execute('SELECT * FROM maintenance_m WHERE delete_flg = 0 ORDER BY updated_at DESC');
        await conn.end();
        res.json({ records: rows });
    }
    catch (e) {
        console.error('getMaintenanceAll error:', e);
        res.status(500).json({ error: 'DB error' });
    }
}
// GET /getMaintenance （認証不要 - クライアントから叩く）
// walletAddress クエリパラメータがあれば除外ユーザーチェックも行う
async function handleGetMaintenance(req, res, env) {
    var _a;
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        const conn = await (0, tidb_1.getAdminConnection)(env);
        // 有効なメンテナンス設定を取得（delete_flg=0 の最新1件）
        const [rows] = await conn.execute('SELECT * FROM maintenance_m WHERE delete_flg = 0 ORDER BY updated_at DESC LIMIT 1');
        if (!rows.length || rows[0].status === 0) {
            await conn.end();
            res.json({ maintenance: false });
            return;
        }
        const maintenance = rows[0];
        // status=2（除外ユーザーのみ除外モード）の場合、walletAddressをチェック
        if (maintenance.status === 2) {
            const walletAddress = (_a = req.query.walletAddress) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            if (walletAddress) {
                const [excludeRows] = await conn.execute('SELECT id FROM exclude_users WHERE wallet_address = ? AND delete_flg = 0 LIMIT 1', [walletAddress]);
                if (excludeRows.length) {
                    await conn.end();
                    res.json({ maintenance: false });
                    return;
                }
            }
        }
        await conn.end();
        res.json({
            maintenance: true,
            status: maintenance.status,
            message_ja: maintenance.message_ja,
            message_en: maintenance.message_en,
            message_ko: maintenance.message_ko,
            message_cn: maintenance.message_cn,
        });
    }
    catch (e) {
        console.error('getMaintenance error:', e);
        res.status(500).json({ error: 'DB error' });
    }
}
// POST /upsertMaintenance （管理者認証必須）
async function handleUpsertMaintenance(req, res, env) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        await verifyAdmin(req);
    }
    catch (_a) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { id, status, message_ja, message_en, message_ko, message_cn } = req.body;
    if (status === undefined || !message_ja) {
        res.status(400).json({ error: 'status and message_ja are required' });
        return;
    }
    try {
        const conn = await (0, tidb_1.getAdminConnection)(env);
        if (id) {
            await conn.execute(`UPDATE maintenance_m SET status=?, message_ja=?, message_en=?, message_ko=?, message_cn=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [status, message_ja, message_en, message_ko, message_cn, id]);
        }
        else {
            await conn.execute(`INSERT INTO maintenance_m (status, message_ja, message_en, message_ko, message_cn) VALUES (?, ?, ?, ?, ?)`, [status, message_ja, message_en, message_ko, message_cn]);
        }
        await conn.end();
        res.json({ success: true });
    }
    catch (e) {
        console.error('upsertMaintenance error:', e);
        res.status(500).json({ error: 'DB error' });
    }
}
// POST /deleteMaintenance （管理者認証必須）
async function handleDeleteMaintenance(req, res, env) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        await verifyAdmin(req);
    }
    catch (_a) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { id } = req.body;
    if (!id) {
        res.status(400).json({ error: 'id is required' });
        return;
    }
    try {
        const conn = await (0, tidb_1.getAdminConnection)(env);
        await conn.execute('UPDATE maintenance_m SET delete_flg=1 WHERE id=?', [id]);
        await conn.end();
        res.json({ success: true });
    }
    catch (e) {
        console.error('deleteMaintenance error:', e);
        res.status(500).json({ error: 'DB error' });
    }
}
// GET /getExcludeUsers （管理者認証必須）
async function handleGetExcludeUsers(req, res, env) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        await verifyAdmin(req);
    }
    catch (_a) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const conn = await (0, tidb_1.getAdminConnection)(env);
        const [rows] = await conn.execute('SELECT * FROM exclude_users WHERE delete_flg = 0 ORDER BY created_at DESC');
        await conn.end();
        res.json({ users: rows });
    }
    catch (e) {
        console.error('getExcludeUsers error:', e);
        res.status(500).json({ error: 'DB error' });
    }
}
// POST /addExcludeUser （管理者認証必須）
async function handleAddExcludeUser(req, res, env) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        await verifyAdmin(req);
    }
    catch (_a) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { wallet_address } = req.body;
    if (!wallet_address) {
        res.status(400).json({ error: 'wallet_address is required' });
        return;
    }
    try {
        const conn = await (0, tidb_1.getAdminConnection)(env);
        await conn.execute('INSERT INTO exclude_users (wallet_address) VALUES (?) ON DUPLICATE KEY UPDATE delete_flg=0, updated_at=CURRENT_TIMESTAMP', [wallet_address.toLowerCase()]);
        await conn.end();
        res.json({ success: true });
    }
    catch (e) {
        console.error('addExcludeUser error:', e);
        res.status(500).json({ error: 'DB error' });
    }
}
// POST /deleteExcludeUser （管理者認証必須）
async function handleDeleteExcludeUser(req, res, env) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        await verifyAdmin(req);
    }
    catch (_a) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { id } = req.body;
    if (!id) {
        res.status(400).json({ error: 'id is required' });
        return;
    }
    try {
        const conn = await (0, tidb_1.getAdminConnection)(env);
        await conn.execute('UPDATE exclude_users SET delete_flg=1 WHERE id=?', [id]);
        await conn.end();
        res.json({ success: true });
    }
    catch (e) {
        console.error('deleteExcludeUser error:', e);
        res.status(500).json({ error: 'DB error' });
    }
}
exports.getMaintenanceAllDev = functions.region(REGION).https.onRequest((req, res) => handleGetMaintenanceAll(req, res, 'dev'));
exports.getMaintenanceAllPrd = functions.region(REGION).https.onRequest((req, res) => handleGetMaintenanceAll(req, res, 'prd'));
exports.getMaintenanceDev = functions.region(REGION).https.onRequest((req, res) => handleGetMaintenance(req, res, 'dev'));
exports.getMaintenancePrd = functions.region(REGION).https.onRequest((req, res) => handleGetMaintenance(req, res, 'prd'));
exports.upsertMaintenanceDev = functions.region(REGION).https.onRequest((req, res) => handleUpsertMaintenance(req, res, 'dev'));
exports.upsertMaintenancePrd = functions.region(REGION).https.onRequest((req, res) => handleUpsertMaintenance(req, res, 'prd'));
exports.deleteMaintenanceDev = functions.region(REGION).https.onRequest((req, res) => handleDeleteMaintenance(req, res, 'dev'));
exports.deleteMaintenancePrd = functions.region(REGION).https.onRequest((req, res) => handleDeleteMaintenance(req, res, 'prd'));
exports.getExcludeUsersDev = functions.region(REGION).https.onRequest((req, res) => handleGetExcludeUsers(req, res, 'dev'));
exports.getExcludeUsersPrd = functions.region(REGION).https.onRequest((req, res) => handleGetExcludeUsers(req, res, 'prd'));
exports.addExcludeUserDev = functions.region(REGION).https.onRequest((req, res) => handleAddExcludeUser(req, res, 'dev'));
exports.addExcludeUserPrd = functions.region(REGION).https.onRequest((req, res) => handleAddExcludeUser(req, res, 'prd'));
exports.deleteExcludeUserDev = functions.region(REGION).https.onRequest((req, res) => handleDeleteExcludeUser(req, res, 'dev'));
exports.deleteExcludeUserPrd = functions.region(REGION).https.onRequest((req, res) => handleDeleteExcludeUser(req, res, 'prd'));
//# sourceMappingURL=maintenanceApi.js.map