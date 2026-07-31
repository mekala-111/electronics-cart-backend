import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { Idempotent } from '../../../shared/idempotency/idempotent.decorator';
import { AddCartItemDto, CartQueryDto, UpdateCartItemDto } from '../dto/cart.dto';
import {
  CancelOrderDto,
  CheckoutDto,
  ExchangeRequestDto,
  ReturnRequestDto,
  WishlistItemDto,
} from '../dto/checkout.dto';
import {
  LONG_TIMEOUT_MS,
  TimeoutMs,
} from '../../../common/interceptors/timeout.interceptor';
import { CartService } from '../services/cart.service';
import { CheckoutService } from '../services/checkout.service';
import { OrdersService } from '../services/orders.service';

@ApiTags('orders')
@Controller()
export class OrdersController {
  constructor(
    private readonly carts: CartService,
    private readonly checkoutService: CheckoutService,
    private readonly orders: OrdersService,
  ) {}

  // ── Cart ──────────────────────────────────────────────────

  @Public()
  @Get('cart')
  @ApiOperation({ summary: 'Get active cart (auth user or sessionKey)' })
  getCart(@CurrentUser() user: AuthUser | undefined, @Query() query: CartQueryDto) {
    return this.carts.getOrCreate(user?.sub, query.sessionKey);
  }

  @Public()
  @Post('cart/items')
  addCartItem(
    @Body() dto: AddCartItemDto,
    @CurrentUser() user: AuthUser | undefined,
    @Query() query: CartQueryDto,
  ) {
    return this.carts.addItem(dto.variantId, dto.quantity, user?.sub, query.sessionKey);
  }

  @Public()
  @Patch('cart/items/:itemId')
  updateCartItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: AuthUser | undefined,
    @Query() query: CartQueryDto,
  ) {
    return this.carts.updateItem(itemId, dto.quantity, user?.sub, query.sessionKey);
  }

  @Public()
  @Delete('cart/items/:itemId')
  removeCartItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: AuthUser | undefined,
    @Query() query: CartQueryDto,
  ) {
    return this.carts.removeItem(itemId, user?.sub, query.sessionKey);
  }

  // ── Wishlist ──────────────────────────────────────────────

  @ApiBearerAuth()
  @Get('wishlist')
  getWishlist(@CurrentUser() user: AuthUser) {
    return this.orders.getWishlist(user.sub);
  }

  @ApiBearerAuth()
  @Post('wishlist/items')
  addWishlist(@CurrentUser() user: AuthUser, @Body() dto: WishlistItemDto) {
    return this.orders.addWishlistItem(user.sub, dto.variantId);
  }

  @ApiBearerAuth()
  @Delete('wishlist/items/:itemId')
  removeWishlist(
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.orders.removeWishlistItem(user.sub, itemId);
  }

  // ── Addresses (from order history) ────────────────────────

  @ApiBearerAuth()
  @Get('addresses')
  @ApiOperation({
    summary: 'Recent shipping addresses from past orders (no addresses table in v1.0)',
  })
  addresses(@CurrentUser() user: AuthUser) {
    return this.orders.listAddresses(user.sub);
  }

  // ── Checkout ──────────────────────────────────────────────

  @ApiBearerAuth()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @Idempotent()
  @TimeoutMs(LONG_TIMEOUT_MS)
  @Post('checkout')
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.checkoutService.checkout(user.sub, dto);
  }

  // ── Orders ────────────────────────────────────────────────

  @ApiBearerAuth()
  @Get('orders')
  history(@CurrentUser() user: AuthUser) {
    return this.orders.history(user.sub);
  }

  @ApiBearerAuth()
  @Get('orders/:idOrNumber')
  detail(
    @CurrentUser() user: AuthUser,
    @Param('idOrNumber') idOrNumber: string,
  ) {
    return this.orders.getOrder(idOrNumber, user.sub);
  }

  @ApiBearerAuth()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @Idempotent()
  @Post('orders/:id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.cancel(id, user.sub, dto, false);
  }

  @ApiBearerAuth()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @Idempotent()
  @Post('orders/:id/returns')
  requestReturn(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnRequestDto,
  ) {
    return this.orders.requestReturn(user.sub, id, dto);
  }

  @ApiBearerAuth()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @Idempotent()
  @Post('orders/:id/exchanges')
  requestExchange(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExchangeRequestDto,
  ) {
    return this.orders.requestExchange(user.sub, id, dto);
  }

  @Public()
  @Get('cancellation-reasons')
  cancellationReasons() {
    return this.orders.listCancellationReasons();
  }
}
