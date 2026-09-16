import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  retryAfterMs: number;
  ttlMs: number;
}

interface MemoryEntry {
  count: number;
  expiresAt: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client?: Redis;
  private isRedisReady = false;
  private fallback = new Map<string, MemoryEntry>();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.config.get<string>('app.redisUrl') || process.env.REDIS_URL || '';
    // Respect empty REDIS_URL -> in-memory fallback (dev-friendly, still rate-limited per instance)
    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL not set — using in-memory rate-limit store. ' +
          'Set REDIS_URL to enable distributed throttling (multi-instance safe).',
      );
      this.startCleanupTimer();
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        connectTimeout: 3000,
        retryStrategy: () => null, // fail fast — fallback to memory
      });

      this.client.on('error', (err) => {
        this.logger.warn(`Redis error — falling back to memory: ${err.message}`);
        this.isRedisReady = false;
      });
      this.client.on('close', () => {
        this.isRedisReady = false;
      });
      this.client.on('ready', () => {
        this.isRedisReady = true;
        this.logger.log('Redis connected — distributed rate limiting enabled');
      });

      await this.client.connect();
      const pong = await this.client.ping();
      if (pong === 'PONG') {
        this.isRedisReady = true;
        this.logger.log('Redis PING OK — rate limiting via Redis');
      } else {
        this.logger.warn('Redis PING unexpected response — using memory fallback');
        this.isRedisReady = false;
      }
    } catch (err: any) {
      this.logger.warn(
        `Redis connection failed (${err?.message || err}) — falling back to in-memory rate limiting. ` +
          `Requests will still be throttled (per-instance), but not distributed.`,
      );
      this.isRedisReady = false;
      try {
        await this.client?.quit().catch(() => {});
      } catch {}
      // keep client undefined so we don't keep retrying on every consume
      // but retain fallback map
    }

    this.startCleanupTimer();
  }

  async onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.client) {
      try {
        await this.client.quit();
      } catch {}
    }
  }

  isRedisAvailable(): boolean {
    return this.isRedisReady && !!this.client && this.client.status === 'ready';
  }

  getClient(): Redis | undefined {
    return this.isRedisAvailable() ? this.client : undefined;
  }

  async ping(): Promise<'ok' | 'error' | 'skipped'> {
    if (!this.client) return 'skipped';
    try {
      if (!this.isRedisReady) await this.client.connect().catch(() => {});
      const pong = await this.client.ping();
      return pong === 'PONG' ? 'ok' : 'error';
    } catch {
      return 'error';
    }
  }

  /**
   * Fixed-window counter using Redis INCR+EXPIRE when available, else in-memory Map.
   * Atomic enough for rate limiting: first increment creates the window, subsequent
   * increments stay within the same TTL window.
   */
  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const namespaced = key.startsWith('rl:') ? key : `rl:${key}`;
    // Try Redis path first
    if (this.isRedisAvailable() && this.client) {
      try {
        // INCR is atomic; EXPIRE only on first hit
        const count = await this.client.incr(namespaced);
        if (count === 1) {
          await this.client.expire(namespaced, windowSeconds);
        } else {
          // Ensure TTL is set (covers edge where key existed without TTL due to prior fallback or race)
          const ttl = await this.client.ttl(namespaced);
          if (ttl === -1) {
            await this.client.expire(namespaced, windowSeconds);
          }
        }
        const ttlSec = await this.client.ttl(namespaced);
        const ttlMs = ttlSec > 0 ? ttlSec * 1000 : windowSeconds * 1000;

        const allowed = count <= limit;
        return {
          count,
          allowed,
          remaining: Math.max(0, limit - count),
          retryAfterMs: allowed ? 0 : ttlMs,
          ttlMs,
        };
      } catch (err: any) {
        this.logger.warn(`Redis consume failed for ${namespaced}: ${err?.message || err} — using memory fallback`);
        this.isRedisReady = false;
        // fall through to memory
      }
    }

    // In-memory fallback (per-instance, but still protects against brute force in dev/single-instance)
    const now = Date.now();
    let entry = this.fallback.get(namespaced);
    if (!entry || now >= entry.expiresAt) {
      entry = { count: 1, expiresAt: now + windowSeconds * 1000 };
      this.fallback.set(namespaced, entry);
      return {
        count: 1,
        allowed: 1 <= limit,
        remaining: Math.max(0, limit - 1),
        retryAfterMs: 0,
        ttlMs: windowSeconds * 1000,
      };
    }

    entry.count += 1;
    const ttlMs = Math.max(0, entry.expiresAt - now);
    const allowed = entry.count <= limit;
    return {
      count: entry.count,
      allowed,
      remaining: Math.max(0, limit - entry.count),
      retryAfterMs: allowed ? 0 : ttlMs,
      ttlMs,
    };
  }

  /** Reset a key (useful after successful login if you want to clear the window — by default we keep it). */
  async reset(key: string): Promise<void> {
    const namespaced = key.startsWith('rl:') ? key : `rl:${key}`;
    if (this.isRedisAvailable() && this.client) {
      try {
        await this.client.del(namespaced);
      } catch {}
    }
    this.fallback.delete(namespaced);
  }

  private startCleanupTimer() {
    // Prune expired memory entries every 60s to prevent unbounded growth
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.fallback.entries()) {
        if (now >= v.expiresAt) this.fallback.delete(k);
      }
      // Prevent timer from keeping process alive in tests
      // (Node: unref)
      if (this.cleanupTimer) this.cleanupTimer.unref?.();
    }, 60_000);
    this.cleanupTimer.unref?.();
  }
}
