import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_PREFIX, API_VERSION } from '@constants';

export function configureApplication(app: INestApplication): void {
  const config = app.get(ConfigService);
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_VERSION,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: config.getOrThrow<string[]>('CORS_ORIGINS'),
    credentials: true,
  });
  app.enableShutdownHooks();

  if (config.getOrThrow<boolean>('SWAGGER')) {
    const documentOptions = new DocumentBuilder()
      .setTitle('Community Events Board API')
      .setDescription(
        'Backend foundation. Feature APIs are not implemented yet.',
      )
      .setVersion('1')
      .build();
    const document = SwaggerModule.createDocument(app, documentOptions);
    SwaggerModule.setup(`${API_PREFIX}/docs`, app, document);
  }
}
