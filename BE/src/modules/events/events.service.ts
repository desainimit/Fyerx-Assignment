import { Injectable, NotFoundException } from '@nestjs/common';
import { Op, col, fn } from 'sequelize';
import type {
  ApiResult,
  EventDto,
  EventFiltersDto,
  EventQueryDto,
} from '@dtos';
import { CategoryModel, EventModel } from '@models';
import {
  EVENT_INCLUDE,
  UPCOMING_ORDER,
  pageMeta,
  toEventDto,
  upcomingWhere,
} from './event-query';

@Injectable()
export class EventsService {
  async browse({
    page,
    limit,
    category,
    city,
    q,
  }: EventQueryDto): Promise<ApiResult<EventDto[]>> {
    const { rows, count } = await EventModel.findAndCountAll({
      where: upcomingWhere({ category, city, q }, new Date()),
      include: EVENT_INCLUDE,
      order: UPCOMING_ORDER,
      limit,
      offset: (page - 1) * limit,
    });
    return {
      message: 'Events',
      data: rows.map(toEventDto),
      metaData: pageMeta(page, limit, count),
    };
  }

  async findActive(id: string): Promise<ApiResult<EventDto>> {
    const event = await EventModel.findOne({
      where: { id, isActive: true },
      include: EVENT_INCLUDE,
    });
    if (!event) throw new NotFoundException('Event not found');
    return { message: 'Event', data: toEventDto(event) };
  }

  async filters(): Promise<ApiResult<EventFiltersDto>> {
    const [categories, cities] = await Promise.all([
      CategoryModel.findAll({
        attributes: ['code', 'name'],
        order: [['name', 'ASC']],
      }),
      EventModel.findAll({
        attributes: [[fn('DISTINCT', col('city')), 'city']],
        where: { isActive: true, startsAt: { [Op.gt]: new Date() } },
        order: [['city', 'ASC']],
        raw: true,
      }),
    ]);
    return {
      message: 'Filter options',
      data: {
        categories: categories.map(({ code, name }) => ({ code, name })),
        cities: cities.map(({ city }) => city),
      },
    };
  }
}
