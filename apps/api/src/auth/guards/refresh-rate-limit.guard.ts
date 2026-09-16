import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { RedisService } from '../../redis/redis.service';

/**
 * Throttles POST /auth/refresh per-IP (and per-token when a token is presented).
 *
 * Refresh tokens are 256-bit random (unjguessable), so bulk guessing is infeasible —
 * but rate limiting still prevents abusive floods and slows token-reuse races.
 *
 * Keys:
 *  - refresh:ip:{ip}  -> RATE_LIMIT_REFRESH_IP_MAX per window (default 30 / 15m)
 *
 * If a refresh token is presented, we also track per-token-hash to prevent a single
 * stolen token being hammered from many IPs without tripping the IP limit.
 */
@Injectable()
export class RefreshRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RefreshRateLimitGuard.name);

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const enabled = this.config.get<boolean>('app.rateLimit.enabled', true);
    if (!enabled) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const ip = this.getClientIp(req);
    const refreshCfg = this.config.get<any>('app.rateLimit.refresh');
    const ipMax: number = refreshCfg?.ip?.max ?? 30;
    const ipWindowMs: number = refreshCfg?.ip?.windowMs ?? 15 * 60 * 1000;
    const ipWindowSec = Math.ceil(ipWindowMs / 1000);

    const ipKey = `refresh:ip:${this.sanitize(ip)}`;
    const ipResult = await this.redis.consume(ipKey, ipMax, ipWindowSec);

    try {
      res.setHeader('X-RateLimit-Limit', String(ipMax));
      res.setHeader('X-RateLimit-Remaining', String(ipResult.remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000 + ipResult.ttlMs / 1000)));
    } catch {}

    if (!ipResult.allowed) {
      const retryAfterSec = Math.ceil(ipResult.retryAfterMs / 1000);
      try {
        res.setHeader('Retry-After', String(retryAfterSec));
      } catch {}
      this.logger.warn(`Refresh rate limit hit (IP) — ip=${ip} count=${ipResult.count}/${ipMax}`);
      throw new HttpException(
        {
          code: 'AUTH_RATE_LIMITED',
          message: `Too many refresh attempts. Try again in ${retryAfterSec} seconds.`,
          details: { limit: ipMax, windowMs: ipWindowMs, retryAfterMs: ipResult.retryAfterMs, scope: 'ip' },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getClientIp(req: Request): string {
    const xff = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    return (xff || req.ip || 'unknown').toString();
  }

  private sanitize(value: string): string {
    return value.replace(/[\s:\r\n]+/g, '_').slice(0, 200) || 'unknown';
  }
}
