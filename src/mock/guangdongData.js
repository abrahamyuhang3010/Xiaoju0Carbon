(function attachGuangdongDataMock(global) {
  function interpolateAnchors(length, anchors) {
    var values = Array.from({ length: length });
    var keys = Object.keys(anchors)
      .map(function toNumber(key) {
        return Number(key);
      })
      .sort(function ascending(a, b) {
        return a - b;
      });

    keys.forEach(function fillSegments(key, index) {
      var nextKey = keys[index + 1];
      values[key] = Number(anchors[key]);

      if (typeof nextKey !== "number") {
        return;
      }

      var span = nextKey - key;
      var currentValue = Number(anchors[key]);
      var nextValue = Number(anchors[nextKey]);

      for (var step = 1; step < span; step += 1) {
        values[key + step] = Number((currentValue + ((nextValue - currentValue) * step) / span).toFixed(1));
      }
    });

    return values.map(function ensureValue(value) {
      return Number(Number(value).toFixed(1));
    });
  }

  function buildActual(values, deltas) {
    return values.map(function mapValue(value, index) {
      return Number((value + deltas[index % deltas.length]).toFixed(1));
    });
  }

  function buildQuarterSeries(hourlyValues, pattern, tailOffset) {
    var anchors = {};
    hourlyValues.forEach(function eachValue(value, index) {
      anchors[index * 4] = value;
    });
    anchors[95] = Number((hourlyValues[hourlyValues.length - 1] + (tailOffset || 0)).toFixed(1));

    return interpolateAnchors(96, anchors).map(function addPattern(value, index) {
      return Number((value + pattern[index % pattern.length]).toFixed(1));
    });
  }

  function formatDate(date) {
    function pad(value) {
      return String(value).padStart(2, "0");
    }

    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function buildDateRange(start, days) {
    var base = new Date(start + "T00:00:00");
    return Array.from({ length: days }, function createDate(_, index) {
      var nextDate = new Date(base.getTime());
      nextDate.setDate(base.getDate() + index);
      return formatDate(nextDate);
    });
  }

  function sum(values) {
    return values.reduce(function accumulate(total, value) {
      return total + value;
    }, 0);
  }

  function buildRetailHourlySeries(dayIndex, baseOffset) {
    return Array.from({ length: 24 }, function createHourValue(_, index) {
      var morning = Math.max(0, Math.sin(((index - 6) / 24) * Math.PI * 2)) * 210;
      var evening = Math.max(0, Math.sin(((index - 13) / 24) * Math.PI * 2)) * 265;
      var valley = index < 6 ? -110 : 0;
      var base = 820 + baseOffset + dayIndex * 22 + morning + evening + valley + ((index % 4) - 1.5) * 18;
      return Math.round(base);
    });
  }

  function buildEnterpriseHourlySeries(userIndex, dayIndex) {
    return Array.from({ length: 24 }, function createHourValue(_, index) {
      var daytime = Math.max(0, Math.sin(((index - 7) / 24) * Math.PI * 2)) * (36 + userIndex * 4);
      var peak = Math.max(0, Math.sin(((index - 15) / 24) * Math.PI * 2)) * (52 + dayIndex * 2);
      var base = 138 + userIndex * 26 + dayIndex * 7 + daytime + peak + ((index % 3) - 1) * 6;
      return Math.round(base);
    });
  }

  var hours = Array.from({ length: 24 }, function createHour(_, index) {
    return String(index).padStart(2, "0") + ":00";
  });

  var quarterHours = Array.from({ length: 96 }, function createQuarterHour(_, index) {
    var totalMinutes = index * 15;
    var hour = Math.floor(totalMinutes / 60);
    var minute = totalMinutes % 60;
    return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
  });

  var tabs = ["负荷信息", "负荷详情", "售电公司分时电量", "用电企业分时电量", "机组检修容量", "备用信息"];

  var metricTree = [
    { id: "dispatch-load", label: "统调负荷" },
    { id: "province-a", label: "省内 A 类电源" },
    { id: "province-b", label: "省内 B 类电源" },
    {
      id: "local-power",
      label: "地方电源出力",
      children: [
        { id: "wind", label: "风电" },
        { id: "solar", label: "光伏" },
        { id: "thermal", label: "火电" },
        { id: "hydro", label: "水电" },
      ],
    },
    { id: "hk-link", label: "港澳电源出力" },
    {
      id: "west-east",
      label: "西电东送出力",
      children: [
        { id: "west-plan", label: "送电计划" },
        { id: "west-actual", label: "送电实际" },
      ],
    },
    { id: "total-output", label: "发电总出力" },
    { id: "spot-renewable", label: "现货新能源总出力" },
    { id: "dispatch-renewable", label: "统调新能源出力" },
    { id: "hydro-total", label: "水电（含抽蓄）总出力" },
    { id: "pump-plan", label: "抽蓄电站出力计划" },
  ];

  var dispatchLoadHourly = [
    103200, 101800, 99200, 96500, 94800, 93850,
    95880, 98600, 102500, 114900, 120500, 116200,
    117500, 108300, 114200, 111800, 114900, 119800,
    123600, 120400, 123100, 127000, 123900, 122400,
  ];

  var provinceAHourly = [
    101000, 100200, 97100, 94800, 93000, 92000,
    94200, 97100, 101300, 113800, 118900, 114600,
    115800, 106100, 112900, 110100, 112300, 117500,
    121800, 118200, 121700, 125500, 121800, 120600,
  ];

  var provinceBHourly = [
    42800, 41700, 40120, 39250, 38760, 38100,
    38950, 40230, 41880, 43620, 44760, 45220,
    44810, 43980, 43150, 42560, 43320, 44780,
    45820, 45230, 46180, 47320, 46610, 45240,
  ];

  var localPowerHourly = [
    5588, 5466, 5520, 5630, 5785, 5902,
    6120, 6910, 8773, 8435, 8120, 7960,
    7850, 7740, 7622, 7440, 7305, 7190,
    7088, 6995, 6880, 6768, 6640, 6508,
  ];

  var windHourly = [
    2450, 2320, 2280, 2245, 2355, 2470,
    2580, 2790, 3150, 3380, 3540, 3490,
    3440, 3360, 3210, 3040, 2955, 2860,
    2790, 2680, 2590, 2520, 2480, 2410,
  ];

  var solarHourly = [
    120, 98, 94, 88, 85, 110,
    420, 1020, 2580, 4310, 5466, 6020,
    5930, 5740, 5200, 4390, 3310, 2190,
    1240, 630, 240, 148, 120, 104,
  ];

  var thermalHourly = [
    7020, 6980, 6945, 6910, 6885, 6840,
    6890, 6920, 6990, 7150, 7280, 7340,
    7420, 7385, 7320, 7260, 7210, 7165,
    7100, 7050, 6995, 6940, 6902, 6860,
  ];

  var hydroHourly = [
    4120, 4080, 4015, 3970, 3905, 3820,
    3890, 4050, 4250, 4420, 4550, 4630,
    4580, 4550, 4490, 4420, 4350, 4280,
    4200, 4100, 4050, 4005, 3940, 3880,
  ];

  var hkHourly = [
    5180, 5110, 5035, 4980, 4920, 4860,
    4910, 5025, 5205, 5400, 5520, 5480,
    5450, 5375, 5310, 5260, 5195, 5100,
    5040, 4970, 4905, 4860, 4800, 4745,
  ];

  var westHourly = [
    18100, 18020, 17980, 17850, 17720, 17610,
    17820, 18240, 18920, 19600, 20240, 20480,
    20550, 20380, 20120, 19860, 19640, 19350,
    19080, 18860, 18640, 18430, 18310, 18190,
  ];

  var totalOutputHourly = [
    112000, 110900, 108700, 107300, 105900, 105100,
    106800, 109400, 113100, 124400, 129700, 126500,
    127100, 119800, 124600, 122100, 123900, 128600,
    132800, 129900, 132400, 136500, 133800, 131900,
  ];

  var spotRenewableHourly = [
    9680, 9420, 9260, 9130, 9210, 9380,
    9850, 10720, 12480, 13620, 14180, 14320,
    13920, 13380, 12750, 11880, 11040, 10210,
    9680, 9250, 8960, 8720, 8610, 8420,
  ];

  var dispatchRenewableHourly = [
    6280, 6120, 6080, 6020, 6110, 6240,
    6590, 7180, 8040, 8830, 9210, 9330,
    9250, 9080, 8790, 8410, 8030, 7660,
    7340, 7085, 6880, 6690, 6510, 6370,
  ];

  var hydroTotalHourly = [
    7890, 7735, 7610, 7500, 7420, 7340,
    7480, 7760, 8180, 8540, 8820, 9010,
    9180, 9090, 8950, 8760, 8540, 8360,
    8210, 8040, 7920, 7810, 7700, 7590,
  ];

  var pumpPlanHourly = [
    3300, 3240, 3180, 3120, 3080, 3040,
    3290, 4020, 5210, 6380, 7210, 7480,
    7340, 7020, 6680, 6210, 5730, 5200,
    4820, 4510, 4200, 3960, 3730, 3550,
  ];

  var metricDefinitions = {
    "dispatch-load": {
      label: "统调负荷",
      hourly: dispatchLoadHourly,
      pattern: [0, 160, -90, 60],
      actualDelta: [-620, -480, -260, 120, 220, 360],
    },
    "province-a": {
      label: "省内 A 类电源",
      hourly: provinceAHourly,
      pattern: [0, 130, -70, 45],
      actualDelta: [-520, -360, -180, 90, 180, 260],
    },
    "province-b": {
      label: "省内 B 类电源",
      hourly: provinceBHourly,
      pattern: [0, 55, -36, 28],
      actualDelta: [-180, -120, -60, 28, 46, 70],
    },
    "local-power": {
      label: "地方电源出力",
      hourly: localPowerHourly,
      pattern: [0, 18, -12, 9],
      actualDelta: [-68, -32, -18, 12, 28, 42],
    },
    wind: {
      label: "风电",
      hourly: windHourly,
      pattern: [0, 9, -6, 4],
      actualDelta: [-46, -20, -10, 8, 16, 24],
    },
    solar: {
      label: "光伏",
      hourly: solarHourly,
      pattern: [0, 16, -10, 8],
      actualDelta: [-30, -12, 4, 12, 18, 26],
    },
    thermal: {
      label: "火电",
      hourly: thermalHourly,
      pattern: [0, 12, -8, 6],
      actualDelta: [-58, -22, 10, 22, 36, 54],
    },
    hydro: {
      label: "水电",
      hourly: hydroHourly,
      pattern: [0, 11, -7, 5],
      actualDelta: [-42, -18, -4, 10, 20, 28],
    },
    "hk-link": {
      label: "港澳电源出力",
      hourly: hkHourly,
      pattern: [0, 10, -6, 5],
      actualDelta: [-38, -18, 2, 12, 22, 30],
    },
    "west-east": {
      label: "西电东送出力",
      hourly: westHourly,
      pattern: [0, 28, -18, 14],
      actualDelta: [-120, -80, -24, 38, 72, 118],
    },
    "west-plan": {
      label: "送电计划",
      hourly: westHourly.map(function add(value) {
        return value + 180;
      }),
      pattern: [0, 24, -15, 12],
      actualDelta: [-95, -58, -14, 32, 56, 90],
    },
    "west-actual": {
      label: "送电实际",
      hourly: westHourly.map(function add(value) {
        return value - 140;
      }),
      pattern: [0, 20, -12, 10],
      actualDelta: [-102, -65, -20, 28, 68, 104],
    },
    "total-output": {
      label: "发电总出力",
      hourly: totalOutputHourly,
      pattern: [0, 180, -120, 90],
      actualDelta: [-640, -420, -180, 110, 260, 420],
    },
    "spot-renewable": {
      label: "现货新能源总出力",
      hourly: spotRenewableHourly,
      pattern: [0, 22, -14, 10],
      actualDelta: [-92, -48, -12, 18, 42, 66],
    },
    "dispatch-renewable": {
      label: "统调新能源出力",
      hourly: dispatchRenewableHourly,
      pattern: [0, 18, -11, 8],
      actualDelta: [-70, -34, -10, 14, 32, 50],
    },
    "hydro-total": {
      label: "水电（含抽蓄）总出力",
      hourly: hydroTotalHourly,
      pattern: [0, 14, -9, 7],
      actualDelta: [-66, -28, -8, 16, 34, 52],
    },
    "pump-plan": {
      label: "抽蓄电站出力计划",
      hourly: pumpPlanHourly,
      pattern: [0, 18, -12, 8],
      actualDelta: [-74, -36, -10, 16, 40, 60],
    },
  };

  var metricSeries = {};
  Object.keys(metricDefinitions).forEach(function buildMetric(metricId) {
    var config = metricDefinitions[metricId];
    var forecast = buildQuarterSeries(config.hourly, config.pattern, -8);
    metricSeries[metricId] = {
      label: config.label,
      forecast: forecast,
      actual: buildActual(forecast, config.actualDelta),
    };
  });

  var loadDetailGroups = [
    {
      id: "dispatch",
      label: "统调",
      series: [
        { id: "dispatch-forecast", label: "统调预测", color: "#7CB5FF", values: metricSeries["dispatch-load"].forecast },
        { id: "dispatch-actual", label: "统调实际", color: "#1677FF", values: metricSeries["dispatch-load"].actual },
      ],
    },
    {
      id: "province-a",
      label: "A 类",
      series: [
        { id: "province-a-forecast", label: "A 类预测", color: "#9BE8CD", values: metricSeries["province-a"].forecast },
        { id: "province-a-actual", label: "A 类实际", color: "#2FCB8F", values: metricSeries["province-a"].actual },
      ],
    },
    {
      id: "province-b",
      label: "B 类",
      series: [
        { id: "province-b-forecast", label: "B 类预测", color: "#FFD59A", values: metricSeries["province-b"].forecast },
        { id: "province-b-actual", label: "B 类实际", color: "#FF9F1A", values: metricSeries["province-b"].actual },
      ],
    },
    {
      id: "local-power",
      label: "地方",
      series: [
        { id: "local-power-forecast", label: "地方预测", color: "#D6C1FF", values: metricSeries["local-power"].forecast },
        { id: "local-power-actual", label: "地方实际", color: "#8F65FF", values: metricSeries["local-power"].actual },
      ],
    },
    {
      id: "hk-link",
      label: "港澳",
      series: [
        { id: "hk-link-forecast", label: "港澳预测", color: "#FFC2D4", values: metricSeries["hk-link"].forecast },
        { id: "hk-link-actual", label: "港澳实际", color: "#F25B8A", values: metricSeries["hk-link"].actual },
      ],
    },
    {
      id: "west-east",
      label: "西电",
      series: [
        { id: "west-east-forecast", label: "西电预测", color: "#C9D4E5", values: metricSeries["west-east"].forecast },
        { id: "west-east-actual", label: "西电实际", color: "#5E6C84", values: metricSeries["west-east"].actual },
      ],
    },
  ];

  var dateRange = buildDateRange("2026-05-02", 7);
  var saleCompanyRows = dateRange.map(function mapDate(date, index) {
    var hourlyValues = buildRetailHourlySeries(index, index * 26);
    return {
      date: date,
      hourlyValues: hourlyValues,
      total: sum(hourlyValues),
    };
  });

  var microgridRegistry = {
    H0002: { name: "广州南沙站综合微电网", id: "MG-440115-02" },
    H0004: { name: "佛山顺德站协同微电网", id: "MG-440606-04" },
  };

  var enterpriseTemplates = [
    { userCode: "GDUSER001", userName: "广州南沙充电网络", accountNo: "H0001", meterPointId: "MP-440115-1001" },
    { userCode: "GDUSER002", userName: "广州番禺公交场站", accountNo: "H0002", meterPointId: "MP-440113-1002" },
    { userCode: "GDUSER003", userName: "佛山顺德站群", accountNo: "H0003", meterPointId: "MP-440606-1003" },
    { userCode: "GDUSER004", userName: "佛山综合补能园区", accountNo: "H0004", meterPointId: "MP-440606-1004" },
  ];

  var enterpriseRows = [];
  enterpriseTemplates.forEach(function eachTemplate(template, userIndex) {
    dateRange.forEach(function eachDate(date, dayIndex) {
      var hourlyValues = buildEnterpriseHourlySeries(userIndex, dayIndex);
      var microgrid = microgridRegistry[template.accountNo] || null;
      enterpriseRows.push({
        date: date,
        userCode: template.userCode,
        userName: template.userName,
        accountNo: template.accountNo,
        meterPointId: template.meterPointId,
        microgridName: microgrid ? microgrid.name : "-",
        microgridId: microgrid ? microgrid.id : "-",
        hourlyValues: hourlyValues,
        total: sum(hourlyValues),
      });
    });
  });

  var maintenanceSeries = interpolateAnchors(96, {
    0: 3180,
    8: 3240,
    16: 3360,
    24: 3580,
    32: 3720,
    40: 3880,
    48: 4020,
    56: 3950,
    64: 3820,
    72: 3660,
    80: 3480,
    88: 3320,
    95: 3260,
  }).map(function addWave(value, index) {
    return Number((value + ((index % 4) - 1.5) * 16).toFixed(1));
  });

  var maintenanceRows = quarterHours.map(function mapMaintenance(time, index) {
    return {
      time: time,
      value: maintenanceSeries[index],
      source: index % 2 === 0 ? "调度接口" : "取数工具",
      updatedAt: "2026-05-09 11:35:33",
    };
  });

  var reservePositiveForecast = interpolateAnchors(96, {
    0: 10340,
    8: 8260,
    16: 8890,
    24: 9720,
    32: 10420,
    40: 11120,
    48: 11740,
    56: 11190,
    64: 11080,
    72: 11820,
    80: 12360,
    88: 11720,
    95: 10820,
  });

  var reservePositiveActual = buildActual(reservePositiveForecast, [-65, -40, -18, 26, 34, 48]);

  var reserveRows = quarterHours.map(function mapReserve(time, index) {
    var waveBase = (index / 95) * Math.PI * 2;
    return {
      time: time,
      forecastPositive: reservePositiveForecast[index],
      forecastNegative: Number((3020 + Math.sin(waveBase) * 26 + ((index % 4) - 1.5) * 4).toFixed(1)),
      forecastPrimary: Number((1960 + Math.cos(waveBase) * 38 + ((index % 5) - 2) * 3).toFixed(1)),
      actualPositive: reservePositiveActual[index],
      actualNegative: Number((2988 + Math.sin(waveBase) * 22 + ((index % 4) - 1.5) * 5).toFixed(1)),
      actualPrimary: Number((1936 + Math.cos(waveBase) * 32 + ((index % 3) - 1) * 4).toFixed(1)),
    };
  });

  var tradeResultTabs = ["全省统一出清价", "交易结果", "节点电价"];
  var tradePriceDayAhead = [
    412.6, 406.8, 398.2, 390.4, 382.1, 376.9,
    384.2, 402.6, 431.8, 468.5, 506.7, 524.2,
    538.4, 522.8, 498.6, 486.1, 492.4, 518.7,
    542.9, 556.8, 568.2, 554.6, 520.3, 478.4,
  ];
  var tradePriceRealTime = buildActual(tradePriceDayAhead, [-14.6, -9.8, -4.2, 6.8, 12.5, 8.6]).map(function roundPrice(value) {
    return Number(value.toFixed(1));
  });
  var tradeVolumeDayAhead = [
    6120, 5980, 5820, 5660, 5580, 5460,
    5620, 6040, 6680, 7520, 8240, 8620,
    8740, 8520, 8260, 8040, 8220, 8640,
    9020, 9340, 9580, 9260, 8640, 7820,
  ];
  var tradeVolumeRealTime = buildActual(tradeVolumeDayAhead, [-320, -180, -80, 110, 160, 220]).map(function roundVolume(value) {
    return Math.round(value);
  });
  var tradeSettlementDayAhead = [
    428.5, 422.6, 416.4, 408.3, 401.8, 396.1,
    404.8, 421.6, 448.2, 481.4, 512.8, 529.6,
    541.8, 528.4, 506.2, 494.8, 501.2, 522.4,
    546.1, 558.6, 569.5, 552.8, 526.4, 489.2,
  ];
  var tradeSettlementRealTime = buildActual(tradeSettlementDayAhead, [-16.8, -8.2, -2.6, 8.6, 14.2, 10.4]).map(function roundSettlement(value) {
    return Number(value.toFixed(1));
  });
  var nodeLabels = ["全省", "节点 1", "节点 2", "节点 3", "节点 4", "节点 5"];
  var nodeOffsets = {
    "全省": 0,
    "节点 1": 6.5,
    "节点 2": -8.2,
    "节点 3": 12.8,
    "节点 4": -15.6,
    "节点 5": 18.4,
  };
  var nodePriceBaseQuarter = buildQuarterSeries(tradePriceDayAhead, [0, 2.4, -1.3, 1.2], -2.2).map(function roundQuarterPrice(value) {
    return Number(value.toFixed(1));
  });
  var nodePriceSeries = {};
  nodeLabels.forEach(function eachNode(label) {
    var offset = nodeOffsets[label] || 0;
    var dayAhead = nodePriceBaseQuarter.map(function mapValue(value, index) {
      return Number((value + offset + ((index % 6) - 2.5) * 0.4).toFixed(1));
    });
    nodePriceSeries[label] = {
      dayAhead: dayAhead,
      realTime: buildActual(dayAhead, [-6.8, -4.4, -1.6, 2.8, 4.2, 5.6]).map(function roundNodePrice(value) {
        return Number(value.toFixed(1));
      }),
    };
  });

  var settlementDates = buildDateRange("2026-05-03", 7);
  var settlementDailyTemplates = [
    { enterpriseCode: "GDQY001", enterpriseName: "广州南沙充电网络", accountNo: "H0001" },
    { enterpriseCode: "GDQY002", enterpriseName: "广州番禺公交场站", accountNo: "H0002" },
    { enterpriseCode: "GDQY003", enterpriseName: "佛山顺德站群", accountNo: "H0003" },
    { enterpriseCode: "GDQY004", enterpriseName: "佛山综合补能园区", accountNo: "H0004" },
  ];
  var settlementDailyRows = [];
  settlementDates.forEach(function eachSettlementDate(date, dayIndex) {
    settlementDailyTemplates.forEach(function eachTemplate(template, templateIndex) {
      var energy = 9200 + dayIndex * 360 + templateIndex * 520;
      var dayaheadFee = 428000 + dayIndex * 16000 + templateIndex * 22000;
      var realtimeFee = 121000 + dayIndex * 6800 + templateIndex * 9200;
      var deviationFee = 16800 + dayIndex * 760 + templateIndex * 1100;
      var imbalanceFee = 9600 + dayIndex * 540 + templateIndex * 720;
      settlementDailyRows.push({
        date: date,
        enterpriseCode: template.enterpriseCode,
        enterpriseName: template.enterpriseName,
        accountNo: template.accountNo,
        energy: energy,
        dayaheadFee: dayaheadFee,
        realtimeFee: realtimeFee,
        deviationFee: deviationFee,
        imbalanceFee: imbalanceFee,
        totalFee: dayaheadFee + realtimeFee + deviationFee + imbalanceFee,
      });
    });
  });

  var settlementMonthRows = [
    { month: "2026-05", enterpriseCode: "GDQY001", enterpriseName: "广州南沙充电网络", accountNo: "H0001", energy: 318600, fee: 14820000, agencyIncome: 362000, status: "已出账" },
    { month: "2026-05", enterpriseCode: "GDQY002", enterpriseName: "广州番禺公交场站", accountNo: "H0002", energy: 286400, fee: 13280000, agencyIncome: 325000, status: "已出账" },
    { month: "2026-05", enterpriseCode: "GDQY003", enterpriseName: "佛山顺德站群", accountNo: "H0003", energy: 264200, fee: 12160000, agencyIncome: 296000, status: "结算中" },
    { month: "2026-05", enterpriseCode: "GDQY004", enterpriseName: "佛山综合补能园区", accountNo: "H0004", energy: 238800, fee: 11090000, agencyIncome: 271000, status: "待确认" },
    { month: "2026-04", enterpriseCode: "GDQY001", enterpriseName: "广州南沙充电网络", accountNo: "H0001", energy: 302200, fee: 14050000, agencyIncome: 351000, status: "已出账" },
    { month: "2026-04", enterpriseCode: "GDQY002", enterpriseName: "广州番禺公交场站", accountNo: "H0002", energy: 279100, fee: 12940000, agencyIncome: 319000, status: "已出账" },
    { month: "2026-04", enterpriseCode: "GDQY003", enterpriseName: "佛山顺德站群", accountNo: "H0003", energy: 252800, fee: 11670000, agencyIncome: 288000, status: "已出账" },
    { month: "2026-04", enterpriseCode: "GDQY004", enterpriseName: "佛山综合补能园区", accountNo: "H0004", energy: 229600, fee: 10630000, agencyIncome: 266000, status: "已出账" },
  ];

  var retailRelationRows = [
    { userCode: "GDUSER001", userName: "广州南沙充电网络", accountNo: "H0001", microgridName: "-", startDate: "2026-01-01", endDate: "2026-12-31", status: "合作中", sellerCompany: "滴滴电力（广东）有限公司" },
    { userCode: "GDUSER002", userName: "广州番禺公交场站", accountNo: "H0002", microgridName: "广州南沙站综合微电网", startDate: "2026-02-01", endDate: "2026-11-30", status: "合作中", sellerCompany: "滴滴电力（广东）有限公司" },
    { userCode: "GDUSER003", userName: "佛山顺德站群", accountNo: "H0003", microgridName: "-", startDate: "2025-09-01", endDate: "2026-08-31", status: "即将到期", sellerCompany: "滴滴电力（广东）有限公司" },
    { userCode: "GDUSER004", userName: "佛山综合补能园区", accountNo: "H0004", microgridName: "佛山顺德站协同微电网", startDate: "2026-03-15", endDate: "2027-03-14", status: "合作中", sellerCompany: "滴滴电力（广东）有限公司" },
    { userCode: "GDUSER005", userName: "中山园区综合能源", accountNo: "H0005", microgridName: "-", startDate: "2025-06-01", endDate: "2026-05-31", status: "即将到期", sellerCompany: "滴滴电力（广东）有限公司" },
    { userCode: "GDUSER006", userName: "珠海港区补能中心", accountNo: "H0006", microgridName: "-", startDate: "2024-01-01", endDate: "2025-12-31", status: "已结束", sellerCompany: "滴滴电力（广东）有限公司" },
  ];

  var declarationUnits = ["全部", "交易单元 A", "交易单元 B", "交易单元 C"];
  var declarationStatuses = ["全部", "未申报", "已申报", "申报成功", "申报失败"];
  var declarationRows = [];
  ["交易单元 A", "交易单元 B", "交易单元 C"].forEach(function eachUnit(unit, unitIndex) {
    hours.forEach(function eachHour(time, hourIndex) {
      var statusOptions = ["未申报", "已申报", "申报成功", "申报失败"];
      var status = statusOptions[(hourIndex + unitIndex) % statusOptions.length];
      declarationRows.push({
        declarationDate: "2026-05-09",
        unit: unit,
        time: time,
        volume: 1280 + unitIndex * 160 + hourIndex * 12,
        price: Number((412.6 + unitIndex * 8.5 + hourIndex * 1.8).toFixed(1)),
        status: status,
        updatedAt: "2026-05-09 " + time.replace(":00", ":35:12"),
      });
    });
  });

  var rollingDataProducts = ["全部", "月内滚搓", "日前平衡", "实时滚动"];
  var rollingDataPeriods = ["00:00-04:00", "04:00-08:00", "08:00-16:00", "16:00-24:00"];
  var rollingDataRows = [];
  buildDateRange("2026-05-03", 7).forEach(function eachRollingDate(date, dayIndex) {
    rollingDataPeriods.forEach(function eachRollingPeriod(period, periodIndex) {
      var product = rollingDataProducts[(periodIndex % (rollingDataProducts.length - 1)) + 1];
      rollingDataRows.push({
        date: date,
        tradeCenter: "广东电力交易中心",
        product: product,
        period: period,
        volume: 1820 + dayIndex * 140 + periodIndex * 180,
        averagePrice: Number((398.6 + dayIndex * 4.2 + periodIndex * 8.6).toFixed(1)),
        updatedAt: "2026-05-09 11:08:16",
      });
    });
  });

  global.BOSS_GUANGDONG_DATA_MOCK = {
    infoDisclosure: {
      title: "信息披露",
      centerName: "广东电力交易中心",
      statusText: "数据更新时间：2026-05-09 11:35:33（取数工具）",
      defaultRunDate: "2026-05-08",
      availableRangeStart: "2026-05-02",
      availableRangeEnd: "2026-05-08",
      hours: hours,
      quarterHours: quarterHours,
      tabs: tabs,
      primaryTabs: tabs,
      secondaryTabs: [],
      metricTree: metricTree,
      metricSeries: metricSeries,
      loadDetailGroups: loadDetailGroups,
      saleCompanyRows: saleCompanyRows,
      enterpriseRows: enterpriseRows,
      maintenanceRows: maintenanceRows,
      reserveRows: reserveRows,
    },
    tradeResult: {
      title: "用电侧交易结果",
      centerName: "广东电力交易中心",
      statusText: "数据更新时间：2026-05-09 11:35:33（取数工具）",
      defaultRunDate: "2026-05-09",
      tabs: tradeResultTabs,
      nodeLabels: nodeLabels,
      hourlyRows: hours.map(function mapTradePrice(time, index) {
        return {
          time: time,
          dayaheadPrice: tradePriceDayAhead[index],
          realtimePrice: tradePriceRealTime[index],
          dayaheadVolume: tradeVolumeDayAhead[index],
          realtimeVolume: tradeVolumeRealTime[index],
          dayaheadSettlementPrice: tradeSettlementDayAhead[index],
          realtimeSettlementPrice: tradeSettlementRealTime[index],
        };
      }),
      nodePriceSeries: nodePriceSeries,
    },
    settlement: {
      title: "日清月结",
      centerName: "广东电力交易中心",
      statusText: "数据更新时间：2026-05-09 10:58:26（结算任务）",
      tabs: ["日清算", "月结算"],
      dailyRows: settlementDailyRows,
      monthRows: settlementMonthRows,
    },
    retailRelation: {
      title: "零售关系",
      centerName: "广东电力交易中心",
      statusText: "数据更新时间：2026-05-09 11:16:09（零售关系台账）",
      defaultRange: {
        start: "2026-01-01",
        end: "2026-12-31",
      },
      statusOptions: ["全部", "合作中", "即将到期", "已结束"],
      rows: retailRelationRows,
    },
    dayAheadDeclaration: {
      title: "日前申报",
      centerName: "广东电力交易中心",
      statusText: "数据更新时间：2026-05-09 11:22:48（申报回写）",
      defaultDate: {
        start: "2026-05-09",
        end: "2026-05-09",
      },
      unitOptions: declarationUnits,
      statusOptions: declarationStatuses,
      rows: declarationRows,
    },
    rollingData: {
      title: "滚搓数据",
      centerName: "广东电力交易中心",
      statusText: "数据更新时间：2026-05-09 11:08:16（广东交易中心滚搓任务）",
      defaultRange: {
        start: "2026-05-03",
        end: "2026-05-09",
      },
      productOptions: rollingDataProducts,
      rows: rollingDataRows,
    },
  };
})(window);
