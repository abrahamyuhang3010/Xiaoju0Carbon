(function startApp(global) {
  var mock = global.BOSS_MOCK_DATA;
  var appMocks = global.BOSS_APP_MOCKS || {};
  var registry = global.BOSS_PAGE_REGISTRY;
  var pageState = global.BOSS_PAGE_STATE;
  var components = global.BOSS_COMPONENTS || {};
  var platformMenu = appMocks.platformMenu || {};
  var businessCenterMock = appMocks.businessCenter || {};
  var guangdongMock = appMocks.guangdong || {};
  var hunanMock = appMocks.hunan || {};
  var shaanxiMock = appMocks.shaanxi || {};
  var infoDisclosureConfig = global.BOSS_INFO_DISCLOSURE_CONFIG || {};
  var fetchMonitorMock = appMocks.fetchMonitor || {};
  var simulationMock = appMocks.simulation || {};
  var algorithmMock = appMocks.algorithm || {};

  var renderTradeCenterSelector = components.renderTradeCenterSelector || function renderEmpty() {
    return "";
  };
  var renderStandardDatePicker = components.renderStandardDatePicker || function renderEmpty() {
    return "";
  };
  var renderDataUpdateBar = components.renderDataUpdateBar || function renderEmpty() {
    return "";
  };
  var renderCompareModal = components.renderCompareModal || function renderEmpty() {
    return "";
  };
  var renderManualUpdateModal = components.renderManualUpdateModal || function renderEmpty() {
    return "";
  };
  var renderDownloadModal = components.renderDownloadModal || function renderEmpty() {
    return "";
  };
  var renderDownloadTaskDrawer = components.renderDownloadTaskDrawer || function renderEmpty() {
    return "";
  };
  var renderEmptyState = components.renderEmptyState || function renderEmpty() {
    return "";
  };
  var renderPermissionNotification = components.renderPermissionNotification || function renderEmpty() {
    return "";
  };
  var renderChartWithMarks = components.renderChartWithMarks || function renderEmpty() {
    return "";
  };
  var renderDataTablePro = components.renderDataTablePro || function renderEmpty() {
    return "";
  };
  var renderPlaceholderPage = components.renderPlaceholderPage || function renderEmpty() {
    return "";
  };

  var ASSETS = global.BOSS_BRAND_ASSETS || {
    bossLogo: "./public/assets/logos/logo-boss.png",
    energyLogo: "./public/assets/logos/logo-energy-icon.png",
    userAvatar: "./public/assets/users/louchang-avatar.png",
  };

  var NAV_ITEMS = platformMenu.topNavItems || [];
  var TRADE_CENTER_OPTIONS = [
    "广东电力交易中心",
    "湖南电力交易中心",
    "陕西电力交易中心",
    "测试交易中心",
  ];
  var INFO_DISCLOSURE_PRIMARY_TABS = infoDisclosureConfig.primaryTabs || [
    "负荷信息",
    "全省统一出清价",
    "出清电量",
    "交易结果",
    "售电公司分时电量",
    "用电企业分时电量",
    "节点电价",
    "日前申报",
  ];
  var INFO_DISCLOSURE_SECONDARY_TABS =
    (infoDisclosureConfig.secondaryTabs && infoDisclosureConfig.secondaryTabs["负荷信息"]) || ["负荷信息", "负荷详情", "机组检修容量", "备用信息"];
  var INFO_DISCLOSURE_EMPTY_MESSAGE =
    infoDisclosureConfig.emptyStateMessage || "当前交易中心暂未接入该披露类型数据，请切换其他披露类型或手动更新数据。";
  var DOWNLOAD_DATA_TYPES = [
    "负荷信息",
    "负荷详情",
    "售电公司分时电量",
    "用电企业分时电量",
    "机组检修容量",
    "备用信息",
    "全省统一出清价",
    "出清电量",
    "交易结果",
    "节点电价",
    "日前申报",
    "日清算",
    "月结算",
    "零售关系",
  ]
    .concat(INFO_DISCLOSURE_PRIMARY_TABS || [])
    .concat(INFO_DISCLOSURE_SECONDARY_TABS || [])
    .filter(function dedupe(item, index, source) {
      return source.indexOf(item) === index;
    });
  var DOWNLOAD_SUMMARY = (appMocks.downloadTasks && appMocks.downloadTasks.summary) || {
    retainDays: 7,
    maxVisibleRecords: 10,
    maxRowsPerFile: 200000,
  };

  var flashTimer = null;

  var ICON_PATHS = {
    search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>',
    bell: '<path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.17V11a6 6 0 1 0-12 0v3.17a2 2 0 0 1-.59 1.42L4 17h5"></path><path d="M10 21a2 2 0 0 0 4 0"></path>',
    user: '<circle cx="12" cy="8" r="3.25"></circle><path d="M6.8 18a5.2 5.2 0 0 1 10.4 0"></path>',
    "circle-user": '<circle cx="12" cy="8" r="3.25"></circle><path d="M7 18a5 5 0 0 1 10 0"></path><circle cx="12" cy="12" r="9"></circle>',
    database: '<ellipse cx="12" cy="5" rx="7" ry="3"></ellipse><path d="M5 5v10c0 1.7 3.1 3 7 3s7-1.3 7-3V5"></path><path d="M5 10c0 1.7 3.1 3 7 3s7-1.3 7-3"></path>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"></path><circle cx="9.5" cy="8" r="3"></circle><path d="M20 21v-2a3.5 3.5 0 0 0-2.5-3.35"></path><path d="M16.5 5.2a3 3 0 0 1 0 5.6"></path>',
    factory: '<path d="M3 21h18"></path><path d="M5 21V9l7-3v4l7-4v15"></path><path d="M9 13h1"></path><path d="M9 17h1"></path><path d="M13 13h1"></path><path d="M13 17h1"></path><path d="M17 13h1"></path>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.5 5.5L3 18v3h3l6.2-6.2a4 4 0 0 0 5.5-5.5l-3 3-2.7-2.7 2.7-3Z"></path>',
    "chart-line": '<path d="M3 3v18h18"></path><path d="m7 14 4-4 3 3 5-7"></path>',
    "battery-charging": '<rect x="3" y="7" width="16" height="10" rx="2"></rect><path d="M21 11v2"></path><path d="m10 8-2 4h3l-1 4 4-6h-3l1-2"></path>',
    network: '<circle cx="12" cy="6" r="2"></circle><circle cx="6" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle><path d="M12 8v4"></path><path d="M7.7 16.5 11 13"></path><path d="M16.3 16.5 13 13"></path>',
    leaf: '<path d="M11 20C7 20 4 17 4 13c0-6 8-9 16-9 0 8-3 16-9 16Z"></path><path d="M9 12c2 0 4-1 6-3"></path>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path><path d="M12 7v5l3 2"></path>',
    monitor: '<rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path>',
    "play-circle": '<circle cx="12" cy="12" r="9"></circle><path d="m10 9 5 3-5 3Z"></path>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 10h18"></path><path d="M9 4v16"></path><path d="M15 4v16"></path>',
    "file-text": '<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v5h5"></path><path d="M9 13h6"></path><path d="M9 17h6"></path>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4"></path><path d="M8 3v4"></path><path d="M3 10h18"></path>',
    refresh: '<path d="M21 12a9 9 0 0 0-15.5-6.36L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 15.5 6.36L21 16"></path><path d="M16 16h5v5"></path>',
    "share-2": '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="M8.6 10.7 15.4 6.3"></path><path d="m8.6 13.3 6.8 4.4"></path>',
    target: '<circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle><path d="M12 4v-1"></path><path d="M20 12h1"></path><path d="M12 20v1"></path><path d="M4 12H3"></path>',
    cpu: '<rect x="5" y="5" width="14" height="14" rx="2"></rect><rect x="9" y="9" width="6" height="6" rx="1"></rect><path d="M9 2v3"></path><path d="M15 2v3"></path><path d="M9 19v3"></path><path d="M15 19v3"></path><path d="M2 9h3"></path><path d="M2 15h3"></path><path d="M19 9h3"></path><path d="M19 15h3"></path>',
    coins: '<ellipse cx="12" cy="7" rx="5" ry="2.5"></ellipse><path d="M7 7v7c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7"></path><path d="M10.5 11h3"></path>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"></path>',
    download: '<path d="M12 4v10"></path><path d="m8 10 4 4 4-4"></path><path d="M4 20h16"></path>',
    ellipsis: '<circle cx="6" cy="12" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="18" cy="12" r="1.5"></circle>',
    compare: '<path d="M10 6H5a2 2 0 0 0-2 2v8"></path><path d="m7 3-3 3 3 3"></path><path d="M14 18h5a2 2 0 0 0 2-2V8"></path><path d="m17 21 3-3-3-3"></path>',
    plus: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
    alert: '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v5"></path><path d="M12 16h.01"></path>',
    "star-filled": '<path d="m12 2.8 2.8 5.66 6.24.91-4.52 4.4 1.07 6.23L12 17.13 6.41 20l1.07-6.23L2.96 9.37l6.24-.91Z"></path>',
    edit: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"></path>',
    square: '<rect x="7" y="7" width="10" height="10" rx="2"></rect>',
    "chevron-down": '<path d="m6 9 6 6 6-6"></path>',
    "chevron-up": '<path d="m6 15 6-6 6 6"></path>',
    "chevron-right": '<path d="m9 6 6 6-6 6"></path>',
    close: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
  };

  var state = pageState.createInitialState({
    registry: registry,
    mock: mock,
    hash: global.location.hash,
    appMocks: appMocks,
  });

  function formatInteger(value) {
    return String(Math.round(value));
  }

  function formatDecimal(value) {
    return Number(value).toFixed(1);
  }

  function formatDiff(value) {
    return value > 0 ? "+" + formatInteger(value) : formatInteger(value);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderIcon(name, className) {
    var markup = ICON_PATHS[name] || ICON_PATHS.square;
    var classes = "ui-icon";
    if (className) {
      classes += " " + className;
    }

    if (name === "star-filled") {
      return '<svg class="' + classes + '" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">' + markup + "</svg>";
    }

    return '<svg class="' + classes + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + markup + "</svg>";
  }

  function getMenuIconName(label) {
    var iconMap = {
      "资产管理": "database",
      "商户管理": "users",
      "微电网管理": "network",
      "虚拟电厂管理": "factory",
      "设备中心": "wrench",
      "用电情况监测": "monitor",
      "合作方管理": "users",
      "资方管理": "coins",
      "设备商管理": "factory",
      "虚拟电厂": "factory",
      "资源聚合": "network",
      "站点监测": "monitor",
      "辅助服务": "wrench",
      "需求响应": "bell",
      "有序充电": "battery-charging",
      "可中断负荷": "chart-line",
      "市场结算": "coins",
      "商户触达": "message",
      "售电业务": "chart-line",
      "光储经营": "battery-charging",
      "光储资产": "battery-charging",
      "经营分析": "chart-line",
      "调度中心": "network",
      "取数监控": "monitor",
      "取数任务": "table",
      "异常告警": "alert",
      "低碳家园": "leaf",
      "低碳服务": "leaf",
      "操作记录": "history",
      "操作日志": "history",
      "仿真平台": "monitor",
      "现货交易仿真": "chart-line",
      "现货模拟交易": "play-circle",
      "市场数据": "table",
      "广东交易中心": "database",
      "湖南交易中心": "database",
      "陕西交易中心": "database",
      "数据披露": "file-text",
      "信息披露": "file-text",
      "用电侧交易结果": "chart-line",
      "日清月结": "calendar",
      "日前申报": "edit",
      "滚捷数据": "refresh",
      "滚搓数据": "refresh",
      "零售关系": "share-2",
      "交易策略": "target",
      "现货交易策略": "target",
      "智能算法": "cpu",
      "日前负荷预测": "chart-line",
      "价差及现货价格预测": "chart-line",
      "用电用户管理": "circle-user",
      "充电电价定价工具": "coins",
    };

    return iconMap[label] || "square";
  }

  function getFeatureIconName(label) {
    var iconMap = {
      "微电网管理": "network",
      "设备中心": "database",
      "资方管理": "coins",
      "设备商管理": "factory",
      "商户管理": "users",
      "虚拟电厂管理": "factory",
      "资源聚合": "network",
      "站点监测": "monitor",
      "需求响应": "bell",
      "有序充电": "battery-charging",
      "可中断负荷": "chart-line",
      "市场结算": "coins",
      "商户触达": "message",
      "用电情况监测": "monitor",
      "信息披露": "file-text",
      "用电侧交易结果": "chart-line",
      "日清月结": "calendar",
      "日前申报": "edit",
      "零售关系": "share-2",
      "现货交易仿真": "chart-line",
      "现货模拟交易": "play-circle",
      "现货交易策略": "target",
      "日前负荷预测": "chart-line",
      "价差及现货价格预测": "chart-line",
      "用电用户管理": "circle-user",
      "充电电价定价工具": "coins",
      "月内滚撮交易": "refresh",
      "电量数据导入": "download",
      "负荷预测": "chart-line",
      "现货价格价差预测": "chart-line",
      "仿真回测": "monitor",
      "模拟交易": "play-circle",
    };

    return iconMap[label] || "square";
  }

  function renderRatingStars(count) {
    return Array.from({ length: count }, function createStar() {
      return renderIcon("star-filled", "rating-star");
    }).join("");
  }

  function isLegacyMarketDisclosurePage(pageKey) {
    return pageKey === "hn-data-disclosure" || pageKey === "sx-data-disclosure";
  }

  function isInfoDisclosurePage(pageKey) {
    return pageKey === "gd-info-disclosure" || isLegacyMarketDisclosurePage(pageKey);
  }

  function getTradeCenterDataPageKey(centerName) {
    if (centerName === "广东电力交易中心") {
      return "gd-info-disclosure";
    }
    if (centerName === "湖南电力交易中心") {
      return "hn-data-disclosure";
    }
    if (centerName === "陕西电力交易中心") {
      return "sx-data-disclosure";
    }
    return "gd-info-disclosure";
  }

  function getActiveTradeCenterDataPageKey(pageKey) {
    var resolvedPageKey = pageKey || state.currentPageKey;
    if (!isInfoDisclosurePage(resolvedPageKey)) {
      return resolvedPageKey;
    }
    return getTradeCenterDataPageKey(state.ui.selectedTradeCenter);
  }

  function isCurrentMarketDisclosureView(pageKey) {
    return isLegacyMarketDisclosurePage(getActiveTradeCenterDataPageKey(pageKey));
  }

  function getSelectedTradeCenterKey() {
    if (state.ui.selectedTradeCenter === "湖南电力交易中心") {
      return "hunan";
    }
    if (state.ui.selectedTradeCenter === "陕西电力交易中心") {
      return "shaanxi";
    }
    return "guangdong";
  }

  function getInfoDisclosureTradeCenterMeta() {
    var tradeCenterMeta = (infoDisclosureConfig.tradeCenters && infoDisclosureConfig.tradeCenters[getSelectedTradeCenterKey()]) || {};
    return {
      title: infoDisclosureConfig.title || "信息披露",
      name: tradeCenterMeta.name || state.ui.selectedTradeCenter,
      description: tradeCenterMeta.description || "",
    };
  }

  function getActiveInfoPrimaryTab() {
    return state.info.primaryTab || INFO_DISCLOSURE_PRIMARY_TABS[0] || "负荷信息";
  }

  function getActiveInfoSecondaryTab() {
    return state.info.secondaryTab || INFO_DISCLOSURE_SECONDARY_TABS[0] || "负荷信息";
  }

  function getTradeCenterMockBundle(tradeCenterKey) {
    if (tradeCenterKey === "hunan") {
      return hunanMock;
    }
    if (tradeCenterKey === "shaanxi") {
      return shaanxiMock;
    }
    return guangdongMock;
  }

  function getMarketPageData(pageType, tradeCenterKey) {
    var marketPageRegistry = global.BOSS_MARKET_PAGE_DATA;
    if (marketPageRegistry && typeof marketPageRegistry.getPageBundle === "function") {
      return marketPageRegistry.getPageBundle(tradeCenterKey || getSelectedTradeCenterKey(), pageType) || null;
    }
    var bundle = getTradeCenterMockBundle(tradeCenterKey || getSelectedTradeCenterKey());
    return (bundle && bundle[pageType]) || null;
  }

  function resolveMarketPageViewData(request) {
    var marketPageRegistry = global.BOSS_MARKET_PAGE_DATA;
    if (marketPageRegistry && typeof marketPageRegistry.getMarketPageData === "function") {
      return marketPageRegistry.getMarketPageData(request) || null;
    }
    return null;
  }

  function getInfoDisclosurePageData() {
    return (
      resolveMarketPageViewData({
        pageType: "infoDisclosure",
        tradeCenter: state.ui.selectedTradeCenter,
        primaryTab: getActiveInfoPrimaryTab(),
        secondaryTab: getActiveInfoPrimaryTab() === "负荷信息" ? getActiveInfoSecondaryTab() : "",
      }) || {}
    );
  }

  function getUnifiedInfoDisclosureDatePickerMode(pageData) {
    if (pageData && pageData.datePickerMode) {
      return pageData.datePickerMode;
    }

    if (
      pageData &&
      (pageData.viewType === "metricTreeCompare" ||
        pageData.viewType === "maintenanceComposite" ||
        pageData.viewType === "lineTable" ||
        pageData.viewType === "nodePrice")
    ) {
      return "single";
    }

    return "range";
  }

  function isUnifiedInfoDisclosureSingleDateMode(pageData) {
    return getUnifiedInfoDisclosureDatePickerMode(pageData) === "single";
  }

  function getUnifiedInfoDisclosureFilterFieldValue(field) {
    if (!field || !field.fieldKey) {
      return "";
    }

    var value = state.info.filters[field.fieldKey];
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      (!field.options || !field.options.length || field.options.indexOf(value) >= 0)
    ) {
      return value;
    }

    if (field.defaultValue !== undefined) {
      return field.defaultValue;
    }

    return (field.options && field.options[0]) || "";
  }

  function resetUnifiedInfoDisclosureFieldFilters(pageData) {
    (pageData && pageData.filterFields ? pageData.filterFields : []).forEach(function eachField(field) {
      if (!field || !field.fieldKey) {
        return;
      }
      state.info.filters[field.fieldKey] =
        field.defaultValue !== undefined ? field.defaultValue : (field.options && field.options[0]) || "";
    });
  }

  function getInfoDisclosureProfileMode(pageData) {
    var modes = (pageData && pageData.profileModes) || {};
    var modeKeys = Object.keys(modes);
    var currentMode = state.info.profileViewMode;

    if (currentMode && modes[currentMode]) {
      return currentMode;
    }

    if (pageData && pageData.defaultProfileMode && modes[pageData.defaultProfileMode]) {
      state.info.profileViewMode = pageData.defaultProfileMode;
      return pageData.defaultProfileMode;
    }

    state.info.profileViewMode = modeKeys[0] || "";
    return state.info.profileViewMode;
  }

  function syncUnifiedInfoDisclosureRange(pageData) {
    if (!isCurrentMarketDisclosureView() || !isUnifiedInfoDisclosureSingleDateMode(pageData)) {
      return;
    }

    var disclosureState = getMarketDisclosureState();
    var defaultDate =
      (pageData && pageData.filters && pageData.filters.date) ||
      disclosureState.appliedRange.end ||
      disclosureState.filterRange.end ||
      disclosureState.filterRange.start;

    if (!defaultDate) {
      return;
    }

    if (disclosureState.filterRange.start !== disclosureState.filterRange.end) {
      disclosureState.filterRange = {
        start: defaultDate,
        end: defaultDate,
      };
    }
    if (disclosureState.appliedRange.start !== disclosureState.appliedRange.end) {
      disclosureState.appliedRange = {
        start: defaultDate,
        end: defaultDate,
      };
    }
  }

  function getMarketDisclosureMock(pageKey) {
    var resolvedPageKey = getActiveTradeCenterDataPageKey(pageKey);
    if (resolvedPageKey === "hn-data-disclosure") {
      return hunanMock;
    }
    if (resolvedPageKey === "sx-data-disclosure") {
      return shaanxiMock;
    }
    return {};
  }

  function getMarketDisclosureState(pageKey) {
    var resolvedPageKey = getActiveTradeCenterDataPageKey(pageKey);
    return (state.marketDisclosure.pages && state.marketDisclosure.pages[resolvedPageKey]) || {
      activeTab: "",
      filterRange: { start: "", end: "" },
      appliedRange: { start: "", end: "" },
      lastUpdatedAt: "",
      queryCount: 0,
    };
  }

  function parseDate(value) {
    return new Date(value + "T00:00:00");
  }

  function formatDateTime(date) {
    function pad(value) {
      return String(value).padStart(2, "0");
    }

    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      " " +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes()) +
      ":" +
      pad(date.getSeconds())
    );
  }

  function formatDateCompact(value) {
    return String(value || "").replace(/-/g, "");
  }

  function formatDateValue(date) {
    function pad(value) {
      return String(value).padStart(2, "0");
    }

    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function formatMoney(value) {
    return Number(value).toLocaleString("zh-CN");
  }

  function formatPercent(value, digits) {
    var precision = typeof digits === "number" ? digits : 1;
    return Number(value).toFixed(precision) + "%";
  }

  function formatSignedMoney(value) {
    var numeric = Number(value);
    if (numeric === 0) {
      return "0";
    }
    return (numeric > 0 ? "+" : "-") + formatMoney(Math.abs(numeric));
  }

  function formatSignedNumber(value, digits) {
    var numeric = Number(value);
    var precision = typeof digits === "number" ? digits : 0;
    if (numeric === 0) {
      return Number(numeric).toFixed(precision);
    }
    return (numeric > 0 ? "+" : "") + Number(numeric).toFixed(precision);
  }

  function getRangeDays(range) {
    var start = parseDate(range.start);
    var end = parseDate(range.end);
    return Math.round((end - start) / 86400000) + 1;
  }

  function isRangeValid(range) {
    return Boolean(range.start && range.end && parseDate(range.end) >= parseDate(range.start));
  }

  function cloneRange(range) {
    return {
      start: range.start,
      end: range.end,
    };
  }

  function isSingleDatePicker(id) {
    return (
      id === "info-runtime" ||
      id === "info-detail-runtime" ||
      id === "maintenance-runtime" ||
      id === "reserve-runtime" ||
      id === "trade-result-runtime" ||
      id === "trade-node-runtime" ||
      id === "rolling-data-sx-curve-date" ||
      id === "rolling-data-sx-trade-date" ||
      id === "declaration-date" ||
      id === "day-ahead-load-prediction-date" ||
      id === "spot-price-prediction-date"
    );
  }

  function getPickerTargetRange(id) {
    if (id === "market-disclosure-range") {
      return getMarketDisclosureState().filterRange;
    }
    if (id === "info-runtime") {
      return state.ui.runtimeRange;
    }
    if (id === "info-detail-runtime") {
      return state.info.filters.loadDetailRange;
    }
    if (id === "sale-company-range") {
      return state.info.filters.saleCompanyRange;
    }
    if (id === "enterprise-range") {
      return state.info.filters.enterpriseRange;
    }
    if (id === "maintenance-runtime") {
      return state.info.filters.maintenanceRange;
    }
    if (id === "reserve-runtime") {
      return state.info.filters.reserveRange;
    }
    if (id === "trade-result-runtime") {
      return state.tradeResult.filters.marketRunRange;
    }
    if (id === "trade-node-runtime") {
      return state.tradeResult.filters.nodeRunRange;
    }
    if (id === "settlement-day-range") {
      return state.settlement.filters.dailyRange;
    }
    if (id === "rolling-data-range") {
      return state.rollingData.filters.dateRange;
    }
    if (id === "rolling-data-hn-range") {
      return state.rollingData.filters.hunanTradeDateRange;
    }
    if (id === "rolling-data-sx-curve-date") {
      return state.rollingData.filters.shaanxiCurveDate;
    }
    if (id === "rolling-data-sx-trade-date") {
      return state.rollingData.filters.shaanxiTradeDate;
    }
    if (id === "retail-cooperation-range") {
      return state.retailRelation.filters.cooperationRange;
    }
    if (id === "declaration-date") {
      return state.declaration.filters.declarationRange;
    }
    if (id === "fetch-monitor-range") {
      return state.fetchMonitor.filters.dateRange;
    }
    if (id === "spot-trading-simulation-range") {
      return state.spotTradingSimulation.filters.backtestRange;
    }
    if (id === "spot-mock-trading-range") {
      return state.spotMockTrading.filters.tradeRange;
    }
    if (id === "day-ahead-load-prediction-date") {
      return state.dayAheadLoadPrediction.filters.predictionDate;
    }
    if (id === "spot-price-prediction-date") {
      return state.spotPricePrediction.filters.predictionDate;
    }
    if (id === "compare-range") {
      return state.ui.compareRangeDraft;
    }
    if (id === "manual-pull-range") {
      return state.ui.manualPullRangeDraft;
    }
    if (id === "download-range") {
      return state.ui.downloadRangeDraft;
    }
    return { start: "", end: "" };
  }

  function setPickerTargetRange(id, range) {
    if (id === "market-disclosure-range") {
      getMarketDisclosureState().filterRange = cloneRange(range);
    } else if (id === "info-runtime") {
      state.ui.runtimeRange = cloneRange(range);
    } else if (id === "info-detail-runtime") {
      state.info.filters.loadDetailRange = cloneRange(range);
    } else if (id === "sale-company-range") {
      state.info.filters.saleCompanyRange = cloneRange(range);
    } else if (id === "enterprise-range") {
      state.info.filters.enterpriseRange = cloneRange(range);
    } else if (id === "maintenance-runtime") {
      state.info.filters.maintenanceRange = cloneRange(range);
    } else if (id === "reserve-runtime") {
      state.info.filters.reserveRange = cloneRange(range);
    } else if (id === "trade-result-runtime") {
      state.tradeResult.filters.marketRunRange = cloneRange(range);
    } else if (id === "trade-node-runtime") {
      state.tradeResult.filters.nodeRunRange = cloneRange(range);
    } else if (id === "settlement-day-range") {
      state.settlement.filters.dailyRange = cloneRange(range);
    } else if (id === "rolling-data-range") {
      state.rollingData.filters.dateRange = cloneRange(range);
    } else if (id === "rolling-data-hn-range") {
      state.rollingData.filters.hunanTradeDateRange = cloneRange(range);
    } else if (id === "rolling-data-sx-curve-date") {
      state.rollingData.filters.shaanxiCurveDate = cloneRange(range);
    } else if (id === "rolling-data-sx-trade-date") {
      state.rollingData.filters.shaanxiTradeDate = cloneRange(range);
    } else if (id === "retail-cooperation-range") {
      state.retailRelation.filters.cooperationRange = cloneRange(range);
    } else if (id === "declaration-date") {
      state.declaration.filters.declarationRange = cloneRange(range);
    } else if (id === "fetch-monitor-range") {
      state.fetchMonitor.filters.dateRange = cloneRange(range);
    } else if (id === "spot-trading-simulation-range") {
      state.spotTradingSimulation.filters.backtestRange = cloneRange(range);
    } else if (id === "spot-mock-trading-range") {
      state.spotMockTrading.filters.tradeRange = cloneRange(range);
    } else if (id === "day-ahead-load-prediction-date") {
      state.dayAheadLoadPrediction.filters.predictionDate = cloneRange(range);
    } else if (id === "spot-price-prediction-date") {
      state.spotPricePrediction.filters.predictionDate = cloneRange(range);
    } else if (id === "compare-range") {
      state.ui.compareRangeDraft = cloneRange(range);
    } else if (id === "manual-pull-range") {
      state.ui.manualPullRangeDraft = cloneRange(range);
    } else if (id === "download-range") {
      state.ui.downloadRangeDraft = cloneRange(range);
    }
  }

  function getPickerDisplayRange(id) {
    if (state.ui.datePickerDrafts && state.ui.datePickerDrafts[id]) {
      return state.ui.datePickerDrafts[id];
    }
    return getPickerTargetRange(id);
  }

  function openDatePicker(id) {
    state.ui.activeDatePickerId = id;
    state.ui.tradeCenterOpen = false;
    state.ui.datePickerDrafts = state.ui.datePickerDrafts || {};
    state.ui.datePickerDrafts[id] = cloneRange(getPickerTargetRange(id));
  }

  function closeDatePicker(id, keepDraft) {
    state.ui.activeDatePickerId = state.ui.activeDatePickerId === id ? null : state.ui.activeDatePickerId;
    if (!keepDraft && state.ui.datePickerDrafts) {
      delete state.ui.datePickerDrafts[id];
    }
  }

  function applyDatePicker(id) {
    if (state.ui.datePickerDrafts && state.ui.datePickerDrafts[id]) {
      setPickerTargetRange(id, state.ui.datePickerDrafts[id]);
    }
    closeDatePicker(id, false);
  }

  function updateDateDraft(id, key, value) {
    state.ui.datePickerDrafts = state.ui.datePickerDrafts || {};
    state.ui.datePickerDrafts[id] = state.ui.datePickerDrafts[id] || cloneRange(getPickerTargetRange(id));
    state.ui.datePickerDrafts[id][key] = value;
    if (
      (isSingleDatePicker(id) ||
        (id === "market-disclosure-range" && getUnifiedInfoDisclosureDatePickerMode(getInfoDisclosurePageData()) === "single")) &&
      key === "start"
    ) {
      state.ui.datePickerDrafts[id].end = value;
    }
  }

  function setFlashMessage(message, type) {
    state.ui.flashMessage = message;
    state.ui.flashType = type || "info";
    if (flashTimer) {
      global.clearTimeout(flashTimer);
    }
    flashTimer = global.setTimeout(function clearMessage() {
      state.ui.flashMessage = "";
      renderApp();
    }, 2400);
  }

  function flattenMetricIds(nodes, result) {
    nodes.forEach(function eachNode(node) {
      result.push(node.id);
      if (node.children) {
        flattenMetricIds(node.children, result);
      }
    });
  }

  function getFirstCheckedMetric() {
    var ids = [];
    flattenMetricIds(mock.metricTree, ids);
    for (var index = 0; index < ids.length; index += 1) {
      if (state.info.checkedMetrics.has(ids[index])) {
        return ids[index];
      }
    }
    return "hydro";
  }

  function toggleCheckedMetric(metricId) {
    var isChecked = state.info.checkedMetrics.has(metricId);
    if (isChecked) {
      if (state.info.checkedMetrics.size === 1) {
        return;
      }
      state.info.checkedMetrics.delete(metricId);
      if (state.info.selectedMetric === metricId) {
        state.info.selectedMetric = getFirstCheckedMetric();
      }
    } else {
      state.info.checkedMetrics.add(metricId);
      state.info.selectedMetric = metricId;
    }
    renderApp();
  }

  function toggleMetricBranch(metricId) {
    if (state.info.expandedMetrics.has(metricId)) {
      state.info.expandedMetrics.delete(metricId);
    } else {
      state.info.expandedMetrics.add(metricId);
    }
    renderApp();
  }

  function selectMetric(metricId) {
    state.info.selectedMetric = metricId;
    state.info.checkedMetrics.add(metricId);
    renderApp();
  }

  function getInfoMock() {
    return guangdongMock.infoDisclosure || {};
  }

  function getActiveInfoTab() {
    var primaryTab = getActiveInfoPrimaryTab();
    if (primaryTab === "负荷信息") {
      return getActiveInfoSecondaryTab();
    }
    return primaryTab;
  }

  function getActiveMetricSeries() {
    var infoMock = getInfoMock();
    var metricSeries = infoMock.metricSeries || mock.metricSeries || {};
    return metricSeries[state.info.selectedMetric] || metricSeries["dispatch-load"] || { forecast: [], actual: [] };
  }

  function buildCompareValues(values, pattern) {
    return values.map(function mapValue(value, index) {
      if (value === null || typeof value !== "number") {
        return null;
      }
      return value + pattern[index % pattern.length];
    });
  }

  function formatRangeLabel(range) {
    return formatDateCompact(range.start) + "至" + formatDateCompact(range.end);
  }

  function hasRangeOverlap(range, start, end) {
    if (!isRangeValid(range)) {
      return false;
    }
    return parseDate(range.end) >= parseDate(start) && parseDate(range.start) <= parseDate(end);
  }

  function filterRowsByDateRange(rows, range) {
    return (rows || []).filter(function filterRow(row) {
      return row.date >= range.start && row.date <= range.end;
    });
  }

  function includesKeyword(source, keyword) {
    if (!keyword) {
      return true;
    }
    return String(source || "").toLowerCase().indexOf(String(keyword).trim().toLowerCase()) >= 0;
  }

  function getCurrentInfoDateRange() {
    var activeTab = getActiveInfoTab();
    if (activeTab === "全省统一出清价" || activeTab === "出清电量" || activeTab === "交易结果") {
      return state.tradeResult.filters.marketRunRange;
    }
    if (activeTab === "节点电价") {
      return state.tradeResult.filters.nodeRunRange;
    }
    if (activeTab === "日前申报") {
      return state.declaration.filters.declarationRange;
    }
    if (activeTab === "负荷信息") {
      return state.ui.runtimeRange;
    }
    if (activeTab === "负荷详情") {
      return state.info.filters.loadDetailRange;
    }
    if (activeTab === "售电公司分时电量") {
      return state.info.filters.saleCompanyRange;
    }
    if (activeTab === "用电企业分时电量") {
      return state.info.filters.enterpriseRange;
    }
    if (activeTab === "机组检修容量") {
      return state.info.filters.maintenanceRange;
    }
    return state.info.filters.reserveRange;
  }

  function getRollingDataActiveRange() {
    if (state.ui.selectedTradeCenter === "湖南电力交易中心") {
      return state.rollingData.filters.hunanTradeDateRange;
    }
    if (state.ui.selectedTradeCenter === "陕西电力交易中心") {
      return state.rollingData.filters.shaanxiTradeDate;
    }
    return state.rollingData.filters.dateRange;
  }

  function getCurrentDownloadRange() {
    if (isInfoDisclosurePage(state.currentPageKey)) {
      if (isCurrentMarketDisclosureView()) {
        return getMarketDisclosureState().appliedRange;
      }
      return getCurrentInfoDateRange();
    }
    if (state.currentPageKey === "gd-trade-result") {
      return state.tradeResult.activeTab === "节点电价" ? state.tradeResult.filters.nodeRunRange : state.tradeResult.filters.marketRunRange;
    }
    if (state.currentPageKey === "gd-settlement") {
      if (state.settlement.activeTab === "月结算") {
        return {
          start: state.settlement.filters.monthlyMonth + "-01",
          end: state.settlement.filters.monthlyMonth + "-28",
        };
      }
      return state.settlement.filters.dailyRange;
    }
    if (state.currentPageKey === "rolling-data") {
      return getRollingDataActiveRange();
    }
    if (state.currentPageKey === "gd-retail-relation") {
      return state.retailRelation.filters.cooperationRange;
    }
    if (state.currentPageKey === "gd-day-ahead-declaration") {
      return state.declaration.filters.declarationRange;
    }
    if (state.currentPageKey === "fetch-monitor") {
      return state.fetchMonitor.filters.dateRange;
    }
    if (state.currentPageKey === "spot-trading-simulation") {
      return state.spotTradingSimulation.filters.backtestRange;
    }
    if (state.currentPageKey === "spot-mock-trading") {
      return state.spotMockTrading.filters.tradeRange;
    }
    if (state.currentPageKey === "day-ahead-load-prediction") {
      return state.dayAheadLoadPrediction.filters.predictionDate;
    }
    if (state.currentPageKey === "spot-price-prediction") {
      return state.spotPricePrediction.filters.predictionDate;
    }
    return state.ui.runtimeRange;
  }

  function getCurrentDownloadType() {
    if (isInfoDisclosurePage(state.currentPageKey)) {
      return getActiveInfoTab();
    }
    if (state.currentPageKey === "gd-trade-result") {
      return state.tradeResult.activeTab;
    }
    if (state.currentPageKey === "gd-settlement") {
      if (getSelectedTradeCenterKey() === "hunan" && state.settlement.activeTab === "日清算") {
        return "日清算-" + getHunanDailySelectedSettlementType();
      }
      if (getSelectedTradeCenterKey() === "shaanxi" && state.settlement.activeTab === "月结算") {
        return "月结算";
      }
      if (getSelectedTradeCenterKey() !== "guangdong" && state.settlement.activeTab === "月结算") {
        return "月结算-" + getSettlementActiveSecondaryTab();
      }
      return state.settlement.activeTab;
    }
    if (state.currentPageKey === "rolling-data") {
      return "滚搓数据";
    }
    if (state.currentPageKey === "gd-retail-relation") {
      return "零售关系";
    }
    if (state.currentPageKey === "gd-day-ahead-declaration") {
      return "日前申报";
    }
    if (state.currentPageKey === "fetch-monitor") {
      return "取数监控";
    }
    if (state.currentPageKey === "spot-trading-simulation") {
      return "现货交易仿真";
    }
    if (state.currentPageKey === "spot-mock-trading") {
      return "现货模拟交易";
    }
    if (state.currentPageKey === "day-ahead-load-prediction") {
      return "日前负荷预测";
    }
    if (state.currentPageKey === "spot-price-prediction") {
      return "价差及现货价格预测";
    }
    return registry.getPage(state.currentPageKey).title;
  }

  function getCurrentCompareBaseRange() {
    if (isInfoDisclosurePage(state.currentPageKey)) {
      if (isCurrentMarketDisclosureView()) {
        return getMarketDisclosureState().appliedRange;
      }
      return getCurrentInfoDateRange();
    }
    if (state.currentPageKey === "gd-trade-result") {
      return state.tradeResult.filters.marketRunRange;
    }
    if (state.currentPageKey === "rolling-data") {
      return getRollingDataActiveRange();
    }
    return state.ui.runtimeRange;
  }

  function syncCompareDraftToCurrentContext() {
    var baseRange = getCurrentCompareBaseRange();
    var compareStart = parseDate(baseRange.start);
    var compareEnd = parseDate(baseRange.end);
    var days = getRangeDays(baseRange);
    compareStart.setDate(compareStart.getDate() - days);
    compareEnd.setDate(compareEnd.getDate() - days);
    state.ui.compareRangeDraft = {
      start: formatDateValue(compareStart),
      end: formatDateValue(compareEnd),
    };
  }

  function syncDownloadRangeToCurrentPage() {
    state.ui.downloadRangeDraft = cloneRange(getCurrentDownloadRange());
  }

  function getLoadInfoChartSeries() {
    var series = getActiveMetricSeries();
    var chartSeries = [
      { id: "forecast", label: "当日预测", color: "#1677FF", values: series.forecast },
      { id: "actual", label: "当日实际", color: "#2FCB8F", values: series.actual },
    ];

    if (state.ui.hasCompare) {
      chartSeries.push({
        id: "compare-forecast",
        label: "对比日预测",
        color: "#FF7A45",
        values: buildCompareValues(series.forecast, [-420, -320, -180, -90, 24, 82]),
      });
      chartSeries.push({
        id: "compare-actual",
        label: "对比日实际",
        color: "#8C6A4A",
        values: buildCompareValues(series.actual, [-360, -260, -140, -60, 36, 96]),
      });
    }

    return chartSeries;
  }

  function getLoadInfoTooltip(label, index) {
    var series = getActiveMetricSeries();
    var forecast = series.forecast[index];
    var actual = series.actual[index];
    var tooltip = [
      "时刻: " + label,
      "当日预测: " + formatInteger(forecast) + " MW",
      "当日实际: " + formatInteger(actual) + " MW",
      "当日差值: " + formatDiff(actual - forecast) + " MW",
    ];

    if (state.ui.hasCompare) {
      var compareForecast = buildCompareValues(series.forecast, [-420, -320, -180, -90, 24, 82])[index];
      var compareActual = buildCompareValues(series.actual, [-360, -260, -140, -60, 36, 96])[index];
      tooltip.push("对比日预测: " + formatInteger(compareForecast) + " MW");
      tooltip.push("对比日实际: " + formatInteger(compareActual) + " MW");
      tooltip.push("对比日差值: " + formatDiff(compareActual - compareForecast) + " MW");
    }

    return tooltip.join("\n");
  }

  function getLoadInfoTable() {
    var series = getActiveMetricSeries();
    var compareForecast = buildCompareValues(series.forecast, [-420, -320, -180, -90, 24, 82]);
    var compareActual = buildCompareValues(series.actual, [-360, -260, -140, -60, 36, 96]);

    if (state.ui.hasCompare) {
      return {
        columns: ["时刻", "当日预测(MW)", "对比日预测(MW)", "当日实际(MW)", "对比日实际(MW)", "当日差值(MW)", "对比日差值(MW)"],
        rows: (getInfoMock().quarterHours || mock.quarterHours).map(function mapRow(time, index) {
          return [
            time,
            formatInteger(series.forecast[index]),
            formatInteger(compareForecast[index]),
            formatInteger(series.actual[index]),
            formatInteger(compareActual[index]),
            formatDiff(series.actual[index] - series.forecast[index]),
            formatDiff(compareActual[index] - compareForecast[index]),
          ];
        }),
        minWidth: 1160,
      };
    }

    return {
      columns: ["时刻", "预测(MW)", "实际(MW)", "差值(MW)"],
      rows: (getInfoMock().quarterHours || mock.quarterHours).map(function mapRow(time, index) {
        return [
          time,
          formatInteger(series.forecast[index]),
          formatInteger(series.actual[index]),
          formatDiff(series.actual[index] - series.forecast[index]),
        ];
      }),
      minWidth: 780,
    };
  }

  function getLoadDetailGroups() {
    return getInfoMock().loadDetailGroups || [];
  }

  function getLoadDetailSeries() {
    return getLoadDetailGroups().reduce(function flatten(result, group) {
      return result.concat(group.series || []);
    }, []);
  }

  function getLoadDetailTable() {
    var quarterLabels = getInfoMock().quarterHours || mock.quarterHours;
    var seriesById = {};
    getLoadDetailSeries().forEach(function eachSeries(series) {
      seriesById[series.id] = series.values;
    });

    return {
      columns: [
        "时刻",
        "统调预测(MW)",
        "统调实际(MW)",
        "A 类预测(MW)",
        "A 类实际(MW)",
        "B 类预测(MW)",
        "B 类实际(MW)",
        "地方预测(MW)",
        "地方实际(MW)",
        "港澳预测(MW)",
        "港澳实际(MW)",
        "西电预测(MW)",
        "西电实际(MW)",
      ],
      rows: quarterLabels.map(function mapRow(time, index) {
        return [
          time,
          formatInteger(seriesById["dispatch-forecast"][index]),
          formatInteger(seriesById["dispatch-actual"][index]),
          formatInteger(seriesById["province-a-forecast"][index]),
          formatInteger(seriesById["province-a-actual"][index]),
          formatInteger(seriesById["province-b-forecast"][index]),
          formatInteger(seriesById["province-b-actual"][index]),
          formatInteger(seriesById["local-power-forecast"][index]),
          formatInteger(seriesById["local-power-actual"][index]),
          formatInteger(seriesById["hk-link-forecast"][index]),
          formatInteger(seriesById["hk-link-actual"][index]),
          formatInteger(seriesById["west-east-forecast"][index]),
          formatInteger(seriesById["west-east-actual"][index]),
        ];
      }),
      minWidth: 1840,
    };
  }

  function getSaleCompanyRows() {
    var infoMock = getInfoMock();
    if (!hasRangeOverlap(state.info.filters.saleCompanyRange, infoMock.availableRangeStart, infoMock.availableRangeEnd)) {
      return [];
    }
    return filterRowsByDateRange(infoMock.saleCompanyRows || [], state.info.filters.saleCompanyRange);
  }

  function getSaleCompanyTable() {
    return {
      columns: ["日期"]
        .concat((getInfoMock().hours || mock.hours).slice())
        .concat(["合计电量(MWh)"]),
      rows: getSaleCompanyRows().map(function mapRow(row) {
        return [row.date].concat(row.hourlyValues.map(formatInteger)).concat([formatInteger(row.total)]);
      }),
      minWidth: 2240,
    };
  }

  function getEnterpriseRows() {
    var infoMock = getInfoMock();
    var filters = state.info.filters;
    var filteredRows = hasRangeOverlap(filters.enterpriseRange, infoMock.availableRangeStart, infoMock.availableRangeEnd)
      ? filterRowsByDateRange(infoMock.enterpriseRows || [], filters.enterpriseRange)
      : [];

    return filteredRows
      .filter(function filterRow(row) {
        return (
          includesKeyword(row.userCode, filters.enterpriseUserCode) &&
          includesKeyword(row.userName, filters.enterpriseUserName) &&
          includesKeyword(row.accountNo, filters.enterpriseAccountNo) &&
          includesKeyword(row.microgridName, filters.enterpriseMicrogridName) &&
          includesKeyword(row.microgridId, filters.enterpriseMicrogridId)
        );
      })
      .sort(function sortRows(a, b) {
        if (a.date === b.date) {
          return a.userCode > b.userCode ? 1 : -1;
        }
        return a.date > b.date ? -1 : 1;
      });
  }

  function getEnterpriseDailySeries(rows) {
    var grouped = {};
    rows.forEach(function eachRow(row) {
      grouped[row.date] = (grouped[row.date] || 0) + row.total;
    });

    return Object.keys(grouped)
      .sort()
      .map(function mapDate(date) {
        return { date: date, total: grouped[date] };
      });
  }

  function getEnterpriseTable() {
    return {
      columns: ["日期", "电力用户编码", "电力用户名称", "微电网名称", "微电网 ID", "户号", "计量点编号"]
        .concat((getInfoMock().hours || mock.hours).slice())
        .concat(["合计电量(MWh)"]),
      rows: getEnterpriseRows().map(function mapRow(row) {
        return [
          row.date,
          row.userCode,
          row.userName,
          row.microgridName,
          row.microgridId,
          row.accountNo,
          row.meterPointId,
        ]
          .concat(row.hourlyValues.map(formatInteger))
          .concat([formatInteger(row.total)]);
      }),
      minWidth: 2920,
    };
  }

  function getMaintenanceRows() {
    var infoMock = getInfoMock();
    return state.info.filters.maintenanceRange.start === infoMock.defaultRunDate ? infoMock.maintenanceRows || [] : [];
  }

  function getReserveRows() {
    var infoMock = getInfoMock();
    return state.info.filters.reserveRange.start === infoMock.defaultRunDate ? infoMock.reserveRows || [] : [];
  }

  function isInfoTabEmpty() {
    var activeTab = getActiveInfoTab();
    var infoMock = getInfoMock();
    if (activeTab === "负荷信息") {
      return state.ui.runtimeRange.start !== infoMock.defaultRunDate;
    }
    if (activeTab === "负荷详情") {
      return state.info.filters.loadDetailRange.start !== infoMock.defaultRunDate;
    }
    if (activeTab === "售电公司分时电量") {
      return !getSaleCompanyRows().length;
    }
    if (activeTab === "用电企业分时电量") {
      return !getEnterpriseRows().length;
    }
    if (activeTab === "机组检修容量") {
      return !getMaintenanceRows().length;
    }
    return !getReserveRows().length;
  }

  function getChartHiddenState(chartId) {
    return state.ui.chartHiddenSeries[chartId] || {};
  }

  function toggleChartLegend(chartId, seriesId) {
    var current = state.ui.chartHiddenSeries[chartId] || {};
    var next = {};
    Object.keys(current).forEach(function copyKey(key) {
      next[key] = current[key];
    });
    next[seriesId] = !next[seriesId];

    state.ui.chartHiddenSeries[chartId] = next;
  }

  function toggleChartLegendGroup(chartId, seriesIds) {
    var current = state.ui.chartHiddenSeries[chartId] || {};
    var next = {};
    var shouldHide = seriesIds.some(function someSeries(seriesId) {
      return !current[seriesId];
    });

    Object.keys(current).forEach(function copyKey(key) {
      next[key] = current[key];
    });

    seriesIds.forEach(function eachSeries(seriesId) {
      next[seriesId] = shouldHide;
    });

    state.ui.chartHiddenSeries[chartId] = next;
  }

  function getTableSortState(tableId) {
    return state.ui.tableSort[tableId] || { key: "", direction: "" };
  }

  function toggleTableSort(tableId, key) {
    var current = getTableSortState(tableId);
    var nextDirection = "asc";
    if (current.key === key && current.direction === "asc") {
      nextDirection = "desc";
    } else if (current.key === key && current.direction === "desc") {
      nextDirection = "";
    }
    state.ui.tableSort[tableId] = {
      key: nextDirection ? key : "",
      direction: nextDirection,
    };
  }

  function getTableColumnOrder(tableId) {
    state.ui.tableColumnOrder = state.ui.tableColumnOrder || {};
    return state.ui.tableColumnOrder[tableId] || [];
  }

  function moveTableColumn(tableId, sourceKey, targetKey) {
    if (!tableId || !sourceKey || !targetKey || sourceKey === targetKey) {
      return;
    }

    state.ui.tableColumnOrder = state.ui.tableColumnOrder || {};
    var order = getTableColumnOrder(tableId).slice();

    if (!order.length && global.document) {
      var tableElement = global.document.querySelector('table[data-table-id="' + tableId + '"]');
      if (tableElement) {
        order = Array.from(tableElement.querySelectorAll("th[data-column-drag-key]")).map(function mapHeader(cell) {
          return cell.getAttribute("data-column-drag-key");
        });
      }
    }

    if (!order.length) {
      return;
    }

    var sourceIndex = order.indexOf(sourceKey);
    var targetIndex = order.indexOf(targetKey);

    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      return;
    }

    order.splice(sourceIndex, 1);
    order.splice(targetIndex, 0, sourceKey);
    state.ui.tableColumnOrder[tableId] = order;
  }

  function parseInfoStatus(statusText) {
    var match = String(statusText || "").match(/^数据更新时间：(.+?)（(.+?)）$/);
    if (!match) {
      return {
        time: "2026-05-08 11:35:33",
        source: "取数工具",
      };
    }
    return {
      time: match[1],
      source: match[2],
    };
  }

  function getVisibleDownloadTasks() {
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DOWNLOAD_SUMMARY.retainDays);
    return state.downloadTasks
      .filter(function filterTask(task) {
        return new Date(task.createdAt.replace(" ", "T")) >= cutoff;
      })
      .sort(function sortTask(a, b) {
        return new Date(b.createdAt.replace(" ", "T")) - new Date(a.createdAt.replace(" ", "T"));
      })
      .slice(0, DOWNLOAD_SUMMARY.maxVisibleRecords);
  }

  function addDownloadTask() {
    var range = state.ui.downloadRangeDraft;
    var type = state.ui.downloadDataType || "负荷信息";
    var currentPage = registry.getPage(state.currentPageKey);
    state.downloadTasks.unshift({
      id: "dl-" + Date.now(),
      fileName:
        currentPage.title.replace(/\s+/g, "") +
        "_" +
        type +
        "_" +
        formatDateCompact(range.start) +
        "至" +
        formatDateCompact(range.end) +
        ".xls",
      createdAt: formatDateTime(new Date()),
      status: "排队中",
      source: state.ui.selectedTradeCenter,
    });
  }

  function renderNavItems() {
    return NAV_ITEMS.map(function mapItem(item) {
      var attrs = item.pageKey ? ' data-page-key="' + item.pageKey + '"' : "";
      return '<button class="nav-item ' + (item.active ? "active" : "") + '"' + attrs + '><span class="nav-item-inner"><span class="nav-item-label">' + escapeHtml(item.label) + "</span>" + (item.caret ? renderIcon("chevron-" + item.caret, "nav-caret") : "") + "</span></button>";
    }).join("");
  }

  function renderActionButton(label, variant, iconName, extraClass) {
    var className = variant === "primary" ? "primary-btn" : "ghost-btn";
    if (extraClass) {
      className += " " + extraClass;
    }

    return '<button class="' + className + '">' + renderIcon(iconName, "button-icon") + "<span>" + escapeHtml(label) + "</span></button>";
  }

  function renderTopNav() {
    return '<header class="topbar"><div class="brand"><img class="brand-logo" src="' + ASSETS.bossLogo + '" alt="BOSS 小桔能源超级入口" /></div><nav class="topnav" aria-label="主导航">' + renderNavItems() + '</nav><div class="topbar-tools"><label class="searchbox" for="site-search"><input id="site-search" type="text" placeholder="功能检索" aria-label="功能检索" />' + renderIcon("search", "search-icon-svg") + '</label><button class="toolbar-button logo-button" aria-label="能源入口"><img class="toolbar-logo-image" src="' + ASSETS.energyLogo + '" alt="能源入口" /></button><button class="avatar-button" aria-label="用户菜单">' + renderIcon("user", "avatar-icon") + "</button></div></header>";
  }

  function isPageActive(pageKey) {
    return state.currentPageKey === pageKey;
  }

  function hasActiveDescendant(item) {
    if (item.pageKey && isPageActive(item.pageKey)) {
      return true;
    }
    return Boolean((item.children || []).some(hasActiveDescendant));
  }

  function renderSidebar() {
    return '<aside class="sidebar"><div class="tenant-card"><div class="tenant-logo"><img class="tenant-logo-image" src="' + ASSETS.energyLogo + '" alt="小桔零碳 Logo" /><span>小桔零碳</span></div><div class="tenant-text">电力交易与储能智慧管理平台</div></div><nav class="sidebar-nav" aria-label="侧边菜单">' + renderSidebarTree(platformMenu.sidebarSections || [], 0) + '</nav><div class="sidebar-footer"><div class="profile-card"><img class="profile-avatar" src="' + ASSETS.userAvatar + '" alt="楼旸头像" /><div class="profile-info"><div class="profile-meta">产品负责人</div><div class="profile-name">楼旸</div></div><div class="profile-kpi"><div class="profile-meta">PV/UV</div><div class="profile-value">2459/43</div></div></div><div class="profile-extra"><span>应用评分 5</span><span class="stars">' + renderRatingStars(5) + '</span></div><div class="footer-links"><a href="#" class="footer-link-item">' + renderIcon("file-text", "footer-link-icon") + '<span>文档中心</span></a><a href="#" class="footer-link-item">' + renderIcon("message", "footer-link-icon") + '<span>官方DC群</span></a></div></div></aside>';
  }

  function renderSidebarTree(items, level) {
    return items.map(function mapItem(item) {
      var hasChildren = Array.isArray(item.children) && item.children.length > 0;
      var isActive = item.pageKey ? isPageActive(item.pageKey) : false;
      var activeDescendant = hasChildren && hasActiveDescendant(item);
      var isOpen = item.toggleKey ? state.sidebar[item.toggleKey] : false;
      var highlight = hasChildren ? isOpen || activeDescendant : false;
      var linkHtml = renderSideLink(item.label, {
        level: level,
        active: isActive,
        highlight: highlight,
        pageKey: item.pageKey,
        toggleKey: item.toggleKey,
        opened: isOpen,
      });

      if (!hasChildren || !isOpen) {
        return linkHtml;
      }

      var childClass = "subnav-group";
      if (level > 0) {
        childClass += " deeper-group";
      }
      return linkHtml + '<div class="' + childClass + '">' + renderSidebarTree(item.children, level + 1) + "</div>";
    }).join("");
  }

  function renderSideMarker(label, level) {
    if (level >= 2) {
      return '<span class="side-bullet"></span>';
    }
    return renderIcon(getMenuIconName(label), "side-menu-icon");
  }

  function renderSideLink(label, options) {
    var config = options || {};
    var classes = ["side-link"];
    if (config.level === 1) {
      classes.push("nested");
    } else if (config.level === 2) {
      classes.push("deeper");
    } else if (config.level >= 3) {
      classes.push("deepest");
    }
    if (config.highlight) {
      classes.push("section-open");
    }
    if (config.active) {
      classes.push("active-leaf");
    }

    var attrs = "";
    if (config.pageKey) {
      attrs += ' data-page-key="' + config.pageKey + '"';
    }
    if (config.toggleKey) {
      attrs += ' data-sidebar-toggle="' + config.toggleKey + '"';
    }

    var chevron = config.toggleKey ? renderIcon(config.opened ? "chevron-up" : "chevron-right", "side-chevron-icon") : "";

    return '<button class="' + classes.join(" ") + '"' + attrs + '><span class="side-icon-slot ' + (config.level >= 2 ? "deep bullet" : "") + '">' + renderSideMarker(label, config.level) + '</span><span class="side-link-text">' + escapeHtml(label) + "</span>" + (chevron ? '<span class="chevron-wrap">' + chevron + "</span>" : "") + "</button>";
  }

  function renderBusinessCenterPage() {
    var sections = (businessCenterMock.overviewSections || mock.overviewSections).map(function mapSection(section) {
      var groupsHtml = section.groups.map(function mapGroup(group) {
        var titleHtml = group.title ? '<div class="overview-subtitle">' + escapeHtml(group.title) + "</div>" : "";
        var itemsHtml = group.items.map(function mapItem(item) {
          var pageKeyAttr = item.pageKey ? ' data-page-key="' + item.pageKey + '"' : "";
          return '<button class="overview-card"' + pageKeyAttr + '><span class="overview-icon">' + renderIcon(getFeatureIconName(item.label), "overview-icon-svg") + '</span><span class="overview-label">' + escapeHtml(item.label) + "</span></button>";
        }).join("");
        return '<div class="overview-group">' + titleHtml + '<div class="overview-card-grid">' + itemsHtml + "</div></div>";
      }).join("");

      var sectionClass = "overview-panel";
      if (section.wide || section.groups.length > 1 || section.title === "售电业务") {
        sectionClass += " wide";
      }

      return '<section class="' + sectionClass + '"><div class="overview-section-title">' + escapeHtml(section.title) + "</div>" + groupsHtml + "</section>";
    }).join("");

    return '<div class="page-stack"><section class="page-header page-header-overview"><h1>业务中心</h1><div class="overview-header-tip">平台完整功能入口</div></section><section class="panel overview-shell"><div class="overview-panels">' + sections + "</div></section></div>";
  }

  function renderMetricTree(nodes, level) {
    return nodes.map(function mapNode(node) {
      var hasChildren = Array.isArray(node.children) && node.children.length > 0;
      var isExpanded = state.info.expandedMetrics.has(node.id);
      var isChecked = state.info.checkedMetrics.has(node.id);
      var isSelected = state.info.selectedMetric === node.id;
      var rowClasses = ["metric-row"];
      if (isSelected) {
        rowClasses.push("active");
      }
      if (level > 0) {
        rowClasses.push("metric-row-child");
      }

      return '<div class="metric-node level-' + level + '"><button class="' + rowClasses.join(" ") + '" data-metric-row="' + node.id + '">' + (hasChildren ? '<span class="tree-caret ' + (isExpanded ? "open" : "") + '" data-metric-toggle="' + node.id + '">' + renderIcon(isExpanded ? "chevron-down" : "chevron-right", "tree-caret-icon") + "</span>" : '<span class="tree-caret spacer"></span>') + '<span class="tree-checkbox ' + (isChecked ? "checked" : "") + '" data-metric-check="' + node.id + '"></span><span class="metric-text">' + escapeHtml(node.label) + "</span></button>" + (hasChildren && isExpanded ? renderMetricTree(node.children, level + 1) : "") + "</div>";
    }).join("");
  }

  function renderUiActionButton(label, variant, action) {
    return '<button class="' + (variant === "primary" ? "primary-btn" : "ghost-btn") + '" data-ui-action="' + escapeHtml(action) + '"><span>' + escapeHtml(label) + "</span></button>";
  }

  function renderInfoDatePicker(id, mode) {
    return renderStandardDatePicker({
      id: id,
      mode: mode,
      range: getPickerDisplayRange(id),
      isOpen: state.ui.activeDatePickerId === id,
      holidays: state.ui.holidays,
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function renderTextFilter(label, key, placeholder) {
    return (
      '<label class="info-filter-field info-filter-input-field"><span class="filter-label">' +
      escapeHtml(label) +
      "：</span>" +
      '<input class="filter-input" type="text" value="' +
      escapeHtml(state.info.filters[key] || "") +
      '" placeholder="' +
      escapeHtml(placeholder) +
      '" data-filter-field="' +
      escapeHtml(key) +
      '" /></label>'
    );
  }

  function renderBoundTextFilter(label, value, placeholder, fieldKey, scope, widthClass) {
    return (
      '<label class="info-filter-field info-filter-input-field ' +
      escapeHtml(widthClass || "") +
      '"><span class="filter-label">' +
      escapeHtml(label) +
      "：</span>" +
      '<input class="filter-input" type="text" value="' +
      escapeHtml(value || "") +
      '" placeholder="' +
      escapeHtml(placeholder) +
      '" data-filter-scope="' +
      escapeHtml(scope) +
      '" data-filter-key="' +
      escapeHtml(fieldKey) +
      '" /></label>'
    );
  }

  function renderBoundSelectFilter(label, value, options, fieldKey, scope, extraClass) {
    return (
      '<label class="info-filter-field"><span class="filter-label">' +
      escapeHtml(label) +
      "：</span>" +
      '<select class="select-native ' +
      escapeHtml(extraClass || "") +
      '" data-filter-scope="' +
      escapeHtml(scope) +
      '" data-filter-key="' +
      escapeHtml(fieldKey) +
      '">' +
      (options || [])
        .map(function mapOption(option) {
          return '<option value="' + escapeHtml(option) + '" ' + (option === value ? "selected" : "") + ">" + escapeHtml(option) + "</option>";
        })
        .join("") +
      "</select></label>"
    );
  }

  function renderMonthFilter(label, value, fieldKey, scope) {
    return (
      '<label class="info-filter-field"><span class="filter-label">' +
      escapeHtml(label) +
      "：</span>" +
      '<input class="filter-input filter-month-input" type="month" value="' +
      escapeHtml(value || "") +
      '" data-filter-scope="' +
      escapeHtml(scope) +
      '" data-filter-key="' +
      escapeHtml(fieldKey) +
      '" /></label>'
    );
  }

  function renderMarketPageHeader(title, tabsHtml) {
    return (
      '<div class="page-stack">' +
      '<section class="page-header"><h1>' +
      escapeHtml(title) +
      "</h1>" +
      renderTradeCenterSelector({
        selected: state.ui.selectedTradeCenter,
        options: TRADE_CENTER_OPTIONS,
        isOpen: state.ui.tradeCenterOpen,
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      }) +
      "</section>" +
      (tabsHtml
        ? '<section class="panel tabs-panel"><div class="panel-topline"><div class="primary-tabs">' + tabsHtml + "</div></div></section>"
        : "")
    );
  }

  function renderPageTabs(tabs, activeTab) {
    return (tabs || [])
      .map(function mapTab(tab) {
        return '<button class="primary-tab ' + (activeTab === tab ? "active" : "") + '" data-page-tab="' + escapeHtml(tab) + '">' + escapeHtml(tab) + "</button>";
      })
      .join("");
  }

  function renderSecondaryTabs(tabs, activeTab) {
    return (tabs || [])
      .map(function mapTab(tab) {
        return '<button class="secondary-tab ' + (activeTab === tab ? "active" : "") + '" data-secondary-tab="' + escapeHtml(tab) + '">' + escapeHtml(tab) + "</button>";
      })
      .join("");
  }

  function renderDownloadOnlyBar(status, withCompare) {
    var actions = [];
    if (withCompare) {
      actions.push({ label: "对比", variant: "ghost", icon: "compare", action: "open-compare" });
    }
    actions.push({ label: "下载", variant: "primary", icon: "download", action: "open-download" });

    return renderDataUpdateBar({
      updatedAt: status.time,
      source: status.source,
      hasCompare: withCompare && state.ui.hasCompare,
      showTaskEntry: true,
      actions: actions,
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function renderInfoFilterBar() {
    var activeTab = getActiveInfoTab();
    var fieldsHtml = "";
    var actionsHtml = "";

    if (activeTab === "负荷信息") {
      fieldsHtml =
        '<div class="info-filter-field"><span class="filter-label">运行日期：</span>' + renderInfoDatePicker("info-runtime", "single") + "</div>";
    } else if (activeTab === "负荷详情") {
      fieldsHtml =
        '<div class="info-filter-field"><span class="filter-label">运行日期：</span>' +
        renderInfoDatePicker("info-detail-runtime", "single") +
        "</div>";
    } else if (activeTab === "售电公司分时电量") {
      fieldsHtml =
        '<div class="info-filter-field"><span class="filter-label">用电日期：</span>' +
        renderInfoDatePicker("sale-company-range", "range") +
        "</div>";
      actionsHtml = renderUiActionButton("重置", "ghost", "reset-sale-company") + renderUiActionButton("查询", "primary", "query-sale-company");
    } else if (activeTab === "用电企业分时电量") {
      fieldsHtml =
        '<div class="info-filter-field"><span class="filter-label">用电日期：</span>' +
        renderInfoDatePicker("enterprise-range", "range") +
        "</div>" +
        renderTextFilter("电力用户编码", "enterpriseUserCode", "请输入电力用户编码") +
        renderTextFilter("电力用户名称", "enterpriseUserName", "请输入电力用户名称") +
        renderTextFilter("用户户号", "enterpriseAccountNo", "请输入用户户号") +
        renderTextFilter("微电网名称", "enterpriseMicrogridName", "请输入微电网名称") +
        renderTextFilter("微电网 ID", "enterpriseMicrogridId", "请输入微电网 ID");
      actionsHtml = renderUiActionButton("重置", "ghost", "reset-enterprise") + renderUiActionButton("查询", "primary", "query-enterprise");
    } else if (activeTab === "机组检修容量") {
      fieldsHtml =
        '<div class="info-filter-field"><span class="filter-label">运行日期：</span>' +
        renderInfoDatePicker("maintenance-runtime", "single") +
        "</div>";
    } else {
      fieldsHtml =
        '<div class="info-filter-field"><span class="filter-label">运行日期：</span>' + renderInfoDatePicker("reserve-runtime", "single") + "</div>";
    }

    return (
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      fieldsHtml +
      '</div><div class="info-filter-actions">' +
      actionsHtml +
      "</div></section>"
    );
  }

  function renderInfoDataUpdateBar(status) {
    var actions = [{ label: "更多", variant: "ghost", icon: "ellipsis", action: "open-manual-update" }];
    if (getActiveInfoTab() === "负荷信息") {
      actions.push({ label: "对比", variant: "ghost", icon: "compare", action: "open-compare" });
    }
    actions.push({ label: "下载", variant: "primary", icon: "download", action: "open-download" });

    return renderDataUpdateBar({
      updatedAt: status.time,
      source: status.source,
      hasCompare: getActiveInfoTab() === "负荷信息" && state.ui.hasCompare,
      showTaskEntry: true,
      actions: actions,
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function renderInfoEmptyPanel(withTree) {
    var emptyHtml = renderEmptyState({
      message: "当前日期暂无交易中心披露数据，请切换日期或手动更新数据",
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });

    if (withTree) {
      return (
        '<section class="panel chart-panel"><div class="chart-layout"><aside class="chart-tree"><div class="tree-header">指标列表</div>' +
        renderMetricTree(getInfoMock().metricTree || mock.metricTree, 0) +
        '</aside><div class="chart-main chart-main-empty">' +
        emptyHtml +
        "</div></div></section>"
      );
    }

    return '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain chart-main-empty">' + emptyHtml + "</div></section>";
  }

  function renderLoadInfoContent() {
    if (isInfoTabEmpty()) {
      return renderInfoEmptyPanel(true);
    }

    var table = getLoadInfoTable();
    var chartHtml = renderChartWithMarks({
      chartId: "info-main-chart",
      title: getActiveMetricSeries().label,
      labels: getInfoMock().quarterHours || mock.quarterHours,
      unit: "MW",
      series: getLoadInfoChartSeries(),
      hiddenSeries: getChartHiddenState("info-main-chart"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
      xLabelEvery: 4,
      tooltipFormatter: getLoadInfoTooltip,
    });
    var tableHtml = renderDataTablePro({
      tableId: "info-main-table",
      columns: table.columns,
      rows: table.rows,
      minWidth: table.minWidth,
      sortState: getTableSortState("info-main-table"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
    });

    return (
      '<section class="panel chart-panel"><div class="chart-layout"><aside class="chart-tree"><div class="tree-header">指标列表</div>' +
      renderMetricTree(getInfoMock().metricTree || mock.metricTree, 0) +
      '</aside><div class="chart-main">' +
      chartHtml +
      tableHtml +
      "</div></div></section>"
    );
  }

  function renderLoadDetailLegend() {
    var groups = getLoadDetailGroups();
    var hiddenState = getChartHiddenState("load-detail-chart");
    var groupButtons = groups
      .map(function mapGroup(group) {
        var seriesIds = (group.series || []).map(function mapSeries(series) {
          return series.id;
        });
        var muted = seriesIds.every(function everySeries(seriesId) {
          return hiddenState[seriesId];
        });

        return (
          '<button class="legend-group-toggle ' +
          (muted ? "muted" : "") +
          '" data-chart-id="load-detail-chart" data-chart-group="' +
          escapeHtml(seriesIds.join(",")) +
          '">' +
          escapeHtml(group.label) +
          "</button>"
        );
      })
      .join("");
    var seriesButtons = getLoadDetailSeries()
      .map(function mapSeries(series) {
        return (
          '<button class="legend-toggle ' +
          (hiddenState[series.id] ? "muted" : "") +
          '" data-chart-id="load-detail-chart" data-chart-legend="' +
          escapeHtml(series.id) +
          '">' +
          '<span class="legend-swatch" style="background:' +
          escapeHtml(series.color) +
          ';"></span>' +
          escapeHtml(series.label) +
          "</button>"
        );
      })
      .join("");

    return '<div class="detail-legend-stack"><div class="detail-legend-row">' + groupButtons + '</div><div class="detail-legend-row detail-legend-series-row">' + seriesButtons + "</div></div>";
  }

  function renderLoadDetailContent() {
    if (isInfoTabEmpty()) {
      return renderInfoEmptyPanel(false);
    }

    var table = getLoadDetailTable();
    var chartHtml = renderChartWithMarks({
      chartId: "load-detail-chart",
      title: "负荷详情",
      labels: getInfoMock().quarterHours || mock.quarterHours,
      unit: "MW",
      series: getLoadDetailSeries(),
      hiddenSeries: getChartHiddenState("load-detail-chart"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
      xLabelEvery: 4,
      hideLegend: true,
    });
    var tableHtml = renderDataTablePro({
      tableId: "load-detail-table",
      columns: table.columns,
      rows: table.rows,
      minWidth: table.minWidth,
      sortState: getTableSortState("load-detail-table"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
    });

    return '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' + renderLoadDetailLegend() + chartHtml + tableHtml + "</div></section>";
  }

  function renderSaleCompanyContent() {
    var rows = getSaleCompanyRows();
    var table = getSaleCompanyTable();

    if (!rows.length) {
      return renderInfoEmptyPanel(false);
    }

    var chartHtml = renderChartWithMarks({
      chartId: "sale-company-chart",
      title: "售电公司分时电量",
      labels: rows.map(function mapRow(row) {
        return row.date;
      }),
      unit: "MWh",
      series: [
        {
          id: "sale-company-total",
          label: "日总用电量",
          color: "#1677FF",
          values: rows.map(function mapRow(row) {
            return row.total;
          }),
        },
      ],
      hiddenSeries: getChartHiddenState("sale-company-chart"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
    });
    var tableHtml = renderDataTablePro({
      tableId: "sale-company-table",
      columns: table.columns,
      rows: table.rows,
      minWidth: table.minWidth,
      sortState: getTableSortState("sale-company-table"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
    });

    return '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' + chartHtml + tableHtml + "</div></section>";
  }

  function renderEnterpriseContent() {
    var rows = getEnterpriseRows();
    var table = getEnterpriseTable();
    var dailySeries = getEnterpriseDailySeries(rows);

    if (!rows.length) {
      return renderInfoEmptyPanel(false);
    }

    var chartHtml = renderChartWithMarks({
      chartId: "enterprise-chart",
      title: "用电企业分时电量",
      labels: dailySeries.map(function mapItem(item) {
        return item.date;
      }),
      unit: "MWh",
      series: [
        {
          id: "enterprise-total",
          label: "日总用电量",
          color: "#1677FF",
          values: dailySeries.map(function mapItem(item) {
            return item.total;
          }),
        },
      ],
      hiddenSeries: getChartHiddenState("enterprise-chart"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
    });
    var tableHtml = renderDataTablePro({
      tableId: "enterprise-table",
      columns: table.columns,
      rows: table.rows,
      minWidth: table.minWidth,
      sortState: getTableSortState("enterprise-table"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
    });

    return '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' + chartHtml + tableHtml + "</div></section>";
  }

  function renderMaintenanceContent() {
    var rows = getMaintenanceRows();

    if (!rows.length) {
      return renderInfoEmptyPanel(false);
    }

    var chartHtml = renderChartWithMarks({
      chartId: "maintenance-chart",
      title: "机组检修容量",
      labels: rows.map(function mapRow(row) {
        return row.time;
      }),
      unit: "MW",
      series: [
        {
          id: "maintenance-total",
          label: "机组检修容量",
          color: "#1677FF",
          values: rows.map(function mapRow(row) {
            return row.value;
          }),
        },
      ],
      hiddenSeries: getChartHiddenState("maintenance-chart"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
      xLabelEvery: 4,
    });
    var tableHtml = renderDataTablePro({
      tableId: "maintenance-table",
      columns: ["时刻", "机组检修容量(MW)", "数据来源", "更新时间"],
      rows: rows.map(function mapRow(row) {
        return [row.time, formatInteger(row.value), row.source, row.updatedAt];
      }),
      minWidth: 920,
      sortState: getTableSortState("maintenance-table"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
    });

    return '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' + chartHtml + tableHtml + "</div></section>";
  }

  function renderReserveContent() {
    var rows = getReserveRows();

    if (!rows.length) {
      return renderInfoEmptyPanel(false);
    }

    var chartHtml = renderChartWithMarks({
      chartId: "reserve-chart",
      title: "备用信息",
      labels: rows.map(function mapRow(row) {
        return row.time;
      }),
      unit: "MW",
      series: [
        { id: "reserve-forecast-positive", label: "预测正备用", color: "#1677FF", values: rows.map(function mapRow(row) { return row.forecastPositive; }) },
        { id: "reserve-forecast-negative", label: "预测负备用", color: "#8F65FF", values: rows.map(function mapRow(row) { return row.forecastNegative; }) },
        { id: "reserve-forecast-primary", label: "预测一次调频备用", color: "#FF9F1A", values: rows.map(function mapRow(row) { return row.forecastPrimary; }) },
        { id: "reserve-actual-positive", label: "实际正备用", color: "#2FCB8F", values: rows.map(function mapRow(row) { return row.actualPositive; }) },
        { id: "reserve-actual-negative", label: "实际负备用", color: "#F25B8A", values: rows.map(function mapRow(row) { return row.actualNegative; }) },
        { id: "reserve-actual-primary", label: "实际一次调频备用", color: "#5E6C84", values: rows.map(function mapRow(row) { return row.actualPrimary; }) },
      ],
      hiddenSeries: getChartHiddenState("reserve-chart"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
      xLabelEvery: 4,
    });
    var tableHtml = renderDataTablePro({
      tableId: "reserve-table",
      columns: [
        "时刻",
        "预测正备用(MW)",
        "预测负备用(MW)",
        "预测一次调频备用(MW)",
        "实际正备用(MW)",
        "实际负备用(MW)",
        "实际一次调频备用(MW)",
      ],
      rows: rows.map(function mapRow(row) {
        return [
          row.time,
          formatInteger(row.forecastPositive),
          formatInteger(row.forecastNegative),
          formatInteger(row.forecastPrimary),
          formatInteger(row.actualPositive),
          formatInteger(row.actualNegative),
          formatInteger(row.actualPrimary),
        ];
      }),
      minWidth: 1280,
      sortState: getTableSortState("reserve-table"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
    });

    return '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' + chartHtml + tableHtml + "</div></section>";
  }

  function isGuangdongInfoDisclosureCenter() {
    return getSelectedTradeCenterKey() === "guangdong";
  }

  function isInfoTradeTab(tab) {
    return tab === "全省统一出清价" || tab === "出清电量" || tab === "交易结果" || tab === "节点电价";
  }

  function renderInfoUnifiedDataUpdateBar(status, compareSupported) {
    var actions = [{ label: "更多", variant: "ghost", icon: "ellipsis", action: "open-manual-update" }];

    if (compareSupported) {
      actions.push({ label: "对比", variant: "ghost", icon: "compare", action: "open-compare" });
    }

    actions.push({ label: "下载", variant: "primary", icon: "download", action: "open-download" });

    return renderDataUpdateBar({
      updatedAt: status.time,
      source: status.source,
      hasCompare: compareSupported && state.ui.hasCompare,
      showTaskEntry: true,
      actions: actions,
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function renderInfoUnsupportedEmptyState(message) {
    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain chart-main-empty">' +
      renderEmptyState({
        message: message || INFO_DISCLOSURE_EMPTY_MESSAGE,
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      }) +
      "</div></section>"
    );
  }

  function renderInfoEmptyWithSidebar(sidebarHtml, message) {
    return (
      '<section class="panel chart-panel"><div class="chart-layout">' +
      sidebarHtml +
      '<div class="chart-main chart-main-empty">' +
      renderEmptyState({
        message: message || INFO_DISCLOSURE_EMPTY_MESSAGE,
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      }) +
      "</div></div></section>"
    );
  }

  function filterInfoDisclosurePageRows(rows, pageData, range) {
    var activeRange = range || getMarketDisclosureState().appliedRange;
    var filteredRows = (rows || []).slice();

    if (!isRangeValid(activeRange)) {
      return filteredRows;
    }

    filteredRows = filteredRows.filter(function filterRow(row) {
      var rowDate = row.date || row.runDate || row.planDate || row.operationDate || "";
      return !rowDate || (rowDate >= activeRange.start && rowDate <= activeRange.end);
    });

    return filteredRows.filter(function filterByField(row) {
      return (pageData && pageData.filterFields ? pageData.filterFields : []).every(function everyField(field) {
        if (!field || !field.fieldKey) {
          return true;
        }
        var selectedValue = getUnifiedInfoDisclosureFilterFieldValue(field);
        if (!selectedValue || selectedValue === "全部") {
          return true;
        }
        return String(row[field.rowKey || field.fieldKey] || "") === String(selectedValue);
      });
    });
  }

  function buildInfoDisclosureRowLabel(row, pageData) {
    var labelKey = (pageData && pageData.labelKey) || "time";
    var activeRange = getMarketDisclosureState().appliedRange;
    var labelValue = row[labelKey] || row.time || row.period || row.date || "";

    if (row.date && labelValue && isRangeValid(activeRange) && activeRange.start !== activeRange.end) {
      return row.date.slice(5) + " " + labelValue;
    }

    return labelValue || row.date || "";
  }

  function formatInfoDisclosureTableValue(column, value) {
    var title = column && column.title ? column.title : "";

    if (value === null || value === undefined || value === "") {
      return "--";
    }

    if (value && typeof value === "object") {
      if (Array.isArray(value.actions)) {
        return value;
      }

      var nextValue = {};
      Object.keys(value).forEach(function copyKey(key) {
        nextValue[key] = value[key];
      });
      if (nextValue.text !== undefined) {
        nextValue.text = formatInfoDisclosureTableValue(column, nextValue.text);
      }
      return nextValue;
    }

    if (typeof value === "number") {
      if (title.indexOf("元/MWh") >= 0 || Math.abs(value % 1) > 0.001) {
        return formatDecimal(value);
      }
      return formatInteger(value);
    }

    return String(value);
  }

  function buildInfoDisclosureTableConfig(columns, rows, minWidth) {
    var resolvedColumns = columns || [];
    return {
      columns: resolvedColumns.map(function mapColumn(column) {
        return {
          key: column.key,
          label: column.title,
          sortable: column.sortable !== false,
        };
      }),
      rows: (rows || []).map(function mapRow(row) {
        var result = {};
        resolvedColumns.forEach(function mapColumn(column) {
          var rawValue = row[column.key];
          var formattedValue = formatInfoDisclosureTableValue(column, rawValue);
          var title = column && column.title ? column.title : "";
          var isDiffColumn = title.indexOf("差值") >= 0 || title.indexOf("价差") >= 0;

          if (isDiffColumn && typeof rawValue === "number") {
            result[column.key] = createStyledCell(
              formattedValue,
              rawValue < 0 ? "table-negative" : rawValue > 0 ? "table-positive" : "",
              rawValue,
            );
            return;
          }

          result[column.key] = formattedValue;
        });
        return result;
      }),
      minWidth: minWidth || Math.max(920, resolvedColumns.length * 118),
    };
  }

  function renderInfoDisclosureDataTablePanel(title, tableId, tableConfig) {
    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
      (title ? '<div class="overview-section-title">' + escapeHtml(title) + "</div>" : "") +
      renderDataTablePro({
        tableId: tableId,
        columns: tableConfig.columns,
        rows: tableConfig.rows,
        minWidth: tableConfig.minWidth,
        sortState: getTableSortState(tableId),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></section>"
    );
  }

  function findInfoDisclosureSidebarItem(groups, itemId) {
    var groupIndex;
    var itemIndex;

    for (groupIndex = 0; groupIndex < (groups || []).length; groupIndex += 1) {
      for (itemIndex = 0; itemIndex < ((groups[groupIndex] && groups[groupIndex].items) || []).length; itemIndex += 1) {
        if (groups[groupIndex].items[itemIndex].id === itemId) {
          return groups[groupIndex].items[itemIndex];
        }
      }
    }

    return null;
  }

  function getInfoDisclosureSelectedSidebarItem(pageData) {
    var groups = pageData.sidebarGroups || [];
    var selectedItem = findInfoDisclosureSidebarItem(groups, state.info.selectedMetric);

    if (selectedItem) {
      return selectedItem;
    }

    if (pageData.defaultMetricId) {
      state.info.selectedMetric = pageData.defaultMetricId;
      return findInfoDisclosureSidebarItem(groups, pageData.defaultMetricId);
    }

    if (groups.length && groups[0].items && groups[0].items.length) {
      state.info.selectedMetric = groups[0].items[0].id;
      return groups[0].items[0];
    }

    return null;
  }

  function getInfoDisclosureSelectedNode(pageData) {
    var options = pageData.nodeOptions || [];
    var filterValue = state.tradeResult.filters.nodeKeyword;

    if (options.indexOf(filterValue) >= 0) {
      return filterValue;
    }

    if (options.indexOf(state.info.selectedMetric) >= 0) {
      return state.info.selectedMetric;
    }

    return pageData.defaultNode || options[0] || "";
  }

  function buildInfoDisclosureSeries(rows, seriesDefinitions) {
    return (seriesDefinitions || []).map(function mapSeries(series) {
      return {
        id: series.id,
        label: series.label,
        color: series.color,
        dasharray: series.dasharray || "",
        role: series.role || "",
        groupId: series.groupId || "",
        values: rows.map(function mapRow(row) {
          return row[series.valueKey];
        }),
      };
    });
  }

  function renderUnifiedInfoDisclosureFilterBar(pageData) {
    if (pageData && pageData.viewType === "nodePrice") {
      return (
        '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
        '<div class="info-filter-field"><span class="filter-label">运行日期：</span>' +
        renderInfoDatePicker("market-disclosure-range", "range") +
        "</div>" +
        renderBoundSelectFilter(
          "节点名称",
          getInfoDisclosureSelectedNode(pageData),
          pageData.nodeOptions || [],
          "nodeKeyword",
          "tradeResult",
          "filter-select-native",
        ) +
        '</div><div class="info-filter-actions">' +
        renderUiActionButton("重置", "ghost", "reset-market-disclosure") +
        renderUiActionButton("查询", "primary", "query-market-disclosure") +
        "</div></section>"
      );
    }

    var dateMode = getUnifiedInfoDisclosureDatePickerMode(pageData);
    var filterFieldsHtml = (pageData && pageData.filterFields ? pageData.filterFields : [])
      .map(function mapField(field) {
        if (!field) {
          return "";
        }
        if (field.type === "text") {
          return renderBoundTextFilter(
            field.label,
            getUnifiedInfoDisclosureFilterFieldValue(field),
            field.placeholder || "",
            field.fieldKey,
            "info",
            field.widthClass || "",
          );
        }
        return renderBoundSelectFilter(
          field.label,
          getUnifiedInfoDisclosureFilterFieldValue(field),
          field.options || [],
          field.fieldKey,
          "info",
          field.extraClass || "filter-select-native",
        );
      })
      .join("");

    return (
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      '<div class="info-filter-field"><span class="filter-label">' +
      escapeHtml((pageData && pageData.dateLabel) || (dateMode === "single" ? "运行日期" : "日期范围")) +
      "：</span>" +
      renderInfoDatePicker("market-disclosure-range", dateMode) +
      "</div>" +
      filterFieldsHtml +
      '</div><div class="info-filter-actions">' +
      renderUiActionButton("重置", "ghost", "reset-market-disclosure") +
      renderUiActionButton("查询", "primary", "query-market-disclosure") +
      "</div></section>"
    );
  }

  function getInfoDisclosureTreeChartId(pageData) {
    return "info-tree-chart-" + getSelectedTradeCenterKey() + "-" + (pageData && pageData.filters && pageData.filters.secondaryTab ? pageData.filters.secondaryTab : "load");
  }

  function getInfoDisclosureTreeHiddenState(chartId, pageData) {
    var current = getChartHiddenState(chartId);
    if (Object.keys(current).length) {
      return current;
    }

    var next = {};
    var defaultVisible = new Set((pageData && pageData.defaultVisibleSeriesIds) || []);
    (pageData.seriesDefinitions || []).forEach(function eachSeries(series) {
      next[series.id] = defaultVisible.size ? !defaultVisible.has(series.id) : false;
    });
    state.ui.chartHiddenSeries[chartId] = next;
    return next;
  }

  function getTreeNodeSeriesIds(node) {
    if (!node) {
      return [];
    }
    if (!node.children || !node.children.length) {
      return node.seriesId ? [node.seriesId] : [];
    }
    return node.children.reduce(function accumulate(result, child) {
      return result.concat(getTreeNodeSeriesIds(child));
    }, []);
  }

  function renderInfoDisclosureMetricTreeSidebar(pageData, chartId, hiddenState) {
    function renderNode(node, level) {
      var childNodes = node.children || [];
      var seriesIds = getTreeNodeSeriesIds(node);
      var visibleCount = seriesIds.filter(function filterSeries(seriesId) {
        return !hiddenState[seriesId];
      }).length;
      var isChecked = visibleCount > 0 && visibleCount === seriesIds.length;
      var isIndeterminate = visibleCount > 0 && visibleCount < seriesIds.length;
      var rowClassNames = ["metric-row"];
      if (level > 0) {
        rowClassNames.push("metric-row-child");
      }
      if (isChecked || isIndeterminate) {
        rowClassNames.push("active");
      }

      return (
        '<div class="metric-node level-' +
        level +
        '">' +
        '<button class="' +
        rowClassNames.join(" ") +
        '" ' +
        (childNodes.length
          ? 'data-info-tree-group="' + escapeHtml(seriesIds.join(",")) + '"'
          : 'data-info-tree-series="' + escapeHtml(node.seriesId) + '"') +
        ">" +
        '<span class="tree-caret spacer"></span>' +
        '<span class="tree-checkbox ' +
        (isChecked ? "checked" : isIndeterminate ? "indeterminate" : "") +
        '"></span><span class="metric-text">' +
        escapeHtml(node.label) +
        "</span></button>" +
        childNodes.map(function mapChild(child) {
          return renderNode(child, level + 1);
        }).join("") +
        "</div>"
      );
    }

    return (
      '<aside class="chart-tree"><div class="tree-header">指标列表</div>' +
      (pageData.metricTree || []).map(function mapNode(node) {
        return renderNode(node, 0);
      }).join("") +
      "</aside>"
    );
  }

  function buildInfoDisclosureTreeTooltip(label, index, seriesList, pageData) {
    var hiddenState = getInfoDisclosureTreeHiddenState(getInfoDisclosureTreeChartId(pageData), pageData);
    var seriesMap = {};
    seriesList.forEach(function eachSeries(series) {
      seriesMap[series.id] = series;
    });

    var lines = [label];
    (pageData.metricGroups || []).forEach(function eachGroup(group) {
      var forecastItems = [];
      var actualItems = [];
      var extraItems = [];
      (group.items || []).forEach(function eachItem(item) {
        if (hiddenState[item.id]) {
          return;
        }
        if (item.role === "forecast") {
          forecastItems.push(item);
        } else if (item.role === "actual") {
          actualItems.push(item);
        } else {
          extraItems.push(item);
        }
      });

      if (!forecastItems.length && !actualItems.length && !extraItems.length) {
        return;
      }

      var pairCount = Math.max(forecastItems.length, actualItems.length);
      for (var pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
        var forecastItem = forecastItems[pairIndex] || null;
        var actualItem = actualItems[pairIndex] || null;
        var forecastSeries = forecastItem ? seriesMap[forecastItem.id] : null;
        var actualSeries = actualItem ? seriesMap[actualItem.id] : null;
        var forecastValue = forecastSeries ? forecastSeries.values[index] : null;
        var actualValue = actualSeries ? actualSeries.values[index] : null;
        var detailLines = [];

        if (forecastItem) {
          detailLines.push(forecastItem.label + " " + (forecastValue === null || forecastValue === undefined ? "--" : formatInteger(forecastValue)));
        }
        if (actualItem) {
          detailLines.push(actualItem.label + " " + (actualValue === null || actualValue === undefined ? "--" : formatInteger(actualValue)));
        }
        if (forecastItem && actualItem && typeof forecastValue === "number" && typeof actualValue === "number") {
          detailLines.push("差值 " + formatSignedNumber(actualValue - forecastValue));
        }
        if (detailLines.length) {
          lines.push(group.label + " | " + detailLines.join(" | "));
        }
      }

      extraItems.forEach(function eachExtra(item) {
        var extraSeries = seriesMap[item.id];
        var extraValue = extraSeries ? extraSeries.values[index] : null;
        lines.push(group.label + " | " + item.label + " " + (extraValue === null || extraValue === undefined ? "--" : formatInteger(extraValue)));
      });
    });

    return lines.join("\n");
  }

  function renderInfoDisclosureMetricTreeContent(pageData) {
    var chartId = getInfoDisclosureTreeChartId(pageData);
    var hiddenState = getInfoDisclosureTreeHiddenState(chartId, pageData);
    var sidebarHtml = renderInfoDisclosureMetricTreeSidebar(pageData, chartId, hiddenState);
    var rows = filterInfoDisclosurePageRows(pageData.tableData || [], pageData);
    var tableConfig = buildInfoDisclosureTableConfig(pageData.tableColumns, rows, pageData.tableMinWidth);

    if (!rows.length) {
      return renderInfoEmptyWithSidebar(sidebarHtml, pageData.emptyText || INFO_DISCLOSURE_EMPTY_MESSAGE);
    }

    return (
      '<section class="panel chart-panel"><div class="chart-layout">' +
      sidebarHtml +
      '<div class="chart-main">' +
      renderChartWithMarks({
        chartId: chartId,
        title: pageData.chartTitle || pageData.title,
        labels: rows.map(function mapRow(row) {
          return buildInfoDisclosureRowLabel(row, pageData);
        }),
        unit: pageData.chartUnit || "",
        series: buildInfoDisclosureSeries(rows, pageData.seriesDefinitions),
        hiddenSeries: hiddenState,
        tooltipFormatter: function tooltipFormatter(label, index, seriesList) {
          return buildInfoDisclosureTreeTooltip(label, index, seriesList, pageData);
        },
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
        xLabelEvery: getDisclosureLabelEvery(rows.length),
      }) +
      renderDataTablePro({
        tableId: "info-tree-table-" + getSelectedTradeCenterKey() + "-" + (pageData.filters && pageData.filters.secondaryTab ? pageData.filters.secondaryTab : "load"),
        columns: tableConfig.columns,
        rows: tableConfig.rows,
        minWidth: tableConfig.minWidth,
        sortState: getTableSortState("info-tree-table-" + getSelectedTradeCenterKey() + "-" + (pageData.filters && pageData.filters.secondaryTab ? pageData.filters.secondaryTab : "load")),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></div></section>"
    );
  }

  function renderInfoDisclosureMetricCompareContent(pageData) {
    var selectedItem = getInfoDisclosureSelectedSidebarItem(pageData);
    var sidebarHtml = renderMarketLoadSidebar(pageData.sidebarGroups || [], selectedItem && selectedItem.id);
    var metricConfig = selectedItem && pageData.metrics ? pageData.metrics[selectedItem.id] : null;
    var rows = filterInfoDisclosurePageRows((metricConfig && metricConfig.rows) || pageData.tableData || [], pageData);
    var tableConfig = buildInfoDisclosureTableConfig(pageData.tableColumns, rows, pageData.tableMinWidth);

    if (!metricConfig || !rows.length) {
      return renderInfoEmptyWithSidebar(sidebarHtml, pageData.emptyText || INFO_DISCLOSURE_EMPTY_MESSAGE);
    }

    return (
      '<section class="panel chart-panel"><div class="chart-layout">' +
      sidebarHtml +
      '<div class="chart-main">' +
      renderChartWithMarks({
        chartId: "info-unified-metric-chart-" + getSelectedTradeCenterKey() + "-" + selectedItem.id,
        title: metricConfig.title || pageData.chartTitle || pageData.title,
        labels: rows.map(function mapRow(row) {
          return buildInfoDisclosureRowLabel(row, pageData);
        }),
        unit: metricConfig.unit || pageData.chartUnit || "",
        series: buildInfoDisclosureSeries(rows, metricConfig.seriesDefinitions || pageData.seriesDefinitions),
        hiddenSeries: getChartHiddenState("info-unified-metric-chart-" + getSelectedTradeCenterKey() + "-" + selectedItem.id),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
        xLabelEvery: getDisclosureLabelEvery(rows.length),
      }) +
      renderDataTablePro({
        tableId: "info-unified-metric-table-" + getSelectedTradeCenterKey() + "-" + selectedItem.id,
        columns: tableConfig.columns,
        rows: tableConfig.rows,
        minWidth: tableConfig.minWidth,
        sortState: getTableSortState("info-unified-metric-table-" + getSelectedTradeCenterKey() + "-" + selectedItem.id),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></div></section>"
    );
  }

  function renderInfoDisclosureNodePriceContent(pageData) {
    var selectedNode = getInfoDisclosureSelectedNode(pageData);
    var sidebarHtml = renderMarketLoadSidebar(pageData.sidebarGroups || [], selectedNode);
    var nodeData = pageData.nodeSeries && pageData.nodeSeries[selectedNode];
    var rows = filterInfoDisclosurePageRows((nodeData && nodeData.rows) || [], pageData);
    var tableConfig = buildInfoDisclosureTableConfig(pageData.tableColumns, rows, pageData.tableMinWidth);
    var dayAheadLabel = pageData.dayAheadSeriesLabel || "日前节点边际电价";
    var realTimeLabel = pageData.realTimeSeriesLabel || "实时节点边际电价";

    if (!nodeData || !rows.length) {
      return renderInfoEmptyWithSidebar(sidebarHtml, pageData.emptyText || INFO_DISCLOSURE_EMPTY_MESSAGE);
    }

    return (
      '<section class="panel chart-panel"><div class="chart-layout chart-layout-node">' +
      sidebarHtml +
      '<div class="chart-main">' +
      renderChartWithMarks({
        chartId: "info-unified-node-chart-" + getSelectedTradeCenterKey() + "-" + selectedNode,
        title: (pageData.chartTitle || pageData.title || "节点电价") + " - " + selectedNode,
        labels: rows.map(function mapRow(row) {
          return buildInfoDisclosureRowLabel(row, pageData);
        }),
        unit: pageData.chartUnit || "元/MWh",
        series: [
          { id: "info-node-dayahead-" + selectedNode, label: dayAheadLabel, color: "#1677FF", values: rows.map(function mapRow(row) { return row.dayAheadPrice; }) },
          { id: "info-node-realtime-" + selectedNode, label: realTimeLabel, color: "#2FCB8F", values: rows.map(function mapRow(row) { return row.realTimePrice; }) },
        ],
        hiddenSeries: getChartHiddenState("info-unified-node-chart-" + getSelectedTradeCenterKey() + "-" + selectedNode),
        tooltipFormatter: function nodeTooltip(_, index) {
          var row = rows[index] || {};
          return [
            row.date ? "日期 " + row.date : "",
            row.time ? "时刻 " + row.time : "",
            "节点名称 " + (row.nodeName || selectedNode),
            dayAheadLabel + " " + (typeof row.dayAheadPrice === "number" ? formatDecimal(row.dayAheadPrice) : "--"),
            realTimeLabel + " " + (typeof row.realTimePrice === "number" ? formatDecimal(row.realTimePrice) : "--"),
            typeof row.dayAheadPrice === "number" && typeof row.realTimePrice === "number"
              ? "价差 " + formatSignedNumber(row.realTimePrice - row.dayAheadPrice)
              : "价差 --",
          ]
            .filter(Boolean)
            .join("\n");
        },
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
        xLabelEvery: getDisclosureLabelEvery(rows.length),
      }) +
      renderDataTablePro({
        tableId: "info-unified-node-table-" + getSelectedTradeCenterKey(),
        columns: tableConfig.columns,
        rows: tableConfig.rows,
        minWidth: tableConfig.minWidth,
        sortState: getTableSortState("info-unified-node-table-" + getSelectedTradeCenterKey()),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></div></section>"
    );
  }

  function renderInfoDisclosureMixedTrendContent(pageData) {
    var rows = filterInfoDisclosurePageRows(pageData.tableData || [], pageData);
    var tableConfig = buildInfoDisclosureTableConfig(pageData.tableColumns, rows, pageData.tableMinWidth);

    if (!rows.length) {
      return renderInfoUnsupportedEmptyState(pageData.emptyText || INFO_DISCLOSURE_EMPTY_MESSAGE);
    }

    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
      renderMixedBarLineChart({
        chartId: "info-unified-mixed-chart-" + getSelectedTradeCenterKey() + "-" + getActiveInfoPrimaryTab(),
        labels: rows.map(function mapRow(row) {
          return buildInfoDisclosureRowLabel(row, pageData);
        }),
        barSeries: buildInfoDisclosureSeries(rows, pageData.barSeriesDefinitions),
        lineSeries: buildInfoDisclosureSeries(rows, pageData.lineSeriesDefinitions),
        hiddenSeries: getChartHiddenState("info-unified-mixed-chart-" + getSelectedTradeCenterKey() + "-" + getActiveInfoPrimaryTab()),
        leftUnit: pageData.leftUnit || "",
        rightUnit: pageData.rightUnit || "",
        tooltipFormatter:
          pageData.tooltipMode === "declarationBid"
            ? function declarationTooltip(_, index) {
                var row = rows[index] || {};
                return [
                  row.operationDate ? "运行日期 " + row.operationDate : "",
                  row.declarationPeriod ? "申报时段 " + row.declarationPeriod : "",
                  row.declarationType ? "申报类型 " + row.declarationType : "",
                  "申报电量 " + (typeof row.volumeValue === "number" ? formatDecimal(row.volumeValue) : "--"),
                  "申报价格 " + (typeof row.priceValue === "number" ? formatDecimal(row.priceValue) : "--"),
                ]
                  .filter(Boolean)
                  .join("\n");
              }
            : null,
        xLabelEvery: getDisclosureLabelEvery(rows.length),
      }) +
      renderDataTablePro({
        tableId: "info-unified-mixed-table-" + getSelectedTradeCenterKey() + "-" + getActiveInfoPrimaryTab(),
        columns: tableConfig.columns,
        rows: tableConfig.rows,
        minWidth: tableConfig.minWidth,
        sortState: getTableSortState("info-unified-mixed-table-" + getSelectedTradeCenterKey() + "-" + getActiveInfoPrimaryTab()),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></section>"
    );
  }

  function renderInfoDisclosureLineTableContent(pageData) {
    var rows = filterInfoDisclosurePageRows(pageData.tableData || [], pageData);
    var tableConfig = buildInfoDisclosureTableConfig(pageData.tableColumns, rows, pageData.tableMinWidth);

    if (!rows.length) {
      return renderInfoUnsupportedEmptyState(pageData.emptyText || INFO_DISCLOSURE_EMPTY_MESSAGE);
    }

    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
      renderChartWithMarks({
        chartId: "info-unified-line-chart-" + getSelectedTradeCenterKey() + "-" + getActiveInfoTab(),
        title: pageData.chartTitle || pageData.title,
        labels: rows.map(function mapRow(row) {
          return buildInfoDisclosureRowLabel(row, pageData);
        }),
        unit: pageData.chartUnit || "",
        series: buildInfoDisclosureSeries(rows, pageData.seriesDefinitions),
        hiddenSeries: getChartHiddenState("info-unified-line-chart-" + getSelectedTradeCenterKey() + "-" + getActiveInfoTab()),
        tooltipFormatter:
          pageData.tooltipMode === "reserveDual"
            ? function reserveTooltip(label, index, seriesList) {
                var positiveSeries = seriesList.find(function findSeries(series) {
                  return series.id.indexOf("positive") >= 0;
                }) || null;
                var negativeSeries = seriesList.find(function findSeries(series) {
                  return series.id.indexOf("negative") >= 0;
                }) || null;
                var positiveValue = positiveSeries ? positiveSeries.values[index] : null;
                var negativeValue = negativeSeries ? negativeSeries.values[index] : null;
                var lines = [
                  label,
                  (positiveSeries ? positiveSeries.label : "正备用") + " " + (positiveValue === null || positiveValue === undefined ? "--" : formatInteger(positiveValue)),
                  (negativeSeries ? negativeSeries.label : "负备用") + " " + (negativeValue === null || negativeValue === undefined ? "--" : formatInteger(negativeValue)),
                ];
                if (typeof positiveValue === "number" && typeof negativeValue === "number") {
                  lines.push("差值 " + formatSignedNumber(positiveValue - negativeValue));
                }
                return lines.join("\n");
              }
            : pageData.tooltipMode === "priceSpread"
              ? function priceSpreadTooltip(_, index) {
                  var row = rows[index] || {};
                  var dayAheadLabel = pageData.dayAheadSeriesLabel || "日前价格";
                  var realTimeLabel = pageData.realTimeSeriesLabel || "实时价格";
                  return [
                    row.date ? "日期 " + row.date : "",
                    row.time ? "时刻 " + row.time : "",
                    dayAheadLabel + " " + (typeof row.dayAheadPrice === "number" ? formatDecimal(row.dayAheadPrice) : "--"),
                    realTimeLabel + " " + (typeof row.realTimePrice === "number" ? formatDecimal(row.realTimePrice) : "--"),
                    typeof row.dayAheadPrice === "number" && typeof row.realTimePrice === "number"
                      ? "价差 " + formatSignedNumber(row.realTimePrice - row.dayAheadPrice)
                      : "价差 --",
                  ]
                    .filter(Boolean)
                    .join("\n");
                }
            : null,
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
        xLabelEvery: getDisclosureLabelEvery(rows.length),
      }) +
      renderDataTablePro({
        tableId: "info-unified-line-table-" + getSelectedTradeCenterKey() + "-" + getActiveInfoTab(),
        columns: tableConfig.columns,
        rows: tableConfig.rows,
        minWidth: tableConfig.minWidth,
        sortState: getTableSortState("info-unified-line-table-" + getSelectedTradeCenterKey() + "-" + getActiveInfoTab()),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></section>"
    );
  }

  function renderInfoDisclosureProfileTableContent(pageData) {
    var modeKey = getInfoDisclosureProfileMode(pageData);
    var modeConfig = pageData.profileModes && pageData.profileModes[modeKey];
    var rows = filterInfoDisclosurePageRows(pageData.tableData || [], pageData);
    var compareRows = state.ui.hasCompare ? filterInfoDisclosurePageRows(pageData.tableData || [], pageData, state.ui.compareRangeDraft) : [];
    var tableConfig = buildInfoDisclosureTableConfig(pageData.tableColumns, rows, pageData.tableMinWidth);

    if (!modeConfig || !rows.length) {
      return renderInfoUnsupportedEmptyState(pageData.emptyText || INFO_DISCLOSURE_EMPTY_MESSAGE);
    }

    var latestRow = rows[rows.length - 1];
    var series = [
      {
        id: "info-profile-latest-" + getSelectedTradeCenterKey() + "-" + getActiveInfoPrimaryTab() + "-" + modeKey,
        label: modeConfig.latestLabel || "所选周期最新日电量",
        color: "#1677FF",
        values: latestRow[modeConfig.valueKey] || [],
      },
      {
        id: "info-profile-average-" + getSelectedTradeCenterKey() + "-" + getActiveInfoPrimaryTab() + "-" + modeKey,
        label: modeConfig.averageLabel || "所选周期均值电量",
        color: "#2FCB8F",
        values: averageRowsByField(rows, modeConfig.valueKey),
      },
    ];

    if (compareRows.length) {
      var latestCompareRow = compareRows[compareRows.length - 1];
      series.push({
        id: "info-profile-compare-latest-" + getSelectedTradeCenterKey() + "-" + getActiveInfoPrimaryTab() + "-" + modeKey,
        label: modeConfig.compareLatestLabel || "对比周期最新日电量",
        color: "#FF7A45",
        values: latestCompareRow[modeConfig.valueKey] || [],
      });
      series.push({
        id: "info-profile-compare-average-" + getSelectedTradeCenterKey() + "-" + getActiveInfoPrimaryTab() + "-" + modeKey,
        label: modeConfig.compareAverageLabel || "对比周期均值电量",
        color: "#8C6A4A",
        values: averageRowsByField(compareRows, modeConfig.valueKey),
      });
    }

    var modeKeys = Object.keys(pageData.profileModes || {});
    var modeSwitchHtml =
      modeKeys.length > 1
        ? '<div class="chart-legend chart-legend-buttoned">' +
          modeKeys
            .map(function mapMode(profileModeKey) {
              var profileMode = pageData.profileModes[profileModeKey];
              return (
                '<button class="legend-toggle ' +
                (profileModeKey === modeKey ? "" : "muted") +
                '" data-info-profile-mode="' +
                escapeHtml(profileModeKey) +
                '">' +
                escapeHtml((profileMode && profileMode.label) || profileModeKey) +
                "</button>"
              );
            })
            .join("") +
          "</div>"
        : "";

    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
      modeSwitchHtml +
      renderChartWithMarks({
        chartId: "info-profile-chart-" + getSelectedTradeCenterKey() + "-" + getActiveInfoPrimaryTab() + "-" + modeKey,
        title: pageData.chartTitle || pageData.title,
        labels: modeConfig.labels || [],
        unit: modeConfig.unit || pageData.chartUnit || "",
        series: series,
        hiddenSeries: getChartHiddenState("info-profile-chart-" + getSelectedTradeCenterKey() + "-" + getActiveInfoPrimaryTab() + "-" + modeKey),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
        xLabelEvery: getDisclosureLabelEvery((modeConfig.labels || []).length || 1),
      }) +
      renderDataTablePro({
        tableId: "info-profile-table-" + getSelectedTradeCenterKey() + "-" + getActiveInfoPrimaryTab(),
        columns: tableConfig.columns,
        rows: tableConfig.rows,
        minWidth: tableConfig.minWidth,
        sortState: getTableSortState("info-profile-table-" + getSelectedTradeCenterKey() + "-" + getActiveInfoPrimaryTab()),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></section>"
    );
  }

  function renderInfoDisclosureMaintenanceCompositeContent(pageData) {
    var unitTable = pageData.unitStatusTable || {};
    var unitRows = filterInfoDisclosurePageRows(unitTable.data || [], pageData);
    var maintenanceChart = pageData.maintenanceChart || {};
    var hasChart = Boolean((maintenanceChart.series || []).length && (maintenanceChart.labels || []).length);
    var extraTablesHtml = (pageData.extraTables || [])
      .map(function mapTable(table, index) {
        var tableRows = filterInfoDisclosurePageRows(table.data || [], pageData);
        if (!tableRows.length) {
          return "";
        }
        return renderInfoDisclosureDataTablePanel(
          table.title,
          "info-unified-extra-table-" + getSelectedTradeCenterKey() + "-" + index,
          buildInfoDisclosureTableConfig(table.columns, tableRows, table.minWidth),
        );
      })
      .join("");

    if (!unitRows.length && !extraTablesHtml) {
      return renderInfoUnsupportedEmptyState(pageData.emptyText || INFO_DISCLOSURE_EMPTY_MESSAGE);
    }

    return (
      (hasChart
        ? renderDisclosureChartPanel({
            chartId: "info-unified-maintenance-chart-" + getSelectedTradeCenterKey(),
            title: maintenanceChart.title || pageData.title,
            labels: maintenanceChart.labels || [],
            unit: maintenanceChart.unit || "",
            series: maintenanceChart.series || [],
            xLabelEvery: getDisclosureLabelEvery((maintenanceChart.labels || []).length || 1),
          })
        : "") +
      (unitRows.length
        ? renderInfoDisclosureDataTablePanel(
            unitTable.title,
            "info-unified-maintenance-table-" + getSelectedTradeCenterKey(),
            buildInfoDisclosureTableConfig(unitTable.columns, unitRows, unitTable.minWidth),
          )
        : "") +
      extraTablesHtml
    );
  }

  function renderUnifiedInfoDisclosureContent(pageData) {
    if (!pageData || !pageData.viewType || pageData.viewType === "empty") {
      return renderInfoUnsupportedEmptyState((pageData && pageData.emptyText) || INFO_DISCLOSURE_EMPTY_MESSAGE);
    }

    if (pageData.viewType === "metricTreeCompare") {
      return renderInfoDisclosureMetricTreeContent(pageData);
    }
    if (pageData.viewType === "metricCompare") {
      return renderInfoDisclosureMetricCompareContent(pageData);
    }
    if (pageData.viewType === "nodePrice") {
      return renderInfoDisclosureNodePriceContent(pageData);
    }
    if (pageData.viewType === "mixedTrendTable") {
      return renderInfoDisclosureMixedTrendContent(pageData);
    }
    if (pageData.viewType === "lineTable") {
      return renderInfoDisclosureLineTableContent(pageData);
    }
    if (pageData.viewType === "profileTable") {
      return renderInfoDisclosureProfileTableContent(pageData);
    }
    if (pageData.viewType === "maintenanceComposite") {
      return renderInfoDisclosureMaintenanceCompositeContent(pageData);
    }

    return renderInfoUnsupportedEmptyState(pageData.emptyText || INFO_DISCLOSURE_EMPTY_MESSAGE);
  }

  function renderTradeResultFilterBarByTab(activeTab) {
    var fieldsHtml = "";

    if (activeTab === "节点电价") {
      fieldsHtml =
        '<div class="info-filter-field"><span class="filter-label">运行日期：</span>' +
        renderInfoDatePicker("trade-node-runtime", "single") +
        "</div>" +
        renderBoundTextFilter("节点搜索", state.tradeResult.filters.nodeKeyword, "请输入节点名称", "nodeKeyword", "tradeResult", "filter-input-wide");
    } else {
      fieldsHtml =
        '<div class="info-filter-field"><span class="filter-label">运行日期：</span>' +
        renderInfoDatePicker("trade-result-runtime", "single") +
        "</div>";
    }

    return '<section class="panel info-filter-panel"><div class="info-filter-fields">' + fieldsHtml + '</div><div class="info-filter-actions"></div></section>';
  }

  function renderDeclarationFilterBar() {
    var declarationMock = getDeclarationMock();
    return (
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      '<div class="info-filter-field"><span class="filter-label">申报日期：</span>' +
      renderInfoDatePicker("declaration-date", "single") +
      "</div>" +
      renderBoundSelectFilter("交易单元", state.declaration.filters.unit, declarationMock.unitOptions || [], "unit", "declaration", "filter-select-native") +
      renderBoundSelectFilter("申报状态", state.declaration.filters.status, declarationMock.statusOptions || [], "status", "declaration", "filter-select-native") +
      '</div><div class="info-filter-actions">' +
      renderUiActionButton("重置", "ghost", "reset-declaration") +
      renderUiActionButton("查询", "primary", "query-declaration") +
      "</div></section>"
    );
  }

  function getMarketModuleByName(moduleName) {
    if (!moduleName) {
      return null;
    }
    var pageMock = getMarketDisclosureMock();
    var module = pageMock.modules && pageMock.modules[moduleName];
    if (!module) {
      return null;
    }
    var clonedModule = {};
    Object.keys(module).forEach(function copyKey(key) {
      clonedModule[key] = module[key];
    });
    clonedModule.infoDisclosureKey = moduleName;
    return clonedModule;
  }

  function getMarketLoadMetricGroups() {
    var marketMappings = infoDisclosureConfig.marketMappings || {};
    var loadMetrics = marketMappings.loadMetrics || {};
    return loadMetrics[getSelectedTradeCenterKey()] || [];
  }

  function findMarketLoadMetricById(metricId) {
    var groups = getMarketLoadMetricGroups();
    for (var groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      for (var itemIndex = 0; itemIndex < (groups[groupIndex].items || []).length; itemIndex += 1) {
        if (groups[groupIndex].items[itemIndex].id === metricId) {
          return groups[groupIndex].items[itemIndex];
        }
      }
    }
    return null;
  }

  function getMarketLoadSelectedMetric() {
    var metric = findMarketLoadMetricById(state.info.selectedMetric);
    if (metric) {
      return metric;
    }
    var groups = getMarketLoadMetricGroups();
    if (groups.length && groups[0].items && groups[0].items.length) {
      state.info.selectedMetric = groups[0].items[0].id;
      return groups[0].items[0];
    }
    return null;
  }

  function buildMergedMarketLoadRows(forecastRows, actualRows) {
    var merged = {};

    (forecastRows || []).forEach(function eachRow(row) {
      var key = row.date + " " + row.time;
      merged[key] = merged[key] || { date: row.date, time: row.time, forecastRow: null, actualRow: null };
      merged[key].forecastRow = row;
    });

    (actualRows || []).forEach(function eachRow(row) {
      var key = row.date + " " + row.time;
      merged[key] = merged[key] || { date: row.date, time: row.time, forecastRow: null, actualRow: null };
      merged[key].actualRow = row;
    });

    return Object.keys(merged)
      .sort()
      .map(function mapKey(key) {
        return merged[key];
      });
  }

  function formatMarketLoadSource(mergedRow) {
    var sources = [];
    if (mergedRow.forecastRow && mergedRow.forecastRow.source) {
      sources.push(mergedRow.forecastRow.source);
    }
    if (mergedRow.actualRow && mergedRow.actualRow.source && sources.indexOf(mergedRow.actualRow.source) < 0) {
      sources.push(mergedRow.actualRow.source);
    }
    return sources.join(" / ") || "--";
  }

  function formatMarketLoadUpdatedAt(mergedRow) {
    var updatedAtValues = [];
    if (mergedRow.forecastRow && mergedRow.forecastRow.updatedAt) {
      updatedAtValues.push(mergedRow.forecastRow.updatedAt);
    }
    if (mergedRow.actualRow && mergedRow.actualRow.updatedAt) {
      updatedAtValues.push(mergedRow.actualRow.updatedAt);
    }
    return updatedAtValues.sort().slice(-1)[0] || "--";
  }

  function renderMarketLoadSidebar(groups, selectedMetricId) {
    return (
      '<aside class="chart-tree"><div class="tree-header">指标列表</div>' +
      (groups || [])
        .map(function mapGroup(group) {
          return (
            '<div class="market-metric-group"><div class="market-metric-group-title">' +
            escapeHtml(group.label) +
            "</div>" +
            (group.items || [])
              .map(function mapItem(item) {
                var isActive = item.id === selectedMetricId;
                return (
                  '<button class="metric-row metric-row-child ' +
                  (isActive ? "active" : "") +
                  '" data-info-metric="' +
                  escapeHtml(item.id) +
                  '">' +
                  '<span class="tree-caret spacer"></span>' +
                  '<span class="tree-checkbox ' +
                  (isActive ? "checked" : "") +
                  '"></span><span class="metric-text">' +
                  escapeHtml(item.label) +
                  "</span></button>"
                );
              })
              .join("") +
            "</div>"
          );
        })
        .join("") +
      "</aside>"
    );
  }

  function buildMarketLoadCompareSeries(module, labels, seriesId, label, color) {
    var compareRows = module ? getMarketDisclosureCompareRows(module) : [];
    if (!compareRows.length) {
      return null;
    }

    return {
      id: seriesId,
      label: label,
      color: color,
      values: normalizeSeriesLength(
        compareRows.map(function mapRow(row) {
          return row.value;
        }),
        labels.length,
      ),
    };
  }

  function renderMarketLoadContent() {
    var groups = getMarketLoadMetricGroups();
    var metric = getMarketLoadSelectedMetric();
    var sidebarHtml = renderMarketLoadSidebar(groups, metric && metric.id);

    if (!metric) {
      return renderInfoEmptyWithSidebar(sidebarHtml, INFO_DISCLOSURE_EMPTY_MESSAGE);
    }

    var forecastModule = getMarketModuleByName(metric.forecastModule);
    var actualModule = getMarketModuleByName(metric.actualModule);
    var forecastRows = forecastModule ? getMarketDisclosureAppliedRows(forecastModule) : [];
    var actualRows = actualModule ? getMarketDisclosureAppliedRows(actualModule) : [];
    var mergedRows = buildMergedMarketLoadRows(forecastRows, actualRows);

    if (!mergedRows.length) {
      return renderInfoEmptyWithSidebar(
        sidebarHtml,
        (getMarketDisclosureMock().emptyExample && getMarketDisclosureMock().emptyExample.message) || INFO_DISCLOSURE_EMPTY_MESSAGE,
      );
    }

    var labels = buildDisclosureLabels(mergedRows);
    var chartSeries = [];

    if (forecastRows.length) {
      chartSeries.push({
        id: metric.id + "-forecast",
        label: metric.forecastModule,
        color: "#1677FF",
        values: mergedRows.map(function mapRow(row) {
          return row.forecastRow ? row.forecastRow.value : null;
        }),
      });
    }

    if (actualRows.length) {
      chartSeries.push({
        id: metric.id + "-actual",
        label: metric.actualModule,
        color: "#2FCB8F",
        values: mergedRows.map(function mapRow(row) {
          return row.actualRow ? row.actualRow.value : null;
        }),
      });
    }

    if (state.ui.hasCompare) {
      var compareForecastSeries = buildMarketLoadCompareSeries(forecastModule, labels, metric.id + "-forecast-compare", "对比预测", "#FF7A45");
      var compareActualSeries = buildMarketLoadCompareSeries(actualModule, labels, metric.id + "-actual-compare", "对比实际", "#8C6A4A");
      if (compareForecastSeries) {
        chartSeries.push(compareForecastSeries);
      }
      if (compareActualSeries) {
        chartSeries.push(compareActualSeries);
      }
    }

    return (
      '<section class="panel chart-panel"><div class="chart-layout">' +
      sidebarHtml +
      '<div class="chart-main">' +
      renderChartWithMarks({
        chartId: "market-load-chart-" + getSelectedTradeCenterKey() + "-" + metric.id,
        title: metric.dataType || metric.label,
        labels: labels,
        unit: "MW",
        series: chartSeries,
        hiddenSeries: getChartHiddenState("market-load-chart-" + getSelectedTradeCenterKey() + "-" + metric.id),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
        xLabelEvery: getDisclosureLabelEvery(labels.length),
      }) +
      renderDataTablePro({
        tableId: "market-load-table-" + getSelectedTradeCenterKey(),
        columns: ["时刻", "预测值（MW）", "实际值（MW）", "差值（MW）", "数据类型", "数据来源", "更新时间"],
        rows: mergedRows.map(function mapRow(row, index) {
          var forecastValue = row.forecastRow ? row.forecastRow.value : null;
          var actualValue = row.actualRow ? row.actualRow.value : null;
          var label = labels[index];
          return [
            label,
            formatDisclosureValue(forecastValue, "MW"),
            formatDisclosureValue(actualValue, "MW"),
            typeof forecastValue === "number" && typeof actualValue === "number" ? formatDisclosureValue(actualValue - forecastValue, "MW") : "--",
            metric.dataType || metric.label,
            formatMarketLoadSource(row),
            formatMarketLoadUpdatedAt(row),
          ];
        }),
        minWidth: 1240,
        sortState: getTableSortState("market-load-table-" + getSelectedTradeCenterKey()),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></div></section>"
    );
  }

  function isInfoDisclosureCompareSupported() {
    if (isCurrentMarketDisclosureView()) {
      var pageData = getInfoDisclosurePageData();
      return Boolean(pageData.viewType && pageData.viewType !== "empty");
    }

    var activeTab = getActiveInfoTab();
    return activeTab === "负荷信息" || activeTab === "全省统一出清价" || activeTab === "出清电量" || activeTab === "交易结果";
  }

  function getInfoDisclosureStatus() {
    if (!isGuangdongInfoDisclosureCenter()) {
      var pageData = getInfoDisclosurePageData();
      return {
        time: pageData.updateTime || getMarketDisclosureState().lastUpdatedAt || getMarketDisclosureMock().dataUpdatedAt || "2026-05-09 10:00:00",
        source: pageData.dataSource || getMarketDisclosureMock().dataSource || "交易中心披露",
      };
    }

    var activePrimaryTab = getActiveInfoPrimaryTab();
    var activeTab = getActiveInfoTab();

    if (isInfoTradeTab(activeTab)) {
      return parseInfoStatus(getTradeResultMock().statusText);
    }
    if (activeTab === "日前申报") {
      return parseInfoStatus(getDeclarationMock().statusText);
    }
    return parseInfoStatus(getInfoMock().statusText);
  }

  function renderInfoDisclosureFilterBar() {
    if (!isGuangdongInfoDisclosureCenter()) {
      return renderUnifiedInfoDisclosureFilterBar(getInfoDisclosurePageData());
    }
    var activePrimaryTab = getActiveInfoPrimaryTab();
    var activeTab = getActiveInfoTab();
    if (isInfoTradeTab(activeTab)) {
      return renderTradeResultFilterBarByTab(activeTab);
    }
    if (activePrimaryTab === "日前申报") {
      return renderDeclarationFilterBar();
    }
    return renderInfoFilterBar();
  }

  function renderInfoTradePriceContent() {
    if (state.tradeResult.filters.marketRunRange.start !== getTradeResultMock().defaultRunDate) {
      return renderInfoUnsupportedEmptyState("当前日期暂无交易中心披露数据，请切换日期或手动更新数据");
    }

    var rows = getTradeResultRows();
    var dayAhead = rows.map(function mapRow(row) {
      return row.dayaheadPrice;
    });
    var realTime = rows.map(function mapRow(row) {
      return row.realtimePrice;
    });
    var chartSeries = [
      { id: "info-trade-price-dayahead", label: "日前全省统一出清价", color: "#1677FF", values: dayAhead },
      { id: "info-trade-price-realtime", label: "实时全省统一出清价", color: "#2FCB8F", values: realTime },
    ];

    if (state.ui.hasCompare) {
      chartSeries.push({
        id: "info-trade-price-dayahead-compare",
        label: "对比日前",
        color: "#FF7A45",
        values: getTradeResultCompareSeries(dayAhead, [-18.6, -12.4, -6.2, 4.8, 8.2, 12.4]),
      });
      chartSeries.push({
        id: "info-trade-price-realtime-compare",
        label: "对比实时",
        color: "#8C6A4A",
        values: getTradeResultCompareSeries(realTime, [-16.4, -10.8, -4.8, 5.2, 9.6, 13.8]),
      });
    }

    return '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' + renderChartWithMarks({
      chartId: "info-trade-price-chart",
      title: "全省统一出清价",
      labels: rows.map(function mapRow(row) {
        return row.time;
      }),
      unit: "元/MWh",
      series: chartSeries,
      hiddenSeries: getChartHiddenState("info-trade-price-chart"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
      xLabelEvery: 2,
    }) + renderDataTablePro({
      tableId: "info-trade-price-table",
      columns: ["时刻", "日前全省统一出清价（元/MWh）", "实时全省统一出清价（元/MWh）", "差值（元/MWh）"],
      rows: rows.map(function mapRow(row) {
        return [
          row.time,
          formatDecimal(row.dayaheadPrice),
          formatDecimal(row.realtimePrice),
          formatDecimal(row.realtimePrice - row.dayaheadPrice),
        ];
      }),
      minWidth: 980,
      sortState: getTableSortState("info-trade-price-table"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
    }) + "</div></section>";
  }

  function renderInfoTradeVolumeContent() {
    if (state.tradeResult.filters.marketRunRange.start !== getTradeResultMock().defaultRunDate) {
      return renderInfoUnsupportedEmptyState("当前日期暂无交易中心披露数据，请切换日期或手动更新数据");
    }

    var rows = getTradeResultRows();
    var dayAhead = rows.map(function mapRow(row) {
      return row.dayaheadVolume;
    });
    var realTime = rows.map(function mapRow(row) {
      return row.realtimeVolume;
    });
    var chartSeries = [
      { id: "info-trade-volume-dayahead", label: "日前出清电量", color: "#1677FF", values: dayAhead },
      { id: "info-trade-volume-realtime", label: "实时出清电量", color: "#2FCB8F", values: realTime },
    ];

    if (state.ui.hasCompare) {
      chartSeries.push({
        id: "info-trade-volume-dayahead-compare",
        label: "对比日前",
        color: "#FF7A45",
        values: getTradeResultCompareSeries(dayAhead, [-620, -420, -260, 140, 220, 310]),
      });
      chartSeries.push({
        id: "info-trade-volume-realtime-compare",
        label: "对比实时",
        color: "#8C6A4A",
        values: getTradeResultCompareSeries(realTime, [-520, -360, -180, 120, 180, 260]),
      });
    }

    return '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' + renderChartWithMarks({
      chartId: "info-trade-volume-chart",
      title: "出清电量",
      labels: rows.map(function mapRow(row) {
        return row.time;
      }),
      unit: "MWh",
      series: chartSeries,
      hiddenSeries: getChartHiddenState("info-trade-volume-chart"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
      xLabelEvery: 2,
    }) + renderDataTablePro({
      tableId: "info-trade-volume-table",
      columns: ["时刻", "日前出清电量（MWh）", "实时出清电量（MWh）", "差值（MWh）"],
      rows: rows.map(function mapRow(row) {
        return [
          row.time,
          formatInteger(row.dayaheadVolume),
          formatInteger(row.realtimeVolume),
          formatInteger(row.realtimeVolume - row.dayaheadVolume),
        ];
      }),
      minWidth: 980,
      sortState: getTableSortState("info-trade-volume-table"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
    }) + "</div></section>";
  }

  function renderInfoTradeResultContent() {
    if (state.tradeResult.filters.marketRunRange.start !== getTradeResultMock().defaultRunDate) {
      return renderInfoUnsupportedEmptyState("当前日期暂无交易中心披露数据，请切换日期或手动更新数据");
    }

    var mixedTable = getTradeResultMixedTable();
    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
      getTradeResultMixedChart() +
      renderDataTablePro({
        tableId: "trade-result-mixed-table",
        columns: mixedTable.columns,
        rows: mixedTable.rows,
        minWidth: mixedTable.minWidth,
        sortState: getTableSortState("trade-result-mixed-table"),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></section>"
    );
  }

  function renderInfoTradeNodeContent() {
    if (state.tradeResult.filters.nodeRunRange.start !== getTradeResultMock().defaultRunDate) {
      return renderInfoUnsupportedEmptyState("当前日期暂无交易中心披露数据，请切换日期或手动更新数据");
    }

    var nodeTable = getTradeNodePriceTable();
    return (
      '<section class="panel chart-panel"><div class="chart-layout chart-layout-node">' +
      renderTradeNodeSidebar() +
      '<div class="chart-main">' +
      renderChartWithMarks({
        chartId: "trade-node-price-chart",
        title: getSelectedTradeNode(),
        labels: getInfoMock().quarterHours || mock.quarterHours,
        unit: "元/MWh",
        series: [
          { id: "trade-node-dayahead", label: "日前节点电价", color: "#1677FF", values: getTradeNodePriceSeries().dayAhead },
          { id: "trade-node-realtime", label: "实时节点电价", color: "#2FCB8F", values: getTradeNodePriceSeries().realTime },
        ],
        hiddenSeries: getChartHiddenState("trade-node-price-chart"),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
        xLabelEvery: 4,
      }) +
      renderDataTablePro({
        tableId: "trade-node-price-table",
        columns: nodeTable.columns,
        rows: nodeTable.rows,
        minWidth: nodeTable.minWidth,
        sortState: getTableSortState("trade-node-price-table"),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></div></section>"
    );
  }

  function getDeclarationSummaryRows() {
    var summary = {};
    getDeclarationRows().forEach(function eachRow(row) {
      var key = row.declarationDate + " " + row.time;
      summary[key] = summary[key] || {
        label: state.declaration.filters.declarationRange.start === state.declaration.filters.declarationRange.end ? row.time : row.declarationDate.slice(5) + " " + row.time,
        volume: 0,
        totalPrice: 0,
        count: 0,
      };
      summary[key].volume += Number(row.volume || 0);
      summary[key].totalPrice += Number(row.price || 0);
      summary[key].count += 1;
    });

    return Object.keys(summary)
      .sort()
      .map(function mapKey(key) {
        return {
          label: summary[key].label,
          volume: summary[key].volume,
          averagePrice: summary[key].count ? Number((summary[key].totalPrice / summary[key].count).toFixed(1)) : 0,
        };
      });
  }

  function renderInfoDeclarationContent() {
    var rows = getDeclarationRows();

    if (!rows.length) {
      return renderInfoUnsupportedEmptyState("当前日期暂无交易中心披露数据，请切换日期或手动更新数据");
    }

    var summaryRows = getDeclarationSummaryRows();
    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
      renderMixedBarLineChart({
        chartId: "info-declaration-chart",
        labels: summaryRows.map(function mapRow(row) {
          return row.label;
        }),
        barSeries: [
          {
            id: "info-declaration-volume",
            label: "申报电量",
            color: "#9DC4FF",
            values: summaryRows.map(function mapRow(row) {
              return row.volume;
            }),
          },
        ],
        lineSeries: [
          {
            id: "info-declaration-price",
            label: "申报均价",
            color: "#FF7A45",
            values: summaryRows.map(function mapRow(row) {
              return row.averagePrice;
            }),
          },
        ],
        hiddenSeries: getChartHiddenState("info-declaration-chart"),
        leftUnit: "MWh",
        rightUnit: "元/MWh",
        xLabelEvery: summaryRows.length > 24 ? 8 : 2,
      }) +
      renderDataTablePro({
        tableId: "declaration-table",
        columns: getDeclarationTable().columns,
        rows: getDeclarationTable().rows,
        minWidth: getDeclarationTable().minWidth,
        sortState: getTableSortState("declaration-table"),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></section>"
    );
  }

  function renderMarketMappedPriceContent() {
    var moduleName =
      infoDisclosureConfig.marketMappings &&
      infoDisclosureConfig.marketMappings.price &&
      infoDisclosureConfig.marketMappings.price[getSelectedTradeCenterKey()];
    var module = getMarketModuleByName(moduleName);
    if (!module || !module.type) {
      return renderInfoUnsupportedEmptyState();
    }
    return renderMarketDisclosureDualPrice(
      module,
      getSelectedTradeCenterKey() === "shaanxi" ? "用户侧加权电价对比" : "用户侧统一结算价格对比",
    );
  }

  function renderMarketMappedSaleCompanyContent() {
    var moduleName =
      infoDisclosureConfig.marketMappings &&
      infoDisclosureConfig.marketMappings.saleCompany &&
      infoDisclosureConfig.marketMappings.saleCompany[getSelectedTradeCenterKey()];
    var module = getMarketModuleByName(moduleName);
    if (!module || !module.type) {
      return renderInfoUnsupportedEmptyState();
    }
    if (module.type === "load-profile-96") {
      return renderMarketDisclosureLoad96(module);
    }
    return renderMarketDisclosureLoad24(module);
  }

  function renderInfoDisclosureContent() {
    var activeTab = getActiveInfoTab();

    if (!isGuangdongInfoDisclosureCenter()) {
      return renderUnifiedInfoDisclosureContent(getInfoDisclosurePageData());
    }

    if (activeTab === "负荷信息") {
      return renderLoadInfoContent();
    }
    if (activeTab === "负荷详情") {
      return renderLoadDetailContent();
    }
    if (activeTab === "机组检修容量") {
      return renderMaintenanceContent();
    }
    if (activeTab === "备用信息") {
      return renderReserveContent();
    }
    if (activeTab === "全省统一出清价") {
      return renderInfoTradePriceContent();
    }
    if (activeTab === "出清电量") {
      return renderInfoTradeVolumeContent();
    }
    if (activeTab === "交易结果") {
      return renderInfoTradeResultContent();
    }
    if (activeTab === "售电公司分时电量") {
      return renderSaleCompanyContent();
    }
    if (activeTab === "用电企业分时电量") {
      return renderEnterpriseContent();
    }
    if (activeTab === "节点电价") {
      return renderInfoTradeNodeContent();
    }
    if (activeTab === "日前申报") {
      return renderInfoDeclarationContent();
    }
    return renderInfoUnsupportedEmptyState();
  }

  function renderInfoDisclosurePage() {
    var pageMeta = getInfoDisclosureTradeCenterMeta();
    var pageData = getInfoDisclosurePageData();
    syncUnifiedInfoDisclosureRange(pageData);
    var activePrimaryTab = getActiveInfoPrimaryTab();
    var primaryTabsHtml = INFO_DISCLOSURE_PRIMARY_TABS.map(function mapTab(tab) {
      return '<button class="primary-tab ' + (activePrimaryTab === tab ? "active" : "") + '" data-primary-tab="' + escapeHtml(tab) + '">' + escapeHtml(tab) + "</button>";
    }).join("");
    var secondaryTabsHtml =
      activePrimaryTab === "负荷信息"
        ? '<div class="secondary-tabs">' + renderSecondaryTabs(INFO_DISCLOSURE_SECONDARY_TABS, getActiveInfoSecondaryTab()) + "</div>"
        : "";

    return (
      '<div class="page-stack">' +
      '<section class="page-header page-header-market-disclosure"><div class="page-title-block"><h1>' +
      escapeHtml(pageMeta.title) +
      '</h1><div class="page-description">' +
      escapeHtml(pageMeta.description) +
      "</div></div>" +
      renderTradeCenterSelector({
        selected: state.ui.selectedTradeCenter,
        options: TRADE_CENTER_OPTIONS,
        isOpen: state.ui.tradeCenterOpen,
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      }) +
      "</section>" +
      '<section class="panel tabs-panel"><div class="panel-topline"><div class="primary-tabs">' +
      primaryTabsHtml +
      "</div></div>" +
      secondaryTabsHtml +
      "</section>" +
      renderInfoDisclosureFilterBar() +
      renderInfoUnifiedDataUpdateBar(getInfoDisclosureStatus(), isInfoDisclosureCompareSupported()) +
      renderInfoDisclosureContent() +
      "</div>"
    );
  }

  function isSameRange(a, b) {
    return Boolean(a && b && a.start === b.start && a.end === b.end);
  }

  function getMarketDisclosureActiveTab() {
    var pageMock = getMarketDisclosureMock();
    return getMarketDisclosureState().activeTab || (pageMock.tabs && pageMock.tabs[0]) || "";
  }

  function getMarketDisclosureModule() {
    var pageMock = getMarketDisclosureMock();
    return (pageMock.modules && pageMock.modules[getMarketDisclosureActiveTab()]) || {};
  }

  function formatDisclosureValue(value, unit) {
    if (value === null || value === undefined || value === "") {
      return "--";
    }
    return unit === "元/MWh" ? formatDecimal(value) : formatInteger(value);
  }

  function buildDisclosureLabels(rows, range) {
    var activeRange = range || getMarketDisclosureState().appliedRange;
    return (rows || []).map(function mapRow(row) {
      if (activeRange.start === activeRange.end) {
        return row.time;
      }
      return row.date.slice(5) + " " + row.time;
    });
  }

  function normalizeSeriesLength(values, length) {
    return Array.from({ length: length }, function createValue(_, index) {
      return typeof values[index] === "number" ? values[index] : null;
    });
  }

  function averageRowsByField(rows, fieldKey) {
    if (!(rows || []).length) {
      return [];
    }

    return rows[0][fieldKey].map(function mapSlot(_, index) {
      var total = rows.reduce(function accumulate(sum, row) {
        return sum + Number(row[fieldKey][index] || 0);
      }, 0);
      return Number((total / rows.length).toFixed(1));
    });
  }

  function getMarketDisclosureAppliedRows(module) {
    return filterRowsByDateRange(module.tableRows || [], getMarketDisclosureState().appliedRange);
  }

  function getMarketDisclosureCompareRows(module) {
    if (!state.ui.hasCompare) {
      return [];
    }
    return filterRowsByDateRange(module.tableRows || [], state.ui.compareRangeDraft);
  }

  function getMarketDisclosureScenario() {
    var pageMock = getMarketDisclosureMock();
    if (isSameRange(getMarketDisclosureState().appliedRange, pageMock.errorExample && pageMock.errorExample.range)) {
      return {
        type: "error",
        title: "异常状态示例",
        message: pageMock.errorExample.message,
        source: pageMock.errorExample.source,
        updatedAt: pageMock.errorExample.updatedAt,
      };
    }
    return {
      type: "default",
    };
  }

  function getMarketDisclosureStatus(module) {
    var pageMock = getMarketDisclosureMock();
    var viewState = getMarketDisclosureState();
    var disclosureModule = module || {};
    return {
      time: viewState.lastUpdatedAt || disclosureModule.updatedAt || pageMock.dataUpdatedAt || "2026-05-09 10:00:00",
      source: disclosureModule.source || pageMock.dataSource || "交易中心披露",
    };
  }

  function getDisclosureLabelEvery(length) {
    if (length > 120) {
      return 12;
    }
    if (length > 72) {
      return 8;
    }
    if (length > 48) {
      return 6;
    }
    if (length > 24) {
      return 4;
    }
    return 2;
  }

  function getMarketDisclosureChartId(baseId, moduleKey) {
    var tabs = getMarketDisclosureMock().tabs || [];
    var activeKey = moduleKey || getMarketDisclosureActiveTab();
    return baseId + "-" + getActiveTradeCenterDataPageKey() + "-" + activeKey + "-" + tabs.indexOf(activeKey);
  }

  function renderMarketDisclosureFilterBar() {
    return (
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      '<div class="info-filter-field"><span class="filter-label">日期范围：</span>' +
      renderInfoDatePicker("market-disclosure-range", "range") +
      '</div></div><div class="info-filter-actions">' +
      renderUiActionButton("重置", "ghost", "reset-market-disclosure") +
      renderUiActionButton("查询", "primary", "query-market-disclosure") +
      "</div></section>"
    );
  }

  function renderMarketDisclosureDataUpdateBar(status) {
    return renderDataUpdateBar({
      updatedAt: status.time,
      source: status.source,
      hasCompare: state.ui.hasCompare,
      showTaskEntry: true,
      actions: [
        { label: "更多", variant: "ghost", icon: "ellipsis", action: "open-manual-update" },
        { label: "对比", variant: "ghost", icon: "compare", action: "open-compare" },
        { label: "下载", variant: "primary", icon: "download", action: "open-download" },
      ],
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function renderMarketDisclosureAlert(scenario) {
    if (!scenario || scenario.type !== "error") {
      return "";
    }

    return (
      '<section class="panel disclosure-alert-panel">' +
      '<div class="disclosure-alert-icon">' +
      renderIcon("alert", "notification-alert-icon") +
      '</div><div class="disclosure-alert-copy"><div class="disclosure-alert-title">' +
      escapeHtml(scenario.title) +
      '</div><div class="disclosure-alert-text">' +
      escapeHtml(scenario.message) +
      '</div><div class="disclosure-alert-meta">' +
      escapeHtml((scenario.source || "") + (scenario.updatedAt ? " | " + scenario.updatedAt : "")) +
      "</div></div></section>"
    );
  }

  function renderDisclosureChartPanel(options) {
    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
      renderChartWithMarks({
        chartId: options.chartId,
        title: options.title,
        labels: options.labels,
        unit: options.unit,
        series: options.series,
        hiddenSeries: getChartHiddenState(options.chartId),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
        xLabelEvery: options.xLabelEvery || getDisclosureLabelEvery(options.labels.length),
      }) +
      "</div></section>"
    );
  }

  function renderMarketDisclosureEmptyState() {
    var pageMock = getMarketDisclosureMock();
    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain chart-main-empty">' +
      renderEmptyState({
        message: (pageMock.emptyExample && pageMock.emptyExample.message) || "当前日期暂无交易中心披露数据，请切换日期或手动更新数据",
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      }) +
      "</div></section>"
    );
  }

  function renderTradeCenterPageEmptyPanel(message) {
    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain chart-main-empty">' +
      renderEmptyState({
        message: message || INFO_DISCLOSURE_EMPTY_MESSAGE,
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      }) +
      "</div></section>"
    );
  }

  function renderMarketDisclosureLoad24(module) {
    var rows = getMarketDisclosureAppliedRows(module);
    var compareRows = getMarketDisclosureCompareRows(module);

    if (!rows.length) {
      return renderMarketDisclosureEmptyState();
    }

    var currentDaily = rows[rows.length - 1].hourlyValues;
    var currentAverage = averageRowsByField(rows, "hourlyValues");
    var dailySeries = [
      {
        id: "market-disclosure-load24-current",
        label: "当前周期最新日电量",
        color: "#1677FF",
        values: currentDaily,
      },
    ];
    var averageSeries = [
      {
        id: "market-disclosure-load24-average",
        label: "当前周期均值电量",
        color: "#2FCB8F",
        values: currentAverage,
      },
    ];

    if (compareRows.length) {
      dailySeries.push({
        id: "market-disclosure-load24-compare",
        label: "对比周期最新日电量",
        color: "#FF7A45",
        values: compareRows[compareRows.length - 1].hourlyValues,
      });
      averageSeries.push({
        id: "market-disclosure-load24-average-compare",
        label: "对比周期均值电量",
        color: "#8C6A4A",
        values: averageRowsByField(compareRows, "hourlyValues"),
      });
    }

    return (
      renderDisclosureChartPanel({
        chartId: getMarketDisclosureChartId("market-disclosure-load24-day-chart", module.infoDisclosureKey),
        title: "售电公司 24 点日电量趋势图",
        labels: module.hours || [],
        unit: module.unit,
        series: dailySeries,
        xLabelEvery: 2,
      }) +
      renderDisclosureChartPanel({
        chartId: getMarketDisclosureChartId("market-disclosure-load24-average-chart", module.infoDisclosureKey),
        title: "售电公司 24 点周期电量均值趋势图",
        labels: module.hours || [],
        unit: module.unit,
        series: averageSeries,
        xLabelEvery: 2,
      }) +
      renderSectionTable("market-disclosure-load24-table", {
        columns: ["日期"]
          .concat((module.hours || []).slice())
          .concat(["日合计电量（MWh）"]),
        rows: rows.map(function mapRow(row) {
          return [row.date].concat(row.hourlyValues.map(function mapValue(value) {
            return formatDisclosureValue(value, module.unit);
          })).concat([formatDisclosureValue(row.total, module.unit)]);
        }),
        minWidth: 2240,
      })
    );
  }

  function renderMarketDisclosureLoad96(module) {
    var rows = getMarketDisclosureAppliedRows(module);
    var compareRows = getMarketDisclosureCompareRows(module);

    if (!rows.length) {
      return renderMarketDisclosureEmptyState();
    }

    var latestRow = rows[rows.length - 1];
    var latest96Series = [
      {
        id: "market-disclosure-load96-current",
        label: "当前周期最新日 96 点电量",
        color: "#1677FF",
        values: latestRow.quarterValues,
      },
    ];
    var average96Series = [
      {
        id: "market-disclosure-load96-average",
        label: "当前周期均值 96 点电量",
        color: "#2FCB8F",
        values: averageRowsByField(rows, "quarterValues"),
      },
    ];
    var latest24Series = [
      {
        id: "market-disclosure-load24-converted-current",
        label: "当前周期最新日 24 点转化电量",
        color: "#5B8FF9",
        values: latestRow.converted24Values,
      },
    ];
    var average24Series = [
      {
        id: "market-disclosure-load24-converted-average",
        label: "当前周期均值 24 点转化电量",
        color: "#36CFC9",
        values: averageRowsByField(rows, "converted24Values"),
      },
    ];

    if (compareRows.length) {
      latest96Series.push({
        id: "market-disclosure-load96-compare",
        label: "对比周期最新日 96 点电量",
        color: "#FF7A45",
        values: compareRows[compareRows.length - 1].quarterValues,
      });
      average96Series.push({
        id: "market-disclosure-load96-average-compare",
        label: "对比周期均值 96 点电量",
        color: "#8C6A4A",
        values: averageRowsByField(compareRows, "quarterValues"),
      });
      latest24Series.push({
        id: "market-disclosure-load24-converted-compare",
        label: "对比周期最新日 24 点转化电量",
        color: "#FF9F1A",
        values: compareRows[compareRows.length - 1].converted24Values,
      });
      average24Series.push({
        id: "market-disclosure-load24-converted-average-compare",
        label: "对比周期均值 24 点转化电量",
        color: "#9254DE",
        values: averageRowsByField(compareRows, "converted24Values"),
      });
    }

    return (
      renderDisclosureChartPanel({
        chartId: getMarketDisclosureChartId("market-disclosure-load96-day-chart", module.infoDisclosureKey),
        title: "售电公司 96 点日电量趋势图",
        labels: module.quarterHours || [],
        unit: module.unit,
        series: latest96Series,
        xLabelEvery: 8,
      }) +
      renderDisclosureChartPanel({
        chartId: getMarketDisclosureChartId("market-disclosure-load96-average-chart", module.infoDisclosureKey),
        title: "售电公司 96 点周期电量均值趋势图",
        labels: module.quarterHours || [],
        unit: module.unit,
        series: average96Series,
        xLabelEvery: 8,
      }) +
      renderDisclosureChartPanel({
        chartId: getMarketDisclosureChartId("market-disclosure-load24-converted-day-chart", module.infoDisclosureKey),
        title: "售电公司转化 24 点日电量趋势图",
        labels: module.hours || [],
        unit: module.unit,
        series: latest24Series,
        xLabelEvery: 2,
      }) +
      renderDisclosureChartPanel({
        chartId: getMarketDisclosureChartId("market-disclosure-load24-converted-average-chart", module.infoDisclosureKey),
        title: "售电公司转化 24 点周期电量均值趋势图",
        labels: module.hours || [],
        unit: module.unit,
        series: average24Series,
        xLabelEvery: 2,
      }) +
      renderSectionTable("market-disclosure-load96-table", {
        columns: ["日期"]
          .concat((module.quarterHours || []).slice())
          .concat(["96 点合计电量", "24 点转化电量"]),
        rows: rows.map(function mapRow(row) {
          return [row.date]
            .concat(row.quarterValues.map(function mapValue(value) {
              return formatDisclosureValue(value, module.unit);
            }))
            .concat([formatDisclosureValue(row.total96, module.unit), row.conversionSummary]);
        }),
        minWidth: 7040,
      })
    );
  }

  function renderMarketDisclosureDualPrice(module, titleText) {
    var rows = getMarketDisclosureAppliedRows(module);
    var compareRows = getMarketDisclosureCompareRows(module);

    if (!rows.length) {
      return renderMarketDisclosureEmptyState();
    }

    var labels = buildDisclosureLabels(rows);
    var series = [
      {
        id: "market-disclosure-dual-price-dayahead",
        label: titleText.indexOf("加权电价") >= 0 ? "日前用户侧加权电价" : "日前用户侧统一结算价格",
        color: "#1677FF",
        values: rows.map(function mapRow(row) {
          return row.dayaheadPrice;
        }),
      },
      {
        id: "market-disclosure-dual-price-realtime",
        label: titleText.indexOf("加权电价") >= 0 ? "实时用户侧加权电价" : "实时用户侧统一结算价格",
        color: "#2FCB8F",
        values: rows.map(function mapRow(row) {
          return row.realtimePrice;
        }),
      },
    ];

    if (compareRows.length) {
      series.push({
        id: "market-disclosure-dual-price-dayahead-compare",
        label: "对比日前",
        color: "#FF7A45",
        values: normalizeSeriesLength(compareRows.map(function mapRow(row) {
          return row.dayaheadPrice;
        }), labels.length),
      });
      series.push({
        id: "market-disclosure-dual-price-realtime-compare",
        label: "对比实时",
        color: "#8C6A4A",
        values: normalizeSeriesLength(compareRows.map(function mapRow(row) {
          return row.realtimePrice;
        }), labels.length),
      });
    }

    return (
      renderDisclosureChartPanel({
        chartId: getMarketDisclosureChartId("market-disclosure-dual-price-chart", module.infoDisclosureKey),
        title: titleText,
        labels: labels,
        unit: module.unit,
        series: series,
      }) +
      renderSectionTable("market-disclosure-dual-price-table", {
        columns: [
          "日期",
          "时刻",
          titleText.indexOf("加权电价") >= 0 ? "日前用户侧加权电价（元/MWh）" : "日前用户侧统一结算价格（元/MWh）",
          titleText.indexOf("加权电价") >= 0 ? "实时用户侧加权电价（元/MWh）" : "实时用户侧统一结算价格（元/MWh）",
          "差值（元/MWh）",
        ],
        rows: rows.map(function mapRow(row) {
          return [
            row.date,
            row.time,
            formatDisclosureValue(row.dayaheadPrice, module.unit),
            formatDisclosureValue(row.realtimePrice, module.unit),
            formatDisclosureValue(row.diff, module.unit),
          ];
        }),
        minWidth: 1160,
      })
    );
  }

  function renderMarketDisclosureTrend(module) {
    var rows = getMarketDisclosureAppliedRows(module);
    var compareRows = getMarketDisclosureCompareRows(module);

    if (!rows.length) {
      return renderMarketDisclosureEmptyState();
    }

    var labels = buildDisclosureLabels(rows);
    var series = [
      {
        id: "market-disclosure-trend-current",
        label: getMarketDisclosureActiveTab(),
        color: "#1677FF",
        values: rows.map(function mapRow(row) {
          return row.value;
        }),
      },
    ];

    if (compareRows.length) {
      series.push({
        id: "market-disclosure-trend-compare",
        label: "对比周期",
        color: "#FF7A45",
        values: normalizeSeriesLength(compareRows.map(function mapRow(row) {
          return row.value;
        }), labels.length),
      });
    }

    return (
      renderDisclosureChartPanel({
        chartId: getMarketDisclosureChartId("market-disclosure-trend-chart", module.infoDisclosureKey),
        title: getMarketDisclosureActiveTab(),
        labels: labels,
        unit: module.unit,
        series: series,
      }) +
      renderSectionTable("market-disclosure-trend-table", {
        columns: ["日期", "时刻", "数据值", "单位", "数据来源", "更新时间"],
        rows: rows.map(function mapRow(row) {
          return [
            row.date,
            row.time,
            formatDisclosureValue(row.value, module.unit),
            row.unit,
            row.source,
            row.updatedAt,
          ];
        }),
        minWidth: 1160,
      })
    );
  }

  function renderMarketDisclosureContent() {
    var module = getMarketDisclosureModule();

    if (!module || !module.type) {
      return renderMarketDisclosureEmptyState();
    }

    if (module.type === "load-profile-24") {
      return renderMarketDisclosureLoad24(module);
    }
    if (module.type === "load-profile-96") {
      return renderMarketDisclosureLoad96(module);
    }
    if (module.type === "dual-price") {
      return renderMarketDisclosureDualPrice(
        module,
        getActiveTradeCenterDataPageKey() === "sx-data-disclosure" ? "用户侧加权电价对比" : "用户侧统一结算价格对比",
      );
    }
    return renderMarketDisclosureTrend(module);
  }

  function renderMarketDisclosurePage() {
    var pageMock = getMarketDisclosureMock();
    var activeTab = getMarketDisclosureActiveTab();
    var status = getMarketDisclosureStatus(getMarketDisclosureModule());
    var scenario = getMarketDisclosureScenario();
    var pageTitle = isInfoDisclosurePage(state.currentPageKey) ? "信息披露" : (pageMock.title || registry.getPage(state.currentPageKey).title);
    var pageDescription = pageMock.description || "";

    return (
      '<div class="page-stack">' +
      '<section class="page-header page-header-market-disclosure"><div class="page-title-block"><h1>' +
      escapeHtml(pageTitle) +
      '</h1><div class="page-description">' +
      escapeHtml(pageDescription) +
      "</div></div>" +
      renderTradeCenterSelector({
        selected: state.ui.selectedTradeCenter,
        options: TRADE_CENTER_OPTIONS,
        isOpen: state.ui.tradeCenterOpen,
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      }) +
      "</section>" +
      '<section class="panel tabs-panel"><div class="panel-topline"><div class="primary-tabs">' +
      renderPageTabs(pageMock.tabs || [], activeTab) +
      "</div></div></section>" +
      renderMarketDisclosureFilterBar() +
      renderMarketDisclosureDataUpdateBar(status) +
      renderMarketDisclosureAlert(scenario) +
      renderMarketDisclosureContent() +
      "</div>"
    );
  }

  function createTableActionCell(recordId, actions) {
    return {
      actions: (actions || []).map(function mapAction(action) {
        return {
          label: action.label,
          action: action.action,
          recordId: recordId,
          payload: action.payload || "",
        };
      }),
    };
  }

  function renderEmptyContentPanel() {
    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain chart-main-empty">' +
      renderEmptyState({
        message: "当前日期暂无交易中心披露数据，请切换日期或手动更新数据",
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      }) +
      "</div></section>"
    );
  }

  function renderSectionTable(tableId, table) {
    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
      renderDataTablePro({
        tableId: tableId,
        columns: table.columns,
        rows: table.rows,
        minWidth: table.minWidth,
        sortState: getTableSortState(tableId),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></section>"
    );
  }

  function renderMixedBarLineChart(options) {
    var hiddenSeries = options.hiddenSeries || {};
    var barSeries = (options.barSeries || []).filter(function filterSeries(series) {
      return !hiddenSeries[series.id];
    });
    var lineSeries = (options.lineSeries || []).filter(function filterSeries(series) {
      return !hiddenSeries[series.id];
    });
    var visibleSeries = barSeries.concat(lineSeries);
    var width = 1040;
    var height = 360;
    var margin = { top: 28, right: 72, bottom: 50, left: 64 };
    var innerWidth = width - margin.left - margin.right;
    var innerHeight = height - margin.top - margin.bottom;
    var xStep = options.labels.length > 1 ? innerWidth / options.labels.length : innerWidth;
    var xLabelEvery = options.xLabelEvery || 1;

    if (!visibleSeries.length) {
      return renderEmptyState({
        message: "当前图表暂无可展示序列，请重新选择图例。",
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      });
    }

    function getValues(seriesList) {
      return seriesList.reduce(function reduce(result, series) {
        return result.concat(
          series.values.filter(function filterValue(value) {
            return typeof value === "number";
          }),
        );
      }, []);
    }

    var leftValues = getValues(barSeries);
    var rightValues = getValues(lineSeries);
    var leftMax = Math.max.apply(null, leftValues.length ? leftValues : [0]);
    var rightMax = Math.max.apply(null, rightValues.length ? rightValues : [0]);
    var roundedLeftMax = Math.ceil((leftMax * 1.15) / 1000) * 1000 || 1000;
    var roundedRightMax = Math.ceil((rightMax * 1.15) / 100) * 100 || 100;
    var yTicks = Array.from({ length: 6 }, function createTick(_, index) {
      return Math.round((roundedLeftMax / 5) * index);
    });

    function xToCenter(index) {
      return margin.left + index * xStep + xStep / 2;
    }

    function yLeft(value) {
      return margin.top + innerHeight - (value / roundedLeftMax) * innerHeight;
    }

    function yRight(value) {
      return margin.top + innerHeight - (value / roundedRightMax) * innerHeight;
    }

    function buildLine(series) {
      return series.values
        .map(function mapValue(value, index) {
          if (typeof value !== "number") {
            return null;
          }
          return xToCenter(index) + "," + yRight(value);
        })
        .filter(Boolean)
        .join(" ");
    }

    var legendHtml =
      '<div class="chart-legend chart-legend-buttoned">' +
      (options.barSeries || [])
        .concat(options.lineSeries || [])
        .map(function mapLegend(series) {
          return (
            '<button class="legend-toggle ' +
            (hiddenSeries[series.id] ? "muted" : "") +
            '" data-chart-id="' +
            escapeHtml(options.chartId) +
            '" data-chart-legend="' +
            escapeHtml(series.id) +
            '">' +
            '<span class="legend-swatch legend-swatch-block" style="background:' +
            escapeHtml(series.color) +
            ';"></span>' +
            escapeHtml(series.label) +
            "</button>"
          );
        })
        .join("") +
      "</div>";

    var gridHtml = yTicks
      .map(function mapTick(tick) {
        var y = yLeft(tick);
        return (
          '<line class="grid-line" x1="' +
          margin.left +
          '" x2="' +
          (width - margin.right) +
          '" y1="' +
          y +
          '" y2="' +
          y +
          '"></line><text class="axis-label" x="' +
          (margin.left - 10) +
          '" y="' +
          (y + 4) +
          '" text-anchor="end">' +
          formatInteger(tick) +
          '</text><text class="axis-label axis-label-right" x="' +
          (width - margin.right + 10) +
          '" y="' +
          (y + 4) +
          '" text-anchor="start">' +
          formatDecimal((tick / roundedLeftMax) * roundedRightMax) +
          "</text>"
        );
      })
      .join("");

    var xLabelsHtml = options.labels
      .map(function mapLabel(label, index) {
        if (index % xLabelEvery !== 0 && index !== options.labels.length - 1) {
          return "";
        }
        return '<text class="time-label" x="' + xToCenter(index) + '" y="' + (height - 14) + '" text-anchor="middle">' + escapeHtml(label) + "</text>";
      })
      .join("");

    var barsHtml = barSeries
      .map(function mapSeries(series, seriesIndex) {
        var groupWidth = Math.min(24, xStep * 0.72);
        var barWidth = groupWidth / Math.max(barSeries.length, 1);
        return series.values
          .map(function mapValue(value, index) {
            if (typeof value !== "number") {
              return "";
            }
            var x = xToCenter(index) - groupWidth / 2 + seriesIndex * barWidth;
            var y = yLeft(value);
            return '<rect class="chart-bar" x="' + x + '" y="' + y + '" width="' + Math.max(barWidth - 2, 2) + '" height="' + (margin.top + innerHeight - y) + '" fill="' + escapeHtml(series.color) + '" fill-opacity="' + (series.opacity || 0.9) + '"></rect>';
          })
          .join("");
      })
      .join("");

    var linesHtml = lineSeries
      .map(function mapSeries(series) {
        return '<polyline class="custom-chart-line" points="' + buildLine(series) + '" style="stroke:' + escapeHtml(series.color) + ";stroke-width:2.6;\"></polyline>";
      })
      .join("");

    var hitAreasHtml = options.labels
      .map(function mapLabel(label, index) {
        var tooltip = options.tooltipFormatter
          ? options.tooltipFormatter(label, index, visibleSeries)
          : visibleSeries
              .map(function mapSeries(series) {
                var value = series.values[index];
                return series.label + ": " + (typeof value === "number" ? formatDecimal(value) : "--");
              })
              .join(" | ");
        return '<rect class="chart-hit-rect" x="' + (margin.left + index * xStep) + '" y="' + margin.top + '" width="' + xStep + '" height="' + innerHeight + '"><title>' + escapeHtml(label + " " + tooltip) + "</title></rect>";
      })
      .join("");

    return (
      legendHtml +
      '<div class="chart-canvas"><div class="chart-unit">' +
      escapeHtml(options.leftUnit || "") +
      '</div><div class="chart-unit chart-unit-right">' +
      escapeHtml(options.rightUnit || "") +
      '</div><svg class="line-chart" viewBox="0 0 ' +
      width +
      " " +
      height +
      '">' +
      gridHtml +
      barsHtml +
      linesHtml +
      hitAreasHtml +
      xLabelsHtml +
      "</svg></div>"
    );
  }

  function getTradeResultMock() {
    return guangdongMock.tradeResult || {};
  }

  function isTradeResultCompareSupported() {
    return state.tradeResult.activeTab === "全省统一出清价" || state.tradeResult.activeTab === "交易结果";
  }

  function getTradeResultRows() {
    return getTradeResultMock().hourlyRows || [];
  }

  function getTradeResultCompareSeries(values, pattern) {
    return buildCompareValues(values, pattern).map(function roundValue(value) {
      return Number(Number(value).toFixed(1));
    });
  }

  function getTradeResultNodeLabels() {
    var keyword = String(state.tradeResult.filters.nodeKeyword || "").trim();
    return (getTradeResultMock().nodeLabels || []).filter(function filterLabel(label) {
      return !keyword || label.indexOf(keyword) >= 0;
    });
  }

  function getSelectedTradeNode() {
    var visibleNodes = getTradeResultNodeLabels();
    if (visibleNodes.indexOf(state.tradeResult.selectedNode) >= 0) {
      return state.tradeResult.selectedNode;
    }
    return "全省";
  }

  function isTradeResultEmpty() {
    var tradeMock = getTradeResultMock();
    if (state.tradeResult.activeTab === "节点电价") {
      return state.tradeResult.filters.nodeRunRange.start !== tradeMock.defaultRunDate;
    }
    return state.tradeResult.filters.marketRunRange.start !== tradeMock.defaultRunDate;
  }

  function getTradeResultUnifiedTable() {
    return {
      columns: [
        { key: "time", label: "时刻", sortable: false },
        { key: "dayaheadPrice", label: "日前节点电价（元/MWh）" },
        { key: "realtimePrice", label: "实时节点电价（元/MWh）" },
      ],
      rows: getTradeResultRows().map(function mapRow(row) {
        return {
          time: row.time,
          dayaheadPrice: formatDecimal(row.dayaheadPrice),
          realtimePrice: formatDecimal(row.realtimePrice),
        };
      }),
      minWidth: 860,
    };
  }

  function getTradeResultUnifiedChart() {
    var rows = getTradeResultRows();
    var dayAhead = rows.map(function mapRow(row) {
      return row.dayaheadPrice;
    });
    var realTime = rows.map(function mapRow(row) {
      return row.realtimePrice;
    });
    var series = [
      { id: "trade-price-dayahead", label: "日前节点电价", color: "#1677FF", values: dayAhead },
      { id: "trade-price-realtime", label: "实时节点电价", color: "#2FCB8F", values: realTime },
    ];

    if (state.ui.hasCompare) {
      series.push({
        id: "trade-price-dayahead-compare",
        label: "对比日前节点电价",
        color: "#FF7A45",
        values: getTradeResultCompareSeries(dayAhead, [-18.6, -12.4, -6.2, 4.8, 8.2, 12.4]),
      });
      series.push({
        id: "trade-price-realtime-compare",
        label: "对比实时节点电价",
        color: "#8C6A4A",
        values: getTradeResultCompareSeries(realTime, [-16.4, -10.8, -4.8, 5.2, 9.6, 13.8]),
      });
    }

    return renderChartWithMarks({
      chartId: "trade-result-price-chart",
      title: "全省统一出清价",
      labels: rows.map(function mapRow(row) {
        return row.time;
      }),
      unit: "元/MWh",
      series: series,
      hiddenSeries: getChartHiddenState("trade-result-price-chart"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
      xLabelEvery: 2,
    });
  }

  function getTradeResultMixedTable() {
    return {
      columns: [
        { key: "time", label: "时刻", sortable: false },
        { key: "dayaheadVolume", label: "日前成交电量（MWh）" },
        { key: "realtimeVolume", label: "实时成交电量（MWh）" },
        { key: "dayaheadSettlementPrice", label: "日前用户侧统一结算电价（元/MWh）" },
        { key: "realtimeSettlementPrice", label: "实时用户侧统一结算电价（元/MWh）" },
      ],
      rows: getTradeResultRows().map(function mapRow(row) {
        return {
          time: row.time,
          dayaheadVolume: formatInteger(row.dayaheadVolume),
          realtimeVolume: formatInteger(row.realtimeVolume),
          dayaheadSettlementPrice: formatDecimal(row.dayaheadSettlementPrice),
          realtimeSettlementPrice: formatDecimal(row.realtimeSettlementPrice),
        };
      }),
      minWidth: 1320,
    };
  }

  function getTradeResultMixedChart() {
    var rows = getTradeResultRows();
    var dayAheadVolume = rows.map(function mapRow(row) {
      return row.dayaheadVolume;
    });
    var realTimeVolume = rows.map(function mapRow(row) {
      return row.realtimeVolume;
    });
    var dayAheadPrice = rows.map(function mapRow(row) {
      return row.dayaheadSettlementPrice;
    });
    var realTimePrice = rows.map(function mapRow(row) {
      return row.realtimeSettlementPrice;
    });
    var barSeries = [
      { id: "trade-volume-dayahead", label: "日前成交电量", color: "#9DC4FF", values: dayAheadVolume, opacity: 0.92 },
      { id: "trade-volume-realtime", label: "实时成交电量", color: "#6CB7FF", values: realTimeVolume, opacity: 0.78 },
    ];
    var lineSeries = [
      { id: "trade-settlement-dayahead", label: "日前用户侧统一结算电价", color: "#FF7A45", values: dayAheadPrice },
      { id: "trade-settlement-realtime", label: "实时用户侧统一结算电价", color: "#2FCB8F", values: realTimePrice },
    ];

    if (state.ui.hasCompare) {
      barSeries.push({
        id: "trade-volume-dayahead-compare",
        label: "对比日前成交电量",
        color: "#D6E6FF",
        values: getTradeResultCompareSeries(dayAheadVolume, [-620, -420, -260, 140, 220, 310]),
        opacity: 0.55,
      });
      barSeries.push({
        id: "trade-volume-realtime-compare",
        label: "对比实时成交电量",
        color: "#B8DBFF",
        values: getTradeResultCompareSeries(realTimeVolume, [-520, -360, -180, 120, 180, 260]),
        opacity: 0.45,
      });
      lineSeries.push({
        id: "trade-settlement-dayahead-compare",
        label: "对比日前用户侧统一结算电价",
        color: "#FFC39E",
        values: getTradeResultCompareSeries(dayAheadPrice, [-18.8, -12.2, -6.4, 5.2, 8.6, 12.8]),
      });
      lineSeries.push({
        id: "trade-settlement-realtime-compare",
        label: "对比实时用户侧统一结算电价",
        color: "#A7E7CC",
        values: getTradeResultCompareSeries(realTimePrice, [-16.6, -10.4, -4.8, 5.8, 9.4, 13.2]),
      });
    }

    return renderMixedBarLineChart({
      chartId: "trade-result-mixed-chart",
      labels: rows.map(function mapRow(row) {
        return row.time;
      }),
      barSeries: barSeries,
      lineSeries: lineSeries,
      hiddenSeries: getChartHiddenState("trade-result-mixed-chart"),
      leftUnit: "MWh",
      rightUnit: "元/MWh",
      xLabelEvery: 2,
    });
  }

  function getTradeNodePriceSeries() {
    var nodeSeries = getTradeResultMock().nodePriceSeries || {};
    return nodeSeries[getSelectedTradeNode()] || nodeSeries["全省"] || { dayAhead: [], realTime: [] };
  }

  function getTradeNodePriceTable() {
    var series = getTradeNodePriceSeries();
    return {
      columns: [
        { key: "time", label: "时刻", sortable: false },
        { key: "dayaheadPrice", label: "日前节点电价（元/MWh）" },
        { key: "realtimePrice", label: "实时节点电价（元/MWh）" },
      ],
      rows: (getInfoMock().quarterHours || mock.quarterHours).map(function mapTime(time, index) {
        return {
          time: time,
          dayaheadPrice: formatDecimal(series.dayAhead[index]),
          realtimePrice: formatDecimal(series.realTime[index]),
        };
      }),
      minWidth: 900,
    };
  }

  function renderTradeNodeSidebar() {
    var visibleNodes = getTradeResultNodeLabels();
    return (
      '<aside class="market-node-sidebar"><div class="tree-header">节点列表</div>' +
      visibleNodes
        .map(function mapNode(label) {
          return '<button class="market-node-item ' + (getSelectedTradeNode() === label ? "active" : "") + '" data-trade-node="' + escapeHtml(label) + '">' + escapeHtml(label) + "</button>";
        })
        .join("") +
      "</aside>"
    );
  }

  function renderTradeResultFilterBar() {
    var activeTab = state.tradeResult.activeTab;
    var fieldsHtml = "";

    if (activeTab === "节点电价") {
      fieldsHtml =
        '<div class="info-filter-field"><span class="filter-label">运行日期：</span>' +
        renderInfoDatePicker("trade-node-runtime", "single") +
        "</div>" +
        renderBoundTextFilter("节点搜索", state.tradeResult.filters.nodeKeyword, "请输入节点名称", "nodeKeyword", "tradeResult", "filter-input-wide");
    } else {
      fieldsHtml =
        '<div class="info-filter-field"><span class="filter-label">运行日期：</span>' +
        renderInfoDatePicker("trade-result-runtime", "single") +
        "</div>";
    }

    return '<section class="panel info-filter-panel"><div class="info-filter-fields">' + fieldsHtml + '</div><div class="info-filter-actions"></div></section>';
  }

  function renderTradeResultContent() {
    if (isTradeResultEmpty()) {
      return renderEmptyContentPanel();
    }

    if (state.tradeResult.activeTab === "全省统一出清价") {
      var priceTable = getTradeResultUnifiedTable();
      return (
        '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
        getTradeResultUnifiedChart() +
        renderDataTablePro({
          tableId: "trade-result-price-table",
          columns: priceTable.columns,
          rows: priceTable.rows,
          minWidth: priceTable.minWidth,
          sortState: getTableSortState("trade-result-price-table"),
          escapeHtml: escapeHtml,
          renderIcon: renderIcon,
          renderEmptyState: renderEmptyState,
        }) +
        "</div></section>"
      );
    }

    if (state.tradeResult.activeTab === "交易结果") {
      var mixedTable = getTradeResultMixedTable();
      return (
        '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
        getTradeResultMixedChart() +
        renderDataTablePro({
          tableId: "trade-result-mixed-table",
          columns: mixedTable.columns,
          rows: mixedTable.rows,
          minWidth: mixedTable.minWidth,
          sortState: getTableSortState("trade-result-mixed-table"),
          escapeHtml: escapeHtml,
          renderIcon: renderIcon,
          renderEmptyState: renderEmptyState,
        }) +
        "</div></section>"
      );
    }

    var nodeTable = getTradeNodePriceTable();
    return (
      '<section class="panel chart-panel"><div class="chart-layout chart-layout-node">' +
      renderTradeNodeSidebar() +
      '<div class="chart-main">' +
      renderChartWithMarks({
        chartId: "trade-node-price-chart",
        title: getSelectedTradeNode(),
        labels: getInfoMock().quarterHours || mock.quarterHours,
        unit: "元/MWh",
        series: [
          { id: "trade-node-dayahead", label: "日前节点电价", color: "#1677FF", values: getTradeNodePriceSeries().dayAhead },
          { id: "trade-node-realtime", label: "实时节点电价", color: "#2FCB8F", values: getTradeNodePriceSeries().realTime },
        ],
        hiddenSeries: getChartHiddenState("trade-node-price-chart"),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
        xLabelEvery: 4,
      }) +
      renderDataTablePro({
        tableId: "trade-node-price-table",
        columns: nodeTable.columns,
        rows: nodeTable.rows,
        minWidth: nodeTable.minWidth,
        sortState: getTableSortState("trade-node-price-table"),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></div></section>"
    );
  }

  function renderTradeResultPage() {
    var tradeMock = getTradeResultMock();
    var status = parseInfoStatus(tradeMock.statusText);

    return (
      renderMarketPageHeader(tradeMock.title || "用电侧交易结果", renderPageTabs(tradeMock.tabs || [], state.tradeResult.activeTab)) +
      renderTradeResultFilterBar() +
      renderDownloadOnlyBar(status, isTradeResultCompareSupported()) +
      renderTradeResultContent() +
      "</div>"
    );
  }

  function getSettlementMock() {
    return getMarketPageData("settlement") || {};
  }

  function getSettlementDailyRows() {
    var filters = state.settlement.filters;
    return (getSettlementMock().dailyRows || []).filter(function filterRow(row) {
      return (
        row.date >= filters.dailyRange.start &&
        row.date <= filters.dailyRange.end &&
        includesKeyword(row.enterpriseName, filters.dailyUserName) &&
        includesKeyword(row.accountNo, filters.dailyAccountNo)
      );
    });
  }

  function getSettlementMonthRows() {
    var filters = state.settlement.filters;
    return (getSettlementMock().monthRows || []).filter(function filterRow(row) {
      return (
        row.month === filters.monthlyMonth &&
        includesKeyword(row.enterpriseName, filters.monthlyUserName) &&
        includesKeyword(row.accountNo, filters.monthlyAccountNo)
      );
    });
  }

  function getSettlementSummaryCards(rows) {
    var summary = rows.reduce(
      function reduce(result, row) {
        result.energy += row.energy;
        result.totalFee += row.totalFee;
        result.deviationFee += row.deviationFee;
        result.imbalanceFee += row.imbalanceFee;
        return result;
      },
      { energy: 0, totalFee: 0, deviationFee: 0, imbalanceFee: 0 },
    );

    return [
      { label: "日清算总电量", value: formatMoney(summary.energy), unit: "MWh" },
      { label: "日清算总电费", value: formatMoney(summary.totalFee), unit: "元" },
      { label: "偏差费用", value: formatMoney(summary.deviationFee), unit: "元" },
      { label: "市场不平衡电费", value: formatMoney(summary.imbalanceFee), unit: "元" },
    ];
  }

  function getSettlementViewPageData(primaryTab, secondaryTab) {
    var resolvedPrimaryTab = primaryTab || state.settlement.activeTab || "日清算";
    var resolvedSecondaryTab =
      secondaryTab !== undefined
        ? secondaryTab
        : resolvedPrimaryTab === "月结算"
          ? getSettlementActiveSecondaryTab()
          : "";

    return (
      resolveMarketPageViewData({
        pageType: "settlement",
        tradeCenter: state.ui.selectedTradeCenter,
        primaryTab: resolvedPrimaryTab,
        secondaryTab: resolvedSecondaryTab,
      }) || {}
    );
  }

  function getSettlementSecondaryOptions() {
    if (getSelectedTradeCenterKey() === "hunan" || getSelectedTradeCenterKey() === "shaanxi") {
      return ["售电公司"];
    }
    return ["售电公司", "用电企业"];
  }

  function getSettlementActiveSecondaryTab() {
    var options = getSettlementSecondaryOptions();

    if (state.settlement.activeTab !== "月结算" || getSelectedTradeCenterKey() === "guangdong") {
      return "";
    }

    if (options.indexOf(state.settlement.secondaryTab) < 0) {
      state.settlement.secondaryTab = options[0];
    }

    return state.settlement.secondaryTab;
  }

  function getSettlementDefaultDailyRange() {
    var pageData = getSettlementViewPageData("日清算", "");
    var range = pageData.filters && pageData.filters.dateRange;

    if (range && range.start && range.end) {
      return cloneRange(range);
    }

    return {
      start: "2026-05-08",
      end: "2026-05-09",
    };
  }

  function getSettlementDefaultMonth() {
    var pageData = getSettlementViewPageData("月结算", "售电公司");
    return (pageData.filters && pageData.filters.month) || "2026-05";
  }

  function syncSettlementStateForTradeCenter() {
    var centerKey = getSelectedTradeCenterKey();
    var isFirstSync = !state.settlement.centerKey;

    if (!isFirstSync && state.settlement.centerKey === centerKey) {
      if (centerKey !== "guangdong") {
        getSettlementActiveSecondaryTab();
      }
      return;
    }

    state.settlement.centerKey = centerKey;

    if (centerKey === "guangdong") {
      state.settlement.secondaryTab = "";
      state.settlement.filters.dailyRange = {
        start: "2026-05-03",
        end: "2026-05-09",
      };
      state.settlement.filters.dailyUserName = "";
      state.settlement.filters.dailyAccountNo = "";
      state.settlement.filters.monthlyMonth = "2026-05";
      state.settlement.filters.monthlyUserName = "";
      state.settlement.filters.monthlyAccountNo = "";
      return;
    }

    var secondaryOptions = getSettlementSecondaryOptions();
    state.settlement.secondaryTab =
      secondaryOptions.indexOf(state.settlement.secondaryTab) >= 0 ? state.settlement.secondaryTab : secondaryOptions[0];
    state.settlement.filters.dailyRange = getSettlementDefaultDailyRange();
    state.settlement.filters.dailyUserName = "";
    state.settlement.filters.dailyAccountNo = "";
    state.settlement.filters.dailySellerCompanyName = "";
    state.settlement.filters.dailySettlementUnitName = "";
    state.settlement.filters.dailyStatementKey = "";
    state.settlement.filters.dailyStatementType = "全部";
    state.settlement.filters.dailyDataType = "全部";
    state.settlement.filters.monthlyMonth = getSettlementDefaultMonth();
    state.settlement.filters.monthlyUserName = "";
    state.settlement.filters.monthlyAccountNo = "";
    state.settlement.filters.monthlySellerCompanyName = "";
    state.settlement.filters.monthlyEnterpriseName = "";
    state.settlement.filters.monthlyEnterpriseAccountNo = "";
  }

  function getSettlementStatusTone(status) {
    var text = String(status || "");

    if (text.indexOf("失败") >= 0) {
      return "danger";
    }
    if (text.indexOf("结算中") >= 0 || text.indexOf("处理中") >= 0) {
      return "processing";
    }
    if (text.indexOf("待") >= 0) {
      return "warning";
    }
    if (text.indexOf("已") >= 0 || text.indexOf("成功") >= 0) {
      return "success";
    }

    return "default";
  }

  function getSettlementStatusCell(status) {
    return createBadgeCell(status || "--", getSettlementStatusTone(status));
  }

  function formatSettlementValue(label, value) {
    if (value === null || value === undefined || value === "") {
      return "--";
    }

    if (value && typeof value === "object") {
      return value;
    }

    if (typeof value === "number") {
      if (label.indexOf("电价") >= 0 || label.indexOf("均价") >= 0 || label.indexOf("参考点") >= 0) {
        return formatDecimal(value);
      }
      return formatMoney(value);
    }

    return String(value);
  }

  function buildSettlementTable(columns, rows, minWidth, options) {
    return {
      columns: columns,
      rows: (rows || []).map(function mapRow(row) {
        var formatted = {};
        columns.forEach(function eachColumn(column) {
          formatted[column.key] = formatSettlementValue(column.label, row[column.key]);
        });
        return formatted;
      }),
      minWidth: minWidth || Math.max(980, columns.length * 128),
      enableColumnDrag: Boolean(options && options.enableColumnDrag),
    };
  }

  function renderSettlementTableSection(title, tableId, table, subtitle) {
    return renderChartSection(
      title,
      renderDataTablePro({
        tableId: tableId,
        columns: table.columns,
        rows: table.rows,
        minWidth: table.minWidth,
        columnOrder: table.enableColumnDrag ? getTableColumnOrder(tableId) : [],
        enableColumnDrag: table.enableColumnDrag,
        sortState: getTableSortState(tableId),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }),
      subtitle,
    );
  }

  function renderSettlementLineChartSection(chartId, title, subtitle, unit, labels, series, xLabelEvery) {
    return renderChartSection(
      title,
      renderChartWithMarks({
        chartId: chartId,
        title: title,
        labels: labels,
        unit: unit,
        series: series,
        hiddenSeries: getChartHiddenState(chartId),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
        xLabelEvery: xLabelEvery || 1,
      }),
      subtitle,
    );
  }

  function renderSettlementBarChartSection(chartId, title, subtitle, unit, labels, values, positiveColor) {
    return renderChartSection(
      title,
      renderBarChart({
        chartId: chartId,
        labels: labels,
        values: values,
        unit: unit,
        positiveColor: positiveColor || "#1677FF",
        xLabelEvery: labels.length > 6 ? 2 : 1,
      }),
      subtitle,
    );
  }

  function getSettlementFileRows(fileList) {
    var statusOptions = ["已解析", "待解析", "解析失败"];

    return (fileList || []).map(function mapFile(file, index) {
      var parseStatus = file.parseStatus || statusOptions[index % statusOptions.length];
      return {
        fileName: file.fileName || "--",
        fileType: file.fileType || "PDF",
        fetchedAt: file.publishTime || file.fetchedAt || file.updatedAt || "--",
        parseStatus: getSettlementStatusCell(parseStatus),
        actions: createTableActionCell(file.id || "settlement-file-" + index, [
          { label: "下载", action: "open-download" },
          { label: "重新解析", action: "reparse-settlement-file" },
        ]),
      };
    });
  }

  function renderSettlementFileTableSection(tableId, title, timeLabel, fileList) {
    return renderSettlementTableSection(
      title,
      tableId,
      buildSettlementTable(
        [
          { key: "fileName", label: "文件名称" },
          { key: "fileType", label: "文件类型" },
          { key: "fetchedAt", label: timeLabel || "获取时间" },
          { key: "parseStatus", label: "解析状态" },
          { key: "actions", label: "操作", sortable: false },
        ],
        getSettlementFileRows(fileList),
        1240,
      ),
    );
  }

  function getSettlementRecentMonths(selectedMonth, count) {
    var monthText = String(selectedMonth || "2026-05");
    var year = Number(monthText.slice(0, 4));
    var month = Number(monthText.slice(5, 7)) - 1;
    var result = [];
    var index;

    for (index = count - 1; index >= 0; index -= 1) {
      var nextDate = new Date(year, month - index, 1);
      result.push(nextDate.getFullYear() + "-" + String(nextDate.getMonth() + 1).padStart(2, "0"));
    }

    return result;
  }

  function getHunanDailySettlementTypeOptions() {
    return ["全部", "中长期", "日前", "实时", "日前申报偏差"];
  }

  function getHunanDailySelectedSettlementType() {
    var typeOptions = getHunanDailySettlementTypeOptions();
    var currentType = state.settlement.filters.dailyStatementType;

    if (typeOptions.indexOf(currentType) < 0) {
      state.settlement.filters.dailyStatementType = typeOptions[0];
    }

    return state.settlement.filters.dailyStatementType;
  }

  function getHunanDailySettlementTypeDescription(typeLabel) {
    var descriptionMap = {
      "全部": "展示完整清分明细字段，便于直接对照 PDF 清分单据。",
      "中长期": "重点查看中长期合同电量、电价、电费及电费小计。",
      "日前": "重点查看日前电量、统一结算点电价与对应电费。",
      "实时": "重点查看实时电量、统一结算点电价与对应电费。",
      "日前申报偏差": "重点查看偏差电量、偏差电价、偏差电费与电费小计。",
    };

    return descriptionMap[typeLabel] || descriptionMap["全部"];
  }

  function getHunanDailyDataTypeOptions() {
    var pageData = getSettlementViewPageData("日清算", "");
    return (pageData.filters && pageData.filters.dataTypeOptions) || ["全部", "清分单据", "日清算明细", "PDF 文件"];
  }

  function isHunanDailyRangeMatched(pageData) {
    var range = state.settlement.filters.dailyRange;
    var firstRow = (pageData.tableData || [])[0] || {};
    var firstFile = (pageData.fileList || [])[0] || {};
    var settlementDate = firstRow.settlementDate;
    var fileDate = firstFile.publishTime || firstFile.fetchedAt || "";

    if (!range || !range.start || !range.end) {
      return true;
    }

    return isDateWithinRange(settlementDate, range) || isDateWithinRange(fileDate, range);
  }

  function getHunanDailySettlementRows() {
    var pageData = getSettlementViewPageData("日清算", "");

    if (!isHunanDailyRangeMatched(pageData)) {
      return [];
    }

    return (pageData.tableData || []).filter(function filterRow(row) {
      return includesKeyword(row.sellerName, state.settlement.filters.dailySellerCompanyName);
    });
  }

  function formatFixedNumber(value, digits) {
    return Number(value || 0).toLocaleString("zh-CN", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function createSettlementTextCell(text, extraClassName, copyable) {
    return {
      text: text === null || text === undefined || text === "" ? "--" : String(text),
      className: extraClassName || "",
      copyable: copyable !== false,
      sortValue: text,
    };
  }

  function createSettlementNumberCell(value, digits, extraClassName) {
    var classNames = ["table-number-cell"];
    var numericValue = Number(value || 0);

    if (extraClassName) {
      classNames.push(extraClassName);
    }
    if (numericValue < 0) {
      classNames.push("table-negative");
    }

    return {
      text: formatFixedNumber(numericValue, digits),
      className: classNames.join(" "),
      sortValue: numericValue,
    };
  }

  function createSettlementNullableNumberCell(value, digits, extraClassName) {
    var classNames = ["table-number-cell"];
    var hasValue = value !== null && value !== undefined && value !== "" && value !== "--";

    if (extraClassName) {
      classNames.push(extraClassName);
    }

    if (!hasValue || Number.isNaN(Number(value))) {
      return {
        text: "--",
        className: classNames.join(" "),
        sortValue: Number.NEGATIVE_INFINITY,
        copyable: false,
      };
    }

    var numericValue = Number(value);

    if (numericValue < 0) {
      classNames.push("table-negative");
    }

    return {
      text: formatFixedNumber(numericValue, digits),
      className: classNames.join(" "),
      sortValue: numericValue,
    };
  }

  function formatSettlementMetricValue(value, digits) {
    if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) {
      return "--";
    }

    return formatFixedNumber(Number(value), digits);
  }

  function mapHunanDailySettlementDisplayRow(row) {
    var isTotalRow = row.period === "合计";
    var totalClass = isTotalRow ? "settlement-total-cell" : "";

    return {
      settlementDate: createSettlementTextCell(row.settlementDate, totalClass),
      sellerName: createSettlementTextCell(row.sellerName, totalClass),
      period: createSettlementTextCell(row.period, totalClass),
      actualUsage: createSettlementNumberCell(row.actualUsage, 3, totalClass),
      mediumLongTermVolume: createSettlementNumberCell(row.mediumLongTermVolume, 3, totalClass),
      mediumLongTermPrice: createSettlementNumberCell(row.mediumLongTermPrice, 2, totalClass),
      mediumLongTermFee: createSettlementNumberCell(row.mediumLongTermFee, 2, totalClass),
      dayAheadVolume: createSettlementNumberCell(row.dayAheadVolume, 3, totalClass),
      dayAheadPrice: createSettlementNumberCell(row.dayAheadPrice, 2, totalClass),
      dayAheadFee: createSettlementNumberCell(row.dayAheadFee, 2, totalClass),
      realTimeVolume: createSettlementNumberCell(row.realTimeVolume, 3, totalClass),
      realTimePrice: createSettlementNumberCell(row.realTimePrice, 2, totalClass),
      realTimeFee: createSettlementNumberCell(row.realTimeFee, 2, totalClass),
      deviationVolume: createSettlementNumberCell(row.deviationVolume, 3, totalClass),
      deviationPrice: createSettlementNumberCell(row.deviationPrice, 3, totalClass),
      deviationFee: createSettlementNumberCell(row.deviationFee, 2, totalClass),
      feeSubtotal: createSettlementNumberCell(row.feeSubtotal, 2, totalClass),
      remark: createSettlementTextCell(row.remark, totalClass),
    };
  }

  function getHunanDailySettlementTableSchema(typeLabel) {
    if (typeLabel === "中长期") {
      return {
        minWidth: 1380,
        columns: [
          { key: "settlementDate", label: "结算日期" },
          { key: "sellerName", label: "售电公司名称" },
          { key: "period", label: "时段" },
          { key: "actualUsage", label: "实际用电量（MWh）" },
          { key: "mediumLongTermVolume", label: "中长期合同电量（MWh）" },
          { key: "mediumLongTermPrice", label: "中长期结算电价（元/MWh）" },
          { key: "mediumLongTermFee", label: "中长期电费（元）" },
          { key: "feeSubtotal", label: "电费小计（元）" },
          { key: "remark", label: "备注" },
        ],
      };
    }

    if (typeLabel === "日前") {
      return {
        minWidth: 1260,
        columns: [
          { key: "settlementDate", label: "结算日期" },
          { key: "sellerName", label: "售电公司名称" },
          { key: "period", label: "时段" },
          { key: "dayAheadVolume", label: "日前电量（MWh）" },
          { key: "dayAheadPrice", label: "日前统一结算点电价（元/MWh）" },
          { key: "dayAheadFee", label: "日前电费（元）" },
          { key: "feeSubtotal", label: "电费小计（元）" },
          { key: "remark", label: "备注" },
        ],
      };
    }

    if (typeLabel === "实时") {
      return {
        minWidth: 1260,
        columns: [
          { key: "settlementDate", label: "结算日期" },
          { key: "sellerName", label: "售电公司名称" },
          { key: "period", label: "时段" },
          { key: "realTimeVolume", label: "实时电量（MWh）" },
          { key: "realTimePrice", label: "实时统一结算点电价（元/MWh）" },
          { key: "realTimeFee", label: "实时电费（元）" },
          { key: "feeSubtotal", label: "电费小计（元）" },
          { key: "remark", label: "备注" },
        ],
      };
    }

    if (typeLabel === "日前申报偏差") {
      return {
        minWidth: 1260,
        columns: [
          { key: "settlementDate", label: "结算日期" },
          { key: "sellerName", label: "售电公司名称" },
          { key: "period", label: "时段" },
          { key: "deviationVolume", label: "偏差电量（MWh）" },
          { key: "deviationPrice", label: "偏差电价（元/MWh）" },
          { key: "deviationFee", label: "偏差电费（元）" },
          { key: "feeSubtotal", label: "电费小计（元）" },
          { key: "remark", label: "备注" },
        ],
      };
    }

    return {
      minWidth: 2620,
      columns: [
        { key: "settlementDate", label: "结算日期" },
        { key: "sellerName", label: "售电公司名称" },
        { key: "period", label: "时段" },
        { key: "actualUsage", label: "实际用电量（MWh）" },
        { key: "mediumLongTermVolume", label: "中长期合同电量（MWh）" },
        { key: "mediumLongTermPrice", label: "中长期结算电价（元/MWh）" },
        { key: "mediumLongTermFee", label: "中长期电费（元）" },
        { key: "dayAheadVolume", label: "日前电量（MWh）" },
        { key: "dayAheadPrice", label: "日前结算电价（元/MWh）" },
        { key: "dayAheadFee", label: "日前电费（元）" },
        { key: "realTimeVolume", label: "实时电量（MWh）" },
        { key: "realTimePrice", label: "实时结算电价（元/MWh）" },
        { key: "realTimeFee", label: "实时电费（元）" },
        { key: "deviationVolume", label: "日前申报偏差电量（MWh）" },
        { key: "deviationPrice", label: "日前申报偏差电价（元/MWh）" },
        { key: "deviationFee", label: "日前申报偏差电费（元）" },
        { key: "feeSubtotal", label: "电费小计（元）" },
        { key: "remark", label: "备注" },
      ],
    };
  }

  function buildHunanDailySettlementTable(rows) {
    var typeLabel = getHunanDailySelectedSettlementType();
    var schema = getHunanDailySettlementTableSchema(typeLabel);

    return {
      columns: schema.columns,
      rows: rows.map(mapHunanDailySettlementDisplayRow),
      minWidth: schema.minWidth,
      enableColumnDrag: true,
    };
  }

  function renderHunanDailySettlementTypePanel() {
    var pageData = getSettlementViewPageData("日清算", "");
    var activeType = getHunanDailySelectedSettlementType();
    var documentTitle = pageData.documentTitle || "湖南交易中心日清算清分单据";

    return (
      '<section class="panel hn-settlement-type-panel">' +
      '<div class="section-heading">' +
      '<div class="section-heading-title">结算类型切换</div>' +
      '<div class="section-subtitle">' +
      escapeHtml(documentTitle + "，" + getHunanDailySettlementTypeDescription(activeType)) +
      "</div></div>" +
      '<div class="hn-settlement-type-tabs">' +
      getHunanDailySettlementTypeOptions()
        .map(function mapType(typeLabel) {
          return (
            '<button class="hn-settlement-type-tab ' +
            (typeLabel === activeType ? "active" : "") +
            '" data-hunan-settlement-type="' +
            escapeHtml(typeLabel) +
            '">' +
            escapeHtml(typeLabel) +
            "</button>"
          );
        })
        .join("") +
      "</div></section>"
    );
  }

  function renderHunanDailySettlementContent() {
    var pageData = getSettlementViewPageData("日清算", "");
    var rows = getHunanDailySettlementRows();

    if (!rows.length) {
      return renderTradeCenterPageEmptyPanel(pageData.emptyText || "当前筛选条件下暂无湖南日清算明细数据。") + renderSettlementFileTableSection(
        "settlement-hunan-daily-files-empty",
        "原始 PDF 文件",
        "获取时间",
        pageData.fileList,
      );
    }

    return (
      renderHunanDailySettlementTypePanel() +
      renderSettlementTableSection(
        "日清算结果明细",
        "settlement-hunan-daily-detail-table-" + getHunanDailySelectedSettlementType(),
        buildHunanDailySettlementTable(rows),
        "按结算时段展示用电量、电价、电费及各结算类型费用明细",
      ) +
      renderSettlementFileTableSection(
        "settlement-hunan-daily-files",
        "原始 PDF 文件",
        "获取时间",
        pageData.fileList,
      )
    );
  }

  function getHunanMonthlySettlementDetailRows() {
    var pageData = getSettlementViewPageData("月结算", "售电公司");
    var defaultMonth = (pageData.filters && pageData.filters.month) || "";

    if (state.settlement.filters.monthlyMonth !== defaultMonth) {
      return [];
    }

    return pageData.tableData || [];
  }

  function buildHunanMonthlySettlementSummaryCards(summary) {
    var settlementFee = Number(summary.settlementFee || 0);

    return [
      { label: "结算电量", value: formatFixedNumber(summary.settlementPower, 3), unit: "MWh", compact: false },
      { label: "合同电量", value: formatFixedNumber(summary.contractPower, 3), unit: "MWh", compact: false },
      { label: "偏差电量", value: formatFixedNumber(summary.deviationPower, 3), unit: "MWh", compact: false },
      {
        label: "结算电费",
        value: formatFixedNumber(settlementFee, 2),
        unit: "元",
        compact: false,
        valueClassName: settlementFee < 0 ? "summary-card-value-negative" : "",
      },
    ];
  }

  function mapHunanMonthlySettlementDisplayRow(row) {
    var isTotalRow = row.subjectCode === "合计" || row.subjectName === "售电公司月结算合计" || row.remark === "合计";
    var totalClass = isTotalRow ? "settlement-total-cell" : "";

    return {
      subjectCode: createSettlementTextCell(row.subjectCode, totalClass),
      subjectName: createSettlementTextCell(row.subjectName, totalClass),
      tradePlanPower: createSettlementNumberCell(row.tradePlanPower, 3, totalClass),
      settlementPowerOrCapacity: createSettlementNumberCell(row.settlementPowerOrCapacity, 3, totalClass),
      settlementPriceOrAverage: createSettlementNumberCell(row.settlementPriceOrAverage, 3, totalClass),
      settlementFee: createSettlementNumberCell(row.settlementFee, 2, totalClass),
      remark: createSettlementTextCell(row.remark, totalClass),
    };
  }

  function buildHunanMonthlySettlementTable(rows) {
    return {
      columns: [
        { key: "subjectCode", label: "结算科目编码" },
        { key: "subjectName", label: "结算科目" },
        { key: "tradePlanPower", label: "交易计划电量" },
        { key: "settlementPowerOrCapacity", label: "结算电量 / 容量" },
        { key: "settlementPriceOrAverage", label: "结算电价 / 均价" },
        { key: "settlementFee", label: "结算电费" },
        { key: "remark", label: "备注" },
      ],
      rows: rows.map(mapHunanMonthlySettlementDisplayRow),
      minWidth: 1520,
      enableColumnDrag: true,
    };
  }

  function renderHunanMonthlySellerContent() {
    var pageData = getSettlementViewPageData("月结算", "售电公司");
    var summary = pageData.settlementSummary || {};
    var detailRows = getHunanMonthlySettlementDetailRows();
    var subtitle = "按结算科目展示交易计划电量、结算电量/容量、结算电价/均价及结算电费";

    if (summary.settlementMonth) {
      subtitle += "，对应结算单月份：" + summary.settlementMonth;
    }
    if (summary.settlementBasisNo) {
      subtitle += "，结算依据：" + summary.settlementBasisNo;
    }

    if (!detailRows.length) {
      return renderTradeCenterPageEmptyPanel(pageData.emptyText || "当前月份暂无湖南售电公司月结算数据。") + renderSettlementFileTableSection(
        "settlement-hunan-monthly-seller-files-empty",
        "原始 PDF 文件",
        "获取时间",
        pageData.fileList,
      );
    }

    return (
      renderSummaryCards(buildHunanMonthlySettlementSummaryCards(summary)) +
      renderSettlementTableSection(
        "购售侧结算科目明细表",
        "settlement-hunan-monthly-seller-table",
        buildHunanMonthlySettlementTable(detailRows),
        subtitle,
      ) +
      renderSettlementFileTableSection(
        "settlement-hunan-monthly-seller-files",
        "原始 PDF 文件",
        "获取时间",
        pageData.fileList,
      )
    );
  }

  function renderHunanMonthlyConsumerEmpty() {
    return renderTradeCenterPageEmptyPanel(INFO_DISCLOSURE_EMPTY_MESSAGE);
  }

  function getShaanxiDailySettlementTypeOptions() {
    var pageData = getSettlementViewPageData("日清算", "");
    return (pageData.filters && pageData.filters.settlementTypeOptions) || ["全部", "中长期合同", "省内日前", "省内实时"];
  }

  function getShaanxiDailySelectedSettlementType() {
    var typeOptions = getShaanxiDailySettlementTypeOptions();
    var currentType = state.settlement.filters.dailyStatementType;

    if (typeOptions.indexOf(currentType) < 0) {
      state.settlement.filters.dailyStatementType = typeOptions[0];
    }

    return state.settlement.filters.dailyStatementType;
  }

  function getShaanxiDailyDataTypeOptions() {
    var pageData = getSettlementViewPageData("日清算", "");
    return (pageData.filters && pageData.filters.dataTypeOptions) || ["全部", "日清分账单", "Excel 文件", "解析结果"];
  }

  function matchesShaanxiDailyDataType(dataType) {
    if (!dataType || dataType === "全部") {
      return true;
    }

    if (dataType === "Excel 文件") {
      return false;
    }

    return dataType === "日清分账单" || dataType === "解析结果";
  }

  function getShaanxiDailySettlementTypeDescription(typeLabel) {
    var descriptionMap = {
      "全部": "展示完整用户侧日清分账单字段，便于对照 Excel 解析结果核验。",
      "中长期合同": "重点展示实际用电量、省内净合同、省间净合同及中长期相关费用字段。",
      "省内日前": "重点展示实际用电量、日前电量、统一结算点电价及日前电费。",
      "省内实时": "重点展示实际用电量、实时电量、统一结算点电价及实时电费。",
    };

    return descriptionMap[typeLabel] || descriptionMap["全部"];
  }

  function buildShaanxiDailySettlementTotalRow(rows) {
    var filters = state.settlement.filters;
    var rangeText =
      filters.dailyRange.start === filters.dailyRange.end
        ? filters.dailyRange.start
        : filters.dailyRange.start + " 至 " + filters.dailyRange.end;

    return rows.reduce(
      function reduce(result, row) {
        result.actualUsage += Number(row.actualUsage || 0);
        result.intraProvinceNetContractVolume += Number(row.intraProvinceNetContractVolume || 0);
        result.intraProvinceNetContractFee += Number(row.intraProvinceNetContractFee || 0);
        result.intraProvinceContractFee += Number(row.intraProvinceContractFee || 0);
        result.interProvinceNetContractVolume += Number(row.interProvinceNetContractVolume || 0);
        result.interProvinceNetContractFee += Number(row.interProvinceNetContractFee || 0);
        result.dayAheadVolume += Number(row.dayAheadVolume || 0);
        result.dayAheadFee += Number(row.dayAheadFee || 0);
        result.realTimeVolume += Number(row.realTimeVolume || 0);
        result.realTimeFee += Number(row.realTimeFee || 0);
        return result;
      },
      {
        settlementDate: rangeText,
        settlementUnitName: (rows[0] && rows[0].settlementUnitName) || "合计",
        period: "合计",
        timePoint: "",
        actualUsage: 0,
        intraProvinceNetContractVolume: 0,
        intraProvinceNetContractFee: 0,
        mediumLongTermReferencePrice: null,
        intraProvinceContractFee: 0,
        interProvinceNetContractVolume: 0,
        interProvinceNetContractFee: 0,
        dayAheadVolume: 0,
        dayAheadUnifiedPrice: null,
        dayAheadFee: 0,
        realTimeVolume: 0,
        realTimeUnifiedPrice: null,
        realTimeFee: 0,
        remark: "合计",
      }
    );
  }

  function getShaanxiDailySettlementRows() {
    var pageData = getSettlementViewPageData("日清算", "");
    var filters = state.settlement.filters;

    if (!matchesShaanxiDailyDataType(filters.dailyDataType)) {
      return [];
    }

    return (pageData.tableData || []).filter(function filterRow(row) {
      return (
        row.settlementDate >= filters.dailyRange.start &&
        row.settlementDate <= filters.dailyRange.end &&
        includesKeyword(row.settlementUnitName, filters.dailySettlementUnitName)
      );
    });
  }

  function mapShaanxiDailySettlementDisplayRow(row) {
    var isTotalRow = row.period === "合计";
    var totalClass = isTotalRow ? "settlement-total-cell" : "";
    var periodText = isTotalRow ? "合计" : row.period + " / " + row.timePoint;

    return {
      settlementDate: createSettlementTextCell(row.settlementDate, totalClass),
      settlementUnitName: createSettlementTextCell(row.settlementUnitName, totalClass),
      period: createSettlementTextCell(periodText, totalClass),
      actualUsage: createSettlementNumberCell(row.actualUsage, 3, totalClass),
      intraProvinceNetContractVolume: createSettlementNumberCell(row.intraProvinceNetContractVolume, 3, totalClass),
      intraProvinceNetContractFee: createSettlementNumberCell(row.intraProvinceNetContractFee, 2, totalClass),
      mediumLongTermReferencePrice: isTotalRow
        ? createSettlementTextCell("-", totalClass)
        : createSettlementNumberCell(row.mediumLongTermReferencePrice, 3, totalClass),
      intraProvinceContractFee: createSettlementNumberCell(row.intraProvinceContractFee, 2, totalClass),
      interProvinceNetContractVolume: createSettlementNumberCell(row.interProvinceNetContractVolume, 3, totalClass),
      interProvinceNetContractFee: createSettlementNumberCell(row.interProvinceNetContractFee, 2, totalClass),
      dayAheadVolume: createSettlementNumberCell(row.dayAheadVolume, 3, totalClass),
      dayAheadUnifiedPrice: isTotalRow
        ? createSettlementTextCell("-", totalClass)
        : createSettlementNumberCell(row.dayAheadUnifiedPrice, 3, totalClass),
      dayAheadFee: createSettlementNumberCell(row.dayAheadFee, 2, totalClass),
      realTimeVolume: createSettlementNumberCell(row.realTimeVolume, 3, totalClass),
      realTimeUnifiedPrice: isTotalRow
        ? createSettlementTextCell("-", totalClass)
        : createSettlementNumberCell(row.realTimeUnifiedPrice, 3, totalClass),
      realTimeFee: createSettlementNumberCell(row.realTimeFee, 2, totalClass),
      remark: createSettlementTextCell(row.remark, totalClass),
    };
  }

  function getShaanxiDailySettlementTableSchema(typeLabel) {
    if (typeLabel === "中长期合同") {
      return {
        minWidth: 1720,
        columns: [
          { key: "settlementDate", label: "结算日期" },
          { key: "settlementUnitName", label: "结算单元名称" },
          { key: "period", label: "时段" },
          { key: "actualUsage", label: "实际用电量（MWh）" },
          { key: "intraProvinceNetContractVolume", label: "省内净合同电量（MWh）" },
          { key: "intraProvinceNetContractFee", label: "省内净合同电费（元）" },
          { key: "mediumLongTermReferencePrice", label: "中长期结算参考点电价（元/MWh）" },
          { key: "intraProvinceContractFee", label: "省内合约电费（元）" },
          { key: "interProvinceNetContractVolume", label: "省间净合同电量（MWh）" },
          { key: "interProvinceNetContractFee", label: "省间净合同电费（元）" },
          { key: "remark", label: "备注" },
        ],
      };
    }

    if (typeLabel === "省内日前") {
      return {
        minWidth: 1340,
        columns: [
          { key: "settlementDate", label: "结算日期" },
          { key: "settlementUnitName", label: "结算单元名称" },
          { key: "period", label: "时段" },
          { key: "actualUsage", label: "实际用电量（MWh）" },
          { key: "dayAheadVolume", label: "日前电量（MWh）" },
          { key: "dayAheadUnifiedPrice", label: "日前统一结算点电价（元/MWh）" },
          { key: "dayAheadFee", label: "日前电费（元）" },
          { key: "remark", label: "备注" },
        ],
      };
    }

    if (typeLabel === "省内实时") {
      return {
        minWidth: 1340,
        columns: [
          { key: "settlementDate", label: "结算日期" },
          { key: "settlementUnitName", label: "结算单元名称" },
          { key: "period", label: "时段" },
          { key: "actualUsage", label: "实际用电量（MWh）" },
          { key: "realTimeVolume", label: "实时电量（MWh）" },
          { key: "realTimeUnifiedPrice", label: "实时统一结算点电价（元/MWh）" },
          { key: "realTimeFee", label: "实时电费（元）" },
          { key: "remark", label: "备注" },
        ],
      };
    }

    return {
      minWidth: 2580,
      columns: [
        { key: "settlementDate", label: "结算日期" },
        { key: "settlementUnitName", label: "结算单元名称" },
        { key: "period", label: "时段" },
        { key: "actualUsage", label: "实际用电量（MWh）" },
        { key: "intraProvinceNetContractVolume", label: "省内净合同电量（MWh）" },
        { key: "intraProvinceNetContractFee", label: "省内净合同电费（元）" },
        { key: "mediumLongTermReferencePrice", label: "中长期结算参考点电价（元/MWh）" },
        { key: "intraProvinceContractFee", label: "省内合约电费（元）" },
        { key: "interProvinceNetContractVolume", label: "省间净合同电量（MWh）" },
        { key: "interProvinceNetContractFee", label: "省间净合同电费（元）" },
        { key: "dayAheadVolume", label: "日前电量（MWh）" },
        { key: "dayAheadUnifiedPrice", label: "日前统一结算点电价（元/MWh）" },
        { key: "dayAheadFee", label: "日前电费（元）" },
        { key: "realTimeVolume", label: "实时电量（MWh）" },
        { key: "realTimeUnifiedPrice", label: "实时统一结算点电价（元/MWh）" },
        { key: "realTimeFee", label: "实时电费（元）" },
        { key: "remark", label: "备注" },
      ],
    };
  }

  function buildShaanxiDailySettlementTable(rows) {
    var typeLabel = getShaanxiDailySelectedSettlementType();
    var schema = getShaanxiDailySettlementTableSchema(typeLabel);

    return {
      columns: schema.columns,
      rows: rows.map(mapShaanxiDailySettlementDisplayRow),
      minWidth: schema.minWidth,
      enableColumnDrag: true,
    };
  }

  function renderShaanxiDailySettlementTypePanel() {
    var pageData = getSettlementViewPageData("日清算", "");
    var activeType = getShaanxiDailySelectedSettlementType();
    var documentTitle = pageData.documentTitle || "2026-04-30用户侧日清分账单";

    return (
      '<section class="panel hn-settlement-type-panel">' +
      '<div class="section-heading">' +
      '<div class="section-heading-title">结算类型切换</div>' +
      '<div class="section-subtitle">' +
      escapeHtml(documentTitle + "，" + getShaanxiDailySettlementTypeDescription(activeType)) +
      "</div></div>" +
      '<div class="hn-settlement-type-tabs">' +
      getShaanxiDailySettlementTypeOptions()
        .map(function mapType(typeLabel) {
          return (
            '<button class="hn-settlement-type-tab ' +
            (typeLabel === activeType ? "active" : "") +
            '" data-shaanxi-settlement-type="' +
            escapeHtml(typeLabel) +
            '">' +
            escapeHtml(typeLabel) +
            "</button>"
          );
        })
        .join("") +
      "</div></section>"
    );
  }

  function renderShaanxiDailySettlementContent() {
    var pageData = getSettlementViewPageData("日清算", "");
    var detailRows = getShaanxiDailySettlementRows();
    var rowsWithTotal = detailRows.length ? detailRows.concat([buildShaanxiDailySettlementTotalRow(detailRows)]) : [];

    if (!rowsWithTotal.length) {
      return (
        renderShaanxiDailySettlementTypePanel() +
        renderTradeCenterPageEmptyPanel(pageData.emptyText || "当前筛选条件下暂无陕西日清算分账单数据。") +
        renderSettlementFileTableSection(
          "settlement-shaanxi-daily-files-empty",
          "原始 Excel 文件",
          "获取时间",
          pageData.fileList,
        )
      );
    }

    return (
      renderShaanxiDailySettlementTypePanel() +
      renderSettlementTableSection(
        "日清算结果明细",
        "settlement-shaanxi-daily-table-" + getShaanxiDailySelectedSettlementType(),
        buildShaanxiDailySettlementTable(rowsWithTotal),
        "按 96 个 15 分钟时段展示实际用电量、中长期合同、日前与实时结算明细",
      ) +
      renderSettlementFileTableSection(
        "settlement-shaanxi-daily-files",
        "原始 Excel 文件",
        "获取时间",
        pageData.fileList,
      )
    );
  }

  function getShaanxiMonthlySettlementDetailRows() {
    var pageData = getSettlementViewPageData("月结算", "售电公司");
    var defaultMonth = (pageData.filters && pageData.filters.month) || "";

    if (state.settlement.filters.monthlyMonth !== defaultMonth) {
      return [];
    }

    return pageData.tableData || [];
  }

  function buildShaanxiMonthlySettlementSummaryCards(summary) {
    return [
      { label: "当年实际用电量", value: formatSettlementMetricValue(summary.annualActualUsage, 3), unit: "MWh", compact: false },
      { label: "中长期交易电量", value: formatSettlementMetricValue(summary.mediumLongTermTradingPower, 3), unit: "MWh", compact: false },
      { label: "中长期占实际用电比例", value: formatSettlementMetricValue(summary.mediumLongTermUsageRatio, 2), unit: "%", compact: false },
      { label: "度电收益", value: formatSettlementMetricValue(summary.unitRevenue, 2), unit: "厘", compact: false },
    ];
  }

  function mapShaanxiMonthlySettlementDisplayRow(row) {
    var isTotalRow = row.subjectCode === "合计" || row.subjectName === "售电公司月结算合计" || row.remark === "合计";
    var totalClass = isTotalRow ? "settlement-total-cell" : "";

    return {
      subjectCode: createSettlementTextCell(row.subjectCode, totalClass),
      subjectName: createSettlementTextCell(row.subjectName, totalClass),
      retailUserName: createSettlementTextCell(row.retailUserName, totalClass),
      accountOrMeterNo: createSettlementTextCell(row.accountOrMeterNo, totalClass),
      contractPeriod: createSettlementTextCell(row.contractPeriod, totalClass),
      actualUsage: createSettlementNullableNumberCell(row.actualUsage, 3, totalClass),
      contractPower: createSettlementNullableNumberCell(row.contractPower, 3, totalClass),
      settlementPowerOrCapacity: createSettlementNullableNumberCell(row.settlementPowerOrCapacity, 3, totalClass),
      settlementPrice: createSettlementNullableNumberCell(row.settlementPrice, 3, totalClass),
      settlementFee: createSettlementNullableNumberCell(row.settlementFee, 2, totalClass),
      remark: createSettlementTextCell(row.remark, totalClass),
    };
  }

  function buildShaanxiMonthlySettlementTable(rows) {
    return {
      columns: [
        { key: "subjectCode", label: "结算科目编码" },
        { key: "subjectName", label: "结算科目" },
        { key: "retailUserName", label: "零售用户名称" },
        { key: "accountOrMeterNo", label: "户号 / 电源编号 / 计量点编号" },
        { key: "contractPeriod", label: "合同时段" },
        { key: "actualUsage", label: "实际用电量" },
        { key: "contractPower", label: "合同电量" },
        { key: "settlementPowerOrCapacity", label: "结算电量 / 容量" },
        { key: "settlementPrice", label: "结算电价" },
        { key: "settlementFee", label: "结算电费" },
        { key: "remark", label: "备注" },
      ],
      rows: rows.map(mapShaanxiMonthlySettlementDisplayRow),
      minWidth: 2120,
      enableColumnDrag: true,
    };
  }

  function renderShaanxiMonthlySellerContent() {
    var pageData = getSettlementViewPageData("月结算", "售电公司");
    var summary = pageData.settlementSummary || {};
    var detailRows = getShaanxiMonthlySettlementDetailRows();

    if (!detailRows.length) {
      return renderTradeCenterPageEmptyPanel(pageData.emptyText || "当前月份暂无陕西售电公司月结算数据。") + renderSettlementFileTableSection(
        "settlement-shaanxi-monthly-seller-files-empty",
        "原始 PDF 文件",
        "获取时间",
        pageData.fileList,
      );
    }

    return (
      renderSummaryCards(buildShaanxiMonthlySettlementSummaryCards(summary)) +
      renderSettlementTableSection(
        "售电公司交易结算科目明细表",
        "settlement-shaanxi-monthly-seller-table",
        buildShaanxiMonthlySettlementTable(detailRows),
        "按结算科目展示零售用户、户号、合同时段、实际用电量、合同电量、结算电量/容量、结算电价及结算电费",
      ) +
      renderSettlementFileTableSection(
        "settlement-shaanxi-monthly-seller-files",
        "原始 PDF 文件",
        "获取时间",
        pageData.fileList,
      )
    );
  }

  function getShaanxiMonthlyConsumerBaseRows() {
    var pageData = getSettlementViewPageData("月结算", "用电企业");
    var filters = state.settlement.filters;

    return (pageData.tableData || []).filter(function filterRow(row) {
      return (
        row.month === filters.monthlyMonth &&
        includesKeyword(row.companyName, filters.monthlyEnterpriseName) &&
        includesKeyword(row.accountNo, filters.monthlyEnterpriseAccountNo)
      );
    });
  }

  function buildShaanxiMonthlyConsumerHistory(rows) {
    var months = getSettlementRecentMonths(state.settlement.filters.monthlyMonth, 6);
    var factors = [0.84, 0.88, 0.92, 0.96, 0.99, 1];

    return months.map(function mapMonth(month, monthIndex) {
      var item = {
        month: month,
        energy: 0,
        fee: 0,
      };

      rows.forEach(function eachRow(row, rowIndex) {
        var factor = factors[monthIndex] + rowIndex * 0.008;
        item.energy += Math.round(Number(row.settlementEnergy || 0) * factor);
        item.fee += Math.round(Number(row.totalFee || 0) * factor);
      });

      return item;
    });
  }

  function renderShaanxiMonthlyConsumerContent() {
    var pageData = getSettlementViewPageData("月结算", "用电企业");
    var baseRows = getShaanxiMonthlyConsumerBaseRows();

    if (!baseRows.length) {
      return renderTradeCenterPageEmptyPanel(pageData.emptyText || "当前月份暂无陕西用电企业月结算数据。");
    }

    var historyRows = buildShaanxiMonthlyConsumerHistory(baseRows);
    var mappedRows = baseRows.map(function mapRow(row, index) {
      var deviationEnergy = Math.round(Number(row.settlementEnergy || 0) * 0.027 + index * 12);
      return {
        month: row.month,
        companyName: row.companyName,
        accountNo: row.accountNo,
        monthlyEnergy: Number(row.settlementEnergy || 0),
        monthlyFee: Number(row.totalFee || 0),
        deviationEnergy: deviationEnergy,
        deviationFee: Number(row.deviationFee || 0),
        status: getSettlementStatusCell(row.invoiceStatus),
        updatedAt: pageData.updateTime || "--",
        actions: createTableActionCell("sx-monthly-consumer-" + row.companyCode, [
          { label: "查看详情", action: "view-record-detail" },
          { label: "下载", action: "open-download" },
        ]),
      };
    });

    return (
      renderSettlementLineChartSection(
        "settlement-shaanxi-monthly-consumer-energy-chart",
        "月度电量趋势图",
        "按结算月份展示用电企业月度电量变化",
        "MWh",
        historyRows.map(function mapRow(row) {
          return row.month.slice(5);
        }),
        [
          {
            id: "sx-monthly-consumer-energy",
            label: "月度电量",
            color: "#1677FF",
            values: historyRows.map(function mapRow(row) {
              return row.energy;
            }),
          },
        ],
      ) +
      renderSettlementLineChartSection(
        "settlement-shaanxi-monthly-consumer-fee-chart",
        "月度电费趋势图",
        "按结算月份展示用电企业月度电费变化",
        "元",
        historyRows.map(function mapRow(row) {
          return row.month.slice(5);
        }),
        [
          {
            id: "sx-monthly-consumer-fee",
            label: "月度电费",
            color: "#2FCB8F",
            values: historyRows.map(function mapRow(row) {
              return row.fee;
            }),
          },
        ],
      ) +
      renderSettlementTableSection(
        "用电企业月结算明细表",
        "settlement-shaanxi-monthly-consumer-table",
        buildSettlementTable(
          [
            { key: "month", label: "结算月份" },
            { key: "companyName", label: "用电企业名称" },
            { key: "accountNo", label: "用户户号" },
            { key: "monthlyEnergy", label: "月度电量" },
            { key: "monthlyFee", label: "月度电费" },
            { key: "deviationEnergy", label: "偏差电量" },
            { key: "deviationFee", label: "偏差费用" },
            { key: "status", label: "结算状态" },
            { key: "updatedAt", label: "更新时间" },
            { key: "actions", label: "操作", sortable: false },
          ],
          mappedRows,
          1680,
        ),
      )
    );
  }

  function renderUnifiedSettlementContent() {
    var centerKey = getSelectedTradeCenterKey();
    var secondaryTab = getSettlementActiveSecondaryTab();

    if (centerKey === "hunan") {
      if (state.settlement.activeTab === "日清算") {
        return renderHunanDailySettlementContent();
      }
      return renderHunanMonthlySellerContent();
    }

    if (state.settlement.activeTab === "日清算") {
      return renderShaanxiDailySettlementContent();
    }
    if (centerKey === "shaanxi") {
      return renderShaanxiMonthlySellerContent();
    }
    if (secondaryTab === "用电企业") {
      return renderShaanxiMonthlyConsumerContent();
    }
    return renderShaanxiMonthlySellerContent();
  }

  function renderSummaryCards(cards, extraClass) {
    return (
      '<section class="summary-card-grid ' +
      escapeHtml(extraClass || "") +
      '">' +
      (cards || [])
        .map(function mapCard(card) {
          var valueText = card.value === null || card.value === undefined ? "" : String(card.value);
          var compactValue =
            typeof card.compact === "boolean" ? card.compact : valueText.length >= 12 || /[-:]/.test(valueText) || !/[0-9]/.test(valueText);
          var valueClassNames = ["summary-card-value"];
          if (compactValue) {
            valueClassNames.push("summary-card-value-compact");
          }
          if (card.valueClassName) {
            valueClassNames.push(card.valueClassName);
          }
          return (
            '<div class="panel summary-card"><div class="summary-card-label">' +
            escapeHtml(card.label) +
            '</div><div class="' +
            escapeHtml(valueClassNames.join(" ")) +
            '">' +
            escapeHtml(valueText) +
            '<span class="summary-card-unit">' +
            escapeHtml(card.unit || "") +
            "</span></div></div>"
          );
        })
        .join("") +
      "</section>"
    );
  }

  function renderSimpleStatusBar(status) {
    if (!status || !status.updatedAt) {
      return "";
    }

    return renderDataUpdateBar({
      updatedAt: status.updatedAt,
      source: status.source || "系统",
      hasCompare: false,
      showTaskEntry: false,
      actions: [],
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function matchesOption(value, selectedValue, emptyLabel) {
    return !selectedValue || selectedValue === "全部" || selectedValue === emptyLabel || value === selectedValue;
  }

  function isDateWithinRange(value, range) {
    if (!value || value === "--" || !range || !range.start || !range.end) {
      return false;
    }
    var dateValue = String(value).slice(0, 10);
    return dateValue >= range.start && dateValue <= range.end;
  }

  function createBadgeCell(text, tone, sortValue) {
    return {
      text: text,
      badge: true,
      tone: tone,
      sortValue: sortValue !== undefined ? sortValue : text,
      copyable: false,
    };
  }

  function createStyledCell(text, className, sortValue) {
    return {
      text: text,
      className: className,
      sortValue: sortValue !== undefined ? sortValue : text,
    };
  }

  function compareDateAsc(a, b) {
    if (a === b) {
      return 0;
    }
    return a > b ? 1 : -1;
  }

  function aggregateByDate(records, valueKey) {
    var grouped = {};
    (records || []).forEach(function eachRecord(record) {
      grouped[record.date] = grouped[record.date] || 0;
      grouped[record.date] += Number(record[valueKey] || 0);
    });

    var cumulative = 0;
    return Object.keys(grouped)
      .sort(compareDateAsc)
      .map(function mapDate(date) {
        cumulative += grouped[date];
        return {
          date: date,
          dailyValue: grouped[date],
          cumulativeValue: cumulative,
        };
      });
  }

  function calculateMaxDrawdown(values) {
    var peak = null;
    var maxDrawdown = 0;

    (values || []).forEach(function eachValue(value) {
      if (peak === null || value > peak) {
        peak = value;
      }
      if (peak > 0) {
        maxDrawdown = Math.max(maxDrawdown, ((peak - value) / peak) * 100);
      }
    });

    return Number(maxDrawdown.toFixed(1));
  }

  function renderSectionHeading(title, subtitle) {
    var subtitleHtml = subtitle ? '<div class="section-subtitle">' + escapeHtml(subtitle) + "</div>" : "";
    return '<div class="section-heading"><div class="section-heading-title">' + escapeHtml(title) + "</div>" + subtitleHtml + "</div>";
  }

  function renderChartSection(title, bodyHtml, subtitle) {
    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
      renderSectionHeading(title, subtitle) +
      bodyHtml +
      "</div></section>"
    );
  }

  function renderBarChart(options) {
    var values = (options.values || []).filter(function filterValue(value) {
      return typeof value === "number";
    });

    if (!values.length) {
      return renderEmptyState({
        message: "当前图表暂无可展示数据，请调整筛选条件后重试",
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      });
    }

    var width = 1040;
    var height = 320;
    var margin = { top: 24, right: 28, bottom: 54, left: 64 };
    var innerWidth = width - margin.left - margin.right;
    var innerHeight = height - margin.top - margin.bottom;
    var labels = options.labels || [];
    var maxAbs = Math.max.apply(
      null,
      values.map(function mapValue(value) {
        return Math.abs(value);
      }),
    );
    var base = maxAbs >= 100000 ? 20000 : maxAbs >= 10000 ? 2000 : maxAbs >= 1000 ? 200 : maxAbs >= 100 ? 20 : 5;
    var roundedMax = Math.max(base, Math.ceil((maxAbs * 1.15) / base) * base);
    var ticks = [-roundedMax, -roundedMax / 2, 0, roundedMax / 2, roundedMax];
    var xStep = labels.length ? innerWidth / labels.length : innerWidth;

    function xToCenter(index) {
      return margin.left + index * xStep + xStep / 2;
    }

    function yToPx(value) {
      return margin.top + innerHeight - ((value + roundedMax) / (roundedMax * 2)) * innerHeight;
    }

    var gridHtml = ticks
      .map(function mapTick(tick) {
        var y = yToPx(tick);
        var extraClass = tick === 0 ? "grid-line-zero" : "";
        return (
          '<line class="grid-line ' +
          extraClass +
          '" x1="' +
          margin.left +
          '" x2="' +
          (width - margin.right) +
          '" y1="' +
          y +
          '" y2="' +
          y +
          '"></line><text class="axis-label" x="' +
          (margin.left - 10) +
          '" y="' +
          (y + 4) +
          '" text-anchor="end">' +
          formatInteger(tick) +
          "</text>"
        );
      })
      .join("");

    var xLabelsHtml = labels
      .map(function mapLabel(label, index) {
        if (index % (options.xLabelEvery || 1) !== 0 && index !== labels.length - 1) {
          return "";
        }
        return '<text class="time-label" x="' + xToCenter(index) + '" y="' + (height - 14) + '" text-anchor="middle">' + escapeHtml(label) + "</text>";
      })
      .join("");

    var barsHtml = (options.values || [])
      .map(function mapValue(value, index) {
        var y = value >= 0 ? yToPx(value) : yToPx(0);
        var zeroY = yToPx(0);
        var barHeight = Math.abs(zeroY - yToPx(value));
        var barWidth = Math.max(Math.min(xStep * 0.56, 24), 6);
        return (
          '<rect class="chart-bar" x="' +
          (xToCenter(index) - barWidth / 2) +
          '" y="' +
          y +
          '" width="' +
          barWidth +
          '" height="' +
          Math.max(barHeight, 2) +
          '" fill="' +
          escapeHtml(value >= 0 ? options.positiveColor || "#23C887" : options.negativeColor || "#FF4D4F") +
          '"></rect>'
        );
      })
      .join("");

    var hitAreasHtml = labels
      .map(function mapLabel(label, index) {
        return (
          '<rect class="chart-hit-rect" x="' +
          (margin.left + index * xStep) +
          '" y="' +
          margin.top +
          '" width="' +
          xStep +
          '" height="' +
          innerHeight +
          '"><title>' +
          escapeHtml(label + " " + formatSignedMoney(options.values[index]) + " 元") +
          "</title></rect>"
        );
      })
      .join("");

    return (
      '<div class="chart-canvas"><div class="chart-unit">' +
      escapeHtml(options.unit || "") +
      '</div><svg class="line-chart" viewBox="0 0 ' +
      width +
      " " +
      height +
      '">' +
      gridHtml +
      barsHtml +
      hitAreasHtml +
      xLabelsHtml +
      "</svg></div>"
    );
  }

  function getFetchMonitorRecords() {
    var filters = state.fetchMonitor.filters;
    return (fetchMonitorMock.records || []).filter(function filterRecord(record) {
      return (
        matchesOption(record.tradeCenter, filters.tradeCenter) &&
        matchesOption(record.status, filters.status) &&
        matchesOption(record.taskType, filters.taskType) &&
        isDateWithinRange(record.updatedAt, filters.dateRange)
      );
    });
  }

  function getFetchMonitorStatusCell(status) {
    var toneMap = {
      正常: "success",
      异常: "danger",
      取数中: "processing",
      未开始: "default",
    };
    return createBadgeCell(status, toneMap[status] || "default");
  }

  function getFetchMonitorSummaryCards(records) {
    var latestUpdatedAt = (records || []).reduce(function reduceLatest(result, record) {
      return !result || record.updatedAt > result ? record.updatedAt : result;
    }, "");
    var abnormalCenters = {};

    (records || []).forEach(function eachRecord(record) {
      if (record.status === "异常") {
        abnormalCenters[record.tradeCenter] = true;
      }
    });

    return [
      { label: "取数任务总数", value: String((records || []).length), unit: "项" },
      {
        label: "成功任务数",
        value: String(
          (records || []).filter(function filterRecord(record) {
            return record.status === "正常";
          }).length,
        ),
        unit: "项",
      },
      {
        label: "失败任务数",
        value: String(
          (records || []).filter(function filterRecord(record) {
            return record.status === "异常";
          }).length,
        ),
        unit: "项",
      },
      { label: "异常交易中心数", value: String(Object.keys(abnormalCenters).length), unit: "个" },
      { label: "最近更新时间", value: latestUpdatedAt || "--", unit: "" },
    ];
  }

  function getFetchMonitorTable() {
    return {
      columns: [
        { key: "tradeCenter", label: "交易中心" },
        { key: "dataType", label: "数据类型" },
        { key: "taskName", label: "任务名称" },
        { key: "taskType", label: "取数方式" },
        { key: "status", label: "取数状态" },
        { key: "lastFetchedAt", label: "最近取值时间" },
        { key: "updatedAt", label: "最近更新时间" },
        { key: "reason", label: "异常原因" },
        { key: "actions", label: "操作", sortable: false },
      ],
      rows: getFetchMonitorRecords().map(function mapRecord(record) {
        return {
          tradeCenter: record.tradeCenter,
          dataType: record.dataType,
          taskName: record.taskName,
          taskType: record.taskType,
          status: getFetchMonitorStatusCell(record.status),
          lastFetchedAt: record.lastFetchedAt,
          updatedAt: record.updatedAt,
          reason: record.reason,
          actions: createTableActionCell(record.id, [
            { label: "查看详情", action: "view-record-detail" },
            { label: "重新拉取", action: "retry-fetch-task" },
            { label: "查看日志", action: "view-fetch-log" },
          ]),
        };
      }),
      minWidth: 1540,
    };
  }

  function renderFetchMonitorPage() {
    var page = fetchMonitorMock || {};
    return (
      '<div class="page-stack">' +
      '<section class="page-header"><div class="page-title-block"><h1>' +
      escapeHtml(page.title || "取数监控") +
      '</h1><div class="page-description">' +
      escapeHtml(page.subtitle || "") +
      "</div></div></section>" +
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      renderBoundSelectFilter(
        "交易中心",
        state.fetchMonitor.filters.tradeCenter,
        (page.filters && page.filters.tradeCenterOptions) || [],
        "tradeCenter",
        "fetchMonitor",
        "filter-select-native",
      ) +
      renderBoundSelectFilter(
        "取数状态",
        state.fetchMonitor.filters.status,
        (page.filters && page.filters.statusOptions) || [],
        "status",
        "fetchMonitor",
        "filter-select-native",
      ) +
      renderBoundSelectFilter(
        "任务类型",
        state.fetchMonitor.filters.taskType,
        (page.filters && page.filters.taskTypeOptions) || [],
        "taskType",
        "fetchMonitor",
        "filter-select-native",
      ) +
      '<div class="info-filter-field"><span class="filter-label">日期范围：</span>' +
      renderInfoDatePicker("fetch-monitor-range", "range") +
      '</div></div><div class="info-filter-actions">' +
      renderUiActionButton("重置", "ghost", "reset-fetch-monitor") +
      renderUiActionButton("查询", "primary", "query-fetch-monitor") +
      "</div></section>" +
      renderSimpleStatusBar(page.status) +
      renderSectionHeading("监控指标概览", "展示当前筛选范围内的任务成功率、异常中心与最近更新时间") +
      renderSummaryCards(getFetchMonitorSummaryCards(getFetchMonitorRecords()), "summary-card-grid-5") +
      renderSectionTable("fetch-monitor-table", getFetchMonitorTable()) +
      "</div>"
    );
  }

  function getSimulationRiskCell(riskStatus) {
    var toneMap = {
      稳健: "success",
      关注: "warning",
      预警: "danger",
    };
    return createBadgeCell(riskStatus, toneMap[riskStatus] || "default");
  }

  function getSpotTradingSimulationRecords() {
    var filters = state.spotTradingSimulation.filters;
    return (simulationMock.spotTradingSimulation && simulationMock.spotTradingSimulation.records
      ? simulationMock.spotTradingSimulation.records
      : []
    ).filter(function filterRecord(record) {
      return (
        matchesOption(record.tradeCenter, filters.tradeCenter) &&
        matchesOption(record.strategyName, filters.strategyName) &&
        isDateWithinRange(record.date, filters.backtestRange)
      );
    });
  }

  function getSpotTradingSimulationSeries(records) {
    return aggregateByDate(records, "profit");
  }

  function getSpotTradingSimulationSummaryCards(records) {
    var dailySeries = getSpotTradingSimulationSeries(records);
    var cumulativeProfit = dailySeries.length ? dailySeries[dailySeries.length - 1].cumulativeValue : 0;
    var averageDailyProfit = dailySeries.length ? cumulativeProfit / dailySeries.length : 0;
    var winRate = dailySeries.length
      ? (dailySeries.filter(function filterItem(item) {
          return item.dailyValue > 0;
        }).length /
          dailySeries.length) *
        100
      : 0;
    var maxDrawdown = calculateMaxDrawdown(
      dailySeries.map(function mapItem(item) {
        return item.cumulativeValue;
      }),
    );
    var riskStatus = maxDrawdown >= 12 ? "预警" : maxDrawdown >= 7 ? "关注" : "稳健";

    return [
      { label: "累计收益", value: formatMoney(cumulativeProfit), unit: "元" },
      { label: "平均日收益", value: formatMoney(Math.round(averageDailyProfit)), unit: "元" },
      { label: "最大回撤", value: formatPercent(maxDrawdown, 1), unit: "" },
      { label: "胜率", value: formatPercent(winRate, 1), unit: "" },
      { label: "风险状态", value: riskStatus, unit: "" },
    ];
  }

  function renderSpotTradingSimulationTrendChart(records) {
    var dailySeries = getSpotTradingSimulationSeries(records);
    return renderChartWithMarks({
      chartId: "spot-trading-simulation-trend",
      title: "策略收益趋势图",
      unit: "元",
      labels: dailySeries.map(function mapItem(item) {
        return item.date.slice(5);
      }),
      series: [
        {
          id: "cumulative-profit",
          label: "累计收益",
          color: "#1677FF",
          values: dailySeries.map(function mapItem(item) {
            return item.cumulativeValue;
          }),
        },
      ],
      xLabelEvery: dailySeries.length > 7 ? 2 : 1,
      hiddenSeries: getChartHiddenState("spot-trading-simulation-trend"),
      tooltipFormatter: function tooltipFormatter(label, index) {
        var record = dailySeries[index];
        return "日期: " + label + "\n累计收益: " + formatMoney(record.cumulativeValue) + " 元";
      },
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
    });
  }

  function renderSpotTradingSimulationProfitChart(records) {
    var dailySeries = getSpotTradingSimulationSeries(records);
    return renderBarChart({
      labels: dailySeries.map(function mapItem(item) {
        return item.date.slice(5);
      }),
      values: dailySeries.map(function mapItem(item) {
        return item.dailyValue;
      }),
      unit: "元",
      positiveColor: "#23C887",
      negativeColor: "#FF4D4F",
      xLabelEvery: dailySeries.length > 7 ? 2 : 1,
    });
  }

  function getSpotTradingSimulationTable() {
    return {
      columns: [
        { key: "date", label: "日期" },
        { key: "strategyName", label: "策略名称" },
        { key: "predictedLoad", label: "预测负荷" },
        { key: "predictedPrice", label: "预测电价" },
        { key: "declaredVolume", label: "申报电量" },
        { key: "tradedVolume", label: "成交电量" },
        { key: "profit", label: "收益" },
        { key: "returnRate", label: "收益率" },
        { key: "riskStatus", label: "风险状态" },
        { key: "actions", label: "操作", sortable: false },
      ],
      rows: getSpotTradingSimulationRecords().map(function mapRecord(record) {
        return {
          date: record.date,
          strategyName: record.strategyName,
          predictedLoad: formatMoney(record.predictedLoad),
          predictedPrice: formatDecimal(record.predictedPrice),
          declaredVolume: formatMoney(record.declaredVolume),
          tradedVolume: formatMoney(record.tradedVolume),
          profit: createStyledCell(formatSignedMoney(record.profit), record.profit >= 0 ? "table-positive" : "table-negative", record.profit),
          returnRate: createStyledCell(formatSignedNumber(record.returnRate, 1) + "%", record.returnRate >= 0 ? "table-positive" : "table-negative", record.returnRate),
          riskStatus: getSimulationRiskCell(record.riskStatus),
          actions: createTableActionCell(record.id, [
            { label: "查看详情", action: "view-record-detail" },
            { label: "下载结果", action: "open-download" },
          ]),
        };
      }),
      minWidth: 1460,
    };
  }

  function renderSpotTradingSimulationPage() {
    var page = simulationMock.spotTradingSimulation || {};
    var records = getSpotTradingSimulationRecords();

    return (
      '<div class="page-stack">' +
      '<section class="page-header"><div class="page-title-block"><h1>' +
      escapeHtml(page.title || "现货交易仿真") +
      '</h1><div class="page-description">' +
      escapeHtml(page.subtitle || "") +
      "</div></div></section>" +
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      renderBoundSelectFilter(
        "交易中心",
        state.spotTradingSimulation.filters.tradeCenter,
        (page.filters && page.filters.tradeCenterOptions) || [],
        "tradeCenter",
        "spotTradingSimulation",
        "filter-select-native",
      ) +
      renderBoundSelectFilter(
        "策略名称",
        state.spotTradingSimulation.filters.strategyName,
        (page.filters && page.filters.strategyOptions) || [],
        "strategyName",
        "spotTradingSimulation",
        "filter-select-native",
      ) +
      '<div class="info-filter-field"><span class="filter-label">回测周期：</span>' +
      renderInfoDatePicker("spot-trading-simulation-range", "range") +
      '</div></div><div class="info-filter-actions">' +
      renderUiActionButton("重置", "ghost", "reset-spot-trading-simulation") +
      renderUiActionButton("查询", "primary", "query-spot-trading-simulation") +
      "</div></section>" +
      renderSimpleStatusBar(page.status) +
      renderSectionHeading("策略收益概览", "聚合展示累计收益、平均日收益、最大回撤、胜率与风险状态") +
      renderSummaryCards(getSpotTradingSimulationSummaryCards(records), "summary-card-grid-5") +
      renderChartSection("策略收益趋势图", renderSpotTradingSimulationTrendChart(records)) +
      renderChartSection("每日盈亏柱状图", renderSpotTradingSimulationProfitChart(records)) +
      renderSectionTable("spot-trading-simulation-table", getSpotTradingSimulationTable()) +
      "</div>"
    );
  }

  function getSpotMockTradingRecords() {
    var filters = state.spotMockTrading.filters;
    return (simulationMock.spotMockTrading && simulationMock.spotMockTrading.records ? simulationMock.spotMockTrading.records : []).filter(function filterRecord(record) {
      return matchesOption(record.strategy, filters.strategy, "请选择交易策略") && isDateWithinRange(record.date, filters.tradeRange);
    });
  }

  function getSpotMockTradingStatusCell(status) {
    var toneMap = {
      待执行: "default",
      执行中: "processing",
      已完成: "success",
      失败: "danger",
    };
    return createBadgeCell(status, toneMap[status] || "default");
  }

  function renderSpotMockTradingTrendChart(records) {
    var dailySeries = aggregateByDate(records, "dailyProfit");
    return renderChartWithMarks({
      chartId: "spot-mock-trading-trend",
      title: "累计收益趋势图",
      unit: "元",
      labels: dailySeries.map(function mapItem(item) {
        return item.date.slice(5);
      }),
      series: [
        {
          id: "mock-cumulative-profit",
          label: "累计收益",
          color: "#1677FF",
          values: dailySeries.map(function mapItem(item) {
            return item.cumulativeValue;
          }),
        },
      ],
      hiddenSeries: getChartHiddenState("spot-mock-trading-trend"),
      tooltipFormatter: function tooltipFormatter(label, index) {
        var record = dailySeries[index];
        return "日期: " + label + "\n累计收益: " + formatMoney(record.cumulativeValue) + " 元";
      },
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
    });
  }

  function renderSpotMockTradingProfitChart(records) {
    var dailySeries = aggregateByDate(records, "dailyProfit");
    return renderBarChart({
      labels: dailySeries.map(function mapItem(item) {
        return item.date.slice(5);
      }),
      values: dailySeries.map(function mapItem(item) {
        return item.dailyValue;
      }),
      unit: "元",
      positiveColor: "#23C887",
      negativeColor: "#FF4D4F",
    });
  }

  function getSpotMockTradingTable() {
    return {
      columns: [
        { key: "date", label: "日期" },
        { key: "strategy", label: "交易策略" },
        { key: "predictedVolume", label: "预测电量" },
        { key: "predictedPrice", label: "预测电价" },
        { key: "declaredVolume", label: "申报电量" },
        { key: "tradedVolume", label: "成交电量" },
        { key: "dailyProfit", label: "当日收益" },
        { key: "cumulativeProfit", label: "累计收益" },
        { key: "status", label: "状态" },
        { key: "actions", label: "操作", sortable: false },
      ],
      rows: getSpotMockTradingRecords().map(function mapRecord(record) {
        return {
          date: record.date,
          strategy: record.strategy,
          predictedVolume: formatMoney(record.predictedVolume),
          predictedPrice: formatDecimal(record.predictedPrice),
          declaredVolume: formatMoney(record.declaredVolume),
          tradedVolume: formatMoney(record.tradedVolume),
          dailyProfit: createStyledCell(formatSignedMoney(record.dailyProfit), record.dailyProfit >= 0 ? "table-positive" : "table-negative", record.dailyProfit),
          cumulativeProfit: createStyledCell(formatSignedMoney(record.cumulativeProfit), record.cumulativeProfit >= 0 ? "table-positive" : "table-negative", record.cumulativeProfit),
          status: getSpotMockTradingStatusCell(record.status),
          actions: createTableActionCell(record.id, [
            { label: "查看详情", action: "view-record-detail" },
            { label: "重新执行", action: "retry-mock-trading" },
            { label: "下载", action: "open-download" },
          ]),
        };
      }),
      minWidth: 1500,
    };
  }

  function renderSimulationPage() {
    var simulationPage = simulationMock.spotMockTrading || {};
    var notification = simulationMock.notification || {};
    var records = getSpotMockTradingRecords();

    return (
      '<div class="page-stack simulation-page">' +
      (state.simulation.permissionVisible
        ? renderPermissionNotification({
            title: notification.title || "权限认证",
            path: notification.path || "/sale/sim/record/pageQuery",
            message: notification.message || "权限不足，点击下方角色申请：",
            actionText: notification.actionText || "数字能源平台超级管理员",
            closeAction: "dismiss-permission",
            escapeHtml: escapeHtml,
            renderIcon: renderIcon,
          })
        : "") +
      '<section class="page-header"><div class="page-title-block"><h1>' +
      escapeHtml(simulationPage.marketLabel || "广东电力市场") +
      '</h1><div class="page-description">' +
      escapeHtml(simulationPage.subtitle || "") +
      "</div></div>" +
      renderActionButton(simulationPage.cta || "新建模拟交易", "primary", "plus", "action-btn") +
      '</section><section class="panel simulation-filter-panel"><div class="simulation-filters">' +
      renderBoundSelectFilter(
        "交易策略",
        state.spotMockTrading.filters.strategy,
        (simulationPage.filters && simulationPage.filters.strategyOptions) || [],
        "strategy",
        "spotMockTrading",
        "filter-select-native",
      ) +
      '<div class="filter-field"><span class="filter-label">交易周期：</span>' +
      renderStandardDatePicker({
        id: "spot-mock-trading-range",
        mode: "range",
        range: getPickerDisplayRange("spot-mock-trading-range"),
        isOpen: state.ui.activeDatePickerId === "spot-mock-trading-range",
        holidays: state.ui.holidays,
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      }) +
      '</div></div><div class="status-actions">' +
      renderUiActionButton("重置", "ghost", "reset-spot-mock-trading") +
      renderUiActionButton("查询", "primary", "query-spot-mock-trading") +
      "</div></section>" +
      renderSimpleStatusBar(simulationPage.status) +
      renderChartSection("累计收益趋势图", renderSpotMockTradingTrendChart(records)) +
      renderChartSection("每日盈亏柱状图", renderSpotMockTradingProfitChart(records)) +
      renderSectionTable("spot-mock-trading-table", getSpotMockTradingTable()) +
      "</div>"
    );
  }

  function getDayAheadLoadDataset() {
    var filters = state.dayAheadLoadPrediction.filters;
    var profiles = (algorithmMock.dayAheadLoadPrediction && algorithmMock.dayAheadLoadPrediction.profiles ? algorithmMock.dayAheadLoadPrediction.profiles : []).filter(function filterProfile(profile) {
      return (
        matchesOption(profile.tradeCenter, filters.tradeCenter) &&
        matchesOption(profile.userType, filters.userType) &&
        matchesOption(profile.industryType, filters.industryType) &&
        profile.predictionDate === filters.predictionDate.start
      );
    });

    if (!profiles.length) {
      return {
        rows: [],
        modelInfo: {},
        profileCount: 0,
      };
    }

    var rows = profiles[0].rows.map(function mapRow(_, rowIndex) {
      var aggregate = profiles.reduce(
        function reduce(result, profile) {
          result.predictedLoad += profile.rows[rowIndex].predictedLoad;
          result.actualLoad += profile.rows[rowIndex].actualLoad;
          return result;
        },
        {
          time: profiles[0].rows[rowIndex].time,
          predictedLoad: 0,
          actualLoad: 0,
        },
      );
      aggregate.diff = aggregate.actualLoad - aggregate.predictedLoad;
      aggregate.errorRate = Number((Math.abs(aggregate.diff) / Math.max(aggregate.actualLoad, 1) * 100).toFixed(2));
      return aggregate;
    });

    var latestTrainedAt = profiles.reduce(function reduceLatest(result, profile) {
      return !result || profile.modelInfo.lastTrainedAt > result ? profile.modelInfo.lastTrainedAt : result;
    }, "");
    var modelInfo =
      profiles.length === 1
        ? profiles[0].modelInfo
        : {
            modelName: "日前负荷预测集成模型",
            modelVersion: "load-forecast-ensemble",
            lastTrainedAt: latestTrainedAt,
            trainingWindow: "近 180 天多中心联合训练样本",
            featureVersion: "feature-pack-multi-center",
            refreshCycle: "每日 03:00 自动重训",
          };

    return {
      rows: rows,
      modelInfo: modelInfo,
      profileCount: profiles.length,
    };
  }

  function getDayAheadLoadSummaryCards(dataset) {
    var totals = dataset.rows.reduce(
      function reduce(result, row) {
        result.predicted += row.predictedLoad;
        result.actual += row.actualLoad;
        result.errorRate += row.errorRate;
        if (!result.maxError || Math.abs(row.diff) > Math.abs(result.maxError.diff)) {
          result.maxError = row;
        }
        return result;
      },
      {
        predicted: 0,
        actual: 0,
        errorRate: 0,
        maxError: null,
      },
    );
    var averageErrorRate = dataset.rows.length ? totals.errorRate / dataset.rows.length : 0;
    var maxErrorLabel = totals.maxError ? totals.maxError.time + " / " + formatSignedNumber(totals.maxError.diff) + " MW" : "--";

    return [
      { label: "预测总负荷", value: formatMoney(totals.predicted), unit: "MW" },
      { label: "实际总负荷", value: formatMoney(totals.actual), unit: "MW" },
      { label: "平均误差率", value: formatPercent(averageErrorRate, 2), unit: "" },
      { label: "最大误差点", value: maxErrorLabel, unit: "" },
      { label: "模型版本", value: dataset.modelInfo.modelVersion || "--", unit: "" },
    ];
  }

  function renderDayAheadLoadTrendChart(dataset) {
    return renderChartWithMarks({
      chartId: "day-ahead-load-prediction-chart",
      title: "负荷预测趋势图",
      unit: "MW",
      labels: dataset.rows.map(function mapRow(row) {
        return row.time;
      }),
      series: [
        {
          id: "load-predicted",
          label: "预测负荷",
          color: "#1677FF",
          values: dataset.rows.map(function mapRow(row) {
            return row.predictedLoad;
          }),
        },
        {
          id: "load-actual",
          label: "实际负荷",
          color: "#2FCB8F",
          values: dataset.rows.map(function mapRow(row) {
            return row.actualLoad;
          }),
        },
      ],
      hiddenSeries: getChartHiddenState("day-ahead-load-prediction-chart"),
      xLabelEvery: 2,
      tooltipFormatter: function tooltipFormatter(label, index) {
        var row = dataset.rows[index];
        return (
          "时刻: " +
          label +
          "\n预测负荷: " +
          formatMoney(row.predictedLoad) +
          " MW\n实际负荷: " +
          formatMoney(row.actualLoad) +
          " MW\n误差率: " +
          formatPercent(row.errorRate, 2)
        );
      },
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
    });
  }

  function getDayAheadLoadTable(dataset) {
    return {
      columns: [
        { key: "time", label: "时刻" },
        { key: "predictedLoad", label: "预测负荷（MW）" },
        { key: "actualLoad", label: "实际负荷（MW）" },
        { key: "diff", label: "差值" },
        { key: "errorRate", label: "误差率" },
      ],
      rows: dataset.rows.map(function mapRow(row) {
        return {
          time: row.time,
          predictedLoad: formatMoney(row.predictedLoad),
          actualLoad: formatMoney(row.actualLoad),
          diff: createStyledCell(formatSignedNumber(row.diff), row.diff >= 0 ? "table-positive" : "table-negative", row.diff),
          errorRate: formatPercent(row.errorRate, 2),
        };
      }),
      minWidth: 1040,
    };
  }

  function renderModelInfoCard(dataset) {
    var modelInfo = dataset.modelInfo || {};
    var infoRows = [
      { label: "模型名称", value: modelInfo.modelName || "--" },
      { label: "模型版本", value: modelInfo.modelVersion || "--" },
      { label: "最近训练时间", value: modelInfo.lastTrainedAt || "--" },
      { label: "训练窗口", value: modelInfo.trainingWindow || "--" },
      { label: "特征版本", value: modelInfo.featureVersion || "--" },
      { label: "刷新周期", value: modelInfo.refreshCycle || "--" },
      { label: "聚合样本", value: String(dataset.profileCount || 0) + " 组" },
    ];

    return (
      '<section class="panel model-info-panel"><div class="section-heading"><div class="section-heading-title">模型信息卡片</div><div class="section-subtitle">用于说明当前预测结果所依赖的模型版本与训练口径</div></div><div class="model-info-list">' +
      infoRows
        .map(function mapRow(row) {
          return '<div class="model-info-item"><div class="model-info-label">' + escapeHtml(row.label) + '</div><div class="model-info-value">' + escapeHtml(row.value) + "</div></div>";
        })
        .join("") +
      "</div></section>"
    );
  }

  function renderDayAheadLoadPredictionPage() {
    var page = algorithmMock.dayAheadLoadPrediction || {};
    var dataset = getDayAheadLoadDataset();

    return (
      '<div class="page-stack">' +
      '<section class="page-header"><div class="page-title-block"><h1>' +
      escapeHtml(page.title || "日前负荷预测") +
      '</h1><div class="page-description">' +
      escapeHtml(page.subtitle || "") +
      "</div></div></section>" +
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      renderBoundSelectFilter(
        "交易中心",
        state.dayAheadLoadPrediction.filters.tradeCenter,
        (page.filters && page.filters.tradeCenterOptions) || [],
        "tradeCenter",
        "dayAheadLoadPrediction",
        "filter-select-native",
      ) +
      renderBoundSelectFilter(
        "用户类型",
        state.dayAheadLoadPrediction.filters.userType,
        (page.filters && page.filters.userTypeOptions) || [],
        "userType",
        "dayAheadLoadPrediction",
        "filter-select-native",
      ) +
      renderBoundSelectFilter(
        "行业类型",
        state.dayAheadLoadPrediction.filters.industryType,
        (page.filters && page.filters.industryTypeOptions) || [],
        "industryType",
        "dayAheadLoadPrediction",
        "filter-select-native",
      ) +
      '<div class="info-filter-field"><span class="filter-label">预测日期：</span>' +
      renderInfoDatePicker("day-ahead-load-prediction-date", "single") +
      '</div></div><div class="info-filter-actions">' +
      renderUiActionButton("重置", "ghost", "reset-day-ahead-load-prediction") +
      renderUiActionButton("查询", "primary", "query-day-ahead-load-prediction") +
      "</div></section>" +
      renderSimpleStatusBar(page.status) +
      renderSectionHeading("预测结果概览", "从总负荷、误差率与模型版本三个维度查看本次预测结果") +
      renderSummaryCards(getDayAheadLoadSummaryCards(dataset), "summary-card-grid-5") +
      '<section class="algorithm-panel-grid">' +
      renderChartSection("负荷预测趋势图", renderDayAheadLoadTrendChart(dataset), "按日内分时口径展示预测值与实际值") +
      renderModelInfoCard(dataset) +
      "</section>" +
      renderSectionTable("day-ahead-load-prediction-table", getDayAheadLoadTable(dataset)) +
      "</div>"
    );
  }

  function getSpotPriceDataset() {
    var filters = state.spotPricePrediction.filters;
    var scenarios = (algorithmMock.spotPricePrediction && algorithmMock.spotPricePrediction.scenarios ? algorithmMock.spotPricePrediction.scenarios : []).filter(function filterScenario(scenario) {
      return matchesOption(scenario.tradeCenter, filters.tradeCenter) && scenario.predictionDate === filters.predictionDate.start;
    });

    if (!scenarios.length) {
      return {
        rows: [],
        scenarioCount: 0,
        modelVersion: "--",
      };
    }

    var rows = scenarios[0].rows.map(function mapRow(_, rowIndex) {
      var summary = scenarios.reduce(
        function reduce(result, scenario) {
          result.dayaheadForecast += scenario.rows[rowIndex].dayaheadForecast;
          result.realtimeForecast += scenario.rows[rowIndex].realtimeForecast;
          result.spreadForecast += scenario.rows[rowIndex].spreadForecast;
          result.dayaheadActual += scenario.rows[rowIndex].dayaheadActual;
          result.realtimeActual += scenario.rows[rowIndex].realtimeActual;
          result.spreadActual += scenario.rows[rowIndex].spreadActual;
          result.errorRate += scenario.rows[rowIndex].errorRate;
          return result;
        },
        {
          time: scenarios[0].rows[rowIndex].time,
          dayaheadForecast: 0,
          realtimeForecast: 0,
          spreadForecast: 0,
          dayaheadActual: 0,
          realtimeActual: 0,
          spreadActual: 0,
          errorRate: 0,
        },
      );
      var count = scenarios.length;
      summary.dayaheadForecast = Number((summary.dayaheadForecast / count).toFixed(1));
      summary.realtimeForecast = Number((summary.realtimeForecast / count).toFixed(1));
      summary.spreadForecast = Number((summary.spreadForecast / count).toFixed(1));
      summary.dayaheadActual = Number((summary.dayaheadActual / count).toFixed(1));
      summary.realtimeActual = Number((summary.realtimeActual / count).toFixed(1));
      summary.spreadActual = Number((summary.spreadActual / count).toFixed(1));
      summary.errorRate = Number((summary.errorRate / count).toFixed(2));
      return summary;
    });

    return {
      rows: rows,
      scenarioCount: scenarios.length,
      modelVersion: scenarios.length === 1 ? scenarios[0].modelVersion : "spot-price-ensemble",
    };
  }

  function renderSpotPricePredictionChart(dataset) {
    var series = [];
    var priceType = state.spotPricePrediction.filters.priceType;

    if (priceType === "全部" || priceType === "日前价格") {
      series.push({
        id: "price-dayahead",
        label: "日前价格预测",
        color: "#1677FF",
        values: dataset.rows.map(function mapRow(row) {
          return row.dayaheadForecast;
        }),
      });
    }
    if (priceType === "全部" || priceType === "实时价格") {
      series.push({
        id: "price-realtime",
        label: "实时价格预测",
        color: "#2FCB8F",
        values: dataset.rows.map(function mapRow(row) {
          return row.realtimeForecast;
        }),
      });
    }
    if (priceType === "全部" || priceType === "价差") {
      series.push({
        id: "price-spread",
        label: "价差预测",
        color: "#FF7A45",
        values: dataset.rows.map(function mapRow(row) {
          return row.spreadForecast;
        }),
      });
    }

    return renderChartWithMarks({
      chartId: "spot-price-prediction-chart",
      title: "价差及现货价格预测",
      unit: "元/MWh",
      labels: dataset.rows.map(function mapRow(row) {
        return row.time;
      }),
      series: series,
      hiddenSeries: getChartHiddenState("spot-price-prediction-chart"),
      xLabelEvery: 2,
      tooltipFormatter: function tooltipFormatter(label, index) {
        var row = dataset.rows[index];
        return (
          "时刻: " +
          label +
          "\n日前预测: " +
          formatDecimal(row.dayaheadForecast) +
          " 元/MWh\n实时预测: " +
          formatDecimal(row.realtimeForecast) +
          " 元/MWh\n价差预测: " +
          formatDecimal(row.spreadForecast) +
          " 元/MWh"
        );
      },
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
    });
  }

  function getSpotPricePredictionTable(dataset) {
    return {
      columns: [
        { key: "time", label: "时刻" },
        { key: "dayaheadForecast", label: "日前预测价格" },
        { key: "realtimeForecast", label: "实时预测价格" },
        { key: "spreadForecast", label: "预测价差" },
        { key: "dayaheadActual", label: "实际日前价格" },
        { key: "realtimeActual", label: "实际实时价格" },
        { key: "spreadActual", label: "实际价差" },
        { key: "errorRate", label: "误差率" },
      ],
      rows: dataset.rows.map(function mapRow(row) {
        return {
          time: row.time,
          dayaheadForecast: formatDecimal(row.dayaheadForecast),
          realtimeForecast: formatDecimal(row.realtimeForecast),
          spreadForecast: formatDecimal(row.spreadForecast),
          dayaheadActual: formatDecimal(row.dayaheadActual),
          realtimeActual: formatDecimal(row.realtimeActual),
          spreadActual: formatDecimal(row.spreadActual),
          errorRate: formatPercent(row.errorRate, 2),
        };
      }),
      minWidth: 1320,
    };
  }

  function renderSpotPricePredictionPage() {
    var page = algorithmMock.spotPricePrediction || {};
    var dataset = getSpotPriceDataset();

    return (
      '<div class="page-stack">' +
      '<section class="page-header"><div class="page-title-block"><h1>' +
      escapeHtml(page.title || "价差及现货价格预测") +
      '</h1><div class="page-description">' +
      escapeHtml(page.subtitle || "") +
      "</div></div></section>" +
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      renderBoundSelectFilter(
        "交易中心",
        state.spotPricePrediction.filters.tradeCenter,
        (page.filters && page.filters.tradeCenterOptions) || [],
        "tradeCenter",
        "spotPricePrediction",
        "filter-select-native",
      ) +
      '<div class="info-filter-field"><span class="filter-label">预测日期：</span>' +
      renderInfoDatePicker("spot-price-prediction-date", "single") +
      "</div>" +
      renderBoundSelectFilter(
        "价格类型",
        state.spotPricePrediction.filters.priceType,
        (page.filters && page.filters.priceTypeOptions) || [],
        "priceType",
        "spotPricePrediction",
        "filter-select-native",
      ) +
      '</div><div class="info-filter-actions">' +
      renderUiActionButton("重置", "ghost", "reset-spot-price-prediction") +
      renderUiActionButton("查询", "primary", "query-spot-price-prediction") +
      "</div></section>" +
      renderSimpleStatusBar(page.status) +
      renderChartSection("多曲线价格预测", renderSpotPricePredictionChart(dataset), "单位：元/MWh") +
      renderSectionTable("spot-price-prediction-table", getSpotPricePredictionTable(dataset)) +
      "</div>"
    );
  }

  function getSettlementDayTable() {
    return {
      columns: [
        { key: "date", label: "日期" },
        { key: "enterpriseCode", label: "企业编码" },
        { key: "enterpriseName", label: "企业名称" },
        { key: "accountNo", label: "用户户号" },
        { key: "energy", label: "用电量" },
        { key: "dayaheadFee", label: "日前电费" },
        { key: "realtimeFee", label: "实时电费" },
        { key: "deviationFee", label: "偏差费用" },
        { key: "imbalanceFee", label: "市场不平衡电费" },
        { key: "totalFee", label: "合计费用" },
        { key: "actions", label: "操作", sortable: false },
      ],
      rows: getSettlementDailyRows().map(function mapRow(row) {
        return {
          date: row.date,
          enterpriseCode: row.enterpriseCode,
          enterpriseName: row.enterpriseName,
          accountNo: row.accountNo,
          energy: formatMoney(row.energy),
          dayaheadFee: formatMoney(row.dayaheadFee),
          realtimeFee: formatMoney(row.realtimeFee),
          deviationFee: formatMoney(row.deviationFee),
          imbalanceFee: formatMoney(row.imbalanceFee),
          totalFee: formatMoney(row.totalFee),
          actions: createTableActionCell("day-" + row.enterpriseCode + "-" + row.date, [
            { label: "查看详情", action: "view-record-detail" },
            { label: "下载", action: "open-download" },
          ]),
        };
      }),
      minWidth: 1760,
    };
  }

  function getSettlementMonthTable() {
    return {
      columns: [
        { key: "month", label: "结算月份" },
        { key: "enterpriseCode", label: "企业编码" },
        { key: "enterpriseName", label: "企业名称" },
        { key: "accountNo", label: "用户户号" },
        { key: "energy", label: "月度电量" },
        { key: "fee", label: "月度电费" },
        { key: "agencyIncome", label: "代理收益" },
        { key: "status", label: "结算状态" },
        { key: "actions", label: "操作", sortable: false },
      ],
      rows: getSettlementMonthRows().map(function mapRow(row) {
        return {
          month: row.month,
          enterpriseCode: row.enterpriseCode,
          enterpriseName: row.enterpriseName,
          accountNo: row.accountNo,
          energy: formatMoney(row.energy),
          fee: formatMoney(row.fee),
          agencyIncome: formatMoney(row.agencyIncome),
          status: row.status,
          actions: createTableActionCell("month-" + row.enterpriseCode + "-" + row.month, [
            { label: "查看详情", action: "view-record-detail" },
            { label: "下载", action: "open-download" },
          ]),
        };
      }),
      minWidth: 1420,
    };
  }

  function renderSettlementFilterBar() {
    if (getSelectedTradeCenterKey() !== "guangdong") {
      var isDaily = state.settlement.activeTab === "日清算";
      var activeSecondaryTab = getSettlementActiveSecondaryTab();
      var unifiedFieldsHtml = "";

      if (isDaily) {
        if (getSelectedTradeCenterKey() === "hunan") {
          unifiedFieldsHtml =
            '<div class="info-filter-field"><span class="filter-label">结算日期：</span>' +
            renderInfoDatePicker("settlement-day-range", "range") +
            "</div>" +
            renderBoundSelectFilter("结算类型", getHunanDailySelectedSettlementType(), getHunanDailySettlementTypeOptions(), "dailyStatementType", "settlement", "filter-select-native") +
            renderBoundTextFilter(
              "售电公司名称",
              state.settlement.filters.dailySellerCompanyName,
              "请输入售电公司名称",
              "dailySellerCompanyName",
              "settlement",
            ) +
            renderBoundSelectFilter("数据类型", state.settlement.filters.dailyDataType, getHunanDailyDataTypeOptions(), "dailyDataType", "settlement", "filter-select-native");
        } else if (getSelectedTradeCenterKey() === "shaanxi") {
          unifiedFieldsHtml =
            '<div class="info-filter-field"><span class="filter-label">结算日期：</span>' +
            renderInfoDatePicker("settlement-day-range", "range") +
            "</div>" +
            renderBoundTextFilter(
              "结算单元名称",
              state.settlement.filters.dailySettlementUnitName,
              "请输入结算单元名称",
              "dailySettlementUnitName",
              "settlement",
            ) +
            renderBoundSelectFilter("结算类型", getShaanxiDailySelectedSettlementType(), getShaanxiDailySettlementTypeOptions(), "dailyStatementType", "settlement", "filter-select-native") +
            renderBoundSelectFilter("数据类型", state.settlement.filters.dailyDataType, getShaanxiDailyDataTypeOptions(), "dailyDataType", "settlement", "filter-select-native");
        } else {
          unifiedFieldsHtml =
            '<div class="info-filter-field"><span class="filter-label">结算日期：</span>' +
            renderInfoDatePicker("settlement-day-range", "range") +
            "</div>" +
            renderBoundTextFilter(
              "结算单元名称",
              state.settlement.filters.dailySettlementUnitName,
              "请输入结算单元名称",
              "dailySettlementUnitName",
              "settlement",
            );
        }
      } else {
        unifiedFieldsHtml = renderMonthFilter("结算月份", state.settlement.filters.monthlyMonth, "monthlyMonth", "settlement");

        if (getSelectedTradeCenterKey() === "hunan" || getSelectedTradeCenterKey() === "shaanxi") {
          unifiedFieldsHtml = renderMonthFilter("结算月份", state.settlement.filters.monthlyMonth, "monthlyMonth", "settlement");
        } else if (activeSecondaryTab === "售电公司") {
          unifiedFieldsHtml += renderBoundTextFilter(
            "售电公司名称",
            state.settlement.filters.monthlySellerCompanyName,
            "请输入售电公司名称",
            "monthlySellerCompanyName",
            "settlement",
          );
        } else {
          unifiedFieldsHtml +=
            renderBoundTextFilter(
              "用电企业名称",
              state.settlement.filters.monthlyEnterpriseName,
              "请输入用电企业名称",
              "monthlyEnterpriseName",
              "settlement",
            ) +
            renderBoundTextFilter(
              "用户户号",
              state.settlement.filters.monthlyEnterpriseAccountNo,
              "请输入用户户号",
              "monthlyEnterpriseAccountNo",
              "settlement",
            );
        }
      }

      return (
        '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
        unifiedFieldsHtml +
        '</div><div class="info-filter-actions">' +
        renderUiActionButton("重置", "ghost", isDaily ? "reset-settlement-day" : "reset-settlement-month") +
        renderUiActionButton("查询", "primary", isDaily ? "query-settlement-day" : "query-settlement-month") +
        "</div></section>"
      );
    }

    var daily = state.settlement.activeTab === "日清算";
    var fieldsHtml = daily
      ? '<div class="info-filter-field"><span class="filter-label">结算日期：</span>' +
        renderInfoDatePicker("settlement-day-range", "range") +
        "</div>" +
        renderBoundTextFilter("用户名称", state.settlement.filters.dailyUserName, "请输入用户名称", "dailyUserName", "settlement") +
        renderBoundTextFilter("用户户号", state.settlement.filters.dailyAccountNo, "请输入用户户号", "dailyAccountNo", "settlement")
      : renderMonthFilter("结算月份", state.settlement.filters.monthlyMonth, "monthlyMonth", "settlement") +
        renderBoundTextFilter("用户名称", state.settlement.filters.monthlyUserName, "请输入用户名称", "monthlyUserName", "settlement") +
        renderBoundTextFilter("用户户号", state.settlement.filters.monthlyAccountNo, "请输入用户户号", "monthlyAccountNo", "settlement");

    return (
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      fieldsHtml +
      '</div><div class="info-filter-actions">' +
      renderUiActionButton("重置", "ghost", daily ? "reset-settlement-day" : "reset-settlement-month") +
      renderUiActionButton("查询", "primary", daily ? "query-settlement-day" : "query-settlement-month") +
      "</div></section>"
    );
  }

  function renderSettlementPage() {
    syncSettlementStateForTradeCenter();

    var settlementMock = getSettlementMock();
    var activeTab = state.settlement.activeTab;
    var isUnifiedCenter = getSelectedTradeCenterKey() !== "guangdong";
    var secondaryOptions = getSettlementSecondaryOptions();
    var status = parseInfoStatus(settlementMock.statusText);

    if (getSelectedTradeCenterKey() === "hunan" && activeTab === "月结算") {
      var hunanMonthlyPageData = getSettlementViewPageData("月结算", "售电公司");
      if (hunanMonthlyPageData.updateTime && hunanMonthlyPageData.dataSource) {
        status = {
          time: hunanMonthlyPageData.updateTime,
          source: hunanMonthlyPageData.dataSource,
        };
      }
    }
    if (getSelectedTradeCenterKey() === "shaanxi" && (activeTab === "日清算" || activeTab === "月结算")) {
      var shaanxiPageData = getSettlementViewPageData(activeTab, activeTab === "月结算" ? "售电公司" : "");
      if (shaanxiPageData.updateTime && shaanxiPageData.dataSource) {
        status = {
          time: shaanxiPageData.updateTime,
          source: shaanxiPageData.dataSource,
        };
      }
    }

    var secondaryTabsHtml =
      isUnifiedCenter && activeTab === "月结算" && secondaryOptions.length > 1
        ? '<section class="panel tabs-panel"><div class="panel-topline"><div class="secondary-tabs">' +
          renderSecondaryTabs(secondaryOptions, getSettlementActiveSecondaryTab()) +
          "</div></div></section>"
        : "";

    if (isUnifiedCenter) {
      return (
        renderMarketPageHeader(settlementMock.title || "日清月结", renderPageTabs(settlementMock.tabs || [], activeTab)) +
        secondaryTabsHtml +
        renderSettlementFilterBar() +
        renderDownloadOnlyBar(status, false) +
        renderUnifiedSettlementContent() +
        "</div>"
      );
    }

    var bodyHtml = activeTab === "日清算" ? renderSectionTable("settlement-day-table", getSettlementDayTable()) : renderSectionTable("settlement-month-table", getSettlementMonthTable());
    var hasData = Boolean((settlementMock.dailyRows || []).length || (settlementMock.monthRows || []).length);

    return (
      renderMarketPageHeader(settlementMock.title || "日清月结", renderPageTabs(settlementMock.tabs || [], activeTab)) +
      renderSettlementFilterBar() +
      renderDownloadOnlyBar(status, false) +
      (hasData
        ? (activeTab === "日清算" ? renderSummaryCards(getSettlementSummaryCards(getSettlementDailyRows())) : "") + bodyHtml
        : renderTradeCenterPageEmptyPanel()) +
      "</div>"
    );
  }

  function getRetailRelationMock() {
    return getMarketPageData("retailRelation") || {};
  }

  function getRetailRelationRows() {
    var filters = state.retailRelation.filters;
    return (getRetailRelationMock().rows || []).filter(function filterRow(row) {
      var rangeMatched = row.endDate >= filters.cooperationRange.start && row.startDate <= filters.cooperationRange.end;
      return (
        includesKeyword(row.userCode, filters.userCode) &&
        includesKeyword(row.userName, filters.userName) &&
        includesKeyword(row.accountNo, filters.accountNo) &&
        (filters.status === "全部" || row.status === filters.status) &&
        rangeMatched
      );
    });
  }

  function getRetailRelationTable() {
    return {
      columns: [
        { key: "userCode", label: "电力用户编码" },
        { key: "userName", label: "电力用户名称" },
        { key: "accountNo", label: "用户户号" },
        { key: "microgridName", label: "微电网名称" },
        { key: "startDate", label: "合作开始日期" },
        { key: "endDate", label: "合作结束日期" },
        { key: "status", label: "合作状态" },
        { key: "sellerCompany", label: "售电公司" },
        { key: "actions", label: "操作", sortable: false },
      ],
      rows: getRetailRelationRows().map(function mapRow(row) {
        return {
          userCode: row.userCode,
          userName: row.userName,
          accountNo: row.accountNo,
          microgridName: row.microgridName,
          startDate: row.startDate,
          endDate: row.endDate,
          status: row.status,
          sellerCompany: row.sellerCompany,
          actions: createTableActionCell("retail-" + row.userCode, [
            { label: "查看详情", action: "view-record-detail" },
            { label: "编辑", action: "edit-record" },
            { label: "下载", action: "open-download" },
          ]),
        };
      }),
      minWidth: 1560,
    };
  }

  function renderRetailRelationPage() {
    var retailMock = getRetailRelationMock();
    var status = parseInfoStatus(retailMock.statusText);
    var hasData = Boolean((retailMock.rows || []).length);

    return (
      renderMarketPageHeader(retailMock.title || "零售关系", "") +
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      renderBoundTextFilter("电力用户编码", state.retailRelation.filters.userCode, "请输入电力用户编码", "userCode", "retailRelation") +
      renderBoundTextFilter("电力用户名称", state.retailRelation.filters.userName, "请输入电力用户名称", "userName", "retailRelation") +
      renderBoundTextFilter("用户户号", state.retailRelation.filters.accountNo, "请输入用户户号", "accountNo", "retailRelation") +
      renderBoundSelectFilter("合作状态", state.retailRelation.filters.status, retailMock.statusOptions || [], "status", "retailRelation", "filter-select-native") +
      '<div class="info-filter-field"><span class="filter-label">合作期限：</span>' +
      renderInfoDatePicker("retail-cooperation-range", "range") +
      '</div></div><div class="info-filter-actions">' +
      renderUiActionButton("重置", "ghost", "reset-retail-relation") +
      renderUiActionButton("查询", "primary", "query-retail-relation") +
      "</div></section>" +
      renderDownloadOnlyBar(status, false) +
      (hasData ? renderSectionTable("retail-relation-table", getRetailRelationTable()) : renderTradeCenterPageEmptyPanel()) +
      "</div>"
    );
  }

  function getRollingDataMock() {
    return getMarketPageData("rollingData") || {};
  }

  function getRollingDataRows() {
    var rollingMock = getRollingDataMock();
    var filters = state.rollingData.filters;
    return (rollingMock.rows || []).filter(function filterRow(row) {
      return (
        row.date >= filters.dateRange.start &&
        row.date <= filters.dateRange.end &&
        matchesOption(row.product, filters.product, "全部")
      );
    });
  }

  function getRollingDataDailySummary(rows) {
    var grouped = {};
    (rows || []).forEach(function eachRow(row) {
      grouped[row.date] = grouped[row.date] || {
        date: row.date,
        volume: 0,
        totalPrice: 0,
        count: 0,
      };
      grouped[row.date].volume += Number(row.volume || 0);
      grouped[row.date].totalPrice += Number(row.averagePrice || 0);
      grouped[row.date].count += 1;
    });

    return Object.keys(grouped)
      .sort(compareDateAsc)
      .map(function mapDate(date) {
        var item = grouped[date];
        return {
          date: date,
          volume: item.volume,
          averagePrice: item.count ? Number((item.totalPrice / item.count).toFixed(1)) : 0,
        };
      });
  }

  function getRollingDataTable() {
    return {
      columns: [
        { key: "date", label: "日期" },
        { key: "tradeCenter", label: "交易中心" },
        { key: "product", label: "交易品种" },
        { key: "period", label: "交易时段" },
        { key: "volume", label: "成交电量（MWh）" },
        { key: "averagePrice", label: "成交均价（元/MWh）" },
        { key: "updatedAt", label: "更新时间" },
      ],
      rows: getRollingDataRows().map(function mapRow(row) {
        return {
          date: row.date,
          tradeCenter: row.tradeCenter,
          product: row.product,
          period: row.period,
          volume: formatMoney(row.volume),
          averagePrice: formatDecimal(row.averagePrice),
          updatedAt: row.updatedAt,
        };
      }),
      minWidth: 1360,
    };
  }

  function renderRollingDataFilterBar() {
    var rollingMock = getRollingDataMock();
    return (
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      '<div class="info-filter-field"><span class="filter-label">日期范围：</span>' +
      renderInfoDatePicker("rolling-data-range", "range") +
      "</div>" +
      renderBoundSelectFilter(
        "交易品种",
        state.rollingData.filters.product,
        rollingMock.productOptions || ["全部"],
        "product",
        "rollingData",
        "filter-select-native",
      ) +
      '</div><div class="info-filter-actions">' +
      renderUiActionButton("重置", "ghost", "reset-rolling-data") +
      renderUiActionButton("查询", "primary", "query-rolling-data") +
      "</div></section>"
    );
  }

  function renderRollingDataChart(rows) {
    var summaryRows = getRollingDataDailySummary(rows);
    return renderMixedBarLineChart({
      chartId: "rolling-data-chart",
      labels: summaryRows.map(function mapRow(row) {
        return row.date.slice(5);
      }),
      barSeries: [
        {
          id: "rolling-data-volume",
          label: "成交电量趋势图",
          color: "#1677FF",
          values: summaryRows.map(function mapRow(row) {
            return row.volume;
          }),
        },
      ],
      lineSeries: [
        {
          id: "rolling-data-price",
          label: "成交均价趋势图",
          color: "#FF7A45",
          values: summaryRows.map(function mapRow(row) {
            return row.averagePrice;
          }),
        },
      ],
      hiddenSeries: getChartHiddenState("rolling-data-chart"),
      leftUnit: "MWh",
      rightUnit: "元/MWh",
      xLabelEvery: 1,
    });
  }

  function getRollingSeriesStats(values) {
    var numericValues = (values || []).filter(function filterValue(value) {
      return typeof value === "number" && !Number.isNaN(value);
    });

    if (!numericValues.length) {
      return {
        max: 0,
        min: 0,
        average: 0,
      };
    }

    return {
      max: Number(Math.max.apply(null, numericValues).toFixed(1)),
      min: Number(Math.min.apply(null, numericValues).toFixed(1)),
      average: Number(
        (
          numericValues.reduce(function accumulate(total, value) {
            return total + value;
          }, 0) / numericValues.length
        ).toFixed(1),
      ),
    };
  }

  function buildRollingStatsCards(metricLabel, values, unit) {
    var stats = getRollingSeriesStats(values);
    return [
      { label: metricLabel + "最大值", value: stats.max, unit: unit },
      { label: metricLabel + "最小值", value: stats.min, unit: unit },
      { label: metricLabel + "均值", value: stats.average, unit: unit },
    ];
  }

  function renderRollingDataUpdateBar(status) {
    return renderDataUpdateBar({
      updatedAt: status.time,
      source: status.source,
      hasCompare: state.ui.hasCompare,
      showTaskEntry: true,
      actions: [
        { label: "更多", variant: "ghost", icon: "ellipsis", action: "open-manual-update" },
        { label: "对比", variant: "ghost", icon: "compare", action: "open-compare" },
        { label: "下载", variant: "primary", icon: "download", action: "open-download" },
      ],
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function formatRollingValue(label, value) {
    if (value === null || value === undefined || value === "") {
      return "--";
    }

    if (value && typeof value === "object") {
      return value;
    }

    if (typeof value === "number") {
      if (
        String(label).indexOf("价格") >= 0 ||
        String(label).indexOf("均价") >= 0 ||
        Math.abs(value % 1) > 0.001
      ) {
        return formatDecimal(value);
      }
      return formatMoney(value);
    }

    return String(value);
  }

  function buildRollingTable(columns, rows, minWidth) {
    return {
      columns: columns,
      rows: (rows || []).map(function mapRow(row) {
        var formatted = {};
        columns.forEach(function eachColumn(column) {
          formatted[column.key] = formatRollingValue(column.label, row[column.key]);
        });
        return formatted;
      }),
      minWidth: minWidth || Math.max(980, columns.length * 128),
    };
  }

  function getHunanRollingTradeModule() {
    return getRollingDataMock().longTermTradeResult || {};
  }

  function getHunanRollingTradeRows() {
    var module = getHunanRollingTradeModule();
    var filters = state.rollingData.filters;

    return (module.rows || []).filter(function filterRow(row) {
      return (
        row.tradeDate >= filters.hunanTradeDateRange.start &&
        row.tradeDate <= filters.hunanTradeDateRange.end &&
        matchesOption(row.tradeProduct, filters.hunanTradeProduct, "全部") &&
        matchesOption(row.contractPeriod, filters.hunanContractPeriod, "全部")
      );
    });
  }

  function getHunanRollingTradeSummaryRows(rows) {
    var grouped = {};

    (rows || []).forEach(function eachRow(row) {
      grouped[row.tradeDate] = grouped[row.tradeDate] || {
        tradeDate: row.tradeDate,
        volume: 0,
        totalAmount: 0,
      };
      grouped[row.tradeDate].volume += Number(row.volume || 0);
      grouped[row.tradeDate].totalAmount += Number(row.volume || 0) * Number(row.averagePrice || 0);
    });

    return Object.keys(grouped)
      .sort(compareDateAsc)
      .map(function mapDate(date) {
        var item = grouped[date];
        return {
          tradeDate: date,
          volume: item.volume,
          averagePrice: item.volume ? Number((item.totalAmount / item.volume).toFixed(1)) : 0,
        };
      });
  }

  function getHunanRollingTradeTable() {
    return buildRollingTable(
      [
        { key: "tradeDate", label: "交易日期" },
        { key: "tradeProduct", label: "交易品种" },
        { key: "contractPeriod", label: "合约周期" },
        { key: "tradePeriod", label: "交易时段" },
        { key: "volume", label: "成交电量（MWh）" },
        { key: "averagePrice", label: "成交均价（元/MWh）" },
        { key: "updatedAt", label: "更新时间" },
      ],
      getHunanRollingTradeRows(),
      1320,
    );
  }

  function renderHunanRollingFilterBar() {
    var module = getHunanRollingTradeModule();

    return (
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      '<div class="info-filter-field"><span class="filter-label">交易日期：</span>' +
      renderInfoDatePicker("rolling-data-hn-range", "range") +
      "</div>" +
      renderBoundSelectFilter(
        "交易品种",
        state.rollingData.filters.hunanTradeProduct,
        module.productOptions || ["全部"],
        "hunanTradeProduct",
        "rollingData",
        "filter-select-native",
      ) +
      renderBoundSelectFilter(
        "合约周期",
        state.rollingData.filters.hunanContractPeriod,
        module.contractPeriodOptions || ["全部"],
        "hunanContractPeriod",
        "rollingData",
        "filter-select-native",
      ) +
      '</div><div class="info-filter-actions">' +
      renderUiActionButton("重置", "ghost", "reset-rolling-data-hn") +
      renderUiActionButton("查询", "primary", "query-rolling-data-hn") +
      "</div></section>"
    );
  }

  function renderHunanRollingContent() {
    var rows = getHunanRollingTradeRows();
    var summaryRows = getHunanRollingTradeSummaryRows(rows);

    if (!rows.length || !summaryRows.length) {
      return renderTradeCenterPageEmptyPanel("当前筛选条件下暂无湖南中长期交易结果。");
    }

    var volumeValues = summaryRows.map(function mapRow(row) {
      return row.volume;
    });
    var priceValues = summaryRows.map(function mapRow(row) {
      return row.averagePrice;
    });

    return (
      renderSummaryCards(buildRollingStatsCards("成交电量", volumeValues, "MWh").concat(buildRollingStatsCards("成交均价", priceValues, "元/MWh")), "summary-card-grid-5") +
      renderChartSection(
        "中长期交易结果",
        renderMixedBarLineChart({
          chartId: "rolling-data-hn-chart",
          labels: summaryRows.map(function mapRow(row) {
            return row.tradeDate.slice(5);
          }),
          barSeries: [
            {
              id: "rolling-data-hn-volume",
              label: "成交电量",
              color: "#1677FF",
              values: volumeValues,
            },
          ],
          lineSeries: [
            {
              id: "rolling-data-hn-price",
              label: "成交均价",
              color: "#FF7A45",
              values: priceValues,
            },
          ],
          hiddenSeries: getChartHiddenState("rolling-data-hn-chart"),
          leftUnit: "MWh",
          rightUnit: "元/MWh",
          xLabelEvery: 1,
        }),
        "按交易日期、交易品种、合约周期汇总展示"
      ) +
      renderChartSection(
        "交易结果明细表",
        renderDataTablePro({
          tableId: "rolling-data-hn-table",
          columns: getHunanRollingTradeTable().columns,
          rows: getHunanRollingTradeTable().rows,
          minWidth: getHunanRollingTradeTable().minWidth,
          sortState: getTableSortState("rolling-data-hn-table"),
          columnOrder: getTableColumnOrder("rolling-data-hn-table"),
          enableColumnDrag: true,
          escapeHtml: escapeHtml,
          renderIcon: renderIcon,
          renderEmptyState: renderEmptyState,
        }),
        "支持排序、复制与页面级下载"
      )
    );
  }

  function getShaanxiContractCurveModule() {
    return getRollingDataMock().contractCurve || {};
  }

  function getShaanxiContractCurveRows() {
    var module = getShaanxiContractCurveModule();
    var filters = state.rollingData.filters;

    return (module.rows || []).filter(function filterRow(row) {
      return (
        row.curveDate >= filters.shaanxiCurveDate.start &&
        row.curveDate <= filters.shaanxiCurveDate.end &&
        matchesOption(row.sequenceName, filters.shaanxiSequenceName, "全部") &&
        matchesOption(row.contractType, filters.shaanxiContractType, "全部") &&
        matchesOption(row.sellerUnit, filters.shaanxiSellerUnit, "全部") &&
        matchesOption(row.buyerUnit, filters.shaanxiBuyerUnit, "全部") &&
        matchesOption(row.contractName, filters.shaanxiContractName, "全部")
      );
    });
  }

  function buildQuarterHourColumns(volumeKeyPrefix, priceKeyPrefix) {
    return (getInfoMock().quarterHours || mock.quarterHours || []).reduce(function reduceColumns(result, label, index) {
      result.push({ key: volumeKeyPrefix + index, label: label + " 电量" });
      result.push({ key: priceKeyPrefix + index, label: label + " 价格" });
      return result;
    }, []);
  }

  function getShaanxiContractCurveDetailTable() {
    var columns = [
      { key: "curveDate", label: "曲线日期" },
      { key: "sequenceName", label: "合同序列名称" },
      { key: "contractType", label: "合同类型" },
      { key: "sellerUnit", label: "售方用户 / 单元" },
      { key: "buyerUnit", label: "购方用户 / 单元" },
      { key: "contractName", label: "合同名称" },
    ]
      .concat(buildQuarterHourColumns("volume96-", "price96-"))
      .concat([
        { key: "dayTotalVolume", label: "日合计电量（MWh）" },
        { key: "weightedAveragePrice", label: "加权均价（元/MWh）" },
        { key: "updatedAt", label: "更新时间" },
      ]);

    return buildRollingTable(
      columns,
      getShaanxiContractCurveRows().map(function mapRow(row) {
        var formatted = {
          curveDate: row.curveDate,
          sequenceName: row.sequenceName,
          contractType: row.contractType,
          sellerUnit: row.sellerUnit,
          buyerUnit: row.buyerUnit,
          contractName: row.contractName,
          dayTotalVolume: row.dayTotalVolume,
          weightedAveragePrice: row.weightedAveragePrice,
          updatedAt: row.updatedAt,
        };

        (row.volume96 || []).forEach(function eachValue(value, index) {
          formatted["volume96-" + index] = value;
        });
        (row.price96 || []).forEach(function eachValue(value, index) {
          formatted["price96-" + index] = value;
        });

        return formatted;
      }),
      9800,
    );
  }

  function getShaanxiContractCurveAggregate(rows) {
    var labels = shaanxiMock.infoDisclosure && shaanxiMock.infoDisclosure.quarterHours
      ? shaanxiMock.infoDisclosure.quarterHours
      : mock.quarterHours;

    var volumeValues = (labels || []).map(function mapLabel(_, index) {
      return Number(
        (rows || []).reduce(function accumulate(total, row) {
          return total + Number((row.volume96 || [])[index] || 0);
        }, 0).toFixed(1),
      );
    });
    var priceValues = (labels || []).map(function mapLabel(_, index) {
      var totalVolume = (rows || []).reduce(function accumulate(total, row) {
        return total + Number((row.volume96 || [])[index] || 0);
      }, 0);

      if (!totalVolume) {
        return 0;
      }

      return Number(
        (
          (rows || []).reduce(function accumulate(total, row) {
            return total + Number((row.volume96 || [])[index] || 0) * Number((row.price96 || [])[index] || 0);
          }, 0) / totalVolume
        ).toFixed(1),
      );
    });

    return {
      labels: labels || [],
      volumeValues: volumeValues,
      priceValues: priceValues,
    };
  }

  function getShaanxiContractCurveSummaryTable() {
    var rows = getShaanxiContractCurveRows().map(function mapRow(row) {
      var maxVolume = Math.max.apply(null, row.volume96 || [0]);
      var minVolume = Math.min.apply(null, row.volume96 || [0]);
      var maxVolumeIndex = (row.volume96 || []).indexOf(maxVolume);
      var minVolumeIndex = (row.volume96 || []).indexOf(minVolume);
      var maxPrice = Math.max.apply(null, row.price96 || [0]);
      var minPrice = Math.min.apply(null, row.price96 || [0]);
      var priceStats = getRollingSeriesStats(row.price96 || []);
      var labels = shaanxiMock.infoDisclosure && shaanxiMock.infoDisclosure.quarterHours
        ? shaanxiMock.infoDisclosure.quarterHours
        : mock.quarterHours;

      return {
        contractName: row.contractName,
        contractType: row.contractType,
        dayTotalVolume: row.dayTotalVolume,
        weightedAveragePrice: row.weightedAveragePrice,
        maxPrice: maxPrice,
        minPrice: minPrice,
        averagePrice: priceStats.average,
        maxVolumeSlot: (labels && labels[maxVolumeIndex]) || "--",
        minVolumeSlot: (labels && labels[minVolumeIndex]) || "--",
      };
    });

    return buildRollingTable(
      [
        { key: "contractName", label: "合同名称" },
        { key: "contractType", label: "合同类型" },
        { key: "dayTotalVolume", label: "日合计电量（MWh）" },
        { key: "weightedAveragePrice", label: "加权均价（元/MWh）" },
        { key: "maxPrice", label: "最高价（元/MWh）" },
        { key: "minPrice", label: "最低价（元/MWh）" },
        { key: "averagePrice", label: "均价（元/MWh）" },
        { key: "maxVolumeSlot", label: "最大电量点位" },
        { key: "minVolumeSlot", label: "最小电量点位" },
      ],
      rows,
      1680,
    );
  }

  function renderShaanxiContractCurveFilterBar() {
    var module = getShaanxiContractCurveModule();

    return (
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      '<div class="info-filter-field"><span class="filter-label">曲线日期：</span>' +
      renderInfoDatePicker("rolling-data-sx-curve-date", "single") +
      "</div>" +
      renderBoundSelectFilter(
        "合同序列名称",
        state.rollingData.filters.shaanxiSequenceName,
        module.sequenceNameOptions || ["全部"],
        "shaanxiSequenceName",
        "rollingData",
        "filter-select-native",
      ) +
      renderBoundSelectFilter(
        "合同类型",
        state.rollingData.filters.shaanxiContractType,
        module.contractTypeOptions || ["全部"],
        "shaanxiContractType",
        "rollingData",
        "filter-select-native",
      ) +
      renderBoundSelectFilter(
        "售方用户 / 单元",
        state.rollingData.filters.shaanxiSellerUnit,
        module.sellerUnitOptions || ["全部"],
        "shaanxiSellerUnit",
        "rollingData",
        "filter-select-native",
      ) +
      renderBoundSelectFilter(
        "购方用户 / 单元",
        state.rollingData.filters.shaanxiBuyerUnit,
        module.buyerUnitOptions || ["全部"],
        "shaanxiBuyerUnit",
        "rollingData",
        "filter-select-native",
      ) +
      renderBoundSelectFilter(
        "合同名称",
        state.rollingData.filters.shaanxiContractName,
        module.contractNameOptions || ["全部"],
        "shaanxiContractName",
        "rollingData",
        "filter-select-native",
      ) +
      '</div><div class="info-filter-actions">' +
      renderUiActionButton("重置", "ghost", "reset-rolling-data-sx-curve") +
      renderUiActionButton("查询", "primary", "query-rolling-data-sx-curve") +
      "</div></section>"
    );
  }

  function renderShaanxiContractCurveContent() {
    var rows = getShaanxiContractCurveRows();
    var aggregate = getShaanxiContractCurveAggregate(rows);
    var detailTable = getShaanxiContractCurveDetailTable();
    var summaryTable = getShaanxiContractCurveSummaryTable();

    if (!rows.length) {
      return renderTradeCenterPageEmptyPanel("当前筛选条件下暂无陕西中长期合同曲线。");
    }

    return (
      renderSummaryCards(buildRollingStatsCards("合同电量", aggregate.volumeValues, "MWh").concat(buildRollingStatsCards("合同价格", aggregate.priceValues, "元/MWh")), "summary-card-grid-5") +
      renderChartSection(
        "中长期合同曲线",
        renderMixedBarLineChart({
          chartId: "rolling-data-sx-curve-chart",
          labels: aggregate.labels,
          barSeries: [
            {
              id: "rolling-data-sx-curve-volume",
              label: "合同电量",
              color: "#1677FF",
              values: aggregate.volumeValues,
            },
          ],
          lineSeries: [
            {
              id: "rolling-data-sx-curve-price",
              label: "合同价格",
              color: "#FF7A45",
              values: aggregate.priceValues,
            },
          ],
          hiddenSeries: getChartHiddenState("rolling-data-sx-curve-chart"),
          leftUnit: "MWh",
          rightUnit: "元/MWh",
          xLabelEvery: 8,
        }),
        "支持单合同查看，也支持当前筛选结果下的多合同聚合"
      ) +
      renderChartSection(
        "中长期合同曲线明细表",
        renderDataTablePro({
          tableId: "rolling-data-sx-curve-detail-table",
          columns: detailTable.columns,
          rows: detailTable.rows,
          minWidth: detailTable.minWidth,
          sortState: getTableSortState("rolling-data-sx-curve-detail-table"),
          columnOrder: getTableColumnOrder("rolling-data-sx-curve-detail-table"),
          enableColumnDrag: true,
          escapeHtml: escapeHtml,
          renderIcon: renderIcon,
          renderEmptyState: renderEmptyState,
        }),
        "支持排序、复制与页面级下载"
      ) +
      renderChartSection(
        "合同汇总统计表",
        renderDataTablePro({
          tableId: "rolling-data-sx-curve-summary-table",
          columns: summaryTable.columns,
          rows: summaryTable.rows,
          minWidth: summaryTable.minWidth,
          sortState: getTableSortState("rolling-data-sx-curve-summary-table"),
          columnOrder: getTableColumnOrder("rolling-data-sx-curve-summary-table"),
          enableColumnDrag: true,
          escapeHtml: escapeHtml,
          renderIcon: renderIcon,
          renderEmptyState: renderEmptyState,
        }),
        "展示日合计电量、加权均价及最大最小电量点位"
      )
    );
  }

  function getShaanxiTradeOverviewModule() {
    return getRollingDataMock().tradeOverview || {};
  }

  function getShaanxiTradeOverviewRows() {
    var module = getShaanxiTradeOverviewModule();
    var filters = state.rollingData.filters;

    return (module.rows || []).filter(function filterRow(row) {
      return row.tradeDate >= filters.shaanxiTradeDate.start && row.tradeDate <= filters.shaanxiTradeDate.end;
    });
  }

  function getShaanxiTradeOverviewTable() {
    return buildRollingTable(
      [
        { key: "tradeDate", label: "交易日期" },
        { key: "time", label: "时段" },
        { key: "weightedPrice", label: "中长期批发市场净合同加权均价（元/MWh）" },
        { key: "netContractVolume", label: "售电公司中长期批发市场净合同电量（MWh）" },
        { key: "dailyAveragePrice", label: "当日均价" },
        { key: "monthlyAveragePrice", label: "月累计均价" },
        { key: "updatedAt", label: "更新时间" },
      ],
      getShaanxiTradeOverviewRows(),
      1760,
    );
  }

  function renderShaanxiTradeOverviewFilterBar() {
    return (
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      '<div class="info-filter-field"><span class="filter-label">交易日期：</span>' +
      renderInfoDatePicker("rolling-data-sx-trade-date", "single") +
      '</div></div><div class="info-filter-actions">' +
      renderUiActionButton("重置", "ghost", "reset-rolling-data-sx-trade") +
      renderUiActionButton("查询", "primary", "query-rolling-data-sx-trade") +
      "</div></section>"
    );
  }

  function renderShaanxiTradeOverviewContent() {
    var rows = getShaanxiTradeOverviewRows();
    var table = getShaanxiTradeOverviewTable();
    var module = getShaanxiTradeOverviewModule();

    if (!rows.length) {
      return renderTradeCenterPageEmptyPanel("当前筛选条件下暂无陕西交易总体情况。");
    }

    var labels = rows.map(function mapRow(row) {
      return row.time;
    });
    var priceValues = rows.map(function mapRow(row) {
      return row.weightedPrice;
    });
    var volumeValues = rows.map(function mapRow(row) {
      return row.netContractVolume;
    });

    return (
      renderSummaryCards(buildRollingStatsCards("加权均价", priceValues, "元/MWh").concat(buildRollingStatsCards("净合同电量", volumeValues, "MWh")), "summary-card-grid-5") +
      renderChartSection(
        "交易总体情况（交易）",
        renderChartWithMarks({
          chartId: "rolling-data-sx-trade-price-chart",
          title: "中长期批发市场净合同加权均价",
          labels: labels,
          unit: "元/MWh",
          series: [
            {
              id: "rolling-data-sx-trade-price",
              label: "净合同加权均价",
              color: "#FF7A45",
              values: priceValues,
            },
          ],
          hiddenSeries: getChartHiddenState("rolling-data-sx-trade-price-chart"),
          escapeHtml: escapeHtml,
          renderIcon: renderIcon,
          renderEmptyState: renderEmptyState,
          xLabelEvery: 2,
        }) +
          renderBarChart({
            chartId: "rolling-data-sx-trade-volume-chart",
            labels: labels,
            values: volumeValues,
            unit: "MWh",
            positiveColor: "#1677FF",
            xLabelEvery: 2,
          }),
        "上图为净合同加权均价，下图为售电公司净合同电量"
      ) +
      renderChartSection(
        "交易明细表",
        renderDataTablePro({
          tableId: "rolling-data-sx-trade-table",
          columns: table.columns,
          rows: table.rows,
          minWidth: table.minWidth,
          sortState: getTableSortState("rolling-data-sx-trade-table"),
          columnOrder: getTableColumnOrder("rolling-data-sx-trade-table"),
          enableColumnDrag: true,
          escapeHtml: escapeHtml,
          renderIcon: renderIcon,
          renderEmptyState: renderEmptyState,
        }),
        "展示 24 时、当日均价与月累计均价"
      ) +
      renderSettlementFileTableSection(
        "rolling-data-sx-trade-file-table",
        "PDF 文件列表",
        "获取时间",
        module.fileList || []
      )
    );
  }

  function renderRollingDataPage() {
    var rollingMock = getRollingDataMock();
    var status = parseInfoStatus(rollingMock.statusText);
    var selectedTradeCenter = state.ui.selectedTradeCenter;

    if (selectedTradeCenter === "湖南电力交易中心") {
      return (
        renderMarketPageHeader(rollingMock.title || "滚搓数据", "") +
        renderHunanRollingFilterBar() +
        renderRollingDataUpdateBar(status) +
        renderHunanRollingContent() +
        "</div>"
      );
    }

    if (selectedTradeCenter === "陕西电力交易中心") {
      return (
        renderMarketPageHeader(rollingMock.title || "滚搓数据", "") +
        renderRollingDataUpdateBar(status) +
        renderShaanxiContractCurveFilterBar() +
        renderShaanxiContractCurveContent() +
        renderShaanxiTradeOverviewFilterBar() +
        renderShaanxiTradeOverviewContent() +
        "</div>"
      );
    }

    if (selectedTradeCenter !== "广东电力交易中心") {
      return (
        renderMarketPageHeader(rollingMock.title || "滚搓数据", "") +
        renderRollingDataUpdateBar(status) +
        renderTradeCenterPageEmptyPanel(INFO_DISCLOSURE_EMPTY_MESSAGE) +
        "</div>"
      );
    }

    var rows = getRollingDataRows();
    var hasData = Boolean((rollingMock.rows || []).length);
    var hasVisibleRows = rows.length > 0;

    return (
      renderMarketPageHeader(rollingMock.title || "滚搓数据", "") +
      renderRollingDataFilterBar() +
      renderRollingDataUpdateBar(status) +
      (hasData && hasVisibleRows
        ? renderChartSection("滚搓交易趋势", renderRollingDataChart(rows), "柱状为成交电量，折线为成交均价") +
          renderSectionTable("rolling-data-table", getRollingDataTable())
        : renderTradeCenterPageEmptyPanel()) +
      "</div>"
    );
  }

  function getDeclarationMock() {
    return guangdongMock.dayAheadDeclaration || {};
  }

  function getDeclarationRows() {
    var filters = state.declaration.filters;
    return (getDeclarationMock().rows || []).filter(function filterRow(row) {
      return (
        row.declarationDate >= filters.declarationRange.start &&
        row.declarationDate <= filters.declarationRange.end &&
        (filters.unit === "全部" || row.unit === filters.unit) &&
        (filters.status === "全部" || row.status === filters.status)
      );
    });
  }

  function getDeclarationTable() {
    return {
      columns: [
        { key: "declarationDate", label: "申报日期" },
        { key: "unit", label: "交易单元" },
        { key: "time", label: "时刻" },
        { key: "volume", label: "申报电量" },
        { key: "price", label: "申报电价" },
        { key: "status", label: "申报状态" },
        { key: "updatedAt", label: "更新时间" },
        { key: "actions", label: "操作", sortable: false },
      ],
      rows: getDeclarationRows().map(function mapRow(row) {
        return {
          declarationDate: row.declarationDate,
          unit: row.unit,
          time: row.time,
          volume: formatInteger(row.volume),
          price: formatDecimal(row.price),
          status: row.status,
          updatedAt: row.updatedAt,
          actions: createTableActionCell("declaration-" + row.unit + "-" + row.time, [
            { label: "查看详情", action: "view-record-detail" },
            { label: "下载", action: "open-download" },
            { label: "模拟申报结果", action: "simulate-declaration-result" },
          ]),
        };
      }),
      minWidth: 1480,
    };
  }

  function renderDeclarationPage() {
    var declarationMock = getDeclarationMock();
    var status = parseInfoStatus(declarationMock.statusText);

    return (
      renderMarketPageHeader(declarationMock.title || "日前申报", "") +
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      '<div class="info-filter-field"><span class="filter-label">申报日期：</span>' +
      renderInfoDatePicker("declaration-date", "single") +
      "</div>" +
      renderBoundSelectFilter("交易单元", state.declaration.filters.unit, declarationMock.unitOptions || [], "unit", "declaration", "filter-select-native") +
      renderBoundSelectFilter("申报状态", state.declaration.filters.status, declarationMock.statusOptions || [], "status", "declaration", "filter-select-native") +
      '</div><div class="info-filter-actions">' +
      renderUiActionButton("重置", "ghost", "reset-declaration") +
      renderUiActionButton("查询", "primary", "query-declaration") +
      "</div></section>" +
      renderDownloadOnlyBar(status, false) +
      renderSectionTable("declaration-table", getDeclarationTable()) +
      "</div>"
    );
  }

  function renderPlaceholder() {
    var currentPage = registry.getPage(state.currentPageKey);
    return renderPlaceholderPage({
      featureTitle: currentPage.title,
      returnPageKey: "business-center",
      escapeHtml: escapeHtml,
    });
  }

  function renderFlashMessage() {
    if (!state.ui.flashMessage) {
      return "";
    }
    return '<div class="flash-message ' + escapeHtml(state.ui.flashType) + '">' + escapeHtml(state.ui.flashMessage) + "</div>";
  }

  function renderCompareModalOverlay() {
    if (!state.ui.compareModalVisible) {
      return "";
    }

    return renderCompareModal({
      datePickerHtml: renderStandardDatePicker({
        id: "compare-range",
        mode: "range",
        range: getPickerDisplayRange("compare-range"),
        isOpen: state.ui.activeDatePickerId === "compare-range",
        holidays: state.ui.holidays,
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      }),
      error: state.ui.compareError,
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function renderManualUpdateModalOverlay() {
    if (!state.ui.manualUpdateModalVisible) {
      return "";
    }

    return renderManualUpdateModal({
      mode: state.ui.manualUpdateMode,
      fileName: state.ui.manualUploadFileName,
      error: state.ui.manualUpdateError,
      datePickerHtml: renderStandardDatePicker({
        id: "manual-pull-range",
        mode: "range",
        range: getPickerDisplayRange("manual-pull-range"),
        isOpen: state.ui.activeDatePickerId === "manual-pull-range",
        holidays: state.ui.holidays,
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      }),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function renderDownloadModalOverlay() {
    if (!state.ui.downloadModalVisible) {
      return "";
    }

    return renderDownloadModal({
      dataTypes: DOWNLOAD_DATA_TYPES,
      selectedType: state.ui.downloadDataType,
      error: state.ui.downloadError,
      datePickerHtml: renderStandardDatePicker({
        id: "download-range",
        mode: "range",
        range: getPickerDisplayRange("download-range"),
        isOpen: state.ui.activeDatePickerId === "download-range",
        holidays: state.ui.holidays,
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      }),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function renderDownloadTaskDrawerOverlay() {
    if (!state.ui.downloadTaskDrawerVisible) {
      return "";
    }

    return renderDownloadTaskDrawer({
      tasks: getVisibleDownloadTasks(),
      emptyStateHtml: renderEmptyState({
        message: "当前暂无下载任务记录，请先创建下载任务。",
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      }),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function renderOverlays() {
    return renderCompareModalOverlay() + renderManualUpdateModalOverlay() + renderDownloadModalOverlay() + renderDownloadTaskDrawerOverlay() + renderFlashMessage();
  }

  function renderContent() {
    var currentPage = registry.getPage(state.currentPageKey);
    if (currentPage.viewType === "business-center") {
      return renderBusinessCenterPage();
    }
    if (currentPage.viewType === "gd-info-disclosure") {
      return renderInfoDisclosurePage();
    }
    if (currentPage.viewType === "market-data-disclosure") {
      return renderInfoDisclosurePage();
    }
    if (currentPage.viewType === "gd-trade-result") {
      return renderTradeResultPage();
    }
    if (currentPage.viewType === "gd-settlement") {
      return renderSettlementPage();
    }
    if (currentPage.viewType === "gd-retail-relation") {
      return renderRetailRelationPage();
    }
    if (currentPage.viewType === "rolling-data") {
      return renderRollingDataPage();
    }
    if (currentPage.viewType === "gd-day-ahead-declaration") {
      return renderDeclarationPage();
    }
    if (currentPage.viewType === "fetch-monitor") {
      return renderFetchMonitorPage();
    }
    if (currentPage.viewType === "spot-trading-simulation") {
      return renderSpotTradingSimulationPage();
    }
    if (currentPage.viewType === "spot-mock-trading") {
      return renderSimulationPage();
    }
    if (currentPage.viewType === "day-ahead-load-prediction") {
      return renderDayAheadLoadPredictionPage();
    }
    if (currentPage.viewType === "spot-price-prediction") {
      return renderSpotPricePredictionPage();
    }
    return renderPlaceholder();
  }

  function renderFloatingTools() {
    return '<div class="floating-tools" aria-hidden="true"><button>' + renderIcon("message", "floating-tool-icon") + '</button><button>' + renderIcon("bell", "floating-tool-icon") + '</button><button>' + renderIcon("edit", "floating-tool-icon") + "</button></div>";
  }

  function renderApp() {
    var root = document.getElementById("app");
    root.innerHTML = '<div class="app-shell">' + renderTopNav() + '<div class="workspace">' + renderSidebar() + '<main class="content">' + renderContent() + "</main></div>" + renderFloatingTools() + renderOverlays() + "</div>";
  }

  function closeAllPanels() {
    state.ui.tradeCenterOpen = false;
    state.ui.activeDatePickerId = null;
    state.ui.datePickerDrafts = {};
  }

  document.addEventListener("dragstart", function handleColumnDragStart(event) {
    var headerCell = event.target.closest("th[data-column-drag-key]");
    if (!headerCell || !event.dataTransfer) {
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        tableId: headerCell.getAttribute("data-table-id"),
        columnKey: headerCell.getAttribute("data-column-drag-key"),
      }),
    );
  });

  document.addEventListener("dragover", function handleColumnDragOver(event) {
    if (event.target.closest("th[data-column-drag-key]")) {
      event.preventDefault();
    }
  });

  document.addEventListener("drop", function handleColumnDrop(event) {
    var targetHeader = event.target.closest("th[data-column-drag-key]");
    var payloadText;
    var payload;

    if (!targetHeader || !event.dataTransfer) {
      return;
    }

    payloadText = event.dataTransfer.getData("text/plain");
    if (!payloadText) {
      return;
    }

    try {
      payload = JSON.parse(payloadText);
    } catch (error) {
      return;
    }

    if (!payload || payload.tableId !== targetHeader.getAttribute("data-table-id")) {
      return;
    }

    event.preventDefault();
    moveTableColumn(payload.tableId, payload.columnKey, targetHeader.getAttribute("data-column-drag-key"));
    renderApp();
  });

  function confirmCompare() {
    var baseRange = getCurrentCompareBaseRange();
    if (!isRangeValid(state.ui.compareRangeDraft) || !isRangeValid(baseRange)) {
      state.ui.compareError = "请选择有效的对比日期范围。";
      return;
    }
    if (getRangeDays(state.ui.compareRangeDraft) !== getRangeDays(baseRange)) {
      state.ui.compareError = "对比日期范围必须与运行日期范围天数一致。";
      return;
    }
    state.ui.compareError = "";
    state.ui.hasCompare = true;
    state.ui.compareModalVisible = false;
    closeDatePicker("compare-range", false);
    setFlashMessage("对比条件已生效。", "success");
  }

  function confirmManualUpdate() {
    state.ui.manualUpdateError = "";
    if (state.ui.manualUpdateMode === "upload") {
      if (!state.ui.manualUploadFileName) {
        state.ui.manualUpdateError = "请选择原始文件。";
        return;
      }
    } else {
      if (!isRangeValid(state.ui.manualPullRangeDraft)) {
        state.ui.manualUpdateError = "请选择有效的拉取日期范围。";
        return;
      }
      if (getRangeDays(state.ui.manualPullRangeDraft) > 7) {
        state.ui.manualUpdateError = "系统拉取单次限制在 7 天及以内。";
        return;
      }
    }
    state.ui.manualUpdateModalVisible = false;
    closeDatePicker("manual-pull-range", false);
    setFlashMessage("更新任务已提交", "success");
  }

  function confirmDownload() {
    state.ui.downloadError = "";
    if (!isRangeValid(state.ui.downloadRangeDraft)) {
      state.ui.downloadError = "请选择有效的下载日期范围。";
      return;
    }
    if (getRangeDays(state.ui.downloadRangeDraft) > 90) {
      state.ui.downloadError = "下载日期范围上限为 90 天。";
      return;
    }
    addDownloadTask();
    state.ui.downloadModalVisible = false;
    state.ui.downloadTaskDrawerVisible = true;
    closeDatePicker("download-range", false);
    setFlashMessage("下载任务正在创建中，请稍后...", "info");
  }

  function handleUiAction(action, target) {
    if (action === "open-compare") {
      syncCompareDraftToCurrentContext();
      state.ui.compareModalVisible = true;
      state.ui.compareError = "";
      return true;
    }
    if (action === "close-compare") {
      state.ui.compareModalVisible = false;
      state.ui.compareError = "";
      closeDatePicker("compare-range", false);
      return true;
    }
    if (action === "confirm-compare") {
      confirmCompare();
      return true;
    }
    if (action === "open-manual-update") {
      state.ui.manualUpdateModalVisible = true;
      state.ui.manualUpdateError = "";
      return true;
    }
    if (action === "close-manual-update") {
      state.ui.manualUpdateModalVisible = false;
      state.ui.manualUpdateError = "";
      closeDatePicker("manual-pull-range", false);
      return true;
    }
    if (action === "confirm-manual-update") {
      confirmManualUpdate();
      return true;
    }
    if (action === "open-download") {
      syncDownloadRangeToCurrentPage();
      state.ui.downloadDataType = getCurrentDownloadType();
      state.ui.downloadModalVisible = true;
      state.ui.downloadError = "";
      return true;
    }
    if (action === "close-download") {
      state.ui.downloadModalVisible = false;
      state.ui.downloadError = "";
      closeDatePicker("download-range", false);
      return true;
    }
    if (action === "confirm-download") {
      confirmDownload();
      return true;
    }
    if (action === "open-download-tasks") {
      state.ui.downloadTaskDrawerVisible = true;
      return true;
    }
    if (action === "close-download-tasks") {
      state.ui.downloadTaskDrawerVisible = false;
      return true;
    }
    if (action === "refresh-empty-state") {
      setFlashMessage("刷新请求已提交。", "info");
      return true;
    }
    if (action === "query-market-disclosure") {
      var disclosureState = getMarketDisclosureState();
      if (!isRangeValid(disclosureState.filterRange)) {
        setFlashMessage("请选择有效的日期范围。", "info");
        return true;
      }
      disclosureState.appliedRange = cloneRange(disclosureState.filterRange);
      disclosureState.lastUpdatedAt = formatDateTime(new Date());
      disclosureState.queryCount += 1;
      setFlashMessage("已按当前筛选条件刷新数据披露内容。", "success");
      return true;
    }
    if (action === "reset-market-disclosure") {
      var pageMock = getMarketDisclosureMock();
      var pageStateValue = getMarketDisclosureState();
      var unifiedPageData = getInfoDisclosurePageData();
      resetUnifiedInfoDisclosureFieldFilters(unifiedPageData);
      if (isUnifiedInfoDisclosureSingleDateMode(unifiedPageData)) {
        var defaultDate = (unifiedPageData.filters && unifiedPageData.filters.date) || (pageMock.defaultRange && pageMock.defaultRange.end) || "";
        pageStateValue.filterRange = {
          start: defaultDate,
          end: defaultDate,
        };
        pageStateValue.appliedRange = {
          start: defaultDate,
          end: defaultDate,
        };
      } else {
        pageStateValue.filterRange = cloneRange(pageMock.defaultRange);
        pageStateValue.appliedRange = cloneRange(pageMock.defaultRange);
      }
      pageStateValue.lastUpdatedAt = pageMock.dataUpdatedAt || pageStateValue.lastUpdatedAt;
      state.ui.hasCompare = false;
      state.tradeResult.filters.nodeKeyword = "";
      state.info.profileViewMode = "";
      setFlashMessage("日期筛选已恢复默认。", "info");
      return true;
    }
    if (action === "query-sale-company") {
      setFlashMessage("已按当前日期范围更新售电公司分时电量。", "success");
      return true;
    }
    if (action === "reset-sale-company") {
      state.info.filters.saleCompanyRange = {
        start: getInfoMock().availableRangeStart,
        end: getInfoMock().availableRangeEnd,
      };
      setFlashMessage("售电公司分时电量筛选已重置。", "info");
      return true;
    }
    if (action === "query-enterprise") {
      setFlashMessage("已按当前筛选条件更新用电企业分时电量。", "success");
      return true;
    }
    if (action === "reset-enterprise") {
      state.info.filters.enterpriseRange = {
        start: getInfoMock().availableRangeStart,
        end: getInfoMock().availableRangeEnd,
      };
      state.info.filters.enterpriseUserCode = "";
      state.info.filters.enterpriseUserName = "";
      state.info.filters.enterpriseAccountNo = "";
      state.info.filters.enterpriseMicrogridName = "";
      state.info.filters.enterpriseMicrogridId = "";
      setFlashMessage("用电企业分时电量筛选已重置。", "info");
      return true;
    }
    if (action === "query-settlement-day") {
      setFlashMessage(
        getSelectedTradeCenterKey() === "hunan"
          ? "已按当前筛选条件刷新湖南日清算明细。"
          : getSelectedTradeCenterKey() === "shaanxi"
            ? "已按当前筛选条件刷新陕西日清算明细。"
            : "已更新日清算结果。",
        "success"
      );
      return true;
    }
    if (action === "reset-settlement-day") {
      if (getSelectedTradeCenterKey() === "guangdong") {
        state.settlement.filters.dailyRange = {
          start: "2026-05-03",
          end: "2026-05-09",
        };
        state.settlement.filters.dailyUserName = "";
        state.settlement.filters.dailyAccountNo = "";
      } else {
        state.settlement.filters.dailyRange = getSettlementDefaultDailyRange();
        state.settlement.filters.dailySellerCompanyName = "";
        state.settlement.filters.dailySettlementUnitName = "";
        state.settlement.filters.dailyStatementKey = "";
        state.settlement.filters.dailyStatementType = "全部";
        state.settlement.filters.dailyDataType = "全部";
      }
      setFlashMessage("日清算筛选已重置。", "info");
      return true;
    }
    if (action === "query-settlement-month") {
      setFlashMessage(
        getSelectedTradeCenterKey() === "shaanxi"
          ? "已按结算月份刷新陕西月结算数据。"
          : "已更新月结算结果。",
        "success"
      );
      return true;
    }
    if (action === "reset-settlement-month") {
      if (getSelectedTradeCenterKey() === "guangdong") {
        state.settlement.filters.monthlyMonth = "2026-05";
        state.settlement.filters.monthlyUserName = "";
        state.settlement.filters.monthlyAccountNo = "";
      } else {
        state.settlement.filters.monthlyMonth = getSettlementDefaultMonth();
        state.settlement.filters.monthlySellerCompanyName = "";
        state.settlement.filters.monthlyEnterpriseName = "";
        state.settlement.filters.monthlyEnterpriseAccountNo = "";
      }
      setFlashMessage("月结算筛选已重置。", "info");
      return true;
    }
    if (action === "query-retail-relation") {
      setFlashMessage("已更新零售关系列表。", "success");
      return true;
    }
    if (action === "reset-retail-relation") {
      var retailMock = getRetailRelationMock();
      state.retailRelation.filters.userCode = "";
      state.retailRelation.filters.userName = "";
      state.retailRelation.filters.accountNo = "";
      state.retailRelation.filters.status = "全部";
      state.retailRelation.filters.cooperationRange = cloneRange((retailMock && retailMock.defaultRange) || {
        start: "2026-01-01",
        end: "2026-12-31",
      });
      setFlashMessage("零售关系筛选已重置。", "info");
      return true;
    }
    if (action === "query-rolling-data") {
      if (!isRangeValid(state.rollingData.filters.dateRange)) {
        setFlashMessage("请选择有效的日期范围。", "info");
        return true;
      }
      setFlashMessage("已刷新滚搓数据。", "success");
      return true;
    }
    if (action === "reset-rolling-data") {
      var rollingMock = getRollingDataMock();
      state.rollingData.filters.dateRange = cloneRange((rollingMock && rollingMock.defaultRange) || {
        start: "2026-05-03",
        end: "2026-05-09",
      });
      state.rollingData.filters.product = (rollingMock && rollingMock.productOptions && rollingMock.productOptions[0]) || "全部";
      setFlashMessage("滚搓数据筛选已重置。", "info");
      return true;
    }
    if (action === "query-rolling-data-hn") {
      if (!isRangeValid(state.rollingData.filters.hunanTradeDateRange)) {
        setFlashMessage("请选择有效的交易日期范围。", "info");
        return true;
      }
      setFlashMessage("已刷新湖南中长期交易结果。", "success");
      return true;
    }
    if (action === "reset-rolling-data-hn") {
      var hunanRollingModule = getHunanRollingTradeModule();
      state.rollingData.filters.hunanTradeDateRange = cloneRange((hunanRollingModule && hunanRollingModule.defaultRange) || {
        start: "2026-05-03",
        end: "2026-05-09",
      });
      state.rollingData.filters.hunanTradeProduct =
        (hunanRollingModule && hunanRollingModule.productOptions && hunanRollingModule.productOptions[0]) || "全部";
      state.rollingData.filters.hunanContractPeriod =
        (hunanRollingModule && hunanRollingModule.contractPeriodOptions && hunanRollingModule.contractPeriodOptions[0]) || "全部";
      setFlashMessage("湖南中长期交易结果筛选已重置。", "info");
      return true;
    }
    if (action === "query-rolling-data-sx-curve") {
      if (!isRangeValid(state.rollingData.filters.shaanxiCurveDate)) {
        setFlashMessage("请选择有效的曲线日期。", "info");
        return true;
      }
      setFlashMessage("已刷新陕西中长期合同曲线。", "success");
      return true;
    }
    if (action === "reset-rolling-data-sx-curve") {
      var shaanxiCurveModule = getShaanxiContractCurveModule();
      var defaultCurveDate = (shaanxiCurveModule && shaanxiCurveModule.defaultDate) || "2026-05-09";
      state.rollingData.filters.shaanxiCurveDate = {
        start: defaultCurveDate,
        end: defaultCurveDate,
      };
      state.rollingData.filters.shaanxiSequenceName =
        (shaanxiCurveModule && shaanxiCurveModule.sequenceNameOptions && shaanxiCurveModule.sequenceNameOptions[0]) || "全部";
      state.rollingData.filters.shaanxiContractType =
        (shaanxiCurveModule && shaanxiCurveModule.contractTypeOptions && shaanxiCurveModule.contractTypeOptions[0]) || "全部";
      state.rollingData.filters.shaanxiSellerUnit =
        (shaanxiCurveModule && shaanxiCurveModule.sellerUnitOptions && shaanxiCurveModule.sellerUnitOptions[0]) || "全部";
      state.rollingData.filters.shaanxiBuyerUnit =
        (shaanxiCurveModule && shaanxiCurveModule.buyerUnitOptions && shaanxiCurveModule.buyerUnitOptions[0]) || "全部";
      state.rollingData.filters.shaanxiContractName =
        (shaanxiCurveModule && shaanxiCurveModule.contractNameOptions && shaanxiCurveModule.contractNameOptions[0]) || "全部";
      setFlashMessage("陕西中长期合同曲线筛选已重置。", "info");
      return true;
    }
    if (action === "query-rolling-data-sx-trade") {
      if (!isRangeValid(state.rollingData.filters.shaanxiTradeDate)) {
        setFlashMessage("请选择有效的交易日期。", "info");
        return true;
      }
      setFlashMessage("已刷新陕西交易总体情况。", "success");
      return true;
    }
    if (action === "reset-rolling-data-sx-trade") {
      var shaanxiTradeModule = getShaanxiTradeOverviewModule();
      var defaultTradeDate = (shaanxiTradeModule && shaanxiTradeModule.defaultDate) || "2026-05-09";
      state.rollingData.filters.shaanxiTradeDate = {
        start: defaultTradeDate,
        end: defaultTradeDate,
      };
      setFlashMessage("陕西交易总体情况筛选已重置。", "info");
      return true;
    }
    if (action === "query-declaration") {
      setFlashMessage("已更新日前申报记录。", "success");
      return true;
    }
    if (action === "reset-declaration") {
      state.declaration.filters.declarationRange = {
        start: "2026-05-09",
        end: "2026-05-09",
      };
      state.declaration.filters.unit = "全部";
      state.declaration.filters.status = "全部";
      setFlashMessage("日前申报筛选已重置。", "info");
      return true;
    }
    if (action === "query-fetch-monitor") {
      if (!isRangeValid(state.fetchMonitor.filters.dateRange)) {
        setFlashMessage("请选择有效的日期范围。", "info");
        return true;
      }
      setFlashMessage("已按当前筛选条件刷新取数监控。", "success");
      return true;
    }
    if (action === "reset-fetch-monitor") {
      state.fetchMonitor.filters.tradeCenter = (fetchMonitorMock.filters && fetchMonitorMock.filters.tradeCenterOptions && fetchMonitorMock.filters.tradeCenterOptions[0]) || "全部";
      state.fetchMonitor.filters.status = (fetchMonitorMock.filters && fetchMonitorMock.filters.statusOptions && fetchMonitorMock.filters.statusOptions[0]) || "全部";
      state.fetchMonitor.filters.taskType = (fetchMonitorMock.filters && fetchMonitorMock.filters.taskTypeOptions && fetchMonitorMock.filters.taskTypeOptions[0]) || "全部";
      state.fetchMonitor.filters.dateRange = cloneRange((fetchMonitorMock.filters && fetchMonitorMock.filters.defaultRange) || {
        start: "2026-05-03",
        end: "2026-05-09",
      });
      setFlashMessage("取数监控筛选已重置。", "info");
      return true;
    }
    if (action === "query-spot-trading-simulation") {
      if (!isRangeValid(state.spotTradingSimulation.filters.backtestRange)) {
        setFlashMessage("请选择有效的回测周期。", "info");
        return true;
      }
      setFlashMessage("已刷新现货交易仿真结果。", "success");
      return true;
    }
    if (action === "reset-spot-trading-simulation") {
      state.spotTradingSimulation.filters.tradeCenter =
        (simulationMock.spotTradingSimulation &&
          simulationMock.spotTradingSimulation.filters &&
          simulationMock.spotTradingSimulation.filters.tradeCenterOptions &&
          simulationMock.spotTradingSimulation.filters.tradeCenterOptions[0]) ||
        "全部";
      state.spotTradingSimulation.filters.strategyName =
        (simulationMock.spotTradingSimulation &&
          simulationMock.spotTradingSimulation.filters &&
          simulationMock.spotTradingSimulation.filters.strategyOptions &&
          simulationMock.spotTradingSimulation.filters.strategyOptions[0]) ||
        "全部";
      state.spotTradingSimulation.filters.backtestRange = cloneRange(
        (simulationMock.spotTradingSimulation &&
          simulationMock.spotTradingSimulation.filters &&
          simulationMock.spotTradingSimulation.filters.defaultRange) || {
          start: "2026-05-03",
          end: "2026-05-09",
        },
      );
      setFlashMessage("现货交易仿真筛选已重置。", "info");
      return true;
    }
    if (action === "query-spot-mock-trading") {
      if (!isRangeValid(state.spotMockTrading.filters.tradeRange)) {
        setFlashMessage("请选择有效的交易周期。", "info");
        return true;
      }
      setFlashMessage("已刷新现货模拟交易记录。", "success");
      return true;
    }
    if (action === "reset-spot-mock-trading") {
      state.spotMockTrading.filters.strategy =
        (simulationMock.spotMockTrading &&
          simulationMock.spotMockTrading.filters &&
          simulationMock.spotMockTrading.filters.strategyOptions &&
          simulationMock.spotMockTrading.filters.strategyOptions[0]) ||
        "请选择交易策略";
      state.spotMockTrading.filters.tradeRange = cloneRange(
        (simulationMock.spotMockTrading &&
          simulationMock.spotMockTrading.filters &&
          simulationMock.spotMockTrading.filters.defaultRange) || {
          start: "2026-05-06",
          end: "2026-05-09",
        },
      );
      setFlashMessage("现货模拟交易筛选已重置。", "info");
      return true;
    }
    if (action === "query-day-ahead-load-prediction") {
      setFlashMessage("已刷新日前负荷预测结果。", "success");
      return true;
    }
    if (action === "reset-day-ahead-load-prediction") {
      state.dayAheadLoadPrediction.filters.tradeCenter =
        (algorithmMock.dayAheadLoadPrediction &&
          algorithmMock.dayAheadLoadPrediction.filters &&
          algorithmMock.dayAheadLoadPrediction.filters.tradeCenterOptions &&
          algorithmMock.dayAheadLoadPrediction.filters.tradeCenterOptions[0]) ||
        "全部";
      state.dayAheadLoadPrediction.filters.userType =
        (algorithmMock.dayAheadLoadPrediction &&
          algorithmMock.dayAheadLoadPrediction.filters &&
          algorithmMock.dayAheadLoadPrediction.filters.userTypeOptions &&
          algorithmMock.dayAheadLoadPrediction.filters.userTypeOptions[0]) ||
        "全部";
      state.dayAheadLoadPrediction.filters.industryType =
        (algorithmMock.dayAheadLoadPrediction &&
          algorithmMock.dayAheadLoadPrediction.filters &&
          algorithmMock.dayAheadLoadPrediction.filters.industryTypeOptions &&
          algorithmMock.dayAheadLoadPrediction.filters.industryTypeOptions[0]) ||
        "全部";
      var defaultLoadDate =
        (algorithmMock.dayAheadLoadPrediction &&
          algorithmMock.dayAheadLoadPrediction.filters &&
          algorithmMock.dayAheadLoadPrediction.filters.defaultDate) ||
        "2026-05-09";
      state.dayAheadLoadPrediction.filters.predictionDate = {
        start: defaultLoadDate,
        end: defaultLoadDate,
      };
      setFlashMessage("日前负荷预测筛选已重置。", "info");
      return true;
    }
    if (action === "query-spot-price-prediction") {
      setFlashMessage("已刷新价格预测结果。", "success");
      return true;
    }
    if (action === "reset-spot-price-prediction") {
      state.spotPricePrediction.filters.tradeCenter =
        (algorithmMock.spotPricePrediction &&
          algorithmMock.spotPricePrediction.filters &&
          algorithmMock.spotPricePrediction.filters.tradeCenterOptions &&
          algorithmMock.spotPricePrediction.filters.tradeCenterOptions[0]) ||
        "全部";
      state.spotPricePrediction.filters.priceType =
        (algorithmMock.spotPricePrediction &&
          algorithmMock.spotPricePrediction.filters &&
          algorithmMock.spotPricePrediction.filters.priceTypeOptions &&
          algorithmMock.spotPricePrediction.filters.priceTypeOptions[0]) ||
        "全部";
      var defaultPriceDate =
        (algorithmMock.spotPricePrediction &&
          algorithmMock.spotPricePrediction.filters &&
          algorithmMock.spotPricePrediction.filters.defaultDate) ||
        "2026-05-09";
      state.spotPricePrediction.filters.predictionDate = {
        start: defaultPriceDate,
        end: defaultPriceDate,
      };
      setFlashMessage("价格预测筛选已重置。", "info");
      return true;
    }
    if (action === "view-record-detail") {
      setFlashMessage("详情抽屉待接入，这里先展示 mock 交互。", "info");
      return true;
    }
    if (action === "edit-record") {
      setFlashMessage("编辑功能待接入，这里先展示 mock 交互。", "info");
      return true;
    }
    if (action === "retry-fetch-task") {
      setFlashMessage("重新拉取任务已提交。", "success");
      return true;
    }
    if (action === "view-fetch-log") {
      setFlashMessage("日志查看能力待接入，这里先展示 mock 交互。", "info");
      return true;
    }
    if (action === "retry-mock-trading") {
      setFlashMessage("模拟交易已重新执行。", "success");
      return true;
    }
    if (action === "reparse-settlement-file") {
      setFlashMessage(
        state.currentPageKey === "gd-settlement" && getSelectedTradeCenterKey() === "shaanxi" && state.settlement.activeTab === "日清算"
          ? "原始 Excel 文件重新解析任务已提交。"
          : "PDF 重新解析任务已提交。",
        "success"
      );
      return true;
    }
    if (action === "simulate-declaration-result") {
      setFlashMessage("模拟申报结果已触发。", "success");
      return true;
    }
    if (action === "dismiss-permission") {
      state.simulation.permissionVisible = false;
      return true;
    }
    if (action === "download-task-file") {
      setFlashMessage("已准备下载文件。", "success");
      return true;
    }
    if (action === "retry-download-task") {
      var taskId = target.getAttribute("data-task-id");
      state.downloadTasks = state.downloadTasks.map(function mapTask(task) {
        if (task.id === taskId) {
          return {
            id: task.id,
            fileName: task.fileName,
            createdAt: formatDateTime(new Date()),
            status: "排队中",
            source: task.source,
          };
        }
        return task;
      });
      setFlashMessage("下载任务已重新提交。", "info");
      return true;
    }
    return false;
  }

  document.addEventListener("click", function handleClick(event) {
    var pageButton = event.target.closest("[data-page-key]");
    if (pageButton) {
      event.preventDefault();
      closeAllPanels();
      state.ui.hasCompare = false;
      state.ui.compareModalVisible = false;
      state.ui.manualUpdateModalVisible = false;
      state.ui.downloadModalVisible = false;
      var shouldRenderImmediately = pageState.navigate(state, pageButton.getAttribute("data-page-key"), registry, global.location);
      if (shouldRenderImmediately) {
        renderApp();
      }
      return;
    }

    var uiActionButton = event.target.closest("[data-ui-action]");
    if (uiActionButton) {
      event.preventDefault();
      if (handleUiAction(uiActionButton.getAttribute("data-ui-action"), uiActionButton)) {
        renderApp();
        return;
      }
    }

    var tradeCenterToggle = event.target.closest("[data-trade-center-toggle]");
    if (tradeCenterToggle) {
      state.ui.tradeCenterOpen = !state.ui.tradeCenterOpen;
      if (state.ui.tradeCenterOpen) {
        state.ui.activeDatePickerId = null;
      }
      renderApp();
      return;
    }

    var tradeCenterSelect = event.target.closest("[data-trade-center-select]");
    if (tradeCenterSelect) {
      var selectedTradeCenter = tradeCenterSelect.getAttribute("data-trade-center-select");
      state.ui.selectedTradeCenter = selectedTradeCenter;
      state.ui.tradeCenterOpen = false;
      state.ui.hasCompare = false;
      state.info.selectedMetric = "";
      renderApp();
      return;
    }

    var datePickerToggle = event.target.closest("[data-date-picker-toggle]");
    if (datePickerToggle) {
      openDatePicker(datePickerToggle.getAttribute("data-date-picker-toggle"));
      renderApp();
      return;
    }

    var datePickerApply = event.target.closest("[data-date-picker-apply]");
    if (datePickerApply) {
      applyDatePicker(datePickerApply.getAttribute("data-date-picker-apply"));
      renderApp();
      return;
    }

    var datePickerCancel = event.target.closest("[data-date-picker-cancel]");
    if (datePickerCancel) {
      closeDatePicker(datePickerCancel.getAttribute("data-date-picker-cancel"), false);
      renderApp();
      return;
    }

    var sidebarToggle = event.target.closest("[data-sidebar-toggle]");
    if (sidebarToggle) {
      state.sidebar[sidebarToggle.getAttribute("data-sidebar-toggle")] = !state.sidebar[sidebarToggle.getAttribute("data-sidebar-toggle")];
      renderApp();
      return;
    }

    var primaryTabButton = event.target.closest("[data-primary-tab]");
    if (primaryTabButton) {
      state.info.primaryTab = primaryTabButton.getAttribute("data-primary-tab");
      if (state.info.primaryTab === "负荷信息" && INFO_DISCLOSURE_SECONDARY_TABS.indexOf(state.info.secondaryTab) < 0) {
        state.info.secondaryTab = INFO_DISCLOSURE_SECONDARY_TABS[0];
      }
      state.ui.downloadDataType = getActiveInfoTab();
      if (state.info.primaryTab !== "负荷信息" && !isInfoTradeTab(state.info.primaryTab)) {
        state.ui.hasCompare = false;
      }
      renderApp();
      return;
    }

    var secondaryTabButton = event.target.closest("[data-secondary-tab]");
    if (secondaryTabButton) {
      if (state.currentPageKey === "gd-settlement" && getSelectedTradeCenterKey() !== "guangdong" && state.settlement.activeTab === "月结算") {
        state.settlement.secondaryTab = secondaryTabButton.getAttribute("data-secondary-tab");
        state.ui.downloadDataType = "月结算-" + state.settlement.secondaryTab;
        renderApp();
        return;
      }
      state.info.secondaryTab = secondaryTabButton.getAttribute("data-secondary-tab");
      if (state.info.secondaryTab !== "负荷信息") {
        state.ui.hasCompare = false;
      }
      renderApp();
      return;
    }

    var hunanSettlementTypeButton = event.target.closest("[data-hunan-settlement-type]");
    if (hunanSettlementTypeButton) {
      state.settlement.filters.dailyStatementType = hunanSettlementTypeButton.getAttribute("data-hunan-settlement-type");
      state.ui.downloadDataType = getCurrentDownloadType();
      renderApp();
      return;
    }

    var shaanxiSettlementTypeButton = event.target.closest("[data-shaanxi-settlement-type]");
    if (shaanxiSettlementTypeButton) {
      state.settlement.filters.dailyStatementType = shaanxiSettlementTypeButton.getAttribute("data-shaanxi-settlement-type");
      state.ui.downloadDataType = getCurrentDownloadType();
      renderApp();
      return;
    }

    var infoMetricButton = event.target.closest("[data-info-metric]");
    if (infoMetricButton) {
      state.info.selectedMetric = infoMetricButton.getAttribute("data-info-metric");
      renderApp();
      return;
    }

    var pageTabButton = event.target.closest("[data-page-tab]");
    if (pageTabButton) {
      var nextTab = pageTabButton.getAttribute("data-page-tab");
      state.ui.hasCompare = false;
      if (state.currentPageKey === "gd-trade-result") {
        state.tradeResult.activeTab = nextTab;
      } else if (isCurrentMarketDisclosureView()) {
        getMarketDisclosureState().activeTab = nextTab;
      } else if (state.currentPageKey === "gd-settlement") {
        state.settlement.activeTab = nextTab;
      }
      state.ui.downloadDataType = getCurrentDownloadType();
      renderApp();
      return;
    }

    var infoTreeGroup = event.target.closest("[data-info-tree-group]");
    if (infoTreeGroup) {
      toggleChartLegendGroup(getInfoDisclosureTreeChartId(getInfoDisclosurePageData()), infoTreeGroup.getAttribute("data-info-tree-group").split(","));
      renderApp();
      return;
    }

    var infoTreeSeries = event.target.closest("[data-info-tree-series]");
    if (infoTreeSeries) {
      toggleChartLegend(getInfoDisclosureTreeChartId(getInfoDisclosurePageData()), infoTreeSeries.getAttribute("data-info-tree-series"));
      renderApp();
      return;
    }

    var infoProfileMode = event.target.closest("[data-info-profile-mode]");
    if (infoProfileMode) {
      state.info.profileViewMode = infoProfileMode.getAttribute("data-info-profile-mode");
      renderApp();
      return;
    }

    var metricToggle = event.target.closest("[data-metric-toggle]");
    if (metricToggle) {
      toggleMetricBranch(metricToggle.getAttribute("data-metric-toggle"));
      return;
    }

    var metricCheck = event.target.closest("[data-metric-check]");
    if (metricCheck) {
      toggleCheckedMetric(metricCheck.getAttribute("data-metric-check"));
      return;
    }

    var metricRow = event.target.closest("[data-metric-row]");
    if (metricRow) {
      selectMetric(metricRow.getAttribute("data-metric-row"));
      return;
    }

    var chartGroup = event.target.closest("[data-chart-group]");
    if (chartGroup) {
      toggleChartLegendGroup(chartGroup.getAttribute("data-chart-id"), chartGroup.getAttribute("data-chart-group").split(","));
      renderApp();
      return;
    }

    var chartLegend = event.target.closest("[data-chart-legend]");
    if (chartLegend) {
      toggleChartLegend(chartLegend.getAttribute("data-chart-id"), chartLegend.getAttribute("data-chart-legend"));
      renderApp();
      return;
    }

    var tableSort = event.target.closest("[data-sort-key]");
    if (tableSort) {
      toggleTableSort(tableSort.getAttribute("data-table-id"), tableSort.getAttribute("data-sort-key"));
      renderApp();
      return;
    }

    var copyCell = event.target.closest("[data-copy-cell]");
    if (copyCell) {
      var value = copyCell.getAttribute("data-copy-cell");
      if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
        global.navigator.clipboard.writeText(value).catch(function noop() {});
      }
      setFlashMessage("单元格内容已复制。", "success");
      renderApp();
      return;
    }

    var tradeNodeItem = event.target.closest("[data-trade-node]");
    if (tradeNodeItem) {
      state.tradeResult.selectedNode = tradeNodeItem.getAttribute("data-trade-node");
      renderApp();
      return;
    }

    if (event.target.classList.contains("overlay-backdrop")) {
      state.ui.compareModalVisible = false;
      state.ui.manualUpdateModalVisible = false;
      state.ui.downloadModalVisible = false;
      closeAllPanels();
      renderApp();
      return;
    }

    if (event.target.classList.contains("drawer-overlay")) {
      state.ui.downloadTaskDrawerVisible = false;
      renderApp();
      return;
    }

    if (!event.target.closest(".selector-shell") && (state.ui.tradeCenterOpen || state.ui.activeDatePickerId)) {
      closeAllPanels();
      renderApp();
    }
  });

  document.addEventListener("change", function handleChange(event) {
    if (event.target.matches("[data-manual-upload-file]")) {
      state.ui.manualUploadFileName = event.target.files && event.target.files[0] ? event.target.files[0].name : "";
      renderApp();
      return;
    }

    if (event.target.matches("[data-update-mode]")) {
      state.ui.manualUpdateMode = event.target.getAttribute("data-update-mode");
      state.ui.manualUpdateError = "";
      renderApp();
      return;
    }

    if (event.target.matches("[data-download-type]")) {
      state.ui.downloadDataType = event.target.value;
      renderApp();
      return;
    }

    if (event.target.matches("[data-filter-scope][data-filter-key]")) {
      var scope = event.target.getAttribute("data-filter-scope");
      var key = event.target.getAttribute("data-filter-key");
      if (scope === "info") {
        state.info.filters[key] = event.target.value;
      } else if (scope === "tradeResult") {
        state.tradeResult.filters[key] = event.target.value;
      } else if (scope === "settlement") {
        state.settlement.filters[key] = event.target.value;
      } else if (scope === "rollingData") {
        state.rollingData.filters[key] = event.target.value;
      } else if (scope === "retailRelation") {
        state.retailRelation.filters[key] = event.target.value;
      } else if (scope === "declaration") {
        state.declaration.filters[key] = event.target.value;
      } else if (scope === "fetchMonitor") {
        state.fetchMonitor.filters[key] = event.target.value;
      } else if (scope === "spotTradingSimulation") {
        state.spotTradingSimulation.filters[key] = event.target.value;
      } else if (scope === "spotMockTrading") {
        state.spotMockTrading.filters[key] = event.target.value;
      } else if (scope === "dayAheadLoadPrediction") {
        state.dayAheadLoadPrediction.filters[key] = event.target.value;
      } else if (scope === "spotPricePrediction") {
        state.spotPricePrediction.filters[key] = event.target.value;
      }
      renderApp();
      return;
    }

    if (event.target.matches("[data-filter-field]")) {
      state.info.filters[event.target.getAttribute("data-filter-field")] = event.target.value;
      renderApp();
      return;
    }

    if (event.target.matches("[data-date-input]")) {
      var parts = event.target.getAttribute("data-date-input").split(":");
      updateDateDraft(parts[0], parts[1], event.target.value);
      return;
    }
  });

  global.addEventListener("hashchange", function syncRouteFromHash() {
    pageState.syncFromHash(state, registry, global.location);
    renderApp();
  });

  global.setInterval(function refreshDownloadTasks() {
    var changed = false;
    state.downloadTasks = state.downloadTasks.map(function mapTask(task) {
      if (task.status === "排队中") {
        changed = true;
        return {
          id: task.id,
          fileName: task.fileName,
          createdAt: task.createdAt,
          status: "成功",
          source: task.source,
        };
      }
      return task;
    });
    if (changed) {
      renderApp();
    }
  }, 3000);

  if (!global.location.hash) {
    global.location.hash = registry.getHashFromPageKey(registry.defaultPageKey);
  }

  pageState.syncFromHash(state, registry, global.location);
  renderApp();
})(window);
