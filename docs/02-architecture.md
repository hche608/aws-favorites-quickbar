# AWS Favorites Quickbar — System Architecture & Technical Design / 系统架构与技术设计文档

> **Version / 版本**：v1.4.1+  
> [English](#english) | [中文](#chinese)

---

<a name="english"></a>
## 🇬🇧 English

### Overview
- **Positioning**: A cross-account, cross-role multi-functional quick favorites bar browser extension for the AWS Console (Chrome & Firefox Manifest V3).
- **Core Value**: Leverages browser sync/local storage to completely solve the AWS Console pain point where favorites are isolated per account and role. Blends "Recently Visited" services with an official 220-service CDN icon library to deliver an instantaneous, native navigation experience.

---

### Table of Contents

1. [Background & Core Problem](#1-background--core-problem)
2. [The 6 Non-Negotiable Architectural Rules](#2-the-6-non-negotiable-architectural-rules)
3. [System Architecture & Data Flow](#3-system-architecture--data-flow)
4. [Storage Schema & Cache Architecture](#4-storage-schema--cache-architecture)
5. [Core Component Implementation](#5-core-component-implementation)
   - [5.1 Service & CDN Icon Parser Engine](#51-service--cdn-icon-parser-engine)
   - [5.2 Quickbar Injection Pipeline](#52-quickbar-injection-pipeline)
   - [5.3 Cross-Platform Simulated Theme Sync](#53-cross-platform-simulated-theme-sync)
   - [5.4 Modern Popup Management Dashboard](#54-modern-popup-management-dashboard)
6. [Cross-Browser Abstraction Layer](#6-cross-browser-abstraction-layer)
7. [Security, Privacy & Permission Model](#7-security-privacy--permission-model)

---

### 1. Background & Core Problem

#### 1.1 Pain Points
In multi-account, multi-environment (Dev, Staging, Prod, Shared-Services, etc.) cloud workflows:
1. **Favorites are isolated per account and role**: The native AWS Console stores the top Favorites Bar within user account metadata. Switching accounts or assuming roles presents an empty or default favorites bar.
2. **Heavy manual configuration overhead**: Cloud engineers frequently switch between dozens of service consoles, repeating the tedious "search service -> click star" sequence.
3. **Lack of smart aggregation**: The native console cannot combine "Recently Visited" and "Pinned" items into a unified top bar.

#### 1.2 Solution
- **Independent Browser Storage**: Pins are persisted in `browser.storage.sync`, decoupling them completely from AWS account boundaries.
- **Automated Scraping & Merging**: Automatically parses the AWS Console "Recently Visited" dashboard widget and merges items with pinned favorites deduplicated.
- **Dynamic Style Cloning**: Clones Polaris/CloudScape CSS classes from native DOM at runtime, injecting quickbar items with pixel-perfect native fidelity.
- **Built-in 220-Service Official CDN Icon Library**: Renders official SVG icons instantly, preventing blank spots or layout shifts during page load.

---

### 2. The 6 Non-Negotiable Architectural Rules

Every modification to this codebase must adhere strictly to these principles:

| # | Rule | Description |
|:---|:---|:---|
| **Rule 1** | **No Fallback Patterns** | Do NOT use silent `try/catch`, cascading regexes, or `storage.get() \|\| []`. `undefined` strictly means "uninitialized / first launch". First-launch and returning-user flows must use explicit conditional branches. |
| **Rule 2** | **Under 300 LOC** | Every source and test file must remain under 300 lines of code. Maintain single responsibility per module; split files before adding bloat. |
| **Rule 3** | **Dynamic CSS Extraction** | Never hardcode AWS Polaris hashed CSS class names (e.g., `awsui_...`). Dynamic extraction runs against the first native pinned service. If none exists, injection safely halts with status `'no-native-pin'` and the popup displays a guidance banner. |
| **Rule 4** | **Service ID via `/<serviceId>/home`** | Service IDs must always be parsed using `/\/([^\/]+)\/home/`. Never extract only the first segment (preventing CodeSuite services like `/codesuite/codebuild/home` from misidentifying as `codesuite`). |
| **Rule 5** | **Simulated Native Theme Switching** | Theme switching must NOT directly mutate body CSS classes. Wait for `[data-testid="visualModeRadioGroup"]` and simulate native `click` and `change` events, allowing AWS Console's internal state machine to drive styling. |
| **Rule 6** | **Cross-Browser Independence** | Core business logic interacts exclusively with `BrowserAPI` and `BrowserStorageAPI` abstraction interfaces. Never call `chrome.*` or `browser.*` globals directly in service or utility modules. |

---

### 3. System Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AWS Console Web Page                            │
│                                                                        │
│  1. Page Load Initialization                                           │
│     └─► content.ts initializes pipeline coordinator                    │
│                                                                        │
│  2. Theme Synchronization (settings.ts)                                │
│     └─► Simulates click on [data-testid="visualModeRadioGroup"]        │
│                                                                        │
│  3. Scraping & Parsing                                                 │
│     ├─► recently-visited-parser.ts parses "Recently Visited" widget    │
│     │   (extracts service ID strictly via /<serviceId>/home)           │
│     ├─► service-icons.ts matches built-in 220 official CDN icons       │
│     └─► icon-extractor.ts extracts live Console CDN SVGs               │
│                                                                        │
│  4. Data Merging (service-merger.ts)                                   │
│     ├─► Pinned User Favorites (from browser.storage.sync) FIRST        │
│     ├─► Recently Visited Services SECOND (deduplicated against pins)   │
│     └─► Capped at maxServices threshold                                │
│                                                                        │
│  5. Quickbar Injection (quickbar/)                                     │
│     ├─► css-extractor.ts extracts Polaris classes from 1st native pin  │
│     ├─► dom-builder.ts builds cloned <li><a>...</a></li> nodes         │
│     └─► injector.ts mounts items into native navbar list               │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4. Storage Schema & Cache Architecture

The system uses a **three-tier storage architecture** balancing performance, cross-device sync, and reliability:

| Storage Scope | Key | Type | Description & Lifecycle |
|:---|:---|:---|:---|
| `browser.storage.sync` | `userFavorites` | `string[]` | Ordered list of pinned service IDs (synced across browser instances). |
| `browser.storage.sync` | `maxServices` | `number` | Maximum total services shown in quickbar (Default: `10`, range: `1–50`). |
| `browser.storage.sync` | `visualMode` | `'light' \| 'dark'` | Global theme preference (Default: `'dark'`). |
| `browser.storage.local` | `cachedServices` | `Service[]` | Scraped service metadata cache (ID, Name, Icon, URL). |
| `browser.storage.local` | `injectionStatus` | `'success' \| 'no-native-pin'` | DOM injection status driving the popup `#pinningNote` banner. |
| `localStorage` (Page) | `aws-favorites-quickbar-services` | `string (JSON)` | Synchronous in-page cache for instantaneous rendering on page reload. |

---

### 5. Core Component Implementation

#### 5.1 Service & CDN Icon Parser Engine
- **`recently-visited-parser.ts`**: Uses `MutationObserver` to watch for the Recently Visited widget, strictly extracting service IDs per Rule 4.
- **`service-icons.ts` & `default-icons.json`**: Built-in 220-service AWS CDN SVG icon catalog, eliminating icon flickering or missing states during slow network loads.
- **`icon-validator.ts`**: Validates HTTPS protocol and valid SVG format, filtering out placeholders or malformed Base64 data.

#### 5.2 Quickbar Injection Pipeline
- **`css-extractor.ts`**:
  1. Locates native favorites bar container (`ol` or `ul`).
  2. Extracts class names from the first native pinned item: outer `li`, link `a`, icon container, and label `span`.
  3. If no native pinned service exists, returns `null` and sets status to `'no-native-pin'`.
- **`dom-builder.ts`**: Constructs isomorphic DOM nodes with `data-service-id` attributes using extracted classes.
- **`injector.ts`**: Cleans previous injected nodes and mounts new elements alongside native items.

#### 5.3 Cross-Platform Simulated Theme Sync
- Per Rule 5, the extension avoids brute-force CSS class overrides or `!important` rules.
- `settings.ts` watches the DOM for `[data-testid="visualModeRadioGroup"]`.
- Dispatches native `MouseEvent('click')` and `Event('change')` to the target radio, allowing AWS CloudScape's state machine to handle the theme switch cleanly.

#### 5.4 Modern Popup Management Dashboard
- **Header Badge & Counter**: Real-time counter of pinned services vs. limit (e.g., `3 / 10`), with visual limit warnings.
- **Instant Search & Filter**: Real-time filtering by service ID or name with a dedicated clear button.
- **HTML5 Drag-and-Drop Reordering**: Seamless drag-and-drop reordering persisted immediately to `storage.sync`.
- **Runtime Live Refresh**: Toggling a service dispatches `{ action: 'updateQuickbar' }` via `chrome.tabs.sendMessage`, updating the quickbar without page reload.

---

### 6. Cross-Browser Abstraction Layer

Supports both **Google Chrome (Chromium)** and **Mozilla Firefox (Gecko)**:
- Business code strictly avoids direct global calls to `chrome` or `browser`.
- Integrates `webextension-polyfill` to unify Promise and Callback patterns.
- Core abstraction interfaces:
  - `BrowserAPI` (`src/browser-api.ts`): Encapsulates tab querying, runtime broadcast, and lifecycle events.
  - `BrowserStorageAPI` (`src/browser-storage.ts`): Encapsulates sync and local storage operations.
- Build pipeline: `scripts/bundle.ts` outputs `dist/chrome/` and `dist/firefox/` with browser-tailored Manifest V3 configurations (`gecko` ID in Firefox).

---

### 7. Security, Privacy & Permission Model

- **Zero External Calls**: Contains no third-party tracking, telemetries, or remote analytics; all data remains local to the browser.
- **Strict Host Permissions**:
  ```json
  "host_permissions": [
    "https://*.console.aws.amazon.com/*"
  ]
  ```
  Restricted exclusively to AWS Console domains.
- **Minimal Extension Permissions**: Only requests `storage` and `tabs`, fully complying with Chrome Web Store and Mozilla AMO security guidelines.

---

<a name="chinese"></a>
## 🇨🇳 中文

### 概述
- **定位**：跨账户、跨角色的 AWS 控制台多功能快速收藏栏浏览器扩展（Chrome & Firefox Manifest V3）。
- **核心价值**：通过浏览器本地与云同步存储，彻底解决 AWS 控制台收藏夹“按账户与角色隔离、切换即丢失”的痛点，并融合“最近访问（Recently Visited）”与官方 220 服务 CDN 图标库，实现无缝的原生化快捷导航体验。

---

### 目录

1. [背景与核心问题](#1-背景与核心问题)
2. [不可妥协的六大架构准则 (The 6 Non-Negotiable Rules)](#2-不可妥协的六大架构准则-the-6-non-negotiable-rules-1)
3. [系统整体架构与数据流](#3-系统整体架构与数据流-1)
4. [存储模型与缓存设计](#4-存储模型与缓存设计-1)
5. [核心模块技术实现](#5-核心模块技术实现-1)
   - [5.1 服务与 CDN 图标解析引擎](#51-服务与-cdn-图标解析引擎)
   - [5.2 原生快速栏注入管线](#52-原生快速栏注入管线)
   - [5.3 跨平台主题同步与模拟点击](#53-跨平台主题同步与模拟点击)
   - [5.4 Popup 现代化管理面板](#54-popup-现代化管理面板)
6. [跨浏览器抽象层 (Cross-Browser Architecture)](#6-跨浏览器抽象层-cross-browser-architecture-1)
7. [安全性、隐私与权限模型](#7-安全性隐私与权限模型-1)

---

### 1. 背景与核心问题

#### 1.1 业务痛点
在多账户、多环境（Dev, Staging, Prod, Shared-Services 等）的 AWS 云原生开发与运维中：
1. **控制台收藏按账户/角色隔离**：AWS Console 将顶部 Favorites Bar 存储在用户账户元数据中。每次切换账户或 AssumeRole 都会面临一个崭新、空白或默认的收藏栏。
2. **重复配置开销巨大**：工程师需要频繁在几十个微服务控制台间切换，不断重复“搜索服务 -> 点击五角星”的机械步骤。
3. **缺乏智能感知**：原生控制台无法将“最近使用”与“置顶固定”优雅合并呈现在顶栏。

#### 1.2 解决方案
- **独立存储于浏览器**：将置顶收藏持久化在浏览器的 `browser.storage.sync` 中，完全解耦 AWS 账户边界。
- **自动抓取与动态合并**：自动解析 AWS 控制台的 "Recently Visited" 仪表盘部件，与用户固定的服务合并去重。
- **动态样式克隆**：在运行时提取 AWS Polaris/CloudScape 真实 DOM 类名，以 100% 像素级原生风格注入自定义快捷项。
- **内置 220 官方 CDN 图标**：秒级直出官方 SVG 图标，杜绝页面未完全加载时的空白与占位。

---

### 2. 不可妥协的六大架构准则 (The 6 Non-Negotiable Rules)

所有对本代码库的改动必须严格遵循以下原则：

| # | 准则 | 说明 |
|:---|:---|:---|
| **Rule 1** | **No Fallback Patterns（禁止隐式兜底）** | 严禁使用吞噬异常的 `try/catch`、级联正则或 `storage.get() \|\| []`。<br>`undefined` 严格且唯一代表“全新安装/未初始化状态”。首开与回访用户必须走显式独立分支。 |
| **Rule 2** | **Under 300 LOC（单文件小于 300 行）** | 任意源文件或测试文件行数必须保持在 300 行以内。职责单一，超限前立即拆分辅助模块。 |
| **Rule 3** | **Dynamic CSS Extraction（动态样式提取）** | 严禁硬编码 AWS Polaris 散列类名（如 `awsui_...`）。所有样式在运行时从首个原生 Pin 节点动态提取。若无原生 Pin，注入安全挂起至 `'no-native-pin'` 并在 Popup 提示。 |
| **Rule 4** | **Service ID via `/<serviceId>/home`** | 提取服务 ID 必须严格匹配 `/\/([^\/]+)\/home/`。严禁简单截取首段（防止 CodeSuite 系列 `/codesuite/codebuild/home` 被错误提取为 `codesuite`）。 |
| **Rule 5** | **Simulated Native Theme Switching** | 主题切换不得直接注入修改 body 类名。必须等待 `[data-testid="visualModeRadioGroup"]` 并模拟原生 `click` 与 `change` 事件，交由 AWS 自身状态机驱动全局换肤。 |
| **Rule 6** | **Cross-Browser Independence** | 核心逻辑仅调用 `BrowserAPI` 与 `BrowserStorageAPI` 抽象接口，禁止在业务或工具模块直接引用 `chrome.*` 或 `browser.*` 全局变量。 |

---

### 3. 系统整体架构与数据流

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AWS Console Web Page                            │
│                                                                        │
│  1. 页面加载初始化                                                      │
│     └─► content.ts 启动执行管线                                        │
│                                                                        │
│  2. 主题同步 (settings.ts)                                             │
│     └─► 模拟点击 [data-testid="visualModeRadioGroup"] radio input       │
│                                                                        │
│  3. 服务抓取与解析                                                     │
│     ├─► recently-visited-parser.ts 解析 Recently Visited 仪表盘部件    │
│     │   (严格按 /<serviceId>/home 提取)                                │
│     ├─► service-icons.ts 匹配内置 220 官方 CDN 图标 (秒级回退)          │
│     └─► icon-extractor.ts 抓取控制台实时 CDN SVG                       │
│                                                                        │
│  4. 数据融合 (service-merger.ts)                                       │
│     ├─► 用户固定收藏 (从 browser.storage.sync) 置顶                    │
│     ├─► 最近访问服务 (Recently Visited) 紧随其后 (排重)                │
│     └─► 截断至 maxServices 阈值                                        │
│                                                                        │
│  5. 快速栏渲染与挂载 (quickbar/)                                        │
│     ├─► css-extractor.ts 从首个原生 Favorite 提取 Polaris CSS 类名     │
│     ├─► dom-builder.ts 构建克隆 <li><a>...</a></li> 节点               │
│     └─► injector.ts 挂载至原生 Navbar 列表                             │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4. 存储模型与缓存设计

系统采用**三层存储模型**以平衡性能、跨设备同步与可靠性：

| 存储域 | 存储 Key | 数据类型 | 作用与生命周期 |
|:---|:---|:---|:---|
| `browser.storage.sync` | `userFavorites` | `string[]` | 用户有序置顶的服务 ID 列表（跨浏览器实例同步）。 |
| `browser.storage.sync` | `maxServices` | `number` | 快速栏显示总服务上限（默认 `10`，范围 `1–50`）。 |
| `browser.storage.sync` | `visualMode` | `'light' \| 'dark'` | 全局主题偏好（默认 `'dark'`）。 |
| `browser.storage.local` | `cachedServices` | `Service[]` | 抓取到的服务元数据缓存（包含 ID、Name、Icon、URL）。 |
| `browser.storage.local` | `injectionStatus` | `'success' \| 'no-native-pin'` | 记录页面注入状态，用于驱动 Popup 展示 `#pinningNote`。 |
| `localStorage` (页面级) | `aws-favorites-quickbar-services` | `string (JSON)` | 控制台页面内同步缓存，保障页面刷新时快速栏瞬间直出。 |

---

### 5. 核心模块技术实现

#### 5.1 服务与 CDN 图标解析引擎 (Services)
- **`recently-visited-parser.ts`**：使用 `MutationObserver` 监听控制台 Recently Visited 部件渲染，严格根据 Rule 4 正则解析服务唯一标识符。
- **`service-icons.ts`** 与 **`default-icons.json`**：内置 AWS 官方 220 个服务的 SVG 图标 CDN 映射，彻底解决新账号或页面慢速加载时图标闪烁的问题。
- **`icon-validator.ts`**：校验提取图标的 HTTPS 协议与有效 SVG 结构，拒绝占位图与无效 Base64。

#### 5.2 原生快速栏注入管线 (Quickbar Injection)
- **`css-extractor.ts`**：
  1. 定位原生置顶栏容器 `ol` 或 `ul`。
  2. 提取第一个原生已固定项目的外层 `li`、链接 `a`、图标容器、标签 `span` 的类名。
  3. 若用户无任何原生固定服务，返回 `null` 并将状态标记为 `no-native-pin`。
- **`dom-builder.ts`**：基于提取的类名构建完全同构的 DOM 节点，附加 `data-service-id` 特征属性。
- **`injector.ts`**：清理既有注入项后追加节点，确保与原生元素和平共处。

#### 5.3 跨平台主题同步与模拟点击 (Theme Sync)
- 根据 Rule 5，扩展不采取粗暴的 CSS 类覆盖或 `!important` 注入。
- `settings.ts` 监听 DOM 树中的 `[data-testid="visualModeRadioGroup"]`。
- 一旦就绪，向目标 radio 发送原生的 `MouseEvent('click')` 和 `Event('change')`，触发 AWS 官方 CloudScape/Polaris 主题响应引擎。

#### 5.4 Popup 现代化管理面板 (Popup UI)
- **Header 徽章与统计**：实时显示当前固定服务数与上限配比（如 `3 / 10`），超限变色警示。
- **即时搜索与过滤**：支持通过服务 ID 或名称拼写实时过滤，配备专用一键清空按钮。
- **HTML5 原生拖拽排序**：支持对置顶服务进行无缝拖放排序，操作即时保存至 `storage.sync`。
- **运行时热更新**：用户在 Popup 中勾选/取消服务后，通过 `chrome.tabs.sendMessage` 向控制台派发 `{ action: 'updateQuickbar' }`，无需刷新即可实时反映变动。

---

### 6. 跨浏览器抽象层 (Cross-Browser Architecture)

扩展支持 **Google Chrome (Chromium 引擎)** 与 **Mozilla Firefox (Gecko 引擎)**。
- 业务代码严禁直接使用全局对象 `chrome` 或 `browser`。
- 引入 `webextension-polyfill` 抹平 Promise 与 Callback 差异。
- 核心抽象接口：
  - `BrowserAPI` (`src/browser-api.ts`)：封装 Tabs 查询、广播通信、运行时管理。
  - `BrowserStorageAPI` (`src/browser-storage.ts`)：封装 Sync 与 Local 存储操作。
- 构建管线：通过 `scripts/bundle.ts` 分别输出 `dist/chrome/` 与 `dist/firefox/`，并注入差异化的 Manifest V3（Firefox 包含 `browser_specific_settings.gecko`）。

---

### 7. 安全性、隐私与权限模型

- **零外部请求**：扩展不包含任何第三方追踪或远程分析代码，所有数据仅存储于浏览器本地。
- **严格的主机权限限定**：
  ```json
  "host_permissions": [
    "https://*.console.aws.amazon.com/*"
  ]
  ```
  仅在 AWS 官方控制台域名生效。
- **最小化扩展权限**：仅申请 `storage` 与 `tabs` 权限，完全符合 Chrome Web Store 与 Mozilla AMO 的安全上架审计标准。
