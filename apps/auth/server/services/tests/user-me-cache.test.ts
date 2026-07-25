import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMeResponse,
  buildProfileUpdate,
  decodeIfNeeded,
  userMeCacheKey,
} from '../user-me-cache';

const payload = {
  sub: 'user-1',
  tenant: 'tenant-a',
  username: 'user@example.com',
  email: 'user@example.com',
  firstName: 'Old',
  lastName: 'Name',
  fullName: 'Old%20Name',
  profileImage: 'https://example.com/old.png',
  roles: ['user'],
};

describe('userMeCacheKey', () => {
  it('builds a tenant-scoped cache key', () => {
    assert.equal(userMeCacheKey('tenant-a', 'user-1'), 'user-me:tenant-a:user-1');
  });
});

describe('decodeIfNeeded', () => {
  it('decodes URI-encoded values', () => {
    assert.equal(decodeIfNeeded('Hello%20World'), 'Hello World');
  });

  it('returns plain values unchanged', () => {
    assert.equal(decodeIfNeeded('Hello World'), 'Hello World');
  });
});

describe('buildMeResponse', () => {
  it('prefers cached profile fields over jwt payload', () => {
    const response = buildMeResponse(
      payload,
      {
        firstName: 'New',
        lastName: 'Person',
        fullName: 'New Person',
        name: 'New Person',
        profileImage: 'https://example.com/new.png',
        metadata: { department: 'Engineering' },
      },
      { department: 'Legacy' },
      null
    );

    assert.equal(response.firstName, 'New');
    assert.equal(response.lastName, 'Person');
    assert.equal(response.fullName, 'New Person');
    assert.equal(response.profileImage, 'https://example.com/new.png');
    assert.deepEqual(response.metadata, { department: 'Engineering' });
  });

  it('falls back to jwt payload and db metadata when cache is empty', () => {
    const response = buildMeResponse(payload, null, { department: 'Legacy' }, null);

    assert.equal(response.firstName, 'Old');
    assert.equal(response.lastName, 'Name');
    assert.equal(response.fullName, 'Old Name');
    assert.equal(response.profileImage, 'https://example.com/old.png');
    assert.deepEqual(response.metadata, { department: 'Legacy' });
  });
});

describe('buildProfileUpdate', () => {
  it('merges partial updates with cached profile data', () => {
    const profile = buildProfileUpdate(
      {
        firstName: 'Cached',
        lastName: 'User',
        fullName: 'Cached User',
        name: 'Cached User',
        metadata: { department: 'Sales' },
      },
      payload,
      { firstName: 'Updated' }
    );

    assert.equal(profile.firstName, 'Updated');
    assert.equal(profile.lastName, 'User');
    assert.equal(profile.fullName, 'Cached User');
    assert.deepEqual(profile.metadata, { department: 'Sales' });
  });

  it('stores cleared profile images', () => {
    const profile = buildProfileUpdate(null, payload, { profileImage: '' });

    assert.equal(profile.profileImage, null);
  });
});
