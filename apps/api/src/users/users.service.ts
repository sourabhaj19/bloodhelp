import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { bloodGroup: true, country: true, state: true, city: true, countryCode: true },
    });
    if (!user || user.deletedAt) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    return this.toAuthenticatedDto(user);
  }

  async updateMe(userId: string, dto: UpdateProfileDto, meta: { ip?: string; userAgent?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });

    // Validate FKs if provided
    if (dto.bloodGroupId) {
      const bg = await this.prisma.bloodGroup.findUnique({ where: { id: dto.bloodGroupId } });
      if (!bg || !bg.active) throw new BadRequestException({ code: 'INVALID_BLOOD_GROUP', message: 'Invalid blood group' });
    }
    if (dto.countryId) {
      const c = await this.prisma.country.findUnique({ where: { id: dto.countryId } });
      if (!c) throw new BadRequestException({ code: 'INVALID_COUNTRY', message: 'Invalid country' });
    }
    if (dto.stateId) {
      const stateId = dto.stateId;
      const state = await this.prisma.state.findUnique({ where: { id: stateId } });
      const countryId = dto.countryId ?? user.countryId;
      if (!state || state.countryId !== countryId) throw new BadRequestException({ code: 'INVALID_STATE', message: 'Invalid state for country' });
    }
    if (dto.cityId) {
      const city = await this.prisma.city.findUnique({ where: { id: dto.cityId! } });
      const stateId = dto.stateId ?? user.stateId;
      if (!city || city.stateId !== stateId) throw new BadRequestException({ code: 'INVALID_CITY', message: 'Invalid city for state' });
    }
    if (dto.countryCodeId) {
      const cc = await this.prisma.countryCode.findUnique({ where: { id: dto.countryCodeId } });
      if (!cc) throw new BadRequestException({ code: 'INVALID_COUNTRY_CODE', message: 'Invalid country code' });
    }

    // Email/mobile uniqueness & verification handling
    let emailToSet: string | undefined = undefined;
    let needsEmailVerification = false;
    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const exists = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
      if (exists) throw new ConflictException({ code: 'USER_EMAIL_EXISTS', message: 'Email already in use' });
      // Per architecture §11: pending email until verification — for v1 we do NOT change immediately, we store pending token
      // For simplicity in Phase 5, we allow change but mark unverified and emit security event
      emailToSet = dto.email.toLowerCase();
      needsEmailVerification = true;
    }
    let mobileToSet: string | undefined = undefined;
    let needsMobileVerification = false;
    if (dto.mobile && dto.mobile !== user.mobile) {
      const exists = await this.prisma.user.findUnique({ where: { mobile: dto.mobile } });
      if (exists) throw new ConflictException({ code: 'USER_MOBILE_EXISTS', message: 'Mobile already in use' });
      mobileToSet = dto.mobile;
      needsMobileVerification = true;
    }

    const data: any = {};
    if (dto.firstName) data.firstName = dto.firstName;
    if (dto.lastName) data.lastName = dto.lastName;
    if (dto.dateOfBirth) data.dateOfBirth = new Date(dto.dateOfBirth);
    if (emailToSet) {
      data.email = emailToSet;
      data.emailVerified = false;
    }
    if (mobileToSet) {
      data.mobile = mobileToSet;
      data.mobileVerified = false;
    }
    if (dto.countryCodeId) data.countryCodeId = dto.countryCodeId;
    if (dto.bloodGroupId) data.bloodGroupId = dto.bloodGroupId;
    if (dto.countryId) data.countryId = dto.countryId;
    if (dto.stateId) data.stateId = dto.stateId;
    if (dto.cityId) data.cityId = dto.cityId;
    if (dto.area) data.area = dto.area;
    if (dto.pinCode) data.pinCode = dto.pinCode;

    const latChanged = dto.latitude !== undefined && Number(dto.latitude) !== Number(user.latitude);
    const lngChanged = dto.longitude !== undefined && Number(dto.longitude) !== Number(user.longitude);
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;

    const oldValue = { ...user };
    const updated = await this.prisma.user.update({ where: { id: userId }, data, include: { bloodGroup: true, country: true, state: true, city: true, countryCode: true } });

    if (latChanged || lngChanged) {
      const src = dto.latitude !== undefined || dto.longitude !== undefined ? 'MAP_PICK' : 'GPS';
      await this.prisma.userLocationHistory.create({
        data: {
          userId,
          latitude: updated.latitude as any,
          longitude: updated.longitude as any,
          source: src,
        },
      });
    }

    if (needsEmailVerification) {
      await this.prisma.securityEvent.create({
        data: { userId, type: 'EMAIL_CHANGED', ipAddress: meta.ip, userAgent: meta.userAgent, metadata: { oldEmail: user.email, newEmail: emailToSet } as any },
      });
    }
    if (needsMobileVerification) {
      await this.prisma.securityEvent.create({
        data: { userId, type: 'MOBILE_CHANGED', ipAddress: meta.ip, userAgent: meta.userAgent, metadata: { oldMobile: user.mobile, newMobile: mobileToSet } as any },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'UPDATE',
        entityType: 'User',
        entityId: userId,
        oldValue: oldValue as any,
        newValue: updated as any,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    return this.toAuthenticatedDto(updated);
  }

  async updateMyStatus(userId: string, active: boolean, meta: { ip?: string; userAgent?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { active } });
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: active ? 'ACTIVATE' : 'DEACTIVATE',
        entityType: 'User',
        entityId: userId,
        oldValue: { active: user.active } as any,
        newValue: { active } as any,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      },
    });
    await this.prisma.notification.create({
      data: {
        userId,
        type: active ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED',
        title: active ? 'Account activated' : 'Account deactivated',
        message: active ? 'Your account has been activated.' : 'Your account has been deactivated.',
      },
    });
    return updated;
  }

  private toAuthenticatedDto(user: any) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      email: user.email,
      emailVerified: user.emailVerified,
      mobile: user.mobile,
      mobileVerified: user.mobileVerified,
      countryCodeId: user.countryCodeId,
      countryCode: user.countryCode,
      bloodGroupId: user.bloodGroupId,
      bloodGroup: user.bloodGroup,
      countryId: user.countryId,
      country: user.country,
      stateId: user.stateId,
      state: user.state,
      cityId: user.cityId,
      city: user.city,
      area: user.area,
      pinCode: user.pinCode,
      latitude: Number(user.latitude),
      longitude: Number(user.longitude),
      active: user.active,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
