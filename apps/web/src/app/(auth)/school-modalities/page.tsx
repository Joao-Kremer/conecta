import { getTranslations } from 'next-intl/server';


import { SchoolModalitiesClient } from './school-modalities-client';
import { schoolModalityListSchema } from './school-modalities.api';

import { apiServerGet } from '@/lib/api/server';

export default async function SchoolModalitiesPage() {
  const t = await getTranslations();
  const initial = await apiServerGet('/school-modalities', schoolModalityListSchema);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-display-lg font-semibold text-foreground">
          {t('admin.schoolModalities.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('admin.schoolModalities.subtitle')}
        </p>
      </div>
      <SchoolModalitiesClient initialData={initial} />
    </div>
  );
}
