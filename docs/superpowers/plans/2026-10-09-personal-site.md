# WangN2 个人主页与 G2 演示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在本地完成可预览的个人主页，直接嵌入既有 G2 全身交互演示，并准备经过公开内容检查的静态网站文件。

**Architecture:** 纯静态 HTML/CSS/JavaScript，主页通过同源 iframe 加载唯一的演示页。保留既有运动学计算与模型结构，将渲染库同站点化并移除宿主依赖；仅 site/ 可作为未来发布产物。

**Tech Stack:** HTML、CSS、JavaScript、Three.js r128；Node 内置 test runner；Python 3 与 Playwright 用于浏览器回归，本地 HTTP 仅监听 127.0.0.1。

**Spec:** `docs/superpowers/specs/2026-10-09-personal-site-design.md`（已获用户批准）。

## Global Constraints

- 网站标题「WangN2 · 机器人技术笔记」；公开昵称 WangN2。
- 简介「记录机器人运动控制、导航与仿真的学习和实践」。
- 简洁浅色、蓝色点缀，适配桌面和手机；默认站立、双臂下垂，不自动运动。
- 主页直接展示可操作 G2，并提供独立大屏入口；不以截图替代。
- 首篇文章「从关节角到末端运动：正运动学与雅可比」。
- 不包含公司身份、内部项目、扫描场景、服务器地址、个人本地路径或认证信息。
- 不做账号、评论、数据库、统计追踪、广告或商业化功能。
- 不依赖 window.openai 或外部 CDN；不改变已验证的关节、雅可比、夹爪或底盘计算语义。
- 保留 AgiBot / AgiBot World、GenieSimAssets 版本 f65609e1c2bb153947ca9eee2ae1dc7392cdf3b7、改编声明及 CC BY-NC-SA 4.0 许可；Three.js 保留其 MIT 许可。
- 只做本地预览和本地提交，不推送、不开启 Pages、不添加自动部署工作流。

## Review Focus

1. 模型元数据藏在 gzip/base64 内：Task 1 解码扫描，拒绝敏感路径，不只检查可见文本。
2. 浏览器禁止存储或保存数据损坏：Task 2 恢复默认状态，交互不中断。
3. WebGL/解压能力缺失或模型损坏：Task 2 提供中文错误，不留空白。
4. iframe 高度消息伪造、无穷数或尺寸反馈循环：Task 3 验证来源和结构，布局不被异常消息破坏。
5. 手机操作与外网不可用：Task 4 拦截全部外部请求，仍能加载演示；360 px 下控件完整可用。

## 文件职责与输入

现有演示位于网站仓库的同级目录 `g2-whole-body-demo/`，只读复用，不修改原版。
实施前按 using-git-worktrees 流程创建独立工作区，定位真实输入目录；该输入绝对路径仅作为本地命令参数，不写入跟踪文件。

| 文件 | 职责 |
|---|---|
| `scripts/prepare-model.cjs` | 读取原模型，白名单清理元数据，输出压缩的公开模型 |
| `scripts/check-public.cjs` | 检查发布目录和所有待跟踪文本；解码模型检查，返回违规列表 |
| `site/assets/g2/model.b64` | 清理后的 gzip/base64 模型，保留数据内嵌使用方式 |
| `site/assets/g2/kinematics.cjs` | 既有运动学内核，Node 和浏览器共用 |
| `site/assets/g2/demo.js`、`demo.css` | 演示交互与自有样式，不携带宿主样式包 |
| `site/assets/g2/state.cjs` | 浏览器本地姿态存储适配器和数据验证 |
| `site/assets/vendor/three-r128.min.js` | 固定版本 Three.js，本地托管 |
| `site/demos/g2/index.html` | 独立演示页，含内嵌模型数据和返回入口 |
| `site/index.html`、`site/assets/site.css` | 主页与公共排版 |
| `site/assets/embed.cjs`、`embed-parent.js` | 可测试的消息校验与主页 iframe 高度适配 |
| `site/notes/kinematics.html` | 初学者文章 |
| `site/licenses/` | 模型许可、来源/改编声明和 Three.js 许可 |
| `tests/`、`package.json` | 数值、内容安全和浏览器测试；npm test 运行全部 Node 测试 |
| `README.md`、`.gitignore` | 本地运行说明、发布边界；忽略缓存与测试产物 |

### Task 1: 可公开使用的模型与运动学包

**Files:** 创建 `scripts/prepare-model.cjs`、`scripts/check-public.cjs`、`site/assets/g2/{model.b64,kinematics.cjs}`、`site/licenses/{g2-model.txt,attribution.html}`、`package.json`、`.gitignore`；测试 `tests/model-public.test.cjs` 和迁移的四组数值测试。

**Interfaces:**
- `prepareModel(source: object): object`：仅保留 root、rootTransform、joints、loops、grippers、wheels、home、meshes、rest 及公开 license；拒绝未知嵌套路径字符串。
- CLI `node scripts/prepare-model.cjs <input-model.json>` 输出固定目标 `site/assets/g2/model.b64`，不记录输入绝对路径。
- `scanPublic(root: string): string[]`：返回违规相对路径和规则名，不回显可能的秘密；CLI 有违规时非零退出。
- Kinematics 保持原 G2K 导出接口，供 Task 2 使用；测试自行解码 model.b64。

- [ ] 写清理与扫描失败测试，并迁移原数值测试，先维持原断言：
  ```js
  assert.equal(prepareModel({...fixture, source:'private-model-location'}).source, undefined);
  assert.deepEqual(prepareModel(fixture).joints, fixture.joints);
  assert.ok(scanPublic(compressedLeakFixtureDir).length > 0);
  assert.deepEqual(scanPublic(cleanFixtureDir), []);
  ```
- [ ] 运行 `node --test tests/model-public.test.cjs`，确认因未实现接口失败。
- [ ] 实现两个脚本；复制运动学核心和完整模型许可，编写只含公开来源的改编声明；不原样复制含内部路径的 PROVENANCE。
- [ ] 将 npm test 配置为 `node --test tests/*.test.cjs`；运行测试，确保关节树、零位、左右雅可比、双臂逆解、夹爪闭链、舵轮与底盘积分全部通过。界面存在性测试在 Task 2 迁移，最终保持原 19 项检查语义。
- [ ] 运行公开扫描，并提交本任务列出的文件：`git commit -m "feat: prepare public G2 model and kinematics"`。

### Task 2: 无宿主依赖的独立 G2 演示

**Files:** 创建 `site/demos/g2/index.html`、`site/assets/g2/{demo.js,demo.css,state.cjs}`、`site/assets/vendor/three-r128.min.js`、`site/licenses/three.txt`、`tests/{state.test.cjs,demo-interface.test.cjs,browser_demo.py}`。

**Interfaces:**
- 使用 Task 1 的 G2K、压缩模型；HTML 通过 `script[type="application/octet-stream"]#g2-model` 内嵌数据。
- `readState(storage): object|null`、`writeState(storage, state): boolean`，固定键 `wangn2:g2:v1`，异常不外抛；恢复时验证有限数值、关节限位与合法分组。
- 保留既有交互元素 ID、`#g2-whole-learning[data-ready]` / `[data-running]`，让原浏览器回归可以迁移而不注入测试专用接口。
- 模型 ready 后及内容高度变化时发 `{type:'wangn2:g2:resize',height:number}` 到同源父页；独立打开时不发送。

- [ ] 写状态适配测试和独立页失败测试；包括：
  ```js
  assert.equal(readState(corruptStorage), null);
  assert.equal(writeState(throwingStorage, validState), false);
  assert.equal(readState(savedValidState).group, 'right');
  ```
  浏览器测试断言缺失 WebGL、缺失 DecompressionStream、损坏模型分别出现中文 `role=alert`。
- [ ] 运行状态与界面测试确认失败；用 Playwright 独立 Chromium 测试上下文注入缺失能力，记录预期失败。
- [ ] 迁移现有模板为普通 HTML 和外部脚本，编写自有表单/布局样式；移除 window.openai、宿主事件和网络脚本。获取固定 Three.js r128 官方分发文件与许可，校验文件版本和哈希后落盘，不使用 latest。
- [ ] 接入容错状态存储、中文加载错误、既有停止与状态恢复逻辑；站立默认、不自动动作；运动结束读数不被保存回调清除。
- [ ] 运行全部 Node 测试及 `python3 tests/browser_demo.py --base-url http://127.0.0.1:8765`。本地服务命令为 `python3 -m http.server 8765 --bind 127.0.0.1 --directory site`；端口冲突时选空闲端口，不终止其他服务。
- [ ] 验证两臂 +X 5 cm 到达误差 <0.5 mm、头部不改变夹爪位置、夹爪 0–45°、底盘横移 20 cm/旋转 15°、快速替换动作后停止、保存恢复；提交本任务文件：`git commit -m "feat: add standalone G2 learning demo"`。

### Task 3: 主页、嵌入与首篇技术笔记

**Files:** 创建 `site/index.html`、`site/assets/{site.css,embed.cjs,embed-parent.js}`、`site/notes/kinematics.html`、`tests/{embed.test.cjs,site-content.test.cjs}`。

**Interfaces:**
- 主页锚点 `#about`、`#lab`、`#notes`；iframe ID `g2-demo`，src `./demos/g2/index.html`，具备可访问标题。
- `validatedHeight(event, expectedOrigin, expectedWindow): number|null`，仅接收 Task 2 消息；验证 source、origin、type、有限数值以及 200–12000 px 高度，拒绝其他输入。
- iframe 初始预留高度避免页面塌陷，只有实际高度改变才更新；子页以内容高度测量，避免 viewport/min-height 导致循环。
- 所有资源和导航采用适当相对 URL，可从站点根或预览子路径访问。

- [ ] 写失败测试：
  ```js
  assert.equal(validatedHeight(validEvent, origin, childWindow), 1200);
  assert.equal(validatedHeight({...validEvent, source:{}}, origin, childWindow), null);
  assert.equal(validatedHeight(infiniteHeightEvent, origin, childWindow), null);
  ```
  内容测试断言标题/简介与设计一致、存在 iframe 与独立入口、只链接首篇实际文章，所有本地链接目标存在。
- [ ] 运行 `node --test tests/embed.test.cjs tests/site-content.test.cjs`，确认失败。
- [ ] 实现主页、自有公共样式、iframe 消息适配及文章。文章解释正运动学、雅可比一阶近似、阻尼位置逆解、限位和未模拟项，区分世界/机体/关节局部坐标。
- [ ] 用现有文章材料核对内容，不写未经验证的性能承诺；页脚和演示页链接公开来源与许可证，醒目标注教学用途。
- [ ] 运行 npm test，并提交本任务文件：`git commit -m "feat: build personal homepage with embedded G2 demo"`。

### Task 4: 全站回归与本地交付

**Files:** 创建 `tests/browser_site.py`、`README.md`，按观察到的缺陷修改对应页面/样式/脚本；测试结果存入被忽略的 `artifacts/`。

**Interfaces:**
- `python3 tests/browser_site.py --base-url <local-origin>` 输出 JSON 结果与桌面/手机截图，失败非零退出。
- 浏览器使用独立测试上下文；拦截非本地源资源请求，不接触个人浏览器资料。浏览器路径通过环境/参数配置，不提交用户机器绝对路径。
- README 记录本地启动、数值测试、浏览器测试、公开扫描和仅发布 site/ 的边界；不生成自动发布流程。

- [ ] 写站点回归：主页 iframe 内完成一次末端动作；独立大屏入口/返回/文章往返可用；非法来源消息不改变 iframe 高度；360 px 和桌面均无水平溢出，控件底部未截断。
- [ ] 在外部请求被阻断时验证页面 ready、三维画面非空与手臂可操作；监测请求列表不得含第三方运行时依赖；截图人工检查首屏与手机布局。
- [ ] 运行全站回归；若暴露缺陷，先保留失败断言再最小修复，重新运行受影响测试与全部 npm test。
- [ ] 执行 `node scripts/check-public.cjs site`，额外检查全部新增跟踪文本及模型解码内容；确认无认证信息、内网地址、绝对路径或公司扫描资产，许可证齐全。
- [ ] 独立只读代码审查，处理重要问题；复跑 `npm test`、两组浏览器回归和公开扫描，记录实际结果，不把运动学误差当作真机精度。
- [ ] 本地提交 `git commit -m "test: verify public site and document local preview"`；展示本地预览与测试摘要，明确尚未推送/发布，等待用户确认公开。

## 自审结果与执行选择

设计各项均覆盖：任务 1 负责模型/许可和公开内容，任务 2 负责完整交互和容错，任务 3 负责主页/文章/嵌入，任务 4 负责整站验证和本地交付。五项 Review Focus 均有归属测试，接口及数据名称一致。

建议本会话直接执行：四个任务强依赖同一演示，既有核心可复用；集中实施并在结尾独立审查，比逐任务更换实现者更适合本次规模。
用户需审阅计划并选择“本会话直接执行”或“逐任务子代理执行”；实施之前不擅自开始，也不把实施授权扩展为公开发布。
