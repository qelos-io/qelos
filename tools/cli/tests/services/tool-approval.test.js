const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

/**
 * Mirrors the ToolApprovalManager logic from services/agent/tool-approval.mjs for CJS testing.
 * Any changes to the source must be reflected here.
 */

// ─── Mirrored: ToolApprovalManager ────────────────────────────────────────────

class ToolApprovalManager {
  constructor({ preAllowed = new Set(), configDenied = new Set(), agentNameOrId, verbose = false } = {}) {
    this.preAllowed = new Set(preAllowed);
    this.sessionAllowed = new Set();
    this.sessionDenied = new Set(configDenied);
    this.agentNameOrId = agentNameOrId;
    this.verbose = verbose;

    // Injected for testing — avoids real config I/O
    this._persistAllowedCalls = [];
    this._persistDeniedCalls = [];
  }

  check(toolName) {
    if (this.preAllowed.has(toolName) || this.sessionAllowed.has(toolName)) {
      return 'allowed';
    }
    if (this.sessionDenied.has(toolName)) {
      return 'denied';
    }
    return 'ask';
  }

  record(toolName, decision) {
    switch (decision) {
      case 'yes':
        break;
      case 'yes_all':
        this.sessionAllowed.add(toolName);
        this._persistAllowedCalls.push(toolName);
        break;
      case 'no':
        break;
      case 'no_all':
        this.sessionDenied.add(toolName);
        this._persistDeniedCalls.push(toolName);
        break;
    }
  }

  getDeniedTools() {
    return new Set(this.sessionDenied);
  }
}

// ─── Mirrored: formatToolArgs ─────────────────────────────────────────────────

function formatToolArgs(toolName, args) {
  switch (toolName) {
    case 'bash':
      return args.command ? `$ ${args.command}` : '';
    case 'node':
      return args.code ? `code: ${args.code.slice(0, 120)}${args.code.length > 120 ? '…' : ''}` : '';
    case 'read':
      return args.path ? `path: ${args.path}` : '';
    case 'write':
      return args.path ? `path: ${args.path} (${(args.content || '').length} chars)` : '';
    case 'writeInLine':
      return args.path ? `path: ${args.path} at line ${args.line}` : '';
    case 'patch':
      return args.path ? `path: ${args.path}` : '';
    case 'removeLines':
      return args.path ? `path: ${args.path} lines ${args.startLine}-${args.endLine}` : '';
    case 'git_commit':
      return args.message ? `message: ${args.message}` : '';
    case 'git_diff':
      return args.file ? `file: ${args.file}` : (args.base ? `base: ${args.base}` : '');
    case 'git_show':
      return args.ref ? `ref: ${args.ref}` : '';
    default:
      const entries = Object.entries(args);
      if (entries.length === 0) return '';
      const [k, v] = entries[0];
      const val = typeof v === 'string' ? v.slice(0, 100) : JSON.stringify(v);
      return `${k}: ${val}`;
  }
}

// ─── Mirrored: buildAllClientTools (simplified, no handler execution) ─────────

const BUILTIN_TOOL_NAMES = [
  'bash', 'node', 'read', 'write', 'writeInLine', 'patch', 'removeLines',
  'git_status', 'git_diff', 'git_commit', 'git_log', 'git_diff_files', 'git_show',
];

function buildAllClientTools(configTools = [], excludeNames = new Set()) {
  const toolMap = new Map();

  for (const name of BUILTIN_TOOL_NAMES) {
    if (!excludeNames.has(name)) {
      toolMap.set(name, { name, description: `Built-in: ${name}`, schema: {} });
    }
  }

  for (const entry of configTools) {
    if (typeof entry === 'string') {
      continue;
    } else if (entry && typeof entry === 'object' && entry.name) {
      if (excludeNames.has(entry.name)) continue;
      const { name, description, schema, properties } = entry;
      const resolvedSchema = schema || (properties ? { type: 'object', properties } : undefined);
      toolMap.set(name, { name, description, schema: resolvedSchema });
    }
  }

  return Array.from(toolMap.values());
}

function buildClientTools(cliTools = [], configTools = []) {
  const toolMap = new Map();
  const flatCliTools = cliTools.flatMap(t => t.split(',').map(s => s.trim())).filter(Boolean);

  for (const name of flatCliTools) {
    if (BUILTIN_TOOL_NAMES.includes(name)) {
      toolMap.set(name, { name, description: `Built-in: ${name}`, schema: {} });
    }
  }

  for (const entry of configTools) {
    if (typeof entry === 'string') {
      if (BUILTIN_TOOL_NAMES.includes(entry)) {
        toolMap.set(entry, { name: entry, description: `Built-in: ${entry}`, schema: {} });
      }
    } else if (entry && typeof entry === 'object' && entry.name) {
      const { name, description, schema, properties } = entry;
      const resolvedSchema = schema || (properties ? { type: 'object', properties } : undefined);
      toolMap.set(name, { name, description, schema: resolvedSchema });
    }
  }

  return Array.from(toolMap.values());
}

// ─── Mirrored: persistence helpers (real config I/O) ──────────────────────────

function loadConfig(cwd) {
  const filePath = path.join(cwd, 'qelos.config.json');
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveConfig(partial, cwd) {
  const filePath = path.join(cwd, 'qelos.config.json');
  let existing = {};
  if (fs.existsSync(filePath)) {
    try { existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch {}
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
  return merged;
}

function saveAgentConfig(agentNameOrId, agentOpts, cwd) {
  return saveConfig({ agents: { [agentNameOrId]: agentOpts } }, cwd);
}

function getAgentConfig(agentNameOrId, cwd) {
  const config = loadConfig(cwd);
  if (!config?.agents || !agentNameOrId) return {};
  return config.agents[agentNameOrId] || {};
}

/**
 * Full persistence-enabled ToolApprovalManager for integration tests.
 * Mirrors the real class including _persistAllowed / _persistDenied.
 */
class ToolApprovalManagerWithPersistence {
  constructor({ preAllowed = new Set(), configDenied = new Set(), agentNameOrId, verbose = false, cwd }) {
    this.preAllowed = new Set(preAllowed);
    this.sessionAllowed = new Set();
    this.sessionDenied = new Set(configDenied);
    this.agentNameOrId = agentNameOrId;
    this.verbose = verbose;
    this.cwd = cwd; // test-injected working directory
  }

  check(toolName) {
    if (this.preAllowed.has(toolName) || this.sessionAllowed.has(toolName)) return 'allowed';
    if (this.sessionDenied.has(toolName)) return 'denied';
    return 'ask';
  }

  record(toolName, decision) {
    switch (decision) {
      case 'yes': break;
      case 'yes_all':
        this.sessionAllowed.add(toolName);
        this._persistAllowed(toolName);
        break;
      case 'no': break;
      case 'no_all':
        this.sessionDenied.add(toolName);
        this._persistDenied(toolName);
        break;
    }
  }

  getDeniedTools() {
    return new Set(this.sessionDenied);
  }

  _persistAllowed(toolName) {
    if (!this.agentNameOrId) return;
    const existing = getAgentConfig(this.agentNameOrId, this.cwd);
    const allowedTools = new Set(existing.allowedTools || []);
    const deniedTools = new Set(existing.deniedTools || []);
    allowedTools.add(toolName);
    deniedTools.delete(toolName);
    saveAgentConfig(this.agentNameOrId, {
      allowedTools: [...allowedTools],
      ...(deniedTools.size > 0 ? { deniedTools: [...deniedTools] } : existing.deniedTools ? { deniedTools: [] } : {}),
    }, this.cwd);
  }

  _persistDenied(toolName) {
    if (!this.agentNameOrId) return;
    const existing = getAgentConfig(this.agentNameOrId, this.cwd);
    const deniedTools = new Set(existing.deniedTools || []);
    const allowedTools = new Set(existing.allowedTools || []);
    deniedTools.add(toolName);
    allowedTools.delete(toolName);
    saveAgentConfig(this.agentNameOrId, {
      deniedTools: [...deniedTools],
      ...(allowedTools.size > 0 ? { allowedTools: [...allowedTools] } : existing.allowedTools ? { allowedTools: [] } : {}),
    }, this.cwd);
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('ToolApprovalManager', () => {
  describe('check', () => {
    it('should return "allowed" for pre-allowed tools', () => {
      const mgr = new ToolApprovalManager({ preAllowed: new Set(['bash', 'read']) });
      assert.strictEqual(mgr.check('bash'), 'allowed');
      assert.strictEqual(mgr.check('read'), 'allowed');
    });

    it('should return "denied" for config-denied tools', () => {
      const mgr = new ToolApprovalManager({ configDenied: new Set(['bash']) });
      assert.strictEqual(mgr.check('bash'), 'denied');
    });

    it('should return "ask" for unknown tools', () => {
      const mgr = new ToolApprovalManager({ preAllowed: new Set(['read']) });
      assert.strictEqual(mgr.check('bash'), 'ask');
      assert.strictEqual(mgr.check('write'), 'ask');
    });

    it('should return "allowed" for session-allowed tools', () => {
      const mgr = new ToolApprovalManager();
      mgr.record('bash', 'yes_all');
      assert.strictEqual(mgr.check('bash'), 'allowed');
    });

    it('should return "denied" for session-denied tools', () => {
      const mgr = new ToolApprovalManager();
      mgr.record('bash', 'no_all');
      assert.strictEqual(mgr.check('bash'), 'denied');
    });

    it('should return "ask" when constructor has empty sets', () => {
      const mgr = new ToolApprovalManager();
      assert.strictEqual(mgr.check('bash'), 'ask');
    });

    it('preAllowed should take priority over configDenied (pre-allowed wins)', () => {
      // If a tool is both pre-allowed and config-denied, pre-allowed wins
      // because check() evaluates preAllowed first
      const mgr = new ToolApprovalManager({
        preAllowed: new Set(['bash']),
        configDenied: new Set(['bash']),
      });
      assert.strictEqual(mgr.check('bash'), 'allowed');
    });
  });

  describe('record', () => {
    it('"yes" should not change any state', () => {
      const mgr = new ToolApprovalManager();
      mgr.record('bash', 'yes');
      assert.strictEqual(mgr.check('bash'), 'ask');
      assert.strictEqual(mgr.sessionAllowed.size, 0);
      assert.strictEqual(mgr.sessionDenied.size, 0);
    });

    it('"yes_all" should add to sessionAllowed', () => {
      const mgr = new ToolApprovalManager();
      mgr.record('bash', 'yes_all');
      assert.ok(mgr.sessionAllowed.has('bash'));
      assert.strictEqual(mgr.check('bash'), 'allowed');
    });

    it('"no" should not change any state', () => {
      const mgr = new ToolApprovalManager();
      mgr.record('bash', 'no');
      assert.strictEqual(mgr.check('bash'), 'ask');
      assert.strictEqual(mgr.sessionDenied.size, 0);
    });

    it('"no_all" should add to sessionDenied', () => {
      const mgr = new ToolApprovalManager();
      mgr.record('bash', 'no_all');
      assert.ok(mgr.sessionDenied.has('bash'));
      assert.strictEqual(mgr.check('bash'), 'denied');
    });

    it('"yes_all" should trigger persist callback', () => {
      const mgr = new ToolApprovalManager();
      mgr.record('bash', 'yes_all');
      assert.deepStrictEqual(mgr._persistAllowedCalls, ['bash']);
    });

    it('"no_all" should trigger persist callback', () => {
      const mgr = new ToolApprovalManager();
      mgr.record('node', 'no_all');
      assert.deepStrictEqual(mgr._persistDeniedCalls, ['node']);
    });

    it('multiple records should accumulate correctly', () => {
      const mgr = new ToolApprovalManager();
      mgr.record('bash', 'yes_all');
      mgr.record('node', 'no_all');
      mgr.record('read', 'yes');
      mgr.record('write', 'no');

      assert.strictEqual(mgr.check('bash'), 'allowed');
      assert.strictEqual(mgr.check('node'), 'denied');
      assert.strictEqual(mgr.check('read'), 'ask');    // 'yes' is one-time, no state change
      assert.strictEqual(mgr.check('write'), 'ask');    // 'no' is one-time, no state change
    });
  });

  describe('getDeniedTools', () => {
    it('should return a copy of session-denied tools', () => {
      const mgr = new ToolApprovalManager({ configDenied: new Set(['bash', 'node']) });
      const denied = mgr.getDeniedTools();

      assert.ok(denied.has('bash'));
      assert.ok(denied.has('node'));

      // Should be a copy, not the same reference
      denied.add('write');
      assert.ok(!mgr.sessionDenied.has('write'));
    });

    it('should return empty set when no denials', () => {
      const mgr = new ToolApprovalManager();
      const denied = mgr.getDeniedTools();
      assert.strictEqual(denied.size, 0);
    });

    it('should include both config-denied and session-denied tools', () => {
      const mgr = new ToolApprovalManager({ configDenied: new Set(['bash']) });
      mgr.record('node', 'no_all');
      const denied = mgr.getDeniedTools();

      assert.ok(denied.has('bash'));
      assert.ok(denied.has('node'));
      assert.strictEqual(denied.size, 2);
    });
  });

  describe('interactive mode tool filtering', () => {
    it('should filter denied tools from active tools list', () => {
      const allTools = buildAllClientTools();
      const mgr = new ToolApprovalManager({ configDenied: new Set(['bash', 'node']) });

      const getActiveTools = () => {
        const denied = mgr.getDeniedTools();
        if (denied.size === 0) return allTools;
        return allTools.filter(t => !denied.has(t.name));
      };

      const active = getActiveTools();
      assert.ok(!active.some(t => t.name === 'bash'));
      assert.ok(!active.some(t => t.name === 'node'));
      assert.ok(active.some(t => t.name === 'read'));
    });

    it('should update active tools when session denial is added', () => {
      const allTools = buildAllClientTools();
      const mgr = new ToolApprovalManager();

      const getActiveTools = () => {
        const denied = mgr.getDeniedTools();
        if (denied.size === 0) return allTools;
        return allTools.filter(t => !denied.has(t.name));
      };

      // Initially all tools active
      assert.strictEqual(getActiveTools().length, allTools.length);

      // Deny bash
      mgr.record('bash', 'no_all');
      const active = getActiveTools();
      assert.ok(!active.some(t => t.name === 'bash'));
      assert.strictEqual(active.length, allTools.length - 1);
    });

    it('should return all tools when no denials', () => {
      const allTools = buildAllClientTools();
      const mgr = new ToolApprovalManager();

      const denied = mgr.getDeniedTools();
      assert.strictEqual(denied.size, 0);
      // getActiveTools short-circuits when denied.size === 0
    });
  });
});

describe('formatToolArgs', () => {
  it('should format bash tool args', () => {
    assert.strictEqual(formatToolArgs('bash', { command: 'ls -la' }), '$ ls -la');
  });

  it('should return empty string for bash without command', () => {
    assert.strictEqual(formatToolArgs('bash', {}), '');
  });

  it('should format node tool args with truncation', () => {
    const shortCode = 'console.log("hi")';
    assert.strictEqual(formatToolArgs('node', { code: shortCode }), `code: ${shortCode}`);

    const longCode = 'x'.repeat(200);
    const result = formatToolArgs('node', { code: longCode });
    assert.ok(result.startsWith('code: '));
    assert.ok(result.endsWith('…'));
    assert.ok(result.length < 200); // Truncated
  });

  it('should format read tool args', () => {
    assert.strictEqual(formatToolArgs('read', { path: '/tmp/file.txt' }), 'path: /tmp/file.txt');
  });

  it('should format write tool args with char count', () => {
    assert.strictEqual(
      formatToolArgs('write', { path: '/tmp/file.txt', content: 'hello world' }),
      'path: /tmp/file.txt (11 chars)'
    );
  });

  it('should format write tool args with empty content', () => {
    assert.strictEqual(
      formatToolArgs('write', { path: '/tmp/file.txt' }),
      'path: /tmp/file.txt (0 chars)'
    );
  });

  it('should format writeInLine tool args', () => {
    assert.strictEqual(
      formatToolArgs('writeInLine', { path: '/tmp/file.txt', line: 5 }),
      'path: /tmp/file.txt at line 5'
    );
  });

  it('should format patch tool args', () => {
    assert.strictEqual(formatToolArgs('patch', { path: '/tmp/file.txt' }), 'path: /tmp/file.txt');
  });

  it('should format removeLines tool args', () => {
    assert.strictEqual(
      formatToolArgs('removeLines', { path: '/tmp/file.txt', startLine: 3, endLine: 7 }),
      'path: /tmp/file.txt lines 3-7'
    );
  });

  it('should format git_commit tool args', () => {
    assert.strictEqual(
      formatToolArgs('git_commit', { message: 'fix: resolve issue' }),
      'message: fix: resolve issue'
    );
  });

  it('should format git_diff with file', () => {
    assert.strictEqual(formatToolArgs('git_diff', { file: 'src/app.js' }), 'file: src/app.js');
  });

  it('should format git_diff with base', () => {
    assert.strictEqual(formatToolArgs('git_diff', { base: 'main' }), 'base: main');
  });

  it('should prefer file over base for git_diff', () => {
    assert.strictEqual(
      formatToolArgs('git_diff', { file: 'src/app.js', base: 'main' }),
      'file: src/app.js'
    );
  });

  it('should format git_show tool args', () => {
    assert.strictEqual(formatToolArgs('git_show', { ref: 'HEAD~1' }), 'ref: HEAD~1');
  });

  it('should format unknown tool with first key-value pair', () => {
    assert.strictEqual(
      formatToolArgs('custom_tool', { query: 'hello world', limit: 10 }),
      'query: hello world'
    );
  });

  it('should format unknown tool with non-string value as JSON', () => {
    assert.strictEqual(
      formatToolArgs('custom_tool', { count: 42 }),
      'count: 42'
    );
  });

  it('should return empty string for unknown tool with no args', () => {
    assert.strictEqual(formatToolArgs('custom_tool', {}), '');
  });
});

describe('buildAllClientTools', () => {
  it('should include all built-in tools', () => {
    const tools = buildAllClientTools();
    const names = tools.map(t => t.name);

    for (const expected of BUILTIN_TOOL_NAMES) {
      assert.ok(names.includes(expected), `Missing built-in tool: ${expected}`);
    }
  });

  it('should exclude tools in excludeNames set', () => {
    const tools = buildAllClientTools([], new Set(['bash', 'node']));
    const names = tools.map(t => t.name);

    assert.ok(!names.includes('bash'));
    assert.ok(!names.includes('node'));
    assert.ok(names.includes('read'));
    assert.ok(names.includes('write'));
  });

  it('should include custom tools from config', () => {
    const configTools = [
      { name: 'custom_search', description: 'Search tool', schema: { type: 'object', properties: {} } },
    ];
    const tools = buildAllClientTools(configTools);
    const names = tools.map(t => t.name);

    assert.ok(names.includes('custom_search'));
  });

  it('should exclude custom tools that are in excludeNames', () => {
    const configTools = [
      { name: 'custom_search', description: 'Search tool', schema: {} },
    ];
    const tools = buildAllClientTools(configTools, new Set(['custom_search']));
    const names = tools.map(t => t.name);

    assert.ok(!names.includes('custom_search'));
  });

  it('should skip string entries in configTools (handled as built-ins)', () => {
    const configTools = ['bash', 'read'];
    const tools = buildAllClientTools(configTools);
    // Should still have all built-ins (strings are skipped, built-ins already added)
    assert.strictEqual(tools.length, BUILTIN_TOOL_NAMES.length);
  });

  it('should resolve schema from properties shorthand', () => {
    const configTools = [
      { name: 'my_tool', description: 'Test', properties: { query: { type: 'string' } } },
    ];
    const tools = buildAllClientTools(configTools);
    const myTool = tools.find(t => t.name === 'my_tool');

    assert.ok(myTool);
    assert.deepStrictEqual(myTool.schema, { type: 'object', properties: { query: { type: 'string' } } });
  });

  it('should override built-in tool with custom config of same name', () => {
    const configTools = [
      { name: 'bash', description: 'Custom bash', schema: { type: 'object', properties: { cmd: { type: 'string' } } } },
    ];
    const tools = buildAllClientTools(configTools);
    const bashTool = tools.find(t => t.name === 'bash');

    assert.strictEqual(bashTool.description, 'Custom bash');
  });
});

describe('buildClientTools', () => {
  it('should build tools from CLI flag', () => {
    const tools = buildClientTools(['bash', 'read'], []);
    const names = tools.map(t => t.name);

    assert.ok(names.includes('bash'));
    assert.ok(names.includes('read'));
    assert.strictEqual(names.length, 2);
  });

  it('should handle comma-separated CLI tools', () => {
    const tools = buildClientTools(['bash,read,write'], []);
    const names = tools.map(t => t.name);

    assert.ok(names.includes('bash'));
    assert.ok(names.includes('read'));
    assert.ok(names.includes('write'));
    assert.strictEqual(names.length, 3);
  });

  it('should include config tools as strings', () => {
    const tools = buildClientTools([], ['bash', 'node']);
    const names = tools.map(t => t.name);

    assert.ok(names.includes('bash'));
    assert.ok(names.includes('node'));
  });

  it('should include custom tool objects from config', () => {
    const configTools = [
      { name: 'custom_deploy', description: 'Deploy', schema: {} },
    ];
    const tools = buildClientTools([], configTools);
    const names = tools.map(t => t.name);

    assert.ok(names.includes('custom_deploy'));
  });

  it('should merge CLI and config tools without duplicates', () => {
    const tools = buildClientTools(['bash'], ['bash', 'read']);
    const names = tools.map(t => t.name);

    assert.strictEqual(names.filter(n => n === 'bash').length, 1);
    assert.ok(names.includes('read'));
  });

  it('should return empty array when no tools specified', () => {
    const tools = buildClientTools([], []);
    assert.strictEqual(tools.length, 0);
  });
});

describe('approval flow integration', () => {
  it('should wire up pre-allowed from CLI tools + config allowedTools', () => {
    const cliTools = ['bash', 'read'];
    const configAllowedTools = ['node', 'write'];

    const explicitTools = buildClientTools(cliTools, []);
    const preAllowedNames = new Set([
      ...explicitTools.map(t => t.name),
      ...configAllowedTools,
    ]);

    const mgr = new ToolApprovalManager({ preAllowed: preAllowedNames });

    assert.strictEqual(mgr.check('bash'), 'allowed');
    assert.strictEqual(mgr.check('read'), 'allowed');
    assert.strictEqual(mgr.check('node'), 'allowed');
    assert.strictEqual(mgr.check('write'), 'allowed');
    assert.strictEqual(mgr.check('git_commit'), 'ask');
  });

  it('should wire up config-denied tools', () => {
    const configDeniedTools = new Set(['bash', 'node']);
    const mgr = new ToolApprovalManager({ configDenied: configDeniedTools });

    assert.strictEqual(mgr.check('bash'), 'denied');
    assert.strictEqual(mgr.check('node'), 'denied');
    assert.strictEqual(mgr.check('read'), 'ask');
  });

  it('interactive mode should offer all tools except config-denied', () => {
    const configDenied = new Set(['bash']);
    const allTools = buildAllClientTools([], configDenied);
    const names = allTools.map(t => t.name);

    assert.ok(!names.includes('bash'));
    assert.ok(names.includes('node'));
    assert.ok(names.includes('read'));
  });

  it('non-interactive mode should only use explicitly requested tools', () => {
    const tools = buildClientTools(['read', 'write'], []);
    const names = tools.map(t => t.name);

    assert.strictEqual(names.length, 2);
    assert.ok(names.includes('read'));
    assert.ok(names.includes('write'));
    assert.ok(!names.includes('bash'));
  });

  it('should simulate full approval flow: ask → yes → execute', () => {
    const mgr = new ToolApprovalManager({ preAllowed: new Set(['read']) });

    // read is pre-allowed
    assert.strictEqual(mgr.check('read'), 'allowed');

    // bash needs asking
    assert.strictEqual(mgr.check('bash'), 'ask');

    // User says "yes" (once) — still "ask" next time
    mgr.record('bash', 'yes');
    assert.strictEqual(mgr.check('bash'), 'ask');
  });

  it('should simulate full approval flow: ask → yes_all → allowed', () => {
    const mgr = new ToolApprovalManager({ preAllowed: new Set(['read']) });

    assert.strictEqual(mgr.check('bash'), 'ask');

    // User says "yes, always"
    mgr.record('bash', 'yes_all');
    assert.strictEqual(mgr.check('bash'), 'allowed');
  });

  it('should simulate full approval flow: ask → no → still ask', () => {
    const mgr = new ToolApprovalManager();

    assert.strictEqual(mgr.check('bash'), 'ask');

    // User says "no" (once) — still "ask" next time
    mgr.record('bash', 'no');
    assert.strictEqual(mgr.check('bash'), 'ask');
  });

  it('should simulate full approval flow: ask → no_all → denied and filtered', () => {
    const allTools = buildAllClientTools();
    const mgr = new ToolApprovalManager();

    // Deny bash for the whole session
    mgr.record('bash', 'no_all');
    assert.strictEqual(mgr.check('bash'), 'denied');

    // Tool should be filtered from active tools
    const denied = mgr.getDeniedTools();
    const active = allTools.filter(t => !denied.has(t.name));
    assert.ok(!active.some(t => t.name === 'bash'));
  });

  it('should handle denied tool result message format', () => {
    const mgr = new ToolApprovalManager();
    mgr.record('bash', 'no_all');

    const status = mgr.check('bash');
    assert.strictEqual(status, 'denied');

    // Simulate the error message that would be sent back
    const errorMsg = JSON.stringify({ error: `Tool "bash" was denied by the user. Do not attempt to use this tool again.` });
    const parsed = JSON.parse(errorMsg);
    assert.ok(parsed.error.includes('denied'));
    assert.ok(parsed.error.includes('bash'));
  });
});

describe('ToolApprovalManager persistence', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-approval-test-'));
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('"yes_all" should persist tool to config allowedTools', () => {
    // Set up initial config
    fs.writeFileSync(
      path.join(testDir, 'qelos.config.json'),
      JSON.stringify({ agents: { 'my-agent': {} } })
    );

    const mgr = new ToolApprovalManagerWithPersistence({
      agentNameOrId: 'my-agent',
      cwd: testDir,
    });

    mgr.record('bash', 'yes_all');

    const config = loadConfig(testDir);
    assert.ok(config.agents['my-agent'].allowedTools.includes('bash'));
  });

  it('"no_all" should persist tool to config deniedTools', () => {
    fs.writeFileSync(
      path.join(testDir, 'qelos.config.json'),
      JSON.stringify({ agents: { 'my-agent': {} } })
    );

    const mgr = new ToolApprovalManagerWithPersistence({
      agentNameOrId: 'my-agent',
      cwd: testDir,
    });

    mgr.record('bash', 'no_all');

    const config = loadConfig(testDir);
    assert.ok(config.agents['my-agent'].deniedTools.includes('bash'));
  });

  it('"yes_all" should remove tool from deniedTools if it was there', () => {
    fs.writeFileSync(
      path.join(testDir, 'qelos.config.json'),
      JSON.stringify({ agents: { 'my-agent': { deniedTools: ['bash', 'node'] } } })
    );

    const mgr = new ToolApprovalManagerWithPersistence({
      agentNameOrId: 'my-agent',
      cwd: testDir,
    });

    mgr.record('bash', 'yes_all');

    const config = loadConfig(testDir);
    assert.ok(config.agents['my-agent'].allowedTools.includes('bash'));
    assert.ok(!config.agents['my-agent'].deniedTools.includes('bash'));
    // node should still be denied
    assert.ok(config.agents['my-agent'].deniedTools.includes('node'));
  });

  it('"no_all" should remove tool from allowedTools if it was there', () => {
    fs.writeFileSync(
      path.join(testDir, 'qelos.config.json'),
      JSON.stringify({ agents: { 'my-agent': { allowedTools: ['bash', 'read'] } } })
    );

    const mgr = new ToolApprovalManagerWithPersistence({
      agentNameOrId: 'my-agent',
      cwd: testDir,
    });

    mgr.record('bash', 'no_all');

    const config = loadConfig(testDir);
    assert.ok(config.agents['my-agent'].deniedTools.includes('bash'));
    assert.ok(!config.agents['my-agent'].allowedTools.includes('bash'));
    // read should still be allowed
    assert.ok(config.agents['my-agent'].allowedTools.includes('read'));
  });

  it('should not persist when agentNameOrId is not set', () => {
    fs.writeFileSync(
      path.join(testDir, 'qelos.config.json'),
      JSON.stringify({ agents: {} })
    );

    const mgr = new ToolApprovalManagerWithPersistence({ cwd: testDir });
    mgr.record('bash', 'yes_all');

    // Session state should still be updated
    assert.strictEqual(mgr.check('bash'), 'allowed');

    // Config should not have been modified
    const config = loadConfig(testDir);
    assert.deepStrictEqual(config.agents, {});
  });

  it('should create config file if it does not exist', () => {
    const mgr = new ToolApprovalManagerWithPersistence({
      agentNameOrId: 'my-agent',
      cwd: testDir,
    });

    mgr.record('bash', 'yes_all');

    assert.ok(fs.existsSync(path.join(testDir, 'qelos.config.json')));
    const config = loadConfig(testDir);
    assert.ok(config.agents['my-agent'].allowedTools.includes('bash'));
  });

  it('should handle multiple sequential persist operations', () => {
    fs.writeFileSync(
      path.join(testDir, 'qelos.config.json'),
      JSON.stringify({ agents: { 'my-agent': {} } })
    );

    const mgr = new ToolApprovalManagerWithPersistence({
      agentNameOrId: 'my-agent',
      cwd: testDir,
    });

    mgr.record('bash', 'yes_all');
    mgr.record('node', 'yes_all');
    mgr.record('write', 'no_all');

    const config = loadConfig(testDir);
    assert.ok(config.agents['my-agent'].allowedTools.includes('bash'));
    assert.ok(config.agents['my-agent'].allowedTools.includes('node'));
    assert.ok(config.agents['my-agent'].deniedTools.includes('write'));
  });

  it('should preserve other agent configs when persisting', () => {
    fs.writeFileSync(
      path.join(testDir, 'qelos.config.json'),
      JSON.stringify({
        agents: {
          'other-agent': { stream: true, allowedTools: ['read'] },
          'my-agent': { thread: 'abc' },
        }
      })
    );

    const mgr = new ToolApprovalManagerWithPersistence({
      agentNameOrId: 'my-agent',
      cwd: testDir,
    });

    mgr.record('bash', 'yes_all');

    const config = loadConfig(testDir);
    // Other agent untouched
    assert.deepStrictEqual(config.agents['other-agent'], { stream: true, allowedTools: ['read'] });
    // My agent has persisted approval plus original config
    assert.strictEqual(config.agents['my-agent'].thread, 'abc');
    assert.ok(config.agents['my-agent'].allowedTools.includes('bash'));
  });

  it('should handle switching from denied to allowed', () => {
    fs.writeFileSync(
      path.join(testDir, 'qelos.config.json'),
      JSON.stringify({ agents: { 'my-agent': { deniedTools: ['bash'] } } })
    );

    const mgr = new ToolApprovalManagerWithPersistence({
      agentNameOrId: 'my-agent',
      configDenied: new Set(['bash']),
      cwd: testDir,
    });

    // Initially denied
    assert.strictEqual(mgr.check('bash'), 'denied');

    // Approve it (yes_all adds to sessionAllowed, persist removes from denied)
    mgr.record('bash', 'yes_all');
    assert.strictEqual(mgr.check('bash'), 'allowed');

    const config = loadConfig(testDir);
    assert.ok(config.agents['my-agent'].allowedTools.includes('bash'));
    // deniedTools should be empty
    assert.deepStrictEqual(config.agents['my-agent'].deniedTools, []);
  });

  it('"yes_all" should clear deniedTools array when last item removed', () => {
    fs.writeFileSync(
      path.join(testDir, 'qelos.config.json'),
      JSON.stringify({ agents: { 'my-agent': { deniedTools: ['bash'] } } })
    );

    const mgr = new ToolApprovalManagerWithPersistence({
      agentNameOrId: 'my-agent',
      cwd: testDir,
    });

    mgr.record('bash', 'yes_all');

    const config = loadConfig(testDir);
    assert.ok(config.agents['my-agent'].allowedTools.includes('bash'));
    assert.deepStrictEqual(config.agents['my-agent'].deniedTools, []);
  });
});
