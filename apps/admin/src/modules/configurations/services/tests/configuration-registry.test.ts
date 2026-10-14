import { describe, expect, it } from 'vitest';
import { buildConfigurationsView, getConfigurationInfo, REQUIRED_CONFIGURATIONS, CONFIGURATION_INFO } from '../configuration-registry';

const list = [
  { key: 'app-configuration', public: true },
  { key: 'workspace-configuration', public: true },
  { key: 'mcp-configuration', public: false },
  { key: 'migration', public: false, kind: 'system' },
  { key: 'my-flags', public: true, description: 'Feature flags' },
];

describe('getConfigurationInfo', () => {
  it('knows the standard keys and auth variants', () => {
    expect(getConfigurationInfo('app-configuration')?.group).toBe('application');
    expect(getConfigurationInfo('auth-configuration-abc123')?.key).toBe('auth-configuration');
    expect(getConfigurationInfo('something-else')).toBeUndefined();
  });

  it('lists Appearance as a settings entry that is not a configuration document', () => {
    const view = buildConfigurationsView([]);
    const appearance = view.groups[0].rows.find((row) => row.info.key === 'appearance');
    expect(appearance?.info.route?.name).toBe('appearance');
  });

  it('describes every required configuration', () => {
    for (const key of Object.keys(REQUIRED_CONFIGURATIONS)) {
      expect(CONFIGURATION_INFO.some((info) => info.key === key)).toBe(true);
    }
  });
});

describe('buildConfigurationsView', () => {
  it('groups known configurations and leaves the rest as custom', () => {
    const view = buildConfigurationsView(list);
    expect(view.groups.map((g) => g.key)).toEqual(['application', 'connections', 'money']);
    expect(view.custom.map((c) => c.key)).toEqual(['migration', 'my-flags']);
  });

  it('keeps a known configuration visible before it exists', () => {
    const view = buildConfigurationsView([]);
    expect(view.groups[0].rows.some((row) => row.info.key === 'app-configuration' && !row.config)).toBe(true);
  });

  it('filters by search text across title, description and key', () => {
    const byTitle = buildConfigurationsView(list, { query: 'workspace' });
    expect(byTitle.groups.flatMap((g) => g.rows).map((r) => r.info.key)).toEqual(['workspace-configuration']);
    const custom = buildConfigurationsView(list, { query: 'flags' });
    expect(custom.custom.map((c) => c.key)).toEqual(['my-flags']);
  });

  it('filters by visibility', () => {
    const priv = buildConfigurationsView(list, { visibility: 'private' });
    expect(priv.groups.flatMap((g) => g.rows).filter((r) => r.config).map((r) => r.info.key)).toEqual(['mcp-configuration']);
    expect(priv.custom.map((c) => c.key)).toEqual(['migration']);
  });
});
