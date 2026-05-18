import { getTranslations } from 'next-intl/server';


import { ModalitiesClient } from './modalities-client';
import { modalityListSchema } from './modalities.api';

import { apiServerGet } from '@/lib/api/server';

export default async function ModalitiesPage() {
  const t = await getTranslations();
  const initialData = await apiServerGet('/modalities', modalityListSchema);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-display-lg font-semibold text-foreground">
          {t('admin.modalities.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.modalities.subtitle')}</p>
      </div>
      <ModalitiesClient initialData={initialData} />
    </div>
  );
}
