import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { Sidebar } from '@/components/sidebar';
import { TopBar } from '@/components/top-bar';

async function getMe() {
  try {
    const cookieStore = await cookies();
    const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/auth/me`, {
      headers: { cookie: cookieStore.toString(), 'x-requested-with': 'conecta-web' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ id: string; name: string; email: string; roles: string[]; permissions: string[] }>;
  } catch {
    return null;
  }
}

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getMe();
  if (!user) redirect('/login');

  return (
    <div className="flex h-screen bg-muted">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
