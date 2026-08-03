import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { Idempotent } from '../../../shared/idempotency/idempotent.decorator';
import {
  CreateShipmentDto,
  EstimateShippingDto,
  RatesQueryDto,
} from '../dto/shipping.dto';
import { RatesService } from '../services/rates.service';
import { ShippingService } from '../services/shipping.service';
import { ShippingWebhookService } from '../services/shipping-webhook.service';

@ApiTags('shipping')
@ApiBearerAuth()
@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly shipping: ShippingService,
    private readonly rates: RatesService,
    private readonly webhooks: ShippingWebhookService,
  ) {}

  @Get('methods')
  @ApiOperation({ summary: 'List shipping services (methods)' })
  methods() {
    return this.rates.listMethods();
  }

  @Get('rates')
  @ApiOperation({ summary: 'List / quote shipping rates' })
  ratesList(@Query() query: RatesQueryDto) {
    return this.rates.listRates(query.fromPincode, query.toPincode, query.weightKg);
  }

  @Post('estimate')
  @ApiOperation({ summary: 'Estimate shipping cost by weight/zone/COD' })
  estimate(@Body() dto: EstimateShippingDto) {
    return this.rates.estimate(dto);
  }

  @Post('shipments')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Create shipment for an order' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateShipmentDto) {
    return this.shipping.createShipment(user.sub, dto);
  }

  @Get('shipments/:id')
  @ApiOperation({ summary: 'Get shipment detail' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.shipping.getShipment(id);
  }

  @Get('shipments/:id/tracking')
  @ApiOperation({ summary: 'Get tracking history' })
  tracking(@Param('id', ParseUUIDPipe) id: string) {
    return this.shipping.getTracking(id);
  }

  @Get('delivery-slots')
  @ApiOperation({ summary: 'List available delivery slots' })
  slots() {
    return this.rates.listDeliverySlots();
  }

  @Get('pickup-points')
  @ApiOperation({ summary: 'List active pickup points' })
  pickupPoints() {
    return this.rates.listPickupPoints();
  }

  @Public()
  @Post(['webhooks/tracking', 'webhooks/shiprocket'])
  @Idempotent()
  @ApiOperation({
    summary: 'Carrier tracking webhook (Shiprocket)',
    description:
      'Prefer /shipping/webhooks/tracking — Shiprocket rejects URLs containing "shiprocket". Accepts x-api-key or x-api-hmac-sha256.',
  })
  shiprocketWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-api-hmac-sha256') hmac: string | undefined,
    @Headers('x-api-key') apiKey: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!req.rawBody || !Buffer.isBuffer(req.rawBody)) {
      throw new BadRequestException(
        'Raw webhook body unavailable — enable Nest rawBody',
      );
    }
    return this.webhooks.receiveShiprocket({
      rawBody: req.rawBody,
      signature: hmac || apiKey || '',
      payload: body,
    });
  }
}
