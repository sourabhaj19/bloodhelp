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
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '12', 10),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    requireNumber: process.env.PASSWORD_REQUIRE_NUMBER !== 'false',
    requireSpecial: process.env.PASSWORD_REQUIRE_SPECIAL_CHARACTER !== 'false',
  },
  email: {
    provider: process.env.EMAIL_PROVIDER || 'smtp',
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    supportEmail: process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || 'no-reply@example.com',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USERNAME || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
  },
  map: {
    tileProvider: process.env.MAP_TILE_PROVIDER || 'osm',
    tileUrl: process.env.MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: process.env.MAP_ATTRIBUTION || '&copy; OpenStreetMap contributors',
  },
  geocoding: {
    provider: process.env.GEOCODING_PROVIDER || '',
    baseUrl: process.env.GEOCODING_BASE_URL || '',
    apiKey: process.env.GEOCODING_API_KEY || '',
  },
}));
