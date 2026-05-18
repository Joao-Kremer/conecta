import { getTranslations } from 'next-intl/server';

import { StudentsClient } from './students-client';
import { studentListSchema } from './students.api';

import { apiServerGet } from '@/lib/api/server';

export default async function StudentsPage() {
  const t = await getTranslations();
  const initial = await apiServerGet('/students', studentListSchema);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-display-lg font-semibold text-foreground">
          {t('admin.students.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('admin.students.subtitle')}
        </p>
      </div>
      <StudentsClient initialData={initial} />
    </div>
  );
}
