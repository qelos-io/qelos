/**
 * @param {string} value
 * @returns {boolean}
 */
export function looksLikeJson(value) {
  const trimmed = String(value).trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

/**
 * Parse a CLI token into a JavaScript value (JSON object/array, number, boolean, or string).
 * @param {string} value
 * @returns {unknown}
 */
export function parseArg(value) {
  const trimmed = String(value).trim();
  if (trimmed === '') {
    return '';
  }
  if (looksLikeJson(trimmed)) {
    return JSON.parse(trimmed);
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/**
 * Peel trailing JSON object/array tokens from the end of a token list.
 * @param {string[]} tokens
 * @returns {unknown[]}
 */
export function peelTrailingJsonArgs(tokens) {
  const args = [];
  while (tokens.length > 0 && looksLikeJson(tokens[tokens.length - 1])) {
    args.unshift(parseArg(tokens.pop()));
  }
  return args;
}

/**
 * Expand dot-separated segments into a flat token list.
 * @param {string[]} rawTokens
 * @returns {string[]}
 */
export function flattenTokens(rawTokens) {
  return rawTokens.flatMap((token) => String(token).split('.')).filter(Boolean);
}
