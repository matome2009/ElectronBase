const mockVerifyIdToken = jest.fn();

jest.mock('firebase-admin', () => ({
  auth: jest.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

import { verifyAdmin, verifyUser } from './auth';

function makeRequest(token = 'test-token') {
  return {
    headers: {
      authorization: `Bearer ${token}`,
    },
  } as any;
}

describe('auth helpers', () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
  });

  test('verifyUser returns decoded uid', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user_123' });

    await expect(verifyUser(makeRequest())).resolves.toBe('user_123');
    expect(mockVerifyIdToken).toHaveBeenCalledWith('test-token');
  });

  test('verifyAdmin accepts matching admin claims', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'admin_42',
      admin: true,
      adminLevel: 'superadmin',
      env: 'prd',
    });

    await expect(
      verifyAdmin(makeRequest(), { env: 'prd', minLevel: 'admin' }),
    ).resolves.toMatchObject({
      uid: 'admin_42',
      adminLevel: 'superadmin',
      env: 'prd',
    });
  });

  test('verifyAdmin rejects tokens without admin claim', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'admin_42',
      adminLevel: 'admin',
      env: 'dev',
    });

    await expect(
      verifyAdmin(makeRequest(), { env: 'dev' }),
    ).rejects.toThrow('Missing admin claim');
  });

  test('verifyAdmin rejects environment mismatch', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'admin_42',
      admin: true,
      adminLevel: 'admin',
      env: 'dev',
    });

    await expect(
      verifyAdmin(makeRequest(), { env: 'prd' }),
    ).rejects.toThrow('Admin token environment mismatch');
  });

  test('verifyAdmin rejects insufficient admin level', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'admin_42',
      admin: true,
      adminLevel: 'viewer',
      env: 'dev',
    });

    await expect(
      verifyAdmin(makeRequest(), { env: 'dev', minLevel: 'admin' }),
    ).rejects.toThrow('Insufficient admin level');
  });
});
