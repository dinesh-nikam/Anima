import { Controller, Get, Post, Req, UseGuards, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { AchievementService } from '../../application/achievements/achievement.service';
import { AuthGuard } from '../../security/auth.guard';

@Controller('achievements')
@UseGuards(AuthGuard)
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  @Get('me')
  async getMyAchievements(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();

    return this.achievementService.getUserAchievements(userId);
  }

  @Post('me/recalculate')
  async recalculate(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();

    await this.achievementService.evaluateUserAchievements(userId);
    return { message: 'Achievements recalculated successfully' };
  }
}
