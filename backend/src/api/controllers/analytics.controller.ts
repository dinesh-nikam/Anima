import { Controller, Get, Req, Query, UseGuards, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { AnalyticsService } from '../../application/analytics/analytics.service';
import { AuthGuard } from '../../security/auth.guard';

@Controller('analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();

    try {
      return await this.analyticsService.getOverview(userId);
    } catch (error) {
      throw new ForbiddenException(error.message);
    }
  }

  @Get('contributions/calendar')
  async getCalendar(@Req() req: any, @Query() query: any) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();

    const year = parseInt(query?.year) || new Date().getFullYear();
    return this.analyticsService.getContributionCalendar(userId, year);
  }
}
