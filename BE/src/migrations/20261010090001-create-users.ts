import type { QueryInterface } from 'sequelize';
import type { MigrationParams } from 'umzug';

// Historical schema: keep literals frozen; evolve through a new migration.
export async function up({
  context,
}: MigrationParams<QueryInterface>): Promise<void> {
  await context.sequelize.transaction(async (transaction) => {
    await context.sequelize.query(
      `
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(254) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(8) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT ck_users_email_canonical CHECK (email = lower(btrim(email)) AND email ~ '[^[:space:]]' AND email !~ '[[:space:]]'),
  CONSTRAINT ck_users_password_hash CHECK (password_hash ~ '[^[:space:]]'),
  CONSTRAINT ck_users_role CHECK (role IN ('user', 'admin'))
);
`,
      { transaction },
    );
  });
}

export async function down({
  context,
}: MigrationParams<QueryInterface>): Promise<void> {
  await context.sequelize.transaction(async (transaction) => {
    await context.dropTable('users', { transaction });
  });
}
