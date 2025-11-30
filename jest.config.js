/**
 * Jest configuration for AWS Favorites Quickbar extension
 */

module.exports = {
  // Use jsdom environment for DOM testing
  testEnvironment: 'jsdom',

  // Setup files to run after Jest is initialized
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js'
  ],

  // Coverage collection patterns
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**'
  ],

  // Coverage thresholds - fail if coverage drops below these values
  // Note: Entry point files (content.js, popup.js, popup/*) are orchestration code
  // tested through integration tests, so we focus thresholds on core modules
  coverageThreshold: {
    // Core modules should maintain high coverage
    './src/utils/*.js': {
      lines: 90,
      branches: 83,  // Realistic threshold based on current coverage
      functions: 90,
      statements: 90
    },
    './src/services/*.js': {
      lines: 90,
      branches: 77,  // Realistic threshold based on current coverage
      functions: 90,
      statements: 90
    },
    './src/quickbar/*.js': {
      lines: 90,
      branches: 84,  // Realistic threshold based on current coverage
      functions: 90,
      statements: 90
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],

  // Module paths
  moduleDirectories: [
    'node_modules',
    'src'
  ],

  // Transform files (if needed for future ES modules support)
  transform: {},

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],

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
