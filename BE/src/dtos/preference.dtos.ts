import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  Matches,
} from 'class-validator';
import {
  CARD_THEMES,
  STICKER_IDS,
  type CardTheme,
  type StickerId,
} from '@constants';

export class FavouritesDto {
  @ApiProperty({ type: [String], example: ['music', 'food'] })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @Matches(/^[a-z][a-z0-9-]*$/, { each: true })
  declare categories: string[];
}

export class ReminderDto {
  @ApiProperty()
  @IsBoolean()
  declare enabled: boolean;
}

export class ReminderListDto {
  @ApiProperty({ type: [String], description: 'Event ids with reminders on' })
  declare eventIds: string[];
}

export class CardDesignDto {
  @ApiProperty({ enum: CARD_THEMES })
  @IsIn(CARD_THEMES)
  declare theme: CardTheme;

  @ApiProperty({
    enum: STICKER_IDS,
    isArray: true,
    maxItems: 3,
    description: 'Ordered; the same sticker may appear more than once',
  })
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(STICKER_IDS, { each: true })
  declare stickers: StickerId[];
}
