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

  function buildTimeLabels(stepMinutes, count, startOffsetMinutes) {
    return Array.from({ length: count }, function createLabel(_, index) {
      var totalMinutes = index * stepMinutes + (startOffsetMinutes || 0);
      var hour = Math.floor(totalMinutes / 60);
      var minute = totalMinutes % 60;
      if (totalMinutes === 24 * 60) {
        return "24:00";
      }
      return pad(hour) + ":" + pad(minute);
    });
  }

  function buildTimeSlotLabel(stepMinutes, index) {
    var startMinutes = index * stepMinutes;
    var endMinutes = startMinutes + stepMinutes;
    var startHour = Math.floor(startMinutes / 60);
    var startMinute = startMinutes % 60;
    var endHour = Math.floor(endMinutes / 60);
    var endMinute = endMinutes % 60;
    var endLabel = endMinutes === 24 * 60 ? "24:00" : pad(endHour) + ":" + pad(endMinute);
    return pad(startHour) + ":" + pad(startMinute) + "-" + endLabel;
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

  function getFirstFilePublishTime(fileList) {
    var files = Array.isArray(fileList) ? fileList : [];
    var firstFile = files.find(function findFile(file) {
      return file && file.publishTime;
    });
    return firstFile ? firstFile.publishTime : "";
  }

  function createPageData(options) {
    var pageData = {
      title: options.title,
      description: options.description,
      updateTime: options.updateTime,
      publishTime: options.publishTime || options.dataPublishTime || getFirstFilePublishTime(options.fileList),
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
  var hunanEnterpriseHours = buildTimeLabels(60, 24, 60);
  var quarterHours = buildTimeLabels(15, 96, 15);
  var availableDates = buildDateRange("2026-04-01", 122);
  var mockMonths = ["2026-04", "2026-05", "2026-06", "2026-07"];
  var defaultRange = {
    start: "2026-07-25",
    end: "2026-07-31",
  };
  var hunanInfoDailyMockDates = availableDates.slice();
  var dataUpdatedAt = "2026-07-31 10:32:18";
  var dataSource = "湖南电力交易中心信息披露";
  var loadRows = availableDates.map(buildHunanDailyLoadRow);
  var loadAverageValues = averageBySlot(loadRows, "hourlyValues");
  var settlementPriceRows = buildPriceRows(availableDates, 362, "湖南现货统一结算口径", buildUpdatedAt(dataUpdatedAt, -18));
  var settlementDates = availableDates.slice();
  function expandRowsByHunanInfoDates(rows, dateKeys) {
    return hunanInfoDailyMockDates.reduce(function accumulateRows(result, date) {
      return result.concat((rows || []).map(function mapRow(row) {
        var nextRow = Object.assign({}, row);
        (dateKeys || ["date"]).forEach(function eachDateKey(dateKey) {
          nextRow[dateKey] = date;
        });
        return nextRow;
      }));
    }, []);
  }
  var settlementDailyTemplates = [
    { enterpriseCode: "HNQY001", enterpriseName: "长沙高铁南站补能中心", accountNo: "HN0001", microgridName: "长沙市长沙县泉塘小区一期充电站", microgridId: "101437000_33709", meteringPointNo: "HN0001_1" },
    { enterpriseCode: "HNQY002", enterpriseName: "株洲公交充电站群", accountNo: "HN0002", microgridName: "株洲荷塘综合能源站", microgridId: "101437000_348", meteringPointNo: "HN0002_1" },
    { enterpriseCode: "HNQY003", enterpriseName: "湘潭园区综合能源站", accountNo: "HN0003", microgridName: "湘潭九华补能微电网", microgridId: "101437000_419", meteringPointNo: "HN0003_1" },
    { enterpriseCode: "HNQY004", enterpriseName: "岳阳物流港充换电站", accountNo: "HN0004", microgridName: "岳阳临港物流园微电网", microgridId: "101437000_526", meteringPointNo: "HN0004_1" },
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
  var settlementMonthRows = mockMonths.reduce(function accumulateMonthRows(result, month, monthIndex) {
    return result.concat(settlementDailyTemplates.map(function mapTemplate(template, templateIndex) {
      var monthLift = 1 + monthIndex * 0.045;
      var energy = Math.round((251400 + templateIndex * -16400 + monthIndex * 13700 + templateIndex * 1850) * monthLift);
      var fee = Math.round(energy * (46.2 + monthIndex * 0.8 + templateIndex * 0.35));
      return {
        month: month,
        enterpriseCode: template.enterpriseCode,
        enterpriseName: template.enterpriseName,
        accountNo: template.accountNo,
        energy: energy,
        fee: fee,
        agencyIncome: Math.round(energy * (1.12 + templateIndex * 0.02)),
        status: month === "2026-07" && templateIndex >= 2 ? (templateIndex === 2 ? "结算中" : "待确认") : "已出账",
      };
    }));
  }, []);
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
    "中衡直流（日前）预测",
    "中衡直流（日前）实绩",
    "主网送湘（日前）预测",
    "主网送湘（日前）实绩",
    "祁韶直流（日前）预测",
    "祁韶直流（日前）实绩",
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

  var standardDefaultDate = "2026-07-31";
  var standardDefaultMonth = "2026-07";
  var hunanRollingTradeProducts = ["全部", "月度双边", "集中竞价", "挂牌交易"];
  var hunanRollingContractPeriods = ["全部", "D+1", "周合约", "月合约"];
  var hunanRollingTradePeriods = ["00:00-04:00", "04:00-08:00", "08:00-16:00", "16:00-24:00"];
  var hunanRollingDetailedRows = [];
  settlementDates.forEach(function eachHunanRollingDate(date, dayIndex) {
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
  // 滚搓数据：单日行情 + 多日行情（按录屏滚搓数据.mov 还原）
  // 基础电价/电量基数：湖南 ~340 / 广东 ~430 / 陕西 ~310
  var rollingMarketLib = (global.BOSS_ROLLING_MARKET || {});
  var rollingDailyMarket = rollingMarketLib.buildRollingDailyMarket
    ? rollingMarketLib.buildRollingDailyMarket("2026-07-17", 340, 350, 60)
    : {};
  var rollingMultiDay = rollingMarketLib.buildRollingMultiDay
    ? rollingMarketLib.buildRollingMultiDay(340, 350)
    : {};
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
  var hunanDeclarationPowerValues = buildWaveValues(15, 96, {
    base: 232,
    dayAmplitude: 38,
    peakAmplitude: 68,
    dayShift: 6,
    peakShift: 14,
    valleyEndHour: 6,
    valleyOffset: -46,
    pattern: [-4.8, 2.4, 5.2, -2.1],
  });
  var hunanDeclarationPowerSeries = createSeries("declarePower", "申报电力", quarterHours, hunanDeclarationPowerValues, "MW");
  var hunanDayAheadDeclarationRows = quarterHours.map(function mapDeclarationPower(time, index) {
    return {
      declarationDate: standardDefaultDate,
      time: time,
      powerMw: hunanDeclarationPowerValues[index],
    };
  });
  var hunanDayAheadDeclarationPage = createPageData({
    title: "日前申报",
    description: "湖南交易中心日前申报电力 96 点 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -8),
    dataSource: "湖南电力交易中心日前申报 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "日前申报",
      secondaryTab: "",
    },
    summaryCards: [
      { label: "申报电力峰值", value: hunanDeclarationPowerSeries.max, unit: "MW" },
      { label: "申报电力谷值", value: hunanDeclarationPowerSeries.min, unit: "MW" },
      { label: "申报电力均值", value: hunanDeclarationPowerSeries.average, unit: "MW" },
      { label: "申报点数", value: hunanDayAheadDeclarationRows.length, unit: "点" },
    ],
    chartType: "line",
    chartUnit: "MW",
    chartSeries: [hunanDeclarationPowerSeries],
    tableColumns: [
      { key: "time", title: "时刻" },
      { key: "powerMw", title: "申报电力（MW）" },
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
      settlementTypeName: "清分单据",
      dataType: "日清算明细",
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
    settlementTypeName: "清分单据",
    dataType: "日清算明细",
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
  var settlementDailyHourColumns = Array.from({ length: 24 }, function createHourColumn(_, index) {
    return String(index + 1) + "时";
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

  function createHunanDailySettlementWideRow(settlementTypeName, dataType, sourceKey, enterpriseCode, enterpriseName) {
    var detailRows = hunanDailySettlementRows.filter(function filterDetailRow(row) {
      return row.period !== "合计";
    });
    var values = detailRows.map(function mapHourValue(row) {
      return row[sourceKey] || 0;
    });
    var totalRow = hunanDailySettlementRows.find(function findTotalRow(row) {
      return row.period === "合计";
    }) || {};
    var row = {
      date: "2026-04-01",
      settlementDate: "2026-04-01",
      settlementTypeName: settlementTypeName,
      dataType: dataType,
      enterpriseCode: enterpriseCode,
      enterpriseName: enterpriseName,
      "日期": "2026-04-01",
      "结算类型名称": settlementTypeName,
      "数据类型": dataType,
      "企业编码": enterpriseCode,
      "企业名称": enterpriseName,
      "合计值": totalRow[sourceKey],
    };

    settlementDailyHourColumns.forEach(function eachHour(hourLabel, index) {
      row[hourLabel] = values[index] || 0;
    });

    if (sourceKey === "actualUsage") {
      row.actualUsage = row["合计值"];
      row.monthlyActualUsage = row["合计值"];
    }
    if (sourceKey === "mediumLongTermVolume") {
      row.mediumLongTermTradingPower = row["合计值"];
    }
    if (sourceKey === "feeSubtotal") {
      row.tradingCostPrice = 249.47;
    }

    return row;
  }

  var hunanDailySettlementWideRows = [
    createHunanDailySettlementWideRow("实际用电量", "电量", "actualUsage", "ab8ec71b764f43fd8a760daa99c26b7a", "北京小桔新能源汽车科技有限公司"),
    createHunanDailySettlementWideRow("省内净合同", "电量", "mediumLongTermVolume", "ab8ec71b764f43fd8a760daa99c26b7a", "北京小桔新能源汽车科技有限公司"),
    createHunanDailySettlementWideRow("省内净合同", "电费", "mediumLongTermFee", "ab8ec71b764f43fd8a760daa99c26b7a", "北京小桔新能源汽车科技有限公司"),
    createHunanDailySettlementWideRow("日前交易", "电量", "dayAheadVolume", "ab8ec71b764f43fd8a760daa99c26b7a", "北京小桔新能源汽车科技有限公司"),
    createHunanDailySettlementWideRow("实时交易", "电量", "realTimeVolume", "ab8ec71b764f43fd8a760daa99c26b7a", "北京小桔新能源汽车科技有限公司"),
    createHunanDailySettlementWideRow("电费小计", "电费", "feeSubtotal", "ab8ec71b764f43fd8a760daa99c26b7a", "北京小桔新能源汽车科技有限公司"),
  ];
  var hunanDailySettlementPage = createPageData({
    title: "日清算",
    description: "湖南交易中心日清算按清分单据结构展示的 24 时段 mock 数据。",
    updateTime: "2026-07-31 10:46:12",
    dataSource: "湖南交易中心日清算PDF解析",
    filters: {
      dateRange: {
        start: "2026-04-01",
        end: "2026-04-01",
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
    tableColumns: settlementDailyColumns,
    tableData: hunanDailySettlementWideRows,
    fileList: [
      {
        id: "hn-daily-pdf-001",
        fileName: "北京小桔新能源汽车科技有限公司01售电公司日清分结算单.pdf",
        fileType: "日清算 PDF",
        publishTime: "2026-07-31 17:46:20",
        parseStatus: "已解析",
        downloadUrl: "#",
      },
    ],
    emptyText: "当前筛选条件下暂无湖南日清算明细 mock 数据。",
    sellerName: "北京小桔新能源汽车科技有限公司",
    documentTitle: "北京小桔新能源汽车科技有限公司 2026 年 7 月 31 日清分单据",
  });
  var hunanMonthlySettlementSummary = {
    settlementMonth: standardDefaultMonth,
    settlementBasisNo: "HNPX-2026-07-SD000",
    settlementPower: 9902.421,
    contractPower: 5824.700,
    deviationPower: 4077.721,
    settlementFee: -119568.74,
    dataSource: "湖南交易中心月结算PDF解析",
    updateTime: "2026-07-31 10:46:12",
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
  var hunanMonthlySettlementColumns = [
    { key: "monthLabel", label: "年月", fixed: true, width: 120 },
    { key: "electricityLabel", label: "电量", width: 96 },
    {
      label: "省内绿色电力交易(电能量)",
      children: [
        { key: "tradePlanPower", label: "电量", type: "energy", width: 138 },
        { key: "settlementPriceOrAverage", label: "电价", type: "price", width: 138 },
        { key: "settlementFee", label: "电费", type: "money", width: 138 },
      ],
    },
    {
      label: "省内绿色电力交易(电能量-尖)",
      children: [
        { key: "greenPeakEnergy", label: "电量", type: "energy", width: 138 },
        { key: "greenPeakPrice", label: "电价", type: "price", width: 138 },
        { key: "greenPeakFee", label: "电费", type: "money", width: 138 },
      ],
    },
    {
      label: "省内绿色电力交易(电能量-峰)",
      children: [
        { key: "greenHighEnergy", label: "电量", type: "energy", width: 138 },
        { key: "greenHighPrice", label: "电价", type: "price", width: 138 },
        { key: "greenHighFee", label: "电费", type: "money", width: 138 },
      ],
    },
  ];
  var hunanMonthlyPurchaseRows = [
    { monthLabel: "202604", electricityLabel: "电量", tradePlanPower: 0.000, settlementPriceOrAverage: 0.000, settlementFee: 0.00, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", tradePlanPower: 5824.700, settlementPriceOrAverage: 369.529, settlementFee: 2152397.10, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", tradePlanPower: 4775.315, settlementPriceOrAverage: 43.595, settlementFee: 208181.59, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", tradePlanPower: -699.663, settlementPriceOrAverage: 72.816, settlementFee: -50946.44, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", tradePlanPower: 115.880, settlementPriceOrAverage: 50.188, settlementFee: 5815.76, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", tradePlanPower: 2.069, settlementPriceOrAverage: 75.099, settlementFee: 155.38, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", tradePlanPower: 9902.421, settlementPriceOrAverage: 233.830, settlementFee: 2315603.39, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00, subjectCode: "小计", subjectName: "购电侧小计" },
  ];
  var hunanMonthlySaleRows = [
    { monthLabel: "202604", electricityLabel: "电量", tradePlanPower: 9902.421, settlementPriceOrAverage: 309.986, settlementFee: 3069707.89, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电费", tradePlanPower: 0.000, settlementPriceOrAverage: null, settlementFee: 377052.25, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", tradePlanPower: 9902.421, settlementPriceOrAverage: 348.060, settlementFee: 3446760.14, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00, subjectCode: "小计", subjectName: "售电侧小计" },
    { monthLabel: "202604", electricityLabel: "电量", tradePlanPower: 9902.421, settlementPriceOrAverage: 271.919, settlementFee: 2692655.64, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00, subjectCode: "合计", subjectName: "售电公司月结算合计" },
  ];
  hunanMonthlyPurchaseRows.forEach(function normalizeMonthlyPurchaseRow(row) {
    row.monthLabel = standardDefaultMonth.replace("-", "");
  });
  hunanMonthlySaleRows.forEach(function normalizeMonthlySaleRow(row) {
    row.monthLabel = standardDefaultMonth.replace("-", "");
  });
  var hunanMonthlySettlementData = {
    provinceCode: "hn",
    provinceName: "湖南",
    hasPurchaseSaleSide: true,
    month: standardDefaultMonth,
    updateTime: hunanMonthlySettlementSummary.updateTime,
    updateSource: "PDF解析",
    purchaseSide: {
      summaryCards: [
        { label: "当年实际用电量", value: null, unit: "MWh", digits: 3 },
        { label: "中长期交易电量", value: 5824.700, unit: "MWh", digits: 3 },
        { label: "中长期占实际用电比例", value: null, unit: "%", digits: 2 },
        { label: "度电收益", value: null, unit: "厘", digits: 2 },
      ],
      tableColumns: hunanMonthlySettlementColumns,
      tableRows: hunanMonthlyPurchaseRows,
    },
    saleSide: {
      summaryCards: [
        { label: "当年实际用电量", value: null, unit: "MWh", digits: 3 },
        { label: "中长期交易电量", value: null, unit: "MWh", digits: 3 },
        { label: "中长期占实际用电比例", value: null, unit: "%", digits: 2 },
        { label: "度电收益", value: 38.08, unit: "厘", digits: 2 },
      ],
      tableColumns: hunanMonthlySettlementColumns,
      tableRows: hunanMonthlySaleRows,
    },
  };
  var hunanMonthlySettlementFiles = [
    {
      id: "hn-monthly-pdf-001",
      fileName: "北京小桔新能源汽车科技有限公司售电公司-核对版结算单.pdf",
      fileType: "月结算 PDF",
      publishTime: "2026-07-31 11:37:30",
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
    tableColumns: hunanMonthlySettlementColumns,
    tableData: hunanMonthlySaleRows,
    fileList: hunanMonthlySettlementFiles,
    settlementSummary: hunanMonthlySettlementSummary,
    statementTitle: "湖南电力交易中心有限公司 2026年7月交易结算单",
    emptyText: "当前月份暂无湖南售电公司月结算 mock 数据。",
  });
  var hunanMonthlyConsumerRows = mockMonths.reduce(function accumulateConsumerRows(result, month, monthIndex) {
    var templates = [
      ["HNUSER001", "长沙高铁南站补能中心", "HN-U-001", 42860],
      ["HNUSER002", "株洲公交充电站群", "HN-U-002", 41320],
      ["HNUSER003", "湘潭园区综合能源站", "HN-U-003", 39680],
      ["HNUSER004", "岳阳物流港充换电站", "HN-U-004", 37240],
      ["HNUSER005", "常德公共交通能源站", "HN-U-005", 35860],
      ["HNUSER006", "郴州换电网络", "HN-U-006", 34120],
    ];
    return result.concat(templates.map(function mapConsumer(template, templateIndex) {
      var settlementEnergy = Math.round(template[3] * (0.96 + monthIndex * 0.035 + templateIndex * 0.004));
      return {
        month: month,
        companyType: "用电企业",
        companyCode: template[0],
        companyName: template[1],
        accountNo: template[2],
        settlementEnergy: settlementEnergy,
        totalFee: Math.round(settlementEnergy * (46.1 + monthIndex * 0.9 + templateIndex * 0.2)),
        serviceFee: Math.round(settlementEnergy * 1.09),
        deviationFee: Math.round(settlementEnergy * (0.39 + templateIndex * 0.01)),
        invoiceStatus: month === "2026-07" && templateIndex >= 2 ? (templateIndex < 4 ? "结算中" : "待确认") : "已出账",
      };
    }));
  }, []);
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
    tableColumns: hunanMonthlySettlementColumns,
    tableData: hunanMonthlyPurchaseRows,
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

  function buildHunanEnterpriseHourlyProfileRow(date, template, enterpriseIndex, dayIndex) {
    var hourlyValues = buildWaveValues(60, 24, {
      base: 684 + dayIndex * 10 + enterpriseIndex * 36,
      dayAmplitude: 96 + enterpriseIndex * 5,
      peakAmplitude: 158 + enterpriseIndex * 8,
      dayShift: 6,
      peakShift: 13,
      valleyEndHour: 6,
      valleyOffset: -44 + enterpriseIndex * 3,
      pattern: [-9, 6, 11, -5],
      integer: true,
    });
    var row = {
      date: date,
      userCode: template.enterpriseCode,
      accountNo: template.accountNo,
      userName: template.enterpriseName,
      microgridName: template.microgridName,
      microgridId: template.microgridId,
      meteringPointNo: template.meteringPointNo,
      hourlyValues: hourlyValues,
      totalValue: sum(hourlyValues),
      updatedAt: buildUpdatedAt(dataUpdatedAt, -8),
    };

    hunanEnterpriseHours.forEach(function eachHourLabel(hourLabel, hourIndex) {
      row[hourLabel] = hourlyValues[hourIndex];
    });

    return row;
  }

  var hunanUnifiedPriceRows = settlementPriceRows.map(function mapPriceRow(row) {
    var hourIndex = Number(String(row.time || "").slice(0, 2)) || 0;
    var timeSlot = buildTimeSlotLabel(60, hourIndex);
    return {
      province: "hn",
      tradeCenterName: "湖南交易中心",
      date: row.date,
      timeGranularity: "1h",
      periodCount: 24,
      timeSlot: timeSlot,
      time: timeSlot,
      dayAheadPrice: row.dayaheadPrice,
      realTimePrice: row.realtimePrice,
      priceDiff: round(row.realtimePrice - row.dayaheadPrice),
      spread: round(row.realtimePrice - row.dayaheadPrice),
      updatedAt: row.updatedAt,
    };
  });
  var hunanUnifiedPricePage = createPageData({
    title: "全省统一出清价",
    description: "湖南交易中心信息披露页统一结构下的节点电价 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -18),
    dataSource: "湖南电力交易中心节点电价 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "1h",
      primaryTab: "全省统一出清价",
      secondaryTab: "",
    },
    viewType: "lineTable",
    isUnifiedClearingPrice: true,
    timeGranularity: "1h",
    periodCount: 24,
    province: "hn",
    tradeCenterName: "湖南交易中心",
    chartTitle: "全省统一出清价趋势图",
    chartUnit: "元/MWh",
    labelKey: "timeSlot",
    datePickerMode: "single",
    dateLabel: "运行日期",
    dayAheadSeriesLabel: "日前节点电价",
    realTimeSeriesLabel: "实时节点电价",
    tooltipMode: "priceSpread",
    seriesDefinitions: [
      { id: "hn-info-price-dayahead", label: "日前节点电价", color: "#1677FF", valueKey: "dayAheadPrice" },
      { id: "hn-info-price-realtime", label: "实时节点电价", color: "#2FCB8F", valueKey: "realTimePrice" },
    ],
    tableColumns: [
      { key: "date", title: "日期" },
      { key: "timeSlot", title: "时段" },
      { key: "dayAheadPrice", title: "日前节点电价（元/MWh）" },
      { key: "realTimePrice", title: "实时节点电价（元/MWh）" },
      { key: "priceDiff", title: "价差（元/MWh）" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: hunanUnifiedPriceRows,
    tableMinWidth: 1340,
    fileList: buildMockFileList("hn", "unified-clearing-price", standardDefaultDate, 3),
    emptyText: "当前日期暂无湖南节点电价 mock 数据。",
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
  var hunanUnifiedEnterpriseRows = settlementDates.reduce(function accumulateRows(result, date, dayIndex) {
    return result.concat(
      settlementDailyTemplates.map(function mapEnterprise(template, enterpriseIndex) {
        return buildHunanEnterpriseHourlyProfileRow(date, template, enterpriseIndex, dayIndex);
      }),
    );
  }, []);
  var hunanEnterpriseUserNames = settlementDailyTemplates.map(function mapEnterpriseName(template) {
    return template.enterpriseName;
  });
  var hunanEnterpriseAccountNos = settlementDailyTemplates.map(function mapAccountNo(template) {
    return template.accountNo;
  });
  var hunanUnifiedEnterprisePage = createPageData({
    title: "用电企业分时电量",
    description: "湖南交易中心信息披露页统一结构下的用电企业分时电量 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -8),
    dataSource: "湖南电力交易中心用电企业分时电量 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "24h",
      primaryTab: "用电企业分时电量",
      secondaryTab: "",
    },
    viewType: "profileTable",
    tableOnly: true,
    chartTitle: "用电企业分时电量趋势图",
    chartUnit: "MWh",
    datePickerMode: "range",
    dateLabel: "用电日期",
    filterFields: [
      {
        type: "text",
        label: "电力用户编码",
        fieldKey: "enterpriseUserCode",
        rowKey: "userCode",
        placeholder: "",
      },
      {
        type: "text",
        label: "电力用户名称",
        fieldKey: "enterpriseUserName",
        rowKey: "userName",
        placeholder: "",
      },
      {
        type: "text",
        label: "用户户号",
        fieldKey: "enterpriseAccountNo",
        rowKey: "accountNo",
        placeholder: "",
      },
      {
        type: "text",
        label: "微电网ID",
        fieldKey: "enterpriseMicrogridId",
        rowKey: "microgridId",
        placeholder: "",
      },
    ],
    profileModes: {
      "24": {
        label: "24点视图",
        labels: hunanEnterpriseHours.slice(),
        unit: "MWh",
        valueKey: "hourlyValues",
        latestLabel: "所选周期最新日电量",
        averageLabel: "所选周期均值电量",
        compareLatestLabel: "对比周期最新日电量",
        compareAverageLabel: "对比周期均值电量",
      },
    },
    defaultProfileMode: "24",
    tableColumns: [
      { key: "date", title: "日期" },
      { key: "userCode", title: "电力用户编码" },
      { key: "userName", title: "电力用户名称" },
      { key: "microgridName", title: "微电网名称" },
      { key: "microgridId", title: "微电网ID" },
      { key: "accountNo", title: "户号" },
      { key: "meteringPointNo", title: "计量点编号" },
    ]
      .concat(hunanEnterpriseHours.map(function mapHourLabel(hourLabel) {
        return { key: hourLabel, title: hourLabel };
      })),
    tableData: hunanUnifiedEnterpriseRows,
    tableMinWidth: 3040,
    fileList: buildMockFileList("hn", "enterprise-load", standardDefaultDate, 3),
    emptyText: "当前日期暂无湖南用电企业分时电量 mock 数据。",
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
    nodeData.rows = expandRowsByHunanInfoDates(quarterHours.map(function mapNodeRow(time, index) {
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
    }), ["date"]);
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
  var hunanInfoMockSource = "取数工具";
  var hunanInfoMockPublishTime = "2026-07-31 09:58:00";
  var hunanInfoMockUpdateTime = buildUpdatedAt(dataUpdatedAt, -2);
  var hunanInfoUnitStatusDate = "2026-06-20";
  var hunanInfoUnitStatusUpdatedAt = "2026-06-21 23:00:17";
  var hunanInfoUnitStatusSourceDate = "2026-05-06";
  var hunanInfoDisclosureTimeLabels = [
    "00:15", "00:30", "00:45", "01:00", "01:15", "01:30", "01:45", "02:00", "02:15", "02:30", "02:45", "03:00",
    "03:15", "03:30", "03:45", "04:00", "04:15", "04:30", "04:45", "05:00", "05:15", "05:30", "05:45", "06:00",
    "06:15", "06:30", "06:45", "07:00", "07:15", "07:30", "07:45", "08:00", "08:15", "08:30", "08:45", "09:00",
    "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", "11:00", "11:15", "11:30", "11:45", "12:00",
    "12:15", "12:30", "12:45", "13:00", "13:15", "13:30", "13:45", "14:00", "14:15", "14:30", "14:45", "15:00",
    "15:15", "15:30", "15:45", "16:00", "16:15", "16:30", "16:45", "17:00", "17:15", "17:30", "17:45", "18:00",
    "18:15", "18:30", "18:45", "19:00", "19:15", "19:30", "19:45", "20:00", "20:15", "20:30", "20:45", "21:00",
    "21:15", "21:30", "21:45", "22:00", "22:15", "22:30", "22:45", "23:00", "23:15", "23:30", "23:45", "24:00"
  ];
  var hunanInfoUnitStatusRawRows = [
    [1,"长安石门电厂#3机",660,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [2,"石门电厂#1机",300,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [3,"湘潭电厂#1机",600,"111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"],
    [4,"常德电厂#1机",660,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [5,"永州电厂#2机组",1000,"111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"],
    [6,"涟源电厂#2机",300,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [7,"华岳电厂#1机",600,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [8,"华岳电厂#3机",600,"111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"],
    [9,"株洲第二电厂#2机",310,"111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"],
    [10,"攸县电厂#2机",660,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [11,"长沙电厂#1机",660,"111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"],
    [12,"益阳电厂#4机",650,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [13,"宝庆电厂#1机",660,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [14,"华容电厂#1机组",1000,"111111111100000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [15,"益阳电厂#2机",650,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [16,"长沙电厂#2机",660,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [17,"湘潭电厂#3机",600,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [18,"华岳电厂#6机",600,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [19,"石门电厂#2机",300,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [20,"耒阳电厂#4机",300,"111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"],
    [21,"金竹山电厂#1机",600,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [22,"黔东电厂#1机",600,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [23,"常德电厂#2机",660,"000000000000000000000000000000000000000000000000000000000000000000111111111111111111111111111111"],
    [24,"益阳电厂#5机",650,"111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"],
    [25,"湘潭电厂#2机",600,"111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"],
    [26,"益阳电厂#3机",650,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [27,"华岳电厂#4机",600,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [28,"长安石门电厂#4机",660,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [29,"益阳电厂#1机",650,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [30,"金竹山电厂#2机",600,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [31,"益阳电厂#6机",650,"111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"],
    [32,"黔东电厂#2机",600,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [33,"宝庆电厂#2机",660,"111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"],
    [34,"金竹山电厂#3机",600,"111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"],
    [35,"华容电厂#2机组",1000,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [36,"耒阳电厂#3机",300,"111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"],
    [37,"华岳电厂#5机",600,"111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"],
    [38,"攸县电厂#1机",660,"111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"],
    [39,"株洲第二电厂#1机",310,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [40,"湘潭电厂#4机",600,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [41,"永州电厂#1机组",1000,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [42,"平江电厂#2机组",1000,"111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"],
    [43,"平江电厂#1机组",1000,"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],
    [44,"涟源电厂#1机",300,"111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"]
  ];
  function getHunanInfoOperatingStatus(statusText) {
    if (statusText.indexOf("1") < 0) {
      return "检修";
    }
    if (statusText.indexOf("0") < 0) {
      return "运行";
    }
    return "受限运行";
  }

  function shiftStatusText(statusText, offset) {
    var normalizedOffset = offset % statusText.length;
    if (!normalizedOffset) {
      return statusText;
    }
    return statusText.slice(normalizedOffset) + statusText.slice(0, normalizedOffset);
  }

  function buildHunanInfoUnitStatusRows(rawRows, runDate, statusOffset) {
    var resolvedRunDate = runDate || hunanInfoUnitStatusDate;
    return rawRows.map(function mapRawUnit(row) {
      var statusText = shiftStatusText(row[3], statusOffset || 0);
      var formattedRow = {
        sequence: row[0],
        date: resolvedRunDate,
        runDate: resolvedRunDate,
        sourceDate: hunanInfoUnitStatusSourceDate,
        unitCode: "HN-GEN-" + String(row[0]).padStart(3, "0"),
        unitName: row[1],
        installedCapacityMw: row[2],
        operatingStatus: getHunanInfoOperatingStatus(statusText),
        updatedAt: hunanInfoUnitStatusUpdatedAt,
      };

      hunanInfoDisclosureTimeLabels.forEach(function eachTime(time, index) {
        formattedRow[time] = Number(statusText.charAt(index));
      });

      return formattedRow;
    });
  }

  var hunanUnifiedUnitStatusRows = hunanInfoDailyMockDates.reduce(function accumulateUnitRows(result, runDate, dateIndex) {
    return result.concat(buildHunanInfoUnitStatusRows(hunanInfoUnitStatusRawRows, runDate, dateIndex % 4));
  }, []);
  var hunanInfoMaintenanceCapacityValues = hunanInfoDisclosureTimeLabels.map(function mapMaintenanceCapacity(_, index) {
    return hunanInfoUnitStatusRawRows.reduce(function sumCapacity(total, row) {
      return total + (row[3].charAt(index) === "0" ? row[2] : 0);
    }, 0);
  });
  var hunanInfoMaintenanceUnitCountValues = hunanInfoDisclosureTimeLabels.map(function mapMaintenanceCount(_, index) {
    return hunanInfoUnitStatusRawRows.reduce(function countUnit(total, row) {
      return total + (row[3].charAt(index) === "0" ? 1 : 0);
    }, 0);
  });
  var hunanInfoMaintenanceCapacitySeries = createSeries(
    "maintenanceCapacityMw",
    "机组检修容量",
    hunanInfoDisclosureTimeLabels,
    hunanInfoMaintenanceCapacityValues,
    "MW",
  );
  var hunanInfoMaintenanceSummaryRows = buildDateRange("2026-07-05", 7).map(function mapMaintenanceSummary(date, index) {
    var predictedTotals = [7607.04, 7977.04, 7727.04, 4290.6, 3835.6, 3835.6, 3355.6];
    var predictedUnitTotals = [4597.04, 4767.04, 4467.04, 1810.6, 1675.6, 1675.6, 1195.6];
    return {
      date: date,
      predictedTotalCapacity: predictedTotals[index],
      predictedUnitTotalCapacity: predictedUnitTotals[index],
      actualTotalCapacity: index < 5 ? 0 : null,
      actualUnitTotalCapacity: index < 5 ? 0 : null,
    };
  });
  var hunanInfoMaintenanceScheduleRawRows = [
    [1,"湖南.湘潭B5厂","湖南.湘潭B5厂/20kV.#4机","20kV","2026-04-17 10:49","2026-06-15 18:00"],
    [2,"牛排山风电场","牛排山风电场#23机组","0.6kV","2026-05-07 09:00","2026-05-14 22:00"],
    [3,"华中.华容电厂","华中.华容电厂/27kV.#2机","27kV","2026-04-16 00:02","2026-05-25 23:59"],
    [4,"益阳B5火电厂","益阳电厂#4机","20kV","2026-04-18 08:00","2026-05-12 23:59"],
    [5,"黔东A5火电厂","黔东电厂#2机","20kV","2026-05-05 08:00","2026-05-29 18:00"],
    [6,"华中.黑麋峰厂","华中.黑麋峰厂/18kV.#1机","18kV","2026-05-07 10:36","2026-05-13 07:59"],
    [7,"浦宁燃气发电厂","浦宁电厂#1机","20kV","2026-04-12 08:00","2026-06-05 18:00"],
    [8,"金竹山B5火电厂","金竹山电厂#1机","20kV","2026-04-17 08:00","2026-06-10 18:00"],
    [9,"岩门口A2火电厂","岩门口电厂#1G","20kV","2026-05-03 08:00","2026-05-30 18:00"],
    [10,"华岳B2火电厂","华岳电厂#5机","20kV","2026-05-09 08:00","2026-06-12 23:00"],
    [11,"长安石门B5火电厂","长安石门电厂#3机","20kV","2026-04-27 08:00","2026-05-08 18:00"],
    [12,"湘潭B5火电厂","湘潭电厂#4机","20kV","2026-04-17 08:00","2026-06-15 18:00"],
    [13,"牛排山风电场","牛排山风电场#27机组","0.6kV","2026-05-07 09:00","2026-05-14 22:00"],
    [14,"湖南.黔东A5厂","湖南.黔东A5厂/20kV.#2机","20kV","2026-05-05 11:55","2026-05-29 18:00"],
    [15,"牛排山风电场","牛排山风电场#5机组","0.6kV","2026-05-07 09:00","2026-05-14 22:00"],
    [16,"牛排山风电场","牛排山风电场#20机组","0.6kV","2026-05-07 09:00","2026-05-14 22:00"],
    [17,"湖南.永州A2厂","湖南.永州A2厂/27kV.#1机","27kV","2026-04-27 09:05","2026-06-15 23:00"],
    [18,"常德A2火电厂","常德电厂#1机","20kV","2026-05-01 08:00","2026-05-28 18:00"],
    [19,"绥宁储能电站","绥宁储能电站#1储能单元","35kV","2026-05-06 08:00","2026-05-08 20:00"],
    [20,"牛排山风电场","牛排山风电场#9机组","0.6kV","2026-05-07 09:00","2026-05-14 22:00"],
    [21,"牛排山风电场","牛排山风电场#13机组","0.6kV","2026-05-07 09:00","2026-05-14 22:00"],
    [22,"长沙A5火电厂","长沙电厂#2机","20kV","2026-04-27 08:00","2026-06-15 23:00"],
    [23,"涟源A2火电厂","涟源电厂#2机","20kV","2026-04-01 00:00","2026-05-30 23:50"],
    [24,"白竹洲水电厂","白竹洲电厂#3机组","6kV","2025-11-01 08:00","2026-04-30 18:00"],
    [25,"湖南.金竹山B5厂","湖南.金竹山B5厂/20kV.#1机","20kV","2026-04-17 09:46","2026-06-10 18:00"],
    [26,"牛排山风电场","牛排山风电场#4机组","0.6kV","2026-05-07 09:00","2026-05-14 22:00"],
    [27,"华岳C5火电厂","华岳电厂#6机","20kV","2026-04-09 08:00","2026-05-08 23:00"],
    [28,"牛排山风电场","牛排山风电场#3机组","0.6kV","2026-05-07 09:00","2026-05-14 22:00"],
    [29,"华中.平江A5厂","华中.平江A5厂/27kV.#1机","27kV","2026-05-04 07:37","2026-05-31 11:00"],
    [30,"挂治水电厂","挂治电厂#3机","10kV","2026-04-18 08:00","2026-05-12 18:00"],
    [31,"永州A2电厂","永州电厂#1机组","27kV","2026-04-27 00:00","2026-06-15 23:00"],
    [32,"湖南.华电长沙A5厂","湖南.华电长沙A5厂/20kV.#2机","20kV","2026-04-27 13:33","2026-06-15 23:00"],
    [33,"湖南.益阳B5厂","湖南.益阳B5厂/20kV.#4机","20kV","2026-04-18 07:29","2026-05-12 23:59"],
    [34,"国调.韶山换流站","国调.韶山换流站/20kV.1T调相机","20kV","2026-05-07 02:31","2026-05-10 18:00"],
    [35,"资兴煤矸石火电厂","资兴煤矸石电厂#3机组","10kV","2026-05-02 08:00","2026-05-19 18:00"]
  ];
  function createHunanUnifiedMaintenanceScheduleRow(row, planDate, sequence, offsetHours) {
    var startDate = new Date(row[4].replace(" ", "T"));
    var endDate = new Date(row[5].replace(" ", "T"));

    startDate.setHours(startDate.getHours() + (offsetHours || 0));
    endDate.setHours(endDate.getHours() + (offsetHours || 0));

    return {
      date: planDate,
      planDate: planDate,
      sequence: sequence,
      plantName: row[1],
      equipmentName: row[2],
      voltageLevel: row[3],
      startTime: formatDate(startDate) + " " + String(startDate.getHours()).padStart(2, "0") + ":" + String(startDate.getMinutes()).padStart(2, "0"),
      endTime: formatDate(endDate) + " " + String(endDate.getHours()).padStart(2, "0") + ":" + String(endDate.getMinutes()).padStart(2, "0"),
      updatedAt: hunanInfoMockUpdateTime,
    };
  }

  var hunanUnifiedMaintenanceScheduleRows = [];
  var hunanUnifiedMaintenanceCurrentIndexes = [0, 1, 2, 3, 4, 5, 9, 12, 18, 33];
  var hunanUnifiedMaintenanceCompareIndexes = [0, 1, 2, 3, 6, 8, 12, 18, 22, 30];

  ["2026-05-08"].concat(hunanInfoDailyMockDates).forEach(function eachMaintenanceDate(planDate, dateIndex) {
    var planIndexes = dateIndex === 0 || dateIndex % 2 === 0
      ? hunanUnifiedMaintenanceCompareIndexes
      : hunanUnifiedMaintenanceCurrentIndexes;
    planIndexes.forEach(function eachPlan(rawIndex, index) {
      hunanUnifiedMaintenanceScheduleRows.push(
        createHunanUnifiedMaintenanceScheduleRow(
          hunanInfoMaintenanceScheduleRawRows[rawIndex],
          planDate,
          index + 1,
          ((dateIndex + index) % 3) - 1,
        ),
      );
    });
  });
  var hunanUnifiedMaintenancePage = createPageData({
    center: "hunan",
    tabKey: "机组检修容量",
    hasDataSource: true,
    title: "机组检修容量",
    description: "湖南交易中心信息披露页按样例文件转换的机组检修容量与检修计划 mock 数据。",
    updateTime: hunanInfoUnitStatusUpdatedAt,
    dataUpdateTime: hunanInfoUnitStatusUpdatedAt,
    publishTime: hunanInfoMockPublishTime,
    dataPublishTime: hunanInfoMockPublishTime,
    dataSource: "数据披露数据",
    source: "数据披露数据",
    unit: "MW",
    filters: {
      date: hunanInfoUnitStatusDate,
      granularity: "15min",
      primaryTab: "负荷信息",
      secondaryTab: "机组检修容量",
    },
    fileList: [
      {
        id: "hn-info-unit-status-source",
        fileName: "8.1._【事后】机组状态 (1).xlsx",
        fileType: "XLSX",
        publishTime: hunanInfoMockPublishTime,
        size: "248KB",
        downloadUrl: "#",
      },
      {
        id: "hn-info-maintenance-plan-source",
        fileName: "发输变电设备检修计划-日 (1).xlsx",
        fileType: "XLSX",
        publishTime: hunanInfoMockPublishTime,
        size: "55KB",
        downloadUrl: "#",
      },
    ],
    viewType: "maintenanceComposite",
    maintenanceChart: {
      title: "机组检修容量趋势图",
      labels: hunanInfoDisclosureTimeLabels.slice(),
      unit: "MW",
      series: [
        {
          id: "hn-info-maintenance-capacity",
          label: "机组检修容量",
          color: "#1677FF",
          values: hunanInfoMaintenanceCapacityValues.slice(),
        },
      ],
    },
    chartSeries: [hunanInfoMaintenanceCapacitySeries],
    summaryCards: buildSummaryCardsFromStats(hunanInfoMaintenanceCapacitySeries.stats, "MW", [
      { label: "检修机组数峰值", value: Math.max.apply(null, hunanInfoMaintenanceUnitCountValues), unit: "台" },
      { label: "检修计划数", value: hunanUnifiedMaintenanceScheduleRows.length, unit: "条" },
    ]),
    unitStatusTable: {
      title: "机组检修容量明细表",
      columns: [
        { key: "date", title: "日期" },
        { key: "predictedTotalCapacity", title: "预测总容量(MW)" },
        { key: "predictedUnitTotalCapacity", title: "预测机组总容量(MW)" },
        { key: "actualTotalCapacity", title: "实际总容量(MW)" },
        { key: "actualUnitTotalCapacity", title: "实际机组总容量(MW)" },
      ],
      data: hunanInfoMaintenanceSummaryRows,
      minWidth: 1280,
    },
    extraTables: [
      {
        title: "表1 发输变电设备检修计划",
        columns: [
          { key: "sequence", title: "序号" },
          { key: "plantName", title: "电厂名称" },
          { key: "equipmentName", title: "发输变电设备" },
          { key: "voltageLevel", title: "电压等级" },
          { key: "startTime", title: "开始时间" },
          { key: "endTime", title: "结束时间" },
        ],
        data: hunanUnifiedMaintenanceScheduleRows,
        minWidth: 1320,
      },
    ],
    tableColumns: [
      { key: "date", title: "日期" },
      { key: "predictedTotalCapacity", title: "预测总容量(MW)" },
      { key: "predictedUnitTotalCapacity", title: "预测机组总容量(MW)" },
      { key: "actualTotalCapacity", title: "实际总容量(MW)" },
      { key: "actualUnitTotalCapacity", title: "实际机组总容量(MW)" },
    ],
    tableData: hunanInfoMaintenanceSummaryRows,
    emptyText: "当前日期暂无湖南机组检修容量 mock 数据。",
  });
  var hunanInfoPositiveReserveValues = [
    5350.1, 5355.0, 5811.3, 6209.0, 6405.8, 6871.3, 6958.9, 7243.2, 7479.4, 6674.2, 6352.8, 6329.7,
    6305.8, 6353.3, 6443.4, 6609.6, 6387.4, 6194.0, 6414.5, 6432.8, 6464.5, 6247.0, 6090.7, 5801.2,
    6092.3, 5971.7, 5970.4, 6187.2, 6500.0, 6736.7, 7207.1, 6764.5, 6799.3, 6686.5, 7073.1, 6967.6,
    7246.9, 7431.8, 7427.6, 7426.9, 7009.2, 7331.5, 6744.1, 6904.7, 7201.5, 7393.3, 7370.6, 7494.1,
    6653.6, 6704.2, 6331.1, 6805.3, 6188.5, 6306.9, 6086.0, 6530.2, 6823.1, 6668.0, 6479.1, 6251.6,
    6222.3, 5887.1, 6173.6, 6427.8, 6597.2, 6465.0, 6038.1, 6150.7, 5700.2, 5805.1, 5972.1, 6263.6,
    6038.3, 5750.4, 6136.0, 5912.4, 5837.9, 5837.7, 5665.4, 5356.2, 5695.5, 5592.3, 5053.4, 5041.6,
    5109.4, 5267.2, 5508.1, 5733.8, 5515.8, 5896.8, 6076.9, 6796.6, 6886.1, 6816.9, 7207.7, 6986.9
  ];
  var hunanInfoNegativeReserveValues = [
    1145.9, 699.0, 76.7, 55.0, 0.0, 451.7, 384.1, 83.8, 275.6, 309.8, 807.2, 707.3,
    440.2, 554.7, 866.6, 358.4, 363.6, 547.0, 317.5, 556.2, 448.5, 540.0, 1023.3, 874.8,
    2299.7, 1812.3, 1572.6, 1480.8, 1061.0, 241.3, 490.9, 440.5, 29.7, 21.5, 174.9, 103.4,
    0.0, 0.0, 0.0, 172.1, 90.8, 0.0, 1151.9, 0.0, 115.5, 0.0, 251.4, 0.0,
    797.4, 604.8, 620.9, 0.0, 2309.5, 1896.1, 1920.0, 1086.8, 342.9, 0.0, 773.9, 786.4,
    746.7, 1123.9, 479.4, 237.2, 797.8, 1139.0, 609.9, 439.3, 1164.8, 926.9, 1102.9, 240.4,
    450.7, 849.6, 446.0, 708.6, 787.1, 798.3, 961.6, 1261.8, 896.5, 979.7, 1408.6, 1301.4,
    1310.6, 992.8, 579.9, 315.2, 391.2, 0.0, 0.0, 472.4, 241.9, 114.1, 0.0, 0.0
  ];
  var hunanUnifiedReserveRows = expandRowsByHunanInfoDates(hunanInfoDisclosureTimeLabels.map(function mapReserveRow(time, index) {
    return {
      date: standardDefaultDate,
      time: time,
      positiveReserve: hunanInfoPositiveReserveValues[index],
      negativeReserve: hunanInfoNegativeReserveValues[index],
      source: hunanInfoMockSource,
      updatedAt: buildUpdatedAt(dataUpdatedAt, -3),
    };
  }), ["date"]);
  var hunanUnifiedReservePage = createPageData({
    center: "hunan",
    tabKey: "备用信息",
    hasDataSource: true,
    title: "备用信息",
    description: "湖南交易中心信息披露页按系统备用信息样例文件转换的正负备用 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -3),
    dataUpdateTime: buildUpdatedAt(dataUpdatedAt, -3),
    publishTime: hunanInfoMockPublishTime,
    dataPublishTime: hunanInfoMockPublishTime,
    dataSource: hunanInfoMockSource,
    source: hunanInfoMockSource,
    unit: "MW",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "负荷信息",
      secondaryTab: "备用信息",
    },
    fileList: [
      {
        id: "hn-info-reserve-source",
        fileName: "8.7._【事后】系统备用信息 (1).xlsx",
        fileType: "XLSX",
        publishTime: hunanInfoMockPublishTime,
        size: "29KB",
        downloadUrl: "#",
      },
    ],
    viewType: "lineTable",
    chartTitle: "系统备用信息趋势图",
    chartUnit: "MW",
    labelKey: "time",
    tooltipMode: "reserveDual",
    seriesDefinitions: [
      { id: "hn-info-reserve-positive", label: "正备用", color: "#1677FF", valueKey: "positiveReserve" },
      { id: "hn-info-reserve-negative", label: "负备用", color: "#2FCB8F", valueKey: "negativeReserve" },
    ],
    chartSeries: [
      createSeries("positiveReserve", "正备用", hunanInfoDisclosureTimeLabels, hunanInfoPositiveReserveValues, "MW"),
      createSeries("negativeReserve", "负备用", hunanInfoDisclosureTimeLabels, hunanInfoNegativeReserveValues, "MW"),
    ],
    tableColumns: [
      { key: "time", title: "时刻" },
      { key: "positiveReserve", title: "正备用（MW）" },
      { key: "negativeReserve", title: "负备用（MW）" },
    ],
    tableData: hunanUnifiedReserveRows,
    tableMinWidth: 900,
    emptyText: "当前日期暂无湖南备用信息 mock 数据。",
  });
  var hunanInfoDayAheadDeclarationPowerValues = [
    46.285, 60.213, 52.438, 39.831, 31.011, 25.846, 22.929, 20.118, 19.358, 17.406, 16.643, 15.703,
    14.939, 14.141, 13.651, 13.591, 13.665, 14.22, 15.488, 17.918, 21.171, 24.931, 24.186, 18.156,
    9.842, 7.568, 6.966, 6.488, 6.091, 6.445, 6.685, 7.053, 7.371, 8.057, 8.562, 8.651,
    8.264, 8.591, 9.19, 9.132, 9.202, 9.711, 10.065, 10.776, 10.109, 10.206, 10.75, 14.371,
    53.526, 64.453, 58.921, 53.266, 48.804, 46.326, 42.191, 34.27, 19.826, 14.896, 13.561, 14.206,
    14.891, 16.044, 15.68, 12.823, 8.069, 6.292, 5.773, 5.572, 5.515, 5.0, 4.727, 4.24,
    4.041, 3.822, 3.99, 4.252, 4.364, 4.663, 4.541, 4.177, 3.96, 3.943, 3.963, 3.889,
    4.692, 4.176, 3.695, 3.533, 3.391, 3.272, 2.959, 2.92, 2.903, 2.676, 2.373, 3.04
  ];
  var hunanUnifiedDeclarationRows = hunanInfoDayAheadDeclarationPowerValues.map(function mapDeclarationRow(value, index) {
    return {
      date: standardDefaultDate,
      time: hunanInfoDisclosureTimeLabels[index],
      powerMw: value,
    };
  });
  var hunanUnifiedDeclarationPage = createPageData({
    center: "hunan",
    tabKey: "日前申报",
    hasDataSource: true,
    title: "日前申报",
    description: "湖南交易中心信息披露页按电能量申报数据样例文件转换的日前申报电力 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -8),
    dataUpdateTime: buildUpdatedAt(dataUpdatedAt, -8),
    publishTime: hunanInfoMockPublishTime,
    dataPublishTime: hunanInfoMockPublishTime,
    dataSource: hunanInfoMockSource,
    source: hunanInfoMockSource,
    unit: "MW",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "日前申报",
      secondaryTab: "",
    },
    fileList: [
      {
        id: "hn-info-dayahead-declaration-source",
        fileName: "电能量申报数据 (1) (1).xlsx",
        fileType: "XLSX",
        publishTime: hunanInfoMockPublishTime,
        size: "12KB",
        downloadUrl: "#",
      },
    ],
    viewType: "lineTable",
    chartTitle: "日前申报电力趋势图",
    chartUnit: "MW",
    labelKey: "time",
    datePickerMode: "single",
    dateLabel: "运行日期",
    seriesDefinitions: [
      { id: "hn-info-dayahead-declaration-power", label: "日前申报电力", color: "#1677FF", valueKey: "powerMw" },
    ],
    chartSeries: [createSeries("dayAheadDeclarationPower", "日前申报电力", hunanUnifiedDeclarationRows.map(function mapRow(row) { return row.time; }), hunanInfoDayAheadDeclarationPowerValues, "MW")],
    tableColumns: [
      { key: "time", title: "时刻" },
      { key: "powerMw", title: "申报电力（MW）" },
    ],
    tableData: hunanUnifiedDeclarationRows,
    tableMinWidth: 640,
    emptyText: "当前日期暂无湖南日前申报 mock 数据。",
  });
  var hunanMarketPageData = {
    defaultDate: standardDefaultDate,
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
      infoEnterpriseProfile: hunanUnifiedEnterprisePage,
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
      infoEmptySaleCompany: createHunanInfoEmptyPage(
        "售电公司分时电量",
        "售电公司分时电量",
        "",
        "湖南交易中心当前暂未接入售电公司分时电量披露数据。",
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
              "备用信息": "infoReserve",
              "机组状态": "infoMaintenanceComposite",
              "发输变电设备检修计划": "infoMaintenanceComposite",
            },
          },
          "全省统一出清价": "infoUnifiedPrice",
          "出清电量": "infoEmptyVolume",
          "交易结果": "infoEmptyTradeResult",
          "售电公司分时电量": "infoSaleCompanyProfile",
          "用电企业分时电量": "infoEnterpriseProfile",
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
    dataPublishTime: "2026-07-31 09:58:00",
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
      statusText: "数据更新时间：2026-07-31 10:46:12（湖南交易中心日清算PDF解析）",
      publishTime: "2026-07-31 17:46:20",
      tabs: ["日清算", "月结算"],
      dailyRows: settlementDailyRows,
      monthRows: settlementMonthRows,
      monthlySettlementData: hunanMonthlySettlementData,
    },
    retailRelation: {
      title: "零售关系",
      centerName: "湖南电力交易中心",
      statusText: "数据更新时间：2026-07-31 10:58:40（湖南交易中心零售关系台账）",
      publishTime: "2026-07-31 10:30:00",
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
      statusText: "数据更新时间：2026-07-31 10:39:26（湖南交易中心滚搓任务）",
      publishTime: "2026-07-31 10:08:00",
      defaultRange: defaultRange,
      productOptions: rollingDataProducts,
      rows: rollingDataRows,
      longTermTradeResult: {
        defaultRange: defaultRange,
        productOptions: hunanRollingTradeProducts,
        contractPeriodOptions: hunanRollingContractPeriods,
        rows: hunanRollingDetailedRows,
      },
      dailyMarket: rollingDailyMarket,
      multiDay: rollingMultiDay,
      primaryTabs: ["单日行情", "多日行情"],
      dailySubTabs: ["买卖价格", "买卖电量", "滚搓行情"],
      rollingMetricOptions: ["成交电量", "成交价格"],
      dimensionOptions: ["时间维度", "日维度"],
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
      "中衡直流（日前）预测": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 1680,
        dayAmplitude: 138,
        peakAmplitude: 210,
        dayShift: 4,
        peakShift: 12,
        dayIncrement: 9,
        modBase: 4,
        modOffset: 1.5,
        noise: 9,
        source: "湖南省间联络线预测-中衡直流（日前）",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -22),
      }),
      "中衡直流（日前）实绩": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 1625,
        dayAmplitude: 152,
        peakAmplitude: 226,
        dayShift: 5,
        peakShift: 13,
        dayIncrement: 8,
        modBase: 4,
        modOffset: 1.5,
        noise: 10,
        source: "湖南省间联络线实绩-中衡直流（日前）",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -8),
      }),
      "主网送湘（日前）预测": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 2150,
        dayAmplitude: 172,
        peakAmplitude: 248,
        dayShift: 3,
        peakShift: 14,
        dayIncrement: 11,
        modBase: 4,
        modOffset: 1.5,
        noise: 11,
        source: "湖南省间联络线预测-主网送湘（日前）",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -22),
      }),
      "主网送湘（日前）实绩": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 2085,
        dayAmplitude: 190,
        peakAmplitude: 266,
        dayShift: 4,
        peakShift: 15,
        dayIncrement: 10,
        modBase: 4,
        modOffset: 1.5,
        noise: 12,
        source: "湖南省间联络线实绩-主网送湘（日前）",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -8),
      }),
      "祁韶直流（日前）预测": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 1080,
        dayAmplitude: 94,
        peakAmplitude: 156,
        dayShift: 6,
        peakShift: 13,
        dayIncrement: 6,
        modBase: 4,
        modOffset: 1.5,
        noise: 8,
        source: "湖南省间联络线预测-祁韶直流（日前）",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -22),
      }),
      "祁韶直流（日前）实绩": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 1038,
        dayAmplitude: 106,
        peakAmplitude: 168,
        dayShift: 7,
        peakShift: 14,
        dayIncrement: 5,
        modBase: 4,
        modOffset: 1.5,
        noise: 8,
        source: "湖南省间联络线实绩-祁韶直流（日前）",
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
