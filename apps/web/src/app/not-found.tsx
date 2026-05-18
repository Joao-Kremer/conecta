import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';

export default async function NotFound() {
  const t = await getTranslations();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center p-4">
      <div className="space-y-2">
        <h1 className="font-display text-display-2xl font-semibold text-foreground">{t('notFound.code')}</h1>
        <p className="text-muted-foreground">{t('notFound.message')}</p>
      </div>
      <Button asChild>
        <Link href="/dashboard">{t('notFound.home')}</Link>
      </Button>
    </div>
  );
}
