/** @type {import('@stryker-mutator/core').StrykerOptions} */
const config = {
  packageManager: "pnpm",
  plugins: ["@stryker-mutator/jest-runner"],
  reporters: ["html", "clear-text", "progress"],
  testRunner: "jest",
  jest: {
    projectType: "custom",
    configFile: "./jest.config.js",
    enableFindRelatedTests: true,
  },
  coverageAnalysis: "all",
  mutate: [
    "packages/auth/institution-scope.ts",
    "src/lib/auth/saml-service.ts",
    "src/lib/streaming/room-manager.ts",
  ],
  concurrency: 2,
  timeoutFactor: 6,
  timeoutMS: 120000,
  thresholds: {
    high: 0,
    low: 0,
  },
  logLevel: "info",
};

export default config;
