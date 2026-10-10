import type { QueryInterface } from 'sequelize';
import type { MigrationParams } from 'umzug';

// Historical schema: keep literals frozen; evolve through a new migration.
export async function up({
  context,
}: MigrationParams<QueryInterface>): Promise<void> {
  await context.sequelize.transaction(async (transaction) => {
    await context.sequelize.query(
      `
CREATE TABLE event_card_designs (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  theme VARCHAR(16) NOT NULL DEFAULT 'sunset',
  stickers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  PRIMARY KEY (user_id, event_id),
  CONSTRAINT ck_designs_theme CHECK (theme IN ('sunset', 'ocean', 'forest')),
  CONSTRAINT ck_designs_stickers CHECK (
    CASE
      WHEN cardinality(stickers) = 0 THEN TRUE
      WHEN array_ndims(stickers) = 1 THEN
        cardinality(stickers) <= 3
        AND array_lower(stickers, 1) = 1
        AND array_position(stickers, NULL) IS NULL
        AND stickers <@ ARRAY['star', 'heart', 'music-note', 'sparkles', 'party']::TEXT[]
      ELSE FALSE
    END
  )
);
CREATE INDEX idx_designs_event ON event_card_designs (event_id);
`,
      { transaction },
    );
  });
}

export async function down({
  context,
}: MigrationParams<QueryInterface>): Promise<void> {
  await context.sequelize.transaction(async (transaction) => {
    await context.dropTable('event_card_designs', { transaction });
  });
}
