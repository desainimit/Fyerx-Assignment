const assert = require('node:assert/strict');
const path = require('node:path');
const { readdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');

Object.assign(process.env, {
  NODE_ENV: 'production',
  DB_CONFIG_HOST: 'localhost',
  DB_CONFIG_PORT: '5432',
  DB_CONFIG_USERNAME: 'test',
  DB_CONFIG_PASSWORD: 'compiled-test-placeholder',
  DB_CONFIG_DATABASE: 'community_events_board_test',
  DB_CONFIG_SSL: 'false',
  CORS_ORIGINS: 'http://localhost:3000',
  SWAGGER: 'false',
  JWT_SECRET: 'compiled-test-jwt-secret-at-least-32-characters',
});

require('reflect-metadata');
const { Controller, Get, Global, Logger, Module } = require('@nestjs/common');
const { Test } = require('@nestjs/testing');
const { Sequelize } = require('sequelize-typescript');
const { AppModule } = require('../dist/app.module');
const { DatabaseModule } = require('../dist/database/database.module');
const { configureApplication } = require('../dist/config/app.setup');
const { bootstrap } = require('../dist/main');
const { AuthService } = require('../dist/modules/auth/auth.service');
const { APPLICATION_MODELS } = require('../dist/models');

Logger.overrideLogger([]);
assert.equal(typeof bootstrap, 'function');
assert.ok(
  !Object.keys(require.cache).some((file) =>
    /(?:ts-node|tsconfig-paths)[\\/]/.test(file),
  ),
  'Compiled imports should not require TypeScript runtime loaders',
);

class FakeDatabaseModule {}
Global()(FakeDatabaseModule);
Module({
  providers: [
    { provide: Sequelize, useValue: { authenticate: async () => undefined } },
  ],
  exports: [Sequelize],
})(FakeDatabaseModule);

class ProtectedFixtureController {
  check() {
    return { message: 'Protected compiled route', data: null };
  }
}
Controller({ path: 'compiled-fixture', version: '1' })(
  ProtectedFixtureController,
);
Get()(
  ProtectedFixtureController.prototype,
  'check',
  Object.getOwnPropertyDescriptor(
    ProtectedFixtureController.prototype,
    'check',
  ),
);

async function verify() {
  const registry = new Sequelize({
    dialect: 'postgres',
    models: APPLICATION_MODELS,
    logging: false,
  });
  assert.equal(Object.keys(registry.models).length, 6);
  assert.equal(
    registry.models.EventModel.associations.category.target,
    registry.models.CategoryModel,
  );
  await registry.close();
  const migrationsDirectory = path.resolve(__dirname, '../dist/migrations');
  const migrations = readdirSync(migrationsDirectory).filter((name) =>
    /^[0-9].*\.js$/.test(name),
  );
  assert.equal(migrations.length, 6);
  for (const name of migrations) {
    const migration = require(path.join(migrationsDirectory, name));
    assert.equal(typeof migration.up, 'function');
    assert.equal(typeof migration.down, 'function');
  }
  const module = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [ProtectedFixtureController],
  })
    .overrideModule(DatabaseModule)
    .useModule(FakeDatabaseModule)
    .compile();
  const app = module.createNestApplication();
  app.useLogger(false);
  configureApplication(app);
  try {
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl();
    const health = await fetch(`${url}/api/v1/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), {
      status: true,
      message: 'Service is healthy',
      data: { service: 'community-events-board', database: 'up' },
    });
    assert.equal((await fetch(`${url}/api/v2/health`)).status, 404);
    assert.equal((await fetch(`${url}/api/docs`)).status, 404);
    assert.equal((await fetch(`${url}/api/v1/compiled-fixture`)).status, 401);
    const token = await app.get(AuthService).signAccessToken({
      id: 'a5ea1813-7eef-4a2c-a7a8-c96099ce2382',
      role: 'user',
    });
    assert.equal(
      (
        await fetch(`${url}/api/v1/compiled-fixture`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).status,
      200,
    );
  } finally {
    await app.close();
  }

  const failedStartup = spawnSync(process.execPath, ['dist/main.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DB_CONFIG_HOST: '' },
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.ifError(failedStartup.error);
  assert.equal(failedStartup.status, 1);
  const output = failedStartup.stdout + failedStartup.stderr;
  assert.match(output, /Invalid environment configuration/);
  assert.ok(!output.includes('compiled-test-placeholder'));
  console.log(
    'Compiled HTTP startup and invalid-config exit passed (database stubbed).',
  );
}

void verify().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
