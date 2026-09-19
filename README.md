# AWS Favorites Quickbar

[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A cross-browser extension for Chrome and Firefox that automatically populates the AWS Console favorites bar with your configured favorite services and recently visited services. Built with TypeScript for type safety and maintainability.

## Quick Start

```bash
# Install dependencies
npm install

# Build for Chrome
npm run build:chrome

# Build for Firefox
npm run build:firefox

# Run unit & integration tests
npm test

# Run E2E tests (Playwright with persistent Chrome session)
npm run test:e2e

# Run all security and quality checks
npm run security-check
```

## Features

- 🎯 Configure your favorite AWS services through an easy-to-use popup interface
- 🔄 Automatically detect and add recently visited services from AWS Console
- 🚫 Smart deduplication - no duplicate services in your quickbar
- 📌 User favorites always appear first
- 🔍 Search functionality to quickly find services
- 🎨 Drag-and-drop reordering of favorites
- 💾 Persistent storage across browser sessions
- 🔒 100% TypeScript with strict type safety
- ✅ Comprehensive test coverage (441 unit/integration tests + 34 E2E tests, 94%+ coverage)
- 🛡️ Zero security vulnerabilities
- 🌐 Cross-browser compatible (Chrome & Firefox)

## Installation

### Chrome

#### For Development

1. Clone this repository
2. Build the Chrome extension: `npm run build:chrome`
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked"
6. Select the `dist/chrome` directory

#### For Production

Install from the Chrome Web Store (coming soon)

### Firefox

#### For Development

1. Clone this repository
2. Build the Firefox extension: `npm run build:firefox`
3. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
4. Click "Load Temporary Add-on..."
5. Navigate to the `dist/firefox` directory and select the `manifest.json` file

**Note**: Temporary add-ons in Firefox are removed when you close the browser. For persistent development, you can:
- Reload the add-on from `about:debugging` after each browser restart
- Use [web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/) for automatic reloading during development

#### For Production

Install from Firefox Add-ons (coming soon)

## Usage

1. Click the extension icon in your browser toolbar
2. Search and select your favorite AWS services
3. Reorder them by dragging (optional)
4. Navigate to AWS Console - your favorites will automatically appear in the quickbar!

## Project Structure

```
aws-favorites-quickbar/
├── src/                   # TypeScript source files
│   ├── types.ts          # Shared type definitions
│   ├── browser-api.ts    # Cross-browser API compatibility layer
│   ├── browser-storage.ts # Browser storage utilities
│   ├── content.ts        # Content script for DOM manipulation
│   ├── popup.ts          # Popup UI logic
│   ├── settings.ts       # Settings & visualMode theme synchronization
│   ├── utils/            # Utility modules (DOM, storage, region)
│   ├── services/         # Service modules (icon extraction, 220-service CDN icons, parsing, merging)
│   ├── quickbar/         # Quickbar modules (CSS extraction, DOM building, injection)
│   └── popup/            # Popup modules (storage, search, UI state, drag-drop)
├── tests/                # Test suite
│   ├── unit/             # Unit tests (Vitest)
│   ├── integration/      # Integration workflow tests (Vitest)
│   ├── e2e/              # Browser E2E & visual regression tests (Playwright, 14 specs, 34 tests)
│   └── helpers/          # Test utilities and fixtures
├── dist/                 # Compiled JavaScript output (generated)
│   ├── chrome/           # Chrome build output
│   └── firefox/          # Firefox build output
├── scripts/              # Build and utility scripts
│   ├── build-chrome.sh   # Chrome build script
│   ├── build-firefox.sh  # Firefox build script
│   ├── bundle.ts         # esbuild bundling script
│   └── security-check.ts # Comprehensive security check
├── manifest.json         # Chrome extension configuration
├── manifest.firefox.json # Firefox-specific manifest fields
├── popup.html            # Popup UI HTML
├── popup.css             # Popup UI styles
├── icons/                # Extension icons
├── tsconfig.json         # TypeScript configuration
├── vitest.config.mjs     # Vitest test configuration (ESM)
├── eslint.config.mjs     # ESLint configuration (ESM)
├── .prettierrc.json      # Prettier formatting rules
├── Makefile              # Build automation
└── README.md             # This file
```

## Development

### Prerequisites

- Node.js 16+ and npm
- TypeScript 5.x (installed as dev dependency)

### Build Process

The extension is written in TypeScript and compiled to JavaScript for both Chrome and Firefox through a unified codebase with browser-specific builds.

#### Build Commands

```bash
# Install dependencies
npm install

# Compile TypeScript to JavaScript
npm run compile

# Bundle with esbuild
npm run bundle

# Type check without emitting files
npm run type-check

# Build for Chrome only
npm run build:chrome

# Build for Firefox only
npm run build:firefox

# Build for both browsers
npm run build:all

# Watch mode for development
npm run watch

# Clean build artifacts
npm run clean
```

#### Build Output

- **Chrome**: `dist/chrome/` - Uses `manifest.json` directly
- **Firefox**: `dist/firefox/` - Uses merged manifest with Firefox-specific fields from `manifest.firefox.json`

Both builds include:
- Source files (`src/`)
- UI files (`popup.html`, `popup.css`)
- Icons (`icons/`)
- WebExtension polyfill for cross-browser compatibility

#### Browser Compatibility

The extension includes a custom TypeScript-based browser API compatibility layer (`src/browser-api.ts`) that provides a unified interface across browsers:

- **Chrome**: Wraps callback-based `chrome.*` APIs to return Promises
- **Firefox**: Uses native Promise-based `browser.*` APIs
- **Safari**: Prepared for future support with minimal changes needed

All browser API calls in the codebase use the compatibility layer with full TypeScript type safety.

### TypeScript Development

The codebase is written in TypeScript with strict type checking enabled. Key TypeScript features:

- **Strict null checks**: Prevents null/undefined errors at compile time
- **Type inference**: Automatic type detection for cleaner code
- **Interface definitions**: Shared types in `src/types.ts`
- **JSDoc comments**: Comprehensive documentation for all public APIs
- **Source maps**: Full debugging support in browser DevTools

#### TypeScript Configuration

The project uses a unified TypeScript configuration:

- `tsconfig.json`: Single configuration for source code compilation and testing
  - Target: ES2020
  - Module: ES2020
  - Strict mode enabled
  - Source maps generated
  - Type definitions for Chrome and Vitest globals (`vitest/globals`)

#### Type Checking

```bash
# Run type checker without compiling
npm run type-check

# Type check runs automatically during build
npm run build:chrome  # Includes type checking
```

### Development Setup

#### Chrome Development

1. Make code changes in the `src/` directory (TypeScript files)
2. Run `npm run build:chrome` (compiles TypeScript and packages)
3. Go to `chrome://extensions/` and click the reload icon for the extension
4. Test your changes
5. Use Chrome DevTools with source maps for debugging TypeScript

#### Firefox Development

1. Make code changes in the `src/` directory (TypeScript files)
2. Run `npm run build:firefox` (compiles TypeScript and packages)
3. Go to `about:debugging#/runtime/this-firefox`
4. Click "Reload" next to the extension
5. Test your changes
6. Use Firefox DevTools with source maps for debugging TypeScript

**Tip**: Use watch mode for faster development:
```bash
# Terminal 1: Watch TypeScript compilation
npm run watch

# Terminal 2: Use web-ext for automatic Firefox reloading
npm install -g web-ext
cd dist/firefox
web-ext run
```

### Cross-Browser Testing

To ensure compatibility across both browsers, test all features on both Chrome and Firefox:

#### Manual Testing Checklist

- [ ] **Extension loads**: Verify the extension installs without errors
- [ ] **Popup opens**: Click the extension icon and verify the popup displays
- [ ] **Service search**: Search for AWS services in the popup
- [ ] **Favorite toggle**: Add and remove services from favorites
- [ ] **Drag-and-drop**: Reorder favorites by dragging
- [ ] **Storage persistence**: Close and reopen browser, verify favorites persist
- [ ] **Quickbar injection**: Visit AWS Console and verify quickbar appears with favorites
- [ ] **Recently visited**: Navigate to AWS services and verify they appear in the extension
- [ ] **Icon extraction**: Verify service icons display correctly
- [ ] **Max services setting**: Change max services and verify it applies

#### Automated Testing

The test suite includes cross-browser compatibility tests:

```bash
# Run all tests including browser compatibility tests
npm test

# Run browser-specific tests
npm test -- tests/unit/browser-compatibility.test.js
npm test -- tests/unit/core-logic-browser-independence.test.js
```

These tests verify:
- Browser API compatibility layer works on both Chrome and Firefox mocks
- Storage operations produce identical results across browsers
- Core logic produces browser-independent output
- Promise-based API calls resolve correctly in both environments

### Debugging

#### Chrome DevTools

1. Right-click the extension popup and select "Inspect"
2. Check the Console tab for errors
3. Use the Network tab to monitor API calls
4. Use the Application > Storage tab to inspect stored data

#### Firefox DevTools

1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Inspect" next to the extension
3. Check the Console tab for errors
4. Use the Storage tab to inspect stored data
5. Use the Browser Console (Ctrl+Shift+J) for content script debugging

### Documentation & AI Reference

- **[AGENTS.md](AGENTS.md)** — Architectural invariants, non-negotiable rules, and reference guide for AI coding assistants and developers.
- **[changelogs/](changelogs/)** — Version release history and release notes.
- **`.kiro/specs/`** — Original requirements, design documents, and correctness properties.

## Testing

This project has comprehensive test coverage with both unit tests and property-based tests, all written in TypeScript with full type safety.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- tests/unit/services/icon-validator.test.ts

# Run tests with verbose output
npm run test:verbose
```

### Test Coverage

The project maintains **comprehensive test coverage**:
- 79% statement coverage (749/947)
- 79% branch coverage (222/278)
- 77% function coverage (128/165)
- 79% line coverage (717/901)

**Module-Specific Coverage:**
- Utils: 97% statements, 87% branches, 100% functions
- Services: 89% statements, 79% branches, 94% functions
- Quickbar: 100% statements, 97% branches, 100% functions
- Popup: 97% statements, 95% branches, 91% functions

Coverage reports are generated in the `coverage/` directory. Open `coverage/index.html` to view detailed reports.

**Note:** Entry point files (content.ts, popup.ts) show 0% in unit test coverage but are fully validated through integration tests.

### Test Structure

```
tests/
├── unit/              # Unit tests for individual modules (TypeScript)
│   ├── utils/         # DOM, storage, region utilities
│   ├── services/      # Icon extraction, validation, 220 CDN icons catalog, parsing, merging
│   ├── quickbar/      # CSS extraction, DOM building, injection
│   └── popup/         # Popup storage, search, UI state, drag-drop
├── integration/       # End-to-end workflow tests (TypeScript)
│   ├── content-script.test.ts
│   ├── popup-workflow.test.ts
│   ├── duplicate-filtering.test.ts
│   ├── user-favorites-ordering.test.ts
│   ├── service-pinning-toggle.test.ts
│   ├── drag-drop-persistence.test.ts
│   └── error-scenarios.test.ts
├── e2e/               # Browser E2E & visual regression tests (Playwright)
│   ├── helpers/       # AWS auth session & storage helper utilities
│   ├── fixtures.ts    # Persistent Chrome context fixture
│   ├── auth-check.spec.ts               # Session & extension load check
│   ├── quickbar-mount.spec.ts           # Navbar injection verification
│   ├── popup.spec.ts                    # UI click, search & pin interaction
│   ├── popup-visual.spec.ts             # Dark/Light visual regression
│   ├── cross-tab-sync.spec.ts           # Real-time multi-tab sync
│   ├── theme.spec.ts                    # VisualMode theme toggle simulation
│   ├── edge-cases.spec.ts               # Boundaries & error states
│   ├── recently-visited-navigation.spec.ts # Multi-service navigation
│   ├── quickbar-random.spec.ts          # Dynamic random subset stress test
│   ├── quickbar-pool-random.spec.ts     # 220-service pool seeded stress test
│   ├── coverage-gaps.spec.ts            # First-launch, Rule 4 nested IDs, linkage
│   ├── firefox.spec.ts                  # Firefox AMO packaging verification
│   └── firefox-visual.spec.ts           # Firefox visual artifact inspection
├── helpers/           # Test utilities and fixtures (TypeScript)
│   ├── mocks.ts       # Chrome API and DOM mocks with types
│   ├── fixtures.ts    # Sample data generators with types
│   └── dom-helpers.ts # DOM manipulation utilities with types
└── setup.ts           # Global test configuration
```

### Test Types

**Unit Tests**: Test individual functions and modules in isolation with mocked dependencies. All tests are written in TypeScript with full type safety for test data and assertions.

**Property-Based Tests**: Use [fast-check](https://github.com/dubzzz/fast-check) to test universal properties across randomly generated inputs. These tests validate correctness properties like:
- Source-to-output structure preservation (build validation)
- Source map generation (build validation)
- Build completeness (all required files present)
- File size constraints (readability)
- Public API documentation (JSDoc presence)
- Icon URL validation consistency
- Service merging deduplication and ordering
- DOM builder structure consistency
- Search filter correctness
- Service item rendering completeness
- User favorites ordering priority
- Duplicate service filtering
- Service pinning toggle idempotence
- Drag-and-drop order persistence

Each property-based test runs 100+ iterations with randomly generated inputs to ensure correctness across the entire input space.

**Integration Tests**: Test complete workflows from initialization to final DOM state, simulating real user interactions with typed test data.

**End-to-End (E2E) Tests**: Powered by Playwright to validate real-browser execution against live AWS Console sessions and extension popups. See [E2E Testing Plan](docs/e2e-testing-plan.md) and [E2E Bug Findings Report](docs/e2e-bug-findings-report.md) for architecture, test matrix, and defect retrospectives.

### Writing Tests

When adding new features:

1. Write TypeScript test files with `.test.ts` extension
2. Use proper type annotations for test data and mocks
3. Write unit tests for new functions in the appropriate test file
4. Add property-based tests for universal properties
5. Update integration tests if the feature affects workflows
6. Ensure tests pass and 100% coverage is maintained

Example TypeScript test:

```typescript
import { filterServices } from '../../../src/popup/search';
import { Service } from '../../../src/types';

describe('filterServices', () => {
  it('should filter services by name', () => {
    const services: Service[] = [
      { id: 'ec2', name: 'EC2', iconUrl: 'https://...', consoleUrl: 'https://...' },
      { id: 's3', name: 'S3', iconUrl: 'https://...', consoleUrl: 'https://...' }
    ];
    
    const result = filterServices(services, 'ec2');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ec2');
  });
});
```

See `tests/README.md` for detailed testing guidelines and examples.

## Code Quality & Security

### Static Analysis & Security Checks

The project includes comprehensive static analysis and security checks:

```bash
# Run all security and quality checks
npm run security-check

# Individual checks
npm run type-check          # TypeScript type checking
npm run lint                # ESLint code quality
npm run lint:fix            # Auto-fix ESLint issues
npm run format              # Auto-format with Prettier
npm run format:check        # Check code formatting
npm audit                   # Security vulnerabilities
npm run check:circular      # Circular dependencies
npm run check:all           # Type check + lint + format + tests
```

### Security Check Results

✅ **All checks passing:**
- **Type Safety:** 0 errors, strict mode enabled
- **Code Quality:** 0 errors, 0 warnings
- **Security:** 0 vulnerabilities
- **Circular Dependencies:** 0 found
- **Tests:** 441 unit & integration tests passing (34 files), 0 failures; 34 E2E tests passing
- **Code Formatting:** All files properly formatted

**Comprehensive Check:**
```bash
npm run security-check
```

Output:
```
✅ TypeScript Type Check                       0.47s
✅ ESLint                                      0.93s
✅ Prettier Format Check                       0.63s
✅ npm audit (Security Vulnerabilities)        0.63s
✅ Circular Dependencies Check                 0.79s
✅ Unit & Integration Tests                   24.35s

Total: 6 passed, 0 failed
Duration: 27.81s
✅ All checks passed! Your code is secure and well-formatted.
```

### Tools & Configuration

**Static Analysis Tools:**
- **TypeScript** (^6.0.3) - Type checking with strict mode
- **ESLint** (^10.10.0) - Code quality and best practices
- **Prettier** (^3.9.8) - Code formatting
- **Madge** (^8.0.0) - Dependency analysis
- **Vitest** (^5.0.1) - Lightning-fast ESM testing framework with V8 coverage

**Configuration Files:**
- `tsconfig.json` - TypeScript compiler configuration
- `eslint.config.mjs` - ESLint rules (ESM config)
- `.prettierrc.json` - Prettier formatting rules
- `vitest.config.mjs` - Vitest testing configuration (ESM config)
- `scripts/security-check.ts` - Comprehensive security check script

### Security Features

**Input Validation:**
- URL validation (HTTPS only, AWS domains)
- Service object validation with type guards
- Runtime type checking for external data

**XSS Prevention:**
- No `innerHTML` with untrusted data
- Safe DOM manipulation methods
- Content Security Policy compliant

**Dependency Security:**
- Regular `npm audit` checks
- 0 known vulnerabilities
- All dependencies up-to-date

**Type Safety:**
- Strict TypeScript mode enabled
- No implicit `any` types (except browser API wrappers)
- Null safety enforced throughout

### Documentation

Detailed reports available:
- `STATIC_ANALYSIS_REPORT.md` - Comprehensive analysis report
- `SECURITY_CHECKLIST.md` - Quick reference guide
- `BUILD_VERIFICATION.md` - Build and test verification
- `LINT_REPORT.md` - ESLint analysis details

## Distribution

### Chrome Web Store Submission

1. Build the Chrome version: `npm run build:chrome`
2. Create a ZIP file of the `dist/chrome` directory
3. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Upload the ZIP file
5. Fill in store listing details (description, screenshots, etc.)
6. Submit for review

### Firefox Add-ons Store Submission

#### Pre-Submission Checklist

- [ ] **Build the extension**: Run `npm run build:firefox`
- [ ] **Test thoroughly**: Complete the manual testing checklist on Firefox
- [ ] **Verify manifest**: Ensure `manifest.firefox.json` includes:
  - [ ] Valid `browser_specific_settings.gecko.id` (email format recommended)
  - [ ] Appropriate `strict_min_version` (currently set to "109.0" for MV3 support)
  - [ ] All required permissions are listed
  - [ ] Correct version number
- [ ] **Check file size**: Ensure the extension is under 200MB
- [ ] **Review content security policy**: No inline scripts or eval()
- [ ] **Test on minimum Firefox version**: Test on Firefox 109 or later
- [ ] **Prepare store assets**:
  - [ ] Extension icon (128x128px minimum)
  - [ ] Screenshots (1-5 images, 1280x800px or 640x400px recommended)
  - [ ] Detailed description
  - [ ] Privacy policy (if collecting data)
  - [ ] Support email or website

#### Submission Steps

1. **Create ZIP file**:
   ```bash
   cd dist/firefox
   zip -r ../../aws-favorites-quickbar-firefox.zip .
   ```

2. **Sign in to Firefox Add-ons**:
   - Go to [addons.mozilla.org](https://addons.mozilla.org/developers/)
   - Sign in with your Firefox Account

3. **Submit New Add-on**:
   - Click "Submit a New Add-on"
   - Choose "On this site" (for listed add-ons) or "On your own" (for self-distribution)
   - Upload the ZIP file

4. **Fill in Listing Details**:
   - Name: AWS Favorites Quickbar
   - Summary: Brief description (250 characters max)
   - Description: Detailed feature list and usage instructions
   - Categories: Select appropriate categories (e.g., "Productivity", "Web Development")
   - Tags: Add relevant tags (e.g., "aws", "console", "favorites", "productivity")
   - License: MIT
   - Privacy Policy: Provide if applicable

5. **Upload Assets**:
   - Icon: Upload `icons/icon128.png`
   - Screenshots: Capture the popup interface and quickbar in action

6. **Technical Details**:
   - Select "Firefox for Desktop"
   - Minimum version: 109.0 (or as specified in manifest)
   - Source code: Provide GitHub repository link if requested

7. **Submit for Review**:
   - Review all information
   - Submit for Mozilla review
   - Monitor email for review feedback

#### Review Process

- **Automated validation**: Runs immediately upon upload
- **Manual review**: Typically takes 1-5 days for new submissions
- **Common issues**:
  - Missing or invalid `browser_specific_settings.gecko.id`
  - Permissions not justified in description
  - Minified code without source code provided
  - Content security policy violations

#### Post-Approval

- Extension will be available on Firefox Add-ons store
- Users can install with one click
- Updates follow the same submission process
- Monitor reviews and respond to user feedback

### Version Management

When releasing updates:

1. Update version in both `manifest.json` and `manifest.firefox.json`
2. Update `package.json` version
3. Document changes in release notes
4. Build both versions: `npm run build:all`
5. Test on both browsers
6. Submit to both stores

## Project History

### Spec-Driven Development

This project follows a spec-driven development approach with detailed specifications in `.kiro/specs/`:

- **aws-favorites-quickbar/** - Main feature specification
  - 17 requirements covering TypeScript and Firefox support
  - Comprehensive design with architecture and components
  - 20 implementation phases (all complete)

- **test-coverage/** - Testing specification
  - 8 test-related requirements
  - Test strategy and architecture
  - Property-based testing approach

All specifications include:
- Requirements with acceptance criteria
- Design documents with correctness properties
- Implementation tasks with requirement traceability

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `npm run security-check` to ensure all checks pass
5. Submit a pull request

**Development Guidelines:**
- Write TypeScript with strict types
- Maintain test coverage above 75%
- Follow ESLint and Prettier rules
- Add JSDoc comments for public APIs
- Keep files under 300 lines

## License

MIT
