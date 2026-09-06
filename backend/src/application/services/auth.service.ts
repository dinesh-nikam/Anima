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

  async startGithubOAuth(): Promise<{ url: string; state: string }> {
    const state = crypto.randomBytes(16).toString('hex');
    // Store state in Redis with short TTL (15 mins) to prevent CSRF
    await this.sessionService['redis'].set(`oauth_state:${state}`, 'valid', 'EX', 900);
    
    return {
      url: this.githubClient.getAuthorizationUrl(state),
      state,
    };
  }

  async handleGithubCallback(code: string, state: string, metadata: { ip: string; userAgent: string }): Promise<{ token: string; user: any }> {
    // 1. Validate State
    const stateValid = await this.sessionService['redis'].get(`oauth_state:${state}`);
    if (!stateValid) {
      this.logger.warn(`OAuth state validation failed for state: ${state}`);
      throw new BadRequestException('Invalid or expired OAuth state');
    }
    await this.sessionService['redis'].del(`oauth_state:${state}`);

    // 2. Exchange Code for Token
    const tokenData = await this.githubClient.exchangeCodeForToken(code);

    // 3. Fetch Github Identity
    const githubProfile: any = await this.githubClient.getUserProfile(tokenData.access_token);
    const emails: any[] = await this.githubClient.getUserEmails(tokenData.access_token);
    const primaryEmail = emails[0] || null;

    // 4. Find or Create Local User
    const user = await this.syncGithubUser(githubProfile, primaryEmail, tokenData);

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

  private async syncGithubUser(profile: any, email: string | null, tokenData: any) {
    return await this.prisma.$transaction(async (tx) => {
      // Find existing account by GitHub ID
      const existingAccount = await tx.githubAccount.findUnique({
        where: { githubUserId: profile.id.toString() },
        include: { user: true },
      });

      let user;
      let accountId: string;
      if (existingAccount) {
        user = existingAccount.user;
        accountId = existingAccount.id;
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

      // Update/Store Token (Encrypted)
      await tx.oAuthToken.upsert({
        where: { id: this.getTokenId(accountId) },
        update: {
          accessTokenEncrypted: this.encryptionService.encrypt(tokenData.access_token),
          refreshTokenEncrypted: tokenData.refresh_token ? this.encryptionService.encrypt(tokenData.refresh_token) : null,
          tokenType: tokenData.token_type,
          scopes: tokenData.scope,
          updatedAt: new Date(),
        },
        create: {
          githubAccountId: accountId,
          accessTokenEncrypted: this.encryptionService.encrypt(tokenData.access_token),
          refreshTokenEncrypted: tokenData.refresh_token ? this.encryptionService.encrypt(tokenData.refresh_token) : null,
          tokenType: tokenData.token_type,
          scopes: tokenData.scope,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      return user;
    });
  }

  private getTokenId(accountId: string): string {
    // Since OAuthToken is 1:1 with GithubAccount for now, we can derive a stable ID
    // In a real system, you'd query by githubAccountId
    return `token_${accountId}`;
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
      where: { email: 'dev@local.veriflow' },
    });
    if (!devUser) {
      devUser = await this.prisma.user.create({
        data: {
          email: 'dev@local.veriflow',
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
}
