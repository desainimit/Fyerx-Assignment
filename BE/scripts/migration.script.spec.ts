import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createMigration } from './migration.script';

describe('migration generator', () => {
  let directory: string;
  const now = new Date('2026-10-10T10:20:30.000Z');

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'community-events-migration-'));
  });

  afterEach(() => {
    if (
      path.dirname(directory) !== path.resolve(tmpdir()) ||
      !path.basename(directory).startsWith('community-events-migration-')
    ) {
      throw new Error('Refusing cleanup outside the test temporary directory');
    }
    rmSync(directory, { recursive: true, force: true });
  });

  it('creates a timestamped TypeScript migration with up and down exports', () => {
    const file = createMigration('create-users', directory, now);
    expect(path.basename(file)).toBe('20261010102030-create-users.ts');
    const source = readFileSync(file, 'utf8');
    expect(source).toContain('export async function up');
    expect(source).toContain('export async function down');
  });

  it.each(['../outside', 'nested/file', 'CreateUsers', '', '..'])(
    'rejects unsafe or invalid name %s without writing files',
    (name) => {
      expect(() => createMigration(name, directory, now)).toThrow();
      expect(readdirSync(directory)).toEqual([]);
    },
  );

  it('does not overwrite an existing migration with the same name and timestamp', () => {
    const file = createMigration('create-users', directory, now);
    const original = readFileSync(file, 'utf8');
    expect(() => createMigration('create-users', directory, now)).toThrow();
    expect(readFileSync(file, 'utf8')).toBe(original);
  });
});
