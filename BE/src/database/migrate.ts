import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MigrationService } from '@lib';
import { MigrationsModule } from './migrations.module';

async function migrate(): Promise<void> {
  const command = process.argv[2];
  if (command !== 'up' && command !== 'status') {
    throw new Error('Migration command must be up or status');
  }
  const app = await NestFactory.createApplicationContext(MigrationsModule, {
    abortOnError: false,
  });
  try {
    app.enableShutdownHooks();
    const { runner } = app.get(MigrationService);
    if (command === 'up') {
      const migrations = await runner.up();
      Logger.log(`Applied ${migrations.length} migration(s)`, 'Migrations');
    } else {
      const [executed, pending] = await Promise.all([
        runner.executed(),
        runner.pending(),
      ]);
      Logger.log(
        {
          executed: executed.map(({ name }) => name),
          pending: pending.map(({ name }) => name),
        },
        'Migrations',
      );
    }
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  void migrate().catch((error: unknown) => {
    Logger.error(
      error instanceof Error ? error.message : 'Migration failed',
      undefined,
      'Migrations',
    );
    process.exitCode = 1;
  });
}
