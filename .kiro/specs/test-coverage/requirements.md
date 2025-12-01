# Requirements Document

## Introduction

This document outlines the requirements for implementing comprehensive test coverage for the AWS Favorites Quickbar browser extension. The goal is to ensure all code paths are tested with both unit tests and integration tests to maintain code quality and prevent regressions.

**Coverage Strategy**: The extension has two types of code:
1. **Core modules** (utils, services, quickbar): Business logic tested with unit tests targeting 90%+ coverage
2. **Orchestration files** (content.js, popup.js, popup/*): Entry points that coordinate modules, tested through integration tests

## Glossary

- **Extension**: The AWS Favorites Quickbar browser extension
- **Content Script**: JavaScript code injected into AWS Console pages
- **Popup**: The browser extension popup interface for managing favorites
- **Service**: An AWS service representation with id, name, iconUrl, and consoleUrl
- **Quickbar**: The AWS Console favorites bar where services are injected
- **Test Suite**: Collection of automated tests
- **Unit Test**: Test that validates a single function or component in isolation
- **Integration Test**: Test that validates multiple components working together
- **Mock**: Simulated object or function used in testing
- **Test Coverage**: Percentage of code executed by tests
- **Core Modules**: Reusable business logic modules (utils, services, quickbar) that are unit tested
- **Orchestration Files**: Entry point files (content.js, popup.js, popup modules) that coordinate core modules and are tested through integration tests

## Requirements

### Requirement 1

**User Story:** As a developer, I want comprehensive unit tests for all utility functions, so that I can ensure core functionality works correctly in isolation.

#### Acceptance Criteria

1. WHEN testing DOM utility functions THEN the system SHALL validate waitForDOMReady, waitForElement, isAWSConsolePage, and isAWSConsoleHomepage functions
2. WHEN testing storage utility functions THEN the system SHALL validate saveServicesToStorage, loadServicesFromStorage, and loadUserFavorites functions
3. WHEN testing region detection THEN the system SHALL validate detectRegion function with URL parameters and localStorage
4. WHEN tests execute THEN the system SHALL use appropriate mocks for browser APIs (chrome.storage, localStorage, DOM)
5. WHEN all utility tests pass THEN the system SHALL achieve at least 90% statement coverage and 83% branch coverage for utility modules

### Requirement 2

**User Story:** As a developer, I want comprehensive unit tests for all service modules, so that I can ensure service parsing and validation works correctly.

#### Acceptance Criteria

1. WHEN testing icon extraction THEN the system SHALL validate extractIconUrlsFromConsole with various DOM structures
2. WHEN testing icon validation THEN the system SHALL validate isValidIconUrl with valid URLs, invalid URLs, data URLs, and malformed inputs
3. WHEN testing recently visited parsing THEN the system SHALL validate waitForRecentlyVisitedWidget and parseRecentlyVisited with different widget states
4. WHEN testing service merging THEN the system SHALL validate mergeServices correctly deduplicates and orders services
5. WHEN all service tests pass THEN the system SHALL achieve at least 90% statement coverage and 77% branch coverage for service modules

### Requirement 3

**User Story:** As a developer, I want comprehensive unit tests for quickbar components, so that I can ensure DOM manipulation and injection works correctly.

#### Acceptance Criteria

1. WHEN testing CSS extraction THEN the system SHALL validate extractAWSFavoriteClasses and waitForNativeFavorites with various quickbar states
2. WHEN testing DOM building THEN the system SHALL validate createServiceLink creates correct HTML structure with proper classes and attributes
3. WHEN testing service injection THEN the system SHALL validate injectServices handles duplicate filtering and CSS class application
4. WHEN testing error cases THEN the system SHALL validate graceful handling of missing quickbar elements
5. WHEN all quickbar tests pass THEN the system SHALL achieve at least 90% statement coverage and 84% branch coverage for quickbar modules

### Requirement 4

**User Story:** As a developer, I want comprehensive unit tests for popup components, so that I can ensure the popup UI works correctly.

#### Acceptance Criteria

1. WHEN testing storage operations THEN the system SHALL validate loadFavorites, saveFavorites, loadMaxServices, and saveMaxServices functions
2. WHEN testing search functionality THEN the system SHALL validate filterServices with various search queries
3. WHEN testing UI state management THEN the system SHALL validate showEmptyState, showErrorState, and showServiceList functions
4. WHEN testing service item rendering THEN the system SHALL validate createServiceItem creates correct HTML with event handlers
5. WHEN testing drag-and-drop THEN the system SHALL validate setupDragAndDrop, handleDragStart, handleDragOver, and handleDrop functions

### Requirement 5

**User Story:** As a developer, I want integration tests for the content script, so that I can ensure the complete injection workflow works end-to-end.

#### Acceptance Criteria

1. WHEN testing the complete injection flow THEN the system SHALL validate services are loaded, parsed, merged, and injected correctly
2. WHEN testing with user favorites THEN the system SHALL validate user-pinned services appear before recent services
3. WHEN testing with native AWS favorites THEN the system SHALL validate duplicate services are filtered out
4. WHEN testing background icon updates THEN the system SHALL validate icons are updated without disrupting the quickbar
5. WHEN testing error scenarios THEN the system SHALL validate graceful degradation when components fail

### Requirement 6

**User Story:** As a developer, I want integration tests for the popup, so that I can ensure the complete popup workflow works end-to-end.

#### Acceptance Criteria

1. WHEN testing popup initialization THEN the system SHALL validate services load and render correctly
2. WHEN testing service pinning THEN the system SHALL validate clicking a service toggles its pinned state and updates storage
3. WHEN testing search interaction THEN the system SHALL validate typing filters the service list in real-time
4. WHEN testing drag-and-drop interaction THEN the system SHALL validate reordering services updates storage correctly
5. WHEN testing max services setting THEN the system SHALL validate changing the value updates storage and triggers quickbar refresh

### Requirement 7

**User Story:** As a developer, I want a test infrastructure with proper tooling, so that I can run tests easily and get clear feedback.

#### Acceptance Criteria

1. WHEN setting up the test framework THEN the system SHALL use Jest as the test runner with jsdom for DOM simulation
2. WHEN running tests THEN the system SHALL provide clear output with pass/fail status and coverage reports
3. WHEN tests fail THEN the system SHALL provide detailed error messages with stack traces
4. WHEN generating coverage reports THEN the system SHALL output HTML and text reports showing line, branch, and function coverage
5. WHEN integrating with development workflow THEN the system SHALL provide npm scripts for running tests and generating coverage

### Requirement 8

**User Story:** As a developer, I want test utilities and helpers, so that I can write tests more efficiently with less boilerplate.

#### Acceptance Criteria

1. WHEN creating test mocks THEN the system SHALL provide mock implementations for chrome.storage, chrome.runtime, and localStorage
2. WHEN creating test fixtures THEN the system SHALL provide sample service data, DOM structures, and configuration objects
3. WHEN setting up test environments THEN the system SHALL provide helper functions for DOM setup and teardown
4. WHEN asserting DOM state THEN the system SHALL provide custom matchers for common assertions
5. WHEN tests use helpers THEN the system SHALL reduce test code duplication by at least 50%
