(function attachAlgorithmDataMock(global) {
  function createHourLabels() {
    return Array.from({ length: 24 }, function createLabel(_, index) {
      return String(index).padStart(2, "0") + ":00";
    });
  }

  function buildLoadProfiles() {
    var tradeCenters = ["广东交易中心", "湖南交易中心", "陕西交易中心", "测试交易中心"];
    var userTypes = ["售电公司", "用电企业", "微电网"];
    var industryTypes = ["充电", "工商业", "园区", "其他"];
    var labels = createHourLabels();
    var profiles = [];

    tradeCenters.forEach(function eachCenter(tradeCenter, centerIndex) {
      userTypes.forEach(function eachUserType(userType, userIndex) {
        industryTypes.forEach(function eachIndustryType(industryType, industryIndex) {
          var rows = labels.map(function mapLabel(label, hour) {
            var amplitude = 900 + centerIndex * 120 + userIndex * 90;
            var baseline = 5200 + centerIndex * 420 + userIndex * 260 + industryIndex * 180;
            var predictedLoad =
              baseline +
              Math.round(Math.sin((hour / 24) * Math.PI * 2) * amplitude) +
              Math.round((hour > 17 ? 420 : 0) + (hour < 6 ? -260 : 0));
            var actualLoad =
              predictedLoad +
              [72, -54, 48, -38, 60, -42][(hour + centerIndex + industryIndex) % 6] +
              userIndex * 8;
            var diff = actualLoad - predictedLoad;
            var errorRate = Math.abs(diff) / Math.max(actualLoad, 1) * 100;

            return {
              time: label,
              predictedLoad: predictedLoad,
              actualLoad: actualLoad,
              diff: diff,
              errorRate: Number(errorRate.toFixed(2)),
            };
          });

          profiles.push({
            id: "load-" + centerIndex + "-" + userIndex + "-" + industryIndex,
            tradeCenter: tradeCenter,
            userType: userType,
            industryType: industryType,
            predictionDate: "2026-05-09",
            modelInfo: {
              modelName: "日前负荷预测集成模型",
              modelVersion: "load-forecast-v" + (centerIndex + 2) + "." + (userIndex + industryIndex + 1),
              lastTrainedAt: "2026-05-08 03:" + String(10 + centerIndex * 7 + userIndex * 3).padStart(2, "0"),
              trainingWindow: "近 180 天分时负荷与天气特征",
              featureVersion: "feature-pack-" + (industryIndex + 3) + "." + (userIndex + 1),
              refreshCycle: "每日 03:00 自动重训",
            },
            rows: rows,
          });
        });
      });
    });

    return profiles;
  }

  function buildPriceScenarios() {
    var tradeCenters = ["广东交易中心", "湖南交易中心", "陕西交易中心", "测试交易中心"];
    var labels = createHourLabels();

    return tradeCenters.map(function mapScenario(tradeCenter, centerIndex) {
      var rows = labels.map(function mapLabel(label, hour) {
        var basePrice = 286 + centerIndex * 18 + Math.round(Math.sin((hour / 24) * Math.PI * 2) * 46);
        var dayaheadForecast = basePrice + (hour > 16 ? 18 : 0);
        var realtimeForecast = dayaheadForecast + [-14, -8, 6, 18, 24, 12][(hour + centerIndex) % 6];
        var spreadForecast = realtimeForecast - dayaheadForecast;
        var dayaheadActual = dayaheadForecast + [6, -8, 12, -6, 10, -4][(hour + centerIndex) % 6];
        var realtimeActual = realtimeForecast + [-10, 8, -12, 10, -6, 14][(hour + centerIndex + 2) % 6];
        var spreadActual = realtimeActual - dayaheadActual;
        var errorRate = Math.abs(spreadForecast - spreadActual) / Math.max(Math.abs(spreadActual), 12) * 100;

        return {
          time: label,
          dayaheadForecast: Number(dayaheadForecast.toFixed(1)),
          realtimeForecast: Number(realtimeForecast.toFixed(1)),
          spreadForecast: Number(spreadForecast.toFixed(1)),
          dayaheadActual: Number(dayaheadActual.toFixed(1)),
          realtimeActual: Number(realtimeActual.toFixed(1)),
          spreadActual: Number(spreadActual.toFixed(1)),
          errorRate: Number(errorRate.toFixed(2)),
        };
      });

      return {
        id: "price-" + centerIndex,
        tradeCenter: tradeCenter,
        predictionDate: "2026-05-09",
        modelVersion: "spot-price-v" + (centerIndex + 2) + "." + (centerIndex + 1),
        rows: rows,
      };
    });
  }

  global.BOSS_ALGORITHM_DATA_MOCK = {
    dayAheadLoadPrediction: {
      title: "日前负荷预测",
      subtitle: "支撑交易申报、电量规划与负荷偏差控制。",
      status: {
        updatedAt: "2026-05-09 03:18:00",
        source: "日前负荷预测模型",
      },
      filters: {
        tradeCenterOptions: ["全部", "广东交易中心", "湖南交易中心", "陕西交易中心", "测试交易中心"],
        userTypeOptions: ["全部", "售电公司", "用电企业", "微电网"],
        industryTypeOptions: ["全部", "充电", "工商业", "园区", "其他"],
        defaultDate: "2026-05-09",
      },
      profiles: buildLoadProfiles(),
    },
    spotPricePrediction: {
      title: "价差及现货价格预测",
      subtitle: "支撑现货交易策略、价差预测与收益模拟。",
      status: {
        updatedAt: "2026-05-09 02:42:00",
        source: "现货价格预测模型",
      },
      filters: {
        tradeCenterOptions: ["全部", "广东交易中心", "湖南交易中心", "陕西交易中心", "测试交易中心"],
        priceTypeOptions: ["全部", "日前价格", "实时价格", "价差"],
        defaultDate: "2026-05-09",
      },
      scenarios: buildPriceScenarios(),
    },
  };
})(window);
