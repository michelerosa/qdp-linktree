import { NextResponse } from 'next/server';
import { store } from '@/lib/data';
import { healthReport, publicHealth } from '@/lib/health';

export const dynamic = 'force-dynamic';

export function GET() {
  store.get(); // avvia un refresh se i dati sono vecchi
  const report = healthReport(store.getStatus(), Date.now());
  return NextResponse.json(publicHealth(report), {
    status: report.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
