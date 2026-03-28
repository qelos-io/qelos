import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { yellow, blue, red } from '../../utils/colors.mjs';

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
  removeLines: {
    name: 'removeLines',
    description: 'Remove specific lines from a file. Supports removing single lines, ranges, or multiple specific line numbers.',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to modify (relative to cwd or absolute)' },
        startLine: { type: 'number', description: 'Starting line number to remove (0-indexed)' },
        endLine: { type: 'number', description: 'Ending line number to remove (0-indexed, inclusive). If not provided, only startLine is removed.' },
      },
      required: ['path', 'startLine', 'endLine'],
    },
    handler: async (args) => {
      const filePath = path.isAbsolute(args.path) ? args.path : path.join(process.cwd(), args.path);

      try {
        if (!fs.existsSync(filePath)) {
          return JSON.stringify({ error: `File not found: ${filePath}` });
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const fileLines = content.split('\n');
        const originalLength = fileLines.length;

        let linesToRemove = [];

        // Remove range or single line
        const end = args.endLine !== undefined ? args.endLine : args.startLine;
        if (args.startLine < 0 || args.endLine >= fileLines.length || args.startLine > end) {
          return JSON.stringify({ error: `Invalid line range: ${args.startLine}-${args.endLine}. File has ${fileLines.length} lines (0-indexed).` });
        }
        for (let i = args.startLine; i <= end; i++) {
          linesToRemove.push(i);
        }

        // Sort lines in descending order to remove from end to start (preserves indices)
        linesToRemove.sort((a, b) => b - a);

        // Remove lines
        for (const lineNum of linesToRemove) {
          if (lineNum >= 0 && lineNum < fileLines.length) {
            fileLines.splice(lineNum, 1);
          }
        }

        fs.writeFileSync(filePath, fileLines.join('\n'), 'utf-8');

        const removedCount = originalLength - fileLines.length;
        return `Successfully removed ${removedCount} line(s) from ${filePath}. File now has ${fileLines.length} lines.`;

      } catch (err) {
        return JSON.stringify({ error: err.message });
      }
    },
  },

  // ─── Git tools ───────────────────────────────────────────────────────────────

  git_status: {
    name: 'git_status',
    description: 'Return the current git working-tree status as structured JSON. Includes branch name, staged files, modified (unstaged) files, and untracked files.',
    schema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      try {
        const branch = execSync('git rev-parse --abbrev-ref HEAD', {
          encoding: 'utf-8', cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();

        const porcelain = execSync('git status --porcelain', {
          encoding: 'utf-8', cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'],
        });

        const staged = [];
        const modified = [];
        const untracked = [];

        for (const line of porcelain.split('\n')) {
          if (!line) continue;
          const index = line[0];
          const worktree = line[1];
          const file = line.slice(3);

          if (index === '?') {
            untracked.push(file);
          } else {
            if (index !== ' ' && index !== '?') staged.push({ status: index, file });
            if (worktree !== ' ' && worktree !== '?') modified.push({ status: worktree, file });
          }
        }

        const result = JSON.stringify({ branch, staged, modified, untracked });
        printToolOutput(result, 'git_status');
        return result;
      } catch (err) {
        const msg = err.stderr?.toString() || err.message;
        printToolOutput(msg, 'git_status (error)');
        return JSON.stringify({ error: msg });
      }
    },
  },

  git_diff: {
    name: 'git_diff',
    description: 'Show git diff output. By default shows unstaged changes. Use staged=true for staged changes. Optionally filter to a specific file path. Use stat=true for a compact summary instead of full patch.',
    schema: {
      type: 'object',
      properties: {
        staged: { type: 'boolean', description: 'If true, show staged (--cached) changes instead of unstaged changes', default: false },
        file: { type: 'string', description: 'Optional file path to limit the diff to a single file' },
        stat: { type: 'boolean', description: 'If true, return a short diffstat summary instead of the full patch', default: false },
        base: { type: 'string', description: 'Optional base ref to diff against (e.g. "main", "HEAD~3", a commit SHA). Overrides staged flag when provided.' },
      },
    },
    handler: async (args) => {
      try {
        const parts = ['git', 'diff'];
        if (args.base) {
          parts.push(args.base);
        } else if (args.staged) {
          parts.push('--cached');
        }
        if (args.stat) parts.push('--stat');
        if (args.file) parts.push('--', args.file);

        const result = execSync(parts.join(' '), {
          encoding: 'utf-8', cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'],
        });
        const header = `git_diff${args.staged ? ' --cached' : ''}${args.base ? ` ${args.base}` : ''}${args.stat ? ' --stat' : ''}${args.file ? ` -- ${args.file}` : ''}`;
        printToolOutput(result, header);
        return result || '(no changes)';
      } catch (err) {
        const msg = err.stderr?.toString() || err.message;
        printToolOutput(msg, 'git_diff (error)');
        return JSON.stringify({ error: msg });
      }
    },
  },

  git_commit: {
    name: 'git_commit',
    description: 'Create a git commit. Stages the specified files (or all changes if files is omitted) and commits with the given message.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message' },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of file paths to stage before committing. If omitted, commits whatever is already staged.',
        },
      },
      required: ['message'],
    },
    handler: async (args) => {
      if (typeof args.message !== 'string' || !args.message.trim()) {
        return JSON.stringify({ error: "git_commit: 'message' is required" });
      }
      try {
        const execOpts = { encoding: 'utf-8', cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] };

        // Stage files if provided
        if (Array.isArray(args.files) && args.files.length > 0) {
          const filesToAdd = args.files.map(f => `"${f}"`).join(' ');
          execSync(`git add ${filesToAdd}`, execOpts);
        }

        const result = execSync(`git commit -m ${JSON.stringify(args.message)}`, execOpts);
        printToolOutput(result, 'git_commit');
        return result || '(committed)';
      } catch (err) {
        const stderr = err.stderr?.toString() || '';
        const stdout = err.stdout?.toString() || '';
        const output = stdout + (stderr ? `\n${stderr}` : '');
        printToolOutput(output, 'git_commit (error)');
        return output || JSON.stringify({ error: err.message });
      }
    },
  },

  git_log: {
    name: 'git_log',
    description: 'Return recent git log entries as structured JSON. Each entry includes sha, author, date, and message.',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', description: 'Number of commits to return (default 10)', default: 10 },
        file: { type: 'string', description: 'Optional file path to filter commits that touched this file' },
        oneline: { type: 'boolean', description: 'If true, return a compact one-line-per-commit format instead of structured JSON', default: false },
      },
    },
    handler: async (args) => {
      try {
        const n = args.count || 10;
        const execOpts = { encoding: 'utf-8', cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] };

        if (args.oneline) {
          const parts = ['git', 'log', `--oneline`, `-n`, `${n}`];
          if (args.file) parts.push('--', args.file);
          const result = execSync(parts.join(' '), execOpts);
          printToolOutput(result, `git_log --oneline -n ${n}`);
          return result || '(no commits)';
        }

        // Structured JSON output using a delimiter format
        const SEP = '---GIT_LOG_SEP---';
        const format = `--format=${SEP}%n%H%n%an%n%aI%n%s`;
        const parts = ['git', 'log', format, `-n`, `${n}`];
        if (args.file) parts.push('--', args.file);

        const raw = execSync(parts.join(' '), execOpts);
        const entries = raw.split(SEP).filter(Boolean).map(block => {
          const lines = block.trim().split('\n');
          return { sha: lines[0], author: lines[1], date: lines[2], message: lines.slice(3).join('\n') };
        });

        const result = JSON.stringify(entries);
        printToolOutput(result, `git_log -n ${n}`);
        return result;
      } catch (err) {
        const msg = err.stderr?.toString() || err.message;
        printToolOutput(msg, 'git_log (error)');
        return JSON.stringify({ error: msg });
      }
    },
  },

  git_diff_files: {
    name: 'git_diff_files',
    description: 'List file names changed between two refs, or in the working tree. Returns a structured list of files with their change status (A=added, M=modified, D=deleted, R=renamed). More token-efficient than git_diff when you only need to know which files changed.',
    schema: {
      type: 'object',
      properties: {
        staged: { type: 'boolean', description: 'If true, list staged files only', default: false },
        base: { type: 'string', description: 'Optional base ref to compare against (e.g. "main", "HEAD~3")' },
      },
    },
    handler: async (args) => {
      try {
        const parts = ['git', 'diff', '--name-status'];
        if (args.base) {
          parts.push(args.base);
        } else if (args.staged) {
          parts.push('--cached');
        }

        const raw = execSync(parts.join(' '), {
          encoding: 'utf-8', cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'],
        });

        const files = raw.split('\n').filter(Boolean).map(line => {
          const [status, ...rest] = line.split('\t');
          return { status: status.trim(), file: rest.join('\t').trim() };
        });

        const result = JSON.stringify(files);
        printToolOutput(result, 'git_diff_files');
        return result;
      } catch (err) {
        const msg = err.stderr?.toString() || err.message;
        printToolOutput(msg, 'git_diff_files (error)');
        return JSON.stringify({ error: msg });
      }
    },
  },

  git_show: {
    name: 'git_show',
    description: 'Show the contents of a specific git commit: its message and patch. Useful for inspecting what a particular commit changed.',
    schema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Commit SHA, branch name, or ref to show (default "HEAD")', default: 'HEAD' },
        stat: { type: 'boolean', description: 'If true, show only the diffstat summary instead of the full patch', default: false },
      },
    },
    handler: async (args) => {
      try {
        const ref = args.ref || 'HEAD';
        const parts = ['git', 'show', ref];
        if (args.stat) parts.push('--stat');

        const result = execSync(parts.join(' '), {
          encoding: 'utf-8', cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'],
        });
        printToolOutput(result, `git_show ${ref}${args.stat ? ' --stat' : ''}`);
        return result || '(empty)';
      } catch (err) {
        const msg = err.stderr?.toString() || err.message;
        printToolOutput(msg, 'git_show (error)');
        return JSON.stringify({ error: msg });
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
