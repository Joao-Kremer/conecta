import {
  computeBrandTokens,
  contrastRatio,
  deriveTones,
  hexSchema,
  validateBrandColor,
} from './color';

describe('hexSchema', () => {
  it('accepts valid 6-digit hex', () => {
    expect(() => hexSchema.parse('#2563eb')).not.toThrow();
    expect(() => hexSchema.parse('#FFFFFF')).not.toThrow();
  });

  it('rejects invalid formats', () => {
    expect(() => hexSchema.parse('2563eb')).toThrow();
    expect(() => hexSchema.parse('#abc')).toThrow();
    expect(() => hexSchema.parse('#gggggg')).toThrow();
  });
});

describe('deriveTones', () => {
  it('returns 11 stops', () => {
    const tones = deriveTones('#2563eb');
    expect(Object.keys(tones)).toHaveLength(11);
    expect(tones[50]).toBeDefined();
    expect(tones[950]).toBeDefined();
  });

  it('returns hex strings for each stop', () => {
    const tones = deriveTones('#2563eb');
    for (const color of Object.values(tones)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('lighter stops are lighter than darker stops', () => {
    const tones = deriveTones('#2563eb');
    // stop 50 should be much lighter (higher lightness) than stop 900
    // We verify by comparing luminance
    const parse = (hex: string) => parseInt(hex.slice(1, 3), 16);
    expect(parse(tones[50]!)).toBeGreaterThan(parse(tones[900]!));
  });
});

describe('computeBrandTokens', () => {
  it('includes --brand-base and all 11 stops', () => {
    const tokens = computeBrandTokens('#2563eb');
    expect(tokens['--brand-base']).toBe('#2563eb');
    expect(tokens['--brand-500']).toBeDefined();
    expect(Object.keys(tokens)).toHaveLength(12);
  });
});

describe('contrastRatio', () => {
  it('white on black is 21', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);
  });

  it('same color is 1', () => {
    expect(contrastRatio('#2563eb', '#2563eb')).toBeCloseTo(1, 1);
  });

  it('is symmetric', () => {
    const a = contrastRatio('#2563eb', '#ffffff');
    const b = contrastRatio('#ffffff', '#2563eb');
    expect(a).toBeCloseTo(b, 5);
  });
});

describe('validateBrandColor', () => {
  it('validates a dark blue (passes on white)', () => {
    const result = validateBrandColor('#1e3a8a');
    expect(result.valid).toBe(true);
    expect(result.contrastOnWhite).toBeGreaterThan(4.5);
  });

  it('reports contrast values correctly for a mid-gray', () => {
    // #9ca3af has low contrast on white but adequate on black — still valid
    const result = validateBrandColor('#9ca3af');
    expect(result.contrastOnWhite).toBeLessThan(4.5);
    expect(result.contrastOnBlack).toBeGreaterThan(4.5);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid hex format', () => {
    const result = validateBrandColor('notahex');
    expect(result.valid).toBe(false);
  });
});
