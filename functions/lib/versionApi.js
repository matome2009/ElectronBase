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
exports.adminLoginPrd = exports.adminLoginDev = exports.deleteVersionPrd = exports.deleteVersionDev = exports.upsertVersionPrd = exports.upsertVersionDev = exports.getVersionsPrd = exports.getVersionsDev = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
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
// GET /getVersions?env=dev  （認証不要 - クライアントアプリから叩く）
async function handleGetVersions(req, res, env) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        const conn = await (0, tidb_1.getAdminConnection)(env);
        const [rows] = await conn.execute('SELECT * FROM platform_versions ORDER BY platform');
        await conn.end();
        res.json({ versions: rows });
    }
    catch (e) {
        console.error('getVersions error:', e);
        res.status(500).json({ error: 'DB error' });
    }
}
// POST /upsertVersion  （管理者認証必須）
// body: { platform, version, release_notes?, download_url? }
async function handleUpsertVersion(req, res, env) {
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
    const { platform, version, release_notes, download_url } = req.body;
    if (!platform || !version) {
        res.status(400).json({ error: 'platform and version are required' });
        return;
    }
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
        res.status(400).json({ error: 'version must be x.y.z format' });
        return;
    }
    try {
        const conn = await (0, tidb_1.getAdminConnection)(env);
        await conn.execute(`INSERT INTO platform_versions (platform, version, release_notes, download_url)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         version = VALUES(version),
         release_notes = VALUES(release_notes),
         download_url = VALUES(download_url),
         updated_at = CURRENT_TIMESTAMP`, [platform.toUpperCase(), version, release_notes !== null && release_notes !== void 0 ? release_notes : null, download_url !== null && download_url !== void 0 ? download_url : null]);
        await conn.end();
        res.json({ success: true });
    }
    catch (e) {
        console.error('upsertVersion error:', e);
        res.status(500).json({ error: 'DB error' });
    }
}
// DELETE /deleteVersion  （管理者認証必須）
// body: { platform }
async function handleDeleteVersion(req, res, env) {
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
    const { platform } = req.body;
    if (!platform) {
        res.status(400).json({ error: 'platform is required' });
        return;
    }
    try {
        const conn = await (0, tidb_1.getAdminConnection)(env);
        await conn.execute('DELETE FROM platform_versions WHERE platform = ?', [platform.toUpperCase()]);
        await conn.end();
        res.json({ success: true });
    }
    catch (e) {
        console.error('deleteVersion error:', e);
        res.status(500).json({ error: 'DB error' });
    }
}
// POST /adminLogin （認証不要）
// body: { mail_address, password }
async function handleAdminLogin(req, res, env) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const { mail_address, password } = req.body;
    if (!mail_address || !password) {
        res.status(400).json({ error: 'mail_address and password are required' });
        return;
    }
    try {
        const conn = await (0, tidb_1.getAdminConnection)(env);
        const [rows] = await conn.execute('SELECT * FROM admin_users WHERE mail_address = ? LIMIT 1', [mail_address]);
        await conn.end();
        if (!rows.length) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const user = rows[0];
        const hash = crypto.createHash('sha512').update(password).digest('hex');
        if (hash !== user.password_hash) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const customToken = await admin.auth().createCustomToken(`admin_${user.id}`, { adminLevel: user.auth_level, env });
        res.json({ customToken, mail_address: user.mail_address, auth_level: user.auth_level });
    }
    catch (e) {
        console.error('adminLogin error:', e);
        res.status(500).json({ error: 'DB error' });
    }
}
exports.getVersionsDev = functions.region(REGION).https.onRequest((req, res) => handleGetVersions(req, res, 'dev'));
exports.getVersionsPrd = functions.region(REGION).https.onRequest((req, res) => handleGetVersions(req, res, 'prd'));
exports.upsertVersionDev = functions.region(REGION).https.onRequest((req, res) => handleUpsertVersion(req, res, 'dev'));
exports.upsertVersionPrd = functions.region(REGION).https.onRequest((req, res) => handleUpsertVersion(req, res, 'prd'));
exports.deleteVersionDev = functions.region(REGION).https.onRequest((req, res) => handleDeleteVersion(req, res, 'dev'));
exports.deleteVersionPrd = functions.region(REGION).https.onRequest((req, res) => handleDeleteVersion(req, res, 'prd'));
exports.adminLoginDev = functions.region(REGION).https.onRequest((req, res) => handleAdminLogin(req, res, 'dev'));
exports.adminLoginPrd = functions.region(REGION).https.onRequest((req, res) => handleAdminLogin(req, res, 'prd'));
//# sourceMappingURL=versionApi.js.map