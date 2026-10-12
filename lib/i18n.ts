import type { Lang } from './lang';
import type { LinkKind } from './resolve';
import type { TitleKey } from './sites';

export interface Messages {
  titles: Record<TitleKey | 'fallback', string>;
  tags: Record<LinkKind, string>;
  changeCountry: string;
  otherCountry: string;
  description: string;
}

export const MESSAGES: Record<Lang, Messages> = {
  it: {
    titles: { b2b: 'Shop professionisti', shop: 'Shop online', home: 'Shop privati', frozen: 'Linea surgelata', fallback: 'Catalogo e contatti' },
    tags: { fresh: 'Fresco', home: 'Casa', frozen: 'Surgelato', showcase: 'Catalogo', fallback: 'Catalogo' },
    changeCountry: 'cambia paese',
    otherCountry: 'Altro paese',
    description: 'I siti e i social di Quelli della Pizza',
  },
  fr: {
    titles: { b2b: 'Boutique professionnels', shop: 'Boutique en ligne', home: 'Boutique particuliers', frozen: 'Gamme surgelée', fallback: 'Catalogue et contact' },
    tags: { fresh: 'Frais', home: 'Maison', frozen: 'Surgelé', showcase: 'Catalogue', fallback: 'Catalogue' },
    changeCountry: 'changer de pays',
    otherCountry: 'Autre pays',
    description: 'Les sites et réseaux sociaux de Quelli della Pizza',
  },
  de: {
    titles: { b2b: 'Shop für Profis', shop: 'Online-Shop', home: 'Shop für Privatkunden', frozen: 'Tiefkühl-Sortiment', fallback: 'Katalog & Kontakt' },
    tags: { fresh: 'Frisch', home: 'Zuhause', frozen: 'Tiefgekühlt', showcase: 'Katalog', fallback: 'Katalog' },
    changeCountry: 'Land ändern',
    otherCountry: 'Anderes Land',
    description: 'Websites und Social Media von Quelli della Pizza',
  },
  es: {
    titles: { b2b: 'Tienda profesional', shop: 'Tienda online', home: 'Tienda particulares', frozen: 'Gama congelada', fallback: 'Catálogo y contacto' },
    tags: { fresh: 'Fresco', home: 'Casa', frozen: 'Congelado', showcase: 'Catálogo', fallback: 'Catálogo' },
    changeCountry: 'cambiar país',
    otherCountry: 'Otro país',
    description: 'Las webs y redes sociales de Quelli della Pizza',
  },
  en: {
    titles: { b2b: 'Shop for professionals', shop: 'Online shop', home: 'Shop for home', frozen: 'Frozen range', fallback: 'Catalogue & contact' },
    tags: { fresh: 'Fresh', home: 'Home', frozen: 'Frozen', showcase: 'Catalogue', fallback: 'Catalogue' },
    changeCountry: 'change country',
    otherCountry: 'Other country',
    description: 'Quelli della Pizza websites and socials',
  },
};
