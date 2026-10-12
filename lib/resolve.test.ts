import { describe, expect, it } from 'vitest';
import { resolveLinks, type CountryData } from './resolve';

const DATA: CountryData = {
  it: ['IT', 'SM'],
  fr: ['FR', 'MC'],
  de: ['DE', 'AT'],
  es: ['ES'],
  eu: ['BE', 'NL', 'PL'],
  casa: ['IT'],
  frozen: ['IT', 'FR', 'DE', 'PL'],
};

const ids = (country: string, data: CountryData = DATA) => resolveLinks(country, data).map((l) => l.id);

describe('resolveLinks', () => {
  it('IT: B2B, CASA e Frozen in questo ordine', () => expect(ids('IT')).toEqual(['it', 'casa', 'frozen']));
  it('FR: .fr e Frozen', () => expect(ids('FR')).toEqual(['fr', 'frozen']));
  it('AT: .de', () => expect(ids('AT')).toEqual(['de']));
  it('PL: .eu e Frozen', () => expect(ids('PL')).toEqual(['eu', 'frozen']));
  it('BE: solo .eu', () => expect(ids('BE')).toEqual(['eu']));
  it('US: vetrina pizzafellas', () => expect(ids('US')).toEqual(['pizzafellas']));
  it('SE: vetrina inmeddegen', () => expect(ids('SE')).toEqual(['inmeddegen']));
  it('SE servita anche da .eu: shop e vetrina insieme', () =>
    expect(ids('SE', { ...DATA, eu: [...DATA.eu, 'SE'] })).toEqual(['eu', 'inmeddegen']));
  it('BR: ripiego .com', () => expect(ids('BR')).toEqual(['com']));
  it('ZZ (altro paese): ripiego .com', () => expect(ids('ZZ')).toEqual(['com']));
  it('sovrapposizione: se .eu serve FR vince .fr (priorità 1)', () =>
    expect(ids('FR', { ...DATA, eu: [...DATA.eu, 'FR'] })).toEqual(['fr', 'frozen']));
  it('shop senza dati: semplicemente assente', () =>
    expect(ids('IT', { it: ['IT'], casa: ['IT'] })).toEqual(['it', 'casa']));
  it('porta kind, url e titleKey o brand', () => {
    expect(resolveLinks('IT', DATA)[0]).toEqual({ id: 'it', kind: 'fresh', url: 'https://quellidellapizza.it', titleKey: 'b2b' });
    expect(resolveLinks('US', DATA)[0]).toEqual({ id: 'pizzafellas', kind: 'showcase', url: 'https://pizzafellas.com', brand: 'Pizza Fellas' });
    expect(resolveLinks('BR', DATA)[0]).toEqual({ id: 'com', kind: 'fallback', url: 'https://quellidellapizza.com' });
  });
});
