(function attachMockData(global) {
  var appMocks = {
    platformMenu: global.BOSS_PLATFORM_MENU_MOCK,
    businessCenter: global.BOSS_BUSINESS_CENTER_MOCK,
    guangdong: global.BOSS_GUANGDONG_DATA_MOCK,
    hunan: global.BOSS_HUNAN_DATA_MOCK,
    shaanxi: global.BOSS_SHAANXI_DATA_MOCK,
    rawPowerData: global.BOSS_RAW_POWER_DATA_MOCK,
    powerDataAdapter: global.BOSS_POWER_DATA_ADAPTER,
    nodePriceByCenter: global.BOSS_NODE_PRICE_MOCK_BY_CENTER,
    tradingResultByCenter: global.BOSS_TRADING_RESULT_MOCK_BY_CENTER,
    marketPageData: global.BOSS_MARKET_PAGE_DATA,
    downloadTasks: global.BOSS_DOWNLOAD_TASKS_MOCK,
    operationRecord: global.BOSS_OPERATION_RECORD_MOCK,
    fetchMonitor: global.BOSS_FETCH_MONITOR_MOCK,
    dataMonitor: global.BOSS_DATA_MONITOR_MOCK,
    simulation: global.BOSS_SIMULATION_DATA_MOCK,
    algorithm: global.BOSS_ALGORITHM_DATA_MOCK,
  };

  global.BOSS_APP_MOCKS = appMocks;
  global.BOSS_MOCK_DATA = {
    hours: appMocks.guangdong.infoDisclosure.hours,
    quarterHours: appMocks.guangdong.infoDisclosure.quarterHours,
    overviewSections: appMocks.businessCenter.overviewSections,
    primaryTabs: appMocks.guangdong.infoDisclosure.primaryTabs,
    secondaryTabs: appMocks.guangdong.infoDisclosure.secondaryTabs,
    metricTree: appMocks.guangdong.infoDisclosure.metricTree,
    metricSeries: appMocks.guangdong.infoDisclosure.metricSeries,
    reserveForecast: appMocks.guangdong.infoDisclosure.reserveForecast,
    reserveActual: appMocks.guangdong.infoDisclosure.reserveActual,
    reserveRows: appMocks.guangdong.infoDisclosure.reserveRows,
    notification: appMocks.simulation.notification,
  };
})(window);
