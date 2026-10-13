import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '@app-types/auth.types';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class SignupDto {
  @ApiProperty({ example: 'visitor@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  declare email: string;

  @ApiProperty({ example: 'a-long-password', minLength: 8 })
  @IsString()
  @MinLength(8)
  // Upper bound keeps hashing cost per request predictable.
  @MaxLength(128)
  declare password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  declare email: string;

  @ApiProperty({ example: 'Admin@12345' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  declare password: string;
}

export class UserDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;

  @ApiProperty({ example: 'visitor@example.com' })
  declare email: string;

  @ApiProperty({ enum: UserRole })
  declare role: UserRole;
}

export class AuthResultDto {
  @ApiProperty({
    description: 'JWT to send as `Authorization: Bearer <token>`',
  })
  declare token: string;

  @ApiProperty({ type: UserDto })
  declare user: UserDto;
}

export class MeDto extends UserDto {
  @ApiProperty({
    description: 'False until the user picks favourite categories',
  })
  declare hasFavourites: boolean;
}
