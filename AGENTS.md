# 本站约定

写给在这个仓库里干活的 agent 和人。几条都是踩过坑之后写下来的，不是风格偏好。

## 作图

正文栏宽 **760px**。图按「显示宽度」设计，不按原始尺寸设计。

| 项 | 规则 | 为什么 |
|---|---|---|
| 画布宽度 | **1400–1440px** | 缩到 760 时约 53%，仍在可读区间；1800px 只剩 42% |
| 正文字号 | **≥ 20px** | 20px × 53% ≈ 10.6px，是能看清的下限 |
| 主数字/标题 | **32–38px** | 缩后 17–20px |
| 渲染方式 | **2× 超采样后降采样** | 直接画会有锯齿 |
| 文字绘制 | **在最终分辨率上画** | 和图形一起缩放的文字会糊 |
| 留白 | 出图后**裁到内容边界** | 否则在浅色页面上是一块白板 |
| 标签语言 | 图内英文，正文中文 | 英文短、排得开 |

反例（都真实踩过）：1800px 宽 + 13px 字号 → 缩到 42% 后小字约 5px，全糊；1420px 宽但底部留 80px 空白 → 页面上一块白框。

出图后要验证，不能只看源图：

```python
# 开本地服务后在 1280 视口截全宽，确认图在正文栏里的实际观感
pg.evaluate("document.querySelector('#section').scrollIntoView()")
```

同时确认 CSS 里有 `.article figure img{width:100%;height:auto}`（已在 `site/assets/site.css`），否则带 `width` 属性的图会撑破栏目。

## 改动前必过

```bash
npm test              # 61 项
npm run check:public  # 脱敏扫描
```

改 HTML 结构或用例时，两样都要重跑；axe 审计用外部脚本，不在仓库里。

## 数字写在多处的，交给测试

分类计数（「N 篇基础」、筛选胶囊）同时存在于 `site/index.html` 与 `site/series/index.html`，加起来四处。人一定会漏——`tests/categories.test.cjs` 里那条测试逐文件比对实际卡片数，别删。

## 部署

- 推送后由 `.github/workflows/pages.yml` 构建，只上传 `site/`。
- 本地看效果：`python3 -m http.server 8765 --directory site`（每次会话要重开）。
- 推送要带代理：`git -c http.proxy=http://proxy.nioint.com:8080 push`。
- 上线后用 `https://wangn2.github.io/<path>` 复核，不要只信 workflow 状态。

## 内容

- 笔记按 `site/notes/NN.html` 编号，卡片、`sitemap.xml`、`tests/notes.test.cjs`、分类测试四处要同步。
- 日期用北京时间；测试会拦「未来日期」。
- 外部生成的稿子收进来之前，先补 JSON-LD、og/twitter 元数据、`apple-touch-icon`，再脱敏（内部路径、环境变量名、主机名）。
- 不确定的数字要标出来源与口径，别和已核实的数字混排。
