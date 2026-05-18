'use client';

import * as Sentry from '@sentry/nextjs';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center p-4">
      <div className="space-y-2">
        <h1 className="font-display text-display-lg font-semibold text-foreground">{t('errorPage.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {error.digest ? t('errorPage.code', { digest: error.digest }) : t('errorPage.retryHint')}
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>{t('errorPage.retry')}</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
          {t('errorPage.home')}
        </Button>
      </div>
    </div>
  );
}
