const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const yaml = require('yaml');

/**
 * Mirrors the logic from services/load-config.mjs for testability in CJS Jest.
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
      expect(result).not.toBeNull();
      expect(result.path).toBe(path.join(testDir, 'qelos.config.json'));
    });

    it('should find qelos.config.yaml in cwd', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.yaml'), 'key: value');
      const result = resolveConfigFile({ cwd: testDir });
      expect(result).not.toBeNull();
      expect(result.path).toBe(path.join(testDir, 'qelos.config.yaml'));
    });

    it('should find qelos.config.yml in cwd', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.yml'), 'key: value');
      const result = resolveConfigFile({ cwd: testDir });
      expect(result).not.toBeNull();
      expect(result.path).toBe(path.join(testDir, 'qelos.config.yml'));
    });

    it('should prefer json over yaml (discovery order)', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{"source":"json"}');
      fs.writeFileSync(path.join(testDir, 'qelos.config.yaml'), 'source: yaml');
      const result = resolveConfigFile({ cwd: testDir });
      expect(result.path).toBe(path.join(testDir, 'qelos.config.json'));
    });

    it('should prefer yaml over yml (discovery order)', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.yaml'), 'source: yaml');
      fs.writeFileSync(path.join(testDir, 'qelos.config.yml'), 'source: yml');
      const result = resolveConfigFile({ cwd: testDir });
      expect(result.path).toBe(path.join(testDir, 'qelos.config.yaml'));
    });

    it('should return null when no config file exists', () => {
      const result = resolveConfigFile({ cwd: testDir });
      expect(result).toBeNull();
    });

    it('should use explicit configPath when provided', () => {
      fs.writeFileSync(path.join(testDir, 'custom.json'), '{"custom":true}');
      const result = resolveConfigFile({ configPath: 'custom.json', cwd: testDir });
      expect(result).not.toBeNull();
      expect(result.path).toBe(path.join(testDir, 'custom.json'));
    });

    it('should return null when explicit configPath does not exist', () => {
      const result = resolveConfigFile({ configPath: 'nonexistent.json', cwd: testDir });
      expect(result).toBeNull();
    });

    it('should prefer explicit configPath over auto-discovery', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{"auto":true}');
      fs.writeFileSync(path.join(testDir, 'my-config.json'), '{"explicit":true}');
      const result = resolveConfigFile({ configPath: 'my-config.json', cwd: testDir });
      expect(JSON.parse(result.content)).toEqual({ explicit: true });
    });
  });

  describe('parseConfigFile', () => {
    it('should parse JSON files', () => {
      const result = parseConfigFile('test.json', '{"key":"value"}');
      expect(result).toEqual({ key: 'value' });
    });

    it('should parse YAML files', () => {
      const result = parseConfigFile('test.yaml', 'key: value\nnested:\n  a: 1');
      expect(result).toEqual({ key: 'value', nested: { a: 1 } });
    });

    it('should parse YML files as YAML', () => {
      const result = parseConfigFile('test.yml', 'key: value');
      expect(result).toEqual({ key: 'value' });
    });

    it('should throw on invalid JSON', () => {
      expect(() => parseConfigFile('test.json', '{invalid')).toThrow();
    });
  });

  describe('loadConfig', () => {
    it('should load and parse a JSON config file', () => {
      const config = { qelosUrl: 'https://example.com', agents: {} };
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify(config));

      const result = loadConfig({ cwd: testDir });
      expect(result).toEqual(config);
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
      expect(result.qelosUrl).toBe('https://example.com');
      expect(result.agents['my-agent'].stream).toBe(true);
      expect(result.agents['my-agent'].thread).toBe('abc123');
    });

    it('should return null when no config file found', () => {
      const result = loadConfig({ cwd: testDir });
      expect(result).toBeNull();
    });

    it('should return null on parse error', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{broken json!!!');
      const result = loadConfig({ cwd: testDir });
      expect(result).toBeNull();
    });

    it('should set internal config state accessible via getConfig', () => {
      const config = { qelosUrl: 'https://test.com' };
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify(config));

      loadConfig({ cwd: testDir });
      expect(getConfig()).toEqual(config);
    });

    it('should log when verbose and config loaded', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{}');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      loadConfig({ cwd: testDir, verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Loaded config file:')
      );
      consoleSpy.mockRestore();
    });

    it('should warn when verbose and explicit config not found', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      loadConfig({ configPath: 'missing.json', cwd: testDir, verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith('Config file not found: missing.json');
      consoleSpy.mockRestore();
    });

    it('should warn when verbose and parse fails', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{broken');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      loadConfig({ cwd: testDir, verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse config file')
      );
      consoleSpy.mockRestore();
    });

    it('should not log when verbose is false', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{}');
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      loadConfig({ cwd: testDir, verbose: false });

      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('should load explicit config path', () => {
      const config = { qelosUrl: 'https://custom.com' };
      fs.writeFileSync(path.join(testDir, 'my.config.json'), JSON.stringify(config));

      const result = loadConfig({ configPath: 'my.config.json', cwd: testDir });
      expect(result).toEqual(config);
    });
  });

  describe('getConfig', () => {
    it('should return null before any config is loaded', () => {
      expect(getConfig()).toBeNull();
    });

    it('should return loaded config after loadConfig', () => {
      const config = { qelosUrl: 'https://test.com' };
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify(config));
      loadConfig({ cwd: testDir });
      expect(getConfig()).toEqual(config);
    });

    it('should return null after resetConfig', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{}');
      loadConfig({ cwd: testDir });
      resetConfig();
      expect(getConfig()).toBeNull();
    });
  });

  describe('getAgentConfig', () => {
    it('should return empty object when no config loaded', () => {
      expect(getAgentConfig('my-agent')).toEqual({});
    });

    it('should return empty object when config has no agents', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify({ qelosUrl: 'x' }));
      loadConfig({ cwd: testDir });
      expect(getAgentConfig('my-agent')).toEqual({});
    });

    it('should return empty object for unknown agent', () => {
      const config = { agents: { 'known-agent': { stream: true } } };
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify(config));
      loadConfig({ cwd: testDir });
      expect(getAgentConfig('unknown-agent')).toEqual({});
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
      expect(agentConfig).toEqual({ stream: true, thread: 'thread-123', log: 'chat.log' });
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
      expect(agentConfig).toEqual({ json: true, export: 'output.txt' });
    });

    it('should return empty object when agentNameOrId is falsy', () => {
      const config = { agents: { 'my-agent': { stream: true } } };
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), JSON.stringify(config));
      loadConfig({ cwd: testDir });

      expect(getAgentConfig(undefined)).toEqual({});
      expect(getAgentConfig(null)).toEqual({});
      expect(getAgentConfig('')).toEqual({});
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

      expect(getAgentConfig('full-agent')).toEqual(agentOpts);
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
      expect(argv.thread).toBe('cli-thread');
      // Config defaults should fill in undefined values
      expect(argv.stream).toBe(true);
      expect(argv.log).toBe('config.log');
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
      expect(argv.stream).toBe(false);
      // Undefined should be filled from config
      expect(argv.json).toBe(true);
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

      expect(config.qelosUrl).toBe('https://my-qelos.example.com');
      expect(config.agents['code-assistant'].stream).toBe(true);
      expect(config.agents['code-assistant'].thread).toBe('persistent-thread-id');
      expect(config.agents['code-assistant'].log).toBe('./logs/code-assistant.log');
      expect(config.agents['code-assistant'].export).toBe('./output/response.md');
      expect(config.agents['data-agent'].json).toBe(true);
      expect(config.agents['data-agent'].stream).toBe(false);
    });
  });

  describe('saveConfig', () => {
    it('should create qelos.config.json when it does not exist', () => {
      const result = saveConfig({ qelosUrl: 'https://new.com' }, { cwd: testDir });

      expect(result).toEqual({ qelosUrl: 'https://new.com' });
      const written = JSON.parse(fs.readFileSync(path.join(testDir, 'qelos.config.json'), 'utf-8'));
      expect(written.qelosUrl).toBe('https://new.com');
    });

    it('should merge with existing config', () => {
      fs.writeFileSync(
        path.join(testDir, 'qelos.config.json'),
        JSON.stringify({ qelosUrl: 'https://old.com', existing: true })
      );

      const result = saveConfig({ newKey: 'newVal' }, { cwd: testDir });

      expect(result.qelosUrl).toBe('https://old.com');
      expect(result.existing).toBe(true);
      expect(result.newKey).toBe('newVal');
    });

    it('should override top-level keys', () => {
      fs.writeFileSync(
        path.join(testDir, 'qelos.config.json'),
        JSON.stringify({ qelosUrl: 'https://old.com' })
      );

      const result = saveConfig({ qelosUrl: 'https://new.com' }, { cwd: testDir });
      expect(result.qelosUrl).toBe('https://new.com');
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
      expect(result.agents['agent-a']).toEqual({ stream: true, log: 'new.log', export: 'out.md' });
      // agent-b: untouched
      expect(result.agents['agent-b']).toEqual({ json: true });
    });

    it('should handle corrupt existing file gracefully', () => {
      fs.writeFileSync(path.join(testDir, 'qelos.config.json'), '{broken!!!');

      const result = saveConfig({ qelosUrl: 'https://fresh.com' }, { cwd: testDir });
      expect(result.qelosUrl).toBe('https://fresh.com');
    });

    it('should update internal config state', () => {
      saveConfig({ qelosUrl: 'https://saved.com' }, { cwd: testDir });
      expect(getConfig()).toEqual({ qelosUrl: 'https://saved.com' });
    });

    it('should log when verbose is true', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      saveConfig({ key: 'val' }, { cwd: testDir, verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Saved config to:'));
      consoleSpy.mockRestore();
    });

    it('should not log when verbose is false', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      saveConfig({ key: 'val' }, { cwd: testDir, verbose: false });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should write pretty-printed JSON with trailing newline', () => {
      saveConfig({ key: 'val' }, { cwd: testDir });
      const raw = fs.readFileSync(path.join(testDir, 'qelos.config.json'), 'utf-8');
      expect(raw).toBe(JSON.stringify({ key: 'val' }, null, 2) + '\n');
    });
  });

  describe('saveAgentConfig', () => {
    it('should save agent options under agents key', () => {
      saveAgentConfig('moshe', { json: true, export: 'a.md' }, { cwd: testDir });

      const written = JSON.parse(fs.readFileSync(path.join(testDir, 'qelos.config.json'), 'utf-8'));
      expect(written).toEqual({
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
      expect(written.agents.existing).toEqual({ stream: true });
      expect(written.agents['new-agent']).toEqual({ json: true });
    });

    it('should merge with existing agent options', () => {
      fs.writeFileSync(
        path.join(testDir, 'qelos.config.json'),
        JSON.stringify({ agents: { moshe: { stream: true, log: 'old.log' } } })
      );

      saveAgentConfig('moshe', { json: true, log: 'new.log' }, { cwd: testDir });

      const written = JSON.parse(fs.readFileSync(path.join(testDir, 'qelos.config.json'), 'utf-8'));
      expect(written.agents.moshe).toEqual({ stream: true, json: true, log: 'new.log' });
    });

    it('should preserve non-agent config keys', () => {
      fs.writeFileSync(
        path.join(testDir, 'qelos.config.json'),
        JSON.stringify({ qelosUrl: 'https://keep.com' })
      );

      saveAgentConfig('agent1', { stream: true }, { cwd: testDir });

      const written = JSON.parse(fs.readFileSync(path.join(testDir, 'qelos.config.json'), 'utf-8'));
      expect(written.qelosUrl).toBe('https://keep.com');
      expect(written.agents.agent1).toEqual({ stream: true });
    });

    it('should match the example: qelos agent moshe --json --export a.md --save', () => {
      saveAgentConfig('moshe', { json: true, export: 'a.md' }, { cwd: testDir });

      const written = JSON.parse(fs.readFileSync(path.join(testDir, 'qelos.config.json'), 'utf-8'));
      expect(written).toEqual({
        agents: { moshe: { json: true, export: 'a.md' } }
      });
    });
  });
});
