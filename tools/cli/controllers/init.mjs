import fs from 'node:fs';
import path from 'node:path';
import { logger, blue, yellow } from '../services/utils/logger.mjs';
import { confirmDialog, interactiveSelect } from '../services/utils/interactive-select.mjs';
import {
  FRAMEWORKS,
  detectFramework,
  buildJsConfigContents,
  shouldUseTypeScript,
  shouldUseESModule,
} from '../services/init/scaffold.mjs';

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
    if (new RegExp(`^\\s*${escapeRegExp(framework.integrator)}\\b`, 'm').test(content)) {
      logger.info(`${framework.integrator} is already in requirements.txt.`);
      return false;
    }
    const sep = content.endsWith('\n') ? '' : '\n';
    fs.writeFileSync(reqPath, content + sep + line + '\n');
  } else {
    fs.writeFileSync(reqPath, `${line}\n`);
  }
  return true;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  const useESModule = shouldUseESModule(cwd);
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
      fs.writeFileSync(configPath, buildJsConfigContents(useTypeScript, useESModule));
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
