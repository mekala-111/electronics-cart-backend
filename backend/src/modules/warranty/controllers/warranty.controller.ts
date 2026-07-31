import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { Idempotent } from '../../../shared/idempotency/idempotent.decorator';
import {
  CreateClaimDto,
  CreateRmaDto,
  CreateTicketDto,
  RegisterWarrantyDto,
} from '../dto/warranty.dto';
import { RmaService } from '../services/rma.service';
import { ServiceOpsService } from '../services/service-ops.service';
import { WarrantyService } from '../services/warranty.service';

@ApiTags('warranty')
@ApiBearerAuth()
@Controller('warranty')
export class WarrantyController {
  constructor(
    private readonly warranty: WarrantyService,
    private readonly rma: RmaService,
  ) {}

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'List active warranty plans' })
  listPlans() {
    return this.warranty.listPlans();
  }

  @Get('check/:serial')
  @Public()
  @ApiOperation({ summary: 'Check warranty status by serial number' })
  check(@Param('serial') serial: string) {
    return this.warranty.checkBySerial(serial);
  }

  @Post('register')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Register / activate warranty for a device' })
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterWarrantyDto) {
    return this.warranty.register(user.sub, dto);
  }

  @Post('claims')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Submit a warranty claim' })
  createClaim(@CurrentUser() user: AuthUser, @Body() dto: CreateClaimDto) {
    return this.warranty.createClaim(user.sub, dto);
  }

  @Get('claims/:id')
  @ApiOperation({ summary: 'Get warranty claim detail + timeline' })
  getClaim(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.warranty.getClaim(id, user.sub);
  }

  @Post('rma')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Create an RMA request' })
  createRma(@CurrentUser() user: AuthUser, @Body() dto: CreateRmaDto) {
    return this.rma.create(user.sub, dto);
  }
}

@ApiTags('service')
@ApiBearerAuth()
@Controller('service')
export class ServiceController {
  constructor(private readonly ops: ServiceOpsService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'List service tickets for current user' })
  listTickets(@CurrentUser() user: AuthUser) {
    return this.ops.listTickets(user.sub);
  }

  @Post('tickets')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Open a service ticket' })
  createTicket(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.ops.createTicket(user.sub, dto);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get repair job detail + timeline' })
  getJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.ops.getRepairJob(id);
  }

  @Get('appointments')
  @ApiOperation({
    summary:
      'List service appointments (assigned tickets; no appointments table)',
  })
  appointments(@CurrentUser() user: AuthUser) {
    return this.ops.listAppointments(user.sub);
  }
}
