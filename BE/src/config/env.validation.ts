import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

function toBoolean(value: unknown): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3001;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.split(',').map((origin) => origin.trim())
      : value,
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: false,
    },
    { each: true },
  )
  CORS_ORIGINS: string[] = ['http://localhost:3000'];

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  declare DB_CONFIG_HOST: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  DB_CONFIG_PORT = 5432;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  declare DB_CONFIG_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  declare DB_CONFIG_PASSWORD: string;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  declare DB_CONFIG_DATABASE: string;

  @Transform(({ value }: { value: unknown }) => toBoolean(value))
  @IsBoolean()
  DB_CONFIG_SSL = false;

  @Transform(({ value }: { value: unknown }) => toBoolean(value))
  @IsBoolean()
  SWAGGER = false;

  @IsString()
  @MinLength(32)
  declare JWT_SECRET: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(86400)
  JWT_TTL_SECONDS = 3600;
}

export function validateEnvironment(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const environment = input.NODE_ENV ?? Environment.Development;
  const config = plainToInstance(EnvironmentVariables, {
    ...input,
    NODE_ENV: environment,
    SWAGGER: input.SWAGGER ?? environment === Environment.Development,
  });
  const errors = validateSync(config, {
    validationError: { target: false, value: false },
  });
  if (errors.length > 0) {
    const messages = errors.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    );
    throw new Error(
      `Invalid environment configuration:\n${messages.join('\n')}`,
    );
  }

  if (config.CORS_ORIGINS.some((origin) => new URL(origin).origin !== origin)) {
    throw new Error(
      'Invalid environment configuration: CORS_ORIGINS must contain origins without paths, credentials, or trailing slashes',
    );
  }

  if (config.JWT_SECRET.trim().length < 32) {
    throw new Error(
      'Invalid environment configuration: JWT_SECRET must contain at least 32 non-padding characters',
    );
  }

  return { ...input, ...config };
}
