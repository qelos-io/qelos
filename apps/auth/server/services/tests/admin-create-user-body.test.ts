import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitAdminCreateUserBody } from '../admin-create-user-body';

describe('splitAdminCreateUserBody', () => {
  it('pulls roles out of userData so they can be applied after tenant is set', () => {
    const { requestedRoles, userData } = splitAdminCreateUserBody({
      username: 'a@example.com',
      password: 'secret',
      roles: ['admin'],
    });
    assert.deepEqual(requestedRoles, ['admin']);
    assert.equal(Object.prototype.hasOwnProperty.call(userData, 'roles'), false);
  });

  it('returns undefined requestedRoles when omitted', () => {
    const { requestedRoles, userData } = splitAdminCreateUserBody({
      username: 'b@example.com',
      password: 'secret',
    });
    assert.equal(requestedRoles, undefined);
    assert.equal(Object.prototype.hasOwnProperty.call(userData, 'roles'), false);
  });
});
