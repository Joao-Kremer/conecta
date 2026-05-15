import { z } from 'zod';

export const hexSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a 6-digit hex string (e.g. #2563eb)');

// ── Internal helpers ────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = h / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(hn + 1 / 3) * 255),
    Math.round(hue2rgb(hn) * 255),
    Math.round(hue2rgb(hn - 1 / 3) * 255),
  ];
}

function linearize(c: number): number {
  const n = c / 255;
  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Derives a 11-stop tone scale (50, 100, 200 … 900, 950) from a hex color.
 * Preserves hue and saturation; maps lightness across the scale.
 */
export function deriveTones(hex: string): Record<number, string> {
  hexSchema.parse(hex);
  const [r, g, b] = hexToRgb(hex);
  const [h, s] = rgbToHsl(r, g, b);

  const stops: Record<number, number> = {
    50: 0.97, 100: 0.94, 200: 0.86, 300: 0.76, 400: 0.64,
    500: 0.50, 600: 0.41, 700: 0.32, 800: 0.24, 900: 0.16, 950: 0.10,
  };

  const result: Record<number, string> = {};
  for (const [stop, lightness] of Object.entries(stops)) {
    const [nr, ng, nb] = hslToRgb(h, s, lightness);
    result[Number(stop)] = rgbToHex(nr, ng, nb);
  }
  return result;
}

/**
 * Computes a CSS custom-property map from a brand hex color.
 * Keys match the `--brand-{stop}` convention consumed by Tailwind.
 */
export function computeBrandTokens(hex: string): Record<string, string> {
  const tones = deriveTones(hex);
  const tokens: Record<string, string> = { '--brand-base': hex };
  for (const [stop, color] of Object.entries(tones)) {
    tokens[`--brand-${stop}`] = color;
  }
  return tokens;
}

/**
 * WCAG 2.1 contrast ratio between two hex colors.
 * Returns a value between 1 and 21.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  hexSchema.parse(hex1);
  hexSchema.parse(hex2);
  const l1 = relativeLuminance(...hexToRgb(hex1));
  const l2 = relativeLuminance(...hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface BrandColorValidation {
  valid: boolean;
  reason?: string;
  contrastOnWhite: number;
  contrastOnBlack: number;
}

/**
 * Validates a hex brand color against WCAG AA requirements.
 * Minimum contrast of 4.5:1 against either white (#ffffff) or black (#000000).
 */
export function validateBrandColor(hex: string): BrandColorValidation {
  const parsed = hexSchema.safeParse(hex);
  if (!parsed.success) {
    return { valid: false, reason: parsed.error.errors[0]?.message ?? 'Invalid hex', contrastOnWhite: 0, contrastOnBlack: 0 };
  }
  const onWhite = contrastRatio(hex, '#ffffff');
  const onBlack = contrastRatio(hex, '#000000');
  const passes = onWhite >= 4.5 || onBlack >= 4.5;
  return {
    valid: passes,
    reason: passes ? undefined : `Contrast too low (white: ${onWhite.toFixed(2)}, black: ${onBlack.toFixed(2)}). Minimum 4.5:1 required.`,
    contrastOnWhite: onWhite,
    contrastOnBlack: onBlack,
  };
}
