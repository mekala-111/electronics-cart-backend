import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { ProductSearchDto } from '../dto/product-search.dto';
import { CatalogService } from '../services/catalog.service';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get('brands')
  @ApiOperation({ summary: 'List active brands' })
  listBrands() {
    return this.catalog.listBrands();
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'List active categories (flat)' })
  listCategories() {
    return this.catalog.listCategories();
  }

  @Public()
  @Get('categories/tree')
  @ApiOperation({ summary: 'Category tree built from parent_id' })
  categoryTree() {
    return this.catalog.categoryTree();
  }

  @Public()
  @Get('collections')
  listCollections() {
    return this.catalog.listCollections();
  }

  @Public()
  @Get('attributes')
  listAttributes() {
    return this.catalog.listAttributes();
  }

  @Public()
  @Get('products/search')
  @ApiOperation({ summary: 'Search & filter products' })
  search(@Query() query: ProductSearchDto) {
    return this.catalog.searchProducts(query);
  }

  @Public()
  @Get('products/featured')
  featured() {
    return this.catalog.featuredProducts();
  }

  @Public()
  @Get('products/new')
  newest() {
    return this.catalog.newProducts();
  }

  @Public()
  @Get('products/refurbished')
  refurbished() {
    return this.catalog.refurbishedProducts();
  }

  @Public()
  @Get('products')
  list(@Query() query: ProductSearchDto) {
    return this.catalog.searchProducts(query);
  }

  @Public()
  @Get('products/:idOrSlug')
  @ApiOperation({ summary: 'Product detail by UUID or slug' })
  getOne(@Param('idOrSlug') idOrSlug: string) {
    return this.catalog.getProduct(idOrSlug);
  }

  @Public()
  @Get('products/:id/specifications')
  specifications(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.productSpecifications(id);
  }

  @Public()
  @Get('products/:id/media')
  media(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.productMedia(id);
  }

  @Public()
  @Get('products/:id/videos')
  videos(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.productVideos(id);
  }

  @Public()
  @Get('products/:id/questions')
  @ApiOperation({
    summary: 'Product Q&A (empty until product_questions exists in schema)',
  })
  questions(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.productQuestions(id);
  }
}
