import { notFound, permanentRedirect } from 'next/navigation';
import { LinkPage } from '@/components/LinkPage';
import { normalizeCountry } from '@/lib/country-code';
import { loadPageModel } from '@/lib/request-page';

export const dynamic = 'force-dynamic';

export default async function CountryPage({
  params,
  searchParams,
}: {
  params: Promise<{ country: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { country } = await params;
  const sp = await searchParams;
  if (!/^[a-zA-Z]{2}$/.test(country) || !normalizeCountry(country)) notFound();
  if (country !== country.toLowerCase()) {
    // maiuscole/miste: redirect permanente al path minuscolo, query string inclusa
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) qs.append(k, x);
    permanentRedirect(`/${country.toLowerCase()}${qs.size ? `?${qs}` : ''}`);
  }
  const model = await loadPageModel({ path: country, searchParams: sp });
  return <LinkPage model={model} />;
}
