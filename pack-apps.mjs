import { readdirSync, readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const ignoredApps = ['db', 'redis', 'local-mcp'];

// Replace "workspace:^" references with "*" in a package.json file
function replaceWorkspaceRefs(pkgPath) {
  const raw = readFileSync(pkgPath, 'utf8');
  if (!raw.includes('workspace:')) return;
  const pkg = JSON.parse(raw);
  let changed = false;
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    if (!pkg[field]) continue;
    for (const [dep, version] of Object.entries(pkg[field])) {
      if (typeof version === 'string' && version.startsWith('workspace:')) {
        pkg[field][dep] = '*';
        changed = true;
      }
    }
  }
  if (changed) {
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
}

// Replace workspace refs in the deployed directory (app + all @qelos/* packages in node_modules)
function replaceAllWorkspaceRefs(deployDir) {
  // App's own package.json
  replaceWorkspaceRefs(join(deployDir, 'package.json'));

  // @qelos/* packages in node_modules
  const qelosDir = join(deployDir, 'node_modules', '@qelos');
  if (existsSync(qelosDir)) {
    for (const pkg of readdirSync(qelosDir)) {
      const pkgJson = join(qelosDir, pkg, 'package.json');
      if (existsSync(pkgJson)) {
        replaceWorkspaceRefs(pkgJson);
      }
    }
  }
}

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

  // Replace workspace:^ with * so npm commands work in Docker
  console.log(`Replacing workspace references in ${pkg.name}...`);
  replaceAllWorkspaceRefs(deployDir);

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
