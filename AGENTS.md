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
├── changelogs/                   # Version release notes (e.g., v1.3.0.md, v1.4.0.md, v1.4.1.md)
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
│   ├── browser-api.ts            # Cross-browser runtime & tabs API interface
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
│   │   └── default-icons.json    # Static icon fallback map for instantaneous rendering
│   ├── quickbar/
│   │   ├── css-extractor.ts      # Scrapes CSS class names from 1st native favorite
│   │   ├── dom-builder.ts        # Builds DOM nodes using extracted classes
│   │   └── injector.ts           # Injects custom DOM nodes into favorites bar
│   └── popup/
│       ├── storage.ts            # Popup storage getters/setters (sync & local)
│       ├── search.ts             # In-memory service search & filter
│       ├── ui-state.ts           # Error, empty state, & storage warning banners
│       ├── service-item.ts       # Builds service item DOM rows for popup list
│       ├── service-click-handler.ts # Pin/unpin click handler
│       ├── service-list-renderer.ts # Renders list with drag-and-drop support
│       └── drag-drop.ts          # HTML5 drag-and-drop reordering handler
├── tests/
│   ├── unit/                     # Unit test suites mirroring src/ (Vitest)
│   ├── integration/              # End-to-end workflow & property tests (Vitest)
│   ├── e2e/                      # Browser E2E & visual regression tests (Playwright, 14 specs, 34 tests)
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
| `browser.storage.sync` | `visualMode` | `'light' \| 'dark'` | User theme override preference (Default: `'dark'`). |
| `browser.storage.local` | `cachedServices` | `Service[]` | Scraped services cache (`id`, `name`, `iconUrl`, `consoleUrl`, `source`). |
| `browser.storage.local` | `injectionStatus` | `'success' \| 'no-native-pin'` | Communicates DOM injection status from content script to popup UI. |
| `localStorage` (page) | `aws-favorites-quickbar-services` | `string (JSON)` | Fast in-page synchronous cache for instant content script rendering. |

---

## 6. Build & Test Commands

All checks and builds can be executed via `npm` or `make`:

```bash
# Full verification (type-check, lint, format check, and all test suites)
npm run check:all
# or: make check-all

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

All Chrome E2E tests run via Playwright with a persistent Chrome profile (`.e2e-profile/chrome`) and the extension loaded via `--load-extension`. The suite spans **14 spec files (34 tests)** covering:
- **Core workflows**: Quickbar injection (`quickbar-mount.spec.ts`), popup interactions (`popup.spec.ts`), cross-tab synchronization (`cross-tab-sync.spec.ts`), theme switching (`theme.spec.ts`), navigation across Console services (`recently-visited-navigation.spec.ts`).
- **Visual regression**: Dark/Light visual screenshots (`popup-visual.spec.ts`, `firefox-visual.spec.ts`).
- **Stress testing**: Randomized subsets & 220-service catalog pool testing with seeded PRNG (mulberry32) for deterministic reproduction (`quickbar-random.spec.ts`, `quickbar-pool-random.spec.ts`).
- **Architectural rules & gap hardening**: First-launch undefined handling (Rule 1), nested service IDs (Rule 4), `no-native-pin` popup warning linkage (Rule 3), runtime `updateQuickbar` message channel, and storage lifecycle persistence (`coverage-gaps.spec.ts`).

```bash
npm run test:e2e          # Build + run all Playwright E2E tests
npm run test:e2e:login    # Interactive browser helper to refresh AWS Console login
npx playwright test       # Run E2E tests only (assumes dist/chrome exists)
```

### Firefox — Manual Verification (web-ext)

> **⚠️ Known Issue: [Playwright #42082](https://github.com/microsoft/playwright/issues/42082)**
>
> Playwright cannot launch Firefox on **macOS 27** ("Golden Gate"). The macOS kernel-level sandbox kills Firefox's `plugin-container` child process with **signal 9** (`SIGKILL`). This affects both Playwright's bundled Nightly and the system-installed Firefox, in both headless and headed modes. The error is:
>
> ```
> sandbox_extension_issue_file_to_process failed for
>   .../plugin-container.app: 1 (Operation not permitted)
> [Parent, IPC I/O Parent] WARNING: process exited on signal 9
> ```
>
> **Chromium and WebKit are unaffected.** This is purely a Firefox + macOS 27 sandbox incompatibility.

Until Playwright resolves #42082, Firefox E2E testing is done manually:

```bash
npm run run:firefox       # Build + launch system Firefox with extension via web-ext
```

Existing automated Firefox tests (`tests/e2e/firefox.spec.ts`, `tests/e2e/firefox-visual.spec.ts`) validate the **Firefox distribution artifacts** (manifest, AMO linting, DOM structure, visual screenshots) using Playwright's Chromium engine to load the `dist/firefox/` build output. These are **not** true Firefox-engine tests but ensure packaging correctness.

**When #42082 is resolved:** migrate Firefox E2E to use `firefox.launchPersistentContext()` with the profile at `.e2e-profile/firefox` pre-loaded with the extension (`aws-favorites-quickbar@8its.pixel`).

---

## 9. Dependency Limitations & Upstream Blockers

### TypeScript v7 Incompatibility (`@typescript-eslint`)

> **⚠️ Known Issue: [@typescript-eslint #10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)**
>
> The project currently runs on **TypeScript v6 (`^6.0.3`)**. Upgrading to **TypeScript v7 (`^7.0.2`)** is blocked by the ESLint tooling ecosystem:
>
> - **Source code & tests**: Fully compatible. Compiles with 0 errors on TS 7 (`tsc --noEmit`), and all 441 unit/integration tests pass.
> - **Blocker**: `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` (v8.70.0) strictly enforce `typescript: ">=4.8.4 <6.1.0"`. Running `eslint` under TS 7 throws a fatal error (`Error: typescript-eslint does not support TS 7.0.`) because TS 7 overhauled the internal compiler architecture.
>
> **When to upgrade:** Re-evaluate upgrading to TS 7 once `@typescript-eslint` officially releases support for TypeScript >= 7.1 (tracked in issue #10940).
