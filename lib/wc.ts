import { SHOPS } from './sites';
import { parseAllowedCountries, parseVisibleToAll, type WcSetting } from './wc-settings';

type Shop = (typeof SHOPS)[number];

/**
 * Nazioni servite da uno shop (chiave REST in sola lettura). Dove c'è il plugin
 * woocommerce-additional-countries-per-user valgono le sue «Nazioni visibili a
 * tutti» (settings/wacpu); senza plugin il gruppo non esiste (404) e si usa la
 * «Località di vendita» WooCommerce (settings/general).
 */
export async function fetchShopCountries(id: string): Promise<string[]> {
  const site = SHOPS.find((s) => s.id === id);
  if (!site) throw new Error(`Shop sconosciuto: ${id}`);

  const key = process.env[`WC_${site.envKey}_KEY`];
  const secret = process.env[`WC_${site.envKey}_SECRET`];
  if (!key || !secret) throw new Error(`Credenziali mancanti: WC_${site.envKey}_KEY / WC_${site.envKey}_SECRET`);
  const auth = `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;

  const visible = await getSettings(site, 'wacpu', auth);
  if (visible) return parseVisibleToAll(visible);

  const general = await getSettings(site, 'general', auth);
  if (!general) throw new Error(`HTTP 404 da ${site.url} settings/general`);
  const { mode, codes } = parseAllowedCountries(general);
  if (mode === 'all') {
    console.warn(`[qdp-link] ${id}: «vendi a tutte le nazioni» ignorato, contato come nessuna nazione`);
  }
  return codes;
}

/** GET di un gruppo di impostazioni WooCommerce; null se il gruppo non esiste (404). */
async function getSettings(site: Shop, group: string, auth: string): Promise<WcSetting[] | null> {
  let res: Response;
  try {
    res = await fetch(`${site.url}/wp-json/wc/v3/settings/${group}`, {
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
      // un redirect cross-origin farebbe perdere l'Authorization e sembrerebbe un 401
      redirect: 'error',
    });
  } catch (err) {
    // undici mette ENOTFOUND/ECONNRESET/errori di certificato in err.cause; i timeout restano col loro messaggio
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    const detail = cause?.code ?? cause?.message ?? (err instanceof Error ? err.message : String(err));
    throw new Error(`${site.url}: ${detail}`);
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    const snippet = (await res.text().catch(() => '')).slice(0, 120);
    throw new Error(`HTTP ${res.status} da ${site.url} ${snippet}`.trimEnd());
  }

  try {
    return (await res.json()) as WcSetting[];
  } catch {
    throw new Error(`Risposta non JSON da ${site.url}`);
  }
}
