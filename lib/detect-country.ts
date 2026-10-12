import { normalizeCountry, OTHER } from './country-code';

export interface CountrySources {
  path?: string | null;
  query?: string | null;
  cookie?: string | null;
  header?: string | null;
}

/** Percorso → ?c= → cookie → CF-IPCountry → «altro paese». */
export function detectCountry(src: CountrySources): string {
  return (
    normalizeCountry(src.path) ??
    normalizeCountry(src.query) ??
    normalizeCountry(src.cookie) ??
    normalizeCountry(src.header) ??
    OTHER
  );
}
