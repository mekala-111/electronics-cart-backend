-- Electronics Cart — Phase 1 Authentication
-- PostgreSQL 16
-- File: 001_initial.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ── Enums ────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE record_status AS ENUM ('active', 'inactive', 'suspended', 'pending', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_type AS ENUM ('customer', 'admin', 'vendor', 'technician', 'support', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE auth_provider AS ENUM ('local', 'google', 'apple', 'otp');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE otp_purpose AS ENUM (
    'login', 'register', 'reset_password', 'verify_email', 'verify_mobile', 'two_factor'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE otp_channel AS ENUM ('sms', 'email', 'whatsapp');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('active', 'revoked', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE token_status AS ENUM ('active', 'rotated', 'revoked', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── users ────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               CITEXT,
  mobile              VARCHAR(20),
  password_hash       VARCHAR(255),
  email_verified_at   TIMESTAMPTZ,
  mobile_verified_at  TIMESTAMPTZ,
  user_type           user_type NOT NULL DEFAULT 'customer',
  auth_provider       auth_provider NOT NULL DEFAULT 'local',
  last_login_at       TIMESTAMPTZ,
  last_login_ip       INET,
  failed_login_count  INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
  locked_until        TIMESTAMPTZ,
  mfa_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret          VARCHAR(255),
  status              record_status NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_by          UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_users_contact CHECK (email IS NOT NULL OR mobile IS NOT NULL)
);

COMMENT ON TABLE users IS 'Core identity for customers, admins, vendors, technicians';
COMMENT ON COLUMN users.password_hash IS 'bcrypt/argon2 hash; NULL for OAuth/OTP-only accounts';

-- ── roles ────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) NOT NULL,
  name        VARCHAR(120) NOT NULL,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── permissions ──────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(120) NOT NULL,
  module      VARCHAR(64) NOT NULL,
  action      VARCHAR(64) NOT NULL,
  description TEXT,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── role_permissions ─────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── user_roles ───────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── refresh_tokens ───────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash     VARCHAR(128) NOT NULL,
  family_id      UUID NOT NULL,
  replaced_by_id UUID,
  user_agent     VARCHAR(512),
  ip_address     INET,
  expires_at     TIMESTAMPTZ NOT NULL,
  revoked_at     TIMESTAMPTZ,
  status         token_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users (id) ON DELETE SET NULL
);

COMMENT ON COLUMN refresh_tokens.family_id IS 'Refresh-token rotation family; reuse detection revokes entire family';

-- ── sessions ─────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  session_token_hash  VARCHAR(128) NOT NULL,
  device_name         VARCHAR(120),
  device_type         VARCHAR(64),
  user_agent          VARCHAR(512),
  ip_address          INET,
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ,
  status              session_status NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_by          UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── otps ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS otps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users (id) ON DELETE SET NULL,
  destination  VARCHAR(255) NOT NULL,
  channel      otp_channel NOT NULL,
  purpose      otp_purpose NOT NULL,
  code_hash    VARCHAR(128) NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  status       record_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── oauth_accounts ───────────────────────────
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider          auth_provider NOT NULL,
  provider_user_id  VARCHAR(255) NOT NULL,
  email             CITEXT,
  access_token_enc  TEXT,
  refresh_token_enc TEXT,
  token_expires_at  TIMESTAMPTZ,
  raw_profile       JSONB,
  status            record_status NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_oauth_provider CHECK (provider IN ('google', 'apple'))
);

-- ── login_attempts ───────────────────────────
CREATE TABLE IF NOT EXISTS login_attempts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users (id) ON DELETE SET NULL,
  identifier     VARCHAR(255) NOT NULL,
  ip_address     INET,
  user_agent     VARCHAR(512),
  success        BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reason VARCHAR(120),
  status         record_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users (id) ON DELETE SET NULL
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'roles', 'permissions', 'role_permissions', 'user_roles',
    'refresh_tokens', 'sessions', 'otps', 'oauth_accounts', 'login_attempts'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;
       CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END $$;

COMMIT;
