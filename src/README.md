# Source Code Structure

Clean, modular architecture for AWS Favorites Quickbar extension.

## Directory Structure

```
src/
├── content.js                    # Content script entry point
├── popup.js                      # Popup UI entry point
├── utils/                        # Shared utilities
│   ├── dom.js                   # DOM utilities, MutationObserver
│   ├── storage.js               # localStorage + chrome.storage
│   └── region.js                # AWS region detection
├── services/                     # Service-related logic
│   ├── icon-extractor.js        # Extract icons from AWS Console
│   ├── icon-validator.js        # Validate & update icon URLs
│   ├── recently-visited-parser.js # Parse Recently Visited widget
│   └── service-merger.js        # Merge pinned + recent services
├── quickbar/                     # Quickbar injection
│   ├── css-extractor.js         # Extract CSS from native favorites
│   ├── dom-builder.js           # Build service link elements
│   └── injector.js              # Inject services into quickbar
└── popup/                        # Popup UI modules
    ├── storage.js               # Popup storage operations
    ├── search.js                # Service search/filter
    ├── ui-state.js              # UI state management
    ├── service-item.js          # Service item DOM builder
    └── drag-drop.js             # Drag-and-drop handlers
```

## Module Responsibilities

### Content Script

**`content.js`**
Main orchestrator - coordinates all modules, handles initialization and message passing.

**`utils/`**
- **dom.js**: MutationObserver-based element detection, page type checks
- **storage.js**: Dual storage (localStorage + chrome.storage)
- **region.js**: AWS region detection from URL/localStorage

**`services/`**
- **icon-extractor.js**: Scrapes AWS CDN icon URLs from console DOM
- **icon-validator.js**: Validates icons (format, length, loads image)
- **recently-visited-parser.js**: Parses Recently Visited widget
- **service-merger.js**: Merges pinned + recent, deduplicates by ID

**`quickbar/`**
- **css-extractor.js**: Extracts CSS classes from native AWS favorites
- **dom-builder.js**: Creates service link DOM elements
- **injector.js**: Injects services with duplicate filtering

### Popup UI

**`popup.js`**
Main popup coordinator - manages state, event handlers, rendering.

**`popup/`**
- **storage.js**: Chrome storage operations (favorites, settings)
- **search.js**: Service search and filtering
- **ui-state.js**: Error/empty state management, warnings
- **service-item.js**: Service item DOM builder
- **drag-drop.js**: Drag-and-drop reordering logic

## Key Features

- **ES6 Modules**: Clean imports/exports
- **Single Responsibility**: Each module has one clear purpose
- **~50-150 lines per file**: Easy to read and maintain
- **Performance**: MutationObserver, parallel execution, ~1s injection
