const { existsSync } = require("node:fs");
const { execSync } = require("node:child_process");
const { initTestSuite } = require('../utils/test-suite');

// E2E tests require: global `qelos` CLI (npm link) + GitHub network access.
// Run manually in environments with full setup; skipped in CI/unit test runs.
const describeE2E = process.env.RUN_E2E ? describe : describe.skip;

describeE2E("Create command", () => {
  initTestSuite();

  it("should create an app", () => {
    execSync("qelos create vue my-app", { cwd: "./tmp" });
    expect(existsSync("tmp/my-app")).toBeTruthy();
  });

  it("should install app dependencies", () => {
    execSync("qelos create vue my-app", { cwd: "./tmp" });
    expect(
      existsSync("./tmp/my-app/node_modules")
    ).toBeTruthy();
  });

});
