import type { QueryInterface } from 'sequelize';
import type { MigrationParams } from 'umzug';

// Historical schema: keep literals frozen; evolve through a new migration.
export async function up({
  context,
}: MigrationParams<QueryInterface>): Promise<void> {
  await context.sequelize.transaction(async (transaction) => {
    await context.sequelize.query(
      `
CREATE TABLE categories (
  code VARCHAR(32) PRIMARY KEY,
  name VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT ck_categories_code CHECK (code ~ '^[a-z][a-z0-9-]*$'),
  CONSTRAINT ck_categories_name CHECK (name ~ '[^[:space:]]')
);
INSERT INTO categories (code, name) VALUES
  ('music', 'Music'), ('workshop', 'Workshop'), ('food', 'Food'), ('sports', 'Sports'), ('kids', 'Kids');
`,
      { transaction },
    );
  });
}

export async function down({
  context,
}: MigrationParams<QueryInterface>): Promise<void> {
  await context.sequelize.transaction(async (transaction) => {
    await context.dropTable('categories', { transaction });
  });
}
