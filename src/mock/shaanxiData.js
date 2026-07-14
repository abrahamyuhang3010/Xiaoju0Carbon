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

  function buildTimeLabels(stepMinutes, count, startOffsetMinutes) {
    return Array.from({ length: count }, function createLabel(_, index) {
      var totalMinutes = index * stepMinutes + (startOffsetMinutes || 0);
      var hour = Math.floor(totalMinutes / 60);
      var minute = totalMinutes % 60;
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
    var quarterValues = quarterHours.map(function createValue(_, index) {
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
    var stepMinutes = options.stepMinutes || 15;
    var pointCount = options.pointCount || (stepMinutes === 15 ? 96 : 24);
    var labels = options.labels || buildTimeLabels(stepMinutes, pointCount, stepMinutes === 15 ? stepMinutes : 0);

    return dates.reduce(function accumulateRows(result, date, dayIndex) {
      return result.concat(
        labels.map(function createRow(time, pointIndex) {
          var hour = stepMinutes === 15 ? (pointIndex + 1) / 4 : pointIndex;
          var dayWave = Math.sin(((hour - options.dayShift) / 24) * Math.PI * 2) * options.dayAmplitude;
          var peakWave = Math.max(0, Math.sin(((hour - options.peakShift) / 24) * Math.PI * 2)) * options.peakAmplitude;
          var noiseIndex = stepMinutes === 15 ? pointIndex : hour;
          var trendValue =
            options.base +
            dayIndex * options.dayIncrement +
            dayWave +
            peakWave +
            ((noiseIndex % options.modBase) - options.modOffset) * options.noise;
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

  // 陕西原始 96 点数据按周期结束时刻标记，首点为 00:15，末点为 24:00。
  var quarterHours = buildTimeLabels(15, 96, 15);
  var hours = buildTimeLabels(60, 24);
  var availableDates = buildDateRange("2026-04-01", 122);
  var mockMonths = ["2026-04", "2026-05", "2026-06", "2026-07"];
  var defaultRange = {
    start: "2026-07-25",
    end: "2026-07-31",
  };
  var dataUpdatedAt = "2026-07-31 10:41:06";
  var shaanxiInfoUnitStatusDate = "2026-07-31";
  var shaanxiInfoUnitStatusUpdatedAt = "2026-07-31 23:00:17";
  var shaanxiInfoDailyMockDates = availableDates.slice();
  var dataSource = "陕西电力交易中心信息披露";
  var shaanxiContractCurveSource = global.BOSS_SHAANXI_CONTRACT_CURVE_SOURCE || {};
  var weightedPriceRows = buildPriceRows(availableDates, 328, "陕西用户侧加权电价口径", buildUpdatedAt(dataUpdatedAt, -16));
  var saleCompanyRows = availableDates.map(buildQuarterlySalesRow);
  var average96Values = averageBySlot(saleCompanyRows, "quarterValues");
  var average24Values = averageBySlot(saleCompanyRows, "converted24Values");
  var settlementDates = availableDates.slice();
  function expandRowsByShaanxiInfoDates(rows, dateKeys) {
    return shaanxiInfoDailyMockDates.reduce(function accumulateRows(result, date) {
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
  var settlementMonthRows = mockMonths.reduce(function accumulateMonthRows(result, month, monthIndex) {
    return result.concat(settlementDailyTemplates.map(function mapTemplate(template, templateIndex) {
      var monthLift = 1 + monthIndex * 0.04;
      var energy = Math.round((228700 - templateIndex * 13600 + monthIndex * 11300 + templateIndex * 1420) * monthLift);
      var fee = Math.round(energy * (45.1 + monthIndex * 0.76 + templateIndex * 0.28));
      return {
        month: month,
        enterpriseCode: template.enterpriseCode,
        enterpriseName: template.enterpriseName,
        accountNo: template.accountNo,
        energy: energy,
        fee: fee,
        agencyIncome: Math.round(energy * (1.08 + templateIndex * 0.018)),
        status: month === "2026-07" && templateIndex >= 2 ? (templateIndex === 2 ? "结算中" : "待确认") : "已出账",
      };
    }));
  }, []);
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

  var standardDefaultDate = "2026-07-31";
  var standardDefaultMonth = "2026-07";
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
  settlementDates.forEach(function eachCurveDate(date, dayIndex) {
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
  settlementDates.forEach(function eachTradeDate(date, dayIndex) {
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
  var shaanxiDeclarationPowerValues = buildWaveValues(15, 96, {
    base: 218,
    dayAmplitude: 34,
    peakAmplitude: 58,
    dayShift: 7,
    peakShift: 14,
    valleyEndHour: 6,
    valleyOffset: -40,
    pattern: [-4.2, 2.1, 4.8, -1.9],
  });
  var shaanxiDeclarationPowerSeries = createSeries("declarePower", "申报电力", quarterHours, shaanxiDeclarationPowerValues, "MW");
  var shaanxiDayAheadDeclarationRows = quarterHours.map(function mapDeclarationPower(time, index) {
    return {
      declarationDate: standardDefaultDate,
      time: time,
      powerMw: shaanxiDeclarationPowerValues[index],
    };
  });
  var shaanxiDayAheadDeclarationPage = createPageData({
    title: "日前申报",
    description: "陕西交易中心日前申报电力 96 点 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -9),
    dataSource: "陕西电力交易中心日前申报 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "日前申报",
      secondaryTab: "",
    },
    summaryCards: [
      { label: "申报电力峰值", value: shaanxiDeclarationPowerSeries.max, unit: "MW" },
      { label: "申报电力谷值", value: shaanxiDeclarationPowerSeries.min, unit: "MW" },
      { label: "申报电力均值", value: shaanxiDeclarationPowerSeries.average, unit: "MW" },
      { label: "申报点数", value: shaanxiDayAheadDeclarationRows.length, unit: "点" },
    ],
    chartType: "line",
    chartUnit: "MW",
    chartSeries: [shaanxiDeclarationPowerSeries],
    tableColumns: [
      { key: "time", title: "时刻" },
      { key: "powerMw", title: "申报电力（MW）" },
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
  var shaanxiDailySettlementDates = buildDateRange(shaanxiDailySettlementDate, 3);
  var shaanxiDailySettlementEndDate = shaanxiDailySettlementDates[shaanxiDailySettlementDates.length - 1];
  var shaanxiDailySettlementUnitName = "售电公司-北京小桔新能源汽车科技有限公司-常规企业-2026";
  function createShaanxiDailySettlementQuarterRow(date, dayIndex, index) {
    var periodNumber = index + 1;
    var totalMinutes = periodNumber * 15;
    var hour = totalMinutes / 60;
    var minute = totalMinutes % 60;
    var timePoint = pad(Math.floor(hour)) + ":" + pad(minute);

    if (index === 0) {
      return {
        date: date,
        settlementDate: date,
        settlementTypeName: "用户侧日清分账单",
        dataType: "解析结果",
        settlementUnitName: shaanxiDailySettlementUnitName,
        period: "1",
        timePoint: "00:15",
        actualUsage: Number((1.172 + dayIndex * 0.018).toFixed(3)),
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
        date: date,
        settlementDate: date,
        settlementTypeName: "用户侧日清分账单",
        dataType: "解析结果",
        settlementUnitName: shaanxiDailySettlementUnitName,
        period: "2",
        timePoint: "00:30",
        actualUsage: Number((1.241 + dayIndex * 0.018).toFixed(3)),
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
        dayIndex * 0.018 +
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
      date: date,
      settlementDate: date,
      settlementTypeName: "用户侧日清分账单",
      dataType: "解析结果",
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
  }
  var shaanxiDailySettlementRows = shaanxiDailySettlementDates.reduce(function accumulateSettlementRows(result, date, dayIndex) {
    return result.concat(
      Array.from({ length: 96 }, function createSettlementRow(_, index) {
        return createShaanxiDailySettlementQuarterRow(date, dayIndex, index);
      }),
    );
  }, []);
  var shaanxiDailySettlementFiles = shaanxiDailySettlementDates.map(function mapSettlementFile(date, index) {
    return {
      id: "sx-daily-excel-" + pad(index + 1),
      fileName: date + "用户侧日清分账单.xlsx",
      fileType: "日清算 Excel",
      publishTime: buildUpdatedAt("2026-05-09 10:52:48", index * 3),
      parseStatus: "已解析",
      downloadUrl: "#",
    };
  });
  var settlementDailyHourColumns = Array.from({ length: 24 }, function createHourColumn(_, index) {
    return String(index + 1) + "时";
  });
  var settlementDailyColumns = [
    { key: "settlementDate", title: "日期" },
    { key: "settlementTypeName", title: "结算类型名称" },
    { key: "dataType", title: "数据类型" },
    { key: "settlementUnitName", title: "结算单元名称" },
    { key: "timePoint", title: "时间点位" },
    { key: "actualUsage", title: "实际用电量（MWh）" },
    { key: "intraProvinceNetContractVolume", title: "省内净合同电量（MWh）" },
    { key: "intraProvinceNetContractFee", title: "省内净合同电费（元）" },
    { key: "mediumLongTermReferencePrice", title: "中长期结算参考点电价（元/MWh）" },
    { key: "intraProvinceContractFee", title: "省内合约电费（元）" },
    { key: "interProvinceNetContractVolume", title: "省间净合同电量（MWh）" },
    { key: "interProvinceNetContractFee", title: "省间净合同电费（元）" },
    { key: "dayAheadVolume", title: "日前交易电量（MWh）" },
    { key: "dayAheadUnifiedPrice", title: "日前统一结算点电价（元/MWh）" },
    { key: "dayAheadFee", title: "日前交易电费（元）" },
    { key: "realTimeVolume", title: "实时交易电量（MWh）" },
    { key: "realTimeUnifiedPrice", title: "实时统一结算点电价（元/MWh）" },
    { key: "realTimeFee", title: "实时交易电费（元）" },
    { key: "remark", title: "备注" },
  ];

  function aggregateShaanxiQuarterRowsByHour(sourceKey, digits) {
    return Array.from({ length: 24 }, function aggregateHour(_, hourIndex) {
      var total = shaanxiDailySettlementRows
        .slice(hourIndex * 4, hourIndex * 4 + 4)
        .reduce(function accumulate(sumValue, row) {
          return sumValue + Number(row[sourceKey] || 0);
        }, 0);
      return Number(total.toFixed(digits));
    });
  }

  function createShaanxiDailySettlementWideRow(settlementTypeName, dataType, sourceKey, digits, enterpriseCode, enterpriseName) {
    var values = aggregateShaanxiQuarterRowsByHour(sourceKey, digits);
    var totalValue = Number(
      values
        .reduce(function accumulate(total, value) {
          return total + Number(value || 0);
        }, 0)
        .toFixed(digits),
    );
    var row = {
      date: shaanxiDailySettlementDate,
      settlementDate: shaanxiDailySettlementDate,
      settlementTypeName: settlementTypeName,
      dataType: dataType,
      enterpriseCode: enterpriseCode,
      enterpriseName: enterpriseName,
      "日期": shaanxiDailySettlementDate,
      "结算类型名称": settlementTypeName,
      "数据类型": dataType,
      "企业编码": enterpriseCode,
      "企业名称": enterpriseName,
      "合计值": totalValue,
    };

    settlementDailyHourColumns.forEach(function eachHour(hourLabel, index) {
      row[hourLabel] = values[index] || 0;
    });

    if (sourceKey === "actualUsage") {
      row.actualUsage = totalValue;
      row.monthlyActualUsage = totalValue;
    }
    if (sourceKey === "intraProvinceNetContractVolume") {
      row.mediumLongTermTradingPower = totalValue;
    }
    if (sourceKey === "dayAheadUnifiedPrice") {
      row.tradingCostPrice = totalValue / Math.max(values.length, 1);
    }

    return row;
  }

  var shaanxiDailySettlementWideRows = [
    createShaanxiDailySettlementWideRow("实际用电量", "电量", "actualUsage", 3, "ab8ec71b764f43fd8a760daa99c26b7a", "北京小桔新能源汽车科技有限公司"),
    createShaanxiDailySettlementWideRow("省内净合同", "电量", "intraProvinceNetContractVolume", 3, "ab8ec71b764f43fd8a760daa99c26b7a", "北京小桔新能源汽车科技有限公司"),
    createShaanxiDailySettlementWideRow("省内净合同", "电费", "intraProvinceNetContractFee", 2, "ab8ec71b764f43fd8a760daa99c26b7a", "北京小桔新能源汽车科技有限公司"),
    createShaanxiDailySettlementWideRow("省内合约", "电费", "intraProvinceContractFee", 2, "ab8ec71b764f43fd8a760daa99c26b7a", "北京小桔新能源汽车科技有限公司"),
    createShaanxiDailySettlementWideRow("日前交易", "电量", "dayAheadVolume", 3, "ab8ec71b764f43fd8a760daa99c26b7a", "北京小桔新能源汽车科技有限公司"),
    createShaanxiDailySettlementWideRow("实时交易", "电量", "realTimeVolume", 3, "ab8ec71b764f43fd8a760daa99c26b7a", "北京小桔新能源汽车科技有限公司"),
  ];
  var shaanxiDailySettlementPage = createPageData({
    title: "日清算",
    description: "陕西交易中心日清算按 96 个 15 分钟时段展示的用户侧日清分账单 mock 数据。",
    updateTime: "2026-05-09 10:52:48",
    dataSource: "陕西交易中心日清算Excel解析",
    filters: {
      dateRange: {
        start: shaanxiDailySettlementDate,
        end: shaanxiDailySettlementEndDate,
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
    tableColumns: settlementDailyColumns,
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
    settlementMonth: standardDefaultMonth,
    settlementBillNo: "SNPX-2026-07-03030",
    settlementDocumentTitle: "陕西电力交易中心有限公司2026年07月交易结算单",
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
    updateTime: "2026-07-31 10:52:48",
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
  var shaanxiMonthlySettlementColumns = [
    { key: "monthLabel", label: "年月", fixed: true, width: 120 },
    { key: "electricityLabel", label: "电量", width: 96 },
    {
      label: "省内绿色电力交易(电能量)",
      children: [
        { key: "monthlyTradePlanPower", label: "电量", type: "energy", width: 138 },
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
  var shaanxiMonthlyPurchaseRows = [
    { monthLabel: "202604", electricityLabel: "电量", monthlyTradePlanPower: 6025.925, settlementPriceOrAverage: 190.633, settlementFee: 1148739.45, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", monthlyTradePlanPower: 3193.288, settlementPriceOrAverage: 259.275, settlementFee: 827939.23, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", monthlyTradePlanPower: 2389.006, settlementPriceOrAverage: 315.000, settlementFee: 752536.89, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", monthlyTradePlanPower: 1098.585, settlementPriceOrAverage: 166.040, settlementFee: 182409.13, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", monthlyTradePlanPower: -294.303, settlementPriceOrAverage: 363.594, settlementFee: -107006.79, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", monthlyTradePlanPower: 0.000, settlementPriceOrAverage: 105.991, settlementFee: 299106.52, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", monthlyTradePlanPower: 0.000, settlementPriceOrAverage: 2037.350, settlementFee: 21693.70, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", monthlyTradePlanPower: 0.000, settlementPriceOrAverage: 647.667, settlementFee: 9235.73, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", monthlyTradePlanPower: 6025.925, settlementPriceOrAverage: 190.633, settlementFee: 1148739.45, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", monthlyTradePlanPower: 6025.925, settlementPriceOrAverage: 192.166, settlementFee: 1157975.18, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00, subjectCode: "合计", subjectName: "购电侧合计" },
  ];
  var shaanxiMonthlySaleRows = [
    { monthLabel: "202604", electricityLabel: "电量", monthlyTradePlanPower: 6025.925, settlementPriceOrAverage: 202.995, settlementFee: 1223232.87, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电费", monthlyTradePlanPower: 0.000, settlementPriceOrAverage: null, settlementFee: -65257.69, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", monthlyTradePlanPower: 6025.925, settlementPriceOrAverage: 202.995, settlementFee: 1223232.87, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00 },
    { monthLabel: "202604", electricityLabel: "电量", monthlyTradePlanPower: 6025.925, settlementPriceOrAverage: 192.166, settlementFee: 1157975.18, greenPeakEnergy: 0.000, greenPeakPrice: 0.000, greenPeakFee: 0.00, greenHighEnergy: 0.000, greenHighPrice: 0.000, greenHighFee: 0.00, subjectCode: "合计", subjectName: "售电公司月结算合计" },
  ];
  shaanxiMonthlyPurchaseRows.forEach(function normalizeMonthlyPurchaseRow(row) {
    row.monthLabel = standardDefaultMonth.replace("-", "");
  });
  shaanxiMonthlySaleRows.forEach(function normalizeMonthlySaleRow(row) {
    row.monthLabel = standardDefaultMonth.replace("-", "");
  });
  var shaanxiMonthlySettlementData = {
    provinceCode: "sx",
    provinceName: "陕西",
    hasPurchaseSaleSide: true,
    month: shaanxiMonthlySettlementSummary.settlementMonth,
    updateTime: shaanxiMonthlySettlementSummary.updateTime,
    updateSource: "PDF解析",
    purchaseSide: {
      summaryCards: [
        { label: "当年实际用电量", value: null, unit: "MWh", digits: 3 },
        { label: "中长期交易电量", value: shaanxiMonthlySettlementSummary.buyerContractPower, unit: "MWh", digits: 3 },
        { label: "中长期占实际用电比例", value: null, unit: "%", digits: 2 },
        { label: "度电收益", value: null, unit: "厘", digits: 2 },
      ],
      tableColumns: shaanxiMonthlySettlementColumns,
      tableRows: shaanxiMonthlyPurchaseRows,
    },
    saleSide: {
      summaryCards: [
        { label: "当年实际用电量", value: null, unit: "MWh", digits: 3 },
        { label: "中长期交易电量", value: null, unit: "MWh", digits: 3 },
        { label: "中长期占实际用电比例", value: null, unit: "%", digits: 2 },
        { label: "度电收益", value: 10.83, unit: "厘", digits: 2 },
      ],
      tableColumns: shaanxiMonthlySettlementColumns,
      tableRows: shaanxiMonthlySaleRows,
    },
  };
  var shaanxiMonthlySettlementFiles = [
    {
      id: "sx-monthly-pdf-001",
      fileName: "北京小桔新能源汽车科技有限公司2026-07-01.pdf",
      fileType: "月结算 PDF",
      publishTime: "2026-07-31 00:00:00",
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
    tableColumns: shaanxiMonthlySettlementColumns,
    tableData: shaanxiMonthlySaleRows,
    settlementSummary: shaanxiMonthlySettlementSummary,
    fileList: shaanxiMonthlySettlementFiles,
    documentTitle: "售电公司交易结算单",
    emptyText: "当前月份暂无陕西售电公司月结算 mock 数据。",
  });
  var shaanxiMonthlyConsumerRows = mockMonths.reduce(function accumulateConsumerRows(result, month, monthIndex) {
    var templates = [
      ["SXUSER001", "西安高新补能中心", "SX-U-001", 38460],
      ["SXUSER002", "咸阳物流港充电站", "SX-U-002", 37240],
      ["SXUSER003", "宝鸡公交能源站", "SX-U-003", 35820],
      ["SXUSER004", "渭南产业园综合站", "SX-U-004", 34160],
      ["SXUSER005", "榆林交通能源港", "SX-U-005", 32980],
      ["SXUSER006", "汉中补能站群", "SX-U-006", 31820],
    ];
    return result.concat(templates.map(function mapConsumer(template, templateIndex) {
      var settlementEnergy = Math.round(template[3] * (0.95 + monthIndex * 0.032 + templateIndex * 0.003));
      return {
        month: month,
        companyType: "用电企业",
        companyCode: template[0],
        companyName: template[1],
        accountNo: template[2],
        settlementEnergy: settlementEnergy,
        totalFee: Math.round(settlementEnergy * (45.6 + monthIndex * 0.84 + templateIndex * 0.18)),
        serviceFee: Math.round(settlementEnergy * 1.06),
        deviationFee: Math.round(settlementEnergy * (0.38 + templateIndex * 0.01)),
        invoiceStatus: month === "2026-07" && templateIndex >= 2 ? (templateIndex < 4 ? "结算中" : "待确认") : "已出账",
      };
    }));
  }, []);
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
    tableColumns: shaanxiMonthlySettlementColumns,
    tableData: shaanxiMonthlyPurchaseRows,
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

  function getFirstRowDate(rows, fallbackDate) {
    var firstDatedRow = (rows || []).find(function findRow(row) {
      return row && row.date;
    });
    return (firstDatedRow && firstDatedRow.date) || fallbackDate;
  }

  function shiftDateText(dateText, offsetDays) {
    var date = new Date(String(dateText || standardDefaultDate) + "T00:00:00");
    date.setDate(date.getDate() + offsetDays);
    return formatDate(date);
  }

  function getContractCurveDetailLabels() {
    return (shaanxiContractCurveSource.detailLabels || quarterHours || []).slice();
  }

  function buildContractCurveSummaryValue(value, slotIndex, dayIndex) {
    if (typeof value === "number") {
      return Number((value + dayIndex * 0.09).toFixed(3));
    }

    var hour = slotIndex / 4;
    var dayWave = Math.max(0, Math.sin(((hour - 7) / 24) * Math.PI * 2)) * 0.32;
    var peakWave = Math.max(0, Math.sin(((hour - 15) / 24) * Math.PI * 2)) * 0.58;
    var valleyOffset = hour < 6 ? -0.18 : 0;
    var pattern = [0, 0.018, -0.012, 0.026][slotIndex % 4];
    return Number(Math.max(0, 0.82 + dayIndex * 0.09 + dayWave + peakWave + valleyOffset + pattern).toFixed(3));
  }

  function buildContractCurveSummaryRows() {
    var sourceRows = shaanxiContractCurveSource.summaryRows || [];
    var baseDate = getFirstRowDate(sourceRows, "2026-07-01");
    return buildDateRange(baseDate, 3).reduce(function accumulateSummaryRows(result, date, dayIndex) {
      return result.concat(sourceRows.map(function mapSummaryRow(row, slotIndex) {
        return {
          date: date,
          time: row.time,
          volume: buildContractCurveSummaryValue(row.volume, slotIndex, dayIndex),
          updatedAt: date + " 00:00:00",
        };
      }));
    }, []);
  }

  function adjustContractCurveDetailValue(value, slotIndex, dayIndex, unitType) {
    if (typeof value !== "number") {
      return null;
    }
    if (value === 0) {
      return 0;
    }
    if (unitType === "price") {
      return Number((value + dayIndex * 1.2 + [0, 0.1, -0.1, 0.2][slotIndex % 4]).toFixed(3));
    }
    return Number((value * (1 + dayIndex * 0.02)).toFixed(3));
  }

  function buildContractCurveDetailRows(sourceRows, unitType) {
    var labels = getContractCurveDetailLabels();
    var firstDate = getFirstRowDate(sourceRows, "2026-05-08");
    return buildDateRange(firstDate, 3).reduce(function accumulateDetailRows(result, date, dayIndex) {
      return result.concat((sourceRows || []).map(function mapDetailRow(row, rowIndex) {
        var resultRow = {
          id: "sx-contract-curve-" + unitType + "-" + dayIndex + "-" + rowIndex,
          date: date,
          sequenceName: row.sequenceName || "",
          contractName: row.contractName || "",
          contractType: row.contractType || "",
          sellerUserName: row.sellerUserName || "",
          sellerUnitName: row.sellerUnitName || "",
          buyerUserName: row.buyerUserName || "",
          buyerUnitName: row.buyerUnitName || "",
        };

        labels.forEach(function eachLabel(_, index) {
          resultRow["slot" + index] = adjustContractCurveDetailValue((row.values || [])[index], index, dayIndex, unitType);
        });

        return resultRow;
      }));
    }, []);
  }

  function getContractCurveUniqueOptions(rows, key) {
    var options = ["全部"];
    (rows || []).forEach(function eachRow(row) {
      var value = row && row[key];
      if (value && options.indexOf(value) < 0) {
        options.push(value);
      }
    });
    return options;
  }

  function buildContractCurveDetailColumns(unit) {
    return [
      { key: "date", title: "日期", width: 130 },
      { key: "sequenceName", title: "合同序列名称", width: 260 },
      { key: "contractName", title: "合同名称", width: 420 },
      { key: "contractType", title: "合同类型", width: 170 },
      { key: "sellerUserName", title: "售方用户名称", width: 220 },
      { key: "sellerUnitName", title: "售方单元名称", width: 280 },
      { key: "buyerUserName", title: "购方用户名称", width: 220 },
      { key: "buyerUnitName", title: "购方单元名称", width: 280 },
    ].concat(
      getContractCurveDetailLabels().map(function mapLabel(label, index) {
        return { key: "slot" + index, title: label + "（" + unit + "）", width: 104 };
      })
    );
  }

  var shaanxiContractCurveSummaryRows = buildContractCurveSummaryRows();
  var shaanxiContractCurveSummaryDate = getFirstRowDate(shaanxiContractCurveSummaryRows, "2026-07-01");
  var shaanxiContractCurveSummaryEndDate = shiftDateText(shaanxiContractCurveSummaryDate, 2);
  var shaanxiContractCurveDetailVolumeRows = buildContractCurveDetailRows(shaanxiContractCurveSource.volumeRows || [], "volume");
  var shaanxiContractCurveDetailPriceRows = buildContractCurveDetailRows(shaanxiContractCurveSource.priceRows || [], "price");
  var shaanxiContractCurveDetailDate = getFirstRowDate(shaanxiContractCurveDetailVolumeRows, "2026-05-08");
  var shaanxiContractCurveDetailEndDate = shiftDateText(shaanxiContractCurveDetailDate, 2);
  var shaanxiContractCurveFilterRows = shaanxiContractCurveDetailVolumeRows.length
    ? shaanxiContractCurveDetailVolumeRows
    : shaanxiContractCurveDetailPriceRows;
  var shaanxiContractCurveFilterFields = [
    {
      type: "text",
      label: "合同序列名称",
      fieldKey: "contractCurveSequenceName",
      rowKey: "sequenceName",
      placeholder: "请输入合同序列名称",
      widthClass: "filter-input-wide",
    },
    {
      type: "text",
      label: "合同名称",
      fieldKey: "contractCurveName",
      rowKey: "contractName",
      placeholder: "请输入合同名称",
      widthClass: "filter-input-wide",
    },
    {
      type: "text",
      label: "售方用户名称",
      fieldKey: "contractCurveSellerUserName",
      rowKey: "sellerUserName",
      placeholder: "请输入售方用户名称",
      widthClass: "filter-input-wide",
    },
    {
      type: "text",
      label: "售方单元名称",
      fieldKey: "contractCurveSellerUnitName",
      rowKey: "sellerUnitName",
      placeholder: "请输入售方单元名称",
      widthClass: "filter-input-wide",
    },
    {
      type: "text",
      label: "购方用户名称",
      fieldKey: "contractCurveBuyerUserName",
      rowKey: "buyerUserName",
      placeholder: "请输入购方用户名称",
      widthClass: "filter-input-wide",
    },
    {
      type: "text",
      label: "购方单元名称",
      fieldKey: "contractCurveBuyerUnitName",
      rowKey: "buyerUnitName",
      placeholder: "请输入购方单元名称",
      widthClass: "filter-input-wide",
    },
  ];
  var shaanxiContractCurveSummaryPage = createPageData({
    title: "中长期合同曲线汇总",
    description: "陕西交易中心信息披露页中长期合同曲线汇总数据。",
    updateTime: shaanxiContractCurveSummaryDate + " 00:00:00",
    dataSource: "表1：中长期合同曲线汇总",
    filters: {
      date: shaanxiContractCurveSummaryDate,
      dateRange: {
        start: shaanxiContractCurveSummaryDate,
        end: shaanxiContractCurveSummaryEndDate,
      },
      primaryTab: "中长期合同曲线",
      secondaryTab: "中长期合同曲线汇总",
    },
    viewType: "contractCurveSummary",
    datePickerMode: "range",
    chartTitle: "中长期合同曲线汇总趋势图",
    chartUnit: "MWh",
    labelKey: "time",
    tableColumns: [
      { key: "date", title: "日期" },
      { key: "time", title: "时段" },
      { key: "volume", title: "电量（MWh）" },
    ],
    tableData: shaanxiContractCurveSummaryRows,
    tableMinWidth: 620,
    seriesDefinitions: [
      { id: "sx-contract-curve-summary-volume", label: "电量", color: "#1677FF", valueKey: "volume" },
    ],
    fileList: buildMockFileList("sx", "contract-curve-summary", shaanxiContractCurveSummaryDate, 1),
    availableRange: {
      start: shaanxiContractCurveSummaryDate,
      end: shaanxiContractCurveSummaryEndDate,
    },
    emptyText: "当前日期暂无陕西中长期合同曲线汇总数据。",
  });
  var shaanxiContractCurveDetailPage = createPageData({
    title: "中长期合同曲线明细",
    description: "陕西交易中心信息披露页中长期合同曲线明细数据。",
    updateTime: shaanxiContractCurveDetailDate + " 00:00:00",
    dataSource: "表2：中长期合同曲线明细",
    filters: {
      date: shaanxiContractCurveDetailDate,
      dateRange: {
        start: shaanxiContractCurveDetailDate,
        end: shaanxiContractCurveDetailEndDate,
      },
      primaryTab: "中长期合同曲线",
      secondaryTab: "中长期合同曲线明细",
    },
    viewType: "contractCurveDetail",
    datePickerMode: "range",
    filterFields: shaanxiContractCurveFilterFields,
    optionHints: {
      sequenceNames: getContractCurveUniqueOptions(shaanxiContractCurveFilterRows, "sequenceName"),
      contractNames: getContractCurveUniqueOptions(shaanxiContractCurveFilterRows, "contractName"),
      sellerUserNames: getContractCurveUniqueOptions(shaanxiContractCurveFilterRows, "sellerUserName"),
      sellerUnitNames: getContractCurveUniqueOptions(shaanxiContractCurveFilterRows, "sellerUnitName"),
      buyerUserNames: getContractCurveUniqueOptions(shaanxiContractCurveFilterRows, "buyerUserName"),
      buyerUnitNames: getContractCurveUniqueOptions(shaanxiContractCurveFilterRows, "buyerUnitName"),
    },
    detailTabs: ["电量明细", "电价明细"],
    detailTables: {
      "电量明细": {
        title: "电量明细",
        unit: "MWh",
        columns: buildContractCurveDetailColumns("MWh"),
        rows: shaanxiContractCurveDetailVolumeRows,
        minWidth: 12880,
      },
      "电价明细": {
        title: "电价明细",
        unit: "元/MWh",
        columns: buildContractCurveDetailColumns("元/MWh"),
        rows: shaanxiContractCurveDetailPriceRows,
        minWidth: 12880,
      },
    },
    fileList: buildMockFileList("sx", "contract-curve-detail", shaanxiContractCurveDetailDate, 1),
    availableRange: {
      start: shaanxiContractCurveDetailDate,
      end: shaanxiContractCurveDetailEndDate,
    },
    emptyText: "当前日期暂无陕西中长期合同曲线明细数据。",
  });

  var shaanxiWholesaleWeightedPriceBaseRows = [
    { period: "01:00", dailyAveragePrice: 340.332, monthCumulativeAveragePrice: 336.651 },
    { period: "02:00", dailyAveragePrice: 310.068, monthCumulativeAveragePrice: 305.957 },
    { period: "03:00", dailyAveragePrice: 287.119, monthCumulativeAveragePrice: 281.699 },
    { period: "04:00", dailyAveragePrice: 284.456, monthCumulativeAveragePrice: 279.547 },
    { period: "05:00", dailyAveragePrice: 284.637, monthCumulativeAveragePrice: 278.095 },
    { period: "06:00", dailyAveragePrice: 285.315, monthCumulativeAveragePrice: 280.543 },
    { period: "07:00", dailyAveragePrice: 328.148, monthCumulativeAveragePrice: 325.844 },
    { period: "08:00", dailyAveragePrice: 324.695, monthCumulativeAveragePrice: 323.259 },
    { period: "09:00", dailyAveragePrice: 263.009, monthCumulativeAveragePrice: 255.238 },
    { period: "10:00", dailyAveragePrice: 211.339, monthCumulativeAveragePrice: 230.657 },
    { period: "11:00", dailyAveragePrice: 188.483, monthCumulativeAveragePrice: 204.883 },
    { period: "12:00", dailyAveragePrice: 187.203, monthCumulativeAveragePrice: 211.635 },
    { period: "13:00", dailyAveragePrice: 197.284, monthCumulativeAveragePrice: 219.73 },
    { period: "14:00", dailyAveragePrice: 191.713, monthCumulativeAveragePrice: 217.743 },
    { period: "15:00", dailyAveragePrice: 193.123, monthCumulativeAveragePrice: 212.962 },
    { period: "16:00", dailyAveragePrice: 183.29, monthCumulativeAveragePrice: 190.43 },
    { period: "17:00", dailyAveragePrice: 194.166, monthCumulativeAveragePrice: 198.786 },
    { period: "18:00", dailyAveragePrice: 372.861, monthCumulativeAveragePrice: 373.509 },
    { period: "19:00", dailyAveragePrice: 396.778, monthCumulativeAveragePrice: 395.756 },
    { period: "20:00", dailyAveragePrice: 395.71, monthCumulativeAveragePrice: 393.409 },
    { period: "21:00", dailyAveragePrice: 389.585, monthCumulativeAveragePrice: 379.968 },
    { period: "22:00", dailyAveragePrice: 360.472, monthCumulativeAveragePrice: 354.909 },
    { period: "23:00", dailyAveragePrice: 345.136, monthCumulativeAveragePrice: 343.362 },
    { period: "24:00", dailyAveragePrice: 333.547, monthCumulativeAveragePrice: 332.861 },
    { period: "合计", dailyAveragePrice: 296.988, monthCumulativeAveragePrice: 299.605 },
  ];
  var shaanxiWholesaleWeightedPriceDate = "2026-06-26";
  var shaanxiWholesaleWeightedPriceEndDate = shiftDateText(shaanxiWholesaleWeightedPriceDate, 2);

  function adjustShaanxiWholesaleWeightedPrice(value, rowIndex, dayIndex, isCumulative) {
    if (typeof value !== "number") {
      return null;
    }
    if (!dayIndex) {
      return value;
    }
    return Number((value + dayIndex * (isCumulative ? 0.72 : 1.18) + [0, 0.16, -0.11, 0.08][rowIndex % 4]).toFixed(3));
  }

  function buildShaanxiWholesaleWeightedPriceRows() {
    return buildDateRange(shaanxiWholesaleWeightedPriceDate, 3).reduce(function accumulateWholesaleRows(result, date, dayIndex) {
      return result.concat(
        shaanxiWholesaleWeightedPriceBaseRows.map(function mapWholesaleRow(row, rowIndex) {
          return {
            date: date,
            period: row.period,
            dailyAveragePrice: adjustShaanxiWholesaleWeightedPrice(row.dailyAveragePrice, rowIndex, dayIndex, false),
            monthCumulativeAveragePrice: adjustShaanxiWholesaleWeightedPrice(row.monthCumulativeAveragePrice, rowIndex, dayIndex, true),
          };
        }),
      );
    }, []);
  }

  var shaanxiRetailSettlementBaseMetrics = [
    {
      label: "Q中长期合同电量",
      key: "mediumLongContractVolume",
      type: "volume",
      values: [248535.492, 212227.798, 206528.879, 205958.478, 203837.717, 209615.111, 215301.967, 266930.242, 249677.322, 155992.864, 155787.809, 157008.828, 151872.477, 150136.939, 152041.441, 154291.314, 156233.083, 221177.334, 270089.253, 274263.081, 266390.587, 203516.223, 225346.678, 223023.618],
    },
    {
      label: "Q日前市场出清电量",
      key: "dayAheadClearingVolume",
      type: "volume",
      values: [292556.219, 282756.58, 277061.944, 274070.016, 269364.952, 273130.506, 275054.377, 272243.719, 304003.076, 276989.281, 286128.391, 285515.856, 278128.749, 277069.173, 278497.533, 275064.847, 276334.485, 299914.719, 294283.847, 294315.937, 292817.6, 272105.14, 280299.858, 277740.554],
    },
    {
      label: "Q实际用电量",
      key: "actualUsage",
      type: "volume",
      values: [315493.187, 319250.077, 319116.773, 317289.091, 312676.225, 312776.751, 313976.151, 318216.556, 335194.728, 354003.916, 362855.913, 360965.938, 351646.284, 351754.525, 351614.838, 352456.791, 350667.337, 341490.951, 338715.894, 337494.759, 333729.782, 327395.409, 318423.301, 312070.762],
    },
    {
      label: "K1",
      key: "k1",
      type: "ratio",
      values: [0.79, 0.66, 0.65, 0.65, 0.65, 0.67, 0.69, 0.84, 0.74, 0.44, 0.43, 0.43, 0.43, 0.43, 0.43, 0.44, 0.45, 0.65, 0.8, 0.81, 0.8, 0.62, 0.71, 0.71],
    },
    {
      label: "K2",
      key: "k2",
      type: "ratio",
      values: [0.93, 0.89, 0.87, 0.86, 0.86, 0.87, 0.88, 0.86, 0.91, 0.78, 0.79, 0.79, 0.79, 0.79, 0.79, 0.78, 0.79, 0.88, 0.87, 0.87, 0.88, 0.83, 0.88, 0.89],
    },
    {
      label: "P中长期电价",
      key: "mediumLongPrice",
      type: "price",
      values: [400.942, 358.718, 322.253, 318.902, 319.98, 327.642, 371.154, 361.606, 348.569, 262.557, 217.305, 220.944, 224.875, 224.958, 223.565, 223.134, 275.221, 410.188, 427.333, 430.534, 423.445, 380.49, 385.441, 384.179],
    },
    {
      label: "P现货日前出清电价",
      key: "dayAheadClearingPrice",
      type: "price",
      values: [286.173, 223.816, 199.941, 180.102, 165.854, 193.804, 244.042, 356.293, 264.617, 110.413, 53.985, 34.291, 20.131, 18.116, 25.584, 38.616, 95.34, 262.417, 446.067, 528.449, 418.355, 356.738, 294.333, 265.451],
    },
    {
      label: "P现货实时出清电价",
      key: "realTimeClearingPrice",
      type: "price",
      values: [261.515, 208.095, 196.794, 176.287, 158.797, 179.021, 226.796, 297.127, 251.949, 124.068, 84.074, 62.588, 19.878, 20.125, 28.79, 69.084, 118.849, 313.023, 418.675, 458.304, 395.405, 349.66, 307.37, 243.161],
    },
    {
      label: "P批发购电分时均价",
      key: "wholesaleTimeSharingPrice",
      type: "price",
      values: [394.594, 321.498, 281.08, 272.268, 269.635, 291.458, 341.58, 402.172, 334.976, 174.352, 117.593, 108.326, 108.227, 106.616, 110.011, 113.101, 170.644, 331.647, 449.432, 496.836, 438.033, 374.649, 351.328, 363.122],
    },
    {
      label: "P批发购电加权均价",
      key: "wholesaleWeightedAveragePrice",
      type: "price",
      constant: true,
      values: Array.from({ length: 24 }, function fillWeightedAverage() {
        return 276.033;
      }),
    },
  ];
  var shaanxiRetailSettlementBaseDate = "2026-02-01";
  var shaanxiRetailSettlementEndDate = shiftDateText(shaanxiRetailSettlementBaseDate, 2);

  function adjustShaanxiRetailSettlementValue(value, metric, hourIndex, dayIndex) {
    if (typeof value !== "number") {
      return null;
    }
    if (!dayIndex) {
      return value;
    }
    if (metric.type === "ratio") {
      return Number(Math.max(0, Math.min(0.99, value + dayIndex * 0.01)).toFixed(2));
    }
    if (metric.type === "volume") {
      return Number((value * (1 + dayIndex * 0.006)).toFixed(3));
    }
    if (metric.constant) {
      return Number((value + dayIndex * 0.8).toFixed(3));
    }
    return Number((value + dayIndex * 1.15 + [0, 0.12, -0.08, 0.18][hourIndex % 4]).toFixed(3));
  }

  function buildShaanxiRetailSettlementRows() {
    return buildDateRange(shaanxiRetailSettlementBaseDate, 3).reduce(function accumulateRetailRows(result, date, dayIndex) {
      return result.concat(
        Array.from({ length: 24 }, function mapRetailHour(_, hourIndex) {
          var time = hourIndex === 23 ? "24:00" : pad(hourIndex + 1) + ":00";
          var row = {
            date: date,
            period: time,
            updatedAt: date + " 00:00:00",
          };

          shaanxiRetailSettlementBaseMetrics.forEach(function eachMetric(metric) {
            row[metric.key] = adjustShaanxiRetailSettlementValue(metric.values[hourIndex], metric, hourIndex, dayIndex);
          });

          return row;
        }),
      );
    }, []);
  }

  var shaanxiWholesaleWeightedPriceRows = buildShaanxiWholesaleWeightedPriceRows();
  var shaanxiRetailSettlementRows = buildShaanxiRetailSettlementRows();
  var shaanxiWholesaleWeightedPricePage = createPageData({
    title: "中长期批发市场净合同加权均价",
    description: "陕西交易中心信息披露页交易总体情况中长期批发市场净合同加权均价数据。",
    updateTime: shaanxiWholesaleWeightedPriceDate + " 00:00:00",
    dataSource: "表1：中长期批发市场净合同加权均价",
    filters: {
      date: shaanxiWholesaleWeightedPriceDate,
      dateRange: {
        start: shaanxiWholesaleWeightedPriceDate,
        end: shaanxiWholesaleWeightedPriceEndDate,
      },
      primaryTab: "交易总体情况",
      secondaryTab: "中长期批发市场净合同加权均价",
    },
    viewType: "lineTable",
    datePickerMode: "range",
    chartTitle: "中长期批发市场净合同加权均价趋势图",
    chartUnit: "元/MWh",
    labelKey: "period",
    seriesDefinitions: [
      { id: "sx-wholesale-weighted-daily-price", label: "当日均价", color: "#1677FF", valueKey: "dailyAveragePrice" },
      { id: "sx-wholesale-weighted-month-price", label: "月累计均价（全月）", color: "#2FCB8F", valueKey: "monthCumulativeAveragePrice" },
    ],
    tableColumns: [
      { key: "date", title: "日期" },
      { key: "period", title: "时段" },
      { key: "dailyAveragePrice", title: "当日均价（元/MWh）", precision: 3 },
      { key: "monthCumulativeAveragePrice", title: "月累计均价（全月）（元/MWh）", precision: 3 },
    ],
    tableData: shaanxiWholesaleWeightedPriceRows,
    tableMinWidth: 1120,
    fileList: buildMockFileList("sx", "wholesale-weighted-price", shaanxiWholesaleWeightedPriceDate, 1),
    availableRange: {
      start: shaanxiWholesaleWeightedPriceDate,
      end: shaanxiWholesaleWeightedPriceEndDate,
    },
    emptyText: "当前日期暂无陕西中长期批发市场净合同加权均价数据。",
  });
  var shaanxiRetailSettlementPage = createPageData({
    title: "批发购电分时均价",
    description: "陕西交易中心信息披露页零售用户结算情况批发购电分时均价数据。",
    updateTime: shaanxiRetailSettlementBaseDate + " 00:00:00",
    dataSource: "批发购电分时均价",
    filters: {
      date: shaanxiRetailSettlementBaseDate,
      dateRange: {
        start: shaanxiRetailSettlementBaseDate,
        end: shaanxiRetailSettlementEndDate,
      },
      primaryTab: "零售用户结算情况",
      secondaryTab: "批发购电分时均价",
    },
    viewType: "disclosureTable",
    datePickerMode: "range",
    tableTitle: "批发购电分时均价",
    tableColumns: [
      { key: "date", title: "日期" },
      { key: "period", title: "时段" },
      { key: "mediumLongContractVolume", title: "Q中长期合同电量", precision: 3 },
      { key: "dayAheadClearingVolume", title: "Q日前市场出清电量", precision: 3 },
      { key: "actualUsage", title: "Q实际用电量", precision: 3 },
      { key: "k1", title: "K1", precision: 2 },
      { key: "k2", title: "K2", precision: 2 },
      { key: "mediumLongPrice", title: "P中长期电价", precision: 3 },
      { key: "dayAheadClearingPrice", title: "P现货日前出清电价", precision: 3 },
      { key: "realTimeClearingPrice", title: "P现货实时出清电价", precision: 3 },
      { key: "wholesaleTimeSharingPrice", title: "P批发购电分时电价", precision: 3 },
      { key: "wholesaleWeightedAveragePrice", title: "P批发购电加权均价", precision: 3 },
    ],
    tableData: shaanxiRetailSettlementRows,
    tableMinWidth: 1760,
    fileList: buildMockFileList("sx", "retail-settlement-hourly-price", shaanxiRetailSettlementBaseDate, 1),
    availableRange: {
      start: shaanxiRetailSettlementBaseDate,
      end: shaanxiRetailSettlementEndDate,
    },
    emptyText: "当前日期暂无陕西批发购电分时均价数据。",
  });

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
  var shaanxiUnifiedPriceRows = availableDates.reduce(function buildWeightedPriceRows(result, date, dayIndex) {
    return result.concat(
      quarterHours.map(function mapWeightedPriceRow(_, index) {
        var timeSlot = quarterHours[index];
        var dayAheadValue = round(shaanxiUnifiedDayAheadWeightedValues[index] + dayIndex * 1.8 + ((dayIndex % 3) - 1) * 1.2);
        var realTimeValue = round(dayAheadValue + [5.6, -3.4, 2.8, 6.4][index % 4] + (dayIndex % 2 === 0 ? 1.1 : -1.3));
        var spread = round(realTimeValue - dayAheadValue);
        return {
          province: "sx",
          tradeCenterName: "陕西交易中心",
          date: date,
          timeGranularity: "15min",
          periodCount: 96,
          timeSlot: timeSlot,
          time: timeSlot,
          dayAheadPrice: dayAheadValue,
          realTimePrice: realTimeValue,
          priceDiff: spread,
          spread: spread,
          updatedAt: buildUpdatedAt(dataUpdatedAt, -16),
        };
      }),
    );
  }, []);
  var shaanxiUnifiedPricePage = createPageData({
    title: "全省统一出清价",
    description: "陕西交易中心信息披露页统一结构下的节点电价 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -16),
    dataSource: "陕西电力交易中心节点电价 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "全省统一出清价",
      secondaryTab: "",
    },
    viewType: "lineTable",
    isUnifiedClearingPrice: true,
    timeGranularity: "15min",
    periodCount: 96,
    province: "sx",
    tradeCenterName: "陕西交易中心",
    chartTitle: "全省统一出清价趋势图",
    chartUnit: "元/MWh",
    labelKey: "timeSlot",
    datePickerMode: "single",
    dateLabel: "运行日期",
    dayAheadSeriesLabel: "日前节点电价",
    realTimeSeriesLabel: "实时节点电价",
    tooltipMode: "priceSpread",
    seriesDefinitions: [
      { id: "sx-info-price-dayahead", label: "日前节点电价", color: "#1677FF", valueKey: "dayAheadPrice" },
      { id: "sx-info-price-realtime", label: "实时节点电价", color: "#2FCB8F", valueKey: "realTimePrice" },
    ],
    tableColumns: [
      { key: "date", title: "日期" },
      { key: "timeSlot", title: "时段" },
      { key: "dayAheadPrice", title: "日前节点电价（元/MWh）" },
      { key: "realTimePrice", title: "实时节点电价（元/MWh）" },
      { key: "priceDiff", title: "价差（元/MWh）" },
      { key: "updatedAt", title: "更新时间" },
    ],
    tableData: shaanxiUnifiedPriceRows,
    tableMinWidth: 1340,
    fileList: buildMockFileList("sx", "weighted-price", standardDefaultDate, 3),
    emptyText: "当前日期暂无陕西节点电价 mock 数据。",
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
  var shaanxiEnterpriseNames = [
    "碧辟小桔新能源(深圳)有限责任公司",
    "西安碧辟小桔新能源有限责任公司",
    "陕西九电新能源有限责任公司",
    "陕西众成智慧能源有限公司",
  ];
  var shaanxiEnterpriseProfiles = [
    { enterpriseCode: "SXQY001", userName: "碧辟小桔新能源(深圳)有限责任公司", accountNo: "610390000001", microgridName: "西安经开充电站微电网", microgridId: "SXMG_1001", meteringPointNo: "610390000001_1" },
    { enterpriseCode: "SXQY002", userName: "西安碧辟小桔新能源有限责任公司", accountNo: "610390000002", microgridName: "西咸新区补能微电网", microgridId: "SXMG_1002", meteringPointNo: "610390000002_1" },
    { enterpriseCode: "SXQY003", userName: "陕西九电新能源有限责任公司", accountNo: "610390000003", microgridName: "渭南智慧充电微电网", microgridId: "SXMG_1003", meteringPointNo: "610390000003_1" },
    { enterpriseCode: "SXQY004", userName: "陕西众成智慧能源有限公司", accountNo: "610390000004", microgridName: "榆林综合能源微电网", microgridId: "SXMG_1004", meteringPointNo: "610390000004_1" },
  ];
  var shaanxiEnterpriseTimeLabels = quarterHours.slice();
  var shaanxiUnifiedEnterpriseRows = settlementDates.reduce(function accumulateRows(result, date, dayIndex) {
    return result.concat(
      shaanxiEnterpriseProfiles.map(function mapEnterprise(profile, enterpriseIndex) {
        var row = buildShaanxiQuarterProfileRow(date, profile.userName, enterpriseIndex, dayIndex);
        row.userCode = profile.enterpriseCode;
        row.userName = profile.userName;
        row.accountNo = profile.accountNo;
        row.microgridName = profile.microgridName;
        row.microgridId = profile.microgridId;
        row.meteringPointNo = profile.meteringPointNo;
        row.totalValue = row.total96;
        shaanxiEnterpriseTimeLabels.forEach(function eachTimeLabel(timeLabel, timeIndex) {
          row[timeLabel] = row.quarterValues[timeIndex];
        });
        return row;
      }),
    );
  }, []);
  var shaanxiEnterpriseAccountNos = shaanxiEnterpriseNames.map(function mapEnterpriseAccountNo(_, enterpriseIndex) {
    return "61039" + String(enterpriseIndex + 1).padStart(7, "0");
  });
  var shaanxiUnifiedEnterprisePage = createPageData({
    title: "用电企业分时电量",
    description: "陕西交易中心信息披露页统一结构下的用电企业分时电量 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -8),
    dataSource: "陕西电力交易中心用电企业分时电量 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
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
      "96": {
        label: "96点视图",
        labels: shaanxiEnterpriseTimeLabels.slice(),
        unit: "MWh",
        valueKey: "quarterValues",
        latestLabel: "所选周期最新日电量",
        averageLabel: "所选周期均值电量",
        compareLatestLabel: "对比周期最新日电量",
        compareAverageLabel: "对比周期均值电量",
      },
    },
    defaultProfileMode: "96",
    tableColumns: [
      { key: "date", title: "日期" },
      { key: "userCode", title: "电力用户编码" },
      { key: "userName", title: "电力用户名称" },
      { key: "microgridName", title: "微电网名称" },
      { key: "microgridId", title: "微电网ID" },
      { key: "accountNo", title: "户号" },
      { key: "meteringPointNo", title: "计量点编号" },
    ]
      .concat(shaanxiEnterpriseTimeLabels.map(function mapTimeLabel(timeLabel) {
        return { key: timeLabel, title: timeLabel };
      })),
    tableData: shaanxiUnifiedEnterpriseRows,
    tableMinWidth: 10480,
    fileList: buildMockFileList("sx", "enterprise-load", standardDefaultDate, 3),
    emptyText: "当前日期暂无陕西用电企业分时电量 mock 数据。",
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
    nodeData.rows = expandRowsByShaanxiInfoDates(quarterHours.map(function mapNodeRow(time, index) {
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
    }), ["date"]);
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

  var shaanxiUnifiedDeclarationPowerValues = buildWaveValues(15, 96, {
    base: 920,
    dayAmplitude: 96,
    peakAmplitude: 184,
    dayShift: 7,
    peakShift: 14,
    valleyEndHour: 6,
    valleyOffset: -64,
    pattern: [-8, 12, -6, 10],
    integer: true,
  });
  var shaanxiUnifiedDeclarationRows = expandRowsByShaanxiInfoDates(quarterHours.map(function mapDeclarationRow(time, index) {
    return {
      date: standardDefaultDate,
      time: time,
      powerMw: shaanxiUnifiedDeclarationPowerValues[index],
    };
  }), ["date"]);
  var shaanxiUnifiedDeclarationPage = createPageData({
    title: "日前申报",
    description: "陕西交易中心信息披露页统一结构下的日前申报电力 mock 数据。",
    updateTime: buildUpdatedAt(dataUpdatedAt, -9),
    dataSource: "陕西电力交易中心日前申报 mock",
    filters: {
      date: standardDefaultDate,
      granularity: "15min",
      primaryTab: "日前申报",
      secondaryTab: "",
    },
    viewType: "lineTable",
    chartTitle: "日前申报电力趋势图",
    chartUnit: "MW",
    labelKey: "time",
    datePickerMode: "single",
    dateLabel: "运行日期",
    seriesDefinitions: [
      { id: "sx-info-dayahead-declaration-power", label: "日前申报电力", color: "#1677FF", valueKey: "powerMw" },
    ],
    chartSeries: [createSeries("dayAheadDeclarationPower", "日前申报电力", quarterHours, shaanxiUnifiedDeclarationPowerValues, "MW")],
    tableColumns: [
      { key: "time", title: "时刻" },
      { key: "powerMw", title: "申报电力（MW）" },
    ],
    tableData: shaanxiUnifiedDeclarationRows,
    tableMinWidth: 640,
    emptyText: "当前日期暂无陕西日前申报 mock 数据。",
  });
  var shaanxiInfoUnitStatusRunningPattern = quarterHours.map(function mapRunningStatus() { return 1; });
  var shaanxiInfoUnitStatusStoppedPattern = quarterHours.map(function mapStoppedStatus() { return 0; });
  var shaanxiUnifiedUnitRows = [
    ["SX-GEN-001", "西北.直罗电厂/27kV.#1机", "运行", shaanxiInfoUnitStatusRunningPattern],
    ["SX-GEN-002", "陕西.渭河二厂/20kV.#5机", "停机", shaanxiInfoUnitStatusStoppedPattern],
    ["SX-GEN-003", "陕西.乐天电厂/22kV.2号发电机", "运行", shaanxiInfoUnitStatusRunningPattern],
    ["SX-GEN-004", "陕西.乐天电厂/22kV.1号发电机", "停机", shaanxiInfoUnitStatusStoppedPattern],
    ["SX-GEN-005", "陕西.麟游电厂/20kV.2号发电机", "停机", shaanxiInfoUnitStatusStoppedPattern],
    ["SX-GEN-006", "陕西.宝鸡二厂/20kV.#1机", "停机", shaanxiInfoUnitStatusStoppedPattern],
    ["SX-GEN-007", "陕西.麟游电厂/20kV.1号发电机", "停机", shaanxiInfoUnitStatusStoppedPattern],
    ["SX-GEN-008", "陕西.怀德电厂/20kV.2号机", "停机", shaanxiInfoUnitStatusStoppedPattern],
  ].map(function mapUnit(row) {
    return {
      date: shaanxiInfoUnitStatusDate,
      runDate: shaanxiInfoUnitStatusDate,
      disclosureType: "机组运行状态",
      unitId: row[0],
      unitName: row[1],
      operatingStatus: row[2],
      values: row[3],
    };
  });
  function buildShaanxiUnifiedUnitStatusRows(rows, runDate, valueOffset) {
    var resolvedRunDate = runDate || shaanxiInfoUnitStatusDate;
    return rows.map(function mapUnitStatusRow(row, index) {
    var formattedRow = {
      sequence: index + 1,
      date: resolvedRunDate,
      runDate: resolvedRunDate,
      disclosureType: row.disclosureType,
      unitId: row.unitId,
      unitName: row.unitName,
      operatingStatus: row.operatingStatus,
      updatedAt: shaanxiInfoUnitStatusUpdatedAt,
    };
    quarterHours.forEach(function eachTime(time, index) {
      formattedRow[time] = row.values[(index + (valueOffset || 0)) % row.values.length];
    });
    return formattedRow;
    });
  }

  var shaanxiUnifiedUnitStatusRows = shaanxiInfoDailyMockDates.reduce(function accumulateUnitStatusRows(result, runDate, dateIndex) {
    return result.concat(buildShaanxiUnifiedUnitStatusRows(shaanxiUnifiedUnitRows, runDate, dateIndex % 4));
  }, []);
  var shaanxiUnifiedOnlineCapacityValues = quarterHours.map(function mapAggregateValue(_, index) {
    return shaanxiUnifiedUnitRows.reduce(function accumulate(total, row) {
      return total + row.values[index];
    }, 0);
  });
  var shaanxiUnifiedMaintenanceCapacityValues = buildWaveValues(15, 96, {
    base: 2980,
    dayAmplitude: 260,
    peakAmplitude: 520,
    dayShift: 6,
    peakShift: 13,
    valleyEndHour: 6,
    valleyOffset: -180,
    pattern: [-18, 12, 24, -10],
    integer: true,
  });
  var shaanxiInfoMaintenanceSummaryRows = buildDateRange("2026-07-05", 7).map(function mapMaintenanceSummary(date, index) {
    var predictedTotals = [6987.04, 7257.04, 7067.04, 3980.6, 3565.6, 3565.6, 3155.6];
    var predictedUnitTotals = [4217.04, 4387.04, 4107.04, 1690.6, 1545.6, 1545.6, 1085.6];
    return {
      date: date,
      predictedTotalCapacity: predictedTotals[index],
      predictedUnitTotalCapacity: predictedUnitTotals[index],
      actualTotalCapacity: index < 5 ? 0 : null,
      actualUnitTotalCapacity: index < 5 ? 0 : null,
    };
  });
  var shaanxiUnifiedUnitStatusPage = createPageData({
    title: "机组检修容量",
    description: "陕西交易中心信息披露页统一结构下的机组状态 mock 数据。",
    updateTime: shaanxiInfoUnitStatusUpdatedAt,
    dataSource: "数据披露数据",
    filters: {
      date: shaanxiInfoUnitStatusDate,
      granularity: "15min",
      primaryTab: "负荷信息",
      secondaryTab: "机组检修容量",
    },
    viewType: "maintenanceComposite",
    maintenanceChart: {
      title: "机组检修容量趋势图",
      labels: quarterHours.slice(),
      unit: "MW",
      series: [
        {
          id: "sx-info-maintenance-capacity",
          label: "机组检修容量",
          color: "#1677FF",
          values: shaanxiUnifiedMaintenanceCapacityValues,
        },
      ],
    },
    unitStatusTable: {
      title: "机组检修容量明细表",
      columns: [
        { key: "date", title: "日期" },
        { key: "predictedTotalCapacity", title: "预测总容量(MW)" },
        { key: "predictedUnitTotalCapacity", title: "预测机组总容量(MW)" },
        { key: "actualTotalCapacity", title: "实际总容量(MW)" },
        { key: "actualUnitTotalCapacity", title: "实际机组总容量(MW)" },
      ],
      data: shaanxiInfoMaintenanceSummaryRows,
      minWidth: 1280,
    },
    extraTables: [],
    emptyText: "当前日期暂无陕西机组状态 mock 数据。",
  });
  var shaanxiUnifiedReserveRows = expandRowsByShaanxiInfoDates(quarterHours.map(function mapReserveRow(time, index) {
    return {
      date: standardDefaultDate,
      time: time,
      positiveReserve: shaanxiPositiveReserveValues[index],
      negativeReserve: shaanxiNegativeReserveValues[index],
      diffValue: shaanxiPositiveReserveValues[index] - shaanxiNegativeReserveValues[index],
      source: "陕西系统备用统一口径",
      updatedAt: buildUpdatedAt(dataUpdatedAt, -3),
    };
  }), ["date"]);
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
      infoEnterpriseProfile: shaanxiUnifiedEnterprisePage,
      infoNodePrice: shaanxiUnifiedNodePricePage,
      infoDayAheadDeclaration: shaanxiUnifiedDeclarationPage,
      infoUnitStatus: shaanxiUnifiedUnitStatusPage,
      infoReserve: shaanxiUnifiedReservePage,
      infoContractCurveSummary: shaanxiContractCurveSummaryPage,
      infoContractCurveDetail: shaanxiContractCurveDetailPage,
      infoWholesaleWeightedPrice: shaanxiWholesaleWeightedPricePage,
      infoRetailSettlementHourlyPrice: shaanxiRetailSettlementPage,
      infoEmptyLoad: createShaanxiInfoEmptyPage("负荷信息", "负荷信息", "负荷信息"),
      infoEmptyLoadDetail: createShaanxiInfoEmptyPage("负荷详情", "负荷信息", "负荷详情"),
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
      infoEmptySaleCompany: createShaanxiInfoEmptyPage(
        "售电公司分时电量",
        "售电公司分时电量",
        "",
        "陕西交易中心当前暂未接入售电公司分时电量披露数据。",
      ),
    },
    pageMap: {
      infoDisclosure: {
        defaultDatasetKey: "infoDayAheadDeclaration",
        primaryTabs: {
          "负荷信息": {
            defaultDatasetKey: "infoEmptyLoad",
            secondaryTabs: {
              "负荷信息": "infoEmptyLoad",
              "负荷详情": "infoEmptyLoadDetail",
              "备用信息": "infoReserve",
              "机组状态": "infoUnitStatus",
            },
          },
          "全省统一出清价": "infoUnifiedPrice",
          "出清电量": "infoEmptyVolume",
          "交易结果": "infoEmptyTradeResult",
          "中长期合同曲线": {
            defaultDatasetKey: "infoContractCurveSummary",
            secondaryTabs: {
              "中长期合同曲线汇总": "infoContractCurveSummary",
              "中长期合同曲线明细": "infoContractCurveDetail",
            },
          },
          "交易总体情况": {
            defaultDatasetKey: "infoWholesaleWeightedPrice",
            secondaryTabs: {
              "中长期批发市场净合同加权均价": "infoWholesaleWeightedPrice",
            },
          },
          "零售用户结算情况": {
            defaultDatasetKey: "infoRetailSettlementHourlyPrice",
            secondaryTabs: {
              "批发购电分时均价": "infoRetailSettlementHourlyPrice",
            },
          },
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
          "零售用户结算情况": {
            defaultDatasetKey: "infoRetailSettlementHourlyPrice",
            secondaryTabs: {
              "批发购电分时均价": "infoRetailSettlementHourlyPrice",
            },
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
    dataPublishTime: "2026-07-31 10:08:00",
    dataSource: dataSource,
    infoDisclosure: {
      quarterHours: quarterHours,
    },
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
      statusText: "数据更新时间：2026-07-31 10:52:48（陕西交易中心结算任务）",
      publishTime: "2026-07-31 10:52:48",
      tabs: ["日清算", "月结算", "零售用户结算情况"],
      dailyRows: shaanxiDailySettlementRows,
      dailyColumns: settlementDailyColumns,
      dailyDateRange: {
        start: shaanxiDailySettlementDate,
        end: shaanxiDailySettlementEndDate,
      },
      monthRows: settlementMonthRows,
      monthlySettlementData: shaanxiMonthlySettlementData,
    },
    retailRelation: {
      title: "零售关系",
      centerName: "陕西电力交易中心",
      statusText: "数据更新时间：2026-07-31 11:04:26（陕西交易中心零售关系台账）",
      publishTime: "2026-07-31 10:42:00",
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
      statusText: "数据更新时间：2026-07-31 10:44:16（陕西交易中心滚搓任务）",
      publishTime: "2026-07-31 10:12:00",
      defaultRange: defaultRange,
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
