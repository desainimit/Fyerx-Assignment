import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_PREFIX, API_VERSION } from '@constants';
import { LogMiddleware } from '@middlewares/log.middleware';

export function configureApplication(app: INestApplication): void {
  const config = app.get(ConfigService);
  // Register before Nest's body parser to log malformed requests as well.
  const logMiddleware = app.get(LogMiddleware);
  app.use(logMiddleware.use.bind(logMiddleware));
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
        'JSON API for the Community Events Board. Protected routes need the token from /auth/login as `Authorization: Bearer <token>`.',
      )
      .setVersion('1')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, documentOptions);
    SwaggerModule.setup(`${API_PREFIX}/docs`, app, document);
  }
}
