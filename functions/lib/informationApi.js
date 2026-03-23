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
exports.deleteInformationPrd = exports.deleteInformationDev = exports.upsertInformationPrd = exports.upsertInformationDev = exports.getInformationPrd = exports.getInformationDev = exports.getInformationAllPrd = exports.getInformationAllDev = void 0;
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
// GET /getInformationAll （管理者認証必須 - 全件取得）
async function handleGetInformationAll(req, res, env) {
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
        const [rows] = await conn.execute('SELECT * FROM information_m WHERE delete_flg = 0 ORDER BY priority DESC, display_start_at DESC');
        await conn.end();
        res.json({ records: rows });
    }
    catch (e) {
        console.error('getInformationAll error:', e);
        res.status(500).json({ error: 'DB error' });
    }
}
// GET /getInformation （認証不要 - 表示期間内のお知らせのみ返す）
async function handleGetInformation(req, res, env) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        const conn = await (0, tidb_1.getAdminConnection)(env);
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const [rows] = await conn.execute(`SELECT * FROM information_m
       WHERE delete_flg = 0
         AND display_start_at <= ?
         AND (display_end_at IS NULL OR display_end_at >= ?)
       ORDER BY priority DESC, display_start_at DESC`, [now, now]);
        await conn.end();
        res.json({ records: rows });
    }
    catch (e) {
        console.error('getInformation error:', e);
        res.status(500).json({ error: 'DB error' });
    }
}
// POST /upsertInformation （管理者認証必須）
async function handleUpsertInformation(req, res, env) {
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
    const { id, title_ja, title_en, title_ko, title_cn, body_ja, body_en, body_ko, body_cn, display_start_at, display_end_at, priority, } = req.body;
    if (!title_ja || !display_start_at) {
        res.status(400).json({ error: 'title_ja and display_start_at are required' });
        return;
    }
    try {
        const conn = await (0, tidb_1.getAdminConnection)(env);
        if (id) {
            await conn.execute(`UPDATE information_m SET
          title_ja=?, title_en=?, title_ko=?, title_cn=?,
          body_ja=?, body_en=?, body_ko=?, body_cn=?,
          display_start_at=?, display_end_at=?, priority=?,
          updated_at=CURRENT_TIMESTAMP
         WHERE id=?`, [title_ja, title_en, title_ko, title_cn,
                body_ja, body_en, body_ko, body_cn,
                display_start_at, display_end_at || null, priority, id]);
        }
        else {
            await conn.execute(`INSERT INTO information_m
          (title_ja, title_en, title_ko, title_cn, body_ja, body_en, body_ko, body_cn, display_start_at, display_end_at, priority)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [title_ja, title_en, title_ko, title_cn,
                body_ja, body_en, body_ko, body_cn,
                display_start_at, display_end_at || null, priority]);
        }
        await conn.end();
        res.json({ success: true });
    }
    catch (e) {
        console.error('upsertInformation error:', e);
        res.status(500).json({ error: 'DB error' });
    }
}
// POST /deleteInformation （管理者認証必須）
async function handleDeleteInformation(req, res, env) {
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
        await conn.execute('UPDATE information_m SET delete_flg=1 WHERE id=?', [id]);
        await conn.end();
        res.json({ success: true });
    }
    catch (e) {
        console.error('deleteInformation error:', e);
        res.status(500).json({ error: 'DB error' });
    }
}
exports.getInformationAllDev = functions.region(REGION).https.onRequest((req, res) => handleGetInformationAll(req, res, 'dev'));
exports.getInformationAllPrd = functions.region(REGION).https.onRequest((req, res) => handleGetInformationAll(req, res, 'prd'));
exports.getInformationDev = functions.region(REGION).https.onRequest((req, res) => handleGetInformation(req, res, 'dev'));
exports.getInformationPrd = functions.region(REGION).https.onRequest((req, res) => handleGetInformation(req, res, 'prd'));
exports.upsertInformationDev = functions.region(REGION).https.onRequest((req, res) => handleUpsertInformation(req, res, 'dev'));
exports.upsertInformationPrd = functions.region(REGION).https.onRequest((req, res) => handleUpsertInformation(req, res, 'prd'));
exports.deleteInformationDev = functions.region(REGION).https.onRequest((req, res) => handleDeleteInformation(req, res, 'dev'));
exports.deleteInformationPrd = functions.region(REGION).https.onRequest((req, res) => handleDeleteInformation(req, res, 'prd'));
//# sourceMappingURL=informationApi.js.map