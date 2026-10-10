import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getConfigModuleOptions } from '@config';
import { MigrationService } from '@lib';
import { DatabaseModule } from './database.module';

@Module({
  imports: [ConfigModule.forRoot(getConfigModuleOptions()), DatabaseModule],
  providers: [MigrationService],
})
export class MigrationsModule {}
