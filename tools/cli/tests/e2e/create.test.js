const { existsSync } = require("node:fs");
const { execSync } = require("node:child_process");
const { initTestSuite } = require('../utils/test-suite');

describe("Create command", () => {
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
