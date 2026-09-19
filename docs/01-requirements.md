# AWS Favorites Quickbar — Product Requirements & Specifications / 业务需求与功能规范

> **Version / 版本**：v1.4.1+  
> [English](#english) | [中文](#chinese)

---

<a name="english"></a>
## 🇬🇧 English

### 1. Glossary

- **Quickbar**: The customizable navigation favorites bar injected at the top of the AWS Console navbar.
- **Pinned Service**: An AWS service explicitly selected and saved by the user via the extension popup.
- **Recently Visited**: AWS services dynamically parsed from the AWS Console homepage "Recently Visited" dashboard widget.
- **Polaris / CloudScape**: AWS's official design system component library and its internal CSS class naming conventions.
- **CSS Template**: The set of CSS classes dynamically cloned from the user's first native pinned service.
- **Visual Mode**: The user's global light or dark theme override preference across all AWS accounts.

### 2. Functional Requirements & Acceptance Criteria

#### Requirement 1: Cross-Account Favorites Persistence
- **User Story**: As an engineer working across multiple AWS accounts, I want my pinned favorite services to persist across all accounts so that I never have to manually re-pin services after switching accounts or assuming roles.
- **Acceptance Criteria**:
  1. WHEN a user pins a service in any AWS account THEN the extension SHALL store that preference in `browser.storage.sync`.
  2. WHEN the user switches to a different AWS account or assumes a new role THEN the extension SHALL render the identical pinned favorites.
  3. WHEN favorites are stored THEN the extension SHALL preserve user-defined drag-and-drop order across browser restarts.

#### Requirement 2: Recently Visited Services Detection & Merging
- **User Story**: As a user, I want recently accessed services to appear automatically in my quickbar so that I can quickly re-visit services without manual pinning.
- **Acceptance Criteria**:
  1. WHEN the AWS Console homepage loads THEN the extension SHALL observe and parse the "Recently Visited" dashboard widget.
  2. WHEN merging services THEN pinned favorites SHALL always appear first, followed by recently visited services.
  3. WHEN a recently visited service is already pinned THEN the extension SHALL deduplicate it and display it once in the pinned section.

#### Requirement 3: Maximum Services Limit Configuration
- **User Story**: As a user, I want to control the total number of services shown in the quickbar to balance convenience and screen space.
- **Acceptance Criteria**:
  1. Initial default limit SHALL be `10`, configurable between `1` and `50` via the popup settings.
  2. WHEN total merged services exceed `maxServices` THEN the extension SHALL truncate from the end, giving pinned items highest retention priority.

#### Requirement 4: Simulated Native Theme Synchronization (Light / Dark)
- **User Story**: As a user, I want my preferred visual theme (light or dark) consistently applied across all accounts without visual jarring.
- **Acceptance Criteria**:
  1. Default visual mode SHALL be `dark`.
  2. The content script SHALL wait for `[data-testid="visualModeRadioGroup"]` and dispatch simulated native `click` and `change` events on the matching radio input.
  3. The extension SHALL NOT directly inject or mutate body CSS classes.

#### Requirement 5: Dynamic Polaris CSS Class Extraction & Linkage
- **User Story**: As a user, I want injected quickbar items to visually match native AWS favorites seamlessly.
- **Acceptance Criteria**:
  1. The content script SHALL extract classes from the first native pinned favorite at runtime (no hardcoded hashes).
  2. WHEN no native pinned favorite exists THEN the extension SHALL suspend injection and record `injectionStatus: 'no-native-pin'`.
  3. WHEN `injectionStatus === 'no-native-pin'` THEN the popup SHALL display the `#pinningNote` banner; once resolved, it SHALL hide automatically.

#### Requirement 6: Nested Service ID Parsing (Rule 4)
- **User Story**: As a developer, I want CodeSuite and nested AWS services identified accurately without name collision.
- **Acceptance Criteria**:
  1. Service IDs SHALL be parsed using `/\/([^\/]+)\/home/` matching the path segment immediately preceding `/home`.
  2. `/codesuite/codebuild/home` SHALL resolve to `codebuild`, NEVER `codesuite`.

#### Requirement 7: Modern Popup Management Interface
- **User Story**: As a user, I want an intuitive popup interface to manage, search, and reorder my favorites.
- **Acceptance Criteria**:
  1. The header SHALL display an active favorites counter badge (`count / max`) with visual warning state on limit reached.
  2. The search input SHALL support real-time filtering by service name or ID, with a dedicated clear button.
  3. The service list SHALL support HTML5 drag-and-drop reordering with immediate sync storage persistence.
  4. Pin/unpin toggles SHALL broadcast `{ action: 'updateQuickbar' }` via runtime messaging for live quickbar injection without page reload.

#### Requirement 8: Built-in 220-Service AWS CDN Icon Catalog
- **User Story**: As a user, I want high-quality official icons rendered instantly without waiting for DOM scraping.
- **Acceptance Criteria**:
  1. The extension SHALL include a verified built-in catalog of 220 official AWS CloudFront/S3 CDN SVG icons.
  2. WHEN live console scraping is pending or unavailable THEN the catalog SHALL provide instantaneous fallback.

#### Requirement 9: Cross-Browser WebExtensions Manifest V3 Compatibility
- **User Story**: As a user on Chrome or Firefox, I want identical functionality and security.
- **Acceptance Criteria**:
  1. The extension SHALL strictly conform to Manifest V3 standards on Chromium and Firefox.
  2. Core logic SHALL interact exclusively via the `BrowserAPI` and `BrowserStorageAPI` abstraction layers.

### 3. Non-Functional Requirements & Architectural Constraints
1. **Rule 1 (No Fallbacks)**: `undefined` strictly represents first-launch state; silent heuristic defaults are forbidden.
2. **Rule 2 (Under 300 LOC)**: Every source and test file SHALL remain strictly under 300 lines of code.
3. **Privacy & Security**: Zero external telemetry requests; least-privilege permissions (`storage`, `tabs`, console host match); 100% data residency in local browser.
4. **Test Quality**: 100% passing unit & integration tests, >= 94% coverage, fully automated Playwright live-console E2E regression.

---

<a name="chinese"></a>
## 🇨🇳 中文

### 1. 术语表 (Glossary)

- **Quickbar (快速栏)**：注入在 AWS 控制台顶层导航栏中的自定义快捷收藏栏。
- **Pinned Service (置顶收藏)**：用户通过扩展弹窗主动勾选并固定的服务。
- **Recently Visited (最近访问)**：从 AWS 控制台主页部件中动态采集的近期访问服务。
- **Polaris / CloudScape**：AWS 官方设计系统组件库及其内部 CSS 类名规范。
- **CSS Template (样式模板)**：从首个原生固定服务中动态克隆出的类名集合。
- **Visual Mode (主题模式)**：统一控制台深浅色外观的全局偏好设置。

### 2. 功能需求与验收标准

#### 需求 1：跨账户收藏持久化
- **用户故事**：作为经常切换多个 AWS 账户的工程师，我希望置顶的服务跨所有账户通用，无需反复手动配置。
- **验收标准**：
  1. 用户在任意账户或角色下固定的服务，必须存储在浏览器的 `browser.storage.sync` 中。
  2. 切换到其他 AWS 账户或重新 AssumeRole 后，顶栏必须自动呈现相同的置顶服务列表。
  3. 用户自定的拖拽排序顺序在跨账户和浏览器重启后必须 100% 保持一致。

#### 需求 2：最近访问服务动态采集与融合
- **用户故事**：作为用户，我希望近期访问过的服务自动出现在收藏栏中，方便快速回访。
- **验收标准**：
  1. 控制台主页加载时，扩展必须自动监听并解析 "Recently Visited" 仪表盘部件。
  2. 融合输出时，用户置顶服务**必须严格排在最前**，最近访问服务紧随其后。
  3. 若某服务既被置顶又是最近访问，必须自动去重，只在置顶区域展示一次。

#### 需求 3：快速栏服务数量上限配置
- **用户故事**：作为用户，我希望自由调节快速栏展示的服务总数，平衡查找效率与屏幕空间。
- **验收标准**：
  1. 初始安装默认上限为 `10`，用户可在 Popup 中配置 `1–50` 之间的整数。
  2. 融合总数超出上限时，严格从后向前截断（置顶项享有最高保留优先级）。

#### 需求 4：原生主题联动切换 (Light / Dark)
- **用户故事**：作为用户，我希望统一所有账户的深/浅色模式，避免切账户时光暗刺眼。
- **验收标准**：
  1. 默认主题模式为 `dark`。
  2. 控制台注入脚本必须等待 `[data-testid="visualModeRadioGroup"]` 出现，模拟原生 `click` + `change` 事件触发 AWS 自带主题引擎。
  3. 严禁直接强行修改 body class 或注入覆盖样式。

#### 需求 5：动态 Polaris 样式克隆与状态联动
- **用户故事**：作为用户，我希望注入的快捷项与原生 AWS 控制台元素完全一致。
- **验收标准**：
  1. 运行时从首个原生置顶项动态提取外层 `li`、链接 `a`、图标和文字的 class，严禁硬编码。
  2. 若账户完全无原生固定服务，脚本必须安全挂起并向本地存储写入 `injectionStatus: 'no-native-pin'`。
  3. Popup 打开时若检测到 `no-native-pin`，必须展示 `#pinningNote` 引导横幅；一旦用户固定并恢复，横幅自动隐藏。

#### 需求 6：嵌套路径服务 ID 提取规范 (Rule 4)
- **用户故事**：作为云开发者，我希望 CodeBuild、CodePipeline 等二级服务正确识别，不发生同名冲突。
- **验收标准**：
  1. 所有服务 ID 必须由正则 `/\/([^\/]+)\/home/` 提取 `/home` 前紧邻的路径段。
  2. `/codesuite/codebuild/home` 必须提取为 `codebuild`，绝不能截取为 `codesuite`。

#### 需求 7：现代化 Popup 交互与管理界面
- **用户故事**：作为用户，我希望在一个美观、流畅的弹窗中轻松管理我的收藏。
- **验收标准**：
  1. Header 配备动态计数徽章（如 `3 / 10`），满额时呈现警告色态。
  2. 搜索框支持拼写与 ID 实时过滤，并配备一键清空按钮。
  3. 置顶项支持 HTML5 原生拖拽排序，松手即刻保存。
  4. 勾选/取消即刻通过运行时广播通知当前控制台页实时热更新，无需刷新页面。

#### 需求 8：内置 220 官方 CDN 图标映射
- **用户故事**：作为用户，我希望任何标准 AWS 服务都能秒级显示清晰的官方图标。
- **验收标准**：
  1. 内置 220 个服务的官方 CloudFront/S3 CDN SVG 静态映射库。
  2. 控制台抓取缺失时，秒级降级至内置 CDN 映射，彻底解决图标空白问题。

#### 需求 9：跨浏览器 Manifest V3 兼容
- **用户故事**：无论使用 Chrome 还是 Firefox，我都能获得一致的快速栏体验。
- **验收标准**：
  1. 纯粹遵循现代 WebExtensions Manifest V3 标准。
  2. 统一通过跨浏览器抽象层（`browser-api.ts` / `browser-storage.ts`）与浏览器交互。

### 3. 非功能性需求与架构约束
1. **Rule 1（零静默兜底）**：`undefined` 明确表达初次安装状态，严禁使用 fallback 逻辑抹平状态差。
2. **Rule 2（单文件限制）**：所有源代码与测试代码文件行数必须严格 `< 300 LOC`。
3. **隐私与安全**：零外部遥测请求，权限最小化（仅 `storage`、`tabs` 及控制台域名匹配），100% 数据归属于用户本地浏览器。
4. **测试质量**：单元/集成测试全通过、代码覆盖率 >= 94%、E2E 真实控制台全自动回归闭环。
