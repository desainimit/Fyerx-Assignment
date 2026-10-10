import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import path from 'node:path';
import { QueryInterface } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { SequelizeStorage, Umzug } from 'umzug';

export function createMigrationRunner(
  sequelize: Sequelize,
  migrationsDirectory = path.resolve(__dirname, '../migrations'),
): Umzug<QueryInterface> {
  const extension = path.extname(__filename) === '.ts' ? 'ts' : 'js';
  const logger = new Logger('Migrations');
  return new Umzug<QueryInterface>({
    migrations: {
      glob: [`[0-9]*-*.${extension}`, { cwd: migrationsDirectory }],
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: {
      info: (event: unknown) => logger.log(event),
      warn: (event: unknown) => logger.warn(event),
      error: (event: unknown) => logger.error(event),
      debug: (event: unknown) => logger.debug(event),
    },
  });
}

@Injectable()
export class MigrationService {
  readonly runner: Umzug<QueryInterface>;

  constructor(@InjectConnection() sequelize: Sequelize) {
    this.runner = createMigrationRunner(sequelize);
  }
}
