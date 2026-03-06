import { Controller, Get, Req } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { DashboardOverviewContract } from '@tiba/shared/dashboard';
import { AuthUser } from '../auth/auth-user.interface';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOkResponse({ type: Object })
  getOverview(@Req() req: { user: AuthUser }): Promise<DashboardOverviewContract> {
    return this.dashboardService.getOverview(req.user);
  }
}
