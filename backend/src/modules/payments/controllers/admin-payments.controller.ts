import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { Idempotent } from '../../../shared/idempotency/idempotent.decorator';
import { PAYMENTS_PERMISSIONS } from '../constants/payments.constants';
import {
  CreateDisputeDto,
  CreateSettlementDto,
  ReconcileDto,
  RefundPaymentDto,
  UpdateDisputeDto,
} from '../dto/payment.dto';
import { PaymentsService } from '../services/payments.service';
import { RefundService } from '../services/refund.service';
import {
  DisputeService,
  ReconciliationService,
  SettlementService,
} from '../services/settlement.service';

@ApiTags('admin-payments')
@ApiBearerAuth()
@Roles('admin', 'super_admin')
@Permissions(PAYMENTS_PERMISSIONS.WRITE)
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly refunds: RefundService,
    private readonly settlements: SettlementService,
    private readonly reconciliation: ReconciliationService,
    private readonly disputes: DisputeService,
  ) {}

  @Get('settlements/list')
  @Permissions(PAYMENTS_PERMISSIONS.READ)
  @ApiOperation({ summary: 'List settlements' })
  listSettlements(@Query('gatewayId') gatewayId?: string) {
    return this.settlements.list(gatewayId);
  }

  @Post('settlements')
  @Idempotent()
  @ApiOperation({ summary: 'Record settlement' })
  createSettlement(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSettlementDto,
  ) {
    return this.settlements.createSettlement(user.sub, dto);
  }

  @Get('reconciliation/list')
  @Permissions(PAYMENTS_PERMISSIONS.READ)
  listReconciliation(@Query('status') status?: string) {
    return this.reconciliation.list(status);
  }

  @Post('reconciliation')
  @Idempotent()
  @ApiOperation({ summary: 'Create reconciliation row' })
  reconcile(@CurrentUser() user: AuthUser, @Body() dto: ReconcileDto) {
    return this.reconciliation.reconcile(user.sub, dto);
  }

  @Get('reports/failed')
  @Permissions(PAYMENTS_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Failed transaction report' })
  failedReport() {
    return this.reconciliation.failedTransactionsReport();
  }

  @Get('disputes')
  @Permissions(PAYMENTS_PERMISSIONS.READ)
  listDisputes(@Query('paymentId') paymentId?: string) {
    return this.disputes.list(paymentId);
  }

  @Post('disputes')
  @Idempotent()
  createDispute(@CurrentUser() user: AuthUser, @Body() dto: CreateDisputeDto) {
    return this.disputes.create(user.sub, dto);
  }

  @Get('disputes/:id')
  @Permissions(PAYMENTS_PERMISSIONS.READ)
  getDispute(@Param('id', ParseUUIDPipe) id: string) {
    return this.disputes.get(id);
  }

  @Patch('disputes/:id')
  updateDispute(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDisputeDto,
  ) {
    return this.disputes.update(id, user.sub, dto);
  }

  @Get()
  @Permissions(PAYMENTS_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Admin: list payments by order' })
  byOrder(
    @CurrentUser() user: AuthUser,
    @Query('orderId') orderId: string,
  ) {
    return this.payments.getByOrder(orderId, user.sub, true);
  }

  @Get(':id')
  @Permissions(PAYMENTS_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Admin: get payment' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.getById(id, user.sub, true);
  }

  @Post(':id/capture')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Admin capture' })
  capture(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.capture(id, user.sub, true);
  }

  @Post(':id/refund')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Admin refund' })
  refund(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.refunds.refund(id, user.sub, dto, true);
  }
}
