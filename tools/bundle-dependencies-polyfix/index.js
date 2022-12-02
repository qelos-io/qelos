const fs = require("fs");
const {join} = require('path');

function rewriteJSON(path, pkg) {
  const deps = Object.keys(pkg.dependencies);
  pkg.bundledDependencies = deps;
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
  return deps;
}

function bundleDependencies(appName) {
  if (!appName) {
    console.log('app name is missing');
    return;
  }
  const pkgPath = join(__dirname, '../../apps', appName, 'package.json');
  const pkg = require(pkgPath);
  const deps = rewriteJSON(pkgPath, pkg);
  console.log('added bundled dependencies to ', pkgPath);
  return deps;
}

module.exports = {bundleDependencies}

// bundleDependencies(process.argv[process.argv.length - 1]);
