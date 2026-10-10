import type { QueryInterface } from 'sequelize';
import type { MigrationParams } from 'umzug';

// Historical schema: keep literals frozen; evolve through a new migration.
export async function up({
  context,
}: MigrationParams<QueryInterface>): Promise<void> {
  await context.sequelize.transaction(async (transaction) => {
    await context.sequelize.query(
      `
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  category_code VARCHAR(32) NOT NULL REFERENCES categories(code) ON DELETE RESTRICT ON UPDATE RESTRICT,
  city VARCHAR(100) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  price_paise INTEGER NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT ck_events_title CHECK (title ~ '[^[:space:]]'),
  CONSTRAINT ck_events_city CHECK (city ~ '[^[:space:]]'),
  CONSTRAINT ck_events_start_finite CHECK (isfinite(starts_at)),
  CONSTRAINT ck_events_price CHECK (price_paise >= 0),
  CONSTRAINT ck_events_description CHECK (description ~ '[^[:space:]]'),
  CONSTRAINT ck_events_image_url CHECK (image_url ~* '^https?://[^[:space:]]+$')
);
CREATE INDEX idx_events_active_start ON events (is_active, starts_at, id);
CREATE INDEX idx_events_category_active_start ON events (category_code, is_active, starts_at, id);
CREATE INDEX idx_events_city_active_start ON events (lower(city), is_active, starts_at, id);
`,
      { transaction },
    );
  });
}

export async function down({
  context,
}: MigrationParams<QueryInterface>): Promise<void> {
  await context.sequelize.transaction(async (transaction) => {
    await context.dropTable('events', { transaction });
  });
}
