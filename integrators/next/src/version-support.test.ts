import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { NextRequest, NextResponse } from 'next/server';
import {
  MIN_NEXT_VERSION,
  NEXT_PEER_RANGE,
  TESTED_NEXT_MAJOR,
} from './version-support';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(
  readFileSync(join(packageRoot, 'package.json'), 'utf8'),
) as {
  peerDependencies?: { next?: string };
  devDependencies?: { next?: string };
};

function majorFromRange(range: string): number {
  const match = range.match(/(\d+)/);
  assert.ok(match, `expected a semver major in range: ${range}`);
  return Number.parseInt(match[1], 10);
}

describe('Next.js version support policy', () => {
  it('exports constants aligned with package.json peer range', () => {
    assert.equal(NEXT_PEER_RANGE, '>=13.4.0');
    assert.equal(MIN_NEXT_VERSION, '13.4.0');
    assert.equal(pkg.peerDependencies?.next, NEXT_PEER_RANGE);
  });

  it('keeps a forward-compatible peer range without an upper bound', () => {
    const peer = pkg.peerDependencies?.next ?? '';
    assert.match(peer, /^>=/);
    assert.doesNotMatch(peer, /\|\|/);
  });

  it('type-checks against the tested Next major in devDependencies', () => {
    const devRange = pkg.devDependencies?.next ?? '';
    assert.equal(majorFromRange(devRange), TESTED_NEXT_MAJOR);
  });

  it('imports core next/server APIs used by the integrator', () => {
    const req = new NextRequest('https://example.test/');
    assert.equal(req.nextUrl.pathname, '/');
    const res = NextResponse.next();
    assert.equal(res.status, 200);
  });
});
