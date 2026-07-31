import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import {
  ANALYTICS_PERMISSIONS,
  REPORT_PERMISSIONS,
} from '../constants/analytics.constants';
import {
  DashboardQueryDto,
  TrendsQueryDto,
} from '../dto/analytics.dto';
import { DashboardService } from '../services/dashboard.service';
import { InsightsService } from '../services/insights.service';
import { KpiService } from '../services/kpi.service';
import { ReportService } from '../services/report.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Permissions(ANALYTICS_PERMISSIONS.READ)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly dashboards: DashboardService,
    private readonly kpis: KpiService,
    private readonly reports: ReportService,
    private readonly insights: InsightsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Executive / domain dashboard',
    description:
      'code=executive|sales|revenue|orders|payments|inventory|shipping|warranty|service|marketing|search|recommendation|system',
  })
  dashboard(@Query() q: DashboardQueryDto) {
    return this.dashboards.getDashboard(q.code ?? 'executive');
  }

  @Get('kpis')
  @ApiOperation({ summary: 'KPI snapshots (scorecards)' })
  listKpis(@Query('period') period?: string) {
    return this.kpis.list(period ?? 'daily');
  }

  @Get('reports')
  @Permissions(REPORT_PERMISSIONS.READ)
  @ApiOperation({ summary: 'List saved reports' })
  listReports() {
    return this.reports.listSaved();
  }

  @Get('funnels')
  @ApiOperation({ summary: 'Conversion funnel with drop-off' })
  funnels() {
    return this.insights.funnels();
  }

  @Get('trends')
  @ApiOperation({ summary: 'Domain metric trends' })
  trends(@Query() q: TrendsQueryDto) {
    return this.insights.trends(
      q.domain ?? 'sales',
      q.period ?? 'daily',
      q.days ?? 30,
    );
  }

  @Get('cohorts')
  @ApiOperation({ summary: 'Cohort / retention analysis' })
  cohorts() {
    return this.insights.cohorts();
  }

  @Get('ltv')
  @ApiOperation({ summary: 'Customer lifetime value' })
  ltv() {
    return this.insights.ltv();
  }

  @Get('rfm')
  @ApiOperation({ summary: 'RFM segments from orders' })
  rfm() {
    return this.insights.rfm();
  }
}
