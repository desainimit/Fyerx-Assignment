import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ApiResult, CreateEventDto, EventDto, PageQueryDto } from '@dtos';
import { CategoryModel, EventModel } from '@models';
import {
  EVENT_INCLUDE,
  pageMeta,
  toEventDto,
} from '@modules/events/event-query';

@Injectable()
export class AdminService {
  // Admins see every event, including inactive and past ones, newest first.
  async listEvents({
    page,
    limit,
  }: PageQueryDto): Promise<ApiResult<EventDto[]>> {
    const { rows, count } = await EventModel.findAndCountAll({
      include: EVENT_INCLUDE,
      order: [
        ['startsAt', 'DESC'],
        ['id', 'ASC'],
      ],
      limit,
      offset: (page - 1) * limit,
    });
    return {
      message: 'All events',
      data: rows.map(toEventDto),
      metaData: pageMeta(page, limit, count),
    };
  }

  async createEvent(body: CreateEventDto): Promise<ApiResult<EventDto>> {
    if (!(await CategoryModel.findByPk(body.categoryCode))) {
      throw new BadRequestException('Unknown category');
    }
    const startsAt = parseStartsAt(body.startsAt);
    const created = await EventModel.create({
      title: body.title,
      categoryCode: body.categoryCode,
      city: body.city,
      startsAt,
      // Stored as integer paise so money never goes through float rounding.
      pricePaise: Math.round(body.priceRupees * 100),
      description: body.description,
      imageUrl: body.imageUrl,
      isActive: body.isActive ?? true,
    });
    return { message: 'Event created', data: await this.load(created.id) };
  }

  async setStatus(id: string, isActive: boolean): Promise<ApiResult<EventDto>> {
    const event = await EventModel.findByPk(id);
    if (!event) throw new NotFoundException('Event not found');
    await event.update({ isActive });
    return {
      message: isActive ? 'Event activated' : 'Event deactivated',
      data: await this.load(id),
    };
  }

  private async load(id: string): Promise<EventDto> {
    const event = await EventModel.findByPk(id, { include: EVENT_INCLUDE });
    if (!event) throw new NotFoundException('Event not found');
    return toEventDto(event);
  }
}

// The DTO already checked the format. JavaScript would silently turn
// 30 February into 2 March, so the calendar date is checked separately.
export function parseStartsAt(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  const startsAt = new Date(value);
  if (
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day ||
    Number.isNaN(startsAt.getTime())
  ) {
    throw new BadRequestException('startsAt is not a real date');
  }
  return startsAt;
}
