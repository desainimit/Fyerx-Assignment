import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueryTypes, type QueryInterface, type Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import type { Umzug } from 'umzug';
import { UserRole } from '@app-types/auth.types';
import { RequestContextService } from '@context/request-context';
import { createMigrationRunner } from '@lib';
import { getSequelizeConfig } from '@database';
import {
  APPLICATION_MODELS,
  CategoryModel,
  EventCardDesignModel,
  EventModel,
  EventReminderModel,
  UserFavouriteCategoryModel,
  UserModel,
} from '@models';
import {
  assertEmptyTestDatabase,
  requireDisposableDatabaseUrl,
} from './database-test-safety';

const aliceId = '00000000-0000-4000-8000-000000000001';
const bobId = '00000000-0000-4000-8000-000000000002';
const missingId = '00000000-0000-4000-8000-000000000099';
const now = new Date('2030-01-01T00:00:00Z');
const future = new Date('2030-01-02T12:00:00Z');
const musicId = '10000000-0000-4000-8000-000000000001';
const secondMusicId = '10000000-0000-4000-8000-000000000002';
const foodId = '10000000-0000-4000-8000-000000000003';
const context = new RequestContextService();
const actor = (id: string) => ({
  requestId: 'database-test',
  user: { id, role: UserRole.User },
});

describe('real PostgreSQL schema', () => {
  let sequelize: Sequelize | undefined;
  let runner: Umzug<QueryInterface>;
  let lock: Transaction | undefined;
  let ownsSchema = false;

  beforeAll(async () => {
    // Load the same selected env files as the app, without needing JWT configuration.
    await ConfigModule.forRoot({ envFilePath: ['.env.test', '.env'] });
    const url = requireDisposableDatabaseUrl(
      process.env.TEST_DATABASE_URL,
      process.env.DB_CONFIG_DATABASE,
    );
    // Reuse the actual audit hooks/registry without requiring application credentials.
    const config = getSequelizeConfig(
      new ConfigService({
        DB_CONFIG_HOST: 'unused',
        DB_CONFIG_PORT: 5432,
        DB_CONFIG_USERNAME: 'unused',
        DB_CONFIG_PASSWORD: 'unused',
        DB_CONFIG_DATABASE: 'unused',
        DB_CONFIG_SSL: false,
      }),
    );
    sequelize = new Sequelize(url, {
      dialect: 'postgres',
      models: APPLICATION_MODELS,
      hooks: config.hooks,
      logging: false,
      pool: { max: 5, min: 0, acquire: 5000, idle: 1000 },
      dialectOptions: { connectionTimeoutMillis: 5000 },
    });
    await sequelize.authenticate();
    lock = await sequelize.transaction();
    const [locked] = await sequelize.query<{ acquired: boolean }>(
      'SELECT pg_try_advisory_xact_lock(192837465, 1) AS acquired',
      { type: QueryTypes.SELECT, transaction: lock },
    );
    if (!locked.acquired)
      throw new Error('Another schema verification run owns this database');
    const [identity] = await sequelize.query<{
      database: string;
      schema: string;
    }>('SELECT current_database() AS database, current_schema() AS schema', {
      type: QueryTypes.SELECT,
    });
    const tables = await sequelize.query<{ name: string }>(
      `SELECT table_schema || '.' || table_name AS name FROM information_schema.tables
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema')`,
      { type: QueryTypes.SELECT },
    );
    assertEmptyTestDatabase(
      identity.database,
      identity.schema,
      tables.map((table) => table.name),
    );
    ownsSchema = true;
    runner = createMigrationRunner(sequelize);
    await runner.up();
  });

  afterAll(async () => {
    try {
      if (ownsSchema && sequelize) {
        await runner.down({ to: 0 });
        await sequelize.getQueryInterface().dropTable('SequelizeMeta');
      }
    } finally {
      try {
        if (lock) await lock.rollback();
      } finally {
        if (sequelize) await sequelize.close();
      }
    }
  });

  function db(): Sequelize {
    if (!sequelize) throw new Error('Test database is not initialized');
    return sequelize;
  }
  async function execute(
    sql: string,
    replacements: Record<string, unknown> = {},
  ): Promise<void> {
    await db().query(sql, { replacements });
  }
  async function expectConstraint(
    sql: string,
    replacements: Record<string, unknown>,
    code: string,
  ): Promise<void> {
    await expect(execute(sql, replacements)).rejects.toMatchObject({
      original: { code },
    });
  }
  const rawEvent = `INSERT INTO events (id,title,category_code,city,starts_at,price_paise,description,image_url)
    VALUES (:id,:title,:category,:city,:start,:price,:description,:image)`;
  const values = {
    id: missingId,
    title: 'Fixture',
    category: 'music',
    city: 'Coimbatore',
    start: future,
    price: 0,
    description: 'Fixture description',
    image: 'https://example.com/image.jpg',
  };

  it('executes six migrations, seeds exactly five categories, and has no pending migrations on rerun', async () => {
    expect(await runner.executed()).toHaveLength(6);
    expect(await runner.pending()).toEqual([]);
    expect(await runner.up()).toEqual([]);
    expect(
      (await CategoryModel.findAll({ order: [['code', 'ASC']] })).map(
        (row) => row.code,
      ),
    ).toEqual(['food', 'kids', 'music', 'sports', 'workshop']);
    const categories = await CategoryModel.findAll();
    expect(
      categories.every(
        (row) =>
          row.createdBy === null &&
          row.updatedBy === null &&
          row.createdAt instanceof Date,
      ),
    ).toBe(true);
    for (const model of APPLICATION_MODELS) {
      const columns = await db()
        .getQueryInterface()
        .describeTable(model.tableName);
      expect(columns.created_at.allowNull).toBe(false);
      expect(columns.updated_at.allowNull).toBe(false);
      expect(columns.created_by.allowNull).toBe(true);
    }
    const indexes = await db().query<{ indexname: string }>(
      'SELECT indexname FROM pg_indexes WHERE schemaname = :schema',
      { replacements: { schema: 'public' }, type: QueryTypes.SELECT },
    );
    expect(indexes.map((row) => row.indexname)).toEqual(
      expect.arrayContaining([
        'uq_users_email',
        'idx_events_active_start',
        'idx_events_category_active_start',
        'idx_events_city_active_start',
        'idx_favourites_category',
        'idx_reminders_event',
        'idx_designs_event',
      ]),
    );
  });

  it('creates normalized users and rejects uniqueness, canonical storage, blank hashes, and invalid roles in SQL', async () => {
    const alice = await UserModel.create({
      id: aliceId,
      email: ' ALICE@Example.COM ',
      passwordHash: 'encoded-test-hash',
    });
    await UserModel.create({
      id: bobId,
      email: 'bob@example.com',
      passwordHash: 'encoded-test-hash',
    });
    expect(alice.email).toBe('alice@example.com');
    expect(alice.createdBy).toBeNull();
    await expect(
      UserModel.create({
        email: 'Alice@example.com',
        passwordHash: 'encoded-test-hash',
      }),
    ).rejects.toMatchObject({ original: { code: '23505' } });
    const insert =
      'INSERT INTO users (email,password_hash,role) VALUES (:email,:hash,:role)';
    for (const invalid of [
      { email: ' Mixed@example.com ' },
      { role: 'owner' },
      { hash: '   ' },
    ]) {
      await expectConstraint(
        insert,
        {
          email: 'new@example.com',
          hash: 'encoded-test-hash',
          role: 'user',
          ...invalid,
        },
        '23514',
      );
    }
    const normalRead = await UserModel.findByPk(aliceId);
    expect(normalRead?.get()).not.toHaveProperty('passwordHash');
    expect(
      (await UserModel.scope('authentication').findByPk(aliceId))?.passwordHash,
    ).toBe('encoded-test-hash');
  });

  it('persists audit actors and prevents forged creation values on instance and bulk updates', async () => {
    const created = await context.run(actor(aliceId), () =>
      EventModel.create({
        id: musicId,
        title: 'Music night',
        categoryCode: 'music',
        city: 'Coimbatore',
        startsAt: future,
        pricePaise: 15000000,
        description: 'A live concert',
        imageUrl: 'https://example.com/event.jpg',
        createdBy: bobId,
        updatedBy: bobId,
        createdAt: new Date('1990-01-01T00:00:00Z'),
      }),
    );
    const originalCreatedAt = created.createdAt.getTime();
    expect(created.createdBy).toBe(aliceId);
    await context.run(actor(bobId), () =>
      created.update({
        title: 'Music night updated',
        createdBy: bobId,
        createdAt: new Date('1990-01-01T00:00:00Z'),
        updatedBy: aliceId,
      }),
    );
    await created.reload();
    expect(created.createdBy).toBe(aliceId);
    expect(created.createdAt.getTime()).toBe(originalCreatedAt);
    expect(created.updatedBy).toBe(bobId);
    await context.run(actor(bobId), () =>
      EventModel.update(
        {
          city: 'Coimbatore',
          createdBy: bobId,
          createdAt: new Date('1990-01-01T00:00:00Z'),
        },
        { where: { id: musicId } },
      ),
    );
    await created.reload();
    expect(created.createdAt.getTime()).toBe(originalCreatedAt);
    expect(created.createdBy).toBe(aliceId);
    expect(created.updatedBy).toBe(bobId);
    // Conflict updates preserve creation attribution too.
    await context.run(actor(bobId), () =>
      EventModel.bulkCreate(
        [
          {
            id: musicId,
            title: 'Music night',
            categoryCode: 'music',
            city: 'Coimbatore',
            startsAt: future,
            pricePaise: 15000000,
            description: 'Concert',
            imageUrl: 'https://example.com/event.jpg',
          },
        ],
        { updateOnDuplicate: ['title', 'createdBy', 'createdAt'] },
      ),
    );
    await created.reload();
    expect(created.createdBy).toBe(aliceId);
    expect(created.createdAt.getTime()).toBe(originalCreatedAt);
    expect(created.updatedBy).toBe(bobId);
  });

  it('enforces event constraints and all audit foreign keys independently of model validation', async () => {
    await expectConstraint(
      rawEvent,
      { ...values, category: 'missing' },
      '23503',
    );
    for (const invalid of [
      { price: -1 },
      { title: '   ' },
      { city: '   ' },
      { description: '   ' },
      { image: 'ftp://example.com/image' },
      { start: 'infinity' },
    ]) {
      await expectConstraint(rawEvent, { ...values, ...invalid }, '23514');
    }
    for (const model of APPLICATION_MODELS) {
      // Association tables are still empty here, so exercise their audit FKs with INSERT.
      if (
        [
          'user_favourite_categories',
          'event_reminders',
          'event_card_designs',
        ].includes(model.tableName)
      ) {
        for (const field of ['created_by', 'updated_by']) {
          const insert =
            model.tableName === 'user_favourite_categories'
              ? `INSERT INTO user_favourite_categories (user_id,category_code,${field}) VALUES (:user,:category,:missing)`
              : `INSERT INTO "${model.tableName}" (user_id,event_id,${field}) VALUES (:user,:event,:missing)`;
          await expectConstraint(
            insert,
            {
              user: aliceId,
              category: 'music',
              event: musicId,
              missing: missingId,
            },
            '23503',
          );
        }
      } else {
        for (const field of ['created_by', 'updated_by']) {
          await expectConstraint(
            `UPDATE "${model.tableName}" SET ${field} = :missing`,
            { missing: missingId },
            '23503',
          );
        }
      }
    }
  });

  it('enforces composite keys, parent references, defaults, and persisted user/event preferences', async () => {
    await context.run(actor(aliceId), async () => {
      await UserFavouriteCategoryModel.create({
        userId: aliceId,
        categoryCode: 'music',
      });
      await EventReminderModel.create({ userId: aliceId, eventId: musicId });
      await EventCardDesignModel.create({ userId: aliceId, eventId: musicId });
    });
    await UserFavouriteCategoryModel.create({
      userId: bobId,
      categoryCode: 'food',
    });
    for (const table of [
      'user_favourite_categories',
      'event_reminders',
      'event_card_designs',
    ]) {
      const category = table === 'user_favourite_categories';
      const insert = category
        ? 'INSERT INTO user_favourite_categories (user_id,category_code) VALUES (:user,:parent)'
        : `INSERT INTO "${table}" (user_id,event_id) VALUES (:user,:parent)`;
      const parent = category ? 'music' : musicId;
      await expectConstraint(insert, { user: aliceId, parent }, '23505');
      await expectConstraint(insert, { user: missingId, parent }, '23503');
      await expectConstraint(
        insert,
        { user: bobId, parent: category ? 'missing' : missingId },
        '23503',
      );
    }
    await context.run(actor(aliceId), () =>
      EventReminderModel.update(
        { enabled: false },
        { where: { userId: aliceId, eventId: musicId } },
      ),
    );
    expect(
      (
        await EventReminderModel.findOne({
          where: { userId: aliceId, eventId: musicId },
        })
      )?.enabled,
    ).toBe(false);
    expect(
      await EventReminderModel.findOne({
        where: { userId: bobId, eventId: musicId },
      }),
    ).toBeNull();
    const design = await EventCardDesignModel.findOne({
      where: { userId: aliceId, eventId: musicId },
    });
    expect(design?.theme).toBe('sunset');
    expect(design?.stickers).toEqual([]);
    expect(design?.createdBy).toBe(aliceId);
    await expectConstraint(
      'DELETE FROM categories WHERE code = :code',
      { code: 'music' },
      '23503',
    );
    await expectConstraint(
      'DELETE FROM events WHERE id = :id',
      { id: musicId },
      '23503',
    );
    await expectConstraint(
      'UPDATE users SET id = :id WHERE id = :old',
      { id: missingId, old: aliceId },
      '23503',
    );
    await expectConstraint(
      'UPDATE events SET id = :id WHERE id = :old',
      { id: missingId, old: musicId },
      '23503',
    );
    await expectConstraint(
      'UPDATE categories SET code = :code WHERE code = :old',
      { code: 'new-music', old: 'music' },
      '23503',
    );
  });

  it('enforces themes and zero-to-three ordered stickers, allowing repeated IDs', async () => {
    for (const stickers of [
      "ARRAY['star','heart','party','sparkles']",
      "ARRAY['invalid']",
      'ARRAY[NULL]::TEXT[]',
      "ARRAY[['star','heart'],['star','heart']]",
      "'[0:0]={star}'::TEXT[]",
    ]) {
      await expectConstraint(
        `UPDATE event_card_designs SET stickers = ${stickers} WHERE user_id = :user`,
        { user: aliceId },
        '23514',
      );
    }
    await expectConstraint(
      'UPDATE event_card_designs SET theme = :theme WHERE user_id = :user',
      { theme: 'invalid', user: aliceId },
      '23514',
    );
    await execute(
      "UPDATE event_card_designs SET theme = 'ocean', stickers = ARRAY['star','star','party'] WHERE user_id = :user",
      { user: aliceId },
    );
    const design = await EventCardDesignModel.findOne({
      where: { userId: aliceId, eventId: musicId },
    });
    expect(design?.stickers).toEqual(['star', 'star', 'party']);
    expect(design?.theme).toBe('ocean');
  });

  it('combines filters, excludes inactive/past events, paginates ties, and isolates favourite feeds', async () => {
    const fixture = {
      title: 'Music night',
      categoryCode: 'music',
      city: 'Coimbatore',
      startsAt: future,
      pricePaise: 0,
      description: 'Community event',
      imageUrl: 'https://example.com/event.jpg',
    };
    await EventModel.bulkCreate([
      { ...fixture, id: secondMusicId },
      { ...fixture, id: foodId, title: 'Food night', categoryCode: 'food' },
      {
        ...fixture,
        id: '10000000-0000-4000-8000-000000000004',
        title: 'Music night in Chennai',
        city: 'Chennai',
      },
      {
        ...fixture,
        id: '10000000-0000-4000-8000-000000000005',
        title: 'Inactive music night',
        isActive: false,
      },
      {
        ...fixture,
        id: '10000000-0000-4000-8000-000000000006',
        title: 'Past music night',
        startsAt: new Date('2029-01-01T00:00:00Z'),
      },
      {
        ...fixture,
        id: '10000000-0000-4000-8000-000000000007',
        title: 'Music matinee',
      },
      {
        ...fixture,
        id: '10000000-0000-4000-8000-000000000008',
        title: '100%_night\\show',
      },
    ]);
    const where = `e.is_active = true AND e.starts_at > :now
      AND e.category_code = :category AND lower(e.city) = lower(:city)
      AND (e.title ILIKE :pattern ESCAPE E'\\\\' OR e.description ILIKE :pattern ESCAPE E'\\\\')`;
    const params = {
      now,
      category: 'music',
      city: 'COIMBATORE',
      pattern: '%night%',
    };
    const query = `SELECT e.id FROM events e WHERE ${where} ORDER BY e.starts_at, e.id LIMIT :limit OFFSET :offset`;
    const first = await db().query<{ id: string }>(query, {
      replacements: { ...params, limit: 1, offset: 0 },
      type: QueryTypes.SELECT,
    });
    const second = await db().query<{ id: string }>(query, {
      replacements: { ...params, limit: 1, offset: 1 },
      type: QueryTypes.SELECT,
    });
    expect(first[0].id).toBe(musicId);
    expect(second[0].id).toBe(secondMusicId);
    const [count] = await db().query<{ total: string }>(
      `SELECT count(*) AS total FROM events e WHERE ${where}`,
      { replacements: params, type: QueryTypes.SELECT },
    );
    expect(Number(count.total)).toBe(3);
    const search = '%_night\\show';
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    const literal = await db().query<{ title: string }>(
      `SELECT e.title FROM events e WHERE ${where}`,
      { replacements: { ...params, pattern }, type: QueryTypes.SELECT },
    );
    expect(literal.map((row) => row.title)).toEqual(['100%_night\\show']);
    const feed = `SELECT e.category_code FROM events e WHERE e.is_active = true AND e.starts_at > :now
      AND EXISTS (SELECT 1 FROM user_favourite_categories f WHERE f.user_id = :user AND f.category_code = e.category_code)`;
    const aliceFeed = await db().query<{ category_code: string }>(feed, {
      replacements: { now, user: aliceId },
      type: QueryTypes.SELECT,
    });
    const bobFeed = await db().query<{ category_code: string }>(feed, {
      replacements: { now, user: bobId },
      type: QueryTypes.SELECT,
    });
    expect(aliceFeed.length).toBeGreaterThan(0);
    expect(aliceFeed.every((row) => row.category_code === 'music')).toBe(true);
    expect(bobFeed).toEqual([{ category_code: 'food' }]);
    expect(
      await db().query(feed, {
        replacements: { now, user: missingId },
        type: QueryTypes.SELECT,
      }),
    ).toEqual([]);
  });

  it('cascades user preferences and nulls audit references without removing events', async () => {
    await context.run(actor(bobId), async () => {
      await EventReminderModel.create({ userId: bobId, eventId: musicId });
      await EventCardDesignModel.create({
        userId: bobId,
        eventId: musicId,
        theme: 'forest',
        stickers: ['heart'],
      });
    });
    await UserModel.destroy({ where: { id: bobId } });
    expect(
      await UserFavouriteCategoryModel.count({ where: { userId: bobId } }),
    ).toBe(0);
    expect(await EventReminderModel.count({ where: { userId: bobId } })).toBe(
      0,
    );
    expect(await EventCardDesignModel.count({ where: { userId: bobId } })).toBe(
      0,
    );
    const event = await EventModel.findByPk(musicId);
    expect(event?.createdBy).toBe(aliceId);
    expect(event?.updatedBy).toBeNull();
  });

  it('rolls back in reverse order and reapplies successfully', async () => {
    const executed = await runner.executed();
    const undone = await runner.down({ to: 0 });
    expect(undone.map((migration) => migration.name)).toEqual(
      executed.map((migration) => migration.name).reverse(),
    );
    expect(await runner.pending()).toHaveLength(6);
    expect(await db().getQueryInterface().showAllTables()).toEqual([
      'SequelizeMeta',
    ]);
    await runner.up();
    expect(await CategoryModel.count()).toBe(5);
    expect(await EventModel.count()).toBe(0);
    expect(await runner.pending()).toEqual([]);
  });
});
