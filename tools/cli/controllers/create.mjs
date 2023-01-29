import follow from "follow-redirects";
import cliSelect from "cli-select";
import {blue} from "../utils/colors.mjs";
import DecompressZip from "decompress-zip";
import {join} from "path";
import rimraf from 'rimraf'
import ProgressBar from "../utils/progress-bar.mjs";
import * as readline from "readline";

const https = follow.https;

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, function (answer) {
      rl.close();
      resolve(answer);
    });
  })
}

export default async function createController({name}) {
  console.log(blue('Choose a boilerplate:'))
  const project = await cliSelect({
    values: {vanilla: 'Vanilla', react: 'React', vue: 'Vue', solid: 'Solid', custom: 'Custom from Github'},
  })
  let repository = project.id;
  let organization = 'qelos-boilerplates';

  if (repository === 'custom') {
    const [githubOrg, githubRepo] = (await askQuestion('Enter custom github project (org/repo)\n')).split('/');
    organization = githubOrg;
    repository = githubRepo;
  }

  const tempFolder = 'ql-plugin-' + Date.now();
  const file = fs.createWriteStream(tempFolder + '.zip')

  function extract(unzipper) {
    const progress = new ProgressBar(100);
    return new Promise((resolve) => {
      unzipper.on('extract', function (log) {
        resolve(log[0].folder)
        progress.stop();
      });

      unzipper.on('progress', function (fileIndex, fileCount) {
        progress.update(fileIndex / fileCount);
      });

      unzipper.extract({
        path: tempFolder
      });
    })
  }

  const request = https.get(`https://github.com/${organization}/${repository}/archive/refs/heads/main.zip`, (response) => {
    response.pipe(file);
    response.on('end', async () => {
      try {
        file.close();
        const unzipper = new DecompressZip(tempFolder + '.zip');
        const rootFolder = await extract(unzipper);

        fs.renameSync(join(tempFolder, rootFolder), name);

        console.log(`Created ${name} successfully.`)
      } catch (err) {
        console.log('Failed');
      } finally {
        await rimraf(tempFolder)
        fs.rmSync(tempFolder + '.zip');
      }
    })
  });
};
