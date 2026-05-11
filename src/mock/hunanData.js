(function attachHunanDataMock(global) {
  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatDate(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function formatDateTime(date) {
    return (
      formatDate(date) +
      " " +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes()) +
      ":" +
      pad(date.getSeconds())
    );
  }

  function buildDateRange(start, days) {
    var base = new Date(start + "T00:00:00");
    return Array.from({ length: days }, function createDate(_, index) {
      var nextDate = new Date(base.getTime());
      nextDate.setDate(base.getDate() + index);
      return formatDate(nextDate);
    });
  }

  function buildTimeLabels(stepMinutes, count) {
    return Array.from({ length: count }, function createLabel(_, index) {
      var totalMinutes = index * stepMinutes;
      var hour = Math.floor(totalMinutes / 60);
      var minute = totalMinutes % 60;
      return pad(hour) + ":" + pad(minute);
    });
  }

  function round(value) {
    return Number(Number(value).toFixed(1));
  }

  function sum(values) {
    return round(
      values.reduce(function accumulate(total, value) {
        return total + value;
      }, 0),
    );
  }

  function average(values) {
    return round(sum(values) / Math.max(values.length, 1));
  }

  function averageBySlot(rows, fieldKey) {
    if (!rows.length) {
      return [];
    }

    return rows[0][fieldKey].map(function mapValue(_, index) {
      return average(
        rows.map(function pickValue(row) {
          return row[fieldKey][index];
        }),
      );
    });
  }

  function buildUpdatedAt(baseText, offsetMinutes) {
    var date = new Date(baseText.replace(" ", "T"));
    date.setMinutes(date.getMinutes() + offsetMinutes);
    return formatDateTime(date);
  }

  function buildHunanDailyLoadRow(date, dayIndex) {
    var hourlyValues = buildTimeLabels(60, 24).map(function createValue(_, hour) {
      var daytime = Math.max(0, Math.sin(((hour - 6) / 24) * Math.PI * 2)) * 118;
      var evening = Math.max(0, Math.sin(((hour - 13) / 24) * Math.PI * 2)) * 186;
      var valley = hour < 6 ? -72 : 0;
      var base = 758 + dayIndex * 13 + daytime + evening + valley + ((hour % 4) - 1.5) * 14;
      return Math.round(base);
    });

    return {
      date: date,
      hourlyValues: hourlyValues,
      total: sum(hourlyValues),
    };
  }

  function buildPriceRows(dates, basePrice, source, updatedAt) {
    return dates.reduce(function accumulateRows(result, date, dayIndex) {
      return result.concat(
        buildTimeLabels(60, 24).map(function createRow(time, hour) {
          var daytime = Math.max(0, Math.sin(((hour - 7) / 24) * Math.PI * 2)) * 16;
          var peak = Math.max(0, Math.sin(((hour - 15) / 24) * Math.PI * 2)) * 28;
          var dayahead = round(basePrice + dayIndex * 3.2 + daytime + peak + ((hour % 3) - 1) * 4.6);
          var realtime = round(dayahead + ((hour % 5) - 2) * 3.8 + (dayIndex % 2 === 0 ? 5.2 : -4.8));
          return {
            date: date,
            time: time,
            dayaheadPrice: dayahead,
            realtimePrice: realtime,
            diff: round(realtime - dayahead),
            unit: "元/MWh",
            source: source,
            updatedAt: updatedAt,
          };
        }),
      );
    }, []);
  }

  function buildTrendRows(dates, options) {
    return dates.reduce(function accumulateRows(result, date, dayIndex) {
      return result.concat(
        buildTimeLabels(60, 24).map(function createRow(time, hour) {
          var dayWave = Math.sin(((hour - options.dayShift) / 24) * Math.PI * 2) * options.dayAmplitude;
          var peakWave = Math.max(0, Math.sin(((hour - options.peakShift) / 24) * Math.PI * 2)) * options.peakAmplitude;
          var trendValue =
            options.base +
            dayIndex * options.dayIncrement +
            dayWave +
            peakWave +
            ((hour % options.modBase) - options.modOffset) * options.noise;
          return {
            date: date,
            time: time,
            value: round(trendValue),
            unit: options.unit,
            source: options.source,
            updatedAt: options.updatedAt,
          };
        }),
      );
    }, []);
  }

  function buildTrendModule(dates, options) {
    var rows = buildTrendRows(dates, options);
    return {
      type: "trend",
      unit: options.unit,
      purpose: options.purpose,
      source: options.source,
      updatedAt: options.updatedAt,
      chartData: {
        labels: rows.map(function mapRow(row) {
          return row.date.slice(5) + " " + row.time;
        }),
        values: rows.map(function mapRow(row) {
          return row.value;
        }),
      },
      tableRows: rows,
    };
  }

  var hours = buildTimeLabels(60, 24);
  var availableDates = buildDateRange("2026-04-26", 14);
  var defaultRange = {
    start: "2026-05-03",
    end: "2026-05-09",
  };
  var dataUpdatedAt = "2026-05-09 10:32:18";
  var dataSource = "湖南电力交易中心信息披露";
  var loadRows = availableDates.map(buildHunanDailyLoadRow);
  var loadAverageValues = averageBySlot(loadRows, "hourlyValues");
  var settlementPriceRows = buildPriceRows(availableDates, 362, "湖南现货统一结算口径", buildUpdatedAt(dataUpdatedAt, -18));
  var settlementDates = buildDateRange("2026-05-03", 7);
  var settlementDailyTemplates = [
    { enterpriseCode: "HNQY001", enterpriseName: "长沙高铁南站补能中心", accountNo: "HN0001" },
    { enterpriseCode: "HNQY002", enterpriseName: "株洲公交充电站群", accountNo: "HN0002" },
    { enterpriseCode: "HNQY003", enterpriseName: "湘潭园区综合能源站", accountNo: "HN0003" },
    { enterpriseCode: "HNQY004", enterpriseName: "岳阳物流港充换电站", accountNo: "HN0004" },
  ];
  var settlementDailyRows = [];
  settlementDates.forEach(function eachSettlementDate(date, dayIndex) {
    settlementDailyTemplates.forEach(function eachTemplate(template, templateIndex) {
      var energy = 7680 + dayIndex * 290 + templateIndex * 430;
      var dayaheadFee = 365000 + dayIndex * 11800 + templateIndex * 17400;
      var realtimeFee = 103000 + dayIndex * 5200 + templateIndex * 7600;
      var deviationFee = 14200 + dayIndex * 620 + templateIndex * 880;
      var imbalanceFee = 8100 + dayIndex * 410 + templateIndex * 650;
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
    { month: "2026-05", enterpriseCode: "HNQY001", enterpriseName: "长沙高铁南站补能中心", accountNo: "HN0001", energy: 264800, fee: 12260000, agencyIncome: 298000, status: "已出账" },
    { month: "2026-05", enterpriseCode: "HNQY002", enterpriseName: "株洲公交充电站群", accountNo: "HN0002", energy: 248100, fee: 11420000, agencyIncome: 276000, status: "已出账" },
    { month: "2026-05", enterpriseCode: "HNQY003", enterpriseName: "湘潭园区综合能源站", accountNo: "HN0003", energy: 226600, fee: 10370000, agencyIncome: 252000, status: "结算中" },
    { month: "2026-05", enterpriseCode: "HNQY004", enterpriseName: "岳阳物流港充换电站", accountNo: "HN0004", energy: 209300, fee: 9560000, agencyIncome: 236000, status: "待确认" },
    { month: "2026-04", enterpriseCode: "HNQY001", enterpriseName: "长沙高铁南站补能中心", accountNo: "HN0001", energy: 251400, fee: 11610000, agencyIncome: 284000, status: "已出账" },
    { month: "2026-04", enterpriseCode: "HNQY002", enterpriseName: "株洲公交充电站群", accountNo: "HN0002", energy: 236800, fee: 10890000, agencyIncome: 268000, status: "已出账" },
    { month: "2026-04", enterpriseCode: "HNQY003", enterpriseName: "湘潭园区综合能源站", accountNo: "HN0003", energy: 218900, fee: 10080000, agencyIncome: 247000, status: "已出账" },
    { month: "2026-04", enterpriseCode: "HNQY004", enterpriseName: "岳阳物流港充换电站", accountNo: "HN0004", energy: 201600, fee: 9280000, agencyIncome: 230000, status: "已出账" },
  ];
  var retailRelationRows = [
    { userCode: "HNUSER001", userName: "长沙高铁南站补能中心", accountNo: "HN0001", microgridName: "长沙南站综合微电网", startDate: "2026-01-01", endDate: "2026-12-31", status: "合作中", sellerCompany: "滴滴电力（湖南）有限公司" },
    { userCode: "HNUSER002", userName: "株洲公交充电站群", accountNo: "HN0002", microgridName: "-", startDate: "2025-12-01", endDate: "2026-11-30", status: "合作中", sellerCompany: "滴滴电力（湖南）有限公司" },
    { userCode: "HNUSER003", userName: "湘潭园区综合能源站", accountNo: "HN0003", microgridName: "湘潭智造谷微电网", startDate: "2025-08-01", endDate: "2026-07-31", status: "即将到期", sellerCompany: "滴滴电力（湖南）有限公司" },
    { userCode: "HNUSER004", userName: "岳阳物流港充换电站", accountNo: "HN0004", microgridName: "-", startDate: "2026-03-01", endDate: "2027-02-28", status: "合作中", sellerCompany: "滴滴电力（湖南）有限公司" },
    { userCode: "HNUSER005", userName: "常德公共交通能源站", accountNo: "HN0005", microgridName: "-", startDate: "2024-06-01", endDate: "2025-12-31", status: "已结束", sellerCompany: "滴滴电力（湖南）有限公司" },
  ];
  var rollingDataProducts = ["全部", "月内滚搓", "日前平衡", "实时滚动"];
  var rollingDataPeriods = ["00:00-04:00", "04:00-08:00", "08:00-16:00", "16:00-24:00"];
  var rollingDataRows = [];
  settlementDates.forEach(function eachRollingDate(date, dayIndex) {
    rollingDataPeriods.forEach(function eachRollingPeriod(period, periodIndex) {
      var product = rollingDataProducts[(periodIndex % (rollingDataProducts.length - 1)) + 1];
      rollingDataRows.push({
        date: date,
        tradeCenter: "湖南电力交易中心",
        product: product,
        period: period,
        volume: 1460 + dayIndex * 120 + periodIndex * 160,
        averagePrice: round(372.4 + dayIndex * 3.6 + periodIndex * 7.8),
        updatedAt: buildUpdatedAt(dataUpdatedAt, -12),
      });
    });
  });

  var tabs = [
    "日用电信息（现货）",
    "日前用户侧统一结算价格",
    "实时用户侧统一结算价格",
    "系统负荷预测（日）",
    "实际负荷",
    "省间联络线输电曲线预测",
    "省间联络线输电情况",
    "发电总出力预测",
    "非市场机组总出力预测",
    "新能源总出力预测（日）",
    "水电（含抽蓄）总出力预测（日）",
    "非市场机组总出力",
    "新能源总出力",
    "水电（含抽蓄）总出力",
    "实时节点边际电价",
    "售电公司日用电信息",
  ];

  global.BOSS_HUNAN_DATA_MOCK = {
    pageKey: "hn-data-disclosure",
    tradeCenterName: "湖南电力交易中心",
    title: "湖南电力交易中心",
    description: "湖南交易中心用于展示价格预测、负荷预测、仿真回测相关的数据披露内容。",
    defaultRange: defaultRange,
    availableRange: {
      start: availableDates[0],
      end: availableDates[availableDates.length - 1],
    },
    tabs: tabs,
    dataUpdatedAt: dataUpdatedAt,
    dataSource: dataSource,
    emptyExample: {
      range: {
        start: "2026-04-10",
        end: "2026-04-12",
      },
      message: "所选日期未命中湖南交易中心已入库批次，页面展示空状态。",
    },
    errorExample: {
      range: {
        start: "2026-05-06",
        end: "2026-05-06",
      },
      message: "2026-05-06 14:00 批次部分字段延迟，页面展示最近一次成功入库数据并提示人工复核。",
      source: "湖南交易中心取数链路告警",
      updatedAt: "2026-05-06 14:26:09",
    },
    settlement: {
      title: "日清月结",
      centerName: "湖南电力交易中心",
      statusText: "数据更新时间：2026-05-09 10:46:12（湖南交易中心结算任务）",
      tabs: ["日清算", "月结算"],
      dailyRows: settlementDailyRows,
      monthRows: settlementMonthRows,
    },
    retailRelation: {
      title: "零售关系",
      centerName: "湖南电力交易中心",
      statusText: "数据更新时间：2026-05-09 10:58:40（湖南交易中心零售关系台账）",
      defaultRange: {
        start: "2026-01-01",
        end: "2026-12-31",
      },
      statusOptions: ["全部", "合作中", "即将到期", "已结束"],
      rows: retailRelationRows,
    },
    rollingData: {
      title: "滚搓数据",
      centerName: "湖南电力交易中心",
      statusText: "数据更新时间：2026-05-09 10:39:26（湖南交易中心滚搓任务）",
      defaultRange: {
        start: "2026-05-03",
        end: "2026-05-09",
      },
      productOptions: rollingDataProducts,
      rows: rollingDataRows,
    },
    modules: {
      "日用电信息（现货）": {
        type: "load-profile-24",
        unit: "MWh",
        purpose: ["负荷预测", "仿真回测"],
        source: "湖南现货用户侧负荷信息",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -7),
        hours: hours,
        chartData: {
          latestDay: loadRows[loadRows.length - 1].hourlyValues.slice(),
          averageDay: loadAverageValues.slice(),
        },
        tableRows: loadRows,
      },
      "日前用户侧统一结算价格": {
        type: "dual-price",
        unit: "元/MWh",
        purpose: ["价格预测", "仿真回测"],
        pairTabs: ["日前用户侧统一结算价格", "实时用户侧统一结算价格"],
        chartData: {
          labels: settlementPriceRows.map(function mapRow(row) {
            return row.date.slice(5) + " " + row.time;
          }),
          dayahead: settlementPriceRows.map(function mapRow(row) {
            return row.dayaheadPrice;
          }),
          realtime: settlementPriceRows.map(function mapRow(row) {
            return row.realtimePrice;
          }),
        },
        tableRows: settlementPriceRows,
        source: "湖南现货统一结算口径",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -18),
      },
      "实时用户侧统一结算价格": {
        type: "dual-price",
        unit: "元/MWh",
        purpose: ["价格预测", "仿真回测"],
        pairTabs: ["日前用户侧统一结算价格", "实时用户侧统一结算价格"],
        chartData: {
          labels: settlementPriceRows.map(function mapRow(row) {
            return row.date.slice(5) + " " + row.time;
          }),
          dayahead: settlementPriceRows.map(function mapRow(row) {
            return row.dayaheadPrice;
          }),
          realtime: settlementPriceRows.map(function mapRow(row) {
            return row.realtimePrice;
          }),
        },
        tableRows: settlementPriceRows,
        source: "湖南现货统一结算口径",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -18),
      },
      "系统负荷预测（日）": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 23980,
        dayAmplitude: 980,
        peakAmplitude: 1560,
        dayShift: 5,
        peakShift: 14,
        dayIncrement: 86,
        modBase: 4,
        modOffset: 1.5,
        noise: 42,
        source: "湖南负荷预测披露口径",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -24),
      }),
      "实际负荷": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 23660,
        dayAmplitude: 1040,
        peakAmplitude: 1620,
        dayShift: 6,
        peakShift: 15,
        dayIncrement: 78,
        modBase: 5,
        modOffset: 2,
        noise: 48,
        source: "湖南实际负荷口径",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -6),
      }),
      "省间联络线输电曲线预测": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 4820,
        dayAmplitude: 280,
        peakAmplitude: 410,
        dayShift: 4,
        peakShift: 13,
        dayIncrement: 18,
        modBase: 4,
        modOffset: 1.5,
        noise: 16,
        source: "湖南省间联络线预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -22),
      }),
      "省间联络线输电情况": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 4680,
        dayAmplitude: 300,
        peakAmplitude: 436,
        dayShift: 5,
        peakShift: 14,
        dayIncrement: 14,
        modBase: 4,
        modOffset: 1.5,
        noise: 18,
        source: "湖南省间联络线实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -8),
      }),
      "发电总出力预测": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 26140,
        dayAmplitude: 860,
        peakAmplitude: 1320,
        dayShift: 6,
        peakShift: 15,
        dayIncrement: 72,
        modBase: 4,
        modOffset: 1.5,
        noise: 38,
        source: "湖南发电总出力预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -27),
      }),
      "非市场机组总出力预测": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 8420,
        dayAmplitude: 360,
        peakAmplitude: 520,
        dayShift: 4,
        peakShift: 12,
        dayIncrement: 26,
        modBase: 3,
        modOffset: 1,
        noise: 22,
        source: "湖南非市场机组预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -25),
      }),
      "新能源总出力预测（日）": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 5260,
        dayAmplitude: 740,
        peakAmplitude: 960,
        dayShift: 8,
        peakShift: 11,
        dayIncrement: 34,
        modBase: 4,
        modOffset: 1.5,
        noise: 26,
        source: "湖南新能源预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -21),
      }),
      "水电（含抽蓄）总出力预测（日）": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 3960,
        dayAmplitude: 280,
        peakAmplitude: 430,
        dayShift: 3,
        peakShift: 10,
        dayIncrement: 22,
        modBase: 5,
        modOffset: 2,
        noise: 18,
        source: "湖南水电及抽蓄预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -19),
      }),
      "非市场机组总出力": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 8260,
        dayAmplitude: 330,
        peakAmplitude: 480,
        dayShift: 4,
        peakShift: 12,
        dayIncrement: 21,
        modBase: 4,
        modOffset: 1.5,
        noise: 18,
        source: "湖南非市场机组实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -5),
      }),
      "新能源总出力": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 5120,
        dayAmplitude: 760,
        peakAmplitude: 1010,
        dayShift: 8,
        peakShift: 11,
        dayIncrement: 28,
        modBase: 4,
        modOffset: 1.5,
        noise: 24,
        source: "湖南新能源实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -4),
      }),
      "水电（含抽蓄）总出力": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 3820,
        dayAmplitude: 260,
        peakAmplitude: 398,
        dayShift: 3,
        peakShift: 10,
        dayIncrement: 18,
        modBase: 5,
        modOffset: 2,
        noise: 16,
        source: "湖南水电及抽蓄实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -3),
      }),
      "实时节点边际电价": buildTrendModule(availableDates, {
        unit: "元/MWh",
        purpose: ["价格预测", "仿真回测"],
        base: 346,
        dayAmplitude: 18,
        peakAmplitude: 32,
        dayShift: 6,
        peakShift: 15,
        dayIncrement: 2.8,
        modBase: 3,
        modOffset: 1,
        noise: 2.4,
        source: "湖南节点边际电价",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -2),
      }),
      "售电公司日用电信息": buildTrendModule(availableDates, {
        unit: "MWh",
        purpose: ["负荷预测", "仿真回测"],
        base: 892,
        dayAmplitude: 112,
        peakAmplitude: 188,
        dayShift: 6,
        peakShift: 13,
        dayIncrement: 12,
        modBase: 4,
        modOffset: 1.5,
        noise: 10,
        source: "湖南售电公司日电量汇总",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -9),
      }),
    },
  };
})(window);
