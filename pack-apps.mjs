import { readdirSync, readFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const ignoredApps = ['db', 'redis', 'local-mcp'];

const apps = readdirSync('./apps').filter(
  folder => !ignoredApps.includes(folder) && !folder.startsWith('.')
);

for (const folder of apps) {
  const pkg = JSON.parse(readFileSync(`apps/${folder}/package.json`, 'utf8'));
  const deployDir = `deploy/${folder}`;

  // Clean previous deploy
  if (existsSync(deployDir)) rmSync(deployDir, { recursive: true });
  mkdirSync(deployDir, { recursive: true });

  // pnpm deploy: copies app + installs prod deps + resolves workspace deps locally
  console.log(`\n=== Deploying ${pkg.name} ===`);
  execSync(`pnpm --filter ${pkg.name} deploy ${deployDir} --prod --legacy`, {
    stdio: 'inherit',
    timeout: 300000
  });

  // Create tarball
  const tgzName = pkg.name.replace('@', '').replace('/', '-') + '.tgz';
  execSync(`tar -czf apps/${folder}/${tgzName} -C ${deployDir} .`, { stdio: 'inherit' });

  // Clean up
  rmSync(deployDir, { recursive: true });
  console.log(`Packed ${pkg.name} -> apps/${folder}/${tgzName}`);
}

// Clean top-level deploy dir
if (existsSync('deploy')) rmSync('deploy', { recursive: true });
console.log('\nAll apps packed successfully!');
