import type { Metadata } from 'next';
import { Geist, Geist_Mono, Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';


import { renderThemeStyle } from '@/lib/theme/render';
import { getOrganizationTheme } from '@/lib/theme/server';
import { Providers } from '@/providers/providers';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const geist = Geist({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('app.name'), description: t('app.description') };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getOrganizationTheme();
  const themeCss = renderThemeStyle(theme);
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${geist.variable} ${geistMono.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        {theme.faviconUrl && <link rel="icon" href={theme.faviconUrl} />}
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
