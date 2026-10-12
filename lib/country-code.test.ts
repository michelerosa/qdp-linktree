import { describe, expect, it } from 'vitest';
import { normalizeCountry, OTHER } from './country-code';

describe('normalizeCountry', () => {
  it('normalizza maiuscole e spazi', () => {
    expect(normalizeCountry('fr')).toBe('FR');
    expect(normalizeCountry(' de ')).toBe('DE');
  });
  it('accetta ZZ come «altro paese»', () => {
    expect(normalizeCountry('zz')).toBe(OTHER);
  });
  it('scarta codici riservati/obsoleti che Intl riconosce', () => {
    expect(normalizeCountry('UK')).toBeNull();
    expect(normalizeCountry('AA')).toBeNull();
    expect(normalizeCountry('GB')).toBe('GB');
  });
  it('scarta valori non validi o speciali di Cloudflare', () => {
    for (const v of ['XX', 'T1', 'EU', 'abc', '', '1', null, undefined]) {
      expect(normalizeCountry(v)).toBeNull();
    }
  });
});
