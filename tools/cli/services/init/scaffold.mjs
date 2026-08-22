import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger.mjs';

export const FRAMEWORKS = {
  next: {
    label: 'Next.js',
    integrator: '@qelos/integrator-next',
    integratorVersion: '^0.1.0',
    npmDep: 'next',
    nextSteps: [
      'Run `npm install` and wire up the middleware in your `middleware.ts` (see `@qelos/integrator-next`).',
      "  Example: export { qelosMiddleware as middleware } from '@qelos/integrator-next/middleware';",
      'Use `getQelosContext()` from `@qelos/integrator-next/context` in route handlers when needed.',
    ],
  },
  nuxt: {
    label: 'Nuxt',
    integrator: '@qelos/integrator-nuxt',
    integratorVersion: '^0.1.0',
    npmDep: 'nuxt',
    nextSteps: [
      'Run `npm install`',
      "Add '@qelos/integrator-nuxt' to your `modules` in `nuxt.config.ts`.",
      'Use `defineQelosEventHandler` in your server routes to access the qelos context.',
    ],
  },
  express: {
    label: 'Express',
    integrator: '@qelos/integrator-express',
    integratorVersion: '^0.1.0',
    npmDep: 'express',
    nextSteps: [
      'Run `npm install`',
      'Register the middleware:',
      "  import { createQelosMiddleware } from '@qelos/integrator-express';",
      "  app.use(createQelosMiddleware({ config: { appUrl: process.env.QELOS_APP_URL! } }));",
    ],
  },
  fastify: {
    label: 'Fastify',
    integrator: '@qelos/integrator-fastify',
    integratorVersion: '^0.1.0',
    npmDep: 'fastify',
    nextSteps: [
      'Run `npm install`',
      'Register the plugin:',
      "  import qelosFastify from '@qelos/integrator-fastify';",
      "  await app.register(qelosFastify, { config: { appUrl: process.env.QELOS_APP_URL! } });",
    ],
  },
  nest: {
    label: 'NestJS',
    integrator: '@qelos/integrator-nest',
    integratorVersion: '^0.1.0',
    npmDep: '@nestjs/core',
    nextSteps: [
      'Run `npm install`',
      "Import `QelosModule.forRoot({ config: { appUrl: process.env.QELOS_APP_URL! } })` in your `AppModule`.",
    ],
  },
  fastapi: {
    label: 'FastAPI',
    integrator: 'qelos-integrator-fastapi',
    integratorVersion: '>=0.1.0',
    pythonDep: 'fastapi',
    nextSteps: [
      'Run `pip install -r requirements.txt` (or `pip install qelos-integrator-fastapi`).',
      'Register the middleware on your FastAPI app:',
      "  from qelos_integrator_fastapi import QelosMiddleware",
      "  app.add_middleware(QelosMiddleware, app_url=os.environ['QELOS_APP_URL'])",
    ],
  },
};

/** @type {Record<string, { min: string, packageKey: string, label: string }>} */
export const FRAMEWORK_MIN_VERSIONS = {
  nuxt: { min: '3.0.0', packageKey: 'nuxt', label: 'Nuxt' },
  next: { min: '13.4.0', packageKey: 'next', label: 'Next.js' },
  express: { min: '4.17.0', packageKey: 'express', label: 'Express' },
  fastify: { min: '4.0.0', packageKey: 'fastify', label: 'Fastify' },
  nest: { min: '9.0.0', packageKey: '@nestjs/core', label: 'NestJS' },
};

/**
 * @param {string | undefined | null} versionRangeString
 * @returns {{ major: number, minor: number, patch: number } | null}
 */
export function parsePackageVersion(versionRangeString) {
  if (!versionRangeString || typeof versionRangeString !== 'string') return null;

  let version = versionRangeString.trim();
  const npmAliasMatch = version.match(/^npm:[^@]+@(.+)$/);
  if (npmAliasMatch) {
    version = npmAliasMatch[1];
  } else if (/^(workspace:|link:|file:|git\+|github:|catalog:)/.test(version)) {
    return null;
  }

  version = version.replace(/^v/i, '');
  version = version.replace(/^[\^~>=<]+/, '');

  const hyphenLower = version.match(/^(\d+(?:\.\d+){0,2})\s*-\s*/);
  if (hyphenLower) {
    version = hyphenLower[1];
  }

  const match = version.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return null;

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2] ?? '0', 10),
    patch: Number.parseInt(match[3] ?? '0', 10),
  };
}

/**
 * @param {{ major: number, minor: number, patch: number }} a
 * @param {{ major: number, minor: number, patch: number }} b
 * @returns {number}
 */
function compareVersions(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/**
 * @param {string} frameworkId
 * @param {string} versionRangeString
 * @returns {{ ok: boolean, message: string }}
 */
export function validateFrameworkVersion(frameworkId, versionRangeString) {
  const spec = FRAMEWORK_MIN_VERSIONS[frameworkId];
  if (!spec) return { ok: true, message: '' };

  const parsed = parsePackageVersion(versionRangeString);
  const minParsed = parsePackageVersion(spec.min);
  if (!parsed || !minParsed) return { ok: true, message: '' };

  if (compareVersions(parsed, minParsed) >= 0) {
    return { ok: true, message: '' };
  }

  const framework = FRAMEWORKS[frameworkId];
  const integrator = framework?.integrator ?? `@qelos/integrator-${frameworkId}`;
  const displayVersion = versionRangeString.trim();

  return {
    ok: false,
    message:
      `${integrator} requires ${spec.label} >=${spec.min}; found ${spec.packageKey}@${displayVersion}. ` +
      `Upgrade ${spec.label} before installing the integrator.`,
  };
}

/**
 * @param {string} cwd
 * @returns {Record<string, string>}
 */
function readPackageDependencies(cwd) {
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) return {};
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
      ...(pkg.peerDependencies || {}),
    };
  } catch (err) {
    logger.debug(`Failed to parse package.json: ${err.message}`);
    return {};
  }
}

/**
 * @param {string} cwd
 * @param {string} frameworkId
 * @returns {string | null}
 */
export function getFrameworkPackageVersion(cwd, frameworkId) {
  const spec = FRAMEWORK_MIN_VERSIONS[frameworkId];
  if (!spec) return null;
  const allDeps = readPackageDependencies(cwd);
  return allDeps[spec.packageKey] ?? null;
}

/**
 * Detect framework from package.json deps or Python project files.
 * Order favors meta-frameworks first; NestJS is checked before Express/Fastify so Nest apps
 * are not misclassified as plain Express.
 * @param {string} cwd
 * @returns {{ id: string, source: string } | null}
 */
export function detectFramework(cwd) {
  const allDeps = readPackageDependencies(cwd);
  if (Object.keys(allDeps).length > 0) {
    if (allDeps.next) return { id: 'next', source: 'package.json', version: allDeps.next };
    if (allDeps.nuxt) return { id: 'nuxt', source: 'package.json', version: allDeps.nuxt };
    if (allDeps['@nestjs/core']) {
      return { id: 'nest', source: 'package.json', version: allDeps['@nestjs/core'] };
    }
    if (allDeps.fastify) return { id: 'fastify', source: 'package.json', version: allDeps.fastify };
    if (allDeps.express) return { id: 'express', source: 'package.json', version: allDeps.express };
  }

  const reqPath = path.join(cwd, 'requirements.txt');
  if (fs.existsSync(reqPath)) {
    const content = fs.readFileSync(reqPath, 'utf-8');
    if (/^\s*fastapi\b/im.test(content)) {
      return { id: 'fastapi', source: 'requirements.txt' };
    }
  }

  const pyprojectPath = path.join(cwd, 'pyproject.toml');
  if (fs.existsSync(pyprojectPath)) {
    const content = fs.readFileSync(pyprojectPath, 'utf-8');
    if (/\bfastapi\b/i.test(content)) {
      return { id: 'fastapi', source: 'pyproject.toml' };
    }
  }

  return null;
}

/**
 * @param {boolean} useTypeScript
 * @param {boolean} useESModule — when true and not TypeScript, emit ESM `export default`
 */
export function buildJsConfigContents(useTypeScript, useESModule) {
  if (useTypeScript) {
    return `import type { QelosConfig } from '@qelos/global-types';

const config: QelosConfig = {
  appUrl: process.env.QELOS_APP_URL ?? 'https://your-qelos-app.com',
  apiToken: process.env.QELOS_API_TOKEN ?? '',
};

export default config;
`;
  }
  if (useESModule) {
    return `/** @type {import('@qelos/global-types').QelosConfig} */
const config = {
  appUrl: process.env.QELOS_APP_URL ?? 'https://your-qelos-app.com',
  apiToken: process.env.QELOS_API_TOKEN ?? '',
};

export default config;
`;
  }
  return `/** @type {import('@qelos/global-types').QelosConfig} */
const config = {
  appUrl: process.env.QELOS_APP_URL ?? 'https://your-qelos-app.com',
  apiToken: process.env.QELOS_API_TOKEN ?? '',
};

module.exports = config;
`;
}

/**
 * @param {string} cwd
 * @param {string} frameworkId
 */
export function shouldUseTypeScript(cwd, frameworkId) {
  if (frameworkId === 'fastapi') return false;
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };
    if (allDeps.typescript) return true;
  } catch {
    return false;
  }
  return fs.existsSync(path.join(cwd, 'tsconfig.json'));
}

/**
 * @param {string} cwd
 */
export function shouldUseESModule(cwd) {
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.type === 'module';
  } catch {
    return false;
  }
}
