import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  // ── BloodGroups ────────────────────────────────────────────────────────
  listBloodGroups(activeOnly = false) {
    return this.prisma.bloodGroup.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { code: 'asc' },
    });
  }

  async createBloodGroup(dto: { code: string; label: string; active?: boolean }) {
    try {
      return await this.prisma.bloodGroup.create({ data: dto });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException({ code: 'MASTER_DUPLICATE', message: 'Blood group already exists' });
      throw e;
    }
  }

  async updateBloodGroup(id: string, dto: { label?: string; active?: boolean }) {
    const existing = await this.prisma.bloodGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Blood group not found' });
    return this.prisma.bloodGroup.update({ where: { id }, data: dto });
  }

  async deleteBloodGroup(id: string) {
    const inUse = await this.prisma.user.count({ where: { bloodGroupId: id } });
    if (inUse > 0) throw new ConflictException({ code: 'MASTER_IN_USE', message: 'Blood group is referenced by users and cannot be deleted' });
    const existing = await this.prisma.bloodGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Blood group not found' });
    return this.prisma.bloodGroup.delete({ where: { id } });
  }

  // ── CountryCodes ───────────────────────────────────────────────────────
  listCountryCodes(activeOnly = false) {
    return this.prisma.countryCode.findMany({
      where: activeOnly ? { active: true } : undefined,
      include: { country: true },
      orderBy: { dialCode: 'asc' },
    });
  }

  async createCountryCode(dto: { dialCode: string; label: string; countryId?: string; active?: boolean }) {
    return this.prisma.countryCode.create({ data: dto as any });
  }

  async updateCountryCode(id: string, dto: any) {
    const existing = await this.prisma.countryCode.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Country code not found' });
    return this.prisma.countryCode.update({ where: { id }, data: dto });
  }

  async deleteCountryCode(id: string) {
    const inUse = await this.prisma.user.count({ where: { countryCodeId: id } });
    if (inUse > 0) throw new ConflictException({ code: 'MASTER_IN_USE', message: 'Country code in use' });
    const existing = await this.prisma.countryCode.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Country code not found' });
    return this.prisma.countryCode.delete({ where: { id } });
  }

  // ── Countries ──────────────────────────────────────────────────────────
  listCountries(activeOnly = false) {
    return this.prisma.country.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async createCountry(dto: { name: string; isoCode2: string; active?: boolean }) {
    try {
      return await this.prisma.country.create({ data: dto });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException({ code: 'MASTER_DUPLICATE', message: 'Country already exists' });
      throw e;
    }
  }

  async updateCountry(id: string, dto: any) {
    const existing = await this.prisma.country.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Country not found' });
    try {
      return await this.prisma.country.update({ where: { id }, data: dto });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException({ code: 'MASTER_DUPLICATE', message: 'Country duplicate iso/name' });
      throw e;
    }
  }

  async deleteCountry(id: string) {
    const hasStates = await this.prisma.state.count({ where: { countryId: id } });
    const hasUsers = await this.prisma.user.count({ where: { countryId: id } });
    if (hasStates > 0 || hasUsers > 0) throw new ConflictException({ code: 'MASTER_IN_USE', message: 'Country has dependent states or users' });
    const existing = await this.prisma.country.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Country not found' });
    return this.prisma.country.delete({ where: { id } });
  }

  // ── States ─────────────────────────────────────────────────────────────
  listStates(countryId?: string, activeOnly = false) {
    return this.prisma.state.findMany({
      where: {
        ...(countryId ? { countryId } : {}),
        ...(activeOnly ? { active: true } : {}),
      },
      orderBy: { name: 'asc' },
      include: { country: true },
    });
  }

  async createState(countryId: string, dto: { name: string; active?: boolean }) {
    const country = await this.prisma.country.findUnique({ where: { id: countryId } });
    if (!country) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Country not found' });
    try {
      return await this.prisma.state.create({ data: { ...dto, countryId } });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException({ code: 'MASTER_DUPLICATE', message: 'State already exists in this country' });
      throw e;
    }
  }

  async updateState(id: string, dto: any) {
    const existing = await this.prisma.state.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'NOT_FOUND', message: 'State not found' });
    try {
      return await this.prisma.state.update({ where: { id }, data: dto });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException({ code: 'MASTER_DUPLICATE', message: 'State name duplicate within country' });
      throw e;
    }
  }

  async deleteState(id: string) {
    const hasCities = await this.prisma.city.count({ where: { stateId: id } });
    const hasUsers = await this.prisma.user.count({ where: { stateId: id } });
    if (hasCities > 0 || hasUsers > 0) throw new ConflictException({ code: 'MASTER_IN_USE', message: 'State has dependent cities or users' });
    const existing = await this.prisma.state.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'NOT_FOUND', message: 'State not found' });
    return this.prisma.state.delete({ where: { id } });
  }

  // ── Cities ─────────────────────────────────────────────────────────────
  listCities(stateId?: string, activeOnly = false, countryId?: string) {
    return this.prisma.city.findMany({
      where: {
        ...(stateId ? { stateId } : {}),
        ...(countryId ? { state: { countryId } } : {}),
        ...(activeOnly ? { active: true } : {}),
      },
      orderBy: { name: 'asc' },
      include: { state: { include: { country: true } } },
    });
  }

  async createCity(stateId: string, dto: { name: string; active?: boolean }) {
    const state = await this.prisma.state.findUnique({ where: { id: stateId } });
    if (!state) throw new NotFoundException({ code: 'NOT_FOUND', message: 'State not found' });
    try {
      return await this.prisma.city.create({ data: { ...dto, stateId } });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException({ code: 'MASTER_DUPLICATE', message: 'City already exists in this state' });
      throw e;
    }
  }

  async updateCity(id: string, dto: any) {
    const existing = await this.prisma.city.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'NOT_FOUND', message: 'City not found' });
    try {
      return await this.prisma.city.update({ where: { id }, data: dto });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException({ code: 'MASTER_DUPLICATE', message: 'City name duplicate within state' });
      throw e;
    }
  }

  async deleteCity(id: string) {
    const hasUsers = await this.prisma.user.count({ where: { cityId: id } });
    if (hasUsers > 0) throw new ConflictException({ code: 'MASTER_IN_USE', message: 'City has dependent users' });
    const existing = await this.prisma.city.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'NOT_FOUND', message: 'City not found' });
    return this.prisma.city.delete({ where: { id } });
  }
}
