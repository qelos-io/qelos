import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeIfNeeded, decodeMeUser } from '../src/services/decode-uri-fields';

test('decodeIfNeeded', async (t) => {
  await t.test('decodes URI-encoded values', () => {
    assert.equal(decodeIfNeeded('David%20Meir-Levy'), 'David Meir-Levy');
    assert.equal(
      decodeIfNeeded(encodeURIComponent('My Workspace / Special & Name')),
      'My Workspace / Special & Name',
    );
    assert.equal(decodeIfNeeded(encodeURIComponent('José García')), 'José García');
  });

  await t.test('leaves plain strings unchanged', () => {
    assert.equal(decodeIfNeeded('David Meir-Levy'), 'David Meir-Levy');
    assert.equal(decodeIfNeeded('user@example.com'), 'user@example.com');
    assert.equal(decodeIfNeeded('100% legit'), '100% legit');
  });

  await t.test('passes through empty and undefined values', () => {
    assert.equal(decodeIfNeeded(''), '');
    assert.equal(decodeIfNeeded(undefined), undefined);
  });
});

test('decodeMeUser', async (t) => {
  await t.test('decodes user and workspace name fields', () => {
    const encoded = {
      _id: 'user-1',
      name: 'David%20Meir-Levy',
      fullName: 'David%20Meir-Levy',
      firstName: 'David',
      lastName: 'Meir-Levy',
      workspace: {
        _id: 'ws-1',
        name: encodeURIComponent('My Workspace / Special & Name'),
        roles: ['admin'],
      },
    };

    const decoded = decodeMeUser(encoded);

    assert.equal(decoded.name, 'David Meir-Levy');
    assert.equal(decoded.fullName, 'David Meir-Levy');
    assert.equal(decoded.firstName, 'David');
    assert.equal(decoded.lastName, 'Meir-Levy');
    assert.equal(decoded.workspace.name, 'My Workspace / Special & Name');
    assert.equal(decoded._id, 'user-1');
    assert.deepEqual(decoded.workspace.roles, ['admin']);
  });

  await t.test('leaves non-encoded fields unchanged', () => {
    const user = {
      _id: 'user-1',
      username: 'david@example.com',
      email: 'david@example.com',
      name: 'David Meir-Levy',
      fullName: 'David Meir-Levy',
      firstName: 'David',
      lastName: 'Meir-Levy',
      roles: ['user'],
      metadata: {},
    };

    assert.deepEqual(decodeMeUser(user), user);
  });
});

test('getLoggedInUser decodes /api/me response', async (t) => {
  const { default: QelosSDK } = await import('../src/index');

  await t.test('returns decoded user fields', async () => {
    const sdk = new QelosSDK({
      appUrl: 'http://localhost:3000',
      accessToken: 'test-token',
      fetch: async () => {
        const res = new Response(
          JSON.stringify({
            _id: '6a33dcba2c798875d68aa8ab',
            tenant: '6a280e991bbd4078edefe097',
            username: 'david@davidlevy.co.il',
            email: 'david@davidlevy.co.il',
            name: 'David%20Meir-Levy',
            fullName: 'David%20Meir-Levy',
            firstName: 'David',
            lastName: 'Meir-Levy',
            roles: ['user'],
            metadata: {},
            workspace: {
              _id: 'ws-1',
              name: encodeURIComponent('Acme / Dev'),
              roles: ['admin'],
            },
          }),
        );
        res.headers.set('Content-Type', 'application/json');
        return res;
      },
    });

    const user = await sdk.authentication.getLoggedInUser();

    assert.equal(user.name, 'David Meir-Levy');
    assert.equal(user.fullName, 'David Meir-Levy');
    assert.equal(user.workspace.name, 'Acme / Dev');
    assert.equal(user.username, 'david@davidlevy.co.il');
  });
});
