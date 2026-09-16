import { validatePasswordPolicy, getPasswordPolicy, PasswordPolicy } from './password-policy';

describe('validatePasswordPolicy', () => {
  const basePolicy: PasswordPolicy = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: false,
    requireNumber: false,
    requireSpecial: true,
  };

  it('passes when all requirements met', () => {
    expect(validatePasswordPolicy('Abcdef1!', basePolicy)).toEqual([]);
    expect(validatePasswordPolicy('Strong!Pass', basePolicy)).toEqual([]);
  });

  it('fails when too short', () => {
    const errors = validatePasswordPolicy('Ab1!', basePolicy);
    expect(errors).toEqual(expect.arrayContaining(['Password must be at least 8 characters']));
  });

  it('fails when missing uppercase', () => {
    const errors = validatePasswordPolicy('abcdef1!', basePolicy);
    expect(errors).toContain('Password must contain an uppercase letter');
  });

  it('fails when missing special character', () => {
    const errors = validatePasswordPolicy('Abcdefg1', basePolicy);
    expect(errors).toContain('Password must contain a special character');
  });

  it('enforces lowercase when required', () => {
    const policy: PasswordPolicy = { ...basePolicy, requireLowercase: true };
    expect(validatePasswordPolicy('ABCDEFG1!', policy)).toContain('Password must contain a lowercase letter');
    expect(validatePasswordPolicy('Abcdef1!', policy)).toEqual([]);
  });

  it('enforces number when required', () => {
    const policy: PasswordPolicy = { ...basePolicy, requireNumber: true };
    expect(validatePasswordPolicy('Abcdefg!', policy)).toContain('Password must contain a number');
    expect(validatePasswordPolicy('Abcdefg1!', policy)).toEqual([]);
  });

  it('reports multiple errors at once', () => {
    const policy: PasswordPolicy = { minLength: 12, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSpecial: true };
    const errors = validatePasswordPolicy('abc', policy);
    expect(errors.length).toBeGreaterThanOrEqual(3);
    expect(errors.join(' ')).toMatch(/at least 12/);
  });

  it('respects custom minLength', () => {
    const policy: PasswordPolicy = { ...basePolicy, minLength: 12 };
    expect(validatePasswordPolicy('Abcdef1!aaaa', policy)).toEqual([]);
    expect(validatePasswordPolicy('Abcdef1!', policy)).toContain('Password must be at least 12 characters');
  });

  it('passes with permissive policy (all optional except length)', () => {
    const permissive: PasswordPolicy = { minLength: 4, requireUppercase: false, requireLowercase: false, requireNumber: false, requireSpecial: false };
    expect(validatePasswordPolicy('abcd', permissive)).toEqual([]);
    expect(validatePasswordPolicy('ABC', permissive)).toContain('Password must be at least 4 characters');
  });
});

describe('getPasswordPolicy', () => {
  function mockConfig(overrides: Record<string, any> = {}) {
    const defaults: Record<string, any> = {
      'app.password.minLength': 8,
      'app.password.requireUppercase': true,
      'app.password.requireLowercase': false,
      'app.password.requireNumber': false,
      'app.password.requireSpecial': true,
      ...overrides,
    };
    return { get: (key: string, _default: any) => defaults[key] ?? _default } as any;
  }

  it('returns policy from ConfigService with defaults', () => {
    const policy = getPasswordPolicy(mockConfig());
    expect(policy).toEqual({ minLength: 8, requireUppercase: true, requireLowercase: false, requireNumber: false, requireSpecial: true });
  });

  it('honors overridden env values', () => {
    const policy = getPasswordPolicy(mockConfig({ 'app.password.minLength': 12, 'app.password.requireNumber': true }));
    expect(policy.minLength).toBe(12);
    expect(policy.requireNumber).toBe(true);
  });
});
