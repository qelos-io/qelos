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

/**
 * Detect framework from package.json deps or Python project files.
 * Order favors meta-frameworks first; NestJS is checked before Express/Fastify so Nest apps
 * are not misclassified as plain Express.
 * @param {string} cwd
 * @returns {{ id: string, source: string } | null}
 */
export function detectFramework(cwd) {
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
        ...(pkg.peerDependencies || {}),
      };
      if (allDeps.next) return { id: 'next', source: 'package.json' };
      if (allDeps.nuxt) return { id: 'nuxt', source: 'package.json' };
      if (allDeps['@nestjs/core']) return { id: 'nest', source: 'package.json' };
      if (allDeps.fastify) return { id: 'fastify', source: 'package.json' };
      if (allDeps.express) return { id: 'express', source: 'package.json' };
    } catch (err) {
      logger.debug(`Failed to parse package.json: ${err.message}`);
    }
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
