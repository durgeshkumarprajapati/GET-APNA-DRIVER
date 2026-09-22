const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  // tests/integration exercises the real Prisma client against a real
  // PostgreSQL database — it has its own config (jest.integration.config.js,
  // run via `npm run test:integration`) and must never run as part of the
  // default unit suite, which mocks Prisma and needs no database.
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/tests/integration/'],
};

module.exports = createJestConfig(customJestConfig);
