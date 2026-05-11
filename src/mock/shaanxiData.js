(function attachShaanxiDataMock(global) {
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

  function convertQuarterToHourly(values96) {
    return Array.from({ length: 24 }, function createValue(_, index) {
      return round(values96.slice(index * 4, index * 4 + 4).reduce(function accumulate(total, value) {
        return total + value;
      }, 0));
    });
  }

  function buildConversionSummary(hourlyValues) {
    var maxValue = Math.max.apply(null, hourlyValues);
    var minValue = Math.min.apply(null, hourlyValues);
    var maxIndex = hourlyValues.indexOf(maxValue);
    var minIndex = hourlyValues.indexOf(minValue);
    return "24 段转换完成，峰值 " + pad(maxIndex) + ":00=" + maxValue + " MWh，谷值 " + pad(minIndex) + ":00=" + minValue + " MWh";
  }

  function buildQuarterlySalesRow(date, dayIndex) {
    var quarterValues = buildTimeLabels(15, 96).map(function createValue(_, index) {
      var hour = Math.floor(index / 4);
      var daytime = Math.max(0, Math.sin(((hour - 7) / 24) * Math.PI * 2)) * 46;
      var evening = Math.max(0, Math.sin(((hour - 14) / 24) * Math.PI * 2)) * 66;
      var valley = hour < 6 ? -20 : 0;
      var intraHour = [0, 4, -3, 6][index % 4];
      var base = 152 + dayIndex * 3.6 + daytime + evening + valley + intraHour;
      return Math.round(base);
    });
    var converted24Values = convertQuarterToHourly(quarterValues);
    return {
      date: date,
      quarterValues: quarterValues,
      total96: sum(quarterValues),
      converted24Values: converted24Values,
      conversionSummary: buildConversionSummary(converted24Values),
    };
  }

  function buildPriceRows(dates, basePrice, source, updatedAt) {
    return dates.reduce(function accumulateRows(result, date, dayIndex) {
      return result.concat(
        buildTimeLabels(60, 24).map(function createRow(time, hour) {
          var daytime = Math.max(0, Math.sin(((hour - 8) / 24) * Math.PI * 2)) * 14;
          var peak = Math.max(0, Math.sin(((hour - 15) / 24) * Math.PI * 2)) * 24;
          var dayahead = round(basePrice + dayIndex * 2.6 + daytime + peak + ((hour % 3) - 1) * 4.2);
          var realtime = round(dayahead + ((hour % 6) - 2.5) * 3.5 + (dayIndex % 2 === 0 ? 6.8 : -5.2));
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

  var quarterHours = buildTimeLabels(15, 96);
  var hours = buildTimeLabels(60, 24);
  var availableDates = buildDateRange("2026-04-26", 14);
  var defaultRange = {
    start: "2026-05-03",
    end: "2026-05-09",
  };
  var dataUpdatedAt = "2026-05-09 10:41:06";
  var dataSource = "陕西电力交易中心信息披露";
  var weightedPriceRows = buildPriceRows(availableDates, 328, "陕西用户侧加权电价口径", buildUpdatedAt(dataUpdatedAt, -16));
  var saleCompanyRows = availableDates.map(buildQuarterlySalesRow);
  var average96Values = averageBySlot(saleCompanyRows, "quarterValues");
  var average24Values = averageBySlot(saleCompanyRows, "converted24Values");
  var settlementDates = buildDateRange("2026-05-03", 7);
  var settlementDailyTemplates = [
    { enterpriseCode: "SXQY001", enterpriseName: "西安高新补能中心", accountNo: "SX0001" },
    { enterpriseCode: "SXQY002", enterpriseName: "咸阳物流港充电站", accountNo: "SX0002" },
    { enterpriseCode: "SXQY003", enterpriseName: "宝鸡公交能源站", accountNo: "SX0003" },
    { enterpriseCode: "SXQY004", enterpriseName: "渭南产业园综合站", accountNo: "SX0004" },
  ];
  var settlementDailyRows = [];
  settlementDates.forEach(function eachSettlementDate(date, dayIndex) {
    settlementDailyTemplates.forEach(function eachTemplate(template, templateIndex) {
      var energy = 7020 + dayIndex * 240 + templateIndex * 390;
      var dayaheadFee = 318000 + dayIndex * 10400 + templateIndex * 15200;
      var realtimeFee = 92600 + dayIndex * 4800 + templateIndex * 6900;
      var deviationFee = 12600 + dayIndex * 530 + templateIndex * 760;
      var imbalanceFee = 7200 + dayIndex * 360 + templateIndex * 560;
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
    { month: "2026-05", enterpriseCode: "SXQY001", enterpriseName: "西安高新补能中心", accountNo: "SX0001", energy: 236400, fee: 10680000, agencyIncome: 258000, status: "已出账" },
    { month: "2026-05", enterpriseCode: "SXQY002", enterpriseName: "咸阳物流港充电站", accountNo: "SX0002", energy: 224200, fee: 10030000, agencyIncome: 244000, status: "已出账" },
    { month: "2026-05", enterpriseCode: "SXQY003", enterpriseName: "宝鸡公交能源站", accountNo: "SX0003", energy: 208600, fee: 9360000, agencyIncome: 226000, status: "结算中" },
    { month: "2026-05", enterpriseCode: "SXQY004", enterpriseName: "渭南产业园综合站", accountNo: "SX0004", energy: 192500, fee: 8640000, agencyIncome: 209000, status: "待确认" },
    { month: "2026-04", enterpriseCode: "SXQY001", enterpriseName: "西安高新补能中心", accountNo: "SX0001", energy: 228700, fee: 10320000, agencyIncome: 250000, status: "已出账" },
    { month: "2026-04", enterpriseCode: "SXQY002", enterpriseName: "咸阳物流港充电站", accountNo: "SX0002", energy: 216500, fee: 9720000, agencyIncome: 237000, status: "已出账" },
    { month: "2026-04", enterpriseCode: "SXQY003", enterpriseName: "宝鸡公交能源站", accountNo: "SX0003", energy: 201300, fee: 9080000, agencyIncome: 220000, status: "已出账" },
    { month: "2026-04", enterpriseCode: "SXQY004", enterpriseName: "渭南产业园综合站", accountNo: "SX0004", energy: 186900, fee: 8430000, agencyIncome: 204000, status: "已出账" },
  ];
  var retailRelationRows = [
    { userCode: "SXUSER001", userName: "西安高新补能中心", accountNo: "SX0001", microgridName: "西安高新微电网", startDate: "2026-01-01", endDate: "2026-12-31", status: "合作中", sellerCompany: "滴滴电力（陕西）有限公司" },
    { userCode: "SXUSER002", userName: "咸阳物流港充电站", accountNo: "SX0002", microgridName: "-", startDate: "2025-10-01", endDate: "2026-09-30", status: "合作中", sellerCompany: "滴滴电力（陕西）有限公司" },
    { userCode: "SXUSER003", userName: "宝鸡公交能源站", accountNo: "SX0003", microgridName: "-", startDate: "2025-07-01", endDate: "2026-06-30", status: "即将到期", sellerCompany: "滴滴电力（陕西）有限公司" },
    { userCode: "SXUSER004", userName: "渭南产业园综合站", accountNo: "SX0004", microgridName: "渭南园区综合微电网", startDate: "2026-02-01", endDate: "2027-01-31", status: "合作中", sellerCompany: "滴滴电力（陕西）有限公司" },
    { userCode: "SXUSER005", userName: "榆林交通能源港", accountNo: "SX0005", microgridName: "-", startDate: "2024-03-01", endDate: "2025-11-30", status: "已结束", sellerCompany: "滴滴电力（陕西）有限公司" },
  ];
  var rollingDataProducts = ["全部", "月内滚搓", "日前平衡", "实时滚动"];
  var rollingDataPeriods = ["00:00-04:00", "04:00-08:00", "08:00-16:00", "16:00-24:00"];
  var rollingDataRows = [];
  settlementDates.forEach(function eachRollingDate(date, dayIndex) {
    rollingDataPeriods.forEach(function eachRollingPeriod(period, periodIndex) {
      var product = rollingDataProducts[(periodIndex % (rollingDataProducts.length - 1)) + 1];
      rollingDataRows.push({
        date: date,
        tradeCenter: "陕西电力交易中心",
        product: product,
        period: period,
        volume: 1320 + dayIndex * 105 + periodIndex * 145,
        averagePrice: round(338.2 + dayIndex * 3.1 + periodIndex * 6.9),
        updatedAt: buildUpdatedAt(dataUpdatedAt, -10),
      });
    });
  });

  var tabs = [
    "用户侧加权电价",
    "售电公司日电量",
    "系统负荷预测（日）",
    "实际负荷",
    "发电总出力",
    "非市场机组总出力",
    "新能源总出力",
    "水电（含抽蓄）出力",
    "省间联络线输电情况",
    "省间联络线输电曲线预测",
    "发电总出力预测",
    "非市场机组总出力预测",
    "新能源总出力预测（日）",
    "水电（含抽蓄）总出力预测（日）",
  ];

  global.BOSS_SHAANXI_DATA_MOCK = {
    pageKey: "sx-data-disclosure",
    tradeCenterName: "陕西电力交易中心",
    title: "陕西电力交易中心",
    description: "陕西交易中心用于展示用户侧加权电价、售电公司日电量及供需运行相关的数据披露内容。",
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
        start: "2026-04-08",
        end: "2026-04-10",
      },
      message: "所选日期暂无陕西交易中心已入库文件，页面展示空状态。",
    },
    errorExample: {
      range: {
        start: "2026-05-07",
        end: "2026-05-07",
      },
      message: "2026-05-07 11:45 批次 96 点数据存在缺段，页面以最近成功批次补齐并提示人工复核。",
      source: "陕西交易中心取数链路告警",
      updatedAt: "2026-05-07 12:03:44",
    },
    settlement: {
      title: "日清月结",
      centerName: "陕西电力交易中心",
      statusText: "数据更新时间：2026-05-09 10:52:48（陕西交易中心结算任务）",
      tabs: ["日清算", "月结算"],
      dailyRows: settlementDailyRows,
      monthRows: settlementMonthRows,
    },
    retailRelation: {
      title: "零售关系",
      centerName: "陕西电力交易中心",
      statusText: "数据更新时间：2026-05-09 11:04:26（陕西交易中心零售关系台账）",
      defaultRange: {
        start: "2026-01-01",
        end: "2026-12-31",
      },
      statusOptions: ["全部", "合作中", "即将到期", "已结束"],
      rows: retailRelationRows,
    },
    rollingData: {
      title: "滚搓数据",
      centerName: "陕西电力交易中心",
      statusText: "数据更新时间：2026-05-09 10:44:16（陕西交易中心滚搓任务）",
      defaultRange: {
        start: "2026-05-03",
        end: "2026-05-09",
      },
      productOptions: rollingDataProducts,
      rows: rollingDataRows,
    },
    modules: {
      "用户侧加权电价": {
        type: "dual-price",
        unit: "元/MWh",
        purpose: ["价格预测", "仿真回测"],
        chartData: {
          labels: weightedPriceRows.map(function mapRow(row) {
            return row.date.slice(5) + " " + row.time;
          }),
          dayahead: weightedPriceRows.map(function mapRow(row) {
            return row.dayaheadPrice;
          }),
          realtime: weightedPriceRows.map(function mapRow(row) {
            return row.realtimePrice;
          }),
        },
        tableRows: weightedPriceRows,
        source: "陕西用户侧加权电价口径",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -16),
      },
      "售电公司日电量": {
        type: "load-profile-96",
        unit: "MWh",
        purpose: ["负荷预测", "仿真回测"],
        source: "陕西售电公司分时电量",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -9),
        quarterHours: quarterHours,
        hours: hours,
        chartData: {
          latest96: saleCompanyRows[saleCompanyRows.length - 1].quarterValues.slice(),
          average96: average96Values.slice(),
          latest24: saleCompanyRows[saleCompanyRows.length - 1].converted24Values.slice(),
          average24: average24Values.slice(),
        },
        tableRows: saleCompanyRows,
      },
      "系统负荷预测（日）": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 21420,
        dayAmplitude: 860,
        peakAmplitude: 1380,
        dayShift: 6,
        peakShift: 14,
        dayIncrement: 68,
        modBase: 4,
        modOffset: 1.5,
        noise: 38,
        source: "陕西系统负荷预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -21),
      }),
      "实际负荷": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 21080,
        dayAmplitude: 920,
        peakAmplitude: 1450,
        dayShift: 6,
        peakShift: 15,
        dayIncrement: 62,
        modBase: 5,
        modOffset: 2,
        noise: 44,
        source: "陕西系统实际负荷",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -6),
      }),
      "发电总出力": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 22860,
        dayAmplitude: 780,
        peakAmplitude: 1210,
        dayShift: 5,
        peakShift: 14,
        dayIncrement: 56,
        modBase: 4,
        modOffset: 1.5,
        noise: 32,
        source: "陕西发电总出力实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -5),
      }),
      "非市场机组总出力": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 7060,
        dayAmplitude: 280,
        peakAmplitude: 410,
        dayShift: 4,
        peakShift: 12,
        dayIncrement: 22,
        modBase: 4,
        modOffset: 1.5,
        noise: 18,
        source: "陕西非市场机组实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -4),
      }),
      "新能源总出力": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 4380,
        dayAmplitude: 690,
        peakAmplitude: 910,
        dayShift: 8,
        peakShift: 11,
        dayIncrement: 28,
        modBase: 4,
        modOffset: 1.5,
        noise: 24,
        source: "陕西新能源实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -3),
      }),
      "水电（含抽蓄）出力": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 3180,
        dayAmplitude: 240,
        peakAmplitude: 360,
        dayShift: 3,
        peakShift: 10,
        dayIncrement: 16,
        modBase: 5,
        modOffset: 2,
        noise: 14,
        source: "陕西水电及抽蓄实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -2),
      }),
      "省间联络线输电情况": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 4360,
        dayAmplitude: 240,
        peakAmplitude: 386,
        dayShift: 4,
        peakShift: 13,
        dayIncrement: 14,
        modBase: 4,
        modOffset: 1.5,
        noise: 15,
        source: "陕西省间联络线实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -8),
      }),
      "省间联络线输电曲线预测": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 4480,
        dayAmplitude: 220,
        peakAmplitude: 358,
        dayShift: 4,
        peakShift: 13,
        dayIncrement: 16,
        modBase: 4,
        modOffset: 1.5,
        noise: 14,
        source: "陕西省间联络线预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -19),
      }),
      "发电总出力预测": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 23140,
        dayAmplitude: 760,
        peakAmplitude: 1180,
        dayShift: 5,
        peakShift: 14,
        dayIncrement: 58,
        modBase: 4,
        modOffset: 1.5,
        noise: 30,
        source: "陕西发电总出力预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -22),
      }),
      "非市场机组总出力预测": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 7220,
        dayAmplitude: 260,
        peakAmplitude: 390,
        dayShift: 4,
        peakShift: 12,
        dayIncrement: 24,
        modBase: 4,
        modOffset: 1.5,
        noise: 17,
        source: "陕西非市场机组预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -18),
      }),
      "新能源总出力预测（日）": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 4520,
        dayAmplitude: 660,
        peakAmplitude: 930,
        dayShift: 8,
        peakShift: 11,
        dayIncrement: 30,
        modBase: 4,
        modOffset: 1.5,
        noise: 22,
        source: "陕西新能源预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -17),
      }),
      "水电（含抽蓄）总出力预测（日）": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        base: 3300,
        dayAmplitude: 220,
        peakAmplitude: 340,
        dayShift: 3,
        peakShift: 10,
        dayIncrement: 18,
        modBase: 5,
        modOffset: 2,
        noise: 13,
        source: "陕西水电及抽蓄预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -15),
      }),
    },
  };
})(window);
