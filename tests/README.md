# Test Infrastructure

This directory contains the test infrastructure for the AWS Favorites Quickbar extension.

## Structure

```
tests/
├── setup.js              # Global test configuration and custom matchers
├── helpers/
│   ├── mocks.js         # Chrome API and DOM mocks
│   ├── fixtures.js      # Sample data generators
│   └── dom-helpers.js   # DOM manipulation utilities
└── unit/                # Unit tests (to be created)
    └── integration/     # Integration tests (to be created)
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with verbose output
npm run test:verbose
```

## Custom Matchers

The test infrastructure provides custom Vitest matchers:

### `toBeValidServiceElement()`
Checks if an element is a valid service element with `data-service-id` attribute and an anchor tag.

```javascript
expect(element).toBeValidServiceElement();
```

### `toContainServiceWithId(serviceId)`
Checks if an array contains a service with the specified ID (case-insensitive).

```javascript
expect(services).toContainServiceWithId('s3');
```

### `toHaveNoDuplicateIds()`
Checks if an array of services has no duplicate IDs (case-insensitive).

```javascript
expect(services).toHaveNoDuplicateIds();
```

## Mocks

### Chrome API Mocks

```javascript
const { mockChromeStorage, mockChromeRuntime, setupChromeMocks } = require('./helpers/mocks');

// Setup all Chrome mocks
setupChromeMocks();

// Or create individual mocks
const storage = mockChromeStorage();
const runtime = mockChromeRuntime();
```

### DOM Mocks

```javascript
const { mockMutationObserver, mockImage } = require('./helpers/mocks');

global.MutationObserver = mockMutationObserver();
global.Image = mockImage();
```

### LocalStorage Mock

```javascript
const { mockLocalStorage } = require('./helpers/mocks');

global.localStorage = mockLocalStorage();
```

## Fixtures

### Creating Sample Services

```javascript
const { createSampleService, createSampleServices } = require('./helpers/fixtures');

// Create a single service
const service = createSampleService({ id: 'custom-id' });

// Create multiple services
const services = createSampleServices(5);
```

### Creating DOM Structures

```javascript
const { createQuickbarDOM, createRecentlyVisitedDOM, createAWSConsolePageDOM } = require('./helpers/fixtures');

// Create quickbar element
const quickbar = createQuickbarDOM();

// Create recently visited widget
const widget = createRecentlyVisitedDOM();

// Create complete AWS Console page
createAWSConsolePageDOM({
  includeQuickbar: true,
  includeRecentlyVisited: true,
  includeNativeFavorites: false
});
```

## DOM Helpers

### Setup and Teardown

```javascript
const { setupDOM, teardownDOM } = require('./helpers/dom-helpers');

beforeEach(() => {
  setupDOM('<div id="test">Hello</div>');
});

afterEach(() => {
  teardownDOM();
});
```

### Creating Elements

```javascript
const { createMockElement } = require('./helpers/dom-helpers');

const element = createMockElement('div', 
  { id: 'test', className: 'test-class' }, 
  ['Hello World']
);
```

### Simulating Events

```javascript
const { simulateClick, simulateDragDrop, simulateTyping } = require('./helpers/dom-helpers');

// Simulate click
simulateClick(button);

// Simulate drag and drop
simulateDragDrop(sourceElement, targetElement);

// Simulate typing
simulateTyping(input, 'test text');
```

### Waiting for Elements

```javascript
const { waitForElement, waitForCondition } = require('./helpers/dom-helpers');

// Wait for element to appear
const element = await waitForElement('#my-element', 1000);

// Wait for condition
await waitForCondition(() => element.textContent === 'Done', 1000);
```

## Coverage Thresholds

The project requires the following minimum coverage:

- Lines: 90%
- Branches: 85%
- Functions: 90%
- Statements: 90%

Coverage reports are generated in the `coverage/` directory.
