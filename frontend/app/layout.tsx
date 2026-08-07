import type { Metadata } from 'next';
import { Space_Grotesk, Archivo_Black, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const space = Space_Grotesk({
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
  title: 'AVA Sportivo — Katalog',
  description: 'Perlengkapan Olahraga & Fisioterapi — Bandung, Indonesia',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="id"
      className={`${space.variable} ${archivo.variable} ${jetbrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
