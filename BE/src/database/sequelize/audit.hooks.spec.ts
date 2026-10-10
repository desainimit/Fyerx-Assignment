import type { Optional } from 'sequelize';
import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Sequelize,
  Table,
} from 'sequelize-typescript';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { AuditModel, type AuditAttributes } from '@models';
import { RequestContextService } from '@context/request-context';
import { UserRole } from '@app-types/auth.types';
import { createAuditHooks } from './audit.hooks';

interface FixtureAttributes extends AuditAttributes {
  id: string;
  title: string;
}

@Table({ tableName: 'audit_fixture', underscored: true, timestamps: true })
class AuditedFixture extends AuditModel<
  FixtureAttributes,
  Optional<FixtureAttributes, keyof AuditAttributes>
> {
  @PrimaryKey
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare title: string;
}

@Table({ tableName: 'plain_fixture', timestamps: false })
class PlainFixture extends Model<{ id: string; title: string }> {
  @PrimaryKey
  @Column(DataType.UUID)
  declare id: string;

  @Column(DataType.STRING)
  declare title: string;
}

describe('automatic Sequelize audit writes', () => {
  let sequelize: Sequelize;
  const context = new RequestContextService();
  const creator = randomUUID();
  const editor = randomUUID();
  const forged = randomUUID();
  const originalDate = new Date('2025-01-01T00:00:00Z');
  let inserted: Record<string, unknown>[];

  function stubInsert() {
    return jest
      .spyOn(sequelize.getQueryInterface(), 'insert')
      .mockImplementation(async (instance, _table, values) => {
        // save() mutates this argument after the query; capture what SQL receives.
        inserted.push({ ...values });
        return [instance, 1];
      });
  }

  function asUser<T>(id: string, callback: () => T): T {
    return context.run(
      { requestId: randomUUID(), user: { id, role: UserRole.User } },
      callback,
    );
  }

  beforeEach(() => {
    inserted = [];
    sequelize = new Sequelize({
      dialect: 'postgres',
      logging: false,
      models: [AuditedFixture, PlainFixture],
      hooks: createAuditHooks(),
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await sequelize.close();
  });

  it('persists the verified actor and server timestamps through native create with restricted fields', async () => {
    const insert = stubInsert();
    await asUser(creator, () =>
      AuditedFixture.create(
        {
          id: randomUUID(),
          title: 'Music night',
          createdBy: forged,
          updatedBy: forged,
          createdAt: originalDate,
          updatedAt: originalDate,
        },
        { fields: ['id', 'title'] },
      ),
    );
    expect(insert).toHaveBeenCalledTimes(1);
    expect(inserted[0]).toMatchObject({
      created_by: creator,
      updated_by: creator,
      created_at: expect.any(Date),
      updated_at: expect.any(Date),
    });
    expect(inserted[0]).not.toHaveProperty('createdBy');
    expect(inserted[0]).not.toMatchObject({ created_at: originalDate });
  });

  it('preserves creation attribution and stamps a different actor through instance update', async () => {
    let values: Record<string, unknown> = {};
    const update = jest
      .spyOn(sequelize.getQueryInterface(), 'update')
      .mockImplementation(async (instance, _table, attributes) => {
        values = { ...attributes };
        return [instance, 1];
      });
    const row = AuditedFixture.build(
      {
        id: randomUUID(),
        title: 'Before',
        createdBy: creator,
        updatedBy: creator,
        createdAt: originalDate,
        updatedAt: originalDate,
      },
      { isNewRecord: false, raw: true },
    );
    await asUser(editor, () =>
      row.update(
        {
          title: 'After',
          createdBy: forged,
          createdAt: new Date(),
          updatedBy: forged,
        },
        { fields: ['title', 'createdBy', 'createdAt'] },
      ),
    );
    expect(update).toHaveBeenCalledTimes(1);
    expect(values).toMatchObject({
      title: 'After',
      updated_by: editor,
      updated_at: expect.any(Date),
    });
    expect(values).not.toHaveProperty('created_by');
    expect(values).not.toHaveProperty('created_at');
    expect(row.createdBy).toBe(creator);
    expect(row.createdAt).toEqual(originalDate);
  });

  it('stamps native bulk updates without individual hooks and strips forged creation values', async () => {
    const bulkUpdate = jest
      .spyOn(sequelize.getQueryInterface(), 'bulkUpdate')
      .mockResolvedValue({});
    await asUser(editor, () =>
      AuditedFixture.update(
        {
          title: 'After',
          createdBy: forged,
          createdAt: originalDate,
          updatedBy: forged,
        },
        {
          where: { id: randomUUID() },
          fields: ['title', 'createdBy', 'createdAt'],
        },
      ),
    );
    const values = bulkUpdate.mock.calls[0][1];
    expect(values).toMatchObject({
      title: 'After',
      updated_by: editor,
      updated_at: expect.any(Date),
    });
    expect(values).not.toHaveProperty('created_by');
    expect(values).not.toHaveProperty('created_at');
  });

  it('audits a partially loaded instance saved without validation or native timestamp updates', async () => {
    let written: Record<string, unknown> = {};
    jest
      .spyOn(sequelize.getQueryInterface(), 'update')
      .mockImplementation(async (instance, _table, values) => {
        written = { ...values };
        return [instance, 1];
      });
    const row = AuditedFixture.build(
      { id: randomUUID(), title: 'Before' },
      { isNewRecord: false, raw: true },
    );
    row.set({ title: 'After', createdBy: forged, updatedBy: forged });
    await asUser(editor, () =>
      row.save({
        validate: false,
        silent: true,
        fields: ['title', 'createdBy'],
      }),
    );
    expect(written).toMatchObject({
      title: 'After',
      updated_by: editor,
      updated_at: expect.any(Date),
    });
    expect(written).not.toHaveProperty('created_by');
    expect(written).not.toHaveProperty('created_at');
    expect(row.createdBy).toBeUndefined();
  });

  it('stamps bulk inserts and preserves creation fields on conflict updates', async () => {
    const bulkInsert = jest
      .spyOn(sequelize.getQueryInterface(), 'bulkInsert')
      .mockResolvedValue([]);
    await asUser(editor, () =>
      AuditedFixture.bulkCreate(
        [
          { id: randomUUID(), title: 'Music night', createdBy: forged },
          { id: randomUUID(), title: 'Food fair' },
        ],
        {
          fields: ['id', 'title'],
          validate: true,
          updateOnDuplicate: ['title', 'createdBy', 'createdAt'],
        },
      ),
    );
    const records = bulkInsert.mock.calls[0][1];
    expect(records).toHaveLength(2);
    for (const record of records)
      expect(record).toMatchObject({
        created_by: editor,
        updated_by: editor,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    const options = bulkInsert.mock.calls[0][2] as {
      updateOnDuplicate?: string[];
    };
    expect(options.updateOnDuplicate).toEqual([
      'title',
      'updated_by',
      'updated_at',
    ]);
  });

  it('leaves system writes unattributed and excludes non-audited models', async () => {
    stubInsert();
    await AuditedFixture.create({
      id: randomUUID(),
      title: 'System seed',
      createdBy: forged,
    });
    expect(inserted[0]).toMatchObject({ created_by: null, updated_by: null });
    await asUser(creator, () =>
      PlainFixture.create({ id: randomUUID(), title: 'Migration metadata' }),
    );
    expect(inserted[1]).not.toHaveProperty('created_by');
    expect(inserted[1]).not.toHaveProperty('updatedBy');
  });

  it('keeps concurrent ORM writes tied to their own async actor', async () => {
    stubInsert();
    await Promise.all(
      [creator, editor].map((id) =>
        asUser(id, async () => {
          await delay(id === creator ? 10 : 1);
          await AuditedFixture.create({ id: randomUUID(), title: id });
        }),
      ),
    );
    for (const values of inserted)
      expect(values).toMatchObject({
        title: values.created_by,
        updated_by: values.created_by,
      });
  });

  it('rejects v6 upsert before SQL instead of silently losing audit guarantees', async () => {
    const upsert = jest.spyOn(sequelize.getQueryInterface(), 'upsert');
    await expect(
      asUser(creator, () =>
        AuditedFixture.upsert({ id: randomUUID(), title: 'Unsupported' }),
      ),
    ).rejects.toThrow('instead of upsert');
    expect(upsert).not.toHaveBeenCalled();
  });
});
