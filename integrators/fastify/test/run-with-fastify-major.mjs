import { spawnSync } from 'node:child_process';

const major = process.argv[2];
if (major !== '4' && major !== '5') {
  console.error('Usage: node test/run-with-fastify-major.mjs <4|5>');
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--test', 'src/**/*.test.ts', 'test/**/*.test.ts'],
  {
    env: { ...process.env, FASTIFY_MAJOR: major },
    stdio: 'inherit',
    shell: true,
  },
);

process.exit(result.status ?? 1);
