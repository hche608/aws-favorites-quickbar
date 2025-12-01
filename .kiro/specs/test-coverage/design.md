# Test Coverage Design Document

## Overview

This design document outlines the comprehensive testing strategy for the AWS Favorites Quickbar browser extension. The testing approach includes unit tests for individual modules, integration tests for complete workflows, and test utilities to reduce boilerplate.

**Coverage Strategy**: The extension architecture separates concerns into two categories:

1. **Core Modules** (src/utils, src/services, src/quickbar): Reusable business logic that is unit tested with 90%+ statement coverage and 77-84% branch coverage targets
2. **Orchestration Files** (src/content.js, src/popup.js, src/popup/*): Entry point files that coordinate core modules and are validated through integration tests

This separation allows focused unit testing on business logic while ensuring end-to-end workflows are validated through integration tests.

**Note**: See `COVERAGE.md` in this directory for a detailed explanation of why some files show 0% coverage in reports but are fully tested through integration tests.

## Architecture

### Test Structure

```
tests/
├── unit/
│   ├── utils/
│   │   ├── dom.test.js
│   │   ├── storage.test.js
│   │   └── region.test.js
│   ├── services/
│   │   ├── icon-extractor.test.js
│   │   ├── icon-validator.test.js
│   │   ├── recently-visited-parser.test.js
│   │   └── service-merger.test.js
│   ├── quickbar/
│   │   ├── css-extractor.test.js
│   │   ├── dom-builder.test.js
│   │   └── injector.test.js
│   └── popup/
│       ├── storage.test.js
│       ├── search.test.js
│       ├── ui-state.test.js
│       ├── service-item.test.js
│       └── drag-drop.test.js
├── integration/
│   ├── content-script.test.js
│   └── popup-workflow.test.js
├── helpers/
│   ├── mocks.js
│   ├── fixtures.js
│   └── dom-helpers.js
└── setup.js
```

### Testing Framework

- **Test Runner**: Jest 29.x
- **DOM Simulation**: jsdom (via jest-environment-jsdom)
- **Property-Based Testing**: fast-check 3.x
- **Mocking**: Jest's built-in mocking capabilities
- **Coverage**: Jest's built-in coverage reporting

## Components and Interfaces

### Test Helpers Module

**Purpose**: Provide reusable mocks, fixtures, and utilities for tests

**Exports**:
```javascript
// mocks.js
export const mockChromeStorage
export const mockChromeRuntime
export const mockLocalStorage
export const mockMutationObserver
export const mockImage

// fixtures.js
export const sampleServices
export const sampleQuickbarDOM
export const sampleRecentlyVisitedDOM
export const sampleUserFavorites

// dom-helpers.js
export function setupDOM(html)
export function teardownDOM()
export function waitForMutation(callback)
export function createMockElement(tag, attributes, children)
```

### Unit Test Modules

Each unit test module follows this pattern:
```javascript
describe('ModuleName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('functionName', () => {
    it('should handle normal case', () => {
      // Test
    });

    it('should handle edge case', () => {
      // Test
    });

    it('should handle error case', () => {
      // Test
    });
  });
});
```

### Integration Test Modules

Integration tests validate complete workflows:
```javascript
describe('Content Script Integration', () => {
  it('should complete full injection workflow', async () => {
    // Setup DOM, storage, and mocks
    // Execute init()
    // Assert services are injected correctly
  });
});
```

## Data Models

### Test Service Object
```javascript
{
  id: string,           // e.g., 's3', 'ec2'
  name: string,         // e.g., 'S3', 'EC2'
  iconUrl: string,      // URL or data URI
  consoleUrl: string,   // Full AWS Console URL
  source: 'user' | 'recent'
}
```

### Mock Chrome Storage
```javascript
{
  sync: {
    get: jest.fn(),
    set: jest.fn()
  },
  local: {
    get: jest.fn(),
    set: jest.fn()
  }
}
```

### Mock DOM Structure
```javascript
{
  quickbar: HTMLElement,
  recentlyVisitedWidget: HTMLElement,
  nativeFavorites: HTMLElement[]
}
```

## Correctness Properties

Before writing correctness properties, let me analyze the acceptance criteria:


*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Icon URL validation consistency
*For any* string input, isValidIconUrl should return a boolean and never throw an exception, and should return true only for valid data URIs or loadable HTTPS URLs
**Validates: Requirements 2.2**

Property 2: Service merging deduplication
*For any* array of user favorites and array of recent services, mergeServices should return an array with no duplicate service IDs (case-insensitive)
**Validates: Requirements 2.4**

Property 3: Service merging order preservation
*For any* array of user favorites and array of recent services, mergeServices should return user favorites first, followed by non-duplicate recent services in their original order
**Validates: Requirements 2.4**

Property 4: DOM builder structure consistency
*For any* valid service object, createServiceLink should return an HTMLElement with a data-service-id attribute matching the service ID and containing an anchor tag with the service URL
**Validates: Requirements 3.2**

Property 5: Search filter correctness
*For any* search query and array of services, filterServices should return only services whose name or ID contains the query (case-insensitive)
**Validates: Requirements 4.2**

Property 6: Service item rendering completeness
*For any* service object, createServiceItem should return an HTMLElement containing the service name, icon, and a clickable element
**Validates: Requirements 4.4**

Property 7: User favorites ordering priority
*For any* set of user-pinned services and recent services, the merged result should have all user-pinned services appearing before any recent services
**Validates: Requirements 5.2**

Property 8: Duplicate service filtering
*For any* set of services containing duplicates (by ID, case-insensitive), the injection process should result in only one instance of each service in the quickbar
**Validates: Requirements 5.3**

Property 9: Service pinning toggle idempotence
*For any* service, clicking to pin then clicking to unpin should return the service to its original unpinned state
**Validates: Requirements 6.2**

Property 10: Drag-and-drop order persistence
*For any* reordering of services via drag-and-drop, the new order should be persisted to storage and match the visual order in the UI
**Validates: Requirements 6.4**

## Error Handling

### Test Error Handling

**Mock Failures**: Tests should handle mock setup failures gracefully and provide clear error messages

**Async Timeouts**: Async tests should have reasonable timeouts (5s default) and fail with descriptive messages

**DOM Cleanup**: Tests should clean up DOM modifications in afterEach to prevent test pollution

**Storage Cleanup**: Tests should clear mock storage between tests to ensure isolation

### Code Error Handling

**Missing Elements**: When DOM elements are not found, functions should return null or empty arrays rather than throwing

**Invalid Data**: When invalid data is provided, validation functions should return false rather than throwing

**Storage Errors**: When storage operations fail, functions should log warnings and use fallback values

**Network Errors**: When icon loading fails, functions should use default icons

## Testing Strategy

### Unit Testing Approach

**Isolation**: Each function is tested in isolation with mocked dependencies

**Coverage**: Aim for 90%+ code coverage with focus on critical paths

**Edge Cases**: Test boundary conditions, empty inputs, null values, and malformed data

**Error Cases**: Test error handling paths explicitly

### Property-Based Testing Approach

**Generators**: Use fast-check to generate random but valid test data

**Iterations**: Run each property test with at least 100 iterations

**Shrinking**: Leverage fast-check's shrinking to find minimal failing cases

**Properties**: Focus on invariants, idempotence, and consistency properties

### Integration Testing Approach

**End-to-End**: Test complete workflows from initialization to final DOM state

**Real Interactions**: Simulate user interactions like clicks, typing, and drag-and-drop

**State Verification**: Assert both DOM state and storage state after operations

**Error Scenarios**: Test workflows with various failure points

### Test Organization

**File Naming**: Use `.test.js` suffix for all test files

**Test Grouping**: Use `describe` blocks to group related tests

**Test Naming**: Use descriptive `it` statements that explain what is being tested

**Setup/Teardown**: Use `beforeEach`/`afterEach` for consistent test setup

### Mock Strategy

**Chrome APIs**: Mock chrome.storage and chrome.runtime with Jest mocks

**DOM APIs**: Use jsdom for DOM simulation, mock MutationObserver and Image

**LocalStorage**: Mock localStorage with in-memory implementation

**Time**: Mock setTimeout/setInterval when testing time-dependent code

### Coverage Goals

**Core Modules** (unit tested):
- src/utils/*: 90% statements, 83% branches, 90% functions
- src/services/*: 90% statements, 77% branches, 90% functions  
- src/quickbar/*: 90% statements, 84% branches, 90% functions

**Orchestration Files** (integration tested):
- src/content.js: Tested through content script integration tests
- src/popup.js: Tested through popup workflow integration tests
- src/popup/*: Tested through popup workflow integration tests

**Critical Paths**: 100% coverage for core injection and merging logic

**Error Paths**: Validated through error scenario integration tests

## Implementation Notes

### Test File Structure

Each test file should follow this structure:

```javascript
// Import module under test
// Import test helpers
// Import mocks

describe('ModuleName', () => {
  // Declare shared variables
  
  beforeEach(() => {
    // Setup mocks
    // Initialize test data
    // Setup DOM if needed
  });

  afterEach(() => {
    // Clear mocks
    // Cleanup DOM
    // Reset global state
  });

  describe('functionName', () => {
    it('should handle typical case', () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle edge case', () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle error case', () => {
      // Arrange
      // Act
      // Assert
    });
  });

  // Property-based tests
  describe('functionName properties', () => {
    it('should maintain invariant X', () => {
      fc.assert(
        fc.property(fc.array(serviceArbitrary), (services) => {
          // Test property
        })
      );
    });
  });
});
```

### Fast-Check Arbitraries

Define reusable arbitraries for common data types:

```javascript
// Service arbitrary
const serviceArbitrary = fc.record({
  id: fc.stringOf(fc.char(), { minLength: 2, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  iconUrl: fc.oneof(
    fc.webUrl(),
    fc.constant(null)
  ),
  consoleUrl: fc.webUrl(),
  source: fc.constantFrom('user', 'recent')
});

// URL arbitrary
const urlArbitrary = fc.oneof(
  fc.webUrl({ validSchemes: ['https'] }),
  fc.string().map(s => `data:image/svg+xml,${s}`),
  fc.string() // Invalid URLs
);
```

### Custom Matchers

Create custom Jest matchers for common assertions:

```javascript
expect.extend({
  toBeValidServiceElement(received) {
    const hasDataId = received.hasAttribute('data-service-id');
    const hasAnchor = received.querySelector('a') !== null;
    const pass = hasDataId && hasAnchor;
    
    return {
      pass,
      message: () => `Expected element to be a valid service element`
    };
  }
});
```

### Test Utilities

**DOM Helpers**:
- `setupDOM(html)`: Create DOM structure from HTML string
- `teardownDOM()`: Clean up DOM after test
- `waitForMutation(callback)`: Wait for DOM mutations
- `createMockElement(tag, attrs, children)`: Create mock DOM elements

**Mock Helpers**:
- `mockChromeStorage()`: Create chrome.storage mock
- `mockLocalStorage()`: Create localStorage mock
- `mockMutationObserver()`: Create MutationObserver mock
- `mockImage()`: Create Image mock for icon loading tests

**Fixture Helpers**:
- `createSampleService(overrides)`: Create sample service object
- `createSampleServices(count)`: Create array of sample services
- `createQuickbarDOM()`: Create mock quickbar DOM structure
- `createRecentlyVisitedDOM()`: Create mock recently visited widget

### Running Tests

**All Tests**: `npm test`

**Watch Mode**: `npm run test:watch`

**Coverage**: `npm test -- --coverage`

**Specific File**: `npm test -- path/to/file.test.js`

**Verbose**: `npm test -- --verbose`

### CI/CD Integration

Tests should be run in CI/CD pipeline:
- Run on every pull request
- Fail build if coverage drops below 90%
- Generate and publish coverage reports
- Run in parallel for faster feedback

## Dependencies

### Required Packages

- **jest**: ^29.7.0 - Test runner and assertion library
- **jest-environment-jsdom**: ^29.7.0 - DOM simulation environment
- **@types/jest**: ^29.5.11 - TypeScript definitions for Jest
- **fast-check**: ^3.15.0 - Property-based testing library
- **canvas**: ^2.11.2 - Required for jsdom image loading

### Configuration

**jest.config.js**:
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      lines: 90,
      branches: 85,
      functions: 90,
      statements: 90
    }
  }
};
```

**package.json scripts**:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:verbose": "jest --verbose"
  }
}
```
