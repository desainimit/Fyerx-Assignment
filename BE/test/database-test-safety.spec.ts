import {
  assertEmptyTestDatabase,
  requireDisposableDatabaseUrl,
} from './database-test-safety';

describe('disposable PostgreSQL test safety', () => {
  it('requires explicit configuration', () => {
    expect(() => requireDisposableDatabaseUrl(undefined)).toThrow(
      'TEST_DATABASE_URL is required',
    );
  });
  it.each([
    'not-a-url',
    'https://example.com/board_test',
    'postgres://tester:secret@localhost/board',
    'postgres://tester:secret@localhost/postgres',
    'postgres://tester:secret@localhost/board_test/other',
  ])('refuses unsafe targets: %s', (value) => {
    expect(() => requireDisposableDatabaseUrl(value)).toThrow();
  });
  it('refuses the application database even with a test suffix', () => {
    expect(() =>
      requireDisposableDatabaseUrl(
        'postgres://tester:secret@localhost/board_test',
        'board_test',
      ),
    ).toThrow('application database');
  });
  it('accepts a distinct explicitly named disposable database', () => {
    const url = 'postgres://tester:secret@localhost/board_schema_test';
    expect(requireDisposableDatabaseUrl(url, 'board')).toBe(url);
  });
  it.each([['users'], ['SequelizeMeta'], ['unrelated_table']])(
    'refuses any existing table: %s',
    (table) => {
      expect(() =>
        assertEmptyTestDatabase('board_schema_test', 'public', [table]),
      ).toThrow('nonempty');
    },
  );
  it('refuses unexpected database names and schemas', () => {
    expect(() => assertEmptyTestDatabase('board', 'public', [])).toThrow();
    expect(() => assertEmptyTestDatabase('board_test', 'other', [])).toThrow();
    expect(() =>
      assertEmptyTestDatabase('board_test', 'public', []),
    ).not.toThrow();
  });
});
