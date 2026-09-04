import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    bloodGroupId?: string;
    countryId?: string;
    stateId?: string;
    cityId?: string;
    active?: boolean;
    role?: string;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, query.pageSize ?? 20);
    const skip = (page - 1) * pageSize;
    const where: any = { deletedAt: null };
    if (query.active !== undefined) where.active = query.active;
    if (query.bloodGroupId) where.bloodGroupId = query.bloodGroupId;
    if (query.countryId) where.countryId = query.countryId;
    if (query.stateId) where.stateId = query.stateId;
    if (query.cityId) where.cityId = query.cityId;
    if (query.role) where.role = query.role;
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
        { email: { contains: query.search } },
        { mobile: { contains: query.search } },
      ];
    }
    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: { bloodGroup: true, country: true, state: true, city: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);
    // Map to AdminUserDto — never expose passwordHash (by construction we select without it)
    const mapped = items.map((u) => this.toAdminDto(u));
    return { items: mapped, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { bloodGroup: true, country: true, state: true, city: true, countryCode: true },
    });
    if (!user || user.deletedAt) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    return this.toAdminDto(user);
  }

  async updateUser(id: string, dto: any, actorId: string, meta: { ip?: string; userAgent?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });

    // Unique checks for email/mobile if changed
    if (dto.email && dto.email.toLowerCase() !== existing.email) {
      const dup = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
      if (dup) throw new ConflictException({ code: 'USER_EMAIL_EXISTS', message: 'Email already in use' });
      dto.email = dto.email.toLowerCase();
    }
    if (dto.mobile && dto.mobile !== existing.mobile) {
      const dup = await this.prisma.user.findUnique({ where: { mobile: dto.mobile } });
      if (dup) throw new ConflictException({ code: 'USER_MOBILE_EXISTS', message: 'Mobile already in use' });
    }

    // Validate role transition if provided
    if (dto.role && !['USER', 'ADMIN'].includes(dto.role)) throw new BadRequestException({ code: 'INVALID_ROLE', message: 'Invalid role' });

    const oldValue = { ...existing };
    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      include: { bloodGroup: true, country: true, state: true, city: true, countryCode: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: actorId,
        action: dto.role && dto.role !== existing.role ? 'ROLE_CHANGE' : 'UPDATE',
        entityType: 'User',
        entityId: id,
        oldValue: oldValue as any,
        newValue: updated as any,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    return this.toAdminDto(updated);
  }

  async updateStatus(id: string, active: boolean, actorId: string, meta: { ip?: string; userAgent?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    const updated = await this.prisma.user.update({ where: { id }, data: { active } });
    await this.prisma.auditLog.create({
      data: {
        actorUserId: actorId,
        action: active ? 'ACTIVATE' : 'DEACTIVATE',
        entityType: 'User',
        entityId: id,
        oldValue: { active: existing.active } as any,
        newValue: { active } as any,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      },
    });
    await this.prisma.notification.create({
      data: {
        userId: id,
        type: active ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED',
        title: active ? 'Account activated by admin' : 'Account deactivated by admin',
        message: active ? 'Your account has been activated by an administrator.' : 'Your account has been deactivated by an administrator.',
      },
    });
    return { active: updated.active };
  }

  async softDelete(id: string, actorId: string, meta: { ip?: string; userAgent?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    const updated = await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
    await this.prisma.auditLog.create({
      data: {
        actorUserId: actorId,
        action: 'SOFT_DELETE',
        entityType: 'User',
        entityId: id,
        oldValue: { deletedAt: null } as any,
        newValue: { deletedAt: updated.deletedAt } as any,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      },
    });
    // Revoke refresh tokens for deleted user
    await this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    return { deletedAt: updated.deletedAt };
  }

  private toAdminDto(u: any) {
    // Explicit mapper — never leaks passwordHash
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      dateOfBirth: u.dateOfBirth,
      email: u.email,
      emailVerified: u.emailVerified,
      mobile: u.mobile,
      mobileVerified: u.mobileVerified,
      bloodGroupId: u.bloodGroupId,
      bloodGroup: u.bloodGroup,
      countryId: u.countryId,
      country: u.country,
      stateId: u.stateId,
      state: u.state,
      cityId: u.cityId,
      city: u.city,
      countryCodeId: u.countryCodeId,
      countryCode: u.countryCode,
      area: u.area,
      pinCode: u.pinCode,
      latitude: u.latitude != null ? Number(u.latitude) : null,
      longitude: u.longitude != null ? Number(u.longitude) : null,
      active: u.active,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      deletedAt: u.deletedAt,
    };
  }
}
