import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isEmail, isUUID } from 'class-validator';
import { UniqueConstraintError } from 'sequelize';
import { UserRole, type AuthUser } from '@app-types/auth.types';
import {
  type ApiResult,
  type AuthResultDto,
  type LoginDto,
  type MeDto,
  type SignupDto,
  type UserDto,
} from '@dtos';
import { UserFavouriteCategoryModel, UserModel } from '@models';
import { hashPassword, verifyPassword } from '@utils/password';

@Injectable()
export class AuthService {
  // Compared against when the email is unknown, so a missing account takes
  // about as long as a wrong password and does not reveal which emails exist.
  private dummyHash?: Promise<string>;

  constructor(private readonly jwt: JwtService) {}

  async signup({
    email,
    password,
  }: SignupDto): Promise<ApiResult<AuthResultDto>> {
    if (await UserModel.count({ where: { email } })) {
      throw new ConflictException('An account with this email already exists');
    }
    let user: UserModel;
    try {
      user = await UserModel.create({
        email,
        passwordHash: await hashPassword(password),
        role: UserRole.User,
      });
    } catch (error) {
      // Two signups with the same email can race past the count check.
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }
    return { message: 'Account created', data: await this.issueToken(user) };
  }

  async login({
    email,
    password,
  }: LoginDto): Promise<ApiResult<AuthResultDto>> {
    const user = await UserModel.scope('authentication').findOne({
      where: { email },
    });
    this.dummyHash ??= hashPassword('dummy-password-for-timing');
    const valid = await verifyPassword(
      password,
      user?.passwordHash ?? (await this.dummyHash),
    );
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return { message: 'Logged in', data: await this.issueToken(user) };
  }

  async me(userId: string): Promise<ApiResult<MeDto>> {
    const user = await UserModel.findByPk(userId);
    if (!user) throw new NotFoundException('User not found');
    const favourites = await UserFavouriteCategoryModel.count({
      where: { userId },
    });
    return {
      message: 'Current user',
      data: { ...toUserDto(user), hasFavourites: favourites > 0 },
    };
  }

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

  private async issueToken(user: UserModel): Promise<AuthResultDto> {
    const dto = toUserDto(user);
    return { token: await this.signAccessToken(dto), user: dto };
  }
}

// Builds the response explicitly so the password hash can never leak.
function toUserDto(user: UserModel): UserDto {
  return { id: user.id, email: user.email, role: user.role };
}
