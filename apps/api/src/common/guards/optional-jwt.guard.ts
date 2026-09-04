import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization as string | undefined;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token — allow as anonymous, don't set user
      return true;
    }
    // Token present — validate it, if invalid then propagate 401
    return super.canActivate(context) as boolean;
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      // If token was malformed/expired, we should throw so caller knows to refresh
      // For donors/public search, expired token should still surface 401 for interceptor?
      // But spec says donors is public tiered — an expired token should not block public data.
      // So we swallow error and return undefined (anonymous)
      // However for UX, if user is logged in and token expired, frontend interceptor expects 401.
      // We compromise: throw if err is TokenExpired? But to keep public search usable even with stale token, swallow.
      return undefined;
    }
    return user;
  }
}
