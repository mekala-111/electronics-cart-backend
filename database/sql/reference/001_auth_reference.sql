-- Production reference seed: system actor, roles, permissions (no demo users).
-- Applied by deploy after DDL/indexes. Idempotent.

BEGIN;

INSERT INTO users (
  id, email, user_type, auth_provider, status,
  email_verified_at, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system@electronicscart.internal',
  'system',
  'local',
  'active',
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

UPDATE users
SET created_by = '00000000-0000-0000-0000-000000000001',
    updated_by = '00000000-0000-0000-0000-000000000001'
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND created_by IS NULL;

INSERT INTO roles (id, code, name, description, is_system, status, created_by, updated_by)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'super_admin', 'Super Admin', 'Full platform access', TRUE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'admin', 'Admin', 'Operations admin', TRUE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', 'customer', 'Customer', 'Storefront customer', TRUE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000004', 'vendor', 'Vendor', 'Marketplace seller (future)', TRUE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000005', 'support', 'Support Agent', 'Support tickets', TRUE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000006', 'technician', 'Technician', 'Service center tech', TRUE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO permissions (id, code, module, action, description, status, created_by, updated_by)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'auth.users.read', 'auth', 'users.read', 'View users', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'auth.users.write', 'auth', 'users.write', 'Create/update users', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', 'auth.roles.read', 'auth', 'roles.read', 'View roles', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000004', 'auth.roles.write', 'auth', 'roles.write', 'Manage roles & permissions', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000005', 'auth.sessions.revoke', 'auth', 'sessions.revoke', 'Revoke sessions/tokens', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000006', 'admin.dashboard.read', 'admin', 'dashboard.read', 'View admin dashboard', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000007', 'orders.read', 'orders', 'read', 'View orders', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000008', 'orders.write', 'orders', 'write', 'Manage orders', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000009', 'catalog.read', 'catalog', 'read', 'View catalog', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-00000000000a', 'catalog.write', 'catalog', 'write', 'Manage catalog', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-00000000000b', 'inventory.read', 'inventory', 'read', 'View inventory', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-00000000000c', 'inventory.write', 'inventory', 'write', 'Manage inventory', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-00000000000d', 'support.tickets.read', 'support', 'tickets.read', 'View support tickets', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-00000000000e', 'support.tickets.write', 'support', 'tickets.write', 'Manage support tickets', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-00000000000f', 'service.tickets.write', 'service', 'tickets.write', 'Manage service tickets', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, status, created_by, updated_by)
SELECT r.id, p.id, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'super_admin' AND r.deleted_at IS NULL AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, status, created_by, updated_by)
SELECT r.id, p.id, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'
FROM roles r
JOIN permissions p ON p.code IN (
  'catalog.read', 'orders.read', 'orders.write', 'inventory.read',
  'support.tickets.read', 'support.tickets.write', 'admin.dashboard.read'
)
WHERE r.code = 'admin' AND r.deleted_at IS NULL AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, status, created_by, updated_by)
SELECT r.id, p.id, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'
FROM roles r
JOIN permissions p ON p.code IN ('catalog.read', 'orders.read')
WHERE r.code = 'customer' AND r.deleted_at IS NULL AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;

COMMIT;
