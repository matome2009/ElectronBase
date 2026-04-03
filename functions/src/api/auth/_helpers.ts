import * as admin from 'firebase-admin';

export const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID || '';
export const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || '';
export const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5分

export async function getOrCreateFirebaseUser(uid: string): Promise<string> {
  const existing = await admin.auth().getUser(uid).catch(() => null);
  if (!existing) {
    await admin.auth().createUser({ uid });
  }
  return uid;
}

interface AppleJwk {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

export async function verifyAppleIdToken(idToken: string, clientId: string): Promise<{ sub: string; email?: string }> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as { kid: string; alg: string };
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
    iss: string; aud: string; exp: number; sub: string; email?: string;
  };

  // claims 検証
  if (payload.iss !== 'https://appleid.apple.com') throw new Error('Invalid issuer');
  if (payload.aud !== clientId) throw new Error('Invalid audience');
  if (Date.now() / 1000 > payload.exp) throw new Error('Token expired');

  // Apple 公開鍵取得
  const jwksRes = await fetch('https://appleid.apple.com/auth/keys');
  if (!jwksRes.ok) throw new Error('Failed to fetch Apple public keys');
  const jwks = await jwksRes.json() as { keys: AppleJwk[] };

  const jwk = jwks.keys.find(k => k.kid === header.kid);
  if (!jwk) throw new Error('No matching Apple public key');

  // 署名検証（Node 20 webcrypto）
  const { subtle } = (await import('crypto')).webcrypto as unknown as { subtle: SubtleCrypto };
  const publicKey = await subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: jwk.alg, ext: true } as JsonWebKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`);
  const signature = Buffer.from(parts[2], 'base64url');
  const valid = await subtle.verify('RSASSA-PKCS1-v1_5', publicKey, signature, signingInput);
  if (!valid) throw new Error('Invalid Apple token signature');

  return { sub: payload.sub, email: payload.email };
}
