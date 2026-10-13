import { Injectable } from '@nestjs/common';
import type { ApiResult, EventDto, PageQueryDto } from '@dtos';
import { EventModel, UserFavouriteCategoryModel } from '@models';
import {
  EVENT_INCLUDE,
  UPCOMING_ORDER,
  pageMeta,
  toEventDto,
  upcomingWhere,
} from '@modules/events/event-query';

@Injectable()
export class FeedService {
  // Same "active and upcoming" rules as the public list, limited to the
  // user's favourite categories.
  async feed(
    userId: string,
    { page, limit }: PageQueryDto,
  ): Promise<ApiResult<EventDto[]>> {
    const favourites = await UserFavouriteCategoryModel.findAll({
      where: { userId },
      attributes: ['categoryCode'],
    });
    const categories = favourites.map((row) => row.categoryCode);
    if (categories.length === 0) {
      return {
        message: 'No favourite categories yet',
        data: [],
        metaData: pageMeta(page, limit, 0),
      };
    }
    const { rows, count } = await EventModel.findAndCountAll({
      where: upcomingWhere({ categories }, new Date()),
      include: EVENT_INCLUDE,
      order: UPCOMING_ORDER,
      limit,
      offset: (page - 1) * limit,
    });
    return {
      message: 'My feed',
      data: rows.map(toEventDto),
      metaData: pageMeta(page, limit, count),
    };
  }
}
