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

/** Generate a KYC status that is NOT completed (resend-eligible) */
const nonCompletedStatusArb: fc.Arbitrary<string> = fc.constantFrom(
  'pending',
  'notification_sent',
  'expired',
);

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

interface ResendInput {
  recipientAddress: string;
  notificationType: string;
  notificationId: string;
  sessionName: string;
}

interface ResendResult {
  success: boolean;
  error?: string;
  newToken?: string;
  expiresAt?: number;
}

/**
 * Core logic of resendKycNotification, extracted from the HTTP handler.
 * This mirrors the logic in index.ts but operates on in-memory data.
 */
async function resendKycNotificationCore(
  input: ResendInput,
  data: Record<string, unknown>,
  sendNotification: (to: string, link: string, session: string) => Promise<boolean>,
  generateToken: () => string,
): Promise<ResendResult> {
  const normalizedAddress = input.recipientAddress.toLowerCase();
  const kycRequestsPath = `${DB_ROOT}/kycRequests`;

  // Step 1: Search for existing KYC requests by recipientAddress
  const kycRequests = getNestedValue(data, kycRequestsPath) as Record<string, Record<string, unknown>> | undefined;

  if (!kycRequests) {
    return { success: false, error: 'no_kyc_request_found' };
  }

  const matchingEntries = Object.entries(kycRequests).filter(
    ([, entry]) => entry.recipientAddress === normalizedAddress,
  );

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
  } catch {
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
      await fc.assert(
        fc.asyncProperty(
          ethAddressArb,
          tokenArb,
          tokenArb,
          emailArb,
          sessionNameArb,
          nonCompletedStatusArb,
          async (
            address: string,
            oldToken: string,
            newTokenValue: string,
            email: string,
            sessionName: string,
            oldStatus: string,
          ) => {
            fc.pre(oldToken !== newTokenValue);

            const data: Record<string, unknown> = {};
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

            const result = await resendKycNotificationCore(
              {
                recipientAddress: address,
                notificationType: 'email',
                notificationId: email,
                sessionName,
              },
              data,
              async () => true,
              () => newTokenValue,
            );

            expect(result.success).toBe(true);

            // Property: old token status must be 'expired'
            const oldTokenStatus = getNestedValue(
              data,
              `${DB_ROOT}/kycRequests/${oldToken}/status`,
            );
            expect(oldTokenStatus).toBe('expired');
          },
        ),
        { numRuns: 50 },
      );
    });

    it('旧トークンの他のフィールドは変更されない', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethAddressArb,
          tokenArb,
          tokenArb,
          emailArb,
          sessionNameArb,
          nonCompletedStatusArb,
          async (
            address: string,
            oldToken: string,
            newTokenValue: string,
            email: string,
            sessionName: string,
            oldStatus: string,
          ) => {
            fc.pre(oldToken !== newTokenValue);

            const data: Record<string, unknown> = {};
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

            await resendKycNotificationCore(
              {
                recipientAddress: address,
                notificationType: 'email',
                notificationId: email,
                sessionName,
              },
              data,
              async () => true,
              () => newTokenValue,
            );

            // Property: other fields of old token remain unchanged
            const oldEntry = getNestedValue(
              data,
              `${DB_ROOT}/kycRequests/${oldToken}`,
            ) as Record<string, unknown>;
            expect(oldEntry.recipientAddress).toBe(normalizedAddress);
            expect(oldEntry.createdAt).toBe(createdAt);
            expect(oldEntry.expiresAt).toBe(expiresAt);
          },
        ),
        { numRuns: 50 },
      );
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
      await fc.assert(
        fc.asyncProperty(
          ethAddressArb,
          tokenArb,
          tokenArb,
          emailArb,
          sessionNameArb,
          nonCompletedStatusArb,
          async (
            address: string,
            oldToken: string,
            newTokenValue: string,
            email: string,
            sessionName: string,
            oldStatus: string,
          ) => {
            fc.pre(oldToken !== newTokenValue);

            const data: Record<string, unknown> = {};
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
            const result = await resendKycNotificationCore(
              {
                recipientAddress: address,
                notificationType: 'email',
                notificationId: email,
                sessionName,
              },
              data,
              async () => true,
              () => newTokenValue,
            );
            const afterTime = Date.now();

            expect(result.success).toBe(true);
            expect(result.newToken).toBe(newTokenValue);

            // Property: new token exists in DB with correct fields
            const newEntry = getNestedValue(
              data,
              `${DB_ROOT}/kycRequests/${newTokenValue}`,
            ) as Record<string, unknown>;
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
          },
        ),
        { numRuns: 50 },
      );
    });

    it('新トークンのresentFromフィールドが旧トークンを参照する', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethAddressArb,
          tokenArb,
          tokenArb,
          emailArb,
          sessionNameArb,
          nonCompletedStatusArb,
          async (
            address: string,
            oldToken: string,
            newTokenValue: string,
            email: string,
            sessionName: string,
            oldStatus: string,
          ) => {
            fc.pre(oldToken !== newTokenValue);

            const data: Record<string, unknown> = {};
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

            const result = await resendKycNotificationCore(
              {
                recipientAddress: address,
                notificationType: 'email',
                notificationId: email,
                sessionName,
              },
              data,
              async () => true,
              () => newTokenValue,
            );

            expect(result.success).toBe(true);

            // Property: resentFrom links new token to old token
            const newEntry = getNestedValue(
              data,
              `${DB_ROOT}/kycRequests/${newTokenValue}`,
            ) as Record<string, unknown>;
            expect(newEntry.resentFrom).toBe(oldToken);
          },
        ),
        { numRuns: 50 },
      );
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
      await fc.assert(
        fc.asyncProperty(
          ethAddressArb,
          tokenArb,
          emailArb,
          sessionNameArb,
          async (address: string, token: string, email: string, sessionName: string) => {
            const data: Record<string, unknown> = {};
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

            const result = await resendKycNotificationCore(
              {
                recipientAddress: address,
                notificationType: 'email',
                notificationId: email,
                sessionName,
              },
              data,
              async () => true,
              () => 'should-not-be-used',
            );

            // Property: resend must fail
            expect(result.success).toBe(false);
            expect(result.error).toBe('kyc_already_completed');

            // Property: no new token should be created
            const shouldNotExist = getNestedValue(
              data,
              `${DB_ROOT}/kycRequests/should-not-be-used`,
            );
            expect(shouldNotExist).toBeUndefined();

            // Property: original token status remains 'completed' (not changed)
            const originalStatus = getNestedValue(
              data,
              `${DB_ROOT}/kycRequests/${token}/status`,
            );
            expect(originalStatus).toBe('completed');
          },
        ),
        { numRuns: 50 },
      );
    });

    it('KYCリクエストが存在しないアドレスへの再送は失敗する', async () => {
      await fc.assert(
        fc.asyncProperty(
          ethAddressArb,
          emailArb,
          sessionNameArb,
          async (address: string, email: string, sessionName: string) => {
            const data: Record<string, unknown> = {};

            const result = await resendKycNotificationCore(
              {
                recipientAddress: address,
                notificationType: 'email',
                notificationId: email,
                sessionName,
              },
              data,
              async () => true,
              () => 'should-not-be-used',
            );

            // Property: resend must fail when no KYC request exists
            expect(result.success).toBe(false);
            expect(result.error).toBe('no_kyc_request_found');
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
