import { normalizeCountry, OTHER } from './country-code';
import { MESSAGES, type Messages } from './i18n';
import type { Lang } from './lang';
import { resolveLinks, type CountryData, type LinkKind, type ResolvedLink } from './resolve';
import { SHOWCASES } from './sites';
import { withUtm } from './utm';

export interface PillModel {
  id: string;
  kind: LinkKind;
  href: string;
  title: string;
  tag: string;
}

export interface CountryOption {
  value: string;
  label: string;
}

export interface PageModel {
  lang: Lang;
  t: Messages;
  pills: PillModel[];
  countryLabel: string;
  currentValue: string;
  options: CountryOption[];
  src: string;
}

function pillTitle(l: ResolvedLink, t: Messages): string {
  if (l.kind === 'showcase') return l.brand!;
  if (l.kind === 'fallback') return t.titles.fallback;
  return t.titles[l.titleKey!];
}

export function buildPageModel(input: { country: string; lang: Lang; data: CountryData; src: string }): PageModel {
  const { country, lang, data, src } = input;
  const t = MESSAGES[lang];
  const names = new Intl.DisplayNames([lang], { type: 'region' });
  const label = (c: string) => (c === OTHER ? t.otherCountry : names.of(c) ?? c);

  const pills = resolveLinks(country, data).map((l) => ({
    id: l.id,
    kind: l.kind,
    href: withUtm(l.url, { src, country }),
    title: pillTitle(l, t),
    tag: t.tags[l.kind],
  }));

  // solo codici paese validi: dai dati degli shop può arrivare qualunque cosa (XX, uk, EU…)
  const served = new Set<string>(
    [...Object.values(data).flat(), ...SHOWCASES.flatMap((s) => s.countries)].filter(
      (c) => c !== OTHER && normalizeCountry(c) === c,
    ),
  );
  const options = [...served]
    .map((c) => ({ value: c, label: label(c) }))
    .sort((a, b) => a.label.localeCompare(b.label, lang));
  options.push({ value: OTHER, label: t.otherCountry });

  return {
    lang,
    t,
    pills,
    countryLabel: label(country),
    currentValue: served.has(country) ? country : OTHER,
    options,
    src,
  };
}
