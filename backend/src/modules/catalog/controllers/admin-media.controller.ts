import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { CATALOG_PERMISSIONS } from '../constants/catalog.constants';
import { CatalogService } from '../services/catalog.service';

@ApiTags('catalog-admin')
@ApiBearerAuth()
@Roles('admin', 'super_admin')
@Permissions(CATALOG_PERMISSIONS.WRITE)
@Controller('admin/media')
export class AdminMediaController {
  constructor(private readonly catalog: CatalogService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload product/catalog image' })
  upload(
    @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string; size: number } | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file?.buffer?.length) {
      throw new AppException(ErrorCodes.VALIDATION_ERROR, 'Image file is required', 400);
    }
    if (!file.mimetype?.startsWith('image/')) {
      throw new AppException(ErrorCodes.VALIDATION_ERROR, 'Only image uploads are allowed', 400);
    }
    return this.catalog.uploadMediaFile(file, user.sub);
  }
}
