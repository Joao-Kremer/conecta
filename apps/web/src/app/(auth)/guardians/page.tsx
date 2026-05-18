import { getTranslations } from 'next-intl/server';


import { GuardiansClient } from './guardians-client';
import { guardianListSchema } from './guardians.api';

import { apiServerGet } from '@/lib/api/server';

export default async function GuardiansPage() {
  const t = await getTranslations();
  const initial = await apiServerGet('/guardians', guardianListSchema);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-display-lg font-semibold text-foreground">
          {t('admin.guardians.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.guardians.subtitle')}</p>
      </div>
      <GuardiansClient initialData={initial} />
    </div>
  );
}
