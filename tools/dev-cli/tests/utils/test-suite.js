const { beforeEach, after } = require('node:test');
const { rmdirSync, mkdirSync } = require('fs');
const { execSync } = require('child_process');

function initTestSuite() {
  beforeEach(() => {
    try {
      rmdirSync("tmp", { recursive: true });
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
    rmdirSync("tmp", { recursive: true });
  });
}

module.exports = {
  initTestSuite
}
