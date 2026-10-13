export type Role = "user" | "admin";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
}

export interface Category {
  code: string;
  name: string;
}

export interface EventItem {
  id: string;
  title: string;
  category: Category;
  city: string;
  startsAt: string;
  pricePaise: number;
  description: string;
  imageUrl: string;
  isActive: boolean;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const CARD_THEMES = ["sunset", "ocean", "forest"] as const;
export type CardTheme = (typeof CARD_THEMES)[number];

export const STICKERS = {
  star: "⭐",
  heart: "❤️",
  "music-note": "🎵",
  sparkles: "✨",
  party: "🎉",
} as const;
export type StickerId = keyof typeof STICKERS;
export const MAX_STICKERS = 3;

export interface CardDesign {
  theme: CardTheme;
  stickers: StickerId[];
}
