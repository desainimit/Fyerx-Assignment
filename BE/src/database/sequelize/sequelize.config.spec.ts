import { ConfigService } from '@nestjs/config';
import { validateEnvironment } from '@config';
import { getSequelizeConfig } from './sequelize.config';

function config(ssl: string): ConfigService {
  return new ConfigService(
    validateEnvironment({
      DB_CONFIG_HOST: 'database.example.com',
      DB_CONFIG_USERNAME: 'postgres',
      DB_CONFIG_PASSWORD: 'test-password',
      DB_CONFIG_DATABASE: 'community_events_board',
      DB_CONFIG_SSL: ssl,
      JWT_SECRET: 'test-only-jwt-secret-with-at-least-32-characters',
    }),
  );
}

describe('PostgreSQL configuration', () => {
  it('does not enable TLS for an explicitly non-TLS connection', () => {
    expect(
      getSequelizeConfig(config('false')).dialectOptions,
    ).not.toHaveProperty('ssl');
  });

  it('verifies the server certificate when TLS is enabled', () => {
    expect(getSequelizeConfig(config('true')).dialectOptions).toMatchObject({
      ssl: { rejectUnauthorized: true },
    });
  });
});
