import type { CountryData } from './resolve';

export interface SiteStatus {
  id: string;
  lastSuccess: number | null;
  countries: number;
  lastError: string | null;
}

export interface StoreStatus {
  bootedAt: number;
  sites: SiteStatus[];
}

export interface StoreOptions {
  shopIds: string[];
  fetcher: (id: string) => Promise<string[]>;
  snapshot: CountryData;
  ttlMs?: number;
  /** Attesa prima di riprovare se almeno uno shop è fallito (default 5 minuti). */
  retryMs?: number;
  now?: () => number;
  onError?: (id: string, err: unknown) => void;
}

/**
 * Nazioni per shop in memoria. get() non aspetta mai la rete: ritorna i dati che ha
 * e, se sono più vecchi di ttlMs, avvia un refresh in background (stale-while-revalidate).
 */
export function createStore(o: StoreOptions) {
  const now = o.now ?? Date.now;
  const ttl = o.ttlMs ?? 3_600_000;
  const retry = o.retryMs ?? 300_000;
  // Dati immutabili: ogni refresh sostituisce l'oggetto, non lo modifica.
  let data: CountryData = Object.freeze(
    Object.fromEntries(Object.entries(o.snapshot).map(([id, codes]) => [id, Object.freeze([...codes])])),
  );
  const status = new Map<string, SiteStatus>(
    o.shopIds.map((id) => [id, { id, lastSuccess: null, countries: (o.snapshot[id] ?? []).length, lastError: null }]),
  );
  const bootedAt = now();
  let nextRefreshAt = 0;
  let inflight: Promise<void> | null = null;

  function refresh(): Promise<void> {
    if (inflight) return inflight;
    const updates: Record<string, readonly string[]> = {};
    let anyFailed = false;
    inflight = Promise.all(
      o.shopIds.map(async (id) => {
        const s = status.get(id)!;
        try {
          const codes = await o.fetcher(id);
          updates[id] = Object.freeze([...codes]);
          s.lastSuccess = now();
          s.countries = codes.length;
          s.lastError = null;
        } catch (err) {
          anyFailed = true;
          s.lastError = err instanceof Error ? err.message : String(err);
          try {
            o.onError?.(id, err);
          } catch {
            // un onError che lancia non deve far fallire il refresh
          }
        }
      }),
    )
      .then(() => {
        data = Object.freeze({ ...data, ...updates });
        nextRefreshAt = now() + (anyFailed ? retry : ttl);
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }

  function get(): CountryData {
    if (now() >= nextRefreshAt) void refresh();
    return data;
  }

  function getStatus(): StoreStatus {
    return { bootedAt, sites: [...status.values()].map((s) => ({ ...s })) };
  }

  return { get, refresh, getStatus };
}

export type Store = ReturnType<typeof createStore>;
