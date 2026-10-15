import { describe, expect, it } from 'vitest';
import { buildPayload, draftFromUser, firstErrorSection, generatePassword, validateUser } from '../user-draft';

const valid = () => ({ ...draftFromUser(undefined), firstName: 'Dana', lastName: 'Levy', username: 'd@x.com', password: 'longenough' });

describe('draftFromUser', () => {
  it('decodes names, copies roles and formats metadata', () => {
    const d = draftFromUser({ firstName: 'D%C3%A1na', lastName: 'L', username: 'a@b.c', roles: ['admin'], internalMetadata: { a: 1 } });
    expect(d).toMatchObject({ firstName: 'Dána', roles: ['admin'], password: '' });
    expect(JSON.parse(d.internalMetadata)).toEqual({ a: 1 });
  });

  it('starts a new user with the user role and empty metadata', () => {
    expect(draftFromUser(undefined)).toMatchObject({ roles: ['user'], internalMetadata: '{}', username: '' });
  });

  it('keeps names that are not valid encodings', () => {
    expect(draftFromUser({ firstName: '100%' }).firstName).toBe('100%');
  });
});

describe('validateUser', () => {
  it('accepts a complete new user', () => {
    expect(validateUser(valid(), 'create')).toEqual({});
  });

  it('checks names, email, password and roles', () => {
    const errors = validateUser({ ...valid(), firstName: 'D', lastName: '', username: 'nope', password: '123', roles: [] }, 'create');
    expect(Object.keys(errors).sort()).toEqual(['firstName', 'lastName', 'password', 'roles', 'username']);
  });

  it('requires a password only for new users, and 8 characters when one is given', () => {
    expect(validateUser({ ...valid(), password: '' }, 'create').password).toBeTruthy();
    expect(validateUser({ ...valid(), password: '' }, 'edit')).toEqual({});
    expect(validateUser({ ...valid(), password: 'short' }, 'edit').password).toBeTruthy();
  });

  it('does not check email, roles or metadata for your own profile', () => {
    expect(validateUser({ ...valid(), username: '', roles: [], internalMetadata: 'x' }, 'self')).toEqual({});
  });

  it('rejects metadata that is not a JSON object', () => {
    ['{', '[]', 'null', '3'].forEach((text) => expect(validateUser({ ...valid(), internalMetadata: text }, 'edit').internalMetadata).toBeTruthy());
    expect(validateUser({ ...valid(), internalMetadata: '{"a":1}' }, 'edit')).toEqual({});
  });

  it('points at the first section with an error', () => {
    expect(firstErrorSection({ password: 'x', internalMetadata: 'x' })).toBe('access');
    expect(firstErrorSection({ firstName: 'x', password: 'x' })).toBe('profile');
    expect(firstErrorSection({})).toBeUndefined();
  });
});

describe('buildPayload', () => {
  it('sends everything filled in for a new user', () => {
    expect(buildPayload({ ...valid(), profileImage: '' }, undefined, 'create')).toEqual({
      firstName: 'Dana', lastName: 'Levy', username: 'd@x.com', password: 'longenough', roles: ['user'], internalMetadata: {},
    });
  });

  it('sends only what changed for an existing user', () => {
    const base = { ...valid(), password: '' };
    expect(buildPayload(base, base, 'edit')).toEqual({});
    expect(buildPayload({ ...base, firstName: ' Dan ', roles: ['admin'], password: 'newpassword' }, base, 'edit')).toEqual({ firstName: 'Dan', roles: ['admin'], password: 'newpassword' });
    expect(buildPayload({ ...base, profileImage: '' }, { ...base, profileImage: 'http://i' }, 'edit')).toEqual({ profileImage: '' });
  });

  it('never sends email, roles or metadata from your own profile', () => {
    const base = { ...valid(), password: '' };
    expect(buildPayload({ ...base, username: 'z@z.zz', roles: ['admin'], internalMetadata: '{"a":1}', lastName: 'New' }, base, 'self')).toEqual({ lastName: 'New' });
  });
});

describe('generatePassword', () => {
  it('has the length asked for and only readable characters', () => {
    expect(generatePassword(20)).toMatch(/^[A-HJ-NP-Za-km-z2-9]{20}$/);
    expect(generatePassword(4, () => 0)).toBe('AAAA');
  });
});
