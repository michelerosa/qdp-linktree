import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchShopCountries } from './wc';

const SETTINGS = [
  { id: 'woocommerce_allowed_countries', value: 'specific' },
  { id: 'woocommerce_specific_allowed_countries', value: ['FR', 'BE'] },
];

describe('fetchShopCountries', () => {
  const saved = { key: process.env.WC_FR_KEY, secret: process.env.WC_FR_SECRET };

  beforeEach(() => {
    process.env.WC_FR_KEY = 'ck_test';
    process.env.WC_FR_SECRET = 'cs_test';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (saved.key === undefined) delete process.env.WC_FR_KEY;
    else process.env.WC_FR_KEY = saved.key;
    if (saved.secret === undefined) delete process.env.WC_FR_SECRET;
    else process.env.WC_FR_SECRET = saved.secret;
  });

  it('credenziali mancanti: errore esplicito', async () => {
    delete process.env.WC_FR_KEY;
    await expect(fetchShopCountries('fr')).rejects.toThrow('Credenziali mancanti: WC_FR_KEY / WC_FR_SECRET');
  });

  it('errore di rete: usa il codice della cause (ENOTFOUND)', async () => {
    const err = new TypeError('fetch failed', { cause: Object.assign(new Error('getaddrinfo'), { code: 'ENOTFOUND' }) });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err));
    await expect(fetchShopCountries('fr')).rejects.toThrow(/quellidellapizza\.fr: ENOTFOUND/);
  });

  it('timeout: mantiene il messaggio originale', async () => {
    const err = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err));
    await expect(fetchShopCountries('fr')).rejects.toThrow(/aborted due to timeout/);
  });

  it('HTTP 401: stato e inizio del body nel messaggio', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"code":"woocommerce_rest_cannot_view"}', { status: 401 })));
    await expect(fetchShopCountries('fr')).rejects.toThrow(/401.*woocommerce_rest_cannot_view/);
  });

  it('200 con HTML: «Risposta non JSON»', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Maintenance</html>', { status: 200 })));
    await expect(fetchShopCountries('fr')).rejects.toThrow('Risposta non JSON da https://quellidellapizza.fr');
  });

  it('plugin presente: usa settings/wacpu, redirect error e Basic auth', async () => {
    const visible = [{ id: 'wacpu_countries_visible_to_all', value: ['FR'] }];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(visible), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchShopCountries('fr')).resolves.toEqual(['FR']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://quellidellapizza.fr/wp-json/wc/v3/settings/wacpu');
    expect(init.redirect).toBe('error');
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('ck_test:cs_test').toString('base64')}`);
  });

  it('plugin assente (404): ripiega sulla Località di vendita', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"code":"rest_setting_setting_group_invalid"}', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(SETTINGS), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchShopCountries('fr')).resolves.toEqual(['FR', 'BE']);
    expect(fetchMock.mock.calls[1][0]).toBe('https://quellidellapizza.fr/wp-json/wc/v3/settings/general');
  });

  it('404 anche su settings/general: errore', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('', { status: 404 })));
    await expect(fetchShopCountries('fr')).rejects.toThrow('HTTP 404 da https://quellidellapizza.fr settings/general');
  });
});
