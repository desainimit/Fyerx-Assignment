import { BadRequestException } from '@nestjs/common';
import { parseStartsAt } from '@modules/admin/admin.service';
import { likePattern, pageMeta } from './event-query';

describe('likePattern', () => {
  it('wraps text for a substring match', () => {
    expect(likePattern('night')).toBe('%night%');
  });

  it('escapes LIKE wildcards and backslashes so they match literally', () => {
    expect(likePattern('50%_off\\')).toBe('%50\\%\\_off\\\\%');
  });
});

describe('pageMeta', () => {
  it('rounds total pages up and reports zero pages for no rows', () => {
    expect(pageMeta(2, 9, 10)).toEqual({
      total: 10,
      page: 2,
      limit: 9,
      totalPages: 2,
    });
    expect(pageMeta(1, 9, 0).totalPages).toBe(0);
  });
});

describe('parseStartsAt', () => {
  it('keeps the instant given with an offset', () => {
    expect(parseStartsAt('2026-10-18T18:30:00+05:30').toISOString()).toBe(
      '2026-10-18T13:00:00.000Z',
    );
  });

  it.each(['2026-02-30T10:00+05:30', '2026-13-01T10:00Z', '2026-10-18T25:00Z'])(
    'rejects impossible date %s',
    (value) => {
      expect(() => parseStartsAt(value)).toThrow(BadRequestException);
    },
  );
});
