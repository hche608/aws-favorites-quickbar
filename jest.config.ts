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
  // Note: Entry point files (content.ts, popup.ts, settings.ts) are orchestration code
  // tested through integration tests, so global thresholds are set accordingly
  coverageThreshold: {
    global: {
      lines: 65,
      branches: 60,
      functions: 68,
      statements: 65
    },
    // Utils modules
    './src/utils/*.ts': {
      lines: 88,
      branches: 76,
      functions: 80,
      statements: 89
    },
    // Services modules
    './src/services/*.ts': {
      lines: 84,
      branches: 65,
      functions: 90,
      statements: 83
    },
    // Quickbar modules
    './src/quickbar/*.ts': {
      lines: 90,
      branches: 78,
      functions: 100,
      statements: 90
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
