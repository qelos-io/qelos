import follow from "follow-redirects";
import cliSelect from "cli-select";
import { blue } from "../utils/colors.mjs";
import DecompressZip from "decompress-zip";
import { join } from "node:path";
import { rimraf } from "rimraf";
import ProgressBar from "../utils/progress-bar.mjs";
import * as readline from "node:readline";
import { execSync } from "node:child_process";

const https = follow.https;

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, function (answer) {
      rl.close();
      resolve(answer);
    });
  });
}

async function getOrgReposNames(organization) {
  const res = await fetch(`https://api.github.com/users/${organization}/repos`);
  const repos = await res.json();

  if (repos && repos instanceof Array) {
    return repos.reduce((result, repo) => {
      result[repo.name] = repo.description || repo.name;
      return result;
    }, {});
  }
  return [];
}

export default async function createController({ name, boilerplate }) {
  if (!name && boilerplate) {
    name = boilerplate;
    boilerplate = undefined;
  }
  let organization = "qelos-boilerplates";
  let repository = "vanilla";
  if (boilerplate) {
    if (boilerplate.includes("/")) {
      [organization, repository] = boilerplate.split("/");
    } else {
      repository = boilerplate;
    }
  } else {
    console.log(blue("Choose a boilerplate:"));
    try {
      const project = await cliSelect({
        values: {
          vanilla: "Vanilla",
          vue: "Vue",
          crud: "CRUD",
          "ui-lib": "Components Library",
          more: "Show more",
          custom: "Custom from Github",
        },
      });
      repository = project.id;

      if (repository === "more") {
        const selected = await cliSelect({
          values: await getOrgReposNames(organization),
        });
        repository = selected.id;
      } else if (repository === "custom") {
        const [githubOrg, githubRepo] = (
          await askQuestion("Enter custom github project (org/repo)\n")
        ).split("/");
        organization = githubOrg || organization;
        repository = githubRepo;
      }
    } catch {
      console.log("See you soon :)");
      process.exit(0);
    }
  }

  const tempFolder = "ql-plugin-" + Date.now();
  const file = fs.createWriteStream(tempFolder + ".zip");

  function extract(unzipper) {
    const progress = new ProgressBar(100);
    return new Promise((resolve) => {
      unzipper.on("extract", function (log) {
        resolve(log[0].folder);
        progress.stop();
      });

      unzipper.on("progress", function (fileIndex, fileCount) {
        progress.update(fileIndex / fileCount);
      });

      unzipper.extract({
        path: tempFolder,
      });
    });
  }

  const request = https.get(
    `https://github.com/${organization}/${repository}/archive/refs/heads/main.zip`,
    (response) => {
      response.pipe(file);
      response.on("end", async () => {
        try {
          file.close();
          const unzipper = new DecompressZip(tempFolder + ".zip");
          const rootFolder = await extract(unzipper);

          fs.renameSync(join(tempFolder, rootFolder), name);

          execSync(`npm pkg set name=${name}`, { cwd: name });

          console.log("Installing dependencies...");

          execSync(`npm install`, { cwd: name, stdio: 'pipe' });

          console.log(`\nCreated ${name} successfully.`);
        } catch (err) {
          console.log("Failed");
        } finally {
          await rimraf(tempFolder);
          fs.rmSync(tempFolder + ".zip");
        }
      });
    }
  );
}
