import { FALLBACK, SHOPS, SHOWCASES, type ShopRole, type ShopSite, type ShowcaseSite, type TitleKey } from './sites';

/** id dello shop → codici paese serviti */
export type CountryData = Readonly<Record<string, readonly string[]>>;

export type LinkKind = ShopRole | 'showcase' | 'fallback';

export interface ResolvedLink {
  id: string;
  kind: LinkKind;
  url: string;
  titleKey?: TitleKey;
  brand?: string;
}

const ROLE_ORDER: ShopRole[] = ['fresh', 'home', 'frozen'];

/**
 * Per ogni ruolo shop, il sito a priorità più alta che serve il paese; poi le vetrine
 * del paese (sempre, anche se c'è uno shop); se non c'è niente, quellidellapizza.com.
 */
export function resolveLinks(
  country: string,
  data: CountryData,
  shops: ShopSite[] = SHOPS,
  showcases: ShowcaseSite[] = SHOWCASES,
): ResolvedLink[] {
  const links: ResolvedLink[] = [];

  for (const role of ROLE_ORDER) {
    const best = shops
      .filter((s) => s.role === role && (data[s.id] ?? []).includes(country))
      .sort((a, b) => a.priority - b.priority)[0];
    if (best) links.push({ id: best.id, kind: role, url: best.url, titleKey: best.titleKey });
  }

  for (const sc of showcases) {
    if (sc.countries.includes(country)) links.push({ id: sc.id, kind: 'showcase', url: sc.url, brand: sc.brand });
  }

  if (links.length === 0) links.push({ id: FALLBACK.id, kind: 'fallback', url: FALLBACK.url });
  return links;
}
