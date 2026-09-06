import { Controller, Get, Post, Req, Param, UseGuards, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { GithubSyncService } from '../../application/services/github-sync.service';
import { AuthGuard } from '../../security/auth.guard';

@Controller('github')
export class GithubController {
  constructor(private readonly syncService: GithubSyncService) {}

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    const profile = await this.syncService.getProfile(userId);
    if (!profile) {
      throw new ForbiddenException('GitHub account not connected');
    }
    return profile;
  }

  @Get('repositories')
  @UseGuards(AuthGuard)
  async getRepositories(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();

    return this.syncService.getRepositories(userId);
  }

  @Post('sync')
  @UseGuards(AuthGuard)
  async triggerSync(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();

    const syncId = await this.syncService.startFullSync(userId);
    return {
      syncId,
      status: 'PENDING',
      message: 'Synchronization started in background',
    };
  }

  @Get('sync/:id')
  @UseGuards(AuthGuard)
  async getSyncStatus(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();

    const status = await this.syncService.getSyncStatus(id);
    if (!status) throw new ForbiddenException('Sync record not found');
    
    return status;
  }
}
