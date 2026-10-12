import { NextResponse, type NextRequest } from 'next/server';
import { normalizeCountry } from '@/lib/country-code';
import { COUNTRY_COOKIE } from '@/lib/request-page';
import { sanitizeSrc } from '@/lib/utm';

export function GET(req: NextRequest) {
  const country = normalizeCountry(req.nextUrl.searchParams.get('c'));
  const src = req.nextUrl.searchParams.get('src');
  // Location relativo: dietro il proxy di Sevalla req.url può avere l'host interno
  const clean = sanitizeSrc(src);
  const location = clean !== 'instagram' ? `/?src=${encodeURIComponent(clean)}` : '/';
  const res = new NextResponse(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
  if (country) {
    res.cookies.set(COUNTRY_COOKIE, country, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    });
  }
  return res;
}
