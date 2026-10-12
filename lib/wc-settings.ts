export interface WcSetting {
  id: string;
  value: unknown;
  options?: Record<string, string>;
}

export type AllowedMode = 'specific' | 'all_except' | 'all';

const asList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/**
 * «Località di vendita» di WooCommerce → codici paese.
 * Con «vendi a tutte» ritorna [] di proposito: uno shop non deve coprire il mondo
 * intero (altrimenti .com non comparirebbe mai). Il chiamante lo segnala nel log.
 */
export function parseAllowedCountries(settings: WcSetting[]): { mode: AllowedMode; codes: string[] } {
  if (!Array.isArray(settings)) throw new Error('Risposta settings/general non valida');
  const get = (id: string) => settings.find((s) => s.id === id);
  const mode = get('woocommerce_allowed_countries')?.value;
  const specific = get('woocommerce_specific_allowed_countries');
  const except = get('woocommerce_all_except_countries');

  if (mode === 'specific') return { mode, codes: asList(specific?.value) };
  if (mode === 'all_except') {
    const options = specific?.options ?? except?.options;
    if (!options) throw new Error('woocommerce_allowed_countries all_except senza elenco paesi');
    const excluded = new Set(asList(except?.value));
    return { mode, codes: Object.keys(options).filter((c) => !excluded.has(c)) };
  }
  if (mode === 'all') return { mode, codes: [] };
  throw new Error(`woocommerce_allowed_countries inatteso: ${String(mode)}`);
}

/**
 * «Nazioni visibili a tutti» del plugin woocommerce-additional-countries-per-user
 * (gruppo settings/wacpu). Dove il plugin è attivo sostituisce la «Località di
 * vendita»: le nazioni extra dei singoli clienti non contano.
 */
export function parseVisibleToAll(settings: WcSetting[]): string[] {
  if (!Array.isArray(settings)) throw new Error('Risposta settings/wacpu non valida');
  const setting = settings.find((s) => s.id === 'wacpu_countries_visible_to_all');
  if (!setting) throw new Error('wacpu_countries_visible_to_all assente');
  return asList(setting.value);
}
