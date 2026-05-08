import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { $ } from 'zx';
import { logger, blue, green } from '../services/utils/logger.mjs';
import { readCredentials } from '../services/config/credentials.mjs';

const commandsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(commandsDir, '..', '..', '..');

const DEFAULT_URL = 'http://localhost:9000';
const DEFAULT_USERNAME = 'test@test.com';
const DEFAULT_PASSWORD = 'admin';

async function probe(url, init = {}, timeoutMs = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function isStackUp(url) {
  try {
    const res = await probe(url);
    return res.status > 0;
  } catch {
    return false;
  }
}

async function isSeeded(url, username, password) {
  try {
    const res = await probe(`${url}/api/signin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password, authType: 'oauth' }),
    }, 5000);
    return res.ok;
  } catch {
    return false;
  }
}

function resolveSettings(argv) {
  const stored = readCredentials();
  const url = (
    argv.url
    || process.env.QELOS_INTEGRATOR_E2E_URL
    || process.env.QELOS_E2E_URL
    || stored?.appUrl
    || DEFAULT_URL
  ).replace(/\/$/, '');

  const username = argv.username
    || process.env.QELOS_INTEGRATOR_E2E_USERNAME
    || process.env.QELOS_E2E_USERNAME
    || stored?.user?.email
    || stored?.user?.username
    || DEFAULT_USERNAME;

  const password = argv.password
    || process.env.QELOS_INTEGRATOR_E2E_PASSWORD
    || process.env.QELOS_E2E_PASSWORD
    || DEFAULT_PASSWORD;

  return { url, username, password };
}

async function runIntegrators(argv) {
  const { url, username, password } = resolveSettings(argv);

  logger.section('Running integrator e2e suite');
  console.log(`  ${blue('Gateway:')} ${url}`);
  console.log(`  ${blue('User:')}    ${username}`);

  logger.step(`Probing gateway at ${url}`);
  if (!(await isStackUp(url))) {
    logger.error(
      `Cannot reach Qelos gateway at ${url}. Start the stack first ` +
      `(e.g. \`docker compose -f compose/docker-compose.yml up -d\`) and retry.`,
    );
    process.exit(1);
  }
  console.log(`  ${green('✓')} gateway reachable`);

  if (!argv.skipPopulate) {
    logger.step(`Verifying seed data (login probe as ${username})`);
    if (await isSeeded(url, username, password)) {
      console.log(`  ${green('✓')} seed user can sign in`);
    } else {
      logger.info(`Seed user not found — running \`pnpm populate-db\``);
      try {
        await $({ cwd: repoRoot, stdio: 'inherit' })`pnpm populate-db`;
      } catch (err) {
        logger.error('pnpm populate-db failed', err);
        process.exit(1);
      }
    }
  }

  logger.step('Running pnpm -F e2e test');
  await $({
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      QELOS_INTEGRATOR_E2E_URL: url,
      QELOS_INTEGRATOR_E2E_USERNAME: username,
      QELOS_INTEGRATOR_E2E_PASSWORD: password,
    },
  })`pnpm -F e2e test`;
}

/**
 * @param {import('yargs').Argv} program
 */
export default function testCommand(program) {
  program.command('test', 'Run Qelos test suites', (yargs) => {
    yargs
      .command(
        'integrators',
        'Run integrator packages against a live Qelos stack (auto-detects URL, seeds via pnpm populate-db on first run)',
        (y) => y
          .option('url', {
            type: 'string',
            description: 'Gateway URL (defaults to QELOS_INTEGRATOR_E2E_URL, stored credentials, or http://localhost:9000)',
          })
          .option('username', {
            type: 'string',
            description: `Login email (defaults to ${DEFAULT_USERNAME})`,
          })
          .option('password', {
            type: 'string',
            description: 'Login password (avoid in shell history; defaults to "admin")',
          })
          .option('skip-populate', {
            type: 'boolean',
            description: 'Skip the auto pnpm populate-db check',
            default: false,
          }),
        runIntegrators,
      )
      .demandCommand(1, 'Specify a subcommand (e.g. integrators)');
  });
}
