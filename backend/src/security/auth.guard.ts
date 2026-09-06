import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../application/services/auth.service';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies['session_token'];

    if (!token) {
      const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      if (isDev) {
        const devUser = await this.authService.getDevUser();
        request['user'] = devUser;
        request['session'] = { userId: devUser.id, isDev: true };
        return true;
      }
      throw new UnauthorizedException('No active session found');
    }

    const session = await this.authService.validateSession(token);
    if (!session) {
      const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      if (isDev) {
        const devUser = await this.authService.getDevUser();
        request['user'] = devUser;
        request['session'] = { userId: devUser.id, isDev: true };
        return true;
      }
      throw new UnauthorizedException('Session is invalid or expired');
    }

    // Attach user to request for use in controllers
    request['user'] = session.user;
    request['session'] = session;

    return true;
  }
}
