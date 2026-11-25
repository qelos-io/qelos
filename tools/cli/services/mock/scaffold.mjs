import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

export const DEFAULT_MOCK_DIR = './qelos-mock';

const PERSONA_TEMPLATES = [
  {
    email: 'admin@example.com',
    name: 'Ada Admin',
    roles: ['admin'],
    workspaces: [{ name: 'Acme', labels: ['company'], roles: ['admin', 'user'] }],
  },
  {
    email: 'member@example.com',
    name: 'Max Member',
    roles: ['user'],
    workspaces: [{ name: 'Acme', labels: ['company'], roles: ['user'] }],
  },
  {
    email: 'guest@example.com',
    name: 'Gia Guest',
    roles: ['member'],
    workspaces: [{ name: 'Guest Space', labels: ['guest'], roles: ['member'] }],
  },
];

/** Personas with a fresh random password each, so no well-known default credentials are ever written. */
export function generatePersonas() {
  return PERSONA_TEMPLATES.map(({ email, ...rest }) => ({
    email,
    password: randomBytes(9).toString('base64url'),
    ...rest,
  }));
}

export const WORKSPACES = [
  { name: 'Acme', labels: ['company'] },
  { name: 'Guest Space', labels: ['guest'] },
];

export function buildReadme(dirName) {
  return `# Qelos mock folder

Local data for developing **without a Qelos tenant**. Point an integrator at this folder:

\`\`\`bash
QELOS_MOCK=./${dirName} npm run dev
# or run the mock as a standalone HTTP server
qelos mock serve ${dirName}
\`\`\`

| Path | Purpose |
|---|---|
| \`personas.json\` | Users you can act as (roles, workspace labels/roles). Passwords are random throwaway values from \`qelos mock init\`; localhost only. Applied when the mock first starts. |
| \`workspaces.json\` | Workspaces (same format as \`qelos dump workspaces\`). |
| \`blueprints/\`, \`configs/\`, \`components/\`, \`blocks/\`, ... | Output of \`qelos pull all ${dirName}\` (optional). |
| \`users.json\`, \`entities/\` | Output of \`qelos dump users\\|blueprints --path ${dirName}\` (optional). |
| \`state/\` | The mock's persisted state (JSON). Delete it to start over, or \`POST /__qelos_mock__/reset\`. |

Once \`state/\` exists it wins over the other files, so edits to the personas or artifacts are picked up
after deleting \`state/\`. \`state/\` is git-ignored (it contains hashed passwords and sessions).
`;
}

/**
 * Create the mock folder skeleton. Existing files are kept unless `force` is set.
 * @returns {{ dir: string, created: string[], skipped: string[], credentials: { email: string, password: string }[] }}
 */
export function scaffoldMockFolder(dir, { force = false } = {}) {
  const root = path.resolve(dir);
  fs.mkdirSync(path.join(root, 'state'), { recursive: true });
  const personas = generatePersonas();
  const created = [];
  const skipped = [];
  const files = {
    'personas.json': JSON.stringify(personas, null, 2) + '\n',
    'workspaces.json': JSON.stringify(WORKSPACES, null, 2) + '\n',
    'README.md': buildReadme(path.basename(root)),
    'state/.gitkeep': '',
    '.gitignore': 'state/*\n!state/.gitkeep\n',
  };
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, name);
    if (fs.existsSync(file) && !force) {
      skipped.push(file);
    } else {
      fs.writeFileSync(file, content);
      created.push(file);
    }
  }
  const credentials = created.includes(path.join(root, 'personas.json'))
    ? personas.map(({ email, password }) => ({ email, password }))
    : [];
  return { dir: root, created, skipped, credentials };
}

/** Lines printed by `qelos init` to run against a local mock instead of a tenant. */
export function mockHintFor(frameworkId, dir = DEFAULT_MOCK_DIR) {
  if (frameworkId === 'fastapi') {
    return [`QELOS_MOCK=${dir} uvicorn main:app --reload   # the integrator starts the mock sidecar itself`];
  }
  if (frameworkId === 'express') {
    return [`QELOS_MOCK=${dir} npm run dev`];
  }
  // fastify / nest / next / nuxt: no built-in mock mode yet, point appUrl at the standalone mock server
  return [
    `qelos mock serve ${dir} --port 4555          # in a second terminal`,
    'QELOS_APP_URL=http://127.0.0.1:4555 npm run dev',
  ];
}
