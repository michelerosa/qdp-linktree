/** Codice sentinella per «Altro paese»: nessuno shop lo serve, quindi porta a .com. */
export const OTHER = 'ZZ';

// Codici riservati/obsoleti che Intl riconosce ma non sono paesi CF.
const NOT_COUNTRIES = new Set(['UK', 'UN', 'EZ', 'QO', 'SU', 'YU', 'CS', 'DD', 'ZR', 'TP', 'BU', 'AN']);

const regionNames = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });

/**
 * Codice ISO 3166-1 alpha-2 in maiuscolo, OTHER, oppure null se non valido.
 * Scarta XX (sconosciuto) ed EU, che Cloudflare può mandare, e T1 (Tor), che la regex esclude.
 */
export function normalizeCountry(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (code === OTHER) return OTHER;
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'EU' || NOT_COUNTRIES.has(code)) return null;
  return regionNames.of(code) ? code : null;
}
