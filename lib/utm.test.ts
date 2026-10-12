import { describe, expect, it } from 'vitest';
import { sanitizeSrc, setCountryHref, withUtm } from './utm';

describe('sanitizeSrc', () => {
  it('default instagram', () => {
    expect(sanitizeSrc(null)).toBe('instagram');
    expect(sanitizeSrc('')).toBe('instagram');
  });
  it('accetta slug semplici in minuscolo', () => expect(sanitizeSrc('TikTok')).toBe('tiktok'));
  it('scarta valori sporchi', () => expect(sanitizeSrc('<script>')).toBe('instagram'));
});

describe('withUtm', () => {
  it('aggiunge i parametri', () => {
    expect(withUtm('https://quellidellapizza.fr', { src: 'instagram', country: 'FR' })).toBe(
      'https://quellidellapizza.fr/?utm_source=instagram&utm_medium=social&utm_campaign=linktree&utm_content=fr',
    );
  });
  it('altro paese diventa other', () => {
    expect(withUtm('https://quellidellapizza.com', { src: 'tiktok', country: 'ZZ' })).toContain('utm_content=other');
  });
});

describe('setCountryHref', () => {
  it('omette src se è il default', () => {
    expect(setCountryHref('DE', 'instagram')).toBe('/set-country?c=de');
    expect(setCountryHref('de', null)).toBe('/set-country?c=de');
    expect(setCountryHref('de', 'non valido!')).toBe('/set-country?c=de');
  });
  it('include src se diverso dal default', () => {
    expect(setCountryHref('de', 'tiktok')).toBe('/set-country?c=de&src=tiktok');
  });
});
