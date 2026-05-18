'use client';

import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';

// Last-resort boundary for errors in the root layout itself. It renders its
// own <html>/<body> and lives outside the i18n provider, so copy is static.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <NextError statusCode={0} title="Algo deu errado" />
      </body>
    </html>
  );
}
