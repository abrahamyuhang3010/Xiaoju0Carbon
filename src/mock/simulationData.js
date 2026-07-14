(function attachSimulationDataMock(global) {
  // 仿真平台 mock：现货仿真回测 + 现货模拟交易 + 交易决策分析。
  // 数据依据录屏 OCR 还原，覆盖广东/陕西两个交易中心。
  // 策略命名、版本号、回测/交易日期、收益数值均与录屏保持一致。

  var TRADE_CENTERS = [
    { key: "guangdong", name: "广东电力交易中心" },
    { key: "shaanxi", name: "陕西电力交易中心" },
  ];

  // 仿真回测的策略池（含版本与回测日期范围，录屏中出现的真实值）
  var BACKTEST_STRATEGIES = [
    { id: "mean-v130", name: "均值策略", version: "v1.3.0", range: ["2026-06-01", "2026-06-10"] },
    { id: "forecast-declare-v140-a", name: "预测直申策略", version: "v1.4.0", range: ["2025-04-01", "2025-04-30"] },
    { id: "forecast-declare-v140-b", name: "预测直申策略", version: "v1.4.0", range: ["2025-07-01", "2025-07-31"] },
    { id: "guangdong-fusion-v10", name: "广东融合优化交易策略", version: "v1.0", range: ["2025-07-01", "2025-07-31"] },
    { id: "guangdong-adaptive-v10", name: "广东自适应直申策略", version: "v1.0", range: ["2025-07-01", "2025-07-31"] },
    { id: "guangdong-endtoend-trade", name: "广东端到端策略", version: "trade-v3.2.4", range: ["2025-07-01", "2025-07-31"] },
    { id: "multi-spread-2278281521", name: "多价差多负荷结合出清价优化策略", version: "2278281521", range: ["2025-07-01", "2025-07-31"] },
    { id: "forecast-declare-v140-c", name: "预测直申策略", version: "v1.4.0", range: ["2025-08-01", "2025-08-31"] },
    { id: "forecast-declare-v140-d", name: "预测直申策略", version: "v1.4.0", range: ["2025-06-01", "2025-06-30"] },
    { id: "forecast-declare-v140-e", name: "预测直申策略", version: "v1.4.0", range: ["2025-04-01", "2025-07-31"] },
    { id: "mean-v130-jul", name: "均值策略", version: "v1.3.0", range: ["2025-07-01", "2025-07-31"] },
  ];

  // 每条回测记录的核心指标（与录屏表格列一致）
  var BACKTEST_RECORD_SEED = [
    { strategy: "mean-v130", totalProfit: 64307, perKwhProfit: 2, achievementRate: 13.2, sharpe: 0.02, maxLoss: -49416, lossDays: 7, winRate: 30, backtestRuns: 18 },
    { strategy: "forecast-declare-v140-a", totalProfit: 394506, perKwhProfit: 5.11, achievementRate: 52.2, sharpe: 0.16, maxLoss: -6381, lossDays: 1, winRate: 86.7, backtestRuns: 33.2 },
    { strategy: "forecast-declare-v140-b", totalProfit: 150355, perKwhProfit: 1.73, achievementRate: 18.7, sharpe: 0.04, maxLoss: -25876, lossDays: 3, winRate: 64.5, backtestRuns: 22 },
    { strategy: "guangdong-fusion-v10", totalProfit: 298099, perKwhProfit: 3.42, achievementRate: 37.1, sharpe: 0.14, maxLoss: -16570, lossDays: 2, winRate: 83.9, backtestRuns: 10.7 },
    { strategy: "guangdong-adaptive-v10", totalProfit: 161441, perKwhProfit: 1.85, achievementRate: 20.1, sharpe: 0.15, maxLoss: -16853, lossDays: 4, winRate: 74.2, backtestRuns: 4 },
    { strategy: "mean-v130-jul", totalProfit: 2619, perKwhProfit: 0.03, achievementRate: 0.3, sharpe: 0, maxLoss: -67223, lossDays: 4, winRate: 54.8, backtestRuns: 1 },
    { strategy: "forecast-declare-v140-c", totalProfit: 155480, perKwhProfit: 1.82, achievementRate: 33.2, sharpe: 0.12, maxLoss: -13912, lossDays: 5, winRate: 71, backtestRuns: 3.9 },
    { strategy: "forecast-declare-v140-d", totalProfit: 390294, perKwhProfit: 4.78, achievementRate: 35.2, sharpe: 0.17, maxLoss: -15770, lossDays: 3, winRate: 80, backtestRuns: 19.1 },
    { strategy: "forecast-declare-v140-e", totalProfit: 1252042, perKwhProfit: 3.83, achievementRate: 33.5, sharpe: 0.1, maxLoss: -25876, lossDays: 3, winRate: 74.6, backtestRuns: 69 },
    { strategy: "guangdong-endtoend-trade", totalProfit: 150355, perKwhProfit: 1.73, achievementRate: 18.7, sharpe: 0.04, maxLoss: -25876, lossDays: 3, winRate: 64.5, backtestRuns: 22 },
    { strategy: "multi-spread-2278281521", totalProfit: 161441, perKwhProfit: 1.85, achievementRate: 20.1, sharpe: 0.15, maxLoss: -16853, lossDays: 4, winRate: 74.2, backtestRuns: 4 },
  ];

  // 回测详情 14 项指标（以均值策略 v1.3.0 为基准，其余按 totalProfit 比例推算）
  function buildBacktestDetail(strategyId, seed) {
    var ratio = seed.totalProfit / 64307;
    return {
      strategyProfit: seed.totalProfit,
      perKwhProfit: seed.perKwhProfit,
      achievementRate: seed.achievementRate,
      winRate: seed.winRate,
      tradeSuccessRate: Math.min(99.9, Math.round((64.4 * Math.max(0.5, ratio)) * 10) / 10),
      successProfitRate: Math.min(99.9, Math.round((70.9 * Math.max(0.5, ratio)) * 10) / 10),
      failureLossRate: Math.min(99.9, Math.round((91.4 / Math.max(0.6, ratio)) * 10) / 10),
      perKwhSharpe: Math.round(1.8 * Math.max(0.3, ratio) * 10) / 10,
      sharpe: seed.sharpe,
      maxDailyLoss: seed.maxLoss,
      maxContinuousLossDays: seed.lossDays,
      weightedLoadForecastAccuracy: Math.min(99.9, Math.round((85.9 + (ratio - 1) * 3) * 10) / 10),
      weightedDeviationForecastAccuracy: Math.min(99.9, Math.round((60.6 + (ratio - 1) * 2) * 10) / 10),
    };
  }

  // 生成回测周期内的每日累计收益序列（用于趋势图）
  function buildBacktestDailySeries(range, totalProfit) {
    var start = new Date(range[0]);
    var end = new Date(range[1]);
    var days = Math.round((end - start) / 86400000) + 1;
    var series = [];
    var cumulative = 0;
    for (var i = 0; i < days; i++) {
      var d = new Date(start.getTime() + i * 86400000);
      var label = String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      // 每日收益在 totalProfit 附近波动，末值收敛到 totalProfit
      var daily = i === days - 1
        ? totalProfit - cumulative
        : Math.round((totalProfit / days) * (0.6 + ((i * 37) % 100) / 100));
      cumulative += daily;
      series.push({ date: label, daily: daily, cumulative: cumulative });
    }
    return series;
  }

  // 逐笔回测明细行（日电价/价差/准确率等与录屏一致）
  function buildBacktestDetailRows(strategyId, range, seed) {
    var rows = [];
    var basePrices = [423.2, 396.41, 361.49, 347.33, 330.6, 329.48, 345.28, 348.63, 392.21, 388.64];
    var realtimePrices = [363.87, 320.05, 293.51, 288.91, 299.26, 304.55, 324.45, 292.62, 241.51, 212.58];
    var successProfits = [-3675, 2205, 1178, 806, 575, 657, 916, 2578, 2667, 1833];
    var successRates = [0, 85.3, 71.5, 65.9, 93.3, 100, 100, 100, 100, 79.9];
    var loadAccuracies = [96.6, 96.3, 92.9, 91.5, 98.3, 99.7, 99.4, 96, 95.9, 95];
    var count = 10;
    for (var i = 0; i < count; i++) {
      var failed = i === 0;
      var dayahead = basePrices[i];
      var realtime = realtimePrices[i];
      rows.push({
        index: i,
        tradeDate: range[0],
        result: failed ? "失败" : "成功",
        successProfit: successProfits[i],
        successRate: successRates[i],
        failureLossRate: failed ? 120.5 : 0,
        dayaheadPrice: dayahead,
        realtimePrice: realtime,
        priceForecast: failed ? "错误" : "正确",
        spread: Math.round((dayahead - realtime) * 100) / 100,
        loadForecastAccuracy: loadAccuracies[i],
        profit: Math.round((dayahead - realtime) * 0.7 * 100) / 100,
      });
    }
    return rows;
  }

  function buildSimulationBacktest(centerKey) {
    var records = BACKTEST_RECORD_SEED.map(function mapSeed(seed, idx) {
      var strategy = BACKTEST_STRATEGIES.find(function findStrategy(s) { return s.id === seed.strategy; }) || BACKTEST_STRATEGIES[0];
      return {
        id: "backtest-" + centerKey + "-" + idx,
        tradeCenter: centerKey,
        strategyId: strategy.id,
        strategyName: strategy.name,
        strategyVersion: strategy.version,
        backtestRange: { start: strategy.range[0], end: strategy.range[1] },
        totalProfit: seed.totalProfit,
        perKwhProfit: seed.perKwhProfit,
        achievementRate: seed.achievementRate,
        sharpe: seed.sharpe,
        maxLoss: seed.maxLoss,
        lossDays: seed.lossDays,
        winRate: seed.winRate,
        backtestRuns: seed.backtestRuns,
      };
    });

    var details = {};
    records.forEach(function eachRecord(record) {
      var seed = BACKTEST_RECORD_SEED.find(function findSeed(s) { return s.strategy === record.strategyId; }) || BACKTEST_RECORD_SEED[0];
      details[record.id] = {
        metrics: buildBacktestDetail(record.strategyId, seed),
        dailySeries: buildBacktestDailySeries([record.backtestRange.start, record.backtestRange.end], record.totalProfit),
        detailRows: buildBacktestDetailRows(record.strategyId, [record.backtestRange.start, record.backtestRange.end], seed),
      };
    });

    return { records: records, details: details };
  }

  // 现货模拟交易：在线策略列表 + 两套时间维度收益
  var MOCK_TRADING_STRATEGIES = [
    { id: "forecast-declare-online", name: "预测直申策略", onlineVersion: "2278281814", onlineDate: "2026-07-07", createdAt: "2026-07-07 11:51:12" },
    { id: "guangdong-endtoend-online", name: "广东端到端策略", onlineVersion: "trade-v3.2.4", onlineDate: "2026-07-04", createdAt: "2026-07-03 15:37:58" },
    { id: "guangdong-fusion-online", name: "广东融合优化交易策略", onlineVersion: "v1.0", onlineDate: "2026-06-27", createdAt: "2026-06-26 14:08:20" },
    { id: "guangdong-adaptive-online", name: "广东自适应直申策略", onlineVersion: "v1.0", onlineDate: "2026-06-18", createdAt: "2026-06-17 14:39:50" },
    { id: "multi-spread-online", name: "多价差多负荷结合出清价优化策略", onlineVersion: "2278281521", onlineDate: "2026-05-29", createdAt: "2026-05-29 12:39:44" },
    { id: "mean-online", name: "均值策略", onlineVersion: "v1.3.0", onlineDate: "2026-04-30", createdAt: "2026-04-29 15:50:54" },
  ];

  // 视图A：上线后累计/近3天/近7天；视图B：近14天/本月/上月
  var MOCK_TRADING_METRICS = [
    { afterTotal: 367529, afterRate: 10, d3: 30229, d3Rate: 19, d7: 4830, d7Rate: 2, d14: -82584, d14Rate: -13, month: -112120, monthRate: -20, lastMonth: 89546, lastMonthRate: 6 },
    { afterTotal: 20351, afterRate: 6, d3: 13879, d3Rate: 9, d7: 10392, d7Rate: 4, d14: 20351, d14Rate: 6, month: 20351, monthRate: 6, lastMonth: 0, lastMonthRate: 0 },
    { afterTotal: 39366, afterRate: 5, d3: 45362, d3Rate: 28, d7: 48965, d7Rate: 18, d14: -43050, d14Rate: -7, month: -77648, monthRate: -14, lastMonth: 117014, lastMonthRate: 68 },
    { afterTotal: 362473, afterRate: 26, d3: 11278, d3Rate: 7, d7: -12942, d7Rate: -5, d14: -95193, d14Rate: -16, month: -137398, monthRate: -25, lastMonth: 499872, lastMonthRate: 61 },
    { afterTotal: -26001, afterRate: -1, d3: 25966, d3Rate: 16, d7: 37065, d7Rate: 14, d14: -133581, d14Rate: -22, month: -161842, monthRate: -29, lastMonth: 134925, lastMonthRate: 9 },
    { afterTotal: 2619, afterRate: 0, d3: 0, d3Rate: 0, d7: 0, d7Rate: 0, d14: -35779, d14Rate: -6, month: -24407, monthRate: -4, lastMonth: 291943, lastMonthRate: 18 },
  ];

  // 策略收益分析：多策略每日累计收益 + 实际申报基准（06-30 ~ 07-12）
  var PROFIT_SERIES_LABELS = ["06-30", "07-01", "07-02", "07-03", "07-04", "07-05", "07-06", "07-07", "07-08", "07-09", "07-10", "07-11", "07-12"];
  // 各策略累计收益终值（图例显示值，与录屏一致）
  var PROFIT_FINAL_VALUES = {
    "实际申报": 1699,
    "forecast-declare-online": 2393,
    "guangdong-endtoend-online": 10832,
    "guangdong-adaptive-online": 7370,
    "multi-spread-online": 7693,
  };

  function buildProfitSeries(finalValue, seed) {
    var n = PROFIT_SERIES_LABELS.length;
    var series = [];
    var cumulative = 0;
    for (var i = 0; i < n; i++) {
      var daily = i === n - 1
        ? finalValue - cumulative
        : Math.round((finalValue / n) * (0.5 + ((i * 17 + seed) % 100) / 100));
      cumulative += daily;
      series.push({ date: PROFIT_SERIES_LABELS[i], daily: daily, cumulative: cumulative });
    }
    return series;
  }

  function buildMockTrading(centerKey) {
    var records = MOCK_TRADING_STRATEGIES.map(function mapStrategy(strategy, idx) {
      var m = MOCK_TRADING_METRICS[idx];
      return Object.assign({ id: "mock-" + centerKey + "-" + idx, tradeCenter: centerKey }, strategy, m);
    });

    var profitAnalysis = {
      labels: PROFIT_SERIES_LABELS,
      dataNote: "2026-07-09~2026-07-12 使用节点电价，2026-07-10~2026-07-12 使用预测负荷，其余均使用日前电价和实际负荷",
      series: [
        { id: "actual-declare", label: "实际申报", color: "#8a95a8", values: buildProfitSeries(PROFIT_FINAL_VALUES["实际申报"], 1) },
        { id: "forecast-declare-online", label: "预测直申策略", version: "22782818140", color: "#1677FF", values: buildProfitSeries(PROFIT_FINAL_VALUES["forecast-declare-online"], 2) },
        { id: "guangdong-endtoend-online", label: "广东端到端策略", version: "trade-v3.2.4", color: "#23C887", values: buildProfitSeries(PROFIT_FINAL_VALUES["guangdong-endtoend-online"], 3) },
        { id: "guangdong-adaptive-online", label: "广东自适应直申策略", version: "v1.0", color: "#FF7A45", values: buildProfitSeries(PROFIT_FINAL_VALUES["guangdong-adaptive-online"], 4) },
        { id: "multi-spread-online", label: "多价差多负荷结合出清价优化策略", version: "22782815211", color: "#A855F7", values: buildProfitSeries(PROFIT_FINAL_VALUES["multi-spread-online"], 5) },
      ],
    };

    // 模拟交易明细（逐笔，与录屏一致）
    var detailRows = (function buildDetail() {
      var basePrices = [423.2, 396.41, 361.49, 347.33, 330.6, 329.48, 345.28, 348.63, 392.21, 388.64];
      var realtimePrices = [363.87, 320.05, 293.51, 288.91, 299.26, 304.55, 324.45, 292.62, 241.51, 212.58];
      var successProfits = [-3675, 2205, 1178, 806, 575, 657, 916, 2578, 2667, 1833];
      var successRates = [0, 85.3, 71.5, 65.9, 93.3, 100, 100, 100, 100, 79.9];
      var loadAccuracies = [96.6, 96.3, 92.9, 91.5, 98.3, 99.7, 99.4, 96, 95.9, 95];
      var rows = [];
      for (var i = 0; i < 10; i++) {
        var failed = i === 0;
        var dayahead = basePrices[i];
        var realtime = realtimePrices[i];
        rows.push({
          index: i,
          strategyName: "预测直申策略",
          strategyVersion: "v1.4.0",
          tradeDate: "2026-04-30",
          result: failed ? "失败" : "成功",
          successProfit: successProfits[i],
          successRate: successRates[i],
          failureLossRate: failed ? 120.5 : 0,
          dayaheadPrice: dayahead,
          realtimePrice: realtime,
          priceForecast: failed ? "错误" : "正确",
          spread: Math.round((dayahead - realtime) * 100) / 100,
          forecastLoad: Math.round((300 + i * 12) * 10) / 10,
          actualLoad: Math.round((295 + i * 11) * 10) / 10,
          loadForecastAccuracy: loadAccuracies[i],
          profit: Math.round((dayahead - realtime) * 0.7 * 100) / 100,
        });
      }
      return rows;
    })();

    // 版本设置
    var versions = {};
    MOCK_TRADING_STRATEGIES.forEach(function eachStrategy(strategy, idx) {
      versions[strategy.id] = {
        strategyName: strategy.name,
        onlineVersion: strategy.onlineVersion,
        versionList: [
          { version: strategy.onlineVersion, status: "在线", updatedAt: strategy.createdAt },
          { version: "v" + (idx + 1) + ".0.0", status: "历史", updatedAt: "2026-05-01 10:00:00" },
        ],
      };
    });

    return { records: records, profitAnalysis: profitAnalysis, detailRows: detailRows, versions: versions };
  }

  // 交易决策分析：多策略收益对比 + 决策建议
  function buildDecisionAnalysis(centerKey) {
    var strategies = MOCK_TRADING_STRATEGIES.slice(0, 5);
    return {
      labels: PROFIT_SERIES_LABELS,
      summary: strategies.map(function mapStrategy(s, idx) {
        var m = MOCK_TRADING_METRICS[idx];
        return {
          id: s.id,
          strategyName: s.name,
          onlineVersion: s.onlineVersion,
          afterTotal: m.afterTotal,
          afterRate: m.afterRate,
          d14: m.d14,
          d14Rate: m.d14Rate,
          recommendation: m.afterRate >= 10 ? "建议保持" : m.afterRate >= 0 ? "关注" : "建议下线",
        };
      }),
      series: strategies.map(function mapStrategy(s, idx) {
        var colors = ["#1677FF", "#23C887", "#FF7A45", "#A855F7", "#8a95a8"];
        var finalValue = [2393, 10832, 7370, 7693, -830][idx] || 1000;
        return {
          id: s.id,
          label: s.name,
          version: s.onlineVersion,
          color: colors[idx],
          values: buildProfitSeries(finalValue, idx + 2),
        };
      }),
    };
  }

  function buildCenterData(centerKey) {
    return {
      simulationBacktest: buildSimulationBacktest(centerKey),
      spotMockTrading: buildMockTrading(centerKey),
      decisionAnalysis: buildDecisionAnalysis(centerKey),
    };
  }

  var byCenter = {};
  TRADE_CENTERS.forEach(function eachCenter(center) {
    byCenter[center.key] = buildCenterData(center.key);
  });

  function getCenterData(centerKey) {
    return byCenter[centerKey] || byCenter.guangdong;
  }

  global.BOSS_SIMULATION_DATA_MOCK = {
    tradeCenters: TRADE_CENTERS,
    defaultCenterKey: "guangdong",
    getCenterData: getCenterData,
    // 现货仿真回测
    simulationBacktest: {
      title: "现货仿真回测",
      subtitle: "回放历史交易周期，验证策略收益与风险敞口。",
      sectionTitle: "现货仿真回测记录",
      cta: "新增仿真回测",
      status: { updatedAt: "2026-07-09 09:58:00", source: "仿真平台回测结果" },
      filterStrategyOptions: ["全部"].concat(
        Array.from(new Set(BACKTEST_STRATEGIES.map(function mapStrategy(s) { return s.name; })))
      ),
    },
    // 现货模拟交易
    spotMockTrading: {
      title: "现货模拟交易",
      subtitle: "围绕模拟申报、成交执行与收益回放进行联调验证。",
      cta: "新建模拟交易",
      status: { updatedAt: "2026-07-09 10:16:00", source: "模拟交易执行记录" },
      filterStrategyOptions: ["全部"].concat(
        Array.from(new Set(MOCK_TRADING_STRATEGIES.map(function mapStrategy(s) { return s.name; })))
      ),
      defaultRange: { start: "2026-06-30", end: "2026-07-14" },
      tableViews: [
        { key: "after", label: "上线后/近3天/近7天" },
        { key: "recent", label: "近14天/本月/上月" },
      ],
    },
    // 交易决策分析
    decisionAnalysis: {
      title: "交易决策分析",
      subtitle: "多策略收益对比与上下线决策建议。",
      status: { updatedAt: "2026-07-09 10:30:00", source: "策略收益分析" },
    },
    // 详情/明细页标题
    detailTitles: {
      backtestTrend: "现货仿真趋势分析",
      backtestDetail: "现货仿真明细数据",
      mockTradingDetail: "现货模拟交易明细数据",
      versionSetting: "版本设置",
    },
  };
})(window);
