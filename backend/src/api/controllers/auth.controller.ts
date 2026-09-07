import { Controller, Get, Post, Req, Res, HttpStatus, BadRequestException, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from '../../application/services/auth.service';
import { AuthGuard } from '../../security/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('github')
  async startGithubOAuth(@Res() res: Response) {
    const { url } = await this.authService.startGithubOAuth();
    // We don't send state to frontend, it's managed by the redirect to GitHub
    return res.redirect(url);
  }

  @Get('github/connect')
  @UseGuards(AuthGuard)
  async connectGithub(@Req() req: Request, @Res() res: Response) {
    const { url } = await this.authService.startGithubOAuth(req['user'].id);
    return res.redirect(url);
  }

  @Get('github/callback')
  async githubCallback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code || !state) {
      throw new BadRequestException('Missing code or state');
    }

    const metadata = {
      ip: req.ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    };

    try {
      const { token, user } = await this.authService.handleGithubCallback(code, state, metadata);
      
      // Set secure HttpOnly cookie
      res.cookie('session_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
      });

      // Redirect back to frontend dashboard
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/dashboard?github=connected`);
    } catch (error) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/dashboard?error=auth_failed`);
    }
  }

  @Get('session')
  async getSession(@Req() req: Request) {
    const token = req.cookies['session_token'];
    if (!token) {
      const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      if (isDev) {
        const devUser = await this.authService.getDevUser();
        return {
          authenticated: true,
          user: {
            id: devUser.id,
            displayName: devUser.displayName,
            role: devUser.role,
            github: await this.authService.getGithubConnection(devUser.id),
          },
        };
      }
      return { authenticated: false };
    }

    const session = await this.authService.validateSession(token);
    if (!session) {
      const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      if (isDev) {
        const devUser = await this.authService.getDevUser();
        return {
          authenticated: true,
          user: {
            id: devUser.id,
            displayName: devUser.displayName,
            role: devUser.role,
          },
        };
      }
      return { authenticated: false };
    }

    return {
      authenticated: true,
      user: {
        id: session.user.id,
        displayName: session.user.displayName,
        role: session.user.role,
        github: await this.authService.getGithubConnection(session.user.id),
      },
    };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies['session_token'];
    if (token) {
      await this.authService.revokeSession(token);
    }
    res.clearCookie('session_token');
    return res.status(HttpStatus.OK).json({ message: 'Logged out successfully' });
  }
}
