const assert = require('node:assert/strict');
const path = require('node:path');
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
});

require('reflect-metadata');
const { Global, Logger, Module } = require('@nestjs/common');
const { Test } = require('@nestjs/testing');
const { Sequelize } = require('sequelize-typescript');
const { AppModule } = require('../dist/modules/app.module');
const { DatabaseModule } = require('../dist/modules/database/database.module');
const { configureApplication } = require('../dist/config/app.setup');
const { bootstrap } = require('../dist/main');

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

async function verify() {
  const module = await Test.createTestingModule({ imports: [AppModule] })
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
