(function attachPageRegistry(global) {
  var pages = [];

  function addPage(page) {
    pages.push(page);
  }

  addPage({
    key: "business-center",
    hash: "business-center",
    aliases: ["business-overview"],
    title: "业务中心",
    viewType: "business-center",
    sidebarTrail: [],
  });

  addPage({
    key: "gd-info-disclosure",
    hash: "gd-info-disclosure",
    aliases: ["info-disclosure", "market-info-disclosure"],
    title: "信息披露",
    viewType: "gd-info-disclosure",
    sidebarTrail: ["saleExpanded", "marketExpanded"],
  });

  addPage({
    key: "gd-trade-result",
    hash: "gd-trade-result",
    title: "用电侧交易结果",
    viewType: "gd-trade-result",
    sidebarTrail: ["saleExpanded", "marketExpanded"],
  });

  addPage({
    key: "gd-settlement",
    hash: "gd-settlement",
    aliases: ["market-settlement"],
    title: "日清月结",
    viewType: "gd-settlement",
    sidebarTrail: ["saleExpanded", "marketExpanded"],
  });

  addPage({
    key: "data-monitor",
    hash: "data-monitor",
    aliases: ["market-data-monitor"],
    title: "数据监控",
    viewType: "data-monitor",
    sidebarTrail: ["saleExpanded", "marketExpanded"],
  });

  addPage({
    key: "gd-retail-relation",
    hash: "gd-retail-relation",
    aliases: ["market-retail-relation"],
    title: "零售关系",
    viewType: "gd-retail-relation",
    sidebarTrail: ["saleExpanded", "marketExpanded"],
  });

  addPage({
    key: "gd-day-ahead-declaration",
    hash: "gd-day-ahead-declaration",
    title: "日前申报",
    viewType: "gd-day-ahead-declaration",
    sidebarTrail: ["saleExpanded", "marketExpanded"],
  });

  addPage({
    key: "spot-mock-trading",
    hash: "spot-mock-trading",
    aliases: ["simulation"],
    title: "现货模拟交易",
    viewType: "spot-mock-trading",
    sidebarTrail: ["saleExpanded", "simulationExpanded"],
  });

  addPage({
    key: "hn-data-disclosure",
    hash: "hn-data-disclosure",
    title: "湖南电力交易中心",
    viewType: "market-data-disclosure",
    sidebarTrail: ["saleExpanded", "marketExpanded"],
  });

  addPage({
    key: "sx-data-disclosure",
    hash: "sx-data-disclosure",
    title: "陕西电力交易中心",
    viewType: "market-data-disclosure",
    sidebarTrail: ["saleExpanded", "marketExpanded"],
  });

  addPage({
    key: "spot-trading-simulation",
    hash: "spot-trading-simulation",
    title: "现货仿真回测",
    viewType: "spot-trading-simulation",
    sidebarTrail: ["saleExpanded", "simulationExpanded"],
  });

  addPage({
    key: "simulation-decision-analysis",
    hash: "simulation-decision-analysis",
    title: "交易决策分析",
    viewType: "simulation-decision-analysis",
    sidebarTrail: ["saleExpanded", "simulationExpanded"],
  });

  addPage({
    key: "day-ahead-load-prediction",
    hash: "day-ahead-load-prediction",
    title: "日前负荷预测",
    viewType: "day-ahead-load-prediction",
    sidebarTrail: ["saleExpanded", "algorithmExpanded"],
  });

  addPage({
    key: "spot-price-prediction",
    hash: "spot-price-prediction",
    title: "价差及现货价格预测",
    viewType: "spot-price-prediction",
    sidebarTrail: ["saleExpanded", "algorithmExpanded"],
  });

  addPage({
    key: "fetch-monitor",
    hash: "fetch-monitor",
    title: "取数监控",
    viewType: "fetch-monitor",
    sidebarTrail: ["dispatchExpanded"],
  });

  [
    // 资产管理
    ["asset-microgrid-management", "asset-microgrid-management", "资产管理 / 微电网管理", ["assetExpanded"]],
    ["asset-device-center", "asset-device-center", "资产管理 / 设备中心", ["assetExpanded"]],
    ["asset-tag-management", "asset-tag-management", "资产管理 / 标签管理", ["assetExpanded"]],
    ["asset-merchant-management", "asset-merchant-management", "资产管理 / 商户管理", ["assetExpanded"]],
    ["asset-virtual-plant-management", "asset-virtual-plant-management", "资产管理 / 虚拟电厂管理", ["assetExpanded"]],
    ["asset-power-monitoring", "asset-power-monitoring", "资产管理 / 用电情况监测", ["assetExpanded"]],
    // 合作方管理
    ["partner-funder-management", "partner-funder-management", "合作方管理 / 资方管理", ["partnerExpanded"]],
    ["partner-vendor-management", "partner-vendor-management", "合作方管理 / 设备商管理", ["partnerExpanded"]],
    ["partner-merchant-management", "partner-merchant-management", "合作方管理 / 商户管理", ["partnerExpanded"]],
    // 虚拟电厂
    ["vpp-management", "vpp-management", "虚拟电厂 / 虚拟电厂管理", ["virtualPlantExpanded"]],
    ["vpp-resource-aggregation", "vpp-resource-aggregation", "虚拟电厂 / 资源聚合", ["virtualPlantExpanded"]],
    ["vpp-site-monitoring", "vpp-site-monitoring", "虚拟电厂 / 站点监测", ["virtualPlantExpanded"]],
    // 辅助服务（二级分组：市场交易 / 结算管理 / 商户服务）
    ["service-demand-response", "service-demand-response", "辅助服务 / 市场交易 / 需求响应", ["serviceExpanded", "serviceMarketExpanded"]],
    ["service-orderly-charging", "service-orderly-charging", "辅助服务 / 市场交易 / 有序充电", ["serviceExpanded", "serviceMarketExpanded"]],
    ["service-interruptible-load", "service-interruptible-load", "辅助服务 / 市场交易 / 可中断负荷", ["serviceExpanded", "serviceMarketExpanded"]],
    ["service-market-settlement", "service-market-settlement", "辅助服务 / 结算管理 / 市场结算", ["serviceExpanded", "serviceSettlementExpanded"]],
    ["service-merchant-reach", "service-merchant-reach", "辅助服务 / 商户服务 / 商户触达", ["serviceExpanded", "serviceMerchantExpanded"]],
    // 售电业务 / 市场数据
    ["rolling-data", "rolling-data", "售电业务 / 市场数据 / 滚搓数据", ["saleExpanded", "marketExpanded"]],
    // 售电业务 / 策略中心
    ["strategy-management", "strategy-management", "售电业务 / 策略中心 / 策略管理", ["saleExpanded", "strategyExpanded"]],
    ["model-management", "model-management", "售电业务 / 策略中心 / 模型管理", ["saleExpanded", "strategyExpanded"]],
    ["feature-management", "feature-management", "售电业务 / 策略中心 / 特征管理", ["saleExpanded", "strategyExpanded"]],
    ["spot-trading-strategy", "spot-trading-strategy", "售电业务 / 策略中心 / 现货交易策略", ["saleExpanded", "strategyExpanded"]],
    // 售电业务 / 客户服务
    ["customer-expansion", "customer-expansion", "售电业务 / 客户服务 / 客户拓展", ["saleExpanded", "customerServiceExpanded"]],
    ["electricity-cost-estimation", "electricity-cost-estimation", "售电业务 / 客户服务 / 电费测算", ["saleExpanded", "customerServiceExpanded"]],
    ["power-user-management", "power-user-management", "售电业务 / 客户服务 / 用电用户管理", ["saleExpanded", "customerServiceExpanded"]],
    // 售电业务 / 充电联合
    ["charging-union", "charging-union", "售电业务 / 充电联合", ["saleExpanded"]],
    ["charging-pricing-tool", "charging-pricing-tool", "售电业务 / 充电电价定价工具", ["saleExpanded"]],
    // 售电业务 / 智能算法（day-ahead-load-prediction、spot-price-prediction 见上方真实页注册）
    // 光储经营 / 项目建设
    ["storage-calc-tool", "storage-calc-tool", "光储经营 / 项目建设 / 测算工具", ["storageExpanded", "storageProjectExpanded"]],
    ["storage-sandbox", "storage-sandbox", "光储经营 / 项目建设 / 储能沙盘", ["storageExpanded", "storageProjectExpanded"]],
    ["storage-project-management", "storage-project-management", "光储经营 / 项目建设 / 项目管理", ["storageExpanded", "storageProjectExpanded"]],
    // 光储经营 / 项目运营
    ["storage-operation-dashboard", "storage-operation-dashboard", "光储经营 / 项目运营 / 运营大盘", ["storageExpanded", "storageOperationExpanded"]],
    ["storage-estimation", "storage-estimation", "光储经营 / 项目运营 / 光储测算", ["storageExpanded", "storageOperationExpanded"]],
    ["storage-price-management", "storage-price-management", "光储经营 / 项目运营 / 电价管理", ["storageExpanded", "storageOperationExpanded"]],
    ["storage-control-strategy", "storage-control-strategy", "光储经营 / 项目运营 / 控制策略", ["storageExpanded", "storageOperationExpanded"]],
    // 光储经营 / 收益结算
    ["storage-revenue-report", "storage-revenue-report", "光储经营 / 收益结算 / 收益报表", ["storageExpanded", "storageRevenueExpanded"]],
    ["storage-settlement-bill", "storage-settlement-bill", "光储经营 / 收益结算 / 结算账单", ["storageExpanded", "storageRevenueExpanded"]],
    // 光储经营 / 治理平台
    ["storage-anomaly-monitor", "storage-anomaly-monitor", "光储经营 / 治理平台 / 异常监控", ["storageExpanded", "storageGovernanceExpanded"]],
    ["storage-work-order", "storage-work-order", "光储经营 / 治理平台 / 工单管理", ["storageExpanded", "storageGovernanceExpanded"]],
    ["storage-log-diagnosis", "storage-log-diagnosis", "光储经营 / 治理平台 / 日志诊断", ["storageExpanded", "storageGovernanceExpanded"]],
    // 光储经营（表格未收录，保留）
    ["solar-storage-assets", "solar-storage-assets", "光储经营 / 光储资产", ["storageExpanded"]],
    ["storage-operation-analysis", "storage-operation-analysis", "光储经营 / 经营分析", ["storageExpanded"]],
    // 调度中心
    ["dispatch-strategy", "dispatch-strategy", "调度中心 / 调度策略", ["dispatchExpanded"]],
    ["dispatch-cost-config", "dispatch-cost-config", "调度中心 / 调度成本配置", ["dispatchExpanded"]],
    ["columbus-new-route", "columbus-new-route", "调度中心 / 哥伦布 / 新航线（实验平台）", ["dispatchExpanded", "columbusExpanded"]],
    ["columbus-compass", "columbus-compass", "调度中心 / 哥伦布 / 指南针（指标体系）", ["dispatchExpanded", "columbusExpanded"]],
    ["columbus-new-continent", "columbus-new-continent", "调度中心 / 哥伦布 / 新大陆（派单引擎）", ["dispatchExpanded", "columbusExpanded"]],
    // 调度中心（表格未收录，保留）
    ["fetch-tasks", "fetch-tasks", "调度中心 / 取数任务", ["dispatchExpanded"]],
    ["fetch-alerts", "fetch-alerts", "调度中心 / 异常告警", ["dispatchExpanded"]],
    // 低碳家园
    ["low-carbon-task-management", "low-carbon-task-management", "低碳家园 / 任务管理", ["lowCarbonExpanded"]],
    ["low-carbon-user-tasks", "low-carbon-user-tasks", "低碳家园 / 用户任务列表", ["lowCarbonExpanded"]],
    ["low-carbon-coin-management", "low-carbon-coin-management", "低碳家园 / 用户低碳币管理", ["lowCarbonExpanded"]],
    ["low-carbon-service", "low-carbon-service", "低碳家园 / 低碳服务", ["lowCarbonExpanded"]],
    // 操作记录
    ["download-record", "download-record", "操作记录 / 下载记录", ["recordExpanded"]],
    ["operation-log", "operation-log", "操作记录 / 操作日志", ["recordExpanded"]],
    ["audit-record", "audit-record", "操作记录 / 审核记录", ["recordExpanded"]],
    // 电力交易驾驶舱（无侧栏归属）
    ["intramonth-rolling-trading", "intramonth-rolling-trading", "电力交易驾驶舱 / 月内滚撮交易", []],
    ["power-data-import", "power-data-import", "电力交易驾驶舱 / 电量数据导入", []],
    ["placeholder", "placeholder", "功能建设中", []],
  ].forEach(function eachPage(tuple) {
    addPage({
      key: tuple[0],
      hash: tuple[1],
      title: tuple[2],
      viewType: "placeholder",
      sidebarTrail: tuple[3],
    });
  });

  pages.forEach(function applyCompatAliases(page) {
    if (page.key === "rolling-data") {
      page.viewType = "rolling-data";
    }
    if (page.key === "download-record" || page.key === "operation-log" || page.key === "audit-record") {
      page.viewType = "operation-record";
    }
    if (page.key === "charging-pricing-tool") {
      page.aliases = ["charging-price-tool"];
    }
  });

  var pageMap = {};
  var aliasMap = {};

  pages.forEach(function mapPage(page) {
    pageMap[page.key] = page;
    aliasMap[page.hash] = page.key;
    (page.aliases || []).forEach(function mapAlias(alias) {
      aliasMap[alias] = page.key;
    });
  });

  global.BOSS_PAGE_REGISTRY = {
    defaultPageKey: "business-center",
    pages: pages,
    pageMap: pageMap,
    aliasMap: aliasMap,
    getPage: function getPage(pageKey) {
      var normalizedPageKey = aliasMap[String(pageKey || "").replace(/^#/, "")] || pageKey;
      return pageMap[normalizedPageKey] || pageMap.placeholder;
    },
    getPageKeyFromHash: function getPageKeyFromHash(hashValue) {
      var hash = String(hashValue || "").replace(/^#/, "");
      return aliasMap[hash] || this.defaultPageKey;
    },
    getPageKeyFromPathname: function getPageKeyFromPathname(pathnameValue) {
      var pathname = String(pathnameValue || "")
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");
      var segments = pathname ? pathname.split("/") : [];
      var routeKey = segments.length ? segments[segments.length - 1] : "";
      if (!routeKey || routeKey === "index.html") {
        return this.defaultPageKey;
      }
      return aliasMap[routeKey] || aliasMap[pathname] || this.defaultPageKey;
    },
    getPageKeyFromLocation: function getPageKeyFromLocation(locationLike) {
      if (locationLike && locationLike.hash) {
        return this.getPageKeyFromHash(locationLike.hash);
      }
      return this.getPageKeyFromPathname(locationLike && locationLike.pathname);
    },
    getHashFromPageKey: function getHashFromPageKey(pageKey) {
      return this.getPage(pageKey).hash;
    },
  };
})(window);
