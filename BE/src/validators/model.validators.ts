import { STICKER_IDS } from '@constants';

export function nonblank(value: string): void {
  if (typeof value !== 'string' || !value.trim())
    throw new Error('Value must not be blank');
}

export function httpImageUrl(value: string): void {
  nonblank(value);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Image URL must be a valid HTTP(S) URL');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !url.hostname ||
    /\s/.test(value) ||
    value !== value.trim()
  ) {
    throw new Error('Image URL must be a valid HTTP(S) URL');
  }
}

export function finiteDate(value: Date): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime()))
    throw new Error('Start time must be a finite date');
}

export function stickerArray(value: unknown): void {
  if (
    !Array.isArray(value) ||
    value.length > 3 ||
    !Array.from(value).every(
      (item: unknown) =>
        typeof item === 'string' &&
        (STICKER_IDS as readonly string[]).includes(item),
    )
  )
    throw new Error('Stickers must contain zero to three allowed sticker IDs');
}
