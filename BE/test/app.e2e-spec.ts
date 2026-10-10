import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Global,
  HttpCode,
  INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Type } from 'class-transformer';
import { IsInt, IsString, Max, Min } from 'class-validator';
import { Server } from 'node:http';
import { Sequelize } from 'sequelize-typescript';
import request from 'supertest';
import { configureApplication } from '@config';
import { AppModule } from '@app';
import { DatabaseModule } from '@database';
import { Public } from '@decorators';

const connection = { authenticate: jest.fn().mockResolvedValue(undefined) };

@Global()
@Module({
  providers: [{ provide: Sequelize, useValue: connection }],
  exports: [Sequelize],
})
class FakeDatabaseModule {}

class ValidationFixture {
  @IsString()
  declare title: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  declare page: number;
}

// These routes exist only in the test harness, never in the production modules.
@Controller({ path: 'test', version: '1' })
@Public()
class FixtureController {
  @Post('validation')
  @HttpCode(200)
  validate(@Body() data: ValidationFixture) {
    return { message: 'Validated', data };
  }

  @Get('http-error')
  httpError(): never {
    throw new BadRequestException('Expected validation failure');
  }

  @Get('unexpected-error')
  unexpectedError(): never {
    throw new Error('Private database credential details');
  }
}

async function createApp(swagger = false): Promise<INestApplication<Server>> {
  const module = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [FixtureController],
  })
    .overrideModule(DatabaseModule)
    .useModule(FakeDatabaseModule)
    .compile();
  const app = module.createNestApplication<INestApplication<Server>>();
  app.useLogger(false);
  app.get(ConfigService).set('SWAGGER', swagger);
  configureApplication(app);
  await app.init();
  return app;
}

describe('backend HTTP infrastructure', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    connection.authenticate.mockResolvedValue(undefined);
  });

  it('serves the native URI-versioned health route with the success envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    expect(response.body).toEqual({
      status: true,
      message: 'Service is healthy',
      data: { service: 'community-events-board', database: 'up' },
    });
    expect(connection.authenticate).toHaveBeenCalled();
  });

  it.each(['/api/health', '/api/v2/health', '/api/v1/missing'])(
    'returns the JSON error envelope for %s',
    async (url) => {
      const response = await request(app.getHttpServer()).get(url).expect(404);
      expect(response.body).toMatchObject({
        status: false,
        error: 'Not Found',
      });
    },
  );

  it.each([
    'auth',
    'admin',
    'events',
    'favourites',
    'feed',
    'reminders',
    'card-design',
  ])('does not expose unfinished %s endpoints', async (feature) => {
    await request(app.getHttpServer()).get(`/api/v1/${feature}`).expect(404);
  });

  it('returns a safe 503 and recovers on a later successful database check', async () => {
    connection.authenticate.mockRejectedValueOnce(
      new Error('private connection details'),
    );
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(503);
    expect(response.body).toEqual({
      status: false,
      message: 'Database connection unavailable',
      error: 'Service Unavailable',
    });
    expect(JSON.stringify(response.body)).not.toContain(
      'private connection details',
    );
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });

  it('transforms explicitly typed numbers through ValidationPipe', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/test/validation')
      .send({ title: 'Workshop', page: '2' })
      .expect(200);
    expect(response.body.data.page).toBe(2);
  });

  it.each([
    { title: 'Workshop', page: 2, extra: true },
    { title: 'Workshop', page: 0 },
    { title: 'Workshop', page: 101 },
    { title: 5, page: 2 },
    { title: 'Workshop', page: 'invalid' },
  ])('rejects invalid or unknown request fields: %j', async (payload) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/test/validation')
      .send(payload)
      .expect(400);
    expect(response.body).toMatchObject({
      status: false,
      error: 'Bad Request',
    });
  });

  it('preserves a 400 response for malformed JSON', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/test/validation')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);
    expect(response.body.status).toBe(false);
  });

  it('preserves native HTTP exception messages and status codes', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/test/http-error')
      .expect(400);
    expect(response.body.message).toBe('Expected validation failure');
  });

  it('hides unexpected exception details from API responses', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/test/unexpected-error')
      .expect(500);
    expect(response.body).toEqual({
      status: false,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
  });

  it('allows credentialed browser requests from configured origins', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not grant a disallowed origin CORS access', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'https://untrusted.example.com')
      .expect(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('does not expose Swagger when disabled', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(404);
    await request(app.getHttpServer()).get('/api/docs-json').expect(404);
  });
});

describe('Swagger infrastructure', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    app = await createApp(true);
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves Swagger with the native versioned health path', async () => {
    await request(app.getHttpServer()).get('/api/docs/').expect(200);
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    expect(response.body.paths['/api/v1/health']).toBeDefined();
    expect(response.body.paths['/api/v1/v1/health']).toBeUndefined();
  });
});
