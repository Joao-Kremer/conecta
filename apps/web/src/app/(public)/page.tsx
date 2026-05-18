import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';

export default async function LandingPage() {
  const t = await getTranslations();

  return (
    <div className="text-center space-y-6 max-w-md">
      <div className="space-y-2">
        <h1 className="font-display text-display-xl font-semibold text-foreground">
          {t('app.name')}
        </h1>
        <p className="text-muted-foreground">
          {t('landing.tagline')}
        </p>
      </div>
      <div className="flex gap-3 justify-center">
        <Button asChild>
          <Link href="/login">{t('landing.login')}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/signup">{t('landing.signup')}</Link>
        </Button>
      </div>
    </div>
  );
}
