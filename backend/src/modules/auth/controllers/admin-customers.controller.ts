import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ORDERS_PERMISSIONS } from '../../orders/constants/orders.constants';
import { CustomerAdminService } from '../services/customer-admin.service';

@ApiTags('admin-customers')
@ApiBearerAuth()
@Roles('admin', 'super_admin')
@Permissions(ORDERS_PERMISSIONS.READ)
@Controller('admin/customers')
export class AdminCustomersController {
  constructor(private readonly customers: CustomerAdminService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customers.list(
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }
}
