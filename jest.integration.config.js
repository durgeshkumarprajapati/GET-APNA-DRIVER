const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

// Separate config for tests/integration — these exercise the real Prisma
// client against a real PostgreSQL database (no `jest.mock('@/shared/
// database/prisma', ...)`), unlike everything under tests/unit. Run this
// against a real, migrated database: see .github/workflows/ci.yml for the
// CI setup, or locally with `DATABASE_URL=postgresql://... npx prisma
// migrate deploy && npm run test:integration`.
/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/tests/integration/**/*.spec.ts'],
  testTimeout: 30000,
};

module.exports = createJestConfig(customJestConfig);
