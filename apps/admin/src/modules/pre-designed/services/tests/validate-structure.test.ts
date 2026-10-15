// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { completeRequirements, duplicateKeys, isRequirementComplete, requirementType, validateStructure } from '../validate-structure';

describe('validateStructure', () => {
  it('accepts html and kebab-case components, and empty markup', () => {
    expect(validateStructure('<div><quick-table :data="x"></quick-table></div>')).toBeNull();
    expect(validateStructure('')).toBeNull();
    expect(validateStructure(undefined)).toBeNull();
  });

  it('rejects components that are not kebab-case', () => {
    expect(validateStructure('<QuickTable></QuickTable>')?.key).toContain('Invalid tag'); // lower-cased by the parser, no dash
    expect(validateStructure('<foo></foo>')).toEqual({ key: 'Invalid tag "{tag}". Custom components must use kebab-case.', params: { tag: 'FOO' } });
    expect(validateStructure('<foo_bar-x></foo_bar-x>')?.key).toContain('Invalid tag');
  });
});

describe('requirements', () => {
  it('knows when a requirement can be loaded', () => {
    expect(isRequirementComplete({ key: 'a', fromBlueprint: { name: 'todo' } } as any)).toBe(true);
    expect(isRequirementComplete({ key: 'a', fromBlueprint: { name: '' } } as any)).toBe(false);
    expect(isRequirementComplete({ key: ' ', fromCrud: { name: 'x' } } as any)).toBe(false);
    expect(isRequirementComplete({ key: 'a', fromHTTP: { uri: '/x' } } as any)).toBe(true);
    expect(isRequirementComplete({ key: 'a', fromData: {} } as any)).toBe(true);
    expect(isRequirementComplete({ key: 'a' })).toBe(false);
    expect(completeRequirements([{ key: 'a', fromData: {} } as any, { key: '' } as any])).toHaveLength(1);
    expect(completeRequirements(undefined)).toEqual([]);
  });

  it('reports the type and duplicate keys', () => {
    expect(requirementType({ fromCrud: { name: 'x' } } as any)).toBe('fromCrud');
    expect(requirementType({})).toBe('');
    expect([...duplicateKeys([{ key: 'a' }, { key: 'b' }, { key: 'a' }, { key: '' }, { key: '' }] as any)]).toEqual(['a']);
  });
});
