// What a package may upload to npm. The release publishes from the working folder, so anything lying in a package
// directory (tool settings, scratch files, `.env`) would go out with it.
import { execFileSync } from 'node:child_process';

/** Never published, even when committed: environment files, registry settings, keys, tool and scratch folders. */
const NEVER = /(^|\/)(\.env(?!\.(example|sample|template)$)(\..*)?|\.npmrc|id_rsa|[^/]*\.(pem|p12|pfx)|(\.claude|\.cursor|\.impeccable|tmp)\/.*)$/;

const read = (command, args, cwd) => execFileSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/**
 * The files `pnpm publish` would upload from `dir` that should not leave this machine: the ones in `NEVER`, and any
 * other file git does not track, apart from build output (`dist/`) and the LICENSE that pnpm adds.
 */
export function localOnlyFiles(dir) {
  const packed = JSON.parse(read('pnpm', ['pack', '--dry-run', '--json'], dir)).files.map((file) => file.path);
  const tracked = new Set(read('git', ['ls-files', '-z'], dir).split('\0'));
  return packed.filter((file) => NEVER.test(file) || !(tracked.has(file) || file.startsWith('dist/') || file === 'LICENSE'));
}
