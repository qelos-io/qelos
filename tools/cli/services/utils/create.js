import { execSync } from 'node:child_process';
import { red } from './logger.mjs';

export function installNodeDependencies(directoryName) {
  console.log(process.cwd(), directoryName);
  try {
    execSync(`npm install`, {
      cwd: directoryName,
      stdio: "inherit",
    });
  } catch {
    console.log(red(`Failed to install dependencies using \`npm install\`.`));
    process.exit(1);
  }
}
