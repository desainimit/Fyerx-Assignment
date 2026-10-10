import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { configureApplication } from '@config';
import { AppModule } from './app.module';

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  configureApplication(app);
  const port = app.get(ConfigService).getOrThrow<number>('PORT');
  await app.listen(port);
  Logger.log(`API listening at http://localhost:${port}/api/v1`, 'Bootstrap');
}

if (require.main === module) {
  void bootstrap().catch((error: unknown) => {
    Logger.error(
      error instanceof Error ? error.message : 'Application startup failed',
      undefined,
      'Bootstrap',
    );
    process.exitCode = 1;
  });
}
