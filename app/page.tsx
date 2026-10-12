import { LinkPage } from '@/components/LinkPage';
import { loadPageModel } from '@/lib/request-page';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const model = await loadPageModel({ searchParams: await searchParams });
  return <LinkPage model={model} />;
}
