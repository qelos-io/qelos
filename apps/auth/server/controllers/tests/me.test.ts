import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { beforeEach, describe, it, mock } from 'node:test';

const require = createRequire(import.meta.url);
const userMeCache = require('../../services/user-me-cache');

const getCachedUserMeMock = mock.fn();
const setCachedUserMeMock = mock.fn();
const updateUserMock = mock.fn();
const getUserMock = mock.fn();
const getUserMetadataMock = mock.fn();

mock.module('../../services/user-me-cache', {
  namedExports: {
    buildMeResponse: userMeCache.buildMeResponse,
    profileFromUser: userMeCache.profileFromUser,
    resolveMeMetadata: userMeCache.resolveMeMetadata,
    getCachedUserMe: getCachedUserMeMock,
    setCachedUserMe: setCachedUserMeMock,
  },
});

mock.module('../../services/users', {
  namedExports: {
    getUser: getUserMock,
    getUserMetadata: getUserMetadataMock,
    updateUser: updateUserMock,
  },
});

mock.module('../../services/workspaces', {
  namedExports: {
    getWorkspaceForUser: mock.fn(async () => null),
  },
});

const payload = {
  sub: 'user-1',
  tenant: 'tenant-a',
  username: 'user@example.com',
  email: 'user@example.com',
  firstName: 'Jwt',
  lastName: 'Name',
  fullName: 'Jwt Name',
  roles: ['user'],
};

function createResMock() {
  let statusCode = 200;
  let jsonPayload: unknown = null;

  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: unknown) {
      jsonPayload = payload;
      return res;
    },
    end() {
      return res;
    },
  };

  return {
    res,
    get statusCode() {
      return statusCode;
    },
    get jsonPayload() {
      return jsonPayload;
    },
  };
}

function createMeReq(body: Record<string, unknown> = {}) {
  return {
    headers: { tenant: 'tenant-a' },
    userPayload: payload,
    activeWorkspace: null,
    authConfig: { additionalUserFields: [] },
    body,
    get() {
      return undefined;
    },
  } as any;
}

describe('me controller', async () => {
  const { getMe, setMe } = await import('../me');

  beforeEach(() => {
    getCachedUserMeMock.mock.resetCalls();
    setCachedUserMeMock.mock.resetCalls();
    updateUserMock.mock.resetCalls();
    getUserMock.mock.resetCalls();
    getUserMetadataMock.mock.resetCalls();
  });

  describe('getMe', () => {
    it('returns cached profile fields instead of jwt payload values', async () => {
      getCachedUserMeMock.mock.mockImplementation(async () => ({
        firstName: 'Cached',
        lastName: 'User',
        fullName: 'Cached User',
        name: 'Cached User',
        metadata: { department: 'Sales' },
      }));

      const mock = createResMock();
      await getMe(createMeReq(), mock.res);

      assert.equal(mock.statusCode, 200);
      assert.equal((mock.jsonPayload as any).firstName, 'Cached');
      assert.equal((mock.jsonPayload as any).fullName, 'Cached User');
      assert.deepEqual((mock.jsonPayload as any).metadata, { department: 'Sales' });
      assert.equal(getUserMetadataMock.mock.callCount(), 0);
    });

    it('loads metadata from db when cache entry has no metadata field', async () => {
      getCachedUserMeMock.mock.mockImplementation(async () => ({
        firstName: 'Cached',
        lastName: 'User',
        fullName: 'Cached User',
        name: 'Cached User',
      }));
      getUserMetadataMock.mock.mockImplementation(async () => ({
        department: 'Legacy',
      }));

      const mock = createResMock();
      await getMe(createMeReq(), mock.res);

      assert.deepEqual((mock.jsonPayload as any).metadata, { department: 'Legacy' });
      assert.equal(getUserMetadataMock.mock.callCount(), 1);
    });
  });

  describe('setMe', () => {
    it('caches persisted user data instead of unsaved request-body values', async () => {
      updateUserMock.mock.mockImplementation(async () => undefined);
      getUserMock.mock.mockImplementation(async () => ({
        firstName: 'Saved',
        lastName: 'Name',
        fullName: 'Saved Name',
        profileImage: 'https://example.com/avatar.png',
        birthDate: '1990-01-01',
        metadata: { department: 'Engineering' },
      }));

      const mock = createResMock();
      await setMe(
        createMeReq({
          firstName: '',
          lastName: '',
          fullName: '',
        }),
        mock.res
      );

      assert.equal(mock.statusCode, 200);
      assert.equal(updateUserMock.mock.callCount(), 1);
      assert.equal(setCachedUserMeMock.mock.callCount(), 1);

      const cachedProfile = setCachedUserMeMock.mock.calls[0].arguments[2];
      assert.equal(cachedProfile.firstName, 'Saved');
      assert.equal(cachedProfile.fullName, 'Saved Name');
      assert.deepEqual(cachedProfile.metadata, { department: 'Engineering' });

      assert.equal((mock.jsonPayload as any).firstName, 'Saved');
      assert.equal((mock.jsonPayload as any).fullName, 'Saved Name');
      assert.deepEqual((mock.jsonPayload as any).metadata, { department: 'Engineering' });
    });

    it('includes db metadata in cache and response when request omits metadata', async () => {
      updateUserMock.mock.mockImplementation(async () => undefined);
      getUserMock.mock.mockImplementation(async () => ({
        firstName: 'David',
        lastName: 'Levy',
        fullName: 'David Levy',
        metadata: { department: 'Engineering' },
      }));

      const mock = createResMock();
      await setMe(createMeReq({ firstName: 'David' }), mock.res);

      const cachedProfile = setCachedUserMeMock.mock.calls[0].arguments[2];
      assert.deepEqual(cachedProfile.metadata, { department: 'Engineering' });
      assert.deepEqual((mock.jsonPayload as any).metadata, { department: 'Engineering' });
    });

    it('returns 500 when update fails', async () => {
      updateUserMock.mock.mockImplementation(async () => {
        throw new Error('update failed');
      });

      const mock = createResMock();
      await setMe(createMeReq({ firstName: 'David' }), mock.res);

      assert.equal(mock.statusCode, 500);
      assert.deepEqual(mock.jsonPayload, {
        message: 'failed to update your user information',
      });
      assert.equal(setCachedUserMeMock.mock.callCount(), 0);
    });
  });
});
