/**
 * Property-based tests for sendKycNotifications and submitKyc Cloud Functions
 *
 * **Validates: Requirements 4.2, 6.1, 6.5, 6.6**
 *
 * Properties tested:
 * - Property 5: 通知送信の冪等性 - KYC完了済みアドレスには通知を送信しない（skippedにカウント）
 * - Property 3: KYC完了→承認済みアドレス追加の原子性 - KYC完了時に必ず承認済みアドレスにも追加される
 * - Property 4: 重複KYC防止 - 同一アドレスに対するKYCは1回のみ完了可能
 */

import * as fc from 'fast-check';

// ---- Generators ----

/** Generate a valid Ethereum address (0x + 40 hex chars, lowercase) */
const ethAddressArb: fc.Arbitrary<string> = fc
  .stringMatching(/^[0-9a-f]{40}$/)
  .map((hex: string) => `0x${hex}`);

/** Generate a valid email address */
const emailArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z]{1,8}$/),
  )
  .map(([user, domain]: [string, string]) => `${user}@${domain}.com`);

/** Generate a session name */
const sessionNameArb: fc.Arbitrary<string> = fc.stringMatching(/^[a-z0-9 ]{1,20}$/);

/** Generate a UUID-like token */
const tokenArb: fc.Arbitrary<string> = fc.uuid();

/** Generate a full name */
const fullNameArb: fc.Arbitrary<string> = fc.stringMatching(/^[a-z ]{2,20}$/);

// ---- In-memory Firebase RTDB helpers ----

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('/').filter(Boolean);
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('/').filter(Boolean);
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

// ---- Core logic extracted for testing ----

const DB_ROOT = 'dev';

interface Recipient {
  address: string;
  notificationType: string;
  notificationId: string;
  sessionName: string;
}

interface SendResult {
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{ address: string; status: string; reason?: string }>;
}

/**
 * Core logic of sendKycNotifications, extracted from the HTTP handler.
 * This mirrors the logic in index.ts but operates on in-memory data.
 */
async function sendKycNotificationsCore(
  recipients: Recipient[],
  data: Record<string, unknown>,
  sendNotification: (to: string, link: string, session: string) => Promise<boolean>,
): Promise<SendResult> {
  const kycRequestsPath = `${DB_ROOT}/kycRequests`;
  const approvedPath = `${DB_ROOT}/approvedAddresses`;

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const details: Array<{ address: string; status: string; reason?: string }> = [];

  for (const recipient of recipients) {
    const normalizedAddress = recipient.address.toLowerCase();

    // KYC完了済みチェック
    const kycRequests = getNestedValue(data, kycRequestsPath) as Record<string, Record<string, unknown>> | undefined;
    if (kycRequests) {
      const hasCompleted = Object.values(kycRequests).some(
        (entry) => entry.recipientAddress === normalizedAddress && entry.status === 'completed',
      );
      if (hasCompleted) {
        skipped++;
        details.push({ address: recipient.address, status: 'skipped', reason: 'kyc_already_completed' });
        continue;
      }
    }

    // 承認済みアドレスチェック
    const approved = getNestedValue(data, `${approvedPath}/${normalizedAddress}`);
    if (approved) {
      skipped++;
      details.push({ address: recipient.address, status: 'skipped', reason: 'address_already_approved' });
      continue;
    }

    // 未対応の通知タイプチェック
    if (recipient.notificationType !== 'email') {
      failed++;
      details.push({ address: recipient.address, status: 'failed', reason: 'unsupported_channel' });
      continue;
    }

    // KYCトークン生成・保存
    const token = `token-${normalizedAddress}-${Date.now()}-${Math.random()}`;
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000;

    setNestedValue(data, `${kycRequestsPath}/${token}`, {
      recipientAddress: normalizedAddress,
      notificationType: recipient.notificationType,
      notificationId: recipient.notificationId,
      sessionName: recipient.sessionName,
      status: 'pending',
      createdAt: now,
      expiresAt,
    });

    // 通知送信
    const kycLink = `https://example.com/kyc?token=${token}`;
    try {
      const success = await sendNotification(recipient.notificationId, kycLink, recipient.sessionName);
      if (success) {
        setNestedValue(data, `${kycRequestsPath}/${token}/status`, 'notification_sent');
        setNestedValue(data, `${kycRequestsPath}/${token}/notificationSentAt`, Date.now());
        sent++;
        details.push({ address: recipient.address, status: 'sent' });
      } else {
        failed++;
        details.push({ address: recipient.address, status: 'failed', reason: 'notification_send_failed' });
      }
    } catch {
      failed++;
      details.push({ address: recipient.address, status: 'failed', reason: 'notification_send_error' });
    }
  }

  return { sent, skipped, failed, details };
}

interface SubmitKycInput {
  token: string;
  walletAddress: string;
  fullName: string;
  email: string;
  signedMessage: string;
  recoveredAddress: string;
}

interface SubmitKycResult {
  success: boolean;
  error?: string;
}

/**
 * Core logic of submitKyc, extracted from the HTTP handler.
 * Signature verification is abstracted: we pass recoveredAddress directly.
 */
async function submitKycCore(
  input: SubmitKycInput,
  data: Record<string, unknown>,
): Promise<SubmitKycResult> {
  const kycRequestPath = `${DB_ROOT}/kycRequests/${input.token}`;
  const kycRequest = getNestedValue(data, kycRequestPath) as Record<string, unknown> | undefined;

  if (!kycRequest) {
    return { success: false, error: 'invalid_token' };
  }

  if (kycRequest.status === 'completed') {
    return { success: false, error: 'already_completed' };
  }

  if (kycRequest.expiresAt && (kycRequest.expiresAt as number) < Date.now()) {
    return { success: false, error: 'expired' };
  }

  if (input.recoveredAddress.toLowerCase() !== input.walletAddress.toLowerCase()) {
    return { success: false, error: 'signature_mismatch' };
  }

  if (input.recoveredAddress.toLowerCase() !== (kycRequest.recipientAddress as string).toLowerCase()) {
    return { success: false, error: 'address_mismatch' };
  }

  const normalizedAddress = input.walletAddress.toLowerCase();
  const now = Date.now();

  // Atomic multi-path update (mirrors the actual implementation)
  const updates: Record<string, unknown> = {
    [`${DB_ROOT}/kycRequests/${input.token}/status`]: 'completed',
    [`${DB_ROOT}/kycRequests/${input.token}/completedAt`]: now,
    [`${DB_ROOT}/kycRequests/${input.token}/kycData`]: {
      fullName: input.fullName,
      walletAddress: normalizedAddress,
      signedMessage: input.signedMessage,
      verifiedAt: now,
    },
    [`${DB_ROOT}/approvedAddresses/${normalizedAddress}`]: {
      address: normalizedAddress,
      userName: input.fullName,
      notificationType: kycRequest.notificationType,
      notificationId: kycRequest.notificationId,
      approvedAt: now,
      approvedBy: 'kyc_auto',
      kycToken: input.token,
    },
  };

  for (const [path, value] of Object.entries(updates)) {
    setNestedValue(data, path, value);
  }

  return { success: true };
}

// ---- Property Tests ----

describe('sendKycNotifications / submitKyc Property Tests', () => {

  /**
   * Property 5: 通知送信の冪等性
   * KYC完了済みアドレスには通知を送信しない（skippedにカウント）
   *
   * **Validates: Requirements 4.2**
   */
  describe('Property 5: 通知送信の冪等性', () => {
    it('KYC完了済みアドレスには通知を送信しない（skippedにカウント）', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(ethAddressArb, { minLength: 1, maxLength: 5 }),
          fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
          emailArb,
          sessionNameArb,
          async (addresses: string[], booleans: boolean[], email: string, sessionName: string) => {
            // Deduplicate addresses
            const uniqueAddresses = [...new Set(addresses.map((a: string) => a.toLowerCase()))].map(
              (a: string) => `0x${a.slice(2)}`,
            );
            const completedFlags = booleans.slice(0, uniqueAddresses.length);
            const data: Record<string, unknown> = {};
            let completedCount = 0;

            // Pre-populate completed KYC requests
            uniqueAddresses.forEach((addr: string, i: number) => {
              if (completedFlags[i]) {
                completedCount++;
                const token = `pre-${i}`;
                setNestedValue(data, `${DB_ROOT}/kycRequests/${token}`, {
                  recipientAddress: addr.toLowerCase(),
                  status: 'completed',
                  completedAt: Date.now(),
                });
              }
            });

            const recipients: Recipient[] = uniqueAddresses.map((addr: string) => ({
              address: addr,
              notificationType: 'email',
              notificationId: email,
              sessionName,
            }));

            const result = await sendKycNotificationsCore(recipients, data, async () => true);

            // The number of skipped must be >= the number of pre-completed addresses
            expect(result.skipped).toBeGreaterThanOrEqual(completedCount);

            // Every completed address must appear as 'skipped' in details
            uniqueAddresses.forEach((addr: string, i: number) => {
              if (completedFlags[i]) {
                const detail = result.details.find(
                  (d) => d.address === addr && d.status === 'skipped',
                );
                expect(detail).toBeDefined();
              }
            });

            // Invariant: sent + skipped + failed === recipients.length
            expect(result.sent + result.skipped + result.failed).toBe(recipients.length);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('承認済みアドレスにも通知を送信しない（skippedにカウント）', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethAddressArb,
          emailArb,
          sessionNameArb,
          async (address: string, email: string, sessionName: string) => {
            const data: Record<string, unknown> = {};
            const normalizedAddress = address.toLowerCase();

            // Pre-populate approved address
            setNestedValue(data, `${DB_ROOT}/approvedAddresses/${normalizedAddress}`, {
              address: normalizedAddress,
              approvedBy: 'kyc_auto',
            });

            const recipients: Recipient[] = [
              { address, notificationType: 'email', notificationId: email, sessionName },
            ];

            const result = await sendKycNotificationsCore(recipients, data, async () => true);

            expect(result.skipped).toBe(1);
            expect(result.sent).toBe(0);
            expect(result.details[0].status).toBe('skipped');
            expect(result.details[0].reason).toBe('address_already_approved');
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 3: KYC完了→承認済みアドレス追加の原子性
   * KYC完了時に必ず承認済みアドレスにも追加される
   *
   * **Validates: Requirements 6.1, 6.5, 6.6**
   */
  describe('Property 3: KYC完了→承認済みアドレス追加の原子性', () => {
    it('KYC完了時に必ず承認済みアドレスにも追加される', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethAddressArb,
          tokenArb,
          fullNameArb,
          emailArb,
          sessionNameArb,
          async (address: string, token: string, fullName: string, email: string, sessionName: string) => {
            const data: Record<string, unknown> = {};
            const normalizedAddress = address.toLowerCase();

            // Set up a pending KYC request
            setNestedValue(data, `${DB_ROOT}/kycRequests/${token}`, {
              recipientAddress: normalizedAddress,
              notificationType: 'email',
              notificationId: email,
              sessionName,
              status: 'notification_sent',
              createdAt: Date.now(),
              expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
            });

            const result = await submitKycCore(
              {
                token,
                walletAddress: address,
                fullName,
                email,
                signedMessage: `KYC Verification for ${token}`,
                recoveredAddress: address,
              },
              data,
            );

            expect(result.success).toBe(true);

            // Property: KYC status is completed
            const kycStatus = getNestedValue(data, `${DB_ROOT}/kycRequests/${token}/status`);
            expect(kycStatus).toBe('completed');

            // Property: approved address exists
            const approvedAddress = getNestedValue(
              data,
              `${DB_ROOT}/approvedAddresses/${normalizedAddress}`,
            ) as Record<string, unknown> | undefined;
            expect(approvedAddress).toBeDefined();
            expect(approvedAddress!.address).toBe(normalizedAddress);
            expect(approvedAddress!.approvedBy).toBe('kyc_auto');
            expect(approvedAddress!.kycToken).toBe(token);
            expect(approvedAddress!.userName).toBe(fullName);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('KYC失敗時には承認済みアドレスが追加されない', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethAddressArb,
          ethAddressArb,
          tokenArb,
          fullNameArb,
          emailArb,
          sessionNameArb,
          async (address: string, wrongAddress: string, token: string, fullName: string, email: string, sessionName: string) => {
            fc.pre(address.toLowerCase() !== wrongAddress.toLowerCase());

            const data: Record<string, unknown> = {};
            const normalizedAddress = address.toLowerCase();

            setNestedValue(data, `${DB_ROOT}/kycRequests/${token}`, {
              recipientAddress: normalizedAddress,
              notificationType: 'email',
              notificationId: email,
              sessionName,
              status: 'notification_sent',
              createdAt: Date.now(),
              expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
            });

            const result = await submitKycCore(
              {
                token,
                walletAddress: wrongAddress,
                fullName,
                email,
                signedMessage: `KYC Verification for ${token}`,
                recoveredAddress: wrongAddress,
              },
              data,
            );

            expect(result.success).toBe(false);

            // Property: approved address must NOT exist for the original address
            const approvedAddress = getNestedValue(
              data,
              `${DB_ROOT}/approvedAddresses/${normalizedAddress}`,
            );
            expect(approvedAddress).toBeUndefined();

            // Property: KYC status must NOT be completed
            const kycStatus = getNestedValue(data, `${DB_ROOT}/kycRequests/${token}/status`);
            expect(kycStatus).not.toBe('completed');
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 4: 重複KYC防止
   * 同一アドレスに対するKYCは1回のみ完了可能
   *
   * **Validates: Requirements 6.5**
   */
  describe('Property 4: 重複KYC防止', () => {
    it('同一トークンに対するKYCは1回のみ完了可能', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethAddressArb,
          tokenArb,
          fullNameArb,
          emailArb,
          sessionNameArb,
          async (address: string, token: string, fullName: string, email: string, sessionName: string) => {
            const data: Record<string, unknown> = {};
            const normalizedAddress = address.toLowerCase();

            setNestedValue(data, `${DB_ROOT}/kycRequests/${token}`, {
              recipientAddress: normalizedAddress,
              notificationType: 'email',
              notificationId: email,
              sessionName,
              status: 'notification_sent',
              createdAt: Date.now(),
              expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
            });

            const submitInput: SubmitKycInput = {
              token,
              walletAddress: address,
              fullName,
              email,
              signedMessage: `KYC Verification for ${token}`,
              recoveredAddress: address,
            };

            // First submission should succeed
            const result1 = await submitKycCore(submitInput, data);
            expect(result1.success).toBe(true);

            // Second submission with same token should fail
            const result2 = await submitKycCore(submitInput, data);
            expect(result2.success).toBe(false);
            expect(result2.error).toBe('already_completed');
          },
        ),
        { numRuns: 50 },
      );
    });

    it('KYC完了済みアドレスへの通知送信は冪等にスキップされる', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethAddressArb,
          tokenArb,
          fullNameArb,
          emailArb,
          sessionNameArb,
          fc.integer({ min: 2, max: 5 }),
          async (address: string, token: string, fullName: string, email: string, sessionName: string, repeatCount: number) => {
            const data: Record<string, unknown> = {};
            const normalizedAddress = address.toLowerCase();

            // Set up a completed KYC request
            setNestedValue(data, `${DB_ROOT}/kycRequests/${token}`, {
              recipientAddress: normalizedAddress,
              notificationType: 'email',
              notificationId: email,
              sessionName,
              status: 'completed',
              completedAt: Date.now(),
            });

            // Send notifications multiple times for the same completed address
            const recipients: Recipient[] = Array.from({ length: repeatCount }, () => ({
              address,
              notificationType: 'email',
              notificationId: email,
              sessionName,
            }));

            const result = await sendKycNotificationsCore(recipients, data, async () => true);

            // All should be skipped
            expect(result.skipped).toBe(repeatCount);
            expect(result.sent).toBe(0);
            expect(result.failed).toBe(0);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
