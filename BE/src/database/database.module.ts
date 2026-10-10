import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { getSequelizeConfig } from './sequelize/sequelize.config';

@Global()
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...getSequelizeConfig(config),
        autoLoadModels: true,
        synchronize: false,
        retryAttempts: 3,
        retryDelay: 1000,
      }),
    }),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule {}
