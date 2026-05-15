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
    title: "现货交易仿真",
    viewType: "spot-trading-simulation",
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
    ["asset-merchant-management", "asset-merchant-management", "资产管理 / 商户管理", ["assetExpanded"]],
    ["asset-microgrid-management", "asset-microgrid-management", "资产管理 / 微电网管理", ["assetExpanded"]],
    ["asset-virtual-plant-management", "asset-virtual-plant-management", "资产管理 / 虚拟电厂管理", ["assetExpanded"]],
    ["asset-device-center", "asset-device-center", "资产管理 / 设备中心", ["assetExpanded"]],
    ["asset-power-monitoring", "asset-power-monitoring", "资产管理 / 用电情况监测", ["assetExpanded"]],
    ["partner-funder-management", "partner-funder-management", "合作方管理 / 资方管理", ["partnerExpanded"]],
    ["partner-vendor-management", "partner-vendor-management", "合作方管理 / 设备商管理", ["partnerExpanded"]],
    ["partner-merchant-management", "partner-merchant-management", "合作方管理 / 商户管理", ["partnerExpanded"]],
    ["vpp-management", "vpp-management", "虚拟电厂 / 虚拟电厂管理", ["virtualPlantExpanded"]],
    ["vpp-resource-aggregation", "vpp-resource-aggregation", "虚拟电厂 / 资源聚合", ["virtualPlantExpanded"]],
    ["vpp-site-monitoring", "vpp-site-monitoring", "虚拟电厂 / 站点监测", ["virtualPlantExpanded"]],
    ["service-demand-response", "service-demand-response", "辅助服务 / 需求响应", ["serviceExpanded"]],
    ["service-orderly-charging", "service-orderly-charging", "辅助服务 / 有序充电", ["serviceExpanded"]],
    ["service-interruptible-load", "service-interruptible-load", "辅助服务 / 可中断负荷", ["serviceExpanded"]],
    ["service-market-settlement", "service-market-settlement", "辅助服务 / 市场结算", ["serviceExpanded"]],
    ["service-merchant-reach", "service-merchant-reach", "辅助服务 / 商户触达", ["serviceExpanded"]],
    ["rolling-data", "rolling-data", "售电业务 / 滚搓数据", ["saleExpanded", "marketExpanded"]],
    ["spot-trading-strategy", "spot-trading-strategy", "售电业务 / 现货交易策略", ["saleExpanded", "strategyExpanded"]],
    ["power-user-management", "power-user-management", "售电业务 / 用电用户管理", ["saleExpanded"]],
    ["charging-pricing-tool", "charging-pricing-tool", "售电业务 / 充电电价定价工具", ["saleExpanded"]],
    ["solar-storage-assets", "solar-storage-assets", "光储经营 / 光储资产", ["storageExpanded"]],
    ["storage-operation-analysis", "storage-operation-analysis", "光储经营 / 经营分析", ["storageExpanded"]],
    ["fetch-tasks", "fetch-tasks", "调度中心 / 取数任务", ["dispatchExpanded"]],
    ["fetch-alerts", "fetch-alerts", "调度中心 / 异常告警", ["dispatchExpanded"]],
    ["low-carbon-service", "low-carbon-service", "低碳家园 / 低碳服务", ["lowCarbonExpanded"]],
    ["operation-log", "operation-log", "操作记录 / 操作日志", ["recordExpanded"]],
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
