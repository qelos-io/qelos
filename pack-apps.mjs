import { readdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { exec, execSync } from "node:child_process";
import { getPackagesBasicInfo } from "./tools/bundler/packages-basic-info.mjs";
import { bundleDependencies } from "./tools/bundle-dependencies-polyfix/index.js";

const packages = getPackagesBasicInfo();

const ignoredApps = ['db', 'redis', 'local-mcp'];

Promise.all(
  readdirSync('./apps').map((folder) => {
    if (ignoredApps.includes(folder) || folder.startsWith('.')) {
      return;
    }
    const depsNames = bundleDependencies(folder);
    return new Promise((resolve, reject) => {
      console.log(`Removing local node_modules at ${folder}`);
      if (existsSync(`apps/${folder}/package-lock.json`)) {
        rmSync(`apps/${folder}/package-lock.json`)
      }
      exec(`rm -rf apps/${folder}/node_modules/@qelos`, (err) => {
        execSync(`mkdir -p apps/${folder}/node_modules/@qelos`);
        if (err) {
          console.log(`failed to remove apps/${folder}/node_modules/@qelos`);
          console.log(err);
          reject();
        }
        resolve();
      });
    })
      .then(() => {
        console.log('Copying local packages to apps/' + folder)
        return Promise.all(
          depsNames.map(dep => {
            if (!packages[dep]) {
              return;
            }
            const pkg = packages[dep];
            return new Promise((resolve, reject) => {
              exec(`cp -r ${pkg.path} apps/${folder}/node_modules/${pkg.name}`, (err) => {
                if (err) {
                  reject();
                }
                resolve();
              });
            })
          })
        )
      })
      .then(() => {
        return new Promise((resolve, reject) => {
          // Modify package.json to replace workspace dependencies before packing
          const pkgPath = `apps/${folder}/package.json`;
          const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

          console.log('Replacing workspace dependency to remote at apps/' + folder)
          
          // Replace workspace dependencies with wildcard versions
          if (pkg.dependencies) {
            Object.keys(pkg.dependencies).forEach(dep => {
              if (pkg.dependencies[dep] === 'workspace:^') {
                pkg.dependencies[dep] = '*';
              }
            });
          }
          if (pkg.devDependencies) {
            delete pkg.devDependencies;
          }
          
          // Write the modified package.json back
          writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
          
          console.log(`Installing ${folder}`)
          // Run npm pack with the modified package.json
          exec(`cd apps/${folder} && npm install --ignore-scripts --omit=dev && npm pack --ignore-scripts --verbose`, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
            if (err) {
              console.log(folder + ' npm pack failed');
              console.log(err.message);
              console.log(stdout.toString().slice(-10000));
              reject();
              return;
            }
            
            // Then run rename-pack.js
            exec(`cd apps/${folder} && node ../../tools/bundler/rename-pack.js`, { maxBuffer: 1024 * 1024 }, (err) => {
              console.log(folder + ' packing ' + (err ? 'failed' : 'succeeded'))
              if (err) {
                console.log(err.message);
                reject();
                return;
              }

              // git checkout to all package.json files
              exec(`cd apps/${folder} && git checkout package.json`, { maxBuffer: 1024 * 1024 }, (err) => {
                if (err) {
                  console.log(`Warning: Failed to checkout package.json for ${folder}:`, err.message);
                }
                resolve();
              })
            })
          })
        })
      })
  })
)
  .catch((err) => {
    console.log('failed!', err)
    process.exit(1)
  })
