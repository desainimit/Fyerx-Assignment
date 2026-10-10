import 'reflect-metadata';
import { Sequelize } from 'sequelize-typescript';
import {
  APPLICATION_MODELS,
  CategoryModel,
  EventCardDesignModel,
  EventModel,
  EventReminderModel,
  UserFavouriteCategoryModel,
  UserModel,
} from './index';

const userId = '00000000-0000-4000-8000-000000000001';
const eventId = '00000000-0000-4000-8000-000000000002';
const event = {
  title: ' Music night ',
  categoryCode: 'music',
  city: ' Coimbatore ',
  startsAt: new Date('2020-01-01T10:00:00Z'),
  pricePaise: 0,
  description: 'A local music night',
  imageUrl: 'https://example.com/event.jpg',
};

describe('application model registry', () => {
  let sequelize: Sequelize;
  beforeAll(() => {
    sequelize = new Sequelize({
      dialect: 'postgres',
      models: APPLICATION_MODELS,
      logging: false,
    });
  });
  afterAll(async () => {
    await sequelize.close();
  });

  it('initializes all six models and deferred business associations', () => {
    expect(Object.keys(sequelize.models)).toHaveLength(6);
    expect(EventModel.associations.category.target).toBe(CategoryModel);
    expect(UserModel.associations.favouriteCategories.target).toBe(
      UserFavouriteCategoryModel,
    );
    expect(EventReminderModel.associations.event.target).toBe(EventModel);
    expect(EventCardDesignModel.associations.user.target).toBe(UserModel);
    for (const model of APPLICATION_MODELS) {
      const attributes = model.rawAttributes;
      expect(attributes.createdBy.field).toBe('created_by');
      expect(attributes.updatedBy.field).toBe('updated_by');
      expect(attributes.createdAt.field).toBe('created_at');
      expect(attributes.updatedAt.field).toBe('updated_at');
    }
  });

  it('uses natural primary keys without synthesized IDs', () => {
    expect(CategoryModel.primaryKeyAttributes).toEqual(['code']);
    expect(UserFavouriteCategoryModel.primaryKeyAttributes).toEqual([
      'userId',
      'categoryCode',
    ]);
    for (const model of [EventReminderModel, EventCardDesignModel]) {
      expect(model.primaryKeyAttributes).toEqual(['userId', 'eventId']);
      expect(model.rawAttributes).not.toHaveProperty('id');
    }
  });

  it('normalizes email and generates UUIDs before persistence', async () => {
    const user = UserModel.build({
      email: ' Visitor@Example.COM ',
      passwordHash: 'encoded-hash-fixture',
    });
    await expect(user.validate()).resolves.toBe(user);
    expect(user.email).toBe('visitor@example.com');
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('excludes the hash from default reads and includes it in authentication reads', async () => {
    const select = jest
      .spyOn(sequelize.getQueryInterface(), 'select')
      .mockResolvedValue([]);
    try {
      await UserModel.findAll();
      expect(select.mock.calls[0][2]).not.toEqual(
        expect.objectContaining({
          attributes: expect.arrayContaining([
            ['password_hash', 'passwordHash'],
          ]),
        }),
      );
      await UserModel.scope('authentication').findAll();
      expect(select.mock.calls[1][2]).toEqual(
        expect.objectContaining({
          attributes: expect.arrayContaining([
            ['password_hash', 'passwordHash'],
          ]),
        }),
      );
    } finally {
      select.mockRestore();
    }
  });

  it('trims event fields, permits past/free events, and supplies defaults', async () => {
    const instance = EventModel.build(event);
    await expect(instance.validate()).resolves.toBe(instance);
    expect(instance.title).toBe('Music night');
    expect(instance.city).toBe('Coimbatore');
    expect(instance.isActive).toBe(true);
    const design = EventCardDesignModel.build({ userId, eventId });
    expect(design.theme).toBe('sunset');
    expect(design.stickers).toEqual([]);
    expect(EventReminderModel.build({ userId, eventId }).enabled).toBe(true);
  });

  it.each([
    { pricePaise: -1 },
    { pricePaise: 1.5 },
    { title: '   ' },
    { city: '   ' },
    { description: '  ' },
    { imageUrl: 'ftp://example.com/file' },
    { imageUrl: 'https://' },
    { startsAt: new Date('invalid') },
  ])('rejects invalid event attributes: %j', async (invalid) => {
    await expect(
      EventModel.build({ ...event, ...invalid }).validate(),
    ).rejects.toThrow();
  });

  it.each([{ stickers: [] }, { stickers: ['star', 'star', 'party'] }])(
    'accepts valid sticker lists: %j',
    async ({ stickers }) => {
      const design = EventCardDesignModel.build({ userId, eventId });
      design.setDataValue('stickers', stickers as typeof design.stickers);
      await expect(design.validate()).resolves.toBe(design);
    },
  );

  it.each([
    [['star', 'heart', 'party', 'sparkles']],
    [['unknown']],
    [[null]],
    [[['star']]],
  ])('rejects invalid sticker lists: %j', async (stickers) => {
    const design = EventCardDesignModel.build({ userId, eventId });
    design.setDataValue('stickers', stickers as typeof design.stickers);
    await expect(design.validate()).rejects.toThrow();
  });
});
