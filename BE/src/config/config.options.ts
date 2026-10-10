import { ConfigModuleOptions } from '@nestjs/config';
import { Environment, validateEnvironment } from './env.validation';

export function getConfigModuleOptions(): ConfigModuleOptions {
  return {
    isGlobal: true,
    cache: true,
    envFilePath: [
      `.env.${process.env.NODE_ENV ?? Environment.Development}`,
      '.env',
    ],
    validate: validateEnvironment,
  };
}
