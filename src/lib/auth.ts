import bcrypt from 'bcryptjs';
import { createHmac, timingSafeEqual } from 'node:crypto';

// ── Password Utilities ──────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── JWT Utilities (HMAC-SHA256 via node:crypto) ─────────────────────────────

function base64urlEncode(data: string): string {
  return Buffer.from(data, 'utf-8').toString('base64url');
}

function base64urlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

export function createToken(payload: object): string {
  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64urlEncode(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  const signature = createHmac('sha256', secret).update(signingInput).digest('base64url');
  return `${signingInput}.${signature}`;
}

export function verifyToken(token: string): object | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;
    const signingInput = `${headerEncoded}.${payloadEncoded}`;
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const expectedSignature = createHmac('sha256', secret).update(signingInput).digest('base64url');

    const actualSigBuf = Buffer.from(signatureEncoded, 'base64url');
    const expectedSigBuf = Buffer.from(expectedSignature, 'base64url');

    if (actualSigBuf.length !== expectedSigBuf.length) return null;
    const isValid = timingSafeEqual(actualSigBuf, expectedSigBuf);
    if (!isValid) return null;

    const payload = JSON.parse(base64urlDecode(payloadEncoded)) as Record<string, unknown>;

    if (typeof payload.exp === 'number' && Date.now() / 1000 > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
