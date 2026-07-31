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
import { SHIPPING_PERMISSIONS } from '../constants/shipping.constants';
import {
  CreateCarrierDto,
  CreateRateDto,
  CreateReverseDto,
  CreateRtoDto,
  CreateShipmentDto,
  GenerateLabelDto,
  SchedulePickupDto,
  UpdateShipmentStatusDto,
} from '../dto/shipping.dto';
import { RatesService } from '../services/rates.service';
import { ReverseLogisticsService } from '../services/reverse-logistics.service';
import { ShippingService } from '../services/shipping.service';
import { ShippingWebhookRepository } from '../repositories/shipping-webhook.repository';

@ApiTags('admin-shipping')
@ApiBearerAuth()
@Roles('admin', 'super_admin')
@Permissions(SHIPPING_PERMISSIONS.WRITE)
@Controller('admin/shipping')
export class AdminShippingController {
  constructor(
    private readonly shipping: ShippingService,
    private readonly rates: RatesService,
    private readonly reverse: ReverseLogisticsService,
    private readonly webhooks: ShippingWebhookRepository,
  ) {}

  @Post('shipments')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Admin create shipment' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateShipmentDto) {
    return this.shipping.createShipment(user.sub, dto);
  }

  @Post('labels')
  @Idempotent()
  @ApiOperation({ summary: 'Generate shipping label + AWB' })
  label(@CurrentUser() user: AuthUser, @Body() dto: GenerateLabelDto) {
    return this.shipping.generateLabel(user.sub, dto);
  }

  @Post('pickups')
  @Idempotent()
  @ApiOperation({ summary: 'Schedule carrier pickup' })
  pickup(@CurrentUser() user: AuthUser, @Body() dto: SchedulePickupDto) {
    return this.shipping.schedulePickup(user.sub, dto);
  }

  @Patch('shipments/:id/status')
  @ApiOperation({ summary: 'Update shipment status via StateMachineEngine' })
  status(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    return this.shipping.updateStatus(user.sub, id, dto);
  }

  @Post('reverse')
  @Idempotent()
  @ApiOperation({ summary: 'Create reverse shipment' })
  createReverse(@CurrentUser() user: AuthUser, @Body() dto: CreateReverseDto) {
    return this.reverse.createReverse(user.sub, dto);
  }

  @Post('rto')
  @Idempotent()
  @ApiOperation({ summary: 'Initiate RTO for forward shipment' })
  rto(@CurrentUser() user: AuthUser, @Body() dto: CreateRtoDto) {
    return this.reverse.createRto(user.sub, dto);
  }

  @Post('rates')
  @Idempotent()
  @ApiOperation({ summary: 'Add shipping rate row' })
  createRate(@CurrentUser() user: AuthUser, @Body() dto: CreateRateDto) {
    return this.rates.createRate(user.sub, dto);
  }

  @Post('carriers')
  @Idempotent()
  @ApiOperation({ summary: 'Register shipping partner (carrier)' })
  createCarrier(@CurrentUser() user: AuthUser, @Body() dto: CreateCarrierDto) {
    return this.rates.createCarrier(user.sub, dto);
  }

  @Get('webhooks')
  @Permissions(SHIPPING_PERMISSIONS.READ)
  @ApiOperation({ summary: 'List recent carrier webhooks' })
  listWebhooks(@Query('limit') limit?: string) {
    return this.webhooks.listRecent(Number(limit) || 50);
  }

  @Post('webhooks')
  @Idempotent()
  @ApiOperation({ summary: 'Admin webhook inspect alias (same as GET logs)' })
  postWebhooks(@Query('limit') limit?: string) {
    return this.webhooks.listRecent(Number(limit) || 50);
  }

  @Get('logs')
  @Permissions(SHIPPING_PERMISSIONS.READ)
  @ApiOperation({
    summary: 'Carrier webhook / tracking log stream',
    description: 'No carrier_api_logs table — returns shipping_webhooks.',
  })
  logs(@Query('limit') limit?: string) {
    return this.webhooks.listRecent(Number(limit) || 50);
  }

  @Post('shipments/:id/sync-tracking')
  @ApiOperation({ summary: 'Force tracking sync from carrier' })
  sync(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shipping.syncTracking(id, user.sub);
  }
}
