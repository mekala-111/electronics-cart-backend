import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { Idempotent } from '../../../shared/idempotency/idempotent.decorator';
import { CATALOG_PERMISSIONS } from '../constants/catalog.constants';
import { CreateBrandDto, UpdateBrandDto } from '../dto/brand.dto';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import {
  AssignCollectionProductsDto,
  CreateCollectionDto,
  UpdateCollectionDto,
} from '../dto/collection.dto';
import {
  AssignBadgeDto,
  AttachProductMediaDto,
  CreateBadgeDto,
  CreateBuyingGuideDto,
  CreateSpecificationDto,
  UpsertSeoDto,
} from '../dto/media.dto';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';
import { CreateVariantDto, UpdateVariantDto } from '../dto/variant.dto';
import { CatalogService } from '../services/catalog.service';

@ApiTags('catalog-admin')
@ApiBearerAuth()
@ApiHeader({ name: 'Idempotency-Key', required: false })
@Roles('admin', 'super_admin')
@Permissions(CATALOG_PERMISSIONS.WRITE)
@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // Brands
  @Idempotent()
  @Post('brands')
  createBrand(@Body() dto: CreateBrandDto, @CurrentUser() user: AuthUser) {
    return this.catalog.createBrand(dto, user.sub);
  }

  @Patch('brands/:id')
  updateBrand(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalog.updateBrand(id, dto, user.sub);
  }

  @Delete('brands/:id')
  deleteBrand(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteBrand(id);
  }

  // Categories
  @Idempotent()
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthUser) {
    return this.catalog.createCategory(dto, user.sub);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalog.updateCategory(id, dto, user.sub);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteCategory(id);
  }

  // Collections
  @Idempotent()
  @Post('collections')
  createCollection(@Body() dto: CreateCollectionDto, @CurrentUser() user: AuthUser) {
    return this.catalog.createCollection(dto, user.sub);
  }

  @Patch('collections/:id')
  updateCollection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCollectionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalog.updateCollection(id, dto, user.sub);
  }

  @Idempotent()
  @Post('collections/:id/products')
  assignCollectionProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCollectionProductsDto,
  ) {
    return this.catalog.assignCollectionProducts(id, dto);
  }

  @Delete('collections/:id')
  deleteCollection(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteCollection(id);
  }

  // Products
  @Idempotent()
  @Post('products')
  createProduct(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.catalog.createProduct(dto, user.sub);
  }

  @Patch('products/:id')
  updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalog.updateProduct(id, dto, user.sub);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteProduct(id);
  }

  // Variants
  @Idempotent()
  @Post('variants')
  createVariant(@Body() dto: CreateVariantDto, @CurrentUser() user: AuthUser) {
    return this.catalog.createVariant(dto, user.sub);
  }

  @Patch('variants/:id')
  updateVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVariantDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalog.updateVariant(id, dto, user.sub);
  }

  @Delete('variants/:id')
  deleteVariant(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteVariant(id);
  }

  // Media / specs
  @Idempotent()
  @Post('products/:id/media')
  attachMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachProductMediaDto,
  ) {
    return this.catalog.attachMedia(id, dto);
  }

  @Delete('products/:productId/media/:mediaId')
  deleteMedia(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
  ) {
    return this.catalog.deleteMedia(productId, mediaId);
  }

  @Idempotent()
  @Post('products/:id/specifications')
  addSpec(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSpecificationDto,
  ) {
    return this.catalog.addSpecification(id, dto);
  }

  @Delete('products/:productId/specifications/:specId')
  deleteSpec(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('specId', ParseUUIDPipe) specId: string,
  ) {
    return this.catalog.deleteSpecification(productId, specId);
  }

  // Badges
  @Get('badges')
  @Permissions(CATALOG_PERMISSIONS.READ)
  listBadges() {
    return this.catalog.listBadges();
  }

  @Idempotent()
  @Post('badges')
  createBadge(@Body() dto: CreateBadgeDto) {
    return this.catalog.createBadge(dto);
  }

  @Idempotent()
  @Post('badges/assign')
  assignBadge(@Body() dto: AssignBadgeDto) {
    return this.catalog.assignBadge(dto);
  }

  // SEO / guides
  @Idempotent()
  @Post('seo')
  upsertSeo(@Body() dto: UpsertSeoDto) {
    return this.catalog.upsertSeo(dto);
  }

  @Get('buying-guides')
  @Permissions(CATALOG_PERMISSIONS.READ)
  listGuides() {
    return this.catalog.listBuyingGuides();
  }

  @Idempotent()
  @Post('buying-guides')
  createGuide(@Body() dto: CreateBuyingGuideDto, @CurrentUser() user: AuthUser) {
    return this.catalog.createBuyingGuide(dto, user.sub);
  }

  @Delete('buying-guides/:id')
  deleteGuide(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.deleteBuyingGuide(id);
  }
}
