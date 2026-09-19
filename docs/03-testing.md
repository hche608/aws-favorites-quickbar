# AWS Favorites Quickbar — Testing Architecture & Specification / 测试体系架构与全量规范

> **Version / 版本**：v1.4.1+  
> **Quality Benchmark / 质量基准**：441 unit & integration tests passing (100%), 34 end-to-end (E2E) & visual regression tests passing (100%), 94%+ test coverage, 0 security vulnerabilities.  
> [English](#english) | [中文](#chinese)

---

<a name="english"></a>
## 🇬🇧 English

### Table of Contents

1. [Testing Pyramid & Global Strategy](#1-testing-pyramid--global-strategy)
2. [Tech Stack & Tooling](#2-tech-stack--tooling)
3. [Unit & Property-Based Testing](#3-unit--property-based-testing)
4. [Integration Testing](#4-integration-testing)
5. [Real-Browser Playwright E2E Testing System](#5-real-browser-playwright-e2e-testing-system)
   - [5.1 Persistent Profile & Zero-Credential Auth Sensing](#51-persistent-profile--zero-credential-auth-sensing)
   - [5.2 Native Pin Auto-Healing Technique](#52-native-pin-auto-healing-technique)
   - [5.3 PRNG Deterministic Reproducible Testing](#53-prng-deterministic-reproducible-testing)
   - [5.4 Architectural Guardrail Hardening Suite](#54-architectural-guardrail-hardening-suite)
6. [Visual Regression Testing](#6-visual-regression-testing)
7. [Cross-Browser Testing & Known Limitations](#7-cross-browser-testing--known-limitations)
8. [Test Commands & CI Specification](#8-test-commands--ci-specification)

---

### 1. Testing Pyramid & Global Strategy

Quality engineering in this project is built upon a strict multi-tier testing pyramid:

```
                    ┌────────────────────────┐
                    │     E2E Browser Tests  │  34 Tests / 14 Specs
                    │   (Playwright + AWS)   │  Live Console + Visual Snapshots
                    ├────────────────────────┤
                    │    Integration Tests   │  7 Test Suites
                    │   (Vitest + DOM Mocks) │  Content/Popup Cross-Module Coordination
                    ├────────────────────────┤
                    │ Unit & Property Tests  │  27 Test Suites / 441 Tests
                    │ (Vitest + fast-check)  │  State Machines, Algorithms, Boundaries
                    └────────────────────────┘
```

- **Core Business Modules** (`utils/`, `services/`, `quickbar/`, `popup/`): Achieve 90%+ statement coverage and rigorous branch coverage via unit and property-based fuzz tests.
- **Entry Coordination Scripts** (`content.ts`, `popup.ts`): Verify end-to-end data flows, lifecycle events, and DOM injection stages via cross-module integration tests.
- **Live User Experience**: Loads the compiled extension artifact into Playwright on the real AWS Console to automatically validate injection, theme synchronization, cross-tab broadcasts, and storage persistence.

---

### 2. Tech Stack & Tooling

| Tier | Tool / Library | Version | Role |
|:---|:---|:---|:---|
| **Test Runner** | **Vitest** | `^5.0.1` | Modern ESM-native blazing-fast test runner replacing Jest. |
| **DOM Simulation** | **jsdom** | `^30.1.0` | Simulates WebExtensions and HTML runtime inside Node.js. |
| **Property-Based Testing** | **fast-check** | `^4.10.1` | Generates 100+ random iterations of boundary inputs to assert mathematical invariants. |
| **E2E Automation** | **Playwright** | `^1.63.0` | Drives real Chromium/Firefox instances with the extension preloaded. |
| **Coverage Engine** | **@vitest/coverage-v8** | `^5.0.1` | High-precision native V8 code coverage statistics. |

---

### 3. Unit & Property-Based Testing

#### 3.1 Core Test Suites (`tests/unit/`)
- **`utils/`**: Tests DOM observation (`waitForElement`), dual-storage sync caching, and AWS region resolution.
- **`services/`**:
  - `recently-visited-parser.test.ts`: Strictly enforces Rule 4 (`/<serviceId>/home` extraction).
  - `service-icons.test.ts`: Asserts built-in 220-service CDN icon mapping and instant fallbacks.
  - `icon-validator.test.ts`: HTTPS enforcement, timeout circuit-breakers, and SVG syntax checks.
  - `service-merger.test.ts`: Verifies pinned-first priority, recently visited ordering, and deduplication.
- **`quickbar/`**: Tests dynamic Polaris CSS extraction, DOM builder logic, and injection lifecycle.
- **`popup/`**: Tests real-time search filtering, drag-and-drop state machines, badge counters, and UI error states.

#### 3.2 Property-Based Testing (fast-check)
Validates 14 global invariants (each running 100+ randomized iterations):
1. **Build Output Invariance**: Distribution output topological layout matches source structure.
2. **Build Completeness**: All required static manifests and icon bundles exist.
3. **LOC Constraint (Rule 2)**: Every source and test file strictly adheres to `< 300 LOC`.
4. **Icon URL Validator Resilience**: Malformed/hostile input strings never throw unhandled exceptions.
5. **Service Merger Idempotency & Deduplication**: No duplicate services appear regardless of input permutations; pinned ordering is preserved.
6. **Search Filter Correctness**: Substring search and case-insensitive matching satisfy transitivity.
7. **Drag-and-Drop Order Persistence**: Reordered sequences maintain integrity after storage write/read cycles.

---

### 4. Integration Testing

Located in `tests/integration/`, testing full cross-module workflows:
- `content-script.test.ts`: Page load -> extract native CSS -> merge services -> DOM injection pipeline.
- `popup-workflow.test.ts`: Popup mount -> read storage -> toggle pins -> broadcast refresh event.
- `service-pinning-toggle.test.ts`: Toggle operations persist and maintain state machine idempotency.
- `user-favorites-ordering.test.ts`: Pinned vs. recently visited priority assertions.
- `error-scenarios.test.ts`: Missing native pins, sudden DOM mutations, network degradation defenses.

---

### 5. Real-Browser Playwright E2E Testing System

#### 5.1 Persistent Profile & Zero-Credential Auth Sensing
Tests run via Playwright's `launchPersistentContext` in headed Chrome:
- Dedicated user profile directory at `.e2e-profile/chrome` (enforced in `.gitignore`).
- **Zero Credential Exposure**: Developers perform SSO/MFA login once in the opened browser; subsequent test runs reuse active cookies and sessions instantly.
- `ensureAwsLoggedIn` provides intelligent redirection sensing and Console Home detection.

#### 5.2 Native Pin Auto-Healing Technique
Per Rule 3, injection cannot proceed without an existing native pinned service.
When the test suite detects an empty favorites bar on a fresh AWS account, it automatically opens the Console search modal, searches for "Console Home", and pins it. This allows test runs to self-heal on clean AWS accounts.

#### 5.3 PRNG Deterministic Reproducible Testing
- `quickbar-random.spec.ts` and `quickbar-pool-random.spec.ts` implement the **Mulberry32 algorithm**.
- Outputs at start: `🎲 Random seed: <seed>`.
- Enables wide sampling across 220 services while guaranteeing 100% deterministic test replay upon failure.

#### 5.4 Architectural Guardrail Hardening Suite (`coverage-gaps.spec.ts`)

| Gap Spec | Target Rule / Scenario | Verification |
|:---|:---|:---|
| **Gap 1** | **Rule 1: No Fallback Patterns** | Asserts initial clean state on `undefined` storage (`0 / 10`, no checkboxes, no drag handles). |
| **Gap 2** | **Rule 4: Nested Service Parsing** | Confirms CodeBuild/CodePipeline resolve correctly without collapsing to `codesuite`. |
| **Gap 3** | **Rule 3: Dynamic CSS Linking** | Asserts popup shows `#pinningNote` when native pin is absent, hiding it once resolved. |
| **Gap 4** | **Runtime Hot Update Channel** | Pinned changes in popup reflect in the Console quickbar within seconds without page reload. |
| **Gap 5** | **Storage Lifecycle Persistence** | `storage.sync` settings survive page reloads and browser context restarts. |

---

### 6. Visual Regression Testing

- **`popup-visual.spec.ts`**: Renders popup in an isolated test harness and captures high-fidelity **Dark Mode** and **Light Mode** snapshots.
- **`firefox-visual.spec.ts`**: Verifies visual layout and distribution structure of the Firefox build package.
- Output artifacts are saved to portable `test-results/` directories.

---

### 7. Cross-Browser Testing & Known Limitations

- **Chrome (Chromium)**: 100% automated E2E coverage via Playwright persistent context (14 specs / 34 tests).
- **Firefox (Gecko)**:
  - **Status**: Due to a **macOS 27 kernel sandbox issue** ([Playwright #42082](https://github.com/microsoft/playwright/issues/42082)), Playwright cannot spawn Firefox child processes directly on this macOS version.
  - **Strategy**: Automated specs (`firefox.spec.ts`, `firefox-visual.spec.ts`) validate Firefox distribution artifacts and AMO rules under Chromium; live Firefox verification is performed manually via `npm run run:firefox` (`web-ext`).

---

### 8. Test Commands & CI Specification

```bash
# Full verification (Type-Check + ESLint + Prettier + 441 unit/integration tests)
npm run check:all

# Run all Playwright E2E browser tests
npm run test:e2e

# Interactive login refresher for AWS Console session
npm run test:e2e:login

# Open Playwright UI interactive debugging dashboard
npm run test:e2e:ui

# Security and dependency audit check
npm run security-check
```

---

<a name="chinese"></a>
## 🇨🇳 中文

### 目录

1. [测试金字塔与总体策略](#1-测试金字塔与总体策略)
2. [技术选型与工具链](#2-技术选型与工具链)
3. [单元与属性测试架构 (Unit & Property-Based Testing)](#3-单元与属性测试架构-unit--property-based-testing)
4. [集成工作流测试 (Integration Testing)](#4-集成工作流测试-integration-testing)
5. [真实浏览器 E2E 自动化测试体系 (Playwright E2E)](#5-真实浏览器-e2e-自动化测试体系-playwright-e2e)
   - [5.1 持久化会话环境与免密感知](#51-持久化会话环境与免密感知)
   - [5.2 原生 Pin 自动自愈技术](#52-原生-pin-自动自愈技术)
   - [5.3 PRNG 确定性可复现随机测试](#53-prng-确定性可复现随机测试)
   - [5.4 核心规则防线加固套件 (Coverage Gaps)](#54-核心规则防线加固套件-coverage-gaps)
6. [视觉回归截屏测试 (Visual Regression)](#6-视觉回归截屏测试-visual-regression)
7. [跨浏览器测试与已知限制](#7-跨浏览器测试与已知限制)
8. [执行命令与 CI 规范](#8-执行命令与-ci-规范)

---

### 1. 测试金字塔与总体策略

本项目的质量工程构建于严密的多层测试金字塔之上：

```
                    ┌────────────────────────┐
                    │     E2E 浏览器测试      │  34 Tests / 14 Specs
                    │   (Playwright + AWS)   │  真实控制台环境 + 视觉快照
                    ├────────────────────────┤
                    │       集成测试         │  7 Test Suites
                    │   (Vitest + DOM Mocks) │  Content/Popup 跨模块协调
                    ├────────────────────────┤
                    │  单元与基于属性测试   │  27 Test Suites / 441 Tests
                    │ (Vitest + fast-check)  │  状态机、算法、边缘边界
                    └────────────────────────┘
```

- **业务核心模块**（`utils/`, `services/`, `quickbar/`, `popup/`）：通过单元与基于属性的模糊测试达到 90%+ 语句覆盖与强分支覆盖。
- **入口编排脚本**（`content.ts`, `popup.ts`）：通过跨模块集成测试验证数据流与 DOM 注入生命周期。
- **真实运行体验**：通过 Playwright 挂载编译后的真实扩展，在真实 AWS 控制台上全自动验证挂载、主题同步、跨 Tab 广播与持久化。

---

### 2. 技术选型与工具链

| 层次 | 工具 / 库 | 版本 | 核心职责 |
|:---|:---|:---|:---|
| **测试运行器** | **Vitest** | `^5.0.1` | 现代 ESM 驱动的极速测试运行器，替代传统 Jest。 |
| **DOM 仿真** | **jsdom** | `^30.1.0` | 在 Node.js 环境中模拟 WebExtensions 与 HTML 运行时。 |
| **属性模糊测试** | **fast-check** | `^4.10.1` | 随机生成 100+ 轮次极端输入，验证通用数学/逻辑属性。 |
| **端到端浏览器** | **Playwright** | `^1.63.0` | 驱动真实 Chromium/Firefox 实例并加载扩展进行 E2E 验证。 |
| **覆盖率收集** | **@vitest/coverage-v8** | `^5.0.1` | 基于 V8 原生引擎的高精度代码覆盖率统计。 |

---

### 3. 单元与属性测试架构 (Unit & Property-Based Testing)

#### 3.1 核心测试套件分布 (`tests/unit/`)
- **`utils/`**：验证 DOM 挂载等待（MutationObserver）、双层存储同步机制与 AWS 区域解析。
- **`services/`**：
  - `recently-visited-parser.test.ts`：严格验证 Rule 4（`/<serviceId>/home` 提取）。
  - `service-icons.test.ts`：验证内置 220 官方 CDN 图标库映射有效性与秒级回落。
  - `icon-validator.test.ts`：HTTPS 协议验证、超时熔断与 SVG 内容合法性。
  - `service-merger.test.ts`：验证用户收藏优先、最近访问紧随其后、自动排重逻辑。
- **`quickbar/`**：测试 Polaris 类名动态抓取、DOM 结构构建与注入节点生命周期。
- **`popup/`**：测试实时搜索过滤、拖拽排序状态机、徽章计数器与 UI 状态切换。

#### 3.2 基于属性的模糊测试 (Property-Based Testing)
利用 `fast-check` 验证了 14 项通用系统不变量（每个属性运行 100+ 随机迭代）：
1. **构建输出结构保留**：打包产物与源代码拓扑结构一致。
2. **构建完整性**：所有必需的静态清单与资源必须存在。
3. **单文件行数限制 (Rule 2)**：所有源文件与测试文件必须严格 `< 300 LOC`。
4. **图标 URL 校验健壮性**：无论传入何种恶意/畸形字符串，绝不抛出未捕获异常。
5. **服务合并幂等性与去重**：任意组合输入下，同一服务绝不重复出现，置顶项保持顺序不变。
6. **搜索过滤正确性**：子串搜索与大小写不敏感匹配满足传递性。
7. **拖放排序持久性**：任意重排序列在存储载入后保持一致。

---

### 4. 集成工作流测试 (Integration Testing)

位于 `tests/integration/`，涵盖完整的跨模块业务闭环：
- `content-script.test.ts`：页面加载 -> 提取原生类名 -> 融合服务 -> DOM 注入全流程。
- `popup-workflow.test.ts`：Popup 挂载 -> 读取存储 -> 勾选修改 -> 广播刷新全流程。
- `service-pinning-toggle.test.ts`：置顶与取消置顶操作的持久化与状态机幂等性。
- `user-favorites-ordering.test.ts`：置顶项与最近访问项的优先级断言。
- `error-scenarios.test.ts`：无原生 Pin、DOM 节点突发移除、网络抖动等边界防御。

---

### 5. 真实浏览器 E2E 自动化测试体系 (Playwright E2E)

#### 5.1 持久化会话环境与免密感知
测试通过 Playwright 的 `launchPersistentContext` 启动非无头浏览器：
- 独立用户数据目录 `.e2e-profile/chrome`（已加入 `.gitignore`）。
- **零密码泄露**：开发者只需首次在弹出的浏览器中通过真实 SSO/MFA 登录一次，后续测试即刻秒级复用 Cookie/Session。
- `ensureAwsLoggedIn` 具备智能重定向感知与控制台主页判定。

#### 5.2 原生 Pin 自动自愈技术
根据 Rule 3，若控制台完全没有原生 Pin，扩展无法注入。
测试框架在检测到原生 Pin 为空时，会自动打开控制台搜索框、检索并点击 "Console Home" 图钉完成自动前置配置，实现测试套件在空白新账号上的**全自动自愈运行**。

#### 5.3 PRNG 确定性可复现随机测试
- `quickbar-random.spec.ts` 与 `quickbar-pool-random.spec.ts` 引入 **Mulberry32 算法**。
- 启动时输出：`🎲 Random seed: <seed>`。
- 保证压力测试在拥有 220 种服务全量抽样能力的同时，失败现场可 100% 精准回放重现。

#### 5.4 核心规则防线加固套件 (`coverage-gaps.spec.ts`)

| 测试项 | 针对的架构规则 / 场景 | 验证内容 |
|:---|:---|:---|
| **Gap 1** | **Rule 1: 无 Fallback 模式** | 验证清空存储（`undefined`）时的干净初始状态（`0 / 10`，无预选，无手柄）。 |
| **Gap 2** | **Rule 4: 嵌套服务路径解析** | 验证 CodeBuild / CodePipeline 正确识别，绝不回退为 `codesuite`。 |
| **Gap 3** | **Rule 3: 动态样式提取联动** | 验证缺少原生 Pin 时 Popup 弹出 `#pinningNote` 引导，恢复后自动隐藏。 |
| **Gap 4** | **运行时热更新通道** | Popup 点击新服务后，Console 快速栏无需 reload 页面即刻挂载。 |
| **Gap 5** | **存储生命周期持久性** | 跨页面开闭与会话重启，`storage.sync` 设置保持完整无损。 |

---

### 6. 视觉回归截屏测试 (Visual Regression)

- **`popup-visual.spec.ts`**：在独立的测试环境下自动渲染 Popup，分别拍摄 **Dark Mode** 与 **Light Mode** 高保真快照，断言 Header、Badge、搜索栏及条目悬停的高保真度。
- **`firefox-visual.spec.ts`**：对 Firefox 构建包解压产物执行静态与渲染视觉审查。
- 产物输出至可移植的 `test-results/` 目录中。

---

### 7. 跨浏览器测试与已知限制

- **Chrome (Chromium)**：通过 Playwright persistent context 实现 100% 全自动化 E2E 覆盖（14 specs / 34 tests 全部自动运行）。
- **Firefox (Gecko)**：
  - **当前状态**：因 **macOS 27 内核沙盒与 Playwright 的兼容性缺陷**（[Playwright #42082](https://github.com/microsoft/playwright/issues/42082)），Playwright 无法在当前系统直接唤起 Firefox 子进程。
  - **分层策略**：自动化用例（`firefox.spec.ts`, `firefox-visual.spec.ts`）验证 Firefox distribution 产物结构与 AMO 规范；真实 Firefox 浏览器验证通过官方 `npm run run:firefox` 进行独立手动回归。

---

### 8. 执行命令与 CI 规范

```bash
# 全量验证（Type-Check + ESLint + Prettier + 441 个单元/集成测试）
npm run check:all

# 运行真实浏览器 Playwright E2E 全量测试
npm run test:e2e

# 交互式快速刷新 AWS 控制台登录态（若会话过期时运行）
npm run test:e2e:login

# 启动 Playwright UI 交互式调试面板
npm run test:e2e:ui

# 运行安全性与无死依赖检查
npm run security-check
```
