import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Blank query values ("?city=") mean "no filter", not "match empty string".
const trimToUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class PageQueryDto {
  @ApiPropertyOptional({ type: 'integer', default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    type: 'integer',
    default: 9,
    minimum: 1,
    maximum: 50,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 9;
}

export class EventQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ example: 'music' })
  @Transform(trimToUndefined)
  @IsOptional()
  @Matches(/^[a-z][a-z0-9-]*$/, { message: 'category must be a category code' })
  @MaxLength(32)
  category?: string;

  @ApiPropertyOptional({ example: 'Coimbatore' })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Searches title and description' })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class CreateEventDto {
  @ApiProperty({ example: 'Jazz Night by the Lake' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  declare title: string;

  @ApiProperty({ example: 'music' })
  @IsString()
  @Matches(/^[a-z][a-z0-9-]*$/, { message: 'categoryCode is invalid' })
  declare categoryCode: string;

  @ApiProperty({ example: 'Coimbatore' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare city: string;

  @ApiProperty({
    example: '2026-10-18T18:30:00+05:30',
    description: 'ISO 8601 with an explicit timezone offset or Z',
  })
  // An explicit offset avoids guessing which timezone the admin meant.
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/,
    {
      message:
        'startsAt must be ISO 8601 with a timezone, e.g. 2026-10-18T18:30:00+05:30',
    },
  )
  declare startsAt: string;

  @ApiProperty({ example: 499, description: 'Price in rupees; 0 means free' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000)
  declare priceRupees: number;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  declare description: string;

  @ApiProperty({
    example: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
  })
  @Transform(trim)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  declare imageUrl: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class EventStatusDto {
  @ApiProperty()
  @IsBoolean()
  declare isActive: boolean;
}

export class CategoryDto {
  @ApiProperty({ example: 'music' })
  declare code: string;

  @ApiProperty({ example: 'Music' })
  declare name: string;
}

export class EventDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;

  @ApiProperty()
  declare title: string;

  @ApiProperty({ type: CategoryDto })
  declare category: CategoryDto;

  @ApiProperty()
  declare city: string;

  @ApiProperty({ format: 'date-time' })
  declare startsAt: string;

  @ApiProperty({ description: 'Integer paise; divide by 100 for rupees' })
  declare pricePaise: number;

  @ApiProperty()
  declare description: string;

  @ApiProperty()
  declare imageUrl: string;

  @ApiProperty()
  declare isActive: boolean;
}

export class EventFiltersDto {
  @ApiProperty({ type: [CategoryDto] })
  declare categories: CategoryDto[];

  @ApiProperty({ type: [String], description: 'Cities with upcoming events' })
  declare cities: string[];
}
