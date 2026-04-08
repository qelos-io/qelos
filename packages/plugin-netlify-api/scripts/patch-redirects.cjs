#!/usr/bin/env node
'use strict';

/**
 * Prepend a forced `/api/*` rewrite as the first line of publish/_redirects.
 * Netlify evaluates this file before netlify.toml; Nuxt `netlify-static` adds
 * `/* → /404.html` — that must come after `/api/*`.
 *
 * Default: CDN proxy to `${QELOS_API_IP}/api/:splat` (Netlify’s documented pattern).
 * Set QELOS_NETLIFY_PROXY_MODE=function to use the serverless function instead.
 */

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_API = 'http://159.203.152.168';

function upstreamOrigin(apiUrl) {
  const s = String(apiUrl ?? '').trim().replace(/\/$/, '');
  if (!s) {
    return new URL(DEFAULT_API).origin;
  }
  if (/^https?:\/\//i.test(s)) {
    return new URL(s).origin;
  }
  return `http://${s}`;
}

/**
 * @param {string} [apiUrl]
 * @param {'cdn'|'function'} [mode]
 */
function buildRedirectLine(apiUrl, mode) {
  const m = mode === 'function' ? 'function' : 'cdn';
  if (m === 'function') {
    return '/api/* /.netlify/functions/qelos-api-proxy 200!\n';
  }
  const origin = upstreamOrigin(apiUrl ?? process.env.QELOS_API_IP);
  return `/api/* ${origin}/api/:splat 200!\n`;
}

/**
 * Drop existing /api/* lines so we don’t stack stale rules when the target URL changes.
 * @param {string} content
 */
function stripApiRedirectLines(content) {
  return content
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return true;
      if (t.startsWith('/api/*')) return false;
      return true;
    })
    .join('\n');
}

/**
 * @param {string} publishDir absolute path to deploy root (e.g. …/dist)
 * @param {string} [apiUrl] same as QELOS_API_IP
 * @param {'cdn'|'function'} [mode]
 * @returns {boolean} true if the file was written
 */
function patchRedirects(publishDir, apiUrl, mode) {
  if (!publishDir) return false;
  const redirectsPath = path.join(publishDir, '_redirects');
  let existing = '';
  try {
    existing = fs.readFileSync(redirectsPath, 'utf8');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const line = buildRedirectLine(apiUrl, mode);
  const rest = stripApiRedirectLines(existing);
  const next = line + (rest ? rest + (rest.endsWith('\n') ? '' : '\n') : '');
  if (next === existing) {
    return false;
  }
  fs.writeFileSync(redirectsPath, next, 'utf8');
  return true;
}

function resolvePublishDirFromEnv() {
  const rel = process.env.QELOS_NETLIFY_PUBLISH || 'dist';
  return path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
}

if (require.main === module) {
  const abs = resolvePublishDirFromEnv();
  const mode =
    process.env.QELOS_NETLIFY_PROXY_MODE === 'function' ? 'function' : 'cdn';
  const apiUrl = process.env.QELOS_API_IP;
  const changed = patchRedirects(abs, apiUrl, mode);
  const target = path.join(abs, '_redirects');
  const kind = mode === 'function' ? 'function' : 'CDN';
  if (changed) {
    console.log(
      `[qelos-netlify-patch-redirects] prepended /api/* (${kind}) → ${target}`,
    );
  } else {
    console.log(`[qelos-netlify-patch-redirects] up to date → ${target}`);
  }
}

module.exports = {
  patchRedirects,
  buildRedirectLine,
  upstreamOrigin,
  stripApiRedirectLines,
};
