# E2E 自动化测试缺陷发现与排查报告 (Bug Findings Report)

> **背景**：在 AWS Favorites Quickbar 构建本地真实浏览器（Playwright）端到端自动化测试、多账户/全量服务压力测试及审查加固过程中，团队捕获并修复了 **9 个关键缺陷与稳定性问题**。本报告记录这些缺陷的现象、根因、修复方案及工程价值。

---

## 目录

1. [业务逻辑与架构规则缺陷](#1-业务逻辑与架构规则缺陷)
   - [Bug 1: 二级路径服务 ID 提取错误 (Rule 4)](#bug-1-二级路径服务-id-提取错误-rule-4)
   - [Bug 2: 首次启动与“清空收藏”状态混淆 (Rule 1)](#bug-2-首次启动与清空收藏状态混淆-rule-1)
   - [Bug 3: 无原生 Pin 导致样式克隆失效与告警脱节 (Rule 3)](#bug-3-无原生-pin-导致样式克隆失效与告警脱节-rule-3)
   - [Bug 4: Popup Pin 后控制台未实时热更新](#bug-4-popup-pin-后控制台未实时热更新)
2. [测试框架与自动化脚本缺陷](#2-测试框架与自动化脚本缺陷)
   - [Bug 5: Playwright 动态定位器状态翻转断言超时](#bug-5-playwright-动态定位器状态翻转断言超时)
   - [Bug 6: 随机测试不可复现性 (PRNG 种子缺失)](#bug-6-随机测试不可复现性-prng-种子缺失)
   - [Bug 7: Storage Helper 频繁开闭 Page 导致轮询瓶颈](#bug-7-storage-helper-频繁开闭-page-导致轮询瓶颈)
   - [Bug 8: 视觉回归测试硬编码绝对路径](#bug-8-视觉回归测试硬编码绝对路径)
3. [跨平台与浏览器底层兼容缺陷](#3-跨平台与浏览器底层兼容缺陷)
   - [Bug 9: Firefox on macOS 27 沙盒 SIGKILL 冲突 (Playwright #42082)](#bug-9-firefox-on-macos-27-沙盒-sigkill-冲突-playwright-42082)
4. [工程借鉴与防护收益](#4-工程借鉴与防护收益)

---

## 1. 业务逻辑与架构规则缺陷

### Bug 1: 二级路径服务 ID 提取错误 (Rule 4)
- **现象**：AWS CodeSuite 系列（CodeBuild、CodePipeline、CodeCommit）的控制台路径格式为 `/codesuite/<service>/home`。若仅按首段路径切分，全部会被误判为 `codesuite`，导致多服务在快速栏和存储中相互覆盖。
- **根因**：URL 正则使用了 `/\/([^\/]+)/` 匹配首个分段，未限定 `/home` 锚点。
- **修复**：全项目强制使用严格正则 `/\/([^\/]+)\/home/` 匹配紧邻 `/home` 前的分段，并在 `tests/e2e/coverage-gaps.spec.ts` (Gap 2) 建立专项回归测试。

### Bug 2: 首次启动与“清空收藏”状态混淆 (Rule 1)
- **现象**：若在数据加载中采用 `storage.get() || []` 等隐式兜底逻辑，全新安装首次启动（`userFavorites` 为 `undefined`）与用户手动清空收藏（`userFavorites` 为 `[]`）表现一致，破坏了首发状态机的纯粹性。
- **根因**：混淆了“未初始化状态”与“空数据状态”的语义差别。
- **修复**：明确将 `undefined` 视为首次启动分支，不自动回退为默认空数组。在 `coverage-gaps.spec.ts` (Gap 1) 中验证初次打开时展示空列表、徽章 `0 / 10` 且无拖动手柄。

### Bug 3: 无原生 Pin 导致样式克隆失效与告警脱节 (Rule 3)
- **现象**：当用户在 AWS 控制台从未手动收藏过任何服务时，顶栏无原生 `li` DOM 节点，`css-extractor.ts` 无法提取 Polaris 样式类，导致快速栏挂载静默失败，且 Popup 端无明确指引。
- **根因**：Content Script 记录了 `injectionStatus: 'no-native-pin'`，但 Popup 端未监听该状态呈现提示。
- **修复**：
  1. 在 Popup 中新增 `#pinningNote` 引导横幅，提醒用户至少手动固定一个原生服务。
  2. 在 E2E 登录守卫中，增加“自动在控制台搜索框查找并 Pin 住 Console Home”的自愈逻辑，消除自动化测试阻碍。
  3. 新增 Gap 3 验证状态双向联动与恢复自愈。

### Bug 4: Popup Pin 后控制台未实时热更新
- **现象**：用户在 Popup 勾选/取消服务后，依赖 `chrome.tabs.sendMessage` 向 Console 发送 `{ action: 'updateQuickbar' }` 触发重绘，此前缺乏端到端断言保证无需刷新即时生效。
- **根因**：缺乏跨页面运行时通信的集成闭环测试。
- **修复**：在 Gap 4 中模拟控制台打开状态下通过 Popup 点击新服务，断言 Console 顶栏无需页面 reload，在 5 秒内自动完成新服务节点挂载。

---

## 2. 测试框架与自动化脚本缺陷

### Bug 5: Playwright 动态定位器状态翻转断言超时
- **现象**：在断言元素被点击选中时，测试发生 15s 超时：
  ```typescript
  const unselected = popupPage.locator('.service-item:not(.selected)').first();
  await unselected.click();
  await expect(unselected).toHaveClass(/selected/); // ❌ 永远失败
  ```
- **根因**：Playwright 的 `Locator` 采用延迟动态求值机制。点击后该元素获得了 `.selected`，原本的定位器立即重新解析并指向了*下一个*未选中的元素，因此永远等不到它包含 `/selected/`。
- **修复**：点击前先提取唯一 `data-service-id`，点击后改用固定选择器 `locator(\`.service-item[data-service-id="${id}"]\`)` 断言。

### Bug 6: 随机测试不可复现性 (PRNG 种子缺失)
- **现象**：压力测试直接调用 `Math.random()` 随机抽取 10 个服务进行组合测试。一旦偶发因某服务特殊字符或图标异常失败，无法还原故障时的服务列表。
- **根因**：随机源缺乏确定性种子（Seed）控制。
- **修复**：引入轻量级 Mulberry32 PRNG 算法，并在测试日志顶部输出 `🎲 Random seed: <seed>`。开发者只需固定该种子即可 100% 重现当次随机测试的选品与排列顺序。

### Bug 7: Storage Helper 频繁开闭 Page 导致轮询瓶颈
- **现象**：`waitForInjectionStatus` 在等待控制台就绪时，每秒调用一次 `getE2EStorage`，后者每次都 `newPage() -> goto -> evaluate -> close()`，在 20 秒内产生高达 20 次页面频繁开闭，引发 Chrome 实例卡顿与 IPC 延迟。
- **根因**：轮询函数缺乏页面上下文复用设计。
- **修复**：重构为在循环外部单次开启页面，在内部反复 `evaluate` 查询状态，等待完毕后统一关闭，消除不必要的上下文开销。

### Bug 8: 视觉回归测试硬编码绝对路径
- **现象**：截图对比测试中直接写入了当前开发机的绝对路径 `/Users/hche608/.gemini/...`，导致在其他环境或 CI 容器中抛出 `ENOENT`。
- **根因**：本地开发环境路径泄露至测试用例。
- **修复**：统一替换为相对工作区的便携路径：`path.resolve(process.cwd(), 'test-results')`。

---

## 3. 跨平台与浏览器底层兼容缺陷

### Bug 9: Firefox on macOS 27 沙盒 SIGKILL 冲突 (Playwright #42082)
- **现象**：在 macOS 27 运行 Playwright 启动 Firefox 真实引擎时，进程被系统内核强制以 Signal 9 (`SIGKILL`) 终止：
  ```text
  sandbox_extension_issue_file_to_process failed for .../plugin-container.app: 1 (Operation not permitted)
  [Parent, IPC I/O Parent] WARNING: process exited on signal 9
  ```
- **根因**：macOS 27 内核沙盒策略与 Playwright 的 Firefox 插件容器通信机制不兼容（官方跟进中）。
- **解法**：分层治理——自动化测试利用 Chromium 引擎装载 Firefox 构建产物（`dist/firefox/`），自动化校验 Manifest V3 兼容性、AMO 打包规范与 DOM 视觉；真实 Firefox 引擎通过官方 `web-ext` 手动运行（`npm run run:firefox`），并在 `AGENTS.md` 中做架构跟踪。

---

## 4. 工程借鉴与防护收益

1. **确定性胜于概率**：随机压力测试必须配套确定性 PRNG 种子，否则无法形成工程闭环。
2. **防范动态选择器陷阱**：在使用现代自动化测试框架（Playwright）时，状态发生翻转的操作务必使用不可变特征（如 `data-id`）进行重定位。
3. **闭环架构规则验证**：架构守则（如 Rule 1, 3, 4）不仅要写在设计文档中，更要在 E2E 层面设立严格的看门狗测试，杜绝隐式回退和错误路径解析。
