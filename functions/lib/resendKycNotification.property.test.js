"use strict";
/**
 * Property-based tests for resendKycNotification Cloud Function
 *
 * **Validates: Requirements 5.5, 5.6, 5.11**
 *
 * Properties tested:
 * - Property 7: KYC通知再送時の旧トークン無効化 - 再送成功時に旧トークンのステータスが `expired` に更新される
 * - Property 8: KYC通知再送時の新トークン生成 - 再送成功時に新トークンが生成され有効期限が設定される
 * - Property 9: KYC完了済みアドレスへの再送防止 - KYC完了済みアドレスへの再送は失敗する
 */
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
const fc = __importStar(require("fast-check"));
// ---- Generators ----
/** Generate a valid Ethereum address (0x + 40 hex chars, lowercase) */
const ethAddressArb = fc
    .stringMatching(/^[0-9a-f]{40}$/)
    .map((hex) => `0x${hex}`);
/** Generate a valid email address */
const emailArb = fc
    .tuple(fc.stringMatching(/^[a-z0-9]{1,10}$/), fc.stringMatching(/^[a-z]{1,8}$/))
    .map(([user, domain]) => `${user}@${domain}.com`);
/** Generate a session name */
const sessionNameArb = fc.stringMatching(/^[a-z0-9 ]{1,20}$/);
/** Generate a UUID-like token */
const tokenArb = fc.uuid();
/** Generate a KYC status that is NOT completed (resend-eligible) */
const nonCompletedStatusArb = fc.constantFrom('pending', 'notification_sent', 'expired');
// ---- In-memory Firebase RTDB helpers ----
function getNestedValue(obj, path) {
    const parts = path.split('/').filter(Boolean);
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined || typeof current !== 'object')
            return undefined;
        current = current[part];
    }
    return current;
}
function setNestedValue(obj, path, value) {
    const parts = path.split('/').filter(Boolean);
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current) || typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
            current[parts[i]] = {};
        }
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}
// ---- Core logic extracted for testing ----
const DB_ROOT = 'dev';
/**
 * Core logic of resendKycNotification, extracted from the HTTP handler.
 * This mirrors the logic in index.ts but operates on in-memory data.
 */
async function resendKycNotificationCore(input, data, sendNotification, generateToken) {
    const normalizedAddress = input.recipientAddress.toLowerCase();
    const kycRequestsPath = `${DB_ROOT}/kycRequests`;
    // Step 1: Search for existing KYC requests by recipientAddress
    const kycRequests = getNestedValue(data, kycRequestsPath);
    if (!kycRequests) {
        return { success: false, error: 'no_kyc_request_found' };
    }
    const matchingEntries = Object.entries(kycRequests).filter(([, entry]) => entry.recipientAddress === normalizedAddress);
    if (matchingEntries.length === 0) {
        return { success: false, error: 'no_kyc_request_found' };
    }
    // Step 2: Check status of the latest entry
    const [oldToken, existingRequest] = matchingEntries[matchingEntries.length - 1];
    if (existingRequest.status === 'completed') {
        return { success: false, error: 'kyc_already_completed' };
    }
    // Step 3: Expire old token
    setNestedValue(data, `${kycRequestsPath}/${oldToken}/status`, 'expired');
    // Step 4: Generate new token and create new KYC request
    const newToken = generateToken();
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days
    setNestedValue(data, `${kycRequestsPath}/${newToken}`, {
        recipientAddress: normalizedAddress,
        notificationType: input.notificationType,
        notificationId: input.notificationId,
        sessionName: input.sessionName,
        status: 'pending',
        createdAt: now,
        expiresAt,
        resentFrom: oldToken,
    });
    // Step 5: Send notification
    const kycLink = `https://example.com/kyc?token=${newToken}`;
    try {
        const success = await sendNotification(input.notificationId, kycLink, input.sessionName);
        if (!success) {
            return { success: false, error: 'notification_send_failed' };
        }
    }
    catch (_a) {
        return { success: false, error: 'notification_send_error' };
    }
    // Step 6: Update status to notification_sent
    setNestedValue(data, `${kycRequestsPath}/${newToken}/status`, 'notification_sent');
    setNestedValue(data, `${kycRequestsPath}/${newToken}/notificationSentAt`, Date.now());
    return {
        success: true,
        newToken,
        expiresAt,
    };
}
// ---- Property Tests ----
describe('resendKycNotification Property Tests', () => {
    /**
     * Property 7: KYC通知再送時の旧トークン無効化
     * 再送成功時に旧トークンのステータスが `expired` に更新される
     *
     * **Validates: Requirements 5.5**
     */
    describe('Property 7: KYC通知再送時の旧トークン無効化', () => {
        it('再送成功時に旧トークンのステータスが expired に更新される', async () => {
            await fc.assert(fc.asyncProperty(ethAddressArb, tokenArb, tokenArb, emailArb, sessionNameArb, nonCompletedStatusArb, async (address, oldToken, newTokenValue, email, sessionName, oldStatus) => {
                fc.pre(oldToken !== newTokenValue);
                const data = {};
                const normalizedAddress = address.toLowerCase();
                // Set up an existing KYC request with a non-completed status
                setNestedValue(data, `${DB_ROOT}/kycRequests/${oldToken}`, {
                    recipientAddress: normalizedAddress,
                    notificationType: 'email',
                    notificationId: email,
                    sessionName,
                    status: oldStatus,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
                });
                const result = await resendKycNotificationCore({
                    recipientAddress: address,
                    notificationType: 'email',
                    notificationId: email,
                    sessionName,
                }, data, async () => true, () => newTokenValue);
                expect(result.success).toBe(true);
                // Property: old token status must be 'expired'
                const oldTokenStatus = getNestedValue(data, `${DB_ROOT}/kycRequests/${oldToken}/status`);
                expect(oldTokenStatus).toBe('expired');
            }), { numRuns: 50 });
        });
        it('旧トークンの他のフィールドは変更されない', async () => {
            await fc.assert(fc.asyncProperty(ethAddressArb, tokenArb, tokenArb, emailArb, sessionNameArb, nonCompletedStatusArb, async (address, oldToken, newTokenValue, email, sessionName, oldStatus) => {
                fc.pre(oldToken !== newTokenValue);
                const data = {};
                const normalizedAddress = address.toLowerCase();
                const createdAt = Date.now() - 1000;
                const expiresAt = createdAt + 7 * 24 * 60 * 60 * 1000;
                setNestedValue(data, `${DB_ROOT}/kycRequests/${oldToken}`, {
                    recipientAddress: normalizedAddress,
                    notificationType: 'email',
                    notificationId: email,
                    sessionName,
                    status: oldStatus,
                    createdAt,
                    expiresAt,
                });
                await resendKycNotificationCore({
                    recipientAddress: address,
                    notificationType: 'email',
                    notificationId: email,
                    sessionName,
                }, data, async () => true, () => newTokenValue);
                // Property: other fields of old token remain unchanged
                const oldEntry = getNestedValue(data, `${DB_ROOT}/kycRequests/${oldToken}`);
                expect(oldEntry.recipientAddress).toBe(normalizedAddress);
                expect(oldEntry.createdAt).toBe(createdAt);
                expect(oldEntry.expiresAt).toBe(expiresAt);
            }), { numRuns: 50 });
        });
    });
    /**
     * Property 8: KYC通知再送時の新トークン生成
     * 再送成功時に新トークンが生成され有効期限が設定される
     *
     * **Validates: Requirements 5.6**
     */
    describe('Property 8: KYC通知再送時の新トークン生成', () => {
        it('再送成功時に新トークンが生成され有効期限が7日間に設定される', async () => {
            await fc.assert(fc.asyncProperty(ethAddressArb, tokenArb, tokenArb, emailArb, sessionNameArb, nonCompletedStatusArb, async (address, oldToken, newTokenValue, email, sessionName, oldStatus) => {
                fc.pre(oldToken !== newTokenValue);
                const data = {};
                const normalizedAddress = address.toLowerCase();
                setNestedValue(data, `${DB_ROOT}/kycRequests/${oldToken}`, {
                    recipientAddress: normalizedAddress,
                    notificationType: 'email',
                    notificationId: email,
                    sessionName,
                    status: oldStatus,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
                });
                const beforeTime = Date.now();
                const result = await resendKycNotificationCore({
                    recipientAddress: address,
                    notificationType: 'email',
                    notificationId: email,
                    sessionName,
                }, data, async () => true, () => newTokenValue);
                const afterTime = Date.now();
                expect(result.success).toBe(true);
                expect(result.newToken).toBe(newTokenValue);
                // Property: new token exists in DB with correct fields
                const newEntry = getNestedValue(data, `${DB_ROOT}/kycRequests/${newTokenValue}`);
                expect(newEntry).toBeDefined();
                expect(newEntry.recipientAddress).toBe(normalizedAddress);
                expect(newEntry.status).toBe('notification_sent');
                expect(newEntry.resentFrom).toBe(oldToken);
                // Property: expiresAt is approximately 7 days from now
                const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                expect(newEntry.expiresAt).toBeGreaterThanOrEqual(beforeTime + sevenDaysMs);
                expect(newEntry.expiresAt).toBeLessThanOrEqual(afterTime + sevenDaysMs);
                // Property: result.expiresAt matches the stored value
                expect(result.expiresAt).toBe(newEntry.expiresAt);
            }), { numRuns: 50 });
        });
        it('新トークンのresentFromフィールドが旧トークンを参照する', async () => {
            await fc.assert(fc.asyncProperty(ethAddressArb, tokenArb, tokenArb, emailArb, sessionNameArb, nonCompletedStatusArb, async (address, oldToken, newTokenValue, email, sessionName, oldStatus) => {
                fc.pre(oldToken !== newTokenValue);
                const data = {};
                const normalizedAddress = address.toLowerCase();
                setNestedValue(data, `${DB_ROOT}/kycRequests/${oldToken}`, {
                    recipientAddress: normalizedAddress,
                    notificationType: 'email',
                    notificationId: email,
                    sessionName,
                    status: oldStatus,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
                });
                const result = await resendKycNotificationCore({
                    recipientAddress: address,
                    notificationType: 'email',
                    notificationId: email,
                    sessionName,
                }, data, async () => true, () => newTokenValue);
                expect(result.success).toBe(true);
                // Property: resentFrom links new token to old token
                const newEntry = getNestedValue(data, `${DB_ROOT}/kycRequests/${newTokenValue}`);
                expect(newEntry.resentFrom).toBe(oldToken);
            }), { numRuns: 50 });
        });
    });
    /**
     * Property 9: KYC完了済みアドレスへの再送防止
     * KYC完了済みアドレスへの再送は失敗する
     *
     * **Validates: Requirements 5.11**
     */
    describe('Property 9: KYC完了済みアドレスへの再送防止', () => {
        it('KYC完了済みアドレスへの再送は失敗する', async () => {
            await fc.assert(fc.asyncProperty(ethAddressArb, tokenArb, emailArb, sessionNameArb, async (address, token, email, sessionName) => {
                const data = {};
                const normalizedAddress = address.toLowerCase();
                // Set up a completed KYC request
                setNestedValue(data, `${DB_ROOT}/kycRequests/${token}`, {
                    recipientAddress: normalizedAddress,
                    notificationType: 'email',
                    notificationId: email,
                    sessionName,
                    status: 'completed',
                    createdAt: Date.now(),
                    completedAt: Date.now(),
                });
                const result = await resendKycNotificationCore({
                    recipientAddress: address,
                    notificationType: 'email',
                    notificationId: email,
                    sessionName,
                }, data, async () => true, () => 'should-not-be-used');
                // Property: resend must fail
                expect(result.success).toBe(false);
                expect(result.error).toBe('kyc_already_completed');
                // Property: no new token should be created
                const shouldNotExist = getNestedValue(data, `${DB_ROOT}/kycRequests/should-not-be-used`);
                expect(shouldNotExist).toBeUndefined();
                // Property: original token status remains 'completed' (not changed)
                const originalStatus = getNestedValue(data, `${DB_ROOT}/kycRequests/${token}/status`);
                expect(originalStatus).toBe('completed');
            }), { numRuns: 50 });
        });
        it('KYCリクエストが存在しないアドレスへの再送は失敗する', async () => {
            await fc.assert(fc.asyncProperty(ethAddressArb, emailArb, sessionNameArb, async (address, email, sessionName) => {
                const data = {};
                const result = await resendKycNotificationCore({
                    recipientAddress: address,
                    notificationType: 'email',
                    notificationId: email,
                    sessionName,
                }, data, async () => true, () => 'should-not-be-used');
                // Property: resend must fail when no KYC request exists
                expect(result.success).toBe(false);
                expect(result.error).toBe('no_kyc_request_found');
            }), { numRuns: 50 });
        });
    });
});
//# sourceMappingURL=resendKycNotification.property.test.js.map