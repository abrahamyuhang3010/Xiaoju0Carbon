(function attachSimulationDataMock(global) {
  function buildSimulationRecords() {
    var configs = [
      {
        tradeCenter: "广东交易中心",
        strategyName: "价差跟随策略",
        startLoad: 8120,
        startPrice: 368,
        profits: [124000, 138000, -52000, 166000, 149000, 174000, 121000],
        returns: [3.4, 3.8, -1.5, 4.2, 3.9, 4.6, 3.1],
        risks: ["稳健", "稳健", "关注", "稳健", "稳健", "稳健", "关注"],
      },
      {
        tradeCenter: "湖南交易中心",
        strategyName: "负荷偏差控制策略",
        startLoad: 6940,
        startPrice: 342,
        profits: [82000, 91000, 76000, -36000, 104000, 112000, 97000],
        returns: [2.4, 2.7, 2.2, -1.1, 3.1, 3.4, 2.9],
        risks: ["稳健", "稳健", "稳健", "预警", "关注", "关注", "稳健"],
      },
      {
        tradeCenter: "陕西交易中心",
        strategyName: "滚动套利策略",
        startLoad: 6320,
        startPrice: 318,
        profits: [65000, -18000, 72000, 84000, 91000, -12000, 76000],
        returns: [2.1, -0.6, 2.3, 2.8, 3.0, -0.4, 2.5],
        risks: ["关注", "预警", "关注", "稳健", "稳健", "关注", "稳健"],
      },
    ];
    var dates = ["2026-05-03", "2026-05-04", "2026-05-05", "2026-05-06", "2026-05-07", "2026-05-08", "2026-05-09"];
    var records = [];

    configs.forEach(function eachConfig(config, configIndex) {
      dates.forEach(function eachDate(date, index) {
        var predictedLoad = config.startLoad + index * 85 + configIndex * 26;
        var predictedPrice = config.startPrice + (index % 4) * 8 - configIndex * 5;
        var declaredVolume = Math.round(predictedLoad * 0.88 + index * 14);
        var tradedVolume = declaredVolume - 32 + ((index + configIndex) % 5) * 11;
        records.push({
          id: "sim-" + configIndex + "-" + index,
          date: date,
          tradeCenter: config.tradeCenter,
          strategyName: config.strategyName,
          predictedLoad: predictedLoad,
          predictedPrice: predictedPrice,
          declaredVolume: declaredVolume,
          tradedVolume: tradedVolume,
          profit: config.profits[index],
          returnRate: config.returns[index],
          riskStatus: config.risks[index],
        });
      });
    });

    return records;
  }

  function buildMockTradingRecords() {
    var configs = [
      {
        strategy: "粤中负荷跟踪策略",
        predictedVolumeBase: 4520,
        predictedPriceBase: 356,
        profits: [86000, 92000, 104000, 112000],
        statuses: ["已完成", "已完成", "执行中", "待执行"],
      },
      {
        strategy: "峰谷价差策略",
        predictedVolumeBase: 3980,
        predictedPriceBase: 332,
        profits: [63000, -18000, 71000, 84000],
        statuses: ["已完成", "失败", "已完成", "执行中"],
      },
      {
        strategy: "新能源对冲策略",
        predictedVolumeBase: 3710,
        predictedPriceBase: 318,
        profits: [54000, 61000, 69000, 73000],
        statuses: ["已完成", "已完成", "待执行", "待执行"],
      },
    ];
    var dates = ["2026-05-06", "2026-05-07", "2026-05-08", "2026-05-09"];
    var records = [];

    configs.forEach(function eachConfig(config, configIndex) {
      var cumulative = 0;
      dates.forEach(function eachDate(date, index) {
        cumulative += config.profits[index];
        records.push({
          id: "mock-" + configIndex + "-" + index,
          date: date,
          strategy: config.strategy,
          predictedVolume: config.predictedVolumeBase + index * 68 + configIndex * 20,
          predictedPrice: config.predictedPriceBase + index * 7 + configIndex * 6,
          declaredVolume: config.predictedVolumeBase - 140 + index * 62 + configIndex * 16,
          tradedVolume: config.predictedVolumeBase - 188 + index * 58 + configIndex * 18,
          dailyProfit: config.profits[index],
          cumulativeProfit: cumulative,
          status: config.statuses[index],
        });
      });
    });

    return records;
  }

  global.BOSS_SIMULATION_DATA_MOCK = {
    notification: {
      title: "权限认证",
      path: "/sale/sim/record/pageQuery",
      message: "权限不足，点击下方角色申请：",
      actionText: "数字能源平台超级管理员",
    },
    spotTradingSimulation: {
      title: "现货交易仿真",
      subtitle: "用于回放历史交易周期、验证策略收益与风险敞口。",
      status: {
        updatedAt: "2026-05-09 09:58:00",
        source: "仿真平台回测结果",
      },
      filters: {
        tradeCenterOptions: ["全部", "广东交易中心", "湖南交易中心", "陕西交易中心"],
        strategyOptions: ["全部", "价差跟随策略", "负荷偏差控制策略", "滚动套利策略"],
        defaultRange: {
          start: "2026-05-03",
          end: "2026-05-09",
        },
      },
      records: buildSimulationRecords(),
    },
    spotMockTrading: {
      title: "广东电力市场",
      marketLabel: "广东电力市场",
      subtitle: "围绕模拟申报、成交执行与收益回放进行联调验证。",
      status: {
        updatedAt: "2026-05-09 10:16:00",
        source: "模拟交易执行记录",
      },
      cta: "新建模拟交易",
      filters: {
        strategyOptions: ["请选择交易策略", "粤中负荷跟踪策略", "峰谷价差策略", "新能源对冲策略"],
        defaultRange: {
          start: "2026-05-06",
          end: "2026-05-09",
        },
      },
      records: buildMockTradingRecords(),
    },
  };
})(window);
