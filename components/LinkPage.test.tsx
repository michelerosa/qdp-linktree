import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LinkPage } from './LinkPage';
import { buildPageModel } from '@/lib/view-model';

describe('LinkPage', () => {
  const model = buildPageModel({
    country: 'IT',
    lang: 'it',
    data: { it: ['IT'], casa: ['IT'], frozen: ['IT'] },
    src: 'instagram',
  });
  const html = renderToStaticMarkup(<LinkPage model={model} />);

  it('imposta la lingua', () => expect(html).toContain('lang="it"'));
  it('rende una pill per sito con link e etichetta', () => {
    expect(html).toContain('href="https://quellidellapizza.it/?utm_source=instagram');
    expect(html).toContain('Shop professionisti');
    expect(html).toContain('Surgelato');
  });
  it('rende i 5 social con aria-label', () => {
    for (const label of ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'LinkedIn']) {
      expect(html).toContain(`aria-label="${label}"`);
    }
  });
  it('rende il selettore del paese', () => {
    expect(html).toContain('<select');
    expect(html).toContain('cambia paese');
  });
});
