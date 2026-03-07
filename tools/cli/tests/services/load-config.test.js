const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const yaml = require('yaml');

/**
 * Mirrors the logic from services/load-config.mjs for testability in CJS.
 * Any changes to the source must be reflected here.
 */
const CONFIG_FILES = ['qelos.config.json', 'qelos.config.yaml', 'qelos.config.yml'];

let _config = null;

function resolveConfigFile({ configPath, cwd } = {}) {
  if (configPath) {
    const resolved = path.join(cwd || process.cwd(), configPath);
    if (fs.existsSync(resolved)) {
      return { path: resolved, content: fs.readFileSync(resolved, 'utf-8') };
    }
    return null;
  }

  const dir = cwd || process.cwd();
  for (const file of CONFIG_FILES) {
    const filePath = path.join(dir, file);
    if (fs.existsSync(filePath)) {
      return { path: filePath, content: fs.readFileSync(filePath, 'utf-8') };
    }
  }
  return null;
}

function parseConfigFile(filePath, content) {
  if (filePath.endsWith('.json')) {
    return JSON.parse(content);
  }
  return yaml.parse(content);
}

function loadConfig({ configPath, cwd, verbose } = {}) {
  const resolved = resolveConfigFile({ configPath, cwd });
  if (!resolved) {
    if (configPath && verbose) {
      console.warn(`Config file not found: ${configPath}`);
    }
    return null;
  }

  try {
    const config = parseConfigFile(resolved.path, resolved.content);
    if (verbose) console.log(`Loaded config file: ${resolved.path}`);
    _config = config;
    return config;
  } catch (error) {
    if (verbose) console.warn(`Failed to parse config file ${resolved.path}: ${error.message}`);
    return null;
  }
}

function getConfig() {
  return _config;
}

function getAgentConfig(agentNameOrId) {
  if (!_config?.agents || !agentNameOrId) return {};
  return _config.agents[agentNameOrId] || {};
}

function saveConfig(partial, { cwd, verbose } = {}) {
  const dir = cwd || process.cwd();
  const filePath = path.join(dir, 'qelos.config.json');

  let existing = {};
  if (fs.existsSync(filePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      existing = {};
    }
  }

  const merged = { ...existing, ...partial };
  if (existing.agents || partial.agents) {
    merged.agents = { ...existing.agents };
    if (partial.agents) {
      for (const [key, value] of Object.entries(partial.agents)) {
        merged.agents[key] = { ...(merged.agents[key] || {}), ...value };
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  if (verbose) console.log(`Saved config to: ${filePath}`);
  _config = merged;
  return merged;
}

function saveAgentConfig(agentNameOrId, agentOpts, options = {}) {
  return saveConfig({ agents: { [agentNameOrId]: agentOpts } }, options);
}

function resetConfig() {
  _config = null;
}

describe('load-config', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'load-config-test-'));
    resetConfig();
  });

  afterEach(() => {
    resetConfig();
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('resolveConfigFile', () => {
    it('should find qelos.config.json in cwd', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{}');
      const result = resolveConfigFile({ cwd: testDir });
      assert.notStrictEqual(result, null);
      assert.strictEqual(result.path, path.join(testDir, 'qelos.config.json'));
    });

    it('should find qelos.config.yaml in cwd', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.yaml'), 'key: value');
      const result = resolveConfigFile({ cwd: testDir });
      assert.notStrictEqual(result, null);
      assert.strictEqual(result.path, path.join(testDir, 'qelos.config.yaml'));
    });

    it('should find qelos.config.yml in cwd', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.yml'), 'key: value');
      const result = resolveConfigFile({ cwd: testDir });
      assert.notStrictEqual(result, null);
      assert.strictEqual(result.path, path.join(testDir, 'qelos.config.yml'));
    });

    it('should prefer json over yaml (discovery order)', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{"source":"json"}');
      fs.writeFileSync(path.join(testDir, 'qelos.config.yaml'), 'source: yaml');
      const result = resolveConfigFile({ cwd: testDir });
      assert.strictEqual(result.path, path.join(testDir, 'qelos.config.json'));
    });

    it('should prefer yaml over yml (discovery order)', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.yaml'), 'source: yaml');
      fs.writeFileSync(path.join(testDir, 'qelos.config.yml'), 'source: yml');
      const result = resolveConfigFile({ cwd: testDir });
      assert.strictEqual(result.path, path.join(testDir, 'qelos.config.yaml'));
    });

    it('should return null when no config file exists', () => {
      const result = resolveConfigFile({ cwd: testDir });
      assert.strictEqual(result, null);
    });

    it('should use explicit configPath when provided', () => {
      fs.writeFileSync(path.join(testDir, 'custom.json'), '{"custom":true}');
      const result = resolveConfigFile({ configPath: 'custom.json', cwd: testDir });
      assert.notStrictEqual(result, null);
      assert.strictEqual(result.path, path.join(testDir, 'custom.json'));
    });

    it('should return null when explicit configPath does not exist', () => {
      const result = resolveConfigFile({ configPath: 'nonexistent.json', cwd: testDir });
      assert.strictEqual(result, null);
    });

    it('should prefer explicit configPath over auto-discovery', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{"auto":true}');
      fs.writeFileSync(path.join(testDir, 'my-config.json'), '{"explicit":true}');
      const result = resolveConfigFile({ configPath: 'my-config.json', cwd: testDir });
      assert.deepStrictEqual(JSON.parse(result.content), { explicit: true });
    });
  });

  describe('parseConfigFile', () => {
    it('should parse JSON files', () => {
      const result = parseConfigFile('test.json', '{"key":"value"}');
      assert.deepStrictEqual(result, { key: 'value' });
    });

    it('should parse YAML files', () => {
      const result = parseConfigFile('test.yaml', 'key: value\nnested:\n  a: 1');
      assert.deepStrictEqual(result, { key: 'value', nested: { a: 1 } });
    });

    it('should parse YML files as YAML', () => {
      const result = parseConfigFile('test.yml', 'key: value');
      assert.deepStrictEqual(result, { key: 'value' });
    });

    it('should throw on invalid JSON', () => {
      assert.throws(() => parseConfigFile('test.json', '{invalid'));
    });
  });

  describe('loadConfig', () => {
    it('should load and parse a JSON config file', () => {
      const config = { qelosUrl: 'https://example.com', agents: {} };
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify(config));

      const result = loadConfig({ cwd: testDir });
      assert.deepStrictEqual(result, config);
    });

    it('should load and parse a YAML config file', () => {
      const yamlContent = `
qelosUrl: https://example.com
agents:
  my-agent:
    stream: true
    thread: abc123
`;
      fs.writeFileSync(path.join(testDir, 'qelos.config.yaml'), yamlContent);

      const result = loadConfig({ cwd: testDir });
      assert.strictEqual(result.qelosUrl, 'https://example.com');
      assert.strictEqual(result.agents['my-agent'].stream, true);
      assert.strictEqual(result.agents['my-agent'].thread, 'abc123');
    });

    it('should return null when no config file found', () => {
      const result = loadConfig({ cwd: testDir });
      assert.strictEqual(result, null);
    });

    it('should return null on parse error', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{broken json!!!');
      const result = loadConfig({ cwd: testDir });
      assert.strictEqual(result, null);
    });

    it('should set internal config state accessible via getConfig', () => {
      const config = { qelosUrl: 'https://test.com' };
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify(config));

      loadConfig({ cwd: testDir });
      assert.deepStrictEqual(getConfig(), config);
    });

    it('should log when verbose and config loaded', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{}');
      const consoleSpy = mock.method(console, 'log', () => {});

      loadConfig({ cwd: testDir, verbose: true });

      assert.ok(consoleSpy.mock.calls.some(c => typeof c.arguments[0] === 'string' && c.arguments[0].includes('Loaded config file:')));
      consoleSpy.mock.restore();
    });

    it('should warn when verbose and explicit config not found', () => {
      const consoleSpy = mock.method(console, 'warn', () => {});

      loadConfig({ configPath: 'missing.json', cwd: testDir, verbose: true });

      assert.ok(consoleSpy.mock.calls.some(c => c.arguments[0] === 'Config file not found: missing.json'));
      consoleSpy.mock.restore();
    });

    it('should warn when verbose and parse fails', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{broken');
      const consoleSpy = mock.method(console, 'warn', () => {});

      loadConfig({ cwd: testDir, verbose: true });

      assert.ok(consoleSpy.mock.calls.some(c => typeof c.arguments[0] === 'string' && c.arguments[0].includes('Failed to parse config file')));
      consoleSpy.mock.restore();
    });

    it('should not log when verbose is false', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{}');
      const logSpy = mock.method(console, 'log', () => {});
      const warnSpy = mock.method(console, 'warn', () => {});

      loadConfig({ cwd: testDir, verbose: false });

      assert.strictEqual(logSpy.mock.callCount(), 0);
      assert.strictEqual(warnSpy.mock.callCount(), 0);
      logSpy.mock.restore();
      warnSpy.mock.restore();
    });

    it('should load explicit config path', () => {
      const config = { qelosUrl: 'https://custom.com' };
      fs.writeFileSync(path.join(testDir, 'my.config.json'), JSON.stringify(config));

      const result = loadConfig({ configPath: 'my.config.json', cwd: testDir });
      assert.deepStrictEqual(result, config);
    });
  });

  describe('getConfig', () => {
    it('should return null before any config is loaded', () => {
      assert.strictEqual(getConfig(), null);
    });

    it('should return loaded config after loadConfig', () => {
      const config = { qelosUrl: 'https://test.com' };
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify(config));
      loadConfig({ cwd: testDir });
      assert.deepStrictEqual(getConfig(), config);
    });

    it('should return null after resetConfig', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{}');
      loadConfig({ cwd: testDir });
      resetConfig();
      assert.strictEqual(getConfig(), null);
    });
  });

  describe('getAgentConfig', () => {
    it('should return empty object when no config loaded', () => {
      assert.deepStrictEqual(getAgentConfig('my-agent'), {});
    });

    it('should return empty object when config has no agents', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify({ qelosUrl: 'x' }));
      loadConfig({ cwd: testDir });
      assert.deepStrictEqual(getAgentConfig('my-agent'), {});
    });

    it('should return empty object for unknown agent', () => {
      const config = { agents: { 'known-agent': { stream: true } } };
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify(config));
      loadConfig({ cwd: testDir });
      assert.deepStrictEqual(getAgentConfig('unknown-agent'), {});
    });

    it('should return agent config for known agent by name', () => {
      const config = {
        agents: {
          'my-agent': { stream: true, thread: 'thread-123', log: 'chat.log' }
        }
      };
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify(config));
      loadConfig({ cwd: testDir });

      const agentConfig = getAgentConfig('my-agent');
      assert.deepStrictEqual(agentConfig, { stream: true, thread: 'thread-123', log: 'chat.log' });
    });

    it('should return agent config for known agent by ID', () => {
      const config = {
        agents: {
          '507f1f77bcf86cd799439011': { json: true, export: 'output.txt' }
        }
      };
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify(config));
      loadConfig({ cwd: testDir });

      const agentConfig = getAgentConfig('507f1f77bcf86cd799439011');
      assert.deepStrictEqual(agentConfig, { json: true, export: 'output.txt' });
    });

    it('should return empty object when agentNameOrId is falsy', () => {
      const config = { agents: { 'my-agent': { stream: true } } };
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify(config));
      loadConfig({ cwd: testDir });

      assert.deepStrictEqual(getAgentConfig(undefined), {});
      assert.deepStrictEqual(getAgentConfig(null), {});
      assert.deepStrictEqual(getAgentConfig(''), {});
    });

    it('should return all supported agent options', () => {
      const agentOpts = {
        thread: 'thread-abc',
        log: 'conversation.log',
        export: 'response.md',
        json: false,
        stream: true
      };
      const config = { agents: { 'full-agent': agentOpts } };
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify(config));
      loadConfig({ cwd: testDir });

      assert.deepStrictEqual(getAgentConfig('full-agent'), agentOpts);
    });
  });

  describe('agent config defaults integration', () => {
    it('should apply config defaults only when argv value is undefined', () => {
      const config = {
        agents: {
          'my-agent': { stream: true, thread: 'config-thread', log: 'config.log' }
        }
      };
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify(config));
      loadConfig({ cwd: testDir });

      // Simulate argv with some values set by CLI flags
      const argv = { integrationId: 'my-agent', stream: undefined, thread: 'cli-thread', log: undefined };
      const agentDefaults = getAgentConfig(argv.integrationId);

      for (const [key, value] of Object.entries(agentDefaults)) {
        if (argv[key] === undefined) {
          argv[key] = value;
        }
      }

      // CLI flag should win
      assert.strictEqual(argv.thread, 'cli-thread');
      // Config defaults should fill in undefined values
      assert.strictEqual(argv.stream, true);
      assert.strictEqual(argv.log, 'config.log');
    });

    it('should not override explicit false values from CLI', () => {
      const config = {
        agents: { 'my-agent': { stream: true, json: true } }
      };
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify(config));
      loadConfig({ cwd: testDir });

      const argv = { integrationId: 'my-agent', stream: false, json: undefined };
      const agentDefaults = getAgentConfig(argv.integrationId);

      for (const [key, value] of Object.entries(agentDefaults)) {
        if (argv[key] === undefined) {
          argv[key] = value;
        }
      }

      // Explicit false from CLI should not be overridden
      assert.strictEqual(argv.stream, false);
      // Undefined should be filled from config
      assert.strictEqual(argv.json, true);
    });
  });

  describe('YAML config format', () => {
    it('should load full config from YAML', () => {
      const yamlContent = `
qelosUrl: https://my-qelos.example.com
agents:
  code-assistant:
    stream: true
    thread: persistent-thread-id
    log: ./logs/code-assistant.log
    export: ./output/response.md
  data-agent:
    json: true
    stream: false
`;
      fs.writeFileSync(path.join(testDir, 'qelos.config.yaml'), yamlContent);

      const config = loadConfig({ cwd: testDir });

      assert.strictEqual(config.qelosUrl, 'https://my-qelos.example.com');
      assert.strictEqual(config.agents['code-assistant'].stream, true);
      assert.strictEqual(config.agents['code-assistant'].thread, 'persistent-thread-id');
      assert.strictEqual(config.agents['code-assistant'].log, './logs/code-assistant.log');
      assert.strictEqual(config.agents['code-assistant'].export, './output/response.md');
      assert.strictEqual(config.agents['data-agent'].json, true);
      assert.strictEqual(config.agents['data-agent'].stream, false);
    });
  });

  describe('saveConfig', () => {
    it('should create qelos.config.json when it does not exist', () => {
      const result = saveConfig({ qelosUrl: 'https://new.com' }, { cwd: testDir });

      assert.deepStrictEqual(result, { qelosUrl: 'https://new.com' });
      const written = JSON.parse(fs.readFileSync(path.join(testDir, 'qelos.config.json'), 'utf-8'));
      assert.strictEqual(written.qelosUrl, 'https://new.com');
    });

    it('should merge with existing config', () => {
      fs.writeFileSync(
        path.join(testDir, 'qelos.config.json'),
        JSON.stringify({ qelosUrl: 'https://old.com', existing: true })
      );

      const result = saveConfig({ newKey: 'newVal' }, { cwd: testDir });

      assert.strictEqual(result.qelosUrl, 'https://old.com');
      assert.strictEqual(result.existing, true);
      assert.strictEqual(result.newKey, 'newVal');
    });

    it('should override top-level keys', () => {
      fs.writeFileSync(
        path.join(testDir, 'qelos.config.json'),
        JSON.stringify({ qelosUrl: 'https://old.com' })
      );

      const result = saveConfig({ qelosUrl: 'https://new.com' }, { cwd: testDir });
      assert.strictEqual(result.qelosUrl, 'https://new.com');
    });

    it('should deep-merge agents per agent key', () => {
      fs.writeFileSync(
        path.join(testDir, 'qelos.config.json'),
        JSON.stringify({
          agents: {
            'agent-a': { stream: true, log: 'old.log' },
            'agent-b': { json: true }
          }
        })
      );

      const result = saveConfig({
        agents: { 'agent-a': { log: 'new.log', export: 'out.md' } }
      }, { cwd: testDir });

      // agent-a: stream preserved, log overridden, export added
      assert.deepStrictEqual(result.agents['agent-a'], { stream: true, log: 'new.log', export: 'out.md' });
      // agent-b: untouched
      assert.deepStrictEqual(result.agents['agent-b'], { json: true });
    });

    it('should handle corrupt existing file gracefully', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{broken!!!');

      const result = saveConfig({ qelosUrl: 'https://fresh.com' }, { cwd: testDir });
      assert.strictEqual(result.qelosUrl, 'https://fresh.com');
    });

    it('should update internal config state', () => {
      saveConfig({ qelosUrl: 'https://saved.com' }, { cwd: testDir });
      assert.deepStrictEqual(getConfig(), { qelosUrl: 'https://saved.com' });
    });

    it('should log when verbose is true', () => {
      const consoleSpy = mock.method(console, 'log', () => {});

      saveConfig({ key: 'val' }, { cwd: testDir, verbose: true });

      assert.ok(consoleSpy.mock.calls.some(c => typeof c.arguments[0] === 'string' && c.arguments[0].includes('Saved config to:')));
      consoleSpy.mock.restore();
    });

    it('should not log when verbose is false', () => {
      const consoleSpy = mock.method(console, 'log', () => {});

      saveConfig({ key: 'val' }, { cwd: testDir, verbose: false });

      assert.strictEqual(consoleSpy.mock.callCount(), 0);
      consoleSpy.mock.restore();
    });

    it('should write pretty-printed JSON with trailing newline', () => {
      saveConfig({ key: 'val' }, { cwd: testDir });
      const raw = fs.readFileSync(path.join(testDir, 'qelos.config.json'), 'utf-8');
      assert.strictEqual(raw, JSON.stringify({ key: 'val' }, null, 2) + '\n');
    });
  });

  describe('saveAgentConfig', () => {
    it('should save agent options under agents key', () => {
      saveAgentConfig('moshe', { json: true, export: 'a.md' }, { cwd: testDir });

      const written = JSON.parse(fs.readFileSync(path.join(testDir, 'qelos.config.json'), 'utf-8'));
      assert.deepStrictEqual(written, {
        agents: { moshe: { json: true, export: 'a.md' } }
      });
    });

    it('should merge with existing agents', () => {
      fs.writeFileSync(
        path.join(testDir, 'qelos.config.json'),
        JSON.stringify({ agents: { existing: { stream: true } } })
      );

      saveAgentConfig('new-agent', { json: true }, { cwd: testDir });

      const written = JSON.parse(fs.readFileSync(path.join(testDir, 'qelos.config.json'), 'utf-8'));
      assert.deepStrictEqual(written.agents.existing, { stream: true });
      assert.deepStrictEqual(written.agents['new-agent'], { json: true });
    });

    it('should merge with existing agent options', () => {
      fs.writeFileSync(
        path.join(testDir, 'qelos.config.json'),
        JSON.stringify({ agents: { moshe: { stream: true, log: 'old.log' } } })
      );

      saveAgentConfig('moshe', { json: true, log: 'new.log' }, { cwd: testDir });

      const written = JSON.parse(fs.readFileSync(path.join(testDir, 'qelos.config.json'), 'utf-8'));
      assert.deepStrictEqual(written.agents.moshe, { stream: true, json: true, log: 'new.log' });
    });

    it('should preserve non-agent config keys', () => {
      fs.writeFileSync(
        path.join(testDir, 'qelos.config.json'),
        JSON.stringify({ qelosUrl: 'https://keep.com' })
      );

      saveAgentConfig('agent1', { stream: true }, { cwd: testDir });

      const written = JSON.parse(fs.readFileSync(path.join(testDir, 'qelos.config.json'), 'utf-8'));
      assert.strictEqual(written.qelosUrl, 'https://keep.com');
      assert.deepStrictEqual(written.agents.agent1, { stream: true });
    });

    it('should match the example: qelos agent moshe --json --export a.md --save', () => {
      saveAgentConfig('moshe', { json: true, export: 'a.md' }, { cwd: testDir });

      const written = JSON.parse(fs.readFileSync(path.join(testDir, 'qelos.config.json'), 'utf-8'));
      assert.deepStrictEqual(written, {
        agents: { moshe: { json: true, export: 'a.md' } }
      });
    });
  });
});
