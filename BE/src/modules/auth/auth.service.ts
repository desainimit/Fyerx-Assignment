import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isEmail, isUUID } from 'class-validator';
import { UserRole, type AuthUser } from '@app-types/auth.types';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  // Called only after a future login service verifies credentials.
  signAccessToken(user: AuthUser): Promise<string> {
    return this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      ...(user.email ? { email: user.email } : {}),
    });
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    try {
      const payload =
        await this.jwt.verifyAsync<Record<string, unknown>>(token);
      if (
        typeof payload.sub !== 'string' ||
        !isUUID(payload.sub) ||
        !Object.values(UserRole).includes(payload.role as UserRole) ||
        typeof payload.exp !== 'number' ||
        !Number.isFinite(payload.exp) ||
        (payload.email !== undefined &&
          (typeof payload.email !== 'string' || !isEmail(payload.email)))
      ) {
        throw new Error('Invalid token claims');
      }
      return Object.freeze({
        id: payload.sub,
        role: payload.role as UserRole,
        ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
