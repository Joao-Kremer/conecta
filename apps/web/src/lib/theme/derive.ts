function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const lf = l / 100;
  const sf = s / 100;
  const a = sf * Math.min(lf, 1 - lf);
  const f = (n: number): string => {
    const k = (n + h / 30) % 12;
    const color = lf - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export interface BrandTones {
  base: string;
  strong: string;
  soft: string;
  on: string;
}

export function deriveBrandTones(hex: string): BrandTones {
  const [h, s, l] = hexToHsl(hex);
  const strong = hslToHex(h, Math.min(s, 85), Math.min(Math.round(l * 0.35), 28));
  const soft = hslToHex(h, Math.min(Math.round(s * 0.18), 18), 95);
  const on = l < 55 ? '#ffffff' : strong;
  return { base: hex, strong, soft, on };
}
