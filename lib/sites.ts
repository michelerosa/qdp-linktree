export type ShopRole = 'fresh' | 'home' | 'frozen';
export type TitleKey = 'b2b' | 'shop' | 'home' | 'frozen';

export interface ShopSite {
  id: string;
  role: ShopRole;
  /** 1 vince su 2 quando due shop dello stesso ruolo servono la stessa nazione. */
  priority: number;
  url: string;
  /** Prefisso delle env: WC_<envKey>_KEY / WC_<envKey>_SECRET */
  envKey: string;
  titleKey: TitleKey;
}

export interface ShowcaseSite {
  id: string;
  url: string;
  /** Le vetrine non hanno WooCommerce: nazioni fisse. */
  countries: string[];
  brand: string;
}

export const SHOPS: ShopSite[] = [
  { id: 'it', role: 'fresh', priority: 1, url: 'https://quellidellapizza.it', envKey: 'IT', titleKey: 'b2b' },
  { id: 'fr', role: 'fresh', priority: 1, url: 'https://quellidellapizza.fr', envKey: 'FR', titleKey: 'shop' },
  { id: 'de', role: 'fresh', priority: 1, url: 'https://quellidellapizza.de', envKey: 'DE', titleKey: 'shop' },
  { id: 'es', role: 'fresh', priority: 1, url: 'https://quellidellapizza.es', envKey: 'ES', titleKey: 'shop' },
  { id: 'eu', role: 'fresh', priority: 2, url: 'https://quellidellapizza.eu', envKey: 'EU', titleKey: 'shop' },
  { id: 'casa', role: 'home', priority: 1, url: 'https://casa.quellidellapizza.it', envKey: 'CASA', titleKey: 'home' },
  { id: 'frozen', role: 'frozen', priority: 1, url: 'https://frozen.quellidellapizza.com', envKey: 'FROZEN', titleKey: 'frozen' },
];

export const SHOWCASES: ShowcaseSite[] = [
  { id: 'pizzafellas', url: 'https://pizzafellas.com', countries: ['US'], brand: 'Pizza Fellas' },
  { id: 'inmeddegen', url: 'https://inmeddegen.se', countries: ['SE'], brand: 'In Med Degen' },
];

export const FALLBACK = { id: 'com', url: 'https://quellidellapizza.com' };

export const SOCIALS = [
  { id: 'instagram', label: 'Instagram', url: 'https://instagram.com/quellidellapizza/' },
  { id: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@quellidellapizza' },
  { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/QuelliDellaPizza' },
  { id: 'facebook', label: 'Facebook', url: 'https://facebook.com/quellidellapizza' },
  { id: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/company/quellidellapizza/' },
] as const;

export type SocialId = (typeof SOCIALS)[number]['id'];
