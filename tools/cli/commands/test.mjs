import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { $ } from 'zx';

const commandsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(commandsDir, '..', '..', '..');

/**
 * @param {import('yargs').Argv} program
 */
export default function testCommand(program) {
  program.command('test', 'Run Qelos test suites', (yargs) => {
    yargs
      .command(
        'integrators',
        'Run integrator packages against a live Qelos stack (set QELOS_INTEGRATOR_E2E_URL, seed with pnpm populate-db)',
        () => {},
        async () => {
          await $({ cwd: repoRoot, stdio: 'inherit' })`pnpm -F e2e test`;
        },
      )
      .demandCommand(1, 'Specify a subcommand (e.g. integrators)');
  });
}
