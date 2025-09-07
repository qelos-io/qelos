import { readdirSync } from "node:fs";
import { exec } from "node:child_process";
import { getPackagesBasicInfo } from "./tools/bundler/packages-basic-info.mjs";
import { bundleDependencies } from "./tools/bundle-dependencies-polyfix/index.js";

const packages = getPackagesBasicInfo();

await Promise.all(
  readdirSync('./apps').map((folder) => {
    if (folder === 'db' || folder === 'redis' || folder.startsWith('.')) {
      return;
    }
    const depsNames = bundleDependencies(folder);
    return new Promise((resolve, reject) => {
      exec(`rm -rf apps/${folder}/node_modules/@qelos && \
mkdir apps/${folder}/node_modules/@qelos`, (err) => {
        if (err) {
          reject();
        }
        resolve();
      });
    })
      .then(() => {
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
          // First run npm pack
          exec(`cd apps/${folder} && npm pack`, { maxBuffer: 10 * 1024 * 1024 }, (err) => {
            if (err) {
              console.log(folder + ' npm pack failed');
              console.log(err.message);
              reject();
              return;
            }
            
            // Then run rename-pack.js
            exec(`cd apps/${folder} && node ../../tools/bundler/rename-pack.js`, { maxBuffer: 1024 * 1024 }, (err) => {
              console.log(folder + ' packing ' + (err ? 'failed' : 'succeeded'))
              if (err) {
                console.log(err.message);
                reject();
              }
              resolve();
            })
          })
        })
      })
  })
)
  .catch(() => {
    process.exit(1)
  })
