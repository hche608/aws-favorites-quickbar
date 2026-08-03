# Design Document: AWS Favorites Quickbar

## Problem Statement

When working with multiple AWS accounts, users must manually configure their favorites bar in each account separately. AWS does not sync favorites across accounts — every time you switch to a new account or assume a new role, you start with an empty or default favorites bar. This creates repetitive, tedious work for engineers and operators who regularly switch between AWS accounts (dev, staging, production, shared services, etc.).

Additionally, the native AWS favorites bar requires users to explicitly pin every service they want quick access to. There is no intelligence around surfacing services you recently used but haven't pinned yet.

## Core Problem

**AWS favorites are per-account and do not carry over when you switch accounts.**

A user who has carefully curated their favorites in one account loses that configuration entirely when they log into a different account. They must repeat the setup process from scratch — clicking through menus, searching for services, and pinning them one by one.

## User Pain Points

1. **Repetitive setup across accounts** — Engineers working across 5, 10, or more AWS accounts must repeat favorites configuration in each one.
2. **Lost context on account switch** — Switching accounts means losing quick access to your most-used services until you manually re-pin them.
3. **No memory of recently accessed services** — The native favorites bar doesn't surface services you visited recently but haven't explicitly pinned.
4. **Time wasted navigating** — Without a populated favorites bar, users must search or browse the full service list repeatedly.

## Solution

A browser extension that:

1. **Stores your pinned favorites locally in the browser** — Your favorite services persist across all AWS accounts because they live in browser storage, not in AWS account settings.
2. **Requires minimal setup per new account** — In a new AWS account, the user only needs to manually pin one service. After that first interaction, the extension takes over.
3. **Automatically injects recently accessed services into the quickbar** — The extension reads the "Recently Visited" widget from the AWS Console and merges those services into your quickbar, giving you instant access without manual pinning.
4. **Works across all AWS accounts seamlessly** — Because favorites are stored in the browser (not per-account), switching accounts doesn't lose your configuration.

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                   User's Browser                         │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Browser Extension Storage                 │  │
│  │                                                   │  │
│  │  • Pinned favorites (user-configured)             │  │
│  │  • Service metadata (icons, URLs)                 │  │
│  │  • Max services preference                       │  │
│  │  • Visual mode preference (light/dark)            │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                               │
│                         ▼                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │           Content Script (injected)               │  │
│  │                                                   │  │
│  │  1. Detect AWS Console page                       │  │
│  │  2. Read "Recently Visited" services              │  │
│  │  3. Merge with stored pinned favorites            │  │
│  │  4. Inject combined list into quickbar            │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                               │
│           ┌─────────────┼─────────────┐                 │
│           ▼             ▼             ▼                 │
│     AWS Account A  AWS Account B  AWS Account C         │
│     (same bar)     (same bar)     (same bar)           │
└─────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Storage is browser-local, not account-specific

Favorites live in the browser's extension storage (`browser.storage.local`). This is the fundamental insight — by decoupling favorites from AWS account state, the extension solves the cross-account problem entirely.

### 2. Minimal friction to bootstrap a new account

The user only needs to visit one AWS service in a new account. The extension picks up that visit via the "Recently Visited" widget and begins populating the quickbar automatically. Previously pinned favorites from other accounts appear immediately.

### 3. Merge strategy: user pins take priority

The quickbar displays services in this order:
1. **User-pinned favorites** — always shown first, in the user's chosen order
2. **Recently visited services** — auto-populated from AWS Console's "Recently Visited" widget, filling remaining slots

Duplicates are removed (if a recently visited service is already pinned, it only appears once in the pinned section).

### 4. CSS class extraction for native look-and-feel

The extension reads CSS classes from the native AWS favorites bar elements so injected items look identical to native ones. This keeps the experience seamless — users can't tell which items are native and which are injected.

### 5. Popup for management

A browser popup provides a UI for:
- Viewing all available services
- Pinning/unpinning services
- Reordering pinned favorites via drag-and-drop
- Searching services
- Configuring max services to display

## Scope

### What the extension does

- Persists favorite services in browser storage (cross-account)
- Injects pinned favorites into the AWS Console quickbar
- Automatically surfaces recently visited services
- Provides a popup UI for managing favorites
- Matches native AWS Console styling

### What the extension does NOT do

- Sync favorites between browsers or devices
- Modify any AWS account settings
- Send data to any external server
- Require any AWS permissions or API keys
- Work outside of the AWS Console

## Scenarios: Storage Initialization

### Scenario 1: First Launch (no data in local storage)

The user has just installed the extension. Browser storage is empty.

**Behavior:**
- Storage returns empty/undefined for all keys
- Extension applies default settings:
  - `userFavorites`: empty list (`[]`)
  - `maxServices`: default value (e.g., 10)
  - `visualMode`: default value (`light`)
- The quickbar relies entirely on "Recently Visited" services from the AWS Console DOM
- Defaults are written to storage on first use so subsequent loads have a baseline

```
Install → Open AWS Console → Storage is empty
  → Use defaults (no pinned favorites, default max)
  → Parse "Recently Visited" from page
  → Inject recently visited into quickbar
  → On first pin action, save to storage
```

### Scenario 2: Not First Launch (data exists in local storage)

The user has used the extension before. Storage contains their configured values.

**Behavior:**
- Storage returns existing data for all keys
- Extension uses stored values as-is — **never overwrites with defaults**
- User's pinned favorites, ordering, and preferences are preserved exactly
- "Recently Visited" services are **still parsed from the page** — they are merged with stored favorites
- Merge order: **pinned services first** (user's order), then recently visited (filling remaining slots, duplicates removed)

```
Open AWS Console → Storage has data
  → Load pinned favorites from storage (do NOT override with defaults)
  → Load maxServices from storage (do NOT override with defaults)
  → Load visualMode from storage (do NOT override with defaults)
  → Parse "Recently Visited" from page (always happens)
  → Extract CSS classes from first native pinned service
  → Merge: pinned first (user-defined order), then recently visited (no duplicates)
  → Inject merged list into quickbar, capped at maxServices, using user's visualMode
```

**Merge example:**
```
Stored pinned:       [EC2, S3, Lambda]
Recently Visited:    [RDS, EC2, CloudWatch, S3]

Result in quickbar:  [EC2, S3, Lambda, RDS, CloudWatch]
                      ^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^
                      pinned (user order)  recently visited (deduped)
```

---

## Scenarios: Max Services

The `maxServices` setting controls how many total services appear in the quickbar.

### Default Value

- **Default:** `10`
- Applied on first launch when no value exists in storage

### Scenario: First Launch — maxServices not set

```
Storage: maxServices = undefined
→ Use default: 10
→ Quickbar displays up to 10 services (pinned + recently visited combined)
```

### Scenario: User has changed maxServices

```
Storage: maxServices = 5 (user changed via popup settings)
→ Use stored value: 5
→ Do NOT override with default 10
→ Quickbar displays up to 5 services total
```

### Merge Logic with maxServices

`maxServices` is a **cap on the total output** of the merge — it does not affect how many pinned or recently visited services are loaded. The merge always runs fully, then the result is truncated to `maxServices`.

```
maxServices = 5
Stored pinned:       [EC2, S3, Lambda, DynamoDB, RDS, CloudWatch]  (6 pinned)
Recently Visited:    [ECS, SNS]

Step 1 — Full merge:  [EC2, S3, Lambda, DynamoDB, RDS, CloudWatch, ECS, SNS]
Step 2 — Cap at 5:    [EC2, S3, Lambda, DynamoDB, RDS]

Result: Only the first 5 from the merged list are shown.
```

**Important:** If the user has more pinned services than `maxServices`, pinned services are still shown first — some recently visited (or even some lower-priority pinned) services won't appear. The user controls this trade-off by adjusting `maxServices`.

```
maxServices = 8
Stored pinned:       [EC2, S3, Lambda]       (3 pinned)
Recently Visited:    [RDS, EC2, CloudWatch, ECS, SNS, SQS, Redshift]

Step 1 — Full merge:  [EC2, S3, Lambda, RDS, CloudWatch, ECS, SNS, SQS, Redshift]
                       ^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                       pinned (3)         recently visited, deduped (6)
Step 2 — Cap at 8:    [EC2, S3, Lambda, RDS, CloudWatch, ECS, SNS, SQS]

Result: 3 pinned + 5 recently visited = 8 total (capped).
```

---

## Scenarios: Visual Mode (Light / Dark)

The `visualMode` setting controls whether the quickbar renders in light or dark theme. This is a **user override** — it applies consistently across all AWS accounts, regardless of what theme each individual account has set in AWS Console.

### Modes

| Mode | Description |
|---|---|
| `light` | Light theme |
| `dark` | Dark theme |

### Default Value

- **Default:** `light`
- Applied on first launch when no value exists in storage

### Scenario: First Launch — visualMode not set

```
Storage: visualMode = undefined
→ Use default: "light"
→ Render quickbar items in light theme
```

### Scenario: User has set visualMode to dark

```
Storage: visualMode = "dark"
→ Use stored value: "dark"
→ Do NOT override with default "light"
→ Render quickbar items in dark theme
→ This applies to ALL accounts — even if a specific account's AWS Console is set to light mode
```

### User Preference Overrides Per-Account Setting

The key behavior: if the user sets `visualMode = "dark"` in the extension, **every AWS account** they visit renders the quickbar in dark mode. The per-account AWS Console theme setting is ignored for our injected items.

```
User sets visualMode = "dark" in extension popup

Account A (AWS Console set to light mode) → Quickbar renders in dark mode
Account B (AWS Console set to dark mode)  → Quickbar renders in dark mode
Account C (AWS Console set to light mode) → Quickbar renders in dark mode

All consistent. User's extension preference wins.
```

This is the same principle as cross-account favorites — the extension provides a consistent experience regardless of per-account settings.

### How Styling Works

The extension does not define its own colors, fonts, or layouts. The approach is:

1. **User sets visualMode in the extension** (e.g., `dark`)
2. **Extension simulates a user theme change** — AWS Console has a radio group `[data-testid="visualModeRadioGroup"]` with radio inputs for `default`, `light`, `dark`. The extension waits for this element to appear in the DOM, then clicks the matching radio button.
3. **AWS Console handles the change natively** — its own event handlers fire, updating internal state, localStorage, body class (`awsui-polaris-dark-mode`), and all UI elements.
4. **Extension extracts CSS classes from the first native pinned service** — these classes already match the user's preferred theme because AWS Console has updated the page.
5. **Inject our services using that template** — everything is consistent.

```
User preference: dark mode
  → Extension waits for [data-testid="visualModeRadioGroup"] to appear
  → Finds input[type="radio"][value="dark"]
  → Simulates click (sets checked, dispatches click + change events)
  → AWS Console handles it natively (updates body class, localStorage, re-renders)
  → Native favorites bar is now in dark mode
  → Extension extracts CSS from first native pinned service (now dark-mode classes)
  → Injects services using those dark-mode classes
  → Result: no color mismatch — everything is dark
```

**Why simulate a click instead of directly modifying classes?**
- Directly toggling `awsui-polaris-dark-mode` on `<body>` only changes CSS — AWS Console's internal JavaScript state remains out of sync.
- Simulating the radio click triggers AWS Console's own handlers, keeping everything consistent (localStorage, React state, body class, all components).

**Why wait for the radio group?**
- AWS Console is an SPA — `[data-testid="visualModeRadioGroup"]` may not be rendered when the content script first runs. The extension uses `waitForElement` with a timeout to handle this.

### Testing Requirement

We must confirm during testing that:
1. After simulating the radio click, the body class `awsui-polaris-dark-mode` is added/removed
2. The extension waits for `[data-testid="visualModeRadioGroup"]` before attempting the click
3. If the radio is already in the correct state, no click is dispatched
4. Extracted CSS classes from the first pinned service match the active theme after the change

```
AWS Console loads → User has at least 1 native pinned service
  → Extension loads user's stored visualMode
  → Waits for [data-testid="visualModeRadioGroup"] to appear
  → If visualMode differs from current radio selection: clicks the matching radio
  → AWS Console re-renders page in user's preferred mode
  → Extension reads the first native service element
  → Extracts: li class, anchor class, icon class, label class, DOM structure
  → Uses extracted classes as template for all injected services
  → Injected items are indistinguishable from native items
```

**This is why the user must pin at least one service manually in a new account** — that one native pinned service provides the CSS template for the extension to clone.

### Injection Status Communication

The content script writes `injectionStatus` to `browser.storage.local` after each injection attempt:
- `'success'` — CSS template found, injection succeeded
- `'no-native-pin'` — no native pinned service exists, injection skipped

The popup reads this value to show a helpful note:
- If `injectionStatus` is `'success'` → note is hidden
- If `injectionStatus` is `'no-native-pin'` or missing → popup shows: "You must pin at least one service manually in the AWS Console for the quickbar injection to work."

This is informational, not an error — the user just needs to know the prerequisite.

### Visual Mode Does NOT Affect Merge Logic

Visual mode is purely a rendering concern. It does not change:
- How many services are loaded from storage
- How recently visited services are parsed
- How the merge works
- How `maxServices` caps the total

The data flow is:

```
Load pinned → Parse recently visited → Merge → Cap at maxServices → Inject with user's visualMode
                                                                      ↑
                                                           user's theme preference overrides page theme
```

### Key Rule: Defaults Never Override Stored Data

The two scenarios (first launch vs. returning user) are **distinct code paths**, not a single path with a fallback:

```
if storage is empty (first launch):
  initialize with defaults
  save defaults to storage
else (returning user):
  load from storage
  use stored values directly
```

This is NOT a fallback pattern. We handle each condition explicitly.

### Why This Matters

If the extension incorrectly re-applies defaults on every launch, the user loses:
- Their carefully ordered pinned services
- Their max services preference
- Any customization they made in a previous session

This would break the core value proposition — "configure once, use everywhere."

---

## Coding Rules

### No Fallback Logic — Ever

**Never implement fallback code.** If something doesn't work, we fix it. If there are multiple conditions, we handle each one explicitly.

What this means in practice:

- **No `try/catch` that silently returns a default value.** If an operation fails, surface the error. Fix the root cause.
- **No "if this fails, try that instead" patterns.** Each code path handles a known, expected condition — not a recovery from an unknown failure.
- **No `|| defaultValue` as a safety net.** If a value can legitimately be absent (e.g., first launch), handle that case explicitly with a clear conditional. Don't mask bugs behind defaults.
- **No graceful degradation that hides broken behavior.** If the extension can't read storage, that's a bug to fix — not a condition to silently degrade from.

**Wrong:**
```typescript
// Fallback pattern — hides bugs
const favorites = await storage.get('favorites') || [];
const max = await storage.get('maxServices') || 10;
```

**Right:**
```typescript
// Explicit condition handling — each path is intentional
const data = await storage.get('favorites');
if (data === undefined) {
  // First launch: no data exists yet
  initializeDefaults();
} else {
  // Returning user: use their stored data
  useFavorites(data);
}
```

**Rationale:** Fallback code masks bugs. When something breaks, fallback logic makes it look like everything is fine — the user gets defaults instead of their data, and nobody notices until much later. By handling each condition explicitly and letting failures surface immediately, we catch and fix problems fast.

### Code Style: KISS, Readability, Maintainability, Testability

**KISS — Keep It Simple**
- Do the simplest thing that works. No premature abstractions, no over-engineering.
- A function does one thing. If you need to explain what it does with "and", split it.
- Prefer flat code over nested code. Early returns over deep `if/else` chains.

**Readability — Code is for humans first**
- Name things clearly. A variable name should tell you what it holds without reading surrounding code.
- Functions are short. If you need to scroll to read a function, it's too long.
- No clever tricks. Write boring, obvious code that anyone can understand on first read.
- Group related logic together. Separate unrelated logic into distinct functions or modules.
- Use whitespace intentionally — blank lines separate logical blocks within a function.

**Maintainability — Easy to change later**
- One module = one responsibility. When requirements change, only one file needs to change.
- No shared mutable state between modules. Data flows in through parameters, results flow out through return values.
- Dependencies are explicit — passed in, not imported from globals or singletons.
- No magic numbers or strings. Constants are named and co-located with the code that uses them.

**Testability — Every function is testable in isolation**
- Pure functions wherever possible: same input → same output, no side effects.
- Side effects (DOM manipulation, storage calls) are pushed to the edges — thin wrappers that call pure logic.
- Dependencies are injectable. A function that needs storage takes a storage interface as a parameter, not a hard-coded import.
- No test-only code paths in production code. The production code path IS the test path.

**Wrong:**
```typescript
// Hard to test, hard to read, does too many things
async function init() {
  const el = document.querySelector('.favorites');
  if (el) {
    const data = await chrome.storage.local.get('favs');
    if (data.favs) {
      data.favs.forEach(f => {
        const link = document.createElement('a');
        link.href = f.url;
        link.textContent = f.name;
        el.appendChild(link);
      });
    }
  }
}
```

**Right:**
```typescript
// Each piece is testable, readable, single-responsibility
function buildServiceLink(service: Service): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = service.consoleUrl;
  link.textContent = service.name;
  return link;
}

function renderServices(container: HTMLElement, services: Service[]): void {
  for (const service of services) {
    const link = buildServiceLink(service);
    container.appendChild(link);
  }
}

// Orchestration is separate — thin, calls the pieces
async function init(api: BrowserAPI): Promise<void> {
  const container = document.querySelector('.favorites');
  const data = await api.storage.local.get('userFavorites');
  // ... explicit condition handling, calls render functions
}
```

---

## AI Coding Skills for Browser Extension Development

When working on this codebase, the AI assistant should understand and apply:

### Browser Extension Architecture
- Content scripts run in the context of web pages (isolated world in Chrome, shared DOM access)
- Popup scripts run in the extension's own context (separate document)
- Background scripts/service workers handle long-lived state and cross-tab coordination
- Manifest declares permissions, content script injection rules, and extension metadata
- Content scripts and background scripts communicate via `runtime.sendMessage`

### DOM Manipulation in Content Scripts
- Content scripts can read and modify the host page's DOM
- CSS classes on AWS Console elements can change without notice — extraction must be dynamic, not hardcoded
- Use `MutationObserver` or polling to wait for dynamically loaded DOM elements (AWS Console is an SPA)
- Injected elements must match the host page's styling to appear native

### Extension Storage
- `browser.storage.local` is persistent across browser sessions
- Storage is shared across all tabs/instances of the extension
- Storage operations are async — always await them
- Storage has size limits (Chrome: 10MB for `local`, 100KB for `sync`)
- Data stored is serialized JSON — no functions, DOM elements, or circular references

### Cross-Browser Compatibility
- Chrome uses `chrome.*` namespace with callbacks (MV3 adds Promise support)
- Firefox uses `browser.*` namespace with native Promises
- `webextension-polyfill` normalizes Chrome to match Firefox's Promise-based API
- Manifest V2 vs V3 differences: background pages vs service workers, `browser_action` vs `action`
- Test on actual browsers — polyfills don't catch all edge cases

### Security in Extensions
- Content Security Policy restricts inline scripts and eval
- Only inject into pages matching declared URL patterns (manifest `matches`)
- Validate all data from storage before use (could be corrupted or tampered)
- URL validation: only allow `https://` and known AWS domains
- Never execute code received from the page or external sources

### Testing Browser Extensions
- Mock `browser.*` / `chrome.*` APIs in unit tests — don't depend on a real browser
- Use `jsdom` for DOM manipulation tests
- Integration tests should verify the full flow: storage → parse → merge → inject
- Test both "first launch" and "returning user" paths explicitly
- Test with real browser profiles periodically (not just mocked APIs)

---

## Technical Design: Cross-Browser Abstraction

### The Problem with Browser APIs

Browser extensions share the same conceptual model (content scripts, storage, messaging) but each browser implements the APIs differently:

| Capability | Chrome | Firefox | Safari |
|---|---|---|---|
| API namespace | `chrome.*` | `browser.*` | `browser.*` |
| Async pattern | Callbacks | Promises (native) | Promises (native) |
| Manifest version | MV3 | MV2/MV3 | MV2/MV3 |
| Storage API | `chrome.storage.local` | `browser.storage.local` | `browser.storage.local` |

If we scatter browser-specific code throughout the codebase, adding or maintaining browser support becomes painful. Instead, we define a thin abstraction layer — an interface that hides browser differences behind a single contract.

### Design Principle: Interface Segregation

```
┌─────────────────────────────────────────────────────────┐
│                  Core Extension Logic                     │
│                                                         │
│  • Content script (DOM parsing, injection)              │
│  • Popup logic (UI, drag-drop, search)                  │
│  • Service merging, icon extraction                     │
│  • All business logic — 95% of the code                 │
│                                                         │
│  Depends ONLY on the BrowserAPI interface               │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              BrowserAPI Interface                         │
│                                                         │
│  storage.get(keys) → Promise<data>                      │
│  storage.set(data) → Promise<void>                      │
│  tabs.query(params) → Promise<tabs[]>                   │
│  runtime.sendMessage(msg) → Promise<response>           │
└────────────────────────────┬────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
│ Chrome Adapter   │ │ Firefox Adapter│ │ Safari Adapter│
│                  │ │              │ │ (future)     │
│ Wraps chrome.*   │ │ Passes thru  │ │              │
│ callbacks into   │ │ browser.*    │ │              │
│ Promises         │ │ natively     │ │              │
└──────────────────┘ └──────────────┘ └──────────────┘
```

### The Interface

The core code programs against this interface. Each browser provides its own implementation:

```typescript
interface BrowserStorageAPI {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  set(data: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

interface BrowserTabsAPI {
  query(params: { active: boolean; currentWindow: boolean }): Promise<Tab[]>;
}

interface BrowserRuntimeAPI {
  sendMessage(message: unknown): Promise<unknown>;
  onMessage: {
    addListener(callback: (message: unknown) => void): void;
  };
}

interface BrowserAPI {
  storage: { local: BrowserStorageAPI };
  tabs: BrowserTabsAPI;
  runtime: BrowserRuntimeAPI;
}
```

### What Changes Per Browser (Minimal)

Only the adapter layer differs between browsers. This is a small amount of code:

**Chrome adapter** — wraps `chrome.*` callback APIs into Promises:
```typescript
const chromeAdapter: BrowserAPI = {
  storage: {
    local: {
      get: (keys) => new Promise((resolve) => chrome.storage.local.get(keys, resolve)),
      set: (data) => new Promise((resolve) => chrome.storage.local.set(data, resolve)),
      remove: (keys) => new Promise((resolve) => chrome.storage.local.remove(keys, resolve)),
    }
  },
  // ... tabs, runtime
};
```

**Firefox adapter** — directly passes through native `browser.*` APIs (already Promise-based):
```typescript
const firefoxAdapter: BrowserAPI = {
  storage: { local: browser.storage.local },
  tabs: browser.tabs,
  runtime: browser.runtime,
};
```

### What Stays the Same (Everything Else)

All core logic — DOM parsing, service merging, icon extraction, quickbar injection, popup UI, drag-and-drop, search — uses the `BrowserAPI` interface. This code is written once and works on all browsers without modification.

```typescript
// Core logic doesn't know or care which browser it's running in
async function loadFavorites(api: BrowserAPI): Promise<Service[]> {
  const data = await api.storage.local.get('userFavorites');
  return validateAndParse(data);
}
```

### Practical Benefit

- **Adding Safari support** = writing one new adapter file (~50 lines). Zero changes to core logic.
- **Fixing a bug in service merging** = one fix, works everywhere.
- **Testing** = mock the `BrowserAPI` interface, test all core logic without any browser present.

### Manifest Differences

Beyond the API layer, each browser has slightly different manifest requirements:

| Field | Chrome | Firefox |
|---|---|---|
| `manifest_version` | 3 | 2 or 3 |
| `browser_specific_settings` | not needed | required (gecko ID) |
| `background` | `service_worker` | `scripts` array |

This is handled at build time — a base manifest is shared, and browser-specific fields are merged in during the build step. The source code itself doesn't change.

## Success Criteria

1. A user can pin their top services once and see them in the quickbar across all AWS accounts they access from that browser.
2. Switching AWS accounts does not require re-configuring the favorites bar.
3. Recently visited services appear in the quickbar automatically without user action.
4. The injected quickbar items are visually indistinguishable from native AWS favorites.
5. Zero data leaves the browser — fully local, privacy-preserving.
6. Adding support for a new browser requires only a new adapter implementation and manifest config — no changes to core logic.
