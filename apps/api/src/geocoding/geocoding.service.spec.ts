import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeocodingService } from './geocoding.service';

describe('GeocodingService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  function mockConfig(overrides: Record<string, string> = {}) {
    const map: Record<string, string> = {
      'app.geocoding.provider': 'nominatim',
      'app.geocoding.baseUrl': 'https://nominatim.openstreetmap.org/search',
      'app.geocoding.apiKey': '',
      ...overrides,
    };
    return { get: jest.fn((k: string, def: any) => map[k] ?? def) } as unknown as ConfigService;
  }

  it('returns empty array when provider/baseUrl not configured', async () => {
    const module = await Test.createTestingModule({
      providers: [GeocodingService, { provide: ConfigService, useValue: mockConfig({ 'app.geocoding.provider': '', 'app.geocoding.baseUrl': '' }) }],
    }).compile();
    const svc = module.get(GeocodingService);
    expect(await svc.forwardGeocode('test')).toEqual([]);
    expect(await svc.reverseGeocode(19, 72)).toBeNull();
  });

  it('forwardGeocode builds URL and normalizes response', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { lat: '19.076', lon: '72.8777', display_name: 'Mumbai, India' },
        { lat: '19.05', lon: '72.85', display_name: 'Andheri, Mumbai' },
      ],
    });
    global.fetch = fetchMock as any;

    const module = await Test.createTestingModule({
      providers: [GeocodingService, { provide: ConfigService, useValue: mockConfig() }],
    }).compile();
    const svc = module.get(GeocodingService);
    const results = await svc.forwardGeocode('Mumbai');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('q=Mumbai');
    expect(url).toContain('format=json');
    expect(url).toContain('limit=5');
    expect(results).toEqual([
      { latitude: 19.076, longitude: 72.8777, displayName: 'Mumbai, India' },
      { latitude: 19.05, longitude: 72.85, displayName: 'Andheri, Mumbai' },
    ]);
  });

  it('forwardGeocode handles alternative field names (latitude/longitude)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ latitude: '19.1', longitude: '72.9', displayName: 'Alt Fields' }],
    }) as any;
    const module = await Test.createTestingModule({
      providers: [GeocodingService, { provide: ConfigService, useValue: mockConfig() }],
    }).compile();
    const svc = module.get(GeocodingService);
    const results = await svc.forwardGeocode('test');
    expect(results[0]).toEqual({ latitude: 19.1, longitude: 72.9, displayName: 'Alt Fields' });
  });

  it('forwardGeocode appends apiKey when configured', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
    global.fetch = fetchMock as any;
    const module = await Test.createTestingModule({
      providers: [GeocodingService, { provide: ConfigService, useValue: mockConfig({ 'app.geocoding.apiKey': 'secret123' }) }],
    }).compile();
    const svc = module.get(GeocodingService);
    await svc.forwardGeocode('test');
    expect(fetchMock.mock.calls[0][0]).toContain('key=secret123');
  });

  it('forwardGeocode returns [] on fetch failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as any;
    const module = await Test.createTestingModule({
      providers: [GeocodingService, { provide: ConfigService, useValue: mockConfig() }],
    }).compile();
    const svc = module.get(GeocodingService);
    expect(await svc.forwardGeocode('test')).toEqual([]);
  });

  it('forwardGeocode returns [] on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 } as any) as any;
    const module = await Test.createTestingModule({
      providers: [GeocodingService, { provide: ConfigService, useValue: mockConfig() }],
    }).compile();
    const svc = module.get(GeocodingService);
    expect(await svc.forwardGeocode('test')).toEqual([]);
  });

  it('forwardGeocode caps at 5 results', async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ lat: `${19 + i * 0.1}`, lon: '72.8', display_name: `Place ${i}` }));
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => many }) as any;
    const module = await Test.createTestingModule({
      providers: [GeocodingService, { provide: ConfigService, useValue: mockConfig() }],
    }).compile();
    const svc = module.get(GeocodingService);
    expect((await svc.forwardGeocode('test')).length).toBe(5);
  });

  it('reverseGeocode builds reverse URL from search endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ display_name: 'Mumbai, India', address: { city: 'Mumbai' } }),
    });
    global.fetch = fetchMock as any;
    const module = await Test.createTestingModule({
      providers: [GeocodingService, { provide: ConfigService, useValue: mockConfig() }],
    }).compile();
    const svc = module.get(GeocodingService);
    const result = await svc.reverseGeocode(19.076, 72.8777);
    expect(fetchMock.mock.calls[0][0]).toContain('/reverse');
    expect(fetchMock.mock.calls[0][0]).toContain('lat=19.076');
    expect(fetchMock.mock.calls[0][0]).toContain('lon=72.8777');
    expect(result?.displayName).toBe('Mumbai, India');
    expect(result?.address.city).toBe('Mumbai');
  });

  it('reverseGeocode handles non-search baseUrl directly', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ display_name: 'Loc', address: {} }) });
    global.fetch = fetchMock as any;
    const module = await Test.createTestingModule({
      providers: [GeocodingService, { provide: ConfigService, useValue: mockConfig({ 'app.geocoding.baseUrl': 'https://example.com/reverse' }) }],
    }).compile();
    const svc = module.get(GeocodingService);
    await svc.reverseGeocode(19, 72);
    expect(fetchMock.mock.calls[0][0]).toContain('https://example.com/reverse');
  });

  it('reverseGeocode returns null on failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('fail')) as any;
    const module = await Test.createTestingModule({
      providers: [GeocodingService, { provide: ConfigService, useValue: mockConfig() }],
    }).compile();
    const svc = module.get(GeocodingService);
    expect(await svc.reverseGeocode(19, 72)).toBeNull();
  });
});
