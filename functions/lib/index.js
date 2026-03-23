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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelSubscriptionDev = exports.verifyCheckoutSessionDev = exports.createCheckoutSessionDev = exports.getPointsSummaryDev = exports.resendKycNotificationDev = exports.submitKycDev = exports.sendKycNotificationsDev = exports.updateKycEmailPrd = exports.updateKycEmailDev = exports.sendTestEmailDev = exports.linkLogin = exports.startAsGuest = exports.verifyLineToken = exports.verifyGoogleToken = exports.verifyWalletConnect = exports.getNonce = exports.deleteInformationPrd = exports.deleteInformationDev = exports.upsertInformationPrd = exports.upsertInformationDev = exports.getInformationPrd = exports.getInformationDev = exports.getInformationAllPrd = exports.getInformationAllDev = exports.rpcHealthCheckManualPrd = exports.rpcHealthCheckManualDev = exports.rpcHealthCheckPrd = exports.rpcHealthCheckDev = exports.deleteExcludeUserPrd = exports.deleteExcludeUserDev = exports.addExcludeUserPrd = exports.addExcludeUserDev = exports.getExcludeUsersPrd = exports.getExcludeUsersDev = exports.deleteMaintenancePrd = exports.deleteMaintenanceDev = exports.upsertMaintenancePrd = exports.upsertMaintenanceDev = exports.getMaintenancePrd = exports.getMaintenanceDev = exports.getMaintenanceAllPrd = exports.getMaintenanceAllDev = exports.adminLoginPrd = exports.adminLoginDev = exports.deleteVersionPrd = exports.deleteVersionDev = exports.upsertVersionPrd = exports.upsertVersionDev = exports.getVersionsPrd = exports.getVersionsDev = void 0;
exports.stripeWebhookPrd = exports.reportUsagePrd = exports.reactivateSubscriptionPrd = exports.cancelSubscriptionPrd = exports.verifyCheckoutSessionPrd = exports.createCheckoutSessionPrd = exports.getPointsSummaryPrd = exports.resendKycNotificationPrd = exports.submitKycPrd = exports.sendKycNotificationsPrd = exports.sendTestEmailPrd = exports.stripeWebhookDev = exports.reportUsageDev = exports.reactivateSubscriptionDev = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const ethers_1 = require("ethers");
const uuid_1 = require("uuid");
const notificationSenders_1 = require("./notificationSenders");
const stripe_1 = __importDefault(require("stripe"));
const tidb_1 = require("./tidb");
var versionApi_1 = require("./versionApi");
Object.defineProperty(exports, "getVersionsDev", { enumerable: true, get: function () { return versionApi_1.getVersionsDev; } });
Object.defineProperty(exports, "getVersionsPrd", { enumerable: true, get: function () { return versionApi_1.getVersionsPrd; } });
Object.defineProperty(exports, "upsertVersionDev", { enumerable: true, get: function () { return versionApi_1.upsertVersionDev; } });
Object.defineProperty(exports, "upsertVersionPrd", { enumerable: true, get: function () { return versionApi_1.upsertVersionPrd; } });
Object.defineProperty(exports, "deleteVersionDev", { enumerable: true, get: function () { return versionApi_1.deleteVersionDev; } });
Object.defineProperty(exports, "deleteVersionPrd", { enumerable: true, get: function () { return versionApi_1.deleteVersionPrd; } });
Object.defineProperty(exports, "adminLoginDev", { enumerable: true, get: function () { return versionApi_1.adminLoginDev; } });
Object.defineProperty(exports, "adminLoginPrd", { enumerable: true, get: function () { return versionApi_1.adminLoginPrd; } });
var maintenanceApi_1 = require("./maintenanceApi");
Object.defineProperty(exports, "getMaintenanceAllDev", { enumerable: true, get: function () { return maintenanceApi_1.getMaintenanceAllDev; } });
Object.defineProperty(exports, "getMaintenanceAllPrd", { enumerable: true, get: function () { return maintenanceApi_1.getMaintenanceAllPrd; } });
Object.defineProperty(exports, "getMaintenanceDev", { enumerable: true, get: function () { return maintenanceApi_1.getMaintenanceDev; } });
Object.defineProperty(exports, "getMaintenancePrd", { enumerable: true, get: function () { return maintenanceApi_1.getMaintenancePrd; } });
Object.defineProperty(exports, "upsertMaintenanceDev", { enumerable: true, get: function () { return maintenanceApi_1.upsertMaintenanceDev; } });
Object.defineProperty(exports, "upsertMaintenancePrd", { enumerable: true, get: function () { return maintenanceApi_1.upsertMaintenancePrd; } });
Object.defineProperty(exports, "deleteMaintenanceDev", { enumerable: true, get: function () { return maintenanceApi_1.deleteMaintenanceDev; } });
Object.defineProperty(exports, "deleteMaintenancePrd", { enumerable: true, get: function () { return maintenanceApi_1.deleteMaintenancePrd; } });
Object.defineProperty(exports, "getExcludeUsersDev", { enumerable: true, get: function () { return maintenanceApi_1.getExcludeUsersDev; } });
Object.defineProperty(exports, "getExcludeUsersPrd", { enumerable: true, get: function () { return maintenanceApi_1.getExcludeUsersPrd; } });
Object.defineProperty(exports, "addExcludeUserDev", { enumerable: true, get: function () { return maintenanceApi_1.addExcludeUserDev; } });
Object.defineProperty(exports, "addExcludeUserPrd", { enumerable: true, get: function () { return maintenanceApi_1.addExcludeUserPrd; } });
Object.defineProperty(exports, "deleteExcludeUserDev", { enumerable: true, get: function () { return maintenanceApi_1.deleteExcludeUserDev; } });
Object.defineProperty(exports, "deleteExcludeUserPrd", { enumerable: true, get: function () { return maintenanceApi_1.deleteExcludeUserPrd; } });
var rpcHealthCheck_1 = require("./rpcHealthCheck");
Object.defineProperty(exports, "rpcHealthCheckDev", { enumerable: true, get: function () { return rpcHealthCheck_1.rpcHealthCheckDev; } });
Object.defineProperty(exports, "rpcHealthCheckPrd", { enumerable: true, get: function () { return rpcHealthCheck_1.rpcHealthCheckPrd; } });
Object.defineProperty(exports, "rpcHealthCheckManualDev", { enumerable: true, get: function () { return rpcHealthCheck_1.rpcHealthCheckManualDev; } });
Object.defineProperty(exports, "rpcHealthCheckManualPrd", { enumerable: true, get: function () { return rpcHealthCheck_1.rpcHealthCheckManualPrd; } });
var informationApi_1 = require("./informationApi");
Object.defineProperty(exports, "getInformationAllDev", { enumerable: true, get: function () { return informationApi_1.getInformationAllDev; } });
Object.defineProperty(exports, "getInformationAllPrd", { enumerable: true, get: function () { return informationApi_1.getInformationAllPrd; } });
Object.defineProperty(exports, "getInformationDev", { enumerable: true, get: function () { return informationApi_1.getInformationDev; } });
Object.defineProperty(exports, "getInformationPrd", { enumerable: true, get: function () { return informationApi_1.getInformationPrd; } });
Object.defineProperty(exports, "upsertInformationDev", { enumerable: true, get: function () { return informationApi_1.upsertInformationDev; } });
Object.defineProperty(exports, "upsertInformationPrd", { enumerable: true, get: function () { return informationApi_1.upsertInformationPrd; } });
Object.defineProperty(exports, "deleteInformationDev", { enumerable: true, get: function () { return informationApi_1.deleteInformationDev; } });
Object.defineProperty(exports, "deleteInformationPrd", { enumerable: true, get: function () { return informationApi_1.deleteInformationPrd; } });
admin.initializeApp({
    databaseURL: 'https://token-batch-transfer-default-rtdb.asia-southeast1.firebasedatabase.app',
});
const REGION = 'asia-northeast1';
const HOSTING_URL_DEV = 'https://token-batch-transfer-dev.web.app';
const HOSTING_URL_PRD = 'https://token-batch-transfer-prd.web.app';
function getHostingUrl(dbRoot) {
    return dbRoot === 'prd' ? HOSTING_URL_PRD : HOSTING_URL_DEV;
}
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
function setCors(res) {
    Object.entries(corsHeaders).forEach(([k, v]) => res.set(k, v));
}
// ============================================================
// Auth（DEV/PRD共通 — noncesパスはenv非依存）
// ============================================================
exports.getNonce = functions
    .region(REGION)
    .https.onRequest(async (req, res) => {
    var _a;
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    const address = (_a = req.query.address) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    if (!address || !ethers_1.ethers.isAddress(address)) {
        res.status(400).json({ error: 'Invalid wallet address' });
        return;
    }
    const nonce = Math.floor(Math.random() * 1000000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    await admin.database().ref(`nonces/${address}`).set({ nonce, expiresAt });
    res.json({ nonce });
});
const GOOGLE_CLIENT_ID = '923441812978-cjiflhf36j1kcklh8hp3g1d8erp50nv2.apps.googleusercontent.com';
const LINE_CHANNEL_ID = '2009555679';
function getDbEnv(dbRoot) {
    return dbRoot === 'prd' ? 'prd' : 'dev';
}
async function getOrCreateFirebaseUser(uid) {
    const existing = await admin.auth().getUser(uid).catch(() => null);
    if (!existing) {
        await admin.auth().createUser({ uid });
    }
    return uid;
}
// ============================================================
// verifyWalletConnect — WalletConnect署名検証 → UUID払い出し
// ============================================================
exports.verifyWalletConnect = functions
    .region(REGION)
    .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const { address, signature, dbRoot } = req.body;
    if (!address || !signature || !dbRoot) {
        res.status(400).json({ error: 'address, signature and dbRoot are required' });
        return;
    }
    const normalizedAddress = address.toLowerCase();
    const nonceSnap = await admin.database().ref(`nonces/${normalizedAddress}`).get();
    if (!nonceSnap.exists()) {
        res.status(400).json({ error: 'Nonce not found. Please request a new nonce.' });
        return;
    }
    const { nonce, expiresAt } = nonceSnap.val();
    if (Date.now() > expiresAt) {
        await admin.database().ref(`nonces/${normalizedAddress}`).remove();
        res.status(400).json({ error: 'Nonce expired.' });
        return;
    }
    const message = `Sign in to Token Batch Transfer\nNonce: ${nonce}`;
    try {
        const recovered = ethers_1.ethers.verifyMessage(message, signature);
        if (recovered.toLowerCase() !== normalizedAddress) {
            res.status(401).json({ error: 'Signature verification failed' });
            return;
        }
    }
    catch (_a) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
    }
    await admin.database().ref(`nonces/${normalizedAddress}`).remove();
    const env = getDbEnv(dbRoot);
    const uid = await (0, tidb_1.findOrCreateUser)(env, 'wallet', normalizedAddress, (0, uuid_1.v4)());
    await getOrCreateFirebaseUser(uid);
    const customToken = await admin.auth().createCustomToken(uid, { loginType: 'wallet' });
    res.json({ customToken, userId: uid });
});
// ============================================================
// verifyGoogleToken — Google ID Token検証 → UUID払い出し
// ============================================================
exports.verifyGoogleToken = functions
    .region(REGION)
    .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const { accessToken, dbRoot } = req.body;
    if (!accessToken || !dbRoot) {
        res.status(400).json({ error: 'accessToken and dbRoot are required' });
        return;
    }
    // Google tokeninfo API でアクセストークンを検証し sub を取得
    let googleSub;
    try {
        const tokenInfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
        if (!tokenInfoRes.ok)
            throw new Error('tokeninfo failed');
        const tokenInfo = await tokenInfoRes.json();
        if (tokenInfo.error_description)
            throw new Error(tokenInfo.error_description);
        if (tokenInfo.aud !== GOOGLE_CLIENT_ID)
            throw new Error('Invalid audience');
        if (!tokenInfo.sub)
            throw new Error('No sub in tokeninfo');
        googleSub = tokenInfo.sub;
    }
    catch (_a) {
        res.status(401).json({ error: 'Invalid Google access token' });
        return;
    }
    const env = getDbEnv(dbRoot);
    const uid = await (0, tidb_1.findOrCreateUser)(env, 'google', googleSub, (0, uuid_1.v4)());
    await getOrCreateFirebaseUser(uid);
    const customToken = await admin.auth().createCustomToken(uid, { loginType: 'google' });
    res.json({ customToken, userId: uid });
});
// ============================================================
// verifyLineToken — LINE Access Token検証 → UUID払い出し
// ============================================================
exports.verifyLineToken = functions
    .region(REGION)
    .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const { accessToken, dbRoot } = req.body;
    if (!accessToken || !dbRoot) {
        res.status(400).json({ error: 'accessToken and dbRoot are required' });
        return;
    }
    // LINE Verify v2.1 API でトークン検証
    let lineUserId;
    try {
        const verifyRes = await fetch(`https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`);
        if (!verifyRes.ok)
            throw new Error('LINE verify failed');
        const verifyData = await verifyRes.json();
        if (verifyData.client_id !== LINE_CHANNEL_ID) {
            res.status(401).json({ error: 'Invalid LINE channel' });
            return;
        }
        // プロフィール取得でuserIdを取得
        const profileRes = await fetch('https://api.line.me/v2/profile', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!profileRes.ok)
            throw new Error('Failed to get LINE profile');
        const profile = await profileRes.json();
        lineUserId = profile.userId;
    }
    catch (_a) {
        res.status(401).json({ error: 'Invalid LINE access token' });
        return;
    }
    const env = getDbEnv(dbRoot);
    const uid = await (0, tidb_1.findOrCreateUser)(env, 'line', lineUserId, (0, uuid_1.v4)());
    await getOrCreateFirebaseUser(uid);
    const customToken = await admin.auth().createCustomToken(uid, { loginType: 'line' });
    res.json({ customToken, userId: uid });
});
// ============================================================
// startAsGuest — UUID発行のみ（login_tにデータなし）
// ============================================================
exports.startAsGuest = functions
    .region(REGION)
    .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const { dbRoot } = req.body;
    if (!dbRoot) {
        res.status(400).json({ error: 'dbRoot is required' });
        return;
    }
    const userId = (0, uuid_1.v4)();
    const env = getDbEnv(dbRoot);
    // user_tにのみ作成（login_tにはデータを入れない）
    await (0, tidb_1.createUser)(env, userId);
    await getOrCreateFirebaseUser(userId);
    const customToken = await admin.auth().createCustomToken(userId, { loginType: 'guest' });
    res.json({ customToken, userId });
});
// ============================================================
// linkLogin — 既存ユーザーに wallet/google/line を連携
// ============================================================
exports.linkLogin = functions
    .region(REGION)
    .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    let currentUid;
    try {
        currentUid = await verifyAuth(req);
    }
    catch (_a) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    const { loginType, loginKey, dbRoot, signature } = req.body;
    if (!loginType || !loginKey || !dbRoot) {
        res.status(400).json({ error: 'loginType, loginKey and dbRoot are required' });
        return;
    }
    // 最終的にlogin_tに保存するキー（検証後に確定）
    let resolvedLoginKey = loginKey;
    // google連携: access_token → tokeninfo → sub
    if (loginType === 'google') {
        try {
            const tokenInfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(loginKey)}`);
            if (!tokenInfoRes.ok)
                throw new Error('tokeninfo failed');
            const tokenInfo = await tokenInfoRes.json();
            if (tokenInfo.error_description)
                throw new Error(tokenInfo.error_description);
            if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
                res.status(401).json({ error: 'Invalid Google audience' });
                return;
            }
            resolvedLoginKey = tokenInfo.sub;
        }
        catch (_b) {
            res.status(401).json({ error: 'Invalid Google access token' });
            return;
        }
    }
    // line連携: access_token → verify + profile → userId
    if (loginType === 'line') {
        try {
            const verifyRes = await fetch(`https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(loginKey)}`);
            if (!verifyRes.ok)
                throw new Error('LINE verify failed');
            const verifyData = await verifyRes.json();
            if (verifyData.client_id !== LINE_CHANNEL_ID) {
                res.status(401).json({ error: 'Invalid LINE channel' });
                return;
            }
            const profileRes = await fetch('https://api.line.me/v2/profile', {
                headers: { Authorization: `Bearer ${loginKey}` },
            });
            if (!profileRes.ok)
                throw new Error('Failed to get LINE profile');
            const profile = await profileRes.json();
            resolvedLoginKey = profile.userId;
        }
        catch (_c) {
            res.status(401).json({ error: 'Invalid LINE access token' });
            return;
        }
    }
    // wallet連携: nonce+署名検証
    if (loginType === 'wallet') {
        const normalizedAddress = loginKey.toLowerCase();
        resolvedLoginKey = normalizedAddress;
        if (!signature) {
            res.status(400).json({ error: 'signature is required for wallet link' });
            return;
        }
        const nonceSnap = await admin.database().ref(`nonces/${normalizedAddress}`).get();
        if (!nonceSnap.exists()) {
            res.status(400).json({ error: 'Nonce not found. Please request a new nonce.' });
            return;
        }
        const { nonce, expiresAt } = nonceSnap.val();
        if (Date.now() > expiresAt) {
            await admin.database().ref(`nonces/${normalizedAddress}`).remove();
            res.status(400).json({ error: 'Nonce expired.' });
            return;
        }
        const message = `Sign in to Token Batch Transfer\nNonce: ${nonce}`;
        try {
            const recovered = ethers_1.ethers.verifyMessage(message, signature);
            if (recovered.toLowerCase() !== normalizedAddress) {
                res.status(401).json({ error: 'Signature verification failed' });
                return;
            }
        }
        catch (_d) {
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }
        await admin.database().ref(`nonces/${normalizedAddress}`).remove();
    }
    const env = getDbEnv(dbRoot);
    try {
        await (0, tidb_1.linkLoginToUser)(env, currentUid, loginType, resolvedLoginKey);
        res.json({ success: true });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'Link failed';
        res.status(409).json({ error: msg });
    }
});
// ============================================================
// KYC ハンドラー（共通ロジック）
// ============================================================
async function verifyAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Authorization header is required');
    }
    const decoded = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
    return decoded.uid;
}
async function handleSendKycNotifications(req, res, dbRoot) {
    var _a;
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    let uid;
    try {
        uid = await verifyAuth(req);
    }
    catch (_b) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    const { recipients, emailSettings } = req.body;
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        res.status(400).json({ error: 'recipients array is required and must not be empty' });
        return;
    }
    const db = admin.database();
    const kycRequestsRef = db.ref(`${dbRoot}/users/${uid}/kycRequests`);
    const approvedRef = db.ref(`${dbRoot}/users/${uid}/approvedAddresses`);
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const details = [];
    for (const recipient of recipients) {
        const normalizedAddress = recipient.address.toLowerCase();
        const approvedSnap = await approvedRef.child(normalizedAddress).get();
        if (approvedSnap.exists()) {
            skipped++;
            details.push({ address: recipient.address, status: 'skipped', reason: 'address_already_approved' });
            continue;
        }
        if (recipient.notificationType !== 'email') {
            failed++;
            details.push({ address: recipient.address, status: 'failed', reason: 'unsupported_channel' });
            continue;
        }
        const token = (0, uuid_1.v4)();
        const now = Date.now();
        const expiresInDays = (_a = emailSettings === null || emailSettings === void 0 ? void 0 : emailSettings.expiresInDays) !== null && _a !== void 0 ? _a : 7;
        const expiresAt = now + expiresInDays * 24 * 60 * 60 * 1000;
        await kycRequestsRef.child(token).set({
            recipientAddress: normalizedAddress,
            notificationType: recipient.notificationType,
            notificationId: recipient.notificationId,
            sessionName: recipient.sessionName,
            language: (emailSettings === null || emailSettings === void 0 ? void 0 : emailSettings.language) || 'en',
            status: 'pending',
            createdAt: now,
            expiresAt,
        });
        // グローバルトークンインデックス（KycFormからの逆引き用）
        await db.ref(`${dbRoot}/kycTokens/${token}`).set(uid);
        const kycLink = `${getHostingUrl(dbRoot)}/kyc?token=${token}`;
        try {
            const sender = (0, notificationSenders_1.getNotificationSender)(recipient.notificationType);
            const success = await sender.send(recipient.notificationId, kycLink, recipient.sessionName, emailSettings);
            if (success) {
                await kycRequestsRef.child(token).update({ status: 'notification_sent', notificationSentAt: Date.now() });
                sent++;
                details.push({ address: recipient.address, status: 'sent' });
            }
            else {
                await kycRequestsRef.child(token).update({ status: 'pending' });
                failed++;
                details.push({ address: recipient.address, status: 'failed', reason: 'notification_send_failed' });
            }
        }
        catch (error) {
            console.error(`Failed to send notification to ${recipient.address}:`, error);
            failed++;
            details.push({ address: recipient.address, status: 'failed', reason: 'notification_send_error' });
        }
    }
    res.json({ sent, skipped, failed, details });
}
async function handleSubmitKyc(req, res, dbRoot) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const { token, walletAddress, signature, signedMessage, fullName, email } = req.body;
    if (!token || !walletAddress || !signature || !signedMessage || !fullName || !email) {
        res.status(400).json({ error: 'Required fields are missing' });
        return;
    }
    const db = admin.database();
    // グローバルインデックスからオーナーUIDを取得
    const ownerSnap = await db.ref(`${dbRoot}/kycTokens/${token}`).get();
    if (!ownerSnap.exists()) {
        res.status(404).json({ error: 'Invalid KYC token' });
        return;
    }
    const ownerUid = ownerSnap.val();
    const kycRef = db.ref(`${dbRoot}/users/${ownerUid}/kycRequests/${token}`);
    const snapshot = await kycRef.get();
    if (!snapshot.exists()) {
        res.status(404).json({ error: 'Invalid KYC token' });
        return;
    }
    const kycRequest = snapshot.val();
    if (kycRequest.status === 'completed') {
        res.status(400).json({ error: 'This KYC has already been completed' });
        return;
    }
    if (kycRequest.expiresAt && kycRequest.expiresAt < Date.now()) {
        res.status(400).json({ error: 'This KYC link has expired' });
        return;
    }
    let recoveredAddress;
    try {
        recoveredAddress = ethers_1.ethers.verifyMessage(signedMessage, signature);
    }
    catch (_a) {
        res.status(400).json({ error: 'Signature verification failed' });
        return;
    }
    // Verify signedMessage contains the correct token (prevent replay/cross-token attacks)
    const tokenPattern = `Token: ${token}`;
    if (!signedMessage.startsWith('KYC Verification\n') || !signedMessage.includes(tokenPattern)) {
        res.status(400).json({ error: 'Invalid signed message format' });
        return;
    }
    // Verify timestamp is not too old (prevent replay with old signatures, 1 hour window)
    const timestampMatch = signedMessage.match(/Timestamp: (\d+)/);
    if (!timestampMatch) {
        res.status(400).json({ error: 'Invalid signed message format' });
        return;
    }
    const signedTimestamp = parseInt(timestampMatch[1], 10);
    const oneHour = 60 * 60 * 1000;
    if (Math.abs(Date.now() - signedTimestamp) > oneHour) {
        res.status(400).json({ error: 'Signature has expired, please sign again' });
        return;
    }
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        res.status(400).json({ error: 'Signature does not match wallet address' });
        return;
    }
    if (recoveredAddress.toLowerCase() !== kycRequest.recipientAddress.toLowerCase()) {
        res.status(400).json({ error: 'Wallet address does not match KYC request' });
        return;
    }
    const normalizedAddress = walletAddress.toLowerCase();
    const now = Date.now();
    const updates = {
        [`${dbRoot}/users/${ownerUid}/kycRequests/${token}/status`]: 'completed',
        [`${dbRoot}/users/${ownerUid}/kycRequests/${token}/completedAt`]: now,
        [`${dbRoot}/users/${ownerUid}/kycRequests/${token}/kycData`]: {
            fullName, walletAddress: normalizedAddress, signature, signedMessage, verifiedAt: now,
        },
        [`${dbRoot}/users/${ownerUid}/approvedAddresses/${normalizedAddress}`]: {
            address: normalizedAddress, userName: fullName,
            notificationType: kycRequest.notificationType, notificationId: kycRequest.notificationId,
            approvedAt: now, approvedBy: 'kyc_auto', kycToken: token,
        },
    };
    try {
        await db.ref().update(updates);
    }
    catch (error) {
        console.error('Failed to save KYC data:', error);
        res.status(500).json({ error: 'Failed to save KYC data' });
        return;
    }
    res.json({ success: true, message: 'KYC completed' });
}
async function handleResendKycNotification(req, res, dbRoot) {
    var _a;
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    let uid;
    try {
        uid = await verifyAuth(req);
    }
    catch (_b) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    const { recipientAddress, notificationType, notificationId, sessionName, emailSettings } = req.body;
    if (!recipientAddress || !notificationType || !notificationId || !sessionName) {
        res.status(400).json({ error: '必須フィールドが不足しています' });
        return;
    }
    const normalizedAddress = recipientAddress.toLowerCase();
    const db = admin.database();
    const kycRequestsRef = db.ref(`${dbRoot}/users/${uid}/kycRequests`);
    const snapshot = await kycRequestsRef
        .orderByChild('recipientAddress')
        .equalTo(normalizedAddress)
        .get();
    if (!snapshot.exists()) {
        res.status(404).json({ error: '該当するKYCリクエストが見つかりません' });
        return;
    }
    const entries = Object.entries(snapshot.val());
    const [oldToken] = entries[entries.length - 1];
    // 承認済みアドレスに存在しない場合は再送OK（管理者が削除して非承認にした場合）
    const approvedSnap = await db.ref(`${dbRoot}/users/${uid}/approvedAddresses/${normalizedAddress}`).get();
    if (approvedSnap.exists()) {
        res.status(400).json({ error: 'このアドレスは既に承認済みです' });
        return;
    }
    await kycRequestsRef.child(oldToken).update({ status: 'expired' });
    const newToken = (0, uuid_1.v4)();
    const now = Date.now();
    const expiresInDays = (_a = emailSettings === null || emailSettings === void 0 ? void 0 : emailSettings.expiresInDays) !== null && _a !== void 0 ? _a : 7;
    const expiresAt = now + expiresInDays * 24 * 60 * 60 * 1000;
    await kycRequestsRef.child(newToken).set({
        recipientAddress: normalizedAddress,
        notificationType, notificationId, sessionName,
        language: (emailSettings === null || emailSettings === void 0 ? void 0 : emailSettings.language) || 'en',
        status: 'pending', createdAt: now, expiresAt, resentFrom: oldToken,
    });
    // グローバルトークンインデックス
    await db.ref(`${dbRoot}/kycTokens/${newToken}`).set(uid);
    const kycLink = `${getHostingUrl(dbRoot)}/kyc?token=${newToken}`;
    try {
        const sender = (0, notificationSenders_1.getNotificationSender)(notificationType);
        const success = await sender.send(notificationId, kycLink, sessionName, emailSettings);
        if (!success) {
            res.status(500).json({ error: 'Failed to send notification' });
            return;
        }
    }
    catch (error) {
        console.error(`Failed to resend notification to ${recipientAddress}:`, error);
        res.status(500).json({ error: 'Error occurred while sending notification' });
        return;
    }
    await kycRequestsRef.child(newToken).update({ status: 'notification_sent', notificationSentAt: Date.now() });
    res.json({ success: true, message: 'KYC notification resent', newToken, expiresAt });
}
// ============================================================
// ポイント集計API（Stripe従量課金用）
// ============================================================
async function handleGetPointsSummary(req, res, dbRoot) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    let uid;
    try {
        uid = await verifyAuth(req);
    }
    catch (_a) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    const year = parseInt(req.query.year);
    const month = parseInt(req.query.month);
    const db = admin.database();
    const pointsRef = db.ref(`${dbRoot}/users/${uid}/points`);
    const snapshot = await pointsRef.orderByChild('createdAt').get();
    if (!snapshot.exists()) {
        res.json({ totalPoints: 0, transactionPoints: 0, kycEmailPoints: 0, records: [] });
        return;
    }
    const allRecords = [];
    snapshot.forEach((child) => {
        allRecords.push(child.val());
    });
    let filtered = allRecords;
    if (year && month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);
        filtered = allRecords.filter((r) => {
            const d = new Date(r.createdAt);
            return d >= startDate && d < endDate;
        });
    }
    const transactionPoints = filtered
        .filter((r) => r.type === 'transaction')
        .reduce((sum, r) => sum + r.points, 0);
    const kycEmailPoints = filtered
        .filter((r) => r.type === 'kyc_email')
        .reduce((sum, r) => sum + r.points, 0);
    res.json({
        totalPoints: transactionPoints + kycEmailPoints,
        transactionPoints,
        kycEmailPoints,
        recordCount: filtered.length,
        period: year && month ? `${year}-${String(month).padStart(2, '0')}` : 'all',
    });
}
// ============================================================
// Stripe 従量課金（初月無料 → 100pt超で課金促進）
// ============================================================
function getStripe(dbRoot) {
    const suffix = dbRoot === 'prd' ? 'PRD' : 'DEV';
    const key = process.env[`STRIPE_SECRET_KEY_${suffix}`];
    if (!key)
        throw new Error(`STRIPE_SECRET_KEY_${suffix} is not set`);
    return new stripe_1.default(key);
}
function getStripePriceId(dbRoot) {
    const suffix = dbRoot === 'prd' ? 'PRD' : 'DEV';
    const id = process.env[`STRIPE_PRICE_ID_${suffix}`];
    if (!id)
        throw new Error(`STRIPE_PRICE_ID_${suffix} is not set`);
    return id;
}
function getStripeWebhookSecret(dbRoot) {
    const suffix = dbRoot === 'prd' ? 'PRD' : 'DEV';
    const secret = process.env[`STRIPE_WEBHOOK_SECRET_${suffix}`];
    if (!secret)
        throw new Error(`STRIPE_WEBHOOK_SECRET_${suffix} is not set`);
    return secret;
}
/**
 * Stripe Checkout Session を作成して課金登録させる
 */
async function handleCreateCheckoutSession(req, res, dbRoot) {
    var _a;
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    let uid;
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer '))
            throw new Error('No token');
        const decoded = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
        uid = decoded.uid;
    }
    catch (_b) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    const priceId = getStripePriceId(dbRoot);
    const { successUrl, cancelUrl } = req.body;
    const hostingUrl = getHostingUrl(dbRoot);
    try {
        const stripe = getStripe(dbRoot);
        // 既存のStripe Customerを検索 or 作成
        const db = admin.database();
        const billingSnap = await db.ref(`${dbRoot}/users/${uid}/billing`).get();
        let customerId;
        if (billingSnap.exists()) {
            customerId = (_a = billingSnap.val()) === null || _a === void 0 ? void 0 : _a.stripeCustomerId;
        }
        if (!customerId) {
            const customer = await stripe.customers.create({
                metadata: { firebaseUid: uid, dbRoot },
            });
            customerId = customer.id;
        }
        // 翌月1日 00:00 UTC を billing_cycle_anchor に設定
        const now = new Date();
        const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
        const billingCycleAnchor = Math.floor(nextMonth.getTime() / 1000);
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            locale: 'auto',
            line_items: [{ price: priceId }],
            subscription_data: {
                billing_cycle_anchor: billingCycleAnchor,
            },
            success_url: successUrl
                ? `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`
                : `${hostingUrl}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${hostingUrl}/?billing=cancel`,
            metadata: { firebaseUid: uid, dbRoot },
        });
        res.json({ url: session.url, sessionId: session.id });
    }
    catch (error) {
        console.error('Stripe Checkout Session creation failed:', error);
        res.status(500).json({ error: 'Checkout session creation failed' });
    }
}
/**
 * Checkout Session を確認して billing 情報を保存（Webhook の代替）
 */
async function handleVerifyCheckoutSession(req, res, dbRoot) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    let uid;
    try {
        uid = await verifyAuth(req);
    }
    catch (_a) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    const { sessionId } = req.body;
    if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
    }
    try {
        const stripe = getStripe(dbRoot);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid' && session.status !== 'complete') {
            res.status(400).json({ error: 'Checkout session is not completed' });
            return;
        }
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        if (customerId && subscriptionId) {
            await admin.database().ref(`${dbRoot}/users/${uid}/billing`).update({
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                subscribedAt: new Date().toISOString(),
                cancelledAt: null,
            });
        }
        res.json({ success: true, status: 'subscribed' });
    }
    catch (error) {
        console.error('Verify checkout session failed:', error);
        res.status(500).json({ error: 'Session verification failed' });
    }
}
/**
 * サブスクリプション解約API
 */
async function handleCancelSubscription(req, res, dbRoot) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    let uid;
    try {
        uid = await verifyAuth(req);
    }
    catch (_a) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    const db = admin.database();
    const billingSnap = await db.ref(`${dbRoot}/users/${uid}/billing`).get();
    if (!billingSnap.exists()) {
        res.status(400).json({ error: 'サブスクリプションが見つかりません' });
        return;
    }
    const billing = billingSnap.val();
    if (!billing.stripeSubscriptionId) {
        res.status(400).json({ error: 'アクティブなサブスクリプションがありません' });
        return;
    }
    try {
        const stripe = getStripe(dbRoot);
        // 即時解約ではなく期間終了時に解約（当月は有効）
        await stripe.subscriptions.update(billing.stripeSubscriptionId, {
            cancel_at_period_end: true,
        });
        await db.ref(`${dbRoot}/users/${uid}/billing`).update({
            cancelAtPeriodEnd: true,
            cancelRequestedAt: new Date().toISOString(),
        });
        res.json({ success: true, message: '当月末で解約予定です。当月中は引き続きご利用いただけます。' });
    }
    catch (error) {
        console.error('Subscription cancellation failed:', error);
        res.status(500).json({ error: '解約に失敗しました' });
    }
}
/**
 * サブスクリプション解約取り消しAPI（cancel_at_period_end を false に戻す）
 */
async function handleReactivateSubscription(req, res, dbRoot) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    let uid;
    try {
        uid = await verifyAuth(req);
    }
    catch (authErr) {
        console.error('reactivateSubscription auth failed:', authErr);
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    const db = admin.database();
    const billingSnap = await db.ref(`${dbRoot}/users/${uid}/billing`).get();
    if (!billingSnap.exists()) {
        res.status(400).json({ error: 'サブスクリプションが見つかりません' });
        return;
    }
    const billing = billingSnap.val();
    if (!billing.stripeSubscriptionId) {
        res.status(400).json({ error: 'アクティブなサブスクリプションがありません' });
        return;
    }
    try {
        const stripe = getStripe(dbRoot);
        await stripe.subscriptions.update(billing.stripeSubscriptionId, {
            cancel_at_period_end: false,
        });
        await db.ref(`${dbRoot}/users/${uid}/billing`).update({
            cancelAtPeriodEnd: false,
            cancelRequestedAt: null,
        });
        res.json({ success: true, message: '解約を取り消しました。引き続きご利用いただけます。' });
    }
    catch (error) {
        console.error('Subscription reactivation failed:', error);
        res.status(500).json({ error: '解約取り消しに失敗しました' });
    }
}
/**
 * Stripe Webhook: subscription作成・解約時にFirebase DBを更新
 */
async function handleStripeWebhook(req, res, dbRoot) {
    var _a, _b, _c;
    const webhookSecret = getStripeWebhookSecret(dbRoot);
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        const stripe = getStripe(dbRoot);
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err);
        res.status(400).json({ error: 'Invalid signature' });
        return;
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const sessionDbRoot = ((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.dbRoot) || 'dev';
        const firebaseUid = (_b = session.metadata) === null || _b === void 0 ? void 0 : _b.firebaseUid;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        if (customerId && subscriptionId && firebaseUid) {
            await admin.database().ref(`${sessionDbRoot}/users/${firebaseUid}/billing`).update({
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                subscribedAt: new Date().toISOString(),
                cancelledAt: null,
            });
            console.log(`Billing info saved: ${sessionDbRoot}/users/${firebaseUid}/billing`);
        }
    }
    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        // ユーザーを検索してbillingを更新
        const usersSnap = await admin.database().ref(`${dbRoot}/users`).get();
        if (usersSnap.exists()) {
            const users = usersSnap.val();
            for (const [uid, userData] of Object.entries(users)) {
                if (((_c = userData.billing) === null || _c === void 0 ? void 0 : _c.stripeCustomerId) === customerId) {
                    await admin.database().ref(`${dbRoot}/users/${uid}/billing`).update({
                        stripeSubscriptionId: null,
                        cancelledAt: new Date().toISOString(),
                    });
                    console.log(`Subscription cancelled: ${dbRoot}/users/${uid}/billing`);
                    break;
                }
            }
        }
    }
    res.json({ received: true });
}
/**
 * Stripe に使用量を報告（Billing Meter Events API）
 */
async function handleReportUsage(req, res, dbRoot) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    let uid;
    try {
        uid = await verifyAuth(req);
    }
    catch (_a) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
        res.status(400).json({ error: 'quantity is required (>= 1)' });
        return;
    }
    const db = admin.database();
    const billingSnap = await db.ref(`${dbRoot}/users/${uid}/billing`).get();
    if (!billingSnap.exists() || !billingSnap.val().stripeCustomerId) {
        res.json({ success: true, reported: false, reason: 'no_subscription' });
        return;
    }
    const billing = billingSnap.val();
    const suffix = dbRoot === 'prd' ? 'PRD' : 'DEV';
    const eventName = process.env[`STRIPE_METER_EVENT_NAME_${suffix}`];
    if (!eventName) {
        console.warn(`STRIPE_METER_EVENT_NAME_${suffix} is not set, skipping usage report`);
        res.json({ success: true, reported: false, reason: 'no_meter_event_name' });
        return;
    }
    try {
        const stripe = getStripe(dbRoot);
        // Billing Meter Events API で使用量を報告
        for (let i = 0; i < quantity; i++) {
            await stripe.billing.meterEvents.create({
                event_name: eventName,
                payload: {
                    stripe_customer_id: billing.stripeCustomerId,
                    value: '1',
                },
            });
        }
        res.json({ success: true, reported: true, quantity });
    }
    catch (error) {
        console.error('Usage report failed:', error);
        res.status(500).json({ error: 'Usage report failed' });
    }
}
// ============================================================
// テストメール送信API
// ============================================================
async function handleSendTestEmail(req, res) {
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
        await verifyAuth(req);
    }
    catch (_a) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    const { emailSettings } = req.body;
    if (!(emailSettings === null || emailSettings === void 0 ? void 0 : emailSettings.replyToEmail)) {
        res.status(400).json({ error: 'Reply-To email address is not set' });
        return;
    }
    try {
        const sender = (0, notificationSenders_1.getNotificationSender)('email');
        const lang = (emailSettings === null || emailSettings === void 0 ? void 0 : emailSettings.language) || 'en';
        const sampleSessionNames = {
            ja: 'テストセッション', en: 'Test Session', ko: '테스트 세션', zh: '测试会话',
        };
        const sampleSessionName = sampleSessionNames[lang] || sampleSessionNames['en'];
        const sampleKycLink = 'https://example.com/kyc?token=sample-test-token';
        const success = await sender.send(emailSettings.replyToEmail, sampleKycLink, sampleSessionName, emailSettings);
        if (success) {
            res.json({ success: true, message: 'Test email sent' });
        }
        else {
            res.status(500).json({ error: 'Failed to send test email' });
        }
    }
    catch (error) {
        console.error('Test email send failed:', error);
        res.status(500).json({ error: 'Failed to send test email' });
    }
}
// ============================================================
// KYCリクエストのメールアドレス(notificationId)更新API
// ============================================================
async function handleUpdateKycEmail(req, res, dbRoot) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    let uid;
    try {
        uid = await verifyAuth(req);
    }
    catch (_a) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    const { recipientAddress, notificationId } = req.body;
    if (!recipientAddress || !notificationId) {
        res.status(400).json({ error: 'recipientAddress and notificationId are required' });
        return;
    }
    const normalizedAddress = recipientAddress.toLowerCase();
    const db = admin.database();
    const kycRequestsRef = db.ref(`${dbRoot}/users/${uid}/kycRequests`);
    // 最新のKYCリクエストを取得
    const snapshot = await kycRequestsRef
        .orderByChild('recipientAddress')
        .equalTo(normalizedAddress)
        .get();
    if (!snapshot.exists()) {
        res.status(404).json({ error: 'KYCリクエストが見つかりません' });
        return;
    }
    // 最新のリクエストのみ更新
    const entries = Object.entries(snapshot.val());
    const [latestToken] = entries[entries.length - 1];
    await kycRequestsRef.child(latestToken).update({ notificationId });
    res.json({ success: true, message: 'Email address updated', token: latestToken });
}
// ============================================================
// DEV 関数（dev/ パスを参照）
// ============================================================
exports.sendTestEmailDev = functions.region(REGION).https.onRequest((req, res) => handleSendTestEmail(req, res));
exports.updateKycEmailDev = functions.region(REGION).runWith({ invoker: 'public' }).https.onRequest((req, res) => handleUpdateKycEmail(req, res, 'dev'));
exports.updateKycEmailPrd = functions.region(REGION).runWith({ invoker: 'public' }).https.onRequest((req, res) => handleUpdateKycEmail(req, res, 'prd'));
exports.sendKycNotificationsDev = functions.region(REGION).https.onRequest((req, res) => handleSendKycNotifications(req, res, 'dev'));
exports.submitKycDev = functions.region(REGION).https.onRequest((req, res) => handleSubmitKyc(req, res, 'dev'));
exports.resendKycNotificationDev = functions.region(REGION).https.onRequest((req, res) => handleResendKycNotification(req, res, 'dev'));
exports.getPointsSummaryDev = functions.region(REGION).https.onRequest((req, res) => handleGetPointsSummary(req, res, 'dev'));
exports.createCheckoutSessionDev = functions.region(REGION).https.onRequest((req, res) => handleCreateCheckoutSession(req, res, 'dev'));
exports.verifyCheckoutSessionDev = functions.region(REGION).https.onRequest((req, res) => handleVerifyCheckoutSession(req, res, 'dev'));
exports.cancelSubscriptionDev = functions.region(REGION).https.onRequest((req, res) => handleCancelSubscription(req, res, 'dev'));
exports.reactivateSubscriptionDev = functions.region(REGION).https.onRequest((req, res) => handleReactivateSubscription(req, res, 'dev'));
exports.reportUsageDev = functions.region(REGION).https.onRequest((req, res) => handleReportUsage(req, res, 'dev'));
exports.stripeWebhookDev = functions.region(REGION).https.onRequest((req, res) => handleStripeWebhook(req, res, 'dev'));
// ============================================================
// PRD 関数（prd/ パスを参照）
// ============================================================
exports.sendTestEmailPrd = functions.region(REGION).https.onRequest((req, res) => handleSendTestEmail(req, res));
exports.sendKycNotificationsPrd = functions.region(REGION).https.onRequest((req, res) => handleSendKycNotifications(req, res, 'prd'));
exports.submitKycPrd = functions.region(REGION).https.onRequest((req, res) => handleSubmitKyc(req, res, 'prd'));
exports.resendKycNotificationPrd = functions.region(REGION).https.onRequest((req, res) => handleResendKycNotification(req, res, 'prd'));
exports.getPointsSummaryPrd = functions.region(REGION).https.onRequest((req, res) => handleGetPointsSummary(req, res, 'prd'));
exports.createCheckoutSessionPrd = functions.region(REGION).https.onRequest((req, res) => handleCreateCheckoutSession(req, res, 'prd'));
exports.verifyCheckoutSessionPrd = functions.region(REGION).https.onRequest((req, res) => handleVerifyCheckoutSession(req, res, 'prd'));
exports.cancelSubscriptionPrd = functions.region(REGION).https.onRequest((req, res) => handleCancelSubscription(req, res, 'prd'));
exports.reactivateSubscriptionPrd = functions.region(REGION).https.onRequest((req, res) => handleReactivateSubscription(req, res, 'prd'));
exports.reportUsagePrd = functions.region(REGION).https.onRequest((req, res) => handleReportUsage(req, res, 'prd'));
exports.stripeWebhookPrd = functions.region(REGION).https.onRequest((req, res) => handleStripeWebhook(req, res, 'prd'));
//# sourceMappingURL=index.js.map