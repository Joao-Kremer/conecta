import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center p-4">
      <div className="space-y-2">
        <h1 className="font-display text-display-2xl font-semibold text-foreground">404</h1>
        <p className="text-muted-foreground">Página não encontrada.</p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Voltar para o início</Link>
      </Button>
    </div>
  );
}
