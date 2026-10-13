import { Injectable } from '@nestjs/common';
import type { ApiResult, CardDesignDto } from '@dtos';
import { EventCardDesignModel } from '@models';
import { assertActiveEvent } from '@modules/events/event-query';

const DEFAULT_DESIGN: CardDesignDto = { theme: 'sunset', stickers: [] };

@Injectable()
export class CardDesignService {
  async get(
    userId: string,
    eventId: string,
  ): Promise<ApiResult<CardDesignDto>> {
    await assertActiveEvent(eventId);
    const design = await EventCardDesignModel.findOne({
      where: { userId, eventId },
    });
    return {
      message: 'Card design',
      data: design
        ? { theme: design.theme, stickers: design.stickers }
        : DEFAULT_DESIGN,
    };
  }

  async save(
    userId: string,
    eventId: string,
    { theme, stickers }: CardDesignDto,
  ): Promise<ApiResult<CardDesignDto>> {
    await assertActiveEvent(eventId);
    await EventCardDesignModel.bulkCreate(
      [{ userId, eventId, theme, stickers }],
      { updateOnDuplicate: ['theme', 'stickers'] },
    );
    return { message: 'Card design saved', data: { theme, stickers } };
  }
}
