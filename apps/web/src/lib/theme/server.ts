import { cookies } from 'next/headers';

export interface ResolvedTheme {
  brandPrimary: string;
  brandAccent: string;
  brandName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

const DEFAULT_THEME: ResolvedTheme = {
  brandPrimary: '#2563eb',
  brandAccent: '#0ea5e9',
  brandName: 'Conecta',
  logoUrl: null,
  faviconUrl: null,
};

// Returns the theme for the current request. Tries:
// 1. Authenticated user's org theme (from API /auth/me — called by (auth) layout, stored in cookie)
// 2. org_slug cookie → lookup
// 3. Default
export async function getOrganizationTheme(): Promise<ResolvedTheme> {
  try {
    const cookieStore = await cookies();
    const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
    const cookieHeader = cookieStore.toString();

    const res = await fetch(`${apiUrl}/auth/me`, {
      headers: { cookie: cookieHeader, 'x-requested-with': 'conecta-web' },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = (await res.json()) as { organization?: { settings?: { theme?: Partial<ResolvedTheme> } } };
      const theme = data.organization?.settings?.theme;
      if (theme) return { ...DEFAULT_THEME, ...theme };
    }
  } catch {
    // no-op — fall through to default
  }
  return DEFAULT_THEME;
}
