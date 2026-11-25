import type { MockQelosOptions } from '../config/types.js';

export class MockProductionError extends Error {
  code = 'QELOS_MOCK_PRODUCTION';
  constructor() {
    super(
      '@qelos/testing refuses to run when NODE_ENV=production. Set `allowInProduction: true` to force it (not recommended).',
    );
    this.name = 'MockProductionError';
  }
}

export function assertMockAllowed(
  config: Pick<MockQelosOptions, 'allowInProduction' | 'enabled'>,
  env: Record<string, string | undefined> = process.env,
) {
  if (config.enabled === false) return;
  if (env.NODE_ENV === 'production' && !config.allowInProduction) throw new MockProductionError();
}

export function mockBanner(config: Pick<MockQelosOptions, 'dataDir' | 'persist'>): string {
  const line = '='.repeat(64);
  return [
    line,
    ' QELOS DEV MOCK IS ACTIVE - serving a fake Qelos API from local state.',
    ` State: ${config.persist && config.dataDir ? config.dataDir : 'in-memory (not persisted)'}`,
    ' Do NOT use this in production.',
    line,
  ].join('\n');
}
