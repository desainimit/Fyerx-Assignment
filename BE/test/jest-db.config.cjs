const base = require('../jest.config.cjs');

module.exports = {
  ...base,
  rootDir: '..',
  testMatch: ['<rootDir>/test/**/*.db-spec.ts'],
  setupFiles: ['reflect-metadata'],
  testTimeout: 30000,
};
