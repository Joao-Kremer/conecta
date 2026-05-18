import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations();

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
      <footer className="py-4 text-center text-xs text-muted-foreground">
        {t('public.poweredBy')}
      </footer>
    </div>
  );
}
