import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService (memory fallback)', () => {
  let service: RedisService;

  async function createService() {
    const module = await Test.createTestingModule({
      providers: [RedisService, { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } }],
    }).compile();
    const svc = module.get(RedisService);
    // ensure we start with in-memory mode (REDIS_URL empty)
    await svc.onModuleInit();
    return svc;
  }

  beforeEach(async () => {
    service = await createService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('starts in memory mode when REDIS_URL empty', () => {
    expect(service.isRedisAvailable()).toBe(false);
    expect(service.getClient()).toBeUndefined();
  });

  it('ping returns skipped when no client', async () => {
    expect(await service.ping()).toBe('skipped');
  });

  it('consume allows up to limit then blocks', async () => {
    const key = 'test:limit:' + Date.now();
    const limit = 3;
    const windowSec = 60;
    for (let i = 1; i <= limit; i++) {
      const r = await service.consume(key, limit, windowSec);
      expect(r.allowed).toBe(true);
      expect(r.count).toBe(i);
      expect(r.remaining).toBe(limit - i);
      expect(r.retryAfterMs).toBe(0);
    }
    const blocked = await service.consume(key, limit, windowSec);
    expect(blocked.allowed).toBe(false);
    expect(blocked.count).toBe(limit + 1);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(blocked.ttlMs).toBeGreaterThan(0);
  });

  it('namespaces keys with rl: prefix', async () => {
    const baseKey = 'mykey-' + Date.now();
    const r1 = await service.consume(baseKey, 10, 60);
    expect(r1.count).toBe(1);
    const r2 = await service.consume('rl:' + baseKey, 10, 60);
    // same underlying key, so second consume increments
    expect(r2.count).toBe(2);
  });

  it('resets a key', async () => {
    const key = 'reset-key-' + Date.now();
    await service.consume(key, 2, 60);
    await service.consume(key, 2, 60);
    await service.reset(key);
    const after = await service.consume(key, 2, 60);
    expect(after.count).toBe(1);
    expect(after.allowed).toBe(true);
  });

  it('resets handles already-namespaced keys', async () => {
    const key = 'ns-reset-' + Date.now();
    await service.consume(key, 1, 60);
    let r = await service.consume(key, 1, 60);
    expect(r.allowed).toBe(false);
    await service.reset('rl:' + key);
    r = await service.consume(key, 1, 60);
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(1);
  });

  it('window expiry creates new window', async () => {
    const key = 'expiry-' + Date.now();
    jest.useFakeTimers();
    try {
      const now = Date.now();
      jest.setSystemTime(now);
      const r1 = await service.consume(key, 2, 1); // 1s window
      expect(r1.count).toBe(1);
      const r2 = await service.consume(key, 2, 1);
      expect(r2.count).toBe(2);
      // advance past expiry
      jest.setSystemTime(now + 1500);
      const r3 = await service.consume(key, 2, 1);
      expect(r3.count).toBe(1);
      expect(r3.allowed).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('different keys are independent', async () => {
    const k1 = 'indep1-' + Date.now();
    const k2 = 'indep2-' + Date.now();
    await service.consume(k1, 1, 60);
    const r1 = await service.consume(k1, 1, 60);
    const r2 = await service.consume(k2, 1, 60);
    expect(r1.allowed).toBe(false);
    expect(r2.allowed).toBe(true);
  });
});
