import { describe, expect, it } from 'vitest';
import { healthReport, publicHealth } from './health';

const H = 3_600_000;
const NOW = 100 * H;
const site = (lastSuccess: number | null) => ({ id: 'fr', lastSuccess, countries: 2, lastError: null });

describe('healthReport', () => {
  it('ok se aggiornato di recente', () =>
    expect(healthReport({ bootedAt: NOW - 30 * H, sites: [site(NOW - H)] }, NOW).ok).toBe(true));
  it('ko se l\'ultimo successo ha più di 24 ore', () =>
    expect(healthReport({ bootedAt: NOW - 30 * H, sites: [site(NOW - 25 * H)] }, NOW).ok).toBe(false));
  it('esattamente 24 ore dall\'ultimo successo: ancora ok', () =>
    expect(healthReport({ bootedAt: NOW - 30 * H, sites: [site(NOW - 24 * H)] }, NOW).ok).toBe(true));
  it('mai riuscito ma avviato da poco: ok', () =>
    expect(healthReport({ bootedAt: NOW - H, sites: [site(null)] }, NOW).ok).toBe(true));
  it('mai riuscito da più di 24 ore: ko, e il sito è marcato stale', () => {
    const r = healthReport({ bootedAt: NOW - 25 * H, sites: [site(null)] }, NOW);
    expect(r.ok).toBe(false);
    expect(r.sites[0].stale).toBe(true);
  });
});

describe('publicHealth', () => {
  it('non espone lastError', () => {
    const r = publicHealth(healthReport({ bootedAt: NOW - H, sites: [{ ...site(NOW - H), lastError: 'boom' }] }, NOW));
    expect(r).toEqual({ ok: true, sites: [{ id: 'fr', lastSuccess: NOW - H, countries: 2, stale: false }] });
  });
});
