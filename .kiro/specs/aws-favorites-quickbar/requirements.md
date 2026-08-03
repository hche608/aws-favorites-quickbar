# Requirements Document

## Introduction

This document specifies the requirements for the AWS Favorites Quickbar browser extension. The extension solves the problem of AWS favorites being per-account — users must manually re-configure their favorites bar every time they switch AWS accounts. This extension stores favorites in the browser, making them available across all AWS accounts seamlessly.

The extension supports Chrome, Firefox, and future Safari through a cross-browser abstraction layer.

## Glossary

- **Extension**: A browser add-on that extends browser functionality
- **Content Script**: JavaScript code injected into web pages by the extension
- **Popup**: The browser extension popup interface for managing favorites
- **Service**: An AWS service representation with id, name, iconUrl, and consoleUrl
- **Quickbar**: The AWS Console favorites bar where services are injected
- **Pinned Service**: A service the user has explicitly marked as a favorite via the extension
- **Recently Visited**: Services parsed from the AWS Console's "Recently Visited" widget
- **Visual Mode**: Light or dark theme setting that overrides per-account AWS Console theme
- **Browser API**: The standardized WebExtensions API used by modern browsers
- **Manifest**: The JSON configuration file that defines extension metadata and permissions
- **CSS Template**: CSS classes extracted from the first native pinned service, used to style injected items

## Requirements

### Requirement 1: Cross-Account Favorites Persistence

**User Story:** As a user working with multiple AWS accounts, I want my pinned favorite services to appear in the quickbar across all accounts, so that I don't have to re-configure favorites every time I switch accounts.

#### Acceptance Criteria

1. WHEN the user pins a service in any AWS account THEN the extension SHALL store that preference in browser-local storage (not per-account)
2. WHEN the user switches to a different AWS account THEN the extension SHALL display the same pinned favorites from browser storage
3. WHEN the user opens AWS Console in any account THEN the extension SHALL inject stored pinned services into the quickbar
4. WHEN favorites are stored THEN the extension SHALL preserve the user-defined ordering
5. WHEN no network is available THEN the extension SHALL still display pinned favorites from local storage (no external dependencies)

### Requirement 2: Recently Visited Service Injection

**User Story:** As a user, I want recently visited AWS services to automatically appear in my quickbar, so that I have quick access to services I've used recently without manually pinning them.

#### Acceptance Criteria

1. WHEN the user visits an AWS Console page THEN the extension SHALL parse the "Recently Visited" widget from the page DOM
2. WHEN recently visited services are found THEN the extension SHALL merge them with pinned favorites (pinned first, then recently visited)
3. WHEN a recently visited service is already pinned THEN the extension SHALL show it only once (in the pinned section)
4. WHEN the page loads THEN the extension SHALL always parse recently visited services regardless of whether stored data exists

### Requirement 3: Merge Logic

**User Story:** As a user, I want my pinned services to always appear first in the quickbar, followed by recently visited services, so that my most important services are always accessible.

#### Acceptance Criteria

1. WHEN the quickbar is rendered THEN the extension SHALL display pinned services first in user-defined order
2. WHEN recently visited services are merged THEN the extension SHALL append them after pinned services with duplicates removed
3. WHEN the total merged list exceeds maxServices THEN the extension SHALL cap the displayed list at maxServices (pinned services take priority)
4. WHEN the user has more pinned services than maxServices THEN the extension SHALL show pinned services first up to the cap (some may be hidden)

### Requirement 4: Max Services Configuration

**User Story:** As a user, I want to control how many services appear in my quickbar, so that I can balance between quick access and visual clutter.

#### Acceptance Criteria

1. WHEN the extension is first installed THEN the system SHALL use a default maxServices value of 10
2. WHEN the user changes maxServices via the popup THEN the system SHALL store the new value and use it on subsequent loads
3. WHEN stored maxServices exists THEN the system SHALL use the stored value and never override it with the default
4. WHEN maxServices is applied THEN the system SHALL cap the total merged output (pinned + recently visited combined)
5. WHEN the user sets maxServices THEN the system SHALL accept values between 1 and 50

### Requirement 5: Visual Mode (Light / Dark)

**User Story:** As a user, I want to set a consistent light or dark theme for my quickbar across all AWS accounts, so that the appearance is uniform regardless of per-account AWS Console theme settings.

#### Acceptance Criteria

1. WHEN the extension is first installed THEN the system SHALL use a default visualMode of "light"
2. WHEN the user changes visualMode via the popup THEN the system SHALL store the new value and apply it on all subsequent page loads
3. WHEN stored visualMode exists THEN the system SHALL use the stored value and never override it with the default
4. WHEN visualMode is applied THEN the extension SHALL wait for `[data-testid="visualModeRadioGroup"]` to appear in the DOM
5. WHEN the radio group is found THEN the extension SHALL click the matching radio input (`input[type="radio"][value="light|dark"]`) to trigger AWS Console's native theme change
6. WHEN the user sets visualMode to "dark" THEN all AWS accounts SHALL render in dark mode regardless of per-account settings
7. WHEN the user sets visualMode to "light" THEN all AWS accounts SHALL render in light mode regardless of per-account settings
8. WHEN the radio is already in the correct state THEN the extension SHALL not dispatch any click events

### Requirement 6: CSS Template Extraction

**User Story:** As a user, I want injected quickbar items to look identical to native AWS favorites, so that the experience is seamless and visually consistent.

#### Acceptance Criteria

1. WHEN the AWS Console page loads THEN the extension SHALL find the first native pinned service in the favorites bar
2. WHEN a native pinned service is found THEN the extension SHALL extract its CSS classes (li, anchor, icon, label) as a template
3. WHEN injecting services THEN the extension SHALL apply the extracted CSS template to all injected items
4. WHEN no native pinned service exists THEN the extension SHALL not inject services (the user must pin at least one service manually)
5. WHEN AWS Console changes its CSS class names THEN the extension SHALL automatically pick up the new classes through dynamic extraction (no hardcoded class names)
6. WHEN injection succeeds THEN the content script SHALL write `injectionStatus: 'success'` to browser.storage.local
7. WHEN injection fails due to missing native pin THEN the content script SHALL write `injectionStatus: 'no-native-pin'` to browser.storage.local

### Requirement 6a: Injection Status in Popup

**User Story:** As a user, I want to see a helpful message in the popup when injection cannot work, so that I know what to do to fix it.

#### Acceptance Criteria

1. WHEN the popup opens and `injectionStatus` is `'no-native-pin'` or missing THEN the popup SHALL show a note: "You must pin at least one service manually in the AWS Console for the quickbar injection to work."
2. WHEN the popup opens and `injectionStatus` is `'success'` THEN the popup SHALL hide the note
3. WHEN the note is shown THEN it SHALL appear below the search bar in a visible info banner style

### Requirement 7: Storage Initialization

**User Story:** As a user, I want the extension to handle first launch and subsequent launches correctly, so that my settings are never lost and defaults are applied only when appropriate.

#### Acceptance Criteria

1. WHEN storage is empty (first launch) THEN the system SHALL initialize with default values: userFavorites=[], maxServices=10, visualMode="light"
2. WHEN storage has existing data (not first launch) THEN the system SHALL load and use stored values without modification
3. WHEN defaults are applied THEN the system SHALL write them to storage so subsequent loads have a baseline
4. WHEN stored data exists THEN the system SHALL never override it with default values
5. WHEN checking storage state THEN the system SHALL use explicit conditional paths (first launch vs returning user), not fallback patterns

### Requirement 8: Cross-Browser API Support

**User Story:** As a developer, I want a single codebase that works across Chrome, Firefox, and future Safari, so that I maintain one set of core logic with minimal browser-specific code.

#### Acceptance Criteria

1. WHEN the extension references browser APIs THEN it SHALL program against a BrowserAPI interface, not directly against chrome.* or browser.* namespaces
2. WHEN running on Chrome THEN the Chrome adapter SHALL wrap callback-based APIs into Promises matching the interface
3. WHEN running on Firefox THEN the Firefox adapter SHALL pass through native Promise-based browser.* APIs
4. WHEN a new browser is supported THEN adding support SHALL require only a new adapter implementation (~50 lines) with zero changes to core logic
5. WHEN building for different browsers THEN the build system SHALL use the appropriate manifest file for each target browser
6. WHEN testing THEN tests SHALL mock the BrowserAPI interface, not browser-specific globals

### Requirement 9: Build Pipeline

**User Story:** As a developer, I want to build and package the extension for multiple browsers, so that I can distribute it through Chrome Web Store and Firefox Add-ons.

#### Acceptance Criteria

1. WHEN building the extension THEN the system SHALL compile TypeScript to JavaScript before packaging
2. WHEN building for Chrome THEN the system SHALL produce a dist/chrome directory with Chrome manifest
3. WHEN building for Firefox THEN the system SHALL produce a dist/firefox directory with Firefox-specific manifest fields merged
4. WHEN the build completes THEN the system SHALL include compiled JavaScript, HTML, CSS, manifest, and source maps in the output
5. WHEN build automation is needed THEN the system SHALL use bash scripts and Makefiles
6. WHEN adding a new browser target THEN the system SHALL require only a new build script and manifest config

### Requirement 10: Test Coverage

**User Story:** As a developer, I want comprehensive tests that verify correctness across scenarios, so that changes don't break existing functionality.

#### Acceptance Criteria

1. WHEN unit tests run THEN the system SHALL test each module in isolation with mocked dependencies
2. WHEN integration tests run THEN the system SHALL verify end-to-end flows: storage → parse → merge → inject
3. WHEN testing storage initialization THEN the system SHALL test both "first launch" and "returning user" paths explicitly
4. WHEN testing merge logic THEN the system SHALL verify pinned-first ordering, deduplication, and maxServices capping
5. WHEN testing cross-browser compatibility THEN the system SHALL simulate both Chrome and Firefox API environments
6. WHEN running test coverage THEN the system SHALL achieve comprehensive coverage on core modules

### Requirement 11: Popup Management UI

**User Story:** As a user, I want a popup interface to manage my favorites and settings, so that I can pin/unpin services, reorder them, and configure preferences.

#### Acceptance Criteria

1. WHEN the user opens the popup THEN the system SHALL display pinned services in their current order
2. WHEN the user searches THEN the system SHALL filter available services by name
3. WHEN the user pins a service THEN the system SHALL add it to pinned favorites and save to storage
4. WHEN the user unpins a service THEN the system SHALL remove it from pinned favorites and save to storage
5. WHEN the user drags to reorder THEN the system SHALL persist the new order to storage
6. WHEN the user changes maxServices THEN the system SHALL save the new value to storage immediately
7. WHEN the user changes visualMode THEN the system SHALL save the new value to storage immediately

### Requirement 12: Firefox Manifest

**User Story:** As a developer, I want the manifest to be compatible with Firefox requirements, so that the extension can be submitted to Firefox Add-ons store.

#### Acceptance Criteria

1. WHEN the manifest is parsed by Firefox THEN the extension SHALL include browser_specific_settings with gecko ID
2. WHEN permissions are declared THEN the extension SHALL use permission names compatible with both browsers
3. WHEN content scripts are declared THEN the extension SHALL use paths compatible with Firefox's security model
4. WHEN the manifest specifies the browser action THEN the extension SHALL use terminology compatible with Firefox

### Requirement 13: Security

**User Story:** As a user, I want the extension to be secure and private, so that my data stays local and no external services are contacted.

#### Acceptance Criteria

1. WHEN the extension operates THEN it SHALL never send data to any external server
2. WHEN validating URLs THEN the extension SHALL only allow https:// URLs from known AWS domains (*.amazonaws.com, *.aws.amazon.com)
3. WHEN reading data from storage THEN the extension SHALL validate data structure before use
4. WHEN injecting DOM elements THEN the extension SHALL only inject into pages matching declared URL patterns
5. WHEN handling user data THEN the extension SHALL not require any AWS permissions or API keys

### Requirement 14: Code Quality

**User Story:** As a developer, I want code that follows KISS principles with high readability, maintainability, and testability, so that the codebase is sustainable and easy to contribute to.

#### Acceptance Criteria

1. WHEN writing functions THEN the system SHALL keep each function focused on a single responsibility
2. WHEN organizing code THEN the system SHALL maintain modular directory structure with clear separation of concerns
3. WHEN creating files THEN the system SHALL keep individual files under 300 lines
4. WHEN naming variables and functions THEN the system SHALL use clear, descriptive names that explain what they hold or do
5. WHEN handling multiple conditions THEN the system SHALL use explicit conditional paths — never fallback patterns (no `|| default`, no silent try/catch returning defaults)
6. WHEN an operation fails THEN the system SHALL surface the error — not silently return a safe value
7. WHEN dependencies are needed THEN the system SHALL pass them as parameters (injectable) rather than importing globals
8. WHEN implementing logic THEN the system SHALL prefer pure functions with no side effects, pushing side effects to thin wrappers at the edges
9. WHEN writing TypeScript THEN the system SHALL include JSDoc comments for all public APIs
10. WHEN optimizing THEN the system SHALL avoid premature optimization but address known bottlenecks
