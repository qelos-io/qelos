import express from 'express';
import { fileURLToPath } from 'node:url';
import { createQelosIntegrator } from '@qelos/integrator-express';

const MOCK_DIR = fileURLToPath(new URL('./qelos-mock', import.meta.url));

// No tenant: `mock` points at a folder holding personas.json, pull/dump artifacts and state/*.json.
// `QELOS_MOCK=<folder>` in the environment works too (an explicit `mock` wins).
const qelos = createQelosIntegrator({
  config: {
    appUrl: process.env.QELOS_APP_URL ?? '',
    mock: process.env.NODE_ENV === 'production' ? false : MOCK_DIR,
  },
});

const app = express();
app.use(qelos.middleware);

app.get('/whoami', (req, res) => {
  res.json({ user: req.qelos.user?.email ?? null, workspace: req.qelos.workspace?.name ?? null });
});

// everything under /api (signin, signup, logout, /api/me, blueprint entities, personas...) is answered by the mock
app.use('/api', qelos.proxy);

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Example listening on http://127.0.0.1:${server.address().port} (mock: ${MOCK_DIR})`);
});

// flush the mock's JSON state on exit so nothing is lost on Ctrl+C
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    const mock = await qelos.mock.get();
    await mock?.state.flush();
    server.close(() => process.exit(0));
  });
}
