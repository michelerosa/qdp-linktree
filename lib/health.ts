import type { StoreStatus } from './store';

export function healthReport(status: StoreStatus, now: number, maxAgeMs = 24 * 3_600_000) {
  const sites = status.sites.map((s) => ({ ...s, stale: now - (s.lastSuccess ?? status.bootedAt) > maxAgeMs }));
  return { ok: !sites.some((s) => s.stale), sites };
}

// Versione pubblica: niente lastError (gli errori vanno già nel log dallo store)
export function publicHealth(report: ReturnType<typeof healthReport>) {
  return {
    ok: report.ok,
    sites: report.sites.map((s) => ({ id: s.id, lastSuccess: s.lastSuccess, countries: s.countries, stale: s.stale })),
  };
}
