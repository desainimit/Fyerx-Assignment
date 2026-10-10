export function requireDisposableDatabaseUrl(
  value: string | undefined,
  applicationDatabase?: string,
): string {
  if (!value)
    throw new Error(
      'TEST_DATABASE_URL is required. Supply an empty disposable PostgreSQL database ending in _test.',
    );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a PostgreSQL URL');
  }
  let database: string;
  try {
    database = decodeURIComponent(url.pathname.slice(1));
  } catch {
    throw new Error('Invalid test database name');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    !url.username ||
    !/^[a-zA-Z0-9_]+_test$/.test(database)
  ) {
    throw new Error(
      'Use an explicit PostgreSQL URL with a database name ending in _test',
    );
  }
  if (database === applicationDatabase)
    throw new Error('Refusing the configured application database');
  return value;
}

export function assertEmptyTestDatabase(
  database: string,
  schema: string,
  tables: readonly string[],
): void {
  if (!database.endsWith('_test') || schema !== 'public')
    throw new Error('Unexpected test database or schema');
  if (tables.length)
    throw new Error(
      'Refusing a nonempty database: existing tables must not be overwritten',
    );
}
