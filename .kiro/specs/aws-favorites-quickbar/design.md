# Design Document: AWS Favorites Quickbar

## Overview

This design document outlines the AWS Favorites Quickbar browser extension with TypeScript implementation and cross-browser support (Chrome, Firefox, and future Safari). The extension enhances the AWS Console experience by allowing users to manage and quickly access their favorite services through an improved quickbar interface.

### Goals

1. Add static type safety to catch bugs at compile time
2. Support Chrome, Firefox, and future Safari browsers
3. Maintain a single codebase for all browsers
4. Improve code maintainability and readability
5. Enhance developer experience with better IDE support
6. Maintain comprehensive test coverage
7. Follow KISS principles and best practices

### Non-Goals

1. Changing the extension's functionality or user-facing features
2. Rewriting the architecture or module structure
3. Introducing new dependencies beyond TypeScript and browser compatibility tooling

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Extension Code                        │
│  (TypeScript: popup.ts, content.ts, utils, etc.)       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Browser API Compatibility Layer                │
│         (webextension-polyfill library)                  │
│  - Normalizes chrome.* and browser.* APIs                │
│  - Converts callbacks to Promises                        │
│  - Provides consistent interface                         │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Chrome Browser │    │ Firefox Browser │
│  (chrome.* API) │    │ (browser.* API) │
└─────────────────┘    └─────────────────┘
```

### Directory Structure

```
src/
├── types.ts                    # Shared type definitions
├── browser-api.ts              # Cross-browser API compatibility layer
├── content.ts                  # Content script entry point
├── popup.ts                    # Popup entry point
├── utils/
│   ├── dom.ts
│   ├── storage.ts
│   └── region.ts
├── services/
│   ├── icon-extractor.ts
│   ├── icon-validator.ts
│   ├── recently-visited-parser.ts
│   └── service-merger.ts
├── quickbar/
│   ├── css-extractor.ts
│   ├── dom-builder.ts
│   └── injector.ts
└── popup/
    ├── storage.ts
    ├── search.ts
    ├── ui-state.ts
    ├── service-item.ts
    ├── service-click-handler.ts
    ├── service-list-renderer.ts
    └── drag-drop.ts

tests/
├── setup.ts
├── helpers/
│   ├── dom-helpers.ts
│   ├── fixtures.ts
│   └── mocks.ts
├── unit/
│   └── [mirrors src structure with .test.ts files]
└── integration/
    └── [integration test files as .test.ts]

dist/                           # Compiled JavaScript output
├── chrome/                     # Chrome build
└── firefox/                    # Firefox build

scripts/                        # Build scripts (bash/Makefile)
├── build-chrome.sh
├── build-firefox.sh
└── bundle.js

manifest.json                   # Base manifest
manifest.firefox.json           # Firefox-specific manifest
```

### Build System Architecture

```
TypeScript Source (.ts)
    ↓
TypeScript Compiler (tsc)
    ↓
JavaScript Output (.js) + Source Maps (.js.map)
    ↓
Browser-specific dist/ directory
    ├── Chrome (manifest.json)
    └── Firefox (manifest.firefox.json merged)
    ↓
Extension Package (.zip)
```

## Components and Interfaces

### 1. Shared Type Definitions (src/types.ts)

Central location for all shared types and interfaces:

```typescript
/**
 * Represents an AWS service with metadata for display and navigation
 */
export interface Service {
  /** Unique service identifier (e.g., 'ec2', 'rds') */
  id: string;
  /** Display name of the service */
  name: string;
  /** URL to the service icon from AWS CDN */
  iconUrl: string;
  /** URL to the service console page */
  consoleUrl: string;
}

/**
 * Storage structure for user-configured favorite services
 */
export interface UserFavorites {
  /** Array of service IDs in user-specified order */
  services: string[];
}

/**
 * Storage structure for maximum services configuration
 */
export interface MaxServicesConfig {
  /** Maximum number of services to display in quickbar */
  maxServices: number;
}

/**
 * Complete storage data structure
 */
export interface StorageData {
  userFavorites?: UserFavorites;
  maxServicesConfig?: MaxServicesConfig;
}

/**
 * AWS region identifier
 */
export type AWSRegion = string;

/**
 * CSS class names extracted from AWS Console
 */
export interface AWSFavoriteClasses {
  /** Class for the favorite item container */
  itemClass: string;
  /** Class for the favorite link */
  linkClass: string;
  /** Class for the service icon */
  iconClass: string;
  /** Class for the service label */
  labelClass: string;
}
```

### 2. Browser API Compatibility Layer (src/browser-api.ts)

Provides a unified interface for Chrome, Firefox, and Safari extension APIs using webextension-polyfill:

```typescript
/**
 * Browser API abstraction layer for cross-browser compatibility
 * Uses webextension-polyfill to normalize APIs
 */
import browser from 'webextension-polyfill';

export { browser };

// All code uses browser.* APIs which work across Chrome, Firefox, and Safari
// The polyfill handles:
// - Converting Chrome's callback-based APIs to Promises
// - Providing browser.* namespace on Chrome
// - Passing through Firefox's native browser.* APIs
```

### 3. Utility Modules

#### DOM Utilities (src/utils/dom.ts)

```typescript
/**
 * Waits for an element to appear in the DOM
 */
export function waitForElement(
  selector: string,
  timeout: number = 10000
): Promise<HTMLElement | null>

/**
 * Waits for DOM to be ready
 */
export function waitForDOMReady(): Promise<void>

/**
 * Checks if current page is AWS Console
 */
export function isAWSConsolePage(): boolean

/**
 * Checks if current page is AWS Console homepage
 */
export function isAWSConsoleHomepage(): boolean
```

#### Storage Utilities (src/utils/storage.ts)

```typescript
import { Service, StorageData, UserFavorites } from '../types';
import { browser } from '../browser-api';

/**
 * Saves services to browser storage
 */
export async function saveServicesToStorage(services: Service[]): Promise<void>

/**
 * Loads services from browser storage
 */
export async function loadServicesFromStorage(): Promise<Service[]>

/**
 * Loads user-configured favorites
 */
export async function loadUserFavorites(): Promise<UserFavorites>
```

#### Region Utilities (src/utils/region.ts)

```typescript
import { AWSRegion } from '../types';

/**
 * Detects the current AWS region from URL or localStorage
 */
export function detectRegion(): AWSRegion
```

### 4. Service Modules

#### Icon Extractor (src/services/icon-extractor.ts)

```typescript
/**
 * Extracts icon URLs from AWS Console DOM
 */
export function extractIconUrlsFromConsole(): Map<string, string>
```

#### Icon Validator (src/services/icon-validator.ts)

```typescript
/**
 * Validates if a URL is a valid icon URL
 */
export function isValidIconUrl(url: string): boolean
```

#### Recently Visited Parser (src/services/recently-visited-parser.ts)

```typescript
import { Service } from '../types';

/**
 * Waits for the Recently Visited widget to appear
 */
export async function waitForRecentlyVisitedWidget(
  timeout?: number
): Promise<HTMLElement | null>

/**
 * Parses recently visited services from AWS Console widget
 */
export function parseRecentlyVisited(): Service[]
```

#### Service Merger (src/services/service-merger.ts)

```typescript
import { Service } from '../types';

/**
 * Merges user favorites and recently visited services
 * Removes duplicates, prioritizing user favorites
 */
export function mergeServices(
  userFavorites: Service[],
  recentServices: Service[]
): Service[]
```

### 5. Quickbar Modules

#### CSS Extractor (src/quickbar/css-extractor.ts)

```typescript
import { AWSFavoriteClasses } from '../types';

/**
 * Extracts CSS classes from native AWS favorites
 */
export function extractAWSFavoriteClasses(): AWSFavoriteClasses | null

/**
 * Waits for native AWS favorites to load
 */
export async function waitForNativeFavorites(
  timeout?: number
): Promise<void>
```

#### DOM Builder (src/quickbar/dom-builder.ts)

```typescript
import { Service, AWSFavoriteClasses } from '../types';

/**
 * Creates a service link element
 */
export function createServiceLink(
  service: Service,
  classes: AWSFavoriteClasses
): HTMLElement
```

#### Injector (src/quickbar/injector.ts)

```typescript
import { Service } from '../types';

/**
 * Injects services into the AWS Console quickbar
 */
export function injectServices(
  services: Service[],
  quickbarElement: HTMLElement
): void
```

### 6. Popup Modules

#### Popup Storage (src/popup/storage.ts)

```typescript
import { Service, MaxServicesConfig } from '../types';

/**
 * Loads favorites from storage
 */
export async function loadFavorites(): Promise<Service[]>

/**
 * Saves favorites to storage
 */
export async function saveFavorites(services: Service[]): Promise<void>

/**
 * Loads max services configuration
 */
export async function loadMaxServices(): Promise<number>

/**
 * Saves max services configuration
 */
export async function saveMaxServices(maxServices: number): Promise<void>
```

#### Search (src/popup/search.ts)

```typescript
import { Service } from '../types';

/**
 * Filters services based on search query
 */
export function filterServices(services: Service[], query: string): Service[]
```

#### UI State (src/popup/ui-state.ts)

```typescript
/**
 * Shows empty state message
 */
export function showEmptyState(): void

/**
 * Shows error state message
 */
export function showErrorState(error: Error): void

/**
 * Shows service list
 */
export function showServiceList(): void
```

#### Service Item (src/popup/service-item.ts)

```typescript
import { Service } from '../types';

/**
 * Creates a service item element for the popup
 */
export function createServiceItem(
  service: Service,
  isPinned: boolean,
  onToggle: (service: Service) => void
): HTMLElement
```

#### Drag and Drop (src/popup/drag-drop.ts)

```typescript
/**
 * Sets up drag and drop functionality
 */
export function setupDragAndDrop(
  container: HTMLElement,
  onReorder: (newOrder: string[]) => void
): void

/**
 * Handles drag start event
 */
export function handleDragStart(event: DragEvent): void

/**
 * Handles drag over event
 */
export function handleDragOver(event: DragEvent): void

/**
 * Handles drop event
 */
export function handleDrop(event: DragEvent): void
```

## Data Models

### Service

The core data model representing an AWS service:

```typescript
interface Service {
  id: string;        // Unique identifier (e.g., 'ec2')
  name: string;      // Display name (e.g., 'EC2')
  iconUrl: string;   // AWS CDN icon URL
  consoleUrl: string; // Service console URL
}
```

### Storage Data

Browser storage structure:

```typescript
interface StorageData {
  userFavorites?: {
    services: string[]; // Array of service IDs
  };
  maxServicesConfig?: {
    maxServices: number; // Max services to display
  };
}
```

### AWS Favorite Classes

CSS classes extracted from AWS Console:

```typescript
interface AWSFavoriteClasses {
  itemClass: string;   // Container class
  linkClass: string;   // Link class
  iconClass: string;   // Icon class
  labelClass: string;  // Label class
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do.*

### TypeScript Migration Properties

**Property 1: Source-to-output structure preservation**
*For any* TypeScript source file in the src directory, when compiled, there should exist a corresponding JavaScript file in the dist directory maintaining the same relative path structure.
**Validates: Requirements 1.3**

**Property 2: Source map generation**
*For any* compiled JavaScript file in the dist directory, there should exist a corresponding .js.map source map file with the same base name.
**Validates: Requirements 1.4**

**Property 3: Build completeness**
*For any* required file type (JavaScript, HTML, CSS, manifest), after the build completes, that file type should exist in the dist directory.
**Validates: Requirements 9.5**

**Property 4: File size constraint**
*For any* TypeScript source file in the src directory, the line count should be less than 300 lines to ensure readability.
**Validates: Requirements 17.2**

**Property 5: Public API documentation**
*For any* exported function in TypeScript modules, there should be a JSDoc comment block preceding the function declaration.
**Validates: Requirements 17.8**

### Firefox Support Properties

**Property 6: Storage operations produce identical results across browsers**
*For any* storage operation (save, load, update, delete) with any valid service data, the operation should complete successfully and produce identical results when executed with Chrome API mocks versus Firefox API mocks.
**Validates: Requirements 11.3, 14.1, 14.3**

**Property 7: Core logic produces browser-independent output**
*For any* core functionality (DOM injection, service parsing, icon extraction, service merging) with any valid input data, the output should be identical regardless of which browser API environment is used.
**Validates: Requirements 14.2, 14.4, 14.5**

**Property 8: Browser API compatibility layer normalizes to Promises**
*For any* browser API call (storage, tabs, runtime), when executed through the compatibility layer, it should return a Promise that resolves successfully in both Chrome and Firefox mock environments.
**Validates: Requirements 12.1, 12.4**

## Error Handling

### TypeScript Compilation Errors

**Strategy**: Fail fast at compile time with clear error messages

- Type mismatches: Compiler reports errors with file location and expected vs actual types
- Null/undefined access: Strict null checking catches potential null reference errors
- Missing properties: Compiler catches attempts to access non-existent properties
- Invalid function calls: Compiler validates parameter types and counts

### Runtime Error Handling

**Strategy**: Graceful degradation with typed error handling

```typescript
/**
 * Safely executes a function with error handling
 */
async function safeExecute<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error('Error:', error);
    return fallback;
  }
}
```

### Browser API Errors

**Strategy**: Handle both callback and promise-based errors

```typescript
// Browser API compatibility layer handles errors consistently
export const storage = {
  local: {
    get: async (keys: string | string[] | null): Promise<any> => {
      try {
        return await browser.storage.local.get(keys);
      } catch (error) {
        console.error('Storage error:', error);
        return {};
      }
    }
  }
};
```

### Input Validation

**Strategy**: Validate and sanitize all external inputs

```typescript
/**
 * Validates a service object
 */
function isValidService(obj: any): obj is Service {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.iconUrl === 'string' &&
    typeof obj.consoleUrl === 'string' &&
    isValidIconUrl(obj.iconUrl) &&
    isValidUrl(obj.consoleUrl)
  );
}

/**
 * Validates a URL for security
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && 
           parsed.hostname.endsWith('.amazonaws.com');
  } catch {
    return false;
  }
}
```

## Testing Strategy

### Dual Testing Approach

The extension maintains comprehensive testing with both unit tests and property-based tests, with added type safety from TypeScript.

### Unit Testing

**Framework**: Jest with ts-jest for TypeScript compilation

**Coverage Requirements**: 
- Core modules: 90%+ statement coverage, 77-90% branch coverage
- Orchestration files: Validated through integration tests

**Test Structure**:
```typescript
describe('Module', () => {
  describe('function', () => {
    it('should handle normal case', async () => {
      // Test
    });
    
    it('should handle edge case', async () => {
      // Test
    });
    
    it('should handle error case', async () => {
      // Test
    });
  });
});
```

### Property-Based Testing

**Framework**: fast-check

**Purpose**: Verify universal properties across many randomly generated inputs

**Example**:
```typescript
import * as fc from 'fast-check';

describe('mergeServices properties', () => {
  it('should preserve user favorites order', () => {
    fc.assert(
      fc.property(
        fc.array(serviceArbitrary()),
        fc.array(serviceArbitrary()),
        (userFavorites, recentServices) => {
          const result = mergeServices(userFavorites, recentServices);
          // Verify property
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**Purpose**: Validate complete workflows with TypeScript

```typescript
describe('Content Script Integration', () => {
  it('should inject services into quickbar', async () => {
    // Setup DOM and mocks
    const mockServices: Service[] = [...];
    
    // Execute injection
    await injectQuickbar(mockServices);
    
    // Verify
    expect(quickbar?.children.length).toBe(1);
  });
});
```

### Cross-Browser Testing

**Approach**: Test with both Chrome and Firefox API mocks

```typescript
describe('Browser Compatibility', () => {
  it('should work with Chrome APIs', async () => {
    // Setup Chrome mocks
    // Test functionality
  });
  
  it('should work with Firefox APIs', async () => {
    // Setup Firefox mocks
    // Test functionality
  });
});
```

## Build Configuration

### TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "removeComments": false,
    "types": ["chrome", "jest"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Manifest Configuration

**Base Manifest (manifest.json)**: Common fields for all browsers

**Firefox Manifest (manifest.firefox.json)**: Firefox-specific additions
```json
{
  "browser_specific_settings": {
    "gecko": {
      "id": "aws-favorites-quickbar@example.com",
      "strict_min_version": "109.0"
    }
  }
}
```

### Build Scripts

**Makefile**:
```makefile
.PHONY: clean build build-chrome build-firefox test

clean:
	rm -rf dist/
	rm -rf coverage/

compile:
	npx tsc

build-chrome: clean compile
	./scripts/build-chrome.sh

build-firefox: clean compile
	./scripts/build-firefox.sh

build-all: build-chrome build-firefox

test:
	npm run test:coverage

watch:
	npx tsc --watch
```

**scripts/build-chrome.sh**: Builds Chrome extension with manifest.json

**scripts/build-firefox.sh**: Builds Firefox extension with merged manifest

### Package.json Updates

```json
{
  "scripts": {
    "clean": "make clean",
    "compile": "tsc",
    "build:chrome": "make build-chrome",
    "build:firefox": "make build-firefox",
    "build:all": "make build-all",
    "watch": "make watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/chrome": "latest",
    "@types/firefox-webext-browser": "latest",
    "@types/jest": "latest",
    "@typescript-eslint/eslint-plugin": "latest",
    "@typescript-eslint/parser": "latest",
    "canvas": "latest",
    "eslint": "latest",
    "fast-check": "latest",
    "jest": "latest",
    "jest-environment-jsdom": "latest",
    "ts-jest": "latest",
    "typescript": "latest"
  },
  "dependencies": {
    "webextension-polyfill": "latest"
  }
}
```

## Security Considerations

### Input Validation

All external inputs must be validated:

```typescript
/**
 * Validates service data from storage
 */
function validateStorageData(data: any): Service[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter(isValidService);
}
```

### URL Validation

Only allow HTTPS URLs from trusted domains:

```typescript
/**
 * Validates AWS Console URLs
 */
function isValidAWSUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname.endsWith('.amazonaws.com') ||
       parsed.hostname.endsWith('.aws.amazon.com'))
    );
  } catch {
    return false;
  }
}
```

### Content Security Policy

- No inline scripts (enforced by extension manifest)
- No eval() or Function() constructor
- All external resources loaded over HTTPS

## Performance Considerations

### Compilation Performance

- Incremental compilation: Use `tsc --incremental` for faster rebuilds
- Watch mode: Use `tsc --watch` during development
- Parallel builds: Build Chrome and Firefox packages in parallel

### Runtime Performance

- Compiled JavaScript is equivalent to hand-written JS
- No runtime type checking overhead
- Source maps enable debugging without performance cost
- Tree shaking removes unused code

## Maintenance and Evolution

### Adding New Features

1. Define types in src/types.ts if shared across modules
2. Create new module files following existing patterns
3. Write unit tests achieving comprehensive coverage
4. Add property-based tests for universal properties
5. Update documentation and JSDoc comments
6. Run type checker and tests before committing

### Cross-Browser Compatibility

When adding support for new browsers (e.g., Safari):

1. Test with webextension-polyfill (should work automatically)
2. Create Safari-specific build script if needed
3. Add Safari manifest configuration if needed
4. Test on Safari
5. Update documentation

### Code Quality Maintenance

- Run `npm run lint` before commits
- Run `npm run type-check` before commits
- Maintain comprehensive test coverage
- Keep files under 300 lines
- Add JSDoc for all public APIs
- Review TypeScript compiler errors carefully

## Conclusion

This design provides a comprehensive plan for the AWS Favorites Quickbar extension with TypeScript implementation and cross-browser support. The architecture maintains all existing functionality while adding type safety, supporting multiple browsers through a compatibility layer, and following best practices for code quality, security, and maintainability.
