import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';

import messages from '../messages/pt-BR.json';

function Providers({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  return render(ui, { wrapper: Providers, ...options });
}
