'use client';

import {
  LayoutDashboard,
  School,
  Dumbbell,
  Users,
  GraduationCap,
  ClipboardList,
  CalendarCheck,
  Receipt,
  CreditCard,
  MessageSquare,
  BarChart3,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/schools', labelKey: 'nav.schools', icon: School, permissions: ['school:read'] },
  { href: '/modalities', labelKey: 'nav.modalities', icon: Dumbbell, permissions: ['modality:read'] },
  { href: '/classes', labelKey: 'nav.classes', icon: ClipboardList, permissions: ['class:read', 'class:read.own-school', 'class:read.own'] },
  { href: '/students', labelKey: 'nav.students', icon: GraduationCap, permissions: ['student:read.own-school', 'student:read.own'] },
  { href: '/guardians', labelKey: 'nav.guardians', icon: Users, permissions: ['guardian:read.own'] },
  { href: '/enrollments', labelKey: 'nav.enrollments', icon: ClipboardList, permissions: ['enrollment:read.own'] },
  { href: '/attendance', labelKey: 'nav.attendance', icon: CalendarCheck, permissions: ['attendance:read.own-school', 'attendance:read.own'] },
  { href: '/invoices', labelKey: 'nav.invoices', icon: Receipt, permissions: ['invoice:read.own'] },
  { href: '/payments', labelKey: 'nav.payments', icon: CreditCard, permissions: ['payment:read.own'] },
  { href: '/communications', labelKey: 'nav.communications', icon: MessageSquare, permissions: ['notification:read'] },
  { href: '/reports', labelKey: 'nav.reports', icon: BarChart3, permissions: ['organization:read'] },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings, permissions: ['organization:update'] },
];

interface SidebarProps {
  user: { name: string; permissions: string[] };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations();

  const visible = NAV_ITEMS.filter(
    (item) => !item.permissions || item.permissions.some((p) => user.permissions.includes(p)),
  );

  return (
    <aside className="w-60 flex-none bg-background border-r border-border flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-border">
        <span className="font-display text-display-md font-semibold text-foreground">{t('app.name')}</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {visible.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md mx-2 transition-colors',
                isActive
                  ? 'bg-primary-soft text-primary-strong'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4 flex-none" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
