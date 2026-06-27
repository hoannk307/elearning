import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AccessService } from '../auth/access.service';
import { CurrentUser } from '../auth/decorators';
import { AuthUser } from '../auth/auth.types';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly access: AccessService,
  ) {}

  @Get('overview')
  async overview(@CurrentUser() user: AuthUser) {
    const ids = await this.access.accessibleStudentIds(user);
    return this.reports.overview(ids);
  }

  @Get('student/:id')
  async studentDetail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.access.assertStudentAccess(user, id);
    return this.reports.studentDetail(id);
  }

  @Post('student/:id/assessment')
  async assessment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('model') model?: string,
  ) {
    await this.access.assertStudentAccess(user, id);
    return this.reports.assessment(id, model);
  }
}
