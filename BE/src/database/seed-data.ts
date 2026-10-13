// Sample events for local runs and reviews. Dates are offsets from the moment
// the seed runs, so "upcoming" and "past" stay true whenever it is executed.
export interface SampleEvent {
  title: string;
  categoryCode: 'music' | 'workshop' | 'food' | 'sports' | 'kids';
  city: string;
  dayOffset: number;
  /** Local time in India, 24-hour "HH:MM". */
  time: string;
  priceRupees: number;
  isActive: boolean;
  description: string;
  imageId: string;
}

const image = (id: string) =>
  `https://images.unsplash.com/${id}?w=1200&q=75&auto=format&fit=crop`;

export const SAMPLE_EVENTS: SampleEvent[] = [
  {
    title: 'Jazz Night by the Lake',
    categoryCode: 'music',
    city: 'Coimbatore',
    dayOffset: 5,
    time: '19:30',
    priceRupees: 499,
    isActive: true,
    description:
      'An open-air evening of live jazz standards by local trios, with food stalls and lakeside seating.',
    imageId: 'photo-1493225457124-a3eb161ffa5f',
  },
  {
    title: 'Indie Unplugged Evening',
    categoryCode: 'music',
    city: 'Bengaluru',
    dayOffset: 12,
    time: '18:30',
    priceRupees: 799,
    isActive: true,
    description:
      'Four independent bands play stripped-back acoustic sets in an intimate rooftop venue.',
    imageId: 'photo-1516450360452-9312f5e86fc7',
  },
  {
    title: 'Carnatic Classics Concert',
    categoryCode: 'music',
    city: 'Chennai',
    dayOffset: -10,
    time: '18:00',
    priceRupees: 300,
    isActive: true,
    description:
      'A vocal and violin recital of well-loved Carnatic compositions.',
    imageId: 'photo-1470229722913-7c0e2dbbafd3',
  },
  {
    title: 'Retro Bollywood Night',
    categoryCode: 'music',
    city: 'Mumbai',
    dayOffset: 20,
    time: '20:00',
    priceRupees: 1500,
    isActive: false,
    description:
      'A live band and DJ play Bollywood hits from the 70s to the 90s. Dress code: retro.',
    imageId: 'photo-1514525253161-7a46d19cd819',
  },
  {
    title: 'Pottery for Beginners',
    categoryCode: 'workshop',
    city: 'Coimbatore',
    dayOffset: 3,
    time: '10:00',
    priceRupees: 1200,
    isActive: true,
    description:
      'Learn hand-building and wheel basics, and take home two pieces after firing. All materials included.',
    imageId: 'photo-1565193566173-7a0ee3dbe261',
  },
  {
    title: 'Intro to Watercolour',
    categoryCode: 'workshop',
    city: 'Chennai',
    dayOffset: 9,
    time: '11:00',
    priceRupees: 850,
    isActive: true,
    description:
      'A relaxed three-hour session on washes, layering and simple landscapes for complete beginners.',
    imageId: 'photo-1513364776144-60967b0f800f',
  },
  {
    title: 'Latte Art Workshop',
    categoryCode: 'workshop',
    city: 'Bengaluru',
    dayOffset: -5,
    time: '16:00',
    priceRupees: 950,
    isActive: true,
    description:
      'A hands-on barista session covering milk texturing and pouring hearts and rosettas.',
    imageId: 'photo-1555396273-367ea4eb4db5',
  },
  {
    title: 'Street Food Festival',
    categoryCode: 'food',
    city: 'Chennai',
    dayOffset: 7,
    time: '17:00',
    priceRupees: 0,
    isActive: true,
    description:
      'Thirty stalls of chaat, kothu parotta, momos and desserts. Entry is free; pay at the stalls.',
    imageId: 'photo-1555939594-58d7cb561ad1',
  },
  {
    title: 'South Indian Breakfast Trail',
    categoryCode: 'food',
    city: 'Coimbatore',
    dayOffset: 14,
    time: '07:30',
    priceRupees: 650,
    isActive: true,
    description:
      'A guided morning walk through five classic tiffin spots: idli, dosa, pongal and filter coffee.',
    imageId: 'photo-1504674900247-0877df9cc836',
  },
  {
    title: 'Mumbai Night Food Market',
    categoryCode: 'food',
    city: 'Mumbai',
    dayOffset: 4,
    time: '19:00',
    priceRupees: 200,
    isActive: true,
    description:
      'A late-evening market of home chefs and food trucks, with live music and seating.',
    imageId: 'photo-1606787366850-de6330128bfc',
  },
  {
    title: 'Sunday 10K Run',
    categoryCode: 'sports',
    city: 'Bengaluru',
    dayOffset: 6,
    time: '05:30',
    priceRupees: 750,
    isActive: true,
    description:
      'A timed 10K city run with a medal, a T-shirt and breakfast at the finish line.',
    imageId: 'photo-1452626038306-9aae5e071dd3',
  },
  {
    title: 'Corporate Cricket League — Team Entry',
    categoryCode: 'sports',
    city: 'Mumbai',
    dayOffset: 25,
    time: '15:00',
    priceRupees: 150000,
    isActive: true,
    description:
      'Team registration for a six-week corporate T20 league. Covers ground fees, umpires and kits for fifteen players.',
    imageId: 'photo-1540747913346-19e32dc3e97e',
  },
  {
    title: 'Night Football 5-a-side',
    categoryCode: 'sports',
    city: 'Coimbatore',
    dayOffset: -2,
    time: '20:00',
    priceRupees: 400,
    isActive: true,
    description:
      'A floodlit five-a-side tournament for walk-in players. Teams are formed on the spot.',
    imageId: 'photo-1574629810360-7efbbe195018',
  },
  {
    title: 'Kids Science Fair',
    categoryCode: 'kids',
    city: 'Chennai',
    dayOffset: 10,
    time: '10:00',
    priceRupees: 100,
    isActive: true,
    description:
      'Hands-on experiments, slime making and a mini planetarium show for ages 6 to 12.',
    imageId: 'photo-1532094349884-543bc11b234d',
  },
  {
    title: 'Storytelling Hour for Kids',
    categoryCode: 'kids',
    city: 'Bengaluru',
    dayOffset: 8,
    time: '16:00',
    priceRupees: 0,
    isActive: false,
    description:
      'Picture-book stories, puppets and a short craft activity for ages 4 to 8.',
    imageId: 'photo-1503454537195-1dcabb73ffb9',
  },
];

export function sampleImageUrl(event: SampleEvent): string {
  return image(event.imageId);
}

const IST_OFFSET_MINUTES = 330;

/** Returns the instant for `time` (IST) on the day `dayOffset` days from `now`. */
export function sampleStartsAt(event: SampleEvent, now: Date): Date {
  const istNow = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
  const [hours, minutes] = event.time.split(':').map(Number);
  return new Date(
    Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate() + event.dayOffset,
      hours,
      minutes - IST_OFFSET_MINUTES,
    ),
  );
}
