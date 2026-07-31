import { PERMISSIONS_KEY } from '../../../common/decorators/permissions.decorator';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { AdminOrdersController } from './admin-orders.controller';

describe('AdminOrdersController permissions', () => {
  it('requires admin roles and orders.write', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminOrdersController)).toEqual(
      expect.arrayContaining(['admin', 'super_admin']),
    );
    expect(Reflect.getMetadata(PERMISSIONS_KEY, AdminOrdersController)).toEqual([
      'orders.write',
    ]);
  });
});
