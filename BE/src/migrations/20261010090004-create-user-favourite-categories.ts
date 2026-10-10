import type { QueryInterface } from 'sequelize';
import type { MigrationParams } from 'umzug';

// Historical schema: keep literals frozen; evolve through a new migration.
export async function up({
  context,
}: MigrationParams<QueryInterface>): Promise<void> {
  await context.sequelize.transaction(async (transaction) => {
    await context.sequelize.query(
      `
CREATE TABLE user_favourite_categories (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  category_code VARCHAR(32) NOT NULL REFERENCES categories(code) ON DELETE RESTRICT ON UPDATE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  PRIMARY KEY (user_id, category_code)
);
CREATE INDEX idx_favourites_category ON user_favourite_categories (category_code);
`,
      { transaction },
    );
  });
}

export async function down({
  context,
}: MigrationParams<QueryInterface>): Promise<void> {
  await context.sequelize.transaction(async (transaction) => {
    await context.dropTable('user_favourite_categories', { transaction });
  });
}
