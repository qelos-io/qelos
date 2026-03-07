const { beforeEach, after } = require('node:test');
const { rmSync, mkdirSync } = require('node:fs');
const { execSync } = require('node:child_process');

function initTestSuite() {
  beforeEach(() => {
    try {
      rmSync("tmp", { recursive: true });
    } catch {
      //
    }
    try {
      mkdirSync("tmp");
    } catch {
      //
    }
    execSync("npm link");
  });

  after(() => {
    rmSync("tmp", { recursive: true });
  });
}

module.exports = {
  initTestSuite
}
