import { describe, expect, it } from 'vitest';
import { detectCountry } from './detect-country';

describe('detectCountry', () => {
  it('percorso vince su tutto', () =>
    expect(detectCountry({ path: 'fr', query: 'de', cookie: 'ES', header: 'IT' })).toBe('FR'));
  it('poi ?c=', () => expect(detectCountry({ query: 'de', cookie: 'ES', header: 'IT' })).toBe('DE'));
  it('poi cookie', () => expect(detectCountry({ cookie: 'ES', header: 'IT' })).toBe('ES'));
  it('poi header geo', () => expect(detectCountry({ header: 'IT' })).toBe('IT'));
  it('valori non validi passano al livello successivo', () =>
    expect(detectCountry({ query: 'xyz', cookie: 'XX', header: 'AT' })).toBe('AT'));
  it('cookie «altro paese» ferma la catena', () => expect(detectCountry({ cookie: 'ZZ', header: 'IT' })).toBe('ZZ'));
  it('nessun dato o header XX/T1: altro paese', () => {
    expect(detectCountry({})).toBe('ZZ');
    expect(detectCountry({ header: 'XX' })).toBe('ZZ');
    expect(detectCountry({ header: 'T1' })).toBe('ZZ');
  });
});
