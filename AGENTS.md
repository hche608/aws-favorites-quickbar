# AWS Favorites Quickbar — Agent & Developer Guide

This document is the single source of truth and architectural reference for AI coding agents and developers working on the **AWS Favorites Quickbar** codebase.

---

## 1. Project Purpose & Core Value

- **The Problem:** AWS Console favorites are per-account and per-role. Switching between multiple AWS accounts (dev, staging, prod, shared services) loses the favorites bar, forcing tedious manual re-pinning.
- **The Solution:** A cross-browser extension (Chrome & Firefox MV3) that stores pinned favorites locally in the browser (`browser.storage.sync`), automatically scrapes and merges the console's "Recently Visited" services, and dynamically clones native AWS styling to inject a seamless, unified quickbar across all AWS accounts.

---

## 2. Non-Negotiable Architectural Rules

Every modification to this repository **must** adhere to these 6 principles:

1. **No Fallback Patterns**
   - Do NOT write fallback heuristics or silent safety nets (e.g., `try/catch` that swallows errors, cascading regexes, or `storage.get() || default`).
   - `undefined` explicitly means "not initialized / first launch".
   - First-launch and returning-user states MUST be distinct, explicit conditional branches.
   - If an operation fails, surface the error and fix the root cause.

2. **Under 300 Lines of Code per File**
   - Every source and test file must remain under 300 lines of code.
   - Maintain single responsibility per module. Split files before adding bloat.

3. **Dynamic CSS Extraction (No Hardcoded AWS Classes)**
   - Never hardcode AWS Polaris/CloudScape CSS class names (e.g., `awsui_...`, `wrapper-0-1-...`).
   - CSS classes are extracted dynamically at runtime from the user's first native pinned service (`quickbar/css-extractor.ts`).
   - If no native pinned service exists, injection gracefully halts with status `'no-native-pin'`, and the popup displays an informational note.

4. **Service ID Extraction via `/<serviceId>/home`**
   - Service IDs must **always** be parsed using the pattern `/\/([^\/]+)\/home/` (e.g., `urlObj.pathname.match(/\/([^\/]+)\/home/)`).
   - **Never** extract just the first path segment (`/^\/([^\/]+)/`). Nested services like CodeBuild (`/codesuite/codebuild/home`) and CodePipeline (`/codesuite/codepipeline/home`) share the `/codesuite/` umbrella and must be distinguished by the segment immediately preceding `/home`.

5. **Simulated Native Theme Switching**
   - `visualMode` ('light' | 'dark') overrides per-account console themes.
   - Do NOT directly inject or mutate body CSS classes.
   - Wait for `[data-testid="visualModeRadioGroup"]` and simulate a `click` + `change` event on the matching radio input. This triggers AWS Console's internal state machine, storage, and styling natively.

6. **Cross-Browser Independence**
   - Core business logic interacts exclusively with the `BrowserAPI` / `BrowserStorageAPI` interfaces (`browser-api.ts`, `browser-storage.ts`).
   - Do NOT call global `chrome.*` or `browser.*` directly in service or utility modules.

---

## 3. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AWS Console Web Page                            │
│                                                                        │
│  1. Page Load                                                          │
│     └─► content.ts initialized                                         │
│                                                                        │
│  2. Theme Synchronization (settings.ts)                                │
│     └─► Simulates click on [data-testid="visualModeRadioGroup"]        │
│                                                                        │
│  3. Scraping & Parsing                                                 │
│     ├─► recently-visited-parser.ts parses "Recently Visited" widget    │
│     │   (extracts service ID via /<serviceId>/home)                    │
│     └─► icon-extractor.ts scrapes CDN SVG icons                        │
│                                                                        │
│  4. Data Merging (service-merger.ts)                                   │
│     ├─► Pinned User Favorites (from browser.storage.sync) FIRST        │
│     ├─► Recently Visited Services SECOND (deduplicated against pins)   │
│     └─► Capped at maxServices                                          │
│                                                                        │
│  5. Quickbar Injection (quickbar/)                                     │
│     ├─► css-extractor.ts extracts native classes from 1st pinned item  │
│     ├─► dom-builder.ts builds cloned <li> anchors                      │
│     └─► injector.ts mounts items into native navbar list               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Repository Directory Map

```
aws-favorites-quickbar/
├── docs/                         # Architecture design, testing specs, requirements, and E2E reports
├── changelogs/                   # Version release notes (e.g., v1.3.0.md, v1.4.0.md, v1.4.1.md, v1.5.0.md, v1.5.1.md)
├── scripts/
│   ├── bundle.ts                 # esbuild bundler script (supports dev and prod)
│   ├── build-chrome.sh           # Builds and packages Chrome zip distribution
│   ├── build-firefox.sh          # Builds and packages Firefox zip distribution
│   └── security-check.ts         # Comprehensive security and audit runner
├── src/
│   ├── content.ts                # Content script entry point & pipeline coordinator
│   ├── settings.ts               # Settings loading & visualMode radio clicker
│   ├── popup.ts                  # Popup entry point & UI coordinator
│   ├── types.ts                  # Shared interfaces, models, & STORAGE_DEFAULTS
│   ├── browser-api.ts            # Cross-browser storage re-export & browser-type detection
│   ├── browser-storage.ts        # Cross-browser storage API wrapper
│   ├── utils/
│   │   ├── dom.ts                # DOM MutationObserver (waitForElement) & URL checks
│   │   ├── storage.ts            # Dual storage (localStorage cache + browser.storage)
│   │   └── region.ts             # AWS region resolution (URL search params / storage)
│   ├── services/
│   │   ├── recently-visited-parser.ts # Scrapes Recently Visited widget (strict /<id>/home)
│   │   ├── icon-extractor.ts     # Extracts console icon URLs (strict /<id>/home)
│   │   ├── icon-validator.ts     # Validates SVG/HTTPS icon URLs
│   │   ├── service-merger.ts     # Merges pinned + recent items with deduplication
│   │   ├── service-icons.ts      # Built-in CDN icons catalog for 220 AWS services
│   │   ├── service-catalog.ts    # Service name formatting & catalog/unified search pool
│   │   └── default-icons.json    # Static icon fallback map for instantaneous rendering
│   ├── features/
│   │   └── codepipeline/         # CodePipeline execution hover preview engine
│   │       ├── api.ts            # Main-world message requester & response listener
│   │       ├── cache.ts          # TTL state cache with stale-while-revalidate
│   │       ├── hover-detector.ts # Pipeline link hover detector & delay debouncer
│   │       ├── main-world.ts     # Injected script with Console SigV4 signer
│   │       ├── pipeline-parser.ts# Pipeline link parser & ARN extractor
│   │       ├── pipeline-service.ts# Execution query & cache coordination
│   │       ├── popover-dom.ts    # Floating popover DOM builder with stage cards
│   │       ├── popover-renderer.ts# Viewport collision positioning & popover lifecycle
│   │       ├── popover-styles.ts # Injected CSS & flowing light beam animations
│   │       ├── popover-theme.ts  # VisualMode & CloudScape theme color resolution
│   │       ├── sigv4-signer.ts   # Web Crypto SigV4 signer for GetPipelineState
│   │       └── types.ts          # CodePipeline domain models & message types
│   ├── quickbar/
│   │   ├── css-extractor.ts      # Scrapes CSS class names from 1st native favorite
│   │   ├── dom-builder.ts        # Builds DOM nodes using extracted classes
│   │   ├── injector.ts           # Injects custom DOM nodes into favorites bar
│   │   └── content-updater.ts    # Builds favorite Service[] & background icon refresh
│   └── popup/
│       ├── storage.ts            # Popup storage getters/setters (sync & local)
│       ├── search.ts             # In-memory service search & filter
│       ├── ui-state.ts           # Error, empty state, & storage warning banners
│       ├── service-item.ts       # Builds service item DOM rows for popup list
│       ├── service-click-handler.ts # Pin/unpin click handler
│       ├── service-list-renderer.ts # Renders list with drag-and-drop support
│       └── drag-drop.ts          # HTML5 drag-and-drop reordering handler
├── tests/
│   ├── unit/                     # Unit test suites mirroring src/ (Vitest, 41 test files)
│   │   └── features/codepipeline/# CodePipeline parser & model unit tests
│   ├── integration/              # End-to-end workflow & property tests (Vitest)
│   ├── e2e/                      # Browser E2E & visual regression tests (Playwright, 16 specs, 38 tests)
│   │   ├── popup-layout-invariants.spec.ts    # Offline UI layout & zero-overflow invariant
│   │   └── codepipeline-hover-invariants.spec.ts # Offline CodePipeline popover invariant
│   └── helpers/                  # Test DOM, mock storage, & mock browser APIs
├── manifest.json                 # Manifest V3 configuration for Chrome
├── manifest.firefox.json         # Manifest V3 overrides for Firefox (gecko ID)
├── mise.toml                     # Runtime environment config (Node 24)
├── Makefile                      # Build automation targets
└── package.json                  # Dependencies, scripts, and build metadata
```

---

## 5. Storage Schema & Keys

| Storage Type | Key | Type | Description |
| :--- | :--- | :--- | :--- |
| `browser.storage.sync` | `userFavorites` | `string[]` | Ordered list of pinned service IDs (e.g. `['ec2', 's3', 'codebuild']`). |
| `browser.storage.sync` | `maxServices` | `number` | Maximum total services to display in quickbar (Default: `10`, range: `1–50`). |
| `browser.storage.sync` | `visualMode` | `'light' \| 'dark'` | User theme override preference (Default: `'light'`). |
| `browser.storage.sync` | `enableCodePipelineHoverPreview` | `boolean` | Enable/disable live CodePipeline execution preview popover on hover (Default: `true`). |
| `browser.storage.sync` | `codePipelineHoverDelayMs` | `number` | Milliseconds of hover delay before fetching and displaying popover (Default: `1000`, range: `500–3000`). |
| `browser.storage.local` | `cachedServices` | `Service[]` | Scraped services cache (`id`, `name`, `iconUrl`, `consoleUrl`, `source`). |
| `browser.storage.local` | `injectionStatus` | `'success' \| 'no-native-pin'` | Communicates DOM injection status from content script to popup UI. |
| `localStorage` (page) | `awsFavoritesQuickbar_services` | `string (JSON)` | Fast in-page synchronous cache for instant content script rendering. |

---

## 6. Build & Test Commands

All checks and builds can be executed via `npm` or `make`:

```bash
# Full verification (type-check, lint, format check, and all test suites)
npm run check:all
# or: make check-all

# Run offline code-based UI layout invariant tests (fast, no AWS credentials needed)
npm run test:ui:offline

# Run live Playwright E2E tests against real AWS Console
npm run test:e2e

# Build production zip distributions for Chrome & Firefox
make build-all
# Output:
#  - dist/chrome/ & aws-favorites-quickbar-chrome.zip
#  - dist/firefox/ & aws-favorites-quickbar-firefox.zip

# Run tests in watch mode
npm run test:watch

# Auto-format and lint fix
npm run format
npm run lint:fix
```

---

## 7. Common Pitfalls & Guardrails for Agents

- ❌ **Do not parse service IDs from the first segment**: `/codesuite/codebuild/home` is `codebuild`, NOT `codesuite`.
- ❌ **Do not use fallback defaults for undefined storage**: `loadUserFavorites()` returning `undefined` means first launch; do not return an empty array silently inside the storage helper.
- ❌ **Do not exceed 300 LOC**: If a module approaches 300 lines, extract helper logic into a sub-module.
- ❌ **Do not rely on hardcoded class names**: AWS Console frequently hashes/changes Polaris class names. Always use `css-extractor.ts`.

---

## 8. E2E Testing Strategy & Known Limitations

### Chrome — Fully Automated (Playwright)

All Chrome E2E tests run via Playwright. The test suite spans **16 spec files (38 tests)** divided into two execution tiers:

1. **Offline Code-Based UI Layout Invariant Tests (`npm run test:ui:offline`)**:
   - Executes purely offline without requiring AWS network access, live cookies, or SSO sessions.
   - `popup-layout-invariants.spec.ts`: Asserts zero horizontal overflow (`scrollWidth <= clientWidth`), non-overlapping 2-row layout geometry, and interactive delay dropdown disabling in the standard 420x590 popup viewport.
   - `codepipeline-hover-invariants.spec.ts`: Uses Playwright route mocks to simulate AWS Console pages and SigV4 signed API responses, verifying popover viewport bounds, flowing beam class attachment, and Escape key dismissal. Runs in ~7 seconds.

2. **Live Console E2E & Visual Regression (`npm run test:e2e`)**:
   - Uses a persistent Chrome profile (`.e2e-profile/chrome`) with `--load-extension`.
   - **Core workflows**: Quickbar injection (`quickbar-mount.spec.ts`), popup interactions (`popup.spec.ts`), cross-tab synchronization (`cross-tab-sync.spec.ts`), theme switching (`theme.spec.ts`), navigation across Console services (`recently-visited-navigation.spec.ts`).
   - **Visual regression**: Dark/Light visual screenshots (`popup-visual.spec.ts`, `firefox-visual.spec.ts`).
   - **Stress testing**: Randomized subsets & 220-service catalog pool testing with seeded PRNG (mulberry32) for deterministic reproduction (`quickbar-random.spec.ts`, `quickbar-pool-random.spec.ts`).
   - **Architectural rules & gap hardening**: First-launch undefined handling (Rule 1), nested service IDs (Rule 4), `no-native-pin` popup warning linkage (Rule 3), the `storage.onChanged` cross-tab sync channel (popup → content script), and storage lifecycle persistence (`coverage-gaps.spec.ts`).

```bash
npm run test:ui:offline   # Fast code-based UI layout invariant checks (offline, ~7s)
npm run test:e2e          # Build + run all Playwright E2E tests
npm run test:e2e:login    # Interactive browser helper to refresh AWS Console login
npx playwright test       # Run E2E tests only (assumes dist/chrome exists)
```

### Firefox — Fully Automated In-Engine Testing (`npm run test:firefox`)

Firefox automated tests run directly on Playwright's Firefox engine (`--browser=firefox`). The automated suite spans **3 spec files (8 tests)**:

1. **Official Mozilla Add-ons (AMO) & Packaging Validation (`tests/e2e/firefox.spec.ts`)**:
   - Asserts valid zip packaging (`aws-favorites-quickbar-firefox.zip`) and non-zero distribution asset sizes.
   - Enforces official Mozilla `web-ext lint` compliance: strictly **0 errors, 0 warnings, 0 notices** (including zero `UNSAFE_VAR_ASSIGNMENT` innerHTML warnings).
   - Validates strict Firefox MV3 Gecko manifest requirements (Gecko extension ID, permissions, isolated content script, and MAIN world script).
   - Verifies popup HTML DOM structure rendering.

2. **In-Engine Visual & Interactive Automation (`tests/e2e/firefox-visual.spec.ts`)**:
   - Runs in real Firefox (`--browser=firefox`) with the bundled Firefox engine.
   - Asserts Dark Mode and Light Mode popup UI layout geometry and captures visual screenshots (`firefox-popup-dark.png`).
   - Tests interactive service search filtering, clear button, and theme toggling in Firefox (`firefox-popup-search.png`).

3. **CodePipeline Hover & Flowing Beam In-Engine Automation (`tests/e2e/firefox-codepipeline.spec.ts`)**:
   - In real Firefox, renders the CodePipeline hover popover and asserts the stylesheet is mounted in `document.head` (`aws-favorites-codepipeline-styles`).
   - Verifies computed animation styles for `.stage-in-progress` and `.stage-failed` (`animationName` contains `stage-beam-flow`), capturing visual screenshots (`firefox-popover-beam.png`).
   - Tests cross-world `window.postMessage` structured clone bridge roundtrip without triggering Firefox Xray vision security exceptions.

```bash
npm run test:firefox      # Build Firefox package + run all 8 Firefox tests in real Firefox engine (~8s)
npm run run:firefox       # Interactive launch of system Firefox with extension via web-ext
```

---

## 9. Dependency Limitations & Upstream Blockers

### TypeScript v7 Incompatibility (`@typescript-eslint`)

> **⚠️ Known Issue: [@typescript-eslint #10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)**
>
> The project currently runs on **TypeScript v6 (`^6.0.3`)**. Upgrading to **TypeScript v7 (`^7.0.2`)** is blocked by the ESLint tooling ecosystem:
>
> - **Source code & tests**: Fully compatible. Compiles with 0 errors on TS 7 (`tsc --noEmit`), and all 516 unit/integration tests pass.
> - **Blocker**: `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` strictly enforce `typescript: ">=4.8.4 <6.1.0"`. Running `eslint` under TS 7 throws a fatal error (`Error: typescript-eslint does not support TS 7.0.`) because TS 7 overhauled the internal compiler architecture.
> - **Dependabot Guard**: `.github/dependabot.yml` explicitly ignores major updates for `typescript` (`version-update:semver-major`) to keep PR builds clean until tooling catches up.
>
> **When to upgrade:** Re-evaluate upgrading to TS 7 once `@typescript-eslint` officially releases support for TypeScript >= 7.1 (tracked in issue #10940).
