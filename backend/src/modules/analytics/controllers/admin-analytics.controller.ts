import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { Idempotent } from '../../../shared/idempotency/idempotent.decorator';
import {
  ANALYTICS_PERMISSIONS,
  REPORT_PERMISSIONS,
} from '../constants/analytics.constants';
import {
  CreateAlertRuleDto,
  CreateKpiDto,
  CreateSavedReportDto,
  CreateScheduleDto,
  GenerateReportDto,
  PatchDashboardDto,
  RefreshDashboardDto,
} from '../dto/analytics.dto';
import { AlertService } from '../services/alert.service';
import { DashboardService } from '../services/dashboard.service';
import { KpiService } from '../services/kpi.service';
import { ReportService } from '../services/report.service';
import { SystemAnalyticsService } from '../services/system-analytics.service';

@ApiTags('admin-analytics')
@ApiBearerAuth()
@Roles('admin', 'super_admin')
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(
    private readonly reportService: ReportService,
    private readonly alerts: AlertService,
    private readonly kpis: KpiService,
    private readonly dashboards: DashboardService,
    private readonly system: SystemAnalyticsService,
  ) {}

  @Post('reports')
  @Permissions(REPORT_PERMISSIONS.WRITE)
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({
    summary: 'Create saved report or enqueue export',
    description: 'Pass format to enqueue async export; omit to create definition.',
  })
  async createOrExportReport(@CurrentUser() user: AuthUser, @Body() body: CreateSavedReportDto & GenerateReportDto) {
    if (body.format || body.savedReportId) {
      return this.reportService.enqueueGenerate(user.sub, {
        savedReportId: body.savedReportId,
        format: body.format,
      });
    }
    if (!body.code || !body.name || !body.reportType) {
      return this.reportService.enqueueGenerate(user.sub, { format: 'json' });
    }
    return this.reportService.createSaved(user.sub, {
      code: body.code,
      name: body.name,
      reportType: body.reportType,
      query: body.query,
    });
  }

  @Post('schedules')
  @Permissions(REPORT_PERMISSIONS.WRITE)
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Schedule a saved report' })
  schedule(@CurrentUser() user: AuthUser, @Body() dto: CreateScheduleDto) {
    return this.reportService.createSchedule(user.sub, {
      savedReportId: dto.savedReportId,
      cronExpression: dto.cronExpression,
      timezone: dto.timezone,
      recipients: dto.recipients,
    });
  }

  @Post('alerts')
  @Permissions(ANALYTICS_PERMISSIONS.WRITE)
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Create AlertRule (RuleEngine conditions)' })
  createAlert(@CurrentUser() user: AuthUser, @Body() dto: CreateAlertRuleDto) {
    return this.alerts.create(user.sub, {
      code: dto.code,
      name: dto.name,
      severity: dto.severity,
      condition: dto.condition,
      cooldownMinutes: dto.cooldownMinutes,
      isEnabled: dto.isEnabled,
    });
  }

  @Post('kpis')
  @Permissions(ANALYTICS_PERMISSIONS.WRITE)
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Upsert KPI snapshot / refresh scorecard' })
  async kpisEndpoint(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateKpiDto,
    @Query('refresh') refresh?: string,
  ) {
    if (refresh === 'true' || refresh === '1') {
      return this.kpis.refresh(dto.domain);
    }
    return this.kpis.upsert(user.sub, {
      domain: dto.domain,
      period: dto.period,
      metrics: dto.metrics,
      threshold: dto.threshold,
    });
  }

  @Patch('dashboard')
  @Permissions(ANALYTICS_PERMISSIONS.WRITE)
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Configure dashboard layout (admin only)' })
  patchDashboard(
    @CurrentUser() user: AuthUser,
    @Body() dto: PatchDashboardDto,
  ) {
    return this.dashboards.patchLayout(user.sub, {
      code: dto.code,
      name: dto.name,
      isDefault: dto.isDefault,
      widgets: dto.widgets,
    });
  }

  @Post('dashboard/refresh')
  @Permissions(ANALYTICS_PERMISSIONS.WRITE)
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Force dashboard refresh (locked + cached)' })
  refreshDashboard(
    @CurrentUser() user: AuthUser,
    @Body() dto: RefreshDashboardDto,
  ) {
    return this.dashboards.refresh(user.sub, dto.code ?? 'executive');
  }

  @Get('system')
  @Permissions(ANALYTICS_PERMISSIONS.READ)
  @ApiOperation({ summary: 'System health / API / job metrics' })
  systemHealth() {
    return this.system.snapshot();
  }

  @Post('alerts/evaluate')
  @Permissions(ANALYTICS_PERMISSIONS.WRITE)
  @Idempotent()
  @ApiOperation({ summary: 'Enqueue alert evaluation against live facts' })
  async evaluateAlerts() {
    const facts = await this.alerts.buildFactsFromMetrics();
    await this.alerts.enqueueEvaluation(facts);
    return { queued: true };
  }
}
