import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Sequelize } from 'sequelize-typescript';
import { createMigrationRunner } from './migration.service';

jest.mock('umzug', () => {
  const actual = jest.requireActual<typeof import('umzug')>('umzug');
  return {
    ...actual,
    // Exercise real Umzug discovery and execution without PostgreSQL metadata writes.
    SequelizeStorage: jest
      .fn()
      .mockImplementation(() => actual.memoryStorage()),
  };
});

describe('development migration runner', () => {
  let directory: string;
  let sequelize: Sequelize;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'community-events-runner-'));
    sequelize = new Sequelize({
      dialect: 'postgres',
      models: [],
      logging: false,
    });
  });

  afterEach(async () => {
    await sequelize.close();
    if (
      path.dirname(directory) !== path.resolve(tmpdir()) ||
      !path.basename(directory).startsWith('community-events-runner-')
    ) {
      throw new Error('Refusing cleanup outside the test temporary directory');
    }
    rmSync(directory, { recursive: true, force: true });
  });

  it('handles an empty migrations directory', async () => {
    const runner = createMigrationRunner(sequelize, directory);
    await expect(runner.pending()).resolves.toEqual([]);
    await expect(runner.up()).resolves.toEqual([]);
  });

  it('discovers TypeScript migrations in timestamp order and applies them only once', async () => {
    const source =
      'exports.up = async () => {}; exports.down = async () => {};';
    writeFileSync(path.join(directory, '20261010000002-second.ts'), source);
    writeFileSync(path.join(directory, '20261010000001-first.ts'), source);
    writeFileSync(path.join(directory, 'ignored.ts'), source);
    const runner = createMigrationRunner(sequelize, directory);

    expect((await runner.pending()).map(({ name }) => name)).toEqual([
      '20261010000001-first.ts',
      '20261010000002-second.ts',
    ]);
    expect(await runner.up()).toHaveLength(2);
    expect(await runner.up()).toEqual([]);
    expect(await runner.executed()).toHaveLength(2);
  });
});
