# Source Code Structure

Clean, modular TypeScript architecture for AWS Favorites Quickbar extension.

## Directory Structure

```
src/
├── content.ts                    # Content script entry point
├── settings.ts                   # Settings loading + visual mode
├── popup.ts                      # Popup UI entry point
├── types.ts                      # Shared type definitions
├── browser-api.ts                # Cross-browser API layer (runtime, tabs)
├── browser-storage.ts            # Cross-browser storage API layer
├── utils/                        # Shared utilities
│   ├── dom.ts                   # DOM utilities, MutationObserver
│   ├── storage.ts               # localStorage + browser.storage
│   └── region.ts                # AWS region detection
├── services/                     # Service-related logic
│   ├── icon-extractor.ts        # Extract icons from AWS Console
│   ├── icon-validator.ts        # Validate & update icon URLs
│   ├── recently-visited-parser.ts # Parse Recently Visited widget
│   └── service-merger.ts        # Merge pinned + recent services
├── quickbar/                     # Quickbar injection
│   ├── css-extractor.ts         # Extract CSS from native favorites
│   ├── dom-builder.ts           # Build service link elements
│   └── injector.ts              # Inject services into quickbar
└── popup/                        # Popup UI modules
    ├── storage.ts               # Popup storage operations
    ├── search.ts                # Service search/filter
    ├── ui-state.ts              # UI state management
    ├── service-item.ts          # Service item DOM builder
    ├── service-click-handler.ts # Click handler for pinning
    ├── service-list-renderer.ts # Service list rendering
    └── drag-drop.ts             # Drag-and-drop handlers
```

## Module Responsibilities

### Content Script

**`content.ts`**
Main orchestrator — coordinates all modules, handles initialization and message passing. Flow: load settings → apply visual mode → parse recently visited → merge → cap at maxServices → inject.

**`settings.ts`**
Loads settings from storage with explicit first-launch vs returning-user paths. Applies visual mode by simulating a click on AWS Console's theme radio group.

**`types.ts`**
All shared interfaces: `Service`, `VisualMode`, `AWSFavoriteClasses`, `StorageData`, `STORAGE_DEFAULTS`.

**`browser-api.ts` / `browser-storage.ts`**
Cross-browser compatibility layer. Wraps Chrome callbacks into Promises, passes through Firefox's native Promise-based APIs. Single interface for all core logic.

### Utilities

**`utils/dom.ts`**
MutationObserver-based element detection (`waitForElement`), page type checks (`isAWSConsolePage`, `isAWSConsoleHomepage`).

**`utils/storage.ts`**
Dual storage (localStorage for cache + browser.storage for persistence). Returns `undefined` when no data exists — never falls back to defaults.

**`utils/region.ts`**
AWS region detection from URL parameters or localStorage.

### Services

**`services/icon-extractor.ts`**
Scrapes AWS CDN icon URLs from console DOM elements.

**`services/icon-validator.ts`**
Validates icons (format, URL, loads image successfully).

**`services/recently-visited-parser.ts`**
Parses the "Recently Visited" widget from AWS Console homepage.

**`services/service-merger.ts`**
Merges pinned favorites + recently visited. Pinned first (user order), then recent (deduped). No maxServices cap — caller handles that.

### Quickbar

**`quickbar/css-extractor.ts`**
Extracts CSS classes from the first native pinned service. Returns `null` if none exists.

**`quickbar/dom-builder.ts`**
Creates service link DOM elements. Requires CSS classes parameter — never uses hardcoded classes.

**`quickbar/injector.ts`**
Injects services into the quickbar. Stops if no CSS template available (no native pinned service). Removes previously injected items before re-injecting.

### Popup UI

**`popup.ts`**
Main popup coordinator — manages state, event handlers, settings UI (maxServices, visualMode), service list rendering.

**`popup/storage.ts`**
Browser storage operations for favorites, maxServices, visualMode, cached services. Returns `undefined` for uninitialized values. Throws on errors.

**`popup/search.ts`**
Service search and filtering by name.

**`popup/ui-state.ts`**
Error state, empty state, and warning banner management.

**`popup/service-item.ts`**
Service item DOM builder for the popup list.

**`popup/service-click-handler.ts`**
Click handler for pinning/unpinning services.

**`popup/service-list-renderer.ts`**
Renders the service list with current favorites state.

**`popup/drag-drop.ts`**
Drag-and-drop reordering logic for pinned favorites.

## Coding Rules

- **No fallback patterns** — `undefined` means "not initialized", errors propagate
- **Explicit conditionals** — first-launch vs returning-user are distinct code paths
- **No hardcoded CSS** — extracted dynamically from native AWS favorites
- **Single responsibility** — each module does one thing
- **Under 300 lines per file** — easy to read and maintain
- **Dependencies are injectable** — functions take interfaces, not globals
- **TypeScript strict mode** — strict null checks, no implicit any
