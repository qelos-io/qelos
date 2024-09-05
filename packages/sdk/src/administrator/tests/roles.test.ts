import * as assert from 'node:assert/strict';
import {  QelosSDKOptions } from '../../types';
import { QlRoles } from '../roles';

const { describe, beforeEach, test } = require('node:test')

describe('QlRoles', () => {
  let options: QelosSDKOptions

  beforeEach(() => {
    // Initialize SDK with the mocked fetch function and mock authentication
    options = {
      appUrl: 'http://localhost:3000',
      fetch: () => null,
      extraHeaders: async () => ({}),
      refreshToken: 'mock-refresh-token' // Ensure a mock refresh token is set
    };
  });

  test('should instantiate the roles property', () => {
    const rolesSdk = new QlRoles(options);
    assert.ok(rolesSdk);
  });

  test('should fetch roles successfully', async () => {
    // Mock fetch to return a valid JSON response
    options.fetch = async () => {
      const res = new Response(JSON.stringify(['admin', 'user', 'plugin']))
      res.headers.set('Content-Type', 'application/json');
      return res;
    }

    const rolesSdk = new QlRoles(options);

    // Call the function and verify results
    const roles = await rolesSdk.getExistingRoles();
    assert.deepEqual(roles, ['admin', 'user', 'plugin']);
  });
});
