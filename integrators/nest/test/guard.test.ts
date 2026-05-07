import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

import { QelosAuthGuard, QelosGuard } from '../src/guard';
import type { AnyRequest } from '../src/types';

function mockHttpContext(request: AnyRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

test('QelosGuard rejects missing user', () => {
  const guard = new QelosGuard();
  const req: AnyRequest = { headers: {}, qelos: { user: null } as AnyRequest['qelos'] };
  assert.throws(
    () => guard.canActivate(mockHttpContext(req)),
    UnauthorizedException,
  );
});

test('QelosGuard rejects missing qelos context', () => {
  const guard = new QelosGuard();
  const req: AnyRequest = { headers: {} };
  assert.throws(
    () => guard.canActivate(mockHttpContext(req)),
    UnauthorizedException,
  );
});

test('QelosGuard allows authenticated request', () => {
  const guard = new QelosGuard();
  const req: AnyRequest = {
    headers: {},
    qelos: {
      user: { _id: 'u1' } as NonNullable<AnyRequest['qelos']>['user'],
    } as NonNullable<AnyRequest['qelos']>,
  };
  assert.equal(guard.canActivate(mockHttpContext(req)), true);
});

test('QelosAuthGuard is the same class as QelosGuard', () => {
  assert.strictEqual(QelosAuthGuard, QelosGuard);
});
