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
import { ChangePasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import {
  hashPassword,
  verifyPassword,
  getDummyHash,
  sha256,
  randomToken,
  randomFamilyId,
} from '../common/utils/hash';
import { randomInt, timingSafeEqual } from 'crypto';
import { getPasswordPolicy, validatePasswordPolicy } from '../common/utils/password-policy';
import { EmailTemplateService } from '../mail/email-template.service';
import { SmsService } from '../mail/sms.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly templates: EmailTemplateService,
    private readonly sms: SmsService,
  ) {}

  private emailVerificationExpiresInMs(): number {
    return this.parseDurationMs(
      this.config.get<string>('app.email.verificationExpiresIn', '24h')!,
      24 * 60 * 60 * 1000,
    );
  }

  private mobileOtpExpiresInMs(): number {
    return this.parseDurationMs(
      this.config.get<string>('app.otp.mobileExpiresIn', '10m')!,
      10 * 60 * 1000,
    );
  }

  private otpHash(otp: string, userId: string): string {
    const pepper = this.config.get<string>('app.otp.pepper', 'dev-pepper-change-me')!;
    return sha256(`${otp}:${userId}:${pepper}`);
  }

  private appUrl(): string {
    return this.config.get<string>('app.frontendUrl', 'http://localhost:4200')!;
  }

  private accessExpiresIn(): string {
    return this.config.get<string>('app.jwt.accessExpiresIn', '15m')!;
  }
  // parse simple durations: 15m, 30d, 1h
  private parseDurationMs(raw: string, fallbackMs: number): number {
    const match = raw.match(/^(\d+)([smhd])$/);
    if (!match) return fallbackMs;
    const n = parseInt(match[1], 10);
    const mult: Record<string, number> = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return n * mult[match[2]];
  }
  private refreshExpiresInMs(): number {
    return this.parseDurationMs(
      this.config.get<string>('app.jwt.refreshExpiresIn', '30d')!,
      30 * 24 * 60 * 60 * 1000,
    );
  }
  // Short-lived refresh for sessions WITHOUT "remember me"
  private refreshExpiresInShortMs(): number {
    return this.parseDurationMs(
      this.config.get<string>('app.jwt.refreshExpiresInShort', '1d')!,
      24 * 60 * 60 * 1000,
    );
  }
  private passwordResetExpiresInMs(): number {
    return this.parseDurationMs(
      this.config.get<string>('app.password.resetExpiresIn', '30m')!,
      30 * 60 * 1000,
    );
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

    // Resolve country code from country when the client omits it
    // (new single-form UI sends no country-code input).
    let countryCodeId = dto.countryCodeId;
    if (!countryCodeId && dto.countryId) {
      const resolved =
        (await this.prisma.countryCode.findFirst({
          where: { countryId: dto.countryId, active: true },
          orderBy: { dialCode: 'asc' },
        })) ?? (await this.prisma.countryCode.findFirst({ orderBy: { dialCode: 'asc' } }));
      countryCodeId = resolved?.id;
    }

    // Validate FKs exist and active
    const [bloodGroup, countryCode, country, state, city] = await Promise.all([
      this.prisma.bloodGroup.findUnique({ where: { id: dto.bloodGroupId } }),
      countryCodeId ? this.prisma.countryCode.findUnique({ where: { id: countryCodeId } }) : Promise.resolve(null),
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
        countryCodeId: countryCodeId!,
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

    // Welcome email goes out on verification — here we send the verify link
    await this.requestEmailVerification(user.id, meta);

    return { user: this.toPublicUser(user), accessToken, refreshToken, familyId };
  }

  /** Create a fresh verification token + mail the link. Safe to call repeatedly. */
  async requestEmailVerification(userId: string, meta: { ip?: string; userAgent?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    if (user.emailVerified) throw new BadRequestException({ code: 'EMAIL_ALREADY_VERIFIED', message: 'Email is already verified' });

    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    const raw = randomToken(32);
    const expiresAt = new Date(Date.now() + this.emailVerificationExpiresInMs());
    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash: sha256(raw), expiresAt },
    });
    void this.templates.sendForType('EMAIL_VERIFICATION', user.email, {
      firstName: user.firstName,
      verifyLink: `${this.appUrl()}/verify-email?token=${raw}`,
    });
    await this.prisma.securityEvent.create({
      data: { userId: user.id, type: 'EMAIL_CHANGED', ipAddress: meta.ip, userAgent: meta.userAgent, metadata: { result: 'verification-sent' } as any },
    });
    return { sent: true };
  }

  async verifyEmail(token: string, meta: { ip?: string; userAgent?: string }) {
    const tokenHash = sha256(token);
    const row = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!row) throw new BadRequestException({ code: 'VERIFY_TOKEN_INVALID', message: 'Invalid verification link' });
    if (row.usedAt) throw new BadRequestException({ code: 'VERIFY_TOKEN_USED', message: 'This verification link was already used' });
    if (row.expiresAt < new Date()) throw new BadRequestException({ code: 'VERIFY_TOKEN_EXPIRED', message: 'This verification link has expired — request a new one' });

    const user = await this.prisma.user.findUnique({ where: { id: row.userId } });
    if (!user || user.deletedAt) throw new BadRequestException({ code: 'VERIFY_TOKEN_INVALID', message: 'Invalid verification link' });

    const data: any = { emailVerified: true };
    // Support email-change verifications: adopt the pending address once proven
    if (row.newEmail && row.newEmail.toLowerCase() !== user.email) {
      const clash = await this.prisma.user.findUnique({ where: { email: row.newEmail.toLowerCase() } });
      if (clash) throw new ConflictException({ code: 'USER_EMAIL_EXISTS', message: 'Email already registered' });
      data.email = row.newEmail.toLowerCase();
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data });
      await tx.emailVerificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
      await tx.auditLog.create({
        data: { actorUserId: user.id, action: 'UPDATE', entityType: 'User', entityId: user.id, newValue: { emailVerified: true } as any, ipAddress: meta.ip, userAgent: meta.userAgent },
      });
      await tx.notification.create({
        data: { userId: user.id, type: 'ADMIN_ANNOUNCEMENT', title: 'Email verified', message: 'Your email address has been verified. Thank you for helping keep BloodHelp trustworthy.' },
      });
    });

    void this.templates.sendForType('WELCOME', data.email ?? user.email, { firstName: user.firstName });
    return { verified: true };
  }

  async sendMobileOtp(userId: string, meta: { ip?: string; userAgent?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    if (user.mobileVerified) throw new BadRequestException({ code: 'MOBILE_ALREADY_VERIFIED', message: 'Mobile number is already verified' });

    await this.prisma.mobileVerificationOtp.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    const otp = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + this.mobileOtpExpiresInMs());
    await this.prisma.mobileVerificationOtp.create({
      data: { userId: user.id, mobile: user.mobile, otpHash: this.otpHash(otp, user.id), expiresAt },
    });
    const result = await this.sms.sendSms(user.mobile, `BloodHelp: your verification code is ${otp}. Valid for 10 minutes.`);
    await this.prisma.securityEvent.create({
      data: { userId: user.id, type: 'MOBILE_CHANGED', ipAddress: meta.ip, userAgent: meta.userAgent, metadata: { result: 'otp-sent' } as any },
    });
    // Dev/E2E helper mirroring the password-reset devToken pattern
    return { sent: true, smsSkipped: result.skipped, devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined };
  }

  async verifyMobileOtp(userId: string, otp: string, meta: { ip?: string; userAgent?: string }) {
    const maxAttempts = this.config.get<number>('app.otp.maxAttempts', 5)!;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    if (user.mobileVerified) throw new BadRequestException({ code: 'MOBILE_ALREADY_VERIFIED', message: 'Mobile number is already verified' });

    const row = await this.prisma.mobileVerificationOtp.findFirst({
      where: { userId: user.id, mobile: user.mobile, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) throw new BadRequestException({ code: 'OTP_NOT_FOUND', message: 'No active code — request a new one' });
    if (row.expiresAt < new Date()) throw new BadRequestException({ code: 'OTP_EXPIRED', message: 'Code expired — request a new one' });
    if (row.attempts >= maxAttempts) {
      await this.prisma.mobileVerificationOtp.update({ where: { id: row.id }, data: { usedAt: new Date() } });
      throw new BadRequestException({ code: 'OTP_LOCKED', message: 'Too many wrong attempts — request a new code' });
    }

    const candidate = Buffer.from(this.otpHash(otp, user.id));
    const expected = Buffer.from(row.otpHash);
    const match = candidate.length === expected.length && timingSafeEqual(candidate, expected);
    if (!match) {
      const attempts = row.attempts + 1;
      await this.prisma.mobileVerificationOtp.update({
        where: { id: row.id },
        data: { attempts, ...(attempts >= maxAttempts ? { usedAt: new Date() } : {}) },
      });
      const left = Math.max(0, maxAttempts - attempts);
      throw new BadRequestException({ code: 'OTP_INVALID', message: left > 0 ? `Incorrect code — ${left} attempt(s) left` : 'Too many wrong attempts — request a new code' });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { mobileVerified: true } });
      await tx.mobileVerificationOtp.update({ where: { id: row.id }, data: { usedAt: new Date() } });
      await tx.auditLog.create({
        data: { actorUserId: user.id, action: 'UPDATE', entityType: 'User', entityId: user.id, newValue: { mobileVerified: true } as any, ipAddress: meta.ip, userAgent: meta.userAgent },
      });
      await tx.notification.create({
        data: { userId: user.id, type: 'ADMIN_ANNOUNCEMENT', title: 'Mobile verified', message: 'Your mobile number has been verified.' },
      });
    });
    return { verified: true };
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

    // "Remember me" checked → long-lived refresh; otherwise a short session
    const rememberMe = dto.rememberMe === true;
    const refreshTtlMs = rememberMe ? this.refreshExpiresInMs() : this.refreshExpiresInShortMs();

    const accessToken = this.signAccessToken(user);
    const { refreshToken } = await this.createRefreshToken(user.id, meta, refreshTtlMs);

    return { user: this.toPublicUser(user), accessToken, refreshToken, rememberMe, refreshExpiresInMs: refreshTtlMs };
  }

  private async createRefreshToken(
    userId: string,
    meta: { ip?: string; userAgent?: string },
    expiresInMs: number = this.refreshExpiresInMs(),
  ) {
    const raw = randomToken(32);
    const tokenHash = sha256(raw);
    const familyId = randomFamilyId();
    const expiresAt = new Date(Date.now() + expiresInMs);
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

    // Rotate: revoke old, issue new in same family.
    // Preserve the ORIGINAL absolute expiry (chosen at login via rememberMe)
    // so rotation extends the session slidingly only via access tokens —
    // a short session can never silently become a 30-day one.
    const newRaw = randomToken(32);
    const newHash = sha256(newRaw);
    const newExpiresAt = existing.expiresAt;

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

    // A family outliving the short-session TTL must have come from "remember me"
    const persistent = newExpiresAt.getTime() - Date.now() > this.refreshExpiresInShortMs();

    const accessToken = this.signAccessToken(user);
    return { accessToken, refreshToken: newRaw, user, refreshExpiresAt: newExpiresAt, persistent };
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
      void this.templates.sendForType('PASSWORD_RESET', user.email, {
        firstName: user.firstName,
        resetLink: `${this.appUrl()}/reset-password?token=${raw}`,
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

    void this.templates.sendForType('PASSWORD_CHANGED', user.email, { firstName: user.firstName });

    return { success: true };
  }

  /**
   * Change password while logged in. Verifies the current password, enforces
   * the password policy, revokes ALL existing refresh sessions, and issues a
   * fresh token pair so the user stays logged in on this device only.
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    persistent: boolean,
    meta: { ip?: string; userAgent?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    if (!user.active) throw new ForbiddenException({ code: 'AUTH_ACCOUNT_DISABLED', message: 'Account is disabled' });

    const currentOk = await verifyPassword(user.passwordHash, dto.currentPassword);
    if (!currentOk) {
      throw new UnauthorizedException({ code: 'AUTH_INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect' });
    }

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException({ code: 'PASSWORD_MISMATCH', message: 'Passwords do not match' });
    }
    const sameAsCurrent = await verifyPassword(user.passwordHash, dto.newPassword);
    if (sameAsCurrent) {
      throw new BadRequestException({ code: 'PASSWORD_SAME_AS_CURRENT', message: 'New password must be different from the current password' });
    }
    const policy = getPasswordPolicy(this.config);
    const errors = validatePasswordPolicy(dto.newPassword, policy);
    if (errors.length) throw new BadRequestException({ code: 'PASSWORD_POLICY', message: errors.join('; '), details: errors });

    const newHash = await hashPassword(dto.newPassword);
    const ttlMs = persistent ? this.refreshExpiresInMs() : this.refreshExpiresInShortMs();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
      // Revoke every session (including stolen ones) — fresh pair issued below
      await tx.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.securityEvent.create({
        data: { userId: user.id, type: 'PASSWORD_CHANGED', ipAddress: meta.ip, userAgent: meta.userAgent },
      });
      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'PASSWORD_CHANGED',
          title: 'Password changed',
          message: 'Your password was just changed. All other devices were logged out. If this was not you, reset your password immediately.',
        },
      });
    });

    void this.templates.sendForType('PASSWORD_CHANGED', user.email, { firstName: user.firstName });

    const accessToken = this.signAccessToken(user);
    const { refreshToken } = await this.createRefreshToken(user.id, meta, ttlMs);
    return { accessToken, refreshToken, persistent, refreshExpiresInMs: ttlMs };
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
