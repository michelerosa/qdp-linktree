# qdp.link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Regola di Michele:** MAI fare commit o push in autonomia. Gli step «Checkpoint commit» propongono il messaggio e si fermano finché Michele non dice di committare.

**Goal:** Pagina link geolocalizzata su `qdp.link` che mostra social e siti di Quelli della Pizza in base alla nazione del visitatore, con le nazioni lette dal vivo da WooCommerce.

**Architecture:** App Next.js 15 (App Router) su Sevalla, renderizzata lato server per ogni richiesta. Il paese arriva da percorso, `?c=`, cookie o header `CF-IPCountry`. Uno store in memoria tiene le nazioni di ogni shop, lette da `/wc/v3/settings/general` e aggiornate in stile stale-while-revalidate ogni ora, con fallback su uno snapshot JSON. Tutta la logica sta in funzioni pure in `lib/`, testate con Vitest. Le pagine e le route sono sottili.

**Tech Stack:** Next.js 15.5, React 19.1, TypeScript 5, Vitest 2, tsx (script), CSS semplice (niente Tailwind), font Archivo via `next/font/google`, Docker su Sevalla.

**Spec:** `docs/plans/2026-10-12-qdp-link-design.md`

---

## Mappa dei file

| File | Responsabilità |
|---|---|
| `lib/country-code.ts` | Normalizza e valida i codici paese; `OTHER = 'ZZ'` |
| `lib/sites.ts` | Config: shop (ruolo, priorità, URL, env), vetrine, fallback, social |
| `lib/wc-settings.ts` | Parsing della «Località di vendita» WooCommerce |
| `lib/resolve.ts` | Funzione pura paese + dati → link da mostrare |
| `lib/detect-country.ts` | Ordine di decisione del paese |
| `lib/lang.ts` | Scelta della lingua |
| `lib/i18n.ts` | Testi nelle 5 lingue |
| `lib/utm.ts` | Parametri UTM e sanificazione di `src` |
| `lib/store.ts` | Store in memoria con refresh e stato per sito |
| `lib/health.ts` | Calcolo del report di `/health` |
| `lib/wc.ts` | Chiamata HTTP a WooCommerce |
| `lib/data.ts` | Singleton dello store, collegato a `wc.ts` e allo snapshot |
| `lib/view-model.ts` | Costruisce i props della pagina |
| `lib/request-page.ts` | Legge header e cookie della richiesta e produce il model |
| `components/LinkPage.tsx` | Markup della pagina (server) |
| `components/CountrySelect.tsx` | Selettore del paese (client) |
| `components/SocialIcons.tsx` | Le 5 icone social inline |
| `app/layout.tsx`, `app/globals.css` | Layout, font, metadata |
| `app/page.tsx`, `app/[country]/page.tsx` | Le due pagine |
| `app/set-country/route.ts` | Salva il cookie e reindirizza |
| `app/health/route.ts` | Monitoraggio |
| `app/opengraph-image.tsx`, `app/icon.svg`, `public/logo.svg` | Anteprima social e logo |
| `data/snapshot.json` | Rete di sicurezza per l'avvio a freddo |
| `scripts/snapshot.ts` | Rigenera lo snapshot |

---

### Task 0: Scaffold del progetto

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`, `Dockerfile`, `.dockerignore`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Crea `package.json`**

```json
{
  "name": "qdp-linktree",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "snapshot": "tsx --env-file=.env.local scripts/snapshot.ts"
  }
}
```

- [ ] **Step 2: Installa le dipendenze**

Run:
```bash
npm install next@15.5.9 react@19.1.0 react-dom@19.1.0
npm install -D typescript@5 @types/node@22 @types/react@19 @types/react-dom@19 vitest@2.1.9 tsx@4
```
Expected: `node_modules/` creato, nessun errore.

- [ ] **Step 3: Crea `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Crea `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
};

export default nextConfig;
```

- [ ] **Step 5: Crea `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'components/**/*.test.tsx'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
```

- [ ] **Step 6: Crea `.gitignore`, `.env.example`, `.dockerignore`**

`.gitignore`:
```
node_modules/
.next/
.env*.local
.env
*.tsbuildinfo
next-env.d.ts
.DS_Store
```

`.env.example` (chiavi REST WooCommerce in **sola lettura**, una coppia per shop):
```
WC_IT_KEY=
WC_IT_SECRET=
WC_FR_KEY=
WC_FR_SECRET=
WC_DE_KEY=
WC_DE_SECRET=
WC_ES_KEY=
WC_ES_SECRET=
WC_EU_KEY=
WC_EU_SECRET=
WC_CASA_KEY=
WC_CASA_SECRET=
WC_FROZEN_KEY=
WC_FROZEN_SECRET=
```

`.dockerignore`:
```
node_modules
.next
.git
.env*
docs
```

- [ ] **Step 7: Layout e pagina minimi**

`app/globals.css`:
```css
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; background: #FAFAF8; color: #1d1d1b; }
```

`app/layout.tsx`:
```tsx
import type { ReactNode } from 'react';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx`:
```tsx
export default function Home() {
  return <main>qdp.link</main>;
}
```

- [ ] **Step 8: `Dockerfile` (come qdp-hub, senza Prisma)**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
```

- [ ] **Step 9: Verifica build e test runner**

Run: `mkdir -p public && npm run build && npx vitest run --passWithNoTests`
Expected: build OK, `No test files found` con exit 0.

- [ ] **Step 10: Checkpoint commit**

Messaggio proposto: `chore: scaffold Next.js app for qdp.link`. Fermati e chiedi a Michele.

---

### Task 1: Verifica che Sevalla passi `CF-IPCountry` (GATE)

Tutto il resto dipende da questo header. Se manca ci si ferma e si decide su MaxMind GeoLite2.

**Files:**
- Create: `app/debug/headers/route.ts` (temporanea, si rimuove nel Task 15)

- [ ] **Step 1: Crea la route di diagnostica**

```ts
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
```

- [ ] **Step 2: Prova in locale**

Run: `npm run dev` e, in un altro terminale, `curl -s -H "CF-IPCountry: FR" localhost:3000/debug/headers`
Expected: `{"cfIpCountry":"FR",...}`

- [ ] **Step 3: Repo GitHub e app su Sevalla (azioni di Michele)**

Con l'ok di Michele: crea il repo GitHub, fai commit e push di `main`. Su Sevalla:
1. Nuova app dal repo, build da `Dockerfile`, porta 8080.
2. Auto-deploy da `main` attivo e **deploy paths ignorati** impostati subito: `["docs/**", "*.md", ".claude/**"]` (Settings → Deploy paths, modalità Ignore).

- [ ] **Step 4: Verifica sull'URL Sevalla**

Run: `curl -s https://<app>.sevalla.app/debug/headers`
Expected: `cfIpCountry` valorizzato (es. `"IT"`).

**Se è `null`:** STOP. Riporta a Michele la lista `headerNames` (un header geo alternativo potrebbe esserci già) e decidete se passare a MaxMind GeoLite2. Non andare avanti col Task 2.

---

### Task 2: Codici paese

**Files:**
- Create: `lib/country-code.ts`
- Test: `lib/country-code.test.ts`

- [ ] **Step 1: Test che fallisce**

```ts
import { describe, expect, it } from 'vitest';
import { normalizeCountry, OTHER } from './country-code';

describe('normalizeCountry', () => {
  it('normalizza maiuscole e spazi', () => {
    expect(normalizeCountry('fr')).toBe('FR');
    expect(normalizeCountry(' de ')).toBe('DE');
  });
  it('accetta ZZ come «altro paese»', () => {
    expect(normalizeCountry('zz')).toBe(OTHER);
  });
  it('scarta valori non validi o speciali di Cloudflare', () => {
    for (const v of ['XX', 'T1', 'EU', 'abc', '', '1', null, undefined]) {
      expect(normalizeCountry(v)).toBeNull();
    }
  });
});
```

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run lib/country-code.test.ts`
Expected: FAIL, `Cannot find module './country-code'`

- [ ] **Step 3: Implementazione**

```ts
/** Codice sentinella per «Altro paese»: nessuno shop lo serve, quindi porta a .com. */
export const OTHER = 'ZZ';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });

/**
 * Codice ISO 3166-1 alpha-2 in maiuscolo, OTHER, oppure null se non valido.
 * Scarta XX (sconosciuto) ed EU, che Cloudflare può mandare, e T1 (Tor), che la regex esclude.
 */
export function normalizeCountry(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (code === OTHER) return OTHER;
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'EU') return null;
  return regionNames.of(code) ? code : null;
}
```

- [ ] **Step 4: Verifica che passi**

Run: `npx vitest run lib/country-code.test.ts`
Expected: PASS (3 test)

- [ ] **Step 5: Checkpoint commit**: `feat: country code normalization`

---

### Task 3: Config dei siti e parsing di WooCommerce

**Files:**
- Create: `lib/sites.ts`, `lib/wc-settings.ts`
- Test: `lib/wc-settings.test.ts`

- [ ] **Step 1: Crea `lib/sites.ts` (solo config, senza test)**

```ts
export type ShopRole = 'fresh' | 'home' | 'frozen';
export type TitleKey = 'b2b' | 'shop' | 'home' | 'frozen';

export interface ShopSite {
  id: string;
  role: ShopRole;
  /** 1 vince su 2 quando due shop dello stesso ruolo servono la stessa nazione. */
  priority: number;
  url: string;
  /** Prefisso delle env: WC_<envKey>_KEY / WC_<envKey>_SECRET */
  envKey: string;
  titleKey: TitleKey;
}

export interface ShowcaseSite {
  id: string;
  url: string;
  /** Le vetrine non hanno WooCommerce: nazioni fisse. */
  countries: string[];
  brand: string;
}

export const SHOPS: ShopSite[] = [
  { id: 'it', role: 'fresh', priority: 1, url: 'https://quellidellapizza.it', envKey: 'IT', titleKey: 'b2b' },
  { id: 'fr', role: 'fresh', priority: 1, url: 'https://quellidellapizza.fr', envKey: 'FR', titleKey: 'shop' },
  { id: 'de', role: 'fresh', priority: 1, url: 'https://quellidellapizza.de', envKey: 'DE', titleKey: 'shop' },
  { id: 'es', role: 'fresh', priority: 1, url: 'https://quellidellapizza.es', envKey: 'ES', titleKey: 'shop' },
  { id: 'eu', role: 'fresh', priority: 2, url: 'https://quellidellapizza.eu', envKey: 'EU', titleKey: 'shop' },
  { id: 'casa', role: 'home', priority: 1, url: 'https://casa.quellidellapizza.it', envKey: 'CASA', titleKey: 'home' },
  { id: 'frozen', role: 'frozen', priority: 1, url: 'https://frozen.quellidellapizza.com', envKey: 'FROZEN', titleKey: 'frozen' },
];

export const SHOWCASES: ShowcaseSite[] = [
  { id: 'pizzafellas', url: 'https://pizzafellas.com', countries: ['US'], brand: 'Pizza Fellas' },
  { id: 'inmeddegen', url: 'https://inmeddegen.se', countries: ['SE'], brand: 'In Med Degen' },
];

export const FALLBACK = { id: 'com', url: 'https://quellidellapizza.com' };

export const SOCIALS = [
  { id: 'instagram', label: 'Instagram', url: 'https://instagram.com/quellidellapizza/' },
  { id: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@quellidellapizza' },
  { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/QuelliDellaPizza' },
  { id: 'facebook', label: 'Facebook', url: 'https://facebook.com/quellidellapizza' },
  { id: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/company/quellidellapizza/' },
] as const;

export type SocialId = (typeof SOCIALS)[number]['id'];
```

- [ ] **Step 2: Test che fallisce**

```ts
import { describe, expect, it } from 'vitest';
import { parseAllowedCountries, type WcSetting } from './wc-settings';

const OPTIONS = { IT: 'Italia', FR: 'Francia', DE: 'Germania', ES: 'Spagna' };

function settings(mode: string, specific: string[] = [], except: string[] = []): WcSetting[] {
  return [
    { id: 'woocommerce_allowed_countries', value: mode },
    { id: 'woocommerce_specific_allowed_countries', value: specific, options: OPTIONS },
    { id: 'woocommerce_all_except_countries', value: except, options: OPTIONS },
  ];
}

describe('parseAllowedCountries', () => {
  it('specific: usa la lista specifica', () => {
    expect(parseAllowedCountries(settings('specific', ['FR', 'DE']))).toEqual({ mode: 'specific', codes: ['FR', 'DE'] });
  });
  it('all_except: tutte le nazioni tranne le escluse', () => {
    expect(parseAllowedCountries(settings('all_except', [], ['FR']))).toEqual({ mode: 'all_except', codes: ['IT', 'DE', 'ES'] });
  });
  it('all: nessuna nazione (non deve coprire il mondo)', () => {
    expect(parseAllowedCountries(settings('all'))).toEqual({ mode: 'all', codes: [] });
  });
  it('setting assente: trattato come all', () => {
    expect(parseAllowedCountries([])).toEqual({ mode: 'all', codes: [] });
  });
  it('ignora valori non stringa', () => {
    expect(parseAllowedCountries(settings('specific', ['FR', 3 as unknown as string]))).toEqual({ mode: 'specific', codes: ['FR'] });
  });
});
```

- [ ] **Step 3: Verifica che fallisca**

Run: `npx vitest run lib/wc-settings.test.ts`
Expected: FAIL, `Cannot find module './wc-settings'`

- [ ] **Step 4: Implementazione**

```ts
export interface WcSetting {
  id: string;
  value: unknown;
  options?: Record<string, string>;
}

export type AllowedMode = 'specific' | 'all_except' | 'all';

const asList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/**
 * «Località di vendita» di WooCommerce → codici paese.
 * Con «vendi a tutte» ritorna [] di proposito: uno shop non deve coprire il mondo
 * intero (altrimenti .com non comparirebbe mai). Il chiamante lo segnala nel log.
 */
export function parseAllowedCountries(settings: WcSetting[]): { mode: AllowedMode; codes: string[] } {
  const get = (id: string) => settings.find((s) => s.id === id);
  const mode = get('woocommerce_allowed_countries')?.value;
  const specific = get('woocommerce_specific_allowed_countries');
  const except = get('woocommerce_all_except_countries');

  if (mode === 'specific') return { mode, codes: asList(specific?.value) };
  if (mode === 'all_except') {
    const excluded = new Set(asList(except?.value));
    const all = Object.keys(specific?.options ?? except?.options ?? {});
    return { mode, codes: all.filter((c) => !excluded.has(c)) };
  }
  return { mode: 'all', codes: [] };
}
```

- [ ] **Step 5: Verifica che passi**

Run: `npx vitest run lib/wc-settings.test.ts`
Expected: PASS (5 test)

- [ ] **Step 6: Checkpoint commit**: `feat: sites config and WooCommerce allowed countries parser`

---

### Task 4: Regola di scelta dei siti

**Files:**
- Create: `lib/resolve.ts`
- Test: `lib/resolve.test.ts`

- [ ] **Step 1: Test che fallisce**

```ts
import { describe, expect, it } from 'vitest';
import { resolveLinks, type CountryData } from './resolve';

const DATA: CountryData = {
  it: ['IT', 'SM'],
  fr: ['FR', 'MC'],
  de: ['DE', 'AT'],
  es: ['ES'],
  eu: ['BE', 'NL', 'PL'],
  casa: ['IT'],
  frozen: ['IT', 'FR', 'DE', 'PL'],
};

const ids = (country: string, data: CountryData = DATA) => resolveLinks(country, data).map((l) => l.id);

describe('resolveLinks', () => {
  it('IT: B2B, CASA e Frozen in questo ordine', () => expect(ids('IT')).toEqual(['it', 'casa', 'frozen']));
  it('FR: .fr e Frozen', () => expect(ids('FR')).toEqual(['fr', 'frozen']));
  it('AT: .de', () => expect(ids('AT')).toEqual(['de']));
  it('PL: .eu e Frozen', () => expect(ids('PL')).toEqual(['eu', 'frozen']));
  it('BE: solo .eu', () => expect(ids('BE')).toEqual(['eu']));
  it('US: vetrina pizzafellas', () => expect(ids('US')).toEqual(['pizzafellas']));
  it('SE: vetrina inmeddegen', () => expect(ids('SE')).toEqual(['inmeddegen']));
  it('SE servita anche da .eu: shop e vetrina insieme', () =>
    expect(ids('SE', { ...DATA, eu: [...DATA.eu, 'SE'] })).toEqual(['eu', 'inmeddegen']));
  it('BR: ripiego .com', () => expect(ids('BR')).toEqual(['com']));
  it('ZZ (altro paese): ripiego .com', () => expect(ids('ZZ')).toEqual(['com']));
  it('sovrapposizione: se .eu serve FR vince .fr (priorità 1)', () =>
    expect(ids('FR', { ...DATA, eu: [...DATA.eu, 'FR'] })).toEqual(['fr', 'frozen']));
  it('shop senza dati: semplicemente assente', () =>
    expect(ids('IT', { it: ['IT'], casa: ['IT'] })).toEqual(['it', 'casa']));
  it('porta kind, url e titleKey o brand', () => {
    expect(resolveLinks('IT', DATA)[0]).toEqual({ id: 'it', kind: 'fresh', url: 'https://quellidellapizza.it', titleKey: 'b2b' });
    expect(resolveLinks('US', DATA)[0]).toEqual({ id: 'pizzafellas', kind: 'showcase', url: 'https://pizzafellas.com', brand: 'Pizza Fellas' });
    expect(resolveLinks('BR', DATA)[0]).toEqual({ id: 'com', kind: 'fallback', url: 'https://quellidellapizza.com' });
  });
});
```

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run lib/resolve.test.ts`
Expected: FAIL, `Cannot find module './resolve'`

- [ ] **Step 3: Implementazione**

```ts
import { FALLBACK, SHOPS, SHOWCASES, type ShopRole, type ShopSite, type ShowcaseSite, type TitleKey } from './sites';

/** id dello shop → codici paese serviti */
export type CountryData = Record<string, string[]>;

export type LinkKind = ShopRole | 'showcase' | 'fallback';

export interface ResolvedLink {
  id: string;
  kind: LinkKind;
  url: string;
  titleKey?: TitleKey;
  brand?: string;
}

const ROLE_ORDER: ShopRole[] = ['fresh', 'home', 'frozen'];

/**
 * Per ogni ruolo shop, il sito a priorità più alta che serve il paese; poi le vetrine
 * del paese (sempre, anche se c'è uno shop); se non c'è niente, quellidellapizza.com.
 */
export function resolveLinks(
  country: string,
  data: CountryData,
  shops: ShopSite[] = SHOPS,
  showcases: ShowcaseSite[] = SHOWCASES,
): ResolvedLink[] {
  const links: ResolvedLink[] = [];

  for (const role of ROLE_ORDER) {
    const best = shops
      .filter((s) => s.role === role && (data[s.id] ?? []).includes(country))
      .sort((a, b) => a.priority - b.priority)[0];
    if (best) links.push({ id: best.id, kind: role, url: best.url, titleKey: best.titleKey });
  }

  for (const sc of showcases) {
    if (sc.countries.includes(country)) links.push({ id: sc.id, kind: 'showcase', url: sc.url, brand: sc.brand });
  }

  if (links.length === 0) links.push({ id: FALLBACK.id, kind: 'fallback', url: FALLBACK.url });
  return links;
}
```

- [ ] **Step 4: Verifica che passi**

Run: `npx vitest run lib/resolve.test.ts`
Expected: PASS (13 test)

- [ ] **Step 5: Checkpoint commit**: `feat: site resolution rule by country`

---

### Task 5: Ordine di decisione del paese

**Files:**
- Create: `lib/detect-country.ts`
- Test: `lib/detect-country.test.ts`

- [ ] **Step 1: Test che fallisce**

```ts
import { describe, expect, it } from 'vitest';
import { detectCountry } from './detect-country';

describe('detectCountry', () => {
  it('percorso vince su tutto', () =>
    expect(detectCountry({ path: 'fr', query: 'de', cookie: 'ES', header: 'IT' })).toBe('FR'));
  it('poi ?c=', () => expect(detectCountry({ query: 'de', cookie: 'ES', header: 'IT' })).toBe('DE'));
  it('poi cookie', () => expect(detectCountry({ cookie: 'ES', header: 'IT' })).toBe('ES'));
  it('poi header geo', () => expect(detectCountry({ header: 'IT' })).toBe('IT'));
  it('valori non validi passano al livello successivo', () =>
    expect(detectCountry({ query: 'xyz', cookie: 'XX', header: 'AT' })).toBe('AT'));
  it('cookie «altro paese» ferma la catena', () => expect(detectCountry({ cookie: 'ZZ', header: 'IT' })).toBe('ZZ'));
  it('nessun dato o header XX/T1: altro paese', () => {
    expect(detectCountry({})).toBe('ZZ');
    expect(detectCountry({ header: 'XX' })).toBe('ZZ');
    expect(detectCountry({ header: 'T1' })).toBe('ZZ');
  });
});
```

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run lib/detect-country.test.ts`
Expected: FAIL, `Cannot find module './detect-country'`

- [ ] **Step 3: Implementazione**

```ts
import { normalizeCountry, OTHER } from './country-code';

export interface CountrySources {
  path?: string | null;
  query?: string | null;
  cookie?: string | null;
  header?: string | null;
}

/** Percorso → ?c= → cookie → CF-IPCountry → «altro paese». */
export function detectCountry(src: CountrySources): string {
  return (
    normalizeCountry(src.path) ??
    normalizeCountry(src.query) ??
    normalizeCountry(src.cookie) ??
    normalizeCountry(src.header) ??
    OTHER
  );
}
```

- [ ] **Step 4: Verifica che passi**

Run: `npx vitest run lib/detect-country.test.ts`
Expected: PASS (7 test)

- [ ] **Step 5: Checkpoint commit**: `feat: country detection order`

---

### Task 6: Lingua e testi

**Files:**
- Create: `lib/lang.ts`, `lib/i18n.ts`
- Test: `lib/lang.test.ts`

- [ ] **Step 1: Test che fallisce**

```ts
import { describe, expect, it } from 'vitest';
import { pickLang } from './lang';
import { MESSAGES } from './i18n';
import { LANGS } from './lang';

describe('pickLang', () => {
  it('lingua del paese se supportata', () => {
    expect(pickLang('IT', null)).toBe('it');
    expect(pickLang('AT', 'en-US')).toBe('de');
    expect(pickLang('ES', null)).toBe('es');
  });
  it('altrimenti la prima lingua supportata del browser, per peso q', () => {
    expect(pickLang('BE', 'fr-BE,fr;q=0.9,en;q=0.8')).toBe('fr');
    expect(pickLang('CH', 'en;q=0.5,de;q=0.9')).toBe('de');
  });
  it('altrimenti inglese', () => {
    expect(pickLang('SE', 'sv-SE,sv;q=0.9')).toBe('en');
    expect(pickLang('ZZ', null)).toBe('en');
  });
});

describe('MESSAGES', () => {
  it('tutte le lingue hanno le stesse chiavi', () => {
    const shape = (o: object): string[] =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? shape(v).map((s) => `${k}.${s}`) : [k])).sort();
    for (const lang of LANGS) expect(shape(MESSAGES[lang])).toEqual(shape(MESSAGES.en));
  });
});
```

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run lib/lang.test.ts`
Expected: FAIL, `Cannot find module './lang'`

- [ ] **Step 3: Implementa `lib/lang.ts`**

```ts
export const LANGS = ['it', 'fr', 'de', 'es', 'en'] as const;
export type Lang = (typeof LANGS)[number];

const COUNTRY_LANG: Record<string, Lang> = {
  IT: 'it', SM: 'it', VA: 'it',
  FR: 'fr', MC: 'fr',
  DE: 'de', AT: 'de', LI: 'de',
  ES: 'es', AD: 'es',
  US: 'en', GB: 'en', IE: 'en', AU: 'en', NZ: 'en',
};

const isLang = (v: string): v is Lang => (LANGS as readonly string[]).includes(v);

/** Lingua del paese → prima lingua supportata di Accept-Language (per q) → inglese. */
export function pickLang(country: string, acceptLanguage: string | null): Lang {
  const byCountry = COUNTRY_LANG[country];
  if (byCountry) return byCountry;

  const prefs = (acceptLanguage ?? '')
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { lang: tag.split('-')[0].toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((p) => p.lang && p.q > 0)
    .sort((a, b) => b.q - a.q);

  const found = prefs.find((p) => isLang(p.lang));
  return found ? (found.lang as Lang) : 'en';
}
```

- [ ] **Step 4: Implementa `lib/i18n.ts`**

```ts
import type { Lang } from './lang';
import type { TitleKey } from './sites';

export interface Messages {
  titles: Record<TitleKey | 'fallback', string>;
  tags: { fresh: string; home: string; frozen: string; catalogue: string };
  changeCountry: string;
  otherCountry: string;
  description: string;
}

export const MESSAGES: Record<Lang, Messages> = {
  it: {
    titles: { b2b: 'Shop professionisti', shop: 'Shop online', home: 'Shop privati', frozen: 'Linea surgelata', fallback: 'Catalogo e contatti' },
    tags: { fresh: 'Fresco', home: 'Casa', frozen: 'Surgelato', catalogue: 'Catalogo' },
    changeCountry: 'cambia paese',
    otherCountry: 'Altro paese',
    description: 'I siti e i social di Quelli della Pizza',
  },
  fr: {
    titles: { b2b: 'Boutique professionnels', shop: 'Boutique en ligne', home: 'Boutique particuliers', frozen: 'Gamme surgelée', fallback: 'Catalogue et contact' },
    tags: { fresh: 'Frais', home: 'Maison', frozen: 'Surgelé', catalogue: 'Catalogue' },
    changeCountry: 'changer de pays',
    otherCountry: 'Autre pays',
    description: 'Les sites et réseaux sociaux de Quelli della Pizza',
  },
  de: {
    titles: { b2b: 'Shop für Profis', shop: 'Online-Shop', home: 'Shop für Privatkunden', frozen: 'Tiefkühl-Sortiment', fallback: 'Katalog & Kontakt' },
    tags: { fresh: 'Frisch', home: 'Zuhause', frozen: 'Tiefgekühlt', catalogue: 'Katalog' },
    changeCountry: 'Land ändern',
    otherCountry: 'Anderes Land',
    description: 'Websites und Social Media von Quelli della Pizza',
  },
  es: {
    titles: { b2b: 'Tienda profesional', shop: 'Tienda online', home: 'Tienda particulares', frozen: 'Gama congelada', fallback: 'Catálogo y contacto' },
    tags: { fresh: 'Fresco', home: 'Casa', frozen: 'Congelado', catalogue: 'Catálogo' },
    changeCountry: 'cambiar país',
    otherCountry: 'Otro país',
    description: 'Las webs y redes sociales de Quelli della Pizza',
  },
  en: {
    titles: { b2b: 'Shop for professionals', shop: 'Online shop', home: 'Shop for home', frozen: 'Frozen range', fallback: 'Catalogue & contact' },
    tags: { fresh: 'Fresh', home: 'Home', frozen: 'Frozen', catalogue: 'Catalogue' },
    changeCountry: 'change country',
    otherCountry: 'Other country',
    description: 'Quelli della Pizza websites and socials',
  },
};
```

- [ ] **Step 5: Verifica che passi**

Run: `npx vitest run lib/lang.test.ts`
Expected: PASS (4 test)

- [ ] **Step 6: Checkpoint commit**: `feat: language selection and translations`

---

### Task 7: UTM

**Files:**
- Create: `lib/utm.ts`
- Test: `lib/utm.test.ts`

- [ ] **Step 1: Test che fallisce**

```ts
import { describe, expect, it } from 'vitest';
import { sanitizeSrc, withUtm } from './utm';

describe('sanitizeSrc', () => {
  it('default instagram', () => {
    expect(sanitizeSrc(null)).toBe('instagram');
    expect(sanitizeSrc('')).toBe('instagram');
  });
  it('accetta slug semplici in minuscolo', () => expect(sanitizeSrc('TikTok')).toBe('tiktok'));
  it('scarta valori sporchi', () => expect(sanitizeSrc('<script>')).toBe('instagram'));
});

describe('withUtm', () => {
  it('aggiunge i parametri', () => {
    expect(withUtm('https://quellidellapizza.fr', { src: 'instagram', country: 'FR' })).toBe(
      'https://quellidellapizza.fr/?utm_source=instagram&utm_medium=social&utm_campaign=linktree&utm_content=fr',
    );
  });
  it('altro paese diventa other', () => {
    expect(withUtm('https://quellidellapizza.com', { src: 'tiktok', country: 'ZZ' })).toContain('utm_content=other');
  });
});
```

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run lib/utm.test.ts`
Expected: FAIL, `Cannot find module './utm'`

- [ ] **Step 3: Implementazione**

```ts
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
```

- [ ] **Step 4: Verifica che passi**

Run: `npx vitest run lib/utm.test.ts`
Expected: PASS (5 test)

- [ ] **Step 5: Checkpoint commit**: `feat: UTM builder`

---

### Task 8: Store in memoria con refresh

**Files:**
- Create: `lib/store.ts`
- Test: `lib/store.test.ts`

- [ ] **Step 1: Test che fallisce**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createStore } from './store';

const HOUR = 3_600_000;

function setup(fetcher: (id: string) => Promise<string[]>) {
  let t = 1_000_000;
  const store = createStore({
    shopIds: ['fr', 'eu'],
    fetcher,
    snapshot: { fr: ['FR'], eu: ['BE'] },
    now: () => t,
  });
  return { store, advance: (ms: number) => { t += ms; } };
}

describe('createStore', () => {
  it('risponde subito con lo snapshot e avvia il refresh', async () => {
    const fetcher = vi.fn(async (id: string) => (id === 'fr' ? ['FR', 'MC'] : ['BE', 'NL']));
    const { store } = setup(fetcher);
    expect(store.get()).toEqual({ fr: ['FR'], eu: ['BE'] });
    await store.refresh();
    expect(store.get()).toEqual({ fr: ['FR', 'MC'], eu: ['BE', 'NL'] });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('se uno shop fallisce tiene la sua ultima versione buona', async () => {
    const fetcher = vi.fn(async (id: string) => {
      if (id === 'eu') throw new Error('HTTP 500');
      return ['FR', 'MC'];
    });
    const { store } = setup(fetcher);
    await store.refresh();
    expect(store.get()).toEqual({ fr: ['FR', 'MC'], eu: ['BE'] });
    const eu = store.getStatus().sites.find((s) => s.id === 'eu')!;
    expect(eu.lastError).toBe('HTTP 500');
    expect(eu.lastSuccess).toBeNull();
  });

  it('non rilegge prima di un\'ora, rilegge dopo', async () => {
    const fetcher = vi.fn(async () => ['FR']);
    const { store, advance } = setup(fetcher);
    store.get();
    await store.refresh();
    const calls = fetcher.mock.calls.length;
    advance(HOUR - 1);
    store.get();
    expect(fetcher.mock.calls.length).toBe(calls);
    advance(1);
    store.get();
    await store.refresh();
    expect(fetcher.mock.calls.length).toBeGreaterThan(calls);
  });

  it('refresh concorrenti condividono la stessa lettura', async () => {
    const fetcher = vi.fn(async () => ['FR']);
    const { store } = setup(fetcher);
    await Promise.all([store.refresh(), store.refresh(), store.refresh()]);
    expect(fetcher).toHaveBeenCalledTimes(2); // una per shop
  });
});
```

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run lib/store.test.ts`
Expected: FAIL, `Cannot find module './store'`

- [ ] **Step 3: Implementazione**

```ts
import type { CountryData } from './resolve';

export interface SiteStatus {
  id: string;
  lastSuccess: number | null;
  countries: number;
  lastError: string | null;
}

export interface StoreStatus {
  bootedAt: number;
  sites: SiteStatus[];
}

export interface StoreOptions {
  shopIds: string[];
  fetcher: (id: string) => Promise<string[]>;
  snapshot: CountryData;
  ttlMs?: number;
  now?: () => number;
  onError?: (id: string, err: unknown) => void;
}

/**
 * Nazioni per shop in memoria. get() non aspetta mai la rete: ritorna i dati che ha
 * e, se sono più vecchi di ttlMs, avvia un refresh in background (stale-while-revalidate).
 */
export function createStore(o: StoreOptions) {
  const now = o.now ?? Date.now;
  const ttl = o.ttlMs ?? 3_600_000;
  const data: CountryData = { ...o.snapshot };
  const status = new Map<string, SiteStatus>(
    o.shopIds.map((id) => [id, { id, lastSuccess: null, countries: (o.snapshot[id] ?? []).length, lastError: null }]),
  );
  const bootedAt = now();
  let lastRefresh: number | null = null;
  let inflight: Promise<void> | null = null;

  function refresh(): Promise<void> {
    if (inflight) return inflight;
    lastRefresh = now();
    inflight = Promise.all(
      o.shopIds.map(async (id) => {
        const s = status.get(id)!;
        try {
          const codes = await o.fetcher(id);
          data[id] = codes;
          s.lastSuccess = now();
          s.countries = codes.length;
          s.lastError = null;
        } catch (err) {
          s.lastError = err instanceof Error ? err.message : String(err);
          o.onError?.(id, err);
        }
      }),
    )
      .then(() => undefined)
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }

  function get(): CountryData {
    if (lastRefresh === null || now() - lastRefresh >= ttl) void refresh();
    return data;
  }

  function getStatus(): StoreStatus {
    return { bootedAt, sites: [...status.values()].map((s) => ({ ...s })) };
  }

  return { get, refresh, getStatus };
}

export type Store = ReturnType<typeof createStore>;
```

- [ ] **Step 4: Verifica che passi**

Run: `npx vitest run lib/store.test.ts`
Expected: PASS (4 test)

- [ ] **Step 5: Checkpoint commit**: `feat: in-memory country store with background refresh`

---

### Task 9: Report di salute

**Files:**
- Create: `lib/health.ts`
- Test: `lib/health.test.ts`

- [ ] **Step 1: Test che fallisce**

```ts
import { describe, expect, it } from 'vitest';
import { healthReport } from './health';

const H = 3_600_000;
const NOW = 100 * H;
const site = (lastSuccess: number | null) => ({ id: 'fr', lastSuccess, countries: 2, lastError: null });

describe('healthReport', () => {
  it('ok se aggiornato di recente', () =>
    expect(healthReport({ bootedAt: NOW - 30 * H, sites: [site(NOW - H)] }, NOW).ok).toBe(true));
  it('ko se l\'ultimo successo ha più di 24 ore', () =>
    expect(healthReport({ bootedAt: NOW - 30 * H, sites: [site(NOW - 25 * H)] }, NOW).ok).toBe(false));
  it('mai riuscito ma avviato da poco: ok', () =>
    expect(healthReport({ bootedAt: NOW - H, sites: [site(null)] }, NOW).ok).toBe(true));
  it('mai riuscito da più di 24 ore: ko, e il sito è marcato stale', () => {
    const r = healthReport({ bootedAt: NOW - 25 * H, sites: [site(null)] }, NOW);
    expect(r.ok).toBe(false);
    expect(r.sites[0].stale).toBe(true);
  });
});
```

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run lib/health.test.ts`
Expected: FAIL, `Cannot find module './health'`

- [ ] **Step 3: Implementazione**

```ts
import type { StoreStatus } from './store';

export function healthReport(status: StoreStatus, now: number, maxAgeMs = 24 * 3_600_000) {
  const sites = status.sites.map((s) => ({ ...s, stale: now - (s.lastSuccess ?? status.bootedAt) > maxAgeMs }));
  return { ok: !sites.some((s) => s.stale), sites };
}
```

- [ ] **Step 4: Verifica che passi**

Run: `npx vitest run lib/health.test.ts`
Expected: PASS (4 test)

- [ ] **Step 5: Checkpoint commit**: `feat: health report`

---

### Task 10: Chiamata a WooCommerce, singleton e snapshot

**Files:**
- Create: `lib/wc.ts`, `lib/data.ts`, `data/snapshot.json`, `scripts/snapshot.ts`

- [ ] **Step 1: `lib/wc.ts`**

```ts
import { SHOPS } from './sites';
import { parseAllowedCountries, type WcSetting } from './wc-settings';

/** Nazioni servite da uno shop, lette dalla «Località di vendita» WooCommerce (chiave REST in sola lettura). */
export async function fetchShopCountries(id: string): Promise<string[]> {
  const site = SHOPS.find((s) => s.id === id);
  if (!site) throw new Error(`Shop sconosciuto: ${id}`);

  const key = process.env[`WC_${site.envKey}_KEY`];
  const secret = process.env[`WC_${site.envKey}_SECRET`];
  if (!key || !secret) throw new Error(`Credenziali mancanti: WC_${site.envKey}_KEY / WC_${site.envKey}_SECRET`);

  const res = await fetch(`${site.url}/wp-json/wc/v3/settings/general`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` },
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} da ${site.url}`);

  const { mode, codes } = parseAllowedCountries((await res.json()) as WcSetting[]);
  if (mode === 'all') {
    console.warn(`[qdp-link] ${id}: «vendi a tutte le nazioni» ignorato, contato come nessuna nazione`);
  }
  return codes;
}
```

- [ ] **Step 2: `data/snapshot.json` iniziale (vuoto: con tutti gli shop giù all'avvio si vede .com)**

```json
{}
```

- [ ] **Step 3: `lib/data.ts`**

```ts
import snapshot from '../data/snapshot.json';
import type { CountryData } from './resolve';
import { SHOPS } from './sites';
import { createStore, type Store } from './store';
import { fetchShopCountries } from './wc';

// globalThis: un solo store anche con l'hot reload di next dev
const g = globalThis as unknown as { __qdpStore?: Store };

export const store: Store = (g.__qdpStore ??= createStore({
  shopIds: SHOPS.map((s) => s.id),
  fetcher: fetchShopCountries,
  snapshot: snapshot as CountryData,
  onError: (id, err) => console.warn(`[qdp-link] refresh ${id} fallito:`, err instanceof Error ? err.message : err),
}));
```

- [ ] **Step 4: `scripts/snapshot.ts`**

```ts
import { writeFileSync } from 'node:fs';
import { SHOPS } from '../lib/sites';
import { fetchShopCountries } from '../lib/wc';

async function main() {
  const out: Record<string, string[]> = {};
  for (const s of SHOPS) {
    out[s.id] = await fetchShopCountries(s.id);
    console.log(`${s.id}: ${out[s.id].length} nazioni`);
  }
  writeFileSync('data/snapshot.json', JSON.stringify(out, null, 2) + '\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 5: Verifica che compili**

Run: `npx tsc --noEmit && npm test`
Expected: nessun errore di tipo, tutti i test PASS.

- [ ] **Step 6: Checkpoint commit**: `feat: WooCommerce fetcher, store singleton, snapshot script`

---

### Task 11: View model della pagina

**Files:**
- Create: `lib/view-model.ts`
- Test: `lib/view-model.test.ts`

- [ ] **Step 1: Test che fallisce**

```ts
import { describe, expect, it } from 'vitest';
import { buildPageModel } from './view-model';
import type { CountryData } from './resolve';

const DATA: CountryData = { it: ['IT'], fr: ['FR'], casa: ['IT'], frozen: ['IT', 'FR'] };

describe('buildPageModel', () => {
  it('IT in italiano: titoli, etichette e link con UTM', () => {
    const m = buildPageModel({ country: 'IT', lang: 'it', data: DATA, src: 'instagram' });
    expect(m.pills.map((p) => p.title)).toEqual(['Shop professionisti', 'Shop privati', 'Linea surgelata']);
    expect(m.pills.map((p) => p.tag)).toEqual(['Fresco', 'Casa', 'Surgelato']);
    expect(m.pills[0].href).toBe(
      'https://quellidellapizza.it/?utm_source=instagram&utm_medium=social&utm_campaign=linktree&utm_content=it',
    );
    expect(m.countryLabel).toBe('Italia');
    expect(m.currentValue).toBe('IT');
  });

  it('US: vetrina col nome del brand', () => {
    const m = buildPageModel({ country: 'US', lang: 'en', data: DATA, src: 'tiktok' });
    expect(m.pills).toHaveLength(1);
    expect(m.pills[0]).toMatchObject({ title: 'Pizza Fellas', tag: 'Catalogue', kind: 'showcase' });
  });

  it('paese non servito: etichetta col suo nome ma selettore su «altro»', () => {
    const m = buildPageModel({ country: 'BR', lang: 'en', data: DATA, src: 'instagram' });
    expect(m.countryLabel).toBe('Brazil');
    expect(m.currentValue).toBe('ZZ');
    expect(m.pills[0].title).toBe('Catalogue & contact');
  });

  it('opzioni: paesi serviti e vetrine in ordine alfabetico, «altro» in fondo', () => {
    const m = buildPageModel({ country: 'FR', lang: 'en', data: DATA, src: 'instagram' });
    expect(m.options.map((o) => o.value)).toEqual(['FR', 'IT', 'SE', 'US', 'ZZ']);
    expect(m.options.at(-1)!.label).toBe('Other country');
  });
});
```

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run lib/view-model.test.ts`
Expected: FAIL, `Cannot find module './view-model'`

- [ ] **Step 3: Implementazione**

```ts
import { OTHER } from './country-code';
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

function pillTag(kind: LinkKind, t: Messages): string {
  if (kind === 'fresh') return t.tags.fresh;
  if (kind === 'home') return t.tags.home;
  if (kind === 'frozen') return t.tags.frozen;
  return t.tags.catalogue;
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
    tag: pillTag(l.kind, t),
  }));

  const served = new Set<string>([...Object.values(data).flat(), ...SHOWCASES.flatMap((s) => s.countries)]);
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
```

- [ ] **Step 4: Verifica che passi**

Run: `npx vitest run lib/view-model.test.ts`
Expected: PASS (4 test)

- [ ] **Step 5: Checkpoint commit**: `feat: page view model`

---

### Task 12: Componenti e stile (la variante E)

Riferimento visivo: `Pills.dc.html` nel canvas https://claude.ai/artifact/51bc8ZbPQuVWtTLJD5VHzf

**Files:**
- Create: `components/SocialIcons.tsx`, `components/CountrySelect.tsx`, `components/LinkPage.tsx`, `public/logo.svg`
- Modify: `app/globals.css`
- Test: `components/LinkPage.test.tsx`

- [ ] **Step 1: Copia il logo**

Run: `cp ~/_app/qdp-hub/public/qdp-logo.svg public/logo.svg && cp public/logo.svg app/icon.svg`

- [ ] **Step 2: Test che fallisce**

```tsx
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
```

- [ ] **Step 3: Verifica che fallisca**

Run: `npx vitest run components/LinkPage.test.tsx`
Expected: FAIL, `Cannot find module './LinkPage'`

- [ ] **Step 4: `components/SocialIcons.tsx`**

```tsx
import type { ReactNode } from 'react';
import { SOCIALS, type SocialId } from '@/lib/sites';

const PATHS: Record<SocialId, ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  tiktok: (
    <>
      <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.5 2.6 2.4 4.5 5 5" />
    </>
  ),
  youtube: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9l5 3-5 3z" />
    </>
  ),
  facebook: <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" />,
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" />
    </>
  ),
};

export function SocialIcons() {
  return (
    <nav className="socials">
      {SOCIALS.map((s) => (
        <a key={s.id} href={s.url} aria-label={s.label} className="social">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {PATHS[s.id]}
          </svg>
        </a>
      ))}
    </nav>
  );
}
```

- [ ] **Step 5: `components/CountrySelect.tsx`**

```tsx
'use client';

import type { CountryOption } from '@/lib/view-model';

export function CountrySelect(props: {
  countryLabel: string;
  changeLabel: string;
  current: string;
  options: CountryOption[];
  src: string;
}) {
  return (
    <label className="country">
      <span>
        {props.countryLabel} · <u>{props.changeLabel}</u>
      </span>
      <select
        aria-label={props.changeLabel}
        defaultValue={props.current}
        onChange={(e) => {
          const params = new URLSearchParams({ c: e.target.value.toLowerCase(), src: props.src });
          window.location.href = `/set-country?${params}`;
        }}
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 6: `components/LinkPage.tsx`**

```tsx
import type { PageModel } from '@/lib/view-model';
import { CountrySelect } from './CountrySelect';
import { SocialIcons } from './SocialIcons';

const SNOWFLAKE = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2v20M4.9 7l14.2 10M19.1 7L4.9 17" />
  </svg>
);

export function LinkPage({ model }: { model: PageModel }) {
  return (
    <main lang={model.lang} className="page">
      <header className="brand">
        <img src="/logo.svg" alt="" width={72} height={72} />
        <h1>Quelli della Pizza</h1>
      </header>

      <ul className="pills">
        {model.pills.map((p) => (
          <li key={p.id}>
            <a href={p.href} className="pill">
              <span className="pill-title">{p.title}</span>
              <span className={`tag tag-${p.kind}`}>
                {p.kind === 'frozen' && SNOWFLAKE}
                {p.tag}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <SocialIcons />

      <CountrySelect
        countryLabel={model.countryLabel}
        changeLabel={model.t.changeCountry}
        current={model.currentValue}
        options={model.options}
        src={model.src}
      />
    </main>
  );
}
```

- [ ] **Step 7: `app/globals.css` completo**

```css
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; }
body { background: #FAFAF8; color: #1d1d1b; font-family: var(--font-archivo), system-ui, sans-serif; }
a { color: inherit; text-decoration: none; }

.page { min-height: 100dvh; max-width: 440px; margin: 0 auto; padding: 80px 24px 32px; display: flex; flex-direction: column; align-items: center; gap: 36px; }
.brand { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.brand h1 { margin: 0; font-size: 18px; font-weight: 700; }

.pills { list-style: none; margin: 0; padding: 0; width: 100%; display: flex; flex-direction: column; gap: 12px; }
.pill { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 58px; padding: 0 20px; border: 1.5px solid #1d1d1b; border-radius: 999px; background: #fff; transition: background .15s; }
.pill:hover, .pill:focus-visible { background: #F1F1EE; }
.pill:focus-visible { outline: 2px solid #1d1d1b; outline-offset: 3px; }
.pill-title { font-size: 16px; font-weight: 600; }

.tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.tag-fresh { background: #FFD000; color: #1d1d1b; }
.tag-frozen { background: #DCEFFA; color: #0B2E44; }
.tag-home, .tag-showcase, .tag-fallback { background: #EDEDEA; color: #1d1d1b; }

.socials { display: flex; gap: 8px; }
.social { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 999px; }
.social:hover, .social:focus-visible { background: #EDEDEA; }

.country { position: relative; margin-top: auto; min-height: 44px; padding: 0 12px; display: flex; align-items: center; font-size: 13px; color: #5E5E58; }
.country select { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; font-size: 16px; }
.country:focus-within { outline: 2px solid #1d1d1b; border-radius: 8px; }
```

- [ ] **Step 8: Verifica che passi**

Run: `npx vitest run components/LinkPage.test.tsx`
Expected: PASS (4 test)

- [ ] **Step 9: Checkpoint commit**: `feat: link page components and styles`

---

### Task 13: Route delle pagine e del cookie

**Files:**
- Create: `lib/request-page.ts`, `app/[country]/page.tsx`, `app/set-country/route.ts`
- Modify: `app/page.tsx`, `app/layout.tsx`

- [ ] **Step 1: `lib/request-page.ts`**

```ts
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
```

- [ ] **Step 2: `app/page.tsx`**

```tsx
import { LinkPage } from '@/components/LinkPage';
import { loadPageModel } from '@/lib/request-page';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const model = await loadPageModel({ searchParams: await searchParams });
  return <LinkPage model={model} />;
}
```

- [ ] **Step 3: `app/[country]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
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
  if (!/^[a-z]{2}$/.test(country) || !normalizeCountry(country)) notFound();
  const model = await loadPageModel({ path: country, searchParams: await searchParams });
  return <LinkPage model={model} />;
}
```

- [ ] **Step 4: `app/set-country/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { normalizeCountry } from '@/lib/country-code';
import { COUNTRY_COOKIE } from '@/lib/request-page';
import { sanitizeSrc } from '@/lib/utm';

export function GET(req: NextRequest) {
  const country = normalizeCountry(req.nextUrl.searchParams.get('c'));
  const src = req.nextUrl.searchParams.get('src');
  // Location relativo: dietro il proxy di Sevalla req.url può avere l'host interno
  const location = src ? `/?src=${encodeURIComponent(sanitizeSrc(src))}` : '/';
  const res = new NextResponse(null, { status: 303, headers: { Location: location } });
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
```

- [ ] **Step 5: `app/layout.tsx` con font e metadata**

```tsx
import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const archivo = Archivo({ subsets: ['latin', 'latin-ext'], weight: ['400', '600', '700'], variable: '--font-archivo' });

export const metadata: Metadata = {
  metadataBase: new URL('https://qdp.link'),
  title: 'Quelli della Pizza',
  description: 'I siti e i social di Quelli della Pizza',
  openGraph: { title: 'Quelli della Pizza', description: 'I siti e i social di Quelli della Pizza', url: 'https://qdp.link' },
};

export const viewport: Viewport = { themeColor: '#FFD000' };

// <html lang> resta fisso: la lingua reale della pagina è su <main lang> (vedi LinkPage)
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Verifica manuale in locale**

Copia `.env.example` in `.env.local` e compila le chiavi (le genera Michele: WooCommerce → Impostazioni → Avanzate → REST API, permessi **Lettura**). Poi `npm run dev` e:

```bash
curl -s -H "CF-IPCountry: FR" localhost:3000 | grep -o 'quellidellapizza\.fr[^"]*' | head -1
curl -s -H "CF-IPCountry: US" localhost:3000 | grep -c 'Pizza Fellas'
curl -s localhost:3000/it | grep -o 'Shop professionisti'
curl -s -i 'localhost:3000/set-country?c=de&src=tiktok' | grep -iE '^(location|set-cookie)'
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/xx
```
Expected:
1. `quellidellapizza.fr/?utm_source=instagram...` (alla prima richiesta può comparire lo snapshot vuoto, cioè .com: ripeti dopo un secondo)
2. `1`
3. `Shop professionisti`
4. `location: /?src=tiktok` e `set-cookie: qdp_country=DE; ...`
5. `404`

Poi apri `localhost:3000` nel browser a 390px di larghezza e confrontalo con il mockup E.

- [ ] **Step 7: Checkpoint commit**: `feat: pages, country path and cookie route`

---

### Task 14: `/health` e immagine OG

**Files:**
- Create: `app/health/route.ts`, `app/opengraph-image.tsx`

- [ ] **Step 1: `app/health/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { store } from '@/lib/data';
import { healthReport } from '@/lib/health';

export const dynamic = 'force-dynamic';

export function GET() {
  store.get(); // avvia un refresh se i dati sono vecchi
  const report = healthReport(store.getStatus(), Date.now());
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
```

- [ ] **Step 2: `app/opengraph-image.tsx`**

```tsx
import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Quelli della Pizza';

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFD000', color: '#1d1d1b', fontSize: 88, fontWeight: 700 }}>
        Quelli della Pizza
      </div>
    ),
    size,
  );
}
```

- [ ] **Step 3: Verifica**

Run: `npm run dev`, poi `curl -s localhost:3000/health` e `curl -s -o /dev/null -w '%{content_type}\n' localhost:3000/opengraph-image`
Expected: JSON con `"ok":true` e i 7 shop con `lastSuccess` valorizzato; poi `image/png`.

- [ ] **Step 4: Test completi e build**

Run: `npm test && npm run build`
Expected: tutti i test PASS, build OK.

- [ ] **Step 5: Checkpoint commit**: `feat: health endpoint and OG image`

---

### Task 15: Snapshot, pulizia e messa in produzione

- [ ] **Step 1: Genera lo snapshot reale**

Run: `npm run snapshot`
Expected: una riga `<shop>: N nazioni` per ognuno dei 7 shop; `data/snapshot.json` aggiornato.

- [ ] **Step 2: Rimuovi la route di diagnostica**

Run: `rm -r app/debug`

- [ ] **Step 3: Checkpoint commit**: `chore: real snapshot, remove debug route`. Chiedi a Michele commit e push.

- [ ] **Step 4: Env su Sevalla (Michele)**

Inserire le 14 variabili `WC_*_KEY` / `WC_*_SECRET` (stringhe di una riga, niente base64).

- [ ] **Step 5: Dominio (Michele)**

Registrare `qdp.link`. Aggiungerlo come dominio custom dell'app su Sevalla, con i record DNS indicati da Sevalla, e far reindirizzare `www.qdp.link` all'apex.

- [ ] **Step 6: Verifica in produzione**

```bash
curl -s https://qdp.link/health
curl -s https://qdp.link/fr | grep -o 'quellidellapizza\.fr[^"]*' | head -1
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://www.qdp.link
```
Expected: `"ok":true`; link .fr con UTM; `301`/`308` verso `https://qdp.link/`.
Poi aprire `https://qdp.link` dal telefono, anche dal browser in-app di Instagram, e provare il selettore del paese.

- [ ] **Step 7: Verifica dei deploy paths ignorati**

Dopo un commit di sola documentazione, `GET /applications/{id}/deployments` su Sevalla deve mostrare l'ultimo deploy con `status: skipped`.

- [ ] **Step 8: Uptime check (Michele)**

Puntare il monitor di uptime che già usate su `https://qdp.link/health` (si allarma su 503).
