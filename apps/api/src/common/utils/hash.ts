import * as crypto from 'crypto';
import * as argon2 from 'argon2';

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

// Dummy hash used to keep timing constant when user does not exist (prevents enumeration via timing)
let DUMMY_HASH: string | null = null;
export async function getDummyHash(): Promise<string> {
  if (!DUMMY_HASH) DUMMY_HASH = await hashPassword('dummy-password-not-used-123!@#');
  return DUMMY_HASH;
}

export function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex'); // 64 chars for 32 bytes
}

export function randomFamilyId(): string {
  return crypto.randomUUID();
}
