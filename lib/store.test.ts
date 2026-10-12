import { describe, expect, it, vi } from 'vitest';
import { createStore, type StoreOptions } from './store';

const HOUR = 3_600_000;

function setup(fetcher: (id: string) => Promise<string[]>, extra: Partial<StoreOptions> = {}) {
  let t = 1_000_000;
  const store = createStore({
    ...extra,
    shopIds: ['fr', 'eu'],
    fetcher,
    snapshot: { fr: ['FR'], eu: ['BE'] },
    now: () => t,
  });
  return { store, advance: (ms: number) => { t += ms; } };
}

describe('createStore', () => {
  it('risponde subito con lo snapshot e avvia il refresh', async () => {
    const fetcher = vi.fn(async (id: string) => (id === 'fr' ? ['FR', 'MC'] : ['BE', 'NL']));
    const { store } = setup(fetcher);
    expect(store.get()).toEqual({ fr: ['FR'], eu: ['BE'] });
    await store.refresh();
    expect(store.get()).toEqual({ fr: ['FR', 'MC'], eu: ['BE', 'NL'] });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('se uno shop fallisce tiene la sua ultima versione buona', async () => {
    const fetcher = vi.fn(async (id: string) => {
      if (id === 'eu') throw new Error('HTTP 500');
      return ['FR', 'MC'];
    });
    const { store } = setup(fetcher);
    await store.refresh();
    expect(store.get()).toEqual({ fr: ['FR', 'MC'], eu: ['BE'] });
    const eu = store.getStatus().sites.find((s) => s.id === 'eu')!;
    expect(eu.lastError).toBe('HTTP 500');
    expect(eu.lastSuccess).toBeNull();
  });

  it('non rilegge prima di un\'ora, rilegge dopo', async () => {
    const fetcher = vi.fn(async () => ['FR']);
    const { store, advance } = setup(fetcher);
    store.get();
    await store.refresh();
    const calls = fetcher.mock.calls.length;
    advance(HOUR - 1);
    store.get();
    expect(fetcher.mock.calls.length).toBe(calls);
    advance(1);
    store.get();
    await store.refresh();
    expect(fetcher.mock.calls.length).toBeGreaterThan(calls);
  });

  it('refresh concorrenti condividono la stessa lettura', async () => {
    const fetcher = vi.fn(async () => ['FR']);
    const { store } = setup(fetcher);
    await Promise.all([store.refresh(), store.refresh(), store.refresh()]);
    expect(fetcher).toHaveBeenCalledTimes(2); // una per shop
  });

  it('uno shop fallito viene riprovato dopo retryMs, non dopo ttl', async () => {
    const fetcher = vi.fn(async (id: string) => {
      if (id === 'eu') throw new Error('HTTP 500');
      return ['FR'];
    });
    const { store, advance } = setup(fetcher, { retryMs: 300_000 });
    store.get();
    await store.refresh();
    expect(fetcher).toHaveBeenCalledTimes(2);
    advance(299_999);
    store.get();
    expect(fetcher).toHaveBeenCalledTimes(2);
    advance(1);
    store.get();
    expect(fetcher).toHaveBeenCalledTimes(4); // get() ha avviato il refresh
    await store.refresh();
  });

  it('lastError si azzera e countries si aggiorna dopo un successo successivo', async () => {
    let fail = true;
    const fetcher = vi.fn(async (id: string) => {
      if (id === 'eu' && fail) throw new Error('HTTP 500');
      return id === 'eu' ? ['BE', 'NL', 'LU'] : ['FR'];
    });
    const { store, advance } = setup(fetcher, { retryMs: 1000 });
    await store.refresh();
    expect(store.getStatus().sites.find((s) => s.id === 'eu')!.lastError).toBe('HTTP 500');
    fail = false;
    advance(1000);
    store.get();
    await store.refresh();
    const eu = store.getStatus().sites.find((s) => s.id === 'eu')!;
    expect(eu.lastError).toBeNull();
    expect(eu.countries).toBe(3);
    expect(store.get().eu).toEqual(['BE', 'NL', 'LU']);
  });

  it('get() ritorna un oggetto che non cambia dopo un refresh', async () => {
    const { store } = setup(async (id) => (id === 'fr' ? ['FR', 'MC'] : ['BE']));
    const before = store.get();
    await store.refresh();
    expect(before).toEqual({ fr: ['FR'], eu: ['BE'] });
    expect(store.get()).toEqual({ fr: ['FR', 'MC'], eu: ['BE'] });
    expect(store.get()).not.toBe(before);
    expect(Object.isFrozen(store.get())).toBe(true);
  });

  it('un onError che lancia non fa fallire refresh()', async () => {
    const { store } = setup(
      async () => { throw new Error('boom'); },
      { onError: () => { throw new Error('onError rotto'); } },
    );
    await expect(store.refresh()).resolves.toBeUndefined();
    expect(store.getStatus().sites[0].lastError).toBe('boom');
  });
});
