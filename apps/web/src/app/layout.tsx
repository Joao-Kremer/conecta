import type { Metadata } from 'next';
import { Geist, Geist_Mono, Inter } from 'next/font/google';

import { renderThemeStyle } from '@/lib/theme/render';
import { getOrganizationTheme } from '@/lib/theme/server';
import { Providers } from '@/providers/providers';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const geist = Geist({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Conecta',
  description: 'Plataforma de gestão para escolinhas esportivas',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getOrganizationTheme();
  const themeCss = renderThemeStyle(theme);

  return (
    <html lang="pt-BR" className={`${inter.variable} ${geist.variable} ${geistMono.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        {theme.faviconUrl && <link rel="icon" href={theme.faviconUrl} />}
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
