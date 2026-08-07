import type { Metadata } from 'next';
import { Archivo_Black, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-body',
  subsets: ['latin'],
});
const archivo = Archivo_Black({
  variable: '--font-display',
  weight: '400',
  subsets: ['latin'],
});
const jetbrains = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Katalog Produk — Ava',
  description: 'Perlengkapan Olahraga & Fisioterapi',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${archivo.variable} ${jetbrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
