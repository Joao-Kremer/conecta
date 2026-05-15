'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/schools', label: 'Escolas', icon: School, permissions: ['school:read'] },
  { href: '/modalities', label: 'Modalidades', icon: Dumbbell, permissions: ['modality:read'] },
  { href: '/classes', label: 'Turmas', icon: ClipboardList, permissions: ['class:read', 'class:read.own-school', 'class:read.own'] },
  { href: '/students', label: 'Alunos', icon: GraduationCap, permissions: ['student:read.own-school', 'student:read.own'] },
  { href: '/guardians', label: 'Responsáveis', icon: Users, permissions: ['guardian:read.own'] },
  { href: '/enrollments', label: 'Matrículas', icon: ClipboardList, permissions: ['enrollment:read.own'] },
  { href: '/attendance', label: 'Presença', icon: CalendarCheck, permissions: ['attendance:read.own-school', 'attendance:read.own'] },
  { href: '/invoices', label: 'Cobranças', icon: Receipt, permissions: ['invoice:read.own'] },
  { href: '/payments', label: 'Pagamentos', icon: CreditCard, permissions: ['payment:read.own'] },
  { href: '/communications', label: 'Comunicados', icon: MessageSquare, permissions: ['notification:read'] },
  { href: '/reports', label: 'Relatórios', icon: BarChart3, permissions: ['organization:read'] },
  { href: '/settings', label: 'Configurações', icon: Settings, permissions: ['organization:update'] },
];

interface SidebarProps {
  user: { name: string; permissions: string[] };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const visible = NAV_ITEMS.filter(
    (item) => !item.permissions || item.permissions.some((p) => user.permissions.includes(p)),
  );

  return (
    <aside className="w-60 flex-none bg-background border-r border-border flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-border">
        <span className="font-display text-display-md font-semibold text-foreground">Conecta</span>
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
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
