import { describe, expect, it } from 'vitest';
import { buildPageModel } from './view-model';
import type { CountryData } from './resolve';

const DATA: CountryData = { it: ['IT'], fr: ['FR'], casa: ['IT'], frozen: ['IT', 'FR'] };

describe('buildPageModel', () => {
  it('IT in italiano: titoli, etichette e link con UTM', () => {
    const m = buildPageModel({ country: 'IT', lang: 'it', data: DATA, src: 'instagram' });
    expect(m.pills.map((p) => p.title)).toEqual(['Shop professionisti', 'Shop privati', 'Linea surgelata']);
    expect(m.pills.map((p) => p.tag)).toEqual(['Fresco', 'Casa', 'Surgelato']);
    expect(m.pills[0].href).toBe(
      'https://quellidellapizza.it/?utm_source=instagram&utm_medium=social&utm_campaign=linktree&utm_content=it',
    );
    expect(m.countryLabel).toBe('Italia');
    expect(m.currentValue).toBe('IT');
  });

  it('US: vetrina col nome del brand', () => {
    const m = buildPageModel({ country: 'US', lang: 'en', data: DATA, src: 'tiktok' });
    expect(m.pills).toHaveLength(1);
    expect(m.pills[0]).toMatchObject({ title: 'Pizza Fellas', tag: 'Catalogue', kind: 'showcase' });
  });

  it('paese non servito: etichetta col suo nome ma selettore su «altro»', () => {
    const m = buildPageModel({ country: 'BR', lang: 'en', data: DATA, src: 'instagram' });
    expect(m.countryLabel).toBe('Brazil');
    expect(m.currentValue).toBe('ZZ');
    expect(m.pills[0].title).toBe('Catalogue & contact');
  });

  it('opzioni: paesi serviti e vetrine in ordine alfabetico, «altro» in fondo', () => {
    const m = buildPageModel({ country: 'FR', lang: 'en', data: DATA, src: 'instagram' });
    expect(m.options.map((o) => o.value)).toEqual(['FR', 'IT', 'SE', 'US', 'ZZ']);
    expect(m.options.at(-1)!.label).toBe('Other country');
  });

  it('paese ZZ: «Altro paese», selettore su ZZ, link con utm_content=other', () => {
    const m = buildPageModel({ country: 'ZZ', lang: 'it', data: DATA, src: 'instagram' });
    expect(m.countryLabel).toBe('Altro paese');
    expect(m.currentValue).toBe('ZZ');
    expect(m.pills[0].href).toContain('utm_content=other');
  });

  it('opzioni in italiano: ordine alfabetico localizzato, ZZ in fondo', () => {
    const data: CountryData = { it: ['IT'], fr: ['FR'], de: ['DE'] };
    const m = buildPageModel({ country: 'IT', lang: 'it', data, src: 'instagram' });
    expect(m.options.map((o) => o.label)).toEqual(['Francia', 'Germania', 'Italia', 'Stati Uniti', 'Svezia', 'Altro paese']);
    expect(m.options.map((o) => o.value)).toEqual(['FR', 'DE', 'IT', 'US', 'SE', 'ZZ']);
  });

  it('paese servito da shop e vetrina: due pill, la seconda è la vetrina', () => {
    const data: CountryData = { eu: ['SE'] };
    const m = buildPageModel({ country: 'SE', lang: 'en', data, src: 'instagram' });
    expect(m.pills).toHaveLength(2);
    expect(m.pills[1]).toMatchObject({ kind: 'showcase', title: 'In Med Degen' });
  });

  it('codici non validi nei dati sono scartati; i duplicati compaiono una volta', () => {
    const data: CountryData = { it: ['IT', 'XX', 'uk', 'EU'], casa: ['IT'], frozen: ['IT', 'FR'] };
    const m = buildPageModel({ country: 'IT', lang: 'en', data, src: 'instagram' });
    expect(m.options.map((o) => o.value)).toEqual(['FR', 'IT', 'SE', 'US', 'ZZ']);
  });
});
