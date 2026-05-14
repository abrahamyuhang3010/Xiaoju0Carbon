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
      emptyText: options.emptyText || "当前筛选条件下暂无陕西交易中心 mock 数据。",
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
        publishTime: publishDate + " " + pad(9 + index) + ":" + pad((index * 11) % 60) + ":00",
        size: (1.3 + index * 0.2).toFixed(1) + "MB",
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

  var standardDefaultDate = "2026-05-09";
  var standardDefaultMonth = "2026-05";
  function calculateWeightedAverageForPairs(volumes, prices) {
    var totalVolume = volumes.reduce(function accumulate(total, value) {
      return total + Number(value || 0);
    }, 0);

    if (!totalVolume) {
      return 0;
    }

    return round(
      volumes.reduce(function accumulate(total, value, index) {
        return total + Number(value || 0) * Number(prices[index] || 0);
      }, 0) / totalVolume,
    );
  }

  var shaanxiCurveSequenceNames = ["全部", "陕售 5 月第 1 批", "陕售 5 月第 2 批", "陕售 5 月第 3 批"];
  var shaanxiCurveContractTypes = ["全部", "双边协商", "挂牌交易", "集中竞价"];
  var shaanxiCurveSellerUnits = ["全部", "关中绿电售电", "秦能售电", "渭电售电", "陕北联合售电"];
  var shaanxiCurveBuyerUnits = ["全部", "西安高新补能中心", "咸阳物流港充电站", "宝鸡公交能源站", "渭南产业园综合站"];
  var shaanxiCurveContractNames = ["全部", "西高新 5 月滚搓合同", "咸阳港 5 月滚搓合同", "宝鸡公交 5 月滚搓合同", "渭南园区 5 月滚搓合同"];
  var shaanxiRollingContractCurveRows = [];
  buildDateRange("2026-05-08", 2).forEach(function eachCurveDate(date, dayIndex) {
    shaanxiCurveContractNames.slice(1).forEach(function eachContractName(contractName, contractIndex) {
      var volume96 = buildWaveValues(15, 96, {
        base: 34 + dayIndex * 1.8 + contractIndex * 3.6,
        dayAmplitude: 6.8,
        peakAmplitude: 12.6,
        dayShift: 6,
        peakShift: 14,
        valleyEndHour: 6,
        valleyOffset: -5.2,
        driftPerStep: 0.03,
        pattern: [-1.2, 0.6, 1.4, -0.8],
      });
      var price96 = buildWaveValues(15, 96, {
        base: 312.4 + dayIndex * 1.9 + contractIndex * 2.8,
        dayAmplitude: 4.8,
        peakAmplitude: 10.6,
        dayShift: 7,
        peakShift: 13,
        pattern: [-0.9, 0.4, 0.8, -0.5],
      });
      shaanxiRollingContractCurveRows.push({
        curveDate: date,
        sequenceName: shaanxiCurveSequenceNames[(contractIndex % (shaanxiCurveSequenceNames.length - 1)) + 1],
        contractType: shaanxiCurveContractTypes[(contractIndex % (shaanxiCurveContractTypes.length - 1)) + 1],
        sellerUnit: shaanxiCurveSellerUnits[(contractIndex % (shaanxiCurveSellerUnits.length - 1)) + 1],
        buyerUnit: shaanxiCurveBuyerUnits[(contractIndex % (shaanxiCurveBuyerUnits.length - 1)) + 1],
        contractName: contractName,
        volume96: volume96,
        price96: price96,
        dayTotalVolume: sum(volume96),
        weightedAveragePrice: calculateWeightedAverageForPairs(volume96, price96),
        updatedAt: buildUpdatedAt(dataUpdatedAt, -9),
      });
    });
  });

  var shaanxiRollingTradeOverviewRows = [];
  buildDateRange("2026-05-08", 2).forEach(function eachTradeDate(date, dayIndex) {
    var weightedPriceValues = buildWaveValues(60, 24, {
      base: 318.2 + dayIndex * 2.4,
      dayAmplitude: 6.4,
      peakAmplitude: 12.8,
      dayShift: 7,
      peakShift: 14,
      pattern: [-1.2, 0.8, 1.1, -0.6],
    });
    var netContractVolumeValues = buildWaveValues(60, 24, {
      base: 1280 + dayIndex * 68,
      dayAmplitude: 146,
      peakAmplitude: 262,
      dayShift: 7,
      peakShift: 13,
      valleyEndHour: 6,
      valleyOffset: -108,
      pattern: [-16, 8, 18, -10],
      integer: true,
    });
    var dailyAveragePrice = average(weightedPriceValues);
    var monthlyAveragePrice = round(315.6 + dayIndex * 1.5);

    hours.forEach(function eachHour(time, hourIndex) {
      shaanxiRollingTradeOverviewRows.push({
        tradeDate: date,
        time: time,
        weightedPrice: weightedPriceValues[hourIndex],
        netContractVolume: netContractVolumeValues[hourIndex],
        dailyAveragePrice: dailyAveragePrice,
        monthlyAveragePrice: monthlyAveragePrice,
        updatedAt: buildUpdatedAt(dataUpdatedAt, -8),
      });
    });
  });

  var shaanxiRollingTradeOverviewFiles = buildMockFileList("sx", "rolling-trade-overview", standardDefaultDate, 3).map(function mapFile(file, index) {
    return {
      id: file.id,
      fileName: file.fileName,
      fileType: file.fileType,
      publishTime: file.publishTime,
      size: file.size,
      downloadUrl: file.downloadUrl,
      parseStatus: ["已解析", "待解析", "解析失败"][index % 3],
    };
  });
  var shaanxiDeclarationVolumeValues = buildWaveValues(60, 24, {
    base: 1180,
    dayAmplitude: 160,
    peakAmplitude: 280,
    dayShift: 7,
    peakShift: 14,
    valleyEndHour: 6,
    valleyOffset: -110,
    pattern: [-14, 10, 18, -8],
    integer: true,
  });
  var shaanxiDeclarationPriceValues = buildWaveValues(60, 24, {
    base: 326,
    dayAmplitude: 10,
    peakAmplitude: 18,
    dayShift: 7,
    peakShift: 14,
    pattern: [-1, 0.5, 1.2, -0.3],
  });
  var shaanxiDeclarationVolumeSeries = createSeries("declareVolume", "申报电量", hours, shaanxiDeclarationVolumeValues, "MWh", "bar");
  var shaanxiDeclarationPriceSeries = createSeries("declarePrice", "申报均价", hours, shaanxiDeclarationPriceValues, "元/MWh");
  var shaanxiDayAheadDeclarationRows = [
    { declarationDate: standardDefaultDate, declarationTime: "08:00", unitCode: "SX-DA-001", unitName: "关中负荷单元 A", segment: "早峰", declareVolume: 1280, declarePrice: 329.2, status: "已提交", updatedAt: buildUpdatedAt(dataUpdatedAt, -9) },
    { declarationDate: standardDefaultDate, declarationTime: "09:00", unitCode: "SX-DA-002", unitName: "西安综合单元 B", segment: "早峰", declareVolume: 1346, declarePrice: 333.8, status: "已提交", updatedAt: buildUpdatedAt(dataUpdatedAt, -9) },
    { declarationDate: standardDefaultDate, declarationTime: "10:00", unitCode: "SX-DA-003", unitName: "咸阳物流单元 C", segment: "平段", declareVolume: 1268, declarePrice: 325.6, status: "已回传", updatedAt: buildUpdatedAt(dataUpdatedAt, -9) },
    { declarationDate: standardDefaultDate, declarationTime: "12:00", unitCode: "SX-DA-004", unitName: "宝鸡公交单元 D", segment: "平段", declareVolume: 1292, declarePrice: 327.4, status: "已提交", updatedAt: buildUpdatedAt(dataUpdatedAt, -9) },
    { declarationDate: standardDefaultDate, declarationTime: "14:00", unitCode: "SX-DA-005", unitName: "渭南园区单元 E", segment: "午峰", declareVolume: 1386, declarePrice: 336.5, status: "已回传", updatedAt: buildUpdatedAt(dataUpdatedAt, -9) },
    { declarationDate: standardDefaultDate, declarationTime: "16:00", unitCode: "SX-DA-006", unitName: "榆林能源单元 F", segment: "午峰", declareVolume: 1432, declarePrice: 339.8, status: "已提交", updatedAt: buildUpdatedAt(dataUpdatedAt, -9) },
    { declarationDate: standardDefaultDate, declarationTime: "19:00", unitCode: "SX-DA-007", unitName: "汉中商服单元 G", segment: "晚峰", declareVolume: 1518, declarePrice: 344.2, status: "待校验", updatedAt: buildUpdatedAt(dataUpdatedAt, -9) },
    { declarationDate: standardDefaultDate, declarationTime: "21:00", unitCode: "SX-DA-008", unitName: "延安站网单元 H", segment: "晚峰", declareVolume: 1468, declarePrice: 341.4, status: "已提交", updatedAt: buildUpdatedAt(dataUpdatedAt, -9) },
  ];
  var shaanxiDayAheadDeclarationPage = createPageData({
    title: "日前申报",
    description: "陕西交易中心日前申报量价 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -9),
    dataSource: "陕西电力交易中心日前申报 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "24h",
      primaryTab: "日前申报",
      secondaryTab: "",
    },
    summaryCards: [
      { label: "申报总电量", value: sum(shaanxiDeclarationVolumeValues), unit: "MWh" },
      { label: "最高申报价", value: shaanxiDeclarationPriceSeries.max, unit: "元/MWh" },
      { label: "最低申报价", value: shaanxiDeclarationPriceSeries.min, unit: "元/MWh" },
      { label: "申报单元数", value: shaanxiDayAheadDeclarationRows.length, unit: "个" },
    ],
    chartType: "mixed",
    chartUnit: "MWh / 元/MWh",
    chartSeries: [shaanxiDeclarationVolumeSeries, shaanxiDeclarationPriceSeries],
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
    tableData: shaanxiDayAheadDeclarationRows,
    fileList: buildMockFileList("sx", "dayahead-declaration", standardDefaultDate, 4),
    emptyText: "当前日期暂无陕西日前申报 mock 数据。",
  });
  var shaanxiContractCurveValues = buildWaveValues(60, 24, {
    base: 1680,
    dayAmplitude: 210,
    peakAmplitude: 320,
    dayShift: 7,
    peakShift: 13,
    valleyEndHour: 6,
    valleyOffset: -150,
    pattern: [-20, 12, 22, -10],
    integer: true,
  });
  var shaanxiContractExecutedValues = shaanxiContractCurveValues.map(function mapExecuted(value, index) {
    return Math.round(value + [-70, -24, 26, 58][index % 4]);
  });
  var shaanxiContractCurveSeries = createSeries("contractCurve", "中长期合同曲线", hours, shaanxiContractCurveValues, "MWh");
  var shaanxiContractExecutedSeries = createSeries("executedVolume", "执行电量", hours, shaanxiContractExecutedValues, "MWh");
  var shaanxiContractCurveRows = [
    { contractId: "SX-ML-2401", contractType: "双边协商", deliveryMonth: "2026-05", period: "峰段", buyer: "西安高新补能中心", seller: "关中绿电售电", contractVolume: 11600, executedVolume: 11320, averagePrice: 324.6, status: "执行中" },
    { contractId: "SX-ML-2402", contractType: "挂牌交易", deliveryMonth: "2026-05", period: "平段", buyer: "咸阳物流港充电站", seller: "秦能售电", contractVolume: 10240, executedVolume: 9980, averagePrice: 318.8, status: "执行中" },
    { contractId: "SX-ML-2403", contractType: "集中竞价", deliveryMonth: "2026-05", period: "谷段", buyer: "宝鸡公交能源站", seller: "秦能售电", contractVolume: 9240, executedVolume: 9050, averagePrice: 312.5, status: "已成交" },
    { contractId: "SX-ML-2404", contractType: "双边协商", deliveryMonth: "2026-06", period: "峰段", buyer: "渭南产业园综合站", seller: "渭电售电", contractVolume: 10860, executedVolume: 10480, averagePrice: 327.1, status: "已成交" },
    { contractId: "SX-ML-2405", contractType: "挂牌交易", deliveryMonth: "2026-06", period: "平段", buyer: "榆林交通能源港", seller: "陕北联合售电", contractVolume: 9720, executedVolume: 9480, averagePrice: 316.9, status: "已成交" },
    { contractId: "SX-ML-2406", contractType: "双边协商", deliveryMonth: "2026-06", period: "谷段", buyer: "汉中补能站群", seller: "陕北联合售电", contractVolume: 8860, executedVolume: 8740, averagePrice: 309.7, status: "执行中" },
  ];
  var shaanxiContractCurvePage = createPageData({
    title: "中长期合同曲线",
    description: "陕西交易中心中长期合同曲线与执行情况 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -8),
    dataSource: "陕西电力交易中心中长期合同曲线 mock",
    filters: {
      month: standardDefaultMonth,
      granularity: "24h",
      primaryTab: "中长期合同曲线",
      secondaryTab: "",
    },
    summaryCards: [
      { label: "合同笔数", value: shaanxiContractCurveRows.length, unit: "笔" },
      { label: "合同总电量", value: shaanxiContractCurveRows.reduce(function accumulate(total, row) { return total + row.contractVolume; }, 0), unit: "MWh" },
      { label: "曲线均值", value: shaanxiContractCurveSeries.average, unit: "MWh" },
      { label: "执行均值", value: shaanxiContractExecutedSeries.average, unit: "MWh" },
    ],
    chartType: "line",
    chartUnit: "MWh",
    chartSeries: [shaanxiContractCurveSeries, shaanxiContractExecutedSeries],
    tableColumns: [
      { key: "contractId", title: "合同编号" },
      { key: "contractType", title: "合同类型" },
      { key: "deliveryMonth", title: "交割月份" },
      { key: "period", title: "时段" },
      { key: "buyer", title: "购电侧" },
      { key: "seller", title: "售电侧" },
      { key: "contractVolume", title: "合同电量（MWh）" },
      { key: "executedVolume", title: "执行电量（MWh）" },
      { key: "averagePrice", title: "合同均价（元/MWh）" },
      { key: "status", title: "状态" },
    ],
    tableData: shaanxiContractCurveRows,
    fileList: buildMockFileList("sx", "medium-long-contract-curve", standardDefaultDate, 4),
    emptyText: "当前月份暂无陕西中长期合同曲线 mock 数据。",
  });
  var shaanxiUnitStatusRows = [
    { unitCode: "SX-GEN-001", unitName: "西安燃机 1 号机", unitType: "燃机", capacity: 650, availableCapacity: 640, status: "运行", startTime: "2026-05-09 00:00", endTime: "-", updatedAt: buildUpdatedAt(dataUpdatedAt, -7) },
    { unitCode: "SX-GEN-002", unitName: "咸阳煤机 2 号机", unitType: "煤电", capacity: 950, availableCapacity: 950, status: "运行", startTime: "2026-05-09 00:00", endTime: "-", updatedAt: buildUpdatedAt(dataUpdatedAt, -7) },
    { unitCode: "SX-GEN-003", unitName: "宝鸡水电 3 号机", unitType: "水电", capacity: 360, availableCapacity: 346, status: "运行", startTime: "2026-05-09 00:00", endTime: "-", updatedAt: buildUpdatedAt(dataUpdatedAt, -7) },
    { unitCode: "SX-GEN-004", unitName: "渭南风场集群", unitType: "风电", capacity: 480, availableCapacity: 428, status: "受限运行", startTime: "2026-05-09 06:00", endTime: "2026-05-09 22:00", updatedAt: buildUpdatedAt(dataUpdatedAt, -7) },
    { unitCode: "SX-GEN-005", unitName: "榆林光伏 5 号机", unitType: "光伏", capacity: 260, availableCapacity: 228, status: "运行", startTime: "2026-05-09 06:30", endTime: "2026-05-09 18:30", updatedAt: buildUpdatedAt(dataUpdatedAt, -7) },
    { unitCode: "SX-GEN-006", unitName: "延安抽蓄 1 号机", unitType: "抽蓄", capacity: 300, availableCapacity: 0, status: "检修", startTime: "2026-05-09 00:00", endTime: "2026-05-09 23:59", updatedAt: buildUpdatedAt(dataUpdatedAt, -7) },
    { unitCode: "SX-GEN-007", unitName: "汉中煤机 7 号机", unitType: "煤电", capacity: 600, availableCapacity: 580, status: "运行", startTime: "2026-05-09 00:00", endTime: "-", updatedAt: buildUpdatedAt(dataUpdatedAt, -7) },
    { unitCode: "SX-GEN-008", unitName: "铜川燃机 2 号机", unitType: "燃机", capacity: 520, availableCapacity: 504, status: "备用", startTime: "2026-05-09 12:00", endTime: "-", updatedAt: buildUpdatedAt(dataUpdatedAt, -7) },
  ];
  var shaanxiUnitStatusSeries = createSeries(
    "availableCapacity",
    "机组可用容量",
    shaanxiUnitStatusRows.map(function mapRow(row) {
      return row.unitName;
    }),
    shaanxiUnitStatusRows.map(function mapRow(row) {
      return row.availableCapacity;
    }),
    "MW",
    "bar",
  );
  var shaanxiUnitStatusPage = createPageData({
    title: "机组状态",
    description: "陕西交易中心重点机组状态与可用容量 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -7),
    dataSource: "陕西电力交易中心机组状态 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "snapshot",
      primaryTab: "负荷信息",
      secondaryTab: "负荷详情",
    },
    summaryCards: [
      { label: "运行机组", value: shaanxiUnitStatusRows.filter(function filterRow(row) { return row.status === "运行"; }).length, unit: "台" },
      { label: "检修机组", value: shaanxiUnitStatusRows.filter(function filterRow(row) { return row.status === "检修"; }).length, unit: "台" },
      { label: "可用容量峰值", value: shaanxiUnitStatusSeries.max, unit: "MW" },
      { label: "可用容量均值", value: shaanxiUnitStatusSeries.average, unit: "MW" },
    ],
    chartType: "bar",
    chartUnit: "MW",
    chartSeries: [shaanxiUnitStatusSeries],
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
    tableData: shaanxiUnitStatusRows,
    fileList: buildMockFileList("sx", "unit-status", standardDefaultDate, 3),
    emptyText: "当前日期暂无陕西机组状态 mock 数据。",
  });
  var shaanxiTradeVolumeValues = buildWaveValues(60, 24, {
    base: 1460,
    dayAmplitude: 180,
    peakAmplitude: 300,
    dayShift: 7,
    peakShift: 13,
    valleyEndHour: 6,
    valleyOffset: -120,
    pattern: [-16, 10, 20, -8],
    integer: true,
  });
  var shaanxiTradePriceValues = buildWaveValues(60, 24, {
    base: 322,
    dayAmplitude: 10,
    peakAmplitude: 20,
    dayShift: 7,
    peakShift: 13,
    pattern: [-1.2, 0.8, 1.4, -0.5],
  });
  var shaanxiTradeVolumeSeries = createSeries("tradeVolume", "交易电量", hours, shaanxiTradeVolumeValues, "MWh", "bar");
  var shaanxiTradePriceSeries = createSeries("tradePrice", "成交均价", hours, shaanxiTradePriceValues, "元/MWh");
  var shaanxiTradeOverviewRows = [
    { tradeDate: "2026-05-08", tradeType: "月内交易", marketSegment: "峰段", dealCount: 12, volume: 4620, averagePrice: 326.8, buyerCount: 6, sellerCount: 4, updatedAt: buildUpdatedAt(dataUpdatedAt, -6) },
    { tradeDate: "2026-05-08", tradeType: "月内交易", marketSegment: "平段", dealCount: 10, volume: 4180, averagePrice: 319.4, buyerCount: 5, sellerCount: 4, updatedAt: buildUpdatedAt(dataUpdatedAt, -6) },
    { tradeDate: "2026-05-08", tradeType: "月内交易", marketSegment: "谷段", dealCount: 8, volume: 3820, averagePrice: 311.8, buyerCount: 5, sellerCount: 3, updatedAt: buildUpdatedAt(dataUpdatedAt, -6) },
    { tradeDate: "2026-05-09", tradeType: "月内交易", marketSegment: "峰段", dealCount: 13, volume: 4760, averagePrice: 329.6, buyerCount: 6, sellerCount: 5, updatedAt: buildUpdatedAt(dataUpdatedAt, -6) },
    { tradeDate: "2026-05-09", tradeType: "月内交易", marketSegment: "平段", dealCount: 11, volume: 4320, averagePrice: 321.2, buyerCount: 5, sellerCount: 4, updatedAt: buildUpdatedAt(dataUpdatedAt, -6) },
    { tradeDate: "2026-05-09", tradeType: "月内交易", marketSegment: "谷段", dealCount: 9, volume: 3960, averagePrice: 313.6, buyerCount: 5, sellerCount: 4, updatedAt: buildUpdatedAt(dataUpdatedAt, -6) },
  ];
  var shaanxiTradeOverviewPage = createPageData({
    title: "交易总体情况（交易）",
    description: "陕西交易中心交易总体情况 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -6),
    dataSource: "陕西电力交易中心交易总体情况 mock",
    filters: {
      dateRange: {
        start: "2026-05-08",
        end: "2026-05-09",
      },
      primaryTab: "交易结果",
      secondaryTab: "",
    },
    summaryCards: [
      { label: "成交笔数", value: shaanxiTradeOverviewRows.reduce(function accumulate(total, row) { return total + row.dealCount; }, 0), unit: "笔" },
      { label: "成交总电量", value: shaanxiTradeOverviewRows.reduce(function accumulate(total, row) { return total + row.volume; }, 0), unit: "MWh" },
      { label: "成交均价峰值", value: shaanxiTradePriceSeries.max, unit: "元/MWh" },
      { label: "成交均价均值", value: shaanxiTradePriceSeries.average, unit: "元/MWh" },
    ],
    chartType: "mixed",
    chartUnit: "MWh / 元/MWh",
    chartSeries: [shaanxiTradeVolumeSeries, shaanxiTradePriceSeries],
    tableColumns: [
      { key: "tradeDate", title: "交易日期" },
      { key: "tradeType", title: "交易类型" },
      { key: "marketSegment", title: "交易时段" },
      { key: "dealCount", title: "成交笔数" },
      { key: "volume", title: "成交电量（MWh）" },
      { key: "averagePrice", title: "成交均价（元/MWh）" },
      { key: "buyerCount", title: "买方数量" },
      { key: "sellerCount", title: "卖方数量" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: shaanxiTradeOverviewRows,
    fileList: buildMockFileList("sx", "trade-overview", standardDefaultDate, 4),
    emptyText: "当前日期暂无陕西交易总体情况 mock 数据。",
  });
  var shaanxiDailySettlementDate = "2026-04-30";
  var shaanxiDailySettlementUnitName = "售电公司-北京小桔新能源汽车科技有限公司-常规企业-2026";
  var shaanxiDailySettlementRows = Array.from({ length: 96 }, function createSettlementRow(_, index) {
    var periodNumber = index + 1;
    var totalMinutes = periodNumber * 15;
    var hour = totalMinutes / 60;
    var minute = totalMinutes % 60;
    var timePoint = pad(Math.floor(hour)) + ":" + pad(minute);

    if (index === 0) {
      return {
        settlementDate: shaanxiDailySettlementDate,
        settlementUnitName: shaanxiDailySettlementUnitName,
        period: "1",
        timePoint: "00:15",
        actualUsage: 1.172,
        intraProvinceNetContractVolume: 0.604,
        intraProvinceNetContractFee: 248.683,
        mediumLongTermReferencePrice: 0.160,
        intraProvinceContractFee: 252.93,
        interProvinceNetContractVolume: 0.000,
        interProvinceNetContractFee: 0.00,
        dayAheadVolume: 0.552,
        dayAheadUnifiedPrice: 7.191,
        dayAheadFee: 3.97,
        realTimeVolume: 0.016,
        realTimeUnifiedPrice: 0.147,
        realTimeFee: 0.00,
        remark: "-",
      };
    }

    if (index === 1) {
      return {
        settlementDate: shaanxiDailySettlementDate,
        settlementUnitName: shaanxiDailySettlementUnitName,
        period: "2",
        timePoint: "00:30",
        actualUsage: 1.241,
        intraProvinceNetContractVolume: 0.604,
        intraProvinceNetContractFee: 248.683,
        mediumLongTermReferencePrice: 0.152,
        intraProvinceContractFee: 252.92,
        interProvinceNetContractVolume: 0.000,
        interProvinceNetContractFee: 0.00,
        dayAheadVolume: 0.464,
        dayAheadUnifiedPrice: 7.168,
        dayAheadFee: 3.33,
        realTimeVolume: 0.173,
        realTimeUnifiedPrice: 0.160,
        realTimeFee: 0.03,
        remark: "-",
      };
    }

    var actualUsage = Number(
      (
        1.08 +
        Math.max(0, Math.sin(((hour - 6.5) / 24) * Math.PI * 2)) * 0.58 +
        Math.max(0, Math.sin(((hour - 14) / 24) * Math.PI * 2)) * 0.42 +
        [0.014, 0.046, 0.021, 0.063][index % 4] +
        (hour < 6 ? -0.05 : 0)
      ).toFixed(3),
    );
    var intraProvinceNetContractVolume = Number((actualUsage * (0.5 + ((index % 6) - 2) * 0.012)).toFixed(3));
    var interProvinceNetContractVolume = index % 24 === 11 || index % 24 === 12 ? 0.018 : 0.000;
    var realTimeVolume = Number(
      (
        Math.sin(((hour - 11) / 24) * Math.PI * 2) * 0.085 +
        [-0.018, 0.012, 0.026, -0.004][index % 4]
      ).toFixed(3),
    );
    var dayAheadVolume = Number(
      (actualUsage - intraProvinceNetContractVolume - interProvinceNetContractVolume - realTimeVolume).toFixed(3),
    );
    var mediumLongTermReferencePrice = Number((0.156 + Math.sin((hour / 24) * Math.PI * 2) * 0.008).toFixed(3));
    var intraProvinceNetContractFee = Number(
      (
        246.8 +
        intraProvinceNetContractVolume * 3.15 +
        Math.cos(((hour - 4) / 24) * Math.PI * 2) * 1.24 +
        (index % 3) * 0.18
      ).toFixed(3),
    );
    var intraProvinceContractFee = Number(
      (intraProvinceNetContractFee + 4.08 + Math.sin((hour / 24) * Math.PI * 2) * 0.42).toFixed(2),
    );
    var interProvinceNetContractFee = Number((interProvinceNetContractVolume * 12.6).toFixed(2));
    var dayAheadUnifiedPrice = Number((7.082 + Math.cos(((hour - 5) / 24) * Math.PI * 2) * 0.164).toFixed(3));
    var dayAheadFee = Number((dayAheadVolume * dayAheadUnifiedPrice).toFixed(2));
    var realTimeUnifiedPrice = Number((0.152 + Math.sin(((hour - 2) / 24) * Math.PI * 2) * 0.018).toFixed(3));
    var realTimeFee = Number((realTimeVolume * realTimeUnifiedPrice).toFixed(2));

    return {
      settlementDate: shaanxiDailySettlementDate,
      settlementUnitName: shaanxiDailySettlementUnitName,
      period: String(periodNumber),
      timePoint: timePoint,
      actualUsage: actualUsage,
      intraProvinceNetContractVolume: intraProvinceNetContractVolume,
      intraProvinceNetContractFee: intraProvinceNetContractFee,
      mediumLongTermReferencePrice: mediumLongTermReferencePrice,
      intraProvinceContractFee: intraProvinceContractFee,
      interProvinceNetContractVolume: interProvinceNetContractVolume,
      interProvinceNetContractFee: interProvinceNetContractFee,
      dayAheadVolume: dayAheadVolume,
      dayAheadUnifiedPrice: dayAheadUnifiedPrice,
      dayAheadFee: dayAheadFee,
      realTimeVolume: realTimeVolume,
      realTimeUnifiedPrice: realTimeUnifiedPrice,
      realTimeFee: realTimeFee,
      remark: realTimeVolume < 0 ? "实时回退" : "-",
    };
  });
  var shaanxiDailySettlementFiles = [
    {
      id: "sx-daily-excel-001",
      fileName: "2026-04-30用户侧日清分账单.xlsx",
      fileType: "日清算 Excel",
      publishTime: "2026-05-09 10:52:48",
      parseStatus: "已解析",
      downloadUrl: "#",
    },
  ];
  var shaanxiDailySettlementPage = createPageData({
    title: "日清算",
    description: "陕西交易中心日清算按 96 个 15 分钟时段展示的用户侧日清分账单 mock 数据。",
    updateTime: "2026-05-09 10:52:48",
    dataSource: "陕西交易中心日清算Excel解析",
    filters: {
      dateRange: {
        start: "2026-04-30",
        end: "2026-04-30",
      },
      primaryTab: "日清算",
      secondaryTab: "",
      settlementTypeOptions: ["全部", "中长期合同", "省内日前", "省内实时"],
      dataTypeOptions: ["全部", "日清分账单", "Excel 文件", "解析结果"],
    },
    summaryCards: [],
    chartType: "",
    chartUnit: "",
    chartSeries: [],
    tableColumns: [
      { key: "settlementDate", title: "结算日期" },
      { key: "settlementUnitName", title: "结算单元名称" },
      { key: "period", title: "时段" },
      { key: "actualUsage", title: "实际用电量（MWh）" },
      { key: "intraProvinceNetContractVolume", title: "省内净合同电量（MWh）" },
      { key: "intraProvinceNetContractFee", title: "省内净合同电费（元）" },
      { key: "mediumLongTermReferencePrice", title: "中长期结算参考点电价（元/MWh）" },
      { key: "intraProvinceContractFee", title: "省内合约电费（元）" },
      { key: "interProvinceNetContractVolume", title: "省间净合同电量（MWh）" },
      { key: "interProvinceNetContractFee", title: "省间净合同电费（元）" },
      { key: "dayAheadVolume", title: "日前电量（MWh）" },
      { key: "dayAheadUnifiedPrice", title: "日前统一结算点电价（元/MWh）" },
      { key: "dayAheadFee", title: "日前电费（元）" },
      { key: "realTimeVolume", title: "实时电量（MWh）" },
      { key: "realTimeUnifiedPrice", title: "实时统一结算点电价（元/MWh）" },
      { key: "realTimeFee", title: "实时电费（元）" },
      { key: "remark", title: "备注" },
    ],
    tableData: shaanxiDailySettlementRows,
    summaryTable: {
      columns: [],
      data: [],
    },
    fileList: shaanxiDailySettlementFiles,
    documentTitle: "2026-04-30用户侧日清分账单",
    emptyText: "当前筛选条件下暂无陕西日清算分账单数据。",
  });
  var shaanxiMonthlySettlementSummary = {
    settlementMonth: "2026-03",
    settlementBillNo: "SNPX-2026-03-03030",
    settlementDocumentTitle: "陕西电力交易中心有限公司2026年03月交易结算单",
    retailUserName: "北京小桔新能源汽车科技有限公司（常规企业）",
    buyerSettlementPower: 6025.925,
    buyerContractPower: 3193.288,
    buyerDeviationPower: -2832.637,
    sellerSettlementPower: 6025.925,
    sellerContractPower: 0,
    sellerDeviationPower: 6025.925,
    sellerRevenue: 65257.69,
    annualActualUsage: null,
    mediumLongTermTradingPower: null,
    mediumLongTermUsageRatio: null,
    unitRevenue: null,
    dataSource: "陕西交易中心月结算PDF解析",
    updateTime: "2026-05-09 10:52:48",
  };
  var shaanxiMonthlySettlementDetails = [
    {
      subjectCode: "01",
      subjectName: "电量清分",
      retailUserName: "北京小桔新能源汽车科技有限公司（常规企业）",
      accountOrMeterNo: "-",
      contractPeriod: "2026-03",
      actualUsage: 6025.925,
      contractPower: 3193.288,
      settlementPowerOrCapacity: 6025.925,
      settlementPrice: 190.633,
      settlementFee: 1148739.45,
      remark: "购电侧",
    },
    {
      subjectCode: "0101",
      subjectName: "中长期交易",
      retailUserName: "北京小桔新能源汽车科技有限公司（常规企业）",
      accountOrMeterNo: "-",
      contractPeriod: "2026-03",
      actualUsage: 3193.288,
      contractPower: 3193.288,
      settlementPowerOrCapacity: 3193.288,
      settlementPrice: 259.275,
      settlementFee: 827939.23,
      remark: "购电侧-中长期交易",
    },
    {
      subjectCode: "0101020311",
      subjectName: "双边协商",
      retailUserName: "北京小桔新能源汽车科技有限公司（常规企业）",
      accountOrMeterNo: "-",
      contractPeriod: "2026-03",
      actualUsage: 2389.006,
      contractPower: 2389.006,
      settlementPowerOrCapacity: 2389.006,
      settlementPrice: 315,
      settlementFee: 752536.89,
      remark: "购电侧-双边协商",
    },
    {
      subjectCode: "0101020312",
      subjectName: "集中竞价",
      retailUserName: "北京小桔新能源汽车科技有限公司（常规企业）",
      accountOrMeterNo: "-",
      contractPeriod: "2026-03",
      actualUsage: 1098.585,
      contractPower: 1098.585,
      settlementPowerOrCapacity: 1098.585,
      settlementPrice: 166.04,
      settlementFee: 182409.13,
      remark: "购电侧-集中竞价",
    },
    {
      subjectCode: "010110",
      subjectName: "其他中长期交易",
      retailUserName: "北京小桔新能源汽车科技有限公司（常规企业）",
      accountOrMeterNo: "-",
      contractPeriod: "2026-03",
      actualUsage: -294.303,
      contractPower: -294.303,
      settlementPowerOrCapacity: -294.303,
      settlementPrice: 363.594,
      settlementFee: -107006.79,
      remark: "购电侧-其他中长期",
    },
    {
      subjectCode: "01020201",
      subjectName: "日前交易",
      retailUserName: "北京小桔新能源汽车科技有限公司（常规企业）",
      accountOrMeterNo: "-",
      contractPeriod: "2026-03",
      actualUsage: 2821.989,
      contractPower: 0,
      settlementPowerOrCapacity: 2821.989,
      settlementPrice: 105.991,
      settlementFee: 299106.52,
      remark: "购电侧-日前交易",
    },
    {
      subjectCode: "01020203",
      subjectName: "实时交易",
      retailUserName: "北京小桔新能源汽车科技有限公司（常规企业）",
      accountOrMeterNo: "-",
      contractPeriod: "2026-03",
      actualUsage: 10.648,
      contractPower: 0,
      settlementPowerOrCapacity: 10.648,
      settlementPrice: 2037.35,
      settlementFee: 21693.7,
      remark: "购电侧-实时交易",
    },
    {
      subjectCode: "0202030013",
      subjectName: "日前申报偏差获益回收",
      retailUserName: "北京小桔新能源汽车科技有限公司（常规企业）",
      accountOrMeterNo: "-",
      contractPeriod: "2026-03",
      actualUsage: 14.26,
      contractPower: 0,
      settlementPowerOrCapacity: 14.26,
      settlementPrice: 647.667,
      settlementFee: 9235.73,
      remark: "购电侧-市场运营费用",
    },
    {
      subjectCode: "0101020315",
      subjectName: "零售交易",
      retailUserName: "北京小桔新能源汽车科技有限公司（常规企业）",
      accountOrMeterNo: "-",
      contractPeriod: "2026-03",
      actualUsage: 6025.925,
      contractPower: 0,
      settlementPowerOrCapacity: 6025.925,
      settlementPrice: 202.995,
      settlementFee: 1223232.87,
      remark: "售电侧-零售交易",
    },
    {
      subjectCode: "合计",
      subjectName: "售电公司月结算合计",
      retailUserName: "北京小桔新能源汽车科技有限公司（常规企业）",
      accountOrMeterNo: "-",
      contractPeriod: "2026-03",
      actualUsage: 6025.925,
      contractPower: 3193.288,
      settlementPowerOrCapacity: 6025.925,
      settlementPrice: 192.166,
      settlementFee: 1157975.18,
      remark: "合计",
    },
  ];
  var shaanxiMonthlySettlementFiles = [
    {
      id: "sx-monthly-pdf-001",
      fileName: "北京小桔新能源汽车科技有限公司2026-03-01.pdf",
      fileType: "月结算 PDF",
      publishTime: "2026-04-06 00:00:00",
      parseStatus: "已解析",
      downloadUrl: "#",
    },
  ];
  var shaanxiMonthlySellerPage = createPageData({
    title: "月结算-售电公司",
    description: "陕西交易中心售电公司月结算按 PDF 解析结构展示 mock 数据。",
    updateTime: shaanxiMonthlySettlementSummary.updateTime,
    dataSource: shaanxiMonthlySettlementSummary.dataSource,
    filters: {
      month: shaanxiMonthlySettlementSummary.settlementMonth,
      primaryTab: "月结算",
      secondaryTab: "售电公司",
    },
    summaryCards: [],
    chartType: "",
    chartUnit: "",
    chartSeries: [],
    tableColumns: [
      { key: "subjectCode", title: "结算科目编码" },
      { key: "subjectName", title: "结算科目" },
      { key: "retailUserName", title: "零售用户名称" },
      { key: "accountOrMeterNo", title: "户号 / 电源编号 / 计量点编号" },
      { key: "contractPeriod", title: "合同时段" },
      { key: "actualUsage", title: "实际用电量" },
      { key: "contractPower", title: "合同电量" },
      { key: "settlementPowerOrCapacity", title: "结算电量 / 容量" },
      { key: "settlementPrice", title: "结算电价" },
      { key: "settlementFee", title: "结算电费" },
      { key: "remark", title: "备注" },
    ],
    tableData: shaanxiMonthlySettlementDetails,
    settlementSummary: shaanxiMonthlySettlementSummary,
    fileList: shaanxiMonthlySettlementFiles,
    documentTitle: "售电公司交易结算单",
    emptyText: "当前月份暂无陕西售电公司月结算 mock 数据。",
  });
  var shaanxiMonthlyConsumerRows = [
    { month: "2026-05", companyType: "用电企业", companyCode: "SXUSER001", companyName: "西安高新补能中心", accountNo: "SX-U-001", settlementEnergy: 38460, totalFee: 1732000, serviceFee: 41800, deviationFee: 16600, invoiceStatus: "已出账" },
    { month: "2026-05", companyType: "用电企业", companyCode: "SXUSER002", companyName: "咸阳物流港充电站", accountNo: "SX-U-002", settlementEnergy: 37240, totalFee: 1678000, serviceFee: 40200, deviationFee: 16020, invoiceStatus: "已出账" },
    { month: "2026-05", companyType: "用电企业", companyCode: "SXUSER003", companyName: "宝鸡公交能源站", accountNo: "SX-U-003", settlementEnergy: 35820, totalFee: 1614000, serviceFee: 38900, deviationFee: 15480, invoiceStatus: "结算中" },
    { month: "2026-05", companyType: "用电企业", companyCode: "SXUSER004", companyName: "渭南产业园综合站", accountNo: "SX-U-004", settlementEnergy: 34160, totalFee: 1542000, serviceFee: 37400, deviationFee: 14920, invoiceStatus: "待确认" },
    { month: "2026-05", companyType: "用电企业", companyCode: "SXUSER005", companyName: "榆林交通能源港", accountNo: "SX-U-005", settlementEnergy: 32980, totalFee: 1491000, serviceFee: 36200, deviationFee: 14560, invoiceStatus: "待确认" },
    { month: "2026-05", companyType: "用电企业", companyCode: "SXUSER006", companyName: "汉中补能站群", accountNo: "SX-U-006", settlementEnergy: 31820, totalFee: 1438000, serviceFee: 35100, deviationFee: 14020, invoiceStatus: "已出账" },
  ];
  var shaanxiMonthlyConsumerSeries = createSeries(
    "monthlyConsumerFee",
    "企业月结算总电费",
    shaanxiMonthlyConsumerRows.map(function mapRow(row) {
      return row.companyName;
    }),
    shaanxiMonthlyConsumerRows.map(function mapRow(row) {
      return row.totalFee;
    }),
    "元",
    "bar",
  );
  var shaanxiMonthlyConsumerPage = createPageData({
    title: "月结算-用电企业",
    description: "陕西交易中心用电企业月结算 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -4),
    dataSource: "陕西电力交易中心月结算（用电企业）mock",
    filters: {
      month: standardDefaultMonth,
      primaryTab: "月结算",
      secondaryTab: "用电企业",
    },
    summaryCards: [
      { label: "用电企业数", value: shaanxiMonthlyConsumerRows.length, unit: "家" },
      { label: "月结算总电量", value: shaanxiMonthlyConsumerRows.reduce(function accumulate(total, row) { return total + row.settlementEnergy; }, 0), unit: "MWh" },
      { label: "月结算总电费", value: shaanxiMonthlyConsumerRows.reduce(function accumulate(total, row) { return total + row.totalFee; }, 0), unit: "元" },
      { label: "服务费合计", value: shaanxiMonthlyConsumerRows.reduce(function accumulate(total, row) { return total + row.serviceFee; }, 0), unit: "元" },
    ],
    chartType: "bar",
    chartUnit: "元",
    chartSeries: [shaanxiMonthlyConsumerSeries],
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
    tableData: shaanxiMonthlyConsumerRows,
    fileList: buildMockFileList("sx", "monthly-settlement-consumer", standardDefaultDate, 3),
    emptyText: "当前月份暂无陕西用电企业月结算 mock 数据。",
  });
  var shaanxiPositiveReserveValues = buildWaveValues(15, 96, {
    base: 2140,
    dayAmplitude: 130,
    peakAmplitude: 220,
    dayShift: 6,
    peakShift: 15,
    pattern: [-20, 14, -8, 18],
  });
  var shaanxiNegativeReserveValues = buildWaveValues(15, 96, {
    base: 1520,
    dayAmplitude: 90,
    peakAmplitude: 140,
    dayShift: 5,
    peakShift: 12,
    pattern: [-16, 10, -6, 12],
  });
  var shaanxiPositiveReserveSeries = createSeries("positiveReserve", "正备用", quarterHours, shaanxiPositiveReserveValues, "MW");
  var shaanxiNegativeReserveSeries = createSeries("negativeReserve", "负备用", quarterHours, shaanxiNegativeReserveValues, "MW");
  var shaanxiReservePage = createPageData({
    title: "系统备用信息",
    description: "陕西交易中心系统备用信息 96 点 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -3),
    dataSource: "陕西电力交易中心系统备用信息 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "负荷信息",
      secondaryTab: "备用信息",
    },
    summaryCards: [
      { label: "正备用峰值", value: shaanxiPositiveReserveSeries.max, unit: "MW" },
      { label: "负备用峰值", value: shaanxiNegativeReserveSeries.max, unit: "MW" },
      { label: "正备用均值", value: shaanxiPositiveReserveSeries.average, unit: "MW" },
      { label: "负备用均值", value: shaanxiNegativeReserveSeries.average, unit: "MW" },
    ],
    metricTree: [
      { id: "sx-reserve-positive", label: "正备用" },
      { id: "sx-reserve-negative", label: "负备用" },
    ],
    chartType: "line",
    chartUnit: "MW",
    chartSeries: [shaanxiPositiveReserveSeries, shaanxiNegativeReserveSeries],
    tableColumns: [
      { key: "time", title: "时刻" },
      { key: "positiveReserve", title: "正备用（MW）" },
      { key: "negativeReserve", title: "负备用（MW）" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: quarterHours.map(function mapReserveRow(time, index) {
      return {
        time: time,
        positiveReserve: shaanxiPositiveReserveValues[index],
        negativeReserve: shaanxiNegativeReserveValues[index],
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
          maxValue: shaanxiPositiveReserveSeries.max,
          minValue: shaanxiPositiveReserveSeries.min,
          averageValue: shaanxiPositiveReserveSeries.average,
        },
        {
          category: "负备用",
          maxValue: shaanxiNegativeReserveSeries.max,
          minValue: shaanxiNegativeReserveSeries.min,
          averageValue: shaanxiNegativeReserveSeries.average,
        },
      ],
    },
    fileList: buildMockFileList("sx", "reserve-overview", standardDefaultDate, 3),
    emptyText: "当前日期暂无陕西备用信息 mock 数据。",
  });
  var shaanxiInfoDisclosureEmptyText = "当前交易中心暂未接入该披露类型数据，请切换其他披露类型或手动更新数据。";

  function createShaanxiInfoEmptyPage(title, primaryTab, secondaryTab, emptyText) {
    return createPageData({
      title: title,
      description: "陕西交易中心该披露类型暂未接入统一展示数据。",
      updateTime: dataUpdatedAt,
      dataSource: dataSource,
      filters: {
        date: standardDefaultDate,
        primaryTab: primaryTab,
        secondaryTab: secondaryTab || "",
      },
      viewType: "empty",
      emptyText: emptyText || shaanxiInfoDisclosureEmptyText,
    });
  }

  function buildShaanxiQuarterProfileRow(date, companyName, companyIndex, dayIndex) {
    var quarterValues = buildWaveValues(15, 96, {
      base: 152 + dayIndex * 3.4 + companyIndex * 10.8,
      dayAmplitude: 44 + companyIndex * 3,
      peakAmplitude: 66 + companyIndex * 4,
      dayShift: 7,
      peakShift: 14,
      valleyEndHour: 6,
      valleyOffset: -18 + companyIndex * 2,
      pattern: [0, 4, -3, 6],
      integer: true,
    });
    var converted24Values = convertQuarterToHourly(quarterValues);
    var row = {
      date: date,
      saleCompanyName: companyName,
      quarterValues: quarterValues,
      converted24Values: converted24Values,
      total96: sum(quarterValues),
      total24: sum(converted24Values),
      conversionSummary: buildConversionSummary(converted24Values),
      updatedAt: buildUpdatedAt(dataUpdatedAt, -9),
    };

    quarterHours.forEach(function eachQuarterLabel(quarterLabel, quarterIndex) {
      row[quarterLabel] = quarterValues[quarterIndex];
    });

    return row;
  }

  var shaanxiUnifiedDayAheadWeightedValues = buildWaveValues(15, 96, {
    base: 329.6,
    dayAmplitude: 9.2,
    peakAmplitude: 18.4,
    dayShift: 6,
    peakShift: 15,
    pattern: [-1.2, 0.6, 1.1, -0.5],
  });
  var shaanxiUnifiedRealTimeWeightedValues = shaanxiUnifiedDayAheadWeightedValues.map(function mapRealTimeValue(value, index) {
    return round(value + [5.6, -3.4, 2.8, 6.4][index % 4]);
  });
  var shaanxiUnifiedPriceRows = quarterHours.map(function mapWeightedPriceRow(time, index) {
    return {
      date: standardDefaultDate,
      time: time,
      dayAheadPrice: shaanxiUnifiedDayAheadWeightedValues[index],
      realTimePrice: shaanxiUnifiedRealTimeWeightedValues[index],
      priceDiff: round(shaanxiUnifiedRealTimeWeightedValues[index] - shaanxiUnifiedDayAheadWeightedValues[index]),
      updatedAt: buildUpdatedAt(dataUpdatedAt, -16),
    };
  });
  var shaanxiUnifiedPricePage = createPageData({
    title: "全省统一出清价",
    description: "陕西交易中心信息披露页统一结构下的用户侧加权电价 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -16),
    dataSource: "陕西电力交易中心用户侧加权电价 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "全省统一出清价",
      secondaryTab: "",
    },
    viewType: "lineTable",
    chartTitle: "用户侧加权电价趋势图",
    chartUnit: "元/MWh",
    labelKey: "time",
    datePickerMode: "single",
    dateLabel: "运行日期",
    dayAheadSeriesLabel: "日前用户侧加权电价",
    realTimeSeriesLabel: "实时用户侧加权电价",
    tooltipMode: "priceSpread",
    seriesDefinitions: [
      { id: "sx-info-price-dayahead", label: "日前用户侧加权电价", color: "#1677FF", valueKey: "dayAheadPrice" },
      { id: "sx-info-price-realtime", label: "实时用户侧加权电价", color: "#2FCB8F", valueKey: "realTimePrice" },
    ],
    tableColumns: [
      { key: "date", title: "日期" },
      { key: "time", title: "时刻" },
      { key: "dayAheadPrice", title: "日前用户侧加权电价（元/MWh）" },
      { key: "realTimePrice", title: "实时用户侧加权电价（元/MWh）" },
      { key: "priceDiff", title: "价差（元/MWh）" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: shaanxiUnifiedPriceRows,
    tableMinWidth: 1340,
    fileList: buildMockFileList("sx", "weighted-price", standardDefaultDate, 3),
    emptyText: "当前日期暂无陕西用户侧加权电价 mock 数据。",
  });
  var shaanxiSaleCompanyNames = [
    "滴滴电力（陕西）有限公司",
    "关中绿电售电",
    "秦能售电",
  ];
  var shaanxiUnifiedSaleCompanyRows = settlementDates.reduce(function accumulateRows(result, date, dayIndex) {
    return result.concat(
      shaanxiSaleCompanyNames.map(function mapCompany(companyName, companyIndex) {
        return buildShaanxiQuarterProfileRow(date, companyName, companyIndex, dayIndex);
      }),
    );
  }, []);
  var shaanxiUnifiedSaleCompanyPage = createPageData({
    title: "售电公司分时电量",
    description: "陕西交易中心信息披露页统一结构下的售电公司日电量 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -9),
    dataSource: "陕西电力交易中心售电公司日电量 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
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
        options: ["全部"].concat(shaanxiSaleCompanyNames),
        defaultValue: "全部",
      },
    ],
    profileModes: {
      "96": {
        label: "96点视图",
        labels: quarterHours.slice(),
        unit: "MWh",
        valueKey: "quarterValues",
        latestLabel: "所选周期最新日 96 点电量",
        averageLabel: "所选周期均值 96 点电量",
        compareLatestLabel: "对比周期最新日 96 点电量",
        compareAverageLabel: "对比周期均值 96 点电量",
      },
      "24": {
        label: "24点聚合视图",
        labels: hours.slice(),
        unit: "MWh",
        valueKey: "converted24Values",
        latestLabel: "所选周期最新日 24 点聚合电量",
        averageLabel: "所选周期均值 24 点聚合电量",
        compareLatestLabel: "对比周期最新日 24 点聚合电量",
        compareAverageLabel: "对比周期均值 24 点聚合电量",
      },
    },
    defaultProfileMode: "96",
    tableColumns: [{ key: "date", title: "日期" }, { key: "saleCompanyName", title: "售电公司名称" }]
      .concat(quarterHours.map(function mapQuarterLabel(quarterLabel) {
        return { key: quarterLabel, title: quarterLabel };
      }))
      .concat([
        { key: "total96", title: "96点合计电量（MWh）" },
        { key: "total24", title: "24点聚合电量（MWh）" },
        { key: "updatedAt", title: "更新时间" },
      ]),
    tableData: shaanxiUnifiedSaleCompanyRows,
    tableMinWidth: 7960,
    fileList: buildMockFileList("sx", "sale-company-load", standardDefaultDate, 3),
    emptyText: "当前日期暂无陕西售电公司分时电量 mock 数据。",
  });
  var shaanxiNodeOptionNames = ["全省", "关中枢纽节点", "陕北新能源节点", "陕南联络节点"];
  var shaanxiUnifiedNodePriceMap = {
    "全省": {
      dayAheadValues: buildWaveValues(15, 96, {
        base: 334.8,
        dayAmplitude: 16.8,
        peakAmplitude: 31.2,
        dayShift: 6,
        peakShift: 15,
        pattern: [-1.4, 0.8, -0.6, 2.1],
      }),
    },
    "关中枢纽节点": {
      dayAheadValues: buildWaveValues(15, 96, {
        base: 339.2,
        dayAmplitude: 17.4,
        peakAmplitude: 33.6,
        dayShift: 6,
        peakShift: 15,
        pattern: [-1.2, 1.4, -0.2, 2.6],
      }),
    },
    "陕北新能源节点": {
      dayAheadValues: buildWaveValues(15, 96, {
        base: 327.4,
        dayAmplitude: 15.2,
        peakAmplitude: 28.4,
        dayShift: 6,
        peakShift: 15,
        pattern: [-2.2, 0.2, -1.4, 1.4],
      }),
    },
    "陕南联络节点": {
      dayAheadValues: buildWaveValues(15, 96, {
        base: 331.6,
        dayAmplitude: 15.8,
        peakAmplitude: 29.8,
        dayShift: 6,
        peakShift: 15,
        pattern: [-1.6, 0.4, -0.8, 1.8],
      }),
    },
  };
  Object.keys(shaanxiUnifiedNodePriceMap).forEach(function eachNodeName(nodeName) {
    var nodeData = shaanxiUnifiedNodePriceMap[nodeName];
    nodeData.realTimeValues = nodeData.dayAheadValues.map(function mapRealTimeNodePrice(value, index) {
      return round(value + [6.4, -3.8, 2.9, 7.1][index % 4]);
    });
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
        updatedAt: buildUpdatedAt(dataUpdatedAt, -8),
      };
    });
  });
  var shaanxiUnifiedNodePricePage = createPageData({
    title: "节点电价",
    description: "陕西交易中心信息披露页统一结构下的现货市场节点边际电价 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -8),
    dataSource: "陕西电力交易中心现货市场节点边际电价 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "节点电价",
      secondaryTab: "",
    },
    viewType: "nodePrice",
    chartTitle: "现货市场节点边际电价趋势图",
    chartUnit: "元/MWh",
    labelKey: "time",
    datePickerMode: "single",
    dateLabel: "运行日期",
    dayAheadSeriesLabel: "日前现货市场节点边际电价",
    realTimeSeriesLabel: "实时现货市场节点边际电价",
    nodeOptions: shaanxiNodeOptionNames,
    defaultNode: "全省",
    sidebarGroups: [
      {
        label: "节点列表",
        items: shaanxiNodeOptionNames.map(function mapNodeName(nodeName) {
          return {
            id: nodeName,
            label: nodeName,
          };
        }),
      },
    ],
    nodeSeries: shaanxiUnifiedNodePriceMap,
    tableColumns: [
      { key: "date", title: "日期" },
      { key: "time", title: "时刻" },
      { key: "nodeName", title: "节点名称" },
      { key: "dayAheadPrice", title: "日前现货市场节点边际电价（元/MWh）" },
      { key: "realTimePrice", title: "实时现货市场节点边际电价（元/MWh）" },
      { key: "diffValue", title: "价差（元/MWh）" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableMinWidth: 1500,
    fileList: buildMockFileList("sx", "node-price", standardDefaultDate, 3),
    emptyText: "当前日期暂无陕西节点电价 mock 数据。",
  });

  var shaanxiUnifiedDeclarationVolumeValues = buildWaveValues(15, 96, {
    base: 266,
    dayAmplitude: 20,
    peakAmplitude: 40,
    dayShift: 6,
    peakShift: 15,
    valleyEndHour: 6,
    valleyOffset: -16,
    pattern: [-6, 4, 10, -4],
    integer: true,
  });
  var shaanxiUnifiedDeclarationPriceValues = buildWaveValues(15, 96, {
    base: 326.2,
    dayAmplitude: 9,
    peakAmplitude: 18,
    dayShift: 6,
    peakShift: 15,
    pattern: [-1.1, 0.7, 1.3, -0.5],
  });
  var shaanxiUnifiedDeclarationRows = quarterHours.map(function mapDeclarationRow(time, index) {
    return {
      date: standardDefaultDate,
      operationDate: standardDefaultDate,
      declarationPeriod: time,
      declarationType: index >= 64 ? "晚峰量价申报" : index >= 40 ? "平段量价申报" : "谷段量价申报",
      volumeValue: shaanxiUnifiedDeclarationVolumeValues[index],
      priceValue: shaanxiUnifiedDeclarationPriceValues[index],
      declarationStatus: index % 12 === 0 ? "待校验" : index % 3 === 0 ? "已回传" : "已提交",
      updatedAt: buildUpdatedAt(dataUpdatedAt, -9),
    };
  });
  var shaanxiUnifiedDeclarationPage = createPageData({
    title: "日前申报",
    description: "陕西交易中心信息披露页统一结构下的日前申报 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -9),
    dataSource: "陕西电力交易中心日前申报 mock",
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
      { id: "sx-info-declaration-volume", label: "申报电量", color: "#9DC4FF", valueKey: "volumeValue" },
    ],
    lineSeriesDefinitions: [
      { id: "sx-info-declaration-price", label: "申报价格", color: "#FF7A45", valueKey: "priceValue" },
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
    tableData: shaanxiUnifiedDeclarationRows,
    tableMinWidth: 1240,
    emptyText: "当前日期暂无陕西日前申报 mock 数据。",
  });
  var shaanxiUnifiedUnitRows = [
    {
      date: standardDefaultDate,
      runDate: standardDefaultDate,
      disclosureType: "机组运行状态",
      unitId: "SX-GEN-001",
      unitName: "西安燃机 1 号机",
      operatingStatus: "运行",
      values: buildWaveValues(15, 96, {
        base: 546,
        dayAmplitude: 22,
        peakAmplitude: 34,
        dayShift: 6,
        peakShift: 15,
        pattern: [-6, 4, 8, -2],
        integer: true,
      }),
    },
    {
      date: standardDefaultDate,
      runDate: standardDefaultDate,
      disclosureType: "机组运行状态",
      unitId: "SX-GEN-002",
      unitName: "咸阳煤机 2 号机",
      operatingStatus: "运行",
      values: buildWaveValues(15, 96, {
        base: 842,
        dayAmplitude: 20,
        peakAmplitude: 30,
        dayShift: 6,
        peakShift: 14,
        pattern: [-8, 6, 10, -4],
        integer: true,
      }),
    },
    {
      date: standardDefaultDate,
      runDate: standardDefaultDate,
      disclosureType: "机组运行状态",
      unitId: "SX-GEN-004",
      unitName: "渭南风场集群",
      operatingStatus: "受限运行",
      values: quarterHours.map(function mapWindValue(_, index) {
        var hour = index / 4;
        var baseValue = 186 + Math.round(Math.max(0, Math.sin(((hour - 5) / 24) * Math.PI * 2)) * 128) + [-18, 10, 16, -6][index % 4];
        return index >= 28 && index <= 76 ? Math.max(baseValue - 54, 88) : baseValue;
      }),
    },
    {
      date: standardDefaultDate,
      runDate: standardDefaultDate,
      disclosureType: "机组运行状态",
      unitId: "SX-GEN-005",
      unitName: "榆林光伏 5 号机",
      operatingStatus: "运行",
      values: quarterHours.map(function mapSolarValue(_, index) {
        var hour = index / 4;
        if (hour < 6 || hour > 18.5) {
          return 0;
        }
        return Math.round(Math.max(0, Math.sin(((hour - 6) / 12.5) * Math.PI) * 212) + [0, 6, -4, 10][index % 4]);
      }),
    },
    {
      date: standardDefaultDate,
      runDate: standardDefaultDate,
      disclosureType: "机组运行状态",
      unitId: "SX-GEN-006",
      unitName: "延安抽蓄 1 号机",
      operatingStatus: "检修",
      values: quarterHours.map(function mapOutageValue() {
        return 0;
      }),
    },
    {
      date: standardDefaultDate,
      runDate: standardDefaultDate,
      disclosureType: "机组运行状态",
      unitId: "SX-GEN-008",
      unitName: "铜川燃机 2 号机",
      operatingStatus: "备用",
      values: quarterHours.map(function mapStandbyValue(_, index) {
        if (index < 52) {
          return 0;
        }
        return 154 + [0, 4, -4, 8][index % 4];
      }),
    },
  ];
  var shaanxiUnifiedUnitStatusRows = shaanxiUnifiedUnitRows.map(function mapUnitStatusRow(row) {
    var formattedRow = {
      date: row.date,
      runDate: row.runDate,
      disclosureType: row.disclosureType,
      unitId: row.unitId,
      unitName: row.unitName,
      operatingStatus: row.operatingStatus,
      updatedAt: buildUpdatedAt(dataUpdatedAt, -7),
    };
    quarterHours.forEach(function eachTime(time, index) {
      formattedRow[time] = row.values[index];
    });
    return formattedRow;
  });
  var shaanxiUnifiedOnlineCapacityValues = quarterHours.map(function mapAggregateValue(_, index) {
    return shaanxiUnifiedUnitRows.reduce(function accumulate(total, row) {
      return total + row.values[index];
    }, 0);
  });
  var shaanxiUnifiedUnitStatusPage = createPageData({
    title: "机组检修容量",
    description: "陕西交易中心信息披露页统一结构下的机组状态 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -7),
    dataSource: "陕西电力交易中心机组状态 mock",
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
      columns: [
        { key: "runDate", title: "机组运行日期" },
        { key: "disclosureType", title: "披露类型" },
        { key: "unitId", title: "机组 ID" },
        { key: "unitName", title: "机组名称" },
        { key: "operatingStatus", title: "运行状态" },
      ]
        .concat(quarterHours.map(function mapTime(time) {
          return { key: time, title: time };
        }))
        .concat([{ key: "updatedAt", title: "更新时间" }]),
      data: shaanxiUnifiedUnitStatusRows,
      minWidth: 9240,
    },
    extraTables: [],
    emptyText: "当前日期暂无陕西机组状态 mock 数据。",
  });
  var shaanxiUnifiedReserveRows = quarterHours.map(function mapReserveRow(time, index) {
    return {
      date: standardDefaultDate,
      time: time,
      positiveReserve: shaanxiPositiveReserveValues[index],
      negativeReserve: shaanxiNegativeReserveValues[index],
      diffValue: shaanxiPositiveReserveValues[index] - shaanxiNegativeReserveValues[index],
      source: "陕西系统备用统一口径",
      updatedAt: buildUpdatedAt(dataUpdatedAt, -3),
    };
  });
  var shaanxiUnifiedReservePage = createPageData({
    title: "系统备用信息",
    description: "陕西交易中心信息披露页统一结构下的系统备用信息 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -3),
    dataSource: "陕西电力交易中心系统备用信息 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "负荷信息",
      secondaryTab: "备用信息",
    },
    viewType: "lineTable",
    chartTitle: "系统备用容量趋势图",
    chartUnit: "MW",
    labelKey: "time",
    seriesDefinitions: [
      { id: "sx-info-reserve-positive", label: "正备用（上备用）", color: "#1677FF", valueKey: "positiveReserve" },
      { id: "sx-info-reserve-negative", label: "负备用（下备用）", color: "#2FCB8F", valueKey: "negativeReserve" },
    ],
    tableColumns: [
      { key: "date", title: "日期" },
      { key: "time", title: "时刻" },
      { key: "positiveReserve", title: "正备用 / 上备用（MW）" },
      { key: "negativeReserve", title: "负备用 / 下备用（MW）" },
      { key: "diffValue", title: "差值（MW）" },
      { key: "source", title: "数据来源" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: shaanxiUnifiedReserveRows,
    tableMinWidth: 1380,
    emptyText: "当前日期暂无陕西备用信息 mock 数据。",
  });
  var shaanxiMarketPageData = {
    datasets: {
      dayAheadDeclaration: shaanxiDayAheadDeclarationPage,
      mediumLongContractCurve: shaanxiContractCurvePage,
      unitStatus: shaanxiUnitStatusPage,
      tradeOverview: shaanxiTradeOverviewPage,
      dailySettlement: shaanxiDailySettlementPage,
      monthlySettlementSeller: shaanxiMonthlySellerPage,
      monthlySettlementConsumer: shaanxiMonthlyConsumerPage,
      reserveInfo: shaanxiReservePage,
      infoUnifiedPrice: shaanxiUnifiedPricePage,
      infoSaleCompanyProfile: shaanxiUnifiedSaleCompanyPage,
      infoNodePrice: shaanxiUnifiedNodePricePage,
      infoDayAheadDeclaration: shaanxiUnifiedDeclarationPage,
      infoUnitStatus: shaanxiUnifiedUnitStatusPage,
      infoReserve: shaanxiUnifiedReservePage,
      infoEmptyVolume: createShaanxiInfoEmptyPage(
        "出清电量",
        "出清电量",
        "",
        "陕西交易中心当前暂未接入出清电量类披露数据，请切换其他披露类型或手动更新数据。",
      ),
      infoEmptyTradeResult: createShaanxiInfoEmptyPage(
        "交易结果",
        "交易结果",
        "",
        "陕西交易中心当前暂未接入现货交易结果类披露数据，请切换其他披露类型或手动更新数据。",
      ),
      infoEmptyEnterprise: createShaanxiInfoEmptyPage(
        "用电企业分时电量",
        "用电企业分时电量",
        "",
        "陕西交易中心当前暂未接入用电企业分时电量披露数据。",
      ),
    },
    pageMap: {
      infoDisclosure: {
        defaultDatasetKey: "infoUnifiedPrice",
        primaryTabs: {
          "负荷信息": {
            defaultDatasetKey: "infoUnitStatus",
            secondaryTabs: {
              "负荷信息": "infoUnitStatus",
              "负荷详情": "infoUnitStatus",
              "机组检修容量": "infoUnitStatus",
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
          },
        },
      },
    },
  };

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
      contractCurve: {
        defaultDate: standardDefaultDate,
        sequenceNameOptions: shaanxiCurveSequenceNames,
        contractTypeOptions: shaanxiCurveContractTypes,
        sellerUnitOptions: shaanxiCurveSellerUnits,
        buyerUnitOptions: shaanxiCurveBuyerUnits,
        contractNameOptions: shaanxiCurveContractNames,
        rows: shaanxiRollingContractCurveRows,
      },
      tradeOverview: {
        defaultDate: standardDefaultDate,
        rows: shaanxiRollingTradeOverviewRows,
        fileList: shaanxiRollingTradeOverviewFiles,
      },
    },
    marketPageData: shaanxiMarketPageData,
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
        stepMinutes: 15,
        base: 21420,
        dayAmplitude: 860,
        peakAmplitude: 1380,
        dayShift: 6,
        peakShift: 14,
        dayIncrement: 68,
        modBase: 8,
        modOffset: 3.5,
        noise: 38,
        source: "陕西系统负荷预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -21),
      }),
      "实际负荷": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 21080,
        dayAmplitude: 920,
        peakAmplitude: 1450,
        dayShift: 6,
        peakShift: 15,
        dayIncrement: 62,
        modBase: 8,
        modOffset: 3.5,
        noise: 44,
        source: "陕西系统实际负荷",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -6),
      }),
      "发电总出力": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 22860,
        dayAmplitude: 780,
        peakAmplitude: 1210,
        dayShift: 5,
        peakShift: 14,
        dayIncrement: 56,
        modBase: 8,
        modOffset: 3.5,
        noise: 32,
        source: "陕西发电总出力实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -5),
      }),
      "非市场机组总出力": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 7060,
        dayAmplitude: 280,
        peakAmplitude: 410,
        dayShift: 4,
        peakShift: 12,
        dayIncrement: 22,
        modBase: 8,
        modOffset: 3.5,
        noise: 18,
        source: "陕西非市场机组实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -4),
      }),
      "新能源总出力": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 4380,
        dayAmplitude: 690,
        peakAmplitude: 910,
        dayShift: 8,
        peakShift: 11,
        dayIncrement: 28,
        modBase: 8,
        modOffset: 3.5,
        noise: 24,
        source: "陕西新能源实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -3),
      }),
      "水电（含抽蓄）出力": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 3180,
        dayAmplitude: 240,
        peakAmplitude: 360,
        dayShift: 3,
        peakShift: 10,
        dayIncrement: 16,
        modBase: 8,
        modOffset: 3.5,
        noise: 14,
        source: "陕西水电及抽蓄实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -2),
      }),
      "省间联络线输电情况": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 4360,
        dayAmplitude: 240,
        peakAmplitude: 386,
        dayShift: 4,
        peakShift: 13,
        dayIncrement: 14,
        modBase: 8,
        modOffset: 3.5,
        noise: 15,
        source: "陕西省间联络线实绩",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -8),
      }),
      "省间联络线输电曲线预测": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 4480,
        dayAmplitude: 220,
        peakAmplitude: 358,
        dayShift: 4,
        peakShift: 13,
        dayIncrement: 16,
        modBase: 8,
        modOffset: 3.5,
        noise: 14,
        source: "陕西省间联络线预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -19),
      }),
      "发电总出力预测": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 23140,
        dayAmplitude: 760,
        peakAmplitude: 1180,
        dayShift: 5,
        peakShift: 14,
        dayIncrement: 58,
        modBase: 8,
        modOffset: 3.5,
        noise: 30,
        source: "陕西发电总出力预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -22),
      }),
      "非市场机组总出力预测": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 7220,
        dayAmplitude: 260,
        peakAmplitude: 390,
        dayShift: 4,
        peakShift: 12,
        dayIncrement: 24,
        modBase: 8,
        modOffset: 3.5,
        noise: 17,
        source: "陕西非市场机组预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -18),
      }),
      "新能源总出力预测（日）": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 4520,
        dayAmplitude: 660,
        peakAmplitude: 930,
        dayShift: 8,
        peakShift: 11,
        dayIncrement: 30,
        modBase: 8,
        modOffset: 3.5,
        noise: 22,
        source: "陕西新能源预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -17),
      }),
      "水电（含抽蓄）总出力预测（日）": buildTrendModule(availableDates, {
        unit: "MW",
        purpose: ["负荷预测", "仿真回测"],
        stepMinutes: 15,
        base: 3300,
        dayAmplitude: 220,
        peakAmplitude: 340,
        dayShift: 3,
        peakShift: 10,
        dayIncrement: 18,
        modBase: 8,
        modOffset: 3.5,
        noise: 13,
        source: "陕西水电及抽蓄预测",
        updatedAt: buildUpdatedAt(dataUpdatedAt, -15),
      }),
    },
  };
})(window);
