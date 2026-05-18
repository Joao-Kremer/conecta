import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';


const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // Suppress Sentry CLI logs except in CI.
  silent: !process.env.CI,
  // Upload a larger set of source maps for prettier stack traces (increases build time).
  widenClientFileUpload: true,
  // Tree-shake Sentry logger statements to reduce bundle size.
  disableLogger: true,
  // No source-map upload pipeline in the MVP: don't generate/serve source maps.
  sourcemaps: { disable: true },
  // Source map upload is automatically skipped when SENTRY_AUTH_TOKEN / org / project
  // are absent, so a build with no Sentry env vars succeeds and never fails here.
});
