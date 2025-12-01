# AWS Favorites Quickbar

A cross-browser extension for Chrome and Firefox that automatically populates the AWS Console favorites bar with your configured favorite services and recently visited services.

## Features

- 🎯 Configure your favorite AWS services through an easy-to-use popup interface
- 🔄 Automatically detect and add recently visited services from AWS Console
- 🚫 Smart deduplication - no duplicate services in your quickbar
- 📌 User favorites always appear first
- 🔍 Search functionality to quickly find services
- 🎨 Drag-and-drop reordering of favorites
- 💾 Persistent storage across browser sessions

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
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── content.js            # Content script for DOM manipulation
├── popup.html            # Popup UI HTML
├── popup.js              # Popup UI logic
├── popup.css             # Popup UI styles
├── icons/                # Extension icons
└── README.md             # This file
```

## Development

### Build Process

The extension supports both Chrome and Firefox through a unified codebase with browser-specific builds.

#### Build Commands

```bash
# Install dependencies
npm install

# Build for Chrome only
npm run build:chrome

# Build for Firefox only
npm run build:firefox

# Build for both browsers
npm run build:all
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

The extension uses [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) to provide a unified API that works across both browsers:

- **Chrome**: Wraps callback-based `chrome.*` APIs to return Promises
- **Firefox**: Uses native Promise-based `browser.*` APIs

All browser API calls in the codebase use the `browser.*` namespace and Promise-based patterns.

### Development Setup

#### Chrome Development

1. Make code changes in the `src/` directory
2. Run `npm run build:chrome`
3. Go to `chrome://extensions/` and click the reload icon for the extension
4. Test your changes

#### Firefox Development

1. Make code changes in the `src/` directory
2. Run `npm run build:firefox`
3. Go to `about:debugging#/runtime/this-firefox`
4. Click "Reload" next to the extension
5. Test your changes

**Tip**: Use `web-ext` for automatic reloading:
```bash
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

### Spec Documentation

See `.kiro/specs/` for detailed requirements, design, and implementation tasks:
- `aws-favorites-quickbar/` - Original feature specification
- `firefox-support/` - Firefox compatibility specification

## Testing

This project has comprehensive test coverage with both unit tests and property-based tests.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm test -- --coverage

# Run specific test file
npm test -- tests/unit/services/icon-validator.test.js

# Run tests with verbose output
npm test -- --verbose
```

### Test Structure

```
tests/
├── unit/              # Unit tests for individual modules
│   ├── utils/         # DOM, storage, region utilities
│   ├── services/      # Icon extraction, validation, parsing, merging
│   ├── quickbar/      # CSS extraction, DOM building, injection
│   └── popup/         # Popup storage, search, UI state, drag-drop
├── integration/       # End-to-end workflow tests
│   ├── content-script.test.js
│   ├── popup-workflow.test.js
│   ├── duplicate-filtering.test.js
│   ├── user-favorites-ordering.test.js
│   ├── service-pinning-toggle.test.js
│   ├── drag-drop-persistence.test.js
│   └── error-scenarios.test.js
├── helpers/           # Test utilities and fixtures
│   ├── mocks.js       # Chrome API and DOM mocks
│   ├── fixtures.js    # Sample data generators
│   └── dom-helpers.js # DOM manipulation utilities
└── setup.js           # Global test configuration
```

### Test Types

**Unit Tests**: Test individual functions and modules in isolation with mocked dependencies.

**Property-Based Tests**: Use fast-check to test universal properties across randomly generated inputs. These tests validate correctness properties like:
- Icon URL validation consistency
- Service merging deduplication and ordering
- DOM builder structure consistency
- Search filter correctness
- Service item rendering completeness
- User favorites ordering priority
- Duplicate service filtering
- Service pinning toggle idempotence
- Drag-and-drop order persistence

**Integration Tests**: Test complete workflows from initialization to final DOM state, simulating real user interactions.

### Coverage Reports

After running tests with coverage, open `coverage/index.html` in your browser to view detailed coverage reports showing:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage
- Uncovered lines highlighted in source code

### Coverage Goals

- **Core modules** (utils, services, quickbar): 90%+ coverage
- **Critical paths**: 100% coverage for core injection and merging logic
- **Error handling**: 80%+ coverage for error paths

### Writing Tests

When adding new features:

1. Write unit tests for new functions in the appropriate test file
2. Add property-based tests for universal properties
3. Update integration tests if the feature affects workflows
4. Ensure tests pass and coverage remains above thresholds

See `tests/README.md` for detailed testing guidelines and examples.

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

## License

MIT
