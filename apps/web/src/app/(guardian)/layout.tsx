import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

async function getMe() {
  try {
    const cookieStore = await cookies();
    const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/auth/me`, {
      headers: { cookie: cookieStore.toString(), 'x-requested-with': 'conecta-web' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ id: string; name: string; roles: string[] }>;
  } catch {
    return null;
  }
}

export default async function GuardianLayout({ children }: { children: ReactNode }) {
  const user = await getMe();
  if (!user) redirect('/login');
  if (!user.roles.includes('GUARDIAN')) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-muted">
      <header className="h-14 bg-background border-b border-border flex items-center px-4">
        <span className="font-display text-display-md font-semibold text-foreground">Conecta</span>
      </header>
      <main className="max-w-lg mx-auto p-4">
        {children}
      </main>
    </div>
  );
}
