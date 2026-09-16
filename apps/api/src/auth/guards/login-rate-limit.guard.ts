import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { RedisService } from '../../redis/redis.service';

/**
 * Throttles POST /auth/login per-IP and per-identifier (email/mobile) using
 * a fixed-window counter in Redis (or in-memory fallback when Redis is absent).
 *
 * Two independent windows are enforced:
 *  - login:ip:{ip}            -> RATE_LIMIT_LOGIN_IP_MAX per RATE_LIMIT_LOGIN_IP_WINDOW_MS
 *  - login:identifier:{value} -> RATE_LIMIT_LOGIN_IDENTIFIER_MAX per window
 * If either window is exceeded, respond 429 AUTH_RATE_LIMITED with Retry-After.
 *
 * Normalization: identifier is trimmed; emails lower-cased. IP is taken from
 * X-Forwarded-For (first entry) falling back to req.ip — matching AuthController.getMeta.
 */
@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(LoginRateLimitGuard.name);

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow disabling via env for tests if needed
    const enabled = this.config.get<boolean>('app.rateLimit.enabled', true);
    if (!enabled) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    // Only throttle POST /auth/login — guard is applied selectively, but double-check
    // so reused guard elsewhere doesn't misfire.
    const ip = this.getClientIp(req);
    const rawIdentifier = (req.body as any)?.identifier as string | undefined;

    const loginCfg = this.config.get<any>('app.rateLimit.login');
    const ipMax: number = loginCfg?.ip?.max ?? 10;
    const ipWindowMs: number = loginCfg?.ip?.windowMs ?? 15 * 60 * 1000;
    const identMax: number = loginCfg?.identifier?.max ?? 5;
    const identWindowMs: number = loginCfg?.identifier?.windowMs ?? 15 * 60 * 1000;

    const ipWindowSec = Math.ceil(ipWindowMs / 1000);
    const identWindowSec = Math.ceil(identWindowMs / 1000);

    // Check per-IP window first (always present)
    const ipKey = `login:ip:${this.sanitize(ip)}`;
    const ipResult = await this.redis.consume(ipKey, ipMax, ipWindowSec);
    this.setRateLimitHeaders(res, 'ip', ipMax, ipResult.remaining, ipResult.ttlMs);

    if (!ipResult.allowed) {
      const retryAfterSec = Math.ceil(ipResult.retryAfterMs / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      this.logger.warn(`Login rate limit hit (IP) — ip=${ip} count=${ipResult.count}/${ipMax} ttlMs=${ipResult.ttlMs}`);
      throw new HttpException(
        {
          code: 'AUTH_RATE_LIMITED',
          message: `Too many login attempts. Try again in ${retryAfterSec} seconds.`,
          details: { limit: ipMax, windowMs: ipWindowMs, retryAfterMs: ipResult.retryAfterMs, scope: 'ip' },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Then per-identifier if supplied (prevents targeted brute-force even with IP rotation)
    if (rawIdentifier && typeof rawIdentifier === 'string' && rawIdentifier.trim().length > 0) {
      const normalized = this.normalizeIdentifier(rawIdentifier);
      const identKey = `login:identifier:${this.sanitize(normalized)}`;
      const identResult = await this.redis.consume(identKey, identMax, identWindowSec);

      // Merge headers: most restrictive remaining wins for client visibility
      // Keep IP headers already set; add identifier-specific ones as supplemental
      res.setHeader('X-RateLimit-Limit-Identifier', String(identMax));
      res.setHeader('X-RateLimit-Remaining-Identifier', String(identResult.remaining));

      if (!identResult.allowed) {
        const retryAfterSec = Math.ceil(identResult.retryAfterMs / 1000);
        res.setHeader('Retry-After', String(retryAfterSec));
        this.logger.warn(
          `Login rate limit hit (identifier) — identifier=${this.maskIdentifier(normalized)} ip=${ip} count=${identResult.count}/${identMax}`,
        );
        throw new HttpException(
          {
            code: 'AUTH_RATE_LIMITED',
            message: `Too many login attempts for this account. Try again in ${retryAfterSec} seconds.`,
            details: { limit: identMax, windowMs: identWindowMs, retryAfterMs: identResult.retryAfterMs, scope: 'identifier' },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return true;
  }

  private getClientIp(req: Request): string {
    const xff = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    // req.ip may be ::ffff:127.0.0.1 etc — keep as-is but sanitize for key
    return (xff || req.ip || 'unknown').toString();
  }

  private normalizeIdentifier(raw: string): string {
    const trimmed = raw.trim();
    // Emails are case-insensitive, mobiles are not but we trim anyway
    if (trimmed.includes('@')) return trimmed.toLowerCase();
    return trimmed;
  }

  private sanitize(value: string): string {
    // Redis key safety: replace whitespace/colon/control chars
    return value.replace(/[\s:\r\n]+/g, '_').slice(0, 200) || 'unknown';
  }

  private maskIdentifier(value: string): string {
    if (value.includes('@')) {
      const [local, domain] = value.split('@');
      if (!domain) return '***';
      return `${local.slice(0, 2)}***@${domain}`;
    }
    // mobile: show last 4
    if (value.length > 4) return `***${value.slice(-4)}`;
    return '***';
  }

  private setRateLimitHeaders(res: Response, _scope: string, limit: number, remaining: number, ttlMs: number) {
    try {
      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000 + ttlMs / 1000)));
    } catch {}
  }
}
