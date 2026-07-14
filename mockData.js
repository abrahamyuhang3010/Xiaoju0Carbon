(function attachMockData(global) {
  var appMocks = {
    platformMenu: global.BOSS_PLATFORM_MENU_MOCK,
    businessCenter: global.BOSS_BUSINESS_CENTER_MOCK,
    guangdong: global.BOSS_GUANGDONG_DATA_MOCK,
    hunan: global.BOSS_HUNAN_DATA_MOCK,
    shaanxi: global.BOSS_SHAANXI_DATA_MOCK,
    rawPowerData: global.BOSS_RAW_POWER_DATA_MOCK,
    powerDataAdapter: global.BOSS_POWER_DATA_ADAPTER,
    nodePriceByCenter: global.BOSS_NODE_PRICE_MOCK_BY_CENTER,
    tradingResultByCenter: global.BOSS_TRADING_RESULT_MOCK_BY_CENTER,
    marketPageData: global.BOSS_MARKET_PAGE_DATA,
    downloadTasks: global.BOSS_DOWNLOAD_TASKS_MOCK,
    operationRecord: global.BOSS_OPERATION_RECORD_MOCK,
    fetchMonitor: global.BOSS_FETCH_MONITOR_MOCK,
    dataMonitor: global.BOSS_DATA_MONITOR_MOCK,
    simulation: global.BOSS_SIMULATION_DATA_MOCK,
    algorithm: global.BOSS_ALGORITHM_DATA_MOCK,
  };

  function buildJuly2026Dates() {
    return Array.from({ length: 31 }, function createDate(_, index) {
      return "2026-07-" + String(index + 1).padStart(2, "0");
    });
  }

  function cloneMockValue(value) {
    if (Array.isArray(value)) {
      return value.map(cloneMockValue);
    }

    if (value && typeof value === "object") {
      var result = {};
      Object.keys(value).forEach(function copyKey(key) {
        result[key] = cloneMockValue(value[key]);
      });
      return result;
    }

    return value;
  }

  function getDatePart(value) {
    var match = String(value || "").match(/^(\d{4}[-/]\d{2}[-/]\d{2}|\d{8})/);
    if (!match) {
      return "";
    }

    if (/^\d{8}$/.test(match[1])) {
      return match[1].slice(0, 4) + "-" + match[1].slice(4, 6) + "-" + match[1].slice(6, 8);
    }

    return match[1].replace(/\//g, "-");
  }

  function replaceLeadingDate(value, targetDate) {
    var text = String(value || "");
    var compactDate = targetDate.replace(/-/g, "");

    if (/^\d{8}/.test(text)) {
      return compactDate + text.slice(8);
    }

    if (/^\d{4}\/\d{2}\/\d{2}/.test(text)) {
      return targetDate.replace(/-/g, "/") + text.slice(10);
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return targetDate + text.slice(10);
    }

    return text;
  }

  function replaceEmbeddedDateText(value, targetDate) {
    var text = String(value || "");
    var compactDate = targetDate.replace(/-/g, "");
    return text
      .replace(/\d{4}-\d{2}-\d{2}/g, targetDate)
      .replace(/\d{8}/g, compactDate);
  }

  function makeDatedId(value, targetDate, index) {
    if (value === undefined || value === null || value === "") {
      return value;
    }
    return String(value).replace(/-july2026-\d{8}-\d+$/, "") + "-july2026-" + targetDate.replace(/-/g, "") + "-" + index;
  }

  function shouldRewriteNestedDateKey(key) {
    return /(?:Date|Time|At|日期|时间)$/.test(String(key || ""));
  }

  function rewriteNestedDateStrings(value, targetDate, parentKey) {
    if (Array.isArray(value)) {
      return value.map(function mapItem(item) {
        return rewriteNestedDateStrings(item, targetDate, parentKey);
      });
    }

    if (value && typeof value === "object") {
      Object.keys(value).forEach(function rewriteKey(key) {
        value[key] = rewriteNestedDateStrings(value[key], targetDate, key);
      });
      return value;
    }

    if (typeof value === "string" && shouldRewriteNestedDateKey(parentKey) && getDatePart(value)) {
      return replaceLeadingDate(value, targetDate);
    }

    return value;
  }

  function rewriteRowDateFields(row, targetDate, index) {
    var nextRow = rewriteNestedDateStrings(cloneMockValue(row), targetDate, "");
    var dateFieldKeys = [
      "date",
      "settlementDate",
      "declarationDate",
      "tradeDate",
      "curveDate",
      "usageDate",
      "predictionDate",
      "operatedAt",
      "appliedAt",
      "createdAt",
      "updatedAt",
      "lastFetchedAt",
      "runDate",
      "planDate",
      "operationDate",
      "日期",
      "结算日期",
      "交易日期",
      "曲线日期",
      "运行日期",
      "计划日期",
      "用电日期",
    ];

    dateFieldKeys.forEach(function rewriteDateField(key) {
      if (typeof nextRow[key] === "string" && getDatePart(nextRow[key])) {
        nextRow[key] = replaceLeadingDate(nextRow[key], targetDate);
      }
    });

    if (nextRow.id !== undefined) {
      nextRow.id = makeDatedId(nextRow.id, targetDate, index);
    }
    if (nextRow.fileName) {
      nextRow.fileName = replaceEmbeddedDateText(nextRow.fileName, targetDate);
      if (nextRow.fileName === row.fileName) {
        nextRow.fileName = String(nextRow.fileName).replace(/(\.[^.]+)?$/, "_" + targetDate.replace(/-/g, "") + "$1");
      }
    }
    if (nextRow.documentTitle) {
      nextRow.documentTitle = replaceEmbeddedDateText(nextRow.documentTitle, targetDate);
    }
    if (nextRow.settlementDocumentTitle) {
      nextRow.settlementDocumentTitle = replaceEmbeddedDateText(nextRow.settlementDocumentTitle, targetDate);
    }

    return nextRow;
  }

  function getSupplementDateKey(rows, path) {
    var priorityKeys = [
      "date",
      "settlementDate",
      "declarationDate",
      "tradeDate",
      "curveDate",
      "usageDate",
      "predictionDate",
      "operatedAt",
      "appliedAt",
      "createdAt",
      "runDate",
      "planDate",
      "operationDate",
      "日期",
      "结算日期",
      "交易日期",
      "曲线日期",
      "运行日期",
      "计划日期",
      "用电日期",
    ];
    var counts = {};
    var allowUpdatedAtOnly = /\.fetchMonitor\.records$/.test(path || "");

    (rows || []).forEach(function countDateKeys(row) {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        return;
      }

      priorityKeys.concat(allowUpdatedAtOnly ? ["updatedAt", "lastFetchedAt"] : []).forEach(function countKey(key) {
        if (getDatePart(row[key])) {
          counts[key] = (counts[key] || 0) + 1;
        }
      });
    });

    return priorityKeys.concat(allowUpdatedAtOnly ? ["updatedAt", "lastFetchedAt"] : []).find(function findKey(key) {
      return counts[key] > 0;
    }) || "";
  }

  function pickSourceDateForTarget(sourceDates, targetIndex) {
    if (!sourceDates.length) {
      return "";
    }
    return sourceDates[targetIndex % sourceDates.length];
  }

  function supplementRowsToJuly(rows, path, julyDates) {
    var dateKey = getSupplementDateKey(rows, path);
    var groupedRows = {};
    var sourceDates = [];

    if (!dateKey) {
      return;
    }

    rows.forEach(function groupRow(row) {
      var date = getDatePart(row && row[dateKey]);
      if (!date) {
        return;
      }
      if (!groupedRows[date]) {
        groupedRows[date] = [];
        sourceDates.push(date);
      }
      groupedRows[date].push(row);
    });

    julyDates.forEach(function ensureDate(targetDate, targetIndex) {
      var sourceDate;
      if (groupedRows[targetDate]) {
        return;
      }

      sourceDate = pickSourceDateForTarget(sourceDates, targetIndex);
      if (!sourceDate || !groupedRows[sourceDate]) {
        return;
      }

      groupedRows[sourceDate].forEach(function cloneRow(row, rowIndex) {
        rows.push(rewriteRowDateFields(row, targetDate, rowIndex));
      });
    });
  }

  function walkMockArrays(value, path, julyDates, seen) {
    if (!value || typeof value !== "object") {
      return;
    }
    if (seen.indexOf(value) >= 0) {
      return;
    }
    seen.push(value);

    if (Array.isArray(value)) {
      supplementRowsToJuly(value, path, julyDates);
      value.forEach(function walkItem(item, index) {
        walkMockArrays(item, path + "[" + index + "]", julyDates, seen);
      });
      return;
    }

    Object.keys(value).forEach(function walkKey(key) {
      walkMockArrays(value[key], path ? path + "." + key : key, julyDates, seen);
    });
  }

  function supplementDateDictionary(dictionary, julyDates) {
    var keys = Object.keys(dictionary || {});
    var baseKey = keys[0];
    var baseValue = baseKey ? dictionary[baseKey] : null;

    if (!baseValue) {
      return;
    }

    julyDates.forEach(function ensureDictionaryDate(date, index) {
      if (!dictionary[date]) {
        dictionary[date] = rewriteRowDateFields(baseValue, date, index);
        dictionary[date].date = date;
      }
    });
  }

  function applyJulyDefaultRange(target, mode) {
    if (!target || typeof target !== "object") {
      return;
    }
    target.start = mode === "single" ? "2026-07-31" : "2026-07-01";
    target.end = "2026-07-31";
  }

  function supplementNestedDefaultRanges(value, seen) {
    if (!value || typeof value !== "object") {
      return;
    }
    // Config fields (defaultRange/availableRange/dailyDateRange/filters/defaultDate) only
    // live as named object properties, never inside arrays of data rows. Recursing into
    // arrays would walk the ~250k cloned July rows for nothing, so stop at arrays.
    if (Array.isArray(value)) {
      return;
    }
    if (seen.indexOf(value) >= 0) {
      return;
    }
    seen.push(value);

    if (value.defaultRange && typeof value.defaultRange === "object") {
      applyJulyDefaultRange(value.defaultRange);
    }
    if (value.availableRange && typeof value.availableRange === "object") {
      applyJulyDefaultRange(value.availableRange);
    }
    if (value.dailyDateRange && typeof value.dailyDateRange === "object") {
      applyJulyDefaultRange(value.dailyDateRange);
    }
    if (value.filters && typeof value.filters === "object") {
      if (value.filters.dateRange && typeof value.filters.dateRange === "object") {
        applyJulyDefaultRange(value.filters.dateRange);
      }
      if (typeof value.filters.date === "string" && getDatePart(value.filters.date)) {
        value.filters.date = "2026-07-31";
      }
    }
    if (typeof value.defaultDate === "string" && getDatePart(value.defaultDate)) {
      value.defaultDate = "2026-07-31";
    }
    if (value.defaultDate && typeof value.defaultDate === "object" && ("start" in value.defaultDate || "end" in value.defaultDate)) {
      applyJulyDefaultRange(value.defaultDate, "single");
    }

    Object.keys(value).forEach(function walkNestedDefaultRange(key) {
      supplementNestedDefaultRanges(value[key], seen);
    });
  }

  function addTradeVolumeAliases(points) {
    (points || []).forEach(function addAlias(point) {
      if (!point || typeof point !== "object") {
        return;
      }
      if (point.dayaheadVolume === undefined && point.dayAheadVolume !== undefined) {
        point.dayaheadVolume = point.dayAheadVolume;
      }
      if (point.realtimeVolume === undefined && point.realTimeVolume !== undefined) {
        point.realtimeVolume = point.realTimeVolume;
      }
    });
  }

  function supplementGuangdongTradeVolumeRows(tradeResult, julyDates) {
    var tradingResultByDate = (tradeResult && tradeResult.tradingResultByDate) || {};
    var sourceDates = Object.keys(tradingResultByDate);
    var sourceDataset = sourceDates.length ? tradingResultByDate[sourceDates[0]] : null;
    var sourcePoints = (sourceDataset && sourceDataset.points) || [];

    if (!tradeResult || !sourcePoints.length) {
      return;
    }

    tradeResult.hourlyRows = julyDates.reduce(function buildRows(rows, date) {
      return rows.concat(
        sourcePoints.slice(0, 24).map(function mapPoint(point) {
          return {
            date: date,
            time: point.time,
            dayaheadVolume: point.dayaheadVolume !== undefined ? point.dayaheadVolume : point.dayAheadVolume,
            realtimeVolume: point.realtimeVolume !== undefined ? point.realtimeVolume : point.realTimeVolume,
            dayAheadVolume: point.dayAheadVolume,
            realTimeVolume: point.realTimeVolume,
          };
        }),
      );
    }, []);
  }

  function updateKnownMockDefaults(appMocks, julyDates) {
    var guangdong = appMocks.guangdong || {};
    var simulation = appMocks.simulation || {};
    var algorithm = appMocks.algorithm || {};
    var fetchMonitor = appMocks.fetchMonitor || {};
    var operationRecord = appMocks.operationRecord || {};

    ["guangdong", "hunan", "shaanxi"].forEach(function updateTradeCenterDefaults(centerKey) {
      supplementNestedDefaultRanges(appMocks[centerKey], []);
      if (appMocks[centerKey]) {
        appMocks[centerKey].defaultRange = {
          start: "2026-07-01",
          end: "2026-07-31",
        };
        appMocks[centerKey].availableRange = {
          start: "2026-07-01",
          end: "2026-07-31",
        };
      }
    });

    if (guangdong.tradeResult) {
      guangdong.tradeResult.defaultRunDate = "2026-07-31";
      guangdong.tradeResult.availableRunDates = julyDates.slice();
      guangdong.tradeResult.defaultRange = {
        start: "2026-07-01",
        end: "2026-07-31",
      };
      guangdong.tradeResult.availableRange = {
        start: "2026-07-01",
        end: "2026-07-31",
      };
      supplementDateDictionary(guangdong.tradeResult.nodePriceByDate, julyDates);
      supplementDateDictionary(guangdong.tradeResult.tradingResultByDate, julyDates);
      Object.keys(guangdong.tradeResult.tradingResultByDate || {}).forEach(function addGuangdongTradeAliases(dateKey) {
        addTradeVolumeAliases((guangdong.tradeResult.tradingResultByDate[dateKey] || {}).points);
      });
      supplementGuangdongTradeVolumeRows(guangdong.tradeResult, julyDates);
    }

    if (guangdong.settlement && guangdong.settlement.dailyDateRange) {
      applyJulyDefaultRange(guangdong.settlement.dailyDateRange);
    }
    if (guangdong.dayAheadDeclaration && guangdong.dayAheadDeclaration.defaultDate) {
      applyJulyDefaultRange(guangdong.dayAheadDeclaration.defaultDate, "single");
    }

    if (simulation.simulationBacktest) {
      simulation.simulationBacktest.status.updatedAt = "2026-07-31 09:58:00";
    }
    if (simulation.spotMockTrading) {
      simulation.spotMockTrading.status.updatedAt = "2026-07-31 10:16:00";
      // 模拟交易筛选周期保持录屏中的 06-30 ~ 07-14，不随全局 7 月统一
    }

    if (algorithm.dayAheadLoadPrediction) {
      algorithm.dayAheadLoadPrediction.status.updatedAt = "2026-07-31 03:18:00";
      algorithm.dayAheadLoadPrediction.filters.defaultDate = "2026-07-31";
    }
    if (algorithm.spotPricePrediction) {
      algorithm.spotPricePrediction.status.updatedAt = "2026-07-31 02:42:00";
      algorithm.spotPricePrediction.filters.defaultDate = "2026-07-31";
    }

    if (fetchMonitor.status) {
      fetchMonitor.status.updatedAt = "2026-07-31 10:29:40";
    }
    if (fetchMonitor.filters && fetchMonitor.filters.defaultRange) {
      applyJulyDefaultRange(fetchMonitor.filters.defaultRange);
    }

    if (operationRecord.operationLog && operationRecord.operationLog.filters) {
      operationRecord.operationLog.filters.defaultRange = {
        start: "2026-07-01 00:00:00",
        end: "2026-07-31 23:59:59",
      };
    }
    if (operationRecord.auditRecords && operationRecord.auditRecords.filters) {
      operationRecord.auditRecords.filters.defaultRange = {
        start: "2026-07-01 00:00:00",
        end: "2026-07-31 23:59:59",
      };
    }
  }

  function makeUnifiedTradeMocksDateAgnostic(julyDates) {
    function updateMocks(mocks) {
      Object.keys(mocks || {}).forEach(function updateCenter(centerKey) {
        var dataset = mocks[centerKey];
        if (!dataset || typeof dataset !== "object") {
          return;
        }
        dataset.date = "";
        dataset.availableRunDates = julyDates.slice();
        if (dataset.updateTime) {
          dataset.updateTime = replaceLeadingDate(dataset.updateTime, "2026-07-31");
        }
        if (dataset.publishTime) {
          dataset.publishTime = replaceLeadingDate(dataset.publishTime, "2026-07-31");
        }
        addTradeVolumeAliases(dataset.points);
      });
    }

    updateMocks(global.nodePriceMockByCenter);
    updateMocks(global.tradingResultMockByCenter);
    updateMocks(global.BOSS_NODE_PRICE_MOCK_BY_CENTER);
    updateMocks(global.BOSS_TRADING_RESULT_MOCK_BY_CENTER);
  }

  function supplementJuly2026MockCoverage(appMocks) {
    var julyDates = buildJuly2026Dates();
    [
      "guangdong",
      "hunan",
      "shaanxi",
      "downloadTasks",
      "operationRecord",
      "fetchMonitor",
      "simulation",
      "algorithm",
    ].forEach(function supplementMockBundle(bundleKey) {
      walkMockArrays(appMocks[bundleKey], "appMocks." + bundleKey, julyDates, []);
    });
    updateKnownMockDefaults(appMocks, julyDates);
    makeUnifiedTradeMocksDateAgnostic(julyDates);
  }

  supplementJuly2026MockCoverage(appMocks);

  global.BOSS_APP_MOCKS = appMocks;
  global.BOSS_MOCK_DATA = {
    hours: appMocks.guangdong.infoDisclosure.hours,
    quarterHours: appMocks.guangdong.infoDisclosure.quarterHours,
    overviewSections: appMocks.businessCenter.overviewSections,
    primaryTabs: appMocks.guangdong.infoDisclosure.primaryTabs,
    secondaryTabs: appMocks.guangdong.infoDisclosure.secondaryTabs,
    metricTree: appMocks.guangdong.infoDisclosure.metricTree,
    metricSeries: appMocks.guangdong.infoDisclosure.metricSeries,
    reserveForecast: appMocks.guangdong.infoDisclosure.reserveForecast,
    reserveActual: appMocks.guangdong.infoDisclosure.reserveActual,
    reserveRows: appMocks.guangdong.infoDisclosure.reserveRows,
    notification: appMocks.simulation.notification || {},
  };
})(window);
