import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DonorsService } from './donors.service';
import { PrismaService } from '../database/prisma.service';

describe('DonorsService (pure helpers)', () => {
  let service: DonorsService;
  const prismaMock = {
    user: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    $queryRawUnsafe: jest.fn(),
  } as any;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DonorsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = module.get(DonorsService);
  });

  beforeEach(() => jest.clearAllMocks());

  describe('clampPageSize (private)', () => {
    it('returns 20 for undefined/NaN/null', () => {
      expect((service as any).clampPageSize(undefined)).toBe(20);
      expect((service as any).clampPageSize(null)).toBe(20);
      expect((service as any).clampPageSize(NaN)).toBe(20);
    });
    it('clamps to 1..100 and floors', () => {
      expect((service as any).clampPageSize(0)).toBe(20); // falsy => default 20 per impl
      expect((service as any).clampPageSize(-5)).toBe(1);
      expect((service as any).clampPageSize(1.9)).toBe(1);
      expect((service as any).clampPageSize(20)).toBe(20);
      expect((service as any).clampPageSize(200)).toBe(100);
      expect((service as any).clampPageSize(100)).toBe(100);
    });
  });

  describe('maskName (private)', () => {
    it('masks correctly for typical names', () => {
      expect((service as any).maskName('Alex', 'Jordan')).toBe('Al** J.');
      expect((service as any).maskName('So', 'J')).toBe('So J.');
      expect((service as any).maskName('A', 'B')).toBe('A B.');
    });
    it('handles empty first name', () => {
      expect((service as any).maskName('', 'Doe')).toBe('***');
      expect((service as any).maskName('', '')).toBe('***');
    });
    it('handles no last name', () => {
      expect((service as any).maskName('Alex', '')).toBe('Al** ');
      expect((service as any).maskName('Alex', null)).toBe('Al** ');
    });
    it('masks long first names', () => {
      expect((service as any).maskName('Christopher', 'Lee')).toBe('Ch********* L.');
    });
  });

  describe('maskMobile (private)', () => {
    it('masks middle digits keeping 2+2 visible', () => {
      expect((service as any).maskMobile('9876543210', '+91')).toBe('+91 98******10');
      expect((service as any).maskMobile('+919876543210', '+91')).toBe('+91 91********10');
    });
    it('handles short numbers', () => {
      expect((service as any).maskMobile('123', null)).toBe('***');
      expect((service as any).maskMobile('1234', null)).toBe('****');
    });
    it('handles empty / no digits', () => {
      expect((service as any).maskMobile('', '+91')).toBe('');
      expect((service as any).maskMobile('abc', '+91')).toBe('');
      expect((service as any).maskMobile(undefined, '+91')).toBe('');
    });
    it('handles no dialCode', () => {
      expect((service as any).maskMobile('9876543210', undefined)).toBe('98******10');
      expect((service as any).maskMobile('9876543210', '')).toBe('98******10');
    });
  });

  describe('mapDonor (private)', () => {
    const baseUser = {
      id: 'u1',
      firstName: 'Alex',
      lastName: 'Jordan',
      area: 'Andheri',
      pinCode: '400053',
      latitude: '19.076',
      longitude: '72.8777',
      mobile: '9876543210',
      bloodGroup: { code: 'O+', label: 'O Positive' },
      country: { name: 'India' },
      state: { name: 'Maharashtra' },
      city: { name: 'Mumbai' },
      countryCode: { dialCode: '+91' },
      active: true,
      createdAt: new Date('2024-01-01'),
    };

    it('returns tiered response for authenticated user', () => {
      const result = (service as any).mapDonor(baseUser, true, 3.24);
      expect(result.displayName).toBe('Alex Jordan');
      expect(result.fullName).toBe('Alex Jordan');
      expect(result.firstName).toBe('Alex');
      expect(result.mobile).toBe('+91 9876543210');
      expect(result.maskedMobile).toBe('+91 98******10');
      expect(result.pinCode).toBe('400053');
      expect(result.latitude).toBe(19.076);
      expect(result.bloodGroup).toBe('O+');
      expect(result.approxDistanceKm).toBe(3.2);
    });

    it('returns tiered response for anonymous user (masked name, no PII)', () => {
      const result = (service as any).mapDonor(baseUser, false, null);
      expect(result.displayName).toBe('Al** J.');
      expect(result.fullName).toBeUndefined();
      expect(result.mobile).toBeUndefined();
      expect(result.maskedMobile).toBe('+91 98******10');
      expect(result.pinCode).toBeUndefined();
      expect(result.latitude).toBeUndefined();
      expect(result.bloodGroup).toBe('O+');
      expect(result.approxDistanceKm).toBeUndefined();
    });

    it('handles distance rounding', () => {
      const r = (service as any).mapDonor(baseUser, true, 3.26);
      expect(r.approxDistanceKm).toBe(3.3);
      const r2 = (service as any).mapDonor(baseUser, true, null);
      expect(r2.approxDistanceKm).toBeUndefined();
    });

    it('handles missing relations gracefully', () => {
      const minimal = { id: 'u2', firstName: 'Sam', lastName: 'Lee', area: 'X', active: true };
      const r = (service as any).mapDonor(minimal, false, null);
      expect(r.bloodGroup).toBeNull();
      expect(r.displayName).toBe('Sa* L.');
    });
  });

  describe('search validation', () => {
    it('throws INVALID_LOCATION when only lat provided', async () => {
      await expect(service.search({ lat: 19.0 } as any)).rejects.toThrow(BadRequestException);
      try {
        await service.search({ lat: 19.0 } as any);
        fail('should have thrown');
      } catch (e: any) {
        const res = e.getResponse ? e.getResponse() : e.response || {};
        expect(res.code).toBe('INVALID_LOCATION');
      }
    });
    it('throws INVALID_LOCATION when only lng provided', async () => {
      await expect(service.search({ lng: 72.0 } as any)).rejects.toThrow(BadRequestException);
      try {
        await service.search({ lng: 72.0 } as any);
        fail('should have thrown');
      } catch (e: any) {
        const res = e.getResponse ? e.getResponse() : e.response || {};
        expect(res.code).toBe('INVALID_LOCATION');
      }
    });
    it('throws INVALID_RADIUS for bad radiusKm', async () => {
      await expect(service.search({ lat: 19, lng: 72, radiusKm: 'bad' } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('search non-spatial path (mocked Prisma)', () => {
    it('returns paginated results via Prisma findMany/count', async () => {
      const users = [
        { id: 'u1', firstName: 'Alex', lastName: 'A', bloodGroup: { code: 'O+' }, country: { name: 'India' }, state: { name: 'MH' }, city: { name: 'Mumbai' }, active: true },
      ];
      prismaMock.user.count.mockResolvedValue(1);
      prismaMock.user.findMany.mockResolvedValue(users as any);

      const result = await service.search({ page: 1, pageSize: 20, active: true } as any);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(prismaMock.user.count).toHaveBeenCalled();
      expect(prismaMock.user.findMany).toHaveBeenCalled();
    });

    it('excludes self for authenticated request', async () => {
      prismaMock.user.count.mockResolvedValue(0);
      prismaMock.user.findMany.mockResolvedValue([]);
      await service.search({ page: 1 } as any, { sub: 'my-id', role: 'USER' } as any);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { not: 'my-id' } }) }));
    });
  });

  describe('findOne', () => {
    it('throws DONOR_NOT_FOUND when not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(BadRequestException);
    });
    it('throws DONOR_NOT_FOUND when deletedAt set', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', deletedAt: new Date(), active: true } as any);
      await expect(service.findOne('u1')).rejects.toThrow(BadRequestException);
    });
    it('throws DONOR_INACTIVE when inactive', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', deletedAt: null, active: false } as any);
      await expect(service.findOne('u1')).rejects.toThrow(BadRequestException);
    });
    it('returns mapped donor for active user', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', firstName: 'Alex', lastName: 'Jordan', deletedAt: null, active: true, bloodGroup: { code: 'O+' }, country: { name: 'India' }, state: { name: 'MH' }, city: { name: 'Mumbai' } } as any);
      const result = await service.findOne('u1', { sub: 'other' } as any);
      expect(result.displayName).toBe('Alex Jordan');
    });
  });

  describe('mapMarkers', () => {
    it('throws MAP_TOO_MANY_MARKERS when total >500', async () => {
      // mock search to return total 501
      jest.spyOn(service, 'search').mockResolvedValue({ items: [], total: 501, page: 1, pageSize: 500, totalPages: 2 } as any);
      await expect(service.mapMarkers({} as any, undefined)).rejects.toThrow(BadRequestException);
    });
    it('returns lightweight markers for authenticated', async () => {
      const items = [{ id: 'u1', bloodGroup: 'O+', displayName: 'Alex Jordan', country: 'India', state: 'MH', city: 'Mumbai', area: 'Andheri', latitude: 19, longitude: 72, approxDistanceKm: 2.1 }];
      jest.spyOn(service, 'search').mockResolvedValue({ items, total: 1, page: 1, pageSize: 500, totalPages: 1 } as any);
      const markers = await service.mapMarkers({} as any, { sub: 'x' } as any);
      expect(markers[0].latitude).toBe(19);
      expect(markers[0].longitude).toBe(72);
    });
    it('hides coordinates for anonymous', async () => {
      const items = [{ id: 'u1', bloodGroup: 'O+', displayName: 'Al** J.', country: 'India', state: 'MH', city: 'Mumbai', area: 'Andheri', latitude: 19, longitude: 72 }];
      jest.spyOn(service, 'search').mockResolvedValue({ items, total: 1, page: 1, pageSize: 500, totalPages: 1 } as any);
      const markers = await service.mapMarkers({} as any, undefined);
      expect(markers[0].latitude).toBeUndefined();
      expect(markers[0].longitude).toBeUndefined();
    });
  });
});
