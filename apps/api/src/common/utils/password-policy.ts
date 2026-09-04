import { ConfigService } from '@nestjs/config';

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

export function getPasswordPolicy(config: ConfigService): PasswordPolicy {
  return {
    minLength: config.get<number>('app.password.minLength', 12)!,
    requireUppercase: config.get<boolean>('app.password.requireUppercase', true)!,
    requireLowercase: config.get<boolean>('app.password.requireLowercase', true)!,
    requireNumber: config.get<boolean>('app.password.requireNumber', true)!,
    requireSpecial: config.get<boolean>('app.password.requireSpecial', true)!,
  };
}

export function validatePasswordPolicy(password: string, policy: PasswordPolicy): string[] {
  const errors: string[] = [];
  if (password.length < policy.minLength) errors.push(`Password must be at least ${policy.minLength} characters`);
  if (policy.requireUppercase && !/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter');
  if (policy.requireLowercase && !/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter');
  if (policy.requireNumber && !/[0-9]/.test(password)) errors.push('Password must contain a number');
  if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain a special character');
  return errors;
}
