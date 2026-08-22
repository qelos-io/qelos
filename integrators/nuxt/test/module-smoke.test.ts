// Run with: `pnpm --filter @qelos/integrator-nuxt test:smoke`
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const integratorRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(integratorRoot, '../..');

const fixtures = [
  { label: 'Nuxt 3', dir: 'nuxt3' },
  { label: 'Nuxt 4', dir: 'nuxt4' },
] as const;

const pnpmCommand = 'pnpm';
const useShell = process.platform === 'win32';

interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: { ...process.env, ...options.env },
      shell: useShell,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk;
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

describe('module smoke', () => {
  before(async () => {
    const build = await runCommand(pnpmCommand, ['run', 'build'], {
      cwd: integratorRoot,
    });
    assert.equal(
      build.code,
      0,
      `integrator build failed:\n${build.stdout}\n${build.stderr}`,
    );

    const install = await runCommand(pnpmCommand, ['install'], { cwd: repoRoot });
    assert.equal(
      install.code,
      0,
      `pnpm install failed:\n${install.stdout}\n${install.stderr}`,
    );
  });

  for (const fixture of fixtures) {
    it(`${fixture.label}: nuxt prepare succeeds`, async () => {
      const fixtureDir = path.join(integratorRoot, 'test/fixtures', fixture.dir);

      const result = await runCommand(pnpmCommand, ['exec', 'nuxt', 'prepare'], {
        cwd: fixtureDir,
        env: { QELOS_APP_URL: 'https://example.test' },
      });

      assert.equal(
        result.code,
        0,
        `[${fixture.label}] nuxt prepare failed (exit ${result.code})\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
      );
    });
  }
});
