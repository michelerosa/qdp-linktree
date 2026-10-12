import snapshot from '../data/snapshot.json';
import type { CountryData } from './resolve';
import { SHOPS } from './sites';
import { createStore, type Store } from './store';
import { fetchShopCountries } from './wc';

// globalThis serve anche in produzione: instrumentation e route dell'app sono bundle separati,
// e senza il singleton ognuno creerebbe il proprio store.
// In `next dev` le modifiche a store/wc/snapshot richiedono un riavvio (lo store resta in globalThis).
const g = globalThis as unknown as { __qdpStore?: Store };

export const store: Store = (g.__qdpStore ??= createStore({
  shopIds: SHOPS.map((s) => s.id),
  fetcher: fetchShopCountries,
  snapshot: snapshot as CountryData,
  onError: (id, err) => console.warn(`[qdp-link] refresh ${id} fallito:`, err instanceof Error ? err.message : err),
}));
