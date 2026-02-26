import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import yaml from 'yaml';

const CONFIG_FILES = ['qelos.config.json', 'qelos.config.yaml', 'qelos.config.yml'];

let _config = null;

/**
 * Resolves the config file path. If explicit path given, use it.
 * Otherwise auto-discover from cwd.
 * @param {object} options
 * @param {string} [options.configPath] - Explicit config file path
 * @param {string} [options.cwd] - Directory to search in (defaults to process.cwd())
 * @returns {{ path: string, content: string } | null}
 */
export function resolveConfigFile({ configPath, cwd } = {}) {
  if (configPath) {
    const resolved = join(cwd || process.cwd(), configPath);
    if (existsSync(resolved)) {
      return { path: resolved, content: readFileSync(resolved, 'utf-8') };
    }
    return null;
  }

  const dir = cwd || process.cwd();
  for (const file of CONFIG_FILES) {
    const filePath = join(dir, file);
    if (existsSync(filePath)) {
      return { path: filePath, content: readFileSync(filePath, 'utf-8') };
    }
  }
  return null;
}

/**
 * Parses config file content based on file extension.
 * @param {string} filePath
 * @param {string} content
 * @returns {object}
 */
export function parseConfigFile(filePath, content) {
  if (filePath.endsWith('.json')) {
    return JSON.parse(content);
  }
  return yaml.parse(content);
}

/**
 * Loads the qelos config file. Auto-discovers qelos.config.json / qelos.config.yaml
 * from cwd, or uses an explicit --config path.
 * @param {object} options
 * @param {string} [options.configPath] - Explicit config file path (from --config flag)
 * @param {string} [options.cwd] - Directory to search in
 * @param {boolean} [options.verbose] - Log loaded config file
 * @returns {object | null} Parsed config or null if not found
 */
export function loadConfig({ configPath, cwd, verbose } = {}) {
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

/**
 * Returns the currently loaded config (set by loadConfig).
 * @returns {object | null}
 */
export function getConfig() {
  return _config;
}

/**
 * Returns agent-specific config defaults for a given integrationId or agent name.
 * @param {string} agentNameOrId
 * @returns {object} Agent config defaults (empty object if none found)
 */
export function getAgentConfig(agentNameOrId) {
  if (!_config?.agents || !agentNameOrId) return {};
  return _config.agents[agentNameOrId] || {};
}

/**
 * Saves config to qelos.config.json, merging with existing content.
 * @param {object} partial - Partial config to deep-merge
 * @param {object} [options]
 * @param {string} [options.cwd] - Directory to write to (defaults to process.cwd())
 * @param {boolean} [options.verbose] - Log saved file
 * @returns {object} The full merged config
 */
export function saveConfig(partial, { cwd, verbose } = {}) {
  const dir = cwd || process.cwd();
  const filePath = join(dir, 'qelos.config.json');

  let existing = {};
  if (existsSync(filePath)) {
    try {
      existing = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
      existing = {};
    }
  }

  // Deep merge: top-level keys are shallow-merged, agents entries are shallow-merged per agent
  const merged = { ...existing, ...partial };
  if (existing.agents || partial.agents) {
    merged.agents = { ...existing.agents };
    if (partial.agents) {
      for (const [key, value] of Object.entries(partial.agents)) {
        merged.agents[key] = { ...(merged.agents[key] || {}), ...value };
      }
    }
  }

  writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  if (verbose) console.log(`Saved config to: ${filePath}`);
  _config = merged;
  return merged;
}

/**
 * Saves agent-specific options into qelos.config.json.
 * @param {string} agentNameOrId
 * @param {object} agentOpts - Agent options to save (thread, log, export, json, stream)
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @param {boolean} [options.verbose]
 * @returns {object} The full merged config
 */
export function saveAgentConfig(agentNameOrId, agentOpts, options = {}) {
  return saveConfig({ agents: { [agentNameOrId]: agentOpts } }, options);
}

/**
 * Resets the internal config state (useful for testing).
 */
export function resetConfig() {
  _config = null;
}
