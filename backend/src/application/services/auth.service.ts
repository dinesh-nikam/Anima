import { Injectable, Logger, UnauthorizedException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { GithubClient } from '../../integration/github.client';
import { EncryptionService } from '../../security/encryption.service';
import { SessionService } from '../../infrastructure/external-services/session.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly prisma = new PrismaClient();

  constructor(
    private readonly configService: ConfigService,
    private readonly githubClient: GithubClient,
    private readonly encryptionService: EncryptionService,
    private readonly sessionService: SessionService,
  ) {}

  async startGithubOAuth(userId?: string): Promise<{ url: string; state: string }> {
    const state = crypto.randomBytes(16).toString('hex');
    await this.sessionService.setTemporary(
      `oauth_state:${state}`,
      JSON.stringify({ userId: userId || null }),
      900,
    );
    
    return {
      url: this.githubClient.getAuthorizationUrl(state),
      state,
    };
  }

  async handleGithubCallback(code: string, state: string, metadata: { ip: string; userAgent: string }): Promise<{ token: string; user: any }> {
    // 1. Validate State
    const stateValue = await this.sessionService.getTemporary(`oauth_state:${state}`);
    if (!stateValue) {
      this.logger.warn(`OAuth state validation failed for state: ${state}`);
      throw new BadRequestException('Invalid or expired OAuth state');
    }
    await this.sessionService.deleteTemporary(`oauth_state:${state}`);
    const stateData = JSON.parse(stateValue) as { userId?: string | null };

    // 2. Exchange Code for Token
    const tokenData = await this.githubClient.exchangeCodeForToken(code);

    // 3. Fetch Github Identity
    const githubProfile: any = await this.githubClient.getUserProfile(tokenData.access_token);
    const emails: any[] = await this.githubClient.getUserEmails(tokenData.access_token);
    const primaryEmail = emails[0] || null;

    // 4. Find or Create Local User
    const user = await this.syncGithubUser(githubProfile, primaryEmail, tokenData, stateData.userId || undefined);

    // 5. Create Session
    const sessionToken = await this.sessionService.createSession(user.id, metadata);

    this.logger.log(`User ${user.id} authenticated via GitHub`);
    return {
      token: sessionToken,
      user: {
        id: user.id,
        displayName: user.displayName,
        github: {
          login: githubProfile.login,
          avatarUrl: githubProfile.avatar_url,
          profileUrl: githubProfile.html_url,
        },
        role: user.role,
      },
    };
  }

  private async syncGithubUser(profile: any, email: string | null, tokenData: any, linkedUserId?: string) {
    return await this.prisma.$transaction(async (tx) => {
      // Find existing account by GitHub ID
      const existingAccount = await tx.githubAccount.findUnique({
        where: { githubUserId: profile.id.toString() },
        include: { user: true },
      });

      let user;
      let accountId: string;
      if (existingAccount) {
        if (linkedUserId && existingAccount.userId !== linkedUserId) {
          throw new BadRequestException('This GitHub account is already linked to another user');
        }
        user = existingAccount.user;
        accountId = existingAccount.id;
      } else if (linkedUserId) {
        user = await tx.user.findUnique({ where: { id: linkedUserId } });
        if (!user) throw new UnauthorizedException('The current user no longer exists');

        const createdAccount = await tx.githubAccount.create({
          data: {
            userId: user.id,
            githubUserId: profile.id.toString(),
            githubLogin: profile.login,
            githubProfileUrl: profile.html_url,
            avatarUrl: profile.avatar_url,
            githubName: profile.name,
            githubEmail: email,
            scope: tokenData.scope,
          },
        });
        accountId = createdAccount.id;
      } else {
        // Create new user
        user = await tx.user.create({
          data: {
            email: email,
            displayName: profile.name || profile.login,
            role: 'USER',
            status: 'ACTIVE',
          },
        });

        const createdAccount = await tx.githubAccount.create({
          data: {
            userId: user.id,
            githubUserId: profile.id.toString(),
            githubLogin: profile.login,
            githubProfileUrl: profile.html_url,
            avatarUrl: profile.avatar_url,
            githubName: profile.name,
            githubEmail: email,
            scope: tokenData.scope,
          },
        });
        accountId = createdAccount.id;
      }

      // Update the existing account token when present; the schema intentionally
      // does not make githubAccountId unique, so upsert cannot target it directly.
      const existingToken = await tx.oAuthToken.findFirst({
        where: { githubAccountId: accountId },
        select: { id: true },
      });
      const tokenDataToStore = {
        accessTokenEncrypted: this.encryptionService.encrypt(tokenData.access_token),
        refreshTokenEncrypted: tokenData.refresh_token ? this.encryptionService.encrypt(tokenData.refresh_token) : null,
        tokenType: tokenData.token_type,
        scopes: tokenData.scope,
        updatedAt: new Date(),
      };
      if (existingToken) {
        await tx.oAuthToken.update({ where: { id: existingToken.id }, data: tokenDataToStore });
      } else {
        await tx.oAuthToken.create({
          data: { githubAccountId: accountId, ...tokenDataToStore },
        });
      }

      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      return user;
    });
  }

  async validateSession(token: string) {
    const session = await this.sessionService.getSession(token);
    if (!session) return null;

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || user.status !== 'ACTIVE') return null;

    return { user, session };
  }

  async getDevUser() {
    let devUser = await this.prisma.user.findFirst({
      where: { email: 'dev@local.anima' },
    });
    if (!devUser) {
      devUser = await this.prisma.user.create({
        data: {
          email: 'dev@local.anima',
          displayName: 'Local Developer',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
    }
    return devUser;
  }

  async revokeSession(token: string): Promise<void> {
    await this.sessionService.deleteSession(token);
  }

  async getGithubConnection(userId: string): Promise<{ connected: boolean; login?: string; avatarUrl?: string }> {
    const account = await this.prisma.githubAccount.findUnique({
      where: { userId },
      select: { githubLogin: true, avatarUrl: true },
    });
    return account
      ? { connected: true, login: account.githubLogin, avatarUrl: account.avatarUrl }
      : { connected: false };
  }
}
