import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: 'var(--brand-primary)',
          strong: 'var(--brand-primary-strong)',
          soft: 'var(--brand-primary-soft)',
          on: 'var(--brand-primary-on)',
        },
        accent: {
          DEFAULT: 'var(--brand-accent)',
          strong: 'var(--brand-accent-strong)',
          soft: 'var(--brand-accent-soft)',
          on: 'var(--brand-accent-on)',
        },
        success: {
          DEFAULT: '#16a34a',
          strong: '#14532d',
          soft: '#dcfce7',
        },
        warning: {
          DEFAULT: '#d97706',
          strong: '#7c2d12',
          soft: '#fef3c7',
        },
        danger: {
          DEFAULT: '#dc2626',
          strong: '#7f1d1d',
          soft: '#fee2e2',
        },
        info: {
          DEFAULT: '#0284c7',
          strong: '#0c4a6e',
          soft: '#e0f2fe',
        },
        border: 'var(--color-border)',
        input: 'var(--color-border)',
        ring: 'var(--brand-primary)',
        background: 'var(--color-bg)',
        foreground: 'var(--color-text)',
        muted: {
          DEFAULT: 'var(--color-bg-muted)',
          foreground: 'var(--color-text-muted)',
        },
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
} satisfies Config;
