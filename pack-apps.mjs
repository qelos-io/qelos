import {readdirSync} from "fs";
import {exec} from "child_process";


await Promise.all(
  readdirSync('./apps').map(folder => {
    if (folder === 'db') {
      return;
    }
    return new Promise((resolve, reject) => {
      exec(`node tools/bundle-dependencies-polyfix ${folder} && \
npm run pack-package --- --scope=@qelos/${folder} && \
npm run rename-pack --- --scope=@qelos/${folder}`, (err) => {
        console.log(folder + ' packing ' + (err ? 'failed' : 'succeeded'))
        if (err) {
          reject();
        }
        resolve();
      })
    })
  }))
  .catch(() => {
    process.exit(1)
  })
