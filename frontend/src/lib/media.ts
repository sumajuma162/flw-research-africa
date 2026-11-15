import market from '@/assets/media/market.jpg';
import coldChain from '@/assets/media/cold-chain.webp';
import storage from '@/assets/media/storage.jpg';
import drying from '@/assets/media/solar-drying.jpg';
import research from '@/assets/media/research.jpg';
import heritage from '@/assets/media/heritage.webp';
import heroVideo from '@/assets/media/hero.mp4';
import heroPoster from '@/assets/media/hero-poster.jpg';

/** Original illustrations in the network palette. Replace with licensed photography when available (see README). */
export const IMAGES: Record<string, { src: string; alt: string }> = {
  market: { src: market, alt: 'Illustration of a market stall with baskets of tomatoes, mangoes and greens' },
  'cold-chain': { src: coldChain, alt: 'Illustration of a solar-powered cold room with crates of fresh produce' },
  storage: { src: storage, alt: 'Illustration of raised granaries and hermetic grain bags at golden hour' },
  drying: { src: drying, alt: 'Illustration of a tunnel solar dryer full of mango and tomato slices' },
  research: { src: research, alt: 'Illustration of a laptop showing a bar chart beside jars of grain samples' },
  heritage: { src: heritage, alt: 'Illustration of clay storage pots, a calabash of grain and hanging maize cobs' },
};
export const HERO = { video: heroVideo, poster: heroPoster };
export const imageFor = (key?: string) => IMAGES[key ?? ''] ?? IMAGES.market;
