import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
  SERVICE_PERMISSIONS,
  WARRANTY_PERMISSIONS,
} from '../constants/warranty.constants';
import {
  AllocateLoanDeviceDto,
  AssignTechnicianDto,
  CreateDiagnosticDto,
  CreatePlanDto,
  CreateRepairJobDto,
  CreateTicketDto,
  ExtendWarrantyDto,
  PatchClaimDto,
  PatchRepairJobDto,
  PatchRmaDto,
  RmaRefundDto,
  TransferWarrantyDto,
  UseSparePartDto,
} from '../dto/warranty.dto';
import { RmaService } from '../services/rma.service';
import { ServiceOpsService } from '../services/service-ops.service';
import { WarrantyService } from '../services/warranty.service';

@ApiTags('admin-warranty')
@ApiBearerAuth()
@Roles('admin', 'super_admin')
@Permissions(WARRANTY_PERMISSIONS.WRITE)
@Controller('admin/warranty')
export class AdminWarrantyController {
  constructor(
    private readonly warranty: WarrantyService,
    private readonly rma: RmaService,
  ) {}

  @Post('plans')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Create warranty plan' })
  createPlan(@CurrentUser() user: AuthUser, @Body() dto: CreatePlanDto) {
    return this.warranty.createPlan(user.sub, dto);
  }

  @Patch('claims/:id')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({
    summary: 'Transition claim (review / approve / reject / in_service / close)',
  })
  patchClaim(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchClaimDto,
  ) {
    return this.warranty.patchClaim(user.sub, id, dto);
  }

  @Post('extend')
  @Idempotent()
  @ApiOperation({ summary: 'Purchase / apply extended warranty' })
  extend(@CurrentUser() user: AuthUser, @Body() dto: ExtendWarrantyDto) {
    return this.warranty.extend(
      user.sub,
      dto.registrationId,
      dto.planId,
      dto.purchaseAmount,
    );
  }

  @Post('transfer')
  @Idempotent()
  @ApiOperation({ summary: 'Transfer warranty registration to another customer' })
  transfer(@CurrentUser() user: AuthUser, @Body() dto: TransferWarrantyDto) {
    return this.warranty.transfer(user.sub, dto.registrationId, dto.toCustomerId);
  }

  @Patch('rma/:id')
  @Idempotent()
  @ApiOperation({ summary: 'Approve / receive / complete RMA via CaseManager' })
  patchRma(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchRmaDto,
  ) {
    return this.rma.patch(user.sub, id, dto);
  }

  @Post('rma/:id/refund')
  @Idempotent()
  @ApiOperation({ summary: 'Request refund via Payments module (saga)' })
  refundRma(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RmaRefundDto,
  ) {
    return this.rma.requestRefund(user.sub, id, dto);
  }
}

@ApiTags('admin-service')
@ApiBearerAuth()
@Roles('admin', 'super_admin')
@Permissions(SERVICE_PERMISSIONS.WRITE)
@Controller('admin/service')
export class AdminServiceController {
  constructor(private readonly ops: ServiceOpsService) {}

  @Get('dashboard')
  @Permissions(SERVICE_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Service operations dashboard counters' })
  dashboard() {
    return this.ops.dashboard();
  }

  @Post('assign')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Assign technician to ticket' })
  assign(@CurrentUser() user: AuthUser, @Body() dto: AssignTechnicianDto) {
    return this.ops.assignTechnician(user.sub, dto);
  }

  @Post('jobs')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Create repair job for a ticket' })
  createJob(@CurrentUser() user: AuthUser, @Body() dto: CreateRepairJobDto) {
    return this.ops.createRepairJob(user.sub, dto);
  }

  @Patch('jobs/:id')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Update repair job status / outcome' })
  patchJob(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchRepairJobDto,
  ) {
    return this.ops.patchRepairJob(user.sub, id, dto);
  }

  @Post('diagnostics')
  @Idempotent()
  @ApiOperation({ summary: 'Record diagnostic report + device health' })
  diagnostics(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDiagnosticDto,
  ) {
    return this.ops.createDiagnostic(user.sub, dto);
  }

  @Post('loan-devices')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Allocate loan device to a ticket' })
  loan(@CurrentUser() user: AuthUser, @Body() dto: AllocateLoanDeviceDto) {
    return this.ops.allocateLoanDevice(user.sub, dto);
  }

  @Post('spare-parts')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Consume spare part on repair (inventory reserve)' })
  spareParts(@CurrentUser() user: AuthUser, @Body() dto: UseSparePartDto) {
    return this.ops.useSparePart(user.sub, dto);
  }

  @Post('tickets')
  @Idempotent()
  @ApiOperation({ summary: 'Admin create service ticket' })
  createTicket(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.ops.createTicket(user.sub, dto);
  }
}
