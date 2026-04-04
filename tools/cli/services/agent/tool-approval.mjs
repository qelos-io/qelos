import chalk from 'chalk';
import { yellow, green, red, blue } from '../utils/logger.mjs';
import { saveAgentConfig, getAgentConfig } from '../config/load-config.mjs';

/**
 * Manages tool approval state for interactive agent sessions.
 *
 * Tools can be:
 * - Pre-allowed: from --tools flag, config tools, or config allowedTools
 * - Session-allowed: user chose "Yes to all" during the session
 * - Session-denied: user chose "No to all" during the session
 * - Config-denied: from config deniedTools
 * - Unknown: requires user prompt
 */
export class ToolApprovalManager {
  /**
   * @param {object} options
   * @param {Set<string>} options.preAllowed - Tool names allowed from CLI/config
   * @param {Set<string>} options.configDenied - Tool names denied in config
   * @param {string} [options.agentNameOrId] - Agent identifier for persisting to config
   * @param {boolean} [options.verbose] - Enable debug logging
   */
  constructor({ preAllowed = new Set(), configDenied = new Set(), agentNameOrId, verbose = false }) {
    this.preAllowed = new Set(preAllowed);
    this.sessionAllowed = new Set();
    this.sessionDenied = new Set(configDenied);
    this.agentNameOrId = agentNameOrId;
    this.verbose = verbose;
  }

  /**
   * Check whether a tool is allowed, denied, or needs prompting.
   * @param {string} toolName
   * @returns {'allowed' | 'denied' | 'ask'}
   */
  check(toolName) {
    if (this.preAllowed.has(toolName) || this.sessionAllowed.has(toolName)) {
      return 'allowed';
    }
    if (this.sessionDenied.has(toolName)) {
      return 'denied';
    }
    return 'ask';
  }

  /**
   * Record an approval decision.
   * @param {string} toolName
   * @param {'yes' | 'yes_all' | 'no' | 'no_all'} decision
   */
  record(toolName, decision) {
    switch (decision) {
      case 'yes':
        // One-time allow — no state change needed (tool executes this once)
        break;
      case 'yes_all':
        this.sessionAllowed.add(toolName);
        this._persistAllowed(toolName);
        break;
      case 'no':
        // One-time deny — no state change
        break;
      case 'no_all':
        this.sessionDenied.add(toolName);
        this._persistDenied(toolName);
        break;
    }
  }

  /**
   * Returns the set of session-denied tool names (for filtering from future requests).
   * @returns {Set<string>}
   */
  getDeniedTools() {
    return new Set(this.sessionDenied);
  }

  /**
   * Prompt the user for a tool approval decision via stdin.
   * @param {string} toolName
   * @param {object} [args] - The arguments the tool was called with (for display)
   * @returns {Promise<'yes' | 'yes_all' | 'no' | 'no_all'>}
   */
  async prompt(toolName, args) {
    // Show the tool call details
    process.stdout.write('\n');
    process.stdout.write(yellow(`⚠ Tool "${toolName}" requires approval.\n`));
    if (args && Object.keys(args).length > 0) {
      const argSummary = formatToolArgs(toolName, args);
      if (argSummary) {
        process.stdout.write(chalk.dim(`  ${argSummary}\n`));
      }
    }
    process.stdout.write('\n');
    process.stdout.write(`  ${chalk.bold.green('y')} Yes          ${chalk.bold.cyan('a')} Yes, always (save)     ${chalk.bold.red('n')} No          ${chalk.bold.magenta('d')} No, always (save)\n`);

    return new Promise((resolve) => {
      const wasRaw = process.stdin.isRaw;
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      // Remove existing listeners to avoid interference
      const existingListeners = process.stdin.listeners('data');
      process.stdin.removeAllListeners('data');

      const onData = (chunk) => {
        const key = chunk.toString().toLowerCase();

        let decision = null;
        let label = '';

        switch (key) {
          case 'y':
            decision = 'yes';
            label = green('✓ Allowed (once)');
            break;
          case 'a':
            decision = 'yes_all';
            label = green('✓ Allowed (saved for future sessions)');
            break;
          case 'n':
            decision = 'no';
            label = red('✗ Denied (once)');
            break;
          case 'd':
            decision = 'no_all';
            label = red('✗ Denied (saved for future sessions)');
            break;
          case '\x03':
            // Ctrl+C
            process.stdout.write('^C\n');
            process.exit(0);
            return;
          default:
            // Invalid key, ignore
            return;
        }

        // Clean up
        process.stdin.removeListener('data', onData);

        // Restore previous listeners
        for (const listener of existingListeners) {
          process.stdin.on('data', listener);
        }

        // Restore raw mode state
        try { process.stdin.setRawMode(wasRaw); } catch {}

        process.stdout.write(`  ${label}\n\n`);

        this.record(toolName, decision);
        resolve(decision);
      };

      process.stdin.on('data', onData);
    });
  }

  /**
   * Persist a tool as allowed in the config file.
   * @param {string} toolName
   * @private
   */
  _persistAllowed(toolName) {
    if (!this.agentNameOrId) return;
    try {
      const existing = getAgentConfig(this.agentNameOrId);
      const allowedTools = new Set(existing.allowedTools || []);
      // Also remove from deniedTools if it was there
      const deniedTools = new Set(existing.deniedTools || []);
      allowedTools.add(toolName);
      deniedTools.delete(toolName);
      saveAgentConfig(this.agentNameOrId, {
        allowedTools: [...allowedTools],
        ...(deniedTools.size > 0 ? { deniedTools: [...deniedTools] } : existing.deniedTools ? { deniedTools: [] } : {}),
      });
      if (this.verbose) {
        console.log(blue(`[approval] Saved "${toolName}" as allowed in config`));
      }
    } catch (err) {
      if (this.verbose) {
        console.warn(yellow(`[approval] Could not save to config: ${err.message}`));
      }
    }
  }

  /**
   * Persist a tool as denied in the config file.
   * @param {string} toolName
   * @private
   */
  _persistDenied(toolName) {
    if (!this.agentNameOrId) return;
    try {
      const existing = getAgentConfig(this.agentNameOrId);
      const deniedTools = new Set(existing.deniedTools || []);
      // Also remove from allowedTools if it was there
      const allowedTools = new Set(existing.allowedTools || []);
      deniedTools.add(toolName);
      allowedTools.delete(toolName);
      saveAgentConfig(this.agentNameOrId, {
        deniedTools: [...deniedTools],
        ...(allowedTools.size > 0 ? { allowedTools: [...allowedTools] } : existing.allowedTools ? { allowedTools: [] } : {}),
      });
      if (this.verbose) {
        console.log(blue(`[approval] Saved "${toolName}" as denied in config`));
      }
    } catch (err) {
      if (this.verbose) {
        console.warn(yellow(`[approval] Could not save to config: ${err.message}`));
      }
    }
  }
}

/**
 * Format tool arguments for display in the approval prompt.
 * Shows a short, meaningful summary depending on tool type.
 */
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
      // Generic: show first key-value pair
      const entries = Object.entries(args);
      if (entries.length === 0) return '';
      const [k, v] = entries[0];
      const val = typeof v === 'string' ? v.slice(0, 100) : JSON.stringify(v);
      return `${k}: ${val}`;
  }
}
