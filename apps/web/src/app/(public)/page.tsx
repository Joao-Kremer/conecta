import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="text-center space-y-6 max-w-md">
      <div className="space-y-2">
        <h1 className="font-display text-display-xl font-semibold text-foreground">
          Conecta
        </h1>
        <p className="text-muted-foreground">
          Plataforma de gestão para escolinhas esportivas.
        </p>
      </div>
      <div className="flex gap-3 justify-center">
        <Button asChild>
          <Link href="/login">Entrar</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/signup">Cadastrar escolinha</Link>
        </Button>
      </div>
    </div>
  );
}
