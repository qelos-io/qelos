import { readdirSync } from "fs";
import { exec } from "child_process";
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
          exec(`npm run pack-package --- --scope=@qelos/${folder} && \
npm run rename-pack --- --scope=@qelos/${folder}`, (err) => {
            console.log(folder + ' packing ' + (err ? 'failed' : 'succeeded'))
            if (err) {
              reject();
            }
            resolve();
          })
        })
      })
  }))
  .catch(() => {
    process.exit(1)
  })
