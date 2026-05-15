import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
      <footer className="py-4 text-center text-xs text-muted-foreground">
        Powered by Conecta
      </footer>
    </div>
  );
}
