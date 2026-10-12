import { cookies, headers } from 'next/headers';
import { store } from './data';
import { detectCountry } from './detect-country';
import { pickLang } from './lang';
import { sanitizeSrc } from './utm';
import { buildPageModel } from './view-model';

export const COUNTRY_COOKIE = 'qdp_country';

type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function loadPageModel(opts: { path?: string; searchParams: SearchParams }) {
  const h = await headers();
  const c = await cookies();
  const country = detectCountry({
    path: opts.path,
    query: first(opts.searchParams.c),
    cookie: c.get(COUNTRY_COOKIE)?.value,
    header: h.get('cf-ipcountry'),
  });
  const lang = pickLang(country, h.get('accept-language'));
  return buildPageModel({ country, lang, data: store.get(), src: sanitizeSrc(first(opts.searchParams.src)) });
}
