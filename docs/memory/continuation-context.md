# BOSS 续作上下文提示

把这段给其他平台或新会话，可快速恢复项目上下文。

## 项目概况

工作区：`/Users/didi/Desktop/projects/BOSS`。这是“小桔零碳电力交易与售电管理平台”的静态前端预览项目，当前分支 `main`。项目没有构建链，`index.html` 顺序加载全局脚本，所有 mock、组件、页面注册都挂到 `window.BOSS_*`。主渲染文件是 `main.js`，全局样式是 `styles.css`。

运行：

```bash
npm run dev
```

默认地址：`http://127.0.0.1:8123/`。hash 路由示例：`/#data-monitor`、`/#gd-info-disclosure`、`/#hn-data-disclosure`、`/#sx-data-disclosure`、`/#gd-settlement`、`/#rolling-data`。

## 必读文件

- `docs/memory/project-memory.md`：完整项目记忆。
- `index.html`：脚本加载顺序。
- `src/pages/pageRegistry.js`：页面 key/hash/viewType/sidebarTrail。
- `src/pages/pageState.js`：初始 state 和交易中心默认值。
- `mockData.js`：mock 汇总。
- `main.js`：主应用渲染和事件处理。
- `src/mock/*.js`：业务数据。
- `data-monitor-platform/docs/api-contract.md`：独立数据监控后端契约。
- `docs/policy-pdf-parse-repair-runbook.md`：政策 PDF 结构化修复方法。

## 关键记忆

- 不要引入 `import`/`export` 或构建步骤，除非明确重构。
- 新页面要同时改 `pageRegistry.js`、`platformMenu.js`、`pageState.js`、`main.js`，必要时改 `index.html` 和 `mockData.js`。
- 主应用数据中心是广东、湖南、陕西；名称有短名、交易中心名、电力交易中心名三种口径。
- demo 日期大量固定在 `2026-05`、`2026-06`，不要自动替换成当前日期。
- `data-monitor` 是主 BOSS 内页面；`data-monitor-platform/` 是独立生产接入页面，两者不要混淆。
- 独立数据监控默认请求 `/api`，失败后用 `data/seed-monitor-data.js`；契约版本 `2026-06-15`。
- 政策结构化脚本默认读取外部目录 `/Users/didi/Documents/codex售电市场政策结构化`，产物同步到 MD、HTML、`ZC_HTML`、`ZC_STRUCTURED`、报告和索引。
- `src/mock/shaanxiContractCurveData.js` 和 `src/mock/guangdongTradeDisclosureSource.js` 是大体积单行数据文件，搜索时要加 `--max-columns` 或只查文件名，避免输出爆炸。

## 验证命令

主应用：

```bash
npm run dev
```

独立数据监控：

```bash
node data-monitor-platform/tests/smoke-render.js
```

政策结构化：

```bash
python3 scripts/validate_hunan_policy_parse_outputs.py
python3 scripts/validate_shaanxi_policy_parse_outputs.py
```

政策验证依赖本机外部文件，不是仓库自包含。
