const { existsSync } = require("fs");
const { execSync } = require("child_process");
const { initTestSuite } = require('../utils/test-suite');

describe("Create command", () => {
  initTestSuite();

  it("should create an app", () => {
    execSync("qelos create my-app", { cwd: "./tmp" });
    expect(existsSync("tmp/my-app")).toBeTruthy();
  });

  it("should install app dependencies", () => {
    execSync("qelos create my-app", { cwd: "./tmp" });
    expect(
      existsSync("tmp/my-app/node_modules", { cwd: "./tmp" })
    ).toBeTruthy();
  });

});
