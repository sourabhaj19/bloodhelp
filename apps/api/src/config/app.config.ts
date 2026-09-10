import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
  databaseUrl: process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/bloodhelp',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'replace-with-at-least-32-random-bytes-access',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'replace-with-at-least-32-random-bytes-refresh',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    // Short-lived refresh for logins WITHOUT "remember me" (session cookie)
    refreshExpiresInShort: process.env.JWT_REFRESH_EXPIRES_IN_SHORT || '1d',
  },
  password: {
    resetExpiresIn: process.env.PASSWORD_RESET_EXPIRES_IN || '30m',
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
    requireNumber: process.env.PASSWORD_REQUIRE_NUMBER === 'true',
    requireSpecial: process.env.PASSWORD_REQUIRE_SPECIAL_CHARACTER !== 'false',
  },
  email: {
    provider: process.env.EMAIL_PROVIDER || 'smtp',
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    supportEmail: process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || 'no-reply@example.com',
    verificationExpiresIn: process.env.EMAIL_VERIFICATION_EXPIRES_IN || '24h',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USERNAME || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
  },
  geocoding: {
    provider: process.env.GEOCODING_PROVIDER || '',
    baseUrl: process.env.GEOCODING_BASE_URL || '',
    apiKey: process.env.GEOCODING_API_KEY || '',
  },
  sms: {
    // 'log' prints OTPs to server logs (dev). Plug a real provider (Twilio/MSG91/…) here later.
    provider: process.env.SMS_PROVIDER || 'log',
    from: process.env.SMS_FROM || 'BloodHelp',
  },
  otp: {
    mobileExpiresIn: process.env.MOBILE_OTP_EXPIRES_IN || '10m',
    maxAttempts: parseInt(process.env.MOBILE_OTP_MAX_ATTEMPTS || '5', 10),
    pepper: process.env.MOBILE_OTP_PEPPER || 'dev-pepper-change-me',
  },
}));
