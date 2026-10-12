import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const archivo = Archivo({ subsets: ['latin', 'latin-ext'], weight: ['400', '600', '700'], variable: '--font-archivo' });

export const metadata: Metadata = {
  metadataBase: new URL('https://qdp.link'),
  title: 'Quelli della Pizza',
  description: 'I siti e i social di Quelli della Pizza',
  alternates: { canonical: '/' },
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
