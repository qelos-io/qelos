import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { yellow, blue, red } from '../utils/colors.mjs';

// ─── Tool output display ──────────────────────────────────────────────────────

const DIM = '\x1b[2m';
const RESET_COLOR = '\x1b[0m';
const TOOL_MAX_LINES = 5;
const TOOL_MAX_CHARS = 500;

/**
 * Prints tool output to stdout with truncation (default) or full (--verbose).
 * Always ends with a trailing newline.
 * The full result is still returned to the AI regardless of truncation.
 */
function printToolOutput(result, header = '') {
  if (!result) return;
  const verbose = process.env.VERBOSE === 'true';

  const lines = result.split('\n');
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  if (!lines.length) return;

  process.stdout.write(DIM + `┌─${header ? ` ${header}` : ''}` + RESET_COLOR + '\n');

  if (verbose) {
    for (const line of lines) process.stdout.write(DIM + '│ ' + RESET_COLOR + line + '\n');
    process.stdout.write(DIM + '└─' + RESET_COLOR + '\n');
    return;
  }

  const clipped = lines.length > TOOL_MAX_LINES;
  const displayLines = clipped ? lines.slice(0, TOOL_MAX_LINES) : lines;
  for (const line of displayLines) {
    const truncated = line.length > TOOL_MAX_CHARS ? line.slice(0, TOOL_MAX_CHARS) + '…' : line;
    process.stdout.write(DIM + '│ ' + RESET_COLOR + truncated + '\n');
  }

  const hidden = lines.length - TOOL_MAX_LINES;
  if (clipped && hidden > 0) {
    process.stdout.write(DIM + '│ ' + RESET_COLOR + yellow(`▶ +${hidden} more lines`) + '\n');
  }
  process.stdout.write(DIM + '└─' + RESET_COLOR + '\n');
}

// ─── Built-in tools ───────────────────────────────────────────────────────────

/**
 * Built-in terminal tools available to the agent.
 * Each tool has: name, description, schema, handler
 */
export const BUILTIN_TOOLS = {
  bash: {
    name: 'bash',
    description: 'Execute a bash (shell) command in the current working directory and return stdout/stderr output.',
    schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The bash command to execute' },
      },
      required: ['command'],
    },
    handler: async (args) => {
      if (typeof args.command !== 'string' || !args.command.trim()) {
        process.stdout.write(red(`[bash] Error: missing required 'command' argument\n`));
        return JSON.stringify({ error: "bash: missing required 'command' argument" });
      }
      try {
        const result = execSync(args.command, {
          encoding: 'utf-8',
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        printToolOutput(result, `bash: $ ${args.command}`);
        return result || '(no output)';
      } catch (err) {
        const stderr = err.stderr?.toString() || '';
        const stdout = err.stdout?.toString() || '';
        const output = stdout + (stderr ? `\nSTDERR: ${stderr}` : '');
        printToolOutput(output, `bash: $ ${args.command} (error)`);
        return output || JSON.stringify({ error: err.message });
      }
    },
  },
  node: {
    name: 'node',
    description: 'Execute JavaScript/Node.js code and return the result printed to stdout.',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The JavaScript/Node.js code to execute' },
      },
      required: ['code'],
    },
    handler: async (args) => {
      if (typeof args.code !== 'string' || !args.code.trim()) {
        process.stdout.write(red(`[node] Error: missing required 'code' argument\n`));
        return JSON.stringify({ error: "node: missing required 'code' argument" });
      }
      const tmpFile = path.join(process.cwd(), `.qelos-node-${Date.now()}.mjs`);
      fs.writeFileSync(tmpFile, args.code, 'utf-8');
      try {
        const result = execSync(`node ${tmpFile}`, {
          encoding: 'utf-8',
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        printToolOutput(result, 'node');
        return result || '(no output)';
      } catch (err) {
        const stderr = err.stderr?.toString() || '';
        const stdout = err.stdout?.toString() || '';
        const output = stdout + (stderr ? `\nSTDERR: ${stderr}` : '');
        printToolOutput(output, 'node (error)');
        return output || JSON.stringify({ error: err.message });
      } finally {
        try { fs.unlinkSync(tmpFile); } catch {}
      }
    },
  },
  read: {
    name: 'read',
    description: 'Read the contents of a file from the filesystem and return it as text.',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read (relative to cwd or absolute)' },
        startLine: { type: 'number', description: 'Read only subset of the file starting from this line (default is 0)' },
        endLine: { type: 'number', description: 'Read only subset of the file ending at this line (default is -1 to EOF)', default: -1 },
      },
      required: ['path'],
    },
    handler: async (args) => {
      const filePath = path.isAbsolute(args.path) ? args.path : path.join(process.cwd(), args.path);
      const lines = args.startLine ? `${args.startLine}${args.endLine ? `-${endLine}` : ''}` : (args.endLine > 0 ? `0-${args.endLine}` : '')
      process.stdout.write(blue(`[tool:read] `) + `Reading: ${filePath}${lines ? `-${lines}` : ''}\n`);
      try {
        let content = fs.readFileSync(filePath, 'utf-8');
        if (typeof args.endLine === 'number' && args.endLine >=0) {
          content = content.split('\n').slice(args.startLine || 0, args.endLine).join('\n');
        } else if (typeof args.startLine === 'number' && args.startLine > 0) {
          content = content.split('\n').slice(args.startLine).join('\n')
        }
        return content;
      } catch (err) {
        return JSON.stringify({ error: err.message });
      }
    },
  },
  write: {
    name: 'write',
    description: 'Write content to a file on the filesystem. Creates parent directories if needed.',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to write (relative to cwd or absolute)' },
        content: { type: 'string', description: 'Content to write to the file' },
      },
      required: ['path', 'content'],
    },
    handler: async (args) => {
      const filePath = path.isAbsolute(args.path) ? args.path : path.join(process.cwd(), args.path);
      process.stdout.write(blue(`[tool:write] `) + `Writing: ${filePath} (${args.content.length} chars)\n`);
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, args.content, 'utf-8');
        return `Successfully wrote ${args.content.length} characters to ${filePath}`;
      } catch (err) {
        return JSON.stringify({ error: err.message });
      }
    },
  },
  writeInLine: {
    name: 'writeInLine',
    description: 'Add subset of content into a file on the filesystem at specific line, without replacing the whole content.',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to write (relative to cwd or absolute)' },
        line: { type: 'number', description: 'The line where we start adding this content (not adding new lines before and after).' },
        content: { type: 'string', description: 'Content to write to the file' },
      },
      required: ['path', 'line', 'content'],
    },
    handler: async (args) => {
      const filePath = path.isAbsolute(args.path) ? args.path : path.join(process.cwd(), args.path);
      process.stdout.write(blue(`[tool:writeInLine] `) + `Inserting at line ${args.line} in: ${filePath}\n`);
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
        const fileLines = existing.split('\n');
        const insertLines = args.content.split('\n');
        fileLines.splice(args.line, 0, ...insertLines);
        fs.writeFileSync(filePath, fileLines.join('\n'), 'utf-8');
        return `Successfully inserted ${insertLines.length} line(s) at line ${args.line} in ${filePath}`;
      } catch (err) {
        return JSON.stringify({ error: err.message });
      }
    },
  },
};

/**
 * Creates a handler for a custom tool defined in qelos.config.json.
 * The handler config looks like: { bash: "some script", injectArgsAs: 'env' | 'argv' | 'both' }
 *
 * @param {string} toolName
 * @param {{ bash: string, injectArgsAs?: 'env' | 'argv' | 'both' }} handlerConfig
 * @returns {function}
 */
export function createCustomToolHandler(toolName, handlerConfig) {
  return async (args) => {
    const { bash: bashScript, injectArgsAs = 'env' } = handlerConfig;
    const execOptions = {
      cwd: process.cwd(),
      encoding: 'utf-8',
      shell: '/bin/bash',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    };

    let command = bashScript;

    if (injectArgsAs === 'env' || injectArgsAs === 'both') {
      // Inject args as uppercase environment variables
      for (const [k, v] of Object.entries(args)) {
        execOptions.env[k.toUpperCase()] = String(v);
      }
    }

    if (injectArgsAs === 'argv' || injectArgsAs === 'both') {
      // Append args as a single JSON string argument
      command = `${bashScript} ${JSON.stringify(JSON.stringify(args))}`;
    }

    try {
      const result = execSync(command, execOptions);
      printToolOutput(result, toolName);
      return result || '(no output)';
    } catch (err) {
      const stderr = err.stderr?.toString() || '';
      const stdout = err.stdout?.toString() || '';
      const output = stdout + (stderr ? `\nSTDERR: ${stderr}` : '');
      printToolOutput(output, `${toolName} (error)`);
      return output || JSON.stringify({ error: err.message });
    }
  };
}

/**
 * Builds the full list of client tools combining:
 * - Built-in tools requested via --tools CLI flag
 * - Tools from qelos.config.json agent clientTools array (built-in names or custom objects)
 *
 * @param {string[]} cliTools - Tool names from --tools flag
 * @param {Array<string|object>} configTools - clientTools from agent config
 * @returns {Array<{ name, description, schema, handler }>}
 */
export function buildClientTools(cliTools = [], configTools = []) {
  const toolMap = new Map();

  // Flatten comma-separated entries in cliTools (e.g. --tools bash,node)
  const flatCliTools = cliTools.flatMap(t => t.split(',').map(s => s.trim())).filter(Boolean);

  // Add built-in tools from CLI flag
  for (const name of flatCliTools) {
    const def = BUILTIN_TOOLS[name];
    if (def) {
      toolMap.set(name, def);
    } else {
      process.stderr.write(yellow(`Warning: Unknown built-in tool "${name}". Available: ${Object.keys(BUILTIN_TOOLS).join(', ')}\n`));
    }
  }

  // Add tools from config
  for (const entry of configTools) {
    if (typeof entry === 'string') {
      // Built-in tool name
      const def = BUILTIN_TOOLS[entry];
      if (def) {
        toolMap.set(entry, def);
      } else {
        process.stderr.write(yellow(`Warning: Unknown built-in tool "${entry}" in config. Available: ${Object.keys(BUILTIN_TOOLS).join(', ')}\n`));
      }
    } else if (entry && typeof entry === 'object' && entry.name) {
      // Custom tool object
      const { name, description, schema, properties, handler, ...rest } = entry;

      // Build schema from either 'schema' or 'properties' shorthand
      const resolvedSchema = schema || (properties ? { type: 'object', properties } : undefined);

      let resolvedHandler;
      if (handler && typeof handler === 'object' && handler.bash) {
        resolvedHandler = createCustomToolHandler(name, handler);
      } else if (typeof handler === 'function') {
        resolvedHandler = handler;
      }

      toolMap.set(name, {
        name,
        description,
        schema: resolvedSchema,
        handler: resolvedHandler,
      });
    }
  }

  return Array.from(toolMap.values());
}

/**
 * Loads context from CLI args or config.
 * Priority: --context (inline JSON) > --context-file > agent config context
 *
 * @param {{ context?: string, contextFile?: string }} argv
 * @param {object} agentConfig - Agent-level config from qelos.config.json
 * @returns {object|undefined}
 */
export function loadContext(argv, agentConfig) {
  if (argv.context) {
    try {
      return JSON.parse(argv.context);
    } catch (err) {
      process.stderr.write(red(`Error: --context is not valid JSON: ${err.message}\n`));
      process.exit(1);
    }
  }

  if (argv.contextFile) {
    const filePath = path.isAbsolute(argv.contextFile)
      ? argv.contextFile
      : path.join(process.cwd(), argv.contextFile);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      process.stderr.write(red(`Error: Could not read --context-file "${filePath}": ${err.message}\n`));
      process.exit(1);
    }
  }

  return agentConfig?.context || undefined;
}
