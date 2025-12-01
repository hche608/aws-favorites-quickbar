/**
 * Jest configuration for AWS Favorites Quickbar extension
 */

import type { Config } from 'jest';

const config: Config = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Use jsdom environment for DOM testing
  testEnvironment: 'jsdom',

  // Setup files to run after Jest is initialized
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Test file patterns
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],

  // Coverage collection patterns - only TypeScript source files
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],

  // Coverage thresholds - fail if coverage drops below these values
  // Note: Entry point files (content.ts, popup.ts) are orchestration code
  // tested through integration tests, so we focus thresholds on core modules
  coverageThreshold: {
    global: {
      lines: 68, // Actual: 69.13%
      branches: 75, // Actual: 75.47%
      functions: 70, // Actual: 70.24%
      statements: 68 // Actual: 68.86%
    },
    // Utils modules - high coverage (dom.ts has some edge cases)
    './src/utils/*.ts': {
      lines: 93, // Actual: 96.87%
      branches: 77, // Actual: 87.5%
      functions: 100, // Actual: 100%
      statements: 94 // Actual: 97.05% (dom.ts: 94.11%)
    },
    // Services modules - high coverage with realistic thresholds
    // recently-visited-parser.ts has lower coverage due to complex DOM parsing
    './src/services/*.ts': {
      lines: 87, // Actual: 91.71%
      branches: 65, // Actual: 79.1%
      functions: 90, // Actual: 94.73%
      statements: 83 // Actual: 89.34%
    },
    // Quickbar modules - high coverage
    './src/quickbar/*.ts': {
      lines: 90, // Actual: 100%
      branches: 90, // Actual: 97.22%
      functions: 100, // Actual: 100%
      statements: 90 // Actual: 100%
    }
  },

  // Coverage reporters
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Transform files with ts-jest
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
        useESM: false
      }
    ],
    '^.+\\.jsx?$': 'babel-jest'
  },

  // Module name mapper for TypeScript paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Extensions to resolve
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // Coverage directory
  coverageDirectory: 'coverage',

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Reset mocks between tests
  resetMocks: true
};

export default config;
