import {
  Controller,
  Get,
  Global,
  INestApplication,
  Logger,
  Module,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import type { Server } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { Sequelize } from 'sequelize-typescript';
import request from 'supertest';
import { AppModule } from '@app';
import { DatabaseModule } from '@database';
import { configureApplication } from '@config';
import { CurrentUser, Public, Roles } from '@decorators';
import {
  RequestContextService,
  getAuditActorId,
} from '@context/request-context';
import { AuthService } from '@modules/auth/auth.service';
import { AuthModule } from '@modules/auth/auth.module';
import { JWT_AUDIENCE, JWT_ISSUER } from '@constants';
import { UserRole, type AuthUser } from '@app-types/auth.types';

const visitor: AuthUser = {
  id: 'a5ea1813-7eef-4a2c-a7a8-c96099ce2382',
  role: UserRole.User,
  email: 'visitor@example.com',
};
const admin: AuthUser = {
  id: 'a8494e0d-32e4-4ad0-9e8e-b576e324d886',
  role: UserRole.Admin,
};

@Global()
@Module({
  providers: [
    { provide: Sequelize, useValue: { authenticate: async () => undefined } },
  ],
  exports: [Sequelize],
})
class FakeDatabaseModule {}

// All routes below are test fixtures, absent from the production application.
@Controller({ path: 'auth-fixture', version: '1' })
class AuthFixtureController {
  constructor(private readonly context: RequestContextService) {}

  @Get('identity')
  async identity(@CurrentUser() user: AuthUser, @CurrentUser('id') id: string) {
    const before = getAuditActorId();
    await delay(10);
    return {
      message: 'Authenticated',
      data: {
        user,
        id,
        before,
        after: getAuditActorId(),
        requestId: this.context.get()?.requestId,
      },
    };
  }

  @Get('admin')
  @Roles(UserRole.Admin)
  admin() {
    return { message: 'Authorized', data: null };
  }

  @Get('public')
  @Public()
  public(@CurrentUser() user?: AuthUser) {
    return {
      message: 'Public',
      data: { user: user ?? null, actor: getAuditActorId() },
    };
  }
}

@Public()
@Roles(UserRole.Admin)
@Controller({ path: 'public-fixture', version: '1' })
class PublicFixtureController {
  @Get()
  public() {
    return { message: 'Public controller', data: null };
  }

  @Get('protected')
  @Public(false)
  protected() {
    return { message: 'Protected override', data: null };
  }

  @Get('user')
  @Public(false)
  @Roles(UserRole.User)
  user() {
    return { message: 'Role override', data: null };
  }
}

describe('shared authentication and request context', () => {
  let app: INestApplication<Server>;
  let visitorToken: string;
  let adminToken: string;
  const rawJwt = new JwtService({ secret: process.env.JWT_SECRET });
  const claims = {
    sub: visitor.id,
    role: visitor.role,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
    exp: Math.floor(Date.now() / 1000) + 300,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule, AuthModule],
      controllers: [AuthFixtureController, PublicFixtureController],
    })
      .overrideModule(DatabaseModule)
      .useModule(FakeDatabaseModule)
      .compile();
    app = module.createNestApplication<INestApplication<Server>>();
    app.useLogger(false);
    configureApplication(app);
    await app.init();
    visitorToken = await app.get(AuthService).signAccessToken(visitor);
    adminToken = await app.get(AuthService).signAccessToken(admin);
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication by default with a native 401 JSON response', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth-fixture/identity')
      .expect(401);
    expect(response.body).toEqual({
      status: false,
      message: 'Bearer token required',
      error: 'Unauthorized',
    });
  });

  it.each(['Basic abc', 'Bearer', 'Bearer abc def', 'Bearer invalid'])(
    'rejects malformed authorization: %s',
    async (header) => {
      await request(app.getHttpServer())
        .get('/api/v1/auth-fixture/identity')
        .set('Authorization', header)
        .expect(401);
    },
  );

  it('does not accept tokens in a query, cookie or identity header', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/auth-fixture/identity?token=${visitorToken}`)
      .set('Cookie', `token=${visitorToken}`)
      .set('X-User-Id', visitor.id)
      .expect(401);
  });

  it.each([
    ['expired', { ...claims, exp: 1 }],
    ['wrong issuer', { ...claims, iss: 'other-service' }],
    ['wrong audience', { ...claims, aud: 'other-api' }],
    ['missing expiration', { ...claims, exp: undefined }],
    ['invalid identity', { ...claims, sub: 'not-a-uuid' }],
    ['invalid role', { ...claims, role: 'superadmin' }],
    ['invalid email', { ...claims, email: 'invalid' }],
  ])('rejects a signed token with %s', async (_label, payload) => {
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    );
    const token = rawJwt.sign(cleanPayload);
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth-fixture/identity')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(response.body.message).toBe('Invalid or expired access token');
    expect(JSON.stringify(response.body)).not.toContain(token);
  });

  it('rejects a wrong signature and a non-allowed signing algorithm', async () => {
    for (const token of [
      rawJwt.sign(claims, {
        secret: 'a-different-signing-secret-with-32-characters',
      }),
      rawJwt.sign(claims, { algorithm: 'HS384' }),
    ]) {
      await request(app.getHttpServer())
        .get('/api/v1/auth-fixture/identity')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    }
  });

  it('provides the verified user through both decorator forms and request context', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth-fixture/identity')
      .set('Authorization', `bEaReR ${visitorToken}`)
      .expect(200);
    expect(response.body.data).toMatchObject({
      user: visitor,
      id: visitor.id,
      before: visitor.id,
      after: visitor.id,
    });
    expect(response.body.data.requestId).toBe(response.headers['x-request-id']);
    expect(response.body.data.user).not.toHaveProperty('exp');
    expect(getAuditActorId()).toBeNull();
  });

  it('isolates concurrent visitors and admins across async continuations', async () => {
    const identities = [visitor, admin, visitor, admin];
    const responses = await Promise.all(
      identities.map((user) =>
        request(app.getHttpServer())
          .get('/api/v1/auth-fixture/identity')
          .set(
            'Authorization',
            `Bearer ${user === visitor ? visitorToken : adminToken}`,
          ),
      ),
    );
    responses.forEach((response, i) => {
      expect(response.status).toBe(200);
      expect(response.body.data.before).toBe(identities[i].id);
      expect(response.body.data.after).toBe(identities[i].id);
    });
    expect(
      new Set(responses.map((response) => response.headers['x-request-id']))
        .size,
    ).toBe(4);
  });

  it('enforces admin roles and handler overrides', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth-fixture/admin')
      .set('Authorization', `Bearer ${visitorToken}`)
      .expect(403)
      .expect({
        status: false,
        message: 'Access restricted to admin accounts',
        error: 'Forbidden',
      });
    await request(app.getHttpServer())
      .get('/api/v1/auth-fixture/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/public-fixture/protected')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/public-fixture/protected')
      .set('Authorization', `Bearer ${visitorToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/public-fixture/protected')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/public-fixture/user')
      .set('Authorization', `Bearer ${visitorToken}`)
      .expect(200);
  });

  it('supports public controllers and public handlers without inferring identity', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/public-fixture')
      .expect(200);
    for (const token of [undefined, 'invalid', visitorToken]) {
      const req = request(app.getHttpServer()).get(
        '/api/v1/auth-fixture/public',
      );
      if (token) req.set('Authorization', `Bearer ${token}`);
      const response = await req.expect(200);
      expect(response.body.data).toEqual({ user: null, actor: null });
    }
  });

  it('logs failed authentication once without tokens, query values or body contents', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    try {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth-fixture/identity?password=private-query-value')
        .set('Authorization', 'Bearer private-token-value')
        .set('X-Request-Id', 'client-forged-id')
        .expect(401);
      expect(log).toHaveBeenCalledTimes(1);
      expect(log.mock.calls[0][0]).toMatchObject({
        method: 'GET',
        path: '/api/v1/auth-fixture/identity',
        statusCode: 401,
        userId: null,
        requestId: response.headers['x-request-id'],
      });
      expect(response.headers['x-request-id']).not.toBe('client-forged-id');
      expect(JSON.stringify(log.mock.calls)).not.toMatch(
        /private-query-value|private-token-value/,
      );
    } finally {
      log.mockRestore();
    }
  });

  it('logs malformed JSON and unknown routes before controllers run', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    try {
      await request(app.getHttpServer())
        .post('/api/v1/auth-fixture/identity')
        .set('Content-Type', 'application/json')
        .send('{')
        .expect(400);
      await request(app.getHttpServer()).get('/api/v1/unknown').expect(404);
      expect(
        log.mock.calls.map(
          ([entry]) => (entry as { statusCode: number }).statusCode,
        ),
      ).toEqual([400, 404]);
    } finally {
      log.mockRestore();
    }
  });
});
