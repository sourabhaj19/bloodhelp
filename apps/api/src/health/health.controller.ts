import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

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

    // Redis check — optional in Phase 2 (not yet wired to BullMQ)
    // If REDIS_URL is set, try a lightweight ping via direct import without failing readiness
    // This keeps Phase 2 runnable even without Redis, but signals readiness correctly when Redis is expected.
    if (process.env.REDIS_URL) {
      try {
        // Lazy import to avoid hard dependency if ioredis not yet installed
        const { default: IORedis } = await import('ioredis');
        const redis = new IORedis(process.env.REDIS_URL!, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableReadyCheck: false,
        });
        await redis.connect();
        const pong = await redis.ping();
        checks.redis = pong === 'PONG' ? 'ok' : 'error';
        await redis.quit();
        if (checks.redis !== 'ok') ready = false;
      } catch {
        checks.redis = 'error';
        // In Phase 2 Redis is not strictly required for liveness, but readiness should reflect it
        ready = false;
      }
    } else {
      checks.redis = 'skipped (REDIS_URL not set)';
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
