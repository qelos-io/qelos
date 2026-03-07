const { describe, it } = require('node:test');
const assert = require('node:assert');
const { existsSync } = require("fs");
const { execSync } = require("child_process");
const { initTestSuite } = require('../utils/test-suite');

// E2E tests require: global `qelos` CLI (npm link) + network access.
// Run manually in environments with full setup; skipped in CI/unit test runs.
const describeE2E = process.env.RUN_E2E ? describe : describe.skip;

describeE2E("Create command", () => {
  initTestSuite();

  it("should create an app", () => {
    execSync("qelos create my-app", { cwd: "./tmp" });
    assert.ok(existsSync("tmp/my-app"));
  });

  it("should install app dependencies", () => {
    execSync("qelos create my-app", { cwd: "./tmp" });
    assert.ok(existsSync("tmp/my-app/node_modules"));
  });

});
