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
├── .kiro/specs/                  # Original design and requirements specifications
├── changelogs/                   # Version release notes (e.g., v1.3.0.md, v1.4.0.md)
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
│   │   └── service-merger.ts     # Merges pinned + recent items with deduplication
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
│   ├── unit/                     # Unit test suites mirroring src/
│   ├── integration/              # End-to-end workflow & property tests
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
