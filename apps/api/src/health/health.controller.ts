import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe — always 200 if process is up' })
  health() {
    return {
      success: true,
      data: { status: 'ok', service: 'bloodhelp-api', timestamp: new Date().toISOString() },
      message: 'Service is healthy',
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — checks DB (+ Redis when configured)' })
  async ready() {
    const checks: Record<string, string> = {};
    let ready = true;

    // DB check
    try {
      const ok = await this.prisma.isHealthy();
      checks.database = ok ? 'ok' : 'error';
      if (!ok) ready = false;
    } catch (e) {
      checks.database = 'error';
      ready = false;
    }

    // Redis check — uses the wired RedisService (ioredis) with in-memory fallback.
    // When REDIS_URL is not set, we report "skipped — memory fallback active" and do NOT
    // flip readiness to false (API is still functional, throttling is per-instance).
    // When REDIS_URL is set, we expect Redis to be reachable; a ping failure marks not_ready.
    const redisUrl = this.config.get<string>('app.redisUrl') || process.env.REDIS_URL || '';
    if (redisUrl) {
      try {
        const pong = await this.redis.ping();
        if (pong === 'ok') {
          checks.redis = 'ok';
        } else if (pong === 'skipped') {
          checks.redis = 'skipped';
        } else {
          checks.redis = 'error';
          ready = false;
        }
        // Extra: report mode
        checks.redisMode = this.redis.isRedisAvailable() ? 'redis' : 'memory-fallback';
        if (checks.redis === 'error') ready = false;
      } catch {
        checks.redis = 'error';
        checks.redisMode = 'error';
        ready = false;
      }
    } else {
      checks.redis = 'skipped (REDIS_URL not set — memory fallback active)';
      checks.redisMode = this.redis.isRedisAvailable() ? 'redis' : 'memory';
    }

    const status = ready ? 200 : 503;
    // Nest will still return 200 unless we throw; we keep envelope with status field for observability
    // and let the caller inspect data.status
    return {
      success: ready,
      data: { status: ready ? 'ready' : 'not_ready', checks, timestamp: new Date().toISOString() },
      message: ready ? 'Service is ready' : 'Service not ready — dependency check failed',
    };
  }
}
