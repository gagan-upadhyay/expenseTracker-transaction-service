export default {
  testEnvironment: "node",
  transform: {},
  setupFilesAfterEnv: ["./jest.setup.js"],
  globalTeardown: "./jest.teardown.js",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"  // Fix ESM imports
  }
};