'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center p-4">
      <div className="space-y-2">
        <h1 className="font-display text-display-lg font-semibold text-foreground">Algo deu errado</h1>
        <p className="text-sm text-muted-foreground">
          {error.digest ? `Código: ${error.digest}` : 'Tente recarregar a página.'}
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>Tentar novamente</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
          Ir para o início
        </Button>
      </div>
    </div>
  );
}
