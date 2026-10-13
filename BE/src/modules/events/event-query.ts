import {
  Op,
  col,
  fn,
  where,
  type FindOptions,
  type WhereOptions,
} from 'sequelize';
import { CategoryModel, EventModel, type EventAttributes } from '@models';
import type { EventDto, PaginationMetadata } from '@dtos';

export interface EventFilters {
  category?: string;
  categories?: string[];
  city?: string;
  q?: string;
}

/** Escapes LIKE wildcards so user text is matched literally. */
export function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, '\\$&')}%`;
}

// Every filter is ANDed onto "active and upcoming". `now` is captured once by
// the caller so the page query and the count query see the same cut-off.
export function upcomingWhere(
  filters: EventFilters,
  now: Date,
): WhereOptions<EventAttributes> {
  const conditions: WhereOptions<EventAttributes>[] = [
    { isActive: true },
    { startsAt: { [Op.gt]: now } },
  ];
  if (filters.category) conditions.push({ categoryCode: filters.category });
  if (filters.categories) {
    conditions.push({ categoryCode: { [Op.in]: filters.categories } });
  }
  if (filters.city) {
    // lower(city) matches the idx_events_city_active_start expression index.
    conditions.push(
      where(fn('lower', col('EventModel.city')), filters.city.toLowerCase()),
    );
  }
  if (filters.q) {
    const pattern = likePattern(filters.q);
    conditions.push({
      [Op.or]: [
        { title: { [Op.iLike]: pattern } },
        { description: { [Op.iLike]: pattern } },
      ],
    });
  }
  return { [Op.and]: conditions };
}

export const EVENT_INCLUDE: FindOptions<EventAttributes>['include'] = [
  { model: CategoryModel, attributes: ['code', 'name'] },
];

// Nearest first; id breaks ties so pages never overlap or skip rows.
export const UPCOMING_ORDER: FindOptions<EventAttributes>['order'] = [
  ['startsAt', 'ASC'],
  ['id', 'ASC'],
];

export function toEventDto(event: EventModel): EventDto {
  return {
    id: event.id,
    title: event.title,
    category: { code: event.category.code, name: event.category.name },
    city: event.city,
    startsAt: event.startsAt.toISOString(),
    pricePaise: event.pricePaise,
    description: event.description,
    imageUrl: event.imageUrl,
    isActive: event.isActive,
  };
}

export function pageMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMetadata {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}
