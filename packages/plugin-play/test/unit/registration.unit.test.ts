import { beforeEach, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import handlers, {
  onCallback,
  onFrontendAuthorization,
  onFrontendUnAuthorization,
  onManifest,
  onNewTenant,
  onRefreshToken,
  onStoreUser,
} from '../../src/handlers';
import { addInjectable } from '../../src/injectables';
import { addGroupedMicroFrontends, addMicroFrontend, NavBarPosition } from '../../src/micro-frontends';
import config, { setConfig } from '../../src/config';
import manifest from '../../src/manifest';

describe('handler registration', () => {
  const noop = () => undefined;

  test('every on* function adds its handler to its own list, in order', () => {
    const second = () => 'second';
    onRefreshToken(noop);
    onRefreshToken(second as any);
    onNewTenant(noop);
    onManifest(noop);
    onStoreUser(noop);
    onCallback(noop);
    onFrontendAuthorization(noop);
    onFrontendUnAuthorization(noop);
    assert.deepEqual(handlers.refreshToken, [noop, second]);
    for (const key of ['newTenant', 'manifest', 'storeUser', 'callback', 'frontendAuth', 'frontendUnAuth'] as const) {
      assert.deepEqual(handlers[key], [noop], key);
    }
  });
});

describe('setConfig', () => {
  test('merges options into the shared config object', () => {
    setConfig({ port: 4321, host: '10.0.0.1' });
    assert.equal(config.port, 4321);
    assert.equal(config.host, '10.0.0.1');
  });

  test('keeps the options it was not given', () => {
    setConfig({ accessTokenSecret: 'abc' });
    setConfig({ refreshTokenSecret: 'def' });
    assert.equal(config.accessTokenSecret, 'abc');
    assert.equal(config.refreshTokenSecret, 'def');
  });
});

describe('manifest additions', () => {
  beforeEach(() => {
    manifest.injectables.length = 0;
    manifest.microFrontends.length = 0;
    manifest.navBarGroups.length = 0;
  });

  test('addInjectable puts the injectable in the manifest', () => {
    addInjectable({ name: 'banner', html: '<b>hi</b>' });
    assert.deepEqual(manifest.injectables, [{ name: 'banner', html: '<b>hi</b>' }]);
  });

  test('addMicroFrontend stores a copy, not the caller\'s object', () => {
    const mfe = { name: 'Dash', description: 'd', url: 'https://x' };
    addMicroFrontend(mfe);
    assert.deepEqual(manifest.microFrontends[0], mfe);
    assert.notEqual(manifest.microFrontends[0], mfe);
  });

  test('addGroupedMicroFrontends adds the group and links every micro frontend to it by key', () => {
    addGroupedMicroFrontends({ key: 'sales', name: 'Sales' }, [
      { name: 'List', description: 'l', url: 'u', route: { name: 'list', path: 'list', navBarPosition: NavBarPosition.TOP } },
      { name: 'New', description: 'n', url: 'u2', route: { name: 'new', path: 'new', navBarPosition: false } },
    ]);
    assert.deepEqual(manifest.navBarGroups, [{ key: 'sales', name: 'Sales' }]);
    assert.deepEqual(manifest.microFrontends.map((m: any) => m.route.group), ['sales', 'sales']);
    assert.equal(manifest.microFrontends[0].route.path, 'list');
  });

  test('addGroupedMicroFrontends skips false, null and undefined entries (conditional screens)', () => {
    addGroupedMicroFrontends({ key: 'g', name: 'G' }, [false, null, undefined, { name: 'Only', description: 'o', url: 'u' }]);
    assert.equal(manifest.microFrontends.length, 1);
    assert.equal(manifest.navBarGroups.length, 1);
  });
});
