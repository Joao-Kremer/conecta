import { getTranslations } from 'next-intl/server';


import { ClassesClient } from './classes-client';
import { classListSchema } from './classes.api';

import { apiServerGet } from '@/lib/api/server';

export default async function ClassesPage() {
  const t = await getTranslations();
  const initial = await apiServerGet('/classes', classListSchema);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-display-lg font-semibold text-foreground">
          {t('admin.classes.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.classes.subtitle')}</p>
      </div>
      <ClassesClient initialData={initial} />
    </div>
  );
}
