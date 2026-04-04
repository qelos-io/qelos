import fs from 'node:fs';
import path from 'node:path';
import { blue, yellow } from '../utils/logger.mjs';

/**
 * Parses a .mdc cursor rules file and extracts the frontmatter (globs) and body content.
 *
 * Format:
 * ---
 * description: Some description
 * globs: *.ts, src/**\/*.js
 * alwaysApply: false
 * ---
 * Rule content here...
 *
 * @param {string} filePath
 * @returns {{ globs: string[], content: string, description: string, alwaysApply: boolean } | null}
 */
function parseCursorRuleFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.split('\n');

    // Find frontmatter delimiters
    if (lines[0]?.trim() !== '---') {
      // No frontmatter — treat entire content as an always-apply rule
      return { globs: [], content: raw.trim(), description: '', alwaysApply: true };
    }

    let endIdx = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        endIdx = i;
        break;
      }
    }

    if (endIdx === -1) {
      return { globs: [], content: raw.trim(), description: '', alwaysApply: true };
    }

    // Parse frontmatter key-value pairs
    const frontmatter = {};
    for (let i = 1; i < endIdx; i++) {
      const line = lines[i];
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        frontmatter[key] = value;
      }
    }

    const content = lines.slice(endIdx + 1).join('\n').trim();
    const globs = frontmatter.globs
      ? frontmatter.globs.split(',').map(g => g.trim()).filter(Boolean)
      : [];
    const alwaysApply = frontmatter.alwaysApply === 'true';
    const description = frontmatter.description || '';

    return { globs, content, description, alwaysApply };
  } catch (err) {
    return null;
  }
}

/**
 * Simple glob pattern matcher.
 * Supports: *, **, ?, and character classes [abc].
 *
 * @param {string} pattern - Glob pattern
 * @param {string} str - String to match against
 * @returns {boolean}
 */
function matchGlob(pattern, str) {
  // Normalize path separators
  const normalizedStr = str.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  // Convert glob pattern to regex
  let regexStr = '';
  let i = 0;
  while (i < normalizedPattern.length) {
    const c = normalizedPattern[i];
    if (c === '*') {
      if (normalizedPattern[i + 1] === '*') {
        // ** matches any number of directories
        if (normalizedPattern[i + 2] === '/') {
          regexStr += '(?:.*/)?';
          i += 3;
        } else {
          regexStr += '.*';
          i += 2;
        }
      } else {
        // * matches anything except /
        regexStr += '[^/]*';
        i++;
      }
    } else if (c === '?') {
      regexStr += '[^/]';
      i++;
    } else if (c === '[') {
      const end = normalizedPattern.indexOf(']', i);
      if (end > -1) {
        regexStr += normalizedPattern.slice(i, end + 1);
        i = end + 1;
      } else {
        regexStr += '\\[';
        i++;
      }
    } else if (c === '{') {
      // Handle brace expansion {a,b,c}
      const end = normalizedPattern.indexOf('}', i);
      if (end > -1) {
        const alternatives = normalizedPattern.slice(i + 1, end).split(',').map(a => a.trim());
        regexStr += '(?:' + alternatives.map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '[^/]*')).join('|') + ')';
        i = end + 1;
      } else {
        regexStr += '\\{';
        i++;
      }
    } else {
      // Escape special regex characters
      regexStr += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      i++;
    }
  }

  try {
    const regex = new RegExp('^' + regexStr + '$');
    return regex.test(normalizedStr);
  } catch {
    return false;
  }
}

/**
 * Loads all cursor rules files from .cursor/rules/ directory.
 * Searches from the given directory upward (up to 5 levels).
 *
 * @param {string} [startDir]
 * @returns {Array<{ file: string, globs: string[], content: string, description: string, alwaysApply: boolean }>}
 */
export function loadCursorRules(startDir = process.cwd()) {
  let searchDir = startDir;
  let rulesDir = null;

  // Search up to 5 levels for .cursor/rules directory
  for (let i = 0; i < 5; i++) {
    const potentialDir = path.join(searchDir, '.cursor', 'rules');
    if (fs.existsSync(potentialDir) && fs.statSync(potentialDir).isDirectory()) {
      rulesDir = potentialDir;
      break;
    }
    const parentDir = path.dirname(searchDir);
    if (parentDir === searchDir) break;
    searchDir = parentDir;
  }

  if (!rulesDir) return [];

  const rules = [];
  try {
    const files = fs.readdirSync(rulesDir);
    for (const file of files) {
      if (!file.endsWith('.mdc')) continue;
      const filePath = path.join(rulesDir, file);
      const parsed = parseCursorRuleFile(filePath);
      if (parsed && parsed.content) {
        rules.push({ file: filePath, ...parsed });
      }
    }
  } catch {
    // ignore
  }

  return rules;
}

/**
 * Creates a rules manager that tracks which rules have been sent in the current session,
 * and can match file paths against rule globs.
 *
 * @param {Array<{ file: string, globs: string[], content: string, description: string, alwaysApply: boolean }>} allRules
 * @returns {{ getMatchingRules: (filePath: string) => string[], getAlwaysApplyRules: () => string[], getSentRulesCount: () => number }}
 */
export function createRulesManager(allRules) {
  const sentRuleFiles = new Set();

  /**
   * Returns rules whose globs match the given file path.
   * Each rule is only returned once per session.
   */
  function getMatchingRules(filePath) {
    const matched = [];
    for (const rule of allRules) {
      if (sentRuleFiles.has(rule.file)) continue;
      if (rule.alwaysApply) continue; // alwaysApply rules are sent separately

      for (const glob of rule.globs) {
        // Match against the full path or just the filename
        const normalizedPath = filePath.replace(/\\/g, '/');
        const fileName = path.basename(filePath);
        if (matchGlob(glob, normalizedPath) || matchGlob(glob, fileName)) {
          sentRuleFiles.add(rule.file);
          matched.push(rule.content);
          break;
        }
      }
    }
    return matched;
  }

  /**
   * Returns all alwaysApply rules that haven't been sent yet.
   */
  function getAlwaysApplyRules() {
    const rules = [];
    for (const rule of allRules) {
      if (sentRuleFiles.has(rule.file)) continue;
      if (rule.alwaysApply || rule.globs.length === 0) {
        sentRuleFiles.add(rule.file);
        rules.push(rule.content);
      }
    }
    return rules;
  }

  function getSentRulesCount() {
    return sentRuleFiles.size;
  }

  return { getMatchingRules, getAlwaysApplyRules, getSentRulesCount };
}
