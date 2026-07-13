# BOSS 项目记忆沉淀

生成时间：2026-07-10  
工作区：`/Users/didi/Desktop/projects/BOSS`  
当前分支：`main`

## 记忆来源与边界

本文件沉淀当前仓库可见上下文，包括代码结构、已有文档、脚本目录、主分支近期提交和关键 mock 数据约定。仓库内未发现 `.codex` 或 `.agents` 项目记忆文件；因此这里不包含未落盘的历史聊天内容，只沉淀可从当前项目恢复的事实记忆。

已有专项文档：

- `docs/policy-pdf-parse-repair-runbook.md`：政策 PDF 解析修复方法沉淀，包含 OCR、公式、目录、表格、附件、结构化 JSON 同步和验收方法。
- `data-monitor-platform/docs/api-contract.md`：独立数据监控预警平台 API 契约，版本 `2026-06-15`。

## 项目定位

BOSS 是“小桔零碳电力交易与售电管理平台”的静态前端预览项目。它不是现代构建链项目，而是一个纯静态、全局脚本风格的单页应用：

- `index.html` 通过多个 `<script>` 顺序加载 mock、配置、页面注册、组件和主渲染文件。
- `main.js` 集中承载主应用的渲染、交互、页面分发和事件处理。
- `styles.css` 是主应用全局样式。
- `src/mock/*.js` 把数据挂载到 `window` 上，随后由 `mockData.js` 汇总成 `BOSS_APP_MOCKS` 和 `BOSS_MOCK_DATA`。
- `src/components/common/*.js` 把通用组件挂载到 `window.BOSS_COMPONENTS`。
- `src/pages/pageRegistry.js` 定义页面 key、hash、viewType 和侧边栏展开路径。
- `src/pages/pageState.js` 定义初始状态、页面默认状态和交易中心映射。

另有一个独立子应用 `data-monitor-platform/`，是生产接入口径更接近真实后端契约的数据监控预警页面，不依赖主 BOSS 菜单、页面注册或 mock 汇总。

## 运行方式

`package.json` 只有两个脚本：

```bash
npm run dev
npm start
```

两者都执行 `node dev-server.js`，默认监听：

```text
http://127.0.0.1:8123/
```

可用环境变量改端口：

```bash
PORT=8124 node dev-server.js
```

`dev-server.js` 只提供静态文件服务和 SPA fallback：

- `/` 映射 `index.html`。
- 无扩展名路径会 302 到 hash 路由，例如 `/data-monitor` -> `/#data-monitor`。
- 响应头 `Cache-Control: no-store`，但 `index.html` 仍大量使用 query 参数做显式缓存戳。

项目没有声明第三方 npm 依赖。多数改动不需要安装依赖。

## 重要文件地图

主应用：

- `index.html`：主应用脚本加载顺序。新增 mock、组件或配置时必须在这里插入正确顺序。
- `main.js`：约 18k 行，主渲染逻辑集中地。页面分发在 `renderContent()` 附近；UI action 分发在主 click handler 附近。
- `styles.css`：约 5.9k 行，主应用全局样式。
- `brandAssets.js`：品牌 logo 等资源，挂载 `BOSS_BRAND_ASSETS`。
- `mockData.js`：把各 mock 汇总为 `BOSS_APP_MOCKS` 和兼容的 `BOSS_MOCK_DATA`。
- `src/pages/pageRegistry.js`：页面 registry。
- `src/pages/pageState.js`：全局 state 初始化。
- `src/config/dataDisclosureTime.js`：数据披露时间/文件下载配置，主应用抽屉使用。
- `public/assets/logos/*`、`public/assets/users/*`：已有图片资产。

主应用 mock：

- `src/mock/platformMenu.js`：顶部导航和左侧菜单。
- `src/mock/businessCenter.js`：业务中心数据。
- `src/mock/guangdongData.js`：广东交易中心主 mock。
- `src/mock/hunanData.js`：湖南交易中心主 mock。
- `src/mock/shaanxiData.js`：陕西交易中心主 mock。
- `src/mock/shaanxiContractCurveData.js`：陕西中长期合同曲线明细源数据，文件体积大且单行 JSON 很长。
- `src/mock/guangdongTradeDisclosureSource.js`：广东交易披露源数据，文件体积大且单行 JSON 很长。
- `src/mock/infoDisclosureTradeData.js`：节点电价和交易结果 mock。
- `src/mock/marketPageData.js`：统一市场披露页面配置和数据适配。
- `src/mock/powerDataAdapter.js`：分时电量/售电公司/用电企业数据适配。
- `src/mock/infoDisclosureConfig.js`：信息披露 tab、二级 tab 和披露配置。
- `src/mock/downloadTasks.js`：下载任务 mock。
- `src/mock/operationRecord.js`：操作记录、日志、审核记录 mock。
- `src/mock/fetchMonitor.js`：调度中心取数监控 mock。
- `src/mock/dataMonitor.js`：主应用内的数据监控 mock。
- `src/mock/simulationData.js`：仿真平台 mock。
- `src/mock/algorithmData.js`：日前负荷预测、价差及现货价格预测 mock。

独立数据监控应用：

- `data-monitor-platform/index.html`：独立页面结构。
- `data-monitor-platform/app.js`：独立应用逻辑。
- `data-monitor-platform/styles.css`：独立样式。
- `data-monitor-platform/config.js`：生产接入配置，默认 `apiBaseUrl: "/api"`。
- `data-monitor-platform/data/seed-monitor-data.js`：无后端时的预览数据。
- `data-monitor-platform/docs/api-contract.md`：后端接口契约。
- `data-monitor-platform/tests/smoke-render.js`：无浏览器 DOM 的 smoke test。

政策结构化脚本：

- `scripts/parse_hunan_policy_pdfs_with_skill.py`
- `scripts/parse_shaanxi_policy_pdfs_with_skill.py`
- `scripts/fix_hunan_*`
- `scripts/fix_shaanxi_*`
- `scripts/validate_hunan_policy_parse_outputs.py`
- `scripts/validate_shaanxi_policy_parse_outputs.py`
- `scripts/update_policy_demo_data.py`
- `scripts/ocr_*.js`、`scripts/ocr_*.swift`

## 页面注册记忆

`src/pages/pageRegistry.js` 是路由真相源。每个页面至少有：

- `key`
- `hash`
- `title`
- `viewType`
- `sidebarTrail`
- 可选 `aliases`

核心页面：

| page key | hash | viewType | 说明 |
| --- | --- | --- | --- |
| `business-center` | `business-center` | `business-center` | 默认首页/业务中心 |
| `gd-info-disclosure` | `gd-info-disclosure` | `gd-info-disclosure` | 广东信息披露主页面 |
| `gd-trade-result` | `gd-trade-result` | `gd-trade-result` | 用电侧交易结果 |
| `gd-settlement` | `gd-settlement` | `gd-settlement` | 日清月结，按交易中心切换数据 |
| `data-monitor` | `data-monitor` | `data-monitor` | 主应用内数据监控 |
| `gd-retail-relation` | `gd-retail-relation` | `gd-retail-relation` | 零售关系 |
| `gd-day-ahead-declaration` | `gd-day-ahead-declaration` | `gd-day-ahead-declaration` | 日前申报 |
| `spot-mock-trading` | `spot-mock-trading` | `spot-mock-trading` | 现货模拟交易 |
| `hn-data-disclosure` | `hn-data-disclosure` | `market-data-disclosure` | 湖南交易中心市场披露 |
| `sx-data-disclosure` | `sx-data-disclosure` | `market-data-disclosure` | 陕西交易中心市场披露 |
| `spot-trading-simulation` | `spot-trading-simulation` | `spot-trading-simulation` | 现货交易仿真 |
| `day-ahead-load-prediction` | `day-ahead-load-prediction` | `day-ahead-load-prediction` | 日前负荷预测 |
| `spot-price-prediction` | `spot-price-prediction` | `spot-price-prediction` | 价差及现货价格预测 |
| `fetch-monitor` | `fetch-monitor` | `fetch-monitor` | 调度中心取数监控 |

大量未完全实现页面使用 `placeholder`，但部分在 registry 后处理里重写 viewType：

- `rolling-data` -> `rolling-data`
- `download-record`、`operation-log`、`audit-record` -> `operation-record`
- `charging-pricing-tool` 兼容 alias `charging-price-tool`

新增页面时：

1. 在 `pageRegistry.js` 注册 key/hash/title/viewType/sidebarTrail。
2. 在 `platformMenu.js` 放入菜单项并保持 `pageKey` 一致。
3. 在 `pageState.js` 增加必要 state 默认值。
4. 在 `main.js` 的 `renderContent()` 增加 viewType 分发。
5. 必要时在 `index.html` 加 mock 或组件脚本，并注意加载顺序。

## 全局命名与加载顺序

所有模块使用 IIFE 挂载到 `window`/`global`。不要引入 `import`/`export` 或构建步骤，除非明确要重构整个项目。

常见全局：

- `BOSS_BRAND_ASSETS`
- `BOSS_PLATFORM_MENU_MOCK`
- `BOSS_BUSINESS_CENTER_MOCK`
- `BOSS_GUANGDONG_DATA_MOCK`
- `BOSS_HUNAN_DATA_MOCK`
- `BOSS_SHAANXI_DATA_MOCK`
- `BOSS_SHAANXI_CONTRACT_CURVE_SOURCE`
- `BOSS_RAW_POWER_DATA_MOCK`
- `BOSS_POWER_DATA_ADAPTER`
- `BOSS_NODE_PRICE_MOCK_BY_CENTER`
- `BOSS_TRADING_RESULT_MOCK_BY_CENTER`
- `BOSS_MARKET_PAGE_DATA`
- `BOSS_INFO_DISCLOSURE_CONFIG`
- `BOSS_DOWNLOAD_TASKS_MOCK`
- `BOSS_OPERATION_RECORD_MOCK`
- `BOSS_FETCH_MONITOR_MOCK`
- `BOSS_DATA_MONITOR_MOCK`
- `BOSS_SIMULATION_DATA_MOCK`
- `BOSS_ALGORITHM_DATA_MOCK`
- `BOSS_DATA_DISCLOSURE_TIME_CONFIG`
- `BOSS_PAGE_REGISTRY`
- `BOSS_PAGE_STATE`
- `BOSS_COMPONENTS`
- `BOSS_APP_MOCKS`
- `BOSS_MOCK_DATA`

`index.html` 的顺序很关键：先品牌和 mock，再 config，再 registry/state，再 components，最后 `mockData.js` 和 `main.js`。如果新增 mock 被 `mockData.js` 汇总，必须在 `mockData.js` 之前加载。

## 状态模型记忆

`src/pages/pageState.js` 负责生成初始状态。重要约定：

- 默认交易中心通过当前 page key 推断：
  - `gd-info-disclosure` -> `广东电力交易中心`
  - `hn-data-disclosure` -> `湖南电力交易中心`
  - `sx-data-disclosure` -> `陕西电力交易中心`
  - 其他页面默认广东
- 支持交易中心固定为广东、湖南、陕西。
- demo 日期大量固定在 `2026-05`、`2026-06`，这是演示数据口径，不要根据真实当前日期自动改。
- 信息披露默认勾选多条负荷/电源指标，默认隐藏部分预测曲线。
- `marketDisclosure.pages` 为湖南、陕西市场披露分别保存 activeTab、日期范围、lastUpdatedAt、queryCount。
- `dataMonitor` state 包含 `filters.categoryPath`、`ignoredIds`、`rollbackIgnoredIds`、`ignoredMeta`。
- 图表隐藏系列、表格排序、抽屉开关、弹窗开关都集中在 `state.ui`。

## 主应用业务域记忆

### 业务中心

入口 page key 是 `business-center`，默认页面。菜单属于“业务中心”，侧边栏有资产管理、合作方管理、虚拟电厂、辅助服务、售电业务、光储经营、调度中心、低碳家园、操作记录等分组。

### 售电业务/市场数据

主要页面在左侧菜单“售电业务 -> 市场数据”下：

- 信息披露
- 日清月结
- 零售关系
- 滚搓数据
- 数据监控

交易中心支持广东、湖南、陕西。主应用里很多页面通过顶部交易中心选择器切换数据，不一定换 page key。

### 信息披露

广东主入口是 `gd-info-disclosure`，湖南和陕西使用 `market-data-disclosure` viewType。统一披露页面由 `src/mock/marketPageData.js` 提供配置。

`BOSS_MARKET_PAGE_DATA` 支持的 viewType 包括：

- `singleMetricLoad`
- `metricTreeCompare`
- `metricCompare`
- `nodePrice`
- `mixedTrendTable`
- `lineTable`
- `profileTable`
- `disclosureTable`
- `maintenanceComposite`
- `contractCurveSummary`
- `contractCurveDetail`
- `empty`

节点电价存在 96 点到 24 点聚合逻辑；陕西部分 96 点数据在页面按小时聚合预览时，详情仍以接口/源数据维度为准。

### 日清月结

入口 `gd-settlement`，但会随交易中心展示不同内容：

- 广东：日清算、月结算 mock。
- 湖南：包含日清算 PDF 解析类数据、月结售电公司/用电企业数据。
- 陕西：包含日清算、月结算、零售套餐等较多表格。

已有近期提交提示“settlement-header-update”，改样式或结构时注意保留标题、筛选和表格头部对齐。

### 滚搓数据

入口 `rolling-data`，viewType 被 registry 后处理为 `rolling-data`。按交易中心切换：

- 广东滚搓数据
- 湖南中长期交易结果
- 陕西合同曲线和交易概览

陕西合同曲线相关近期改动较多，`src/mock/shaanxiContractCurveData.js` 是重要源文件；`main.js` 中有 `contractCurveSummary` 和 `contractCurveDetail` 两类渲染。

### 数据监控（主 BOSS 内）

入口 `data-monitor`，数据源 `src/mock/dataMonitor.js`。当前 mock 顶层状态：

- 应取数据：84
- 正常：50
- 取数异常：16
- 质量异常：21
- P0：29
- P1：3
- 异常合计：34

主要字段：

- 交易中心、业务模块、数据项、源数据项、数据类型、父子数据项
- 采集器状态、取数状态、质量状态、处理状态、通知状态
- 时点粒度、出数时间、预警时间、取值范围
- 最近成功时间、下次取数时间、取数工具时效
- 页面地址、异常类型、异常时间、校验规则、阈值、优先级
- `categoryPath` 用于业务模块树
- `timeline` 用于详情抽屉

交互记忆：

- 有业务模块树、异常明细表、详情抽屉。
- 支持忽略和回滚忽略，状态保存在页面 state。
- 近期提交包括隐藏部分 timing 字段、优化表格截断、tooltip、详情抽屉、异常计数和状态字段。

### 调度中心/取数监控

入口 `fetch-monitor`，数据源 `src/mock/fetchMonitor.js`。这是调度中心页面，与“售电业务 -> 市场数据 -> 数据监控”不同，不要混淆。

### 操作记录

`download-record`、`operation-log`、`audit-record` 共享 `operation-record` viewType，数据源 `src/mock/operationRecord.js`。

### 仿真和算法

仿真：

- `spot-trading-simulation`
- `spot-mock-trading`

算法：

- `day-ahead-load-prediction`
- `spot-price-prediction`

数据分别来自 `src/mock/simulationData.js` 和 `src/mock/algorithmData.js`。

## 独立数据监控预警平台记忆

`data-monitor-platform/` 是独立前端应用，不依赖主 BOSS 的 `BOSS_PAGE_REGISTRY`、菜单或 mock 模块。它面向生产接入，`config.js` 中把 `apiBaseUrl` 指向真实后端即可。

功能范围：

- 交易中心选择
- 取数通道监控
- 数据质量监控
- 筛选
- 概览指标
- 异常明细
- 详情抽屉
- 重新校验
- 忽略/取消忽略

配置：

- `defaultCenter: "guangdong"`
- `apiBaseUrl: "/api"`
- `requestTimeoutMs: 8000`
- 交易中心：广东、湖南、陕西
- `realDataContractVersion: "2026-06-15"`

接口契约：

- `GET /api/data-monitor/snapshot?centerId=...`
- `POST /api/data-monitor/alerts/{id}/recheck`
- `POST /api/data-monitor/alerts/{id}/ignore`
- 请求头 `X-Data-Monitor-Contract: 2026-06-15`

前端行为：

- 默认请求真实 API。
- 如果 API 不可用，自动使用 `data/seed-monitor-data.js` 作为预览数据。
- `localStorage` 保存交易中心设置和忽略记录。
- 质量异常只有入库后触发；未入库异常归入取数通道监控。
- 固定预警批次口径：D 日 11:40、D 日 18:30、D+1 日 11:40。

验证命令：

```bash
node data-monitor-platform/tests/smoke-render.js
```

smoke test 检查：

- 不再展示 API Base、数据模式、status-band、notice-panel。
- fetch/quality 表格和指标能从 seed 渲染。
- 明细中有异常描述、忽略状态。
- 抽屉动作包含日志入口、业务页面入口、重新校验。

## 政策 PDF 结构化工作线记忆

这一工作线的产物不在当前仓库内，脚本默认读取外部目录：

```text
/Users/didi/Documents/codex售电市场政策结构化
```

常见子目录：

```text
湖南交易中心/2026年执行政策
陕西交易中心/2026年执行政策
```

输出约定：

- 原始或修复后的 Markdown：`<policy>.md`
- 同名 HTML：`<policy>.html`
- `ZC_HTML/<policy>.html`
- `ZC_HTML/<policy>.zc_skill.html`
- `ZC_HTML/<policy>.json`
- `ZC_STRUCTURED/<policy>.structured.json`
- `ZC_STRUCTURED/<policy>.zc_skill.structured.json`
- `ZC_STRUCTURED/<policy>.zc_skill.report.md`
- `ZC_STRUCTURED/index.json`

通用原则见 `docs/policy-pdf-parse-repair-runbook.md`。最重要的记忆：

1. PDF 页面图像是最终依据，OCR、MD、HTML、JSON 不一致时以视觉内容为准。
2. 修复要可重复运行，优先写确定性的 `scripts/fix_*.py`。
3. 用稳定上下文定位，不依赖行号。
4. 同一份 Markdown 生成所有产物，修完后同步 MD、HTML、ZC_HTML、ZC_STRUCTURED、报告和索引。
5. 先备份再写入，通常备份到 `/private/tmp/<task>_<timestamp>`。
6. 验收要覆盖 MD、HTML、JSON，不只看 HTML。

湖南重点脚本：

- `scripts/parse_hunan_policy_pdfs_with_skill.py`
- `scripts/fix_hunan_spot_formula_mapping.py`
- `scripts/fix_hunan_settlement_formula_mapping.py`
- `scripts/fix_hunan_freq_formula_mapping.py`
- `scripts/fix_hunan_meter_formula_mapping.py`
- `scripts/fix_hunan_retail_register_formulas.py`
- `scripts/fix_midlong_matching_formula_latex.py`
- `scripts/fix_hunan_policy_parse_qa_issues.py`
- `scripts/validate_hunan_policy_parse_outputs.py`

陕西重点脚本：

- `scripts/parse_shaanxi_policy_pdfs_with_skill.py`
- `scripts/fix_shaanxi_all_formula_latex.py`
- `scripts/fix_shaanxi_formula_rendering_all.py`
- `scripts/fix_shaanxi_settlement_formula_mapping.py`
- `scripts/fix_shaanxi_spot_layout_text_consistency.py`
- `scripts/extract_shaanxi_formula_text_layer.py`
- `scripts/extract_shaanxi_formula_bboxes.py`
- `scripts/audit_shaanxi_formula_images.py`
- `scripts/validate_shaanxi_policy_parse_outputs.py`

政策 demo 数据同步：

- `scripts/update_policy_demo_data.py` 从外部结构化产物汇总政策文件状态，生成可嵌入 demo 的数据片段。
- 脚本记忆里提到广东文件已接入 PDF/MD/HTML，但尚未生成 ZC_STRUCTURED 质量报告；湖南、陕西已有公式恢复和结构化质量信息。

## 近期提交线索

最近 20 个提交集中在以下方向：

- 数据监控样例和隐藏历史 tab：`8fb3002 Update data monitor sample and hide history tabs`
- 独立数据监控平台和政策修复：`4ac005a Add data monitor platform and policy fixes`
- 陕西合同曲线明细布局：`942dbe1 Adjust Shaanxi contract curve detail layout`
- 陕西交易概览更新时间隐藏：`a8fc59d Hide Shaanxi trade overview update time`
- 陕西 96 点披露粒度：`1c19899 Fix Shaanxi 96-point disclosure granularity`
- 陕西披露市场数据 tab：`b0c5048 Add Shaanxi disclosure market data tabs`
- 数据监控 timing 字段隐藏、表格截断、状态布局、详情抽屉、tooltip、异常计数、字段和 Excel 配置等连续优化。
- 负荷信息 secondary tabs 重排。
- 操作记录 demo 页对齐。

当前工作树在生成本记忆前是干净状态。

## 代码修改约定

### 主应用

- 保持全局脚本/IIFE 风格，不新增构建链。
- 新增数据优先放到 `src/mock/*.js` 并挂载 `window.BOSS_*`。
- 若新增 mock 需要统一注入，在 `mockData.js` 加入 `BOSS_APP_MOCKS` 汇总。
- 若新增脚本，更新 `index.html` 且确保加载顺序正确。
- 改 `index.html` 中已有脚本或 CSS 后，可按现有风格更新 query 参数缓存戳。
- `main.js` 很大，改动要尽量局部，优先复用已有渲染 helper、表格 helper、图表 helper、状态 helper。
- `styles.css` 已有大量组件类，新增样式尽量贴近现有命名域，避免全局污染。
- 表格和图表要处理空状态、长文本截断、tooltip、横向滚动、移动端宽度。

### 数据和日期

- 演示数据大量固定在 `2026-05` 和 `2026-06`，不要因为真实当前日期变化而自动滚动。
- 交易中心名称有全称和短名两套口径，转换时注意：
  - `广东交易中心` / `广东电力交易中心` / `guangdong`
  - `湖南交易中心` / `湖南电力交易中心` / `hunan`
  - `陕西交易中心` / `陕西电力交易中心` / `shaanxi`
- 24 点、96 点、15min、小时聚合混用时，要保留业务说明。
- `24:00` 在湖南、陕西等数据中可能作为合法时点标签出现。

### UI 口径

- 这是运营型 BOSS 后台，不是营销页。页面应保持密集、可扫读、克制、面向重复操作。
- 已有 UI 多使用 panel、filter、table、drawer、modal、badge、status tag。不要引入风格突兀的大卡片、大 hero 或装饰性背景。
- 数据监控、政策结构化、交易披露类页面的核心是筛选、指标、表格、详情和可追溯来源。

### 政策脚本

- 外部政策目录不在仓库里，运行脚本前确认路径存在。
- 结构化修复必须同步 Markdown、HTML、ZC_HTML、ZC_STRUCTURED、报告和索引。
- 公式修复不要只替换图片占位，要同步公式解释和结构化 JSON 的 quality report。
- 批量 QA 脚本可能覆盖专项修复，稳定规则需要沉淀到批量 QA 以防回退。

## 常用验证

主应用人工验证：

```bash
npm run dev
```

然后访问：

- `http://127.0.0.1:8123/`
- `http://127.0.0.1:8123/#data-monitor`
- `http://127.0.0.1:8123/#gd-info-disclosure`
- `http://127.0.0.1:8123/#hn-data-disclosure`
- `http://127.0.0.1:8123/#sx-data-disclosure`
- `http://127.0.0.1:8123/#gd-settlement`
- `http://127.0.0.1:8123/#rolling-data`

独立数据监控 smoke test：

```bash
node data-monitor-platform/tests/smoke-render.js
```

政策结构化验收：

```bash
python3 scripts/validate_hunan_policy_parse_outputs.py
python3 scripts/validate_shaanxi_policy_parse_outputs.py
```

注意：政策脚本依赖外部目录和本机解析工具，非仓库内自包含。

## 其他平台续作时的第一步

建议新平台先读：

1. `docs/memory/project-memory.md`
2. `docs/memory/continuation-context.md`
3. `docs/policy-pdf-parse-repair-runbook.md`，仅当任务涉及政策 PDF/结构化。
4. `data-monitor-platform/docs/api-contract.md`，仅当任务涉及独立数据监控应用或后端契约。
5. 任务相关源码入口，例如 `index.html`、`src/pages/pageRegistry.js`、`src/pages/pageState.js`、`main.js`、对应 `src/mock/*.js`。

接手后不要先大改架构。这个项目的价值在于静态可预览、数据 mock 足、业务页面能快速演示；多数任务应继续沿用现有全局脚本和 mock 配置模式。
