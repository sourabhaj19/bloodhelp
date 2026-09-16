import { sha256, randomToken, randomFamilyId, hashPassword, verifyPassword } from './hash';
import * as crypto from 'crypto';

describe('sha256', () => {
  it('produces deterministic hex digest', () => {
    expect(sha256('hello')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(sha256('hello')).toBe(sha256('hello'));
    expect(sha256('world')).not.toBe(sha256('hello'));
  });

  it('matches node crypto directly', () => {
    const input = 'test-input-123';
    const expected = crypto.createHash('sha256').update(input).digest('hex');
    expect(sha256(input)).toBe(expected);
  });

  it('handles empty string', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('randomToken', () => {
  it('defaults to 32 bytes => 64 hex chars', () => {
    const token = randomToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('respects custom byte length', () => {
    expect(randomToken(16)).toMatch(/^[0-9a-f]{32}$/);
    expect(randomToken(8)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('generates unique tokens', () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).not.toBe(b);
  });
});

describe('randomFamilyId', () => {
  it('is a valid UUID v4', () => {
    const id = randomFamilyId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('produces unique ids', () => {
    expect(randomFamilyId()).not.toBe(randomFamilyId());
  });
});

describe('hashPassword / verifyPassword', () => {
  it('hashes and verifies correctly', async () => {
    const plain = 'Str0ng!Pass123';
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
    expect(await verifyPassword(hash, plain)).toBe(true);
    expect(await verifyPassword(hash, 'wrong')).toBe(false);
  });

  it('verify returns false on invalid hash', async () => {
    expect(await verifyPassword('not-a-valid-hash', 'anything')).toBe(false);
  });
});
