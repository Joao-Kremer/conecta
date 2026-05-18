import { getRequestConfig } from 'next-intl/server';

// Single-locale setup for now (pt-BR). i18n routing is intentionally omitted —
// English can be added later by introducing a locale segment + negotiation.
// See docs/06-FRONTEND_GUIDE.md "Internationalization".
export const locale = 'pt-BR';

export default getRequestConfig(async () => ({
  locale,
  messages: (await import(`../messages/${locale}.json`)).default,
}));
