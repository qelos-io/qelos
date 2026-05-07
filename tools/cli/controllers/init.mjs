import fs from 'node:fs';
import path from 'node:path';
import { logger, blue, yellow } from '../services/utils/logger.mjs';
import { confirmDialog, interactiveSelect } from '../services/utils/interactive-select.mjs';

const FRAMEWORKS = {
  next: {
    label: 'Next.js',
    integrator: '@qelos/integrator-next',
    integratorVersion: '^0.1.0',
    npmDep: 'next',
    nextSteps: [
      'Run `npm install`',
      "Re-export the middleware in your `middleware.ts`:",
      "  export { qelosMiddleware as middleware } from '@qelos/integrator-next/middleware';",
      "Read context in your routes via `getQelosContext()` from '@qelos/integrator-next/context'.",
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
      "Use `defineQelosEventHandler` in your server routes to access the qelos context.",
    ],
  },
  express: {
    label: 'Express',
    integrator: '@qelos/integrator-express',
    integratorVersion: '^0.1.0',
    npmDep: 'express',
    nextSteps: [
      'Run `npm install`',
      "Register the middleware:",
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
      "Register the plugin:",
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
      'Install the integrator: `pip install qelos-integrator-fastapi`',
      'Register the middleware on your FastAPI app:',
      "  from qelos_integrator_fastapi import QelosMiddleware",
      "  app.add_middleware(QelosMiddleware, app_url=os.environ['QELOS_APP_URL'])",
    ],
  },
};

function detectFramework(cwd) {
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
        ...(pkg.peerDependencies || {}),
      };
      if (allDeps['next']) return { id: 'next', source: 'package.json' };
      if (allDeps['nuxt']) return { id: 'nuxt', source: 'package.json' };
      if (allDeps['@nestjs/core']) return { id: 'nest', source: 'package.json' };
      if (allDeps['fastify']) return { id: 'fastify', source: 'package.json' };
      if (allDeps['express']) return { id: 'express', source: 'package.json' };
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

function buildJsConfigContents(useTypeScript) {
  if (useTypeScript) {
    return `import type { QelosConfig } from '@qelos/sdk';

const config: QelosConfig = {
  appUrl: process.env.QELOS_APP_URL ?? 'https://your-qelos-app.com',
  apiToken: process.env.QELOS_API_TOKEN ?? '',
};

export default config;
`;
  }
  return `/** @type {import('@qelos/sdk').QelosConfig} */
const config = {
  appUrl: process.env.QELOS_APP_URL ?? 'https://your-qelos-app.com',
  apiToken: process.env.QELOS_API_TOKEN ?? '',
};

module.exports = config;
`;
}

function shouldUseTypeScript(cwd, frameworkId) {
  if (frameworkId === 'fastapi') return false;
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };
    if (allDeps['typescript']) return true;
  } catch {
    return false;
  }
  return fs.existsSync(path.join(cwd, 'tsconfig.json'));
}

function addIntegratorToPackageJson(cwd, framework) {
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    logger.warning(`No package.json found at ${cwd} — skipping dependency update.`);
    return false;
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.dependencies = pkg.dependencies || {};
  if (pkg.dependencies[framework.integrator]) {
    logger.info(`${framework.integrator} is already in dependencies.`);
    return false;
  }
  pkg.dependencies[framework.integrator] = framework.integratorVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  return true;
}

function appendFastapiRequirement(cwd, framework) {
  const reqPath = path.join(cwd, 'requirements.txt');
  const line = `${framework.integrator}${framework.integratorVersion}`;
  if (fs.existsSync(reqPath)) {
    const content = fs.readFileSync(reqPath, 'utf-8');
    if (new RegExp(`^\\s*${framework.integrator}\\b`, 'm').test(content)) {
      logger.info(`${framework.integrator} is already in requirements.txt.`);
      return false;
    }
    const sep = content.endsWith('\n') ? '' : '\n';
    fs.writeFileSync(reqPath, content + sep + line + '\n');
  } else {
    fs.writeFileSync(reqPath, line + '\n');
  }
  return true;
}

export default async function initController(argv) {
  const cwd = process.cwd();

  if (argv.verbose) {
    process.env.VERBOSE = 'true';
  }

  let detection = detectFramework(cwd);
  let frameworkId = argv.framework;

  if (frameworkId) {
    if (!FRAMEWORKS[frameworkId]) {
      logger.error(`Unknown framework: ${frameworkId}. Supported: ${Object.keys(FRAMEWORKS).join(', ')}`);
      process.exit(1);
    }
  } else if (detection) {
    const framework = FRAMEWORKS[detection.id];
    console.log(`${blue('Detected framework:')} ${framework.label} (from ${detection.source})`);
    if (!argv.yes) {
      const confirmed = await confirmDialog(`Use ${framework.label} integrator?`, true);
      if (!confirmed) {
        detection = null;
      }
    }
    if (detection) {
      frameworkId = detection.id;
    }
  }

  if (!frameworkId) {
    console.log(yellow('Could not auto-detect framework. Please choose one:'));
    const selected = await interactiveSelect({
      values: Object.entries(FRAMEWORKS).reduce((acc, [id, f]) => {
        acc[id] = f.label;
        return acc;
      }, {}),
      message: 'Select your framework:',
    });
    frameworkId = selected.id;
  }

  const framework = FRAMEWORKS[frameworkId];
  const useTypeScript = shouldUseTypeScript(cwd, frameworkId);
  const configFilename = frameworkId === 'fastapi'
    ? 'qelos.config.py'
    : useTypeScript
      ? 'qelos.config.ts'
      : 'qelos.config.js';

  const configPath = path.join(cwd, configFilename);
  if (fs.existsSync(configPath) && !argv.force) {
    logger.warning(`${configFilename} already exists. Use --force to overwrite.`);
  } else {
    if (frameworkId === 'fastapi') {
      const py = `import os

QELOS_CONFIG = {
    "app_url": os.environ.get("QELOS_APP_URL", "https://your-qelos-app.com"),
    "api_token": os.environ.get("QELOS_API_TOKEN", ""),
}
`;
      fs.writeFileSync(configPath, py);
    } else {
      fs.writeFileSync(configPath, buildJsConfigContents(useTypeScript));
    }
    logger.success(`Created ${configFilename}`);
  }

  let depAdded = false;
  if (frameworkId === 'fastapi') {
    depAdded = appendFastapiRequirement(cwd, framework);
    if (depAdded) {
      logger.success(`Added ${framework.integrator} to requirements.txt`);
    }
  } else {
    depAdded = addIntegratorToPackageJson(cwd, framework);
    if (depAdded) {
      logger.success(`Added ${framework.integrator} to dependencies`);
    }
  }

  console.log('');
  logger.section('Next steps:');
  framework.nextSteps.forEach((step) => console.log(`  ${step}`));
  console.log('');
  logger.info('Set QELOS_APP_URL (and optionally QELOS_API_TOKEN) in your environment before running.');
}
