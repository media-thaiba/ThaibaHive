const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

const customJestConfig = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@thaiba/auth/(.*)$": "<rootDir>/packages/auth/$1",
    "^@thaiba/auth$": "<rootDir>/packages/auth/index.ts",
    "^@thaiba/db/(.*)$": "<rootDir>/packages/db/$1",
    "^@thaiba/db$": "<rootDir>/packages/db/index.ts",
  },
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/e2e/"],
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  maxWorkers: 1,
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
};

module.exports = async () => {
  const config = await createJestConfig(customJestConfig)();
  config.transformIgnorePatterns = [
    "/node_modules/(?!(jose|@thaiba\\/auth)/)",
  ];
  return config;
};
