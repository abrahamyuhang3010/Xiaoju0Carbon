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

  function buildTrendRowsByStep(dates, options) {
    var stepMinutes = options.stepMinutes || 60;
    var labels = buildTimeLabels(stepMinutes, stepMinutes === 15 ? 96 : 24);

    return dates.reduce(function accumulateRows(result, date, dayIndex) {
      return result.concat(
        labels.map(function createRow(time, index) {
          var hour = stepMinutes === 15 ? index / 4 : index;
          var dayWave = Math.sin(((hour - options.dayShift) / 24) * Math.PI * 2) * options.dayAmplitude;
          var peakWave = Math.max(0, Math.sin(((hour - options.peakShift) / 24) * Math.PI * 2)) * options.peakAmplitude;
          var trendValue =
            options.base +
            dayIndex * options.dayIncrement +
            dayWave +
            peakWave +
            ((index % options.modBase) - options.modOffset) * options.noise;
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
    var rows = options && options.stepMinutes && options.stepMinutes !== 60
      ? buildTrendRowsByStep(dates, options)
      : buildTrendRows(dates, options);
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

  function buildWaveValues(stepMinutes, count, options) {
    var pattern = options.pattern || [0];
    return Array.from({ length: count }, function createValue(_, index) {
      var hour = stepMinutes === 15 ? index / 4 : index;
      var dayWave = Math.sin(((hour - (options.dayShift || 6)) / 24) * Math.PI * 2) * (options.dayAmplitude || 0);
      var peakWave = Math.max(0, Math.sin(((hour - (options.peakShift || 14)) / 24) * Math.PI * 2)) * (options.peakAmplitude || 0);
      var valleyWave = hour < (options.valleyEndHour || 0) ? options.valleyOffset || 0 : 0;
      var drift = (options.driftPerStep || 0) * index;
      var rawValue = options.base + dayWave + peakWave + valleyWave + drift + pattern[index % pattern.length];
      return options.integer ? Math.round(rawValue) : round(rawValue);
    });
  }

  function getSeriesStats(values) {
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
      max: round(Math.max.apply(null, numericValues)),
      min: round(Math.min.apply(null, numericValues)),
      average: round(
        numericValues.reduce(function accumulate(total, value) {
          return total + value;
        }, 0) / numericValues.length,
      ),
    };
  }

  function createSeries(key, name, labels, values, unit, seriesType) {
    var stats = getSeriesStats(values);
    return {
      key: key,
      name: name,
      type: seriesType || "line",
      labels: labels.slice(),
      values: values.slice(),
      unit: unit,
      max: stats.max,
      min: stats.min,
      average: stats.average,
      stats: stats,
    };
  }

  function buildSummaryCardsFromStats(stats, unit, extraCards) {
    return [
      { label: "最大值", value: stats.max, unit: unit },
      { label: "最小值", value: stats.min, unit: unit },
      { label: "均值", value: stats.average, unit: unit },
    ].concat(extraCards || []);
  }

  function createPageData(options) {
    var pageData = {
      title: options.title,
      description: options.description,
      updateTime: options.updateTime,
      dataSource: options.dataSource,
      filters: options.filters || {},
      summaryCards: options.summaryCards || [],
      metricTree: options.metricTree || [],
      chartType: options.chartType || "line",
      chartUnit: options.chartUnit || "",
      chartSeries: options.chartSeries || [],
      tableColumns: options.tableColumns || [],
      tableData: options.tableData || [],
      summaryTable: options.summaryTable || {
        columns: [],
        data: [],
      },
      fileList: options.fileList || [],
      emptyText: options.emptyText || "当前筛选条件下暂无湖南交易中心 mock 数据。",
    };

    Object.keys(options || {}).forEach(function eachKey(key) {
      if (!(key in pageData)) {
        pageData[key] = options[key];
      }
    });

    return pageData;
  }

  function buildMockFileList(centerCode, topic, publishDate, count) {
    return Array.from({ length: count }, function createFile(_, index) {
      return {
        id: centerCode + "-" + topic + "-" + (index + 1),
        fileName: centerCode.toUpperCase() + "_" + topic + "_" + publishDate.replace(/-/g, "") + "_" + pad(index + 1) + ".pdf",
        fileType: "PDF",
        publishTime: publishDate + " " + pad(9 + index) + ":" + pad((index * 13) % 60) + ":00",
        size: (1.2 + index * 0.3).toFixed(1) + "MB",
        downloadUrl: "#",
      };
    });
  }

  function buildPointRows(labels, fieldKey, values, extraBuilder) {
    return labels.map(function mapRow(label, index) {
      var row = {
        time: label,
      };

      row[fieldKey] = values[index];

      if (typeof extraBuilder === "function") {
        var extra = extraBuilder(label, index) || {};
        Object.keys(extra).forEach(function eachKey(key) {
          row[key] = extra[key];
        });
      }

      return row;
    });
  }

  var hours = buildTimeLabels(60, 24);
  var quarterHours = buildTimeLabels(15, 96);
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

  var standardDefaultDate = "2026-05-09";
  var standardDefaultMonth = "2026-05";
  var hunanRollingTradeProducts = ["全部", "月度双边", "集中竞价", "挂牌交易"];
  var hunanRollingContractPeriods = ["全部", "D+1", "周合约", "月合约"];
  var hunanRollingTradePeriods = ["00:00-04:00", "04:00-08:00", "08:00-16:00", "16:00-24:00"];
  var hunanRollingDetailedRows = [];
  buildDateRange("2026-05-03", 7).forEach(function eachHunanRollingDate(date, dayIndex) {
    hunanRollingTradeProducts.slice(1).forEach(function eachTradeProduct(product, productIndex) {
      hunanRollingContractPeriods.slice(1).forEach(function eachContractPeriod(contractPeriod, periodIndex) {
        var period = hunanRollingTradePeriods[(dayIndex + productIndex + periodIndex) % hunanRollingTradePeriods.length];
        hunanRollingDetailedRows.push({
          tradeDate: date,
          tradeProduct: product,
          contractPeriod: contractPeriod,
          tradePeriod: period,
          volume: Math.round(4680 + dayIndex * 320 + productIndex * 540 + periodIndex * 410),
          averagePrice: round(334.8 + dayIndex * 2.6 + productIndex * 5.8 + periodIndex * 3.4),
          updatedAt: buildUpdatedAt(dataUpdatedAt, -9),
        });
      });
    });
  });
  var hunanGenerationOutputValues = buildWaveValues(60, 24, {
    base: 22380,
    dayAmplitude: 780,
    peakAmplitude: 1360,
    dayShift: 5,
    peakShift: 14,
    valleyEndHour: 6,
    valleyOffset: -320,
    pattern: [-48, 16, 34, -22],
    integer: true,
  });
  var hunanGenerationOutputSeries = createSeries("generationOutput", "发电总出力", hours, hunanGenerationOutputValues, "MW");
  var hunanGenerationOutputPage = createPageData({
    title: "发电总出力",
    description: "湖南交易中心发电总出力 24 点趋势 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -11),
    dataSource: "湖南电力交易中心发电总出力 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "24h",
      primaryTab: "负荷信息",
      secondaryTab: "负荷信息",
    },
    summaryCards: buildSummaryCardsFromStats(hunanGenerationOutputSeries.stats, "MW", [{ label: "采样点", value: 24, unit: "个" }]),
    chartType: "line",
    chartUnit: "MW",
    chartSeries: [hunanGenerationOutputSeries],
    tableColumns: [
      { key: "time", title: "时刻" },
      { key: "generationOutput", title: "发电总出力（MW）" },
      { key: "dispatchState", title: "运行状态" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: buildPointRows(hours, "generationOutput", hunanGenerationOutputValues, function buildExtraRow(_, index) {
      return {
        dispatchState: index >= 8 && index <= 20 ? "高峰运行" : "基础运行",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -11),
      };
    }),
    fileList: buildMockFileList("hn", "generation-output", standardDefaultDate, 4),
    emptyText: "当前日期暂无湖南发电总出力 mock 数据。",
  });
  var hunanDayAheadNodePriceValues = buildWaveValues(15, 96, {
    base: 336.8,
    dayAmplitude: 18,
    peakAmplitude: 34,
    dayShift: 6,
    peakShift: 15,
    pattern: [-1.6, 1.4, -0.8, 2.2],
  });
  var hunanRealTimeNodePriceValues = hunanDayAheadNodePriceValues.map(function mapRealtimePrice(value, index) {
    return round(value + [-6.4, -2.6, 3.2, 6.8][index % 4]);
  });
  var hunanDayAheadNodePriceSeries = createSeries("dayAheadNodePrice", "日前节点边际电价", quarterHours, hunanDayAheadNodePriceValues, "元/MWh");
  var hunanRealTimeNodePriceSeries = createSeries("realTimeNodePrice", "实时节点边际电价", quarterHours, hunanRealTimeNodePriceValues, "元/MWh");
  var hunanDayAheadNodePricePage = createPageData({
    title: "日前节点边际电价",
    description: "湖南交易中心长沙枢纽节点 96 点日前边际电价 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -10),
    dataSource: "湖南电力交易中心日前节点电价 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "节点电价",
      secondaryTab: "日前节点边际电价",
    },
    summaryCards: buildSummaryCardsFromStats(hunanDayAheadNodePriceSeries.stats, "元/MWh", [{ label: "采样点", value: 96, unit: "个" }]),
    metricTree: [
      { id: "hn-dayahead-core", label: "长沙枢纽节点" },
      { id: "hn-dayahead-west", label: "湘西联络节点" },
      { id: "hn-dayahead-south", label: "湘南工业节点" },
    ],
    chartType: "line",
    chartUnit: "元/MWh",
    chartSeries: [hunanDayAheadNodePriceSeries],
    tableColumns: [
      { key: "time", title: "时刻" },
      { key: "nodeName", title: "节点" },
      { key: "price", title: "日前节点边际电价（元/MWh）" },
      { key: "marketType", title: "市场类型" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: buildPointRows(quarterHours, "price", hunanDayAheadNodePriceValues, function buildExtraRow() {
      return {
        nodeName: "长沙枢纽节点",
        marketType: "日前",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -10),
      };
    }),
    fileList: buildMockFileList("hn", "dayahead-node-price", standardDefaultDate, 3),
    emptyText: "当前日期暂无湖南日前节点边际电价 mock 数据。",
  });
  var hunanRealTimeNodePricePage = createPageData({
    title: "实时节点边际电价",
    description: "湖南交易中心长沙枢纽节点 96 点实时边际电价 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -9),
    dataSource: "湖南电力交易中心实时节点电价 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "节点电价",
      secondaryTab: "实时节点边际电价",
    },
    summaryCards: buildSummaryCardsFromStats(hunanRealTimeNodePriceSeries.stats, "元/MWh", [{ label: "采样点", value: 96, unit: "个" }]),
    metricTree: [
      { id: "hn-realtime-core", label: "长沙枢纽节点" },
      { id: "hn-realtime-west", label: "湘西联络节点" },
      { id: "hn-realtime-south", label: "湘南工业节点" },
    ],
    chartType: "line",
    chartUnit: "元/MWh",
    chartSeries: [hunanRealTimeNodePriceSeries],
    tableColumns: [
      { key: "time", title: "时刻" },
      { key: "nodeName", title: "节点" },
      { key: "price", title: "实时节点边际电价（元/MWh）" },
      { key: "marketType", title: "市场类型" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: buildPointRows(quarterHours, "price", hunanRealTimeNodePriceValues, function buildExtraRow() {
      return {
        nodeName: "长沙枢纽节点",
        marketType: "实时",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -9),
      };
    }),
    fileList: buildMockFileList("hn", "realtime-node-price", standardDefaultDate, 3),
    emptyText: "当前日期暂无湖南实时节点边际电价 mock 数据。",
  });
  var hunanDeclarationVolumeValues = buildWaveValues(60, 24, {
    base: 1280,
    dayAmplitude: 180,
    peakAmplitude: 320,
    dayShift: 6,
    peakShift: 14,
    valleyEndHour: 6,
    valleyOffset: -120,
    pattern: [-16, 12, 24, -10],
    integer: true,
  });
  var hunanDeclarationPriceValues = buildWaveValues(60, 24, {
    base: 348,
    dayAmplitude: 12,
    peakAmplitude: 22,
    dayShift: 6,
    peakShift: 14,
    pattern: [-1.2, 0.6, 1.4, -0.4],
  });
  var hunanDeclarationVolumeSeries = createSeries("declareVolume", "申报电量", hours, hunanDeclarationVolumeValues, "MWh", "bar");
  var hunanDeclarationPriceSeries = createSeries("declarePrice", "申报均价", hours, hunanDeclarationPriceValues, "元/MWh");
  var hunanDayAheadDeclarationRows = [
    { declarationDate: standardDefaultDate, declarationTime: "08:00", unitCode: "HN-DA-001", unitName: "湘北负荷单元 A", segment: "早峰", declareVolume: 1460, declarePrice: 352.4, status: "已提交", updatedAt: buildUpdatedAt(dataUpdatedAt, -8) },
    { declarationDate: standardDefaultDate, declarationTime: "09:00", unitCode: "HN-DA-002", unitName: "湘中负荷单元 B", segment: "早峰", declareVolume: 1518, declarePrice: 357.2, status: "已提交", updatedAt: buildUpdatedAt(dataUpdatedAt, -8) },
    { declarationDate: standardDefaultDate, declarationTime: "10:00", unitCode: "HN-DA-003", unitName: "湘南工商单元 C", segment: "平段", declareVolume: 1396, declarePrice: 344.8, status: "已回传", updatedAt: buildUpdatedAt(dataUpdatedAt, -8) },
    { declarationDate: standardDefaultDate, declarationTime: "11:00", unitCode: "HN-DA-004", unitName: "长沙枢纽单元 D", segment: "平段", declareVolume: 1422, declarePrice: 347.1, status: "已提交", updatedAt: buildUpdatedAt(dataUpdatedAt, -8) },
    { declarationDate: standardDefaultDate, declarationTime: "13:00", unitCode: "HN-DA-005", unitName: "岳阳港区单元 E", segment: "午峰", declareVolume: 1584, declarePrice: 361.5, status: "已回传", updatedAt: buildUpdatedAt(dataUpdatedAt, -8) },
    { declarationDate: standardDefaultDate, declarationTime: "15:00", unitCode: "HN-DA-006", unitName: "株洲工业单元 F", segment: "午峰", declareVolume: 1668, declarePrice: 368.2, status: "已提交", updatedAt: buildUpdatedAt(dataUpdatedAt, -8) },
    { declarationDate: standardDefaultDate, declarationTime: "19:00", unitCode: "HN-DA-007", unitName: "常德商服单元 G", segment: "晚峰", declareVolume: 1746, declarePrice: 372.9, status: "待校验", updatedAt: buildUpdatedAt(dataUpdatedAt, -8) },
    { declarationDate: standardDefaultDate, declarationTime: "21:00", unitCode: "HN-DA-008", unitName: "湘潭园区单元 H", segment: "晚峰", declareVolume: 1682, declarePrice: 369.6, status: "已提交", updatedAt: buildUpdatedAt(dataUpdatedAt, -8) },
  ];
  var hunanDayAheadDeclarationPage = createPageData({
    title: "日前申报",
    description: "湖南交易中心日前申报量价 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -8),
    dataSource: "湖南电力交易中心日前申报 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "24h",
      primaryTab: "日前申报",
      secondaryTab: "",
    },
    summaryCards: [
      { label: "申报总电量", value: sum(hunanDeclarationVolumeValues), unit: "MWh" },
      { label: "最高申报价", value: hunanDeclarationPriceSeries.max, unit: "元/MWh" },
      { label: "最低申报价", value: hunanDeclarationPriceSeries.min, unit: "元/MWh" },
      { label: "申报单元数", value: hunanDayAheadDeclarationRows.length, unit: "个" },
    ],
    chartType: "mixed",
    chartUnit: "MWh / 元/MWh",
    chartSeries: [hunanDeclarationVolumeSeries, hunanDeclarationPriceSeries],
    tableColumns: [
      { key: "declarationDate", title: "申报日期" },
      { key: "declarationTime", title: "申报时段" },
      { key: "unitCode", title: "交易单元编码" },
      { key: "unitName", title: "交易单元名称" },
      { key: "segment", title: "时段类型" },
      { key: "declareVolume", title: "申报电量（MWh）" },
      { key: "declarePrice", title: "申报价格（元/MWh）" },
      { key: "status", title: "申报状态" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: hunanDayAheadDeclarationRows,
    fileList: buildMockFileList("hn", "dayahead-declaration", standardDefaultDate, 4),
    emptyText: "当前日期暂无湖南日前申报 mock 数据。",
  });
  var hunanLongTermContractValues = buildWaveValues(60, 24, {
    base: 1820,
    dayAmplitude: 220,
    peakAmplitude: 360,
    dayShift: 7,
    peakShift: 13,
    valleyEndHour: 6,
    valleyOffset: -160,
    pattern: [-22, 14, 26, -12],
    integer: true,
  });
  var hunanLongTermExecutedValues = hunanLongTermContractValues.map(function mapExecuted(value, index) {
    return Math.round(value + [-84, -36, 28, 66][index % 4]);
  });
  var hunanLongTermContractSeries = createSeries("contractCurve", "中长期合同曲线", hours, hunanLongTermContractValues, "MWh");
  var hunanLongTermExecutedSeries = createSeries("executedVolume", "执行电量", hours, hunanLongTermExecutedValues, "MWh");
  var hunanLongTermTradeRows = [
    { tradeId: "HN-LT-2501", tradeType: "月度双边", deliveryMonth: "2026-05", period: "峰段", buyer: "长沙高铁南站补能中心", seller: "湘能售电一部", volume: 12400, averagePrice: 346.8, contractStatus: "已成交" },
    { tradeId: "HN-LT-2502", tradeType: "挂牌交易", deliveryMonth: "2026-05", period: "平段", buyer: "株洲公交充电站群", seller: "湘能售电二部", volume: 10360, averagePrice: 339.2, contractStatus: "已成交" },
    { tradeId: "HN-LT-2503", tradeType: "月度双边", deliveryMonth: "2026-05", period: "谷段", buyer: "湘潭园区综合能源站", seller: "岳州售电", volume: 9680, averagePrice: 332.6, contractStatus: "已成交" },
    { tradeId: "HN-LT-2504", tradeType: "集中竞价", deliveryMonth: "2026-05", period: "峰段", buyer: "岳阳物流港充换电站", seller: "岳州售电", volume: 11840, averagePrice: 351.7, contractStatus: "部分执行" },
    { tradeId: "HN-LT-2505", tradeType: "月度双边", deliveryMonth: "2026-06", period: "平段", buyer: "常德公共交通能源站", seller: "湘西联合售电", volume: 11020, averagePrice: 341.1, contractStatus: "已成交" },
    { tradeId: "HN-LT-2506", tradeType: "挂牌交易", deliveryMonth: "2026-06", period: "谷段", buyer: "郴州换电网络", seller: "湘西联合售电", volume: 9240, averagePrice: 329.8, contractStatus: "已成交" },
  ];
  var hunanLongTermTradeResultPage = createPageData({
    title: "中长期交易结果",
    description: "湖南交易中心中长期交易成交结果与合同曲线 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -7),
    dataSource: "湖南电力交易中心中长期交易结果 mock",
    filters: {
      month: standardDefaultMonth,
      granularity: "24h",
      primaryTab: "中长期交易结果",
      secondaryTab: "",
    },
    summaryCards: [
      { label: "成交笔数", value: hunanLongTermTradeRows.length, unit: "笔" },
      { label: "成交总电量", value: hunanLongTermTradeRows.reduce(function accumulate(total, row) { return total + row.volume; }, 0), unit: "MWh" },
      { label: "合同曲线均值", value: hunanLongTermContractSeries.average, unit: "MWh" },
      { label: "执行曲线均值", value: hunanLongTermExecutedSeries.average, unit: "MWh" },
    ],
    chartType: "line",
    chartUnit: "MWh",
    chartSeries: [hunanLongTermContractSeries, hunanLongTermExecutedSeries],
    tableColumns: [
      { key: "tradeId", title: "成交编号" },
      { key: "tradeType", title: "交易类型" },
      { key: "deliveryMonth", title: "交割月份" },
      { key: "period", title: "时段" },
      { key: "buyer", title: "购电侧" },
      { key: "seller", title: "售电侧" },
      { key: "volume", title: "成交电量（MWh）" },
      { key: "averagePrice", title: "成交均价（元/MWh）" },
      { key: "contractStatus", title: "合同状态" },
    ],
    tableData: hunanLongTermTradeRows,
    fileList: buildMockFileList("hn", "medium-long-trade-result", standardDefaultDate, 4),
    emptyText: "当前月份暂无湖南中长期交易结果 mock 数据。",
  });
  var hunanUnitStatusRows = [
    { unitCode: "HN-GEN-001", unitName: "长沙燃机 1 号机", unitType: "燃机", capacity: 660, availableCapacity: 648, status: "运行", startTime: "2026-05-09 00:00", endTime: "-", updatedAt: buildUpdatedAt(dataUpdatedAt, -6) },
    { unitCode: "HN-GEN-002", unitName: "株洲煤机 2 号机", unitType: "煤电", capacity: 1000, availableCapacity: 1000, status: "运行", startTime: "2026-05-09 00:00", endTime: "-", updatedAt: buildUpdatedAt(dataUpdatedAt, -6) },
    { unitCode: "HN-GEN-003", unitName: "湘潭水电 3 号机", unitType: "水电", capacity: 420, availableCapacity: 406, status: "运行", startTime: "2026-05-09 00:00", endTime: "-", updatedAt: buildUpdatedAt(dataUpdatedAt, -6) },
    { unitCode: "HN-GEN-004", unitName: "衡阳风场集群", unitType: "风电", capacity: 520, availableCapacity: 462, status: "受限运行", startTime: "2026-05-09 06:00", endTime: "2026-05-09 22:00", updatedAt: buildUpdatedAt(dataUpdatedAt, -6) },
    { unitCode: "HN-GEN-005", unitName: "岳阳光伏 5 号机", unitType: "光伏", capacity: 280, availableCapacity: 246, status: "运行", startTime: "2026-05-09 06:30", endTime: "2026-05-09 18:30", updatedAt: buildUpdatedAt(dataUpdatedAt, -6) },
    { unitCode: "HN-GEN-006", unitName: "郴州抽蓄 1 号机", unitType: "抽蓄", capacity: 300, availableCapacity: 0, status: "检修", startTime: "2026-05-09 00:00", endTime: "2026-05-09 23:59", updatedAt: buildUpdatedAt(dataUpdatedAt, -6) },
    { unitCode: "HN-GEN-007", unitName: "常德煤机 7 号机", unitType: "煤电", capacity: 600, availableCapacity: 582, status: "运行", startTime: "2026-05-09 00:00", endTime: "-", updatedAt: buildUpdatedAt(dataUpdatedAt, -6) },
    { unitCode: "HN-GEN-008", unitName: "娄底燃机 2 号机", unitType: "燃机", capacity: 500, availableCapacity: 488, status: "备用", startTime: "2026-05-09 12:00", endTime: "-", updatedAt: buildUpdatedAt(dataUpdatedAt, -6) },
  ];
  var hunanUnitStatusSeries = createSeries(
    "availableCapacity",
    "机组可用容量",
    hunanUnitStatusRows.map(function mapRow(row) {
      return row.unitName;
    }),
    hunanUnitStatusRows.map(function mapRow(row) {
      return row.availableCapacity;
    }),
    "MW",
    "bar",
  );
  var hunanUnitStatusPage = createPageData({
    title: "机组状态",
    description: "湖南交易中心重点机组状态与可用容量 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -6),
    dataSource: "湖南电力交易中心机组状态 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "snapshot",
      primaryTab: "负荷信息",
      secondaryTab: "负荷详情",
    },
    summaryCards: [
      { label: "运行机组", value: hunanUnitStatusRows.filter(function filterRow(row) { return row.status === "运行"; }).length, unit: "台" },
      { label: "检修机组", value: hunanUnitStatusRows.filter(function filterRow(row) { return row.status === "检修"; }).length, unit: "台" },
      { label: "可用容量峰值", value: hunanUnitStatusSeries.max, unit: "MW" },
      { label: "可用容量均值", value: hunanUnitStatusSeries.average, unit: "MW" },
    ],
    chartType: "bar",
    chartUnit: "MW",
    chartSeries: [hunanUnitStatusSeries],
    tableColumns: [
      { key: "unitCode", title: "机组编码" },
      { key: "unitName", title: "机组名称" },
      { key: "unitType", title: "机组类型" },
      { key: "capacity", title: "装机容量（MW）" },
      { key: "availableCapacity", title: "可用容量（MW）" },
      { key: "status", title: "机组状态" },
      { key: "startTime", title: "开始时间" },
      { key: "endTime", title: "结束时间" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: hunanUnitStatusRows,
    fileList: buildMockFileList("hn", "unit-status", standardDefaultDate, 3),
    emptyText: "当前日期暂无湖南机组状态 mock 数据。",
  });
  function normalizeDistributionWeights(weights) {
    var total = (weights || []).reduce(function accumulate(result, value) {
      return result + Number(value || 0);
    }, 0);

    if (!total) {
      return (weights || []).map(function mapWeight() {
        return 1 / Math.max((weights || []).length, 1);
      });
    }

    return (weights || []).map(function mapWeight(value) {
      return Number(value || 0) / total;
    });
  }

  function distributeFixedTotal(total, weights, digits) {
    var normalizedWeights = normalizeDistributionWeights(weights);
    var scale = Math.pow(10, digits || 0);
    var scaledTotal = Math.round(Number(total || 0) * scale);
    var baseValues = [];
    var fractions = [];
    var distributed = 0;
    var index;

    for (index = 0; index < normalizedWeights.length; index += 1) {
      var rawValue = scaledTotal * normalizedWeights[index];
      var floorValue = Math.floor(rawValue);
      baseValues.push(floorValue);
      fractions.push({
        index: index,
        fraction: rawValue - floorValue,
      });
      distributed += floorValue;
    }

    fractions.sort(function sortFractions(a, b) {
      if (a.fraction === b.fraction) {
        return a.index - b.index;
      }
      return b.fraction - a.fraction;
    });

    for (index = 0; index < scaledTotal - distributed; index += 1) {
      baseValues[fractions[index % fractions.length].index] += 1;
    }

    return baseValues.map(function mapValue(value) {
      return Number((value / scale).toFixed(digits || 0));
    });
  }

  var hunanDailySettlementBaseWeights = [
    0.72, 0.68, 0.66, 0.63, 0.61, 0.64, 0.78, 0.92, 1.04, 1.12, 1.18, 1.2,
    1.16, 1.1, 1.04, 1.01, 1.06, 1.16, 1.28, 1.34, 1.3, 1.16, 0.98, 0.84,
  ];
  var hunanDailySettlementContractWeights = hunanDailySettlementBaseWeights.map(function mapWeight(weight, index) {
    return weight * (index >= 7 && index <= 16 ? 1.04 : 0.96);
  });
  var hunanDailySettlementDayAheadWeights = hunanDailySettlementBaseWeights.map(function mapWeight(weight, index) {
    return weight * (index >= 8 && index <= 17 ? 1.06 : 0.94);
  });
  var hunanDailySettlementRealtimeWeights = hunanDailySettlementBaseWeights.map(function mapWeight(weight, index) {
    return weight * (index >= 17 && index <= 22 ? 1.22 : 0.72);
  });
  var hunanDailySettlementDeviationWeights = hunanDailySettlementBaseWeights.map(function mapWeight(weight, index) {
    return weight * (index <= 5 || index >= 20 ? 1.18 : 0.74);
  });
  var hunanDailySettlementTotals = {
    actualUsage: 321.163,
    mediumLongTermVolume: 254.611,
    mediumLongTermFee: 87387.86,
    dayAheadVolume: 65.471,
    dayAheadFee: -7329.32,
    realTimeVolume: 1.081,
    realTimeFee: -28.04,
    deviationVolume: 0.706,
    deviationFee: 95.40,
    feeSubtotal: 80125.90,
  };
  var hunanDailySettlementActualUsageRows = distributeFixedTotal(hunanDailySettlementTotals.actualUsage, hunanDailySettlementBaseWeights, 3);
  var hunanDailySettlementContractVolumeRows = distributeFixedTotal(hunanDailySettlementTotals.mediumLongTermVolume, hunanDailySettlementContractWeights, 3);
  var hunanDailySettlementContractFeeRows = distributeFixedTotal(hunanDailySettlementTotals.mediumLongTermFee, hunanDailySettlementContractWeights, 2);
  var hunanDailySettlementDayAheadVolumeRows = distributeFixedTotal(hunanDailySettlementTotals.dayAheadVolume, hunanDailySettlementDayAheadWeights, 3);
  var hunanDailySettlementDayAheadFeeRows = distributeFixedTotal(hunanDailySettlementTotals.dayAheadFee, hunanDailySettlementDayAheadWeights, 2);
  var hunanDailySettlementRealtimeVolumeRows = distributeFixedTotal(hunanDailySettlementTotals.realTimeVolume, hunanDailySettlementRealtimeWeights, 3);
  var hunanDailySettlementRealtimeFeeRows = distributeFixedTotal(hunanDailySettlementTotals.realTimeFee, hunanDailySettlementRealtimeWeights, 2);
  var hunanDailySettlementDeviationVolumeRows = distributeFixedTotal(hunanDailySettlementTotals.deviationVolume, hunanDailySettlementDeviationWeights, 3);
  var hunanDailySettlementDeviationFeeRows = distributeFixedTotal(hunanDailySettlementTotals.deviationFee, hunanDailySettlementDeviationWeights, 2);
  var hunanDailySettlementPeriods = Array.from({ length: 24 }, function createPeriod(_, index) {
    return pad(index + 1) + ":00";
  });
  var hunanDailySettlementRows = hunanDailySettlementPeriods.map(function mapSettlementRow(period, index) {
    var mediumLongTermVolume = hunanDailySettlementContractVolumeRows[index];
    var dayAheadVolume = hunanDailySettlementDayAheadVolumeRows[index];
    var realTimeVolume = hunanDailySettlementRealtimeVolumeRows[index];
    var deviationVolume = hunanDailySettlementDeviationVolumeRows[index];
    var mediumLongTermFee = hunanDailySettlementContractFeeRows[index];
    var dayAheadFee = hunanDailySettlementDayAheadFeeRows[index];
    var realTimeFee = hunanDailySettlementRealtimeFeeRows[index];
    var deviationFee = hunanDailySettlementDeviationFeeRows[index];

    return {
      settlementDate: "2026-04-01",
      sellerName: "北京小桔新能源汽车科技有限公司",
      period: period,
      actualUsage: hunanDailySettlementActualUsageRows[index],
      mediumLongTermVolume: mediumLongTermVolume,
      mediumLongTermPrice: mediumLongTermVolume ? Number((mediumLongTermFee / mediumLongTermVolume).toFixed(2)) : 0,
      mediumLongTermFee: mediumLongTermFee,
      dayAheadVolume: dayAheadVolume,
      dayAheadPrice: dayAheadVolume ? Number((dayAheadFee / dayAheadVolume).toFixed(2)) : 0,
      dayAheadFee: dayAheadFee,
      realTimeVolume: realTimeVolume,
      realTimePrice: realTimeVolume ? Number((realTimeFee / realTimeVolume).toFixed(2)) : 0,
      realTimeFee: realTimeFee,
      deviationVolume: deviationVolume,
      deviationPrice: deviationVolume ? Number((deviationFee / deviationVolume).toFixed(3)) : 0,
      deviationFee: deviationFee,
      feeSubtotal: Number((mediumLongTermFee + dayAheadFee + realTimeFee + deviationFee).toFixed(2)),
      remark: "-",
    };
  });
  hunanDailySettlementRows.push({
    settlementDate: "2026-04-01",
    sellerName: "北京小桔新能源汽车科技有限公司",
    period: "合计",
    actualUsage: 321.163,
    mediumLongTermVolume: 254.611,
    mediumLongTermPrice: 343.22,
    mediumLongTermFee: 87387.86,
    dayAheadVolume: 65.471,
    dayAheadPrice: -111.95,
    dayAheadFee: -7329.32,
    realTimeVolume: 1.081,
    realTimePrice: -25.94,
    realTimeFee: -28.04,
    deviationVolume: 0.706,
    deviationPrice: 135.127,
    deviationFee: 95.40,
    feeSubtotal: 80125.90,
    remark: "合计",
  });
  var hunanDailySettlementPage = createPageData({
    title: "日清算",
    description: "湖南交易中心日清算按清分单据结构展示的 24 时段 mock 数据。",
    updateTime: "2026-05-09 10:46:12",
    dataSource: "湖南交易中心日清算PDF解析",
    filters: {
      dateRange: {
        start: "2026-05-01",
        end: "2026-05-08",
      },
      primaryTab: "日清算",
      secondaryTab: "",
      settlementTypeOptions: ["全部", "中长期", "日前", "实时", "日前申报偏差"],
      dataTypeOptions: ["全部", "清分单据", "日清算明细", "PDF 文件"],
    },
    summaryCards: [],
    chartType: "",
    chartUnit: "",
    chartSeries: [],
    tableColumns: [
      { key: "settlementDate", title: "结算日期" },
      { key: "sellerName", title: "售电公司名称" },
      { key: "period", title: "时段" },
      { key: "actualUsage", title: "实际用电量（MWh）" },
      { key: "mediumLongTermVolume", title: "中长期合同电量（MWh）" },
      { key: "mediumLongTermPrice", title: "中长期结算电价（元/MWh）" },
      { key: "mediumLongTermFee", title: "中长期电费（元）" },
      { key: "dayAheadVolume", title: "日前电量（MWh）" },
      { key: "dayAheadPrice", title: "日前结算电价（元/MWh）" },
      { key: "dayAheadFee", title: "日前电费（元）" },
      { key: "realTimeVolume", title: "实时电量（MWh）" },
      { key: "realTimePrice", title: "实时结算电价（元/MWh）" },
      { key: "realTimeFee", title: "实时电费（元）" },
      { key: "deviationVolume", title: "日前申报偏差电量（MWh）" },
      { key: "deviationPrice", title: "日前申报偏差电价（元/MWh）" },
      { key: "deviationFee", title: "日前申报偏差电费（元）" },
      { key: "feeSubtotal", title: "电费小计（元）" },
      { key: "remark", title: "备注" },
    ],
    tableData: hunanDailySettlementRows,
    fileList: [
      {
        id: "hn-daily-pdf-001",
        fileName: "北京小桔新能源汽车科技有限公司01售电公司日清分结算单.pdf",
        fileType: "日清算 PDF",
        publishTime: "2026-05-07 17:46:20",
        parseStatus: "已解析",
        downloadUrl: "#",
      },
    ],
    emptyText: "当前筛选条件下暂无湖南日清算明细 mock 数据。",
    sellerName: "北京小桔新能源汽车科技有限公司",
    documentTitle: "北京小桔新能源汽车科技有限公司 2026 年 4 月 1 日清分单据",
  });
  var hunanMonthlySettlementSummary = {
    settlementMonth: "2026-04",
    settlementBasisNo: "HNPX-2026-04-SD000",
    settlementPower: 9902.421,
    contractPower: 5824.700,
    deviationPower: 4077.721,
    settlementFee: -119568.74,
    dataSource: "湖南交易中心月结算PDF解析",
    updateTime: "2026-05-09 10:46:12",
  };
  var hunanMonthlySettlementDetails = [
    {
      subjectCode: "01010202",
      subjectName: "批发市场购电费用",
      tradePlanPower: 0.000,
      settlementPowerOrCapacity: 0.000,
      settlementPriceOrAverage: 0.000,
      settlementFee: 0.00,
      remark: "批发市场结算科目",
    },
    {
      subjectCode: "01010203",
      subjectName: "中长期合约电能量费用",
      tradePlanPower: 5824.700,
      settlementPowerOrCapacity: 5824.700,
      settlementPriceOrAverage: 369.529,
      settlementFee: 2152397.10,
      remark: "中长期交易结算",
    },
    {
      subjectCode: "01020201",
      subjectName: "日前市场电能量费用",
      tradePlanPower: 4775.315,
      settlementPowerOrCapacity: 4775.315,
      settlementPriceOrAverage: 43.595,
      settlementFee: 208181.59,
      remark: "日前市场结算",
    },
    {
      subjectCode: "0102020301",
      subjectName: "实时市场电能量费用",
      tradePlanPower: -699.663,
      settlementPowerOrCapacity: -699.663,
      settlementPriceOrAverage: 72.816,
      settlementFee: -50946.44,
      remark: "实时市场结算",
    },
    {
      subjectCode: "01020205",
      subjectName: "偏差考核费用",
      tradePlanPower: 115.880,
      settlementPowerOrCapacity: 115.880,
      settlementPriceOrAverage: 50.188,
      settlementFee: 5815.76,
      remark: "偏差费用",
    },
    {
      subjectCode: "01020204",
      subjectName: "辅助服务费用",
      tradePlanPower: 2.069,
      settlementPowerOrCapacity: 2.069,
      settlementPriceOrAverage: 75.099,
      settlementFee: 155.38,
      remark: "辅助服务结算",
    },
    {
      subjectCode: "0202030104",
      subjectName: "代理服务收益",
      tradePlanPower: 0.000,
      settlementPowerOrCapacity: 0.000,
      settlementPriceOrAverage: 0.000,
      settlementFee: 377052.25,
      remark: "售电服务收益汇总",
    },
    {
      subjectCode: "合计",
      subjectName: "售电公司月结算合计",
      tradePlanPower: 9902.421,
      settlementPowerOrCapacity: 9902.421,
      settlementPriceOrAverage: 271.919,
      settlementFee: 2692655.64,
      remark: "合计",
    },
  ];
  var hunanMonthlySettlementFiles = [
    {
      id: "hn-monthly-pdf-001",
      fileName: "北京小桔新能源汽车科技有限公司售电公司-核对版结算单.pdf",
      fileType: "月结算 PDF",
      publishTime: "2026-05-08 11:37:30",
      parseStatus: "已解析",
      downloadUrl: "#",
    },
  ];
  var hunanMonthlySellerPage = createPageData({
    title: "月结算-售电公司",
    description: "湖南交易中心售电公司月结算按月结算 PDF 结构展示 mock 数据。",
    updateTime: hunanMonthlySettlementSummary.updateTime,
    dataSource: hunanMonthlySettlementSummary.dataSource,
    filters: {
      month: standardDefaultMonth,
      primaryTab: "月结算",
      secondaryTab: "售电公司",
    },
    summaryCards: [
      { label: "结算电量", value: hunanMonthlySettlementSummary.settlementPower, unit: "MWh" },
      { label: "合同电量", value: hunanMonthlySettlementSummary.contractPower, unit: "MWh" },
      { label: "偏差电量", value: hunanMonthlySettlementSummary.deviationPower, unit: "MWh" },
      { label: "结算电费", value: hunanMonthlySettlementSummary.settlementFee, unit: "元" },
    ],
    chartType: "",
    chartUnit: "",
    chartSeries: [],
    tableColumns: [
      { key: "subjectCode", title: "结算科目编码" },
      { key: "subjectName", title: "结算科目" },
      { key: "tradePlanPower", title: "交易计划电量" },
      { key: "settlementPowerOrCapacity", title: "结算电量 / 容量" },
      { key: "settlementPriceOrAverage", title: "结算电价 / 均价" },
      { key: "settlementFee", title: "结算电费" },
      { key: "remark", title: "备注" },
    ],
    tableData: hunanMonthlySettlementDetails,
    fileList: hunanMonthlySettlementFiles,
    settlementSummary: hunanMonthlySettlementSummary,
    statementTitle: "湖南电力交易中心有限公司 2026年4月交易结算单",
    emptyText: "当前月份暂无湖南售电公司月结算 mock 数据。",
  });
  var hunanMonthlyConsumerRows = [
    { month: "2026-05", companyType: "用电企业", companyCode: "HNUSER001", companyName: "长沙高铁南站补能中心", accountNo: "HN-U-001", settlementEnergy: 42860, totalFee: 1986000, serviceFee: 46800, deviationFee: 18200, invoiceStatus: "已出账" },
    { month: "2026-05", companyType: "用电企业", companyCode: "HNUSER002", companyName: "株洲公交充电站群", accountNo: "HN-U-002", settlementEnergy: 41320, totalFee: 1918000, serviceFee: 45200, deviationFee: 17600, invoiceStatus: "已出账" },
    { month: "2026-05", companyType: "用电企业", companyCode: "HNUSER003", companyName: "湘潭园区综合能源站", accountNo: "HN-U-003", settlementEnergy: 39680, totalFee: 1844000, serviceFee: 43800, deviationFee: 16900, invoiceStatus: "结算中" },
    { month: "2026-05", companyType: "用电企业", companyCode: "HNUSER004", companyName: "岳阳物流港充换电站", accountNo: "HN-U-004", settlementEnergy: 37240, totalFee: 1736000, serviceFee: 41000, deviationFee: 16200, invoiceStatus: "待确认" },
    { month: "2026-05", companyType: "用电企业", companyCode: "HNUSER005", companyName: "常德公共交通能源站", accountNo: "HN-U-005", settlementEnergy: 35860, totalFee: 1681000, serviceFee: 39800, deviationFee: 15400, invoiceStatus: "待确认" },
    { month: "2026-05", companyType: "用电企业", companyCode: "HNUSER006", companyName: "郴州换电网络", accountNo: "HN-U-006", settlementEnergy: 34120, totalFee: 1592000, serviceFee: 38200, deviationFee: 14900, invoiceStatus: "已出账" },
  ];
  var hunanMonthlyConsumerSeries = createSeries(
    "monthlyConsumerFee",
    "企业月结算总电费",
    hunanMonthlyConsumerRows.map(function mapRow(row) {
      return row.companyName;
    }),
    hunanMonthlyConsumerRows.map(function mapRow(row) {
      return row.totalFee;
    }),
    "元",
    "bar",
  );
  var hunanMonthlyConsumerPage = createPageData({
    title: "月结算-用电企业",
    description: "湖南交易中心用电企业月结算预留 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -4),
    dataSource: "湖南电力交易中心月结算（用电企业）mock",
    filters: {
      month: standardDefaultMonth,
      primaryTab: "月结算",
      secondaryTab: "用电企业",
    },
    summaryCards: [
      { label: "用电企业数", value: hunanMonthlyConsumerRows.length, unit: "家" },
      { label: "月结算总电量", value: hunanMonthlyConsumerRows.reduce(function accumulate(total, row) { return total + row.settlementEnergy; }, 0), unit: "MWh" },
      { label: "月结算总电费", value: hunanMonthlyConsumerRows.reduce(function accumulate(total, row) { return total + row.totalFee; }, 0), unit: "元" },
      { label: "服务费合计", value: hunanMonthlyConsumerRows.reduce(function accumulate(total, row) { return total + row.serviceFee; }, 0), unit: "元" },
    ],
    chartType: "bar",
    chartUnit: "元",
    chartSeries: [hunanMonthlyConsumerSeries],
    tableColumns: [
      { key: "month", title: "结算月份" },
      { key: "companyCode", title: "用电企业编码" },
      { key: "companyName", title: "用电企业名称" },
      { key: "accountNo", title: "结算户号" },
      { key: "settlementEnergy", title: "结算电量（MWh）" },
      { key: "totalFee", title: "结算电费（元）" },
      { key: "serviceFee", title: "服务费（元）" },
      { key: "deviationFee", title: "偏差费用（元）" },
      { key: "invoiceStatus", title: "出账状态" },
    ],
    tableData: hunanMonthlyConsumerRows,
    fileList: buildMockFileList("hn", "monthly-settlement-consumer", standardDefaultDate, 3),
    emptyText: "当前月份暂无湖南用电企业月结算 mock 数据。",
  });
  var hunanSettlementOverviewCategories = ["电能量电费", "偏差考核费用", "不平衡电费", "辅助服务分摊", "输配及附加"];
  var hunanSettlementOverviewValues = [342800, 28400, 16200, 21800, 46800];
  var hunanSettlementOverviewSeries = createSeries(
    "settlementOverview",
    "结算分类构成",
    hunanSettlementOverviewCategories,
    hunanSettlementOverviewValues,
    "元",
    "bar",
  );
  var hunanSettlementOverviewPage = createPageData({
    title: "结算总体情况及分类构成情况（日）",
    description: "湖南交易中心日度结算总体情况与分类构成 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -4),
    dataSource: "湖南电力交易中心结算总体情况 mock",
    filters: {
      date: standardDefaultDate,
      primaryTab: "交易结果",
      secondaryTab: "结算总体情况",
    },
    summaryCards: [
      { label: "日结算总金额", value: hunanSettlementOverviewValues.reduce(function accumulate(total, value) { return total + value; }, 0), unit: "元" },
      { label: "最大分类金额", value: hunanSettlementOverviewSeries.max, unit: "元" },
      { label: "最小分类金额", value: hunanSettlementOverviewSeries.min, unit: "元" },
      { label: "分类项数", value: hunanSettlementOverviewCategories.length, unit: "项" },
    ],
    chartType: "bar",
    chartUnit: "元",
    chartSeries: [hunanSettlementOverviewSeries],
    tableColumns: [
      { key: "category", title: "分类" },
      { key: "amount", title: "金额（元）" },
      { key: "share", title: "占比" },
      { key: "remark", title: "说明" },
    ],
    tableData: hunanSettlementOverviewCategories.map(function mapCategory(category, index) {
      var amount = hunanSettlementOverviewValues[index];
      var totalAmount = hunanSettlementOverviewValues.reduce(function accumulate(total, value) {
        return total + value;
      }, 0);
      return {
        category: category,
        amount: amount,
        share: round((amount / totalAmount) * 100) + "%",
        remark: index === 0 ? "主体电费" : "分类分摊",
      };
    }),
    summaryTable: {
      columns: [
        { key: "category", title: "分类" },
        { key: "amount", title: "金额（元）" },
      ],
      data: hunanSettlementOverviewCategories.map(function mapCategory(category, index) {
        return {
          category: category,
          amount: hunanSettlementOverviewValues[index],
        };
      }),
    },
    fileList: buildMockFileList("hn", "daily-settlement-overview", standardDefaultDate, 3),
    emptyText: "当前日期暂无湖南结算总体情况 mock 数据。",
  });
  var hunanPositiveReserveValues = buildWaveValues(15, 96, {
    base: 2420,
    dayAmplitude: 160,
    peakAmplitude: 280,
    dayShift: 6,
    peakShift: 16,
    pattern: [-24, 16, -10, 20],
  });
  var hunanNegativeReserveValues = buildWaveValues(15, 96, {
    base: 1680,
    dayAmplitude: 110,
    peakAmplitude: 160,
    dayShift: 5,
    peakShift: 13,
    pattern: [-18, 12, -8, 15],
  });
  var hunanPositiveReserveSeries = createSeries("positiveReserve", "正备用", quarterHours, hunanPositiveReserveValues, "MW");
  var hunanNegativeReserveSeries = createSeries("negativeReserve", "负备用", quarterHours, hunanNegativeReserveValues, "MW");
  var hunanPositiveReservePage = createPageData({
    title: "系统备用信息-正备用",
    description: "湖南交易中心系统正备用 96 点 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -3),
    dataSource: "湖南电力交易中心系统备用信息 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "负荷信息",
      secondaryTab: "备用信息",
    },
    summaryCards: buildSummaryCardsFromStats(hunanPositiveReserveSeries.stats, "MW", [{ label: "采样点", value: 96, unit: "个" }]),
    chartType: "line",
    chartUnit: "MW",
    chartSeries: [hunanPositiveReserveSeries],
    tableColumns: [
      { key: "time", title: "时刻" },
      { key: "positiveReserve", title: "正备用（MW）" },
      { key: "reserveLevel", title: "备用级别" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: buildPointRows(quarterHours, "positiveReserve", hunanPositiveReserveValues, function buildExtraRow(_, index) {
      return {
        reserveLevel: index >= 32 && index <= 72 ? "二级备用" : "一级备用",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -3),
      };
    }),
    fileList: buildMockFileList("hn", "positive-reserve", standardDefaultDate, 3),
    emptyText: "当前日期暂无湖南正备用 mock 数据。",
  });
  var hunanNegativeReservePage = createPageData({
    title: "系统备用信息-负备用",
    description: "湖南交易中心系统负备用 96 点 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -3),
    dataSource: "湖南电力交易中心系统备用信息 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "负荷信息",
      secondaryTab: "备用信息",
    },
    summaryCards: buildSummaryCardsFromStats(hunanNegativeReserveSeries.stats, "MW", [{ label: "采样点", value: 96, unit: "个" }]),
    chartType: "line",
    chartUnit: "MW",
    chartSeries: [hunanNegativeReserveSeries],
    tableColumns: [
      { key: "time", title: "时刻" },
      { key: "negativeReserve", title: "负备用（MW）" },
      { key: "reserveLevel", title: "备用级别" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: buildPointRows(quarterHours, "negativeReserve", hunanNegativeReserveValues, function buildExtraRow(_, index) {
      return {
        reserveLevel: index >= 32 && index <= 72 ? "二级备用" : "一级备用",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -3),
      };
    }),
    fileList: buildMockFileList("hn", "negative-reserve", standardDefaultDate, 3),
    emptyText: "当前日期暂无湖南负备用 mock 数据。",
  });
  var hunanReserveOverviewPage = createPageData({
    title: "系统备用信息",
    description: "湖南交易中心正负备用统一 mock 读取结构。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -3),
    dataSource: "湖南电力交易中心系统备用信息 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "负荷信息",
      secondaryTab: "备用信息",
    },
    summaryCards: [
      { label: "正备用峰值", value: hunanPositiveReserveSeries.max, unit: "MW" },
      { label: "负备用峰值", value: hunanNegativeReserveSeries.max, unit: "MW" },
      { label: "正备用均值", value: hunanPositiveReserveSeries.average, unit: "MW" },
      { label: "负备用均值", value: hunanNegativeReserveSeries.average, unit: "MW" },
    ],
    metricTree: [
      { id: "reserve-positive", label: "正备用" },
      { id: "reserve-negative", label: "负备用" },
    ],
    chartType: "line",
    chartUnit: "MW",
    chartSeries: [hunanPositiveReserveSeries, hunanNegativeReserveSeries],
    tableColumns: [
      { key: "time", title: "时刻" },
      { key: "positiveReserve", title: "正备用（MW）" },
      { key: "negativeReserve", title: "负备用（MW）" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: quarterHours.map(function mapReserveRow(time, index) {
      return {
        time: time,
        positiveReserve: hunanPositiveReserveValues[index],
        negativeReserve: hunanNegativeReserveValues[index],
        updatedAt: buildUpdatedAt(dataUpdatedAt, -3),
      };
    }),
    summaryTable: {
      columns: [
        { key: "category", title: "类别" },
        { key: "maxValue", title: "峰值（MW）" },
        { key: "minValue", title: "谷值（MW）" },
        { key: "averageValue", title: "均值（MW）" },
      ],
      data: [
        {
          category: "正备用",
          maxValue: hunanPositiveReserveSeries.max,
          minValue: hunanPositiveReserveSeries.min,
          averageValue: hunanPositiveReserveSeries.average,
        },
        {
          category: "负备用",
          maxValue: hunanNegativeReserveSeries.max,
          minValue: hunanNegativeReserveSeries.min,
          averageValue: hunanNegativeReserveSeries.average,
        },
      ],
    },
    fileList: buildMockFileList("hn", "reserve-overview", standardDefaultDate, 3),
    emptyText: "当前日期暂无湖南备用信息 mock 数据。",
  });
  var hunanMaintenanceCapacityValues = buildWaveValues(60, 24, {
    base: 820,
    dayAmplitude: 70,
    peakAmplitude: 110,
    dayShift: 4,
    peakShift: 11,
    pattern: [-12, 8, 16, -8],
    integer: true,
  });
  var hunanMaintenanceSeries = createSeries("maintenanceCapacity", "检修影响容量", hours, hunanMaintenanceCapacityValues, "MW");
  var hunanMaintenancePlanRows = [
    { planDate: standardDefaultDate, equipmentType: "发电机组", equipmentName: "郴州抽蓄 1 号机", region: "郴州", startTime: "2026-05-09 00:00", endTime: "2026-05-09 23:59", impactCapacity: 300, planStatus: "执行中" },
    { planDate: standardDefaultDate, equipmentType: "主变", equipmentName: "长沙北 500kV 主变 A", region: "长沙", startTime: "2026-05-09 02:00", endTime: "2026-05-09 08:00", impactCapacity: 120, planStatus: "已批复" },
    { planDate: standardDefaultDate, equipmentType: "输电线路", equipmentName: "湘潭南 I 回线路", region: "湘潭", startTime: "2026-05-09 05:00", endTime: "2026-05-09 12:00", impactCapacity: 86, planStatus: "执行中" },
    { planDate: standardDefaultDate, equipmentType: "发电机组", equipmentName: "岳阳光伏 5 号机", region: "岳阳", startTime: "2026-05-09 06:30", endTime: "2026-05-09 18:30", impactCapacity: 34, planStatus: "执行中" },
    { planDate: standardDefaultDate, equipmentType: "母线", equipmentName: "株洲东 220kV 母线 B", region: "株洲", startTime: "2026-05-09 09:00", endTime: "2026-05-09 15:00", impactCapacity: 58, planStatus: "待开始" },
    { planDate: standardDefaultDate, equipmentType: "变压器", equipmentName: "衡阳西 220kV 主变 2", region: "衡阳", startTime: "2026-05-09 13:00", endTime: "2026-05-09 21:00", impactCapacity: 72, planStatus: "待开始" },
  ];
  var hunanMaintenancePlanPage = createPageData({
    title: "发输变电设备检修计划（日）",
    description: "湖南交易中心发输变电设备日检修计划 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -2),
    dataSource: "湖南电力交易中心检修计划 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "24h",
      primaryTab: "负荷信息",
      secondaryTab: "机组检修容量",
    },
    summaryCards: [
      { label: "检修计划数", value: hunanMaintenancePlanRows.length, unit: "条" },
      { label: "影响容量峰值", value: hunanMaintenanceSeries.max, unit: "MW" },
      { label: "影响容量谷值", value: hunanMaintenanceSeries.min, unit: "MW" },
      { label: "影响容量均值", value: hunanMaintenanceSeries.average, unit: "MW" },
    ],
    chartType: "line",
    chartUnit: "MW",
    chartSeries: [hunanMaintenanceSeries],
    tableColumns: [
      { key: "planDate", title: "计划日期" },
      { key: "equipmentType", title: "设备类型" },
      { key: "equipmentName", title: "设备名称" },
      { key: "region", title: "区域" },
      { key: "startTime", title: "开始时间" },
      { key: "endTime", title: "结束时间" },
      { key: "impactCapacity", title: "影响容量（MW）" },
      { key: "planStatus", title: "计划状态" },
    ],
    tableData: hunanMaintenancePlanRows,
    fileList: buildMockFileList("hn", "maintenance-plan", standardDefaultDate, 4),
    emptyText: "当前日期暂无湖南检修计划 mock 数据。",
  });
  var hunanInfoDisclosureEmptyText = "当前交易中心暂未接入该披露类型数据，请切换其他披露类型或手动更新数据。";

  function createHunanInfoEmptyPage(title, primaryTab, secondaryTab, emptyText) {
    return createPageData({
      title: title,
      description: "湖南交易中心该披露类型暂未接入统一展示数据。",
      updateTime: dataUpdatedAt,
      dataSource: dataSource,
      filters: {
        date: standardDefaultDate,
        primaryTab: primaryTab,
        secondaryTab: secondaryTab || "",
      },
      viewType: "empty",
      emptyText: emptyText || hunanInfoDisclosureEmptyText,
    });
  }

  function buildHunanHourlyProfileRow(date, companyName, companyIndex, dayIndex) {
    var hourlyValues = buildWaveValues(60, 24, {
      base: 856 + dayIndex * 12 + companyIndex * 42,
      dayAmplitude: 112 + companyIndex * 6,
      peakAmplitude: 184 + companyIndex * 10,
      dayShift: 6,
      peakShift: 13,
      valleyEndHour: 6,
      valleyOffset: -58 + companyIndex * 4,
      pattern: [-12, 8, 14, -6],
      integer: true,
    });
    var row = {
      date: date,
      saleCompanyName: companyName,
      hourlyValues: hourlyValues,
      totalValue: sum(hourlyValues),
      updatedAt: buildUpdatedAt(dataUpdatedAt, -9),
    };

    hours.forEach(function eachHourLabel(hourLabel, hourIndex) {
      row[hourLabel] = hourlyValues[hourIndex];
    });

    return row;
  }

  var hunanUnifiedPriceRows = settlementPriceRows.map(function mapPriceRow(row) {
    return {
      date: row.date,
      time: row.time,
      dayAheadPrice: row.dayaheadPrice,
      realTimePrice: row.realtimePrice,
      priceDiff: round(row.realtimePrice - row.dayaheadPrice),
      updatedAt: row.updatedAt,
    };
  });
  var hunanUnifiedPricePage = createPageData({
    title: "全省统一出清价",
    description: "湖南交易中心信息披露页统一结构下的用户侧统一结算价格 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -18),
    dataSource: "湖南电力交易中心用户侧统一结算价格 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "1h",
      primaryTab: "全省统一出清价",
      secondaryTab: "",
    },
    viewType: "lineTable",
    chartTitle: "用户侧统一结算价格趋势图",
    chartUnit: "元/MWh",
    labelKey: "time",
    datePickerMode: "single",
    dateLabel: "运行日期",
    dayAheadSeriesLabel: "日前用户侧统一结算价格",
    realTimeSeriesLabel: "实时用户侧统一结算价格",
    tooltipMode: "priceSpread",
    seriesDefinitions: [
      { id: "hn-info-price-dayahead", label: "日前用户侧统一结算价格", color: "#1677FF", valueKey: "dayAheadPrice" },
      { id: "hn-info-price-realtime", label: "实时用户侧统一结算价格", color: "#2FCB8F", valueKey: "realTimePrice" },
    ],
    tableColumns: [
      { key: "date", title: "日期" },
      { key: "time", title: "时刻" },
      { key: "dayAheadPrice", title: "日前用户侧统一结算价格（元/MWh）" },
      { key: "realTimePrice", title: "实时用户侧统一结算价格（元/MWh）" },
      { key: "priceDiff", title: "价差（元/MWh）" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: hunanUnifiedPriceRows,
    tableMinWidth: 1340,
    fileList: buildMockFileList("hn", "unified-clearing-price", standardDefaultDate, 3),
    emptyText: "当前日期暂无湖南用户侧统一结算价格 mock 数据。",
  });
  var hunanSaleCompanyNames = [
    "滴滴电力（湖南）有限公司",
    "湘能售电一部",
    "岳州售电",
  ];
  var hunanUnifiedSaleCompanyRows = settlementDates.reduce(function accumulateRows(result, date, dayIndex) {
    return result.concat(
      hunanSaleCompanyNames.map(function mapCompany(companyName, companyIndex) {
        return buildHunanHourlyProfileRow(date, companyName, companyIndex, dayIndex);
      }),
    );
  }, []);
  var hunanUnifiedSaleCompanyPage = createPageData({
    title: "售电公司分时电量",
    description: "湖南交易中心信息披露页统一结构下的售电公司日用电信息 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -9),
    dataSource: "湖南电力交易中心售电公司日用电信息 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "24h",
      primaryTab: "售电公司分时电量",
      secondaryTab: "",
    },
    viewType: "profileTable",
    chartTitle: "售电公司分时电量趋势图",
    chartUnit: "MWh",
    datePickerMode: "range",
    dateLabel: "用电日期",
    filterFields: [
      {
        type: "select",
        label: "售电公司名称",
        fieldKey: "saleCompanyName",
        options: ["全部"].concat(hunanSaleCompanyNames),
        defaultValue: "全部",
      },
    ],
    profileModes: {
      "24": {
        label: "24点视图",
        labels: hours.slice(),
        unit: "MWh",
        valueKey: "hourlyValues",
        latestLabel: "所选周期最新日电量",
        averageLabel: "所选周期均值电量",
        compareLatestLabel: "对比周期最新日电量",
        compareAverageLabel: "对比周期均值电量",
      },
    },
    defaultProfileMode: "24",
    tableColumns: [{ key: "date", title: "日期" }, { key: "saleCompanyName", title: "售电公司名称" }]
      .concat(hours.map(function mapHourLabel(hourLabel) {
        return { key: hourLabel, title: hourLabel };
      }))
      .concat([
        { key: "totalValue", title: "日合计电量（MWh）" },
        { key: "updatedAt", title: "更新时间" },
      ]),
    tableData: hunanUnifiedSaleCompanyRows,
    tableMinWidth: 3880,
    fileList: buildMockFileList("hn", "sale-company-load", standardDefaultDate, 3),
    emptyText: "当前日期暂无湖南售电公司分时电量 mock 数据。",
  });

  var hunanUnifiedGenerationForecastValues = buildWaveValues(15, 96, {
    base: 26280,
    dayAmplitude: 840,
    peakAmplitude: 1380,
    dayShift: 6,
    peakShift: 15,
    pattern: [-48, 32, -26, 44],
    integer: true,
  });
  var hunanUnifiedGenerationActualValues = hunanUnifiedGenerationForecastValues.map(function mapActualValue(value, index) {
    return value + [-180, 120, -90, 160][index % 4];
  });
  var hunanUnifiedGenerationRows = quarterHours.map(function mapGenerationRow(time, index) {
    var actualValue = hunanUnifiedGenerationActualValues[index];
    var forecastValue = hunanUnifiedGenerationForecastValues[index];
    return {
      date: standardDefaultDate,
      time: time,
      actualValue: actualValue,
      forecastValue: forecastValue,
      diffValue: actualValue - forecastValue,
      source: "湖南发电总出力统一口径",
      updatedAt: buildUpdatedAt(dataUpdatedAt, -11),
    };
  });
  var hunanUnifiedGenerationPage = createPageData({
    title: "发电总出力",
    description: "湖南交易中心信息披露页统一结构下的发电总出力 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -11),
    dataSource: "湖南电力交易中心发电总出力 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "负荷信息",
      secondaryTab: "负荷信息",
    },
    viewType: "metricCompare",
    chartTitle: "发电总出力趋势图",
    chartUnit: "MW",
    labelKey: "time",
    sidebarGroups: [
      {
        label: "发电出力",
        items: [
          { id: "hn-info-generation-output", label: "发电总出力" },
          { id: "hn-info-generation-forecast", label: "发电总出力预测" },
        ],
      },
    ],
    defaultMetricId: "hn-info-generation-output",
    metrics: {
      "hn-info-generation-output": {
        title: "发电总出力",
        unit: "MW",
        seriesDefinitions: [
          { id: "hn-info-generation-actual", label: "发电总出力", color: "#1677FF", valueKey: "actualValue" },
          { id: "hn-info-generation-forecast", label: "发电总出力预测", color: "#2FCB8F", valueKey: "forecastValue" },
        ],
        rows: hunanUnifiedGenerationRows,
      },
      "hn-info-generation-forecast": {
        title: "发电总出力预测",
        unit: "MW",
        seriesDefinitions: [
          { id: "hn-info-generation-forecast-only", label: "发电总出力预测", color: "#2FCB8F", valueKey: "forecastValue" },
          { id: "hn-info-generation-actual-only", label: "发电总出力", color: "#1677FF", valueKey: "actualValue" },
        ],
        rows: hunanUnifiedGenerationRows,
      },
    },
    tableColumns: [
      { key: "time", title: "时刻" },
      { key: "actualValue", title: "发电总出力（MW）" },
      { key: "forecastValue", title: "发电总出力预测（MW）" },
      { key: "diffValue", title: "差值（MW）" },
      { key: "source", title: "数据来源" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: hunanUnifiedGenerationRows,
    tableMinWidth: 1240,
    emptyText: "当前日期暂无湖南发电总出力 mock 数据。",
  });
  var hunanNodeOptionNames = ["全省", "长沙枢纽节点", "湘西联络节点", "湘南工业节点"];
  var hunanUnifiedNodePriceMap = {
    "全省": {
      dayAheadValues: hunanDayAheadNodePriceValues.slice(),
      realTimeValues: hunanRealTimeNodePriceValues.slice(),
    },
    "长沙枢纽节点": {
      dayAheadValues: hunanDayAheadNodePriceValues.map(function mapNodeValue(value, index) {
        return round(value + [2.2, -1.4, 1.8, -0.6][index % 4]);
      }),
      realTimeValues: hunanRealTimeNodePriceValues.map(function mapNodeValue(value, index) {
        return round(value + [3.1, -2.2, 2.4, -0.8][index % 4]);
      }),
    },
    "湘西联络节点": {
      dayAheadValues: hunanDayAheadNodePriceValues.map(function mapNodeValue(value, index) {
        return round(value + [-6.8, -4.4, -2.6, -1.2][index % 4]);
      }),
      realTimeValues: hunanRealTimeNodePriceValues.map(function mapNodeValue(value, index) {
        return round(value + [-7.4, -5.2, -3.6, -2.1][index % 4]);
      }),
    },
    "湘南工业节点": {
      dayAheadValues: hunanDayAheadNodePriceValues.map(function mapNodeValue(value, index) {
        return round(value + [5.6, 3.8, 2.4, 1.2][index % 4]);
      }),
      realTimeValues: hunanRealTimeNodePriceValues.map(function mapNodeValue(value, index) {
        return round(value + [6.2, 4.4, 2.8, 1.6][index % 4]);
      }),
    },
  };
  Object.keys(hunanUnifiedNodePriceMap).forEach(function eachNodeName(nodeName) {
    var nodeData = hunanUnifiedNodePriceMap[nodeName];
    nodeData.rows = quarterHours.map(function mapNodeRow(time, index) {
      var dayAheadValue = nodeData.dayAheadValues[index];
      var realTimeValue = nodeData.realTimeValues[index];
      return {
        date: standardDefaultDate,
        time: time,
        nodeName: nodeName,
        dayAheadPrice: dayAheadValue,
        realTimePrice: realTimeValue,
        diffValue: round(realTimeValue - dayAheadValue),
        updatedAt: buildUpdatedAt(dataUpdatedAt, -10),
      };
    });
  });
  var hunanUnifiedNodePricePage = createPageData({
    title: "节点电价",
    description: "湖南交易中心信息披露页统一结构下的节点电价 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -10),
    dataSource: "湖南电力交易中心节点边际电价 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "节点电价",
      secondaryTab: "",
    },
    viewType: "nodePrice",
    chartTitle: "节点边际电价趋势图",
    chartUnit: "元/MWh",
    labelKey: "time",
    datePickerMode: "single",
    dateLabel: "运行日期",
    dayAheadSeriesLabel: "日前节点边际电价",
    realTimeSeriesLabel: "实时节点边际电价",
    nodeOptions: hunanNodeOptionNames,
    defaultNode: "全省",
    sidebarGroups: [
      {
        label: "节点列表",
        items: hunanNodeOptionNames.map(function mapNodeName(nodeName) {
          return {
            id: nodeName,
            label: nodeName,
          };
        }),
      },
    ],
    nodeSeries: hunanUnifiedNodePriceMap,
    tableColumns: [
      { key: "date", title: "日期" },
      { key: "time", title: "时刻" },
      { key: "nodeName", title: "节点名称" },
      { key: "dayAheadPrice", title: "日前节点边际电价（元/MWh）" },
      { key: "realTimePrice", title: "实时节点边际电价（元/MWh）" },
      { key: "diffValue", title: "价差（元/MWh）" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableMinWidth: 1360,
    emptyText: "当前日期暂无湖南节点边际电价 mock 数据。",
  });
  var hunanUnifiedDeclarationVolumeValues = buildWaveValues(15, 96, {
    base: 304,
    dayAmplitude: 22,
    peakAmplitude: 44,
    dayShift: 6,
    peakShift: 15,
    valleyEndHour: 6,
    valleyOffset: -18,
    pattern: [-8, 6, 12, -4],
    integer: true,
  });
  var hunanUnifiedDeclarationPriceValues = buildWaveValues(15, 96, {
    base: 348.5,
    dayAmplitude: 10,
    peakAmplitude: 22,
    dayShift: 6,
    peakShift: 15,
    pattern: [-1.4, 0.8, 1.6, -0.6],
  });
  var hunanUnifiedDeclarationRows = quarterHours.map(function mapDeclarationRow(time, index) {
    return {
      date: standardDefaultDate,
      operationDate: standardDefaultDate,
      declarationPeriod: time,
      declarationType: index >= 64 ? "晚峰量价申报" : index >= 40 ? "平段量价申报" : "谷段量价申报",
      volumeValue: hunanUnifiedDeclarationVolumeValues[index],
      priceValue: hunanUnifiedDeclarationPriceValues[index],
      declarationStatus: index % 12 === 0 ? "待校验" : index % 4 === 0 ? "已回传" : "已提交",
      updatedAt: buildUpdatedAt(dataUpdatedAt, -8),
    };
  });
  var hunanUnifiedDeclarationPage = createPageData({
    title: "日前申报",
    description: "湖南交易中心信息披露页统一结构下的日前申报 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -8),
    dataSource: "湖南电力交易中心日前申报 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "日前申报",
      secondaryTab: "",
    },
    viewType: "mixedTrendTable",
    chartTitle: "日前申报量价趋势",
    labelKey: "declarationPeriod",
    leftUnit: "MWh",
    rightUnit: "元/MWh",
    datePickerMode: "single",
    dateLabel: "运行日期",
    tooltipMode: "declarationBid",
    filterFields: [
      {
        type: "select",
        label: "申报类型",
        fieldKey: "declarationType",
        options: ["全部", "谷段量价申报", "平段量价申报", "晚峰量价申报"],
        defaultValue: "全部",
      },
    ],
    barSeriesDefinitions: [
      { id: "hn-info-declaration-volume", label: "申报电量", color: "#9DC4FF", valueKey: "volumeValue" },
    ],
    lineSeriesDefinitions: [
      { id: "hn-info-declaration-price", label: "申报价格", color: "#FF7A45", valueKey: "priceValue" },
    ],
    tableColumns: [
      { key: "operationDate", title: "运行日期" },
      { key: "declarationPeriod", title: "申报时段" },
      { key: "declarationType", title: "申报类型" },
      { key: "volumeValue", title: "申报电量（MWh）" },
      { key: "priceValue", title: "申报价格（元/MWh）" },
      { key: "declarationStatus", title: "申报状态" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: hunanUnifiedDeclarationRows,
    tableMinWidth: 1240,
    emptyText: "当前日期暂无湖南日前申报 mock 数据。",
  });
  var hunanUnifiedUnitStatusRows = [
    {
      date: standardDefaultDate,
      runDate: standardDefaultDate,
      unitName: "长沙燃机 1 号机",
      unitCode: "HN-GEN-001",
      operatingStatus: "运行",
      values: buildWaveValues(15, 96, {
        base: 564,
        dayAmplitude: 24,
        peakAmplitude: 38,
        dayShift: 6,
        peakShift: 15,
        pattern: [-6, 4, 8, -2],
        integer: true,
      }),
    },
    {
      date: standardDefaultDate,
      runDate: standardDefaultDate,
      unitName: "株洲煤机 2 号机",
      unitCode: "HN-GEN-002",
      operatingStatus: "运行",
      values: buildWaveValues(15, 96, {
        base: 896,
        dayAmplitude: 22,
        peakAmplitude: 34,
        dayShift: 6,
        peakShift: 14,
        pattern: [-8, 6, 10, -4],
        integer: true,
      }),
    },
    {
      date: standardDefaultDate,
      runDate: standardDefaultDate,
      unitName: "湘潭水电 3 号机",
      unitCode: "HN-GEN-003",
      operatingStatus: "运行",
      values: buildWaveValues(15, 96, {
        base: 312,
        dayAmplitude: 42,
        peakAmplitude: 56,
        dayShift: 8,
        peakShift: 11,
        pattern: [-10, 6, 12, -4],
        integer: true,
      }),
    },
    {
      date: standardDefaultDate,
      runDate: standardDefaultDate,
      unitName: "衡阳风场集群",
      unitCode: "HN-GEN-004",
      operatingStatus: "受限运行",
      values: quarterHours.map(function mapWindValue(_, index) {
        var baseValue = buildWaveValues(15, 96, {
          base: 216,
          dayAmplitude: 64,
          peakAmplitude: 84,
          dayShift: 7,
          peakShift: 12,
          pattern: [-16, 10, 18, -6],
          integer: true,
        })[index];
        return index >= 24 && index <= 80 ? Math.max(baseValue - 48, 96) : baseValue;
      }),
    },
    {
      date: standardDefaultDate,
      runDate: standardDefaultDate,
      unitName: "岳阳光伏 5 号机",
      unitCode: "HN-GEN-005",
      operatingStatus: "运行",
      values: quarterHours.map(function mapSolarValue(_, index) {
        var hour = index / 4;
        if (hour < 6 || hour > 18.5) {
          return 0;
        }
        return Math.round(Math.max(0, Math.sin(((hour - 6) / 12.5) * Math.PI) * 226) + [0, 8, -4, 12][index % 4]);
      }),
    },
    {
      date: standardDefaultDate,
      runDate: standardDefaultDate,
      unitName: "郴州抽蓄 1 号机",
      unitCode: "HN-GEN-006",
      operatingStatus: "检修",
      values: quarterHours.map(function mapOutageValue() {
        return 0;
      }),
    },
    {
      date: standardDefaultDate,
      runDate: standardDefaultDate,
      unitName: "娄底燃机 2 号机",
      unitCode: "HN-GEN-008",
      operatingStatus: "备用",
      values: quarterHours.map(function mapStandbyValue(_, index) {
        if (index < 48) {
          return 0;
        }
        return 168 + [0, 6, -4, 10][index % 4];
      }),
    },
  ].map(function mapUnitStatusRow(row) {
    var formattedRow = {
      date: row.date,
      runDate: row.runDate,
      unitName: row.unitName,
      unitCode: row.unitCode,
      operatingStatus: row.operatingStatus,
      updatedAt: buildUpdatedAt(dataUpdatedAt, -6),
    };
    quarterHours.forEach(function eachTime(time, index) {
      formattedRow[time] = row.values[index];
    });
    return formattedRow;
  });
  var hunanUnifiedMaintenanceScheduleRows = [
    {
      date: standardDefaultDate,
      planDate: standardDefaultDate,
      equipmentType: "发电机组",
      equipmentName: "郴州抽蓄 1 号机",
      stationName: "郴州抽蓄电站",
      startTime: "2026-05-09 00:00",
      endTime: "2026-05-09 23:59",
      planStatus: "执行中",
      impactCapacity: 300,
      updatedAt: buildUpdatedAt(dataUpdatedAt, -2),
    },
    {
      date: standardDefaultDate,
      planDate: standardDefaultDate,
      equipmentType: "主变",
      equipmentName: "长沙北 500kV 主变 A",
      stationName: "长沙北变电站",
      startTime: "2026-05-09 02:00",
      endTime: "2026-05-09 08:00",
      planStatus: "已批复",
      impactCapacity: 120,
      updatedAt: buildUpdatedAt(dataUpdatedAt, -2),
    },
    {
      date: standardDefaultDate,
      planDate: standardDefaultDate,
      equipmentType: "输电线路",
      equipmentName: "湘潭南 I 回线路",
      stationName: "湘潭南站",
      startTime: "2026-05-09 05:00",
      endTime: "2026-05-09 12:00",
      planStatus: "执行中",
      impactCapacity: 86,
      updatedAt: buildUpdatedAt(dataUpdatedAt, -2),
    },
    {
      date: standardDefaultDate,
      planDate: standardDefaultDate,
      equipmentType: "母线",
      equipmentName: "株洲东 220kV 母线 B",
      stationName: "株洲东变电站",
      startTime: "2026-05-09 09:00",
      endTime: "2026-05-09 15:00",
      planStatus: "待开始",
      impactCapacity: 58,
      updatedAt: buildUpdatedAt(dataUpdatedAt, -2),
    },
    {
      date: standardDefaultDate,
      planDate: standardDefaultDate,
      equipmentType: "变压器",
      equipmentName: "衡阳西 220kV 主变 2",
      stationName: "衡阳西变电站",
      startTime: "2026-05-09 13:00",
      endTime: "2026-05-09 21:00",
      planStatus: "待开始",
      impactCapacity: 72,
      updatedAt: buildUpdatedAt(dataUpdatedAt, -2),
    },
  ];
  var hunanUnifiedMaintenancePage = createPageData({
    title: "机组检修容量",
    description: "湖南交易中心信息披露页统一结构下的机组状态与检修计划 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -2),
    dataSource: "湖南电力交易中心机组检修与设备计划 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "负荷信息",
      secondaryTab: "机组检修容量",
    },
    viewType: "maintenanceComposite",
    maintenanceChart: {
      title: "",
      labels: [],
      unit: "MW",
      series: [],
    },
    unitStatusTable: {
      title: "机组状态明细表",
      columns: [{ key: "runDate", title: "日期" }, { key: "unitName", title: "机组名称" }, { key: "unitCode", title: "机组编码" }, { key: "operatingStatus", title: "运行状态" }]
        .concat(quarterHours.map(function mapTime(time) {
          return { key: time, title: time };
        }))
        .concat([{ key: "updatedAt", title: "更新时间" }]),
      data: hunanUnifiedUnitStatusRows,
      minWidth: 8920,
    },
    extraTables: [
      {
        title: "发输变电设备检修计划（日）",
        columns: [
          { key: "planDate", title: "检修日期" },
          { key: "equipmentType", title: "设备类型" },
          { key: "equipmentName", title: "设备名称" },
          { key: "stationName", title: "所属厂站" },
          { key: "startTime", title: "检修开始时间" },
          { key: "endTime", title: "检修结束时间" },
          { key: "planStatus", title: "检修状态" },
          { key: "impactCapacity", title: "影响容量（MW）" },
          { key: "updatedAt", title: "更新时间" },
        ],
        data: hunanUnifiedMaintenanceScheduleRows,
        minWidth: 1680,
      },
    ],
    emptyText: "当前日期暂无湖南机组检修容量 mock 数据。",
  });
  var hunanUnifiedReserveRows = quarterHours.map(function mapReserveRow(time, index) {
    return {
      date: standardDefaultDate,
      time: time,
      positiveReserve: hunanPositiveReserveValues[index],
      negativeReserve: hunanNegativeReserveValues[index],
      diffValue: hunanPositiveReserveValues[index] - hunanNegativeReserveValues[index],
      source: "湖南系统备用统一口径",
      updatedAt: buildUpdatedAt(dataUpdatedAt, -3),
    };
  });
  var hunanUnifiedReservePage = createPageData({
    title: "备用信息",
    description: "湖南交易中心信息披露页统一结构下的系统备用信息 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -3),
    dataSource: "湖南电力交易中心系统备用信息 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "负荷信息",
      secondaryTab: "备用信息",
    },
    viewType: "lineTable",
    chartTitle: "系统备用信息趋势图",
    chartUnit: "MW",
    labelKey: "time",
    seriesDefinitions: [
      { id: "hn-info-reserve-positive", label: "正备用", color: "#1677FF", valueKey: "positiveReserve" },
      { id: "hn-info-reserve-negative", label: "负备用", color: "#2FCB8F", valueKey: "negativeReserve" },
    ],
    tableColumns: [
      { key: "date", title: "日期" },
      { key: "time", title: "时刻" },
      { key: "positiveReserve", title: "正备用（MW）" },
      { key: "negativeReserve", title: "负备用（MW）" },
      { key: "diffValue", title: "差值（MW）" },
      { key: "source", title: "数据来源" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: hunanUnifiedReserveRows,
    tableMinWidth: 1360,
    emptyText: "当前日期暂无湖南备用信息 mock 数据。",
  });
  var hunanMarketPageData = {
    datasets: {
      generationOutput: hunanGenerationOutputPage,
      dayAheadNodePrice: hunanDayAheadNodePricePage,
      realTimeNodePrice: hunanRealTimeNodePricePage,
      dayAheadDeclaration: hunanDayAheadDeclarationPage,
      mediumLongTradeResult: hunanLongTermTradeResultPage,
      unitStatus: hunanUnitStatusPage,
      dailySettlement: hunanDailySettlementPage,
      monthlySettlementSeller: hunanMonthlySellerPage,
      monthlySettlementConsumer: hunanMonthlyConsumerPage,
      dailySettlementOverview: hunanSettlementOverviewPage,
      reservePositive: hunanPositiveReservePage,
      reserveNegative: hunanNegativeReservePage,
      reserveOverview: hunanReserveOverviewPage,
      maintenancePlanDaily: hunanMaintenancePlanPage,
      infoGenerationOutput: hunanUnifiedGenerationPage,
      infoUnifiedPrice: hunanUnifiedPricePage,
      infoSaleCompanyProfile: hunanUnifiedSaleCompanyPage,
      infoNodePrice: hunanUnifiedNodePricePage,
      infoDayAheadDeclaration: hunanUnifiedDeclarationPage,
      infoMaintenanceComposite: hunanUnifiedMaintenancePage,
      infoReserve: hunanUnifiedReservePage,
      infoEmptyVolume: createHunanInfoEmptyPage(
        "出清电量",
        "出清电量",
        "",
        "湖南交易中心当前暂未接入出清电量类披露数据，请切换其他披露类型或手动更新数据。",
      ),
      infoEmptyTradeResult: createHunanInfoEmptyPage(
        "交易结果",
        "交易结果",
        "",
        "湖南交易中心当前暂未接入现货交易结果类披露数据，请切换其他披露类型或手动更新数据。",
      ),
      infoEmptyEnterprise: createHunanInfoEmptyPage(
        "用电企业分时电量",
        "用电企业分时电量",
        "",
        "湖南交易中心当前暂未接入用电企业分时电量披露数据。",
      ),
    },
    pageMap: {
      infoDisclosure: {
        defaultDatasetKey: "infoGenerationOutput",
        primaryTabs: {
          "负荷信息": {
            defaultDatasetKey: "infoGenerationOutput",
            secondaryTabs: {
              "负荷信息": "infoGenerationOutput",
              "负荷详情": "infoGenerationOutput",
              "机组检修容量": "infoMaintenanceComposite",
              "备用信息": "infoReserve",
            },
          },
          "全省统一出清价": "infoUnifiedPrice",
          "出清电量": "infoEmptyVolume",
          "交易结果": "infoEmptyTradeResult",
          "售电公司分时电量": "infoSaleCompanyProfile",
          "用电企业分时电量": "infoEmptyEnterprise",
          "节点电价": "infoNodePrice",
          "日前申报": "infoDayAheadDeclaration",
        },
      },
      settlement: {
        defaultDatasetKey: "dailySettlement",
        primaryTabs: {
          "日清算": "dailySettlement",
          "月结算": {
            defaultDatasetKey: "monthlySettlementSeller",
            secondaryTabs: {
              "售电公司": "monthlySettlementSeller",
              "用电企业": "monthlySettlementConsumer",
            },
          },
          "交易结果": {
            defaultDatasetKey: "dailySettlementOverview",
            secondaryTabs: {
              "结算总体情况": "dailySettlementOverview",
            },
          },
        },
      },
    },
  };

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
      statusText: "数据更新时间：2026-05-09 10:46:12（湖南交易中心日清算PDF解析）",
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
      longTermTradeResult: {
        defaultRange: {
          start: "2026-05-03",
          end: "2026-05-09",
        },
        productOptions: hunanRollingTradeProducts,
        contractPeriodOptions: hunanRollingContractPeriods,
        rows: hunanRollingDetailedRows,
      },
    },
    marketPageData: hunanMarketPageData,
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
        stepMinutes: 15,
        base: 23980,
        dayAmplitude: 980,
        peakAmplitude: 1560,
        dayShift: 5,
        peakShift: 14,
        dayIncrement: 86,
        modBase: 8,
        modOffset: 3.5,
        noise: 42,
        source: "湖南负荷预测披露口径",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -24),
      }),
      "实际负荷": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 23660,
        dayAmplitude: 1040,
        peakAmplitude: 1620,
        dayShift: 6,
        peakShift: 15,
        dayIncrement: 78,
        modBase: 8,
        modOffset: 3.5,
        noise: 48,
        source: "湖南实际负荷口径",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -6),
      }),
      "省间联络线输电曲线预测": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 4820,
        dayAmplitude: 280,
        peakAmplitude: 410,
        dayShift: 4,
        peakShift: 13,
        dayIncrement: 18,
        modBase: 8,
        modOffset: 3.5,
        noise: 16,
        source: "湖南省间联络线预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -22),
      }),
      "省间联络线输电情况": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 4680,
        dayAmplitude: 300,
        peakAmplitude: 436,
        dayShift: 5,
        peakShift: 14,
        dayIncrement: 14,
        modBase: 8,
        modOffset: 3.5,
        noise: 18,
        source: "湖南省间联络线实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -8),
      }),
      "发电总出力预测": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 26140,
        dayAmplitude: 860,
        peakAmplitude: 1320,
        dayShift: 6,
        peakShift: 15,
        dayIncrement: 72,
        modBase: 8,
        modOffset: 3.5,
        noise: 38,
        source: "湖南发电总出力预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -27),
      }),
      "非市场机组总出力预测": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 8420,
        dayAmplitude: 360,
        peakAmplitude: 520,
        dayShift: 4,
        peakShift: 12,
        dayIncrement: 26,
        modBase: 8,
        modOffset: 3.5,
        noise: 22,
        source: "湖南非市场机组预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -25),
      }),
      "新能源总出力预测（日）": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 5260,
        dayAmplitude: 740,
        peakAmplitude: 960,
        dayShift: 8,
        peakShift: 11,
        dayIncrement: 34,
        modBase: 8,
        modOffset: 3.5,
        noise: 26,
        source: "湖南新能源预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -21),
      }),
      "水电（含抽蓄）总出力预测（日）": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 3960,
        dayAmplitude: 280,
        peakAmplitude: 430,
        dayShift: 3,
        peakShift: 10,
        dayIncrement: 22,
        modBase: 8,
        modOffset: 3.5,
        noise: 18,
        source: "湖南水电及抽蓄预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -19),
      }),
      "非市场机组总出力": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 8260,
        dayAmplitude: 330,
        peakAmplitude: 480,
        dayShift: 4,
        peakShift: 12,
        dayIncrement: 21,
        modBase: 8,
        modOffset: 3.5,
        noise: 18,
        source: "湖南非市场机组实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -5),
      }),
      "新能源总出力": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 5120,
        dayAmplitude: 760,
        peakAmplitude: 1010,
        dayShift: 8,
        peakShift: 11,
        dayIncrement: 28,
        modBase: 8,
        modOffset: 3.5,
        noise: 24,
        source: "湖南新能源实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -4),
      }),
      "水电（含抽蓄）总出力": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 3820,
        dayAmplitude: 260,
        peakAmplitude: 398,
        dayShift: 3,
        peakShift: 10,
        dayIncrement: 18,
        modBase: 8,
        modOffset: 3.5,
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
