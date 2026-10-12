import { describe, expect, it } from 'vitest';
import { parseAllowedCountries, parseVisibleToAll, type WcSetting } from './wc-settings';

const OPTIONS = { IT: 'Italia', FR: 'Francia', DE: 'Germania', ES: 'Spagna' };

function settings(mode: string, specific: string[] = [], except: string[] = []): WcSetting[] {
  return [
    { id: 'woocommerce_allowed_countries', value: mode },
    { id: 'woocommerce_specific_allowed_countries', value: specific, options: OPTIONS },
    { id: 'woocommerce_all_except_countries', value: except, options: OPTIONS },
  ];
}

describe('parseAllowedCountries', () => {
  it('specific: usa la lista specifica', () => {
    expect(parseAllowedCountries(settings('specific', ['FR', 'DE']))).toEqual({ mode: 'specific', codes: ['FR', 'DE'] });
  });
  it('all_except: tutte le nazioni tranne le escluse', () => {
    expect(parseAllowedCountries(settings('all_except', [], ['FR']))).toEqual({ mode: 'all_except', codes: ['IT', 'DE', 'ES'] });
  });
  it('all: nessuna nazione (non deve coprire il mondo)', () => {
    expect(parseAllowedCountries(settings('all'))).toEqual({ mode: 'all', codes: [] });
  });
  it('setting assente: errore', () => {
    expect(() => parseAllowedCountries([])).toThrow('woocommerce_allowed_countries inatteso: undefined');
  });
  it('all_except senza options: errore', () => {
    expect(() => parseAllowedCountries([{ id: 'woocommerce_allowed_countries', value: 'all_except' }])).toThrow();
  });
  it('valore sconosciuto: errore', () => {
    expect(() => parseAllowedCountries(settings('boh'))).toThrow('woocommerce_allowed_countries inatteso: boh');
  });
  it('input non array: errore', () => {
    expect(() => parseAllowedCountries({} as unknown as WcSetting[])).toThrow('Risposta settings/general non valida');
  });
  it('ignora valori non stringa', () => {
    expect(parseAllowedCountries(settings('specific', ['FR', 3 as unknown as string]))).toEqual({ mode: 'specific', codes: ['FR'] });
  });
});

describe('parseVisibleToAll', () => {
  const visible = (value: unknown): WcSetting[] => [{ id: 'wacpu_countries_visible_to_all', value }];

  it('usa le nazioni visibili a tutti', () => {
    expect(parseVisibleToAll(visible(['AT', 'DE']))).toEqual(['AT', 'DE']);
  });
  it('opzione vuota (stringa vuota da WordPress): nessuna nazione', () => {
    expect(parseVisibleToAll(visible(''))).toEqual([]);
  });
  it('setting assente: errore', () => {
    expect(() => parseVisibleToAll([])).toThrow('wacpu_countries_visible_to_all assente');
  });
  it('input non array: errore', () => {
    expect(() => parseVisibleToAll({} as unknown as WcSetting[])).toThrow('Risposta settings/wacpu non valida');
  });
});
