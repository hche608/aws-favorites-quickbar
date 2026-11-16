# Feature Design: AWS CodePipeline Hover Status Preview

**Date**: 2026-11-13  
**Status**: In Review  
**Target File**: `docs/superpowers/specs/2026-11-13-codepipeline-hover-preview-design.md`  

---

## 1. Intent & Problem Statement
When developers and DevOps engineers manage and monitor CI/CD pipelines in the AWS CodeSuite console (`https://<region>.console.aws.amazon.com/codesuite/codepipeline/pipelines...`), the list view only shows coarse pipeline-level execution status or require clicking into individual pipelines in new tabs to see which specific Stage and Action is currently executing, succeeded, or failed.

This feature enables a frictionless **Hover Preview** on the CodePipeline list page:
When the user hovers the cursor over a specific pipeline link for **3 seconds**, a lightweight floating popover appears directly below the row, rendering the latest execution status and a horizontal Stage/Action flow chart. The user can immediately observe which Stage and Action is running and its elapsed duration, without navigating away or opening new tabs.

---

## 2. Goals & Anti-Goals

### Goals
- **Hover Detection & Delay**: Detect hover on CodePipeline links in the pipeline list view with a strict 3000ms delay timer (debounce) to avoid accidental triggers during routine mouse movement.
- **Option B Layout (Uniform Height with Progress Summary)**:
  - Header: Pipeline name, execution status badge, execution ID/time, elapsed duration.
  - Horizontal flow of Stages connected with arrows `──▶`.
  - Fixed-height Stage nodes: displays Stage name, the primary action (prioritizing running/failed actions), action status icon, and elapsed time. If a stage has multiple actions, display progress summary (e.g. `[1/2 完成: LintCheck]`).
- **Read-Only Auto-Dismissal**: When the user moves the mouse away from the hovered row/link (`mouseleave`), the popover is destroyed immediately.
- **Short-term In-Memory Cache**: 15-second cache per pipeline to prevent redundant API queries when hovering over the same item multiple times.
- **Zero Heavy Iframe Overhead**: Directly query lightweight JSON status endpoints in the console session; do not render heavy iframes.
- **Settings Toggle**: Provide a toggle in the extension popup: `[x] 启用 CodePipeline 悬停状态预览 (3s)` (enabled by default).

### Anti-Goals
- **No Interactive Popover**: Users will not click buttons, copy error logs, or interact inside the popover. If an error requires deep inspection, users will click the pipeline link to open the native page.
- **No Global Page Mutation**: The popover should be isolated (via scoped CSS / isolated DOM container) so it never breaks native AWS Console styles or layouts.
- **No Polling While Closed**: No background polling for pipelines when the user is not actively hovering.

---

## 3. Constraints & Technical Environment
1. **Host Permissions & Context**:
   - `manifest.json` already grants `https://*.console.aws.amazon.com/*` host permissions.
   - Content script runs in `document_idle` on all `console.aws.amazon.com` pages.
2. **Console Authentication & API Fetching**:
   - The user is already authenticated in the AWS Console with valid session cookies.
   - CodePipeline console uses internal proxy calls (`/codesuite/codepipeline/api/...` or standard AWS CodePipeline `GetPipelineState` / `GetPipelineExecution` actions via console gateway) with standard `X-Amz-Security-Token` / CSRF cookies.
   - Must handle network failures, 403 Forbidden (insufficient IAM permissions), or session timeouts gracefully with a concise fallback card.
3. **SPA Navigation (Single Page Application)**:
   - AWS CodeSuite uses client-side routing. Navigation between pages does not reload the page.
   - The feature must attach DOM observers (MutationObserver) or use delegated event listeners on the document to reliably capture table row hovers across route transitions.

---

## 4. Decided Architectural Choices

### 4.1 URL & Page Activation
- Activation condition: `location.hostname.endsWith('.console.aws.amazon.com')` and `location.pathname.includes('/codesuite/codepipeline/pipelines')`.
- Event Delegation on `document.body`:
  - Listen for `mouseover` on links matching `/codesuite/codepipeline/pipelines/[^/]+/view` or table rows representing pipelines.
  - On `mouseenter`, extract pipeline name and region from URL:
    - Example URL: `https://ap-southeast-2.console.aws.amazon.com/codesuite/codepipeline/pipelines/adms-sandbox-v2-lcdb-data-import-pipeline/view?region=ap-southeast-2`
    - Target pipeline name: `adms-sandbox-v2-lcdb-data-import-pipeline`
    - Target region: `ap-southeast-2`
  - Start 3000ms timer.
  - On `mouseleave`, cancel timer (`clearTimeout`) and dismiss any active popover.

### 4.2 Data Acquisition & Caching (`PipelineStatusService`)
- Cache structure: `Map<string, { timestamp: number, data: PipelineExecutionState }>` with 15000ms TTL.
- Fetch flow:
  1. Check cache. If valid, return cached data immediately upon 3s timer expiration.
  2. If uncached/expired, fetch `GetPipelineState` / console execution endpoint.
  3. Parse execution summary:
     - Pipeline Name
     - Latest Execution Status: `Succeeded` | `InProgress` | `Failed` | `Stopped`
     - Start time / elapsed time
     - Array of Stages:
       - Stage Name
       - Status
       - Actions: array of `{ name, type, status, startTime, endTime }`
       - Primary Action: First action that is `Failed` or `InProgress`; if all succeeded, the last succeeded action.
       - Summary string: `[X/Y 完成]` if multiple actions exist.

### 4.3 UI Component (`PipelineHoverPopover`)
- Visual Design (Option B - Uniform Height with Progress Summary):
  ```text
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │ 🚀 adms-sandbox-v2-lcdb-data-import-pipeline                   [ InProgress ]
  │ 执行 ID: 9b2d8e4... | 触发于: 10:52:10 (已运行 3m 15s)                        │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │ ┌───────────────┐       ┌──────────────────────┐       ┌──────────────────┐ │
  │ │ Source        │       │ Test (2 Actions)     │       │ Deploy           │ │
  │ │ AppSource ✅  │  ──▶  │ UnitTest 🔄 2m...    │  ──▶  │ CfnDeploy ⏳     │ │
  │ │ 42s           │       │ [1/2 完成: LintCheck]│       │ 等待中           │ │
  └───────────────┘       └──────────────────────┘       └──────────────────┘ │
  └─────────────────────────────────────────────────────────────────────────────┘
  ```
- CSS Scoping: Use a unique container `#aws-favorites-codepipeline-popover` positioned with `fixed` coordinates calculated via `getBoundingClientRect()` of the hovered row.
- Flip logic: If `rect.bottom + popoverHeight > window.innerHeight - 20`, position above `rect.top - popoverHeight - 8`. Otherwise position below `rect.bottom + 8`.
- Dark Mode / Light Mode: Inspect `document.body` or AWS console container classes (`awsui-dark-mode` or `theme-dark`) to apply harmonious surface colors.

### 4.4 Settings Integration
- Storage key: `enableCodePipelineHoverPreview` (boolean, default: `true`).
- In `src/storage.ts`: add `enableCodePipelineHoverPreview` to settings interface and default values.
- In `popup.html` and `src/popup.ts`: add a clean toggle in the settings section.

---

## 5. Unresolved Builder Items & Notes for Implementation
- **Console API Payload Format**: Validate the exact payload returned by AWS CodePipeline console endpoint in live or mock environments to handle schema variations (e.g., V1 vs V2 pipeline execution format).
- **Fallback Loading State**: If the network request takes >500ms after the 3s hover trigger, display a compact skeleton loading card within the popover rather than freezing.
