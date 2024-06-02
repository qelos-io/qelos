// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  clearMocks: true,
  preset: 'ts-jest',
  coverageDirectory: "coverage",
  testEnvironment: "node",
  testMatch: [
    "**/__tests__/**/*.js?(x)",
    "**/?(*.)+(spec|test).[j|t]s?(x)"
  ],
};
