import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { JWT_AUDIENCE, JWT_ISSUER } from '@constants';
import { AuthGuard } from '@guards/auth.guard';
import { LogMiddleware } from '@middlewares/log.middleware';
import { RequestContextService } from '@context/request-context';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.getOrThrow<number>('JWT_TTL_SECONDS'),
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        },
        verifyOptions: {
          algorithms: ['HS256'],
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    RequestContextService,
    LogMiddleware,
    { provide: APP_GUARD, useExisting: AuthGuard },
  ],
  exports: [AuthService, RequestContextService, LogMiddleware],
})
export class AuthModule {}
