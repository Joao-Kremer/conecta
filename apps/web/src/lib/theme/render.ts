import { deriveBrandTones } from './derive';

interface ThemeInput {
  brandPrimary: string;
  brandAccent: string;
}

export function renderThemeStyle(theme: ThemeInput | null): string {
  const primary = deriveBrandTones(theme?.brandPrimary ?? '#2563eb');
  const accent = deriveBrandTones(theme?.brandAccent ?? '#0ea5e9');

  return `:root{--brand-primary:${primary.base};--brand-primary-strong:${primary.strong};--brand-primary-soft:${primary.soft};--brand-primary-on:${primary.on};--brand-accent:${accent.base};--brand-accent-strong:${accent.strong};--brand-accent-soft:${accent.soft};--brand-accent-on:${accent.on}}`;
}
