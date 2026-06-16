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

  function averageNumbers(values, digits) {
    var numericValues = (values || []).filter(function filterValue(value) {
      return typeof value === "number" && !Number.isNaN(value);
    });

    if (!numericValues.length) {
      return null;
    }

    return Number(
      (
        numericValues.reduce(function accumulate(total, value) {
          return total + value;
        }, 0) / numericValues.length
      ).toFixed(typeof digits === "number" ? digits : 2)
    );
  }

  function buildPriceSpread(dayAheadValue, realTimeValue) {
    if (typeof dayAheadValue !== "number" || typeof realTimeValue !== "number") {
      return null;
    }

    return Number((realTimeValue - dayAheadValue).toFixed(2));
  }

  function buildNodePricePoints(timeLabels, dayAheadValues, realTimeValues) {
    return (timeLabels || []).map(function mapPoint(time, index) {
      var dayAheadNodePrice = typeof dayAheadValues[index] === "number" ? Number(dayAheadValues[index]) : null;
      var realTimeNodePrice = typeof realTimeValues[index] === "number" ? Number(realTimeValues[index]) : null;

      return {
        time: time,
        dayAheadNodePrice: dayAheadNodePrice,
        realTimeNodePrice: realTimeNodePrice,
        spread: buildPriceSpread(dayAheadNodePrice, realTimeNodePrice),
      };
    });
  }

  function aggregateNodePrice96To24(points96) {
    if (typeof global.aggregateNodePrice96To24 === "function") {
      return global.aggregateNodePrice96To24(points96);
    }

    return Array.from({ length: 24 }, function createHourPoint(_, hourIndex) {
      var segment = (points96 || []).slice(hourIndex * 4, hourIndex * 4 + 4);
      var dayAheadNodePrice = averageNumbers(
        segment.map(function mapPoint(point) {
          return point.dayAheadNodePrice;
        }),
      );
      var realTimeNodePrice = averageNumbers(
        segment.map(function mapPoint(point) {
          return point.realTimeNodePrice;
        }),
      );

      return {
        time: String(hourIndex).padStart(2, "0") + ":00",
        dayAheadNodePrice: dayAheadNodePrice,
        realTimeNodePrice: realTimeNodePrice,
        spread: buildPriceSpread(dayAheadNodePrice, realTimeNodePrice),
      };
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

  function roundHistoryPower(value) {
    return Number(Number(value).toFixed(2));
  }

  function buildHistoryDateRange(agentMonth) {
    return buildDateRange(agentMonth + "-01", 7);
  }

  function buildSellerHistoryHourPower(monthIndex, dayIndex, hourIndex) {
    var morning = Math.max(0, Math.sin(((hourIndex - 6) / 24) * Math.PI * 2)) * 21;
    var evening = Math.max(0, Math.sin(((hourIndex - 14) / 24) * Math.PI * 2)) * 28;
    var valley = hourIndex < 6 ? -12 : 0;
    var weekendOffset = dayIndex >= 5 ? -8 : 0;
    var base = 116 + monthIndex * 7 + dayIndex * 2.4 + morning + evening + valley + weekendOffset;
    return roundHistoryPower(base + ((hourIndex % 4) - 1.5) * 2.35);
  }

  function buildUserHistoryHourPower(monthIndex, dayIndex, hourIndex, userIndex) {
    var daytime = Math.max(0, Math.sin(((hourIndex - 7) / 24) * Math.PI * 2)) * (2.8 + userIndex * 0.34);
    var peak = Math.max(0, Math.sin(((hourIndex - 15) / 24) * Math.PI * 2)) * (4.4 + monthIndex * 0.6);
    var valley = hourIndex < 6 ? -1.1 : 0;
    var base = 7.8 + userIndex * 1.65 + monthIndex * 0.75 + dayIndex * 0.38 + valley;
    return roundHistoryPower(base + daytime + peak + ((hourIndex % 3) - 1) * 0.42);
  }

  var historySellerCompany = {
    code: "SD-GD-001",
    name: "小桔能源售电有限公司",
  };

  var historyAgentMonthConfigs = [
    { agentMonth: "2025-04", userCount: 143, updateTime: "2026-05-28 10:10:00" },
    { agentMonth: "2025-05", userCount: 156, updateTime: "2026-05-28 10:30:00" },
  ];

  var sellerHourlyPowerHistoryRows = [];
  historyAgentMonthConfigs.forEach(function eachAgentMonth(config, monthIndex) {
    buildHistoryDateRange(config.agentMonth).forEach(function eachHistoryDate(usageDate, dayIndex) {
      var dailyValues = hours.map(function mapHistoryHour(_, hourIndex) {
        return buildSellerHistoryHourPower(monthIndex, dayIndex, hourIndex);
      });
      var dailyPower = roundHistoryPower(sum(dailyValues));

      hours.forEach(function eachHour(hour, hourIndex) {
        sellerHourlyPowerHistoryRows.push({
          agentMonth: config.agentMonth,
          sellerCompanyCode: historySellerCompany.code,
          sellerCompanyName: historySellerCompany.name,
          usageDate: usageDate,
          hour: hour,
          power: dailyValues[hourIndex],
          dailyPower: dailyPower,
          userCount: config.userCount,
          dataSource: "历史回溯",
          updateTime: config.updateTime,
        });
      });
    });
  });

  var userHistoryTemplates = [
    {
      powerUserCode: "USER-GD-0001",
      powerUserName: "广州示例科技有限公司",
      accountNo: "030000000001",
      meterPointNo: "MP-GD-0001",
      microgridName: "广州番禺微电网",
      microgridId: "MG-GD-001",
      activeMonths: ["2025-04", "2025-05"],
    },
    {
      powerUserCode: "USER-GD-0002",
      powerUserName: "广州南沙智充运营有限公司",
      accountNo: "030000000002",
      meterPointNo: "MP-GD-0002",
      microgridName: "广州南沙站综合微电网",
      microgridId: "MG-GD-002",
      activeMonths: ["2025-04", "2025-05"],
    },
    {
      powerUserCode: "USER-GD-0003",
      powerUserName: "佛山顺德交通能源有限公司",
      accountNo: "030000000003",
      meterPointNo: "MP-GD-0003",
      microgridName: "",
      microgridId: "",
      activeMonths: ["2025-04", "2025-05"],
    },
    {
      powerUserCode: "USER-GD-0004",
      powerUserName: "深圳湾区补能科技有限公司",
      accountNo: "030000000004",
      meterPointNo: "MP-GD-0004",
      microgridName: "深圳前海微电网",
      microgridId: "MG-GD-004",
      activeMonths: ["2025-04"],
    },
    {
      powerUserCode: "USER-GD-0005",
      powerUserName: "珠海横琴绿色物流有限公司",
      accountNo: "030000000005",
      meterPointNo: "MP-GD-0005",
      microgridName: "",
      microgridId: "",
      activeMonths: ["2025-04", "2025-05"],
    },
    {
      powerUserCode: "USER-GD-0006",
      powerUserName: "东莞松山湖储充科技有限公司",
      accountNo: "030000000006",
      meterPointNo: "MP-GD-0006",
      microgridName: "东莞松山湖微电网",
      microgridId: "MG-GD-006",
      activeMonths: ["2025-05"],
    },
  ];

  var userHourlyPowerHistoryRows = [];
  historyAgentMonthConfigs.forEach(function eachUserHistoryMonth(config, monthIndex) {
    var activeUsers = userHistoryTemplates.filter(function filterActiveUser(user) {
      return user.activeMonths.indexOf(config.agentMonth) >= 0;
    });

    activeUsers.forEach(function eachUser(user, userIndex) {
      buildHistoryDateRange(config.agentMonth).forEach(function eachUserHistoryDate(usageDate, dayIndex) {
        hours.forEach(function eachUserHistoryHour(hour, hourIndex) {
          userHourlyPowerHistoryRows.push({
            agentMonth: config.agentMonth,
            sellerCompanyCode: historySellerCompany.code,
            sellerCompanyName: historySellerCompany.name,
            powerUserCode: user.powerUserCode,
            powerUserName: user.powerUserName,
            accountNo: user.accountNo,
            meterPointNo: user.meterPointNo,
            microgridName: user.microgridName,
            microgridId: user.microgridId,
            usageDate: usageDate,
            hour: hour,
            power: buildUserHistoryHourPower(monthIndex, dayIndex, hourIndex, userIndex),
            dataSource: "历史回溯",
            updateTime: config.updateTime,
          });
        });
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

  var transmissionMaintenancePlanRawRows = [
    [1, "广州恒运热电有限责任公司", "恒运D#8机组", "大修", "计划检修", "2026-02-16 00:00:00", "2026-04-11 23:59:00"],
    [2, "广东粤华发电有限责任公司", "黄埔A#2机组", "大修", "计划检修", "2026-03-06 01:00:00", "2026-03-30 23:59:00"],
    [3, "深圳妈湾电力有限公司", "妈湾#6机组", "大修", "计划检修", "2026-03-01 00:00:00", "2026-03-08 23:59:00"],
    [4, "广东珠海金湾发电有限公司", "珠海B#4机组", "大修", "计划检修", "2026-01-01 03:00:00", "2026-03-20 23:59:00"],
    [5, "华能（广东）能源开发有限公司海门电厂", "海门#1机组", "大修", "计划检修", "2026-02-01 03:00:00", "2026-05-04 23:59:00"],
    [6, "佛山市顺德五沙热电有限公司", "德胜#2机组", "大修", "计划检修", "2026-02-20 05:00:00", "2026-04-18 23:59:00"],
    [7, "佛山恒益热电有限公司", "恒益#1机组", "大修", "计划检修", "2026-02-22 02:00:00", "2026-04-07 23:59:59"],
    [8, "广东粤电韶关发电厂有限公司", "韶关A#2机组", "大修", "计划检修", "2026-03-01 03:00:00", "2026-05-09 23:59:00"],
    [9, "广东惠州平海发电厂有限公司", "平海#1机组", "大修", "计划检修", "2026-02-13 12:00:00", "2026-03-16 00:00:00"],
    [10, "阳西海滨电力发展有限公司", "阳西#6机组", "大修", "计划检修", "2026-02-28 06:30:00", "2026-05-13 22:00:00"],
    [11, "阳西海滨电力发展有限公司", "阳西#4机组", "大修", "计划检修", "2026-02-24 06:30:00", "2026-04-29 22:00:00"],
    [12, "广东能源茂名热电厂有限公司", "茂名#7机组", "大修", "计划检修", "2025-12-25 00:00:00", "2026-04-18 23:59:00"],
    [13, "广东粤电靖海发电有限公司", "靖海#6机组", "大修", "计划检修", "2026-02-25 04:00:00", "2026-03-25 23:59:00"],
    [14, "广东粤电靖海发电有限公司", "靖海B#4机组", "大修", "计划检修", "2026-02-24 04:00:00", "2026-07-09 00:00:00"],
    [15, "深圳市深汕特别合作区华润电力有限公司", "小漠#2机组", "大修", "计划检修", "2026-02-11 04:00:00", "2026-03-15 23:59:00"],
    [16, "广东粤电大埔发电有限公司", "汇东#1机组", "大修", "计划检修", "2026-02-21 03:00:00", "2026-03-19 00:00:00"],
    [17, "南海发电一厂有限公司", "新田A#2机组", "大修", "计划检修", "2026-02-26 00:00:00", "2026-03-27 23:59:00"],
    [18, "广东粤电博贺能源有限公司", "博贺#1机组", "大修", "计划检修", "2026-02-24 00:15:00", "2026-03-15 23:50:00"],
    [19, "广东粤电博贺能源有限公司", "博贺#4机组", "大修", "计划检修", "2026-03-01 11:15:00", "2026-04-10 23:45:00"],
    [20, "深能（河源）电力有限公司", "源和B#4机组", "大修", "计划检修", "2026-03-01 05:00:00", "2026-04-05 00:00:00"],
    [21, "国电投（珠海横琴）热电有限公司", "望洋#1、#2机组", "大修", "计划检修", "2026-03-02 03:00:00", "2026-04-30 23:59:00"],
    [22, "中海油珠海天然气发电有限公司", "依海#1、#2机组", "大修", "计划检修", "2026-03-02 03:30:00", "2026-03-08 23:59:00"],
    [23, "深圳市东部电力有限公司", "能东#1机组", "大修", "计划检修", "2026-01-05 00:00:00", "2026-03-08 23:59:00"],
    [24, "深圳市东部电力有限公司", "能东#2机组", "大修", "计划检修", "2026-02-11 00:00:00", "2026-03-13 23:59:00"],
    [25, "深圳市东部电力有限公司", "能东#3机组", "大修", "计划检修", "2026-02-18 00:00:00", "2026-03-08 23:59:00"],
    [26, "广东粤电中山热电厂有限公司", "怡丰#1、#2机组", "大修", "计划检修", "2026-03-02 06:00:00", "2026-04-30 20:00:00"],
    [27, "深圳南山热电股份有限公司", "南山#10、#11机组", "大修", "计划检修", "2026-02-26 00:00:00", "2026-03-31 23:59:00"],
    [28, "东莞虎门电厂", "虎门#3、#7机组", "大修", "计划检修", "2024-06-12 00:00:00", "2026-12-31 23:59:00"],
    [29, "东莞深能源樟洋电力有限公司", "樟洋#1、#2机组", "大修", "计划检修", "2026-03-06 04:00:00", "2026-04-05 00:00:00"],
    [30, "东莞深能源樟洋电力有限公司", "樟洋#3、#4机组", "大修", "计划检修", "2026-03-06 04:00:00", "2026-03-19 00:00:00"],
    [31, "华能东莞燃机热电有限责任公司", "谢岗#1、#2机组", "大修", "计划检修", "2026-02-24 03:00:00", "2026-04-25 01:00:00"],
    [32, "东莞市粤湾新能源有限公司", "悦湾#3、#4机组", "大修", "计划检修", "2026-03-01 03:00:00", "2026-04-16 01:00:00"],
    [33, "大唐佛山热电有限责任公司", "鳌围#1、#2机组", "大修", "计划检修", "2026-02-28 23:00:00", "2026-04-01 01:00:00"],
    [34, "大唐佛山热电有限责任公司", "鳌围#3、#4机组", "大修", "计划检修", "2026-02-28 23:30:00", "2026-03-16 00:30:00"],
    [35, "广东粤电大亚湾综合能源有限公司", "煜阳#2、#4机组", "大修", "计划检修", "2026-02-19 21:00:00", "2026-05-06 23:59:00"],
    [36, "广东粤电永安天然气热电有限公司", "鼎安#1、#2机组", "大修", "计划检修", "2026-01-01 01:00:00", "2026-04-30 01:00:00"],
    [37, "广东粤电滨海湾能源有限公司", "滨海湾#3机组", "大修", "计划检修", "2026-03-01 02:00:00", "2026-03-14 00:00:00"],
    [38, "岭澳核电有限公司", "岭澳#2机组", "大修", "计划检修", "2026-02-03 03:30:00", "2026-03-14 23:00:00"],
    [39, "阳江核电有限公司", "阳核#6机组", "大修", "计划检修", "2026-02-15 05:04:30", "2026-03-13 06:30:00"],
    [40, "深圳能源光明电力有限公司", "光明#2机组", "大修", "计划检修", "2026-03-03 00:00:00", "2026-03-13 23:59:00"],
    [41, "东亚电力（阳江）有限公司", "陵湾#3、#4机组", "大修", "计划检修", "2026-03-06 08:30:00", "2026-03-15 23:30:00"],
  ];

  var transmissionVoltageLevels = [
    "500kV",
    "220kV",
    "110kV",
    "35kV",
  ];

  function createTransmissionMaintenancePlanRow(row, date, sequence, offsetHours, voltageLevel) {
    var startDate = new Date(row[5].replace(" ", "T"));
    var endDate = new Date(row[6].replace(" ", "T"));

    startDate.setHours(startDate.getHours() + (offsetHours || 0));
    endDate.setHours(endDate.getHours() + (offsetHours || 0));

    return {
      date: date,
      sequence: sequence,
      plantName: row[1],
      equipmentName: row[2],
      voltageLevel: voltageLevel,
      unitName: row[2],
      statusType: row[3],
      changeReason: row[4],
      startTime: formatDate(startDate) + " " + String(startDate.getHours()).padStart(2, "0") + ":" + String(startDate.getMinutes()).padStart(2, "0") + ":00",
      endTime: formatDate(endDate) + " " + String(endDate.getHours()).padStart(2, "0") + ":" + String(endDate.getMinutes()).padStart(2, "0") + ":00",
    };
  }

  var transmissionMaintenancePlanRows = [];
  var transmissionMaintenanceCurrentIndexes = [0, 7, 9, 13, 18, 27, 30, 34, 40];
  var transmissionMaintenanceCompareIndexes = [0, 7, 10, 13, 18, 25, 27, 34, 36];

  transmissionMaintenanceCurrentIndexes.forEach(function eachCurrentPlan(rawIndex, index) {
    transmissionMaintenancePlanRows.push(
      createTransmissionMaintenancePlanRow(
        transmissionMaintenancePlanRawRows[rawIndex],
        "2026-05-09",
        index + 1,
        index % 3,
        transmissionVoltageLevels[rawIndex % transmissionVoltageLevels.length],
      ),
    );
  });

  transmissionMaintenanceCompareIndexes.forEach(function eachComparePlan(rawIndex, index) {
    transmissionMaintenancePlanRows.push(
      createTransmissionMaintenancePlanRow(
        transmissionMaintenancePlanRawRows[rawIndex],
        "2026-05-08",
        index + 1,
        -((index % 2) + 1),
        transmissionVoltageLevels[rawIndex % transmissionVoltageLevels.length],
      ),
    );
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
  // 成交电量样例暂未提供真实文件，交易结果页仅用这组稳定 placeholder 电量；价格仍来自 6.10 / 6.11。
  var tradeVolumeDayAhead = [
    6120, 5980, 5820, 5660, 5580, 5460,
    5620, 6040, 6680, 7520, 8240, 8620,
    8740, 8520, 8260, 8040, 8220, 8640,
    9020, 9340, 9580, 9260, 8640, 7820,
  ];
  var tradeVolumeRealTime = buildActual(tradeVolumeDayAhead, [-320, -180, -80, 110, 160, 220]).map(function roundVolume(value) {
    return Math.round(value);
  });
  var tradeDisclosureSource = global.BOSS_GD_TRADE_DISCLOSURE_SOURCE || {};
  var tradeDisclosureMockDate = "2026-05-07";
  var tradeDisclosureUpdateTime = "2026-05-07 14:00:00";
  var tradeDisclosurePublishTime = "2026-05-07 13:45:00";
  var nodePriceByDate = {};
  var tradingResultByDate = {};
  var unifiedNodePriceMock = global.nodePriceMockByCenter && global.nodePriceMockByCenter.guangdong;
  var unifiedTradingResultMock = global.tradingResultMockByCenter && global.tradingResultMockByCenter.guangdong;
  var disclosureTimes96 = (tradeDisclosureSource.nodeDayAhead && tradeDisclosureSource.nodeDayAhead.times) || [];
  var disclosureSelectedNodes = [];

  if (unifiedNodePriceMock && Array.isArray(unifiedNodePriceMock.nodes)) {
    var unifiedProvinceNode = unifiedNodePriceMock.nodes.find(function findProvinceNode(node) {
      return node.nodeName === "全省";
    });
    disclosureTimes96 = unifiedProvinceNode && unifiedProvinceNode.points
      ? unifiedProvinceNode.points.map(function mapPoint(point) {
          return point.time;
        })
      : disclosureTimes96;

    nodePriceByDate[tradeDisclosureMockDate] = {
      date: unifiedNodePriceMock.date || tradeDisclosureMockDate,
      centerName: unifiedNodePriceMock.centerName,
      updateTime: unifiedNodePriceMock.updateTime || tradeDisclosureUpdateTime,
      publishTime: unifiedNodePriceMock.publishTime || tradeDisclosurePublishTime,
      source: unifiedNodePriceMock.source || "取数工具",
      sourceFiles: [
        "6.3._【事后】日前节点边际电价.xlsx",
        "6.4._【事后】实时节点边际电价 (1).xlsx",
      ],
      rawSourceDates: {
        dayAhead: tradeDisclosureSource.nodeDayAhead ? tradeDisclosureSource.nodeDayAhead.sourceDate || "" : "",
        realTime: tradeDisclosureSource.nodeRealTime ? tradeDisclosureSource.nodeRealTime.sourceDate || "" : "",
      },
      timeGranularity: "15m",
      pointCount: disclosureTimes96.length,
      nodes: unifiedNodePriceMock.nodes,
      provinceAggregation: {
        sourceNodeName: "全省",
        sourcePointCount: 96,
        targetPointCount: 24,
        method: "每小时4个15分钟点取算术平均值",
      },
      provinceHourlyPoints: aggregateNodePrice96To24((unifiedProvinceNode && unifiedProvinceNode.points) || []),
    };
  } else if (
    tradeDisclosureSource.nodeDayAhead &&
    tradeDisclosureSource.nodeRealTime &&
    Array.isArray(tradeDisclosureSource.nodeDayAhead.times)
  ) {
    var dayAheadNodeRows = {};
    var realTimeNodeRows = {};

    (tradeDisclosureSource.nodeDayAhead.selectedNodes || []).forEach(function eachNode(row) {
      dayAheadNodeRows[row.nodeName] = row.values || [];
    });
    (tradeDisclosureSource.nodeRealTime.selectedNodes || []).forEach(function eachNode(row) {
      realTimeNodeRows[row.nodeName] = row.values || [];
    });

    disclosureSelectedNodes = (tradeDisclosureSource.nodeDayAhead.selectedNodes || []).map(function mapNode(row) {
      return row.nodeName;
    });

    var provinceNode = {
      nodeName: "全省",
      nodeType: "全省",
      points: buildNodePricePoints(
        disclosureTimes96,
        tradeDisclosureSource.nodeDayAhead.province || [],
        tradeDisclosureSource.nodeRealTime.province || [],
      ),
    };

    var actualNodes = disclosureSelectedNodes.map(function mapNode(nodeName) {
      return {
        nodeName: nodeName,
        nodeType: "其他",
        points: buildNodePricePoints(disclosureTimes96, dayAheadNodeRows[nodeName] || [], realTimeNodeRows[nodeName] || []),
      };
    });

    nodePriceByDate[tradeDisclosureMockDate] = {
      date: tradeDisclosureMockDate,
      updateTime: tradeDisclosureUpdateTime,
      publishTime: tradeDisclosurePublishTime,
      source: "取数工具",
      sourceFiles: [
        "6.3._【事后】日前节点边际电价.xlsx",
        "6.4._【事后】实时节点边际电价 (1).xlsx",
      ],
      rawSourceDates: {
        dayAhead: tradeDisclosureSource.nodeDayAhead.sourceDate || "",
        realTime: tradeDisclosureSource.nodeRealTime.sourceDate || "",
      },
      timeGranularity: "15m",
      pointCount: disclosureTimes96.length,
      nodes: [provinceNode].concat(actualNodes),
      provinceAggregation: {
        sourceNodeName: "全省",
        sourcePointCount: 96,
        targetPointCount: 24,
        method: "每小时4个15分钟点取算术平均值",
      },
      provinceHourlyPoints: aggregateNodePrice96To24(provinceNode.points),
    };
  }

  if (unifiedTradingResultMock && Array.isArray(unifiedTradingResultMock.points)) {
    tradingResultByDate[tradeDisclosureMockDate] = {
      date: unifiedTradingResultMock.date || tradeDisclosureMockDate,
      centerName: unifiedTradingResultMock.centerName,
      updateTime: unifiedTradingResultMock.updateTime || tradeDisclosureUpdateTime,
      publishTime: unifiedTradingResultMock.publishTime || tradeDisclosurePublishTime,
      source: unifiedTradingResultMock.source || "取数工具",
      sourceFiles: [
        "6.10._【事后】日前用户侧统一结算价格 (2).xlsx",
        "6.11._【事后】实时用户侧统一结算价格 (4).xlsx",
      ],
      rawSourceDates: {
        dayAheadSettlement: tradeDisclosureSource.settlementDayAhead ? tradeDisclosureSource.settlementDayAhead.sourceDate || "" : "",
        realTimeSettlement: tradeDisclosureSource.settlementRealTime ? tradeDisclosureSource.settlementRealTime.sourceDate || "" : "",
      },
      volumeSource: unifiedTradingResultMock.volumeSource || "stable-placeholder",
      priceGranularity: "1h",
      volumeFieldNote: "当前未提供真实成交电量文件，dayAheadVolume/realTimeVolume 为稳定 placeholder mock。",
      points: unifiedTradingResultMock.points,
    };
  } else if (tradeDisclosureSource.settlementDayAhead && tradeDisclosureSource.settlementRealTime) {
    var settlementDayAheadPoints = tradeDisclosureSource.settlementDayAhead.points || [];
    var settlementRealTimePoints = tradeDisclosureSource.settlementRealTime.points || [];
    var tradingResultPoints = hours.map(function mapHour(time, index) {
      var dayAheadSettlementPoint = settlementDayAheadPoints[index] || {};
      var realTimeSettlementPoint = settlementRealTimePoints[index] || {};

      return {
        time: time,
        dayAheadVolume: tradeVolumeDayAhead[index],
        realTimeVolume: tradeVolumeRealTime[index],
        dayAheadSettlementPrice:
          typeof dayAheadSettlementPoint.price === "number" ? Number(dayAheadSettlementPoint.price) : null,
        realTimeSettlementPrice:
          typeof realTimeSettlementPoint.price === "number" ? Number(realTimeSettlementPoint.price) : null,
      };
    });

    tradingResultByDate[tradeDisclosureMockDate] = {
      date: tradeDisclosureMockDate,
      updateTime: tradeDisclosureUpdateTime,
      publishTime: tradeDisclosurePublishTime,
      source: "取数工具",
      sourceFiles: [
        "6.10._【事后】日前用户侧统一结算价格 (2).xlsx",
        "6.11._【事后】实时用户侧统一结算价格 (4).xlsx",
      ],
      rawSourceDates: {
        dayAheadSettlement: tradeDisclosureSource.settlementDayAhead.sourceDate || "",
        realTimeSettlement: tradeDisclosureSource.settlementRealTime.sourceDate || "",
      },
      volumeSource: "stable-placeholder",
      priceGranularity: "1h",
      volumeFieldNote: "当前未提供真实成交电量文件，dayAheadVolume/realTimeVolume 为稳定 placeholder mock。",
      points: tradingResultPoints,
    };
  }

  var settlementDailyHourColumns = Array.from({ length: 24 }, function createHourColumn(_, index) {
    return String(index) + "时";
  });
  var settlementDailyColumns = [
    { key: "日期", title: "日期" },
    { key: "结算类型名称", title: "结算类型名称" },
    { key: "数据类型", title: "数据类型" },
    { key: "企业编码", title: "企业编码" },
    { key: "企业名称", title: "企业名称" },
    { key: "合计值", title: "合计值" },
  ].concat(
    settlementDailyHourColumns.map(function mapHourColumn(hourLabel) {
      return { key: hourLabel, title: hourLabel };
    }),
  );
  var guangdongDailySettlementDate = "2026-05-08";
  var guangdongDailySettlementEnterprise = {
    enterpriseCode: "SD508",
    enterpriseName: "广州汇桔新能源科技有限公司",
  };
  var guangdongActualEnergyValues = [
    1.862, 1.736, 1.684, 1.642, 1.705, 1.918, 2.214, 2.756, 3.128, 3.466, 3.702, 3.846,
    3.912, 3.688, 3.524, 3.476, 3.732, 4.168, 4.586, 4.812, 4.604, 3.958, 3.204, 2.438,
  ];
  var guangdongRenewableEnergyValues = [
    0.186, 0.174, 0.168, 0.164, 0.171, 0.192, 0.221, 0.276, 0.313, 0.347, 0.37, 0.385,
    0.391, 0.369, 0.352, 0.348, 0.373, 0.417, 0.459, 0.481, 0.46, 0.396, 0.32, 0.244,
  ];
  var guangdongTotalEnergyValues = guangdongActualEnergyValues.map(function mapEnergyValue(value, index) {
    return Number((value + guangdongRenewableEnergyValues[index]).toFixed(3));
  });
  var guangdongSettlementPriceValues = [
    362.148, 358.234, 356.906, 355.772, 357.418, 361.826, 368.552, 382.364, 395.216, 408.735, 416.428, 420.316,
    418.642, 411.279, 403.668, 399.824, 407.352, 426.905, 438.118, 442.673, 435.229, 418.754, 397.331, 376.842,
  ];
  var guangdongSettlementFeeValues = guangdongTotalEnergyValues.map(function mapFeeValue(value, index) {
    return Number((value * guangdongSettlementPriceValues[index]).toFixed(2));
  });

  function sumGuangdongDailyValues(values, digits) {
    return Number(
      (values || [])
        .reduce(function accumulate(total, value) {
          return total + Number(value || 0);
        }, 0)
        .toFixed(digits),
    );
  }

  function createGuangdongDailySettlementRow(settlementTypeName, dataType, values, totalValue) {
    var digits = dataType === "电费" ? 2 : 3;
    var row = {
      date: guangdongDailySettlementDate,
      settlementTypeName: settlementTypeName,
      dataType: dataType,
      enterpriseCode: guangdongDailySettlementEnterprise.enterpriseCode,
      enterpriseName: guangdongDailySettlementEnterprise.enterpriseName,
      "日期": guangdongDailySettlementDate,
      "结算类型名称": settlementTypeName,
      "数据类型": dataType,
      "企业编码": guangdongDailySettlementEnterprise.enterpriseCode,
      "企业名称": guangdongDailySettlementEnterprise.enterpriseName,
      "合计值": totalValue === undefined ? sumGuangdongDailyValues(values, digits) : totalValue,
    };

    settlementDailyHourColumns.forEach(function eachHour(hourLabel, index) {
      row[hourLabel] = Number(Number(values[index] || 0).toFixed(digits));
    });

    if (settlementTypeName === "实际分时电量" && dataType === "电量") {
      row.actualUsage = row["合计值"];
      row.monthlyActualUsage = row["合计值"];
    }

    return row;
  }

  var guangdongTotalEnergy = sumGuangdongDailyValues(guangdongTotalEnergyValues, 3);
  var guangdongTotalFee = sumGuangdongDailyValues(guangdongSettlementFeeValues, 2);
  var settlementDailyRows = [
    createGuangdongDailySettlementRow("实际分时电量", "电量", guangdongActualEnergyValues),
    createGuangdongDailySettlementRow("非现货可再生电量", "电量", guangdongRenewableEnergyValues),
    createGuangdongDailySettlementRow("合计（当期）", "电量", guangdongTotalEnergyValues, guangdongTotalEnergy),
    createGuangdongDailySettlementRow("合计（当期）", "电价", guangdongSettlementPriceValues, Number((guangdongTotalFee / guangdongTotalEnergy).toFixed(3))),
    createGuangdongDailySettlementRow("合计（当期）", "电费", guangdongSettlementFeeValues, guangdongTotalFee),
  ];

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

  var guangdongMonthlySettlementGroups = [
    { label: "合计（含追补）", children: ["电量", "电价", "电费"] },
    { label: "追补电费", children: ["电量", "电价", "电费"] },
    { label: "售电公司批零差价分享电费", children: ["电费"] },
    { label: "售电公司批零差价回收电费", children: ["电费"] },
    { label: "零售合同退补补充协议", children: ["电费"] },
    { label: "合计（当期）", children: ["电量", "电价", "电费"] },
    { label: "跨省点对点中长期合约", children: ["电量", "电价", "电费"] },
    { label: "跨省点对点中长期合约阻塞电费", children: ["电费"] },
    { label: "中长期市场化", children: ["电量", "电价", "电费"] },
    { label: "年度", children: ["电量", "电价", "电费"] },
    { label: "多月", children: ["电量", "电价", "电费"] },
    { label: "月度", children: ["电量", "电价", "电费"] },
    { label: "周", children: ["电量", "电价", "电费"] },
    { label: "多日", children: ["电量", "电价", "电费"] },
    { label: "偏差价差收益转移结算电费", children: ["电量", "电价", "电费"] },
    { label: "日前偏差", children: ["电量", "电价", "电费"] },
    { label: "实时偏差", children: ["电量", "电价", "电费"] },
    { label: "分摊电费", children: ["电费"] },
    { label: "用户侧偏差收益转移资金分摊电费", children: ["电费"] },
    { label: "退补联动分摊电费", children: ["电费"] },
    { label: "日内临时非计划停运考核分摊电费", children: ["电费"] },
    { label: "实时发电计划执行偏差考核分摊电费", children: ["电费"] },
    { label: "热电联产考核分摊电费", children: ["电费"] },
    { label: "限高限低考核分摊电费", children: ["电费"] },
    { label: "阻塞盈余分摊电费", children: ["电费"] },
    { label: "分摊未付款项分摊电费", children: ["电费"] },
    { label: "年度基数合约电量偏差电费分摊电费", children: ["电费"] },
    { label: "四舍五入差额分摊电费", children: ["电费"] },
    { label: "变动成本补偿分摊电费", children: ["电费"] },
    { label: "运行补偿费用分摊电费", children: ["电量", "电价", "电费"] },
    { label: "启动补偿分摊电费", children: ["电费"] },
    { label: "发用电不平衡分摊电费", children: ["电费"] },
    { label: "机组中长期偏差考核分摊电费", children: ["电费"] },
    { label: "返还电费", children: ["电费"] },
    { label: "零售电费", children: ["电费"] },
    { label: "峰谷平衡电费", children: ["电费"] },
    { label: "峰谷平衡退补电费", children: ["电费"] },
    { label: "用电偏差考核电费", children: ["电费"] },
    { label: "中长期交易偏差考核电费", children: ["电费"] },
    { label: "需求申报偏差考核电费", children: ["电费"] },
    { label: "非现货可再生合同电能量电费", children: ["电量", "电价", "电费"] },
    { label: "非现货可再生环境溢价", children: ["电量", "电价", "电费"] },
    { label: "现货可再生合同电能量电费", children: ["电量", "电价", "电费"] },
    { label: "现货可再生环境溢价", children: ["电量", "电价", "电费"] },
    { label: "消纳量交易", children: ["电量", "电价", "电费"] },
    { label: "保底售电平衡资金", children: ["电费"] },
    { label: "核电中长期差价回收", children: ["电费"] },
    { label: "退补电费", children: ["电费"] },
    { label: "跨省中长期合约", children: ["电量", "电价", "电费"] },
    { label: "省内分摊跨省中长期阻塞", children: ["电量", "电价", "电费"] },
    { label: "跨省交易阻塞盈余分摊", children: ["电费"] },
    { label: "跨省超额偏差收益回收分摊", children: ["电费"] },
    { label: "批零结构不匹配考核电费", children: ["电费"] },
    { label: "多月集中竞争盈亏（违约处置）", children: ["电费"] },
  ];

  function getGuangdongMonthlyColumnKey(groupIndex, childLabel) {
    var suffixMap = {
      "电量": "energy",
      "电价": "price",
      "电费": "fee",
    };
    return "gd_" + String(groupIndex + 1).padStart(2, "0") + "_" + suffixMap[childLabel];
  }

  function getGuangdongMonthlyColumnType(childLabel) {
    if (childLabel === "电量") {
      return "energy";
    }
    if (childLabel === "电价") {
      return "price";
    }
    return "money";
  }

  function buildGuangdongMonthlySettlementColumns() {
    return [
      { key: "seq", label: "序号", fixed: true, width: 76 },
      { key: "enterpriseCode", label: "企业编码", fixed: true, width: 126 },
      { key: "enterpriseName", label: "企业名称", fixed: true, width: 240 },
    ].concat(
      guangdongMonthlySettlementGroups.map(function mapGroup(group, groupIndex) {
        return {
          label: group.label,
          children: group.children.map(function mapChild(childLabel) {
            return {
              key: getGuangdongMonthlyColumnKey(groupIndex, childLabel),
              label: childLabel,
              type: getGuangdongMonthlyColumnType(childLabel),
              width: childLabel === "电费" ? 130 : 116,
            };
          }),
        };
      }),
    );
  }

  function getGuangdongMonthlyMockValue(groupIndex, childLabel) {
    var polarity = groupIndex % 9 === 1 || groupIndex % 13 === 4 ? -1 : 1;
    var energy = Number((326.418 - groupIndex * 2.731).toFixed(3));
    var price = Number((384.126 + (groupIndex % 7) * 3.417).toFixed(3));
    if (childLabel === "电量") {
      return Math.abs(energy) < 1 ? 0 : Number((energy * polarity).toFixed(3));
    }
    if (childLabel === "电价") {
      return Math.abs(energy) < 1 ? 0 : price;
    }
    if (guangdongMonthlySettlementGroups[groupIndex].children.indexOf("电量") >= 0) {
      return Number(((Math.abs(energy) < 1 ? 0 : energy) * price * polarity).toFixed(2));
    }
    return Number(((groupIndex + 1) * 186.72 * polarity).toFixed(2));
  }

  function buildGuangdongMonthlySettlementRows() {
    var row = {
      seq: 1,
      enterpriseCode: "SD508",
      enterpriseName: "广州汇桔新能源科技有限公司",
    };

    guangdongMonthlySettlementGroups.forEach(function eachGroup(group, groupIndex) {
      group.children.forEach(function eachChild(childLabel) {
        row[getGuangdongMonthlyColumnKey(groupIndex, childLabel)] = getGuangdongMonthlyMockValue(groupIndex, childLabel);
      });
    });

    return [row];
  }

  var guangdongMonthlySettlementData = {
    provinceCode: "gd",
    provinceName: "广东",
    hasPurchaseSaleSide: false,
    month: "2026-01",
    updateTime: "2026-02-09 10:58:26",
    updateSource: "人工上传",
    purchaseSide: {
      summaryCards: [
        { label: "当年实际用电量", value: 326.418, unit: "MWh", digits: 3 },
        { label: "中长期交易电量", value: 298.764, unit: "MWh", digits: 3 },
        { label: "中长期占实际用电比例", value: 91.53, unit: "%", digits: 2 },
        { label: "度电收益", value: 2.36, unit: "厘", digits: 2 },
      ],
      tableColumns: buildGuangdongMonthlySettlementColumns(),
      tableRows: buildGuangdongMonthlySettlementRows(),
    },
  };

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
    dataPublishTime: "2026-05-09 10:55:00",
    infoDisclosure: {
      title: "信息披露",
      centerName: "广东电力交易中心",
      statusText: "数据更新时间：2026-05-09 11:35:33（取数工具）",
      publishTime: "2026-05-09 10:55:00",
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
      historyAgentMonths: historyAgentMonthConfigs.map(function mapHistoryMonth(config) { return config.agentMonth; }),
      sellerHourlyPowerHistoryRows: sellerHourlyPowerHistoryRows,
      userHourlyPowerHistoryRows: userHourlyPowerHistoryRows,
      maintenanceRows: maintenanceRows,
      transmissionMaintenancePlanRows: transmissionMaintenancePlanRows,
      transmissionMaintenancePlanDefaultDate: "2026-05-09",
      transmissionMaintenancePlanUpdateTime: "2026-05-26 10:46:00",
      transmissionMaintenancePlanPublishTime: "2026-05-26 10:46:00",
      reserveRows: reserveRows,
    },
    tradeResult: {
      title: "用电侧交易结果",
      centerName: "广东电力交易中心",
      statusText: "数据更新时间：" + tradeDisclosureUpdateTime + "（取数工具）",
      publishTime: tradeDisclosurePublishTime,
      defaultRunDate: tradeDisclosureMockDate,
      availableRunDates: [tradeDisclosureMockDate],
      tabs: tradeResultTabs,
      nodePriceTimePoints: disclosureTimes96,
      nodePriceByDate: nodePriceByDate,
      tradingResultByDate: tradingResultByDate,
      placeholderVolume: true,
    },
    settlement: {
      title: "日清月结",
      centerName: "广东电力交易中心",
      statusText: "数据更新时间：2026-05-09 10:58:26（结算任务）",
      publishTime: "2026-05-09 10:30:00",
      tabs: ["日清算", "月结算"],
      dailyColumns: settlementDailyColumns,
      dailyDateRange: {
        start: guangdongDailySettlementDate,
        end: guangdongDailySettlementDate,
      },
      dailyRows: settlementDailyRows,
      monthRows: settlementMonthRows,
      monthlySettlementData: guangdongMonthlySettlementData,
    },
    retailRelation: {
      title: "零售关系",
      centerName: "广东电力交易中心",
      statusText: "数据更新时间：2026-05-09 11:16:09（零售关系台账）",
      publishTime: "2026-05-09 10:50:00",
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
      publishTime: "2026-05-09 11:00:00",
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
      publishTime: "2026-05-09 10:40:00",
      defaultRange: {
        start: "2026-05-03",
        end: "2026-05-09",
      },
      productOptions: rollingDataProducts,
      rows: rollingDataRows,
    },
  };
})(window);
