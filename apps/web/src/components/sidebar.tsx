'use client';

import {
  LayoutDashboard,
  School,
  Dumbbell,
  Layers,
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

import { useAbility } from '@/hooks/use-ability';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  // CASL gate for UX visibility only; server enforces real authorization.
  gate?: { action: string; subject: string };
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/schools', labelKey: 'nav.schools', icon: School, gate: { action: 'read', subject: 'School' } },
  { href: '/modalities', labelKey: 'nav.modalities', icon: Dumbbell, gate: { action: 'read', subject: 'Modality' } },
  { href: '/school-modalities', labelKey: 'nav.schoolModalities', icon: Layers, gate: { action: 'read', subject: 'SchoolModality' } },
  { href: '/classes', labelKey: 'nav.classes', icon: ClipboardList, gate: { action: 'read', subject: 'Class' } },
  { href: '/students', labelKey: 'nav.students', icon: GraduationCap, gate: { action: 'read', subject: 'Student' } },
  { href: '/guardians', labelKey: 'nav.guardians', icon: Users, gate: { action: 'read', subject: 'Guardian' } },
  { href: '/enrollments', labelKey: 'nav.enrollments', icon: ClipboardList, gate: { action: 'read', subject: 'Enrollment' } },
  { href: '/attendance', labelKey: 'nav.attendance', icon: CalendarCheck, gate: { action: 'read', subject: 'Attendance' } },
  { href: '/invoices', labelKey: 'nav.invoices', icon: Receipt, gate: { action: 'read', subject: 'Invoice' } },
  { href: '/payments', labelKey: 'nav.payments', icon: CreditCard, gate: { action: 'read', subject: 'Payment' } },
  { href: '/communications', labelKey: 'nav.communications', icon: MessageSquare, gate: { action: 'read', subject: 'Notification' } },
  { href: '/reports', labelKey: 'nav.reports', icon: BarChart3, gate: { action: 'read', subject: 'Organization' } },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings, gate: { action: 'update', subject: 'Organization' } },
];

interface SidebarProps {
  user: { name: string; permissions: string[] };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations();
  const ability = useAbility(user);

  const visible = NAV_ITEMS.filter(
    (item) => !item.gate || ability.can(item.gate.action, item.gate.subject),
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
