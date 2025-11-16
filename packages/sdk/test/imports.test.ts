import { test, describe } from 'node:test';
import * as assert from 'node:assert';

describe('SDK Import Paths', () => {
  test('should import main SDK without /dist or /src', async () => {
    const QelosSDK = (await import('../dist/index.js')).default;
    assert.ok(QelosSDK, 'Main SDK should be importable');
  });

  test('should import administrator SDK without /dist or /src', async () => {
    const QelosAdministratorSDK = (await import('../dist/administrator/index.js')).default;
    assert.ok(QelosAdministratorSDK, 'Administrator SDK should be importable');
  });

  test('should import types without /dist or /src', async () => {
    const types = await import('../dist/types.js');
    assert.ok(types, 'Types should be importable');
  });

  test('should import workspaces without /dist or /src', async () => {
    const workspaces = await import('../dist/workspaces.js');
    assert.ok(workspaces, 'Workspaces should be importable');
  });

  test('should import configurations without /dist or /src', async () => {
    const configurations = await import('../dist/configurations.js');
    assert.ok(configurations, 'Configurations should be importable');
  });
});
