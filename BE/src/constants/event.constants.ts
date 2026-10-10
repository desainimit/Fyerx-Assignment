export const CARD_THEMES = ['sunset', 'ocean', 'forest'] as const;
export type CardTheme = (typeof CARD_THEMES)[number];
export const STICKER_IDS = [
  'star',
  'heart',
  'music-note',
  'sparkles',
  'party',
] as const;
export type StickerId = (typeof STICKER_IDS)[number];
