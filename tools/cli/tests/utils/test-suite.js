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

  afterAll(() => {
    rmSync("tmp", { recursive: true });
  });
}

module.exports = {
  initTestSuite
}
