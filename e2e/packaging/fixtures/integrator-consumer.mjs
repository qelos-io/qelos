// Runs one Qelos integrator, installed from its packed tarball, in a plain Node server with mock mode on, and prints
// what happened as JSON.
//   FRAMEWORK=express|fastify|nest   BUILD=cjs|esm (load the integrator with require() or import)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';

const require = createRequire(import.meta.url);
const { FRAMEWORK, BUILD } = process.env;
const load = async (specifier) => (BUILD === 'cjs' ? require(specifier) : await import(specifier));

const config = {
  appUrl: 'http://unreachable.invalid',
  mock: { logger: () => {}, seed: { personas: [{ email: 'dev@example.com', password: 'secret-pass-1', roles: ['admin'] }] } },
};
const whoami = (request) => ({ email: request.qelos?.user?.email ?? null });
const integrator = await load(`@qelos/integrator-${FRAMEWORK}`);
let server;
let close;

if (FRAMEWORK === 'express') {
  const express = require('express');
  const { middleware, proxy } = integrator.createQelosIntegrator({ config });
  const app = express();
  app.use(middleware);
  app.get('/whoami', (req, res) => res.json(whoami(req)));
  app.use('/api', proxy);
  server = createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  close = () => server.close();
} else if (FRAMEWORK === 'fastify') {
  const fastify = require('fastify')();
  // as users write it: `register(require(...))` or `register((await import(...)).default)`; Fastify unwraps `.default`
  await fastify.register(BUILD === 'cjs' ? integrator : integrator.default, { config });
  fastify.get('/whoami', async (request) => whoami(request));
  await fastify.listen({ port: 0, host: '127.0.0.1' });
  server = fastify.server;
  close = () => fastify.close();
} else {
  require('reflect-metadata');
  const { Controller, Get, Module, Req } = require('@nestjs/common');
  const { NestFactory } = require('@nestjs/core');
  class WhoAmI {
    whoami(request) {
      return whoami(request);
    }
  }
  Get('whoami')(WhoAmI.prototype, 'whoami', Object.getOwnPropertyDescriptor(WhoAmI.prototype, 'whoami'));
  Req()(WhoAmI.prototype, 'whoami', 0);
  Controller()(WhoAmI);
  class AppModule {}
  Module({ imports: [integrator.QelosModule.forRoot({ config })], controllers: [WhoAmI] })(AppModule);
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer();
  close = () => app.close();
}

const base = `http://127.0.0.1:${server.address().port}`;
const out = {};
out.anonymous = await (await fetch(`${base}/whoami`)).json();
const signin = await fetch(`${base}/api/signin`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'dev@example.com', password: 'secret-pass-1' }),
});
const cookie = signin.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
out.signin = signin.status;
out.me = (await (await fetch(`${base}/api/me`, { headers: { cookie } })).json()).email;
out.whoami = await (await fetch(`${base}/whoami`, { headers: { cookie } })).json();
await close();
console.log(JSON.stringify(out));
process.exit(0);
