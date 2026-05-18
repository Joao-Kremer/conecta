import { defineAbilityFor } from './ability';

describe('defineAbilityFor', () => {
  it('grants the action on the PascalCase subject for a simple permission', () => {
    const ability = defineAbilityFor({ permissions: ['student:read'] });

    expect(ability.can('read', 'Student')).toBe(true);
    expect(ability.can('update', 'Student')).toBe(false);
    expect(ability.can('read', 'School')).toBe(false);
  });

  it('drops the ownership scope suffix (UX-only, server enforces scope)', () => {
    const ability = defineAbilityFor({
      permissions: ['class:read.own-school', 'student:update.own'],
    });

    expect(ability.can('read', 'Class')).toBe(true);
    expect(ability.can('update', 'Student')).toBe(true);
  });

  it('converts snake/kebab resources to a single PascalCase subject', () => {
    const ability = defineAbilityFor({
      permissions: ['school_modality:update', 'payment-gateway:connect'],
    });

    expect(ability.can('update', 'SchoolModality')).toBe(true);
    expect(ability.can('connect', 'PaymentGateway')).toBe(true);
  });

  it('treats a user with no permissions as able to do nothing', () => {
    expect(defineAbilityFor({ permissions: [] }).can('read', 'Student')).toBe(false);
    expect(defineAbilityFor({ permissions: null }).can('read', 'Student')).toBe(false);
    expect(defineAbilityFor(null).can('read', 'Student')).toBe(false);
    expect(defineAbilityFor(undefined).can('read', 'Student')).toBe(false);
  });

  it('ignores malformed permission strings without throwing', () => {
    const ability = defineAbilityFor({
      permissions: ['', 'garbage', ':read', 'student:', 'student:read'],
    });

    expect(ability.can('read', 'Student')).toBe(true);
    expect(ability.can('read', '')).toBe(false);
  });
});
