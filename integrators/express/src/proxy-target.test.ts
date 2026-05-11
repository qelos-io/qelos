import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolveQelosProxyTarget } from './proxy-target';
import type { QelosExpressConfig } from './types';

const PROXY_ENV_KEYS = [
  'QELOS_PROXY_TARGET',
  'QELOS_IP',
  'QELOS_API_IP',
] as const;

function clearProxyEnv(): void {
  for (const key of PROXY_ENV_KEYS) {
    delete process.env[key];
  }
}

describe('resolveQelosProxyTarget', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of PROXY_ENV_KEYS) {
      savedEnv[key] = process.env[key];
    }
    clearProxyEnv();
  });

  afterEach(() => {
    for (const key of PROXY_ENV_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  it('uses QELOS_PROXY_TARGET when set, even if other env vars and appUrl exist', () => {
    process.env.QELOS_PROXY_TARGET = 'https://from-express-env.example';
    process.env.QELOS_IP = 'https://from-qelos-ip.example';
    process.env.QELOS_API_IP = 'https://from-qelos-api-ip.example';
    const config: QelosExpressConfig = {
      appUrl: 'https://from-app-url.example',
    };
    assert.equal(
      resolveQelosProxyTarget(config),
      'https://from-express-env.example',
    );
  });

  it('falls back to QELOS_IP when QELOS_PROXY_TARGET is unset', () => {
    process.env.QELOS_IP = 'https://from-qelos-ip.example';
    process.env.QELOS_API_IP = 'https://from-qelos-api-ip.example';
    const config: QelosExpressConfig = {
      appUrl: 'https://from-app-url.example',
    };
    assert.equal(
      resolveQelosProxyTarget(config),
      'https://from-qelos-ip.example',
    );
  });

  it('falls back to QELOS_API_IP when higher-priority env vars are unset', () => {
    process.env.QELOS_API_IP = 'https://from-qelos-api-ip.example';
    const config: QelosExpressConfig = {
      appUrl: 'https://from-app-url.example',
    };
    assert.equal(
      resolveQelosProxyTarget(config),
      'https://from-qelos-api-ip.example',
    );
  });

  it('falls back to config.appUrl when no env var is set', () => {
    const config: QelosExpressConfig = {
      appUrl: 'https://from-app-url.example',
    };
    assert.equal(
      resolveQelosProxyTarget(config),
      'https://from-app-url.example',
    );
  });

  it('returns undefined when nothing is configured', () => {
    const config: QelosExpressConfig = { appUrl: '' };
    assert.equal(resolveQelosProxyTarget(config), undefined);
  });

  it('treats whitespace-only values as unset', () => {
    process.env.QELOS_PROXY_TARGET = '   ';
    process.env.QELOS_IP = '\t';
    const config: QelosExpressConfig = {
      appUrl: 'https://from-app-url.example',
    };
    assert.equal(
      resolveQelosProxyTarget(config),
      'https://from-app-url.example',
    );
  });

  it('trims surrounding whitespace from resolved values', () => {
    const config: QelosExpressConfig = {
      appUrl: '  https://trimmed.example  ',
    };
    assert.equal(
      resolveQelosProxyTarget(config),
      'https://trimmed.example',
    );
  });
});
