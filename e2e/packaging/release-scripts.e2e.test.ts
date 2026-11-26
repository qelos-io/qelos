import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** A release has to publish every public package, each one after the packages it needs. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const publishable = [
  ...['packages', 'integrators'].flatMap((folder) => readdirSync(join(ROOT, folder)).map((name) => `${folder}/${name}`)),
  'tools/cli',
]
  .map((dir) => join(ROOT, dir, 'package.json'))
  .filter((file) => existsSync(file))
  .map((file) => JSON.parse(readFileSync(file, 'utf8')))
  .filter((pkg) => !pkg.private);

/** The package names a release script reports, in the order it handles them. Nothing is built or published. */
function listedBy(script: string, ...args: string[]): string[] {
  const output = execFileSync(process.execPath, [join(ROOT, 'scripts', script), ...args], { cwd: ROOT, encoding: 'utf8' });
  return output.replace(/\x1b\[[0-9;]*m/g, '').match(/@qelos\/[\w-]+/g) ?? [];
}

const scripts = {
  'publish.mjs': () =>
    listedBy('publish.mjs', '--dry-run', '--skip-publish', '--skip-login', '--skip-install', '--skip-build', '--skip-test', '--skip-python'),
  'publish-packages.mjs': () => listedBy('publish-packages.mjs', '--list'),
};

for (const [script, list] of Object.entries(scripts)) {
  describe(`scripts/${script}`, () => {
    test('releases every public package', () => {
      const listed = list();
      const missing = publishable.map((pkg) => pkg.name).filter((name) => !listed.includes(name));
      assert.deepEqual(missing, [], `add to the PACKAGES list of scripts/${script}`);
    });

    test('publishes a package after the packages it depends on', () => {
      const listed = list();
      // packages missing from the list are reported by the test above
      const early = publishable.filter((pkg) => listed.includes(pkg.name)).flatMap((pkg) =>
        Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies })
          .filter((dependency) => listed.indexOf(dependency) > listed.indexOf(pkg.name))
          .map((dependency) => `${pkg.name} comes before ${dependency}`),
      );
      assert.deepEqual(early, []);
    });
  });
}
