import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const h = await headers();
  return NextResponse.json({
    cfIpCountry: h.get('cf-ipcountry'),
    headerNames: [...h.keys()].sort(),
  });
}
