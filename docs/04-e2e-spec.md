# AWS Favorites Quickbar — Playwright E2E Specification & Implementation Roadmap / 本地真实浏览器 E2E 自动化测试方案与技术规范

> **Version / 版本**：v1.4.1+  
> **Goal / 目标**：Use real browsers with persistent login sessions to end-to-end verify functionality, visual fidelity, and cross-browser compatibility on the AWS Console and Popup UI, completely eliminating regressions. / 在开发者本地环境使用真实浏览器（保留真实登录会话），端到端全自动验证 AWS Favorites Quickbar 在真实 AWS 控制台及 Popup 界面上的功能、视觉与跨浏览器兼容性，杜绝破坏性更新。  
> [English](#english) | [中文](#chinese)

---

<a name="english"></a>
## 🇬🇧 English

### Table of Contents

1. [Test Environment & Feasibility Validation](#1-test-environment--feasibility-validation)
   - [1.1 Persistent Real Browser Profile Architecture](#11-persistent-real-browser-profile-architecture)
   - [1.2 User Authentication Sensing & Waiting Guard](#12-user-authentication-sensing--waiting-guard)
   - [1.3 Dynamic AWS Console State & Deterministic Initialization](#13-dynamic-aws-console-state--deterministic-initialization)
2. [Test Matrix & Core Test Case Design](#2-test-matrix--core-test-case-design)
   - [2.1 Quickbar Injection & Dynamic Style Cloning](#21-quickbar-injection--dynamic-style-cloning)
   - [2.2 Cross-Page & Cross-Service Navigation Persistence](#22-cross-page--cross-service-navigation-persistence)
   - [2.3 Native Theme Synchronization (Light / Dark)](#23-native-theme-synchronization-light--dark)
   - [2.4 Popup UI & User Interaction Specs](#24-popup-ui--user-interaction-specs)
3. [Popover (Popup) Visual Snapshot Regression](#3-popover-popup-visual-snapshot-regression)
   - [3.1 Visual Regression Architecture](#31-visual-regression-architecture)
   - [3.2 Visual Test Pipeline](#32-visual-test-pipeline)
   - [3.3 Tolerance, Masking & Anti-Flakiness Strategy](#33-tolerance-masking--anti-flakiness-strategy)
4. [Cross-Browser Automation Strategy (Chrome & Firefox)](#4-cross-browser-automation-strategy-chrome--firefox)
   - [4.1 Chrome / Chromium Extension Loading](#41-chrome--chromium-extension-loading)
   - [4.2 Firefox (Gecko) Loading Strategy](#42-firefox-gecko-loading-strategy)
   - [4.3 Cross-Browser Comparison Matrix](#43-cross-browser-comparison-matrix)
5. [Directory Layout & Implementation Specifications](#5-directory-layout--implementation-specifications)
   - [5.1 Directory Layout](#51-directory-layout)
   - [5.2 Dependencies & Configuration](#52-dependencies--configuration)
   - [5.3 npm / Makefile Commands](#53-npm--makefile-commands)
6. [Implementation Roadmap & Deliverables (Phase-by-Phase)](#6-implementation-roadmap--deliverables-phase-by-phase)

---

### 1. Test Environment & Feasibility Validation

#### 1.1 Persistent Real Browser Profile Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Local E2E Architecture Overview                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ 1. Execution: npm run test:e2e                                         │
│    └─► Builds Chrome/Firefox distributions (dist/chrome, dist/firefox) │
│    └─► Launches Playwright Persistent Context                          │
│        • Preloads extension: dist/chrome                               │
│        • User data directory: .e2e-profile/chrome (in .gitignore)      │
│                                                                        │
│ 2. Session Detector                                                    │
│    └─► Navigates to https://console.aws.amazon.com                     │
│    ├─► [Logged In]: Cookies active ──► Runs test suites directly       │
│    └─► [Logged Out / Session Expired]:                                 │
│          • Brings browser window forward, countdown terminal prompt:   │
│            "⚠️ Please complete AWS login and MFA in the browser..."    │
│          • Listens for redirection, saves session once /home hit       │
└────────────────────────────────────────────────────────────────────────┘
```

##### Technology: Playwright Persistent Context
Using Playwright's `launchPersistentContext` to spawn a **headed Chrome instance with an isolated, persistent profile**:
- **Zero Credential Hardcoding**: Never injects credentials in code; authentication is completed by real developers via official AWS SSO/IdP/MFA.
- **Session Isolation**: Profile directory `.e2e-profile/` is strictly `.gitignore`'d and never committed.
- **Session Reusability**: Cookies, LocalStorage, and IndexedDB persist across runs, allowing tests to boot instantly without re-authenticating for 8–12 hours.

---

#### 1.2 User Authentication Sensing & Waiting Guard

A dual-polling and event-based guard detects login states:

```typescript
// tests/e2e/helpers/auth.ts
import { Page } from 'playwright';

export async function ensureAwsLoggedIn(page: Page, timeoutMs = 180_000): Promise<void> {
  await page.goto('https://console.aws.amazon.com/');

  // 1. Check if already on the console homepage
  const isAlreadyHome = () =>
    page.url().includes('console.aws.amazon.com') &&
    (page.url().includes('/home') || page.url().includes('region='));

  if (isAlreadyHome()) {
    console.log('✅ AWS session active, proceeding with tests.');
    return;
  }

  // 2. Not logged in: Redirect detected (signin.aws.amazon.com or SSO IdP)
  console.log('⚠️ Session expired or logged out. Waiting for manual login (up to 3 min)...');
  console.log('👉 Complete login and MFA in the opened browser window.');

  // 3. Smart wait: Watch navigation until hitting AWS Console /home
  await page.waitForURL(
    (url) => {
      const href = url.href;
      return (
        href.includes('console.aws.amazon.com') &&
        (href.includes('/home') || href.includes('region=')) &&
        !href.includes('/signin') &&
        !href.includes('/auth')
      );
    },
    { timeout: timeoutMs }
  );

  // 4. Wait for key navbar DOM element to attach
  await page.waitForSelector('[data-testid="awsc-nav-service-list"], nav', {
    state: 'attached',
    timeout: 30_000,
  });

  console.log('🎉 Login verified and session saved to local profile. Starting tests!');
}
```

---

#### 1.3 Dynamic AWS Console State & Deterministic Initialization

##### Challenges
AWS accounts vary widely in their initial state:
1. **Varying native pins**: Clean accounts have 0 pins (which triggers Rule 3 `'no-native-pin'`).
2. **Variable "Recently Visited" lists**: Active accounts may have 10+ random services.
3. **Region / Latency variations**: Console layout timing varies by region.

##### Solution: Tiered Deterministic Strategy

```
┌────────────────────────────────────────────────────────┐
│             Deterministic State Strategy               │
├────────────────────────────────────────────────────────┤
│ Tier 1: Native Preflight Assertion                     │
│  - Assert at least 1 native pinned item exists         │
│  - If missing, auto-pin "Console Home" via UI search   │
├────────────────────────────────────────────────────────┤
│ Tier 2: Storage Baseline Injection                     │
│  - Directly inject baseline data into storage.sync:    │
│    userFavorites: ['s3', 'ec2', 'lambda']              │
│    visualMode: 'dark'                                  │
│    maxServices: 8                                      │
├────────────────────────────────────────────────────────┤
│ Tier 3: Trigger Re-render                              │
│  - page.reload() allows extension to mount cleanly     │
└────────────────────────────────────────────────────────┘
```

**Direct Test Storage Injection Helper**:
```typescript
// tests/e2e/helpers/extension-storage.ts
import { BrowserContext } from 'playwright';

export async function setExtensionTestStorage(
  context: BrowserContext,
  extensionId: string,
  state: {
    userFavorites: string[];
    visualMode?: 'light' | 'dark';
    maxServices?: number;
  }
) {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  
  await page.evaluate(async (data) => {
    await chrome.storage.sync.set(data);
  }, state);

  await page.close();
}
```

---

### 2. Test Matrix & Core Test Case Design

```
┌────────────────────────────────────────────────────────────────────────┐
│                           E2E Test Matrix                              │
├──────────────────────┬──────────────────────┬──────────────────────────┤
│ Module               │ Target               │ Assertion Method         │
├──────────────────────┼──────────────────────┼──────────────────────────┤
│ 1. Quickbar Mount    │ Node injected cleanly│ Validate <li> count/DOM  │
│ 2. CSS Style Clone   │ Native class copied  │ Compare native vs custom │
│ 3. Links & Icons     │ CDN Icon & URL valid │ Validate <img> src & href│
│ 4. Navigation Sync   │ Persists on route nav│ Navigate to /s3/home     │
│ 5. Theme Switching   │ visualMode synced    │ Assert radio click & DOM │
│ 6. Popup Render      │ List items rendered  │ Validate item checkmarks │
│ 7. Popup Search      │ Real-time filtering  │ Type "ec2", count items  │
│ 8. Pin/Unpin Toggle  │ Hot updates quickbar │ Toggle pin, check navbar │
│ 9. Drag & Drop Sort  │ HTML5 Drag-and-Drop  │ Dispatch drag & assert   │
└──────────────────────┴──────────────────────┴──────────────────────────┘
```

#### 2.1 Quickbar Injection & Dynamic Style Cloning
- **Steps**:
  1. Initialize storage `userFavorites = ['s3', 'ec2']`.
  2. Navigate to `https://console.aws.amazon.com/console/home`.
  3. Wait for navbar to attach.
- **Assertions**:
  - Navbar contains custom injected `<li>` elements.
  - Injected CSS classes match the first native pinned item exactly (no hardcoding).
  - S3 and EC2 icons load from the CDN without broken image errors.

#### 2.2 Cross-Page & Cross-Service Navigation Persistence
- **Steps**:
  1. Confirm quickbar is mounted on Console Home.
  2. Click S3 or navigate to `https://s3.console.aws.amazon.com/s3/home`.
  3. Wait for route transition.
- **Assertions**:
  - Quickbar mounts correctly on nested sub-services without duplicate entries.
  - No uncaught JavaScript exceptions appear in the browser console.

#### 2.3 Native Theme Synchronization (Light / Dark)
- **Steps**:
  1. Set `visualMode = 'dark'`.
  2. Observe console visual mode radio group `[data-testid="visualModeRadioGroup"]`.
  3. Toggle preference to `light`.
- **Assertions**:
  - Radio input dispatches native `click` and `change` events.
  - The extension never modifies `body` class directly, delegating theme management to AWS.

#### 2.4 Popup UI & User Interaction Specs
Navigates directly to `chrome-extension://${extensionId}/popup.html`:
- **Search**: Type `"lambda"` into `#search-input`, asserting only matching items remain visible.
- **Pin Toggle**: Click pin button on an unpinned service; assert its state highlights and `storage.sync` reflects the change.
- **Drag Reorder**: Dispatch HTML5 `dragstart`, `dragover`, and `drop` events; assert list order updates in storage.

---

### 3. Popover (Popup) Visual Snapshot Regression

#### 3.1 Visual Regression Architecture
The popup is the primary direct user interface. It contains a search bar, list items, icons, drag handles, and badge counters. Layout shift or color regressions across themes must be caught automatically.

```
┌────────────────────────────────────────────────────────┐
│             Popup Visual Snapshot Pipeline             │
├────────────────────────────────────────────────────────┤
│ 1. Load Baseline Data ──► (ec2, s3, lambda, iam)       │
├────────────────────────────────────────────────────────┤
│ 2. Set Theme ──► visualMode: 'dark' / 'light'          │
├────────────────────────────────────────────────────────┤
│ 3. Lock Viewport ──► Exactly 380px × 520px             │
├────────────────────────────────────────────────────────┤
│ 4. Capture Screenshot ──► popup-dark.png / light.png   │
├────────────────────────────────────────────────────────┤
│ 5. Pixel Comparison ──► Compare with Golden Baselines  │
│    • Diff < 0.2%: PASS                                 │
│    • Diff >= 0.2%: FAIL ──► Output diff.png            │
└────────────────────────────────────────────────────────┘
```

#### 3.2 Visual Test Pipeline

```typescript
// tests/e2e/popup-visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Popup Visual Regression', () => {
  test('Popup Dark Mode Visual Baseline', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.evaluate(() => {
      window.localStorage.setItem(
        'aws-favorites-quickbar-services',
        JSON.stringify([
          { id: 's3', name: 'Amazon S3', iconUrl: 'data:image/svg+xml,...', source: 'pinned' },
          { id: 'ec2', name: 'Amazon EC2', iconUrl: 'data:image/svg+xml,...', source: 'pinned' },
          { id: 'lambda', name: 'AWS Lambda', iconUrl: 'data:image/svg+xml,...', source: 'recent' },
        ])
      );
    });

    await page.setViewportSize({ width: 380, height: 500 });
    await page.reload();
    await page.waitForSelector('.service-list .service-item');

    const container = page.locator('#popup-container');
    await expect(container).toHaveScreenshot('popup-dark-baseline.png', {
      maxDiffPixelRatio: 0.01, // 1% anti-aliasing tolerance
      animations: 'disabled',
    });
  });
});
```

#### 3.3 Tolerance, Masking & Anti-Flakiness Strategy
1. **Disable Animations**: Force CSS transitions/animations to `none` before taking snapshots.
2. **Masking Dynamic Elements**: Use `mask: [page.locator('.loading-spinner')]` to omit dynamic spinners.
3. **Snapshot Update Command**: Run `npx playwright test --update-snapshots` when updating intentional UI designs.

---

### 4. Cross-Browser Automation Strategy (Chrome & Firefox)

The project supports **Chrome (MV3)** and **Firefox (MV3 with gecko ID)**.

#### 4.1 Chrome / Chromium Extension Loading
Loads unpacked extension directly:
```typescript
import { chromium } from 'playwright';

const context = await chromium.launchPersistentContext('.e2e-profile/chrome', {
  headless: false,
  channel: 'chrome',
  args: [
    `--disable-extensions-except=${process.cwd()}/dist/chrome`,
    `--load-extension=${process.cwd()}/dist/chrome`,
    '--no-first-run',
    '--no-default-browser-check',
  ],
});
```

#### 4.2 Firefox (Gecko) Loading Strategy
Firefox MV3 enforces strict unsigned extension policies during persistent launches.

##### Option A: Temporary Addon Installation in Firefox Profile
```typescript
import { firefox } from 'playwright';

const context = await firefox.launchPersistentContext('.e2e-profile/firefox', {
  headless: false,
  firefoxUserPrefs: {
    'xpinstall.signatures.required': false,
    'extensions.autoDisableScopes': 0,
  },
});
```

##### Option B: Mozilla `web-ext` CLI
Run unsigned extensions directly in custom profiles:
```bash
npx web-ext run --source-dir=dist/firefox --firefox-profile=.e2e-profile/firefox --keep-profile-changes
```

#### 4.3 Cross-Browser Comparison Matrix

| Feature / Dimension | Chrome / Chromium | Firefox (Gecko) |
|:---|:---|:---|
| **Build Directory** | `dist/chrome` | `dist/firefox` |
| **Manifest Differences** | Standard `manifest.json` | Includes `browser_specific_settings.gecko` |
| **API Abstraction** | Callback to Promise (`chrome.*`) | Native Promise (`browser.*`) |
| **Profile Directory** | `.e2e-profile/chrome` | `.e2e-profile/firefox` |
| **Extension Launch** | `--load-extension` flag | `firefoxUserPrefs` / `web-ext` |
| **Test Coverage** | Full automated E2E (14 specs / 34 tests) | Manifest/AMO check + manual regression |

---

### 5. Directory Layout & Implementation Specifications

#### 5.1 Directory Layout
```
tests/
├── e2e/
│   ├── config/
│   │   ├── playwright.config.ts    # Playwright configuration
│   │   └── constants.ts            # URLs & baseline constants
│   ├── helpers/
│   │   ├── auth.ts                 # Login sensing & waiting guards
│   │   ├── browser-launcher.ts     # Profile & context launchers
│   │   └── extension-storage.ts    # Direct storage manipulation
│   ├── snapshots/                  # Visual golden snapshots
│   ├── quickbar-mount.spec.ts      # Core quickbar injection tests
│   ├── cross-tab-sync.spec.ts      # Cross-tab broadcast tests
│   ├── theme.spec.ts               # Theme radio synchronization
│   ├── popup.spec.ts               # Popup UI interaction tests
│   ├── popup-visual.spec.ts        # Dark/Light visual regression
│   └── coverage-gaps.spec.ts       # Architecture rule guardrails
```

#### 5.2 Dependencies & Configuration
```bash
npm i -D @playwright/test
```
Enforce persistent profile isolation in `.gitignore`:
```gitignore
.e2e-profile/
test-results/
playwright-report/
```

#### 5.3 npm / Makefile Commands
```json
{
  "scripts": {
    "test:e2e": "make build-all && playwright test",
    "test:e2e:chrome": "make build-chrome && playwright test --project=chrome",
    "test:e2e:firefox": "make build-firefox && playwright test --project=firefox",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:update-snapshots": "playwright test --update-snapshots"
  }
}
```

---

### 6. Implementation Roadmap & Deliverables (Phase-by-Phase)

1. **Phase 1: Environment & Auth Sensing** — ✅ **Completed**
   - Implemented `tests/e2e/helpers/auth.ts` and `tests/e2e/fixtures.ts`.
   - Verified persistent Chrome profile keeping active AWS sessions and sensing `/home`.
   - Automated self-healing for empty pinbars by auto-pinning "Console Home".

2. **Phase 2: Core Quickbar Injection** — ✅ **Completed**
   - Implemented [quickbar-mount.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/quickbar-mount.spec.ts) (dynamic style cloning).
   - Route navigation test [recently-visited-navigation.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/recently-visited-navigation.spec.ts).
   - Cross-tab live broadcast test [cross-tab-sync.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/cross-tab-sync.spec.ts).

3. **Phase 3: Popup Interactions & Visual Snapshots** — ✅ **Completed**
   - Interactive UI specs [popup.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/popup.spec.ts) (pin/unpin, search, reorder, maxServices).
   - Simulated theme sync [theme.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/theme.spec.ts).
   - Visual snapshot comparison [popup-visual.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/popup-visual.spec.ts).

4. **Phase 4: Firefox Distribution & Packaging Verification** — ✅ **Completed**
   - Implemented [firefox.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/firefox.spec.ts) (MV3 & AMO packaging compliance).
   - Implemented [firefox-visual.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/firefox-visual.spec.ts) (visual review under Chromium engine).
   - Native Firefox live verification handled via `npm run run:firefox` (due to macOS 27 sandbox [Playwright #42082](https://github.com/microsoft/playwright/issues/42082)).

5. **Phase 5: Architectural Gap Hardening & PRNG Replay** — ✅ **Completed**
   - Added [coverage-gaps.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/coverage-gaps.spec.ts) covering: First-launch `undefined` (Gap 1), Rule 4 nested paths (Gap 2), Rule 3 no-native-pin notice (Gap 3), updateQuickbar runtime broadcast (Gap 4), and storage persistence (Gap 5).
   - Integrated Mulberry32 deterministic PRNG seed logging for stress tests.
   - Comprehensive suite reaches 14 spec files and 34 tests. Full incident review documented in [05-postmortem.md](./05-postmortem.md).

---

<a name="chinese"></a>
## 🇨🇳 中文

### 目录

1. [测试环境搭建与可行性验证](#1-测试环境搭建与可行性验证-1)
   - [1.1 真实浏览器持久化环境架构](#11-真实浏览器持久化环境架构)
   - [1.2 用户登录态感知与等待机制](#12-用户登录态感知与等待机制)
   - [1.3 AWS 动态状态与测试初始化（确定性保障）](#13-aws-动态状态与测试初始化确定性保障)
2. [测试矩阵与核心用例设计](#2-测试矩阵与核心用例设计-1)
   - [2.1 Quickbar 注入与样式克隆测试](#21-quickbar-注入与样式克隆测试)
   - [2.2 跨页面与跨服务导航持久性测试](#22-跨页面与跨服务导航持久性测试)
   - [2.3 主题切换联动测试 (Light / Dark)](#23-主题切换联动测试-light--dark)
   - [2.4 Popup 用户交互功能测试](#24-popup-用户交互功能测试)
3. [Popover (Popup) 视觉截屏对比测试](#3-popover-popup-视觉截屏对比测试-1)
   - [3.1 视觉回归测试架构](#31-视觉回归测试架构)
   - [3.2 截屏测试执行流程](#32-截屏测试执行流程)
   - [3.3 容差、掩码与跨环境差异处理](#33-容差掩码与跨环境差异处理)
4. [跨浏览器测试方案 (Chrome & Firefox)](#4-跨浏览器测试方案-chrome--firefox-1)
   - [4.1 Chrome / Edge (Chromium 引擎) 扩展加载与测试](#41-chrome--edge-chromium-引擎-扩展加载与测试)
   - [4.2 Firefox (Gecko 引擎) 扩展加载与测试](#42-firefox-gecko-引擎-扩展加载与测试)
   - [4.3 跨浏览器测试对比矩阵](#43-跨浏览器测试对比矩阵)
5. [目录结构与技术落地路线](#5-目录结构与技术落地路线-1)
   - [5.1 目录规划](#51-目录规划)
   - [5.2 依赖选型与安装](#52-依赖选型与安装)
   - [5.3 npm / Makefile 命令规范](#53-npm--makefile-命令规范)
6. [实施路线建议 (Phase-by-Phase)](#6-实施路线建议-phase-by-phase-1)

---

### 1. 测试环境搭建与可行性验证

#### 1.1 真实浏览器持久化环境架构

```
┌────────────────────────────────────────────────────────────────────────┐
│                        本地 E2E 测试环境架构                             │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ 1. 运行: npm run test:e2e                                              │
│    └─► 编译 Chrome/Firefox 产物 (dist/chrome, dist/firefox)            │
│    └─► 启动 Playwright Persistent Context                              │
│        • 挂载扩展: dist/chrome                                         │
│        • 用户数据目录: .e2e-profile/chrome (已加入 .gitignore)          │
│                                                                        │
│ 2. 状态检测 (Session Detector)                                         │
│    └─► 打开 https://console.aws.amazon.com                             │
│    ├─► [已登录]: Cookie 有效 ──► 直接执行测试套件                      │
│    └─► [未登录 / Session 过期]:                                        │
│          • 浏览器窗口前置，终端倒计时提示:                             │
│            "⚠️ 请在弹出的浏览器中完成 AWS 登录与 MFA..."              │
│          • 自动监听重定向，一旦到达 /home 立即保存状态并切入测试       │
└────────────────────────────────────────────────────────────────────────┘
```

##### 技术选型：Playwright Persistent Context
使用 Playwright 的 `launchPersistentContext` 启动**具有独立持久化配置文件的非无头 Chrome**：
- **无账号密码硬编码**：不注入任何凭据，完全由真人通过 AWS 官方 SSO/IdP/MFA 登录。
- **凭据隔离安全**：持久化目录设为 `.e2e-profile/`，列入 `.gitignore`，绝不上传仓库。
- **长期免登**：利用真实浏览器的 Cookie、Local Storage 与 IndexedDB，AWS Session 在有效周期内（8~12 小时）随时重复运行、秒级启动。

---

#### 1.2 用户登录态感知与等待机制

针对真人登录的不确定时间（如等待 MFA 短信、硬件 Key），设计**双重轮询 + 事件感应的守卫函数**：

```typescript
// tests/e2e/helpers/auth.ts
import { Page } from 'playwright';

export async function ensureAwsLoggedIn(page: Page, timeoutMs = 180_000): Promise<void> {
  await page.goto('https://console.aws.amazon.com/');

  // 1. 判断是否已经直接进入控制台主页
  const isAlreadyHome = () =>
    page.url().includes('console.aws.amazon.com') &&
    (page.url().includes('/home') || page.url().includes('region='));

  if (isAlreadyHome()) {
    console.log('✅ 已处于 AWS 登录态，直接开始测试。');
    return;
  }

  // 2. 未登录：检测到重定向至登录页 (signin.aws.amazon.com 或 SSO IdP)
  console.log('⚠️ 检测到未登录状态，等待真人完成登录 (最长等待 3 分钟)...');
  console.log('👉 请在打开的浏览器中输入账号、密码并完成 MFA 验证。');

  // 3. 智能等待：监听页面导航直至 URL 命中 AWS Console /home
  await page.waitForURL(
    (url) => {
      const href = url.href;
      return (
        href.includes('console.aws.amazon.com') &&
        (href.includes('/home') || href.includes('region=')) &&
        !href.includes('/signin') &&
        !href.includes('/auth')
      );
    },
    { timeout: timeoutMs }
  );

  // 4. 等待关键导航栏 DOM 节点渲染完成
  await page.waitForSelector('[data-testid="awsc-nav-service-list"], nav', {
    state: 'attached',
    timeout: 30_000,
  });

  console.log('🎉 登录成功，Session 已自动保存至本地 Profile，开始自动化测试！');
}
```

---

#### 1.3 AWS 动态状态与测试初始化（确定性保障）

##### 痛点分析
不同 AWS 账号、不同登录角色或者同一账号在不同时间，其 Console 原生状态差异极大：
1. **原生 Pin 数量不同**：有的账号有原生固定服务，有的账号没有（没有时扩展按规则应返回 `'no-native-pin'`）。
2. **“Recently Visited” 服务列表每次不同**：新账号可能为空，老账号可能有 10+ 个随机服务。
3. **Region / URL 差异**：不同区域的 URL 格式和加载速度不同。

##### 解决方案：分层确定性注入策略

```
┌────────────────────────────────────────────────────────┐
│               确定性测试状态初始化策略                  │
├────────────────────────────────────────────────────────┤
│ 层级 1: 原生前提校验 (Preflight Assertion)              │
│  - 检查当前导航栏是否至少存在 1 个原生固定项           │
│  - 若无，自动通过 UI 引导点击或提示用户固定 1 个原生项 │
├────────────────────────────────────────────────────────┤
│ 层级 2: 扩展存储覆写与重置 (Storage Baseline)          │
│  - 在每次测试前，直接向扩展的 browser.storage.sync 写入│
│    确定性的测试基准数据:                               │
│    userFavorites: ['s3', 'ec2', 'lambda']             │
│    visualMode: 'dark'                                  │
│    maxServices: 8                                      │
├────────────────────────────────────────────────────────┤
│ 层级 3: 刷新页面触发重新渲染 (Render Trigger)          │
│  - page.reload() 使扩展读取确定性存储并重新挂载       │
└────────────────────────────────────────────────────────┘
```

**实现代码：向扩展存储直接注入基准数据**
```typescript
// tests/e2e/helpers/extension-storage.ts
import { BrowserContext } from 'playwright';

export async function setExtensionTestStorage(
  context: BrowserContext,
  extensionId: string,
  state: {
    userFavorites: string[];
    visualMode?: 'light' | 'dark';
    maxServices?: number;
  }
) {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  
  await page.evaluate(async (data) => {
    await chrome.storage.sync.set(data);
  }, state);

  await page.close();
}
```

---

### 2. 测试矩阵与核心用例设计

```
┌────────────────────────────────────────────────────────────────────────┐
│                            E2E 测试用例矩阵                            │
├──────────────────────┬──────────────────────┬──────────────────────────┤
│ 功能模块             │ 测试目标             │ 断言手段                 │
├──────────────────────┼──────────────────────┼──────────────────────────┤
│ 1. Quickbar 注入     │ 自定义节点正确挂载   │ 检查 <li> 数量与结构     │
│ 2. CSS 样式克隆      │ 动态 class 提取一致  │ 比对原生与自定义 class   │
│ 3. 链接与图标验证    │ CDN 图标与 URL 生成  │ 校验 <img> src 与 <a> href│
│ 4. 跨页面导航持久化  │ 切换 service 后依然  │ 导航到 /s3/home 重新断言 │
│ 5. 主题同步切换      │ visualMode 原生联动  │ 检查 radio click 与 DOM  │
│ 6. Popup 列表渲染    │ 收藏与未收藏状态呈现 │ 验证 Popup 列表项渲染    │
│ 7. Popup 搜索过滤    │ 实时搜索过滤正确     │ 输入 "ec2" 验证匹配列表  │
│ 8. Popup 置顶切换    │ 点击即时更新 Quickbar│ 点击 pin 按钮，切回控制台│
│ 9. 拖拽重排序        │ HTML5 Drag-and-Drop  │ 模拟 drag 事件，验证顺序 │
└──────────────────────┴──────────────────────┴──────────────────────────┘
```

#### 2.1 Quickbar 注入与样式克隆测试
- **步骤**：
  1. 初始化存储 `userFavorites = ['s3', 'ec2']`。
  2. 导航至 `https://console.aws.amazon.com/console/home`。
  3. 等待导航栏加载完成。
- **断言**：
  - 导航栏中存在带有自定义属性或我们注入的 `<li>` 元素。
  - 注入元素的 CSS 类名与第一个原生 Pinned 项的类名完全一致（非硬编码）。
  - S3 和 EC2 的图标成功从 CDN 加载且未显示 broken image。

#### 2.2 跨页面与跨服务导航持久性测试
- **步骤**：
  1. 在控制台主页验证 Quickbar 注入成功。
  2. 点击 S3 快捷项或调用 `page.goto('https://s3.console.aws.amazon.com/s3/home')`。
  3. 等待页面加载。
- **断言**：
  - Quickbar 在进入嵌套路由页面后仍然被正确注入且无重复（去重逻辑验证）。
  - 页面控制台无 JavaScript 报错或 Uncaught Exception。

#### 2.3 主题切换联动测试 (Light / Dark)
- **步骤**：
  1. 设置 `visualMode = 'dark'`。
  2. 验证控制台视觉模式单选框 `[data-testid="visualModeRadioGroup"]` 状态。
  3. 将设置切换为 `light`，触发更新。
- **断言**：
  - 单选框正确触发 `click` + `change` 事件。
  - 扩展没有直接暴力篡改 `body` class，而是交由 AWS Console 原生状态机切换。

#### 2.4 Popup 用户交互功能测试
直接导航至 `chrome-extension://${extensionId}/popup.html`：
- **搜索测试**：在 `#search-input` 输入 `"lambda"`，断言列表仅显示 Lambda 相关项，未匹配项隐藏。
- **Pin/Unpin 切换**：点击未收藏项的 Pin 按钮，断言其状态变为高亮，且 `browser.storage.sync` 中包含该服务 ID。
- **拖拽排序测试**：对列表项触发 HTML5 `dragstart`, `dragover`, `drop` 事件，断言持久化列表顺序发生变更。

---

### 3. Popover (Popup) 视觉截屏对比测试

#### 3.1 视觉回归测试架构

Popup 是扩展直接暴露给用户的 UI，包含搜索栏、服务列表、状态图标、拖拽柄及底部统计。在不同操作系统（macOS / Linux / Windows）及不同主题（Light / Dark）下极易因 CSS 样式更新发生布局偏移。

```
┌────────────────────────────────────────────────────────┐
│               Popup 视觉截屏对比管道                    │
├────────────────────────────────────────────────────────┤
│ 1. 加载基准数据 ──► 固定列表项 (ec2, s3, lambda, iam) │
├────────────────────────────────────────────────────────┤
│ 2. 注入指定主题 ──► visualMode: 'dark' / 'light'       │
├────────────────────────────────────────────────────────┤
│ 3. 设定视口尺寸 ──► 固定 380px × 520px (严格一致)      │
├────────────────────────────────────────────────────────┤
│ 4. 截取视口图像 ──► popup-dark.png / popup-light.png   │
├────────────────────────────────────────────────────────┤
│ 5. 图像像素级对比 ──► 与 Golden 样本库比对 (pixelmatch) │
│    • 差异 < 0.2%: 测试 PASS                            │
│    • 差异 >= 0.2%: 测试 FAIL ──► 输出 diff.png 对比图   │
└────────────────────────────────────────────────────────┘
```

#### 3.2 截屏测试执行流程

```typescript
// tests/e2e/popup-visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Popup Visual Regression', () => {
  test('Popup Dark Mode 视觉基准比对', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.evaluate(() => {
      window.localStorage.setItem(
        'aws-favorites-quickbar-services',
        JSON.stringify([
          { id: 's3', name: 'Amazon S3', iconUrl: 'data:image/svg+xml,...', source: 'pinned' },
          { id: 'ec2', name: 'Amazon EC2', iconUrl: 'data:image/svg+xml,...', source: 'pinned' },
          { id: 'lambda', name: 'AWS Lambda', iconUrl: 'data:image/svg+xml,...', source: 'recent' },
        ])
      );
    });

    await page.setViewportSize({ width: 380, height: 500 });
    await page.reload();
    await page.waitForSelector('.service-list .service-item');

    const container = page.locator('#popup-container');
    await expect(container).toHaveScreenshot('popup-dark-baseline.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('Popup Light Mode 视觉基准比对', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.setViewportSize({ width: 380, height: 500 });
    
    const container = page.locator('#popup-container');
    await expect(container).toHaveScreenshot('popup-light-baseline.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });
});
```

#### 3.3 容差、掩码与跨环境差异处理
1. **动画禁用**：在截屏前强制将所有 CSS transition / animation 置为 `none`，防止处于中间过渡状态。
2. **掩码动态元素 (Masking)**：如果列表项中有动态延迟加载项（如加载中的 spinner），使用 `mask: [page.locator('.loading-spinner')]` 排除像素比对。
3. **基准更新机制**：当合法迭代了 UI 样式时，通过命令统一更新快照：
   ```bash
   npx playwright test --update-snapshots
   ```

---

### 4. 跨浏览器测试方案 (Chrome & Firefox)

本项目原生支持 **Chrome (MV3)** 与 **Firefox (MV3 with gecko ID)**。

#### 4.1 Chrome / Edge (Chromium 引擎) 扩展加载与测试
- **加载模式**：直接挂载解压目录（Unpacked Extension）。
- **参数**：
  ```typescript
  import { chromium } from 'playwright';

  const context = await chromium.launchPersistentContext('.e2e-profile/chrome', {
    headless: false,
    channel: 'chrome',
    args: [
      `--disable-extensions-except=${process.cwd()}/dist/chrome`,
      `--load-extension=${process.cwd()}/dist/chrome`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });
  ```

#### 4.2 Firefox (Gecko 引擎) 扩展加载与测试
Firefox MV3 对持久化加载未签名扩展有较严格的安全策略。

##### 方案 A（推荐）：使用 Firefox 独立配置目录安装临时扩展
```typescript
import { firefox } from 'playwright';

const context = await firefox.launchPersistentContext('.e2e-profile/firefox', {
  headless: false,
  firefoxUserPrefs: {
    'xpinstall.signatures.required': false,
    'extensions.autoDisableScopes': 0,
  },
});
```

##### 方案 B：使用 `web-ext` CLI 驱动配合 Playwright
```bash
npx web-ext run --source-dir=dist/firefox --firefox-profile=.e2e-profile/firefox --keep-profile-changes
```

#### 4.3 跨浏览器测试对比矩阵

| 特性 / 维度 | Chrome / Chromium | Firefox (Gecko) |
|:---|:---|:---|
| **构建目录** | `dist/chrome` | `dist/firefox` |
| **Manifest 差异** | 原生 `manifest.json` | 包含 `browser_specific_settings.gecko` |
| **API 兼容层** | 回调转 Promise (`chrome.*`) | 原生 Promise (`browser.*`) |
| **Profile 目录** | `.e2e-profile/chrome` | `.e2e-profile/firefox` |
| **扩展加载方式** | `--load-extension` 参数 | `firefoxUserPrefs` / `web-ext` |
| **自动化测试频率** | 核心主测（覆盖日常开发 90%） | 回归验证（发版前及跨端验证） |

---

### 5. 目录结构与技术落地路线

#### 5.1 目录规划
```
tests/
├── e2e/
│   ├── config/
│   │   ├── playwright.config.ts    # Playwright 配置文件
│   │   └── constants.ts            # 常量与基准
│   ├── helpers/
│   │   ├── auth.ts                 # 登录态检测与守卫
│   │   ├── browser-launcher.ts     # 浏览器启动封装
│   │   └── extension-storage.ts    # 存储注入与重置
│   ├── snapshots/                  # 视觉基准快照
│   ├── quickbar-mount.spec.ts      # Quickbar 挂载
│   ├── cross-tab-sync.spec.ts      # 跨 Tab 广播
│   ├── theme.spec.ts               # 主题联动
│   ├── popup.spec.ts               # Popup 交互测试
│   ├── popup-visual.spec.ts        # 视觉快照对比
│   └── coverage-gaps.spec.ts       # 架构规则加固
```

#### 5.2 依赖选型与安装
```bash
npm i -D @playwright/test
```
在 `.gitignore` 中加入隔离：
```gitignore
.e2e-profile/
test-results/
playwright-report/
```

#### 5.3 npm / Makefile 命令规范
```json
{
  "scripts": {
    "test:e2e": "make build-all && playwright test",
    "test:e2e:chrome": "make build-chrome && playwright test --project=chrome",
    "test:e2e:firefox": "make build-firefox && playwright test --project=firefox",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:update-snapshots": "playwright test --update-snapshots"
  }
}
```

---

### 6. 实施路线建议 (Phase-by-Phase)

1. **第一阶段：环境验证与登录感知（原型跑通）** — ✅ **已完成**
   - 编写 `tests/e2e/helpers/auth.ts` 与 `tests/e2e/fixtures.ts`。
   - 验证打开本地 Chrome、持久化保留 AWS 会话态并自动感知 `/home`。
   - 自动检测并完成控制台原生 "Console Home" 顶栏图钉的自动固定。

2. **第二阶段：核心 Quickbar 注入断言** — ✅ **已完成**
   - 实现 [quickbar-mount.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/quickbar-mount.spec.ts)，验证原生样式克隆注入。
   - 跨服务导航测试 [recently-visited-navigation.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/recently-visited-navigation.spec.ts)。
   - 跨 Tab 实时同步测试 [cross-tab-sync.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/cross-tab-sync.spec.ts)。

3. **第三阶段：Popup 交互与视觉截屏** — ✅ **已完成**
   - 交互功能测试 [popup.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/popup.spec.ts)（Pin/Unpin、搜索、拖拽排序、maxServices）。
   - 主题联动测试 [theme.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/theme.spec.ts)（模拟原生 radio 点击与样式切换）。
   - 视觉截屏对比 [popup-visual.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/popup-visual.spec.ts)（Dark / Light 模式高保真对比）。

4. **第四阶段：Firefox 产物验证与跨平台集成** — ✅ **已完成**
   - 实现 [firefox.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/firefox.spec.ts) 验证 Firefox MV3 清单规范与 AMO 打包合规。
   - 实现 [firefox-visual.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/firefox-visual.spec.ts) 自动化验证 Firefox 产物渲染。
   - （注：真实 Firefox 引擎由于 macOS 27 沙盒问题 [Playwright #42082](https://github.com/microsoft/playwright/issues/42082) 目前采用 `npm run run:firefox` 进行独立验证）。

5. **第五阶段：测试 Review 与覆盖缺口加固** — ✅ **已完成**
   - 新增 [coverage-gaps.spec.ts](file:///Users/hche608/Documents/Personal/aws-favorites-quickbar/tests/e2e/coverage-gaps.spec.ts) 专项补充：首次启动 (Gap 1)、Rule 4 嵌套服务 ID (Gap 2)、Rule 3 no-native-pin 告警联动 (Gap 3)、updateQuickbar 热更新消息通道 (Gap 4)、Storage 生命周期持久化 (Gap 5)。
   - 随机测试引入确定性 Seed PRNG (mulberry32) 确保 100% 可重复回放。
   - 现已达成全套件 14 个测试文件、34 个端到端测试用例全面覆盖。
   - 详尽缺陷复盘请参见 [E2E 测试缺陷发现与排查报告 (docs/05-postmortem.md)](./05-postmortem.md)。
