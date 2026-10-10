import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { getConfigModuleOptions } from '@config';
import { HttpExceptionFilter } from '@filters';
import { HttpHandlerInterceptor } from '@interceptors';
import { ModulesModule } from '@modules/modules.module';
import { DatabaseModule } from '@database';

@Module({
  imports: [
    ConfigModule.forRoot(getConfigModuleOptions()),
    DatabaseModule,
    ModulesModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: HttpHandlerInterceptor },
  ],
})
export class AppModule {}
