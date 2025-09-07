import { execSync } from "node:child_process";

export function getPackagesBasicInfo() {
  const packagesJson = execSync('pnpm ls -r --json', { cwd: process.cwd() }).toString();
  const packages = JSON.parse(packagesJson);

  return packages
    .map(pkg => ({
      name: pkg.name,
      version: pkg.version,
      path: pkg.path
    }))
    .reduce((obj, row) => {
      obj[row.name] = row;
      return obj;
    }, {})
}