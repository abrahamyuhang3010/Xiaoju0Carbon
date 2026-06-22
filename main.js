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
  var dataMonitorMock = appMocks.dataMonitor || {};
  var simulationMock = appMocks.simulation || {};
  var algorithmMock = appMocks.algorithm || {};
  var dataDisclosureTimeConfig = global.BOSS_DATA_DISCLOSURE_TIME_CONFIG || {};

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
  var SETTLEMENT_TRADE_CENTER_OPTIONS = [
    "广东电力交易中心",
    "湖南电力交易中心",
    "陕西电力交易中心",
  ];
  var DATA_MONITOR_TRADE_CENTER_OPTIONS = ["广东交易中心", "湖南交易中心", "陕西交易中心"];
  var INFO_DISCLOSURE_PRIMARY_TABS = infoDisclosureConfig.primaryTabs || [
    "负荷信息",
    "全省统一出清价",
    "出清电量",
    "交易结果",
    "分时电量",
    "节点电价",
    "日前申报",
  ];
  var INFO_DISCLOSURE_SECONDARY_TABS =
    (infoDisclosureConfig.secondaryTabs && infoDisclosureConfig.secondaryTabs["负荷信息"]) || ["负荷信息", "负荷详情", "机组检修容量", "备用信息"];
  var INFO_DISCLOSURE_TIME_SHARING_TAB = "分时电量";
  var INFO_DISCLOSURE_TIME_SHARING_TABS =
    (infoDisclosureConfig.secondaryTabs && infoDisclosureConfig.secondaryTabs[INFO_DISCLOSURE_TIME_SHARING_TAB]) ||
    ["售电公司分时电量", "用电企业分时电量"];
  var INFO_DISCLOSURE_SELLER_HISTORY_TAB = "售电公司分时电量历史回溯";
  var INFO_DISCLOSURE_USER_HISTORY_TAB = "用电企业分时电量历史回溯";
  var HISTORY_RETRACE_SCOPE_TEXT = "当前数据为历史回溯口径，按所选代理月份对应的实际代理用户清单统计，与常规分时电量页面的数据口径可能存在差异。";
  var TIME_SHARING_HOUR_LABELS = Array.from({ length: 24 }, function createTimeSharingHour(_, index) {
    return String(index).padStart(2, "0") + ":00";
  });
  var INFO_DISCLOSURE_EMPTY_MESSAGE =
    infoDisclosureConfig.emptyStateMessage || "当前交易中心暂未接入该披露类型数据，请切换其他披露类型或手动更新数据。";
  var INFO_DISCLOSURE_NO_DATA_SOURCE_MESSAGE =
    infoDisclosureConfig.noDataSourceMessage || "当前交易中心暂无可展示的信息披露数据";
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
    .concat(INFO_DISCLOSURE_TIME_SHARING_TABS || [])
    .filter(function dedupe(item, index, source) {
      return source.indexOf(item) === index;
    });
  var DOWNLOAD_SUMMARY = (appMocks.downloadTasks && appMocks.downloadTasks.summary) || {
    retainDays: 7,
    maxVisibleRecords: 10,
    maxRowsPerFile: 200000,
  };
  var DISCLOSURE_TIME_PAGE_SIZE = 12;

  var flashTimer = null;
  var singleMetricLoadTimer = null;
  var singleMetricLoadToken = 0;
  var marketPageViewDataCache = {};

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
    location: global.location,
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
      "数据监控": "monitor",
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
      "数据监控": "monitor",
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

  function getTradeCenterKeyByName(centerName) {
    if (centerName === "湖南电力交易中心") {
      return "hunan";
    }
    if (centerName === "陕西电力交易中心") {
      return "shaanxi";
    }
    return "guangdong";
  }

  function isSupportedPowerTradeCenter() {
    return (
      state.ui.selectedTradeCenter === "广东电力交易中心" ||
      state.ui.selectedTradeCenter === "湖南电力交易中心" ||
      state.ui.selectedTradeCenter === "陕西电力交易中心"
    );
  }

  function getInfoDisclosureTradeCenterMeta() {
    var tradeCenterMeta = (infoDisclosureConfig.tradeCenters && infoDisclosureConfig.tradeCenters[getSelectedTradeCenterKey()]) || {};
    return {
      title: infoDisclosureConfig.title || "信息披露",
      name: tradeCenterMeta.name || state.ui.selectedTradeCenter,
      description: tradeCenterMeta.description || "",
    };
  }

  function getLoadInfoConfigCenterKey(tradeCenterKey) {
    var normalizedKey = tradeCenterKey || getSelectedTradeCenterKey();
    if (normalizedKey === "guangdong") {
      return "gd";
    }
    if (normalizedKey === "hunan") {
      return "hn";
    }
    if (normalizedKey === "shaanxi") {
      return "sx";
    }
    return normalizedKey;
  }

  function getLoadInfoSubTabConfigs(tradeCenterKey) {
    var config = infoDisclosureConfig.loadInfoTabConfig || {};
    var centerConfig = config[getLoadInfoConfigCenterKey(tradeCenterKey)] || config[tradeCenterKey] || [];

    if (!centerConfig.length) {
      centerConfig = (INFO_DISCLOSURE_SECONDARY_TABS || []).map(function mapFallbackTab(tab, index) {
        return {
          key: tab,
          label: tab,
          hasDataSource: true,
          order: index + 1,
        };
      });
    }

    return centerConfig
      .slice()
      .sort(function sortByOrder(a, b) {
        return Number(a.order || 0) - Number(b.order || 0);
      });
  }

  function getLoadInfoSubTabConfigByLabel(label, tradeCenterKey) {
    return getLoadInfoSubTabConfigs(tradeCenterKey).find(function findConfig(item) {
      return item && item.label === label;
    }) || null;
  }

  function getVisibleLoadInfoSecondaryTabs(tradeCenterKey) {
    return getLoadInfoSubTabConfigs(tradeCenterKey)
      .filter(function filterConfig(item) {
        return item && item.hasDataSource === true;
      })
      .map(function mapConfig(item) {
        return item.label;
      });
  }

  function getDisclosureDataSourceAccess(tradeCenterKey) {
    var config = infoDisclosureConfig.dataSourceAccess;
    if (!config || !Object.keys(config).length) {
      return null;
    }
    return config[tradeCenterKey || getSelectedTradeCenterKey()] || {};
  }

  function getUnifiedClearingPriceConfig(tradeCenterKey) {
    var configs = infoDisclosureConfig.unifiedClearingPrice || {};
    return configs[tradeCenterKey || getSelectedTradeCenterKey()] || {};
  }

  function hasInfoDisclosureDataSource(tab, tradeCenterKey) {
    var normalizedTradeCenterKey = tradeCenterKey || getSelectedTradeCenterKey();
    var secondaryTabs = INFO_DISCLOSURE_SECONDARY_TABS || [];
    var timeSharingTabs = INFO_DISCLOSURE_TIME_SHARING_TABS || [];
    var isSecondaryTab = secondaryTabs.indexOf(tab) >= 0;
    var loadInfoTabConfig = isSecondaryTab ? getLoadInfoSubTabConfigByLabel(tab, normalizedTradeCenterKey) : null;

    if (loadInfoTabConfig) {
      return loadInfoTabConfig.hasDataSource === true;
    }

    if (tab === INFO_DISCLOSURE_TIME_SHARING_TAB) {
      return timeSharingTabs.some(function someTimeSharingTab(timeSharingTab) {
        return hasInfoDisclosureDataSource(timeSharingTab, normalizedTradeCenterKey);
      });
    }

    if (tab === "全省统一出清价") {
      var unifiedClearingPriceConfig = getUnifiedClearingPriceConfig(normalizedTradeCenterKey);
      if (Object.prototype.hasOwnProperty.call(unifiedClearingPriceConfig, "hasDataSource")) {
        return unifiedClearingPriceConfig.hasDataSource === true;
      }
    }

    var access = getDisclosureDataSourceAccess(normalizedTradeCenterKey);
    if (access && Object.prototype.hasOwnProperty.call(access, tab)) {
      return access[tab] === true;
    }

    var pageData = resolveMarketPageViewData({
      pageType: "infoDisclosure",
      tradeCenter: normalizedTradeCenterKey,
      primaryTab: isSecondaryTab ? "负荷信息" : tab,
      secondaryTab: isSecondaryTab ? tab : "",
    });

    if (pageData && typeof pageData.hasDataSource === "boolean") {
      return pageData.hasDataSource;
    }

    if (!access) {
      return true;
    }
    return true;
  }

  function isInfoDisclosureCompareEnabledByConfig(tab) {
    var supportCompare = infoDisclosureConfig.supportCompare || {};
    var centerSupportCompare =
      (infoDisclosureConfig.supportCompareByCenter && infoDisclosureConfig.supportCompareByCenter[getSelectedTradeCenterKey()]) || {};
    var compareSupport = infoDisclosureConfig.compareSupport || {};
    var disabledTabs = compareSupport.disabledTabs || {};
    var centerDisabledTabs =
      (compareSupport.disabledTabsByCenter && compareSupport.disabledTabsByCenter[getSelectedTradeCenterKey()]) || {};
    var activeTab = tab || getActiveInfoTab();

    if (Object.prototype.hasOwnProperty.call(centerSupportCompare, activeTab)) {
      return centerSupportCompare[activeTab] !== false;
    }
    if (Object.prototype.hasOwnProperty.call(supportCompare, activeTab)) {
      return supportCompare[activeTab] !== false;
    }

    return disabledTabs[activeTab] !== true && centerDisabledTabs[activeTab] !== true;
  }

  function isSellerTimeSharingTargetTab(tab) {
    var activeTab = tab || getActiveInfoTab();
    return activeTab === "售电公司分时电量" || activeTab === INFO_DISCLOSURE_SELLER_HISTORY_TAB;
  }

  function isEnterpriseTimeSharingTargetTab(tab) {
    var activeTab = tab || getActiveInfoTab();
    return activeTab === "用电企业分时电量" || activeTab === INFO_DISCLOSURE_USER_HISTORY_TAB;
  }

  function isTimeSharingUpdateTargetTab(tab) {
    return isSellerTimeSharingTargetTab(tab) || isEnterpriseTimeSharingTargetTab(tab);
  }

  function isSellerHistoryTargetTab(tab) {
    return (tab || getActiveInfoTab()) === INFO_DISCLOSURE_SELLER_HISTORY_TAB;
  }

  function isEnterpriseHistoryTargetTab(tab) {
    return (tab || getActiveInfoTab()) === INFO_DISCLOSURE_USER_HISTORY_TAB;
  }

  function isTimeSharingHistoryUpdateTargetTab(tab) {
    return isSellerHistoryTargetTab(tab) || isEnterpriseHistoryTargetTab(tab);
  }

  function isSellerTimeSharingCompareEnabled(tab) {
    return isSellerTimeSharingTargetTab(tab);
  }

  function isInfoDisclosureCompareActive(tab) {
    return state.ui.hasCompare && (isSellerTimeSharingCompareEnabled(tab) || isInfoDisclosureCompareEnabledByConfig(tab));
  }

  function isCompareSupportedInCurrentContext() {
    if (isInfoDisclosurePage(state.currentPageKey)) {
      return isInfoDisclosureCompareSupported();
    }
    if (state.currentPageKey === "gd-trade-result") {
      return isTradeResultCompareSupported();
    }
    return true;
  }

  function getVisibleInfoSecondaryTabs(primaryTab, tradeCenterKey) {
    if (primaryTab === "负荷信息") {
      return getVisibleLoadInfoSecondaryTabs(tradeCenterKey);
    }

    var secondaryTabs =
      (infoDisclosureConfig.secondaryTabs && infoDisclosureConfig.secondaryTabs[primaryTab]) ||
      [];

    return (secondaryTabs || []).filter(function filterSecondaryTab(tab) {
      return hasInfoDisclosureDataSource(tab, tradeCenterKey);
    });
  }

  function getVisibleInfoPrimaryTabs(tradeCenterKey) {
    return (INFO_DISCLOSURE_PRIMARY_TABS || []).filter(function filterPrimaryTab(tab) {
      var secondaryTabs =
        (infoDisclosureConfig.secondaryTabs && infoDisclosureConfig.secondaryTabs[tab]) ||
        (tab === "负荷信息" ? INFO_DISCLOSURE_SECONDARY_TABS : null);

      if (secondaryTabs && secondaryTabs.length) {
        return getVisibleInfoSecondaryTabs(tab, tradeCenterKey).length > 0;
      }

      return hasInfoDisclosureDataSource(tab, tradeCenterKey);
    });
  }

  function getFirstVisibleInfoTabPair(tradeCenterKey) {
    var primaryTabs = getVisibleInfoPrimaryTabs(tradeCenterKey);
    var primaryTab = primaryTabs[0] || "";
    var secondaryTabs = primaryTab ? getVisibleInfoSecondaryTabs(primaryTab, tradeCenterKey) : [];

    return {
      primaryTab: primaryTab,
      secondaryTab: secondaryTabs[0] || "",
    };
  }

  function ensureVisibleInfoDisclosureTab() {
    var tradeCenterKey = getSelectedTradeCenterKey();
    var visiblePrimaryTabs = getVisibleInfoPrimaryTabs(tradeCenterKey);
    var currentPrimaryTab = state.info.primaryTab || visiblePrimaryTabs[0] || "";
    var changed = false;

    if (!visiblePrimaryTabs.length) {
      if (state.info.primaryTab !== "") {
        state.info.primaryTab = "";
        changed = true;
      }
      if (state.info.secondaryTab !== "") {
        state.info.secondaryTab = "";
        changed = true;
      }
      return changed;
    }

    if (visiblePrimaryTabs.indexOf(currentPrimaryTab) < 0) {
      currentPrimaryTab = visiblePrimaryTabs[0];
      state.info.primaryTab = currentPrimaryTab;
      changed = true;
    }

    var visibleSecondaryTabs = getVisibleInfoSecondaryTabs(currentPrimaryTab, tradeCenterKey);
    if (visibleSecondaryTabs.length && visibleSecondaryTabs.indexOf(state.info.secondaryTab) < 0) {
      state.info.secondaryTab = visibleSecondaryTabs[0];
      changed = true;
    } else if (!visibleSecondaryTabs.length && state.info.secondaryTab) {
      state.info.secondaryTab = "";
      changed = true;
    }

    return changed;
  }

  function getActiveInfoPrimaryTab() {
    var visiblePrimaryTabs = getVisibleInfoPrimaryTabs();
    if (!visiblePrimaryTabs.length) {
      return "";
    }
    if (visiblePrimaryTabs.indexOf(state.info.primaryTab) >= 0) {
      return state.info.primaryTab;
    }
    return visiblePrimaryTabs[0];
  }

  function getActiveInfoSecondaryTab() {
    var secondaryTabs = getVisibleInfoSecondaryTabs(getActiveInfoPrimaryTab());
    if (!secondaryTabs.length) {
      return "";
    }
    if (secondaryTabs.indexOf(state.info.secondaryTab) >= 0) {
      return state.info.secondaryTab;
    }
    return secondaryTabs[0];
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

  function getTradeCenterDefaultDisclosureDate(tradeCenterKey) {
    var bundle = getTradeCenterMockBundle(tradeCenterKey);
    var pageDefaultDate =
      bundle &&
      bundle.marketPageData &&
      bundle.marketPageData.defaultDate;
    if (pageDefaultDate) {
      return pageDefaultDate;
    }
    if (bundle && bundle.defaultRange && bundle.defaultRange.end) {
      return bundle.defaultRange.end;
    }
    if (bundle && bundle.infoDisclosure && bundle.infoDisclosure.defaultRunDate) {
      return bundle.infoDisclosure.defaultRunDate;
    }
    return state.ui.runtimeRange.start;
  }

  function getMarketPageData(pageType, tradeCenterKey) {
    var marketPageRegistry = global.BOSS_MARKET_PAGE_DATA;
    if (marketPageRegistry && typeof marketPageRegistry.getPageBundle === "function") {
      return marketPageRegistry.getPageBundle(tradeCenterKey || getSelectedTradeCenterKey(), pageType) || null;
    }
    var bundle = getTradeCenterMockBundle(tradeCenterKey || getSelectedTradeCenterKey());
    return (bundle && bundle[pageType]) || null;
  }

  function getMarketPageRequestTradeCenterKey(value) {
    var text = String(value || "").toLowerCase();
    if (text === "hunan" || text.indexOf("湖南") >= 0) {
      return "hunan";
    }
    if (text === "shaanxi" || text.indexOf("陕西") >= 0) {
      return "shaanxi";
    }
    return "guangdong";
  }

  function getMarketPageRequestCacheKey(request) {
    return [
      request && request.pageType ? request.pageType : "",
      getMarketPageRequestTradeCenterKey(request && request.tradeCenter),
      request && request.primaryTab ? request.primaryTab : "",
      request && request.secondaryTab ? request.secondaryTab : "",
    ].join("|");
  }

  function resolveMarketPageViewData(request) {
    var marketPageRegistry = global.BOSS_MARKET_PAGE_DATA;
    if (marketPageRegistry && typeof marketPageRegistry.getMarketPageData === "function") {
      var cacheKey = getMarketPageRequestCacheKey(request || {});
      if (!Object.prototype.hasOwnProperty.call(marketPageViewDataCache, cacheKey)) {
        marketPageViewDataCache[cacheKey] = marketPageRegistry.getMarketPageData(request) || null;
      }
      return marketPageViewDataCache[cacheKey];
    }
    return null;
  }

  function getInfoDisclosurePageData() {
    var activePrimaryTab = getActiveInfoPrimaryTab();
    var activeSecondaryTab = getActiveInfoSecondaryTab();
    var primaryTabForData = activePrimaryTab === INFO_DISCLOSURE_TIME_SHARING_TAB ? activeSecondaryTab : activePrimaryTab;
    var secondaryTabForData = activePrimaryTab === "负荷信息" ? activeSecondaryTab : "";

    return (
      resolveMarketPageViewData({
        pageType: "infoDisclosure",
        tradeCenter: state.ui.selectedTradeCenter,
        primaryTab: primaryTabForData,
        secondaryTab: secondaryTabForData,
      }) || {}
    );
  }

  function isSingleMetricLoadPage(pageData) {
    return Boolean(pageData && pageData.viewType === "singleMetricLoad");
  }

  function isScopedLoadInfoTab() {
    return getActiveInfoPrimaryTab() === "负荷信息" && getActiveInfoSecondaryTab() === "负荷信息";
  }

  function getInfoDisclosureActiveRange(pageData, overrideRange) {
    if (overrideRange) {
      return overrideRange;
    }

    if (isUnifiedMockInfoTradeTab(getActiveInfoTab())) {
      return getCurrentInfoDateRange();
    }

    if (getActiveInfoPrimaryTab() === INFO_DISCLOSURE_TIME_SHARING_TAB) {
      return getInfoTimeSharingRange();
    }

    if (!isCurrentMarketDisclosureView()) {
      return getCurrentInfoDateRange();
    }

    if (isSingleMetricLoadPage(pageData) && getSelectedTradeCenterKey() === "guangdong") {
      return state.ui.runtimeRange;
    }

    if (
      pageData &&
      pageData.filters &&
      pageData.filters.date &&
      pageData.datePickerMode === "range" &&
      getMarketDisclosureState().queryCount === 0
    ) {
      return {
        start: pageData.filters.date,
        end: pageData.filters.date,
      };
    }

    return getMarketDisclosureState().appliedRange;
  }

  function triggerSingleMetricLoadRefresh() {
    if (!isInfoDisclosurePage(state.currentPageKey)) {
      state.ui.singleMetricLoadLoading = false;
      renderApp();
      return;
    }

    var pageData = getInfoDisclosurePageData();
    if (!isSingleMetricLoadPage(pageData)) {
      state.ui.singleMetricLoadLoading = false;
      renderApp();
      return;
    }

    state.ui.singleMetricLoadLoading = true;
    singleMetricLoadToken += 1;
    if (singleMetricLoadTimer) {
      global.clearTimeout(singleMetricLoadTimer);
    }

    renderApp();

    (function scheduleDone(currentToken) {
      singleMetricLoadTimer = global.setTimeout(function clearLoading() {
        if (currentToken !== singleMetricLoadToken) {
          return;
        }
        state.ui.singleMetricLoadLoading = false;
        renderApp();
      }, 220);
    })(singleMetricLoadToken);
  }

  function getUnifiedInfoDisclosureDatePickerMode(pageData) {
    if (pageData && pageData.datePickerMode) {
      return pageData.datePickerMode;
    }

    if (
      pageData &&
      (pageData.viewType === "singleMetricLoad" ||
        pageData.viewType === "metricTreeCompare" ||
        pageData.viewType === "maintenanceComposite" ||
        pageData.viewType === "disclosureTable" ||
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
    getVisibleInfoDisclosureBusinessFilterFields(pageData).forEach(function eachField(field) {
      if (!field || !field.fieldKey) {
        return;
      }
      state.info.filters[field.fieldKey] =
        field.defaultValue !== undefined ? field.defaultValue : (field.options && field.options[0]) || "";
    });
  }

  function isRunDateFilterField(field) {
    var label = String((field && (field.label || field.title || field.name)) || "");
    var fieldKey = String((field && (field.fieldKey || field.key || field.id)) || "");
    var normalizedKey = fieldKey.toLowerCase();

    return (
      label.indexOf("运行日期") >= 0 ||
      label.indexOf("用电日期") >= 0 ||
      label.indexOf("日期范围") >= 0 ||
      normalizedKey === "rundate" ||
      normalizedKey === "run_date" ||
      normalizedKey === "daterange" ||
      normalizedKey === "date_range" ||
      normalizedKey === "operationdate" ||
      normalizedKey === "operation_date"
    );
  }

  function isDayAheadDeclarationTab(tab) {
    return (tab || getActiveInfoTab()) === "日前申报";
  }

  function getVisibleInfoDisclosureBusinessFilterFields(pageData) {
    if (isDayAheadDeclarationTab()) {
      return [];
    }

    return (pageData && pageData.filterFields ? pageData.filterFields : []).filter(function filterField(field) {
      return field && !isRunDateFilterField(field);
    });
  }

  function renderUnifiedInfoDisclosureBusinessFilterFields(pageData) {
    return getVisibleInfoDisclosureBusinessFilterFields(pageData)
      .map(function mapField(field) {
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
    if (
      (!isUnifiedInfoDisclosureSingleDateMode(pageData) && !(pageData && pageData.filters && pageData.filters.date)) ||
      isUnifiedMockInfoTradeTab(getActiveInfoTab())
    ) {
      return;
    }

    if (!isCurrentMarketDisclosureView()) {
      var standaloneDefaultDate = pageData && pageData.filters && pageData.filters.date;
      if (
        standaloneDefaultDate &&
        state.info.filters.maintenanceRange.start === state.info.filters.maintenanceRange.end &&
        state.info.filters.maintenanceRange.start !== standaloneDefaultDate
      ) {
        var standaloneDefaultRange = {
          start: standaloneDefaultDate,
          end: standaloneDefaultDate,
        };
        setInfoLoadRunDateRange(standaloneDefaultRange);
      }
      return;
    }

    var disclosureState = getMarketDisclosureState();
    var defaultDate =
      (pageData && pageData.filters && pageData.filters.date) ||
      getTradeCenterDefaultDisclosureDate(getSelectedTradeCenterKey()) ||
      disclosureState.appliedRange.end ||
      disclosureState.filterRange.end ||
      disclosureState.filterRange.start;

    if (!defaultDate) {
      return;
    }

    if (
      disclosureState.queryCount === 0 &&
      pageData &&
      pageData.filters &&
      pageData.filters.date &&
      (disclosureState.appliedRange.start !== defaultDate ||
        disclosureState.appliedRange.end !== defaultDate ||
        disclosureState.filterRange.start !== defaultDate ||
        disclosureState.filterRange.end !== defaultDate)
    ) {
      disclosureState.filterRange = {
        start: defaultDate,
        end: defaultDate,
      };
      disclosureState.appliedRange = {
        start: defaultDate,
        end: defaultDate,
      };
      return;
    }

    if (
      disclosureState.queryCount === 0 &&
      disclosureState.appliedRange.start === disclosureState.appliedRange.end &&
      disclosureState.appliedRange.start !== defaultDate
    ) {
      disclosureState.filterRange = {
        start: defaultDate,
        end: defaultDate,
      };
      disclosureState.appliedRange = {
        start: defaultDate,
        end: defaultDate,
      };
      return;
    }

    if (isUnifiedInfoDisclosureSingleDateMode(pageData)) {
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

  function normalizeStatusTime(value) {
    return value || "-";
  }

  function getFirstFilePublishTime(fileList) {
    var files = Array.isArray(fileList) ? fileList : [];
    var firstFile = files.find(function findFile(file) {
      return file && file.publishTime;
    });
    return firstFile ? firstFile.publishTime : "";
  }

  function getPagePublishTime(pageData) {
    return (
      (pageData && (pageData.publishTime || pageData.dataPublishTime || pageData.publishedAt)) ||
      getFirstFilePublishTime(pageData && pageData.fileList) ||
      ""
    );
  }

  function getModulePublishTime(moduleData) {
    return (
      (moduleData && (moduleData.publishTime || moduleData.dataPublishTime || moduleData.publishedAt)) ||
      getFirstFilePublishTime(moduleData && moduleData.fileList) ||
      ""
    );
  }

  function createStatus(time, source, publishTime) {
    return {
      time: normalizeStatusTime(time),
      source: source || "-",
      publishTime: normalizeStatusTime(publishTime),
    };
  }

  function getInfoUpdateOverrideKey(tab) {
    return getSelectedTradeCenterKey() + "|" + (tab || getActiveInfoTab());
  }

  function getInfoUpdateOverride(tab) {
    var overrides = state.ui.infoUpdateOverrides || {};
    return overrides[getInfoUpdateOverrideKey(tab)] || null;
  }

  function applyInfoUpdateOverride(status, tab) {
    var override = getInfoUpdateOverride(tab);
    if (!override) {
      return status;
    }
    return createStatus(override.time || status.time, override.source || status.source, status.publishTime);
  }

  function setInfoUpdateOverride(tab, source) {
    state.ui.infoUpdateOverrides = state.ui.infoUpdateOverrides || {};
    state.ui.infoUpdateOverrides[getInfoUpdateOverrideKey(tab)] = {
      time: formatDateTime(new Date()),
      source: source,
    };
  }

  function formatDateCompact(value) {
    return String(value || "").replace(/-/g, "");
  }

  function getTimeSharingHourLabels() {
    return TIME_SHARING_HOUR_LABELS.slice();
  }

  function buildDateColumnKey(date) {
    return "date-" + formatDateCompact(date);
  }

  function buildHourColumnKey(hour) {
    return "hour-" + String(hour || "").replace(/\D/g, "");
  }

  function createNumericEnergyCell(value, formatter) {
    var numeric = value === null || value === undefined || value === "" ? null : Number(value);
    var hasValue = numeric !== null && !Number.isNaN(numeric);
    return {
      text: hasValue ? formatter(numeric) : "-",
      sortValue: hasValue ? numeric : Number.NEGATIVE_INFINITY,
    };
  }

  function createFixedColumn(key, label, width) {
    return {
      key: key,
      label: label,
      fixed: true,
      draggable: false,
      width: width,
    };
  }

  function buildHourlyEnergyColumns(width) {
    return getTimeSharingHourLabels().map(function mapHourlyEnergyColumn(hour) {
      return {
        key: buildHourColumnKey(hour),
        label: hour,
        width: width || 96,
      };
    });
  }

  function formatDateValue(date) {
    function pad(value) {
      return String(value).padStart(2, "0");
    }

    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function buildRelativeDateRange(startOffsetDays, endOffsetDays) {
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() + startOffsetDays);
    end.setDate(end.getDate() + endOffsetDays);
    return {
      start: formatDateValue(start),
      end: formatDateValue(end),
    };
  }

  function getDefaultEnterprisePowerRange() {
    return {
      start: "2026-05-29",
      end: "2026-05-29",
    };
  }

  function getDefaultSaleCompanyPowerRange() {
    return {
      start: "2026-05-25",
      end: "2026-05-29",
    };
  }

  function getHistoryRowsByType(type) {
    var adapter = global.BOSS_POWER_DATA_ADAPTER || (appMocks.powerDataAdapter || {});
    var marketKey = getSelectedTradeCenterKey();
    var infoMock = getInfoMock();
    var generatedRows = [];
    var legacyRows = [];

    if (type === "seller") {
      generatedRows =
        adapter && typeof adapter.getSellerHourlyPowerHistoryRows === "function"
          ? adapter.getSellerHourlyPowerHistoryRows(marketKey)
          : [];
      legacyRows = infoMock.sellerHourlyPowerHistoryRows || [];
    } else {
      generatedRows =
        adapter && typeof adapter.getUserHourlyPowerHistoryRows === "function"
          ? adapter.getUserHourlyPowerHistoryRows(marketKey)
          : [];
      legacyRows = infoMock.userHourlyPowerHistoryRows || [];
    }

    return generatedRows.concat(
      legacyRows.filter(function filterLegacyHistoryRow(row) {
        return row && row.agentMonth !== "2026-05";
      }),
    );
  }

  function getHistoryAgentMonths(type) {
    var monthMap = {};
    getHistoryRowsByType(type).forEach(function eachHistoryRow(row) {
      if (row && row.agentMonth) {
        monthMap[row.agentMonth] = true;
      }
    });

    return Object.keys(monthMap).sort();
  }

  function getDefaultHistoryAgentMonth(type) {
    var months = getHistoryAgentMonths(type);
    return months[months.length - 1] || "2026-05";
  }

  function getDefaultHistoryRange(type, agentMonth) {
    var month = agentMonth || getDefaultHistoryAgentMonth(type);
    var dates = getHistoryRowsByType(type)
      .filter(function filterMonth(row) {
        return row.agentMonth === month;
      })
      .map(function mapDate(row) {
        return row.usageDate;
      })
      .filter(function filterDate(date, index, source) {
        return date && source.indexOf(date) === index;
      })
      .sort();

    if (dates.length) {
      if (month === "2026-05" && dates.indexOf("2026-05-25") >= 0 && dates.indexOf("2026-05-29") >= 0) {
        return {
          start: type === "user" ? "2026-05-29" : "2026-05-25",
          end: "2026-05-29",
        };
      }
      return {
        start: dates[0],
        end: dates[Math.min(dates.length - 1, 6)],
      };
    }

    return {
      start: month + "-01",
      end: month + "-07",
    };
  }

  function isHistoryTimeSharingTab(tab) {
    var activeTab = tab || getActiveInfoTab();
    return activeTab === INFO_DISCLOSURE_SELLER_HISTORY_TAB || activeTab === INFO_DISCLOSURE_USER_HISTORY_TAB;
  }

  function setRegularInfoTimeSharingRange(range) {
    var clonedRange = cloneRange(range);
    state.info.filters.timeSharingRange = cloneRange(clonedRange);
    state.info.filters.saleCompanyRange = cloneRange(clonedRange);
    state.info.filters.saleCompanyAppliedRange = cloneRange(clonedRange);
    state.info.filters.enterpriseRange = cloneRange(clonedRange);
  }

  function setSaleCompanyInfoTimeSharingRange(range) {
    var clonedRange = cloneRange(range);
    state.info.filters.timeSharingRange = cloneRange(clonedRange);
    state.info.filters.saleCompanyRange = cloneRange(clonedRange);
    state.info.filters.saleCompanyAppliedRange = cloneRange(clonedRange);
  }

  function setEnterpriseInfoTimeSharingRange(range) {
    var clonedRange = cloneRange(range);
    state.info.filters.timeSharingRange = cloneRange(clonedRange);
    state.info.filters.enterpriseRange = cloneRange(clonedRange);
  }

  function getInfoTimeSharingRange() {
    var activeTab = getActiveInfoTab();
    var filters = state.info.filters;
    if (activeTab === INFO_DISCLOSURE_SELLER_HISTORY_TAB) {
      return filters.sellerHistoryRange || getDefaultHistoryRange("seller", filters.sellerHistoryAgentMonth);
    }
    if (activeTab === INFO_DISCLOSURE_USER_HISTORY_TAB) {
      return filters.userHistoryRange || getDefaultHistoryRange("user", filters.userHistoryAgentMonth);
    }
    if (activeTab === "用电企业分时电量") {
      return filters.enterpriseRange || getDefaultEnterprisePowerRange();
    }
    if (activeTab === "售电公司分时电量" && filters.saleCompanyAppliedRange && isRangeValid(filters.saleCompanyAppliedRange)) {
      return filters.saleCompanyAppliedRange;
    }
    if (activeTab === "售电公司分时电量" && filters.saleCompanyRange && isRangeValid(filters.saleCompanyRange)) {
      return filters.saleCompanyRange;
    }
    if (filters.timeSharingRange && isRangeValid(filters.timeSharingRange)) {
      return filters.timeSharingRange;
    }
    return getDefaultSaleCompanyPowerRange();
  }

  function setInfoTimeSharingRange(range) {
    var activeTab = getActiveInfoTab();
    if (activeTab === INFO_DISCLOSURE_SELLER_HISTORY_TAB) {
      state.info.filters.sellerHistoryRange = cloneRange(range);
      return;
    }
    if (activeTab === INFO_DISCLOSURE_USER_HISTORY_TAB) {
      state.info.filters.userHistoryRange = cloneRange(range);
      return;
    }
    if (activeTab === "用电企业分时电量") {
      setEnterpriseInfoTimeSharingRange(range);
      return;
    }
    if (activeTab === "售电公司分时电量") {
      setSaleCompanyInfoTimeSharingRange(range);
      return;
    }
    setRegularInfoTimeSharingRange(range);
  }

  function isInfoLoadRunDatePicker(id) {
    return (
      id === "info-runtime" ||
      id === "info-detail-runtime" ||
      id === "maintenance-runtime" ||
      id === "reserve-runtime" ||
      id === "load-info-disclosure-table-runtime"
    );
  }

  function setInfoLoadRunDateRange(range) {
    var clonedRange = cloneRange(range);
    state.ui.runtimeRange = cloneRange(clonedRange);
    state.info.filters.loadDetailRange = cloneRange(clonedRange);
    state.info.filters.maintenanceRange = cloneRange(clonedRange);
    state.info.filters.reserveRange = cloneRange(clonedRange);
  }

  function resetSaleCompanyPowerFilters() {
    var defaultRange = getDefaultSaleCompanyPowerRange();
    setSaleCompanyInfoTimeSharingRange(defaultRange);
    resetSaleCompanyPowerBusinessFilters();
    if (state.ui.tableSort) {
      delete state.ui.tableSort["sale-company-table"];
    }
    if (state.ui.chartHiddenSeries) {
      delete state.ui.chartHiddenSeries["sale-company-chart"];
    }
  }

  function resetSaleCompanyPowerBusinessFilters() {
    state.info.filters.saleCompanyName = "全部";
  }

  function resetEnterprisePowerBusinessFilters() {
    state.info.filters.enterpriseUserCode = "";
    state.info.filters.enterpriseUserName = "";
    state.info.filters.enterpriseAccountNo = "";
    state.info.filters.enterpriseMicrogridId = "";
    if (state.ui.tableSort) {
      delete state.ui.tableSort["enterprise-table"];
    }
  }

  function resetEnterprisePowerFilters() {
    setEnterpriseInfoTimeSharingRange(getDefaultEnterprisePowerRange());
    resetEnterprisePowerBusinessFilters();
  }

  function resetSellerHistoryFilters() {
    var defaultMonth = getDefaultHistoryAgentMonth("seller");
    state.info.filters.sellerHistoryAgentMonth = defaultMonth;
    state.info.filters.sellerHistoryRange = getDefaultHistoryRange("seller", defaultMonth);
    state.info.filters.sellerHistoryCompanyName = "全部";
    if (state.ui.tableSort) {
      delete state.ui.tableSort["seller-history-table"];
    }
    if (state.ui.chartHiddenSeries) {
      delete state.ui.chartHiddenSeries["seller-history-chart"];
    }
  }

  function resetUserHistoryFilters() {
    var defaultMonth = getDefaultHistoryAgentMonth("user");
    state.info.filters.userHistoryAgentMonth = defaultMonth;
    state.info.filters.userHistoryRange = getDefaultHistoryRange("user", defaultMonth);
    state.info.filters.userHistoryUserCode = "";
    state.info.filters.userHistoryUserName = "";
    state.info.filters.userHistoryAccountNo = "";
    state.info.filters.userHistoryMicrogridId = "";
    if (state.ui.tableSort) {
      delete state.ui.tableSort["user-history-table"];
    }
  }

  function resetInfoDisclosureFiltersForTradeCenterSwitch() {
    resetSaleCompanyPowerFilters();
    resetEnterprisePowerFilters();
    resetSellerHistoryFilters();
    resetUserHistoryFilters();
    state.info.filters.saleCompanyName = "全部";
    state.info.filters.declarationType = "全部";
    state.tradeResult.filters.nodeKeyword = "";
    state.tradeResult.selectedNode = "全省";
    state.info.profileViewMode = "";
    resetUnifiedInfoDisclosureFieldFilters(getInfoDisclosurePageData());
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
      id === "load-info-disclosure-table-runtime" ||
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
    if (id === "time-sharing-range") {
      return getInfoTimeSharingRange();
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
    if (id === "load-info-disclosure-table-runtime") {
      return state.info.filters.maintenanceRange;
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
    } else if (id === "time-sharing-range") {
      setInfoTimeSharingRange(range);
    } else if (isInfoLoadRunDatePicker(id)) {
      setInfoLoadRunDateRange(range);
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
    if (
      (id === "enterprise-range" || id === "sale-company-range" || id === "time-sharing-range") &&
      state.ui.datePickerDrafts &&
      state.ui.datePickerDrafts[id] &&
      isRangeValid(state.ui.datePickerDrafts[id]) &&
      getRangeDays(state.ui.datePickerDrafts[id]) > 366
    ) {
      setFlashMessage("单次查询时间范围最大支持 1 年", "info");
      return false;
    }

    if (state.ui.datePickerDrafts && state.ui.datePickerDrafts[id]) {
      setPickerTargetRange(id, state.ui.datePickerDrafts[id]);
    }
    closeDatePicker(id, false);

    if (id === "market-disclosure-range" && isInfoDisclosurePage(state.currentPageKey)) {
      getMarketDisclosureState().appliedRange = cloneRange(getMarketDisclosureState().filterRange);
      getMarketDisclosureState().lastUpdatedAt = formatDateTime(new Date());
      getMarketDisclosureState().queryCount += 1;
    }

    if (id === "time-sharing-range") {
      if (getActiveInfoTab() === INFO_DISCLOSURE_SELLER_HISTORY_TAB) {
        state.info.sellerHistoryQueryAt = Date.now();
      } else if (getActiveInfoTab() === INFO_DISCLOSURE_USER_HISTORY_TAB) {
        state.info.userHistoryQueryAt = Date.now();
      }
      state.ui.hasCompare = false;
      state.info.companyQueryAt = Date.now();
      state.info.enterpriseQueryAt = Date.now();
    }

    if (id === "market-disclosure-range" && isSingleMetricLoadPage(getInfoDisclosurePageData())) {
      getMarketDisclosureState().appliedRange = cloneRange(getMarketDisclosureState().filterRange);
      getMarketDisclosureState().lastUpdatedAt = formatDateTime(new Date());
      return true;
    }

    if (id === "info-runtime" && isSingleMetricLoadPage(getInfoDisclosurePageData())) {
      state.ui.singleMetricLoadUpdatedAt = formatDateTime(new Date());
      return true;
    }

    return false;
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
    if (primaryTab === "负荷信息" || primaryTab === INFO_DISCLOSURE_TIME_SHARING_TAB) {
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

  function includesCodeKeyword(source, keyword) {
    var trimmedKeyword = String(keyword || "").trim();
    if (!trimmedKeyword) {
      return true;
    }
    return String(source || "").toLowerCase().indexOf(trimmedKeyword.toLowerCase()) >= 0;
  }

  function includesNullableMicrogridValue(source, keyword) {
    var trimmedKeyword = String(keyword || "").trim();
    if (!trimmedKeyword) {
      return true;
    }
    if (!source || source === "-") {
      return false;
    }
    return String(source).toLowerCase().indexOf(trimmedKeyword.toLowerCase()) >= 0;
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
      return state.info.filters.saleCompanyAppliedRange || state.info.filters.saleCompanyRange;
    }
    if (activeTab === "用电企业分时电量") {
      return state.info.filters.enterpriseRange;
    }
    if (activeTab === INFO_DISCLOSURE_SELLER_HISTORY_TAB) {
      return state.info.filters.sellerHistoryRange || getDefaultHistoryRange("seller", state.info.filters.sellerHistoryAgentMonth);
    }
    if (activeTab === INFO_DISCLOSURE_USER_HISTORY_TAB) {
      return state.info.filters.userHistoryRange || getDefaultHistoryRange("user", state.info.filters.userHistoryAgentMonth);
    }
    if (activeTab === "机组检修容量") {
      return state.info.filters.maintenanceRange;
    }
    if (activeTab === "机组状态" || activeTab === "发输变电设备检修计划") {
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
      if (getActiveInfoTab() === "售电公司分时电量") {
        return getSaleCompanyAppliedRange();
      }
      if (isUnifiedMockInfoTradeTab(getActiveInfoTab())) {
        return getActiveInfoTab() === "节点电价"
          ? state.tradeResult.filters.nodeRunRange
          : state.tradeResult.filters.marketRunRange;
      }
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
      if (state.settlement.activeTab === "日清算") {
        var dailyDownloadParts = ["日清算结果"];
        if (state.settlement.filters.dailyStatementType && state.settlement.filters.dailyStatementType !== "全部") {
          dailyDownloadParts.push(state.settlement.filters.dailyStatementType);
        }
        if (state.settlement.filters.dailyDataType && state.settlement.filters.dailyDataType !== "全部") {
          dailyDownloadParts.push(state.settlement.filters.dailyDataType);
        }
        return dailyDownloadParts.join("-");
      }
      if (state.settlement.activeTab === "月结算") {
        var monthlyData = getMonthlySettlementActiveData();
        if (monthlyData && monthlyData.hasPurchaseSaleSide) {
          return "月结算-" + getMonthlySettlementActiveSide(monthlyData);
        }
        return "月结算";
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
      if (isUnifiedMockInfoTradeTab(getActiveInfoTab())) {
        return getActiveInfoTab() === "节点电价"
          ? state.tradeResult.filters.nodeRunRange
          : state.tradeResult.filters.marketRunRange;
      }
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

  function isCurrentSellerTimeSharingUpdateTarget() {
    return isSellerTimeSharingTargetTab(getActiveInfoTab());
  }

  function isCurrentTimeSharingUpdateTarget() {
    return isTimeSharingUpdateTargetTab(getActiveInfoTab());
  }

  function isTimeSharingManualUpdateContext() {
    return (
      (state.ui.manualUpdateContext === "time-sharing-update" ||
        state.ui.manualUpdateContext === "seller-time-sharing") &&
      isTimeSharingUpdateTargetTab(state.ui.manualUpdateTab)
    );
  }

  function isSellerTimeSharingManualUpdateContext() {
    return isTimeSharingManualUpdateContext() && isSellerTimeSharingTargetTab(state.ui.manualUpdateTab);
  }

  function isInfoDisclosureManualUpdateModalContext() {
    return isInfoDisclosurePage(state.currentPageKey);
  }

  function isManualUpdateSubmitReady() {
    if (!isTimeSharingManualUpdateContext()) {
      return true;
    }
    if (isTimeSharingHistoryUpdateTargetTab(state.ui.manualUpdateTab) && !state.ui.manualUpdateAgentMonth) {
      return false;
    }
    if (state.ui.manualUpdateMode === "upload") {
      return Boolean(state.ui.manualUploadFileName);
    }
    return isRangeValid(state.ui.manualPullRangeDraft);
  }

  function isInfoDisclosureUpdateSubmitReady() {
    if (!isInfoDisclosureManualUpdateModalContext()) {
      return true;
    }
    if (state.ui.manualUpdateMode === "upload") {
      return Boolean(state.ui.manualUploadFileName);
    }
    return isRangeValid(state.ui.manualPullRangeDraft);
  }

  function syncManualUpdateDraftToCurrentContext() {
    var activeInfoTab = getActiveInfoTab();
    state.ui.manualUpdateContext = isTimeSharingUpdateTargetTab(activeInfoTab) ? "time-sharing-update" : "";
    state.ui.manualUpdateTab = activeInfoTab;
    state.ui.manualUpdateMode = "upload";
    state.ui.manualUploadFileName = "";
    state.ui.manualUpdateError = "";
    state.ui.manualPullRangeDraft = isEnterpriseTimeSharingTargetTab(activeInfoTab)
      ? { start: "", end: "" }
      : cloneRange(getCurrentCompareBaseRange());
    if (isSellerHistoryTargetTab(activeInfoTab)) {
      state.ui.manualUpdateAgentMonth = state.info.filters.sellerHistoryAgentMonth || getDefaultHistoryAgentMonth("seller");
    } else if (isEnterpriseHistoryTargetTab(activeInfoTab)) {
      state.ui.manualUpdateAgentMonth = state.info.filters.userHistoryAgentMonth || getDefaultHistoryAgentMonth("user");
    } else if (isEnterpriseTimeSharingTargetTab(activeInfoTab)) {
      state.ui.manualUpdateAgentMonth = getDefaultHistoryAgentMonth("user");
    } else {
      state.ui.manualUpdateAgentMonth = getDefaultHistoryAgentMonth("seller");
    }
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

  function getSaleCompanyRows(rangeOverride) {
    var infoMock = getInfoMock();
    var range = rangeOverride || state.info.filters.saleCompanyAppliedRange || state.info.filters.saleCompanyRange;
    if (!hasRangeOverlap(range, infoMock.availableRangeStart, infoMock.availableRangeEnd)) {
      return [];
    }
    return filterRowsByDateRange(infoMock.saleCompanyRows || [], range);
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

  function buildDateRangeList(range) {
    if (!isRangeValid(range)) {
      return [];
    }

    var cursor = parseDate(range.start);
    var end = parseDate(range.end);
    var result = [];

    while (cursor <= end) {
      result.push(formatDateValue(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return result;
  }

  function getSaleCompanyAppliedRange() {
    return state.info.filters.saleCompanyAppliedRange || state.info.filters.saleCompanyRange;
  }

  function getSaleCompanyAdapterRows(rangeOverride) {
    var adapter = global.BOSS_POWER_DATA_ADAPTER || (appMocks.powerDataAdapter || {});
    var marketKey = getSelectedTradeCenterKey();
    var range = rangeOverride || getSaleCompanyAppliedRange();
    var hourlyRows;
    var dailyRows;

    if (!adapter || typeof adapter.getRetailCompanyHourlyPowerData !== "function" || typeof adapter.getRetailCompanyDailyTotalData !== "function") {
      return {
        hourlyRows: [],
        dailyRows: [],
      };
    }

    hourlyRows = adapter.getRetailCompanyHourlyPowerData(marketKey) || [];
    dailyRows = adapter.getRetailCompanyDailyTotalData(marketKey) || [];

    if (!isRangeValid(range)) {
      return {
        hourlyRows: [],
        dailyRows: [],
        allHourlyRows: hourlyRows,
        allDailyRows: dailyRows,
      };
    }

    return {
      hourlyRows: hourlyRows.filter(function filterHourRow(row) {
        return row.date >= range.start && row.date <= range.end;
      }),
      dailyRows: dailyRows.filter(function filterDayRow(row) {
        return row.date >= range.start && row.date <= range.end;
      }),
      allHourlyRows: hourlyRows,
      allDailyRows: dailyRows,
    };
  }

  function isSaleCompanyNumericValue(value) {
    return typeof value === "number" && !Number.isNaN(value);
  }

  function normalizeSaleCompanyElectricity(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    var numeric = Number(value);
    return Number.isNaN(numeric) ? null : numeric;
  }

  function hasSaleCompanyHourlyData(rows) {
    return (rows || []).some(function someRow(row) {
      return isSaleCompanyNumericValue(row.electricity);
    });
  }

  function getSaleCompanyPointLabel(row, activeRange) {
    if (!row) {
      return "";
    }
    if (activeRange && activeRange.start === activeRange.end) {
      return row.hour || "";
    }
    return (row.date || "") + " " + (row.hour || "");
  }

  function attachSaleCompanyChartRows(result) {
    result.chartRows = (result.tableRows || []).slice();
    result.labels = result.chartRows.map(function mapChartLabel(row) {
      return getSaleCompanyPointLabel(row, result.activeRange);
    });
    result.hasData = hasSaleCompanyHourlyData(result.chartRows);
    return result;
  }

  function getLatestSaleCompanyUpdateInfo(rows, fallbackRows, marketKey) {
    var latestInRange = null;
    var latestAny = null;

    (rows || []).forEach(function eachRangeRow(row) {
      if (!row || !row.updateTime) {
        return;
      }
      if (!latestInRange || String(row.updateTime) > String(latestInRange.updateTime || "")) {
        latestInRange = row;
      }
    });

    (fallbackRows || []).forEach(function eachFallbackRow(row) {
      if (!row || !row.updateTime) {
        return;
      }
      if (!latestAny || String(row.updateTime) > String(latestAny.updateTime || "")) {
        latestAny = row;
      }
    });

    if (!latestInRange && !latestAny) {
      return createStatus("-", "-", "-");
    }

    var latestRow = latestInRange || latestAny;
    return createStatus(
      latestRow.updateTime,
      marketKey === "hunan" || marketKey === "shaanxi" ? "取数工具" : latestRow.dataSource,
      latestRow.publishTime,
    );
  }

  function getSaleCompanyDataset(rangeOverride) {
    var marketKey = getSelectedTradeCenterKey();
    var activeRange = rangeOverride || getSaleCompanyAppliedRange();
    var dateLabels = buildDateRangeList(activeRange);
    var result = {
      market: marketKey,
      activeRange: cloneRange(activeRange),
      dateLabels: dateLabels,
      labels: [],
      dailyTrendRows: [],
      chartRows: [],
      tableRows: [],
      hasData: false,
      latestUpdateInfo: {
        time: "-",
        source: "-",
        publishTime: "-",
      },
    };

    if (!isSupportedPowerTradeCenter()) {
      return result;
    }

    if (!isRangeValid(activeRange)) {
      var invalidAdapterRows = getSaleCompanyAdapterRows();
      result.latestUpdateInfo = getLatestSaleCompanyUpdateInfo(
        [],
        (invalidAdapterRows.allDailyRows || []).concat(invalidAdapterRows.allHourlyRows || []),
        marketKey,
      );
      return result;
    }

    var adapterRows = getSaleCompanyAdapterRows(activeRange);
    var hourlyRows = adapterRows.hourlyRows || [];
    var dailyRows = adapterRows.dailyRows || [];
    var hourlyRowMap = {};
    var adapter = global.BOSS_POWER_DATA_ADAPTER || (appMocks.powerDataAdapter || {});
    var retailCompanyHours = adapter.hours || getInfoMock().hours || mock.hours || [];

    hourlyRows.forEach(function eachHourlyRow(row) {
      hourlyRowMap[row.date + "|" + row.hour] = row;
    });

    result.tableRows = dateLabels.reduce(function buildRows(acc, date) {
      return acc.concat(
        retailCompanyHours.map(function mapHour(hour) {
          var matched = hourlyRowMap[date + "|" + hour];
          return {
            date: date,
            hour: hour,
            companyName: (matched && matched.userName) || "售电公司",
            electricity: matched ? normalizeSaleCompanyElectricity(matched.electricity) : null,
            unit: "MWh",
            updateTime: matched ? matched.updateTime : "",
            dataSource: matched ? matched.dataSource : "",
            publishTime: matched ? matched.publishTime : "",
          };
        }),
      );
    }, []);
    result.latestUpdateInfo = getLatestSaleCompanyUpdateInfo(
      dailyRows.concat(hourlyRows),
      (adapterRows.allDailyRows || []).concat(adapterRows.allHourlyRows || []),
      marketKey,
    );
    return attachSaleCompanyChartRows(result);
  }

  function formatSaleCompanyEnergy(value) {
    return value === null || value === undefined || Number.isNaN(Number(value)) ? "-" : Number(value).toFixed(3);
  }

  function getSaleCompanyCompareDataset() {
    if (!isInfoDisclosureCompareActive("售电公司分时电量")) {
      return null;
    }
    if (!isRangeValid(state.ui.compareRangeDraft) || getRangeDays(state.ui.compareRangeDraft) !== getRangeDays(getSaleCompanyAppliedRange())) {
      return null;
    }
    return getSaleCompanyDataset(state.ui.compareRangeDraft);
  }

  function buildSaleCompanyCompareValues(dataset, compareDataset) {
    if (!dataset || !compareDataset) {
      return [];
    }
    var compareRows = compareDataset.chartRows || [];
    return (dataset.chartRows || []).map(function mapCompareValue(_, index) {
      var matched = compareRows[index];
      return matched && isSaleCompanyNumericValue(matched.electricity) ? matched.electricity : null;
    });
  }

  function formatSaleCompanyChange(compareValue, currentValue) {
    if (!isSaleCompanyNumericValue(compareValue) || !isSaleCompanyNumericValue(currentValue) || compareValue === 0) {
      return '<span class="tooltip-change tooltip-change-flat">变化幅度 --</span>';
    }
    var change = (currentValue - compareValue) / compareValue;
    var className = change > 0 ? "tooltip-change-up" : change < 0 ? "tooltip-change-down" : "tooltip-change-flat";
    return '<span class="tooltip-change ' + className + '">变化幅度 ' + (change > 0 ? "+" : "") + (change * 100).toFixed(2) + "%</span>";
  }

  function formatSaleCompanyTooltip(dataset, compareDataset, index) {
    var row = (dataset.chartRows || [])[index] || {};
    var compareRow = compareDataset && (compareDataset.chartRows || [])[index];
    var currentValue = isSaleCompanyNumericValue(row.electricity) ? row.electricity : null;
    var html =
      '<div class="chart-tooltip-stack">' +
      '<div>日期: ' +
      escapeHtml(row.date || "-") +
      "</div>" +
      '<div>时刻: ' +
      escapeHtml(row.hour || "-") +
      "</div>" +
      '<div>售电公司名称: ' +
      escapeHtml(row.companyName || "售电公司") +
      "</div>" +
      '<div>分时电量: ' +
      escapeHtml(formatSaleCompanyEnergy(currentValue)) +
      " MWh</div>";

    if (compareRow) {
      html +=
        '<div>对比日期: ' +
        escapeHtml(compareRow.date || "-") +
        "</div>" +
        '<div>对比电量: ' +
        escapeHtml(formatSaleCompanyEnergy(compareRow.electricity)) +
        " MWh " +
        formatSaleCompanyChange(compareRow.electricity, currentValue) +
        "</div>";
    }

    return html + "</div>";
  }

  function getSaleCompanyTableConfig(dataset) {
    var dateLabels = (dataset.dateLabels || []).slice();
    var rowMap = {};
    var columns = [
      { key: "hour", label: "时刻", fixed: true, draggable: false, width: 96 },
    ].concat(
      dateLabels.map(function mapSaleCompanyDateColumn(date) {
        return {
          key: buildDateColumnKey(date),
          label: formatDateCompact(date),
          width: 132,
        };
      }),
    );

    (dataset.tableRows || []).forEach(function eachSaleCompanyTableSourceRow(row) {
      rowMap[row.hour + "|" + row.date] = row;
    });

    return {
      columns: columns,
      rows: getTimeSharingHourLabels().map(function mapSaleCompanyMatrixRow(hour) {
        var tableRow = {
          hour: hour,
        };
        dateLabels.forEach(function eachSaleCompanyMatrixDate(date) {
          var matched = rowMap[hour + "|" + date];
          tableRow[buildDateColumnKey(date)] = createNumericEnergyCell(
            matched ? matched.electricity : null,
            formatSaleCompanyEnergy,
          );
        });
        return tableRow;
      }),
      minWidth: 96 + Math.max(dateLabels.length, 1) * 132,
    };
  }

  function renderSaleCompanyUpdateBar(updateInfo) {
    var compareSupported = isSellerTimeSharingCompareEnabled("售电公司分时电量");
    var status = applyInfoUpdateOverride(updateInfo, "售电公司分时电量");
    var actions = [createMoreUpdateAction("open-seller-time-sharing-update")];

    if (compareSupported) {
      actions.push({ label: "对比", variant: "ghost", icon: "compare", action: "open-compare" });
    }
    actions.push(createDownloadMenuAction());

    return renderDataUpdateBar({
      updatedAt: status.time || "-",
      publishTime: status.publishTime || "-",
      source: status.source || "-",
      hasCompare: compareSupported && state.ui.hasCompare,
      showTaskEntry: false,
      actions: actions,
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function getEnterpriseRows() {
    var adapter = global.BOSS_POWER_DATA_ADAPTER || (appMocks.powerDataAdapter || {});
    var marketKey = getSelectedTradeCenterKey();
    var filters = state.info.filters;
    var rows =
      adapter && typeof adapter.getUserHourlyPowerData === "function"
        ? adapter.getUserHourlyPowerData(marketKey)
        : [];

    if (!isSupportedPowerTradeCenter()) {
      return [];
    }

    if (!isRangeValid(filters.enterpriseRange)) {
      return [];
    }

    return rows
      .filter(function filterRow(row) {
        return (
          row.date >= filters.enterpriseRange.start &&
          row.date <= filters.enterpriseRange.end &&
          includesCodeKeyword(row.userCode, filters.enterpriseUserCode) &&
          includesKeyword(row.userName, filters.enterpriseUserName) &&
          includesCodeKeyword(row.accountNo, filters.enterpriseAccountNo) &&
          includesNullableMicrogridValue(row.microgridId, filters.enterpriseMicrogridId)
        );
      })
      .sort(function sortRows(a, b) {
        if (a.date !== b.date) {
          return a.date > b.date ? 1 : -1;
        }
        if (a.hour !== b.hour) {
          return a.hour > b.hour ? 1 : -1;
        }
        var aCode = a.userCode || a.accountNo || "";
        var bCode = b.userCode || b.accountNo || "";
        if (aCode === bCode) {
          return 0;
        }
        return aCode > bCode ? 1 : -1;
      });
  }

  function getEnterpriseDailySeries(rows) {
    var grouped = {};
    rows.forEach(function eachRow(row) {
      grouped[row.date] = (grouped[row.date] || 0) + Number(row.electricity || 0);
    });

    return Object.keys(grouped)
      .sort()
      .map(function mapDate(date) {
        return { date: date, total: grouped[date] };
      });
  }

  function getEnterpriseTable() {
    var fixedColumns = [
      createFixedColumn("date", "日期", 118),
      createFixedColumn("userCode", "电力用户编码", 158),
      createFixedColumn("userName", "电力用户名称", 220),
      createFixedColumn("microgridName", "微电网名称", 190),
      createFixedColumn("microgridId", "微电网ID", 132),
      createFixedColumn("accountNo", "户号", 148),
      createFixedColumn("meteringPointNo", "计量点编号", 152),
    ];
    var rowMap = {};
    var groupedRows = {};

    getEnterpriseRows().forEach(function eachEnterpriseTableSourceRow(row) {
      var groupKey = [
        row.date,
        row.userCode,
        row.userName,
        row.microgridName,
        row.microgridId,
        row.accountNo,
        row.meteringPointNo,
      ].join("|");
      if (!groupedRows[groupKey]) {
        groupedRows[groupKey] = {
          date: row.date || "-",
          userCode: row.userCode || "-",
          userName: row.userName || "-",
          microgridName: row.microgridName || "-",
          microgridId: row.microgridId || "-",
          accountNo: row.accountNo || "-",
          meteringPointNo: row.meteringPointNo || "-",
        };
      }
      rowMap[groupKey + "|" + row.hour] = row.electricity;
    });

    return {
      columns: fixedColumns.concat(buildHourlyEnergyColumns(96)),
      rows: Object.keys(groupedRows).sort().map(function mapEnterpriseWideRow(groupKey) {
        var tableRow = groupedRows[groupKey];
        getTimeSharingHourLabels().forEach(function eachEnterpriseHour(hour) {
          tableRow[buildHourColumnKey(hour)] = createNumericEnergyCell(rowMap[groupKey + "|" + hour], function formatEnterprisePower(value) {
            return value.toFixed(3);
          });
        });
        return tableRow;
      }),
      minWidth:
        fixedColumns.reduce(function sumFixedColumnWidth(total, column) {
          return total + Number(column.width || 0);
        }, 0) +
        getTimeSharingHourLabels().length * 96,
    };
  }

  function getEnterpriseLatestUpdateInfo(rows) {
    var adapter = global.BOSS_POWER_DATA_ADAPTER || (appMocks.powerDataAdapter || {});
    var marketKey = getSelectedTradeCenterKey();
    var allRows =
      adapter && typeof adapter.getUserHourlyPowerData === "function"
        ? adapter.getUserHourlyPowerData(marketKey)
        : [];
    var sourceRows = rows && rows.length ? rows : allRows;
    var latestRow = null;

    if (!isSupportedPowerTradeCenter()) {
      return createStatus("-", "-", "-");
    }

    sourceRows.forEach(function eachRow(row) {
      if (!row || !row.updateTime) {
        return;
      }
      if (!latestRow || row.updateTime > latestRow.updateTime) {
        latestRow = row;
      }
    });

    if (!latestRow) {
      return createStatus("-", "-", "-");
    }

    return createStatus(
      latestRow.updateTime,
      marketKey === "hunan" || marketKey === "shaanxi" ? "取数工具" : latestRow.dataSource,
      latestRow.publishTime,
    );
  }

  function isHistoryNumericValue(value) {
    return typeof value === "number" && !Number.isNaN(value);
  }

  function normalizeHistoryPower(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    var numeric = Number(value);
    return Number.isNaN(numeric) ? null : numeric;
  }

  function roundHistoryMetric(value) {
    return Number(Number(value).toFixed(2));
  }

  function formatHistoryPower(value) {
    return value === null || value === undefined || Number.isNaN(Number(value)) ? "-" : Number(value).toFixed(2);
  }

  function formatHistoryMicrogrid(value) {
    return value ? value : "-";
  }

  function getLatestHistoryUpdateInfo(rows, fallbackRows) {
    var sourceRows = rows && rows.length ? rows : fallbackRows || [];
    var latestRow = null;

    sourceRows.forEach(function eachHistoryUpdate(row) {
      if (!row || !row.updateTime) {
        return;
      }
      if (!latestRow || String(row.updateTime) > String(latestRow.updateTime || "")) {
        latestRow = row;
      }
    });

    if (!latestRow) {
      return createStatus("-", "-", "-");
    }

    return createStatus(latestRow.updateTime, latestRow.dataSource || "历史回溯", "-");
  }

  function getSellerHistoryDataset(rangeOverride) {
    var filters = state.info.filters;
    var agentMonth = filters.sellerHistoryAgentMonth || getDefaultHistoryAgentMonth("seller");
    var range = rangeOverride || filters.sellerHistoryRange || getDefaultHistoryRange("seller", agentMonth);
    var sellerName = "全部";
    var dateLabels = buildDateRangeList(range);
    var hours = getTimeSharingHourLabels();
    var allRows = getHistoryRowsByType("seller");
    var monthRows = allRows.filter(function filterMonth(row) {
      return row.agentMonth === agentMonth;
    });
    var companyRows = monthRows.filter(function filterCompany(row) {
      return sellerName === "全部" || row.sellerCompanyName === sellerName;
    });
    var dateRows = isRangeValid(range)
      ? companyRows.filter(function filterDate(row) {
          return row.usageDate >= range.start && row.usageDate <= range.end;
        })
      : [];
    var rowMap = {};
    var dailyMap = {};
    var dailyCompanySeen = {};
    var fallbackRow = companyRows[0] || monthRows[0] || allRows[0] || {};

    dateRows.forEach(function eachSellerHistoryRow(row) {
      var hourKey = row.usageDate + "|" + row.hour;
      if (!rowMap[hourKey]) {
        rowMap[hourKey] = {
          row: row,
          power: 0,
          hasPower: false,
        };
      }
      if (isHistoryNumericValue(row.power)) {
        rowMap[hourKey].power += Number(row.power);
        rowMap[hourKey].hasPower = true;
      }
      var dailyKey = row.usageDate + "|" + row.sellerCompanyCode;
      if (dailyCompanySeen[dailyKey]) {
        return;
      }
      dailyCompanySeen[dailyKey] = true;
      if (!dailyMap[row.usageDate]) {
        dailyMap[row.usageDate] = {
          total: 0,
          hasValue: false,
          row: row,
        };
      }
      if (isHistoryNumericValue(row.dailyPower)) {
        dailyMap[row.usageDate].total += row.dailyPower;
        dailyMap[row.usageDate].hasValue = true;
      }
    });

    var dailyTrendRows = dateLabels.map(function mapSellerHistoryDate(date) {
      var daily = dailyMap[date];
      return {
        agentMonth: agentMonth,
        usageDate: date,
        sellerCompanyName: sellerName === "全部" ? (fallbackRow.sellerCompanyName || "全部售电公司") : sellerName,
        dailyPower: daily && daily.hasValue ? roundHistoryMetric(daily.total) : null,
      };
    });

    return {
      agentMonth: agentMonth,
      activeRange: cloneRange(range),
      monthHasData: monthRows.length > 0,
      hasData: dateRows.some(function someHistoryPower(row) {
        return isHistoryNumericValue(row.power);
      }),
      dateLabels: dateLabels,
      dailyTrendRows: dailyTrendRows,
      tableRows: dateRows.length
        ? dateLabels.reduce(function buildSellerHistoryRows(acc, date) {
            return acc.concat(
              hours.map(function mapSellerHistoryHour(hour) {
                var matched = rowMap[date + "|" + hour];
                return {
                  agentMonth: agentMonth,
                  sellerCompanyCode: (matched && matched.row && matched.row.sellerCompanyCode) || fallbackRow.sellerCompanyCode || "-",
                  sellerCompanyName: (matched && matched.row && matched.row.sellerCompanyName) || fallbackRow.sellerCompanyName || "-",
                  usageDate: date,
                  hour: hour,
                  power: matched && matched.hasPower ? roundHistoryMetric(matched.power) : null,
                  dailyPower: matched && matched.row ? normalizeHistoryPower(matched.row.dailyPower) : null,
                  userCount: matched && matched.row && matched.row.userCount !== undefined ? matched.row.userCount : "-",
                  dataSource: (matched && matched.row && matched.row.dataSource) || "-",
                  updateTime: (matched && matched.row && matched.row.updateTime) || "-",
                };
              }),
            );
          }, [])
        : [],
      latestUpdateInfo: getLatestHistoryUpdateInfo(dateRows, monthRows.length ? monthRows : allRows),
    };
  }

  function getSellerHistoryCompareDataset(dataset) {
    var baseRange = (dataset && dataset.activeRange) || state.info.filters.sellerHistoryRange;
    if (!isInfoDisclosureCompareActive(INFO_DISCLOSURE_SELLER_HISTORY_TAB)) {
      return null;
    }
    if (!isRangeValid(state.ui.compareRangeDraft) || !isRangeValid(baseRange) || getRangeDays(state.ui.compareRangeDraft) !== getRangeDays(baseRange)) {
      return null;
    }
    return getSellerHistoryDataset(state.ui.compareRangeDraft);
  }

  function buildSellerHistoryCompareValues(dataset, compareDataset) {
    if (!dataset || !compareDataset) {
      return [];
    }
    var compareRows = compareDataset.dailyTrendRows || [];
    return (dataset.dailyTrendRows || []).map(function mapSellerHistoryCompareValue(_, index) {
      var matched = compareRows[index];
      return matched && isHistoryNumericValue(matched.dailyPower) ? matched.dailyPower : null;
    });
  }

  function formatSellerHistoryTooltip(dataset, compareDataset, index) {
    var row = (dataset.dailyTrendRows || [])[index] || {};
    var compareRow = compareDataset && (compareDataset.dailyTrendRows || [])[index];
    var currentValue = isHistoryNumericValue(row.dailyPower) ? row.dailyPower : null;
    var html =
      '<div class="chart-tooltip-stack">' +
      "<div>代理月份: " +
      escapeHtml(row.agentMonth || "-") +
      "</div><div>用电日期: " +
      escapeHtml(row.usageDate || "-") +
      "</div><div>售电公司名称: " +
      escapeHtml(row.sellerCompanyName || "-") +
      "</div><div>日总电量: " +
      escapeHtml(formatHistoryPower(currentValue)) +
      " MWh</div>";

    if (compareRow) {
      html +=
        "<div>对比日期: " +
        escapeHtml(compareRow.usageDate || "-") +
        "</div><div>对比日总电量: " +
        escapeHtml(formatHistoryPower(compareRow.dailyPower)) +
        " MWh " +
        formatSaleCompanyChange(compareRow.dailyPower, currentValue) +
        "</div>";
    }

    return (
      html +
      "<div>数据口径: " +
      escapeHtml(HISTORY_RETRACE_SCOPE_TEXT) +
      "</div></div>"
    );
  }

  function getSellerHistoryTableConfig(dataset) {
    var dateLabels = (dataset.dateLabels || []).slice();
    var rowMap = {};
    var columns = [
      { key: "hour", label: "时刻", fixed: true, draggable: false, width: 96 },
    ].concat(
      dateLabels.map(function mapSellerHistoryDateColumn(date) {
        return {
          key: buildDateColumnKey(date),
          label: formatDateCompact(date),
          width: 132,
        };
      }),
    );

    (dataset.tableRows || []).forEach(function eachSellerHistoryTableSourceRow(row) {
      rowMap[row.hour + "|" + row.usageDate] = row;
    });

    return {
      columns: columns,
      rows: getTimeSharingHourLabels().map(function mapSellerHistoryMatrixRow(hour) {
        var tableRow = {
          hour: hour,
        };
        dateLabels.forEach(function eachSellerHistoryMatrixDate(date) {
          var matched = rowMap[hour + "|" + date];
          tableRow[buildDateColumnKey(date)] = createNumericEnergyCell(
            matched ? matched.power : null,
            formatHistoryPower,
          );
        });
        return tableRow;
      }),
      minWidth: 96 + Math.max(dateLabels.length, 1) * 132,
    };
  }

  function getUserHistoryDataset() {
    var filters = state.info.filters;
    var agentMonth = filters.userHistoryAgentMonth || getDefaultHistoryAgentMonth("user");
    var range = filters.userHistoryRange || getDefaultHistoryRange("user", agentMonth);
    var dateLabels = buildDateRangeList(range);
    var hours = getTimeSharingHourLabels();
    var allRows = getHistoryRowsByType("user");
    var monthRows = allRows.filter(function filterMonth(row) {
      return row.agentMonth === agentMonth;
    });
    function getUserHistoryGroupKey(row) {
      return [
        row.powerUserCode || "",
        row.powerUserName || "",
        row.accountNo || "",
        row.meterPointNo || "",
        formatHistoryMicrogrid(row.microgridName),
        formatHistoryMicrogrid(row.microgridId),
      ].join("|");
    }
    var filteredRows = isRangeValid(range)
      ? monthRows.filter(function filterUserHistory(row) {
          return (
            row.usageDate >= range.start &&
            row.usageDate <= range.end &&
            includesCodeKeyword(row.powerUserCode, filters.userHistoryUserCode) &&
            includesKeyword(row.powerUserName, filters.userHistoryUserName) &&
            includesCodeKeyword(row.accountNo, filters.userHistoryAccountNo) &&
            includesNullableMicrogridValue(row.microgridId, filters.userHistoryMicrogridId)
          );
        })
      : [];
    var rowMap = {};
    var userMap = {};

    filteredRows.forEach(function eachUserHistoryRow(row) {
      var userKey = getUserHistoryGroupKey(row);
      rowMap[userKey + "|" + row.usageDate + "|" + row.hour] = row;
      if (!userMap[userKey]) {
        userMap[userKey] = {
          userKey: userKey,
          agentMonth: row.agentMonth,
          sellerCompanyCode: row.sellerCompanyCode,
          sellerCompanyName: row.sellerCompanyName,
          powerUserCode: row.powerUserCode,
          powerUserName: row.powerUserName,
          accountNo: row.accountNo,
          meterPointNo: row.meterPointNo,
          microgridName: row.microgridName,
          microgridId: row.microgridId,
        };
      }
    });

    var users = Object.keys(userMap)
      .sort()
      .map(function mapUser(key) {
        return userMap[key];
      });

    return {
      agentMonth: agentMonth,
      activeRange: cloneRange(range),
      monthHasData: monthRows.length > 0,
      hasData: filteredRows.some(function someUserHistoryPower(row) {
        return isHistoryNumericValue(row.power);
      }),
      tableRows: filteredRows.length
        ? users.reduce(function buildUserHistoryRows(acc, user) {
            dateLabels.forEach(function eachUserHistoryDate(date) {
              hours.forEach(function eachUserHistoryHour(hour) {
                var matched = rowMap[user.userKey + "|" + date + "|" + hour];
                acc.push({
                  agentMonth: agentMonth,
                  sellerCompanyCode: user.sellerCompanyCode || "-",
                  sellerCompanyName: user.sellerCompanyName || "-",
                  powerUserCode: user.powerUserCode || "-",
                  powerUserName: user.powerUserName || "-",
                  accountNo: user.accountNo || "-",
                  meterPointNo: user.meterPointNo || "-",
                  microgridName: formatHistoryMicrogrid(user.microgridName),
                  microgridId: formatHistoryMicrogrid(user.microgridId),
                  usageDate: date,
                  hour: hour,
                  power: matched ? normalizeHistoryPower(matched.power) : null,
                  dataSource: (matched && matched.dataSource) || "-",
                  updateTime: (matched && matched.updateTime) || "-",
                });
              });
            });
            return acc;
          }, [])
        : [],
      latestUpdateInfo: getLatestHistoryUpdateInfo(filteredRows, monthRows.length ? monthRows : allRows),
    };
  }

  function getUserHistoryTableConfig(dataset) {
    var fixedColumns = [
      createFixedColumn("usageDate", "日期", 118),
      createFixedColumn("powerUserCode", "电力用户编码", 158),
      createFixedColumn("powerUserName", "电力用户名称", 220),
      createFixedColumn("microgridName", "微电网名称", 190),
      createFixedColumn("microgridId", "微电网ID", 132),
      createFixedColumn("accountNo", "户号", 148),
      createFixedColumn("meterPointNo", "计量点编号", 152),
    ];
    var rowMap = {};
    var groupedRows = {};

    (dataset.tableRows || []).forEach(function eachUserHistoryTableSourceRow(row) {
      var groupKey = [
        row.usageDate,
        row.powerUserCode,
        row.powerUserName,
        formatHistoryMicrogrid(row.microgridName),
        formatHistoryMicrogrid(row.microgridId),
        row.accountNo,
        row.meterPointNo,
      ].join("|");
      if (!groupedRows[groupKey]) {
        groupedRows[groupKey] = {
          usageDate: row.usageDate || "-",
          powerUserCode: row.powerUserCode || "-",
          powerUserName: row.powerUserName || "-",
          microgridName: formatHistoryMicrogrid(row.microgridName),
          microgridId: formatHistoryMicrogrid(row.microgridId),
          accountNo: row.accountNo || "-",
          meterPointNo: row.meterPointNo || "-",
        };
      }
      rowMap[groupKey + "|" + row.hour] = row.power;
    });

    return {
      columns: fixedColumns.concat(buildHourlyEnergyColumns(96)),
      rows: Object.keys(groupedRows).sort().map(function mapUserHistoryWideRow(groupKey) {
        var tableRow = groupedRows[groupKey];
        getTimeSharingHourLabels().forEach(function eachUserHistoryWideHour(hour) {
          tableRow[buildHourColumnKey(hour)] = createNumericEnergyCell(rowMap[groupKey + "|" + hour], formatHistoryPower);
        });
        return tableRow;
      }),
      minWidth:
        fixedColumns.reduce(function sumFixedColumnWidth(total, column) {
          return total + Number(column.width || 0);
        }, 0) +
        getTimeSharingHourLabels().length * 96,
    };
  }

  function renderHistoryUpdateBar(updateInfo) {
    return renderDataUpdateBar({
      updatedAt: updateInfo.time || "-",
      publishTime: updateInfo.publishTime || "-",
      source: updateInfo.source || "-",
      hasCompare: false,
      showTaskEntry: false,
      actions: [{ label: "下载", variant: "primary", icon: "download", action: "open-download" }],
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function renderEnterpriseUpdateBar(updateInfo) {
    var status = applyInfoUpdateOverride(updateInfo, "用电企业分时电量");
    return renderDataUpdateBar({
      updatedAt: status.time || "-",
      publishTime: status.publishTime || "-",
      source: status.source || "-",
      hasCompare: false,
      showTaskEntry: false,
      actions: [
        createMoreUpdateAction("open-time-sharing-update"),
        createDownloadMenuAction(),
      ],
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function renderSellerHistoryUpdateBar(updateInfo) {
    var status = applyInfoUpdateOverride(updateInfo, INFO_DISCLOSURE_SELLER_HISTORY_TAB);
    var actions = [
      createMoreUpdateAction("open-seller-time-sharing-update"),
      { label: "对比", variant: "ghost", icon: "compare", action: "open-compare" },
      createDownloadMenuAction(),
    ];

    return renderDataUpdateBar({
      updatedAt: status.time || "-",
      publishTime: status.publishTime || "-",
      source: status.source || "-",
      hasCompare: isInfoDisclosureCompareActive(INFO_DISCLOSURE_SELLER_HISTORY_TAB),
      showTaskEntry: false,
      actions: actions,
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function renderUserHistoryUpdateBar(updateInfo) {
    var status = applyInfoUpdateOverride(updateInfo, INFO_DISCLOSURE_USER_HISTORY_TAB);
    return renderDataUpdateBar({
      updatedAt: status.time || "-",
      publishTime: status.publishTime || "-",
      source: status.source || "-",
      hasCompare: false,
      showTaskEntry: false,
      actions: [
        createMoreUpdateAction("open-time-sharing-update"),
        createDownloadMenuAction(),
      ],
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function renderHistoryEmptyPanel(message) {
    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain chart-main-empty">' +
      renderEmptyState({
        message: message,
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      }) +
      "</div></section>"
    );
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
      return !getSaleCompanyDataset().hasData;
    }
    if (activeTab === "用电企业分时电量") {
      return !getEnterpriseRows().length;
    }
    if (activeTab === INFO_DISCLOSURE_SELLER_HISTORY_TAB) {
      return !getSellerHistoryDataset().hasData;
    }
    if (activeTab === INFO_DISCLOSURE_USER_HISTORY_TAB) {
      return !getUserHistoryDataset().hasData;
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

  function parseInfoStatus(statusText, publishTime) {
    var match = String(statusText || "").match(/^数据更新时间：(.+?)（(.+?)）$/);
    if (!match) {
      return {
        time: "2026-05-08 11:35:33",
        source: "取数工具",
        publishTime: normalizeStatusTime(publishTime),
      };
    }
    return {
      time: match[1],
      source: match[2],
      publishTime: normalizeStatusTime(publishTime),
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
    var fileName;

    if (type === INFO_DISCLOSURE_SELLER_HISTORY_TAB || type === INFO_DISCLOSURE_USER_HISTORY_TAB) {
      var agentMonth =
        type === INFO_DISCLOSURE_SELLER_HISTORY_TAB
          ? state.info.filters.sellerHistoryAgentMonth || getDefaultHistoryAgentMonth("seller")
          : state.info.filters.userHistoryAgentMonth || getDefaultHistoryAgentMonth("user");
      fileName =
        "信息披露_" +
        type +
        "_代理月份" +
        String(agentMonth || "").replace(/-/g, "") +
        "_" +
        formatDateCompact(range.start) +
        "至" +
        formatDateCompact(range.end) +
        ".xlsx";
    } else {
      fileName =
        currentPage.title.replace(/\s+/g, "") +
        "_" +
        type +
        "_" +
        formatDateCompact(range.start) +
        "至" +
        formatDateCompact(range.end) +
        ".xls";
    }

    state.downloadTasks.unshift({
      id: "dl-" + Date.now(),
      fileName: fileName,
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

  function renderInfoFilterPanel(fieldsHtml, actionsHtml) {
    var resolvedFieldsHtml = fieldsHtml || "";
    var resolvedActionsHtml = actionsHtml || "";

    if (!resolvedFieldsHtml) {
      return "";
    }

    return (
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      resolvedFieldsHtml +
      '</div><div class="info-filter-actions">' +
      resolvedActionsHtml +
      "</div></section>"
    );
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

  function renderMarketPageHeader(title, tabsHtml, options) {
    var headerOptions = options || {};
    var secondaryTabsHtml = headerOptions.secondaryTabsHtml || "";
    return (
      '<div class="page-stack">' +
      '<section class="page-header"><h1>' +
      escapeHtml(title) +
      "</h1>" +
      renderTradeCenterSelector({
        selected: state.ui.selectedTradeCenter,
        options: headerOptions.tradeCenterOptions || TRADE_CENTER_OPTIONS,
        isOpen: state.ui.tradeCenterOpen,
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      }) +
      "</section>" +
      (tabsHtml
        ? '<section class="panel tabs-panel"><div class="panel-topline"><div class="primary-tabs">' +
          tabsHtml +
          "</div></div>" +
          (secondaryTabsHtml ? '<div class="secondary-tabs">' + secondaryTabsHtml + "</div>" : "") +
          "</section>"
        : "")
    );
  }

  function renderPageTabs(tabs, activeTab) {
    return (tabs || [])
      .map(function mapTab(tab) {
        var isActive = activeTab === tab;
        return '<button type="button" class="primary-tab ' + (isActive ? "active" : "") + '" data-page-tab="' + escapeHtml(tab) + '"' + (isActive ? ' aria-current="page"' : "") + ">" + escapeHtml(tab) + "</button>";
      })
      .join("");
  }

  function renderSettlementPageTabs(tabs, activeTab) {
    var tabLabels = {
      "日清算": "日清算结果",
      "月结算": "月结算结果",
    };
    return (tabs || [])
      .map(function mapTab(tab) {
        var isActive = activeTab === tab;
        return '<button type="button" class="primary-tab ' + (isActive ? "active" : "") + '" data-page-tab="' + escapeHtml(tab) + '"' + (isActive ? ' aria-current="page"' : "") + ">" + escapeHtml(tabLabels[tab] || tab) + "</button>";
      })
      .join("");
  }

  function renderSecondaryTabs(tabs, activeTab) {
    return (tabs || [])
      .map(function mapTab(tab) {
        var isActive = activeTab === tab;
        return '<button type="button" class="secondary-tab ' + (isActive ? "active" : "") + '" data-secondary-tab="' + escapeHtml(tab) + '"' + (isActive ? ' aria-pressed="true"' : "") + ">" + escapeHtml(tab) + "</button>";
      })
      .join("");
  }

  function createMoreUpdateAction(action) {
    return {
      label: "更多",
      variant: "ghost",
      icon: "ellipsis",
      action: "more",
      asMenu: true,
      menuItems: [{ label: "更新数据", action: action || "open-manual-update" }],
    };
  }

  function createDownloadMenuAction() {
    return {
      label: "下载",
      variant: "primary",
      icon: "download",
      action: "download",
      downloadMenu: true,
      menuItems: [{ label: "自定义日期", action: "open-download" }],
    };
  }

  function renderDownloadOnlyBar(status, withCompare, options) {
    var actions = [];
    var resolvedOptions = options || {};
    if (resolvedOptions.withMore) {
      actions.push({ label: "更多", variant: "ghost", icon: "ellipsis", action: "open-manual-update" });
    }
    if (withCompare) {
      actions.push({ label: "对比", variant: "ghost", icon: "compare", action: "open-compare" });
    }
    actions.push({ label: "更新数据", variant: "ghost", icon: "refresh", action: "open-manual-update" });
    actions.push({ label: "下载", variant: "primary", icon: "download", action: "open-download" });

    return renderDataUpdateBar({
      updatedAt: status.time,
      publishTime: status.publishTime,
      source: status.source,
      hasCompare: withCompare && state.ui.hasCompare,
      showTaskEntry: true,
      actions: actions,
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function getHistorySellerCompanyOptions(type) {
    var options = ["全部"];
    getHistoryRowsByType(type).forEach(function eachHistoryCompany(row) {
      if (row && row.sellerCompanyName && options.indexOf(row.sellerCompanyName) < 0) {
        options.push(row.sellerCompanyName);
      }
    });
    return options;
  }

  function renderHistoryScopeNote() {
    return '<section class="panel history-scope-panel"><div class="placeholder-note">' + escapeHtml(HISTORY_RETRACE_SCOPE_TEXT) + "</div></section>";
  }

  function renderSellerHistoryFilterBar() {
    var filters = state.info.filters;
    var fieldsHtml = renderMonthFilter("代理月份", filters.sellerHistoryAgentMonth || getDefaultHistoryAgentMonth("seller"), "sellerHistoryAgentMonth", "info");
    var actionsHtml = renderUiActionButton("重置", "ghost", "reset-seller-history") + renderUiActionButton("查询", "primary", "query-seller-history");
    return renderInfoFilterPanel(fieldsHtml, actionsHtml);
  }

  function renderUserHistoryFilterBar() {
    var filters = state.info.filters;
    var fieldsHtml =
      renderMonthFilter("代理月份", filters.userHistoryAgentMonth || getDefaultHistoryAgentMonth("user"), "userHistoryAgentMonth", "info") +
      renderTextFilter("电力用户编码", "userHistoryUserCode", "请输入电力用户编码") +
      renderTextFilter("电力用户名称", "userHistoryUserName", "请输入电力用户名称") +
      renderTextFilter("用户户号", "userHistoryAccountNo", "请输入用户户号") +
      renderTextFilter("微电网ID", "userHistoryMicrogridId", "请输入微电网ID");
    var actionsHtml = renderUiActionButton("重置", "ghost", "reset-user-history") + renderUiActionButton("查询", "primary", "query-user-history");
    return renderInfoFilterPanel(fieldsHtml, actionsHtml);
  }

  function renderInfoFilterBar(pageData) {
    var activeTab = getActiveInfoTab();
    var fieldsHtml = "";
    var actionsHtml = "";

    if (activeTab === "售电公司分时电量") {
      if (isPageBackedTimeSharingTab(activeTab, pageData)) {
        fieldsHtml = renderUnifiedInfoDisclosureBusinessFilterFields(pageData);
        actionsHtml = fieldsHtml
          ? renderUiActionButton("重置", "ghost", "reset-info-disclosure-filters") +
            renderUiActionButton("查询", "primary", "query-info-disclosure-filters")
          : "";
      } else {
        fieldsHtml = renderUnifiedInfoDisclosureBusinessFilterFields(pageData);
        actionsHtml = fieldsHtml
          ? renderUiActionButton("重置", "ghost", "reset-sale-company") +
            renderUiActionButton("查询", "primary", "query-sale-company")
          : "";
      }
    } else if (activeTab === "用电企业分时电量") {
      if (isPageBackedTimeSharingTab(activeTab, pageData)) {
        fieldsHtml = renderUnifiedInfoDisclosureBusinessFilterFields(pageData);
        actionsHtml = fieldsHtml
          ? renderUiActionButton("重置", "ghost", "reset-info-disclosure-filters") +
            renderUiActionButton("查询", "primary", "query-info-disclosure-filters")
          : "";
      } else {
        fieldsHtml =
          renderTextFilter("电力用户编码", "enterpriseUserCode", "请输入电力用户编码") +
          renderTextFilter("电力用户名称", "enterpriseUserName", "请输入电力用户名称") +
          renderTextFilter("用户户号", "enterpriseAccountNo", "请输入用户户号") +
          renderTextFilter("微电网ID", "enterpriseMicrogridId", "请输入微电网ID");
        actionsHtml = renderUiActionButton("重置", "ghost", "reset-enterprise") + renderUiActionButton("查询", "primary", "query-enterprise");
      }
    } else if (activeTab === INFO_DISCLOSURE_SELLER_HISTORY_TAB) {
      return renderSellerHistoryFilterBar();
    } else if (activeTab === INFO_DISCLOSURE_USER_HISTORY_TAB) {
      return renderUserHistoryFilterBar();
    }

    return renderInfoFilterPanel(fieldsHtml, actionsHtml);
  }

  function renderInfoDataUpdateBar(status) {
    var actions = [createMoreUpdateAction("open-manual-update")];
    if (getActiveInfoTab() === "负荷信息") {
      actions.push({ label: "对比", variant: "ghost", icon: "compare", action: "open-compare" });
    }
    actions.push(createDownloadMenuAction());

    return renderDataUpdateBar({
      updatedAt: status.time,
      publishTime: status.publishTime,
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
    var dataset = getSaleCompanyDataset();
    var compareDataset = getSaleCompanyCompareDataset();
    var table = getSaleCompanyTableConfig(dataset);

    if (!dataset.hasData) {
      return (
        renderSaleCompanyUpdateBar(dataset.latestUpdateInfo) +
        '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain chart-main-empty">' +
        renderEmptyState({
          message: "暂无数据",
          escapeHtml: escapeHtml,
          renderIcon: renderIcon,
        }) +
        "</div></section>"
      );
    }

    var chartSeries = [
      {
        id: "sale-company-hourly",
        label: "分时电量",
        color: "#1677FF",
        values: (dataset.chartRows || []).map(function mapRow(row) {
          return isSaleCompanyNumericValue(row.electricity) ? Number(row.electricity.toFixed(3)) : null;
        }),
      },
    ];

    if (compareDataset && (compareDataset.chartRows || []).length) {
      chartSeries.push({
        id: "sale-company-hourly-compare",
        label: "对比分时电量",
        color: "#FF7A45",
        dasharray: "6 4",
        values: buildSaleCompanyCompareValues(dataset, compareDataset),
      });
    }

    var chartHtml = renderChartWithMarks({
      chartId: "sale-company-chart",
      title: "售电公司分时电量趋势",
      labels: dataset.labels,
      unit: "MWh",
      series: chartSeries,
      hiddenSeries: getChartHiddenState("sale-company-chart"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: function renderSaleCompanyEmptyState(options) {
        return renderEmptyState({
          escapeHtml: options.escapeHtml,
          renderIcon: options.renderIcon,
          message: "暂无数据",
        });
      },
      xLabelEvery: 1,
      zoomPointWidth: dataset.activeRange && dataset.activeRange.start === dataset.activeRange.end ? 40 : 118,
      valueFormatter: function formatSaleCompanyChartValue(value) {
        return typeof value === "number" && !Number.isNaN(value) ? value.toFixed(3) : "--";
      },
      tooltipFormatter: function tooltipFormatter(_, index) {
        return formatSaleCompanyTooltip(dataset, compareDataset, index);
      },
      tooltipIsHtml: true,
      enableTimeZoom: true,
      breakOnNull: true,
    });
    var tableHtml = renderDataTablePro({
      tableId: "sale-company-table",
      columns: table.columns,
      rows: table.rows,
      minWidth: table.minWidth,
      sortState: getTableSortState("sale-company-table"),
      enableColumnDrag: true,
      columnOrder: getTableColumnOrder("sale-company-table"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: function renderSaleCompanyTableEmptyState(options) {
        return renderEmptyState({
          escapeHtml: options.escapeHtml,
          renderIcon: options.renderIcon,
          message: "暂无数据",
        });
      },
    });
    return (
      renderSaleCompanyUpdateBar(dataset.latestUpdateInfo) +
      renderChartSection("售电公司分时电量趋势", chartHtml) +
      renderChartSection("1 小时分时电量明细", tableHtml, "单位：MWh")
    );
  }

  function renderEnterpriseContent() {
    var rows = getEnterpriseRows();
    var table = getEnterpriseTable();
    var updateInfo = getEnterpriseLatestUpdateInfo(rows);
    var updateHtml = renderEnterpriseUpdateBar(updateInfo);
    var tableHtml = renderDataTablePro({
      tableId: "enterprise-table",
      columns: table.columns,
      rows: table.rows,
      minWidth: table.minWidth,
      sortState: getTableSortState("enterprise-table"),
      enableColumnDrag: true,
      columnOrder: getTableColumnOrder("enterprise-table"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: function renderEnterpriseEmptyState(options) {
        return renderEmptyState({
          escapeHtml: options.escapeHtml,
          renderIcon: options.renderIcon,
          message: "暂无数据",
        });
      },
    });

    return updateHtml + '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' + tableHtml + "</div></section>";
  }

  function renderSellerHistoryContent() {
    var dataset = getSellerHistoryDataset();
    var compareDataset = getSellerHistoryCompareDataset(dataset);
    var table = getSellerHistoryTableConfig(dataset);
    var updateHtml = renderSellerHistoryUpdateBar(dataset.latestUpdateInfo);

    if (!dataset.monthHasData) {
      return updateHtml + renderHistoryScopeNote() + renderHistoryEmptyPanel("当前代理月份历史回溯数据暂未生成，请更换代理月份或稍后查看");
    }

    if (!dataset.hasData) {
      return updateHtml + renderHistoryScopeNote() + renderHistoryEmptyPanel("暂无历史回溯分时电量数据");
    }

    var chartHtml = renderChartWithMarks({
      chartId: "seller-history-chart",
      title: "售电公司分时电量历史回溯趋势",
      labels: dataset.dateLabels,
      unit: "MWh",
      series: [
        {
          id: "seller-history-daily-total",
          label: "日总电量",
          color: "#1677FF",
          values: (dataset.dailyTrendRows || []).map(function mapSellerHistoryDaily(row) {
            return isHistoryNumericValue(row.dailyPower) ? row.dailyPower : null;
          }),
        },
      ].concat(
        compareDataset && (compareDataset.dailyTrendRows || []).length
          ? [
              {
                id: "seller-history-daily-total-compare",
                label: "对比日总电量",
                color: "#FF7A45",
                dasharray: "6 4",
                values: buildSellerHistoryCompareValues(dataset, compareDataset),
              },
            ]
          : [],
      ),
      hiddenSeries: getChartHiddenState("seller-history-chart"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: function renderSellerHistoryChartEmptyState(options) {
        return renderEmptyState({
          escapeHtml: options.escapeHtml,
          renderIcon: options.renderIcon,
          message: "暂无历史回溯分时电量数据",
        });
      },
      xLabelEvery: 1,
      valueFormatter: function formatSellerHistoryChartValue(value) {
        return typeof value === "number" && !Number.isNaN(value) ? value.toFixed(2) : "--";
      },
      tooltipFormatter: function tooltipFormatter(_, index) {
        return formatSellerHistoryTooltip(dataset, compareDataset, index);
      },
      tooltipIsHtml: true,
      tooltipWidth: 360,
      tooltipHeight: compareDataset ? 236 : 188,
      breakOnNull: true,
    });
    var tableHtml = renderDataTablePro({
      tableId: "seller-history-table",
      columns: table.columns,
      rows: table.rows,
      minWidth: table.minWidth,
      sortState: getTableSortState("seller-history-table"),
      enableColumnDrag: true,
      columnOrder: getTableColumnOrder("seller-history-table"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: function renderSellerHistoryTableEmptyState(options) {
        return renderEmptyState({
          escapeHtml: options.escapeHtml,
          renderIcon: options.renderIcon,
          message: "暂无历史回溯分时电量数据",
        });
      },
    });

    return (
      updateHtml +
      renderHistoryScopeNote() +
      renderChartSection("售电公司历史回溯日总电量趋势", chartHtml, "单位：MWh") +
      renderChartSection("1 小时分时电量明细", tableHtml, "单位：MWh")
    );
  }

  function renderUserHistoryContent() {
    var dataset = getUserHistoryDataset();
    var table = getUserHistoryTableConfig(dataset);
    var updateHtml = renderUserHistoryUpdateBar(dataset.latestUpdateInfo);

    if (!dataset.monthHasData) {
      return updateHtml + renderHistoryScopeNote() + renderHistoryEmptyPanel("当前代理月份历史回溯数据暂未生成，请更换代理月份或稍后查看");
    }

    if (!dataset.hasData) {
      return updateHtml + renderHistoryScopeNote() + renderHistoryEmptyPanel("暂无历史回溯分时电量数据");
    }

    var tableHtml = renderDataTablePro({
      tableId: "user-history-table",
      columns: table.columns,
      rows: table.rows,
      minWidth: table.minWidth,
      sortState: getTableSortState("user-history-table"),
      enableColumnDrag: true,
      columnOrder: getTableColumnOrder("user-history-table"),
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: function renderUserHistoryTableEmptyState(options) {
        return renderEmptyState({
          escapeHtml: options.escapeHtml,
          renderIcon: options.renderIcon,
          message: "暂无历史回溯分时电量数据",
        });
      },
    });

    return updateHtml + renderHistoryScopeNote() + renderChartSection("用电企业小时级分时电量明细", tableHtml, "单位：MWh");
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

  function isUnifiedMockInfoTradeTab(tab) {
    return tab === "全省统一出清价" || tab === "交易结果" || tab === "节点电价";
  }

  function isPageBackedTimeSharingTab(tab, pageData) {
    var activeTab = tab || getActiveInfoTab();
    var activePageData = pageData || getInfoDisclosurePageData();
    return (
      !isGuangdongInfoDisclosureCenter() &&
      (activeTab === "售电公司分时电量" || activeTab === "用电企业分时电量") &&
      activePageData &&
      activePageData.viewType
    );
  }

  function renderInfoUnifiedDataUpdateBar(status, compareSupported) {
    var actions = [createMoreUpdateAction("open-manual-update")];
    var canCompare = compareSupported && isInfoDisclosureCompareEnabledByConfig(getActiveInfoTab());

    if (canCompare) {
      actions.push({ label: "对比", variant: "ghost", icon: "compare", action: "open-compare" });
    }

    actions.push(createDownloadMenuAction());

    return renderDataUpdateBar({
      updatedAt: status.time,
      publishTime: status.publishTime,
      source: status.source,
      hasCompare: canCompare && state.ui.hasCompare,
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

  function renderInfoNoDataSourceEmptyState() {
    return renderInfoUnsupportedEmptyState(INFO_DISCLOSURE_NO_DATA_SOURCE_MESSAGE);
  }

  function renderInfoEmptyWithSidebar(sidebarHtml, message, layoutClassName) {
    var layoutClass = "chart-layout" + (layoutClassName ? " " + layoutClassName : "");
    return (
      '<section class="panel chart-panel"><div class="' +
      layoutClass +
      '">' +
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

  function renderInfoTradeNoCompareHint(activeTab, compareRows, pageData) {
    if (activeTab === "全省统一出清价" && isPageBackedUnifiedClearingPrice(pageData, activeTab)) {
      if (!state.ui.hasCompare || (compareRows || []).length) {
        return "";
      }
      return '<div class="placeholder-note trade-compare-hint">对比日暂无数据</div>';
    }

    return getTradeResultNoCompareHint(activeTab);
  }

  function findSingleMetricLoadSidebarItem(items, itemId) {
    var index;

    for (index = 0; index < (items || []).length; index += 1) {
      if (items[index].id === itemId) {
        return items[index];
      }
      if (items[index].children && items[index].children.length) {
        var childMatch = findSingleMetricLoadSidebarItem(items[index].children, itemId);
        if (childMatch) {
          return childMatch;
        }
      }
    }

    return null;
  }

  function getFirstSingleMetricLoadItem(groups) {
    var groupIndex;
    var itemIndex;

    for (groupIndex = 0; groupIndex < (groups || []).length; groupIndex += 1) {
      for (itemIndex = 0; itemIndex < ((groups[groupIndex] && groups[groupIndex].items) || []).length; itemIndex += 1) {
        var item = (groups[groupIndex] && groups[groupIndex].items) ? groups[groupIndex].items[itemIndex] : null;
        if (!item) {
          continue;
        }
        if (item.id) {
          return item;
        }
        if (item.children && item.children.length) {
          return item.children[0];
        }
      }
    }

    return null;
  }

  function getSingleMetricLoadSelectedItem(pageData) {
    var groups = (pageData && pageData.sidebarGroups) || [];
    var groupIndex;

    for (groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      var selectedItem = findSingleMetricLoadSidebarItem(groups[groupIndex].items || [], state.info.selectedMetric);
      if (selectedItem) {
        return selectedItem;
      }
    }

    if (pageData && pageData.defaultMetricId) {
      state.info.selectedMetric = pageData.defaultMetricId;
      for (groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
        selectedItem = findSingleMetricLoadSidebarItem(groups[groupIndex].items || [], pageData.defaultMetricId);
        if (selectedItem) {
          return selectedItem;
        }
      }
    }

    var firstItem = getFirstSingleMetricLoadItem(groups);
    if (firstItem) {
      state.info.selectedMetric = firstItem.id;
      return firstItem;
    }

    return null;
  }

  function singleMetricLoadHasSelectedDescendant(item, selectedMetricId) {
    if (!item || !item.children || !item.children.length) {
      return false;
    }

    return item.children.some(function someChild(child) {
      return child.id === selectedMetricId || singleMetricLoadHasSelectedDescendant(child, selectedMetricId);
    });
  }

  function getSingleMetricLoadSidebarItemById(pageData, itemId) {
    var groups = (pageData && pageData.sidebarGroups) || [];
    var groupIndex;

    for (groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      var item = findSingleMetricLoadSidebarItem(groups[groupIndex].items || [], itemId);
      if (item) {
        return item;
      }
    }

    return null;
  }

  function renderSingleMetricLoadSidebar(groups, selectedMetricId, options) {
    var settings = options || {};
    if (!settings.useLoadInfoTreeNav) {
      function renderDefaultItems(items, level) {
        return (items || [])
          .map(function mapItem(item) {
            var childItems = item.children || [];
            var hasChildren = childItems.length > 0;
            var isActive = item.id === selectedMetricId;
            var hasActiveChild = singleMetricLoadHasSelectedDescendant(item, selectedMetricId);
            var isExpanded = hasChildren && (state.info.expandedMetrics.has(item.id) || hasActiveChild);
            return (
              '<div class="metric-node level-' +
              level +
              '">' +
              '<button class="metric-row ' +
              (level > 0 ? "metric-row-child " : "") +
              (isActive ? "active " : "") +
              (hasActiveChild ? "active-parent" : "") +
              '" data-info-metric="' +
              escapeHtml(item.id) +
              '">' +
              (hasChildren
                ? '<span class="tree-caret ' +
                  (isExpanded ? "open" : "") +
                  '" data-info-metric-toggle="' +
                  escapeHtml(item.id) +
                  '">' +
                  renderIcon(isExpanded ? "chevron-down" : "chevron-right", "tree-caret-icon") +
                  "</span>"
                : '<span class="tree-caret spacer"></span>') +
              '<span class="tree-checkbox ' +
              (isActive ? "checked" : hasActiveChild ? "indeterminate" : "") +
              '"></span><span class="metric-text">' +
              escapeHtml(item.label) +
              "</span></button>" +
              (hasChildren && isExpanded ? renderDefaultItems(childItems, level + 1) : "") +
              "</div>"
            );
          })
          .join("");
      }

      return (
        '<aside class="chart-tree"><div class="tree-header">指标列表</div>' +
        (groups || [])
          .map(function mapGroup(group) {
            return (
              '<div class="market-metric-group"><div class="market-metric-group-title">' +
              escapeHtml(group.label) +
              "</div>" +
              renderDefaultItems(group.items || [], 0) +
              "</div>"
            );
          })
          .join("") +
        "</aside>"
      );
    }

    var flatItems = (groups || []).reduce(function flattenGroups(result, group) {
      return result.concat(group.items || []);
    }, []);

    function renderItems(items, level) {
      return (items || [])
        .map(function mapItem(item) {
          var childItems = item.children || [];
          var hasChildren = childItems.length > 0;
          var isActive = item.id === selectedMetricId;
          var hasActiveChild = singleMetricLoadHasSelectedDescendant(item, selectedMetricId);
          var isExpanded = hasChildren && (state.info.expandedMetrics.has(item.id) || hasActiveChild);
          var iconHtml = hasChildren
            ? '<span class="load-info-tree-nav__toggle ' +
              (isExpanded ? "is-open" : "is-closed") +
              '" data-info-metric-toggle="' +
              escapeHtml(item.id) +
              '" aria-hidden="true"></span>'
            : '<span class="load-info-tree-nav__leaf-icon" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><rect x="1.5" y="2.5" width="13" height="11"></rect><polyline points="3.5,10.5 6.2,8.3 8.4,9.2 12.5,5.8"></polyline></svg></span>';
          return (
            '<div class="load-info-tree-nav__node metric-node level-' +
            level +
            '">' +
            '<button class="load-info-tree-nav__item metric-row ' +
            (level > 0 ? "load-info-tree-nav__item--child metric-row-child " : "") +
            (hasChildren ? "load-info-tree-nav__item--parent " : "load-info-tree-nav__item--leaf ") +
            (isActive ? "load-info-tree-nav__item--active active " : "") +
            (hasActiveChild ? "load-info-tree-nav__item--active-parent active-parent" : "") +
            '" data-info-metric="' +
            escapeHtml(item.id) +
            '">' +
            iconHtml +
            '<span class="load-info-tree-nav__text metric-text">' +
            escapeHtml(item.label) +
            "</span></button>" +
            (hasChildren && isExpanded ? renderItems(childItems, level + 1) : "") +
            "</div>"
          );
        })
        .join("");
    }

    return (
      '<aside class="chart-tree single-metric-tree load-info-tree-nav">' +
      renderItems(flatItems, 0) +
      "</aside>"
    );
  }

  function createSingleMetricLoadNumberCell(value, isDiff) {
    var classNames = ["table-number-cell"];
    if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) {
      return {
        text: "--",
        className: classNames.join(" "),
        sortValue: Number.NEGATIVE_INFINITY,
        copyable: false,
      };
    }

    var numericValue = Number(value);
    if (isDiff && numericValue < 0) {
      classNames.push("table-negative");
    }

    return {
      text: Math.abs(numericValue % 1) > 0.001 ? formatDecimal(numericValue) : formatInteger(numericValue),
      className: classNames.join(" "),
      sortValue: numericValue,
    };
  }

  function isThermalBiddingSpaceMetric(metricConfig) {
    return Boolean(metricConfig && metricConfig.viewMode === "thermalBiddingSpace");
  }

  function isSingleMetricNumericValue(value) {
    return typeof value === "number" && !Number.isNaN(value);
  }

  function formatSingleMetricPowerValue(value) {
    return Math.abs(value % 1) > 0.001 ? formatDecimal(value) : formatInteger(value);
  }

  function createThermalBiddingSpaceNumberCell(value) {
    if (!isSingleMetricNumericValue(value)) {
      return {
        text: "-",
        className: "table-number-cell",
        sortValue: Number.NEGATIVE_INFINITY,
        copyable: false,
      };
    }

    return {
      text: formatSingleMetricPowerValue(value),
      className: "table-number-cell",
      sortValue: value,
    };
  }

  function calculateThermalBiddingSpaceChangeRatio(currentValue, compareValue) {
    if (!isSingleMetricNumericValue(currentValue) || !isSingleMetricNumericValue(compareValue) || currentValue === 0) {
      return null;
    }
    return (compareValue - currentValue) / currentValue;
  }

  function formatThermalBiddingSpaceChangeText(currentValue, compareValue) {
    var changeRatio = calculateThermalBiddingSpaceChangeRatio(currentValue, compareValue);
    if (changeRatio === null) {
      return "-";
    }
    return (changeRatio > 0 ? "+" : "") + (changeRatio * 100).toFixed(2) + "%";
  }

  function createThermalBiddingSpaceChangeCell(currentValue, compareValue) {
    var changeRatio = calculateThermalBiddingSpaceChangeRatio(currentValue, compareValue);
    if (changeRatio === null) {
      return {
        text: "-",
        className: "table-number-cell",
        sortValue: Number.NEGATIVE_INFINITY,
        copyable: false,
      };
    }

    return {
      text: (changeRatio > 0 ? "+" : "") + (changeRatio * 100).toFixed(2) + "%",
      className: ["table-number-cell", changeRatio > 0 ? "table-positive" : changeRatio < 0 ? "table-negative" : ""].filter(Boolean).join(" "),
      sortValue: changeRatio,
    };
  }

  function buildSingleMetricRowsByTime(rows) {
    var rowsByTime = {};
    (rows || []).forEach(function eachRow(row) {
      if (!row || !row.time) {
        return;
      }
      rowsByTime[row.time] = row;
    });
    return rowsByTime;
  }

  function formatThermalBiddingSpaceTooltipValue(value, unit) {
    return isSingleMetricNumericValue(value) ? formatSingleMetricPowerValue(value) + " " + unit : "-";
  }

  function buildThermalBiddingSpaceTooltip(metricConfig, rows, compareRowsByTime, index) {
    var row = rows[index] || {};
    var unit = (metricConfig && metricConfig.unit) || "MW";
    var compareRow = compareRowsByTime && row.time ? compareRowsByTime[row.time] : null;
    var compareDate = (compareRow && compareRow.date) || (state.ui.compareRangeDraft && state.ui.compareRangeDraft.start) || "";
    var lines = [
      "日期时间：" + [row.date, row.time].filter(Boolean).join(" "),
      "日前火电竞价空间：" + formatThermalBiddingSpaceTooltipValue(row.dayAheadThermalBiddingSpace, unit),
      "实时火电竞价空间：" + formatThermalBiddingSpaceTooltipValue(row.realTimeThermalBiddingSpace, unit),
    ];

    if (state.ui.hasCompare) {
      lines.push("对比日：" + [compareDate, row.time].filter(Boolean).join(" "));
      lines.push("对比日前火电竞价空间：" + formatThermalBiddingSpaceTooltipValue(compareRow && compareRow.dayAheadThermalBiddingSpace, unit));
      lines.push("对比实时火电竞价空间：" + formatThermalBiddingSpaceTooltipValue(compareRow && compareRow.realTimeThermalBiddingSpace, unit));
      lines.push("日前变化幅度：" + formatThermalBiddingSpaceChangeText(row.dayAheadThermalBiddingSpace, compareRow && compareRow.dayAheadThermalBiddingSpace));
      lines.push("实时变化幅度：" + formatThermalBiddingSpaceChangeText(row.realTimeThermalBiddingSpace, compareRow && compareRow.realTimeThermalBiddingSpace));
    }

    return lines.join("\n");
  }

  function renderThermalBiddingSpaceMetricContent(pageData, selectedItem, metricConfig) {
    var rows = filterInfoDisclosurePageRows(metricConfig.rows || [], pageData);
    var hasCurrentValues = rows.some(function someRow(row) {
      return isSingleMetricNumericValue(row.dayAheadThermalBiddingSpace) || isSingleMetricNumericValue(row.realTimeThermalBiddingSpace);
    });

    if (!rows.length || !hasCurrentValues) {
      return (
        '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain chart-main-empty">' +
        renderEmptyState({
          message: metricConfig.emptyText || "当前日期缺少竞价空间计算所需数据。",
          escapeHtml: escapeHtml,
          renderIcon: renderIcon,
        }) +
        "</div></section>"
      );
    }

    var labels = rows.map(function mapRow(row) {
      return buildInfoDisclosureRowLabel(row, pageData);
    });
    var chartId = "info-single-metric-chart-" + getSelectedTradeCenterKey() + "-" + selectedItem.id;
    var tableId = "info-single-metric-table-" + getSelectedTradeCenterKey() + "-" + selectedItem.id;
    var compareRows = state.ui.hasCompare ? filterInfoDisclosurePageRows(metricConfig.rows || [], pageData, state.ui.compareRangeDraft) : [];
    var compareRowsByTime = buildSingleMetricRowsByTime(compareRows);
    var chartSeries = [
      {
        id: chartId + "-dayahead-thermal-bidding-space",
        label: "日前火电竞价空间",
        color: "#F56C42",
        values: rows.map(function mapRow(row) {
          return row.dayAheadThermalBiddingSpace;
        }),
      },
      {
        id: chartId + "-realtime-thermal-bidding-space",
        label: "实时火电竞价空间",
        color: "#2FCB8F",
        values: rows.map(function mapRow(row) {
          return row.realTimeThermalBiddingSpace;
        }),
      },
    ];

    if (state.ui.hasCompare) {
      chartSeries.push({
        id: chartId + "-dayahead-thermal-bidding-space-compare",
        label: "对比日前火电竞价空间",
        color: "#8C6A4A",
        dasharray: "6 4",
        values: rows.map(function mapRow(row) {
          var compareRow = compareRowsByTime[row.time] || null;
          return compareRow ? compareRow.dayAheadThermalBiddingSpace : null;
        }),
      });
      chartSeries.push({
        id: chartId + "-realtime-thermal-bidding-space-compare",
        label: "对比实时火电竞价空间",
        color: "#5E6C84",
        dasharray: "6 4",
        values: rows.map(function mapRow(row) {
          var compareRow = compareRowsByTime[row.time] || null;
          return compareRow ? compareRow.realTimeThermalBiddingSpace : null;
        }),
      });
    }

    var tableColumns = (metricConfig.tableColumns || []).map(function mapColumn(column) {
      return {
        key: column.key,
        label: column.title,
      };
    });
    if (state.ui.hasCompare) {
      tableColumns = tableColumns.concat([
        {
          key: "compareDayAheadThermalBiddingSpace",
          label: formatTradeDisclosureDate(state.ui.compareRangeDraft.start) + " 火电竞价空间（日前）（MW）",
        },
        {
          key: "compareRealTimeThermalBiddingSpace",
          label: formatTradeDisclosureDate(state.ui.compareRangeDraft.start) + " 火电竞价空间（实时）（MW）",
        },
        { key: "dayAheadThermalBiddingSpaceChange", label: "日前变化幅度" },
        { key: "realTimeThermalBiddingSpaceChange", label: "实时变化幅度" },
      ]);
    }

    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
      renderChartWithMarks({
        chartId: chartId,
        title: "火电竞价空间趋势图",
        labels: labels,
        unit: metricConfig.unit || pageData.chartUnit || "MW",
        series: chartSeries,
        inactiveSeriesIds: chartSeries
          .filter(function filterInactiveSeries(series) {
            return !series.values.some(isSingleMetricNumericValue);
          })
          .map(function mapInactiveSeries(series) {
            return series.id;
          }),
        hiddenSeries: getChartHiddenState(chartId),
        tooltipFormatter: function tooltipFormatter(_, index) {
          return buildThermalBiddingSpaceTooltip(metricConfig, rows, compareRowsByTime, index);
        },
        valueFormatter: formatSingleMetricPowerValue,
        breakOnNull: true,
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
        xLabelEvery: getDisclosureLabelEvery(labels.length),
      }) +
      renderDataTablePro({
        tableId: tableId,
        columns: tableColumns,
        rows: rows.map(function mapRow(row) {
          var compareRow = compareRowsByTime[row.time] || null;
          var result = {};
          (metricConfig.tableColumns || []).forEach(function eachColumn(column) {
            if (!column || column.key === "time") {
              return;
            }
            result[column.key] = createThermalBiddingSpaceNumberCell(row[column.key]);
          });
          result.time = row.time;
          if (state.ui.hasCompare) {
            result.compareDayAheadThermalBiddingSpace = createThermalBiddingSpaceNumberCell(compareRow && compareRow.dayAheadThermalBiddingSpace);
            result.compareRealTimeThermalBiddingSpace = createThermalBiddingSpaceNumberCell(compareRow && compareRow.realTimeThermalBiddingSpace);
            result.dayAheadThermalBiddingSpaceChange = createThermalBiddingSpaceChangeCell(row.dayAheadThermalBiddingSpace, compareRow && compareRow.dayAheadThermalBiddingSpace);
            result.realTimeThermalBiddingSpaceChange = createThermalBiddingSpaceChangeCell(row.realTimeThermalBiddingSpace, compareRow && compareRow.realTimeThermalBiddingSpace);
          }
          return result;
        }),
        minWidth: state.ui.hasCompare ? 3200 : Math.max((pageData && pageData.tableMinWidth) || 900, 2300),
        sortState: getTableSortState(tableId),
        enableColumnDrag: true,
        columnOrder: getTableColumnOrder(tableId),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></section>"
    );
  }

  function buildSingleMetricLoadTooltip(metricConfig, rows, index) {
    var row = rows[index] || {};
    var forecastValue = row.forecastValue;
    var actualValue = row.actualValue;
    var unit = (metricConfig && metricConfig.unit) || "MW";
    return [
      "日期时间：" + [row.date, row.time].filter(Boolean).join(" "),
      "当前指标名称：" + ((metricConfig && metricConfig.metricName) || "--"),
      "当日预测：" + (typeof forecastValue === "number" ? formatInteger(forecastValue) + " " + unit : "--"),
      "当日实际：" + (typeof actualValue === "number" ? formatInteger(actualValue) + " " + unit : "--"),
      typeof forecastValue === "number" && typeof actualValue === "number"
        ? "差值：" + formatSignedNumber(actualValue - forecastValue) + " " + unit
        : "差值：--",
    ].join("\n");
  }

  function renderSingleMetricLoadLoading(metricName) {
    return (
      '<div class="single-metric-load-loading">' +
      '<div class="single-metric-load-heading">' +
      escapeHtml(metricName ? metricName + "趋势图" : "指标趋势图") +
      "</div>" +
      '<div class="single-metric-load-skeleton single-metric-load-skeleton-chart"></div>' +
      '<div class="single-metric-load-skeleton single-metric-load-skeleton-table"></div>' +
      "</div>"
    );
  }

  function renderInfoDisclosureSingleMetricLoadContent(pageData) {
    var selectedItem = getSingleMetricLoadSelectedItem(pageData);
    var useLoadInfoTreeNav =
      getActiveInfoPrimaryTab() === "负荷信息";
    var sidebarHtml = renderSingleMetricLoadSidebar((pageData && pageData.sidebarGroups) || [], selectedItem && selectedItem.id, {
      useLoadInfoTreeNav: useLoadInfoTreeNav,
    });
    var metricConfig = selectedItem && pageData && pageData.metrics ? pageData.metrics[selectedItem.id] : null;

    if (!metricConfig) {
      return renderInfoEmptyWithSidebar(sidebarHtml, (pageData && pageData.emptyText) || INFO_DISCLOSURE_EMPTY_MESSAGE);
    }

    var isThermalMetric = isThermalBiddingSpaceMetric(metricConfig);

    if (state.ui.singleMetricLoadLoading) {
      if (isThermalMetric) {
        return (
          '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain chart-main-loading">' +
          renderSingleMetricLoadLoading(metricConfig.metricName || metricConfig.title || "") +
          "</div></section>"
        );
      }
      return (
        '<section class="panel chart-panel"><div class="chart-layout">' +
        sidebarHtml +
        '<div class="chart-main chart-main-loading">' +
        renderSingleMetricLoadLoading(metricConfig.metricName || metricConfig.title || "") +
        "</div></div></section>"
      );
    }

    if (isThermalMetric) {
      return renderThermalBiddingSpaceMetricContent(pageData, selectedItem, metricConfig);
    }

    var rows = filterInfoDisclosurePageRows(metricConfig.rows || [], pageData);
    if (!rows.length) {
      return renderInfoEmptyWithSidebar(sidebarHtml, (pageData && pageData.emptyText) || INFO_DISCLOSURE_EMPTY_MESSAGE);
    }

    var labels = rows.map(function mapRow(row) {
      return buildInfoDisclosureRowLabel(row, pageData);
    });
    var chartId = "info-single-metric-chart-" + getSelectedTradeCenterKey() + "-" + selectedItem.id;
    var tableId = "info-single-metric-table-" + getSelectedTradeCenterKey() + "-" + selectedItem.id;
    var hasForecastValues = rows.some(function someRow(row) {
      return typeof row.forecastValue === "number";
    });
    var hasActualValues = rows.some(function someRow(row) {
      return typeof row.actualValue === "number";
    });
    var chartSeries = [
      {
        id: chartId + "-forecast",
        label: "当日预测",
        color: hasForecastValues ? "#1677FF" : "#C5CEDA",
        dasharray: "6 4",
        values: rows.map(function mapRow(row) {
          return row.forecastValue;
        }),
      },
      {
        id: chartId + "-actual",
        label: "当日实际",
        color: hasActualValues ? "#2FCB8F" : "#C5CEDA",
        values: rows.map(function mapRow(row) {
          return row.actualValue;
        }),
      },
    ];

    return (
      '<section class="panel chart-panel"><div class="chart-layout">' +
      sidebarHtml +
      '<div class="chart-main">' +
      renderChartWithMarks({
        chartId: chartId,
        title: (metricConfig.metricName || metricConfig.title || "指标") + "趋势图",
        labels: labels,
        unit: metricConfig.unit || pageData.chartUnit || "MW",
        series: chartSeries,
        inactiveSeriesIds: chartSeries
          .filter(function filterInactiveSeries(series) {
            return !series.values.some(function someValue(value) {
              return typeof value === "number";
            });
          })
          .map(function mapInactiveSeries(series) {
            return series.id;
          }),
        hiddenSeries: getChartHiddenState(chartId),
        tooltipFormatter: function tooltipFormatter(_, index) {
          return buildSingleMetricLoadTooltip(metricConfig, rows, index);
        },
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
        xLabelEvery: getDisclosureLabelEvery(labels.length),
      }) +
      renderDataTablePro({
        tableId: tableId,
        columns: [
          { key: "time", label: "时刻" },
          { key: "forecastValue", label: "当日预测（MW）" },
          { key: "actualValue", label: "当日实际（MW）" },
          { key: "diffValue", label: "差值（MW）" },
        ],
        rows: rows.map(function mapRow(row) {
          return {
            time: row.time,
            forecastValue: createSingleMetricLoadNumberCell(row.forecastValue, false),
            actualValue: createSingleMetricLoadNumberCell(row.actualValue, false),
            diffValue: createSingleMetricLoadNumberCell(row.diffValue, true),
          };
        }),
        minWidth: (pageData && pageData.tableMinWidth) || 900,
        sortState: getTableSortState(tableId),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></div></section>"
    );
  }

  function filterInfoDisclosurePageRows(rows, pageData, range) {
    var filteredRows = filterInfoDisclosureRowsByRange(rows, pageData, range);

    if (isDayAheadDeclarationTab()) {
      return filteredRows;
    }

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
    var activeRange = getInfoDisclosureActiveRange(pageData);
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

  function formatCompactDateLabel(dateText) {
    return String(dateText || "").replace(/-/g, "");
  }

  function getInfoDisclosureRowDate(row) {
    return (row && (row.date || row.runDate || row.planDate || row.operationDate)) || "";
  }

  function filterInfoDisclosureRowsByRange(rows, pageData, range) {
    var activeRange = getInfoDisclosureActiveRange(pageData, range);
    var filteredRows = (rows || []).slice();

    if (!isRangeValid(activeRange)) {
      return filteredRows;
    }

    return filteredRows.filter(function filterRow(row) {
      var rowDate = getInfoDisclosureRowDate(row);
      return !rowDate || (rowDate >= activeRange.start && rowDate <= activeRange.end);
    });
  }

  function buildDisclosureCompareMergeKey(row, keyFields) {
    return (keyFields || []).map(function mapKey(key) {
      return String((row && row[key]) || "");
    }).join("\u0001");
  }

  function indexDisclosureRowsByMergeKey(rows, keyFields) {
    var indexedRows = {};
    (rows || []).forEach(function eachRow(row) {
      var key = buildDisclosureCompareMergeKey(row, keyFields);
      if (!key || indexedRows[key]) {
        return;
      }
      indexedRows[key] = row;
    });
    return indexedRows;
  }

  function buildDateMergedDisclosureTableData(tableData, pageData) {
    var sourceRows = tableData.rows || pageData.rows || pageData.tableData || [];
    var currentRows = filterInfoDisclosureRowsByRange(sourceRows, pageData);
    var compareRows = state.ui.hasCompare
      ? filterInfoDisclosureRowsByRange(sourceRows, pageData, state.ui.compareRangeDraft)
      : [];
    var keyFields = tableData.compareMergeKeys || pageData.compareMergeKeys || ["plantName", "equipmentName", "voltageLevel"];
    var currentRowsByKey = indexDisclosureRowsByMergeKey(currentRows, keyFields);
    var compareRowsByKey = indexDisclosureRowsByMergeKey(compareRows, keyFields);
    var mergedKeys = Object.keys(currentRowsByKey);

    if (state.ui.hasCompare) {
      Object.keys(compareRowsByKey).forEach(function eachCompareKey(key) {
        if (mergedKeys.indexOf(key) < 0) {
          mergedKeys.push(key);
        }
      });
    }

    mergedKeys.sort(function sortMergedRows(leftKey, rightKey) {
      var leftRow = currentRowsByKey[leftKey] || compareRowsByKey[leftKey] || {};
      var rightRow = currentRowsByKey[rightKey] || compareRowsByKey[rightKey] || {};
      return (
        String(leftRow.plantName || "").localeCompare(String(rightRow.plantName || ""), "zh-Hans-CN") ||
        String(leftRow.equipmentName || "").localeCompare(String(rightRow.equipmentName || ""), "zh-Hans-CN") ||
        String(leftRow.voltageLevel || "").localeCompare(String(rightRow.voltageLevel || ""), "zh-Hans-CN")
      );
    });

    var currentRange = getInfoDisclosureActiveRange(pageData);
    var currentDateLabel = formatCompactDateLabel(currentRange.start);
    var columns = [
      { key: "plantName", title: "电厂名称" },
      { key: "equipmentName", title: "发输变电设备" },
      { key: "voltageLevel", title: "电压等级" },
      { key: "currentStartTime", title: "开始时间" },
      { key: "currentEndTime", title: "结束时间" },
    ];
    if (state.ui.hasCompare) {
      var compareDateLabel = formatCompactDateLabel(state.ui.compareRangeDraft.start);
      columns = [
        { key: "plantName", title: "电厂名称" },
        { key: "equipmentName", title: "发输变电设备" },
        { key: "voltageLevel", title: "电压等级" },
        { key: "currentStartTime", title: currentDateLabel + " 检修开始时间" },
        { key: "compareStartTime", title: compareDateLabel + " 检修开始时间" },
        { key: "currentEndTime", title: currentDateLabel + " 检修结束时间" },
        { key: "compareEndTime", title: compareDateLabel + " 检修结束时间" },
      ];
    }

    return {
      columns: columns,
      rows: mergedKeys.map(function mapMergedRow(key) {
        var currentRow = currentRowsByKey[key] || {};
        var compareRow = compareRowsByKey[key] || {};
        var baseRow = currentRowsByKey[key] || compareRowsByKey[key] || {};
        return {
          plantName: baseRow.plantName || "",
          equipmentName: baseRow.equipmentName || baseRow.unitName || "",
          voltageLevel: baseRow.voltageLevel || "",
          currentStartTime: currentRow.startTime || "",
          compareStartTime: compareRow.startTime || "",
          currentEndTime: currentRow.endTime || "",
          compareEndTime: compareRow.endTime || "",
        };
      }),
      minWidth: state.ui.hasCompare ? tableData.minWidth || pageData.tableMinWidth || 1420 : tableData.baseMinWidth || pageData.baseTableMinWidth || 1040,
    };
  }

  function buildInfoDisclosureTableConfig(columns, rows, minWidth, options) {
    var resolvedColumns = columns || [];
    var resolvedOptions = options || {};
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
          var value = row[column.key];
          result[column.key] =
            resolvedOptions.emptyAsBlank && (value === null || value === undefined || value === "")
              ? { text: "", copyable: false, sortValue: "" }
              : formatInfoDisclosureTableValue(column, value);
        });
        return result;
      }),
      minWidth: minWidth || Math.max(920, resolvedColumns.length * 118),
    };
  }

  function renderInfoDisclosureDataTablePanel(title, tableId, tableConfig, options) {
    var resolvedOptions = options || {};
    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
      (title ? '<div class="overview-section-title">' + escapeHtml(title) + "</div>" : "") +
      renderDataTablePro({
        tableId: tableId,
        columns: tableConfig.columns,
        rows: tableConfig.rows,
        minWidth: tableConfig.minWidth,
        enableColumnDrag: Boolean(resolvedOptions.enableColumnDrag),
        columnOrder: resolvedOptions.enableColumnDrag ? getTableColumnOrder(tableId) : [],
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
    var selectedNode = state.tradeResult.selectedNode;

    if (options.indexOf(selectedNode) >= 0) {
      return selectedNode;
    }

    if (options.indexOf(state.info.selectedMetric) >= 0) {
      state.tradeResult.selectedNode = state.info.selectedMetric;
      return state.info.selectedMetric;
    }

    state.tradeResult.selectedNode = pageData.defaultNode || options[0] || "";
    return state.tradeResult.selectedNode;
  }

  function buildInfoDisclosureSeries(rows, seriesDefinitions) {
    return (seriesDefinitions || []).map(function mapSeries(series) {
      return {
        id: series.id,
        label: series.label,
        color: series.color,
        dasharray: series.dasharray || "",
        opacity: series.opacity,
        role: series.role || "",
        groupId: series.groupId || "",
        type: series.type || "",
        values: rows.map(function mapRow(row) {
          return row[series.valueKey];
        }),
      };
    });
  }

  function getInfoDisclosureMetricColumns(columns) {
    return (columns || []).filter(function filterColumn(column) {
      return column && column.key !== "time";
    });
  }

  function getInfoDisclosureMetricFormatter(metricKey) {
    return metricKey === "dayAheadVolume" || metricKey === "realTimeVolume" ? formatInteger : formatDecimal;
  }

  function getInfoDisclosureMetricLabel(column) {
    return String((column && (column.title || column.label)) || "")
      .replace(/（[^）]*）$/, "")
      .trim();
  }

  function getInfoDisclosureScopedMetricKey(scope, metricKey) {
    return scope + metricKey.charAt(0).toUpperCase() + metricKey.slice(1);
  }

  function getInfoDisclosureCompareSeriesId(series) {
    var idsByKey = {
      dayAheadVolume: "info-trade-dayahead-volume-compare",
      realTimeVolume: "info-trade-realtime-volume-compare",
      dayAheadSettlementPrice: "info-trade-dayahead-price-compare",
      realTimeSettlementPrice: "info-trade-realtime-price-compare",
    };
    return idsByKey[series.valueKey] || series.id + "-compare";
  }

  function getInfoDisclosureCompareSeriesColor(series) {
    var colorsByKey = {
      dayAheadVolume: "#D6E6FF",
      realTimeVolume: "#B8DBFF",
      dayAheadSettlementPrice: "#FFC39E",
      realTimeSettlementPrice: "#A7E7CC",
    };
    return colorsByKey[series.valueKey] || series.color;
  }

  function getInfoDisclosureCompareSeriesOpacity(series) {
    var opacityByKey = {
      dayAheadVolume: 0.55,
      realTimeVolume: 0.45,
    };
    return opacityByKey[series.valueKey] || series.opacity;
  }

  function buildInfoDisclosureCompareSeries(rows, seriesDefinitions) {
    return (seriesDefinitions || []).map(function mapSeries(series) {
      return {
        id: getInfoDisclosureCompareSeriesId(series),
        label: "对比" + series.label,
        color: getInfoDisclosureCompareSeriesColor(series),
        values: (rows || []).map(function mapRow(row) {
          return row[series.valueKey];
        }),
        opacity: getInfoDisclosureCompareSeriesOpacity(series),
      };
    });
  }

  function buildInfoDisclosureCompareTableColumns(columns, currentDateLabel, compareDateLabel) {
    var metricColumns = getInfoDisclosureMetricColumns(columns);
    return [{ key: "time", label: "时刻" }]
      .concat(
        metricColumns.map(function mapColumn(column) {
          return {
            key: getInfoDisclosureScopedMetricKey("current", column.key),
            label: currentDateLabel + " " + column.title,
          };
        }),
      )
      .concat(
        metricColumns.map(function mapColumn(column) {
          return {
            key: getInfoDisclosureScopedMetricKey("compare", column.key),
            label: compareDateLabel + " " + column.title,
          };
        }),
      );
  }

  function buildInfoDisclosureCompareTableRows(rows, compareRows, columns) {
    var metricColumns = getInfoDisclosureMetricColumns(columns);
    return rows.map(function mapRow(row, index) {
      var compareRow = compareRows[index] || {};
      var result = {
        time: row.time,
      };

      metricColumns.forEach(function eachColumn(column) {
        result[getInfoDisclosureScopedMetricKey("current", column.key)] = createInfoDisclosureTableCell(
          row[column.key],
          getInfoDisclosureMetricFormatter(column.key),
        );
        result[getInfoDisclosureScopedMetricKey("compare", column.key)] = createInfoDisclosureTableCell(
          compareRow[column.key],
          getInfoDisclosureMetricFormatter(column.key),
        );
      });

      return result;
    });
  }

  function buildInfoDisclosureTradeTooltipLines(row, columns, prefix) {
    return getInfoDisclosureMetricColumns(columns).map(function mapColumn(column) {
      var value = row[column.key];
      var formatter = getInfoDisclosureMetricFormatter(column.key);
      return (
        (prefix || "") +
        getInfoDisclosureMetricLabel(column) +
        " " +
        (typeof value === "number" ? formatter(value) : "--")
      );
    });
  }

  function createInfoDisclosureTableCell(value, formatter, emptyText) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return {
        text: emptyText || "-",
        copyable: false,
        sortValue: null,
      };
    }

    return {
      text: formatter(value),
      sortValue: value,
    };
  }

  function createInfoDisclosureSpreadCell(dayAheadValue, realTimeValue) {
    var spread = calculateTradeSpread(dayAheadValue, realTimeValue);
    var cell = createInfoDisclosureTableCell(spread, formatDecimal);

    if (typeof spread === "number" && spread < 0) {
      cell.className = "table-negative";
    }

    return cell;
  }

  function isPageBackedUnifiedTradeTab(pageData, tabName) {
    var activeTab = tabName || getActiveInfoPrimaryTab();
    return Boolean(
      (activeTab === "全省统一出清价" || activeTab === "交易结果") &&
      !isGuangdongInfoDisclosureCenter() &&
      pageData &&
      (pageData.isUnifiedClearingPrice === true || pageData.isUnifiedTradingResult === true)
    );
  }

  function isPageBackedUnifiedClearingPrice(pageData, tabName) {
    var activeTab = tabName || getActiveInfoPrimaryTab();
    return Boolean(activeTab === "全省统一出清价" && isPageBackedUnifiedTradeTab(pageData, activeTab));
  }

  function getInfoClearingPriceValue(row, pageData, side) {
    var config = getUnifiedClearingPriceConfig();
    var configuredKey =
      side === "dayAhead"
        ? (pageData && pageData.dayAheadValueKey) || config.dayAheadValueKey
        : (pageData && pageData.realTimeValueKey) || config.realTimeValueKey;
    var fallbackKeys =
      side === "dayAhead"
        ? ["dayAheadPrice", "dayAheadNodePrice", "dayAheadSettlementPrice"]
        : ["realTimePrice", "realTimeNodePrice", "realTimeSettlementPrice"];
    var keys = configuredKey ? [configuredKey].concat(fallbackKeys) : fallbackKeys;

    for (var index = 0; index < keys.length; index += 1) {
      var value = row && row[keys[index]];
      if (typeof value === "number" && !Number.isNaN(value)) {
        return value;
      }
    }

    return null;
  }

  function getInfoClearingDayAheadLabel(pageData) {
    var config = getUnifiedClearingPriceConfig();
    return (pageData && (pageData.dayAheadSeriesLabel || pageData.dayAheadLabel)) || config.dayAheadLabel || "日前价格";
  }

  function getInfoClearingRealTimeLabel(pageData) {
    var config = getUnifiedClearingPriceConfig();
    return (pageData && (pageData.realTimeSeriesLabel || pageData.realTimeLabel)) || config.realTimeLabel || "实时价格";
  }

  function getInfoClearingTimeLabel(row) {
    return (row && (row.timeSlot || row.time || row.period)) || "";
  }

  function getInfoClearingCompareRows(pageData) {
    if (!state.ui.hasCompare) {
      return [];
    }

    if (isPageBackedUnifiedClearingPrice(pageData, "全省统一出清价")) {
      return filterInfoDisclosurePageRows(pageData.tableData || [], pageData, state.ui.compareRangeDraft);
    }

    return getTradeResultCompareRowsByTab("全省统一出清价");
  }

  function getPageDataDefaultDate(pageData) {
    return (
      (pageData && pageData.filters && pageData.filters.date) ||
      (pageData && pageData.date) ||
      getTradeCenterDefaultDisclosureDate(getSelectedTradeCenterKey()) ||
      ""
    );
  }

  function syncPageBackedClearingPriceRunDate(pageData) {
    if (!isPageBackedUnifiedClearingPrice(pageData, "全省统一出清价")) {
      return;
    }

    var defaultDate = getPageDataDefaultDate(pageData);
    if (!defaultDate || state.ui.hasCompare) {
      return;
    }

    if (state.tradeResult.filters.marketRunRange.start === getInfoTradeMockDate("全省统一出清价")) {
      state.tradeResult.filters.marketRunRange = {
        start: defaultDate,
        end: defaultDate,
      };
    }
  }

  function getMarketNodeItemId(item) {
    return String((item && (item.id || item.label)) || "");
  }

  function getMarketNodeItemLabel(item) {
    return String((item && (item.label || item.id)) || "");
  }

  function getMarketNodeDisplayLabel(label) {
    var text = String(label || "");
    var dividerIndex = text.indexOf("/");

    if (dividerIndex > 0) {
      return text.slice(0, dividerIndex);
    }

    return text;
  }

  function renderMarketNodeIcon() {
    return (
      '<svg class="node-price-node-icon" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
      '<path d="M1.4 4.5h3.4l1 1h6.8v6.2H1.4V4.5Z" stroke="currentColor" stroke-width="1.05" />' +
      '<path d="M1.4 4.5V2.6h3.3l1 1h6.9v1.9" stroke="currentColor" stroke-width="1.05" />' +
      "</svg>"
    );
  }

  function renderMarketNodeItem(item, selectedNode, options) {
    var resolvedOptions = options || {};
    var itemId = getMarketNodeItemId(item);
    var itemLabel = getMarketNodeItemLabel(item);
    var itemDisplayLabel = getMarketNodeDisplayLabel(itemLabel);
    var isActive = itemId === selectedNode;
    var classNames = ["market-node-item", "node-price-tree-item"];

    if (resolvedOptions.variant) {
      classNames.push("market-node-item-" + resolvedOptions.variant);
    }
    if (isActive) {
      classNames.push("active");
      classNames.push("node-price-tree-item--active");
    }

    return (
      '<button type="button" class="' +
      classNames.join(" ") +
      '" data-trade-node="' +
      escapeHtml(itemId) +
      '" aria-label="' +
      escapeHtml(itemLabel) +
      '" title="' +
      escapeHtml(itemLabel) +
      '"' +
      (isActive ? ' aria-current="true" aria-pressed="true"' : ' aria-pressed="false"') +
      ' role="treeitem">' +
      renderMarketNodeIcon() +
      '<span class="node-price-tree-text">' +
      escapeHtml(itemDisplayLabel) +
      "</span>" +
      "</button>"
    );
  }

  function renderMarketNodeSearch(keyword) {
    return (
      '<label class="node-price-search" aria-label="检索关键字">' +
      '<input type="text" value="' +
      escapeHtml(keyword || "") +
      '" placeholder="检索关键字" data-filter-scope="tradeResult" data-filter-key="nodeKeyword" />' +
      '<span class="node-price-search-icon" aria-hidden="true">' +
      renderIcon("search", "node-price-search-icon-svg") +
      "</span></label>"
    );
  }

  function renderMarketNodeSidebar(config) {
    var resolvedConfig = config || {};
    var provinceItems = resolvedConfig.provinceItems || [];
    var otherItems = resolvedConfig.otherItems || [];
    var selectedNode = resolvedConfig.selectedNode || "";
    var keyword = String(resolvedConfig.keyword || "").trim();
    var provinceHtml = provinceItems
      .map(function mapProvince(item) {
        return renderMarketNodeItem(item, selectedNode, { variant: "special" });
      })
      .join("");
    var otherEmptyText = keyword ? "暂无匹配节点" : "暂无其他节点";
    var hasVisibleItems = provinceItems.length || otherItems.length;
    var otherHtml = otherItems.length
      ? otherItems
          .map(function mapNode(item) {
            return renderMarketNodeItem(item, selectedNode);
          })
          .join("")
      : hasVisibleItems
        ? ""
        : '<div class="placeholder-note trade-node-empty">' + escapeHtml(otherEmptyText) + "</div>";

    return (
      '<aside class="market-node-sidebar node-price-sidebar" aria-label="节点列表">' +
      renderMarketNodeSearch(keyword) +
      '<div class="market-node-list node-price-tree" role="tree">' +
      provinceHtml +
      otherHtml +
      "</div></aside>"
    );
  }

  function buildInfoTradeNodeSidebar(pageData, selectedNode) {
    var keyword = String(state.tradeResult.filters.nodeKeyword || "").trim().toLowerCase();
    var groups = pageData.sidebarGroups || [];
    var provinceItems = [];
    var otherItems = [];

    groups.forEach(function eachGroup(group) {
      (group.items || []).forEach(function eachItem(item) {
        if (!item || !item.id || item.id === "节点1" || item.id === "节点2" || item.id === "节点3") {
          return;
        }
        if (item.id === "全省" || group.label === "全省") {
          if (
            (!keyword || "全省".indexOf(keyword) >= 0) &&
            !provinceItems.some(function hasProvince(provinceItem) { return provinceItem.id === "全省"; })
          ) {
            provinceItems.push({ id: "全省", label: "全省" });
          }
          return;
        }
        if (!keyword || String(item.label || item.id).toLowerCase().indexOf(keyword) >= 0) {
          otherItems.push(item);
        }
      });
    });

    if (!provinceItems.length && (!keyword || "全省".indexOf(keyword) >= 0)) {
      provinceItems.push({ id: "全省", label: "全省" });
    }

    return renderMarketNodeSidebar({
      selectedNode: selectedNode,
      provinceItems: provinceItems,
      otherItems: otherItems,
      keyword: keyword,
    });
  }

  function renderSingleMetricLoadFilterBar() {
    return "";
  }

  function renderUnifiedInfoDisclosureFilterBar(pageData) {
    if (isDayAheadDeclarationTab()) {
      return "";
    }

    if (isScopedLoadInfoTab() && isSingleMetricLoadPage(pageData)) {
      return renderSingleMetricLoadFilterBar();
    }

    if (pageData && pageData.viewType === "nodePrice") {
      return "";
    }

    var filterFieldsHtml = renderUnifiedInfoDisclosureBusinessFilterFields(pageData);

    return renderInfoFilterPanel(
      filterFieldsHtml,
      filterFieldsHtml
        ? renderUiActionButton("重置", "ghost", "reset-info-disclosure-filters") +
          renderUiActionButton("查询", "primary", "query-info-disclosure-filters")
        : ""
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
      rowClassNames.push("load-info-tree-nav__item");
      rowClassNames.push(childNodes.length ? "load-info-tree-nav__item--parent" : "load-info-tree-nav__item--leaf");
      if (level > 0) {
        rowClassNames.push("load-info-tree-nav__item--child");
      }
      if (isChecked || isIndeterminate) {
        rowClassNames.push("load-info-tree-nav__item--active");
      }
      var iconHtml = childNodes.length
        ? '<span class="load-info-tree-nav__toggle is-open" aria-hidden="true"></span>'
        : '<span class="load-info-tree-nav__leaf-icon" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><rect x="1.5" y="2.5" width="13" height="11"></rect><polyline points="3.5,10.5 6.2,8.3 8.4,9.2 12.5,5.8"></polyline></svg></span>';

      return (
        '<div class="load-info-tree-nav__node metric-node level-' +
        level +
        '">' +
        '<button class="' +
        rowClassNames.join(" ") +
        '" ' +
        (childNodes.length
          ? 'data-info-tree-group="' + escapeHtml(seriesIds.join(",")) + '"'
          : 'data-info-tree-series="' + escapeHtml(node.seriesId) + '"') +
        ">" +
        iconHtml +
        '<span class="load-info-tree-nav__text metric-text">' +
        escapeHtml(node.label) +
        "</span></button>" +
        childNodes.map(function mapChild(child) {
          return renderNode(child, level + 1);
        }).join("") +
        "</div>"
      );
    }

    return (
      '<aside class="chart-tree single-metric-tree load-info-tree-nav">' +
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
    var sidebarHtml = buildInfoTradeNodeSidebar(pageData, selectedNode);
    var nodeData = pageData.nodeSeries && pageData.nodeSeries[selectedNode];
    var rows = filterInfoDisclosurePageRows((nodeData && nodeData.rows) || [], pageData);
    var dayAheadLabel = pageData.dayAheadSeriesLabel || "日前节点电价";
    var realTimeLabel = pageData.realTimeSeriesLabel || "实时节点电价";

    if (!nodeData || !rows.length) {
      return renderInfoEmptyWithSidebar(sidebarHtml, pageData.emptyText || INFO_DISCLOSURE_EMPTY_MESSAGE, "chart-layout-node");
    }

    function getNodeDayAheadPrice(row) {
      return typeof row.dayAheadNodePrice === "number" ? row.dayAheadNodePrice : row.dayAheadPrice;
    }

    function getNodeRealTimePrice(row) {
      return typeof row.realTimeNodePrice === "number" ? row.realTimeNodePrice : row.realTimePrice;
    }

    var tableRows = rows.map(function mapRow(row) {
      var dayAheadPrice = getNodeDayAheadPrice(row);
      var realTimePrice = getNodeRealTimePrice(row);
      return {
        time: row.time,
        dayAheadNodePrice: createInfoDisclosureTableCell(dayAheadPrice, formatDecimal),
        realTimeNodePrice: createInfoDisclosureTableCell(realTimePrice, formatDecimal),
        spread: createInfoDisclosureSpreadCell(dayAheadPrice, realTimePrice),
      };
    });

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
          { id: "info-node-dayahead", label: dayAheadLabel, color: "#1677FF", values: rows.map(function mapRow(row) { return getNodeDayAheadPrice(row); }) },
          { id: "info-node-realtime", label: realTimeLabel, color: "#2FCB8F", values: rows.map(function mapRow(row) { return getNodeRealTimePrice(row); }) },
        ],
        hiddenSeries: getChartHiddenState("info-unified-node-chart-" + getSelectedTradeCenterKey() + "-" + selectedNode),
        tooltipFormatter: function nodeTooltip(_, index) {
          var row = rows[index] || {};
          var dayAheadPrice = getNodeDayAheadPrice(row);
          var realTimePrice = getNodeRealTimePrice(row);
          return [
            row.date ? "日期 " + row.date : "",
            row.time ? "时刻 " + row.time : "",
            "节点名称 " + (row.nodeName || selectedNode),
            dayAheadLabel + " " + (typeof dayAheadPrice === "number" ? formatDecimal(dayAheadPrice) : "--"),
            realTimeLabel + " " + (typeof realTimePrice === "number" ? formatDecimal(realTimePrice) : "--"),
            typeof dayAheadPrice === "number" && typeof realTimePrice === "number"
              ? "价差 " + formatSignedNumber(realTimePrice - dayAheadPrice)
              : "价差 --",
          ]
            .filter(Boolean)
            .join("\n");
        },
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
        breakOnNull: true,
        xLabelEvery: getDisclosureLabelEvery(rows.length),
      }) +
      renderDataTablePro({
        tableId: "info-unified-node-table-" + getSelectedTradeCenterKey(),
        columns: [
          { key: "time", label: "时刻" },
          { key: "dayAheadNodePrice", label: "日前节点电价（元/MWh）" },
          { key: "realTimeNodePrice", label: "实时节点电价（元/MWh）" },
          { key: "spread", label: "价差（元/MWh）" },
        ],
        rows: tableRows,
        minWidth: pageData.tableMinWidth || 1120,
        enableColumnDrag: true,
        columnOrder: getTableColumnOrder("info-unified-node-table-" + getSelectedTradeCenterKey()),
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
    var isTradeResultPage = getActiveInfoPrimaryTab() === "交易结果";
    var compareRows = state.ui.hasCompare && isTradeResultPage ? getTradeResultCompareRowsByTab("交易结果") : [];
    var tableConfig = buildInfoDisclosureTableConfig(pageData.tableColumns, rows, pageData.tableMinWidth);
    var tableColumns = tableConfig.columns;
    var tableRows = tableConfig.rows;
    var tableMinWidth = tableConfig.minWidth;

    if (isTradeResultPage && state.ui.hasCompare) {
      var currentDateLabel = formatTradeDisclosureDate(state.tradeResult.filters.marketRunRange.start);
      var compareDateLabel = formatTradeDisclosureDate(state.ui.compareRangeDraft.start);
      tableColumns = buildInfoDisclosureCompareTableColumns(pageData.tableColumns, currentDateLabel, compareDateLabel);
      tableRows = buildInfoDisclosureCompareTableRows(rows, compareRows, pageData.tableColumns);
      tableMinWidth = Math.max(920, tableColumns.length * 245);
    }

    if (!rows.length) {
      return renderInfoUnsupportedEmptyState(pageData.emptyText || INFO_DISCLOSURE_EMPTY_MESSAGE);
    }

    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
      (isTradeResultPage ? renderInfoTradeNoCompareHint("交易结果") : "") +
      renderMixedBarLineChart({
        chartId: "info-unified-mixed-chart-" + getSelectedTradeCenterKey() + "-" + getActiveInfoPrimaryTab(),
        labels: rows.map(function mapRow(row) {
          return buildInfoDisclosureRowLabel(row, pageData);
        }),
        barSeries: buildInfoDisclosureSeries(rows, pageData.barSeriesDefinitions).concat(
          compareRows.length
            ? buildInfoDisclosureCompareSeries(compareRows, pageData.barSeriesDefinitions)
            : [],
        ),
        lineSeries: buildInfoDisclosureSeries(rows, pageData.lineSeriesDefinitions).concat(
          compareRows.length
            ? buildInfoDisclosureCompareSeries(compareRows, pageData.lineSeriesDefinitions)
            : [],
        ),
        hiddenSeries: getChartHiddenState("info-unified-mixed-chart-" + getSelectedTradeCenterKey() + "-" + getActiveInfoPrimaryTab()),
        leftUnit: pageData.leftUnit || "",
        rightUnit: pageData.rightUnit || "",
        tooltipFormatter: isTradeResultPage
          ? function tradeResultTooltip(_, index) {
              var row = rows[index] || {};
              var lines = ["时刻 " + (row.time || "--")].concat(buildInfoDisclosureTradeTooltipLines(row, pageData.tableColumns));

              if (compareRows.length) {
                var compareRow = compareRows[index] || {};
                lines = lines.concat(buildInfoDisclosureTradeTooltipLines(compareRow, pageData.tableColumns, "对比"));
              }

              return lines.join("\n");
            }
          : pageData.tooltipMode === "declarationBid"
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
        columns: tableColumns,
        rows: tableRows,
        minWidth: tableMinWidth,
        enableColumnDrag: true,
        columnOrder: getTableColumnOrder("info-unified-mixed-table-" + getSelectedTradeCenterKey() + "-" + getActiveInfoPrimaryTab()),
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
    var currentDateLabel = formatTradeDisclosureDate(state.tradeResult.filters.marketRunRange.start);
    var compareDateLabel = formatTradeDisclosureDate(state.ui.compareRangeDraft.start);
    var tableConfig = buildInfoDisclosureTableConfig(pageData.tableColumns, rows, pageData.tableMinWidth);
    var isProvinceClearingPage = getActiveInfoPrimaryTab() === "全省统一出清价";
    var compareRows = isProvinceClearingPage ? getInfoClearingCompareRows(pageData) : [];
    var dayAheadLabel = getInfoClearingDayAheadLabel(pageData);
    var realTimeLabel = getInfoClearingRealTimeLabel(pageData);
    var timeColumnLabel = isPageBackedUnifiedClearingPrice(pageData, "全省统一出清价") ? "时段" : "时刻";
    var tradeTableRows = isProvinceClearingPage
      ? rows.map(function mapRow(row) {
          var dayAheadPrice = getInfoClearingPriceValue(row, pageData, "dayAhead");
          var realTimePrice = getInfoClearingPriceValue(row, pageData, "realTime");
          return {
            time: getInfoClearingTimeLabel(row),
            dayAheadPrice: createInfoDisclosureTableCell(dayAheadPrice, formatDecimal),
            realTimePrice: createInfoDisclosureTableCell(realTimePrice, formatDecimal),
            spread: createInfoDisclosureSpreadCell(dayAheadPrice, realTimePrice),
          };
        })
      : null;
    var tradeTableColumns = [
      { key: "time", label: timeColumnLabel },
      { key: "dayAheadPrice", label: dayAheadLabel + "（元/MWh）" },
      { key: "realTimePrice", label: realTimeLabel + "（元/MWh）" },
      { key: "spread", label: "价差（元/MWh）" },
    ];

    if (isProvinceClearingPage && state.ui.hasCompare) {
      tradeTableColumns = [
        { key: "time", label: timeColumnLabel },
        { key: "currentDayAheadPrice", label: currentDateLabel + " " + dayAheadLabel + "（元/MWh）" },
        { key: "currentRealTimePrice", label: currentDateLabel + " " + realTimeLabel + "（元/MWh）" },
        { key: "currentSpread", label: currentDateLabel + " 价差（元/MWh）" },
        { key: "compareDayAheadPrice", label: compareDateLabel + " " + dayAheadLabel + "（元/MWh）" },
        { key: "compareRealTimePrice", label: compareDateLabel + " " + realTimeLabel + "（元/MWh）" },
        { key: "compareSpread", label: compareDateLabel + " 价差（元/MWh）" },
      ];
      tradeTableRows = rows.map(function mapRow(row, index) {
        var compareRow = compareRows[index] || {};
        var dayAheadPrice = getInfoClearingPriceValue(row, pageData, "dayAhead");
        var realTimePrice = getInfoClearingPriceValue(row, pageData, "realTime");
        var compareDayAheadPrice = getInfoClearingPriceValue(compareRow, pageData, "dayAhead");
        var compareRealTimePrice = getInfoClearingPriceValue(compareRow, pageData, "realTime");
        return {
          time: getInfoClearingTimeLabel(row),
          currentDayAheadPrice: createInfoDisclosureTableCell(dayAheadPrice, formatDecimal),
          currentRealTimePrice: createInfoDisclosureTableCell(realTimePrice, formatDecimal),
          currentSpread: createInfoDisclosureSpreadCell(dayAheadPrice, realTimePrice),
          compareDayAheadPrice: createInfoDisclosureTableCell(compareDayAheadPrice, formatDecimal),
          compareRealTimePrice: createInfoDisclosureTableCell(compareRealTimePrice, formatDecimal),
          compareSpread: createInfoDisclosureSpreadCell(compareDayAheadPrice, compareRealTimePrice),
        };
      });
    }

    if (!rows.length) {
      return renderInfoUnsupportedEmptyState(pageData.emptyText || INFO_DISCLOSURE_EMPTY_MESSAGE);
    }

    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
      (isProvinceClearingPage ? renderInfoTradeNoCompareHint("全省统一出清价", compareRows, pageData) : "") +
      renderChartWithMarks({
        chartId: "info-unified-line-chart-" + getSelectedTradeCenterKey() + "-" + getActiveInfoTab(),
        title: pageData.chartTitle || pageData.title,
        labels: rows.map(function mapRow(row) {
          return buildInfoDisclosureRowLabel(row, pageData);
        }),
        unit: pageData.chartUnit || "",
        series: buildInfoDisclosureSeries(rows, pageData.seriesDefinitions).concat(
          isProvinceClearingPage && compareRows.length
            ? [
                {
                  id: "info-province-dayahead-compare",
                  label: "对比" + dayAheadLabel,
                  color: "#FF7A45",
                  values: compareRows.map(function mapRow(row) {
                    return getInfoClearingPriceValue(row, pageData, "dayAhead");
                  }),
                },
                {
                  id: "info-province-realtime-compare",
                  label: "对比" + realTimeLabel,
                  color: "#8C6A4A",
                  values: compareRows.map(function mapRow(row) {
                    return getInfoClearingPriceValue(row, pageData, "realTime");
                  }),
                },
              ]
            : [],
        ),
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
                  var dayAheadPrice = getInfoClearingPriceValue(row, pageData, "dayAhead");
                  var realTimePrice = getInfoClearingPriceValue(row, pageData, "realTime");
                  var lines = [
                    row.date ? "日期 " + row.date : "",
                    getInfoClearingTimeLabel(row) ? timeColumnLabel + " " + getInfoClearingTimeLabel(row) : "",
                    dayAheadLabel + " " + (typeof dayAheadPrice === "number" ? formatDecimal(dayAheadPrice) : "--"),
                    realTimeLabel + " " + (typeof realTimePrice === "number" ? formatDecimal(realTimePrice) : "--"),
                    typeof dayAheadPrice === "number" && typeof realTimePrice === "number"
                      ? "价差 " + formatSignedNumber(realTimePrice - dayAheadPrice)
                      : "价差 --",
                  ].filter(Boolean);

                  if (isProvinceClearingPage && compareRows.length) {
                    var compareRow = compareRows[index] || {};
                    var compareDayAheadPrice = getInfoClearingPriceValue(compareRow, pageData, "dayAhead");
                    var compareRealTimePrice = getInfoClearingPriceValue(compareRow, pageData, "realTime");
                    lines.push(
                      "对比" +
                        dayAheadLabel +
                        " " +
                        (typeof compareDayAheadPrice === "number"
                          ? formatDecimal(compareDayAheadPrice)
                          : "--"),
                    );
                    lines.push(
                      "对比" +
                        realTimeLabel +
                        " " +
                        (typeof compareRealTimePrice === "number"
                          ? formatDecimal(compareRealTimePrice)
                          : "--"),
                    );
                  }

                  return lines.join("\n");
                }
            : null,
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
        breakOnNull: true,
        xLabelEvery: getDisclosureLabelEvery(rows.length),
      }) +
      renderDataTablePro({
        tableId: "info-unified-line-table-" + getSelectedTradeCenterKey() + "-" + getActiveInfoTab(),
        columns: isProvinceClearingPage ? tradeTableColumns : tableConfig.columns,
        rows: tradeTableRows || tableConfig.rows,
        minWidth: isProvinceClearingPage && state.ui.hasCompare ? 1680 : isProvinceClearingPage ? pageData.tableMinWidth || 1120 : tableConfig.minWidth,
        enableColumnDrag: true,
        columnOrder: getTableColumnOrder("info-unified-line-table-" + getSelectedTradeCenterKey() + "-" + getActiveInfoTab()),
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

    if (pageData.tableOnly) {
      if (!rows.length) {
        return renderInfoUnsupportedEmptyState(pageData.emptyText || INFO_DISCLOSURE_EMPTY_MESSAGE);
      }

      return (
        '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
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

  function renderInfoDisclosureDynamicTableContent(pageData) {
    var tableData = pageData.disclosureTableData || {};
    var isDateMergeTable = (tableData.compareMode || pageData.compareMode) === "dateMerge";
    var mergedTableData = isDateMergeTable ? buildDateMergedDisclosureTableData(tableData, pageData) : null;
    var columns = isDateMergeTable ? mergedTableData.columns : tableData.columns || pageData.columns || pageData.tableColumns || [];
    var rows = isDateMergeTable
      ? mergedTableData.rows
      : filterInfoDisclosurePageRows(tableData.rows || pageData.rows || pageData.tableData || [], pageData);
    var tableTitle = pageData.tableTitle || tableData.title || pageData.title;
    var tableId =
      "info-disclosure-dynamic-table-" +
      getSelectedTradeCenterKey() +
      "-" +
      String((tableData.tabKey || getActiveInfoTab()) || "")
        .replace(/\s+/g, "-")
        .replace(/[^\w-]/g, "");

    if (!columns.length || !rows.length) {
      return renderInfoUnsupportedEmptyState(pageData.emptyText || INFO_DISCLOSURE_EMPTY_MESSAGE);
    }

    return renderInfoDisclosureDataTablePanel(
      tableTitle,
      tableId,
      buildInfoDisclosureTableConfig(
        columns,
        rows,
        (mergedTableData && mergedTableData.minWidth) || tableData.minWidth || pageData.tableMinWidth,
        { emptyAsBlank: isDateMergeTable },
      ),
      { enableColumnDrag: true },
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
    var activeTab = getActiveInfoTab();
    var activeMockDate = getInfoTradeMockDate(activeTab);

    if ((activeTab === "全省统一出清价" || activeTab === "交易结果") && !isPageBackedUnifiedTradeTab(pageData, activeTab)) {
      if (activeMockDate && state.tradeResult.filters.marketRunRange.start !== activeMockDate) {
        return renderInfoUnsupportedEmptyState("当前日期暂无交易中心披露数据，请切换日期或手动更新数据");
      }
    }

    if (activeTab === "节点电价") {
      if (activeMockDate && state.tradeResult.filters.nodeRunRange.start !== activeMockDate) {
        return renderInfoUnsupportedEmptyState("当前日期暂无交易中心披露数据，请切换日期或手动更新数据");
      }
    }

    if (!pageData || !pageData.viewType || pageData.viewType === "empty") {
      return renderInfoUnsupportedEmptyState((pageData && pageData.emptyText) || INFO_DISCLOSURE_EMPTY_MESSAGE);
    }

    if (pageData.viewType === "singleMetricLoad") {
      return renderInfoDisclosureSingleMetricLoadContent(pageData);
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
    if (pageData.viewType === "disclosureTable") {
      return renderInfoDisclosureDynamicTableContent(pageData);
    }
    if (pageData.viewType === "maintenanceComposite") {
      return renderInfoDisclosureMaintenanceCompositeContent(pageData);
    }

    return renderInfoUnsupportedEmptyState(pageData.emptyText || INFO_DISCLOSURE_EMPTY_MESSAGE);
  }

  function renderTradeResultFilterBarByTab(activeTab) {
    var fieldsHtml = "";
    var actionsHtml = "";

    if (activeTab === "节点电价") {
      return "";
    }

    return renderInfoFilterPanel(fieldsHtml, actionsHtml);
  }

  function renderDeclarationFilterBar() {
    var declarationMock = getDeclarationMock();
    return renderInfoFilterPanel(
      renderBoundSelectFilter("交易单元", state.declaration.filters.unit, declarationMock.unitOptions || [], "unit", "declaration", "filter-select-native") +
        renderBoundSelectFilter("申报状态", state.declaration.filters.status, declarationMock.statusOptions || [], "status", "declaration", "filter-select-native"),
      renderUiActionButton("重置", "ghost", "reset-declaration") +
        renderUiActionButton("查询", "primary", "query-declaration")
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
    var activeTab = getActiveInfoTab();

    if (isSellerTimeSharingCompareEnabled(activeTab)) {
      return true;
    }

    if (!isInfoDisclosureCompareEnabledByConfig(activeTab)) {
      return false;
    }

    if (isUnifiedMockInfoTradeTab(activeTab)) {
      return activeTab === "全省统一出清价" || activeTab === "交易结果";
    }

    if (isCurrentMarketDisclosureView()) {
      var pageData = getInfoDisclosurePageData();
      return Boolean(pageData.viewType && pageData.viewType !== "empty");
    }

    var currentPageData = getInfoDisclosurePageData();
    if (currentPageData && currentPageData.viewType === "disclosureTable") {
      return true;
    }

    return activeTab === "负荷信息" || activeTab === "全省统一出清价" || activeTab === "出清电量" || activeTab === "交易结果";
  }

  function getInfoDisclosureStatus() {
    var pageData = getInfoDisclosurePageData();
    if (isScopedLoadInfoTab() && isSingleMetricLoadPage(pageData)) {
      var scopedPublishTime = getPagePublishTime(pageData) || getPagePublishTime(getMarketDisclosureMock());
      if (!scopedPublishTime && getSelectedTradeCenterKey() === "guangdong") {
        scopedPublishTime = getModulePublishTime(getInfoMock());
      }
      return {
        time:
          (getSelectedTradeCenterKey() === "guangdong"
            ? state.ui.singleMetricLoadUpdatedAt || pageData.updateTime
            : getMarketDisclosureState().lastUpdatedAt || pageData.updateTime) ||
          "2026-05-09 10:00:00",
        source:
          pageData.statusSource ||
          pageData.dataSource ||
          getMarketDisclosureMock().dataSource ||
          "交易中心披露",
        publishTime: scopedPublishTime,
      };
    }

    var activeTab = getActiveInfoTab();

    if (isPageBackedUnifiedClearingPrice(pageData, activeTab)) {
      return {
        time: pageData.updateTime || pageData.dataUpdateTime || getMarketDisclosureMock().dataUpdatedAt || "2026-05-09 10:00:00",
        source: pageData.dataSource || pageData.source || getMarketDisclosureMock().dataSource || "交易中心披露",
        publishTime: getPagePublishTime(pageData) || getPagePublishTime(getMarketDisclosureMock()),
      };
    }

    if (isUnifiedMockInfoTradeTab(activeTab)) {
      return getTradeResultStatusByTab(activeTab);
    }

    if (pageData && pageData.viewType === "disclosureTable") {
      return {
        time: pageData.updateTime || getMarketDisclosureState().lastUpdatedAt || getMarketDisclosureMock().dataUpdatedAt || "2026-05-09 10:00:00",
        source: pageData.updateSource || pageData.dataSource || getMarketDisclosureMock().dataSource || "交易中心披露",
        publishTime: getPagePublishTime(pageData) || getPagePublishTime(getMarketDisclosureMock()),
      };
    }

    if (!isGuangdongInfoDisclosureCenter()) {
      return {
        time: getMarketDisclosureState().lastUpdatedAt || pageData.updateTime || getMarketDisclosureMock().dataUpdatedAt || "2026-05-09 10:00:00",
        source: pageData.dataSource || getMarketDisclosureMock().dataSource || "交易中心披露",
        publishTime: getPagePublishTime(pageData) || getPagePublishTime(getMarketDisclosureMock()),
      };
    }

    if (isInfoTradeTab(activeTab)) {
      return getTradeResultStatusByTab(activeTab);
    }
    if (activeTab === "日前申报") {
      return parseInfoStatus(getDeclarationMock().statusText, getModulePublishTime(getDeclarationMock()));
    }
    return parseInfoStatus(getInfoMock().statusText, getModulePublishTime(getInfoMock()));
  }

  function getInfoDisclosureTabDatePickerConfig(pageData) {
    var activeTab = getActiveInfoTab();
    var activePrimaryTab = getActiveInfoPrimaryTab();

    if (activePrimaryTab === INFO_DISCLOSURE_TIME_SHARING_TAB) {
      return { id: "time-sharing-range", mode: "range" };
    }

    if (activeTab === "节点电价") {
      return { id: "trade-node-runtime", mode: "single" };
    }

    if (activeTab === "全省统一出清价") {
      return { id: "trade-result-runtime", mode: "single" };
    }

    if (!isGuangdongInfoDisclosureCenter()) {
      return {
        id: "market-disclosure-range",
        mode: getUnifiedInfoDisclosureDatePickerMode(pageData),
      };
    }

    if (activeTab === "日前申报") {
      return { id: "declaration-date", mode: "single" };
    }

    if (activeTab === "负荷信息") {
      return { id: "info-runtime", mode: "single" };
    }

    if (activeTab === "负荷详情") {
      return { id: "info-detail-runtime", mode: "single" };
    }

    if (activeTab === "机组检修容量") {
      return { id: "maintenance-runtime", mode: "single" };
    }

    if (activeTab === "备用信息") {
      return { id: "reserve-runtime", mode: "single" };
    }

    if (activeTab === "机组状态" || activeTab === "发输变电设备检修计划") {
      return { id: "load-info-disclosure-table-runtime", mode: "single" };
    }

    if (activeTab === "出清电量" || activeTab === "交易结果") {
      return { id: "trade-result-runtime", mode: "single" };
    }

    return null;
  }

  function renderInfoDisclosureTabDatePicker(pageData) {
    var datePickerConfig = getInfoDisclosureTabDatePickerConfig(pageData);

    if (!datePickerConfig) {
      return "";
    }

    return (
      '<div class="info-tab-date-query"><span class="filter-label">运行日期：</span>' +
      renderInfoDatePicker(datePickerConfig.id, datePickerConfig.mode) +
      "</div>"
    );
  }

  function renderInfoDisclosureFilterBar() {
    if (!getVisibleInfoPrimaryTabs().length) {
      return "";
    }

    var pageData = getInfoDisclosurePageData();
    if (getActiveInfoTab() === "售电公司分时电量") {
      return renderInfoFilterBar(pageData);
    }
    if (getActiveInfoTab() === "用电企业分时电量") {
      return renderInfoFilterBar(pageData);
    }
    if (getActiveInfoTab() === INFO_DISCLOSURE_SELLER_HISTORY_TAB || getActiveInfoTab() === INFO_DISCLOSURE_USER_HISTORY_TAB) {
      return renderInfoFilterBar(pageData);
    }
    if (isScopedLoadInfoTab() && isSingleMetricLoadPage(pageData)) {
      return renderSingleMetricLoadFilterBar();
    }

    if (!isGuangdongInfoDisclosureCenter()) {
      return renderUnifiedInfoDisclosureFilterBar(pageData);
    }
    var activePrimaryTab = getActiveInfoPrimaryTab();
    var activeTab = getActiveInfoTab();
    if (isUnifiedMockInfoTradeTab(activeTab)) {
      return renderTradeResultFilterBarByTab(activeTab);
    }
    if (isDayAheadDeclarationTab(activeTab)) {
      return "";
    }
    return renderInfoFilterBar(pageData);
  }

  function renderInfoTradePriceContent() {
    var priceTable = getTradeResultUnifiedTable();

    if (!priceTable.rows.length) {
      return renderInfoUnsupportedEmptyState("当前日期暂无交易中心披露数据，请切换日期或手动更新数据");
    }

    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
      getTradeResultNoCompareHint("全省统一出清价") +
      getTradeResultUnifiedChart() +
      renderDataTablePro({
        tableId: "info-trade-price-table",
        columns: priceTable.columns,
        rows: priceTable.rows,
        minWidth: priceTable.minWidth,
        enableColumnDrag: true,
        columnOrder: getTableColumnOrder("info-trade-price-table"),
        sortState: getTableSortState("info-trade-price-table"),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></section>"
    );
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
    var mixedTable = getTradeResultMixedTable();

    if (!mixedTable.rows.length) {
      return renderInfoUnsupportedEmptyState("当前日期暂无交易中心披露数据，请切换日期或手动更新数据");
    }

    return (
      '<section class="panel chart-panel chart-panel-plain"><div class="chart-main chart-main-plain">' +
      getTradeResultNoCompareHint("交易结果") +
      getTradeResultMixedChart() +
      renderDataTablePro({
        tableId: "trade-result-mixed-table",
        columns: mixedTable.columns,
        rows: mixedTable.rows,
        minWidth: mixedTable.minWidth,
        enableColumnDrag: true,
        columnOrder: getTableColumnOrder("trade-result-mixed-table"),
        sortState: getTableSortState("trade-result-mixed-table"),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</div></section>"
    );
  }

  function renderInfoTradeNodeContent() {
    var nodeSeries = getTradeNodePriceSeries();
    var nodeTable = getTradeNodePriceTable();

    if (!(nodeSeries.points || []).length) {
      return renderInfoUnsupportedEmptyState("当前日期暂无交易中心披露数据，请切换日期或手动更新数据");
    }

    return (
      '<section class="panel chart-panel"><div class="chart-layout chart-layout-node">' +
      renderTradeNodeSidebar() +
      '<div class="chart-main">' +
      renderChartWithMarks({
        chartId: "trade-node-price-chart-" + getSelectedTradeCenterKey() + "-" + getSelectedTradeNode(),
        title: getSelectedTradeNode(),
        labels: (nodeSeries.points || []).map(function mapPoint(point) {
          return point.time;
        }),
        unit: "元/MWh",
        series: [
          {
            id: "trade-node-dayahead",
            label: "日前节点电价",
            color: "#1677FF",
            values: (nodeSeries.points || []).map(function mapPoint(point) {
              return point.dayAheadNodePrice;
            }),
          },
          {
            id: "trade-node-realtime",
            label: "实时节点电价",
            color: "#2FCB8F",
            values: (nodeSeries.points || []).map(function mapPoint(point) {
              return point.realTimeNodePrice;
            }),
          },
        ],
        hiddenSeries: getChartHiddenState("trade-node-price-chart-" + getSelectedTradeCenterKey() + "-" + getSelectedTradeNode()),
        tooltipFormatter: function tooltipFormatter(_, index) {
          var point = (nodeSeries.points || [])[index] || {};
          return [
            "节点名称 " + getSelectedTradeNode(),
            "时刻 " + (point.time || "--"),
            "日前节点电价 " + (typeof point.dayAheadNodePrice === "number" ? formatDecimal(point.dayAheadNodePrice) : "--"),
            "实时节点电价 " + (typeof point.realTimeNodePrice === "number" ? formatDecimal(point.realTimeNodePrice) : "--"),
            "价差 " +
              (typeof calculateTradeSpread(point.dayAheadNodePrice, point.realTimeNodePrice) === "number"
                ? formatDecimal(calculateTradeSpread(point.dayAheadNodePrice, point.realTimeNodePrice))
                : "--"),
          ].join("\n");
        },
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
        breakOnNull: true,
        xLabelEvery: 8,
      }) +
      renderDataTablePro({
        tableId: "trade-node-price-table",
        columns: nodeTable.columns,
        rows: nodeTable.rows,
        minWidth: nodeTable.minWidth,
        enableColumnDrag: true,
        columnOrder: getTableColumnOrder("trade-node-price-table"),
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
    if (!getVisibleInfoPrimaryTabs().length) {
      return renderInfoNoDataSourceEmptyState();
    }

    var activeTab = getActiveInfoTab();
    var pageData = getInfoDisclosurePageData();
    var activeMockDate = getInfoTradeMockDate(activeTab);

    if ((activeTab === "全省统一出清价" || activeTab === "交易结果") && !isPageBackedUnifiedTradeTab(pageData, activeTab)) {
      if (activeMockDate && state.tradeResult.filters.marketRunRange.start !== activeMockDate) {
        return renderInfoUnsupportedEmptyState("当前日期暂无交易中心披露数据，请切换日期或手动更新数据");
      }
    }

    if (activeTab === "节点电价") {
      if (activeMockDate && state.tradeResult.filters.nodeRunRange.start !== activeMockDate) {
        return renderInfoUnsupportedEmptyState("当前日期暂无交易中心披露数据，请切换日期或手动更新数据");
      }
    }

    if (activeTab === "售电公司分时电量") {
      if (isPageBackedTimeSharingTab(activeTab, pageData)) {
        return renderUnifiedInfoDisclosureContent(pageData);
      }
      return renderSaleCompanyContent();
    }

    if (activeTab === "用电企业分时电量") {
      if (isPageBackedTimeSharingTab(activeTab, pageData)) {
        return renderUnifiedInfoDisclosureContent(pageData);
      }
      return renderEnterpriseContent();
    }

    if (activeTab === INFO_DISCLOSURE_SELLER_HISTORY_TAB) {
      return renderSellerHistoryContent();
    }

    if (activeTab === INFO_DISCLOSURE_USER_HISTORY_TAB) {
      return renderUserHistoryContent();
    }

    if (isScopedLoadInfoTab() && isSingleMetricLoadPage(pageData)) {
      return renderUnifiedInfoDisclosureContent(pageData);
    }

    if (isUnifiedMockInfoTradeTab(activeTab)) {
      return renderUnifiedInfoDisclosureContent(pageData);
    }

    if (pageData && pageData.viewType === "disclosureTable") {
      return renderUnifiedInfoDisclosureContent(pageData);
    }

    if (!isGuangdongInfoDisclosureCenter()) {
      return renderUnifiedInfoDisclosureContent(pageData);
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
    if (activeTab === "出清电量") {
      return renderInfoTradeVolumeContent();
    }
    if (activeTab === "日前申报") {
      return renderInfoDeclarationContent();
    }
    return renderInfoUnsupportedEmptyState();
  }

  function renderInfoDisclosurePage() {
    ensureVisibleInfoDisclosureTab();
    var pageMeta = getInfoDisclosureTradeCenterMeta();
    var pageData = getInfoDisclosurePageData();
    syncUnifiedInfoDisclosureRange(pageData);
    syncPageBackedClearingPriceRunDate(pageData);
    var activePrimaryTab = getActiveInfoPrimaryTab();
    var visiblePrimaryTabs = getVisibleInfoPrimaryTabs();
    var visibleSecondaryTabs = getVisibleInfoSecondaryTabs(activePrimaryTab);
    var activeTab = getActiveInfoTab();
    var hasVisibleTabs = visiblePrimaryTabs.length > 0;
    var tabDatePickerHtml = hasVisibleTabs ? renderInfoDisclosureTabDatePicker(pageData) : "";
    var primaryTabsHtml = visiblePrimaryTabs.map(function mapTab(tab) {
      return '<button class="primary-tab ' + (activePrimaryTab === tab ? "active" : "") + '" data-primary-tab="' + escapeHtml(tab) + '">' + escapeHtml(tab) + "</button>";
    }).join("");
    var secondaryTabsHtml =
      (activePrimaryTab === "负荷信息" || activePrimaryTab === INFO_DISCLOSURE_TIME_SHARING_TAB) && visibleSecondaryTabs.length
        ? '<div class="secondary-tabs">' + renderSecondaryTabs(visibleSecondaryTabs, getActiveInfoSecondaryTab()) + "</div>"
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
      (hasVisibleTabs
        ? '<section class="panel tabs-panel"><div class="panel-topline info-tabs-topline"><div class="primary-tabs">' +
          primaryTabsHtml +
          "</div>" +
          tabDatePickerHtml +
          "</div>" +
          secondaryTabsHtml +
          "</section>"
        : "") +
      renderInfoDisclosureFilterBar() +
      (!hasVisibleTabs || activeTab === "用电企业分时电量" || activeTab === "售电公司分时电量" || isHistoryTimeSharingTab(activeTab)
        ? ""
        : renderInfoUnifiedDataUpdateBar(getInfoDisclosureStatus(), isInfoDisclosureCompareSupported())) +
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
    if (isInfoDisclosurePage(state.currentPageKey) && !isInfoDisclosureCompareEnabledByConfig(getActiveInfoTab())) {
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
      publishTime: getModulePublishTime(disclosureModule) || getPagePublishTime(pageMock),
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
      publishTime: status.publishTime,
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
        breakOnNull: true,
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
    var renderableSeries = (options.barSeries || []).concat(options.lineSeries || []);
    var legendHtml =
      '<div class="chart-legend chart-legend-buttoned">' +
      renderableSeries
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

    if (!visibleSeries.length) {
      return (
        legendHtml +
        renderEmptyState({
          message: "当前图表暂无可展示序列，请重新选择图例。",
          escapeHtml: escapeHtml,
          renderIcon: renderIcon,
        })
      );
    }

    function getValues(seriesList) {
      return seriesList.reduce(function reduce(result, series) {
        return result.concat(
          series.values.filter(function filterValue(value) {
            return typeof value === "number" && !Number.isNaN(value);
          }),
        );
      }, []);
    }

    var leftValues = getValues(barSeries);
    var rightValues = getValues(lineSeries);
    if (!leftValues.length && !rightValues.length) {
      return (
        legendHtml +
        renderEmptyState({
          message: options.emptyMessage || "当前图表暂无可展示数据，请切换日期或手动更新数据。",
          escapeHtml: escapeHtml,
          renderIcon: renderIcon,
        })
      );
    }
    var leftMax = Math.max.apply(null, leftValues.length ? leftValues : [0]);
    var rightMax = Math.max.apply(null, rightValues.length ? rightValues : [0]);
    var roundedLeftMax = Math.ceil((leftMax * 1.15) / 1000) * 1000 || 1000;
    var roundedRightMax = Math.ceil((rightMax * 1.15) / 100) * 100 || 100;
    var yTicks = Array.from({ length: 6 }, function createTick(_, index) {
      return Math.round((roundedLeftMax / 5) * index);
    });
    var leftAverage = leftValues.length
      ? leftValues.reduce(function sum(total, value) { return total + value; }, 0) / leftValues.length
      : null;
    var rightAverage = rightValues.length
      ? rightValues.reduce(function sum(total, value) { return total + value; }, 0) / rightValues.length
      : null;
    var leftMaxPoint = null;
    var leftMinPoint = null;
    var rightMaxPoint = null;
    var rightMinPoint = null;

    function xToCenter(index) {
      return margin.left + index * xStep + xStep / 2;
    }

    function yLeft(value) {
      return margin.top + innerHeight - (value / roundedLeftMax) * innerHeight;
    }

    function yRight(value) {
      return margin.top + innerHeight - (value / roundedRightMax) * innerHeight;
    }

    barSeries.forEach(function eachBarSeries(series) {
      series.values.forEach(function eachValue(value, index) {
        if (typeof value !== "number" || Number.isNaN(value)) {
          return;
        }
        if (!leftMaxPoint || value > leftMaxPoint.value) {
          leftMaxPoint = { value: value, index: index };
        }
        if (!leftMinPoint || value < leftMinPoint.value) {
          leftMinPoint = { value: value, index: index };
        }
      });
    });

    lineSeries.forEach(function eachLineSeries(series) {
      series.values.forEach(function eachValue(value, index) {
        if (typeof value !== "number" || Number.isNaN(value)) {
          return;
        }
        if (!rightMaxPoint || value > rightMaxPoint.value) {
          rightMaxPoint = { value: value, index: index };
        }
        if (!rightMinPoint || value < rightMinPoint.value) {
          rightMinPoint = { value: value, index: index };
        }
      });
    });

    function buildLineSegments(series) {
      var segments = [];
      var currentSegment = [];

      series.values.forEach(function eachValue(value, index) {
        if (typeof value !== "number" || Number.isNaN(value)) {
          if (currentSegment.length) {
            segments.push(currentSegment);
            currentSegment = [];
          }
          return;
        }
        currentSegment.push(xToCenter(index) + "," + yRight(value));
      });

      if (currentSegment.length) {
        segments.push(currentSegment);
      }

      return segments;
    }

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
            if (typeof value !== "number" || Number.isNaN(value)) {
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
        return buildLineSegments(series)
          .map(function mapSegment(segment) {
            return '<polyline class="custom-chart-line" points="' + segment.join(" ") + '" style="stroke:' + escapeHtml(series.color) + ";stroke-width:2.6;\"></polyline>";
          })
          .join("");
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

    var markerHtml = "";
    if (typeof leftAverage === "number") {
      markerHtml +=
        '<line class="avg-line" x1="' +
        margin.left +
        '" x2="' +
        (width - margin.right) +
        '" y1="' +
        yLeft(leftAverage) +
        '" y2="' +
        yLeft(leftAverage) +
        '"></line><text class="avg-label" x="' +
        (width - margin.right - 8) +
        '" y="' +
        (yLeft(leftAverage) - 8) +
        '" text-anchor="end">电量均值 ' +
        formatInteger(leftAverage) +
        "</text>";
    }
    if (typeof rightAverage === "number") {
      markerHtml +=
        '<line class="avg-line avg-line-right" x1="' +
        margin.left +
        '" x2="' +
        (width - margin.right) +
        '" y1="' +
        yRight(rightAverage) +
        '" y2="' +
        yRight(rightAverage) +
        '"></line><text class="avg-label avg-label-right" x="' +
        (width - margin.right - 8) +
        '" y="' +
        (yRight(rightAverage) + 18) +
        '" text-anchor="end">电价均值 ' +
        formatDecimal(rightAverage) +
        "</text>";
    }
    if (leftMaxPoint) {
      markerHtml +=
        '<text class="point-label point-label-max" x="' +
        xToCenter(leftMaxPoint.index) +
        '" y="' +
        (yLeft(leftMaxPoint.value) - 12) +
        '" text-anchor="middle">电量最大值 ' +
        formatInteger(leftMaxPoint.value) +
        "</text>";
    }
    if (leftMinPoint) {
      markerHtml +=
        '<text class="point-label point-label-min" x="' +
        xToCenter(leftMinPoint.index) +
        '" y="' +
        (yLeft(leftMinPoint.value) + 18) +
        '" text-anchor="middle">电量最小值 ' +
        formatInteger(leftMinPoint.value) +
        "</text>";
    }
    if (rightMaxPoint) {
      markerHtml +=
        '<text class="point-label point-label-max point-label-right" x="' +
        xToCenter(rightMaxPoint.index) +
        '" y="' +
        (yRight(rightMaxPoint.value) - 12) +
        '" text-anchor="middle">电价最大值 ' +
        formatDecimal(rightMaxPoint.value) +
        "</text>";
    }
    if (rightMinPoint) {
      markerHtml +=
        '<text class="point-label point-label-min point-label-right" x="' +
        xToCenter(rightMinPoint.index) +
        '" y="' +
        (yRight(rightMinPoint.value) + 18) +
        '" text-anchor="middle">电价最小值 ' +
        formatDecimal(rightMinPoint.value) +
        "</text>";
    }

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
      markerHtml +
      hitAreasHtml +
      xLabelsHtml +
      "</svg></div>"
    );
  }

  function getTradeResultMock() {
    var bundle = getTradeCenterMockBundle(getSelectedTradeCenterKey());
    return (bundle && bundle.tradeResult) || {};
  }

  function getUnifiedNodePriceMockForCenter(centerKey) {
    var mocks = global.nodePriceMockByCenter || global.BOSS_NODE_PRICE_MOCK_BY_CENTER || {};
    return mocks[centerKey || getSelectedTradeCenterKey()] || null;
  }

  function getUnifiedTradingResultMockForCenter(centerKey) {
    var mocks = global.tradingResultMockByCenter || global.BOSS_TRADING_RESULT_MOCK_BY_CENTER || {};
    return mocks[centerKey || getSelectedTradeCenterKey()] || null;
  }

  function getInfoTradeMockDate(tabName) {
    var activeTab = tabName || state.tradeResult.activeTab;
    var dataset = activeTab === "交易结果" ? getUnifiedTradingResultMockForCenter() : getUnifiedNodePriceMockForCenter();
    return (dataset && dataset.date) || "";
  }

  function normalizeInfoTradeMockDate(dateValue, tabName) {
    var requestedDate = dateValue || getTradeResultRunDate(tabName || state.tradeResult.activeTab);
    var mockDate = getInfoTradeMockDate(tabName);
    return mockDate ? (requestedDate === mockDate ? requestedDate : "") : requestedDate;
  }

  function calculateTradeSpread(dayAheadValue, realTimeValue) {
    if (typeof dayAheadValue !== "number" || typeof realTimeValue !== "number") {
      return null;
    }

    return Number((realTimeValue - dayAheadValue).toFixed(2));
  }

  function aggregateTradeNodePrice96To24(points96) {
    if (typeof global.aggregateNodePrice96To24 === "function") {
      return global.aggregateNodePrice96To24(points96 || []);
    }

    return Array.from({ length: 24 }, function createHourPoint(_, hourIndex) {
      var segment = (points96 || []).slice(hourIndex * 4, hourIndex * 4 + 4);

      function averageField(fieldKey) {
        var values = segment
          .map(function mapPoint(point) {
            return point && point[fieldKey];
          })
          .filter(function filterNumber(value) {
            return typeof value === "number" && !Number.isNaN(value);
          });

        if (!values.length) {
          return null;
        }

        return Number(
          (
            values.reduce(function sum(total, value) {
              return total + value;
            }, 0) / values.length
          ).toFixed(2),
        );
      }

      var dayAheadNodePrice = averageField("dayAheadNodePrice");
      var realTimeNodePrice = averageField("realTimeNodePrice");

      return {
        time: String(hourIndex).padStart(2, "0") + ":00",
        dayAheadNodePrice: dayAheadNodePrice,
        realTimeNodePrice: realTimeNodePrice,
        spread: calculateTradeSpread(dayAheadNodePrice, realTimeNodePrice),
      };
    });
  }

  function getTradeResultProvinceNode(dataset) {
    return ((dataset && dataset.nodes) || []).find(function findNode(node) {
      return node.nodeName === "全省" || node.nodeType === "全省" || node.category === "全省";
    }) || null;
  }

  function getTradeResultStatusByTab(activeTab) {
    var tabName = activeTab || state.tradeResult.activeTab;
    var dataset = null;

    if (tabName === "全省统一出清价" || tabName === "节点电价") {
      dataset = getTradeResultNodePriceDataset(getInfoTradeMockDate("节点电价") || getTradeResultRunDate(tabName));
    } else if (tabName === "交易结果") {
      dataset = getTradeResultTradingDataset(getInfoTradeMockDate("交易结果") || getTradeResultRunDate(tabName));
    }

    if (dataset) {
      var fallbackStatus = parseInfoStatus(getTradeResultMock().statusText, getModulePublishTime(getTradeResultMock()));
      return {
        time: dataset.updateTime || fallbackStatus.time,
        source: dataset.source || fallbackStatus.source,
        publishTime: dataset.publishTime || fallbackStatus.publishTime,
      };
    }

    return parseInfoStatus(getTradeResultMock().statusText, getModulePublishTime(getTradeResultMock()));
  }

  function isTradeResultCompareSupported() {
    return state.tradeResult.activeTab === "全省统一出清价" || state.tradeResult.activeTab === "交易结果";
  }

  function formatTradeDisclosureDate(value) {
    return String(value || "").replace(/-/g, "/");
  }

  function createTradeTableCell(value, formatter, emptyText) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return {
        text: emptyText || "-",
        copyable: false,
        sortValue: null,
      };
    }

    return {
      text: formatter(value),
      sortValue: value,
    };
  }

  function createTradeSpreadCell(value) {
    var cell = createTradeTableCell(value, formatDecimal);
    if (typeof value === "number" && value < 0) {
      cell.className = "table-negative";
    }
    return cell;
  }

  function getTradeResultRunDate(activeTab) {
    return activeTab === "节点电价"
      ? state.tradeResult.filters.nodeRunRange.start
      : state.tradeResult.filters.marketRunRange.start;
  }

  function getTradeResultNodePriceDataset(dateValue) {
    var unifiedDataset = getUnifiedNodePriceMockForCenter();
    var requestedDate = dateValue || getTradeResultRunDate(state.tradeResult.activeTab || "节点电价");
    var mockDate = getInfoTradeMockDate("节点电价");
    var normalizedDate = mockDate ? (requestedDate === mockDate ? requestedDate : "") : requestedDate;

    if (unifiedDataset) {
      return normalizedDate ? unifiedDataset : null;
    }

    var nodePriceByDate = getTradeResultMock().nodePriceByDate || {};
    return nodePriceByDate[dateValue || getTradeResultRunDate("节点电价")] || null;
  }

  function getTradeResultTradingDataset(dateValue) {
    var unifiedDataset = getUnifiedTradingResultMockForCenter();
    var normalizedDate = normalizeInfoTradeMockDate(dateValue, "交易结果");

    if (unifiedDataset) {
      return normalizedDate ? unifiedDataset : null;
    }

    var tradingResultByDate = getTradeResultMock().tradingResultByDate || {};
    return tradingResultByDate[dateValue || getTradeResultRunDate(state.tradeResult.activeTab)] || null;
  }

  function getTradeResultProvinceRows(dateValue) {
    var dataset = getTradeResultNodePriceDataset(dateValue || getTradeResultRunDate("全省统一出清价"));
    var provinceNode = getTradeResultProvinceNode(dataset);

    if (provinceNode && Array.isArray(provinceNode.points)) {
      return aggregateTradeNodePrice96To24(provinceNode.points);
    }

    return dataset && dataset.provinceHourlyPoints ? dataset.provinceHourlyPoints.slice() : [];
  }

  function getTradeResultRows(dateValue) {
    var dataset = getTradeResultTradingDataset(dateValue);
    return dataset && dataset.points ? dataset.points.slice() : [];
  }

  function getTradeResultNodeLabels(options) {
    var resolvedOptions = options || {};
    var dataset = getTradeResultNodePriceDataset();
    var keyword = resolvedOptions.ignoreKeyword ? "" : String(state.tradeResult.filters.nodeKeyword || "").trim().toLowerCase();
    var nodes = (dataset && dataset.nodes) || [];
    var provinceLabels = [];
    var otherLabels = [];

    nodes.forEach(function eachNode(node) {
      var label = node && node.nodeName;
      if (!label || label === "节点1" || label === "节点2" || label === "节点3") {
        return;
      }
      if (label === "全省" || node.nodeType === "全省" || node.category === "全省") {
        if ((!keyword || "全省".indexOf(keyword) >= 0) && provinceLabels.indexOf("全省") < 0) {
          provinceLabels.push("全省");
        }
        return;
      }
      if (!keyword || String(label).toLowerCase().indexOf(keyword) >= 0) {
        otherLabels.push(label);
      }
    });

    if (provinceLabels.indexOf("全省") < 0 && (!keyword || "全省".indexOf(keyword) >= 0)) {
      provinceLabels.push("全省");
    }

    return provinceLabels.concat(otherLabels);
  }

  function getTradeResultCompareRowsByTab(activeTab) {
    if (!state.ui.hasCompare) {
      return [];
    }
    if (!getTradeResultCompareDatasetByTab(activeTab)) {
      return [];
    }
    if (activeTab === "全省统一出清价") {
      return getTradeResultProvinceRows(state.ui.compareRangeDraft.start);
    }
    if (activeTab === "交易结果") {
      return getTradeResultRows(state.ui.compareRangeDraft.start);
    }
    return [];
  }

  function getTradeResultCompareDatasetByTab(activeTab) {
    if (!state.ui.hasCompare) {
      return null;
    }
    var compareDate = state.ui.compareRangeDraft.start;

    if (activeTab === "全省统一出清价") {
      return getTradeResultNodePriceDataset(compareDate);
    }
    if (activeTab === "交易结果") {
      return getTradeResultTradingDataset(compareDate);
    }
    return null;
  }

  function hasTradeResultCompareData(activeTab) {
    return Boolean(getTradeResultCompareDatasetByTab(activeTab) && getTradeResultCompareRowsByTab(activeTab).length);
  }

  function getTradeResultNoCompareHint(activeTab) {
    if (!state.ui.hasCompare || hasTradeResultCompareData(activeTab)) {
      return "";
    }
    return '<div class="placeholder-note trade-compare-hint">对比日暂无数据</div>';
  }

  function getSelectedTradeNode() {
    var dataset = getTradeResultNodePriceDataset();
    var nodes = (dataset && dataset.nodes) || [];
    var availableNodes = getTradeResultNodeLabels({ ignoreKeyword: true });
    if (
      availableNodes.indexOf(state.tradeResult.selectedNode) >= 0 &&
      nodes.some(function hasSelectedNode(node) {
        return node.nodeName === state.tradeResult.selectedNode;
      })
    ) {
      return state.tradeResult.selectedNode;
    }
    return "全省";
  }

  function isTradeResultEmpty() {
    if (state.tradeResult.activeTab === "节点电价") {
      return !getTradeNodePriceSeries().points.length;
    }
    if (state.tradeResult.activeTab === "全省统一出清价") {
      return !getTradeResultProvinceRows().length;
    }
    return !getTradeResultRows().length;
  }

  function getTradeResultUnifiedTable() {
    var currentDate = state.tradeResult.filters.marketRunRange.start;
    var currentRows = getTradeResultProvinceRows(currentDate);
    var compareRows = getTradeResultCompareRowsByTab("全省统一出清价");
    var currentDateLabel = formatTradeDisclosureDate(currentDate);
    var compareDateLabel = formatTradeDisclosureDate(state.ui.compareRangeDraft.start);
    var columns = [
      { key: "time", label: "时刻" },
      { key: "currentDayAheadNodePrice", label: currentDateLabel + " 日前节点电价（元/MWh）" },
      { key: "currentRealTimeNodePrice", label: currentDateLabel + " 实时节点电价（元/MWh）" },
      { key: "currentSpread", label: currentDateLabel + " 价差（元/MWh）" },
    ];

    if (state.ui.hasCompare) {
      columns = columns.concat([
        { key: "compareDayAheadNodePrice", label: compareDateLabel + " 日前节点电价（元/MWh）" },
        { key: "compareRealTimeNodePrice", label: compareDateLabel + " 实时节点电价（元/MWh）" },
        { key: "compareSpread", label: compareDateLabel + " 价差（元/MWh）" },
      ]);
    }

    return {
      columns: columns,
      rows: currentRows.map(function mapRow(row, index) {
        var compareRow = compareRows[index] || {};
        var result = {
          time: row.time,
          currentDayAheadNodePrice: createTradeTableCell(row.dayAheadNodePrice, formatDecimal),
          currentRealTimeNodePrice: createTradeTableCell(row.realTimeNodePrice, formatDecimal),
          currentSpread: createTradeSpreadCell(calculateTradeSpread(row.dayAheadNodePrice, row.realTimeNodePrice)),
        };

        if (state.ui.hasCompare) {
          result.compareDayAheadNodePrice = createTradeTableCell(compareRow.dayAheadNodePrice, formatDecimal);
          result.compareRealTimeNodePrice = createTradeTableCell(compareRow.realTimeNodePrice, formatDecimal);
          result.compareSpread = createTradeSpreadCell(
            calculateTradeSpread(compareRow.dayAheadNodePrice, compareRow.realTimeNodePrice),
          );
        }

        return result;
      }),
      minWidth: state.ui.hasCompare ? 1680 : 980,
    };
  }

  function getTradeResultUnifiedChart() {
    var rows = getTradeResultProvinceRows(state.tradeResult.filters.marketRunRange.start);
    var compareRows = getTradeResultCompareRowsByTab("全省统一出清价");
    var dayAhead = rows.map(function mapRow(row) {
      return row.dayAheadNodePrice;
    });
    var realTime = rows.map(function mapRow(row) {
      return row.realTimeNodePrice;
    });
    var series = [
      { id: "trade-price-dayahead", label: "日前节点电价", color: "#1677FF", values: dayAhead },
      { id: "trade-price-realtime", label: "实时节点电价", color: "#2FCB8F", values: realTime },
    ];

    if (compareRows.length) {
      series.push({
        id: "trade-price-dayahead-compare",
        label: "对比日前节点电价",
        color: "#FF7A45",
        values: compareRows.map(function mapRow(row) {
          return row.dayAheadNodePrice;
        }),
      });
      series.push({
        id: "trade-price-realtime-compare",
        label: "对比实时节点电价",
        color: "#8C6A4A",
        values: compareRows.map(function mapRow(row) {
          return row.realTimeNodePrice;
        }),
      });
    }

    return renderChartWithMarks({
      chartId: "trade-result-price-chart-" + getSelectedTradeCenterKey(),
      title: "全省统一出清价",
      labels: rows.map(function mapRow(row) {
        return row.time;
      }),
      unit: "元/MWh",
      series: series,
      hiddenSeries: getChartHiddenState("trade-result-price-chart-" + getSelectedTradeCenterKey()),
      tooltipFormatter: function tooltipFormatter(_, index) {
        var row = rows[index] || {};
        var lines = [
          "时刻 " + (row.time || "--"),
          "日前节点电价 " + (typeof row.dayAheadNodePrice === "number" ? formatDecimal(row.dayAheadNodePrice) : "--"),
          "实时节点电价 " + (typeof row.realTimeNodePrice === "number" ? formatDecimal(row.realTimeNodePrice) : "--"),
          "价差 " +
            (typeof calculateTradeSpread(row.dayAheadNodePrice, row.realTimeNodePrice) === "number"
              ? formatDecimal(calculateTradeSpread(row.dayAheadNodePrice, row.realTimeNodePrice))
              : "--"),
        ];

        if (compareRows.length) {
          var compareRow = compareRows[index] || {};
          lines.push(
            "对比日前节点电价 " +
              (typeof compareRow.dayAheadNodePrice === "number" ? formatDecimal(compareRow.dayAheadNodePrice) : "--")
          );
          lines.push(
            "对比实时节点电价 " +
              (typeof compareRow.realTimeNodePrice === "number" ? formatDecimal(compareRow.realTimeNodePrice) : "--")
          );
        }

        return lines.join("\n");
      },
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
      renderEmptyState: renderEmptyState,
      breakOnNull: true,
      xLabelEvery: 2,
    });
  }

  function getTradeResultMixedTable() {
    var currentDate = state.tradeResult.filters.marketRunRange.start;
    var currentDateLabel = formatTradeDisclosureDate(currentDate);
    var compareDateLabel = formatTradeDisclosureDate(state.ui.compareRangeDraft.start);
    var currentRows = getTradeResultRows(currentDate);
    var compareRows = getTradeResultCompareRowsByTab("交易结果");
    var columns = [
      { key: "time", label: "时刻" },
      { key: "currentDayAheadVolume", label: currentDateLabel + " 日前成交电量（MWh）" },
      { key: "currentRealTimeVolume", label: currentDateLabel + " 实时成交电量（MWh）" },
      { key: "currentDayAheadSettlementPrice", label: currentDateLabel + " 日前用户侧统一结算价格（元/MWh）" },
      { key: "currentRealTimeSettlementPrice", label: currentDateLabel + " 实时用户侧统一结算价格（元/MWh）" },
    ];

    if (state.ui.hasCompare) {
      columns = columns.concat([
        { key: "compareDayAheadVolume", label: compareDateLabel + " 日前成交电量（MWh）" },
        { key: "compareRealTimeVolume", label: compareDateLabel + " 实时成交电量（MWh）" },
        { key: "compareDayAheadSettlementPrice", label: compareDateLabel + " 日前用户侧统一结算价格（元/MWh）" },
        { key: "compareRealTimeSettlementPrice", label: compareDateLabel + " 实时用户侧统一结算价格（元/MWh）" },
      ]);
    }

    return {
      columns: columns,
      rows: currentRows.map(function mapRow(row, index) {
        var compareRow = compareRows[index] || {};
        var result = {
          time: row.time,
          currentDayAheadVolume: createTradeTableCell(row.dayAheadVolume, formatInteger),
          currentRealTimeVolume: createTradeTableCell(row.realTimeVolume, formatInteger),
          currentDayAheadSettlementPrice: createTradeTableCell(row.dayAheadSettlementPrice, formatDecimal),
          currentRealTimeSettlementPrice: createTradeTableCell(row.realTimeSettlementPrice, formatDecimal),
        };

        if (state.ui.hasCompare) {
          result.compareDayAheadVolume = createTradeTableCell(compareRow.dayAheadVolume, formatInteger);
          result.compareRealTimeVolume = createTradeTableCell(compareRow.realTimeVolume, formatInteger);
          result.compareDayAheadSettlementPrice = createTradeTableCell(compareRow.dayAheadSettlementPrice, formatDecimal);
          result.compareRealTimeSettlementPrice = createTradeTableCell(compareRow.realTimeSettlementPrice, formatDecimal);
        }

        return result;
      }),
      minWidth: state.ui.hasCompare ? 2200 : 1360,
    };
  }

  function getTradeResultMixedChart() {
    var rows = getTradeResultRows();
    var compareRows = getTradeResultCompareRowsByTab("交易结果");
    var dayAheadVolume = rows.map(function mapRow(row) {
      return row.dayAheadVolume;
    });
    var realTimeVolume = rows.map(function mapRow(row) {
      return row.realTimeVolume;
    });
    var dayAheadPrice = rows.map(function mapRow(row) {
      return row.dayAheadSettlementPrice;
    });
    var realTimePrice = rows.map(function mapRow(row) {
      return row.realTimeSettlementPrice;
    });
    var barSeries = [
      { id: "trade-volume-dayahead", label: "日前成交电量", color: "#9DC4FF", values: dayAheadVolume, opacity: 0.92 },
      { id: "trade-volume-realtime", label: "实时成交电量", color: "#6CB7FF", values: realTimeVolume, opacity: 0.78 },
    ];
    var lineSeries = [
      { id: "trade-settlement-dayahead", label: "日前用户侧统一结算价格", color: "#FF7A45", values: dayAheadPrice },
      { id: "trade-settlement-realtime", label: "实时用户侧统一结算价格", color: "#2FCB8F", values: realTimePrice },
    ];

    if (compareRows.length) {
      barSeries.push({
        id: "trade-volume-dayahead-compare",
        label: "对比日前成交电量",
        color: "#D6E6FF",
        values: compareRows.map(function mapRow(row) {
          return row.dayAheadVolume;
        }),
        opacity: 0.55,
      });
      barSeries.push({
        id: "trade-volume-realtime-compare",
        label: "对比实时成交电量",
        color: "#B8DBFF",
        values: compareRows.map(function mapRow(row) {
          return row.realTimeVolume;
        }),
        opacity: 0.45,
      });
      lineSeries.push({
        id: "trade-settlement-dayahead-compare",
        label: "对比日前用户侧统一结算价格",
        color: "#FFC39E",
        values: compareRows.map(function mapRow(row) {
          return row.dayAheadSettlementPrice;
        }),
      });
      lineSeries.push({
        id: "trade-settlement-realtime-compare",
        label: "对比实时用户侧统一结算价格",
        color: "#A7E7CC",
        values: compareRows.map(function mapRow(row) {
          return row.realTimeSettlementPrice;
        }),
      });
    }

    return renderMixedBarLineChart({
      chartId: "trade-result-mixed-chart-" + getSelectedTradeCenterKey(),
      labels: rows.map(function mapRow(row) {
        return row.time;
      }),
      barSeries: barSeries,
      lineSeries: lineSeries,
      hiddenSeries: getChartHiddenState("trade-result-mixed-chart-" + getSelectedTradeCenterKey()),
      leftUnit: "MWh",
      rightUnit: "元/MWh",
      tooltipFormatter: function tooltipFormatter(_, index) {
        var row = rows[index] || {};
        var lines = [
          "时刻 " + (row.time || "--"),
          "日前成交电量 " + (typeof row.dayAheadVolume === "number" ? formatInteger(row.dayAheadVolume) : "--"),
          "实时成交电量 " + (typeof row.realTimeVolume === "number" ? formatInteger(row.realTimeVolume) : "--"),
          "日前用户侧统一结算价格 " +
            (typeof row.dayAheadSettlementPrice === "number" ? formatDecimal(row.dayAheadSettlementPrice) : "--"),
          "实时用户侧统一结算价格 " +
            (typeof row.realTimeSettlementPrice === "number" ? formatDecimal(row.realTimeSettlementPrice) : "--"),
        ];

        if (compareRows.length) {
          var compareRow = compareRows[index] || {};
          lines.push(
            "对比日前成交电量 " +
              (typeof compareRow.dayAheadVolume === "number" ? formatInteger(compareRow.dayAheadVolume) : "--")
          );
          lines.push(
            "对比实时成交电量 " +
              (typeof compareRow.realTimeVolume === "number" ? formatInteger(compareRow.realTimeVolume) : "--")
          );
          lines.push(
            "对比日前用户侧统一结算价格 " +
              (typeof compareRow.dayAheadSettlementPrice === "number"
                ? formatDecimal(compareRow.dayAheadSettlementPrice)
                : "--")
          );
          lines.push(
            "对比实时用户侧统一结算价格 " +
              (typeof compareRow.realTimeSettlementPrice === "number"
                ? formatDecimal(compareRow.realTimeSettlementPrice)
                : "--")
          );
        }

        return lines.join("\n");
      },
      xLabelEvery: 2,
    });
  }

  function getTradeNodePriceSeries() {
    var dataset = getTradeResultNodePriceDataset();
    var selectedNode = getSelectedTradeNode();
    var nodes = (dataset && dataset.nodes) || [];
    var matchedNode = nodes.find(function findNode(node) {
      return node.nodeName === selectedNode;
    });
    var provinceNode = getTradeResultProvinceNode(dataset);

    return matchedNode || provinceNode || { nodeName: selectedNode, points: [] };
  }

  function getTradeNodePriceTable() {
    var nodeSeries = getTradeNodePriceSeries();
    return {
      columns: [
        { key: "time", label: "时刻" },
        { key: "dayAheadNodePrice", label: "日前节点电价（元/MWh）" },
        { key: "realTimeNodePrice", label: "实时节点电价（元/MWh）" },
        { key: "spread", label: "价差（元/MWh）" },
      ],
      rows: (nodeSeries.points || []).map(function mapPoint(point) {
        return {
          time: point.time,
          dayAheadNodePrice: createTradeTableCell(point.dayAheadNodePrice, formatDecimal),
          realTimeNodePrice: createTradeTableCell(point.realTimeNodePrice, formatDecimal),
          spread: createTradeSpreadCell(calculateTradeSpread(point.dayAheadNodePrice, point.realTimeNodePrice)),
        };
      }),
      minWidth: 1120,
    };
  }

  function renderTradeNodeSidebar() {
    var visibleNodes = getTradeResultNodeLabels();
    var selectedNode = getSelectedTradeNode();
    var keyword = String(state.tradeResult.filters.nodeKeyword || "").trim();
    var provinceItems = visibleNodes.indexOf("全省") >= 0 ? [{ id: "全省", label: "全省" }] : [];
    var otherNodes = visibleNodes.filter(function filterNode(label) {
      return label !== "全省";
    });

    if (!provinceItems.length) {
      provinceItems.push({ id: "全省", label: "全省" });
    }

    return renderMarketNodeSidebar({
      selectedNode: selectedNode,
      provinceItems: provinceItems,
      otherItems: otherNodes.map(function mapNode(label) {
        return { id: label, label: label };
      }),
      keyword: keyword,
    });
  }

  function renderTradeResultFilterBar() {
    var activeTab = state.tradeResult.activeTab;
    var fieldsHtml = "";

    if (activeTab === "节点电价") {
      fieldsHtml =
        '<div class="info-filter-field"><span class="filter-label">运行日期：</span>' +
        renderInfoDatePicker("trade-node-runtime", "single") +
        "</div>";
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
        getTradeResultNoCompareHint("全省统一出清价") +
        getTradeResultUnifiedChart() +
        renderDataTablePro({
          tableId: "trade-result-price-table",
          columns: priceTable.columns,
          rows: priceTable.rows,
          minWidth: priceTable.minWidth,
          enableColumnDrag: true,
          columnOrder: getTableColumnOrder("trade-result-price-table"),
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
        getTradeResultNoCompareHint("交易结果") +
        getTradeResultMixedChart() +
        renderDataTablePro({
          tableId: "trade-result-mixed-table",
          columns: mixedTable.columns,
          rows: mixedTable.rows,
          minWidth: mixedTable.minWidth,
          enableColumnDrag: true,
          columnOrder: getTableColumnOrder("trade-result-mixed-table"),
          sortState: getTableSortState("trade-result-mixed-table"),
          escapeHtml: escapeHtml,
          renderIcon: renderIcon,
          renderEmptyState: renderEmptyState,
        }) +
        "</div></section>"
      );
    }

    var nodeTable = getTradeNodePriceTable();
    var nodeSeries = getTradeNodePriceSeries();
    return (
      '<section class="panel chart-panel"><div class="chart-layout chart-layout-node">' +
      renderTradeNodeSidebar() +
      '<div class="chart-main">' +
      renderChartWithMarks({
        chartId: "trade-node-price-chart",
        title: getSelectedTradeNode(),
        labels: (nodeSeries.points || []).map(function mapPoint(point) {
          return point.time;
        }),
        unit: "元/MWh",
        series: [
          {
            id: "trade-node-dayahead",
            label: "日前节点电价",
            color: "#1677FF",
            values: (nodeSeries.points || []).map(function mapPoint(point) {
              return point.dayAheadNodePrice;
            }),
          },
          {
            id: "trade-node-realtime",
            label: "实时节点电价",
            color: "#2FCB8F",
            values: (nodeSeries.points || []).map(function mapPoint(point) {
              return point.realTimeNodePrice;
            }),
          },
        ],
        hiddenSeries: getChartHiddenState("trade-node-price-chart"),
        tooltipFormatter: function tooltipFormatter(_, index) {
          var point = (nodeSeries.points || [])[index] || {};
          return [
            "节点名称 " + getSelectedTradeNode(),
            "时刻 " + (point.time || "--"),
            "日前节点电价 " + (typeof point.dayAheadNodePrice === "number" ? formatDecimal(point.dayAheadNodePrice) : "--"),
            "实时节点电价 " + (typeof point.realTimeNodePrice === "number" ? formatDecimal(point.realTimeNodePrice) : "--"),
            "价差 " + (typeof point.spread === "number" ? formatDecimal(point.spread) : "--"),
          ].join("\n");
        },
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
        xLabelEvery: 8,
      }) +
      renderDataTablePro({
        tableId: "trade-node-price-table",
        columns: nodeTable.columns,
        rows: nodeTable.rows,
        minWidth: nodeTable.minWidth,
        enableColumnDrag: true,
        columnOrder: getTableColumnOrder("trade-node-price-table"),
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
	    var status = getTradeResultStatusByTab(state.tradeResult.activeTab);

    return (
      renderMarketPageHeader(tradeMock.title || "用电侧交易结果", renderPageTabs(tradeMock.tabs || [], state.tradeResult.activeTab)) +
      renderTradeResultFilterBar() +
	      renderDownloadOnlyBar(status, isTradeResultCompareSupported(), { withMore: true }) +
      renderTradeResultContent() +
      "</div>"
    );
  }

  var MONTHLY_SETTLEMENT_SIDES = ["购电侧", "售电侧"];

  var hunanMonthlySettlementColumns = [
    { key: "seq", label: "序号", fixed: true, width: 72 },
    { key: "sellerCompanyName", label: "售电公司名称", fixed: true, width: 220 },
    { key: "cityPowerCompany", label: "地市供电公司", fixed: true, width: 160 },
    { key: "userCode", label: "用户编号", fixed: true, width: 138 },
    { key: "userName", label: "用户名称", fixed: true, width: 220 },
    { key: "userCategory", label: "用户类别", width: 132 },
    {
      label: "市场化用电量",
      children: [
        { key: "marketTotal", label: "总", type: "energy", summary: "sum", width: 108 },
        { key: "marketSharp", label: "尖", type: "energy", summary: "sum", width: 92 },
        { key: "marketPeak", label: "峰", type: "energy", summary: "sum", width: 92 },
        { key: "marketFlat", label: "平", type: "energy", summary: "sum", width: 92 },
        { key: "marketValley", label: "谷", type: "energy", summary: "sum", width: 92 },
      ],
    },
    {
      label: "其中：结算省内电量",
      children: [
        { key: "provinceTotal", label: "总", type: "energy", summary: "sum", width: 108 },
        { key: "provinceSharp", label: "尖", type: "energy", summary: "sum", width: 92 },
        { key: "provincePeak", label: "峰", type: "energy", summary: "sum", width: 92 },
        { key: "provinceFlat", label: "平", type: "energy", summary: "sum", width: 92 },
        { key: "provinceValley", label: "谷", type: "energy", summary: "sum", width: 92 },
      ],
    },
    {
      label: "省内电量价差",
      children: [
        { key: "provinceSpreadTotal", label: "总", type: "price", width: 108 },
        { key: "provinceSpreadSharp", label: "尖", type: "price", width: 92 },
        { key: "provinceSpreadPeak", label: "峰", type: "price", width: 92 },
        { key: "provinceSpreadFlat", label: "平", type: "price", width: 92 },
        { key: "provinceSpreadValley", label: "谷", type: "price", width: 92 },
      ],
    },
    {
      label: "市场化价差电费",
      children: [
        { key: "marketFeeTotal", label: "总", type: "money", summary: "sum", width: 118 },
        { key: "marketFeeSharp", label: "尖", type: "money", summary: "sum", width: 98 },
        { key: "marketFeePeak", label: "峰", type: "money", summary: "sum", width: 98 },
        { key: "marketFeeFlat", label: "平", type: "money", summary: "sum", width: 98 },
        { key: "marketFeeValley", label: "谷", type: "money", summary: "sum", width: 98 },
      ],
    },
  ];

  var shaanxiMonthlySettlementColumns = [
    { key: "subjectCode", label: "结算科目编码", fixed: true, width: 142 },
    { key: "subjectName", label: "结算科目", fixed: true, width: 142 },
    { key: "retailUserName", label: "零售用户名称", fixed: true, width: 240 },
    { key: "accountOrMeterNo", label: "户号/电源编号/计量点编号", fixed: true, width: 190 },
    { key: "contractPeriod", label: "合同时段", fixed: true, width: 210 },
    { key: "actualUsage", label: "实际用电量", type: "energy", summary: "sum", width: 128 },
    { key: "contractPower", label: "合同电量", type: "energy", summary: "sum", width: 118 },
    { key: "settlementPowerOrCapacity", label: "结算电量/容量", type: "energy", summary: "sum", width: 142 },
    { key: "settlementPrice", label: "结算电价", type: "price", width: 118 },
    { key: "settlementFee", label: "结算电费", type: "money", summary: "sum", width: 128 },
    { key: "remark", label: "备注", width: 120 },
  ];

  var hunanMonthlySettlementFilters = [
    { type: "text", label: "用户编号", fieldKey: "monthlyRetailUserCode", rowKey: "userCode", placeholder: "请输入用户编号" },
    { type: "text", label: "用户名称", fieldKey: "monthlyRetailUserName", rowKey: "userName", placeholder: "请输入用户名称" },
    { type: "select", label: "地市供电公司", fieldKey: "monthlyRetailCity", rowKey: "cityPowerCompany" },
    { type: "select", label: "用户类别", fieldKey: "monthlyRetailCategory", rowKey: "userCategory" },
    { type: "range", label: "电量区间", minKey: "monthlyRetailEnergyMin", maxKey: "monthlyRetailEnergyMax", rowKey: "marketTotal" },
    { type: "range", label: "电费区间", minKey: "monthlyRetailFeeMin", maxKey: "monthlyRetailFeeMax", rowKey: "marketFeeTotal" },
  ];

  var shaanxiMonthlySettlementFilters = [
    { type: "text", label: "户号/电源编号/计量点编号", fieldKey: "monthlyRetailUserCode", rowKey: "accountOrMeterNo", placeholder: "请输入户号或计量点编号" },
    { type: "text", label: "用户名称", fieldKey: "monthlyRetailUserName", rowKey: "retailUserName", placeholder: "请输入用户名称" },
    { type: "range", label: "电量区间", minKey: "monthlyRetailEnergyMin", maxKey: "monthlyRetailEnergyMax", rowKey: "settlementPowerOrCapacity" },
    { type: "range", label: "电费区间", minKey: "monthlyRetailFeeMin", maxKey: "monthlyRetailFeeMax", rowKey: "settlementFee" },
  ];

  var hunanMonthlySettlementRetailRows = [
    { seq: 1, sellerCompanyName: "北京小桔新能源汽车科技有限公司", cityPowerCompany: "国网长沙供电公司", userCode: "4303115926887", userName: "湖南优车新能源有限公司", userCategory: "其它市场用户", marketTotal: 55.09, marketSharp: 0, marketPeak: 0, marketFlat: 0, marketValley: 0, provinceTotal: 55.09, provinceSharp: 0, provincePeak: 0, provinceFlat: 0, provinceValley: 0, provinceSpreadTotal: 260.361, marketFeeTotal: 14343.29, marketFeeSharp: 0, marketFeePeak: 0, marketFeeFlat: 0, marketFeeValley: 0 },
    { seq: 2, sellerCompanyName: "北京小桔新能源汽车科技有限公司", cityPowerCompany: "国网长沙供电公司", userCode: "4303118459252", userName: "湖南白鹿巷新能源有限责任公司", userCategory: "其它市场用户", marketTotal: 57.87, marketSharp: 0, marketPeak: 0, marketFlat: 0, marketValley: 0, provinceTotal: 57.87, provinceSharp: 0, provincePeak: 0, provinceFlat: 0, provinceValley: 0, provinceSpreadTotal: 260.361, marketFeeTotal: 15067.09, marketFeeSharp: 0, marketFeePeak: 0, marketFeeFlat: 0, marketFeeValley: 0 },
    { seq: 3, sellerCompanyName: "北京小桔新能源汽车科技有限公司", cityPowerCompany: "国网长沙供电公司", userCode: "4303119243463", userName: "湖南优车新能源有限公司", userCategory: "其它市场用户", marketTotal: 24.28, marketSharp: 0, marketPeak: 0, marketFlat: 0, marketValley: 0, provinceTotal: 24.28, provinceSharp: 0, provincePeak: 0, provinceFlat: 0, provinceValley: 0, provinceSpreadTotal: 260.361, marketFeeTotal: 6321.57, marketFeeSharp: 0, marketFeePeak: 0, marketFeeFlat: 0, marketFeeValley: 0 },
    { seq: 4, sellerCompanyName: "北京小桔新能源汽车科技有限公司", cityPowerCompany: "国网长沙供电公司", userCode: "4303121158849", userName: "湖南长云新能源有限公司", userCategory: "其它市场用户", marketTotal: 43.63, marketSharp: 0, marketPeak: 0, marketFlat: 0, marketValley: 0, provinceTotal: 43.63, provinceSharp: 0, provincePeak: 0, provinceFlat: 0, provinceValley: 0, provinceSpreadTotal: 260.361, marketFeeTotal: 11359.55, marketFeeSharp: 0, marketFeePeak: 0, marketFeeFlat: 0, marketFeeValley: 0 },
    { seq: 5, sellerCompanyName: "北京小桔新能源汽车科技有限公司", cityPowerCompany: "国网长沙供电公司", userCode: "4303121200843", userName: "湖南长云新能源有限公司", userCategory: "其它市场用户", marketTotal: 64.62, marketSharp: 0, marketPeak: 0, marketFlat: 0, marketValley: 0, provinceTotal: 64.62, provinceSharp: 0, provincePeak: 0, provinceFlat: 0, provinceValley: 0, provinceSpreadTotal: 260.361, marketFeeTotal: 16824.53, marketFeeSharp: 0, marketFeePeak: 0, marketFeeFlat: 0, marketFeeValley: 0 },
    { seq: 6, sellerCompanyName: "北京小桔新能源汽车科技有限公司", cityPowerCompany: "国网长沙供电公司", userCode: "4303121254228", userName: "湖南优车新能源有限公司", userCategory: "其它市场用户", marketTotal: 119.085, marketSharp: 0, marketPeak: 0, marketFlat: 0, marketValley: 0, provinceTotal: 119.085, provinceSharp: 0, provincePeak: 0, provinceFlat: 0, provinceValley: 0, provinceSpreadTotal: 260.361, marketFeeTotal: 31005.09, marketFeeSharp: 0, marketFeePeak: 0, marketFeeFlat: 0, marketFeeValley: 0 },
    { seq: 7, sellerCompanyName: "北京小桔新能源汽车科技有限公司", cityPowerCompany: "国网长沙供电公司", userCode: "4303121287116", userName: "湖南途途快充科技有限公司", userCategory: "其它市场用户", marketTotal: 77.595, marketSharp: 0, marketPeak: 0, marketFlat: 0, marketValley: 0, provinceTotal: 77.595, provinceSharp: 0, provincePeak: 0, provinceFlat: 0, provinceValley: 0, provinceSpreadTotal: 260.361, marketFeeTotal: 20202.71, marketFeeSharp: 0, marketFeePeak: 0, marketFeeFlat: 0, marketFeeValley: 0 },
    { seq: 8, sellerCompanyName: "北京小桔新能源汽车科技有限公司", cityPowerCompany: "国网长沙供电公司", userCode: "4303121741467", userName: "湖南优车新能源有限公司", userCategory: "其它市场用户", marketTotal: 79.41, marketSharp: 0, marketPeak: 0, marketFlat: 0, marketValley: 0, provinceTotal: 79.41, provinceSharp: 0, provincePeak: 0, provinceFlat: 0, provinceValley: 0, provinceSpreadTotal: 260.361, marketFeeTotal: 20675.27, marketFeeSharp: 0, marketFeePeak: 0, marketFeeFlat: 0, marketFeeValley: 0 },
    { seq: 9, sellerCompanyName: "北京小桔新能源汽车科技有限公司", cityPowerCompany: "国网长沙供电公司", userCode: "4303121924688", userName: "湖南长云新能源有限公司", userCategory: "其它市场用户", marketTotal: 0, marketSharp: 0, marketPeak: 0, marketFlat: 0, marketValley: 0, provinceTotal: 0, provinceSharp: 0, provincePeak: 0, provinceFlat: 0, provinceValley: 0, provinceSpreadTotal: null, marketFeeTotal: 0, marketFeeSharp: 0, marketFeePeak: 0, marketFeeFlat: 0, marketFeeValley: 0 },
    { seq: 10, sellerCompanyName: "北京小桔新能源汽车科技有限公司", cityPowerCompany: "国网长沙供电公司", userCode: "4303121973941", userName: "湖南景充科技有限公司", userCategory: "其它市场用户", marketTotal: 76.095, marketSharp: 0, marketPeak: 0, marketFlat: 0, marketValley: 0, provinceTotal: 76.095, provinceSharp: 0, provincePeak: 0, provinceFlat: 0, provinceValley: 0, provinceSpreadTotal: 260.361, marketFeeTotal: 19812.17, marketFeeSharp: 0, marketFeePeak: 0, marketFeeFlat: 0, marketFeeValley: 0 },
    { seq: 11, sellerCompanyName: "北京小桔新能源汽车科技有限公司", cityPowerCompany: "国网长沙供电公司", userCode: "4303122966953", userName: "长沙车库电桩科技有限公司", userCategory: "其它市场用户", marketTotal: 80.025, marketSharp: 0, marketPeak: 0, marketFlat: 0, marketValley: 0, provinceTotal: 80.025, provinceSharp: 0, provincePeak: 0, provinceFlat: 0, provinceValley: 0, provinceSpreadTotal: 257.757, marketFeeTotal: 20627, marketFeeSharp: 0, marketFeePeak: 0, marketFeeFlat: 0, marketFeeValley: 0 },
    { seq: 12, sellerCompanyName: "北京小桔新能源汽车科技有限公司", cityPowerCompany: "国网长沙供电公司", userCode: "4303123271278", userName: "湖南星投新能源有限公司", userCategory: "其它市场用户", marketTotal: 46.905, marketSharp: 0, marketPeak: 0, marketFlat: 0, marketValley: 0, provinceTotal: 46.905, provinceSharp: 0, provincePeak: 0, provinceFlat: 0, provinceValley: 0, provinceSpreadTotal: 260.361, marketFeeTotal: 12212.23, marketFeeSharp: 0, marketFeePeak: 0, marketFeeFlat: 0, marketFeeValley: 0 },
  ];

  var shaanxiMonthlySettlementRetailRows = [
    { subjectCode: "010102031105", subjectName: "常规企业-时段1", retailUserName: "大荔县双宇心新能源服务有限公司", accountOrMeterNo: "6103882654734", contractPeriod: "2026-01-01 至 2026-12-31", actualUsage: 0.662, contractPower: null, settlementPowerOrCapacity: 0.662, settlementPrice: 360.136, settlementFee: 238.41, remark: "" },
    { subjectCode: "010102031105", subjectName: "常规企业-时段1", retailUserName: "西安尚稷商业运营管理有限公司", accountOrMeterNo: "6103882654734", contractPeriod: "2026-01-01 至 2026-12-31", actualUsage: 6.449, contractPower: null, settlementPowerOrCapacity: 6.449, settlementPrice: 360.135, settlementFee: 2322.51, remark: "" },
    { subjectCode: "010102031105", subjectName: "常规企业-时段1", retailUserName: "陕西皓跃科技有限公司", accountOrMeterNo: "6103882654734", contractPeriod: "2026-01-01 至 2026-12-31", actualUsage: 3.296, contractPower: null, settlementPowerOrCapacity: 3.296, settlementPrice: 358.134, settlementFee: 1180.41, remark: "" },
    { subjectCode: "010102031105", subjectName: "常规企业-时段1", retailUserName: "碧辟小桔新能源（深圳）有限责任公司", accountOrMeterNo: "6103882654734", contractPeriod: "2026-01-01 至 2026-12-31", actualUsage: 5.509, contractPower: null, settlementPowerOrCapacity: 5.509, settlementPrice: 355.135, settlementFee: 1956.44, remark: "" },
    { subjectCode: "010102031105", subjectName: "常规企业-时段1", retailUserName: "中建科工集团智慧停车科技有限公司", accountOrMeterNo: "6103882654734", contractPeriod: "2026-01-01 至 2026-12-31", actualUsage: 12.684, contractPower: null, settlementPowerOrCapacity: 12.684, settlementPrice: 357.135, settlementFee: 4529.9, remark: "" },
    { subjectCode: "010102031105", subjectName: "常规企业-时段1", retailUserName: "大荔县鑫旭新能源有限公司", accountOrMeterNo: "6103882654734", contractPeriod: "2026-01-01 至 2026-12-31", actualUsage: 0.757, contractPower: null, settlementPowerOrCapacity: 0.757, settlementPrice: 360.132, settlementFee: 272.62, remark: "" },
    { subjectCode: "010102031105", subjectName: "常规企业-时段1", retailUserName: "陕西永沣聚星新能源科技有限公司", accountOrMeterNo: "6103882654734", contractPeriod: "2026-01-01 至 2026-12-31", actualUsage: 3.555, contractPower: null, settlementPowerOrCapacity: 3.555, settlementPrice: 360.135, settlementFee: 1280.28, remark: "" },
    { subjectCode: "010102031105", subjectName: "常规企业-时段1", retailUserName: "陕西九电新能源有限责任公司", accountOrMeterNo: "6103882654734", contractPeriod: "2026-01-01 至 2026-12-31", actualUsage: 0.78, contractPower: null, settlementPowerOrCapacity: 0.78, settlementPrice: 360.141, settlementFee: 280.91, remark: "" },
    { subjectCode: "010102031105", subjectName: "常规企业-时段1", retailUserName: "陕西众成智慧能源有限公司", accountOrMeterNo: "6103882654734", contractPeriod: "2026-01-01 至 2026-12-31", actualUsage: 24.032, contractPower: null, settlementPowerOrCapacity: 24.032, settlementPrice: 356.135, settlementFee: 8558.64, remark: "" },
    { subjectCode: "010102031105", subjectName: "常规企业-时段1", retailUserName: "西安行必达共享服务有限公司", accountOrMeterNo: "6103882654734", contractPeriod: "2026-01-01 至 2026-12-31", actualUsage: 0.067, contractPower: null, settlementPowerOrCapacity: 0.067, settlementPrice: 358.209, settlementFee: 24, remark: "" },
    { subjectCode: "010102031105", subjectName: "常规企业-时段1", retailUserName: "西安碧辟小桔新能源有限责任公司", accountOrMeterNo: "6103882654734", contractPeriod: "2026-01-01 至 2026-12-31", actualUsage: 49.189, contractPower: null, settlementPowerOrCapacity: 49.189, settlementPrice: 355.135, settlementFee: 17468.74, remark: "" },
    { subjectCode: "010102031106", subjectName: "常规企业-时段2", retailUserName: "大荔县双宇心新能源服务有限公司", accountOrMeterNo: "6103882654734", contractPeriod: "2026-01-01 至 2026-12-31", actualUsage: 0.3, contractPower: null, settlementPowerOrCapacity: 0.3, settlementPrice: 305.533, settlementFee: 91.66, remark: "" },
  ];

  var monthlySettlementProvinceConfigs = {
    hunan: {
      centerName: "湖南交易中心",
      sellerCompanyName: "北京小桔新能源汽车科技有限公司",
      columns: hunanMonthlySettlementColumns,
      filters: hunanMonthlySettlementFilters,
      rows: hunanMonthlySettlementRetailRows,
      summaryLabelKey: "userCode",
      minWidth: 3250,
    },
    shaanxi: {
      centerName: "陕西交易中心",
      sellerCompanyName: "北京小桔新能源汽车科技有限公司",
      columns: shaanxiMonthlySettlementColumns,
      filters: shaanxiMonthlySettlementFilters,
      rows: shaanxiMonthlySettlementRetailRows,
      summaryLabelKey: "subjectCode",
      minWidth: 1680,
    },
  };

  function getSettlementMock() {
    return getMarketPageData("settlement") || {};
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

  function getDailySettlementPageData() {
    return getSettlementViewPageData("日清算", "");
  }

  function getDailySettlementColumnLabel(column) {
    return (column && (column.label || column.title || column.key)) || "";
  }

  function getDailySettlementColumnWidth(column) {
    var label = getDailySettlementColumnLabel(column);

    if (/^(?:[0-9]|1[0-9]|2[0-3])时$/.test(label)) {
      return 86;
    }
    if (label === "企业名称" || label === "售电公司名称") {
      return 240;
    }
    if (label === "结算单元名称") {
      return 280;
    }
    if (label === "结算类型名称") {
      return 164;
    }
    if (label === "数据类型") {
      return 112;
    }
    if (label === "日期" || label === "结算日期") {
      return 132;
    }
    if (label === "企业编码") {
      return 128;
    }
    if (label === "合计值") {
      return 118;
    }
    if (label.indexOf("电价") >= 0 || label.indexOf("参考点") >= 0) {
      return 156;
    }
    if (label.indexOf("电费") >= 0 || label.indexOf("费用") >= 0) {
      return 138;
    }
    if (label.indexOf("电量") >= 0 || label.indexOf("容量") >= 0) {
      return 140;
    }

    return Math.min(Math.max(label.length * 18 + 36, 116), 220);
  }

  function isDailySettlementFixedColumn(column) {
    var label = getDailySettlementColumnLabel(column);
    return [
      "日期",
      "结算日期",
      "结算类型名称",
      "数据类型",
      "企业编码",
      "企业名称",
      "售电公司名称",
      "结算单元名称",
    ].indexOf(label) >= 0;
  }

  function getDailySettlementColumns(pageData) {
    var sourceColumns = (pageData && pageData.tableColumns) || [];

    if (!sourceColumns.length && pageData && pageData.tableData && pageData.tableData.length) {
      sourceColumns = Object.keys(pageData.tableData[0]).map(function mapKey(key) {
        return { key: key, title: key };
      });
    }

    return sourceColumns.map(function mapColumn(column, index) {
      var label = getDailySettlementColumnLabel(column);
      return {
        key: column.key || label || "col-" + index,
        label: label,
        sortable: column.sortable !== false,
        fixed: isDailySettlementFixedColumn(column),
        width: getDailySettlementColumnWidth(column),
      };
    });
  }

  function getDailySettlementFieldValue(row, columns, labels, keys) {
    var source = row || {};
    var keyIndex;
    var columnIndex;
    var labelIndex;

    for (keyIndex = 0; keyIndex < (keys || []).length; keyIndex += 1) {
      if (source[keys[keyIndex]] !== undefined && source[keys[keyIndex]] !== null && source[keys[keyIndex]] !== "") {
        return source[keys[keyIndex]];
      }
    }

    for (columnIndex = 0; columnIndex < (columns || []).length; columnIndex += 1) {
      var column = columns[columnIndex];
      var label = getDailySettlementColumnLabel(column);
      if ((labels || []).indexOf(label) >= 0 && source[column.key] !== undefined && source[column.key] !== null && source[column.key] !== "") {
        return source[column.key];
      }
    }

    for (labelIndex = 0; labelIndex < (labels || []).length; labelIndex += 1) {
      if (source[labels[labelIndex]] !== undefined && source[labels[labelIndex]] !== null && source[labels[labelIndex]] !== "") {
        return source[labels[labelIndex]];
      }
    }

    return "";
  }

  function getDailySettlementResultDate(row, pageData) {
    return getDailySettlementFieldValue(row, getDailySettlementColumns(pageData), ["日期", "结算日期"], ["settlementDate", "date", "day", "tradeDate"]);
  }

  function getDailySettlementResultType(row, pageData) {
    return getDailySettlementFieldValue(row, getDailySettlementColumns(pageData), ["结算类型名称", "结算类型"], ["settlementTypeName", "settlementType", "statementType", "typeName"]);
  }

  function getDailySettlementResultDataType(row, pageData) {
    return getDailySettlementFieldValue(row, getDailySettlementColumns(pageData), ["数据类型"], ["dataType", "dataCategory", "fileDataType"]);
  }

  function getDailySettlementFilterOptions(filterKind) {
    var pageData = getDailySettlementPageData();
    var rows = pageData.tableData || [];
    var getter = filterKind === "dataType" ? getDailySettlementResultDataType : getDailySettlementResultType;
    var seen = {};
    var options = [];

    rows.forEach(function eachRow(row) {
      var value = getter(row, pageData);
      if (value && !seen[value]) {
        seen[value] = true;
        options.push(value);
      }
    });

    if (!options.length && pageData.filters) {
      options = filterKind === "dataType" ? pageData.filters.dataTypeOptions || [] : pageData.filters.settlementTypeOptions || [];
      options = options.filter(function filterOption(option) {
        return option && option !== "全部";
      });
    }

    return ["全部"].concat(options);
  }

  function ensureDailySettlementFilterValue(fieldKey, options) {
    if ((options || []).indexOf(state.settlement.filters[fieldKey]) < 0) {
      state.settlement.filters[fieldKey] = "全部";
    }
    return state.settlement.filters[fieldKey];
  }

  function matchesDailySettlementFilterValue(value, selectedValue) {
    return !selectedValue || selectedValue === "全部" || value === selectedValue;
  }

  function getDailySettlementResultRows() {
    var pageData = getDailySettlementPageData();
    var filters = state.settlement.filters;
    var typeFilter = filters.dailyStatementType;
    var dataTypeFilter = filters.dailyDataType;

    return (pageData.tableData || []).filter(function filterRow(row) {
      var dateValue = getDailySettlementResultDate(row, pageData);
      var typeValue = getDailySettlementResultType(row, pageData);
      var dataTypeValue = getDailySettlementResultDataType(row, pageData);

      return (
        isDateWithinRange(dateValue, filters.dailyRange) &&
        matchesDailySettlementFilterValue(typeValue, typeFilter) &&
        matchesDailySettlementFilterValue(dataTypeValue, dataTypeFilter)
      );
    });
  }

  function getSettlementDailyRows() {
    return getDailySettlementResultRows();
  }

  function getSettlementSummaryCards() {
    return buildDailySettlementMetricCards(getDailySettlementResultRows());
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

  function normalizeSettlementMonth(value) {
    var text = String(value || "").trim();
    if (/^\d{6}$/.test(text)) {
      return text.slice(0, 4) + "-" + text.slice(4, 6);
    }
    if (/^\d{4}[-/]\d{1,2}$/.test(text)) {
      var parts = text.replace("/", "-").split("-");
      return parts[0] + "-" + String(parts[1]).padStart(2, "0");
    }
    if (/^\d{4}-\d{2}/.test(text)) {
      return text.slice(0, 7);
    }
    return text;
  }

  function getMonthlySettlementDataList() {
    var bundle = getTradeCenterMockBundle(getSelectedTradeCenterKey()) || {};
    var settlement = bundle.settlement || {};
    var rawData = settlement.monthlySettlementData;
    var byMonth = settlement.monthlySettlementDataByMonth;

    if (Array.isArray(rawData)) {
      return rawData;
    }
    if (rawData && typeof rawData === "object") {
      return [rawData];
    }
    if (byMonth && typeof byMonth === "object") {
      return Object.keys(byMonth).map(function mapMonth(key) {
        return byMonth[key];
      });
    }
    return [];
  }

  function getMonthlySettlementDefaultData() {
    var list = getMonthlySettlementDataList();
    return list[0] || null;
  }

  function getMonthlySettlementActiveData() {
    var list = getMonthlySettlementDataList();
    var selectedMonth = normalizeSettlementMonth(state.settlement.filters.monthlyMonth);
    var matchedData = null;

    list.some(function findMonth(data) {
      if (normalizeSettlementMonth(data && data.month) === selectedMonth) {
        matchedData = data;
        return true;
      }
      return false;
    });

    return matchedData || getMonthlySettlementDefaultData();
  }

  function isMonthlySettlementSelectedMonthAvailable(data) {
    return Boolean(data && normalizeSettlementMonth(data.month) === normalizeSettlementMonth(getMonthlySettlementRunMonth()));
  }

  function getMonthlySettlementSideKey(side) {
    return side === "售电侧" ? "saleSide" : "purchaseSide";
  }

  function getMonthlySettlementActiveSide(data) {
    if (!data || !data.hasPurchaseSaleSide) {
      return "购电侧";
    }
    if (MONTHLY_SETTLEMENT_SIDES.indexOf(state.settlement.monthlySide) < 0) {
      state.settlement.monthlySide = MONTHLY_SETTLEMENT_SIDES[0];
    }
    if (state.settlement.monthlySide === "售电侧" && !data.saleSide) {
      state.settlement.monthlySide = "购电侧";
    }
    return state.settlement.monthlySide;
  }

  function getMonthlySettlementActiveSideData(data) {
    var activeSide = getMonthlySettlementActiveSide(data);
    return (data && data[getMonthlySettlementSideKey(activeSide)]) || (data && data.purchaseSide) || {};
  }

  function getSettlementDefaultMonth() {
    var monthlyData = getMonthlySettlementDefaultData();
    if (monthlyData && monthlyData.month) {
      return normalizeSettlementMonth(monthlyData.month);
    }
    var pageData = getSettlementViewPageData("月结算", "售电公司");
    return (pageData.settlementSummary && pageData.settlementSummary.settlementMonth) || (pageData.filters && pageData.filters.month) || "2026-05";
  }

  function syncSettlementStateForTradeCenter() {
    var centerKey = getSelectedTradeCenterKey();
    var isFirstSync = !state.settlement.centerKey;

    if (!isFirstSync && state.settlement.centerKey === centerKey) {
      if (state.settlement.activeTab === "月结算") {
        getMonthlySettlementActiveSide(getMonthlySettlementActiveData());
      }
      return;
    }

    state.settlement.centerKey = centerKey;

    var secondaryOptions = getSettlementSecondaryOptions();
    state.settlement.secondaryTab =
      centerKey === "guangdong"
        ? ""
        : secondaryOptions.indexOf(state.settlement.secondaryTab) >= 0
          ? state.settlement.secondaryTab
          : secondaryOptions[0];
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
    state.settlement.monthlySide = "购电侧";
    clearMonthlyRetailFilters();
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

  function formatFixedNumber(value, digits) {
    return Number(value || 0).toLocaleString("zh-CN", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function getFiniteNumber(value) {
    if (value === null || value === undefined || value === "" || value === "--") {
      return null;
    }

    var numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  function getFirstFiniteNumber(source, keys) {
    var target = source || {};

    for (var index = 0; index < keys.length; index += 1) {
      var numericValue = getFiniteNumber(target[keys[index]]);

      if (numericValue !== null) {
        return numericValue;
      }
    }

    return null;
  }

  function getFirstFiniteNumberFromRows(rows, keys) {
    for (var index = 0; index < (rows || []).length; index += 1) {
      var numericValue = getFirstFiniteNumber(rows[index], keys);

      if (numericValue !== null) {
        return numericValue;
      }
    }

    return null;
  }

  function formatTruncatedSettlementMetricValue(value, digits) {
    var numericValue = getFiniteNumber(value);

    if (numericValue === null) {
      return "--";
    }

    var sign = numericValue < 0 ? "-" : "";
    var absoluteText = Math.abs(numericValue).toLocaleString("en-US", {
      useGrouping: false,
      maximumFractionDigits: 20,
    });
    var parts = absoluteText.split(".");
    var integerText = Number(parts[0] || 0).toLocaleString("zh-CN");
    var decimalText = (parts[1] || "").slice(0, digits).padEnd(digits, "0");

    return sign + integerText + (digits > 0 ? "." + decimalText : "");
  }

  function getDailySettlementDate(row) {
    return (row && (row.settlementDate || row.date || row.day || row.tradeDate)) || "";
  }

  function getDateMonthKey(dateValue) {
    var text = String(dateValue || "");
    return /^\d{4}-\d{2}/.test(text) ? text.slice(0, 7) : "";
  }

  function isDailySettlementTotalRow(row) {
    return Boolean(
      row &&
        (row.period === "合计" ||
          row.timePoint === "合计" ||
          row.subjectCode === "合计" ||
          row.remark === "合计" ||
          row.subjectName === "售电公司月结算合计"),
    );
  }

  function getDailySettlementMetricRows(rows) {
    var detailRows = (rows || []).filter(function filterRow(row) {
      return !isDailySettlementTotalRow(row);
    });
    var activeMonth = getDateMonthKey(state.settlement.filters.dailyRange && state.settlement.filters.dailyRange.start);

    if (activeMonth) {
      var activeMonthRows = detailRows.filter(function filterByActiveMonth(row) {
        return getDateMonthKey(getDailySettlementDate(row)) === activeMonth;
      });

      if (activeMonthRows.length) {
        return activeMonthRows;
      }
    }

    var firstDataMonth = "";
    detailRows.some(function findMonth(row) {
      firstDataMonth = getDateMonthKey(getDailySettlementDate(row));
      return Boolean(firstDataMonth);
    });

    if (!firstDataMonth) {
      return detailRows;
    }

    return detailRows.filter(function filterByFirstMonth(row) {
      return getDateMonthKey(getDailySettlementDate(row)) === firstDataMonth;
    });
  }

  function sumDailyMetric(rows, mapper) {
    var hasValue = false;
    var total = (rows || []).reduce(function reduce(result, row) {
      var numericValue = mapper(row);

      if (numericValue === null) {
        return result;
      }

      hasValue = true;
      return result + numericValue;
    }, 0);

    return hasValue ? total : null;
  }

  function getDailyActualUsage(row) {
    return getFirstFiniteNumber(row, ["actualUsage", "energy", "settlementPower", "usage", "power"]);
  }

  function getDailyMediumLongTermTradingPower(row) {
    var directValue = getFirstFiniteNumber(row, [
      "mediumLongTermTradingPower",
      "mediumLongTermTradingVolume",
      "mediumLongTermVolume",
      "mediumLongTermContractVolume",
      "contractPower",
      "contractVolume",
    ]);

    if (directValue !== null) {
      return directValue;
    }

    var intraProvinceValue = getFiniteNumber(row && row.intraProvinceNetContractVolume);
    var interProvinceValue = getFiniteNumber(row && row.interProvinceNetContractVolume);

    if (intraProvinceValue !== null || interProvinceValue !== null) {
      return (intraProvinceValue || 0) + (interProvinceValue || 0);
    }

    return null;
  }

  function getDailyDataDateCount(rows) {
    var dateMap = {};

    (rows || []).forEach(function eachRow(row) {
      var dateValue = getDailySettlementDate(row);

      if (dateValue) {
        dateMap[dateValue] = true;
      }
    });

    return Object.keys(dateMap).length;
  }

  function getDailyTradeCostPrice(rows) {
    return getFirstFiniteNumberFromRows(rows, [
      "tradingCostPrice",
      "transactionCostPrice",
      "tradeCostPrice",
      "tradingCostPriceYuanPerMwh",
      "transactionCostPriceYuanPerMwh",
    ]);
  }

  function buildDailySettlementMetricCards(rows) {
    var metricRows = getDailySettlementMetricRows(rows);
    var monthlyActualUsage = getFirstFiniteNumberFromRows(metricRows, [
      "monthlyActualUsage",
      "currentMonthActualUsage",
      "actualMonthlyUsage",
    ]);
    if (monthlyActualUsage === null) {
      monthlyActualUsage = sumDailyMetric(metricRows, getDailyActualUsage);
    }

    var dataDateCount = getDailyDataDateCount(metricRows);
    var dailyAverageUsage = getFirstFiniteNumberFromRows(metricRows, ["dailyAverageUsage", "averageDailyUsage", "avgDailyUsage"]);
    if (dailyAverageUsage === null && monthlyActualUsage !== null && dataDateCount > 0) {
      dailyAverageUsage = monthlyActualUsage / dataDateCount;
    }

    var mediumLongTermTradingPower = getFirstFiniteNumberFromRows(metricRows, [
      "monthlyMediumLongTermTradingPower",
      "mediumLongTermMonthlyTradingPower",
      "mediumLongTermTradingPower",
    ]);
    if (mediumLongTermTradingPower === null) {
      mediumLongTermTradingPower = sumDailyMetric(metricRows, getDailyMediumLongTermTradingPower);
    }

    var mediumLongTermUsageRatio = getFirstFiniteNumberFromRows(metricRows, [
      "mediumLongTermUsageRatio",
      "mediumLongTermActualUsageRatio",
      "mediumLongTermRatio",
    ]);

    if (mediumLongTermUsageRatio === null && monthlyActualUsage !== null && monthlyActualUsage !== 0 && mediumLongTermTradingPower !== null) {
      mediumLongTermUsageRatio = (mediumLongTermTradingPower / monthlyActualUsage) * 100;
    }

    return [
      { label: "当月实际用电量", value: formatTruncatedSettlementMetricValue(monthlyActualUsage, 3), unit: "MWh", compact: false },
      { label: "日均用电量", value: formatTruncatedSettlementMetricValue(dailyAverageUsage, 3), unit: "MWh", compact: false },
      { label: "中长期交易电量", value: formatTruncatedSettlementMetricValue(mediumLongTermTradingPower, 3), unit: "MWh", compact: false },
      { label: "中长期占实际用电比例", value: formatTruncatedSettlementMetricValue(mediumLongTermUsageRatio, 3), unit: "%", compact: false },
      { label: "交易成本价", value: formatTruncatedSettlementMetricValue(getDailyTradeCostPrice(metricRows), 3), unit: "元/MWh", compact: false },
    ];
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

  function getDailySettlementCellDigits(column, row, pageData) {
    var label = getDailySettlementColumnLabel(column);
    var dataType = getDailySettlementResultDataType(row, pageData);

    if (dataType === "电费" || label.indexOf("电费") >= 0 || label.indexOf("费用") >= 0) {
      return 2;
    }
    if (dataType === "电价" || label.indexOf("电价") >= 0 || label.indexOf("参考点") >= 0 || label.indexOf("均价") >= 0) {
      return 3;
    }
    return 3;
  }

  function isDailySettlementNumericColumn(column, value, row, pageData) {
    var label = getDailySettlementColumnLabel(column);
    var dataType = getDailySettlementResultDataType(row, pageData);

    if (value === null || value === undefined || value === "" || value === "--" || Number.isNaN(Number(value))) {
      return false;
    }

    if (/^(?:[0-9]|1[0-9]|2[0-3])时$/.test(label)) {
      return true;
    }

    return (
      label === "合计值" ||
      dataType === "电量" ||
      dataType === "电价" ||
      dataType === "电费" ||
      label.indexOf("电量") >= 0 ||
      label.indexOf("用电量") >= 0 ||
      label.indexOf("电价") >= 0 ||
      label.indexOf("电费") >= 0 ||
      label.indexOf("费用") >= 0 ||
      label.indexOf("容量") >= 0 ||
      label.indexOf("价格") >= 0
    );
  }

  function getDailySettlementDisplayCellValue(row, column) {
    var value = row ? row[column.key] : "";

    if (column.key === "period" && row && row.timePoint && value && value !== "合计") {
      return value + " / " + row.timePoint;
    }

    return value;
  }

  function mapDailySettlementResultDisplayRow(row, columns, pageData) {
    var isTotalRow =
      isDailySettlementTotalRow(row) || String(getDailySettlementResultType(row, pageData) || "").indexOf("合计") >= 0;
    var totalClass = isTotalRow ? "settlement-total-cell" : "";
    var displayRow = {};

    columns.forEach(function eachColumn(column) {
      var value = getDailySettlementDisplayCellValue(row, column);

      if (isDailySettlementNumericColumn(column, value, row, pageData)) {
        displayRow[column.key] = createSettlementNullableNumberCell(value, getDailySettlementCellDigits(column, row, pageData), totalClass);
      } else {
        displayRow[column.key] = createSettlementTextCell(value, totalClass);
      }
    });

    return displayRow;
  }

  function buildDailySettlementResultTable(pageData, rows) {
    var columns = getDailySettlementColumns(pageData);
    var minWidth = columns.reduce(function accumulate(total, column) {
      return total + Number(column.width || 128);
    }, 0);

    return {
      columns: columns,
      rows: (rows || []).map(function mapRow(row) {
        return mapDailySettlementResultDisplayRow(row, columns, pageData);
      }),
      minWidth: Math.max(minWidth, 980),
      enableColumnDrag: false,
    };
  }

  function renderDailySettlementResultContent() {
    var pageData = getDailySettlementPageData();
    var rows = getDailySettlementResultRows();

    return (
      renderSummaryCards(buildDailySettlementMetricCards(rows), "summary-card-grid-5") +
      renderSettlementTableSection(
        "日清算结果",
        "settlement-daily-result-table-" + getSelectedTradeCenterKey(),
        buildDailySettlementResultTable(pageData, rows),
        "按当前筛选条件展示后端返回的日清算结果明细",
      )
    );
  }

  function formatSettlementMetricValue(value, digits) {
    if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) {
      return "--";
    }

    return formatFixedNumber(Number(value), digits);
  }

  function buildMonthlySettlementMetricCards(summary) {
    return [
      { label: "当年实际用电量", value: formatSettlementMetricValue(summary.annualActualUsage, 3), unit: "MWh", compact: false },
      { label: "中长期交易电量", value: formatSettlementMetricValue(summary.mediumLongTermTradingPower, 3), unit: "MWh", compact: false },
      { label: "中长期占实际用电比例", value: formatSettlementMetricValue(summary.mediumLongTermUsageRatio, 2), unit: "%", compact: false },
      { label: "度电收益", value: formatSettlementMetricValue(summary.unitRevenue, 2), unit: "厘", compact: false },
    ];
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
    return buildMonthlySettlementMetricCards(summary);
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

  function getShaanxiMonthlySettlementDetailRows() {
    var pageData = getSettlementViewPageData("月结算", "售电公司");
    var defaultMonth = (pageData.filters && pageData.filters.month) || "";

    if (state.settlement.filters.monthlyMonth !== defaultMonth) {
      return [];
    }

    return pageData.tableData || [];
  }

  function buildShaanxiMonthlySettlementSummaryCards(summary) {
    return buildMonthlySettlementMetricCards(summary);
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

  function getMonthlySettlementConfig() {
    var centerKey = getSelectedTradeCenterKey();
    return monthlySettlementProvinceConfigs[centerKey] || monthlySettlementProvinceConfigs.hunan;
  }

  function getMonthlySettlementPageData() {
    return getSettlementViewPageData("月结算", "售电公司");
  }

  function clearMonthlyRetailFilters() {
    state.settlement.filters.monthlyRetailUserCode = "";
    state.settlement.filters.monthlyRetailUserName = "";
    state.settlement.filters.monthlyRetailCity = "全部";
    state.settlement.filters.monthlyRetailCategory = "全部";
    state.settlement.filters.monthlyRetailEnergyMin = "";
    state.settlement.filters.monthlyRetailEnergyMax = "";
    state.settlement.filters.monthlyRetailFeeMin = "";
    state.settlement.filters.monthlyRetailFeeMax = "";
  }

  function getMonthlySettlementSide() {
    if (MONTHLY_SETTLEMENT_SIDES.indexOf(state.settlement.monthlySide) < 0) {
      state.settlement.monthlySide = MONTHLY_SETTLEMENT_SIDES[0];
    }
    return state.settlement.monthlySide;
  }

  function getMonthlySettlementRunMonth() {
    return state.settlement.filters.monthlyMonth || getSettlementDefaultMonth();
  }

  function getMonthlySubjectPower(row) {
    return getFirstFiniteNumber(row, ["settlementPowerOrCapacity", "settlementPower", "settlementEnergy"]);
  }

  function getMonthlySubjectPrice(row) {
    return getFirstFiniteNumber(row, ["settlementPriceOrAverage", "settlementPrice", "settlementAveragePrice"]);
  }

  function getMonthlySubjectFee(row) {
    return getFirstFiniteNumber(row, ["settlementFee", "fee", "totalFee"]);
  }

  function isMonthlySubjectTotalRow(row) {
    return row && (row.subjectCode === "合计" || row.subjectName === "售电公司月结算合计" || row.remark === "合计");
  }

  function getMonthlySubjectRowsForSide(pageData, side) {
    var rows = ((pageData && pageData.tableData) || []).filter(function filterTotal(row) {
      return !isMonthlySubjectTotalRow(row);
    });
    var centerKey = getSelectedTradeCenterKey();

    if (centerKey === "shaanxi") {
      return rows.filter(function filterShaanxi(row) {
        return String(row.remark || "").indexOf(side) >= 0;
      });
    }

    if (side === "售电侧") {
      return rows.filter(function filterHunanSeller(row) {
        var text = String(row.subjectName || "") + String(row.remark || "");
        return text.indexOf("代理服务收益") >= 0 || text.indexOf("售电") >= 0;
      });
    }

    return rows.filter(function filterHunanBuyer(row) {
      var text = String(row.subjectName || "") + String(row.remark || "");
      return text.indexOf("代理服务收益") < 0 && text.indexOf("售电服务") < 0;
    });
  }

  function sumMonthlySubjectMetric(rows, getter) {
    return (rows || []).reduce(function reduce(total, row) {
      var value = getter(row);
      return value === null ? total : total + value;
    }, 0);
  }

  function buildMonthlySideSummaryCards(rows, side) {
    var totalPower = sumMonthlySubjectMetric(rows, getMonthlySubjectPower);
    var totalFee = sumMonthlySubjectMetric(rows, getMonthlySubjectFee);
    var averagePrice = totalPower ? totalFee / totalPower : null;

    return [
      { label: side + "总结算电量", value: formatSettlementMetricValue(totalPower, 3), unit: "MWh", compact: false },
      { label: side + "结算电费", value: formatSettlementMetricValue(totalFee, 2), unit: "元", compact: false, valueClassName: totalFee < 0 ? "summary-card-value-negative" : "" },
      { label: side + "结算均价", value: formatSettlementMetricValue(averagePrice, 3), unit: "元/MWh", compact: false },
    ];
  }

  function renderMonthlySideTabs(activeSide) {
    return (
      '<div class="monthly-side-tabs">' +
      MONTHLY_SETTLEMENT_SIDES.map(function mapSide(side) {
        return (
          '<button type="button" class="monthly-side-tab ' +
          (side === activeSide ? "active" : "") +
          '" data-monthly-settlement-side="' +
          escapeHtml(side) +
          '">' +
          escapeHtml(side) +
          "</button>"
        );
      }).join("") +
      "</div>"
    );
  }

  function renderMonthlyMetricGrid(cards) {
    return (
      '<div class="monthly-metric-grid">' +
      (cards || [])
        .map(function mapCard(card) {
          var className = ["monthly-metric-value", card.valueClassName || ""].filter(Boolean).join(" ");
          return (
            '<div class="monthly-metric-item"><span class="monthly-metric-label">' +
            escapeHtml(card.label) +
            '</span><strong class="' +
            escapeHtml(className) +
            '">' +
            escapeHtml(card.value || "--") +
            '<span class="monthly-metric-unit">' +
            escapeHtml(card.unit || "") +
            "</span></strong></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function buildMonthlySubjectTable(rows) {
    return {
      columns: [
        { key: "subjectCode", label: "结算科目编码" },
        { key: "subjectName", label: "结算科目名称" },
        { key: "settlementPower", label: "结算电量" },
        { key: "settlementAveragePrice", label: "结算均价" },
        { key: "settlementFee", label: "结算电费" },
        { key: "remark", label: "备注" },
      ],
      rows: rows.map(function mapSubject(row) {
        var power = getMonthlySubjectPower(row);
        var price = getMonthlySubjectPrice(row);
        var fee = getMonthlySubjectFee(row);
        return {
          subjectCode: createSettlementTextCell(row.subjectCode),
          subjectName: createSettlementTextCell(row.subjectName),
          settlementPower: createSettlementNullableNumberCell(power, 3),
          settlementAveragePrice: createSettlementNullableNumberCell(price, 3),
          settlementFee: createSettlementNullableNumberCell(fee, 2),
          remark: createSettlementTextCell(row.remark),
        };
      }),
      minWidth: 1080,
      enableColumnDrag: false,
    };
  }

  function renderMonthlySubjectOverview(rows) {
    var displayRows = (rows || [])
      .slice()
      .sort(function sortByFee(a, b) {
        return Math.abs(getMonthlySubjectFee(b) || 0) - Math.abs(getMonthlySubjectFee(a) || 0);
      })
      .slice(0, 4);

    if (!displayRows.length) {
      return "";
    }

    return (
      '<div class="monthly-subject-overview"><div class="monthly-subject-overview-title">主要结算科目金额</div>' +
      '<div class="monthly-subject-overview-grid">' +
      displayRows
        .map(function mapRow(row) {
          return (
            '<div class="monthly-subject-overview-item"><span>' +
            escapeHtml(row.subjectName || "--") +
            '</span><strong class="' +
            (Number(getMonthlySubjectFee(row) || 0) < 0 ? "table-negative" : "") +
            '">' +
            escapeHtml(formatSettlementMetricValue(getMonthlySubjectFee(row), 2)) +
            " 元</strong></div>"
          );
        })
        .join("") +
      "</div></div>"
    );
  }

  function renderMonthlySettlementSummaryModule(pageData) {
    var activeSide = getMonthlySettlementSide();
    var rows = getMonthlySubjectRowsForSide(pageData, activeSide);
    var table = buildMonthlySubjectTable(rows);

    return (
      '<section class="panel monthly-summary-panel">' +
      '<div class="section-heading monthly-section-heading">' +
      '<div><div class="section-heading-title">购售侧结算汇总</div>' +
      '<div class="section-subtitle">按当前月结算单解析结果切换查看购电侧与售电侧科目</div></div>' +
      renderMonthlySideTabs(activeSide) +
      "</div>" +
      renderMonthlyMetricGrid(buildMonthlySideSummaryCards(rows, activeSide)) +
      renderMonthlySubjectOverview(rows) +
      '<div class="monthly-subject-table-title">结算科目数据看板</div>' +
      renderDataTablePro({
        tableId: "settlement-monthly-subject-table-" + getSelectedTradeCenterKey() + "-" + activeSide,
        columns: table.columns,
        rows: table.rows,
        minWidth: table.minWidth,
        sortState: getTableSortState("settlement-monthly-subject-table-" + getSelectedTradeCenterKey() + "-" + activeSide),
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        renderEmptyState: renderEmptyState,
      }) +
      "</section>"
    );
  }

  function getMonthlyColumnLeafCount(column) {
    var children = column.children || [];
    if (!children.length) {
      return 1;
    }
    return children.reduce(function reduce(total, child) {
      return total + getMonthlyColumnLeafCount(child);
    }, 0);
  }

  function getMonthlyColumnDepth(columns) {
    return (columns || []).reduce(function reduce(maxDepth, column) {
      var children = column.children || [];
      var depth = children.length ? 1 + getMonthlyColumnDepth(children) : 1;
      return Math.max(maxDepth, depth);
    }, 1);
  }

  function flattenMonthlyColumns(columns) {
    return (columns || []).reduce(function reduce(result, column) {
      var children = column.children || [];
      if (children.length) {
        return result.concat(flattenMonthlyColumns(children));
      }
      result.push(column);
      return result;
    }, []);
  }

  function buildMonthlyHeaderRows(columns, maxDepth, level, rows) {
    rows[level] = rows[level] || [];
    (columns || []).forEach(function eachColumn(column) {
      var children = column.children || [];
      var isLeaf = !children.length;
      rows[level].push({
        column: column,
        label: column.label,
        colspan: isLeaf ? 1 : getMonthlyColumnLeafCount(column),
        rowspan: isLeaf ? maxDepth - level : 1,
        isLeaf: isLeaf,
        level: level,
      });
      if (children.length) {
        buildMonthlyHeaderRows(children, maxDepth, level + 1, rows);
      }
    });
    return rows;
  }

  function getMonthlyLeafOffsets(leafColumns) {
    var fixedLeft = 0;
    var offsets = {};
    (leafColumns || []).forEach(function eachColumn(column) {
      if (column.fixed) {
        offsets[column.key] = fixedLeft;
        fixedLeft += column.width || 120;
      }
    });
    return offsets;
  }

  function getMonthlyColumnWidthStyle(column, offsets) {
    var styles = [];
    var width = column.width || 120;
    styles.push("min-width:" + width + "px");
    styles.push("width:" + width + "px");
    if (column.fixed) {
      styles.push("left:" + (offsets[column.key] || 0) + "px");
    }
    return styles.join(";");
  }

  function formatMonthlyRetailValue(value, column) {
    if (value === null || value === undefined || value === "") {
      return column && column.type ? "--" : "";
    }
    if (column.type === "money") {
      return formatSettlementMetricValue(value, 2);
    }
    if (column.type === "energy" || column.type === "price") {
      return formatSettlementMetricValue(value, 3);
    }
    if (typeof value === "number") {
      return Number.isInteger(value) ? String(value) : formatSettlementMetricValue(value, 3);
    }
    return String(value);
  }

  function renderMonthlyRetailHeader(columns, leafColumns, offsets) {
    var maxDepth = getMonthlyColumnDepth(columns);
    var headerRows = buildMonthlyHeaderRows(columns, maxDepth, 0, []);

    return headerRows
      .map(function mapRow(row, rowIndex) {
        var cells = row
          .map(function mapCell(cell) {
            var column = cell.column;
            var classes = ["monthly-retail-th", cell.isLeaf && column.fixed ? "monthly-fixed-col" : ""].filter(Boolean);
            var style = ["top:" + rowIndex * 38 + "px"];
            if (cell.isLeaf) {
              style.push(getMonthlyColumnWidthStyle(column, offsets));
            }
            return (
              '<th class="' +
              escapeHtml(classes.join(" ")) +
              '" colspan="' +
              cell.colspan +
              '" rowspan="' +
              cell.rowspan +
              '" style="' +
              escapeHtml(style.join(";")) +
              '">' +
              escapeHtml(cell.label || "") +
              "</th>"
            );
          })
          .join("");
        return "<tr>" + cells + "</tr>";
      })
      .join("");
  }

  function renderMonthlyRetailCell(row, column, offsets, isSummary) {
    var value = row[column.key];
    var numericValue = getFiniteNumber(value);
    var classes = ["monthly-retail-cell"];
    var style = getMonthlyColumnWidthStyle(column, offsets);
    if (column.type || typeof value === "number") {
      classes.push("table-number-cell");
    }
    if (column.fixed) {
      classes.push("monthly-fixed-col");
    }
    if (isSummary) {
      classes.push("settlement-total-cell");
    }
    if (numericValue !== null && numericValue < 0) {
      classes.push("table-negative");
    }
    return (
      '<td class="' +
      escapeHtml(classes.join(" ")) +
      '" style="' +
      escapeHtml(style) +
      '"><span class="table-cell-text">' +
      escapeHtml(formatMonthlyRetailValue(value, column)) +
      "</span></td>"
    );
  }

  function buildMonthlyRetailSummaryRow(rows, leafColumns, summaryLabelKey) {
    var summary = {};
    (leafColumns || []).forEach(function eachColumn(column) {
      if (column.key === summaryLabelKey) {
        summary[column.key] = "汇总";
        return;
      }
      if (column.summary !== "sum") {
        summary[column.key] = "--";
        return;
      }
      var hasNumber = false;
      var total = (rows || []).reduce(function reduce(sum, row) {
        var value = getFiniteNumber(row[column.key]);
        if (value === null) {
          return sum;
        }
        hasNumber = true;
        return sum + value;
      }, 0);
      summary[column.key] = hasNumber ? total : "--";
    });
    return summary;
  }

  function getMonthlyRetailTableMinWidth(config, leafColumns) {
    return (
      config.minWidth ||
      (leafColumns || []).reduce(function reduce(total, column) {
        return total + (column.width || 120);
      }, 0)
    );
  }

  function renderMonthlyRetailTable(config, rows) {
    var leafColumns = flattenMonthlyColumns(config.columns);
    var offsets = getMonthlyLeafOffsets(leafColumns);
    var summaryRow = buildMonthlyRetailSummaryRow(rows, leafColumns, config.summaryLabelKey);
    var bodyRows = (rows || [])
      .map(function mapRow(row) {
        return (
          "<tr>" +
          leafColumns
            .map(function mapColumn(column) {
              return renderMonthlyRetailCell(row, column, offsets, false);
            })
            .join("") +
          "</tr>"
        );
      })
      .join("");
    var summaryHtml =
      "<tr>" +
      leafColumns
        .map(function mapColumn(column) {
          return renderMonthlyRetailCell(summaryRow, column, offsets, true);
        })
        .join("") +
      "</tr>";

    return (
      '<div class="monthly-retail-table-wrap">' +
      '<table class="data-table monthly-retail-table" style="min-width:' +
      escapeHtml(String(getMonthlyRetailTableMinWidth(config, leafColumns))) +
      'px"><thead>' +
      renderMonthlyRetailHeader(config.columns, leafColumns, offsets) +
      "</thead><tbody>" +
      bodyRows +
      "</tbody><tfoot>" +
      summaryHtml +
      "</tfoot></table></div>"
    );
  }

  function getMonthlySelectOptions(rows, rowKey) {
    var options = ["全部"];
    (rows || []).forEach(function eachRow(row) {
      var value = row[rowKey];
      if (value !== null && value !== undefined && value !== "" && options.indexOf(String(value)) < 0) {
        options.push(String(value));
      }
    });
    return options;
  }

  function renderMonthlyRangeFilter(filter) {
    var filters = state.settlement.filters;
    return (
      '<label class="info-filter-field monthly-range-filter"><span class="filter-label">' +
      escapeHtml(filter.label) +
      "：</span>" +
      '<input class="filter-input monthly-range-input" type="text" value="' +
      escapeHtml(filters[filter.minKey] || "") +
      '" placeholder="最小值" data-filter-scope="settlement" data-filter-key="' +
      escapeHtml(filter.minKey) +
      '" />' +
      '<span class="monthly-range-separator">至</span>' +
      '<input class="filter-input monthly-range-input" type="text" value="' +
      escapeHtml(filters[filter.maxKey] || "") +
      '" placeholder="最大值" data-filter-scope="settlement" data-filter-key="' +
      escapeHtml(filter.maxKey) +
      '" /></label>'
    );
  }

  function renderMonthlyRetailFilters(config) {
    return (config.filters || [])
      .map(function mapFilter(filter) {
        if (filter.type === "select") {
          return renderBoundSelectFilter(
            filter.label,
            state.settlement.filters[filter.fieldKey] || "全部",
            getMonthlySelectOptions(config.rows, filter.rowKey),
            filter.fieldKey,
            "settlement",
            "filter-select-native",
          );
        }
        if (filter.type === "range") {
          return renderMonthlyRangeFilter(filter);
        }
        return renderBoundTextFilter(
          filter.label,
          state.settlement.filters[filter.fieldKey],
          filter.placeholder || "请输入" + filter.label,
          filter.fieldKey,
          "settlement",
        );
      })
      .join("");
  }

  function parseMonthlyRangeValue(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    var parsed = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function getFilteredMonthlyRetailRows(config) {
    var filters = state.settlement.filters;
    if (getMonthlySettlementRunMonth() !== getSettlementDefaultMonth()) {
      return [];
    }

    return (config.rows || []).filter(function filterRow(row) {
      return (config.filters || []).every(function matchFilter(filter) {
        if (filter.type === "text") {
          return includesKeyword(row[filter.rowKey], filters[filter.fieldKey]);
        }
        if (filter.type === "select") {
          return matchesOption(String(row[filter.rowKey] || ""), filters[filter.fieldKey], "全部");
        }
        if (filter.type === "range") {
          var numericValue = getFiniteNumber(row[filter.rowKey]);
          var minValue = parseMonthlyRangeValue(filters[filter.minKey]);
          var maxValue = parseMonthlyRangeValue(filters[filter.maxKey]);
          if (numericValue === null) {
            return minValue === null && maxValue === null;
          }
          return (minValue === null || numericValue >= minValue) && (maxValue === null || numericValue <= maxValue);
        }
        return true;
      });
    });
  }

  function renderMonthlyRetailDetailModule() {
    var config = getMonthlySettlementConfig();
    var rows = getFilteredMonthlyRetailRows(config);

    return (
      '<section class="panel monthly-retail-panel">' +
      '<div class="section-heading monthly-section-heading">' +
      '<div><div class="section-heading-title">零售用户结算明细</div>' +
      '<div class="section-subtitle">按当前交易中心加载对应省份 Excel 原始表头、字段顺序与汇总口径</div></div>' +
      "</div>" +
      '<div class="monthly-retail-filter-row">' +
      renderMonthlyRetailFilters(config) +
      "</div>" +
      (rows.length
        ? renderMonthlyRetailTable(config, rows)
        : renderEmptyState({
            escapeHtml: escapeHtml,
            renderIcon: renderIcon,
            message: "当前结算月份或筛选条件下暂无月结算零售用户明细数据",
          })) +
      "</section>"
    );
  }

  function getDefaultMonthlySettlementSummaryCards() {
    return [
      { label: "当年实际用电量", value: null, unit: "MWh", digits: 3 },
      { label: "中长期交易电量", value: null, unit: "MWh", digits: 3 },
      { label: "中长期占实际用电比例", value: null, unit: "%", digits: 2 },
      { label: "度电收益", value: null, unit: "厘", digits: 2 },
    ];
  }

  function formatMonthlySettlementSummaryValue(card) {
    var value = card && card.value;
    if (value === null || value === undefined || value === "" || value === "--" || Number.isNaN(Number(value))) {
      return "--";
    }
    if (typeof value === "number") {
      return formatSettlementMetricValue(value, typeof card.digits === "number" ? card.digits : 2);
    }
    return String(value);
  }

  function getMonthlySettlementSummaryCards(data, sideData) {
    var sourceCards = isMonthlySettlementSelectedMonthAvailable(data) ? sideData.summaryCards || [] : [];
    var cards = sourceCards.length ? sourceCards : getDefaultMonthlySettlementSummaryCards();
    return cards.map(function mapCard(card) {
      return {
        label: card.label,
        value: formatMonthlySettlementSummaryValue(card),
        unit: card.unit || "",
        compact: false,
      };
    });
  }

  function renderMonthlySettlementSideSubTabs(data) {
    if (!data || !data.hasPurchaseSaleSide) {
      return "";
    }
    var activeSide = getMonthlySettlementActiveSide(data);
    return (
      MONTHLY_SETTLEMENT_SIDES.map(function mapSide(side) {
        return (
          '<button type="button" class="secondary-tab monthly-settlement-side-tab ' +
          (side === activeSide ? "active" : "") +
          '" data-monthly-settlement-side="' +
          escapeHtml(side) +
          '"' +
          (side === activeSide ? ' aria-pressed="true"' : "") +
          ">" +
          escapeHtml(side) +
          "</button>"
        );
      }).join("")
    );
  }

  function renderMonthlySettlementUpdateBar(data) {
    return (
      '<section class="panel status-panel data-update-bar monthly-settlement-update-bar">' +
      '<div class="status-text">数据更新时间：<strong>' +
      escapeHtml((data && data.updateTime) || "--") +
      "</strong><span>（" +
      escapeHtml((data && (data.updateSource || data.dataSource)) || "--") +
      "）</span></div>" +
      '<div class="status-actions monthly-settlement-actions">' +
      '<div class="monthly-more-dropdown">' +
      '<button class="ghost-btn monthly-more-trigger" type="button">' +
      "<span>更多</span></button>" +
      '<div class="monthly-more-menu">' +
      '<button type="button" class="monthly-more-menu-item" data-ui-action="open-manual-update">更新数据</button>' +
      "</div></div>" +
      '<button class="primary-btn" data-ui-action="open-download">' +
      "<span>下载</span></button>" +
      "</div></section>"
    );
  }

  function isMonthlySettlementSummaryRow(row) {
    var subjectCode = String((row && row.subjectCode) || "");
    var subjectName = String((row && row.subjectName) || "");
    return (
      subjectCode.indexOf("合计") >= 0 ||
      subjectCode.indexOf("小计") >= 0 ||
      subjectName.indexOf("合计") >= 0 ||
      subjectName.indexOf("小计") >= 0
    );
  }

  function renderMonthlySettlementSchemaTable(data, sideData) {
    var columns = sideData.tableColumns || [];
    var rows = isMonthlySettlementSelectedMonthAvailable(data) ? sideData.tableRows || [] : [];
    var leafColumns = flattenMonthlyColumns(columns);
    var offsets = getMonthlyLeafOffsets(leafColumns);
    var minWidth = (leafColumns || []).reduce(function reduce(total, column) {
      return total + (column.width || 120);
    }, 0);

    if (!rows.length) {
      return renderEmptyState({
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
        message: "当前结算月份暂无月结算结果数据",
      });
    }

    return (
      '<div class="monthly-retail-table-wrap monthly-settlement-table-wrap">' +
      '<table class="data-table monthly-retail-table monthly-settlement-table" style="min-width:' +
      escapeHtml(String(Math.max(minWidth, 980))) +
      'px"><thead>' +
      renderMonthlyRetailHeader(columns, leafColumns, offsets) +
      "</thead><tbody>" +
      rows
        .map(function mapRow(row) {
          var isSummary = isMonthlySettlementSummaryRow(row);
          return (
            "<tr>" +
            leafColumns
              .map(function mapColumn(column) {
                return renderMonthlyRetailCell(row, column, offsets, isSummary);
              })
              .join("") +
            "</tr>"
          );
        })
        .join("") +
      "</tbody></table></div>"
    );
  }

  function renderMonthlySettlementTableSection(data, sideData) {
    var activeSide = getMonthlySettlementActiveSide(data);
    var title = data && data.hasPurchaseSaleSide ? activeSide + "结算汇总表格" : "结算汇总表格";
    var subtitle = data && data.month ? data.provinceName + " " + normalizeSettlementMonth(data.month) + " 月结算结果" : "";
    return (
      '<section class="panel chart-panel chart-panel-plain monthly-settlement-table-panel"><div class="chart-main chart-main-plain">' +
      renderSectionHeading(title, subtitle) +
      renderMonthlySettlementSchemaTable(data, sideData) +
      "</div></section>"
    );
  }

  function renderUnifiedMonthlySettlementContent() {
    var data = getMonthlySettlementActiveData();
    var sideData = getMonthlySettlementActiveSideData(data);

    if (!data || !sideData) {
      return renderTradeCenterPageEmptyPanel("当前交易中心暂无月结算结果数据。");
    }

    return (
      renderMonthlySettlementUpdateBar(data) +
      renderSummaryCards(getMonthlySettlementSummaryCards(data, sideData), "monthly-settlement-card-grid") +
      renderMonthlySettlementTableSection(data, sideData)
    );
  }

  function renderUnifiedSettlementContent() {
    if (state.settlement.activeTab === "日清算") {
      return renderDailySettlementResultContent();
    }

    return renderUnifiedMonthlySettlementContent();
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
      publishTime: status.publishTime || status.dataPublishTime || status.publishedAt,
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

  function ensureDataMonitorState() {
    state.dataMonitor = state.dataMonitor || {};
    state.dataMonitor.filters = state.dataMonitor.filters || {};
    state.dataMonitor.filters.categoryPath = state.dataMonitor.filters.categoryPath || [];
    state.dataMonitor.ignoredIds = state.dataMonitor.ignoredIds || [];
    state.dataMonitor.rollbackIgnoredIds = state.dataMonitor.rollbackIgnoredIds || [];
    return state.dataMonitor;
  }

  function getDataMonitorTradeCenterOptions() {
    return DATA_MONITOR_TRADE_CENTER_OPTIONS;
  }

  function normalizeDataMonitorTradeCenterName(centerName) {
    if (centerName === "湖南交易中心" || centerName === "湖南电力交易中心") {
      return "湖南交易中心";
    }
    if (centerName === "陕西交易中心" || centerName === "陕西电力交易中心") {
      return "陕西交易中心";
    }
    return "广东交易中心";
  }

  function getDataMonitorSelectedTradeCenterName() {
    return normalizeDataMonitorTradeCenterName(state.ui.selectedTradeCenter);
  }

  function getDataMonitorSelectedTradeCenterKey() {
    var selectedName = getDataMonitorSelectedTradeCenterName();
    if (selectedName === "湖南交易中心") {
      return "湖南";
    }
    if (selectedName === "陕西交易中心") {
      return "陕西";
    }
    return "广东";
  }

  function isDataMonitorFetchMissing(record) {
    return record && (record.fetchStatus === "数据未取回" || record.fetchStatus === "取数失败");
  }

  function isDataMonitorFrontendAbnormal(record) {
    return record && (record.fetchStatus === "前端展示异常" || record.fetchStatus === "展示异常");
  }

  function isDataMonitorFetchAbnormal(record) {
    return isDataMonitorFetchMissing(record) || isDataMonitorFrontendAbnormal(record);
  }

  function isDataMonitorQualityAbnormal(record) {
    var qualityAbnormalStatuses = ["数据为空", "数据不完整", "数据未更新", "数值越界", "异常"];
    return record && qualityAbnormalStatuses.indexOf(record.qualityStatus) >= 0;
  }

  function isDataMonitorRecordAbnormal(record) {
    return isDataMonitorFetchAbnormal(record) || isDataMonitorQualityAbnormal(record);
  }

  function getDataMonitorCenterRecords() {
    var selectedTradeCenter = getDataMonitorSelectedTradeCenterKey();
    return getDataMonitorRecordsRaw().filter(function filterCenter(record) {
      return record.tradeCenter === selectedTradeCenter;
    });
  }

  function getDataMonitorCategoryTree() {
    var trees = dataMonitorMock.categoryTrees || {};
    return trees[getDataMonitorSelectedTradeCenterKey()] || [{ label: "全部", path: [] }];
  }

  function normalizeDataMonitorPath(path) {
    return Array.isArray(path) ? path : [];
  }

  function serializeDataMonitorPath(path) {
    return normalizeDataMonitorPath(path).join("/");
  }

  function parseDataMonitorPath(value) {
    return String(value || "").split("/").filter(Boolean);
  }

  function isDataMonitorPathActive(path) {
    return serializeDataMonitorPath(path) === serializeDataMonitorPath(ensureDataMonitorState().filters.categoryPath || []);
  }

  function isDataMonitorRecordInCategory(record, path) {
    var selectedPath = normalizeDataMonitorPath(path);
    var recordPath = normalizeDataMonitorPath(record.categoryPath);
    if (!selectedPath.length) {
      return true;
    }
    return selectedPath.every(function matchPart(part, index) {
      return recordPath[index] === part;
    });
  }

  function flattenDataMonitorCategoryTree(nodes, result) {
    var output = result || [];
    (nodes || []).forEach(function eachNode(node) {
      output.push(node);
      flattenDataMonitorCategoryTree(node.children || [], output);
    });
    return output;
  }

  function getDataMonitorCategorySortWeight(record) {
    var recordPath = serializeDataMonitorPath(record.categoryPath || []);
    var flatNodes = flattenDataMonitorCategoryTree(getDataMonitorCategoryTree()).filter(function filterNode(node) {
      return node.path && node.path.length;
    });
    var bestIndex = flatNodes.length + 1;
    flatNodes.forEach(function matchNode(node, index) {
      var nodePath = serializeDataMonitorPath(node.path);
      if (nodePath && recordPath.indexOf(nodePath) === 0) {
        bestIndex = Math.min(bestIndex, index);
      }
    });
    return bestIndex;
  }

  function getDataMonitorCategoryAbnormalCount(path) {
    return getDataMonitorCenterRecords().filter(function filterRecord(record) {
      return isDataMonitorRecordInCategory(record, path) && isDataMonitorRecordAbnormal(record);
    }).length;
  }

  function renderDataMonitorCategoryNode(node, level) {
    var path = normalizeDataMonitorPath(node.path);
    var abnormalCount = getDataMonitorCategoryAbnormalCount(path);
    var isActive = isDataMonitorPathActive(path);
    var children = node.children || [];
    return (
      '<div class="data-monitor-category-node">' +
      '<button class="data-monitor-category-item ' +
      (isActive ? "active " : "") +
      'level-' +
      escapeHtml(String(level || 0)) +
      '" data-data-monitor-category="' +
      escapeHtml(serializeDataMonitorPath(path)) +
      '">' +
      '<span class="data-monitor-category-name">' +
      escapeHtml(node.label || "-") +
      "</span>" +
      (abnormalCount ? '<span class="data-monitor-category-count">' + escapeHtml(abnormalCount) + "</span>" : "") +
      "</button>" +
      (children.length
        ? '<div class="data-monitor-category-children">' +
          children.map(function mapChild(child) {
            return renderDataMonitorCategoryNode(child, (level || 0) + 1);
          }).join("") +
          "</div>"
        : "") +
      "</div>"
    );
  }

  function renderDataMonitorCategoryNav() {
    return (
      '<aside class="data-monitor-category-nav">' +
      '<div class="data-monitor-category-title">业务模块</div>' +
      '<div class="data-monitor-category-list">' +
      getDataMonitorCategoryTree().map(function mapNode(node) {
        return renderDataMonitorCategoryNode(node, 0);
      }).join("") +
      "</div></aside>"
    );
  }

  function getDataMonitorSummary(records) {
    var scopedRecords = records || [];
    var fetchAbnormalCount = scopedRecords.filter(isDataMonitorFetchAbnormal).length;
    var qualityAbnormalCount = scopedRecords.filter(isDataMonitorQualityAbnormal).length;
    var abnormalRecords = scopedRecords.filter(isDataMonitorRecordAbnormal);
    return {
      expectedCount: scopedRecords.length,
      normalCount: scopedRecords.length - abnormalRecords.length,
      fetchAbnormalCount: fetchAbnormalCount,
      qualityAbnormalCount: qualityAbnormalCount,
      p0Count: abnormalRecords.filter(function countP0(record) {
        return getDataMonitorPriority(record) === "P0";
      }).length,
      p1Count: abnormalRecords.filter(function countP1(record) {
        return getDataMonitorPriority(record) === "P1";
      }).length,
      abnormalCount: abnormalRecords.length,
    };
  }

  function isDataMonitorIgnored(record) {
    ensureDataMonitorState();
    if (isDataMonitorIgnoreRolledBack(record)) {
      return false;
    }
    return state.dataMonitor.ignoredIds.indexOf(record.id) >= 0 || record.processStatus === "已忽略";
  }

  function isDataMonitorIgnoreRolledBack(record) {
    ensureDataMonitorState();
    return Boolean(record && state.dataMonitor.rollbackIgnoredIds.indexOf(record.id) >= 0);
  }

  function canRollbackDataMonitorIgnore(record) {
    return record.processStatus === "已忽略" || record.fetchStatus === "已忽略" || record.qualityStatus === "已忽略";
  }

  function isDataMonitorFetchIgnored(record) {
    return isDataMonitorIgnored(record) && isDataMonitorFetchAbnormal(record);
  }

  function isDataMonitorQualityIgnored(record) {
    return isDataMonitorIgnored(record) && isDataMonitorQualityAbnormal(record);
  }

  function getDataMonitorDisplayRecord(record) {
    var nextRecord = {};
    Object.keys(record || {}).forEach(function copyKey(key) {
      nextRecord[key] = record[key];
    });
    if (isDataMonitorIgnoreRolledBack(record)) {
      if (nextRecord.processStatus === "已忽略") {
        nextRecord.processStatus = "待处理";
      }
      if (nextRecord.fetchProcessStatus === "已忽略") {
        nextRecord.fetchProcessStatus = "待处理";
      }
      if (nextRecord.qualityProcessStatus === "已忽略") {
        nextRecord.qualityProcessStatus = "待处理";
      }
      return nextRecord;
    }
    if (isDataMonitorIgnored(record)) {
      nextRecord.processStatus = "已忽略";
      if (isDataMonitorFetchAbnormal(record)) {
        nextRecord.fetchStatus = "已忽略";
        nextRecord.fetchProcessStatus = "已忽略";
      }
      if (isDataMonitorQualityAbnormal(record)) {
        nextRecord.qualityStatus = "已忽略";
        nextRecord.qualityProcessStatus = "已忽略";
      }
    }
    return nextRecord;
  }

  function getDataMonitorRecordsRaw() {
    return (dataMonitorMock.records || []).map(getDataMonitorDisplayRecord);
  }

  function getDataMonitorRecordById(recordId) {
    return getDataMonitorRecordsRaw().find(function findRecord(record) {
      return record.id === recordId;
    });
  }

  function getDataMonitorPriority(record) {
    return record.priority || "";
  }

  function getDataMonitorSortWeight(record) {
    var priority = getDataMonitorPriority(record);
    if (record.fetchStatus === "已忽略" || record.qualityStatus === "已忽略") {
      return 9;
    }
    if (isDataMonitorFetchMissing(record) && priority === "P0") {
      return 1;
    }
    if (isDataMonitorFrontendAbnormal(record) && priority === "P0") {
      return 2;
    }
    if (isDataMonitorQualityAbnormal(record) && priority === "P0") {
      return 3;
    }
    if (isDataMonitorFetchMissing(record) && priority === "P1") {
      return 4;
    }
    if (isDataMonitorFrontendAbnormal(record) && priority === "P1") {
      return 5;
    }
    if (isDataMonitorQualityAbnormal(record) && priority === "P1") {
      return 6;
    }
    if (record.fetchStatus === "待取数" || record.qualityStatus === "待校验") {
      return 7;
    }
    return 8;
  }

  function getDataMonitorFilteredRecords() {
    var selectedTradeCenter = getDataMonitorSelectedTradeCenterKey();
    var selectedPath = ensureDataMonitorState().filters.categoryPath || [];
    return getDataMonitorRecordsRaw()
      .filter(function filterRecord(record) {
        return record.tradeCenter === selectedTradeCenter && isDataMonitorRecordInCategory(record, selectedPath);
      })
      .sort(function sortRecord(a, b) {
        var categoryDiff = getDataMonitorCategorySortWeight(a) - getDataMonitorCategorySortWeight(b);
        var weightDiff = categoryDiff || getDataMonitorSortWeight(a) - getDataMonitorSortWeight(b);
        if (weightDiff !== 0) {
          return weightDiff;
        }
        return String(a.nextFetchAt || "").localeCompare(String(b.nextFetchAt || ""), "zh-CN");
      });
  }

  function getDataMonitorStatusText(record, statusType) {
    if (
      record.processStatus === "已忽略" &&
      ((statusType === "fetch" && isDataMonitorFetchAbnormal(record)) ||
        (statusType === "quality" && isDataMonitorQualityAbnormal(record)))
    ) {
      return "已忽略";
    }
    if (statusType === "fetch") {
      if (record.fetchStatus === "已忽略") {
        return "已忽略";
      }
      if (record.fetchStatus === "正常") {
        return "正常";
      }
      if (record.fetchStatus === "待取数") {
        return "待取数";
      }
      if (isDataMonitorFetchMissing(record)) {
        return "取数失败";
      }
      if (isDataMonitorFrontendAbnormal(record)) {
        return "展示异常";
      }
      return record.fetchStatus || "-";
    }
    if (record.qualityStatus === "已忽略") {
      return "已忽略";
    }
    if (record.qualityStatus === "正常") {
      return "正常";
    }
    if (isDataMonitorQualityAbnormal(record)) {
      return record.qualityStatus === "异常" ? record.qualityExceptionType : record.qualityStatus;
    }
    return record.qualityStatus || "-";
  }

  function getDataMonitorStatusClass(record, statusType) {
    if (
      record.processStatus === "已忽略" &&
      ((statusType === "fetch" && isDataMonitorFetchAbnormal(record)) ||
        (statusType === "quality" && isDataMonitorQualityAbnormal(record)))
    ) {
      return "data-monitor-status-ignored";
    }
    if (statusType === "fetch") {
      if (record.fetchStatus === "已忽略") {
        return "data-monitor-status-ignored";
      }
      if (record.fetchStatus === "正常") {
        return "data-monitor-status-success";
      }
      if (record.fetchStatus === "待取数") {
        return "data-monitor-status-default";
      }
      if (isDataMonitorFrontendAbnormal(record)) {
        return "data-monitor-status-warning";
      }
      if (isDataMonitorFetchMissing(record)) {
        return "data-monitor-status-danger";
      }
      return "data-monitor-status-default";
    }
    if (record.qualityStatus === "正常") {
      return "data-monitor-status-success";
    }
    if (record.qualityStatus === "已忽略") {
      return "data-monitor-status-ignored";
    }
    if (isDataMonitorQualityAbnormal(record)) {
      return record.priority === "P0" ? "data-monitor-status-danger" : "data-monitor-status-warning";
    }
    return "data-monitor-status-default";
  }

  function getDataMonitorStatusIcon(record, statusType) {
    if (
      record.processStatus === "已忽略" &&
      ((statusType === "fetch" && isDataMonitorFetchAbnormal(record)) ||
        (statusType === "quality" && isDataMonitorQualityAbnormal(record)))
    ) {
      return "⚫";
    }
    if (statusType === "fetch") {
      if (record.fetchStatus === "已忽略") {
        return "⚫";
      }
      if (record.fetchStatus === "正常") {
        return "✅";
      }
      if (record.fetchStatus === "待取数") {
        return "⚪";
      }
      if (isDataMonitorFrontendAbnormal(record)) {
        return "🟠";
      }
      if (isDataMonitorFetchMissing(record)) {
        return "🔴";
      }
      return "⚪";
    }
    if (record.qualityStatus === "正常") {
      return "✅";
    }
    if (record.qualityStatus === "已忽略") {
      return "⚫";
    }
    if (isDataMonitorQualityAbnormal(record)) {
      return record.priority === "P0" ? "🔴" : "🟠";
    }
    if (record.qualityStatus === "待校验") {
      return "⏳";
    }
    return "⚪";
  }

  function createDataMonitorStatusCell(record, statusType) {
    return createStyledCell(
      getDataMonitorStatusIcon(record, statusType) + " " + getDataMonitorStatusText(record, statusType),
      "data-monitor-status-cell " + getDataMonitorStatusClass(record, statusType),
      getDataMonitorSortWeight(record),
    );
  }

  function canIgnoreDataMonitorRecord(record) {
    if (record.processStatus === "已忽略") {
      return false;
    }
    if (record.fetchStatus === "已忽略" || record.qualityStatus === "已忽略") {
      return false;
    }
    return isDataMonitorRecordAbnormal(record);
  }

  function getDataMonitorTable() {
    var columns = [
      { key: "dataItem", label: "数据项", width: 230 },
      { key: "fetchStatus", label: "取数状态", width: 190 },
      { key: "qualityStatus", label: "质量状态", width: 178 },
      { key: "timePoint", label: "时间点位", width: 100 },
      { key: "outputTime", label: "产出时间", width: 128 },
      { key: "warningTime", label: "预警时间", width: 120 },
      { key: "valueRange", label: "取值范围", width: 126 },
      { key: "lastSuccessAt", label: "最近成功入库时间", width: 176 },
      { key: "nextFetchAt", label: "下次取数时间", width: 164 },
      { key: "actions", label: "操作", sortable: false, width: 150 },
    ];

    return {
      columns: columns,
      rows: getDataMonitorFilteredRecords().map(function mapRecord(record) {
        var actions = [{ label: "详情", action: "open-data-monitor-detail" }];

        return {
          dataItem: record.dataItem,
          fetchStatus: createDataMonitorStatusCell(record, "fetch"),
          qualityStatus: createDataMonitorStatusCell(record, "quality"),
          timePoint: record.timePoint,
          outputTime: record.outputTime,
          warningTime: record.warningTime,
          valueRange: record.valueRange,
          lastSuccessAt: record.lastSuccessAt,
          nextFetchAt: record.nextFetchAt,
          actions: createTableActionCell(record.id, actions),
        };
      }),
      minWidth: 1428,
    };
  }

  function renderDataMonitorTableMeta() {
    var visibleCount = getDataMonitorFilteredRecords().length;
    var selectedName = getDataMonitorSelectedTradeCenterName();
    return (
      '<div class="data-monitor-table-meta">' +
      '<span class="data-monitor-table-count">' +
      escapeHtml(selectedName) +
      "展示 " +
      escapeHtml(visibleCount) +
      " 项</span></div>"
    );
  }

  function renderDataMonitorTable(tableId, table) {
    return (
      '<section class="panel chart-panel chart-panel-plain data-monitor-table-panel"><div class="chart-main chart-main-plain">' +
      '<div class="data-monitor-status-layout">' +
      renderDataMonitorCategoryNav() +
      '<div class="data-monitor-table-region">' +
      renderDataMonitorTableMeta() +
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
      "</div></div>" +
      "</div></section>"
    );
  }

  function renderDataMonitorAlert() {
    var summary = getDataMonitorSummary(getDataMonitorCenterRecords());
    if (!summary.abnormalCount) {
      return (
        '<section class="panel data-monitor-alert-panel data-monitor-alert-panel-ok"><div class="data-monitor-alert-icon">' +
        renderIcon("check", "data-monitor-alert-ok-icon") +
        '</div><div class="data-monitor-alert-copy">' +
        '<div class="data-monitor-alert-title">当前所有数据运行正常</div>' +
        '<div class="data-monitor-alert-meta">应取数据 ' +
        escapeHtml(summary.expectedCount || 0) +
        " 项，暂无取数异常与质量异常。</div></div></section>"
      );
    }
    return (
      '<section class="panel data-monitor-alert-panel"><div class="data-monitor-alert-icon">!</div><div class="data-monitor-alert-copy">' +
      '<div class="data-monitor-alert-title">当前存在 ' +
      escapeHtml(summary.abnormalCount || 0) +
      " 项数据异常</div>" +
      '<div class="data-monitor-alert-meta">应取数据 ' +
      escapeHtml(summary.expectedCount || 0) +
      " ｜正常 " +
      escapeHtml(summary.normalCount || 0) +
      " ｜取数通道异常 " +
      escapeHtml(summary.fetchAbnormalCount || 0) +
      " 项 ｜数据质量异常 " +
      escapeHtml(summary.qualityAbnormalCount || 0) +
      " 项</div></div></section>"
    );
  }

  function renderDataMonitorEmptyPanel(title, text) {
    return (
      '<section class="panel chart-panel chart-panel-plain data-monitor-empty-panel"><div class="chart-main chart-main-plain">' +
      '<div class="empty-state data-monitor-empty-state"><div class="empty-state-graphic">' +
      renderIcon("database", "empty-state-icon") +
      '</div><div class="empty-state-title">' +
      escapeHtml(title || "暂无监控数据") +
      '</div><div class="empty-state-text">' +
      escapeHtml(text || "当前筛选条件下暂无纳入数据监控的数据项。") +
      "</div></div></div></section>"
    );
  }

  function renderDataMonitorFailurePanel(title, text) {
    return (
      '<section class="panel chart-panel chart-panel-plain data-monitor-empty-panel"><div class="chart-main chart-main-plain">' +
      '<div class="empty-state data-monitor-empty-state"><div class="empty-state-graphic">' +
      renderIcon("alert", "empty-state-icon") +
      '</div><div class="empty-state-title">' +
      escapeHtml(title || "数据加载失败") +
      '</div><div class="empty-state-text">' +
      escapeHtml(text || "数据加载失败，请稍后重试。") +
      '</div><div class="empty-state-actions"><button class="primary-btn" data-ui-action="reload-data-monitor"><span>重新加载</span></button></div></div></div></section>'
    );
  }

  function renderDataMonitorTableSection() {
    var emptyConfig = dataMonitorMock.emptyState || {};
    var rawRecords = getDataMonitorRecordsRaw();
    var selectedTradeCenter = getDataMonitorSelectedTradeCenterKey();
    var hasCenterConfig = rawRecords.some(function hasCenterRecord(record) {
      return record.tradeCenter === selectedTradeCenter;
    });

    if (dataMonitorMock.loadState === "loading") {
      return renderDataMonitorEmptyPanel("数据加载中...", emptyConfig.loadingText || "数据加载中...");
    }
    if (dataMonitorMock.loadState === "failed") {
      return renderDataMonitorFailurePanel("数据加载失败", emptyConfig.failureText || "数据加载失败，请稍后重试。");
    }
    if (!hasCenterConfig) {
      return renderDataMonitorEmptyPanel(emptyConfig.noConfigTitle, emptyConfig.noConfigText);
    }
    if (!getDataMonitorFilteredRecords().length) {
      return (
        '<section class="panel chart-panel chart-panel-plain data-monitor-table-panel"><div class="chart-main chart-main-plain">' +
        '<div class="data-monitor-status-layout">' +
        renderDataMonitorCategoryNav() +
        '<div class="data-monitor-table-region">' +
        renderDataMonitorTableMeta() +
        renderEmptyState({
          message: "当前分类下暂无数据",
          escapeHtml: escapeHtml,
          renderIcon: renderIcon,
        }) +
        "</div></div></div></section>"
      );
    }
    return renderDataMonitorTable("data-monitor-table", getDataMonitorTable());
  }

  function renderDataMonitorPage() {
    var page = dataMonitorMock || {};
    var tradeCenterName = getDataMonitorSelectedTradeCenterName();
    return (
      '<div class="page-stack data-monitor-page">' +
      '<section class="page-header page-header-market-disclosure"><div class="page-title-block"><h1>' +
      escapeHtml(page.title || "数据监控") +
      '</h1><div class="page-description">' +
      escapeHtml(page.subtitle || "展示各项市场数据的实时取数通道状态与数据质量状态。") +
      "</div></div>" +
      renderTradeCenterSelector({
        selected: tradeCenterName,
        options: getDataMonitorTradeCenterOptions(),
        isOpen: state.ui.tradeCenterOpen,
        escapeHtml: escapeHtml,
        renderIcon: renderIcon,
      }) +
      "</section>" +
      renderDataMonitorAlert() +
      renderSectionHeading("实时状态列表", "展示当前交易中心各项市场数据的实时取数通道状态与质量状态") +
      renderDataMonitorTableSection() +
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
    var daily = state.settlement.activeTab === "日清算";

    if (daily) {
      var settlementTypeOptions = getDailySettlementFilterOptions("settlementType");
      var dataTypeOptions = getDailySettlementFilterOptions("dataType");
      var selectedSettlementType = ensureDailySettlementFilterValue("dailyStatementType", settlementTypeOptions);
      var selectedDataType = ensureDailySettlementFilterValue("dailyDataType", dataTypeOptions);
      var dailyFieldsHtml =
        '<div class="info-filter-field"><span class="filter-label">结算日期：</span>' +
        renderInfoDatePicker("settlement-day-range", "range") +
        "</div>" +
        renderBoundSelectFilter("结算类型", selectedSettlementType, settlementTypeOptions, "dailyStatementType", "settlement", "filter-select-native") +
        renderBoundSelectFilter("数据类型", selectedDataType, dataTypeOptions, "dailyDataType", "settlement", "filter-select-native");

      return (
        '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
        dailyFieldsHtml +
        '</div><div class="info-filter-actions">' +
        renderUiActionButton("重置", "ghost", "reset-settlement-day") +
        renderUiActionButton("查询", "primary", "query-settlement-day") +
        "</div></section>"
      );
    }

    var fieldsHtml = renderMonthFilter("结算月份", state.settlement.filters.monthlyMonth, "monthlyMonth", "settlement");

    return (
      '<section class="panel info-filter-panel"><div class="info-filter-fields">' +
      fieldsHtml +
      '</div><div class="info-filter-actions">' +
      renderUiActionButton("重置", "ghost", "reset-settlement-month") +
      renderUiActionButton("查询", "primary", "query-settlement-month") +
      "</div></section>"
    );
  }

  function renderSettlementPage() {
    syncSettlementStateForTradeCenter();

    var settlementMock = getSettlementMock();
    var activeTab = state.settlement.activeTab;
    var status = parseInfoStatus(settlementMock.statusText, getModulePublishTime(settlementMock));

    if (getSelectedTradeCenterKey() === "shaanxi" && activeTab === "日清算") {
      var shaanxiPageData = getSettlementViewPageData(activeTab, "");
      if (shaanxiPageData.updateTime && shaanxiPageData.dataSource) {
        status = {
          time: shaanxiPageData.updateTime,
          source: shaanxiPageData.dataSource,
          publishTime: getPagePublishTime(shaanxiPageData),
        };
      }
    }

    if (activeTab === "月结算") {
      return (
        renderMarketPageHeader(settlementMock.title || "日清月结", renderSettlementPageTabs(settlementMock.tabs || [], activeTab), {
          tradeCenterOptions: SETTLEMENT_TRADE_CENTER_OPTIONS,
          secondaryTabsHtml: renderMonthlySettlementSideSubTabs(getMonthlySettlementActiveData()),
        }) +
        renderSettlementFilterBar() +
        renderUnifiedSettlementContent() +
        "</div>"
      );
    }

    return (
      renderMarketPageHeader(settlementMock.title || "日清月结", renderSettlementPageTabs(settlementMock.tabs || [], activeTab), {
        tradeCenterOptions: SETTLEMENT_TRADE_CENTER_OPTIONS,
      }) +
      renderSettlementFilterBar() +
      renderDownloadOnlyBar(status, false) +
      renderUnifiedSettlementContent() +
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
    var status = parseInfoStatus(retailMock.statusText, getModulePublishTime(retailMock));
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
      publishTime: status.publishTime,
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
    var quarterLabels =
      (getMarketDisclosureMock().infoDisclosure && getMarketDisclosureMock().infoDisclosure.quarterHours) ||
      getInfoMock().quarterHours ||
      mock.quarterHours ||
      [];
    return quarterLabels.reduce(function reduceColumns(result, label, index) {
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
    var status = parseInfoStatus(rollingMock.statusText, getModulePublishTime(rollingMock));
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
    var status = parseInfoStatus(declarationMock.statusText, getModulePublishTime(declarationMock));

    return (
      renderMarketPageHeader(declarationMock.title || "日前申报", "") +
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
    if (!isCompareSupportedInCurrentContext()) {
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
      hasCompare: state.ui.hasCompare,
      escapeHtml: escapeHtml,
      renderIcon: renderIcon,
    });
  }

  function renderManualUpdateModalOverlay() {
    var isTimeSharingTarget = isTimeSharingManualUpdateContext();
    var isInfoDisclosureContext = isInfoDisclosureManualUpdateModalContext();
    if (!state.ui.manualUpdateModalVisible) {
      return "";
    }

    return renderManualUpdateModal({
      title: isInfoDisclosureContext ? "更新数据" : "手动更新",
      confirmText: isInfoDisclosureContext ? "更新" : "确认",
      mode: state.ui.manualUpdateMode,
      fileName: state.ui.manualUploadFileName,
      agentMonth: state.ui.manualUpdateAgentMonth,
      showAgentMonth: isTimeSharingTarget && isTimeSharingHistoryUpdateTargetTab(state.ui.manualUpdateTab),
      uploadLabel: isInfoDisclosureContext ? "上传文件" : "原始文件",
      uploadPlaceholder: isInfoDisclosureContext ? "上传" : "选择文件（仅模拟，不真实上传）",
      uploadHint: isInfoDisclosureContext ? "请上传交易中心下载的数据源文件" : "",
      pullLabel: isInfoDisclosureContext ? "运行日期" : "拉取日期",
      pullHint: isInfoDisclosureContext ? "为保证性能及合规风险，单次支持更新7天" : "",
      canSubmit: isTimeSharingTarget ? isManualUpdateSubmitReady() : isInfoDisclosureUpdateSubmitReady(),
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

  function renderDataMonitorDetailItem(label, value) {
    return (
      '<div class="data-monitor-detail-item"><span class="data-monitor-detail-label">' +
      escapeHtml(label) +
      '</span><span class="data-monitor-detail-value">' +
      escapeHtml(value || "-") +
      "</span></div>"
    );
  }

  function renderDataMonitorDetailSection(title, items) {
    return (
      '<section class="data-monitor-detail-section"><div class="data-monitor-detail-section-title">' +
      escapeHtml(title) +
      '</div><div class="data-monitor-detail-grid">' +
      (items || []).map(function mapItem(item) {
        return renderDataMonitorDetailItem(item.label, item.value);
      }).join("") +
      "</div></section>"
    );
  }

  function renderDataMonitorStatusReadonlyCard(title, items) {
    return (
      '<section class="data-monitor-status-card"><div class="data-monitor-status-card-title">' +
      escapeHtml(title) +
      '</div><div class="data-monitor-status-card-grid">' +
      (items || []).map(function mapItem(item) {
        return renderDataMonitorDetailItem(item.label, item.value);
      }).join("") +
      "</div></section>"
    );
  }

  function renderDataMonitorDetailDrawerOverlay() {
    var record;

    if (!state.ui.dataMonitorDetailDrawerVisible) {
      return "";
    }

    record = getDataMonitorRecordById(state.ui.dataMonitorSelectedRecordId);
    if (!record) {
      return "";
    }

    return (
      '<div class="drawer-overlay data-monitor-drawer-overlay">' +
      '<aside class="drawer-panel data-monitor-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="data-monitor-detail-title">' +
      '<div class="drawer-header"><strong id="data-monitor-detail-title">数据监控详情</strong><button class="notification-close" data-ui-action="close-data-monitor-detail">' +
      renderIcon("close", "notification-close-icon") +
      "</button></div>" +
      '<div class="drawer-body data-monitor-drawer-body">' +
      renderDataMonitorDetailSection("基础信息", [
        { label: "交易中心", value: record.tradeCenterName },
        { label: "业务模块", value: (record.categoryPath || []).join(" / ") || record.businessModule },
        { label: "数据项", value: record.dataItem },
      ]) +
      renderDataMonitorDetailSection("取数配置", [
        { label: "时间点位", value: record.timePoint },
        { label: "产出时间", value: record.outputTime },
        { label: "预警时间", value: record.warningTime },
        { label: "取值范围", value: record.valueRange },
        { label: "取数工具时效", value: record.fetchToolTimeliness },
        { label: "最近成功入库时间", value: record.lastSuccessAt },
        { label: "页面地址", value: record.pageAddress },
      ]) +
      '<section class="data-monitor-detail-section"><div class="data-monitor-detail-section-title">当前状态</div><div class="data-monitor-current-status-grid">' +
      renderDataMonitorStatusReadonlyCard("取数通道状态", [
        { label: "取数状态", value: getDataMonitorStatusText(record, "fetch") },
        { label: "取数异常类型", value: record.fetchExceptionType },
        { label: "取数异常时间", value: record.fetchExceptionAt },
        { label: "取数是否已通知", value: record.fetchNotified },
      ]) +
      renderDataMonitorStatusReadonlyCard("数据质量监控结果", [
        { label: "质量状态", value: getDataMonitorStatusText(record, "quality") },
        { label: "校验时间", value: record.checkAt },
        { label: "校验规则", value: record.checkRules },
        { label: "告警阈值", value: record.warningThreshold },
        { label: "质量是否已通知", value: record.qualityNotified },
      ]) +
      "</div></section>" +
      "</div></aside></div>"
    );
  }

  function renderDataMonitorIgnoreConfirmOverlay() {
    if (!state.ui.dataMonitorIgnoreConfirmVisible) {
      return "";
    }
    var confirmMode = state.ui.dataMonitorIgnoreConfirmMode || "ignore";
    var isRollback = confirmMode === "rollback";
    var title = isRollback ? "确认取消忽略该异常？" : "确认忽略该异常？";
    var text = isRollback
      ? "取消忽略后，本次异常将恢复为待处理状态，并重新进入异常告警统计。后续如仍满足告警条件，将继续触发当前批次告警通知。"
      : "忽略后，本次异常将不再触发告警通知，但仍会保留异常记录。后续新批次如再次异常，仍会重新生成异常记录。";
    var confirmAction = isRollback ? "confirm-data-monitor-rollback" : "confirm-data-monitor-ignore";
    var confirmText = isRollback ? "确认取消忽略" : "确认忽略";

    return (
      '<div class="overlay-backdrop data-monitor-ignore-backdrop">' +
      '<section class="modal-card data-monitor-ignore-modal" role="dialog" aria-modal="true" aria-labelledby="data-monitor-ignore-title">' +
      '<div class="modal-header"><strong id="data-monitor-ignore-title">' +
      escapeHtml(title) +
      '</strong><button class="notification-close" data-ui-action="cancel-data-monitor-ignore">' +
      renderIcon("close", "notification-close-icon") +
      "</button></div>" +
      '<div class="modal-body"><p class="data-monitor-ignore-text">' +
      escapeHtml(text) +
      "</p></div>" +
      '<div class="modal-footer"><button class="ghost-btn" data-ui-action="cancel-data-monitor-ignore"><span>取消</span></button><button class="primary-btn" data-ui-action="' +
      confirmAction +
      '"><span>' +
      escapeHtml(confirmText) +
      "</span></button></div>" +
      "</section></div>"
    );
  }

  function ensureDisclosureTimeState() {
    state.ui.disclosureTimeFilters = state.ui.disclosureTimeFilters || {
      tradeCenter: getSelectedTradeCenterKey(),
      dataKeyword: "",
      categoryKeyword: "",
    };
    if (!state.ui.disclosureTimeFilters.tradeCenter) {
      state.ui.disclosureTimeFilters.tradeCenter = getSelectedTradeCenterKey();
    }
    state.ui.disclosureTimePage = state.ui.disclosureTimePage || 1;
    return state.ui.disclosureTimeFilters;
  }

  function openDisclosureTimeDrawer() {
    var filters = ensureDisclosureTimeState();
    filters.tradeCenter = getSelectedTradeCenterKey();
    filters.dataKeyword = "";
    filters.categoryKeyword = "";
    state.ui.disclosureTimePage = 1;
    state.ui.disclosureTimeDrawerVisible = true;
  }

  function updateDisclosureTimeFilter(target) {
    var filters = ensureDisclosureTimeState();
    var key = target.getAttribute("data-disclosure-time-filter");
    filters[key] = target.value;
    state.ui.disclosureTimePage = 1;
  }

  function getDisclosureTimeTradeCenters() {
    return (dataDisclosureTimeConfig.tradeCenters && dataDisclosureTimeConfig.tradeCenters.length
      ? dataDisclosureTimeConfig.tradeCenters
      : [
          { key: "guangdong", name: "广东交易中心" },
          { key: "hunan", name: "湖南交易中心" },
          { key: "shaanxi", name: "陕西交易中心" },
        ]);
  }

  function matchesDisclosureKeyword(row, keyword, keys) {
    var normalizedKeyword = String(keyword || "").trim().toLowerCase();
    if (!normalizedKeyword) {
      return true;
    }
    return keys.some(function someKey(key) {
      return String(row[key] || "").toLowerCase().indexOf(normalizedKeyword) >= 0;
    });
  }

  function getFilteredDisclosureTimeRows() {
    var filters = ensureDisclosureTimeState();
    var rows = Array.isArray(dataDisclosureTimeConfig.rows) ? dataDisclosureTimeConfig.rows : [];

    return rows.filter(function filterRow(row) {
      var centerMatched = !filters.tradeCenter || filters.tradeCenter === "all" || row.tradeCenterKey === filters.tradeCenter;
      return (
        centerMatched &&
        matchesDisclosureKeyword(row, filters.dataKeyword, ["dataName", "dataSubItem"]) &&
        matchesDisclosureKeyword(row, filters.categoryKeyword, ["dataCategory", "dataName"])
      );
    });
  }

  function renderDisclosureTimeFilters() {
    var filters = ensureDisclosureTimeState();
    var centerOptions =
      '<option value="all"' +
      (filters.tradeCenter === "all" ? " selected" : "") +
      ">全部交易中心</option>" +
      getDisclosureTimeTradeCenters()
        .map(function mapCenter(center) {
          return (
            '<option value="' +
            escapeHtml(center.key) +
            '"' +
            (filters.tradeCenter === center.key ? " selected" : "") +
            ">" +
            escapeHtml(center.name) +
            "</option>"
          );
        })
        .join("");

    return (
      '<div class="disclosure-time-filters">' +
      '<label class="info-filter-field"><span class="filter-label">交易中心：</span><select class="filter-select-native" data-disclosure-time-filter="tradeCenter">' +
      centerOptions +
      "</select></label>" +
      '<label class="info-filter-field info-filter-input-field"><span class="filter-label">数据名称 / 数据子项：</span><input class="filter-input filter-input-wide" type="text" value="' +
      escapeHtml(filters.dataKeyword || "") +
      '" placeholder="请输入数据名称或子项" data-disclosure-time-filter="dataKeyword" /></label>' +
      '<label class="info-filter-field info-filter-input-field"><span class="filter-label">数据分类 / 数据分子：</span><input class="filter-input filter-input-wide" type="text" value="' +
      escapeHtml(filters.categoryKeyword || "") +
      '" placeholder="请输入分类或数据分子" data-disclosure-time-filter="categoryKeyword" /></label>' +
      "</div>"
    );
  }

  function renderDisclosureTimeTable(rows) {
    var columns = dataDisclosureTimeConfig.columns || [
      { key: "tradeCenter", label: "交易中心" },
      { key: "dataCategory", label: "数据分类" },
      { key: "dataName", label: "数据名称 / 数据分子" },
      { key: "dataSubItem", label: "数据子项" },
      { key: "priority", label: "优先级" },
      { key: "timePoint", label: "时间点位" },
      { key: "pageAddress", label: "页面地址" },
      { key: "downloadFile", label: "下载文件" },
      { key: "disclosureTime", label: "数据披露时间" },
      { key: "valueRange", label: "取值范围" },
      { key: "fetchToolTimeliness", label: "取数工具时效" },
      { key: "remark", label: "备注" },
    ];
    var totalRows = rows.length;
    var totalPages = Math.max(1, Math.ceil(totalRows / DISCLOSURE_TIME_PAGE_SIZE));
    var currentPage = Math.min(Math.max(Number(state.ui.disclosureTimePage) || 1, 1), totalPages);
    var startIndex = (currentPage - 1) * DISCLOSURE_TIME_PAGE_SIZE;
    var pageRows = rows.slice(startIndex, startIndex + DISCLOSURE_TIME_PAGE_SIZE);
    var headHtml = columns
      .map(function mapColumn(column) {
        return "<th>" + escapeHtml(column.label) + "</th>";
      })
      .join("");
    var bodyHtml = pageRows
      .map(function mapRow(row) {
        return (
          "<tr>" +
          columns
            .map(function mapColumn(column) {
              return '<td><span class="table-cell-text">' + escapeHtml(row[column.key] || "--") + "</span></td>";
            })
            .join("") +
          "</tr>"
        );
      })
      .join("");

    state.ui.disclosureTimePage = currentPage;

    if (!totalRows) {
      return (
        '<div class="disclosure-time-empty">' +
        renderEmptyState({
          escapeHtml: escapeHtml,
          renderIcon: renderIcon,
          message: "当前筛选条件下暂无数据披露时间配置",
        }) +
        "</div>"
      );
    }

    return (
      '<div class="table-wrap disclosure-time-table-wrap"><table class="data-table disclosure-time-table"><thead><tr>' +
      headHtml +
      "</tr></thead><tbody>" +
      bodyHtml +
      "</tbody></table></div>" +
      '<div class="disclosure-time-pagination"><span>共 ' +
      escapeHtml(totalRows) +
      " 条，第 " +
      escapeHtml(currentPage) +
      " / " +
      escapeHtml(totalPages) +
      ' 页</span><div class="disclosure-time-page-actions">' +
      '<button class="ghost-btn" data-ui-action="prev-disclosure-time-page"' +
      (currentPage <= 1 ? " disabled" : "") +
      ">上一页</button>" +
      '<button class="ghost-btn" data-ui-action="next-disclosure-time-page"' +
      (currentPage >= totalPages ? " disabled" : "") +
      ">下一页</button>" +
      "</div></div>"
    );
  }

  function renderDisclosureTimeDrawerOverlay() {
    var rows;

    if (!state.ui.disclosureTimeDrawerVisible) {
      return "";
    }

    rows = getFilteredDisclosureTimeRows();

    return (
      '<div class="drawer-overlay disclosure-time-drawer-overlay">' +
      '<aside class="drawer-panel disclosure-time-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="disclosure-time-title">' +
      '<div class="drawer-header"><div><strong id="disclosure-time-title">数据披露时间查询</strong><div class="disclosure-time-source">来源：' +
      escapeHtml(dataDisclosureTimeConfig.sourceFile || "交易市场披露数据梳理-副本 (2).xlsx") +
      '</div></div><button class="notification-close" data-ui-action="close-data-disclosure-time">' +
      renderIcon("close", "notification-close-icon") +
      "</button></div>" +
      '<div class="drawer-body disclosure-time-drawer-body">' +
      renderDisclosureTimeFilters() +
      renderDisclosureTimeTable(rows) +
      "</div>" +
      "</aside>" +
      "</div>"
    );
  }

  function renderOverlays() {
    return (
      renderCompareModalOverlay() +
      renderManualUpdateModalOverlay() +
      renderDownloadModalOverlay() +
      renderDownloadTaskDrawerOverlay() +
      renderDataMonitorDetailDrawerOverlay() +
      renderDataMonitorIgnoreConfirmOverlay() +
      renderDisclosureTimeDrawerOverlay() +
      renderFlashMessage()
    );
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
    if (currentPage.viewType === "data-monitor") {
      return renderDataMonitorPage();
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
    var compareHasData = true;
    if (!isCompareSupportedInCurrentContext()) {
      state.ui.compareError = "";
      state.ui.hasCompare = false;
      state.ui.compareModalVisible = false;
      closeDatePicker("compare-range", false);
      setFlashMessage("当前页面不支持对比。", "info");
      return;
    }
    if (!isRangeValid(state.ui.compareRangeDraft) || !isRangeValid(baseRange)) {
      state.ui.compareError = "请选择有效的对比日期范围。";
      return;
    }
    if (getRangeDays(state.ui.compareRangeDraft) !== getRangeDays(baseRange)) {
      state.ui.compareError = "对比日期需要与运行日期天数一致";
      return;
    }
    state.ui.compareError = "";
    state.ui.hasCompare = true;
    state.ui.compareModalVisible = false;
    closeDatePicker("compare-range", false);

    if (state.currentPageKey === "gd-trade-result") {
      compareHasData = hasTradeResultCompareData(state.tradeResult.activeTab);
    } else if (isInfoDisclosurePage(state.currentPageKey)) {
      var activeInfoTab = getActiveInfoTab();
      if (activeInfoTab === "全省统一出清价" || activeInfoTab === "交易结果") {
        compareHasData = hasTradeResultCompareData(activeInfoTab);
      } else if (activeInfoTab === "售电公司分时电量") {
        var saleCompanyCompareDataset = getSaleCompanyDataset(state.ui.compareRangeDraft);
        compareHasData = Boolean(saleCompanyCompareDataset && saleCompanyCompareDataset.hasData);
      } else if (activeInfoTab === INFO_DISCLOSURE_SELLER_HISTORY_TAB) {
        var sellerHistoryCompareDataset = getSellerHistoryDataset(state.ui.compareRangeDraft);
        compareHasData = Boolean(sellerHistoryCompareDataset && sellerHistoryCompareDataset.hasData);
      }
    }

    setFlashMessage(compareHasData ? "对比条件已生效。" : "对比日暂无数据。", compareHasData ? "success" : "info");
  }

  function confirmManualUpdate() {
    var isTimeSharingTarget = isTimeSharingManualUpdateContext();
    var activeInfoTab = isTimeSharingTarget ? state.ui.manualUpdateTab : getActiveInfoTab();
    state.ui.manualUpdateError = "";
    if (isTimeSharingTarget) {
      if (isTimeSharingHistoryUpdateTargetTab(activeInfoTab) && !state.ui.manualUpdateAgentMonth) {
        state.ui.manualUpdateError = "请选择代理月份。";
        return;
      }
      if (state.ui.manualUpdateMode === "upload") {
        if (!state.ui.manualUploadFileName) {
          state.ui.manualUpdateError = "请上传交易中心下载的数据源文件。";
          return;
        }
        setInfoUpdateOverride(activeInfoTab, "人工上传");
      } else {
        if (!isRangeValid(state.ui.manualPullRangeDraft)) {
          state.ui.manualUpdateError = "请选择有效的运行日期范围。";
          return;
        }
        if (getRangeDays(state.ui.manualPullRangeDraft) > 7) {
          state.ui.manualUpdateError = "单次系统拉取最多支持7天";
          return;
        }
        setInfoUpdateOverride(activeInfoTab, "系统拉取");
      }
      state.ui.manualUpdateModalVisible = false;
      state.ui.manualUpdateContext = "";
      state.ui.manualUpdateTab = "";
      closeDatePicker("manual-pull-range", false);
      setFlashMessage("更新成功，数据更新时间已刷新。", "success");
      return;
    }

    if (state.ui.manualUpdateMode === "upload") {
      if (!state.ui.manualUploadFileName) {
        state.ui.manualUpdateError = isInfoDisclosureManualUpdateModalContext() ? "请上传交易中心下载的数据源文件。" : "请选择原始文件。";
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
    state.ui.manualUpdateContext = "";
    state.ui.manualUpdateTab = "";
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
      if (!isCompareSupportedInCurrentContext()) {
        state.ui.hasCompare = false;
        state.ui.compareModalVisible = false;
        state.ui.compareError = "";
        setFlashMessage("当前页面不支持对比。", "info");
        return true;
      }
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
    if (action === "cancel-compare") {
      state.ui.hasCompare = false;
      state.ui.compareModalVisible = false;
      state.ui.compareError = "";
      closeDatePicker("compare-range", false);
      setFlashMessage("已取消对比。", "info");
      return true;
    }
    if (action === "confirm-compare") {
      confirmCompare();
      return true;
    }
    if (action === "open-seller-time-sharing-update" || action === "open-time-sharing-update") {
      syncManualUpdateDraftToCurrentContext();
      state.ui.manualUpdateModalVisible = true;
      state.ui.manualUpdateError = "";
      return true;
    }
    if (action === "open-manual-update") {
      if (isInfoDisclosurePage(state.currentPageKey)) {
        syncManualUpdateDraftToCurrentContext();
      } else {
        state.ui.manualUpdateContext = "";
        state.ui.manualUpdateTab = "";
      }
      state.ui.manualUpdateModalVisible = true;
      state.ui.manualUpdateError = "";
      return true;
    }
    if (action === "close-manual-update") {
      state.ui.manualUpdateModalVisible = false;
      state.ui.manualUpdateContext = "";
      state.ui.manualUpdateTab = "";
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
    if (action === "open-data-disclosure-time") {
      openDisclosureTimeDrawer();
      return true;
    }
    if (action === "close-data-disclosure-time") {
      state.ui.disclosureTimeDrawerVisible = false;
      return true;
    }
    if (action === "prev-disclosure-time-page") {
      state.ui.disclosureTimePage = Math.max(1, (state.ui.disclosureTimePage || 1) - 1);
      return true;
    }
    if (action === "next-disclosure-time-page") {
      state.ui.disclosureTimePage = (state.ui.disclosureTimePage || 1) + 1;
      return true;
    }
    if (action === "refresh-empty-state") {
      setFlashMessage("刷新请求已提交。", "info");
      return true;
    }
    if (action === "query-info-disclosure-filters") {
      var infoFilterPageData = getInfoDisclosurePageData();
      var infoFilterRange = getInfoDisclosureActiveRange(infoFilterPageData);
      if (!isRangeValid(infoFilterRange)) {
        setFlashMessage("请选择有效的运行日期。", "info");
        return true;
      }
      if (isCurrentMarketDisclosureView()) {
        getMarketDisclosureState().lastUpdatedAt = formatDateTime(new Date());
        getMarketDisclosureState().queryCount += 1;
      }
      if (isSingleMetricLoadPage(infoFilterPageData)) {
        triggerSingleMetricLoadRefresh();
        return true;
      }
      setFlashMessage("已按当前运行日期和筛选条件刷新数据。", "success");
      return true;
    }
    if (action === "reset-info-disclosure-filters") {
      var resetFilterPageData = getInfoDisclosurePageData();
      resetUnifiedInfoDisclosureFieldFilters(resetFilterPageData);
      if ((resetFilterPageData && resetFilterPageData.viewType === "nodePrice") || getActiveInfoTab() === "节点电价") {
        state.tradeResult.filters.nodeKeyword = "";
      }
      state.info.profileViewMode = "";
      setFlashMessage("筛选条件已重置。", "info");
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
      if (isSingleMetricLoadPage(getInfoDisclosurePageData())) {
        triggerSingleMetricLoadRefresh();
        return true;
      }
      setFlashMessage("已按当前筛选条件刷新数据披露内容。", "success");
      return true;
    }
    if (action === "reset-market-disclosure") {
      var pageMock = getMarketDisclosureMock();
      var pageStateValue = getMarketDisclosureState();
      var unifiedPageData = getInfoDisclosurePageData();
      resetUnifiedInfoDisclosureFieldFilters(unifiedPageData);
      if (isUnifiedInfoDisclosureSingleDateMode(unifiedPageData) || (unifiedPageData.filters && unifiedPageData.filters.date)) {
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
      if (isSingleMetricLoadPage(unifiedPageData)) {
        triggerSingleMetricLoadRefresh();
        return true;
      }
      setFlashMessage("日期筛选已恢复默认。", "info");
      return true;
    }
    if (action === "query-sale-company") {
      var saleCompanyQueryRange = getInfoTimeSharingRange();
      if (!isRangeValid(saleCompanyQueryRange)) {
        setFlashMessage("请选择有效的运行日期范围。", "info");
        return true;
      }
      if (getRangeDays(saleCompanyQueryRange) > 366) {
        setFlashMessage("单次查询时间范围最大支持 1 年", "info");
        return true;
      }
      setInfoTimeSharingRange(saleCompanyQueryRange);
      state.ui.hasCompare = false;
      state.info.companyQueryAt = Date.now();
      setFlashMessage("已按当前运行日期和筛选条件更新售电公司分时电量。", "success");
      return true;
    }
    if (action === "reset-sale-company") {
      resetSaleCompanyPowerBusinessFilters();
      state.info.companyQueryAt = Date.now();
      setFlashMessage("售电公司分时电量筛选已重置。", "info");
      return true;
    }
    if (action === "query-enterprise") {
      var enterpriseQueryRange = getInfoTimeSharingRange();
      if (!isRangeValid(enterpriseQueryRange)) {
        setFlashMessage("请选择有效的运行日期范围。", "info");
        return true;
      }
      if (getRangeDays(enterpriseQueryRange) > 366) {
        setFlashMessage("单次查询时间范围最大支持 1 年", "info");
        return true;
      }
      setFlashMessage("已按当前筛选条件更新用电企业分时电量。", "success");
      return true;
    }
    if (action === "reset-enterprise") {
      resetEnterprisePowerBusinessFilters();
      setFlashMessage("用电企业分时电量筛选已重置。", "info");
      return true;
    }
    if (action === "query-seller-history") {
      if (!state.info.filters.sellerHistoryAgentMonth) {
        setFlashMessage("请选择代理月份。", "info");
        return true;
      }
      var sellerHistoryRange = getInfoTimeSharingRange();
      if (!isRangeValid(sellerHistoryRange)) {
        setFlashMessage("请选择有效的运行日期范围。", "info");
        return true;
      }
      state.info.sellerHistoryQueryAt = Date.now();
      setFlashMessage("已按当前筛选条件更新售电公司分时电量历史回溯。", "success");
      return true;
    }
    if (action === "reset-seller-history") {
      resetSellerHistoryFilters();
      state.info.sellerHistoryQueryAt = Date.now();
      setFlashMessage("售电公司分时电量历史回溯筛选已重置。", "info");
      return true;
    }
    if (action === "query-user-history") {
      if (!state.info.filters.userHistoryAgentMonth) {
        setFlashMessage("请选择代理月份。", "info");
        return true;
      }
      var userHistoryRange = getInfoTimeSharingRange();
      if (!isRangeValid(userHistoryRange)) {
        setFlashMessage("请选择有效的运行日期范围。", "info");
        return true;
      }
      state.info.userHistoryQueryAt = Date.now();
      setFlashMessage("已按当前筛选条件更新用电企业分时电量历史回溯。", "success");
      return true;
    }
    if (action === "reset-user-history") {
      resetUserHistoryFilters();
      state.info.userHistoryQueryAt = Date.now();
      setFlashMessage("用电企业分时电量历史回溯筛选已重置。", "info");
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
      state.settlement.filters.dailyRange = getSettlementDefaultDailyRange();
      state.settlement.filters.dailyUserName = "";
      state.settlement.filters.dailyAccountNo = "";
      state.settlement.filters.dailySellerCompanyName = "";
      state.settlement.filters.dailySettlementUnitName = "";
      state.settlement.filters.dailyStatementKey = "";
      state.settlement.filters.dailyStatementType = "全部";
      state.settlement.filters.dailyDataType = "全部";
      setFlashMessage("日清算筛选已重置。", "info");
      return true;
    }
    if (action === "query-settlement-month") {
      setFlashMessage(
        getSelectedTradeCenterKey() === "hunan"
          ? "已按结算月份刷新湖南月结算页面全部数据。"
          : getSelectedTradeCenterKey() === "shaanxi"
            ? "已按结算月份刷新陕西月结算页面全部数据。"
            : "已更新月结算结果。",
        "success"
      );
      return true;
    }
    if (action === "reset-settlement-month") {
      state.settlement.filters.monthlyMonth = getSettlementDefaultMonth();
      state.settlement.filters.monthlyUserName = "";
      state.settlement.filters.monthlyAccountNo = "";
      state.settlement.filters.monthlySellerCompanyName = "";
      state.settlement.filters.monthlyEnterpriseName = "";
      state.settlement.filters.monthlyEnterpriseAccountNo = "";
      state.settlement.monthlySide = "购电侧";
      clearMonthlyRetailFilters();
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
      if (!isInfoDisclosurePage(state.currentPageKey)) {
        state.declaration.filters.declarationRange = {
          start: "2026-05-09",
          end: "2026-05-09",
        };
      }
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
    if (action === "reload-data-monitor") {
      setFlashMessage("数据监控已重新加载。", "success");
      return true;
    }
    if (action === "open-data-monitor-detail") {
      state.ui.dataMonitorSelectedRecordId = target.getAttribute("data-record-id") || "";
      state.ui.dataMonitorDetailDrawerVisible = true;
      state.ui.dataMonitorIgnoreConfirmVisible = false;
      state.ui.dataMonitorPendingIgnoreId = "";
      state.ui.dataMonitorIgnoreConfirmMode = "ignore";
      closeAllPanels();
      return true;
    }
    if (action === "close-data-monitor-detail") {
      state.ui.dataMonitorDetailDrawerVisible = false;
      state.ui.dataMonitorSelectedRecordId = "";
      return true;
    }
    if (action === "open-data-monitor-ignore") {
      state.ui.dataMonitorPendingIgnoreId = target.getAttribute("data-record-id") || "";
      state.ui.dataMonitorIgnoreConfirmVisible = true;
      state.ui.dataMonitorIgnoreConfirmMode = "ignore";
      return true;
    }
    if (action === "open-data-monitor-rollback") {
      state.ui.dataMonitorPendingIgnoreId = target.getAttribute("data-record-id") || "";
      state.ui.dataMonitorIgnoreConfirmVisible = true;
      state.ui.dataMonitorIgnoreConfirmMode = "rollback";
      return true;
    }
    if (action === "cancel-data-monitor-ignore") {
      state.ui.dataMonitorIgnoreConfirmVisible = false;
      state.ui.dataMonitorPendingIgnoreId = "";
      state.ui.dataMonitorIgnoreConfirmMode = "ignore";
      return true;
    }
    if (action === "confirm-data-monitor-ignore") {
      var ignoreId = state.ui.dataMonitorPendingIgnoreId;
      ensureDataMonitorState();
      if (ignoreId && state.dataMonitor.ignoredIds.indexOf(ignoreId) < 0) {
        state.dataMonitor.ignoredIds.push(ignoreId);
      }
      state.dataMonitor.ignoredMeta = state.dataMonitor.ignoredMeta || {};
      if (ignoreId) {
        state.dataMonitor.ignoredMeta[ignoreId] = {
          ignoredAt: formatDateTime(new Date()).slice(0, 16),
          ignoredBy: "张三",
          reason: "源端维护，等待下一批次",
        };
      }
      state.ui.dataMonitorIgnoreConfirmVisible = false;
      state.ui.dataMonitorPendingIgnoreId = "";
      state.ui.dataMonitorIgnoreConfirmMode = "ignore";
      setFlashMessage("已忽略当前异常。", "success");
      return true;
    }
    if (action === "confirm-data-monitor-rollback") {
      var rollbackId = state.ui.dataMonitorPendingIgnoreId;
      ensureDataMonitorState();
      if (rollbackId) {
        state.dataMonitor.ignoredIds = state.dataMonitor.ignoredIds.filter(function filterIgnoredId(recordId) {
          return recordId !== rollbackId;
        });
        if (state.dataMonitor.rollbackIgnoredIds.indexOf(rollbackId) < 0) {
          state.dataMonitor.rollbackIgnoredIds.push(rollbackId);
        }
        if (state.dataMonitor.ignoredMeta) {
          delete state.dataMonitor.ignoredMeta[rollbackId];
        }
      }
      state.ui.dataMonitorIgnoreConfirmVisible = false;
      state.ui.dataMonitorPendingIgnoreId = "";
      state.ui.dataMonitorIgnoreConfirmMode = "ignore";
      setFlashMessage("已取消忽略，异常已恢复待处理。", "success");
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
      state.ui.disclosureTimeDrawerVisible = false;
      state.ui.dataMonitorDetailDrawerVisible = false;
      state.ui.dataMonitorIgnoreConfirmVisible = false;
      state.ui.dataMonitorIgnoreConfirmMode = "ignore";
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
      if (state.currentPageKey === "data-monitor") {
        state.ui.selectedTradeCenter = selectedTradeCenter;
        state.ui.tradeCenterOpen = false;
        state.ui.activeDatePickerId = null;
        state.ui.datePickerDrafts = {};
        ensureDataMonitorState().filters.categoryPath = [];
        renderApp();
        return;
      }
      var nextTradeCenterKey = getTradeCenterDataPageKey(selectedTradeCenter);
      var nextMarketState = state.marketDisclosure.pages && state.marketDisclosure.pages[nextTradeCenterKey];
      var selectedCenterKey = getTradeCenterKeyByName(selectedTradeCenter);
      var selectedNodePriceMock = getUnifiedNodePriceMockForCenter(selectedCenterKey);
      var selectedTradingResultMock = getUnifiedTradingResultMockForCenter(selectedCenterKey);
      var nextDisclosureDefaultDate = getTradeCenterDefaultDisclosureDate(selectedCenterKey);
      state.ui.selectedTradeCenter = selectedTradeCenter;
      state.ui.tradeCenterOpen = false;
      state.ui.activeDatePickerId = null;
      state.ui.datePickerDrafts = {};
      state.ui.hasCompare = false;
      state.info.selectedMetric = "";
      state.ui.singleMetricLoadUpdatedAt = "";
      resetInfoDisclosureFiltersForTradeCenterSwitch();
      ensureVisibleInfoDisclosureTab();
      if (selectedNodePriceMock && selectedNodePriceMock.date) {
        state.tradeResult.filters.nodeRunRange = {
          start: selectedNodePriceMock.date,
          end: selectedNodePriceMock.date,
        };
      }
      if (selectedTradingResultMock && selectedTradingResultMock.date) {
        state.tradeResult.filters.marketRunRange = {
          start: selectedTradingResultMock.date,
          end: selectedTradingResultMock.date,
        };
      }
      if (nextMarketState && nextDisclosureDefaultDate) {
        nextMarketState.filterRange = { start: nextDisclosureDefaultDate, end: nextDisclosureDefaultDate };
        nextMarketState.appliedRange = { start: nextDisclosureDefaultDate, end: nextDisclosureDefaultDate };
        nextMarketState.queryCount = 0;
      }
      triggerSingleMetricLoadRefresh();
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
      var appliedPickerId = datePickerApply.getAttribute("data-date-picker-apply");
      if (applyDatePicker(appliedPickerId)) {
        triggerSingleMetricLoadRefresh();
        return;
      }
      if (appliedPickerId === "trade-node-runtime" || appliedPickerId === "trade-result-runtime") {
        state.ui.hasCompare = false;
      }
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
      var visibleSecondaryTabs = getVisibleInfoSecondaryTabs(state.info.primaryTab);
      if (state.info.primaryTab === INFO_DISCLOSURE_TIME_SHARING_TAB) {
        state.info.secondaryTab = visibleSecondaryTabs[0] || "";
      } else if (state.info.primaryTab === "负荷信息" && visibleSecondaryTabs.indexOf(state.info.secondaryTab) < 0) {
        state.info.secondaryTab = visibleSecondaryTabs[0] || "";
      }
      ensureVisibleInfoDisclosureTab();
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
      ensureVisibleInfoDisclosureTab();
      if (state.info.secondaryTab !== "负荷信息") {
        state.ui.hasCompare = false;
      }
      state.ui.downloadDataType = getCurrentDownloadType();
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

    var monthlySettlementSideButton = event.target.closest("[data-monthly-settlement-side]");
    if (monthlySettlementSideButton) {
      state.settlement.monthlySide = monthlySettlementSideButton.getAttribute("data-monthly-settlement-side");
      renderApp();
      return;
    }

    var infoMetricToggle = event.target.closest("[data-info-metric-toggle]");
    if (infoMetricToggle) {
      toggleMetricBranch(infoMetricToggle.getAttribute("data-info-metric-toggle"));
      return;
    }

    var infoMetricButton = event.target.closest("[data-info-metric]");
    if (infoMetricButton) {
      var nextInfoMetric = infoMetricButton.getAttribute("data-info-metric");
      var nextInfoMetricItem = getSingleMetricLoadSidebarItemById(getInfoDisclosurePageData(), nextInfoMetric);
      var hasInfoMetricChildren =
        nextInfoMetricItem && Array.isArray(nextInfoMetricItem.children) && nextInfoMetricItem.children.length > 0;
      if (hasInfoMetricChildren) {
        if (state.info.expandedMetrics.has(nextInfoMetric)) {
          state.info.expandedMetrics.delete(nextInfoMetric);
        } else {
          state.info.expandedMetrics.add(nextInfoMetric);
        }
      }
      state.info.selectedMetric = nextInfoMetric;
      triggerSingleMetricLoadRefresh();
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

    var dataMonitorCategory = event.target.closest("[data-data-monitor-category]");
    if (dataMonitorCategory) {
      ensureDataMonitorState().filters.categoryPath = parseDataMonitorPath(dataMonitorCategory.getAttribute("data-data-monitor-category"));
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
      state.ui.dataMonitorIgnoreConfirmVisible = false;
      state.ui.dataMonitorIgnoreConfirmMode = "ignore";
      closeAllPanels();
      renderApp();
      return;
    }

    if (event.target.classList.contains("drawer-overlay")) {
      state.ui.downloadTaskDrawerVisible = false;
      state.ui.disclosureTimeDrawerVisible = false;
      state.ui.dataMonitorDetailDrawerVisible = false;
      renderApp();
      return;
    }

    if (!event.target.closest(".selector-shell") && (state.ui.tradeCenterOpen || state.ui.activeDatePickerId)) {
      closeAllPanels();
      renderApp();
    }
  });

  function updateScopedFilterValue(target) {
    var scope = target.getAttribute("data-filter-scope");
    var key = target.getAttribute("data-filter-key");
    if (scope === "info") {
      state.info.filters[key] = target.value;
      if (key === "sellerHistoryAgentMonth") {
        state.info.filters.sellerHistoryRange = getDefaultHistoryRange("seller", target.value);
      }
      if (key === "userHistoryAgentMonth") {
        state.info.filters.userHistoryRange = getDefaultHistoryRange("user", target.value);
      }
    } else if (scope === "tradeResult") {
      state.tradeResult.filters[key] = target.value;
    } else if (scope === "settlement") {
      state.settlement.filters[key] = target.value;
    } else if (scope === "rollingData") {
      state.rollingData.filters[key] = target.value;
    } else if (scope === "retailRelation") {
      state.retailRelation.filters[key] = target.value;
    } else if (scope === "declaration") {
      state.declaration.filters[key] = target.value;
    } else if (scope === "fetchMonitor") {
      state.fetchMonitor.filters[key] = target.value;
    } else if (scope === "dataMonitor") {
      ensureDataMonitorState().filters[key] = target.value;
      if (key !== "summaryFilter") {
        ensureDataMonitorState().filters.summaryFilter = "全部";
      }
    } else if (scope === "spotTradingSimulation") {
      state.spotTradingSimulation.filters[key] = target.value;
    } else if (scope === "spotMockTrading") {
      state.spotMockTrading.filters[key] = target.value;
    } else if (scope === "dayAheadLoadPrediction") {
      state.dayAheadLoadPrediction.filters[key] = target.value;
    } else if (scope === "spotPricePrediction") {
      state.spotPricePrediction.filters[key] = target.value;
    }
  }

  document.addEventListener("input", function handleInput(event) {
    if (event.target.matches('[data-disclosure-time-filter][type="text"]')) {
      updateDisclosureTimeFilter(event.target);
      renderApp();
      return;
    }

    if (event.target.matches('[data-filter-scope][data-filter-key][type="text"]')) {
      updateScopedFilterValue(event.target);
      renderApp();
    }

    if (event.target.matches('[data-filter-field][type="text"]')) {
      state.info.filters[event.target.getAttribute("data-filter-field")] = event.target.value;
      renderApp();
    }
  });

  document.addEventListener("change", function handleChange(event) {
    if (event.target.matches("select[data-disclosure-time-filter]")) {
      updateDisclosureTimeFilter(event.target);
      renderApp();
      return;
    }

    if (event.target.matches("[data-manual-upload-file]")) {
      state.ui.manualUploadFileName = event.target.files && event.target.files[0] ? event.target.files[0].name : "";
      renderApp();
      return;
    }

    if (event.target.matches("[data-manual-update-agent-month]")) {
      state.ui.manualUpdateAgentMonth = event.target.value;
      state.ui.manualUpdateError = "";
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
      updateScopedFilterValue(event.target);
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
    global.location.hash = registry.getHashFromPageKey(registry.getPageKeyFromLocation(global.location));
  }

  pageState.syncFromHash(state, registry, global.location);
  renderApp();
})(window);
