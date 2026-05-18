import { LayoutDashboard } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function DashboardPage() {
  const t = await getTranslations();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-display-lg font-semibold text-foreground">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
      </div>
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4 text-center">
        <LayoutDashboard className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="font-medium text-foreground">{t('dashboard.emptyTitle')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('dashboard.emptyBody')}</p>
        </div>
      </div>
    </div>
  );
}
