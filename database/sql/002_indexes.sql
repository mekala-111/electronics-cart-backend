-- Electronics Cart — Phase 1 Authentication indexes
-- File: 002_indexes.sql
-- Partial unique indexes ignore soft-deleted rows.

BEGIN;

-- users
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_active
  ON users (email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_mobile_active
  ON users (mobile)
  WHERE mobile IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_status ON users (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users (user_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users (locked_until) WHERE locked_until IS NOT NULL;

-- roles
CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_code_active
  ON roles (code)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_roles_status ON roles (status) WHERE deleted_at IS NULL;

-- permissions
CREATE UNIQUE INDEX IF NOT EXISTS uq_permissions_code_active
  ON permissions (code)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_permissions_module_action_active
  ON permissions (module, action)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions (module) WHERE deleted_at IS NULL;

-- role_permissions
CREATE UNIQUE INDEX IF NOT EXISTS uq_role_permissions_active
  ON role_permissions (role_id, permission_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id
  ON role_permissions (permission_id)
  WHERE deleted_at IS NULL;

-- user_roles
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_roles_active
  ON user_roles (user_id, role_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles (role_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id) WHERE deleted_at IS NULL;

-- refresh_tokens
CREATE UNIQUE INDEX IF NOT EXISTS uq_refresh_tokens_token_hash
  ON refresh_tokens (token_hash)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id ON refresh_tokens (family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_status ON refresh_tokens (status) WHERE status = 'active';

-- sessions
CREATE UNIQUE INDEX IF NOT EXISTS uq_sessions_token_hash
  ON sessions (session_token_hash)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sessions_last_seen_at ON sessions (last_seen_at DESC);

-- otps
CREATE INDEX IF NOT EXISTS idx_otps_destination_purpose
  ON otps (destination, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otps_user_id ON otps (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps (expires_at);
CREATE INDEX IF NOT EXISTS idx_otps_active
  ON otps (destination, purpose)
  WHERE consumed_at IS NULL AND deleted_at IS NULL AND status = 'active';

-- oauth_accounts
CREATE UNIQUE INDEX IF NOT EXISTS uq_oauth_accounts_provider_user_active
  ON oauth_accounts (provider, provider_user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_email ON oauth_accounts (email) WHERE email IS NOT NULL;

-- login_attempts (rate-limit / fraud)
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_created
  ON login_attempts (identifier, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created
  ON login_attempts (ip_address, created_at DESC)
  WHERE ip_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id
  ON login_attempts (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_login_attempts_failures
  ON login_attempts (identifier, created_at DESC)
  WHERE success = FALSE;

COMMIT;
