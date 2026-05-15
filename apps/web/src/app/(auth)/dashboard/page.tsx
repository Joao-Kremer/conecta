import { LayoutDashboard } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-display-lg font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral da sua escolinha</p>
      </div>
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4 text-center">
        <LayoutDashboard className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="font-medium text-foreground">Dashboard em construção</p>
          <p className="text-sm text-muted-foreground mt-1">Os dados aparecerão aqui em breve.</p>
        </div>
      </div>
    </div>
  );
}
