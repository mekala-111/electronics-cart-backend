import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
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
  CreatePaymentDto,
  HistoryQueryDto,
  RefundPaymentDto,
  SavePaymentMethodDto,
} from '../dto/payment.dto';
import { PaymentsService } from '../services/payments.service';
import { RefundService } from '../services/refund.service';
import { WebhookService } from '../services/webhook.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly refunds: RefundService,
    private readonly webhooks: WebhookService,
  ) {}

  @Post('create')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Create payment for an order' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentDto) {
    return this.payments.create(user.sub, dto);
  }

  @Public()
  @Post('webhooks/razorpay')
  @Idempotent()
  @ApiOperation({
    summary: 'Razorpay webhook',
    description:
      'Verifies X-Razorpay-Signature, rejects duplicates, persists + processes once.',
  })
  razorpayWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!req.rawBody || !Buffer.isBuffer(req.rawBody)) {
      throw new BadRequestException(
        'Raw webhook body unavailable — enable Nest rawBody',
      );
    }
    return this.webhooks.receiveRazorpay({
      rawBody: req.rawBody,
      signature: signature ?? '',
      payload: body,
    });
  }

  @Get('methods')
  @ApiOperation({ summary: 'List active payment methods' })
  methods() {
    return this.payments.listMethods();
  }

  @Get('history')
  @ApiOperation({ summary: 'Current user payment history' })
  history(@CurrentUser() user: AuthUser, @Query() query: HistoryQueryDto) {
    return this.payments.history(user.sub, query.page, query.limit);
  }

  @Get('saved-methods')
  @ApiOperation({ summary: 'List saved payment methods (tokens only)' })
  saved(@CurrentUser() user: AuthUser) {
    return this.payments.listSaved(user.sub);
  }

  @Post('saved-methods')
  @Idempotent()
  @ApiOperation({ summary: 'Save a gateway token (never raw card/PAN)' })
  saveMethod(@CurrentUser() user: AuthUser, @Body() dto: SavePaymentMethodDto) {
    return this.payments.saveMethod(user.sub, dto);
  }

  @Delete('saved-methods/:id')
  @ApiOperation({ summary: 'Delete saved payment method' })
  deleteSaved(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.deleteSaved(user.sub, id);
  }

  @Patch('saved-methods/:id/default')
  @ApiOperation({ summary: 'Set default saved payment method' })
  defaultSaved(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.setDefaultSaved(user.sub, id);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Payments for an order (owner only)' })
  byOrder(
    @CurrentUser() user: AuthUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.payments.getByOrder(orderId, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by id' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.getById(id, user.sub);
  }

  @Post(':id/authorize')
  @Idempotent()
  @ApiOperation({ summary: 'Authorize payment' })
  authorize(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.authorize(id, user.sub);
  }

  @Post(':id/capture')
  @Idempotent()
  @ApiOperation({ summary: 'Capture authorized payment' })
  capture(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.capture(id, user.sub);
  }

  @Post(':id/cancel')
  @Idempotent()
  @ApiOperation({ summary: 'Cancel / void payment' })
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.cancel(id, user.sub);
  }

  @Post(':id/refund')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Full or partial refund' })
  refund(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.refunds.refund(id, user.sub, dto);
  }

  @Get(':id/refunds')
  @ApiOperation({ summary: 'List refunds for payment' })
  listRefunds(@Param('id', ParseUUIDPipe) id: string) {
    return this.refunds.listForPayment(id);
  }

  @Post(':id/retry')
  @Idempotent()
  @ApiOperation({ summary: 'Retry failed/pending payment' })
  retry(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.retry(id, user.sub);
  }
}
