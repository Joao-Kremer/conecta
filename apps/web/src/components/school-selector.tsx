'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useSchoolStore } from '@/stores/school.store';

const schoolsSchema = z.array(
  z.object({ id: z.string(), name: z.string() }).passthrough(),
);

export function SchoolSelector() {
  const t = useTranslations();
  const selectedSchool = useSchoolStore((s) => s.selectedSchool);
  const setSelectedSchool = useSchoolStore((s) => s.setSelectedSchool);

  const { data: schools } = useQuery({
    queryKey: ['schools'],
    queryFn: () => apiClient.get('/schools', schoolsSchema),
    // A user without school scope (403) or with no schools has nothing to pick.
    retry: false,
  });

  if (!schools || schools.length === 0) return null;

  const label = selectedSchool?.name ?? t('topBar.allSchools');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t('topBar.selectSchool')}
      >
        {label}
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuItem onSelect={() => setSelectedSchool(null)}>
          <Check
            className={cn('mr-2 h-4 w-4', selectedSchool ? 'opacity-0' : 'opacity-100')}
          />
          {t('topBar.allSchools')}
        </DropdownMenuItem>
        {schools.map((school) => (
          <DropdownMenuItem
            key={school.id}
            onSelect={() => setSelectedSchool({ id: school.id, name: school.name })}
          >
            <Check
              className={cn(
                'mr-2 h-4 w-4',
                selectedSchool?.id === school.id ? 'opacity-100' : 'opacity-0',
              )}
            />
            {school.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
