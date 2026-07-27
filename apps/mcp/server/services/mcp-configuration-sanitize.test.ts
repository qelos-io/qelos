import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeMcpConfigurationMetadata } from '@qelos/global-types';

describe('sanitizeMcpConfigurationMetadata', () => {
  it('removes forbidden tool categories such as secrets', () => {
    const configuration = sanitizeMcpConfigurationMetadata({
      enabled: true,
      permittedCallbackUrls: ['http://localhost/callback'],
      adminOnly: false,
      exposedTools: [
        {
          toolId: 'blueprints',
          enabled: true,
          roles: ['admin'],
          wsRoles: [],
          wsLabels: [],
        },
        {
          toolId: 'secrets',
          enabled: true,
          roles: ['admin'],
          wsRoles: [],
          wsLabels: [],
        },
      ],
    });

    assert.deepEqual(
      configuration.exposedTools.map((tool) => tool.toolId),
      ['blueprints'],
    );
  });
});
