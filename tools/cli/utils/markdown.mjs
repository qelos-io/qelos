const RESET   = '\x1b[0m';
const BOLD    = '\x1b[1m';
const DIM     = '\x1b[2m';
const ITALIC  = '\x1b[3m';
const UNDERLINE = '\x1b[4m';
const CYAN    = '\x1b[36m';

function renderLine(line) {
  // Block-level (mutually exclusive, return early)
  if (/^### /.test(line)) return BOLD + line.slice(4) + RESET;
  if (/^## /.test(line))  return BOLD + UNDERLINE + line.slice(3) + RESET;
  if (/^# /.test(line))   return BOLD + UNDERLINE + line.slice(2) + RESET;
  if (/^> /.test(line))   return DIM + '│ ' + line.slice(2) + RESET;

  // Unordered list bullet
  line = line.replace(/^(\s*)[-*] /, '$1• ');

  // Inline: bold before italic to avoid partial matches on **
  line = line.replace(/\*\*(.+?)\*\*/g, `${BOLD}$1${RESET}`);
  line = line.replace(/\*(.+?)\*/g,     `${ITALIC}$1${RESET}`);
  line = line.replace(/`([^`]+)`/g,     `${CYAN}$1${RESET}`);

  return line;
}

/**
 * Renders a markdown string to ANSI-formatted terminal text.
 * Handles: headings, bold, italic, inline code, bullets, blockquotes, fenced code blocks.
 *
 * @param {string} text - Raw markdown string
 * @returns {string} ANSI-formatted string
 */
export function renderMarkdown(text) {
  const lines = text.split('\n');
  let inCode = false;
  const out = [];

  for (const line of lines) {
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      if (!inCode) {
        inCode = true;
        out.push(DIM + '┌─' + (lang ? ` ${lang}` : '') + RESET);
      } else {
        inCode = false;
        out.push(DIM + '└─' + RESET);
      }
      continue;
    }
    out.push(inCode ? DIM + '│ ' + line + RESET : renderLine(line));
  }

  // Close unclosed code block
  if (inCode) out.push(DIM + '└─' + RESET);

  return out.join('\n');
}
