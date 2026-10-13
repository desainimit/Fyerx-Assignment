import { Injectable } from '@nestjs/common';
import type { ApiResult, ReminderDto, ReminderListDto } from '@dtos';
import { EventReminderModel } from '@models';
import { assertActiveEvent } from '@modules/events/event-query';

@Injectable()
export class RemindersService {
  async list(userId: string): Promise<ApiResult<ReminderListDto>> {
    const rows = await EventReminderModel.findAll({
      where: { userId, enabled: true },
      attributes: ['eventId'],
    });
    return {
      message: 'Reminders',
      data: { eventIds: rows.map((row) => row.eventId) },
    };
  }

  // The owner always comes from the verified token, never from the request.
  async set(
    userId: string,
    eventId: string,
    { enabled }: ReminderDto,
  ): Promise<ApiResult<ReminderDto>> {
    await assertActiveEvent(eventId);
    // One INSERT ... ON CONFLICT statement: no race between two quick taps.
    await EventReminderModel.bulkCreate([{ userId, eventId, enabled }], {
      updateOnDuplicate: ['enabled'],
    });
    return {
      message: enabled ? 'Reminder set' : 'Reminder removed',
      data: { enabled },
    };
  }
}
