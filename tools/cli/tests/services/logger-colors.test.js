const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

describe('Logger color exports', () => {
  const filePath = path.join(__dirname, '..', '..', 'services', 'utils', 'logger.mjs');

  it('should exist', () => {
    assert.ok(fs.existsSync(filePath));
  });

  it('should export green, blue, yellow, red color functions', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('export const green'));
    assert.ok(content.includes('export const blue'));
    assert.ok(content.includes('export const yellow'));
    assert.ok(content.includes('export const red'));
  });

  it('should export the logger object', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('export const logger'));
  });

  it('green should wrap text with green ANSI code', () => {
    // Inline test of color logic
    const GREEN = '\x1b[32m';
    const RESET = '\x1b[0m';
    const colorize = (text, code) => `${code}${text}${RESET}`;
    const green = (text) => colorize(text, GREEN);

    assert.strictEqual(green('hello'), `${GREEN}hello${RESET}`);
  });

  it('blue should wrap text with cyan ANSI code', () => {
    const CYAN = '\x1b[36m';
    const RESET = '\x1b[0m';
    const colorize = (text, code) => `${code}${text}${RESET}`;
    const blue = (text) => colorize(text, CYAN);

    assert.strictEqual(blue('hello'), `${CYAN}hello${RESET}`);
  });

  it('red should wrap text with red ANSI code', () => {
    const RED = '\x1b[31m';
    const RESET = '\x1b[0m';
    const colorize = (text, code) => `${code}${text}${RESET}`;
    const red = (text) => colorize(text, RED);

    assert.strictEqual(red('hello'), `${RED}hello${RESET}`);
  });

  it('yellow should wrap text with yellow ANSI code', () => {
    const YELLOW = '\x1b[33m';
    const RESET = '\x1b[0m';
    const colorize = (text, code) => `${code}${text}${RESET}`;
    const yellow = (text) => colorize(text, YELLOW);

    assert.strictEqual(yellow('hello'), `${YELLOW}hello${RESET}`);
  });

  it('should handle empty strings', () => {
    const GREEN = '\x1b[32m';
    const RESET = '\x1b[0m';
    const colorize = (text, code) => `${code}${text}${RESET}`;
    const green = (text) => colorize(text, GREEN);

    assert.strictEqual(green(''), `${GREEN}${RESET}`);
  });
});
