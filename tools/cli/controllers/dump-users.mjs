import { initializeSdk } from '../services/sdk.mjs';
import { logger } from '../services/logger.mjs';
import fs from 'node:fs';
import path from 'node:path';

export default async function dumpUsersController({ path: targetPath = './dump' }) {
  const dumpPath = path.resolve(targetPath);

  if (!fs.existsSync(dumpPath)) {
    fs.mkdirSync(dumpPath, { recursive: true });
  }

  try {
    const sdk = await initializeSdk();
    logger.section('Dumping users');

    const users = await sdk.users.getList();

    if (!users || users.length === 0) {
      logger.warning('No users found');
      return;
    }

    const cleaned = users.map(({ tenant, __v, ...rest }) => rest);
    const filePath = path.join(dumpPath, 'users.json');
    fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2), 'utf-8');
    logger.success(`Dumped ${users.length} user(s) to ${filePath}`);
  } catch (error) {
    logger.error('Failed to dump users', error);
    process.exit(1);
  }
}
