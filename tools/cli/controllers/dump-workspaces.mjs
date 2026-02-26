import { initializeSdk } from '../services/sdk.mjs';
import { logger } from '../services/logger.mjs';
import fs from 'node:fs';
import path from 'node:path';

export default async function dumpWorkspacesController({ path: targetPath = './dump' }) {
  const dumpPath = path.resolve(targetPath);

  if (!fs.existsSync(dumpPath)) {
    fs.mkdirSync(dumpPath, { recursive: true });
  }

  try {
    const sdk = await initializeSdk();
    logger.section('Dumping workspaces');

    const workspaces = await sdk.adminWorkspaces.getList();

    if (!workspaces || workspaces.length === 0) {
      logger.warning('No workspaces found');
      return;
    }

    const cleaned = workspaces.map(({ tenant, __v, ...rest }) => rest);
    const filePath = path.join(dumpPath, 'workspaces.json');
    fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2), 'utf-8');
    logger.success(`Dumped ${workspaces.length} workspace(s) to ${filePath}`);
  } catch (error) {
    logger.error('Failed to dump workspaces', error);
    process.exit(1);
  }
}
