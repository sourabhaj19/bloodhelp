import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

function getMeta(req: Request) {
  return {
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip,
    userAgent: req.headers['user-agent'] as string | undefined,
  };
}

function setRefreshCookie(res: Response, token: string, opts: { maxAgeMs?: number } = {}) {
  const isProd = process.env.NODE_ENV === 'production';
  // Per §5: HttpOnly; Secure; SameSite=Strict; path=/api/auth.
  // With maxAgeMs → persistent cookie ("remember me"); without → session cookie
  // that dies with the browser (short server-side TTL still enforced via expiresAt).
  const base = {
    httpOnly: true,
    secure: isProd, // false in dev so localhost http works
    sameSite: 'strict' as const,
    ...(opts.maxAgeMs ? { maxAge: opts.maxAgeMs } : {}),
  };
  res.cookie('refresh_token', token, { ...base, path: '/api/auth' });
  // Also set same cookie on /api/v1/auth for dual prefix compat
  res.cookie('refresh_token', token, { ...base, path: '/api/v1/auth' });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie('refresh_token', { path: '/api/auth' });
  res.clearCookie('refresh_token', { path: '/api/v1/auth' });
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new USER account' })
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto, getMeta(req));
    setRefreshCookie(res, result.refreshToken, { maxAgeMs: 30 * 24 * 60 * 60 * 1000 });
    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        expiresIn: 900,
        user: result.user,
      },
      message: 'Registration successful',
    };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email or mobile' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto, getMeta(req));
    // rememberMe → persistent cookie matching the long refresh TTL;
    // otherwise a session cookie (server still caps the session at the short TTL)
    setRefreshCookie(res, result.refreshToken, result.rememberMe ? { maxAgeMs: result.refreshExpiresInMs } : {});
    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        expiresIn: 900,
        user: result.user,
      },
      message: 'Login successful',
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token, issue new access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Support both cookie and body token for testability; prefer cookie
    const cookieToken = (req.cookies as any)?.refresh_token as string | undefined;
    const bodyToken = (req.body as any)?.refreshToken as string | undefined;
    const headerToken = (req.headers['x-refresh-token'] as string | undefined);
    const presented = cookieToken || bodyToken || headerToken;
    const result = await this.auth.refresh(presented, getMeta(req));
    // Preserve the persistence chosen at login: persistent cookie capped at the
    // family's remaining lifetime, or a session cookie for short sessions.
    const maxAgeMs = result.persistent
      ? Math.max(0, result.refreshExpiresAt.getTime() - Date.now())
      : undefined;
    setRefreshCookie(res, result.refreshToken, { maxAgeMs });
    return {
      success: true,
      data: { accessToken: result.accessToken, expiresIn: 900, user: { id: result.user.id, role: result.user.role, email: result.user.email, firstName: result.user.firstName, lastName: result.user.lastName } },
      message: 'Token refreshed',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout — revoke refresh family' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieToken = (req.cookies as any)?.refresh_token as string | undefined;
    const bodyToken = (req.body as any)?.refreshToken as string | undefined;
    const presented = cookieToken || bodyToken;
    await this.auth.logout(presented, getMeta(req));
    clearRefreshCookie(res);
    return { success: true, data: null, message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser() user: JwtPayload) {
    const profile = await this.auth.me(user.sub);
    return { success: true, data: profile, message: 'Profile fetched' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request password reset (always 200 generic)' })
  async forgot(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const result = await this.auth.forgotPassword(dto.email, getMeta(req));
    // Never leak enumeration; generic message always
    // In dev, optionally return token for testing convenience when email provider not configured
    const data: any = {};
    if (result.devToken) data.devToken = result.devToken;
    return { success: true, data, message: 'If an account exists for that email, a reset link has been sent.' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset password with token' })
  async reset(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    await this.auth.resetPassword(dto, getMeta(req));
    return { success: true, data: null, message: 'Password has been reset. Please login.' };
  }

  // Optional verify endpoints per §4 stub
  @Public()
  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail() {
    return { success: true, data: null, message: 'Email verification is not yet fully implemented in this phase — placeholder' };
  }
}
