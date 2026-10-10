import { Environment, validateEnvironment } from './env.validation';

const valid = {
  DB_CONFIG_HOST: 'localhost',
  DB_CONFIG_USERNAME: 'postgres',
  DB_CONFIG_PASSWORD: 'test-password',
  DB_CONFIG_DATABASE: 'community_events_board',
};

describe('environment validation', () => {
  it('applies development defaults', () => {
    expect(validateEnvironment(valid)).toMatchObject({
      NODE_ENV: Environment.Development,
      PORT: 3001,
      DB_CONFIG_PORT: 5432,
      DB_CONFIG_SSL: false,
      SWAGGER: true,
      CORS_ORIGINS: ['http://localhost:3000'],
    });
  });

  it('parses numeric, boolean and comma-separated origin settings', () => {
    expect(
      validateEnvironment({
        ...valid,
        PORT: '4000',
        DB_CONFIG_PORT: '5433',
        DB_CONFIG_SSL: 'true',
        SWAGGER: 'false',
        CORS_ORIGINS: 'http://localhost:3000, https://events.example.com',
      }),
    ).toMatchObject({
      PORT: 4000,
      DB_CONFIG_PORT: 5433,
      DB_CONFIG_SSL: true,
      SWAGGER: false,
      CORS_ORIGINS: ['http://localhost:3000', 'https://events.example.com'],
    });
  });

  it.each(['test', 'production'])(
    'disables Swagger by default in %s',
    (NODE_ENV) => {
      expect(validateEnvironment({ ...valid, NODE_ENV }).SWAGGER).toBe(false);
    },
  );

  it.each(Object.keys(valid))('requires %s', (key) => {
    expect(() => validateEnvironment({ ...valid, [key]: undefined })).toThrow(
      key,
    );
  });

  it.each(['0', '65536', 'abc', '2.5'])('rejects invalid port %s', (PORT) => {
    expect(() => validateEnvironment({ ...valid, PORT })).toThrow('PORT');
  });

  it.each(['DB_CONFIG_SSL', 'SWAGGER'])(
    'rejects ambiguous boolean %s',
    (key) => {
      expect(() => validateEnvironment({ ...valid, [key]: 'yes' })).toThrow(
        key,
      );
    },
  );

  it.each([
    '*',
    'http://localhost:3000/path',
    'http://localhost:3000/',
    'https://user:password@example.com',
  ])('rejects non-origin CORS value %s', (CORS_ORIGINS) => {
    expect(() => validateEnvironment({ ...valid, CORS_ORIGINS })).toThrow();
  });

  it('rejects unsupported environment names', () => {
    expect(() => validateEnvironment({ ...valid, NODE_ENV: 'prod' })).toThrow(
      'NODE_ENV',
    );
  });

  it('does not include credential values in validation errors', () => {
    expect(() =>
      validateEnvironment({
        ...valid,
        DB_CONFIG_HOST: '',
        DB_CONFIG_PASSWORD: 'private-credential-value',
      }),
    ).toThrow('DB_CONFIG_HOST');
    try {
      validateEnvironment({
        ...valid,
        DB_CONFIG_HOST: '',
        DB_CONFIG_PASSWORD: 'private-credential-value',
      });
    } catch (error) {
      expect(String(error)).not.toContain('private-credential-value');
    }
  });
});
