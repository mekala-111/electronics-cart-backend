import { PERMISSIONS_KEY } from '../../../common/decorators/permissions.decorator';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { AdminCatalogController } from './admin-catalog.controller';

describe('AdminCatalogController permissions', () => {
  it('requires admin roles and catalog.write', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminCatalogController);
    const perms = Reflect.getMetadata(PERMISSIONS_KEY, AdminCatalogController);
    expect(roles).toEqual(expect.arrayContaining(['admin', 'super_admin']));
    expect(perms).toEqual(['catalog.write']);
  });
});
