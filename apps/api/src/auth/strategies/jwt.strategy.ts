import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('app.jwt.accessSecret') || '';
    if (!secret || secret.startsWith('replace-with-') || secret.length < 32) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_ACCESS_SECRET must be set to >=32 random bytes in production');
      }
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'dev-only-insecure-secret-change-me-1234567890',
    });
  }

  validate(payload: JwtPayload) {
    // payload is attached to request.user
    return payload;
  }
}
