# WangN2 · 机器人技术笔记

纯静态个人主页，包含 G2 全身运动学、碰撞包络、AprilTag 视觉定位与料盘抓取重算的交互实验，以及配套技术笔记。GitHub Pages 地址：https://wangn2.github.io/ 。

## 本地运行

需要 Node.js 18+、Python 3。数值测试不需要安装 npm 依赖。

```sh
npm run build
npm test
npm run check:public
python3 -m http.server 8765 --bind 127.0.0.1 --directory site
```

打开 http://127.0.0.1:8765/ 。端口占用时换一个端口；不要停止不相关服务。不要直接双击 HTML 使用 file 协议。G2 演示需支持 WebGL 和 DecompressionStream，推荐近期版本的 Chrome、Edge、Firefox 或 Safari；当前自动回归使用 Chromium。

生成首屏与分享图需要 Playwright：

```sh
python3 scripts/render-figures.py --base-url http://127.0.0.1:8765
```

## 浏览器测试

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 tests/browser_demo.py --base-url http://127.0.0.1:8765
python3 tests/browser_site.py --base-url http://127.0.0.1:8765
python3 tests/browser_collision.py --base-url http://127.0.0.1:8765
python3 tests/browser_apriltag.py --base-url http://127.0.0.1:8765
python3 tests/browser_tray_grasp.py --base-url http://127.0.0.1:8765
```

也可设置 CHROME_PATH 为本机 Chrome 可执行文件。测试使用独立浏览器上下文，不读取日常浏览资料。截图和结果在被忽略的 artifacts/ 中。测试拦截第三方请求，检查桌面/360 px 手机布局、iframe 高度校验、中文错误提示、存储异常与交互。

## 站点基础

- site/assets/site.css：全站样式与设计令牌。`--ink`、`--muted`、`--blue` 必须保持正文 4.5:1、主文字 7:1 的对比度；`npm test` 会直接计算并拦截回退。正文内链接一律保留下划线，不靠颜色区分。
- site/index.html 首屏右侧使用 site/assets/hero-g2.webp：由演示同一个 Three.js 与同一份模型渲染的静态图；site/assets/og.png 是 1200×630 分享卡。两者都用 `python3 scripts/render-figures.py --base-url …` 重新生成，改模型或改配色后必须重跑。
- site/404.html：GitHub Pages 的 404 页面，样式内联、链接用根路径，因此在任意错误深度都能正常显示。
- site/robots.txt、site/sitemap.xml：新增页面后要同时加进 sitemap；`npm test` 会校验 sitemap 与站内 HTML 一一对应。
- 每页 head 里都有 canonical、Open Graph、Twitter Card 与 JSON-LD 结构化数据，用 `<!--meta-->` 包裹便于整体替换；新增页面需复制同一组字段并改 canonical/og:url。

## 维护入口

- site/index.html：主页；site/notes/kinematics.html、collision-envelope.html、apriltag.html、tray-grasp.html：技术笔记。
- site/notes/tray-grasp.html：料盘抓取的离线示教、在线重算与大模型协作（第 10–15 节讲分工、参数搜索、自然语言示教与排障边界，只写方法，不含量化结论）。交互部分在 site/assets/tray/ 下，是纯 Canvas 2D 的刚体搬运示意，不连接真机、不做碰撞检查；文中数值是示意值，改稿时不要写成站点验证过的结论。
- 技术笔记的「骨架」是数据驱动的约定：每篇必须有 `<div class="article-meta">` 里的 `<time datetime>`、阅读时长、板块名，`<nav class="toc">` 里列出全部 `h2` 锚点，结尾有 `<nav class="note-nav">` 串联上一篇/下一篇。`tests/notes.test.cjs` 会校验日期与 JSON-LD 一致、目录锚点全部存在、前后篇互相指回、首页卡片与正文的日期和时长同步。
- 阅读时长按正文「中日韩字符数 / 400 + 英文词数 / 220」向上取整；改稿后重算并同步首页卡片，测试允许 ±1 分钟误差。
- site/assets/g2/demo.js：三维场景。机身浅灰、底盘与夹爪深灰的两套材质是刻意的可读性设计；光照已按 ACES 色调映射配平，不要再叠加高亮环境光，否则白色机身会和浅色背景糊在一起。
- site/notes/collision-envelope.html：碰撞包络笔记，入口位于首页 Notes。
- site/assets/g2/collision-spheres.json：站立姿态的22球几何快照；collision-model.cjs：几何核心；collision-viewer.js、collision.css：独立画布交互与样式。16/5 cm 切换仅改变两个底盘球的额外膨胀，不做地图碰撞或机器人控制。选择和视角保存在独立的 wangn2:g2-collision:v1 中，存储不可用时仍可操作。
- templates/demo.html：G2 演示 HTML 模板。修改后运行 npm run build，重新内嵌已脱敏模型。
- site/assets/g2/demo.js、demo.css：G2 演示交互和样式；kinematics.cjs：运动学核心。
- site/demos/apriltag/index.html：AprilTag 实验室；site/assets/apriltag/ 下的 core.cjs 提供编码/解码和平面位姿数学，tag36h11.cjs 提供官方编码数据，demo.js、demo.css 负责交互与样式。
- site/assets/g2/model.b64：gzip/base64 模型。若更新来源模型，使用 node scripts/prepare-model.cjs INPUT_MODEL，再构建、测试、扫描。输入文件路径不写入产物。
- G2 浏览器姿态仅保存在 localStorage 的 wangn2:g2:v1 中；切换姿态预设可复位。数据损坏或禁止存储时仍可交互。AprilTag 实验室不保存状态，也不访问摄像头。

## 公开发布边界

只把 site/ 作为静态发布产物；不要把整个开发目录、测试截图或原始模型目录直接上传。

仓库 Settings → Pages → Source 选择 GitHub Actions。推送 main 或手动运行 Deploy personal site，会先构建、测试并扫描，再上传 site/ 并部署。任一检查失败则不发布。工作流位于 .github/workflows/pages.yml，使用 YAML 兼容的 JSON 语法，方便用 Node 原生解析验证发布路径和权限。构建仅有内容读取权限，部署阶段才授予 Pages 写入与 OIDC 权限。

部署结果在仓库 Actions 中查看。回退时以正常 revert 提交撤销有问题的改动，推送 main 重新部署；不要强制覆盖提交历史。

发布前运行 npm run build、npm test、四组浏览器测试和 npm run check:public；最后人工检查来源许可与页面。扫描会检查内嵌 gzip/base64 模型，不只是可见文本，但不能代替完整的人工信息披露审查。

## 来源和限制

模型：AgiBot / AgiBot World，GenieSimAssets，版本 f65609e1c2bb153947ca9eee2ae1dc7392cdf3b7；经过网格简化和运动学导出。模型及改编数据遵循 CC BY-NC-SA 4.0，详见 site/licenses/g2-model.txt 与 attribution.html。无额外商用授权。

渲染：Three.js 0.128.0 / r128，MIT。固定 npm 分发文件本地捆绑，运行时不连接 CDN。

AprilTag 编码：AprilRobotics tag36h11 官方 codedata，经格式打包后本地使用，遵循 BSD 2-Clause，详见 site/licenses/apriltag.txt。实验室使用合成投影和四角点平面单应分解，不是完整 AprilTag 图像检测器，也不代表真实相机精度。

- three-r128.min.js SHA-256：9274bbcec8d96168626c732b5d31c775aa8cfb7eaa0599bec0c175908a2c1ce2
- three.txt SHA-256：7dddf7c5b8fd10ee654db8857d75d104b5557889aa5a91fc4ca545ea7c07062f

运动学实验室仅作运动学教学：无碰撞、重力、力矩、摩擦或夹持力计算。逆解只约束末端位置，不保持朝向。碰撞包络笔记另外展示静态球体记录，不执行在线避障或路径验收；它与运动学网格没有自动配准。所有页面均不连接真机，网页读数不代表真实机器人精度或安全间隙。
