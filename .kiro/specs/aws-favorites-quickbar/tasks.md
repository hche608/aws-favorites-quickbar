# Implementation Plan: AWS Favorites Quickbar

## Summary

This implementation plan covers all work: the completed TypeScript migration, the design alignment refactor, and remaining items.

## Completed Work

### TypeScript Migration (Historical)

**Status**: ✅ Complete
- TypeScript migration: Complete
- Firefox support: Complete
- Build system: Complete (Chrome and Firefox builds working)

### Design Alignment Refactor

**Status**: ✅ Complete (384 tests passing)

- [x] 1. Add VisualMode type to `src/types.ts`
  - Added `VisualMode` type (`'light' | 'dark'`)
  - Added `visualMode` to `StorageData` interface
  - Added `STORAGE_DEFAULTS` constant (userFavorites=[], maxServices=10, visualMode='light')
  - _Requirements: 5.1, 7.1_

- [x] 2. Remove fallback patterns in `src/popup/storage.ts`
  - Functions return `undefined` when storage has no value (first launch signal)
  - Added `loadVisualMode()` and `saveVisualMode()`
  - All functions throw on error instead of swallowing
  - _Requirements: 5.2, 5.3, 7.5, 14.5, 14.6_

- [x] 3. Remove fallback patterns in `src/utils/storage.ts`
  - `loadServicesFromStorage()` returns `undefined` when no data
  - `loadUserFavorites()` returns `undefined` when not initialized
  - Throws on malformed JSON (no silent swallow)
  - _Requirements: 7.5, 14.5, 14.6_

- [x] 4. Refactor `src/content.ts` and extract `src/settings.ts`
  - Created `loadSettings()` with explicit first-launch vs returning-user paths
  - Created `applyVisualMode()` — simulates radio click on `[data-testid="visualModeRadioGroup"]`
  - Uses `waitForElement` to wait for radio group to appear (SPA timing)
  - Writes `injectionStatus` to storage after injection
  - Removed outer try/catch that swallowed all errors
  - Split into `content.ts` (<300 lines) + `settings.ts` (<120 lines)
  - _Requirements: 3, 4, 5.4, 5.5, 6.6, 6.7, 7, 14.5_

- [x] 5. Refactor `src/quickbar/dom-builder.ts`
  - Removed `DEFAULT_CSS_CLASSES` constant
  - `classes` parameter is now required (not optional)
  - If no CSS template available, caller must not call this function
  - _Requirements: 6.5, 14.5_

- [x] 6. Refactor `src/quickbar/injector.ts`
  - Returns `false` when no CSS template available (no native pinned service)
  - Logs clear message: user must pin at least one service manually
  - No hardcoded fallback classes used
  - _Requirements: 6.4, 6.6, 6.7, 14.5_

- [x] 7. Add visualMode UI to popup
  - Added light/dark select to `popup.html`
  - Added select styles to `popup.css`
  - Wired change event in `popup.ts` to save and notify content scripts
  - Added info banner for injection status (shown when no native pin exists)
  - _Requirements: 5.2, 6a.1, 6a.2, 6a.3, 11.7_

- [x] 8. Update all unit and integration tests
  - Updated popup/storage tests: undefined for first launch, throws on error
  - Updated utils/storage tests: undefined not [], throws on malformed JSON
  - Updated dom-builder tests: classes parameter required
  - Updated injector tests: returns false without CSS template
  - Updated core-logic-browser-independence tests: pass classes parameter
  - Updated content-script integration: add native pinned service
  - Updated error-scenarios integration: test errors surface, not swallowed
  - All 384 tests pass
  - _Requirements: 10_

---

## Remaining Tasks

### Phase: Visual Mode Refinement

- [ ] 18. Test visual mode on real AWS Console
  - Verify radio click triggers full theme change on fresh account login
  - Verify `waitForElement` timing is sufficient for SPA render
  - Test with slow network conditions
  - _Requirements: 5.4, 5.5, 5.6, 5.7, 5.8_

### Phase: Build and Release

- [ ] 19. Build and package extensions
  - Run `make build-chrome` and `make build-firefox`
  - Verify dist directory includes new `settings.js` file
  - Verify popup.html includes visualMode select
  - Verify popup.css includes info-banner and select styles
  - _Requirements: 9_

- [ ] 20. Manual end-to-end testing
  - Install in Chrome: verify cross-account favorites, visualMode, injection status note
  - Install in Firefox: verify same
  - Test: pin one native service → note disappears on popup reopen
  - Test: unpin all native services → note appears on popup reopen
  - Test: switch visual mode → theme changes on all accounts
  - Test: new account login → visual mode applied after page loads
  - _Requirements: 5, 6, 6a_

---

## Commands

- **Build**: `npm run build:all` or `make build-all`
- **Test**: `npm test` or `npm run test:coverage`
- **Type check**: `npm run type-check` or `npx tsc --noEmit`
- **Develop**: `npm run watch` for TypeScript watch mode
- **Chrome**: Load unpacked extension from `dist/` directory
- **Firefox**: Load temporary add-on from `dist/firefox/` directory
