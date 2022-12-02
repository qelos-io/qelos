import {execSync} from "child_process";

export function getPackagesBasicInfo() {
  const packages = execSync('lerna la', {cwd: process.cwd()}).toString().split('\n');

  return packages
    .map(line => {
      const [name, version, path] = line.split(' ').filter(Boolean);
      return {
        name,
        version,
        path
      }
    })
    .reduce((obj, row) => {
      obj[row.name] = row;
      return obj;
    }, {})
}