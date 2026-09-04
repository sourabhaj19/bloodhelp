import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/forgot-password.dto';
import {
  hashPassword,
  verifyPassword,
  getDummyHash,
  sha256,
  randomToken,
  randomFamilyId,
} from '../common/utils/hash';
import { getPasswordPolicy, validatePasswordPolicy } from '../common/utils/password-policy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private accessExpiresIn(): string {
    return this.config.get<string>('app.jwt.accessExpiresIn', '15m')!;
  }
  private refreshExpiresInMs(): number {
    const raw = this.config.get<string>('app.jwt.refreshExpiresIn', '30d')!;
    // parse simple durations: 15m, 30d, 1h
    const match = raw.match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const n = parseInt(match[1], 10);
    const unit = match[2];
    const mult: Record<string, number> = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return n * mult[unit];
  }
  private passwordResetExpiresInMs(): number {
    const raw = this.config.get<string>('app.password.resetExpiresIn', '30m')!;
    const match = raw.match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 60 * 1000;
    const n = parseInt(match[1], 10);
    const unit = match[2];
    const mult: Record<string, number> = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return n * mult[unit];
  }

  private signAccessToken(user: { id: string; email: string; role: string }) {
    return this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.config.get<string>('app.jwt.accessSecret'),
        expiresIn: this.accessExpiresIn() as any,
      },
    );
  }

  async register(dto: RegisterDto, meta: { ip?: string; userAgent?: string }) {
    // Validate password policy
    const policy = getPasswordPolicy(this.config);
    const errors = validatePasswordPolicy(dto.password, policy);
    if (errors.length) throw new BadRequestException({ code: 'PASSWORD_POLICY', message: errors.join('; '), details: errors });

    // Validate FKs exist and active
    const [bloodGroup, countryCode, country, state, city] = await Promise.all([
      this.prisma.bloodGroup.findUnique({ where: { id: dto.bloodGroupId } }),
      this.prisma.countryCode.findUnique({ where: { id: dto.countryCodeId } }),
      this.prisma.country.findUnique({ where: { id: dto.countryId } }),
      this.prisma.state.findUnique({ where: { id: dto.stateId } }),
      this.prisma.city.findUnique({ where: { id: dto.cityId } }),
    ]);
    if (!bloodGroup || !bloodGroup.active) throw new BadRequestException({ code: 'INVALID_BLOOD_GROUP', message: 'Invalid blood group' });
    if (!countryCode) throw new BadRequestException({ code: 'INVALID_COUNTRY_CODE', message: 'Invalid country code' });
    if (!country) throw new BadRequestException({ code: 'INVALID_COUNTRY', message: 'Invalid country' });
    if (!state || state.countryId !== dto.countryId) throw new BadRequestException({ code: 'INVALID_STATE', message: 'Invalid state for country' });
    if (!city || city.stateId !== dto.stateId) throw new BadRequestException({ code: 'INVALID_CITY', message: 'Invalid city for state' });

    // Uniqueness checks (email/mobile)
    const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existingEmail) throw new ConflictException({ code: 'USER_EMAIL_EXISTS', message: 'Email already registered' });
    const existingMobile = await this.prisma.user.findUnique({ where: { mobile: dto.mobile } });
    if (existingMobile) throw new ConflictException({ code: 'USER_MOBILE_EXISTS', message: 'Mobile already registered' });

    const passwordHash = await hashPassword(dto.password);

    // Create user; trigger will populate `location` geography automatically
    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: new Date(dto.dateOfBirth),
        email: dto.email.toLowerCase(),
        countryCodeId: dto.countryCodeId,
        mobile: dto.mobile,
        passwordHash,
        bloodGroupId: dto.bloodGroupId,
        countryId: dto.countryId,
        stateId: dto.stateId,
        cityId: dto.cityId,
        area: dto.area,
        pinCode: dto.pinCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        active: true,
        role: 'USER',
      },
    });

    // Write location history
    await this.prisma.userLocationHistory.create({
      data: { userId: user.id, latitude: dto.latitude, longitude: dto.longitude, source: 'REGISTER' },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'CREATE',
        entityType: 'User',
        entityId: user.id,
        newValue: { email: user.email } as any,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    // Issue tokens
    const accessToken = this.signAccessToken(user);
    const { refreshToken, familyId } = await this.createRefreshToken(user.id, meta);

    return { user: this.toPublicUser(user), accessToken, refreshToken, familyId };
  }

  async login(dto: LoginDto, meta: { ip?: string; userAgent?: string }) {
    const identifier = dto.identifier.trim();
    const isEmail = identifier.includes('@');
    let user: any = null;
    if (isEmail) {
      user = await this.prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });
    } else {
      user = await this.prisma.user.findUnique({ where: { mobile: identifier } });
    }

    const dummyHash = await getDummyHash();
    const hashToVerify = user ? user.passwordHash : dummyHash;
    const passwordOk = await verifyPassword(hashToVerify, dto.password);

    // Always run verify, then decide — prevents timing enumeration
    if (!user || !passwordOk) {
      await this.prisma.securityEvent.create({
        data: {
          userId: user?.id ?? null,
          type: 'LOGIN_FAILED',
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
          metadata: { identifier } as any,
        },
      });
      await this.prisma.loginHistory.create({
        data: { userId: user?.id ?? null, identifier, success: false, ipAddress: meta.ip, userAgent: meta.userAgent },
      });
      throw new UnauthorizedException({ code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials' });
    }

    if (user.deletedAt) throw new ForbiddenException({ code: 'AUTH_ACCOUNT_DELETED', message: 'Account deleted' });
    if (!user.active) throw new ForbiddenException({ code: 'AUTH_ACCOUNT_DISABLED', message: 'Account is disabled' });

    await this.prisma.securityEvent.create({
      data: { userId: user.id, type: 'LOGIN_SUCCESS', ipAddress: meta.ip, userAgent: meta.userAgent },
    });
    await this.prisma.loginHistory.create({
      data: { userId: user.id, identifier, success: true, ipAddress: meta.ip, userAgent: meta.userAgent },
    });

    const accessToken = this.signAccessToken(user);
    const { refreshToken } = await this.createRefreshToken(user.id, meta);

    return { user: this.toPublicUser(user), accessToken, refreshToken };
  }

  private async createRefreshToken(userId: string, meta: { ip?: string; userAgent?: string }) {
    const raw = randomToken(32);
    const tokenHash = sha256(raw);
    const familyId = randomFamilyId();
    const expiresAt = new Date(Date.now() + this.refreshExpiresInMs());
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        familyId,
        expiresAt,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      },
    });
    return { refreshToken: raw, familyId, tokenHash, expiresAt };
  }

  private async rotateRefreshToken(presentedRaw: string, meta: { ip?: string; userAgent?: string }) {
    const presentedHash = sha256(presentedRaw);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash: presentedHash } });
    if (!existing) throw new UnauthorizedException({ code: 'AUTH_INVALID_REFRESH', message: 'Invalid refresh token' });

    if (existing.revokedAt) {
      // Reuse detected → revoke entire family
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.prisma.securityEvent.create({
        data: {
          userId: existing.userId,
          type: 'REFRESH_TOKEN_REUSE_DETECTED',
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
          metadata: { familyId: existing.familyId } as any,
        },
      });
      throw new UnauthorizedException({ code: 'AUTH_TOKEN_REUSE', message: 'Refresh token reuse detected — please login again' });
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'AUTH_TOKEN_EXPIRED', message: 'Refresh token expired' });
    }

    // Check user still active
    const user = await this.prisma.user.findUnique({ where: { id: existing.userId } });
    if (!user || user.deletedAt || !user.active) {
      throw new ForbiddenException({ code: 'AUTH_ACCOUNT_DISABLED', message: 'Account disabled' });
    }

    // Rotate: revoke old, issue new in same family
    const newRaw = randomToken(32);
    const newHash = sha256(newRaw);
    const newExpiresAt = new Date(Date.now() + this.refreshExpiresInMs());

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { tokenHash: presentedHash },
        data: { revokedAt: new Date(), replacedByTokenHash: newHash, lastUsedAt: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: newHash,
          familyId: existing.familyId,
          expiresAt: newExpiresAt,
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
        },
      }),
    ]);

    const accessToken = this.signAccessToken(user);
    return { accessToken, refreshToken: newRaw, user };
  }

  async refresh(presentedRaw: string | undefined, meta: { ip?: string; userAgent?: string }) {
    if (!presentedRaw) throw new UnauthorizedException({ code: 'AUTH_MISSING_REFRESH', message: 'Missing refresh token' });
    return this.rotateRefreshToken(presentedRaw, meta);
  }

  async logout(presentedRaw: string | undefined, meta: { ip?: string; userAgent?: string }) {
    if (!presentedRaw) return;
    const hash = sha256(presentedRaw);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!existing) return;
    // Revoke entire family on logout per §5.5 (logout revokes family)
    await this.prisma.refreshToken.updateMany({
      where: { familyId: existing.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.prisma.securityEvent.create({
      data: { userId: existing.userId, type: 'LOGOUT', ipAddress: meta.ip, userAgent: meta.userAgent },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { bloodGroup: true, country: true, state: true, city: true, countryCode: true },
    });
    if (!user || user.deletedAt) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    return this.toAuthenticatedDto(user);
  }

  async forgotPassword(email: string, meta: { ip?: string; userAgent?: string }) {
    // Always return generic success — enumeration safe
    // Rate limiting via caller IP/email handled at controller/guard layer (Redis) — here we still enqueue
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user && user.active && !user.deletedAt) {
      // Invalidate prior unused tokens
      await this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      const raw = randomToken(32);
      const tokenHash = sha256(raw);
      const expiresAt = new Date(Date.now() + this.passwordResetExpiresInMs());
      await this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt, ipAddress: meta.ip },
      });
      await this.prisma.securityEvent.create({
        data: { userId: user.id, type: 'PASSWORD_RESET_REQUESTED', ipAddress: meta.ip, userAgent: meta.userAgent },
      });
      // In production: enqueue email via BullMQ -> EmailService
      // For this implementation we log token (never in production logs with PII redaction, but dev helper)
      this.logger.log(`Password reset token for ${user.email}: ${raw} (expires ${expiresAt.toISOString()}) — in production this is emailed`);
      // Store raw in DB? No, only hash. Returning raw here only for dev/E2E when email provider not configured
      // We do not expose raw to API response, but we log and also create notification later via worker
      return { devToken: process.env.NODE_ENV !== 'production' ? raw : undefined };
    } else if (user) {
      // User exists but inactive/deleted → still generic response but no token
      await this.prisma.securityEvent.create({
        data: { userId: user.id, type: 'PASSWORD_RESET_REQUESTED', ipAddress: meta.ip, userAgent: meta.userAgent, metadata: { result: 'inactive' } as any },
      });
    }
    return { devToken: undefined };
  }

  async resetPassword(dto: ResetPasswordDto, meta: { ip?: string; userAgent?: string }) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException({ code: 'PASSWORD_MISMATCH', message: 'Passwords do not match' });
    }
    const policy = getPasswordPolicy(this.config);
    const errors = validatePasswordPolicy(dto.newPassword, policy);
    if (errors.length) throw new BadRequestException({ code: 'PASSWORD_POLICY', message: errors.join('; '), details: errors });

    const tokenHash = sha256(dto.token);
    const tokenRow = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!tokenRow) throw new BadRequestException({ code: 'RESET_TOKEN_INVALID', message: 'Invalid reset token' });
    if (tokenRow.usedAt) throw new BadRequestException({ code: 'RESET_TOKEN_USED', message: 'Reset token already used' });
    if (tokenRow.expiresAt < new Date()) throw new BadRequestException({ code: 'RESET_TOKEN_EXPIRED', message: 'Reset token expired' });

    const user = await this.prisma.user.findUnique({ where: { id: tokenRow.userId } });
    if (!user || user.deletedAt) throw new BadRequestException({ code: 'RESET_TOKEN_INVALID', message: 'Invalid reset token' });

    const newHash = await hashPassword(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
      await tx.passwordResetToken.update({ where: { id: tokenRow.id }, data: { usedAt: new Date() } });
      // Revoke all refresh tokens → force logout everywhere per §6
      await tx.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.securityEvent.create({
        data: { userId: user.id, type: 'PASSWORD_RESET_COMPLETED', ipAddress: meta.ip, userAgent: meta.userAgent },
      });
      await tx.securityEvent.create({
        data: { userId: user.id, type: 'PASSWORD_CHANGED', ipAddress: meta.ip, userAgent: meta.userAgent },
      });
      // Notification
      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'PASSWORD_CHANGED',
          title: 'Password changed',
          message: 'Your password has been reset successfully. If this was not you, please contact support immediately.',
        },
      });
    });

    return { success: true };
  }

  private toPublicUser(user: any) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };
  }

  private toAuthenticatedDto(user: any) {
    // Full profile DTO for /auth/me and /users/me
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
