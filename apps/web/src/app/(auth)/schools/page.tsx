import { getTranslations } from 'next-intl/server';


import { SchoolsClient } from './schools-client';
import { schoolListSchema } from './schools.api';

import { apiServerGet } from '@/lib/api/server';

export default async function SchoolsPage() {
  const t = await getTranslations();
  const initial = await apiServerGet('/schools', schoolListSchema);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-display-lg font-semibold text-foreground">
          {t('admin.schools.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.schools.subtitle')}</p>
      </div>
      <SchoolsClient initialData={initial} />
    </div>
  );
}
