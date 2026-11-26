import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { Controller, Get, Module, Req, UseGuards } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { testApp } from '@qelos/testing/http';
import { QelosModule } from '../src/module';
import { QelosAuthGuard } from '../src/guard';
import type { AnyRequest } from '../src/types';

/**
 * A real Nest application (HTTP adapter, dependency injection, QelosModule.forRoot wiring, guard) running the
 * integrator in mock mode, driven with `testApp()` from @qelos/testing.
 */
// Decorators are applied by hand: the test runner's transpiler does not apply this package's decorator settings
// to files under test/.
class WhoAmIController {
  whoami(request: AnyRequest) {
    return { email: request.qelos?.user?.email ?? null };
  }

  secret(request: AnyRequest) {
    return { email: request.qelos?.user?.email };
  }
}

function route(method: 'whoami' | 'secret', path: string, ...decorators: MethodDecorator[]) {
  const proto = WhoAmIController.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, method)!;
  for (const decorate of [Get(path), ...decorators]) decorate(proto, method, descriptor);
  Req()(proto, method, 0);
}

route('whoami', 'whoami');
route('secret', 'private', UseGuards(QelosAuthGuard));
Controller()(WhoAmIController);

class AppModule {}

Module({
  imports: [
    QelosModule.forRoot({
      config: {
        appUrl: 'http://unreachable.invalid',
        mock: {
          logger: () => {},
          seed: {
            personas: [
              { email: 'dev@example.com', password: 'secret-pass-1', roles: ['admin'] },
              { email: 'other@example.com', password: 'secret-pass-2', roles: ['user'] },
            ],
          },
        },
      },
    }),
  ],
  controllers: [WhoAmIController],
})(AppModule);

test('testApp: a real Nest app with QelosModule.forRoot, proxy, middleware and guard', async () => {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  const client = await testApp(app.getHttpServer());
  try {
    assert.equal((await client.json('/whoami')).body.email, null);
    assert.ok([401, 403].includes((await client.json('/private')).status));

    const persona = client.as('other@example.com');
    assert.equal((await persona.json('/api/me')).body.email, 'other@example.com', 'the proxy serves /api from the mock');
    assert.equal((await persona.json('/whoami')).body.email, 'other@example.com', 'the middleware resolves the persona');
    assert.deepEqual((await persona.json('/private')).body, { email: 'other@example.com' });

    assert.equal((await client.signIn('dev@example.com', 'secret-pass-1')).status, 200);
    assert.equal((await client.json('/whoami')).body.email, 'dev@example.com');
    assert.equal((await client.json('/private')).status, 200);
  } finally {
    await client.close();
    await app.close();
  }
});
