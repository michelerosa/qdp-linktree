import { OTHER } from './country-code';

export function sanitizeSrc(raw: string | null | undefined): string {
  const s = (raw ?? '').trim().toLowerCase();
  return /^[a-z0-9_-]{1,32}$/.test(s) ? s : 'instagram';
}

export function withUtm(url: string, opts: { src: string; country: string }): string {
  const u = new URL(url);
  u.searchParams.set('utm_source', opts.src);
  u.searchParams.set('utm_medium', 'social');
  u.searchParams.set('utm_campaign', 'linktree');
  u.searchParams.set('utm_content', opts.country === OTHER ? 'other' : opts.country.toLowerCase());
  return u.toString();
}

// URL di /set-country: `src` compare solo se diverso dal default (URL più pulito)
export function setCountryHref(country: string, rawSrc: string | null | undefined): string {
  const params = new URLSearchParams({ c: country.toLowerCase() });
  const src = sanitizeSrc(rawSrc);
  if (src !== 'instagram') params.set('src', src);
  return `/set-country?${params}`;
}
