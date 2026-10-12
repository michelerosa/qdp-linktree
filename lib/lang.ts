export const LANGS = ['it', 'fr', 'de', 'es', 'en'] as const;
export type Lang = (typeof LANGS)[number];

const COUNTRY_LANG: Record<string, Lang> = {
  IT: 'it', SM: 'it', VA: 'it',
  FR: 'fr', MC: 'fr',
  DE: 'de', AT: 'de', LI: 'de',
  ES: 'es', AD: 'es',
  US: 'en', GB: 'en', IE: 'en', AU: 'en', NZ: 'en',
};

const isLang = (v: string): v is Lang => (LANGS as readonly string[]).includes(v);

/** Lingua del paese → prima lingua supportata di Accept-Language (per q) → inglese. */
export function pickLang(country: string, acceptLanguage: string | null): Lang {
  const byCountry = COUNTRY_LANG[country];
  if (byCountry) return byCountry;

  const prefs = (acceptLanguage ?? '')
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const qParam = params.find((p) => /^\s*q\s*=/i.test(p));
      const m = qParam ? /^\s*q\s*=\s*([\d.]+)\s*$/i.exec(qParam) : null;
      // q presente ma malformata: la voce viene scartata (q = 0)
      const q = !qParam ? 1 : m ? Number(m[1]) : 0;
      return { lang: tag.trim().split(/[-_]/)[0].toLowerCase(), q: Number.isNaN(q) ? 0 : q };
    })
    .filter((p) => p.lang && p.q > 0)
    .sort((a, b) => b.q - a.q);

  const found = prefs.find((p) => isLang(p.lang));
  return found ? (found.lang as Lang) : 'en';
}
