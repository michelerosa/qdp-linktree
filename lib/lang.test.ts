import { describe, expect, it } from 'vitest';
import { pickLang } from './lang';
import { MESSAGES } from './i18n';
import { LANGS } from './lang';

describe('pickLang', () => {
  it('lingua del paese se supportata', () => {
    expect(pickLang('IT', null)).toBe('it');
    expect(pickLang('AT', 'en-US')).toBe('de');
    expect(pickLang('ES', null)).toBe('es');
  });
  it('altrimenti la prima lingua supportata del browser, per peso q', () => {
    expect(pickLang('BE', 'fr-BE,fr;q=0.9,en;q=0.8')).toBe('fr');
    expect(pickLang('CH', 'en;q=0.5,de;q=0.9')).toBe('de');
  });
  it('altrimenti inglese', () => {
    expect(pickLang('SE', 'sv-SE,sv;q=0.9')).toBe('en');
    expect(pickLang('ZZ', null)).toBe('en');
  });
});

describe('pickLang: Accept-Language', () => {
  it('underscore come separatore', () => expect(pickLang('BE', 'de_CH')).toBe('de'));
  it('q maiuscola e con spazi', () => expect(pickLang('BE', 'fr;Q=0.2, de;q = 0.8')).toBe('de'));
  it('q=0 esclude la lingua', () => expect(pickLang('BE', 'fr;q=0')).toBe('en'));
  it('wildcard ignorato', () => expect(pickLang('BE', '*')).toBe('en'));
  it('q non numerica scartata', () => expect(pickLang('BE', 'fr;q=abc, de;q=0.5')).toBe('de'));
});

describe('MESSAGES', () => {
  it('tutte le lingue hanno le stesse chiavi', () => {
    const shape = (o: object): string[] =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? shape(v).map((s) => `${k}.${s}`) : [k])).sort();
    for (const lang of LANGS) expect(shape(MESSAGES[lang])).toEqual(shape(MESSAGES.en));
  });
});
