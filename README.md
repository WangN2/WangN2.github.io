# WangN2 · 机器人技术笔记

纯静态个人主页，首页嵌入 G2 全身运动学实验室，含独立演示页和一篇入门笔记。当前仅本地预览；没有部署工作流，不自动发布。

## 本地运行

需要 Node.js 18+、Python 3。数值测试不需要安装 npm 依赖。

```sh
npm run build
npm test
npm run check:public
python3 -m http.server 8765 --bind 127.0.0.1 --directory site
```

打开 http://127.0.0.1:8765/ 。端口占用时换一个端口；不要停止不相关服务。不要直接双击 HTML 使用 file 协议。浏览器需支持 WebGL 和 DecompressionStream，推荐近期版本的 Chrome、Edge、Firefox 或 Safari；当前自动回归使用 Chromium。

## 浏览器测试

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 tests/browser_demo.py --base-url http://127.0.0.1:8765
python3 tests/browser_site.py --base-url http://127.0.0.1:8765
```

也可设置 CHROME_PATH 为本机 Chrome 可执行文件。测试使用独立浏览器上下文，不读取日常浏览资料。截图和结果在被忽略的 artifacts/ 中。全站测试拦截第三方请求，检查桌面/360 px 手机布局、iframe 高度校验、中文错误提示、存储异常与交互。

## 维护入口

- site/index.html：主页；site/notes/kinematics.html：入门文章。
- templates/demo.html：演示 HTML 模板。修改后运行 npm run build，重新内嵌已脱敏模型。
- site/assets/g2/demo.js、demo.css：演示交互和样式；kinematics.cjs：运动学核心。
- site/assets/g2/model.b64：gzip/base64 模型。若更新来源模型，使用 node scripts/prepare-model.cjs INPUT_MODEL，再构建、测试、扫描。输入文件路径不写入产物。
- 浏览器姿态仅保存在 localStorage 的 wangn2:g2:v1 中；切换姿态预设可复位。数据损坏或禁止存储时仍可交互。

## 公开发布边界

未来只把 site/ 作为静态发布产物；不要把整个开发目录、测试截图或原始模型目录直接上传。此版本没有开启 GitHub Pages，也没有推送。公开发布需要另行确认。

发布前运行 npm run build、npm test、两组浏览器测试和 npm run check:public；最后人工检查来源许可与页面。扫描会检查内嵌 gzip/base64 模型，不只是可见文本，但不能代替完整的人工信息披露审查。

## 来源和限制

模型：AgiBot / AgiBot World，GenieSimAssets，版本 f65609e1c2bb153947ca9eee2ae1dc7392cdf3b7；经过网格简化和运动学导出。模型及改编数据遵循 CC BY-NC-SA 4.0，详见 site/licenses/g2-model.txt 与 attribution.html。无额外商用授权。

渲染：Three.js 0.128.0 / r128，MIT。固定 npm 分发文件本地捆绑，运行时不连接 CDN。

- three-r128.min.js SHA-256：9274bbcec8d96168626c732b5d31c775aa8cfb7eaa0599bec0c175908a2c1ce2
- three.txt SHA-256：7dddf7c5b8fd10ee654db8857d75d104b5557889aa5a91fc4ca545ea7c07062f

仅运动学教学：无碰撞、重力、力矩、摩擦或夹持力计算，不连接真机。逆解只约束末端位置，不保持朝向。网页内的误差读数不代表真实机器人精度。
