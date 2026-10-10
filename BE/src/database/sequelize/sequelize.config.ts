import { ConfigService } from '@nestjs/config';
import { SequelizeOptions } from 'sequelize-typescript';
import { APPLICATION_MODELS } from '@models';
import { createAuditHooks } from './audit.hooks';

export function getSequelizeConfig(config: ConfigService): SequelizeOptions {
  const ssl = config.getOrThrow<boolean>('DB_CONFIG_SSL');
  return {
    dialect: 'postgres',
    host: config.getOrThrow<string>('DB_CONFIG_HOST'),
    port: config.getOrThrow<number>('DB_CONFIG_PORT'),
    username: config.getOrThrow<string>('DB_CONFIG_USERNAME'),
    password: config.getOrThrow<string>('DB_CONFIG_PASSWORD'),
    database: config.getOrThrow<string>('DB_CONFIG_DATABASE'),
    models: APPLICATION_MODELS,
    logging: false,
    hooks: createAuditHooks(),
    pool: { max: 5, min: 0, acquire: 5000, idle: 10000 },
    dialectOptions: {
      connectionTimeoutMillis: 5000,
      ...(ssl ? { ssl: { rejectUnauthorized: true } } : {}),
    },
  };
}
