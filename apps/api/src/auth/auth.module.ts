import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard';
import { RefreshRateLimitGuard } from './guards/refresh-rate-limit.guard';

@Module({
  imports: [ConfigModule, PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LoginRateLimitGuard, RefreshRateLimitGuard],
  exports: [AuthService],
})
export class AuthModule {}
