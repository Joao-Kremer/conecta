'use client';

import { LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

interface TopBarProps {
  user: { name: string; email: string };
}

export function TopBar({ user }: TopBarProps) {
  const router = useRouter();
  const t = useTranslations();

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: { 'X-Requested-With': 'conecta-web' } });
    } catch {
      // ignore network errors on logout
    }
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-background border-b border-border">
      <div />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-7 w-7 rounded-full bg-accent-soft flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-accent-strong" />
          </div>
          <span className="font-medium text-foreground hidden sm:block">{user.name}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label={t('nav.logout')}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
