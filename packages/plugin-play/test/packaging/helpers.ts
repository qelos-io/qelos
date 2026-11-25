import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
export const consumerScript = join(packageRoot, 'test', 'packaging', 'fixtures', 'plugin-consumer.mjs');

export async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}

/** A project folder whose package.json names the plugin (the plugin reads it from the working directory). */
export function pluginProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'qelos-plugin-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'demo-plugin', description: 'demo', version: '1.0.0' }));
  return dir;
}

export function runPlugin(opts: { cwd: string; entry: string; build: 'cjs' | 'esm'; script?: string; ports: [number, number]; env?: Record<string, string> }) {
  const out = execFileSync(process.execPath, ['--no-warnings', opts.script ?? consumerScript], {
    cwd: opts.cwd,
    env: { ...process.env, PLUGIN_ENTRY: opts.entry, BUILD: opts.build, PORT: String(opts.ports[0]), INTERNAL_PORT: String(opts.ports[1]), ...opts.env },
    encoding: 'utf8',
    timeout: 60_000,
  });
  return JSON.parse(out.trim().split('\n').pop()!);
}
