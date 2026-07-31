# RBAC

## Model

RBAC is relational:

```
User → UserRole → Role → RolePermission → Permission
```

All joins filter `deleted_at: null` and `status: active`.

## Runtime resolution

On token issuance, `RoleRepository` loads:

- `getUserRoleCodes(userId)` — role `code` values
- `getUserPermissionCodes(userId)` — distinct permission `code` values

These arrays are embedded in the JWT for `RolesGuard` and `PermissionsGuard`.

## Default customer assignment

Registration assigns role code `customer` using seed ID `10000000-0000-0000-0000-000000000003`.

## Caching

Cache key helpers exist in `auth.constants.ts` (`authCacheKeys.userRoles`, `authCacheKeys.userPermissions`) for future invalidation on role changes.
