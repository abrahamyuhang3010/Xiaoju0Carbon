(function attachMarketPageData(global) {
  var DEFAULT_EMPTY_TEXT = "当前交易中心暂无对应 mock 数据。";
  var TRADE_CENTER_NAMES = {
    guangdong: "广东电力交易中心",
    hunan: "湖南电力交易中心",
    shaanxi: "陕西电力交易中心",
  };

  function normalizeTradeCenterKey(value) {
    var text = String(value || "").toLowerCase();

    if (text === "hunan" || text.indexOf("湖南") >= 0) {
      return "hunan";
    }
    if (text === "shaanxi" || text.indexOf("陕西") >= 0) {
      return "shaanxi";
    }
    return "guangdong";
  }

  function cloneValue(value) {
    if (Array.isArray(value)) {
      return value.map(cloneValue);
    }

    if (value && typeof value === "object") {
      var result = {};
      Object.keys(value).forEach(function eachKey(key) {
        result[key] = cloneValue(value[key]);
      });
      return result;
    }

    return value;
  }

  function computeStats(values) {
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
      max: Number(Math.max.apply(null, numericValues).toFixed(1)),
      min: Number(Math.min.apply(null, numericValues).toFixed(1)),
      average: Number(
        (
          numericValues.reduce(function accumulate(total, value) {
            return total + value;
          }, 0) / numericValues.length
        ).toFixed(1),
      ),
    };
  }

  function createSeries(key, name, labels, values, unit, seriesType) {
    var stats = computeStats(values);
    return {
      key: key,
      name: name,
      type: seriesType || "line",
      labels: (labels || []).slice(),
      values: (values || []).slice(),
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

  function buildPriceSpread(dayAheadValue, realTimeValue) {
    if (typeof dayAheadValue !== "number" || typeof realTimeValue !== "number") {
      return null;
    }

    return Number((realTimeValue - dayAheadValue).toFixed(2));
  }

  function withComputedNodeSpread(rows) {
    return (rows || []).map(function mapRow(row) {
      var nextRow = cloneValue(row || {});
      nextRow.spread = buildPriceSpread(nextRow.dayAheadNodePrice, nextRow.realTimeNodePrice);
      return nextRow;
    });
  }

  function cloneNodePriceRowsWithoutSpread(rows) {
    return (rows || []).map(function mapRow(row) {
      var nextRow = cloneValue(row || {});
      delete nextRow.spread;
      delete nextRow.priceDiff;
      return nextRow;
    });
  }

  function getUnifiedNodePriceMock(tradeCenterKey) {
    var mocks = global.nodePriceMockByCenter || global.BOSS_NODE_PRICE_MOCK_BY_CENTER || {};
    return mocks[tradeCenterKey] || null;
  }

  function getUnifiedTradingResultMock(tradeCenterKey) {
    var mocks = global.tradingResultMockByCenter || global.BOSS_TRADING_RESULT_MOCK_BY_CENTER || {};
    return mocks[tradeCenterKey] || null;
  }

  function aggregateNodePricePoints96To24(points96) {
    if (typeof global.aggregateNodePrice96To24 === "function") {
      return global.aggregateNodePrice96To24(points96);
    }

    return Array.from({ length: 24 }, function createHourPoint(_, hourIndex) {
      var segment = (points96 || []).slice(hourIndex * 4, hourIndex * 4 + 4);

      function averageField(fieldKey) {
        var values = segment
          .map(function mapPoint(point) {
            return point && point[fieldKey];
          })
          .filter(function filterValue(value) {
            return typeof value === "number" && !Number.isNaN(value);
          });

        if (!values.length) {
          return null;
        }

        return Number((values.reduce(function accumulate(total, value) {
          return total + value;
        }, 0) / values.length).toFixed(2));
      }

      var dayAheadNodePrice = averageField("dayAheadNodePrice");
      var realTimeNodePrice = averageField("realTimeNodePrice");

      return {
        time: String(hourIndex).padStart(2, "0") + ":00",
        dayAheadNodePrice: dayAheadNodePrice,
        realTimeNodePrice: realTimeNodePrice,
        spread:
          typeof dayAheadNodePrice === "number" && typeof realTimeNodePrice === "number"
            ? Number((realTimeNodePrice - dayAheadNodePrice).toFixed(2))
            : null,
      };
    });
  }

  function getProvinceNode(nodePriceData) {
    var nodes = (nodePriceData && nodePriceData.nodes) || [];
    return nodes.find(function findNode(node) {
      return node.nodeName === "全省" || node.nodeType === "全省" || node.category === "全省";
    }) || null;
  }

  function getProvinceHourlyNodePriceRows(nodePriceData) {
    var provinceNode = getProvinceNode(nodePriceData);
    return provinceNode && provinceNode.points ? withComputedNodeSpread(aggregateNodePricePoints96To24(provinceNode.points)) : [];
  }

  function buildNodeSidebarGroups(nodes) {
    var provinceItems = [];
    var otherItems = [];

    (nodes || []).forEach(function eachNode(node) {
      var item = {
        id: node.nodeName,
        label: node.nodeName,
      };

      if (node.nodeName === "全省" || node.nodeType === "全省" || node.category === "全省") {
        provinceItems.push({
          id: "全省",
          label: "全省",
        });
      } else {
        otherItems.push(item);
      }
    });

    if (!provinceItems.length) {
      provinceItems.push({
        id: "全省",
        label: "全省",
      });
    }

    return [
      {
        label: "全部",
        items: [],
      },
      {
        label: "全省",
        items: provinceItems,
      },
      {
        label: "其他",
        items: otherItems,
      },
    ];
  }

  function createMockFileList(prefix, dateValue, count) {
    return Array.from({ length: count }, function createFile(_, index) {
      return {
        id: prefix + "-" + (index + 1),
        fileName: prefix.toUpperCase() + "_" + String(dateValue || "").replace(/-/g, "") + "_" + String(index + 1).padStart(2, "0") + ".pdf",
        fileType: "PDF",
        publishTime: String(dateValue || "") + " " + String(9 + index).padStart(2, "0") + ":00:00",
        size: (1.1 + index * 0.2).toFixed(1) + "MB",
        downloadUrl: "#",
      };
    });
  }

  function getFirstFilePublishTime(fileList) {
    var files = Array.isArray(fileList) ? fileList : [];
    var firstFile = files.find(function findFile(file) {
      return file && file.publishTime;
    });
    return firstFile ? firstFile.publishTime : "";
  }

  function createEmptyPageData(options) {
    return {
      title: options.title || "",
      description: options.description || "",
      updateTime: options.updateTime || "",
      publishTime: options.publishTime || options.dataPublishTime || getFirstFilePublishTime(options.fileList),
      dataSource: options.dataSource || "",
      filters: cloneValue(options.filters || {}),
      summaryCards: [],
      metricTree: [],
      chartType: "",
      chartUnit: "",
      chartSeries: [],
      tableColumns: [],
      tableData: [],
      summaryTable: {
        columns: [],
        data: [],
      },
      fileList: [],
      emptyText: options.emptyText || DEFAULT_EMPTY_TEXT,
    };
  }

  function buildDisclosureTablePage(options) {
    var columns = cloneValue(options.columns || []);
    var rows = cloneValue(options.rows || []);
    var updateTime = options.updateTime || "";
    var updateSource = options.updateSource || options.dataSource || "";

    return {
      title: options.title || "",
      description: options.description || "",
      updateTime: updateTime,
      publishTime: options.publishTime || options.dataPublishTime || getFirstFilePublishTime(options.fileList),
      dataSource: options.dataSource || updateSource,
      updateSource: updateSource,
      hasDataSource: options.hasDataSource !== false,
      filters: cloneValue(options.filters || {}),
      viewType: "disclosureTable",
      compareMode: options.compareMode || "",
      compareMergeKeys: cloneValue(options.compareMergeKeys || []),
      datePickerMode: options.datePickerMode || "single",
      tableTitle: options.tableTitle || options.title || "",
      tableColumns: columns,
      tableData: rows,
      tableMinWidth: options.tableMinWidth || Math.max(920, columns.length * 148),
      baseTableMinWidth: options.baseTableMinWidth || "",
      disclosureTableData: {
        provinceCode: options.provinceCode || "",
        tabKey: options.tabKey || "",
        updateTime: updateTime,
        updateSource: updateSource,
        columns: columns,
        rows: rows,
        compareMode: options.compareMode || "",
        compareMergeKeys: cloneValue(options.compareMergeKeys || []),
        baseMinWidth: options.baseTableMinWidth || "",
        minWidth: options.tableMinWidth || Math.max(920, columns.length * 148),
      },
      fileList: cloneValue(options.fileList || []),
      emptyText: options.emptyText || DEFAULT_EMPTY_TEXT,
    };
  }

  function formatUnitStatusTimeColumnTitle(time, shiftToPeriodEnd) {
    var parts = String(time || "").split(":");
    var hour = Number(parts[0] || 0);
    var minute = Number(parts[1] || 0) + (shiftToPeriodEnd ? 15 : 0);

    if (minute >= 60) {
      hour += Math.floor(minute / 60);
      minute %= 60;
    }

    return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
  }

  function ensurePageData(data, fallback) {
    var normalized = createEmptyPageData(fallback || {});
    var source = data ? cloneValue(data) : {};

    Object.keys(source).forEach(function eachKey(key) {
      normalized[key] = source[key];
    });

    normalized.filters = source.filters && typeof source.filters === "object" ? source.filters : normalized.filters;
    normalized.summaryCards = Array.isArray(source.summaryCards) ? source.summaryCards : [];
    normalized.metricTree = Array.isArray(source.metricTree) ? source.metricTree : [];
    normalized.chartSeries = Array.isArray(source.chartSeries) ? source.chartSeries : [];
    normalized.tableColumns = Array.isArray(source.tableColumns) ? source.tableColumns : [];
    normalized.tableData = Array.isArray(source.tableData) ? source.tableData : [];
    normalized.fileList = Array.isArray(source.fileList) ? source.fileList : [];
    normalized.publishTime = source.publishTime || source.dataPublishTime || getFirstFilePublishTime(normalized.fileList) || normalized.publishTime || "";

    if (!source.summaryTable || typeof source.summaryTable !== "object") {
      normalized.summaryTable = {
        columns: [],
        data: [],
      };
    } else {
      normalized.summaryTable = {
        columns: Array.isArray(source.summaryTable.columns) ? source.summaryTable.columns : [],
        data: Array.isArray(source.summaryTable.data) ? source.summaryTable.data : [],
      };
    }

    return normalized;
  }

  function getTradeCenterBundle(tradeCenter) {
    var normalizedKey = normalizeTradeCenterKey(tradeCenter);

    if (normalizedKey === "hunan") {
      return global.BOSS_HUNAN_DATA_MOCK || {};
    }

    if (normalizedKey === "shaanxi") {
      return global.BOSS_SHAANXI_DATA_MOCK || {};
    }

    return global.BOSS_GUANGDONG_DATA_MOCK || {};
  }

  function getTradeCenterMarketCatalog(tradeCenter) {
    var bundle = getTradeCenterBundle(tradeCenter);
    return bundle.marketPageData || null;
  }

  function uniqueStrings(values) {
    return (values || []).filter(function filterValue(value, index, source) {
      return value && source.indexOf(value) === index;
    });
  }

  function getBundleModules(bundle) {
    return (bundle && bundle.modules) || {};
  }

  function getBundleDatasets(bundle) {
    return (bundle && bundle.marketPageData && bundle.marketPageData.datasets) || {};
  }

  function getBundleTrendRows(bundle, seriesDefinition) {
    if (!bundle || !seriesDefinition) {
      return [];
    }

    var module = seriesDefinition.moduleName ? getBundleModules(bundle)[seriesDefinition.moduleName] : null;
    if (module && Array.isArray(module.tableRows)) {
      return cloneValue(module.tableRows);
    }

    var dataset = seriesDefinition.datasetKey ? getBundleDatasets(bundle)[seriesDefinition.datasetKey] : null;
    if (dataset && Array.isArray(dataset.tableData)) {
      return cloneValue(dataset.tableData);
    }

    return [];
  }

  function getBundleSourceMeta(bundle, seriesDefinition) {
    if (!bundle || !seriesDefinition) {
      return {
        source: "",
        updatedAt: "",
      };
    }

    var module = seriesDefinition.moduleName ? getBundleModules(bundle)[seriesDefinition.moduleName] : null;
    if (module) {
      return {
        source: module.source || "",
        updatedAt: module.updatedAt || "",
      };
    }

    var dataset = seriesDefinition.datasetKey ? getBundleDatasets(bundle)[seriesDefinition.datasetKey] : null;
    if (dataset) {
      return {
        source: dataset.dataSource || "",
        updatedAt: dataset.updateTime || "",
      };
    }

    return {
      source: "",
      updatedAt: "",
    };
  }

  function flattenMetricGroups(groups) {
    return (groups || []).reduce(function accumulate(result, group) {
      return result.concat(group.items || []);
    }, []);
  }

  function mergeTrendRows(bundle, seriesDefinitions) {
    var merged = {};

    (seriesDefinitions || []).forEach(function eachSeries(seriesDefinition) {
      var sourceField = seriesDefinition.sourceField || "value";
      var rows = getBundleTrendRows(bundle, seriesDefinition);
      rows.forEach(function eachRow(row) {
        var date = row.date || row.operationDate || row.runDate || row.planDate || "";
        var time = row.time || row.period || row.declarationPeriod || "";
        var key = date + " " + time;
        var meta = getBundleSourceMeta(bundle, seriesDefinition);
        merged[key] = merged[key] || {
          date: date,
          time: time,
        };
        merged[key][seriesDefinition.valueKey] = row[sourceField];
        merged[key][seriesDefinition.valueKey + "Source"] = row.source || meta.source || "";
        merged[key][seriesDefinition.valueKey + "UpdatedAt"] = row.updatedAt || meta.updatedAt || "";
      });
    });

    return Object.keys(merged)
      .sort()
      .map(function mapKey(key) {
        return merged[key];
      });
  }

  function createBadgeCell(text, tone, sortValue) {
    return {
      text: text,
      badge: true,
      tone: tone || "default",
      copyable: false,
      sortValue: sortValue === undefined ? text : sortValue,
    };
  }

  function buildMetricTreeGroups(groups) {
    return (groups || []).map(function mapGroup(group) {
      return {
        id: group.id,
        label: group.label,
        children: (group.items || []).map(function mapItem(item) {
          return {
            id: item.id,
            label: item.label,
            seriesId: item.id,
          };
        }),
      };
    });
  }

  function getLatestTextValue(values) {
    var validValues = (values || []).filter(Boolean).slice().sort();
    return validValues[validValues.length - 1] || "";
  }

  function parseQuarterHour(timeValue) {
    var parts = String(timeValue || "00:00").split(":");
    return Number(parts[0] || 0) + Number(parts[1] || 0) / 60;
  }

  function roundNumber(value) {
    return Number(Number(value || 0).toFixed(1));
  }

  function padNumber(value) {
    return String(value).padStart(2, "0");
  }

  function formatDateText(date) {
    return date.getFullYear() + "-" + padNumber(date.getMonth() + 1) + "-" + padNumber(date.getDate());
  }

  function buildDateRangeInclusive(start, end) {
    if (!start || !end) {
      return [];
    }

    var dates = [];
    var current = new Date(start + "T00:00:00");
    var last = new Date(end + "T00:00:00");

    while (current <= last) {
      dates.push(formatDateText(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  var QUARTER_HOUR_LABELS = Array.from({ length: 96 }, function createLabel(_, index) {
    var totalMinutes = index * 15;
    var hour = Math.floor(totalMinutes / 60);
    var minute = totalMinutes % 60;
    return padNumber(hour) + ":" + padNumber(minute);
  });
  var QUARTER_HOUR_END_LABELS = Array.from({ length: 96 }, function createEndLabel(_, index) {
    var totalMinutes = (index + 1) * 15;
    var hour = Math.floor(totalMinutes / 60);
    var minute = totalMinutes % 60;
    if (totalMinutes === 24 * 60) {
      return "24:00";
    }
    return padNumber(hour) + ":" + padNumber(minute);
  });

  function shouldUseQuarterHourEndLabels(bundle) {
    return Boolean(bundle && (bundle.pageKey === "hn-data-disclosure" || bundle.pageKey === "sx-data-disclosure"));
  }

  function getQuarterHourLabels(fallbackMeta) {
    return fallbackMeta && fallbackMeta.useQuarterHourEndLabels ? QUARTER_HOUR_END_LABELS : QUARTER_HOUR_LABELS;
  }

  function extractStatusTime(text) {
    var match = String(text || "").match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
    return match ? match[1] : "";
  }

  function extractStatusSource(text) {
    var match = String(text || "").match(/（([^）]+)）/);
    return match ? match[1] : "";
  }

  function getRowDate(row) {
    return row.date || row.runDate || row.planDate || row.operationDate || "";
  }

  function getRowTime(row) {
    return row.time || row.period || row.declarationPeriod || "";
  }

  function normalizePointValue(value) {
    return typeof value === "number" && !Number.isNaN(value) ? value : null;
  }

  function getBundleAvailableDates(bundle, fallbackRange) {
    var dates = [];

    Object.keys(getBundleModules(bundle)).forEach(function eachModuleName(moduleName) {
      ((getBundleModules(bundle)[moduleName] && getBundleModules(bundle)[moduleName].tableRows) || []).forEach(function eachRow(row) {
        var date = getRowDate(row);
        if (date) {
          dates.push(date);
        }
      });
    });

    Object.keys(getBundleDatasets(bundle)).forEach(function eachDatasetKey(datasetKey) {
      ((getBundleDatasets(bundle)[datasetKey] && getBundleDatasets(bundle)[datasetKey].tableData) || []).forEach(function eachRow(row) {
        var date = getRowDate(row);
        if (date) {
          dates.push(date);
        }
      });
    });

    if (!dates.length && fallbackRange && fallbackRange.start && fallbackRange.end) {
      return buildDateRangeInclusive(fallbackRange.start, fallbackRange.end);
    }

    return uniqueStrings(dates).sort();
  }

  function interpolateQuarterValue(startValue, endValue, ratio) {
    if (typeof startValue === "number" && typeof endValue === "number") {
      return roundNumber(startValue + (endValue - startValue) * ratio);
    }
    if (typeof startValue === "number") {
      return startValue;
    }
    if (typeof endValue === "number") {
      return endValue;
    }
    return null;
  }

  function normalizeRowsToQuarterRows(rows, fallbackMeta) {
    var groupedByDate = {};

    (rows || []).forEach(function eachRow(row) {
      var date = getRowDate(row);
      var time = getRowTime(row);
      if (!date || !time) {
        return;
      }
      groupedByDate[date] = groupedByDate[date] || [];
      groupedByDate[date].push({
        date: date,
        time: time,
        value: normalizePointValue(row.value),
        source: row.source || fallbackMeta.source || "",
        updatedAt: row.updatedAt || fallbackMeta.updatedAt || "",
      });
    });

    return Object.keys(groupedByDate)
      .sort()
      .reduce(function accumulate(result, date) {
        var dayRows = groupedByDate[date].slice().sort(function compareRows(a, b) {
          return parseQuarterHour(a.time) - parseQuarterHour(b.time);
        });

        if (dayRows.length >= 90) {
          return result.concat(dayRows.map(function mapRow(row) {
            return {
              date: row.date,
              time: row.time,
              value: row.value,
              source: row.source,
              updatedAt: row.updatedAt,
            };
          }));
        }

        if (dayRows.length === 24) {
          var dayRowsByTime = {};
          var useQuarterHourEndLabels = Boolean(fallbackMeta && fallbackMeta.useQuarterHourEndLabels);
          dayRows.forEach(function indexRow(row) {
            dayRowsByTime[row.time] = row;
          });

          return result.concat(
            Array.from({ length: 24 }, function createHourRows(_, hourIndex) {
              var hourLabel = padNumber(hourIndex) + ":00";
              var nextHourLabel = hourIndex < 23 ? padNumber(hourIndex + 1) + ":00" : hourLabel;
              var startRow = dayRowsByTime[hourLabel] || dayRows[hourIndex] || null;
              var nextRow = dayRowsByTime[nextHourLabel] || dayRows[hourIndex + 1] || startRow;

              return [0, 1, 2, 3].map(function mapQuarter(quarterIndex) {
                var quarterMinutes = hourIndex * 60 + (quarterIndex + (useQuarterHourEndLabels ? 1 : 0)) * 15;
                var quarterLabel = quarterMinutes === 24 * 60
                  ? "24:00"
                  : padNumber(Math.floor(quarterMinutes / 60)) + ":" + padNumber(quarterMinutes % 60);
                return {
                  date: date,
                  time: quarterLabel,
                  value: interpolateQuarterValue(
                    startRow ? startRow.value : null,
                    nextRow ? nextRow.value : startRow ? startRow.value : null,
                    (quarterIndex + (useQuarterHourEndLabels ? 1 : 0)) / 4,
                  ),
                  source: (startRow && startRow.source) || fallbackMeta.source || "",
                  updatedAt: (startRow && startRow.updatedAt) || fallbackMeta.updatedAt || "",
                };
              });
            }).reduce(function flatten(flattened, rowsByHour) {
              return flattened.concat(rowsByHour);
            }, []),
          );
        }

        return result.concat(
          getQuarterHourLabels(fallbackMeta).map(function mapQuarterLabel(label, index) {
            var row = dayRows[index] || null;
            return {
              date: date,
              time: label,
              value: row ? row.value : null,
              source: (row && row.source) || fallbackMeta.source || "",
              updatedAt: (row && row.updatedAt) || fallbackMeta.updatedAt || "",
            };
          }),
        );
      }, []);
  }

  function buildQuarterRowsFromModule(bundle, moduleName) {
    var meta = getBundleSourceMeta(bundle, { moduleName: moduleName });
    if (shouldUseQuarterHourEndLabels(bundle)) {
      meta = Object.assign({}, meta, { useQuarterHourEndLabels: true });
    }
    var rows = getBundleTrendRows(bundle, { moduleName: moduleName }).map(function mapRow(row) {
      return {
        date: getRowDate(row),
        time: getRowTime(row),
        value: normalizePointValue(row.value),
        source: row.source || meta.source || "",
        updatedAt: row.updatedAt || meta.updatedAt || "",
      };
    });

    return normalizeRowsToQuarterRows(rows, meta);
  }

  function buildQuarterRowsFromGuangdongMetric(bundle, metricId, valueKey) {
    var info = (bundle && bundle.infoDisclosure) || {};
    var metricSeries = info.metricSeries || {};
    var metric = metricSeries[metricId] || {};
    var values = Array.isArray(metric[valueKey]) ? metric[valueKey] : [];
    var availableDates = getBundleAvailableDates(bundle, {
      start: info.availableRangeStart || info.defaultRunDate,
      end: info.availableRangeEnd || info.defaultRunDate,
    });
    var midpoint = Math.floor(Math.max(availableDates.length - 1, 0) / 2);
    var maxValue = values.reduce(function accumulate(currentMax, value) {
      return typeof value === "number" && value > currentMax ? value : currentMax;
    }, 0);
    var dayOffsetStep = Math.max(16, Math.round(maxValue * 0.0014));
    var source = extractStatusSource(info.statusText) || "广东交易中心取数";
    var updatedAt = extractStatusTime(info.statusText) || bundle.dataUpdatedAt || "";

    return availableDates.reduce(function accumulate(result, date, dateIndex) {
      var dayOffset = (dateIndex - midpoint) * dayOffsetStep;
      return result.concat(
        QUARTER_HOUR_LABELS.map(function mapQuarterLabel(time, pointIndex) {
          var baseValue = normalizePointValue(values[pointIndex]);
          var intraDayWave = [0, 8, -6, 5][(pointIndex + dateIndex) % 4];
          return {
            date: date,
            time: time,
            value: baseValue === null ? null : roundNumber(baseValue + dayOffset + intraDayWave),
            source: source,
            updatedAt: updatedAt,
          };
        }),
      );
    }, []);
  }

  function buildDerivedQuarterRows(baseRows, options) {
    var settings = options || {};
    var pattern = settings.pattern || [0];
    var baseOffset = settings.baseOffset || 0;

    return (baseRows || []).map(function mapRow(row, index) {
      var value = normalizePointValue(row.value);
      return {
        date: row.date,
        time: row.time,
        value: value === null ? null : roundNumber(value + baseOffset + pattern[index % pattern.length]),
        source: settings.source || row.source || "",
        updatedAt: settings.updatedAt || row.updatedAt || "",
      };
    });
  }

  function buildScaledDerivedQuarterRows(baseRows, options) {
    var settings = options || {};
    var pattern = settings.pattern || [0];
    var scale = settings.scale === undefined ? 1 : Number(settings.scale);
    var baseOffset = settings.baseOffset || 0;

    return (baseRows || []).map(function mapRow(row, index) {
      var value = normalizePointValue(row.value);
      return {
        date: row.date,
        time: row.time,
        value: value === null ? null : roundNumber(value * scale + baseOffset + pattern[index % pattern.length]),
        source: settings.source || row.source || "",
        updatedAt: settings.updatedAt || row.updatedAt || "",
      };
    });
  }

  function parseThermalBiddingSpaceNumber(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    var normalizedValue = String(value).replace(/,/g, "").trim();
    if (!normalizedValue) {
      return null;
    }
    var numericValue = Number(normalizedValue);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  function calculateThermalBiddingSpace(systemLoad, renewableOutput, hydroOutput, tieLineTransmission, nonMarketOutput) {
    var parsedSystemLoad = parseThermalBiddingSpaceNumber(systemLoad);
    var parsedRenewableOutput = parseThermalBiddingSpaceNumber(renewableOutput);
    var parsedHydroOutput = parseThermalBiddingSpaceNumber(hydroOutput);
    var parsedTieLineTransmission = parseThermalBiddingSpaceNumber(tieLineTransmission);
    var parsedNonMarketOutput = parseThermalBiddingSpaceNumber(nonMarketOutput);

    if (
      parsedSystemLoad === null ||
      parsedRenewableOutput === null ||
      parsedHydroOutput === null ||
      parsedTieLineTransmission === null ||
      (nonMarketOutput !== undefined && parsedNonMarketOutput === null)
    ) {
      return null;
    }

    return roundNumber(
      parsedSystemLoad -
        parsedRenewableOutput -
        parsedHydroOutput -
        parsedTieLineTransmission -
        (parsedNonMarketOutput || 0),
    );
  }

  function buildRowsByDateTime(rows) {
    var indexedRows = {};
    (rows || []).forEach(function eachRow(row) {
      if (!row || !row.date || !row.time) {
        return;
      }
      indexedRows[row.date + " " + row.time] = row;
    });
    return indexedRows;
  }

  function buildThermalBiddingSpaceRows(options) {
    var settings = options || {};
    var systemLoadForecastRows = settings.systemLoadForecastRows || settings.systemLoadRows || [];
    var systemLoadActualRows = settings.systemLoadActualRows || settings.systemLoadRows || [];
    var renewableForecastRows = settings.renewableForecastRows || settings.renewableRows || [];
    var renewableActualRows = settings.renewableActualRows || settings.renewableRows || [];
    var hydroForecastRows = settings.hydroForecastRows || settings.hydroRows || [];
    var hydroActualRows = settings.hydroActualRows || settings.hydroRows || [];
    var tieLineForecastRows = settings.tieLineForecastRows || settings.tieLineRows || [];
    var tieLineActualRows = settings.tieLineActualRows || settings.tieLineRows || [];
    var nonMarketForecastRows = settings.nonMarketForecastRows || settings.nonMarketRows || [];
    var nonMarketActualRows = settings.nonMarketActualRows || settings.nonMarketRows || [];
    var requiresNonMarketRows = Boolean(settings.includeNonMarketOutput);

    if (
      !systemLoadForecastRows.length ||
      !systemLoadActualRows.length ||
      !renewableForecastRows.length ||
      !renewableActualRows.length ||
      !hydroForecastRows.length ||
      !hydroActualRows.length ||
      !tieLineForecastRows.length ||
      !tieLineActualRows.length ||
      (requiresNonMarketRows && (!nonMarketForecastRows.length || !nonMarketActualRows.length))
    ) {
      return {
        hasRequiredData: false,
        rows: [],
      };
    }

    var systemLoadActualRowsByTime = buildRowsByDateTime(systemLoadActualRows);
    var renewableForecastRowsByTime = buildRowsByDateTime(renewableForecastRows);
    var renewableActualRowsByTime = buildRowsByDateTime(renewableActualRows);
    var hydroForecastRowsByTime = buildRowsByDateTime(hydroForecastRows);
    var hydroActualRowsByTime = buildRowsByDateTime(hydroActualRows);
    var tieLineForecastRowsByTime = buildRowsByDateTime(tieLineForecastRows);
    var tieLineActualRowsByTime = buildRowsByDateTime(tieLineActualRows);
    var nonMarketForecastRowsByTime = buildRowsByDateTime(nonMarketForecastRows);
    var nonMarketActualRowsByTime = buildRowsByDateTime(nonMarketActualRows);

    return {
      hasRequiredData: true,
      rows: systemLoadForecastRows.map(function mapSystemLoadRow(systemForecastRow) {
        var key = systemForecastRow.date + " " + systemForecastRow.time;
        var systemActualRow = systemLoadActualRowsByTime[key] || null;
        var renewableForecastRow = renewableForecastRowsByTime[key] || null;
        var renewableActualRow = renewableActualRowsByTime[key] || null;
        var hydroForecastRow = hydroForecastRowsByTime[key] || null;
        var hydroActualRow = hydroActualRowsByTime[key] || null;
        var tieLineForecastRow = tieLineForecastRowsByTime[key] || null;
        var tieLineActualRow = tieLineActualRowsByTime[key] || null;
        var nonMarketForecastRow = nonMarketForecastRowsByTime[key] || null;
        var nonMarketActualRow = nonMarketActualRowsByTime[key] || null;
        var systemLoadForecast = parseThermalBiddingSpaceNumber(systemForecastRow.value);
        var systemLoadActual = systemActualRow ? parseThermalBiddingSpaceNumber(systemActualRow.value) : null;
        var renewableOutputForecast = renewableForecastRow ? parseThermalBiddingSpaceNumber(renewableForecastRow.value) : null;
        var renewableOutputActual = renewableActualRow ? parseThermalBiddingSpaceNumber(renewableActualRow.value) : null;
        var hydroOutputForecast = hydroForecastRow ? parseThermalBiddingSpaceNumber(hydroForecastRow.value) : null;
        var hydroOutputActual = hydroActualRow ? parseThermalBiddingSpaceNumber(hydroActualRow.value) : null;
        var tieLineTransmissionForecast = tieLineForecastRow ? parseThermalBiddingSpaceNumber(tieLineForecastRow.value) : null;
        var tieLineTransmissionActual = tieLineActualRow ? parseThermalBiddingSpaceNumber(tieLineActualRow.value) : null;
        var nonMarketOutputForecast = nonMarketForecastRow ? parseThermalBiddingSpaceNumber(nonMarketForecastRow.value) : null;
        var nonMarketOutputActual = nonMarketActualRow ? parseThermalBiddingSpaceNumber(nonMarketActualRow.value) : null;
        var dayAheadThermalBiddingSpace = calculateThermalBiddingSpace(
          systemLoadForecast,
          renewableOutputForecast,
          hydroOutputForecast,
          tieLineTransmissionForecast,
          requiresNonMarketRows ? nonMarketOutputForecast : undefined,
        );
        var realTimeThermalBiddingSpace = calculateThermalBiddingSpace(
          systemLoadActual,
          renewableOutputActual,
          hydroOutputActual,
          tieLineTransmissionActual,
          requiresNonMarketRows ? nonMarketOutputActual : undefined,
        );

        return {
          date: systemForecastRow.date,
          time: systemForecastRow.time,
          systemLoadForecast: systemLoadForecast,
          systemLoadActual: systemLoadActual,
          renewableTotalOutputForecast: renewableOutputForecast,
          renewableTotalOutputActual: renewableOutputActual,
          hydroTotalOutputForecast: hydroOutputForecast,
          hydroTotalOutputActual: hydroOutputActual,
          tieLineTransmissionForecast: tieLineTransmissionForecast,
          tieLineTransmissionActual: tieLineTransmissionActual,
          nonMarketOutputForecast: requiresNonMarketRows ? nonMarketOutputForecast : null,
          nonMarketOutputActual: requiresNonMarketRows ? nonMarketOutputActual : null,
          dayAheadThermalBiddingSpace: dayAheadThermalBiddingSpace,
          realTimeThermalBiddingSpace: realTimeThermalBiddingSpace,
          thermalBiddingSpace: dayAheadThermalBiddingSpace,
          source: uniqueStrings([
            systemForecastRow.source,
            systemActualRow && systemActualRow.source,
            renewableForecastRow && renewableForecastRow.source,
            renewableActualRow && renewableActualRow.source,
            hydroForecastRow && hydroForecastRow.source,
            hydroActualRow && hydroActualRow.source,
            tieLineForecastRow && tieLineForecastRow.source,
            tieLineActualRow && tieLineActualRow.source,
            requiresNonMarketRows && nonMarketForecastRow && nonMarketForecastRow.source,
            requiresNonMarketRows && nonMarketActualRow && nonMarketActualRow.source,
          ]).join(" / "),
          updatedAt: getLatestTextValue([
            systemForecastRow.updatedAt,
            systemActualRow && systemActualRow.updatedAt,
            renewableForecastRow && renewableForecastRow.updatedAt,
            renewableActualRow && renewableActualRow.updatedAt,
            hydroForecastRow && hydroForecastRow.updatedAt,
            hydroActualRow && hydroActualRow.updatedAt,
            tieLineForecastRow && tieLineForecastRow.updatedAt,
            tieLineActualRow && tieLineActualRow.updatedAt,
            requiresNonMarketRows && nonMarketForecastRow && nonMarketForecastRow.updatedAt,
            requiresNonMarketRows && nonMarketActualRow && nonMarketActualRow.updatedAt,
          ]),
        };
      }),
    };
  }

  function createThermalBiddingSpaceMetric(metricId, rowsConfig) {
    var result = buildThermalBiddingSpaceRows(rowsConfig);
    return {
      id: metricId,
      metricName: "火电竞价空间",
      title: "竞价空间",
      unit: "MW",
      viewMode: "thermalBiddingSpace",
      valueKey: "dayAheadThermalBiddingSpace",
      rows: result.rows,
      hasRequiredData: result.hasRequiredData,
      emptyText: "当前日期缺少竞价空间计算所需数据。",
      tableColumns: [
        { key: "time", title: "时刻" },
        { key: "systemLoadForecast", title: "系统负荷（预测）（MW）" },
        { key: "systemLoadActual", title: "系统负荷（实际）（MW）" },
        { key: "renewableTotalOutputForecast", title: "新能源总出力（预测）（MW）" },
        { key: "renewableTotalOutputActual", title: "新能源总出力（实际）（MW）" },
        { key: "hydroTotalOutputForecast", title: "水电(含抽蓄)总出力（预测）（MW）" },
        { key: "hydroTotalOutputActual", title: "水电(含抽蓄)总出力（实际）（MW）" },
        { key: "tieLineTransmissionForecast", title: "省间联络线输电（预测）（MW）" },
        { key: "tieLineTransmissionActual", title: "省间联络线输电（实际）（MW）" },
      ].concat(
        rowsConfig && rowsConfig.includeNonMarketOutput
          ? [
              { key: "nonMarketOutputForecast", title: "非市场机组总出力（预测）（MW）" },
              { key: "nonMarketOutputActual", title: "非市场机组总出力（实际）（MW）" },
            ]
          : [],
      ).concat([
        { key: "dayAheadThermalBiddingSpace", title: "火电竞价空间（日前）（MW）" },
        { key: "realTimeThermalBiddingSpace", title: "火电竞价空间（实时）（MW）" },
      ]),
    };
  }

  function mergeSingleMetricRows(forecastRows, actualRows) {
    var merged = {};

    (forecastRows || []).forEach(function eachRow(row) {
      var key = row.date + " " + row.time;
      merged[key] = merged[key] || {
        date: row.date,
        time: row.time,
        forecastValue: null,
        actualValue: null,
        sourceList: [],
        updatedAtList: [],
      };
      merged[key].forecastValue = row.value;
      if (row.source) {
        merged[key].sourceList.push(row.source);
      }
      if (row.updatedAt) {
        merged[key].updatedAtList.push(row.updatedAt);
      }
    });

    (actualRows || []).forEach(function eachRow(row) {
      var key = row.date + " " + row.time;
      merged[key] = merged[key] || {
        date: row.date,
        time: row.time,
        forecastValue: null,
        actualValue: null,
        sourceList: [],
        updatedAtList: [],
      };
      merged[key].actualValue = row.value;
      if (row.source) {
        merged[key].sourceList.push(row.source);
      }
      if (row.updatedAt) {
        merged[key].updatedAtList.push(row.updatedAt);
      }
    });

    return Object.keys(merged)
      .sort()
      .map(function mapKey(key) {
        var row = merged[key];
        return {
          date: row.date,
          time: row.time,
          forecastValue: row.forecastValue,
          actualValue: row.actualValue,
          diffValue:
            typeof row.forecastValue === "number" && typeof row.actualValue === "number"
              ? roundNumber(row.actualValue - row.forecastValue)
              : null,
          source: uniqueStrings(row.sourceList).join(" / "),
          updatedAt: getLatestTextValue(row.updatedAtList),
        };
      });
  }

  function createSingleMetricLoadMetric(metricId, metricName, forecastRows, actualRows, options) {
    var settings = options || {};
    return {
      id: metricId,
      metricName: metricName,
      title: settings.title || metricName,
      unit: settings.unit || "MW",
      rows: mergeSingleMetricRows(forecastRows, actualRows),
    };
  }

  function createSingleMetricLoadPage(options) {
    return {
      title: options.title || "负荷信息",
      description: options.description || "",
      updateTime: options.updateTime || "",
      statusSource: options.statusSource || "",
      dataSource: options.dataSource || "",
      filters: cloneValue(options.filters || {}),
      viewType: "singleMetricLoad",
      datePickerMode: "single",
      chartTitle: options.chartTitle || "趋势图",
      chartUnit: options.chartUnit || "MW",
      labelKey: "time",
      sidebarGroups: cloneValue(options.sidebarGroups || []),
      defaultMetricId: options.defaultMetricId || "",
      metrics: cloneValue(options.metrics || {}),
      tableMinWidth: options.tableMinWidth || 900,
      emptyText: options.emptyText || DEFAULT_EMPTY_TEXT,
    };
  }

  function createSingleMetricInfoSubPage(options) {
    return createSingleMetricLoadPage({
      title: options.title,
      description: options.description || options.dataSource || "",
      updateTime: options.updateTime || "",
      statusSource: options.statusSource || options.dataSource || "",
      dataSource: options.dataSource || "",
      filters: {
        tradeCenter: options.tradeCenter,
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: options.secondaryTab,
      },
      chartTitle: options.chartTitle || options.title + "趋势图",
      sidebarGroups: [
        {
          label: options.title,
          items: [{ id: options.metric.id, label: options.metric.metricName || options.metric.title || options.title }],
        },
      ],
      defaultMetricId: options.metric.id,
      metrics: (function buildMetricMap() {
        var map = {};
        map[options.metric.id] = options.metric;
        return map;
      })(),
      tableMinWidth: options.tableMinWidth || 920,
      emptyText: options.emptyText || DEFAULT_EMPTY_TEXT,
    });
  }

  function buildTreeComparePage(options) {
    var rows = mergeTrendRows(options.bundle, flattenMetricGroups(options.metricGroups));
    var normalizedRows = (options.transformRows ? options.transformRows(rows) : rows).map(function mapRow(row) {
      var nextRow = cloneValue(row);
      if (!nextRow.updatedAt) {
        nextRow.updatedAt = getLatestTextValue(
          Object.keys(nextRow)
            .filter(function filterKey(key) {
              return key.indexOf("UpdatedAt") >= 0;
            })
            .map(function mapKey(key) {
              return nextRow[key];
            }),
        );
      }
      return nextRow;
    });
    var sourceList = uniqueStrings(
      flattenMetricGroups(options.metricGroups).map(function mapItem(item) {
        return getBundleSourceMeta(options.bundle, item).source;
      }),
    );
    var updateTime = getLatestTextValue(
      flattenMetricGroups(options.metricGroups).map(function mapItem(item) {
        return getBundleSourceMeta(options.bundle, item).updatedAt;
      }),
    );

    return {
      title: options.title,
      description: options.description,
      updateTime: updateTime || options.bundle.dataUpdatedAt || "",
      dataSource: options.dataSource || sourceList.join(" / ") || "",
      filters: cloneValue(options.filters || {}),
      viewType: "metricTreeCompare",
      chartTitle: options.chartTitle || options.title,
      chartUnit: options.chartUnit || "MW",
      labelKey: options.labelKey || "time",
      metricTree: buildMetricTreeGroups(options.metricGroups),
      metricGroups: cloneValue(options.metricGroups),
      seriesDefinitions: flattenMetricGroups(options.metricGroups).map(function mapItem(item) {
        return {
          id: item.id,
          label: item.label,
          groupId: item.groupId || "",
          role: item.role || "actual",
          color: item.color,
          dasharray: item.dasharray || "",
          valueKey: item.valueKey,
        };
      }),
      defaultVisibleSeriesIds: (options.defaultVisibleSeriesIds || []).slice(),
      tableColumns: cloneValue(options.tableColumns || []),
      tableData: normalizedRows,
      tableMinWidth: options.tableMinWidth || Math.max(920, (options.tableColumns || []).length * 128),
      emptyText: options.emptyText || DEFAULT_EMPTY_TEXT,
    };
  }

  function resolveCatalogEntry(catalog, pageType, primaryTab, secondaryTab) {
    if (!catalog || !catalog.pageMap || !catalog.datasets) {
      return null;
    }

    var pageConfig = catalog.pageMap[pageType];
    if (!pageConfig) {
      return null;
    }

    function findDataset(datasetKey) {
      return datasetKey ? catalog.datasets[datasetKey] || null : null;
    }

    function resolveEntry(entry, nextSecondaryTab, fallbackDatasetKey, strictSecondary) {
      if (!entry) {
        return findDataset(fallbackDatasetKey);
      }

      if (typeof entry === "string") {
        if (strictSecondary && nextSecondaryTab) {
          return null;
        }
        return findDataset(entry);
      }

      if (entry.secondaryTabs && nextSecondaryTab) {
        if (entry.secondaryTabs[nextSecondaryTab]) {
          return findDataset(entry.secondaryTabs[nextSecondaryTab]);
        }
        return null;
      }

      if (entry.defaultDatasetKey) {
        return findDataset(entry.defaultDatasetKey);
      }

      if (entry.secondaryTabs) {
        var secondaryKeys = Object.keys(entry.secondaryTabs);
        if (secondaryKeys.length) {
          return findDataset(entry.secondaryTabs[secondaryKeys[0]]);
        }
      }

      return findDataset(fallbackDatasetKey);
    }

    if (!primaryTab) {
      return resolveEntry(pageConfig, secondaryTab, pageConfig.defaultDatasetKey, Boolean(secondaryTab));
    }

    if (!pageConfig.primaryTabs || !pageConfig.primaryTabs[primaryTab]) {
      return null;
    }

    return resolveEntry(
      pageConfig.primaryTabs[primaryTab],
      secondaryTab,
      pageConfig.defaultDatasetKey,
      Boolean(secondaryTab),
    );
  }

  function buildGenericSettlementPage(bundle, tradeCenterKey, primaryTab) {
    var settlement = bundle.settlement || {};
    var centerName = TRADE_CENTER_NAMES[tradeCenterKey];
    var isMonthly = primaryTab === "月结算";
    var rows = isMonthly ? settlement.monthRows || [] : settlement.dailyRows || [];

    if (!rows.length) {
      return null;
    }

    if (isMonthly) {
      var monthValues = rows.slice(0, 8).map(function mapRow(row) {
        return Number(row.fee || row.totalFee || 0);
      });
      var monthSeries = createSeries(
        "monthlySettlementFee",
        "月结算总电费",
        rows.slice(0, 8).map(function mapRow(row) {
          return row.enterpriseName;
        }),
        monthValues,
        "元",
        "bar",
      );
      return {
        title: "月结算",
        description: centerName + "月结算 mock 数据。",
        updateTime: settlement.statusText || bundle.dataUpdatedAt || "",
        dataSource: centerName + "月结算台账",
        filters: {
          tradeCenter: tradeCenterKey,
          pageType: "settlement",
          primaryTab: "月结算",
          secondaryTab: "",
        },
        summaryCards: [
          { label: "明细条数", value: rows.length, unit: "条" },
          {
            label: "结算总电量",
            value: rows.reduce(function accumulate(total, row) {
              return total + Number(row.energy || row.settlementEnergy || 0);
            }, 0),
            unit: "MWh",
          },
          {
            label: "结算总电费",
            value: rows.reduce(function accumulate(total, row) {
              return total + Number(row.fee || row.totalFee || 0);
            }, 0),
            unit: "元",
          },
          { label: "平均电费", value: monthSeries.average, unit: "元" },
        ],
        chartType: "bar",
        chartUnit: "元",
        chartSeries: [monthSeries],
        tableColumns: [
          { key: "month", title: "结算月份" },
          { key: "enterpriseCode", title: "用户编码" },
          { key: "enterpriseName", title: "用户名称" },
          { key: "accountNo", title: "用户户号" },
          { key: "energy", title: "结算电量（MWh）" },
          { key: "fee", title: "结算电费（元）" },
          { key: "agencyIncome", title: "服务费（元）" },
          { key: "status", title: "状态" },
        ],
        tableData: rows.map(function mapRow(row) {
          return {
            month: row.month,
            enterpriseCode: row.enterpriseCode,
            enterpriseName: row.enterpriseName,
            accountNo: row.accountNo,
            energy: row.energy,
            fee: row.fee,
            agencyIncome: row.agencyIncome,
            status: row.status,
          };
        }),
        fileList: createMockFileList(tradeCenterKey + "-monthly-settlement", rows[0].month || "", 3),
        emptyText: centerName + "暂无月结算 mock 数据。",
      };
    }

    var dayValues = rows.slice(0, 8).map(function mapRow(row) {
      return Number(row.totalFee || (row.dataType === "电费" ? row.totalValue || row["合计值"] : 0) || 0);
    });
    var daySeries = createSeries(
      "dailySettlementFee",
      "日清算总电费",
      rows.slice(0, 8).map(function mapRow(row) {
        var rowDate = row.date || row["日期"] || "";
        return (row.enterpriseName || row["企业名称"] || "") + " " + String(rowDate).slice(5);
      }),
      dayValues,
      "元",
      "bar",
    );

    return {
      title: "日清算",
      description: centerName + "日清算 mock 数据。",
      updateTime: settlement.statusText || bundle.dataUpdatedAt || "",
      dataSource: centerName + "日清算台账",
      filters: {
        tradeCenter: tradeCenterKey,
        pageType: "settlement",
        primaryTab: "日清算",
        secondaryTab: "",
        dateRange: settlement.dailyDateRange || {
          start: rows[0].date || rows[0]["日期"] || "",
          end: rows[0].date || rows[0]["日期"] || "",
        },
      },
      summaryCards: [
        { label: "明细条数", value: rows.length, unit: "条" },
        {
          label: "结算总电量",
          value: rows.reduce(function accumulate(total, row) {
            return total + Number(row.energy || row.settlementEnergy || 0);
          }, 0),
          unit: "MWh",
        },
        {
          label: "结算总电费",
          value: rows.reduce(function accumulate(total, row) {
            return total + Number(row.totalFee || 0);
          }, 0),
          unit: "元",
        },
        { label: "平均电费", value: daySeries.average, unit: "元" },
      ],
      chartType: "bar",
      chartUnit: "元",
      chartSeries: [daySeries],
      tableColumns: settlement.dailyColumns || [
        { key: "date", title: "清算日期" },
        { key: "enterpriseCode", title: "用户编码" },
        { key: "enterpriseName", title: "用户名称" },
        { key: "accountNo", title: "用户户号" },
        { key: "energy", title: "结算电量（MWh）" },
        { key: "dayaheadFee", title: "日前电费（元）" },
        { key: "realtimeFee", title: "实时电费（元）" },
        { key: "deviationFee", title: "偏差费用（元）" },
        { key: "imbalanceFee", title: "不平衡费用（元）" },
        { key: "totalFee", title: "总电费（元）" },
      ],
      tableData: cloneValue(rows),
      fileList: createMockFileList(tradeCenterKey + "-daily-settlement", rows[0].date || "", 3),
      emptyText: centerName + "暂无日清算 mock 数据。",
    };
  }

  function buildGenericRollingPage(bundle, tradeCenterKey) {
    var rollingData = bundle.rollingData || {};
    var rows = rollingData.rows || [];
    var centerName = TRADE_CENTER_NAMES[tradeCenterKey];

    if (!rows.length) {
      return null;
    }

    var dailySummary = {};
    rows.forEach(function eachRow(row) {
      dailySummary[row.date] = dailySummary[row.date] || {
        date: row.date,
        volume: 0,
        totalPrice: 0,
        count: 0,
      };
      dailySummary[row.date].volume += Number(row.volume || 0);
      dailySummary[row.date].totalPrice += Number(row.averagePrice || 0);
      dailySummary[row.date].count += 1;
    });

    var summaryRows = Object.keys(dailySummary)
      .sort()
      .map(function mapDate(date) {
        return {
          date: date,
          volume: dailySummary[date].volume,
          averagePrice: Number((dailySummary[date].totalPrice / Math.max(dailySummary[date].count, 1)).toFixed(1)),
        };
      });

    var volumeSeries = createSeries(
      "rollingVolume",
      "成交电量",
      summaryRows.map(function mapRow(row) {
        return row.date.slice(5);
      }),
      summaryRows.map(function mapRow(row) {
        return row.volume;
      }),
      "MWh",
      "bar",
    );
    var priceSeries = createSeries(
      "rollingPrice",
      "成交均价",
      summaryRows.map(function mapRow(row) {
        return row.date.slice(5);
      }),
      summaryRows.map(function mapRow(row) {
        return row.averagePrice;
      }),
      "元/MWh",
    );

    return {
      title: "滚搓数据",
      description: centerName + "滚搓数据统一 mock 结构。",
      updateTime: rollingData.statusText || bundle.dataUpdatedAt || "",
      dataSource: centerName + "滚搓交易台账",
      filters: {
        tradeCenter: tradeCenterKey,
        pageType: "rollingData",
        primaryTab: "",
        secondaryTab: "",
      },
      summaryCards: [
        { label: "交易记录数", value: rows.length, unit: "条" },
        { label: "成交电量峰值", value: volumeSeries.max, unit: "MWh" },
        { label: "成交均价峰值", value: priceSeries.max, unit: "元/MWh" },
        { label: "成交均价均值", value: priceSeries.average, unit: "元/MWh" },
      ],
      chartType: "mixed",
      chartUnit: "MWh / 元/MWh",
      chartSeries: [volumeSeries, priceSeries],
      tableColumns: [
        { key: "date", title: "日期" },
        { key: "tradeCenter", title: "交易中心" },
        { key: "product", title: "交易品种" },
        { key: "period", title: "交易时段" },
        { key: "volume", title: "成交电量（MWh）" },
        { key: "averagePrice", title: "成交均价（元/MWh）" },
        { key: "updatedAt", title: "更新时间" },
      ],
      tableData: cloneValue(rows),
      fileList: createMockFileList(tradeCenterKey + "-rolling-data", rows[0].date || "", 3),
      emptyText: centerName + "暂无滚搓数据 mock 数据。",
    };
  }

  function buildGenericRetailPage(bundle, tradeCenterKey) {
    var retailRelation = bundle.retailRelation || {};
    var rows = retailRelation.rows || [];
    var centerName = TRADE_CENTER_NAMES[tradeCenterKey];

    if (!rows.length) {
      return null;
    }

    var statusCounter = {};
    rows.forEach(function eachRow(row) {
      statusCounter[row.status] = (statusCounter[row.status] || 0) + 1;
    });

    var statusKeys = Object.keys(statusCounter);
    var statusSeries = createSeries(
      "retailStatus",
      "合作状态分布",
      statusKeys,
      statusKeys.map(function mapKey(key) {
        return statusCounter[key];
      }),
      "个",
      "bar",
    );

    return {
      title: "零售关系",
      description: centerName + "零售关系统一 mock 结构。",
      updateTime: retailRelation.statusText || bundle.dataUpdatedAt || "",
      dataSource: centerName + "零售关系台账",
      filters: {
        tradeCenter: tradeCenterKey,
        pageType: "retailRelation",
        primaryTab: "",
        secondaryTab: "",
      },
      summaryCards: [
        { label: "用户总数", value: rows.length, unit: "个" },
        { label: "合作中", value: statusCounter["合作中"] || 0, unit: "个" },
        { label: "即将到期", value: statusCounter["即将到期"] || 0, unit: "个" },
        { label: "已结束", value: statusCounter["已结束"] || 0, unit: "个" },
      ],
      chartType: "bar",
      chartUnit: "个",
      chartSeries: [statusSeries],
      tableColumns: [
        { key: "userCode", title: "电力用户编码" },
        { key: "userName", title: "电力用户名称" },
        { key: "accountNo", title: "用户户号" },
        { key: "microgridName", title: "微电网名称" },
        { key: "startDate", title: "合作开始日期" },
        { key: "endDate", title: "合作结束日期" },
        { key: "status", title: "合作状态" },
        { key: "sellerCompany", title: "售电公司" },
      ],
      tableData: cloneValue(rows),
      fileList: createMockFileList(tradeCenterKey + "-retail-relation", rows[0].startDate || "", 3),
      emptyText: centerName + "暂无零售关系 mock 数据。",
    };
  }

  function buildGuangdongLoadPage(bundle) {
    var info = bundle.infoDisclosure || {};
    var statusTime = extractStatusTime(info.statusText) || bundle.dataUpdatedAt || "";
    var statusSource = extractStatusSource(info.statusText) || "取数工具";
    var westForecastRows = buildQuarterRowsFromGuangdongMetric(bundle, "west-east", "forecast");
    var westActualRows = buildQuarterRowsFromGuangdongMetric(bundle, "west-east", "actual");
    var westBranchConfigs = [
      { id: "west-three-gorges", label: "三峡", scale: 0.13, pattern: [0, 18, -10, 12] },
      { id: "west-xingan-dc", label: "兴安直流", scale: 0.09, pattern: [0, 12, -8, 6] },
      { id: "west-tianguang-dc", label: "天广直流", scale: 0.08, pattern: [0, 10, -6, 5] },
      { id: "west-xindong-dc", label: "新东直流", scale: 0.08, pattern: [0, 9, -5, 7] },
      { id: "west-kunliulong-dc", label: "昆柳龙直流", scale: 0.1, pattern: [0, 14, -9, 8] },
      { id: "west-puqiao-dc", label: "普侨直流", scale: 0.07, pattern: [0, 8, -5, 5] },
      { id: "west-chusui-dc", label: "楚穗直流", scale: 0.09, pattern: [0, 11, -7, 6] },
      { id: "west-hainan-gd-total", label: "海南送广东总加", scale: 0.06, pattern: [0, 7, -4, 4] },
      { id: "west-niucang-dc", label: "牛从直流", scale: 0.08, pattern: [0, 9, -6, 5] },
      { id: "west-yumao-guishan-heluo-wuluo-total", label: "玉茂桂山贺罗梧罗总加", scale: 0.12, pattern: [0, 16, -10, 9] },
      { id: "west-gaozhao-dc", label: "高肇直流", scale: 0.1, pattern: [0, 13, -8, 7] },
    ];
    var metrics = {
      "dispatch-load": createSingleMetricLoadMetric(
        "dispatch-load",
        "统调负荷",
        buildQuarterRowsFromGuangdongMetric(bundle, "dispatch-load", "forecast"),
        buildQuarterRowsFromGuangdongMetric(bundle, "dispatch-load", "actual"),
      ),
      "thermal-bidding-space": createThermalBiddingSpaceMetric("thermal-bidding-space", {
        systemLoadRows: buildQuarterRowsFromGuangdongMetric(bundle, "dispatch-load", "actual"),
        renewableRows: buildQuarterRowsFromGuangdongMetric(bundle, "spot-renewable", "actual"),
        hydroRows: buildQuarterRowsFromGuangdongMetric(bundle, "hydro-total", "actual"),
        tieLineRows: buildQuarterRowsFromGuangdongMetric(bundle, "west-east", "actual"),
      }),
      "province-a": createSingleMetricLoadMetric(
        "province-a",
        "省内A类电源",
        buildQuarterRowsFromGuangdongMetric(bundle, "province-a", "forecast"),
        buildQuarterRowsFromGuangdongMetric(bundle, "province-a", "actual"),
      ),
      "province-b": createSingleMetricLoadMetric(
        "province-b",
        "省内B类电源",
        buildQuarterRowsFromGuangdongMetric(bundle, "province-b", "forecast"),
        buildQuarterRowsFromGuangdongMetric(bundle, "province-b", "actual"),
      ),
      "local-power": createSingleMetricLoadMetric(
        "local-power",
        "地方电源出力",
        buildQuarterRowsFromGuangdongMetric(bundle, "local-power", "forecast"),
        buildQuarterRowsFromGuangdongMetric(bundle, "local-power", "actual"),
      ),
      wind: createSingleMetricLoadMetric(
        "wind",
        "风电",
        buildQuarterRowsFromGuangdongMetric(bundle, "wind", "forecast"),
        buildQuarterRowsFromGuangdongMetric(bundle, "wind", "actual"),
      ),
      solar: createSingleMetricLoadMetric(
        "solar",
        "光伏",
        buildQuarterRowsFromGuangdongMetric(bundle, "solar", "forecast"),
        buildQuarterRowsFromGuangdongMetric(bundle, "solar", "actual"),
      ),
      thermal: createSingleMetricLoadMetric(
        "thermal",
        "火电",
        buildQuarterRowsFromGuangdongMetric(bundle, "thermal", "forecast"),
        buildQuarterRowsFromGuangdongMetric(bundle, "thermal", "actual"),
      ),
      hydro: createSingleMetricLoadMetric(
        "hydro",
        "水电",
        buildQuarterRowsFromGuangdongMetric(bundle, "hydro", "forecast"),
        buildQuarterRowsFromGuangdongMetric(bundle, "hydro", "actual"),
      ),
      "hk-link": createSingleMetricLoadMetric(
        "hk-link",
        "粤港联络线",
        buildQuarterRowsFromGuangdongMetric(bundle, "hk-link", "forecast"),
        buildQuarterRowsFromGuangdongMetric(bundle, "hk-link", "actual"),
      ),
      "west-east": createSingleMetricLoadMetric(
        "west-east",
        "西电东送电力",
        westForecastRows,
        westActualRows,
      ),
      "total-output": createSingleMetricLoadMetric(
        "total-output",
        "发电总出力",
        buildQuarterRowsFromGuangdongMetric(bundle, "total-output", "forecast"),
        buildQuarterRowsFromGuangdongMetric(bundle, "total-output", "actual"),
      ),
      "spot-renewable": createSingleMetricLoadMetric(
        "spot-renewable",
        "现货新能源总出力",
        buildQuarterRowsFromGuangdongMetric(bundle, "spot-renewable", "forecast"),
        buildQuarterRowsFromGuangdongMetric(bundle, "spot-renewable", "actual"),
      ),
      "dispatch-renewable": createSingleMetricLoadMetric(
        "dispatch-renewable",
        "统调新能源总出力",
        buildQuarterRowsFromGuangdongMetric(bundle, "dispatch-renewable", "forecast"),
        buildQuarterRowsFromGuangdongMetric(bundle, "dispatch-renewable", "actual"),
      ),
      "hydro-total": createSingleMetricLoadMetric(
        "hydro-total",
        "水电（含抽蓄）总出力",
        buildQuarterRowsFromGuangdongMetric(bundle, "hydro-total", "forecast"),
        buildQuarterRowsFromGuangdongMetric(bundle, "hydro-total", "actual"),
      ),
      "pump-plan": createSingleMetricLoadMetric(
        "pump-plan",
        "抽蓄电站出力计划",
        buildQuarterRowsFromGuangdongMetric(bundle, "pump-plan", "forecast"),
        [],
      ),
    };

    westBranchConfigs.forEach(function addWestBranchMetric(config) {
      metrics[config.id] = createSingleMetricLoadMetric(
        config.id,
        config.label,
        buildScaledDerivedQuarterRows(westForecastRows, {
          scale: config.scale,
          pattern: config.pattern,
          source: "广东电力交易中心" + config.label + "预测",
          updatedAt: statusTime,
        }),
        buildScaledDerivedQuarterRows(westActualRows, {
          scale: config.scale,
          pattern: config.pattern.map(function invertPattern(value) { return -value; }),
          source: "广东电力交易中心" + config.label + "实际",
          updatedAt: statusTime,
        }),
      );
    });

    if (!Object.keys(metrics).length) {
      return null;
    }

    return createSingleMetricLoadPage({
      title: "负荷信息",
      description: "广东交易中心负荷信息页按单指标切换展示预测、实际与分时明细。",
      updateTime: statusTime,
      statusSource: statusSource,
      dataSource: "广东电力交易中心负荷信息",
      filters: {
        tradeCenter: "guangdong",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "负荷信息",
        date: info.defaultRunDate || "",
      },
      chartTitle: "负荷信息趋势图",
      sidebarGroups: [
        { label: "负荷信息", items: [
          { id: "dispatch-load", label: "统调负荷" },
          { id: "province-a", label: "省内A类电源" },
          { id: "province-b", label: "省内B类电源" },
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
          { id: "hk-link", label: "粤港联络线" },
          {
            id: "west-east",
            label: "西电东送电力",
            children: westBranchConfigs.map(function mapWestBranch(config) {
              return { id: config.id, label: config.label };
            }),
          },
          { id: "total-output", label: "发电总出力" },
          { id: "spot-renewable", label: "现货新能源总出力" },
          { id: "dispatch-renewable", label: "统调新能源总出力" },
          { id: "hydro-total", label: "水电（含抽蓄）总出力" },
          { id: "pump-plan", label: "抽蓄电站出力计划" },
        ] },
      ],
      defaultMetricId: "dispatch-load",
      metrics: metrics,
      tableMinWidth: 920,
      emptyText: "当前日期暂无广东负荷信息 mock 数据。",
    });
  }

  function buildGuangdongMaintenancePage(bundle) {
    var info = bundle.infoDisclosure || {};
    var rows = info.maintenanceRows || [];

    if (!rows.length) {
      return null;
    }

    var values = rows.map(function mapRow(row) {
      return Number(row.value || 0);
    });
    var series = createSeries("maintenanceCapacity", "检修容量", rows.map(function mapRow(row) { return row.time; }), values, "MW");

    return {
      title: "机组检修容量",
      description: "广东交易中心机组检修容量统一 mock 结构。",
      updateTime: info.statusText || bundle.dataUpdatedAt || "",
      dataSource: "广东电力交易中心检修容量",
      filters: {
        tradeCenter: "guangdong",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "机组检修容量",
      },
      summaryCards: buildSummaryCardsFromStats(series.stats, "MW", [{ label: "采样点", value: rows.length, unit: "个" }]),
      chartType: "line",
      chartUnit: "MW",
      chartSeries: [series],
      tableColumns: [
        { key: "time", title: "时刻" },
        { key: "value", title: "检修容量（MW）" },
        { key: "source", title: "数据来源" },
        { key: "updatedAt", title: "更新时间" },
      ],
      tableData: cloneValue(rows),
      fileList: createMockFileList("gd-maintenance", "2026-05-09", 3),
      emptyText: "当前日期暂无广东检修容量 mock 数据。",
    };
  }

  function buildGuangdongTransmissionMaintenancePlanPage(bundle) {
    var info = bundle.infoDisclosure || {};
    var rows = info.transmissionMaintenancePlanRows || [];

    return buildDisclosureTablePage({
      provinceCode: "gd",
      tabKey: "transmissionMaintenancePlan",
      title: "发输变电设备检修计划",
      tableTitle: "发输变电设备检修计划",
      description: "广东交易中心发输变电设备检修计划按上传文件字段展示。",
      updateTime: info.transmissionMaintenancePlanUpdateTime || bundle.dataUpdatedAt || "",
      publishTime: info.transmissionMaintenancePlanPublishTime || info.publishTime || bundle.dataPublishTime || "",
      dataSource: "广东电力交易中心发输变电设备检修计划",
      updateSource: "广东-机组检修预测信息.xlsx",
      filters: {
        tradeCenter: "guangdong",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "发输变电设备检修计划",
        date: info.transmissionMaintenancePlanDefaultDate || info.defaultRunDate || "",
      },
      columns: [
        { key: "plantName", title: "电厂名称" },
        { key: "equipmentName", title: "发输变电设备" },
        { key: "voltageLevel", title: "电压等级" },
        { key: "currentStartTime", title: "检修开始时间" },
        { key: "compareStartTime", title: "对比日检修开始时间" },
        { key: "currentEndTime", title: "检修结束时间" },
        { key: "compareEndTime", title: "对比日检修结束时间" },
      ],
      rows: rows,
      tableMinWidth: 1420,
      baseTableMinWidth: 1040,
      compareMode: "dateMerge",
      compareMergeKeys: ["plantName", "equipmentName", "voltageLevel"],
      fileList: [
        {
          id: "gd-transmission-maintenance-plan-source",
          fileName: "广东-机组检修预测信息.xlsx",
          fileType: "XLSX",
          publishTime: info.transmissionMaintenancePlanPublishTime || "",
          size: "20KB",
          downloadUrl: "#",
        },
      ],
      emptyText: "当前日期暂无广东发输变电设备检修计划数据。",
    });
  }

  function buildGuangdongReservePage(bundle) {
    var info = bundle.infoDisclosure || {};
    var rows = info.reserveRows || [];

    if (!rows.length) {
      return null;
    }

    var positiveSeries = createSeries(
      "actualPositive",
      "正备用",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return Number(row.actualPositive || 0); }),
      "MW",
    );
    var negativeSeries = createSeries(
      "actualNegative",
      "负备用",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return Number(row.actualNegative || 0); }),
      "MW",
    );

    return {
      title: "备用信息",
      description: "广东交易中心备用信息统一 mock 结构。",
      updateTime: info.statusText || bundle.dataUpdatedAt || "",
      dataSource: "广东电力交易中心备用信息",
      filters: {
        tradeCenter: "guangdong",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "备用信息",
      },
      summaryCards: [
        { label: "正备用峰值", value: positiveSeries.max, unit: "MW" },
        { label: "负备用峰值", value: negativeSeries.max, unit: "MW" },
        { label: "正备用均值", value: positiveSeries.average, unit: "MW" },
        { label: "负备用均值", value: negativeSeries.average, unit: "MW" },
      ],
      metricTree: [
        { id: "gd-positive", label: "正备用" },
        { id: "gd-negative", label: "负备用" },
      ],
      chartType: "line",
      chartUnit: "MW",
      chartSeries: [positiveSeries, negativeSeries],
      tableColumns: [
        { key: "time", title: "时刻" },
        { key: "forecastPositive", title: "预测正备用（MW）" },
        { key: "actualPositive", title: "实际正备用（MW）" },
        { key: "forecastNegative", title: "预测负备用（MW）" },
        { key: "actualNegative", title: "实际负备用（MW）" },
        { key: "actualPrimary", title: "实际一次备用（MW）" },
      ],
      tableData: cloneValue(rows),
      fileList: createMockFileList("gd-reserve", "2026-05-09", 3),
      emptyText: "当前日期暂无广东备用信息 mock 数据。",
    };
  }

  function buildGuangdongSaleCompanyPage(bundle) {
    var info = bundle.infoDisclosure || {};
    var rows = info.saleCompanyRows || [];
    var labels = info.hours || [];

    if (!rows.length || !labels.length) {
      return null;
    }

    var latestRow = rows[rows.length - 1];
    var averageValues = labels.map(function mapHour(_, hourIndex) {
      var total = rows.reduce(function accumulate(sum, row) {
        return sum + Number((row.hourlyValues || [])[hourIndex] || 0);
      }, 0);
      return Math.round(total / rows.length);
    });
    var latestSeries = createSeries("latestDay", "最新日电量", labels, latestRow.hourlyValues || [], "MWh");
    var averageSeries = createSeries("averageDay", "周期均值电量", labels, averageValues, "MWh");

    return {
      title: "售电公司分时电量",
      description: "广东交易中心售电公司分时电量统一 mock 结构。",
      updateTime: info.statusText || bundle.dataUpdatedAt || "",
      dataSource: "广东电力交易中心售电公司分时电量",
      filters: {
        tradeCenter: "guangdong",
        pageType: "infoDisclosure",
        primaryTab: "售电公司分时电量",
        secondaryTab: "",
      },
      summaryCards: buildSummaryCardsFromStats(latestSeries.stats, "MWh", [{ label: "日合计电量", value: latestRow.total || 0, unit: "MWh" }]),
      chartType: "line",
      chartUnit: "MWh",
      chartSeries: [latestSeries, averageSeries],
      tableColumns: [
        { key: "date", title: "日期" },
        { key: "hourlyValues", title: "24 点分时电量" },
        { key: "total", title: "日合计电量（MWh）" },
      ],
      tableData: cloneValue(rows),
      fileList: createMockFileList("gd-sale-company", latestRow.date || "2026-05-09", 3),
      emptyText: "当前日期暂无广东售电公司分时电量 mock 数据。",
    };
  }

  function buildGuangdongEnterprisePage(bundle) {
    var info = bundle.infoDisclosure || {};
    var rows = info.enterpriseRows || [];
    var labels = info.hours || [];

    if (!rows.length || !labels.length) {
      return null;
    }

    var latestDate = rows[rows.length - 1].date;
    var latestRows = rows.filter(function filterRow(row) {
      return row.date === latestDate;
    });
    var aggregateValues = labels.map(function mapHour(_, hourIndex) {
      return latestRows.reduce(function accumulate(total, row) {
        return total + Number((row.hourlyValues || [])[hourIndex] || 0);
      }, 0);
    });
    var aggregateSeries = createSeries("enterpriseAggregate", "企业聚合电量", labels, aggregateValues, "MWh");

    return {
      title: "用电企业分时电量",
      description: "广东交易中心用电企业分时电量统一 mock 结构。",
      updateTime: info.statusText || bundle.dataUpdatedAt || "",
      dataSource: "广东电力交易中心用电企业分时电量",
      filters: {
        tradeCenter: "guangdong",
        pageType: "infoDisclosure",
        primaryTab: "用电企业分时电量",
        secondaryTab: "",
      },
      summaryCards: buildSummaryCardsFromStats(aggregateSeries.stats, "MWh", [{ label: "企业数量", value: latestRows.length, unit: "家" }]),
      chartType: "line",
      chartUnit: "MWh",
      chartSeries: [aggregateSeries],
      tableColumns: [
        { key: "date", title: "日期" },
        { key: "userCode", title: "用户编码" },
        { key: "userName", title: "用户名称" },
        { key: "accountNo", title: "户号" },
        { key: "microgridName", title: "微电网名称" },
        { key: "total", title: "日合计电量（MWh）" },
      ],
      tableData: cloneValue(latestRows),
      fileList: createMockFileList("gd-enterprise", latestDate || "2026-05-09", 3),
      emptyText: "当前日期暂无广东用电企业分时电量 mock 数据。",
    };
  }

  function getLegacyNodePriceData(bundle) {
    var tradeResult = (bundle && bundle.tradeResult) || {};
    var nodePriceByDate = tradeResult.nodePriceByDate || {};
    return nodePriceByDate[tradeResult.defaultRunDate] || null;
  }

  function getLegacyTradingResultData(bundle) {
    var tradeResult = (bundle && bundle.tradeResult) || {};
    var tradingResultByDate = tradeResult.tradingResultByDate || {};
    return tradingResultByDate[tradeResult.defaultRunDate] || null;
  }

  function buildUnifiedProvinceClearingPricePage(tradeCenterKey, bundle) {
    var nodePriceData = getUnifiedNodePriceMock(tradeCenterKey) || getLegacyNodePriceData(bundle);
    var rows = getProvinceHourlyNodePriceRows(nodePriceData);
    var centerName = (nodePriceData && nodePriceData.centerName) || TRADE_CENTER_NAMES[tradeCenterKey] || "";

    if (!rows.length) {
      return null;
    }

    var dayAheadSeries = createSeries(
      tradeCenterKey + "DayAheadNodePrice",
      "日前节点电价",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return row.dayAheadNodePrice; }),
      "元/MWh",
    );
    var realTimeSeries = createSeries(
      tradeCenterKey + "RealTimeNodePrice",
      "实时节点电价",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return row.realTimeNodePrice; }),
      "元/MWh",
    );

    return {
      title: "全省统一出清价",
      description: centerName + "全省统一出清价由全省节点 96 点数据聚合为 24 点小时数据展示。",
      updateTime: (nodePriceData && nodePriceData.updateTime) || bundle.dataUpdatedAt || "",
      dataSource: (nodePriceData && nodePriceData.source) || "取数工具",
      filters: {
        tradeCenter: tradeCenterKey,
        pageType: "infoDisclosure",
        primaryTab: "全省统一出清价",
        secondaryTab: "",
        date: (nodePriceData && nodePriceData.date) || "",
      },
      viewType: "lineTable",
      chartTitle: "全省统一出清价趋势图",
      chartUnit: "元/MWh",
      labelKey: "time",
      datePickerMode: "single",
      timeGranularity: "1h",
      sourceNodeName: "全省",
      aggregationMethod: "从全省节点96点节点电价按小时算术平均聚合为24点",
      seriesDefinitions: [
        { id: tradeCenterKey + "-province-dayahead", label: "日前节点电价", color: "#1677FF", valueKey: "dayAheadNodePrice" },
        { id: tradeCenterKey + "-province-realtime", label: "实时节点电价", color: "#2FCB8F", valueKey: "realTimeNodePrice" },
      ],
      summaryCards: [
        { label: "日前峰值", value: dayAheadSeries.max, unit: "元/MWh" },
        { label: "实时峰值", value: realTimeSeries.max, unit: "元/MWh" },
        { label: "日前均值", value: dayAheadSeries.average, unit: "元/MWh" },
        { label: "实时均值", value: realTimeSeries.average, unit: "元/MWh" },
      ],
      chartType: "line",
      chartSeries: [dayAheadSeries, realTimeSeries],
      tableColumns: [
        { key: "time", title: "时刻" },
        { key: "dayAheadNodePrice", title: "日前节点电价（元/MWh）" },
        { key: "realTimeNodePrice", title: "实时节点电价（元/MWh）" },
        { key: "spread", title: "价差（元/MWh）" },
      ],
      tableData: withComputedNodeSpread(rows),
      fileList: createMockFileList(tradeCenterKey + "-province-clearing-price", (nodePriceData && nodePriceData.date) || "2026-05-07", 3),
      emptyText: "当前日期暂无" + centerName + "统一出清价 mock 数据。",
    };
  }

  function buildGuangdongTradePricePage(bundle) {
    return buildUnifiedProvinceClearingPricePage("guangdong", bundle);
  }

  function buildUnifiedClearingEnergyPage(tradeCenterKey, bundle) {
    var tradingResultData = getUnifiedTradingResultMock(tradeCenterKey) || getLegacyTradingResultData(bundle);
    var rows = (tradingResultData && tradingResultData.points) || [];
    var centerName = (tradingResultData && tradingResultData.centerName) || TRADE_CENTER_NAMES[tradeCenterKey] || "";

    if (!rows.length) {
      return null;
    }

    var dayAheadSeries = createSeries(
      tradeCenterKey + "DayAheadClearingEnergy",
      "日前出清电量",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return row.dayAheadVolume; }),
      "MWh",
      "bar",
    );
    var realTimeSeries = createSeries(
      tradeCenterKey + "RealTimeClearingEnergy",
      "实时出清电量",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return row.realTimeVolume; }),
      "MWh",
      "bar",
    );

    return {
      title: "出清电量",
      description: centerName + "出清电量统一 mock 结构。",
      updateTime: (tradingResultData && tradingResultData.updateTime) || bundle.dataUpdatedAt || "",
      dataSource: (tradingResultData && tradingResultData.source) || "取数工具",
      filters: {
        tradeCenter: tradeCenterKey,
        pageType: "infoDisclosure",
        primaryTab: "出清电量",
        secondaryTab: "",
        date: (tradingResultData && tradingResultData.date) || "",
      },
      viewType: "mixedTrendTable",
      leftUnit: "MWh",
      rightUnit: "",
      timeGranularity: "1h",
      summaryCards: [
        { label: "日前峰值", value: dayAheadSeries.max, unit: "MWh" },
        { label: "实时峰值", value: realTimeSeries.max, unit: "MWh" },
        { label: "日前均值", value: dayAheadSeries.average, unit: "MWh" },
        { label: "实时均值", value: realTimeSeries.average, unit: "MWh" },
      ],
      chartType: "mixed",
      chartUnit: "MWh",
      chartSeries: [dayAheadSeries, realTimeSeries],
      barSeriesDefinitions: [
        { id: tradeCenterKey + "-clearing-dayahead-volume", label: "日前出清电量", color: "#9DC4FF", valueKey: "dayAheadVolume", opacity: 0.92 },
        { id: tradeCenterKey + "-clearing-realtime-volume", label: "实时出清电量", color: "#6CB7FF", valueKey: "realTimeVolume", opacity: 0.78 },
      ],
      lineSeriesDefinitions: [],
      tableColumns: [
        { key: "time", title: "时刻" },
        { key: "dayAheadVolume", title: "日前出清电量（MWh）" },
        { key: "realTimeVolume", title: "实时出清电量（MWh）" },
      ],
      tableData: cloneValue(rows),
      fileList: createMockFileList(tradeCenterKey + "-clearing-energy", (tradingResultData && tradingResultData.date) || "2026-05-07", 3),
      emptyText: "当前日期暂无" + centerName + "出清电量 mock 数据。",
    };
  }

  function buildGuangdongTradeVolumePage(bundle) {
    var tradeResult = bundle.tradeResult || {};
    var rows = tradeResult.hourlyRows || [];

    if (!rows.length) {
      return null;
    }

    var dayAheadSeries = createSeries(
      "dayaheadVolume",
      "日前出清电量",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return Number(row.dayaheadVolume || 0); }),
      "MWh",
      "bar",
    );
    var realTimeSeries = createSeries(
      "realtimeVolume",
      "实时出清电量",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return Number(row.realtimeVolume || 0); }),
      "MWh",
    );

    return {
      title: "出清电量",
      description: "广东交易中心出清电量统一 mock 结构。",
      updateTime: tradeResult.statusText || bundle.dataUpdatedAt || "",
      dataSource: "广东电力交易中心出清电量",
      filters: {
        tradeCenter: "guangdong",
        pageType: "infoDisclosure",
        primaryTab: "出清电量",
        secondaryTab: "",
      },
      summaryCards: [
        { label: "日前峰值", value: dayAheadSeries.max, unit: "MWh" },
        { label: "实时峰值", value: realTimeSeries.max, unit: "MWh" },
        { label: "日前均值", value: dayAheadSeries.average, unit: "MWh" },
        { label: "实时均值", value: realTimeSeries.average, unit: "MWh" },
      ],
      chartType: "mixed",
      chartUnit: "MWh",
      chartSeries: [dayAheadSeries, realTimeSeries],
      tableColumns: [
        { key: "time", title: "时刻" },
        { key: "dayaheadVolume", title: "日前出清电量（MWh）" },
        { key: "realtimeVolume", title: "实时出清电量（MWh）" },
      ],
      tableData: cloneValue(rows),
      fileList: createMockFileList("gd-trade-volume", "2026-05-09", 3),
      emptyText: "当前日期暂无广东出清电量 mock 数据。",
    };
  }

  function getTradingResultMetricKeys(tradeCenterKey) {
    if (tradeCenterKey === "hunan") {
      return ["dayAheadVolume", "dayAheadSettlementPrice", "realTimeSettlementPrice"];
    }
    if (tradeCenterKey === "shaanxi") {
      return ["dayAheadSettlementPrice", "realTimeSettlementPrice"];
    }
    return ["dayAheadVolume", "realTimeVolume", "dayAheadSettlementPrice", "realTimeSettlementPrice"];
  }

  function getTradingResultMockDates(bundle, request, tradingResultData) {
    var requestedDate =
      (request && request.date) ||
      (request && request.runDate) ||
      (request && request.dateRange && request.dateRange.start) ||
      "";
    var rangeStart = (bundle && bundle.availableRange && bundle.availableRange.start) || (bundle && bundle.defaultRange && bundle.defaultRange.start) || requestedDate;
    var rangeEnd = (bundle && bundle.availableRange && bundle.availableRange.end) || (bundle && bundle.defaultRange && bundle.defaultRange.end) || requestedDate;
    var availableDates = rangeStart && rangeEnd
      ? buildDateRangeInclusive(rangeStart, rangeEnd)
      : getBundleAvailableDates(bundle, { start: rangeStart, end: rangeEnd });

    if (requestedDate && availableDates.indexOf(requestedDate) < 0) {
      availableDates.push(requestedDate);
    }

    if (!availableDates.length && tradingResultData && tradingResultData.date) {
      availableDates.push(tradingResultData.date);
    }

    return uniqueStrings(availableDates).sort();
  }

  function getDateSeed(dateValue) {
    var text = String(dateValue || "");
    return text.split("").reduce(function accumulate(total, char, index) {
      return total + char.charCodeAt(0) * (index + 1);
    }, 0);
  }

  function buildDatedTradingResultRows(rows, dateValue, tradeCenterKey) {
    var seed = getDateSeed(dateValue);
    var centerOffset = tradeCenterKey === "shaanxi" ? 3 : tradeCenterKey === "hunan" ? 1 : 0;
    var volumeFactor = 1 + (((seed + centerOffset) % 9) - 4) * 0.008;
    var priceShift = (((seed + centerOffset * 7) % 11) - 5) * 0.42;
    var isShaanxiQuarterHourRows = tradeCenterKey === "shaanxi" && (rows || []).length >= 96;

    return (rows || []).map(function mapRow(row, index) {
      var waveShift = (((seed + index * 3 + centerOffset) % 7) - 3) * 0.18;
      return {
        date: dateValue,
        time:
          isShaanxiQuarterHourRows
            ? row.time
            : (tradeCenterKey === "hunan" || tradeCenterKey === "shaanxi") && index === 23
            ? "24:00"
            : tradeCenterKey === "hunan" || tradeCenterKey === "shaanxi"
              ? padNumber(index + 1) + ":00"
              : row.time,
        dayAheadVolume: roundNumber(row.dayAheadVolume * volumeFactor),
        realTimeVolume: roundNumber(row.realTimeVolume * (volumeFactor + 0.006)),
        dayAheadSettlementPrice: roundNumber(row.dayAheadSettlementPrice + priceShift + waveShift),
        realTimeSettlementPrice: roundNumber(row.realTimeSettlementPrice + priceShift - waveShift),
      };
    });
  }

  function expandTradingResultRowsToQuarterHours(rows) {
    return (rows || []).reduce(function accumulateRows(result, row, hourIndex) {
      return result.concat(
        Array.from({ length: 4 }, function createQuarterRow(_, quarterIndex) {
          var pointIndex = hourIndex * 4 + quarterIndex;
          var waveShift = (quarterIndex - 1.5) * 0.12;
          return {
            date: row.date,
            time: QUARTER_HOUR_END_LABELS[pointIndex],
            dayAheadVolume: roundNumber(row.dayAheadVolume / 4 + waveShift),
            realTimeVolume: roundNumber(row.realTimeVolume / 4 - waveShift),
            dayAheadSettlementPrice: roundNumber(row.dayAheadSettlementPrice + waveShift),
            realTimeSettlementPrice: roundNumber(row.realTimeSettlementPrice - waveShift),
          };
        }),
      );
    }, []);
  }

  function hasTradingResultMetric(metricKeys, metricKey) {
    return metricKeys.indexOf(metricKey) >= 0;
  }

  function pickTradingResultRowMetrics(row, metricKeys) {
    var nextRow = {
      date: row.date,
      time: row.time,
    };

    metricKeys.forEach(function eachMetric(metricKey) {
      nextRow[metricKey] = row[metricKey];
    });

    return nextRow;
  }

  function buildUnifiedTradingResultPage(tradeCenterKey, bundle, request) {
    var tradingResultData = getUnifiedTradingResultMock(tradeCenterKey) || getLegacyTradingResultData(bundle);
    var mockDates = getTradingResultMockDates(bundle, request, tradingResultData);
    var displayDate = (request && (request.date || request.runDate)) || (tradingResultData && tradingResultData.date) || mockDates[0] || "";
    var rows = mockDates.reduce(function accumulateRows(result, date) {
      var datedRows = buildDatedTradingResultRows((tradingResultData && tradingResultData.points) || [], date, tradeCenterKey);
      return result.concat(datedRows);
    }, []);
    var centerName = (tradingResultData && tradingResultData.centerName) || TRADE_CENTER_NAMES[tradeCenterKey] || "";
    var metricKeys = getTradingResultMetricKeys(tradeCenterKey);
    var chartSeries = [];
    var barSeriesDefinitions = [];
    var lineSeriesDefinitions = [];
    var tableColumns = [{ key: "time", title: "时刻" }];

    if (!rows.length) {
      return null;
    }

    var dayAheadSeries = createSeries(
      tradeCenterKey + "DayaheadSettlementPrice",
      "日前用户侧统一结算价格",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return row.dayAheadSettlementPrice; }),
      "元/MWh",
    );
    var realTimeSeries = createSeries(
      tradeCenterKey + "RealtimeSettlementPrice",
      "实时用户侧统一结算价格",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return row.realTimeSettlementPrice; }),
      "元/MWh",
    );
    var dayAheadVolumeSeries = createSeries(
      tradeCenterKey + "DayAheadVolume",
      "日前成交电量",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return row.dayAheadVolume; }),
      "MWh",
      "bar",
    );
    var realTimeVolumeSeries = createSeries(
      tradeCenterKey + "RealTimeVolume",
      "实时成交电量",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return row.realTimeVolume; }),
      "MWh",
      "bar",
    );

    if (hasTradingResultMetric(metricKeys, "dayAheadVolume")) {
      chartSeries.push(dayAheadVolumeSeries);
      barSeriesDefinitions.push({
        id: tradeCenterKey + "-info-trade-dayahead-volume",
        label: "日前成交电量",
        color: "#9DC4FF",
        valueKey: "dayAheadVolume",
        opacity: 0.92,
      });
      tableColumns.push({ key: "dayAheadVolume", title: "日前成交电量（MWh）" });
    }
    if (hasTradingResultMetric(metricKeys, "realTimeVolume")) {
      chartSeries.push(realTimeVolumeSeries);
      barSeriesDefinitions.push({
        id: tradeCenterKey + "-info-trade-realtime-volume",
        label: "实时成交电量",
        color: "#6CB7FF",
        valueKey: "realTimeVolume",
        opacity: 0.78,
      });
      tableColumns.push({ key: "realTimeVolume", title: "实时成交电量（MWh）" });
    }
    if (hasTradingResultMetric(metricKeys, "dayAheadSettlementPrice")) {
      chartSeries.push(dayAheadSeries);
      lineSeriesDefinitions.push({
        id: tradeCenterKey + "-info-trade-dayahead-price",
        label: "日前用户侧统一结算价格",
        color: "#FF7A45",
        valueKey: "dayAheadSettlementPrice",
      });
      tableColumns.push({ key: "dayAheadSettlementPrice", title: "日前用户侧统一结算价格（元/MWh）" });
    }
    if (hasTradingResultMetric(metricKeys, "realTimeSettlementPrice")) {
      chartSeries.push(realTimeSeries);
      lineSeriesDefinitions.push({
        id: tradeCenterKey + "-info-trade-realtime-price",
        label: "实时用户侧统一结算价格",
        color: "#2FCB8F",
        valueKey: "realTimeSettlementPrice",
      });
      tableColumns.push({ key: "realTimeSettlementPrice", title: "实时用户侧统一结算价格（元/MWh）" });
    }

    return {
      title: "交易结果",
      description: centerName + "交易结果统一 mock 结构。",
      updateTime: (tradingResultData && tradingResultData.updateTime) || bundle.dataUpdatedAt || "",
      dataSource: (tradingResultData && tradingResultData.source) || "取数工具",
      filters: {
        tradeCenter: tradeCenterKey,
        pageType: "infoDisclosure",
        primaryTab: "交易结果",
        secondaryTab: "",
        date: displayDate,
      },
      isUnifiedTradingResult: true,
      viewType: "mixedTrendTable",
      leftUnit: barSeriesDefinitions.length ? "MWh" : "",
      rightUnit: lineSeriesDefinitions.length ? "元/MWh" : "",
      timeGranularity:
        (tradingResultData && tradingResultData.timeGranularity) ||
        (tradeCenterKey === "shaanxi" && ((tradingResultData && tradingResultData.points) || []).length >= 96 ? "15min" : "1h"),
      periodCount:
        (tradingResultData && tradingResultData.periodCount) ||
        (tradeCenterKey === "shaanxi" && ((tradingResultData && tradingResultData.points) || []).length >= 96 ? 96 : 24),
      volumeSource: (tradingResultData && tradingResultData.volumeSource) || "stable-placeholder",
      summaryCards: [
        { label: "日前结算峰值", value: dayAheadSeries.max, unit: "元/MWh" },
        { label: "实时结算峰值", value: realTimeSeries.max, unit: "元/MWh" },
        { label: "日前结算均值", value: dayAheadSeries.average, unit: "元/MWh" },
        { label: "实时结算均值", value: realTimeSeries.average, unit: "元/MWh" },
      ],
      chartType: "line",
      chartUnit: "MWh / 元/MWh",
      chartSeries: chartSeries,
      barSeriesDefinitions: barSeriesDefinitions,
      lineSeriesDefinitions: lineSeriesDefinitions,
      tableColumns: tableColumns,
      tableData: rows.map(function mapRow(row) {
        return pickTradingResultRowMetrics(row, metricKeys);
      }),
      fileList: createMockFileList(tradeCenterKey + "-trade-result", displayDate || "2026-05-07", 3),
      emptyText: "当前日期暂无" + centerName + "交易结果 mock 数据。",
    };
  }

  function buildGuangdongTradeResultPage(bundle) {
    return buildUnifiedTradingResultPage("guangdong", bundle);
  }

  function buildUnifiedNodePricePage(tradeCenterKey, bundle) {
    var nodePriceData = getUnifiedNodePriceMock(tradeCenterKey) || getLegacyNodePriceData(bundle);
    var nodes = (nodePriceData && nodePriceData.nodes) || [];
    var provinceNode = getProvinceNode(nodePriceData);
    var centerName = (nodePriceData && nodePriceData.centerName) || TRADE_CENTER_NAMES[tradeCenterKey] || "";

    if (!provinceNode || !provinceNode.points || !provinceNode.points.length) {
      return null;
    }

    var dayAheadSeries = createSeries(
      tradeCenterKey + "DayAheadNodePrice",
      "日前节点电价",
      provinceNode.points.map(function mapPoint(point) { return point.time; }),
      provinceNode.points.map(function mapPoint(point) { return point.dayAheadNodePrice; }),
      "元/MWh",
    );
    var realTimeSeries = createSeries(
      tradeCenterKey + "RealTimeNodePrice",
      "实时节点电价",
      provinceNode.points.map(function mapPoint(point) { return point.time; }),
      provinceNode.points.map(function mapPoint(point) { return point.realTimeNodePrice; }),
      "元/MWh",
    );

    var nodeSeries = {};
    nodes.forEach(function eachNode(node) {
      nodeSeries[node.nodeName] = {
        rows: cloneNodePriceRowsWithoutSpread(node.points || []),
      };
    });

    return {
      title: "节点电价",
      description: centerName + "节点电价统一 mock 结构。",
      updateTime: (nodePriceData && nodePriceData.updateTime) || bundle.dataUpdatedAt || "",
      dataSource: (nodePriceData && nodePriceData.source) || "取数工具",
      filters: {
        tradeCenter: tradeCenterKey,
        pageType: "infoDisclosure",
        primaryTab: "节点电价",
        secondaryTab: "",
        date: (nodePriceData && nodePriceData.date) || "",
      },
      viewType: "nodePrice",
      chartTitle: "节点电价趋势图",
      datePickerMode: "single",
      timeGranularity: "15m",
      nodeOptions: nodes.map(function mapNode(node) { return node.nodeName; }),
      defaultNode: "全省",
      sidebarGroups: buildNodeSidebarGroups(nodes),
      nodeSeries: nodeSeries,
      dayAheadSeriesLabel: "日前节点电价",
      realTimeSeriesLabel: "实时节点电价",
      tableMinWidth: 1180,
      summaryCards: [
        { label: "日前峰值", value: dayAheadSeries.max, unit: "元/MWh" },
        { label: "实时峰值", value: realTimeSeries.max, unit: "元/MWh" },
        { label: "日前均值", value: dayAheadSeries.average, unit: "元/MWh" },
        { label: "实时均值", value: realTimeSeries.average, unit: "元/MWh" },
      ],
      chartType: "line",
      chartUnit: "元/MWh",
      chartSeries: [dayAheadSeries, realTimeSeries],
      tableColumns: [
        { key: "time", title: "时刻" },
        { key: "dayAheadNodePrice", title: "日前节点电价（元/MWh）" },
        { key: "realTimeNodePrice", title: "实时节点电价（元/MWh）" },
      ],
      tableData: cloneNodePriceRowsWithoutSpread(provinceNode.points),
      fileList: createMockFileList(tradeCenterKey + "-node-price", (nodePriceData && nodePriceData.date) || "2026-05-07", 3),
      emptyText: "当前日期暂无" + centerName + "节点电价 mock 数据。",
    };
  }

  function buildGuangdongNodePricePage(bundle) {
    return buildUnifiedNodePricePage("guangdong", bundle);
  }

  function buildGuangdongDeclarationPage(bundle) {
    var declaration = bundle.dayAheadDeclaration || {};
    var rows = declaration.rows || [];

    if (!rows.length) {
      return null;
    }

    var volumeSeries = createSeries(
      "declarationVolume",
      "申报电量",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return row.volume; }),
      "MWh",
    );

    return {
      title: "日前申报",
      description: "广东交易中心日前申报统一 mock 结构。",
      updateTime: declaration.statusText || bundle.dataUpdatedAt || "",
      dataSource: "广东电力交易中心日前申报",
      filters: {
        tradeCenter: "guangdong",
        pageType: "infoDisclosure",
        primaryTab: "日前申报",
        secondaryTab: "",
      },
      summaryCards: [
        { label: "申报点数", value: rows.length, unit: "点" },
        { label: "申报电量峰值", value: volumeSeries.max, unit: "MWh" },
        { label: "申报电量谷值", value: volumeSeries.min, unit: "MWh" },
        { label: "申报电量均值", value: volumeSeries.average, unit: "MWh" },
      ],
      chartType: "line",
      chartUnit: "MWh",
      chartSeries: [volumeSeries],
      tableColumns: [
        { key: "time", title: "时刻" },
        { key: "volume", title: "申报电量（MWh）" },
      ],
      tableData: cloneValue(rows),
      fileList: createMockFileList("gd-dayahead-declaration", rows[0].declarationDate || "2026-05-09", 3),
      emptyText: "当前日期暂无广东日前申报 mock 数据。",
    };
  }

  function buildGuangdongInfoPage(bundle, primaryTab, secondaryTab) {
    var activeSecondaryTab = secondaryTab || "负荷信息";

    if (primaryTab === "负荷信息") {
      if (activeSecondaryTab === "负荷详情") {
        return null;
      }
      if (activeSecondaryTab === "机组检修容量") {
        return buildGuangdongMaintenancePage(bundle);
      }
      if (activeSecondaryTab === "备用信息") {
        return buildGuangdongReservePage(bundle);
      }
      if (activeSecondaryTab === "发输变电设备检修计划") {
        return buildGuangdongTransmissionMaintenancePlanPage(bundle);
      }
      if (activeSecondaryTab !== "负荷信息") {
        return null;
      }
      return buildGuangdongLoadPage(bundle);
    }

    if (primaryTab === "全省统一出清价") {
      return buildGuangdongTradePricePage(bundle);
    }
    if (primaryTab === "出清电量") {
      return buildGuangdongTradeVolumePage(bundle);
    }
    if (primaryTab === "交易结果") {
      return buildGuangdongTradeResultPage(bundle);
    }
    if (primaryTab === "售电公司分时电量") {
      return buildGuangdongSaleCompanyPage(bundle);
    }
    if (primaryTab === "用电企业分时电量") {
      return buildGuangdongEnterprisePage(bundle);
    }
    if (primaryTab === "节点电价") {
      return buildGuangdongNodePricePage(bundle);
    }
    if (primaryTab === "日前申报") {
      return buildGuangdongDeclarationPage(bundle);
    }

    return null;
  }

  function getUnitStatusTone(text) {
    if (text === "运行") {
      return "success";
    }
    if (text === "停机") {
      return "danger";
    }
    if (text === "检修") {
      return "danger";
    }
    if (text === "备用") {
      return "warning";
    }
    if (text === "异常") {
      return "danger";
    }
    if (text === "受限运行") {
      return "processing";
    }
    return "default";
  }

  function getUnitStatusCellText(value) {
    if (value && typeof value === "object" && value.text !== undefined) {
      return String(value.text || "");
    }
    if (value === "运行" || value === "停机") {
      return value;
    }
    return Number(value || 0) > 0 ? "运行" : "停机";
  }

  function getUnitStatusSummaryText(row, quarterColumns) {
    var hasRunning = (quarterColumns || []).some(function hasRunningStatus(column) {
      return getUnitStatusCellText(row[column.key]) === "运行";
    });
    return hasRunning ? "运行" : "停机";
  }

  function buildUnitStatusDisplayRows(unitRows, quarterColumns) {
    return (unitRows || []).map(function mapRow(row) {
      var summaryText = getUnitStatusSummaryText(row, quarterColumns);
      var nextRow = {
        runDate: row.runDate || row.date || "",
        unitName: row.unitName,
        operatingStatus: createBadgeCell(summaryText, getUnitStatusTone(summaryText), summaryText),
      };

      (quarterColumns || []).forEach(function eachColumn(column) {
        var statusText = getUnitStatusCellText(row[column.key]);
        nextRow[column.key] = createBadgeCell(statusText, getUnitStatusTone(statusText), statusText);
      });

      return nextRow;
    });
  }

  function getPlanStatusTone(text) {
    if (text === "执行中") {
      return "processing";
    }
    if (text === "待开始") {
      return "warning";
    }
    if (text === "已批复") {
      return "success";
    }
    return "default";
  }

  function buildUnavailableLoadInfoSubTabPage(tradeCenterKey, bundle, secondaryTab) {
    return {
      title: secondaryTab || "",
      description: "",
      updateTime: bundle.dataUpdatedAt || "",
      publishTime: bundle.dataPublishTime || "",
      dataSource: TRADE_CENTER_NAMES[tradeCenterKey] || "",
      hasDataSource: false,
      viewType: "empty",
      filters: {
        tradeCenter: tradeCenterKey,
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: secondaryTab || "",
      },
      emptyText: (TRADE_CENTER_NAMES[tradeCenterKey] || "当前交易中心") + "暂未接入" + (secondaryTab || "该") + "数据源。",
    };
  }

  function buildHunanLoadInfoPage(bundle) {
    var generationForecastRows = buildQuarterRowsFromModule(bundle, "发电总出力预测");
    var hunanRenewableForecastRows = buildQuarterRowsFromModule(bundle, "新能源总出力预测（日）");
    var hunanRenewableActualRows = buildQuarterRowsFromModule(bundle, "新能源总出力");
    var hunanWindForecastRows = buildScaledDerivedQuarterRows(hunanRenewableForecastRows, {
      scale: 0.58,
      pattern: [0, 16, -10, 8],
      source: "湖南风电发电有功电力预测",
      updatedAt: bundle.dataUpdatedAt || "",
    });
    var hunanWindActualRows = buildScaledDerivedQuarterRows(hunanRenewableActualRows, {
      scale: 0.57,
      pattern: [0, -14, 9, -7],
      source: "湖南风电发电有功电力实绩",
      updatedAt: bundle.dataUpdatedAt || "",
    });
    var hunanSolarForecastRows = buildScaledDerivedQuarterRows(hunanRenewableForecastRows, {
      scale: 0.42,
      pattern: [0, -16, 10, -8],
      source: "湖南光伏发电有功电力预测",
      updatedAt: bundle.dataUpdatedAt || "",
    });
    var hunanSolarActualRows = buildScaledDerivedQuarterRows(hunanRenewableActualRows, {
      scale: 0.43,
      pattern: [0, 14, -9, 7],
      source: "湖南光伏发电有功电力实绩",
      updatedAt: bundle.dataUpdatedAt || "",
    });
    return createSingleMetricLoadPage({
      title: "负荷信息",
      description: "湖南交易中心负荷信息页按单指标切换展示预测、实际与分时明细。",
      updateTime: bundle.dataUpdatedAt || "",
      statusSource: "湖南电力交易中心负荷信息",
      dataSource: "湖南电力交易中心负荷信息",
      filters: {
        tradeCenter: "hunan",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "负荷信息",
      },
      chartTitle: "负荷信息趋势图",
      sidebarGroups: [
        { label: "负荷信息", items: [
          { id: "hn-system-load", label: "系统负荷" },
          { id: "hn-generation-output", label: "发电总出力" },
          { id: "hn-nonmarket-output", label: "非市场组总出力" },
          {
            id: "hn-renewable-output",
            label: "新能源总出力",
            children: [
              { id: "hn-wind-active-power", label: "风电发电有功电力" },
              { id: "hn-solar-active-power", label: "光伏发电有功电力" },
            ],
          },
          { id: "hn-hydro-output", label: "水电（含抽蓄）总出力" },
        ] },
      ],
      defaultMetricId: "hn-system-load",
      metrics: {
        "hn-system-load": createSingleMetricLoadMetric(
          "hn-system-load",
          "系统负荷",
          buildQuarterRowsFromModule(bundle, "系统负荷预测（日）"),
          buildQuarterRowsFromModule(bundle, "实际负荷"),
        ),
        "hn-generation-output": createSingleMetricLoadMetric(
          "hn-generation-output",
          "发电总出力",
          generationForecastRows,
          buildDerivedQuarterRows(generationForecastRows, {
            baseOffset: -120,
            pattern: [-90, 66, -34, 92],
            source: "湖南发电总出力实绩",
            updatedAt: bundle.dataUpdatedAt || "",
          }),
        ),
        "hn-nonmarket-output": createSingleMetricLoadMetric(
          "hn-nonmarket-output",
          "非市场组总出力",
          buildQuarterRowsFromModule(bundle, "非市场机组总出力预测"),
          buildQuarterRowsFromModule(bundle, "非市场机组总出力"),
        ),
        "hn-renewable-output": createSingleMetricLoadMetric(
          "hn-renewable-output",
          "新能源总出力",
          hunanRenewableForecastRows,
          hunanRenewableActualRows,
        ),
        "hn-wind-active-power": createSingleMetricLoadMetric(
          "hn-wind-active-power",
          "风电发电有功电力",
          hunanWindForecastRows,
          hunanWindActualRows,
        ),
        "hn-solar-active-power": createSingleMetricLoadMetric(
          "hn-solar-active-power",
          "光伏发电有功电力",
          hunanSolarForecastRows,
          hunanSolarActualRows,
        ),
        "hn-hydro-output": createSingleMetricLoadMetric(
          "hn-hydro-output",
          "水电（含抽蓄）总出力",
          buildQuarterRowsFromModule(bundle, "水电（含抽蓄）总出力预测（日）"),
          buildQuarterRowsFromModule(bundle, "水电（含抽蓄）总出力"),
        ),
      },
      tableMinWidth: 920,
      emptyText: "当前日期暂无湖南负荷信息 mock 数据。",
    });
  }

  function buildHunanTieLinePage(bundle) {
    return createSingleMetricLoadPage({
      title: "省间联络",
      description: "湖南交易中心省间联络线输电数据。",
      updateTime: bundle.dataUpdatedAt || "",
      statusSource: "湖南电力交易中心省间联络",
      dataSource: "湖南电力交易中心省间联络",
      filters: {
        tradeCenter: "hunan",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "省间联络",
      },
      chartTitle: "省间联络趋势图",
      sidebarGroups: [
        {
          label: "省间联络",
          items: [
            {
              id: "hn-tieline-output",
              label: "省间联络线输电",
              children: [
                { id: "hn-tieline-zhongheng-dayahead", label: "中衡直流（日前）" },
                { id: "hn-tieline-main-grid-to-hunan-dayahead", label: "主网送湘（日前）" },
                { id: "hn-tieline-qishao-dayahead", label: "祁韶直流（日前）" },
              ],
            },
          ],
        },
      ],
      defaultMetricId: "hn-tieline-zhongheng-dayahead",
      metrics: {
        "hn-tieline-output": createSingleMetricLoadMetric(
          "hn-tieline-output",
          "省间联络线输电",
          buildQuarterRowsFromModule(bundle, "省间联络线输电曲线预测"),
          buildQuarterRowsFromModule(bundle, "省间联络线输电情况"),
        ),
        "hn-tieline-zhongheng-dayahead": createSingleMetricLoadMetric(
          "hn-tieline-zhongheng-dayahead",
          "中衡直流（日前）",
          buildQuarterRowsFromModule(bundle, "中衡直流（日前）预测"),
          buildQuarterRowsFromModule(bundle, "中衡直流（日前）实绩"),
        ),
        "hn-tieline-main-grid-to-hunan-dayahead": createSingleMetricLoadMetric(
          "hn-tieline-main-grid-to-hunan-dayahead",
          "主网送湘（日前）",
          buildQuarterRowsFromModule(bundle, "主网送湘（日前）预测"),
          buildQuarterRowsFromModule(bundle, "主网送湘（日前）实绩"),
        ),
        "hn-tieline-qishao-dayahead": createSingleMetricLoadMetric(
          "hn-tieline-qishao-dayahead",
          "祁韶直流（日前）",
          buildQuarterRowsFromModule(bundle, "祁韶直流（日前）预测"),
          buildQuarterRowsFromModule(bundle, "祁韶直流（日前）实绩"),
        ),
      },
      tableMinWidth: 920,
      emptyText: "当前日期暂无湖南省间联络 mock 数据。",
    });
  }

  function buildHunanThermalBiddingSpacePage(bundle) {
    return createSingleMetricInfoSubPage({
      title: "火电竞价空间",
      description: "湖南交易中心火电竞价空间数据。",
      updateTime: bundle.dataUpdatedAt || "",
      statusSource: "湖南电力交易中心火电竞价空间",
      dataSource: "湖南电力交易中心火电竞价空间",
      tradeCenter: "hunan",
      secondaryTab: "火电竞价空间",
      metric: createThermalBiddingSpaceMetric("hn-thermal-bidding-space", {
        systemLoadForecastRows: buildQuarterRowsFromModule(bundle, "系统负荷预测（日）"),
        systemLoadActualRows: buildQuarterRowsFromModule(bundle, "实际负荷"),
        renewableForecastRows: buildQuarterRowsFromModule(bundle, "新能源总出力预测（日）"),
        renewableActualRows: buildQuarterRowsFromModule(bundle, "新能源总出力"),
        hydroForecastRows: buildQuarterRowsFromModule(bundle, "水电（含抽蓄）总出力预测（日）"),
        hydroActualRows: buildQuarterRowsFromModule(bundle, "水电（含抽蓄）总出力"),
        tieLineForecastRows: buildQuarterRowsFromModule(bundle, "省间联络线输电曲线预测"),
        tieLineActualRows: buildQuarterRowsFromModule(bundle, "省间联络线输电情况"),
      }),
      tableMinWidth: 2300,
      emptyText: "当前日期暂无湖南火电竞价空间 mock 数据。",
    });
  }

  function buildHunanLoadDetailPage(bundle) {
    return buildTreeComparePage({
      bundle: bundle,
      title: "负荷详情",
      description: "湖南交易中心供需运行全字段对比统一 mock 结构。",
      dataSource: "湖南电力交易中心负荷详情",
      filters: {
        tradeCenter: "hunan",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "负荷详情",
      },
      chartTitle: "供需运行多曲线对比",
      chartUnit: "MW",
      metricGroups: [
        {
          id: "hn-detail-system-load",
          label: "系统负荷",
          items: [
            { id: "hn-detail-system-load-forecast", groupId: "hn-detail-system-load", label: "系统负荷预测（日）", role: "forecast", moduleName: "系统负荷预测（日）", valueKey: "systemLoadForecast", color: "#5B8FF9", dasharray: "6 4" },
            { id: "hn-detail-system-load-actual", groupId: "hn-detail-system-load", label: "实际负荷", role: "actual", moduleName: "实际负荷", valueKey: "systemLoadActual", color: "#2FCB8F" },
          ],
        },
        {
          id: "hn-detail-generation",
          label: "发电出力",
          items: [
            { id: "hn-detail-generation-forecast", groupId: "hn-detail-generation", label: "发电总出力预测", role: "forecast", datasetKey: "infoGenerationOutput", sourceField: "forecastValue", valueKey: "generationOutputForecast", color: "#3D76DD", dasharray: "6 4" },
            { id: "hn-detail-generation-actual", groupId: "hn-detail-generation", label: "发电总出力", role: "actual", datasetKey: "infoGenerationOutput", sourceField: "actualValue", valueKey: "generationOutputActual", color: "#2D5BBA" },
            { id: "hn-detail-nonmarket-forecast", groupId: "hn-detail-generation", label: "非市场机组总出力预测", role: "forecast", moduleName: "非市场机组总出力预测", valueKey: "nonMarketOutputForecast", color: "#36B37E", dasharray: "6 4" },
            { id: "hn-detail-nonmarket-actual", groupId: "hn-detail-generation", label: "非市场机组总出力", role: "actual", moduleName: "非市场机组总出力", valueKey: "nonMarketOutputActual", color: "#1F9D6B" },
          ],
        },
        {
          id: "hn-detail-renewable",
          label: "新能源出力",
          items: [
            { id: "hn-detail-renewable-forecast", groupId: "hn-detail-renewable", label: "新能源总出力预测（日）", role: "forecast", moduleName: "新能源总出力预测（日）", valueKey: "renewableOutputForecast", color: "#FF9D4D", dasharray: "6 4" },
            { id: "hn-detail-renewable-actual", groupId: "hn-detail-renewable", label: "新能源总出力", role: "actual", moduleName: "新能源总出力", valueKey: "renewableOutputActual", color: "#F56C42" },
            { id: "hn-detail-wind-actual", groupId: "hn-detail-renewable", label: "风电实际出力", role: "actual", valueKey: "windOutputActual", color: "#13C2C2" },
            { id: "hn-detail-solar-actual", groupId: "hn-detail-renewable", label: "光伏实际出力", role: "actual", valueKey: "solarOutputActual", color: "#FAAD14" },
          ],
        },
        {
          id: "hn-detail-hydro",
          label: "水电出力",
          items: [
            { id: "hn-detail-hydro-forecast", groupId: "hn-detail-hydro", label: "水电（含抽蓄）总出力预测（日）", role: "forecast", moduleName: "水电（含抽蓄）总出力预测（日）", valueKey: "hydroOutputForecast", color: "#8B6FF5", dasharray: "6 4" },
            { id: "hn-detail-hydro-actual", groupId: "hn-detail-hydro", label: "水电实际出力", role: "actual", moduleName: "水电（含抽蓄）总出力", valueKey: "hydroOutputActual", color: "#6D4DE3" },
          ],
        },
        {
          id: "hn-detail-tieline",
          label: "省间联络线",
          items: [
            { id: "hn-detail-tieline-forecast", groupId: "hn-detail-tieline", label: "省间联络线输电曲线预测", role: "forecast", moduleName: "省间联络线输电曲线预测", valueKey: "tieLineForecast", color: "#5E6C84", dasharray: "6 4" },
            { id: "hn-detail-tieline-actual", groupId: "hn-detail-tieline", label: "省间联络线输电情况", role: "actual", moduleName: "省间联络线输电情况", valueKey: "tieLineActual", color: "#3F4C63" },
          ],
        },
      ],
      defaultVisibleSeriesIds: [
        "hn-detail-system-load-forecast",
        "hn-detail-system-load-actual",
        "hn-detail-renewable-forecast",
        "hn-detail-renewable-actual",
        "hn-detail-tieline-forecast",
        "hn-detail-tieline-actual",
      ],
      transformRows: function transformRows(rows) {
        return rows.map(function mapRow(row) {
          var quarterHour = parseQuarterHour(row.time);
          var daylight = Math.max(0, Math.sin(((quarterHour - 6) / 12.5) * Math.PI));
          var solarRatio = quarterHour < 6 || quarterHour > 18.5 ? 0.12 : Math.min(0.48, 0.18 + daylight * 0.3);
          row.windOutputActual =
            typeof row.renewableOutputActual === "number"
              ? roundNumber(row.renewableOutputActual * (1 - solarRatio))
              : null;
          row.solarOutputActual =
            typeof row.renewableOutputActual === "number" && typeof row.windOutputActual === "number"
              ? roundNumber(row.renewableOutputActual - row.windOutputActual)
              : null;
          row.systemLoadDiff = typeof row.systemLoadActual === "number" && typeof row.systemLoadForecast === "number" ? roundNumber(row.systemLoadActual - row.systemLoadForecast) : null;
          row.generationOutputDiff = typeof row.generationOutputActual === "number" && typeof row.generationOutputForecast === "number" ? roundNumber(row.generationOutputActual - row.generationOutputForecast) : null;
          row.nonMarketOutputDiff = typeof row.nonMarketOutputActual === "number" && typeof row.nonMarketOutputForecast === "number" ? roundNumber(row.nonMarketOutputActual - row.nonMarketOutputForecast) : null;
          row.renewableOutputDiff = typeof row.renewableOutputActual === "number" && typeof row.renewableOutputForecast === "number" ? roundNumber(row.renewableOutputActual - row.renewableOutputForecast) : null;
          row.hydroOutputDiff = typeof row.hydroOutputActual === "number" && typeof row.hydroOutputForecast === "number" ? roundNumber(row.hydroOutputActual - row.hydroOutputForecast) : null;
          row.tieLineDiff = typeof row.tieLineActual === "number" && typeof row.tieLineForecast === "number" ? roundNumber(row.tieLineActual - row.tieLineForecast) : null;
          row.updatedAt = getLatestTextValue([
            row.systemLoadActualUpdatedAt,
            row.generationOutputActualUpdatedAt,
            row.nonMarketOutputActualUpdatedAt,
            row.renewableOutputActualUpdatedAt,
            row.hydroOutputActualUpdatedAt,
            row.tieLineActualUpdatedAt,
          ]);
          return row;
        });
      },
      tableColumns: [
        { key: "time", title: "时刻" },
        { key: "systemLoadForecast", title: "系统负荷预测（MW）" },
        { key: "systemLoadActual", title: "实际负荷（MW）" },
        { key: "systemLoadDiff", title: "系统负荷差值（MW）" },
        { key: "generationOutputForecast", title: "发电总出力预测（MW）" },
        { key: "generationOutputActual", title: "发电总出力（MW）" },
        { key: "generationOutputDiff", title: "发电总出力差值（MW）" },
        { key: "nonMarketOutputForecast", title: "非市场机组总出力预测（MW）" },
        { key: "nonMarketOutputActual", title: "非市场机组总出力（MW）" },
        { key: "nonMarketOutputDiff", title: "非市场机组总出力差值（MW）" },
        { key: "renewableOutputForecast", title: "新能源总出力预测（MW）" },
        { key: "windOutputActual", title: "风电实际出力（MW）" },
        { key: "solarOutputActual", title: "光伏实际出力（MW）" },
        { key: "renewableOutputActual", title: "新能源总出力（MW）" },
        { key: "renewableOutputDiff", title: "新能源总出力差值（MW）" },
        { key: "hydroOutputForecast", title: "水电总出力预测（MW）" },
        { key: "hydroOutputActual", title: "水电实际出力（MW）" },
        { key: "hydroOutputDiff", title: "水电总出力差值（MW）" },
        { key: "tieLineForecast", title: "省间联络线输电曲线预测（MW）" },
        { key: "tieLineActual", title: "省间联络线输电情况（MW）" },
        { key: "tieLineDiff", title: "省间联络线差值（MW）" },
        { key: "updatedAt", title: "更新时间" },
      ],
      tableMinWidth: 3120,
      emptyText: "当前日期暂无湖南负荷详情 mock 数据。",
    });
  }

  function buildHunanUnitStatusPage(bundle) {
    var dataset = getBundleDatasets(bundle).infoMaintenanceComposite || {};
    var unitTable = dataset.unitStatusTable || {};
    var quarterColumns = (unitTable.columns || []).filter(function filterColumn(column) {
      return /^\d{2}:\d{2}$/.test(column.key);
    });
    var shiftUnitStatusTimeTitle = Boolean(quarterColumns[0] && quarterColumns[0].key === "00:00");

    var unitRows = buildUnitStatusDisplayRows(unitTable.data || [], quarterColumns);

    return buildDisclosureTablePage({
      provinceCode: "hn",
      tabKey: "unitStatus",
      title: "机组状态",
      tableTitle: unitTable.title || "机组状态明细表",
      description: "湖南交易中心机组状态独立披露数据。",
      updateTime: dataset.updateTime || bundle.dataUpdatedAt || "",
      publishTime: dataset.publishTime || dataset.dataPublishTime || bundle.dataPublishTime || "",
      dataSource: dataset.dataSource || "湖南电力交易中心机组状态",
      updateSource: "8.1._【事后】机组状态 (1).xlsx",
      hasDataSource: dataset.hasDataSource === true,
      datePickerMode: "range",
      filters: {
        tradeCenter: "hunan",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "机组状态",
        date: (dataset.filters && dataset.filters.date) || "",
      },
      columns: [
        { key: "runDate", title: "日期" },
        { key: "unitName", title: "机组名称" },
        { key: "operatingStatus", title: "运行状态" },
      ]
        .concat(quarterColumns.map(function mapColumn(column) {
          return { key: column.key, title: formatUnitStatusTimeColumnTitle(column.key, shiftUnitStatusTimeTitle) };
        })),
      rows: unitRows,
      tableMinWidth: unitTable.minWidth || 8840,
      fileList: dataset.fileList || [],
      emptyText: "当前日期暂无湖南机组状态 mock 数据。",
    });
  }

  function buildHunanTransmissionMaintenancePlanPage(bundle) {
    var dataset = getBundleDatasets(bundle).infoMaintenanceComposite || {};
    var scheduleTable = dataset.extraTables && dataset.extraTables[0] ? dataset.extraTables[0] : {};
    var scheduleColumns =
      scheduleTable.columns && scheduleTable.columns.length
        ? scheduleTable.columns
        : [
            { key: "planDate", title: "检修日期" },
            { key: "equipmentType", title: "设备类型" },
            { key: "equipmentName", title: "设备名称" },
            { key: "stationName", title: "所属厂站" },
            { key: "startTime", title: "检修开始时间" },
            { key: "endTime", title: "检修结束时间" },
            { key: "impactCapacity", title: "影响容量（MW）" },
            { key: "updatedAt", title: "更新时间" },
          ];
    scheduleColumns = scheduleColumns.filter(function filterColumn(column) {
      return column.key !== "planStatus" && column.key !== "sequence" && column.key !== "updatedAt";
    });
    var scheduleRows = (scheduleTable.data || []).map(function mapRow(row) {
      var nextRow = cloneValue(row);
      delete nextRow.planStatus;
      return nextRow;
    });

    return buildDisclosureTablePage({
      provinceCode: "hn",
      tabKey: "transmissionMaintenancePlan",
      title: "发输变电设备检修计划",
      tableTitle: scheduleTable.title || "发输变电设备检修计划（日）",
      description: "湖南交易中心发输变电设备检修计划独立披露数据。",
      updateTime: dataset.updateTime || bundle.dataUpdatedAt || "",
      publishTime: dataset.publishTime || dataset.dataPublishTime || bundle.dataPublishTime || "",
      dataSource: dataset.dataSource || "湖南电力交易中心发输变电设备检修计划",
      updateSource: "发输变电设备检修计划-日 (1).xlsx",
      hasDataSource: dataset.hasDataSource === true,
      filters: {
        tradeCenter: "hunan",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "发输变电设备检修计划",
        date: (dataset.filters && dataset.filters.date) || "",
      },
      columns: scheduleColumns,
      rows: scheduleRows,
      tableMinWidth: 1420,
      datePickerMode: "range",
      fileList: dataset.fileList || [],
      emptyText: "当前日期暂无湖南发输变电设备检修计划 mock 数据。",
    });
  }

  function buildHunanMaintenancePage(bundle) {
    var dataset = getBundleDatasets(bundle).infoMaintenanceComposite || {};
    var unitTable = dataset.unitStatusTable || {};
    var maintenanceChart = dataset.maintenanceChart || {};

    return {
      title: "机组检修容量",
      description: "湖南交易中心机组检修容量统一 mock 结构。",
      updateTime: dataset.updateTime || bundle.dataUpdatedAt || "",
      publishTime: dataset.publishTime || dataset.dataPublishTime || bundle.dataPublishTime || "",
      dataSource: dataset.dataSource || "湖南电力交易中心机组检修容量",
      source: dataset.source || dataset.dataSource || "湖南电力交易中心机组检修容量",
      hasDataSource: dataset.hasDataSource === true,
      filters: {
        tradeCenter: "hunan",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "机组检修容量",
      },
      viewType: "maintenanceComposite",
      maintenanceChart: {
        title: maintenanceChart.title || "机组检修容量趋势图",
        labels: cloneValue(maintenanceChart.labels || []),
        unit: maintenanceChart.unit || "MW",
        series: cloneValue(maintenanceChart.series || []),
      },
      chartSeries: cloneValue(dataset.chartSeries || []),
      unitStatusTable: {
        title: unitTable.title || "机组检修容量明细表",
        columns: cloneValue(unitTable.columns || []),
        data: cloneValue(unitTable.data || []),
        minWidth: unitTable.minWidth || 1280,
      },
      extraTables: [],
      emptyText: "当前日期暂无湖南机组检修容量 mock 数据。",
    };
  }

  function buildHunanReservePage(bundle) {
    var dataset = getBundleDatasets(bundle).infoReserve || {};
    var rows = cloneValue(dataset.tableData || []);
    return {
      title: "备用信息",
      description: "湖南交易中心系统备用信息统一 mock 结构。",
      updateTime: dataset.updateTime || bundle.dataUpdatedAt || "",
      publishTime: dataset.publishTime || dataset.dataPublishTime || bundle.dataPublishTime || "",
      dataSource: dataset.dataSource || "湖南电力交易中心系统备用信息",
      source: dataset.source || dataset.dataSource || "湖南电力交易中心系统备用信息",
      hasDataSource: dataset.hasDataSource === true,
      filters: {
        tradeCenter: "hunan",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "备用信息",
      },
      viewType: "lineTable",
      chartTitle: "系统备用信息趋势图",
      chartUnit: "MW",
      labelKey: "time",
      seriesDefinitions: [
        { id: "hn-reserve-positive", label: "正备用", color: "#1677FF", valueKey: "positiveReserve" },
        { id: "hn-reserve-negative", label: "负备用", color: "#2FCB8F", valueKey: "negativeReserve" },
      ],
      chartSeries: cloneValue(dataset.chartSeries || []),
      tableColumns: cloneValue(
        dataset.tableColumns || [
          { key: "time", title: "时刻" },
          { key: "positiveReserve", title: "正备用（MW）" },
          { key: "negativeReserve", title: "负备用（MW）" },
        ],
      ),
      tableData: rows.map(function mapRow(row) {
        return {
          date: row.date,
          time: row.time,
          positiveReserve: row.positiveReserve,
          negativeReserve: row.negativeReserve,
          diffValue: typeof row.positiveReserve === "number" && typeof row.negativeReserve === "number" ? roundNumber(row.positiveReserve - row.negativeReserve) : null,
          source: row.source,
          updatedAt: row.updatedAt,
        };
      }),
      tableMinWidth: dataset.tableMinWidth || 1420,
      tooltipMode: "reserveDual",
      emptyText: "当前日期暂无湖南备用信息 mock 数据。",
    };
  }

  function buildShaanxiLoadInfoPage(bundle) {
    var shaanxiRenewableForecastRows = buildQuarterRowsFromModule(bundle, "新能源总出力预测（日）");
    var shaanxiRenewableActualRows = buildQuarterRowsFromModule(bundle, "新能源总出力");
    var shaanxiSolarForecastRows = buildScaledDerivedQuarterRows(shaanxiRenewableForecastRows, {
      scale: 0.46,
      pattern: [0, 15, -8, 7],
      source: "陕西光伏总出力预测",
      updatedAt: bundle.dataUpdatedAt || "",
    });
    var shaanxiSolarActualRows = buildScaledDerivedQuarterRows(shaanxiRenewableActualRows, {
      scale: 0.47,
      pattern: [0, -12, 8, -6],
      source: "陕西光伏总出力实绩",
      updatedAt: bundle.dataUpdatedAt || "",
    });
    var shaanxiWindForecastRows = buildScaledDerivedQuarterRows(shaanxiRenewableForecastRows, {
      scale: 0.54,
      pattern: [0, -15, 8, -7],
      source: "陕西风电总出力预测",
      updatedAt: bundle.dataUpdatedAt || "",
    });
    var shaanxiWindActualRows = buildScaledDerivedQuarterRows(shaanxiRenewableActualRows, {
      scale: 0.53,
      pattern: [0, 12, -8, 6],
      source: "陕西风电总出力实绩",
      updatedAt: bundle.dataUpdatedAt || "",
    });
    return createSingleMetricLoadPage({
      title: "负荷信息",
      description: "陕西交易中心负荷信息页按单指标切换展示预测、实际与分时明细。",
      updateTime: bundle.dataUpdatedAt || "",
      statusSource: "陕西电力交易中心负荷信息",
      dataSource: "陕西电力交易中心负荷信息",
      filters: {
        tradeCenter: "shaanxi",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "负荷信息",
      },
      chartTitle: "负荷信息趋势图",
      sidebarGroups: [
        { label: "负荷信息", items: [
          { id: "sx-system-load", label: "系统负荷" },
          { id: "sx-generation-output", label: "发电总出力" },
          { id: "sx-nonmarket-output", label: "非市场组总出力" },
          {
            id: "sx-renewable-output",
            label: "新能源总出力",
            children: [
              { id: "sx-solar-total-output", label: "光伏总出力" },
              { id: "sx-wind-total-output", label: "风电总出力" },
            ],
          },
          { id: "sx-hydro-output", label: "水电（含抽蓄）总出力" },
        ] },
      ],
      defaultMetricId: "sx-system-load",
      metrics: {
        "sx-system-load": createSingleMetricLoadMetric(
          "sx-system-load",
          "系统负荷",
          buildQuarterRowsFromModule(bundle, "系统负荷预测（日）"),
          buildQuarterRowsFromModule(bundle, "实际负荷"),
        ),
        "sx-generation-output": createSingleMetricLoadMetric(
          "sx-generation-output",
          "发电总出力",
          buildQuarterRowsFromModule(bundle, "发电总出力预测"),
          buildQuarterRowsFromModule(bundle, "发电总出力"),
        ),
        "sx-nonmarket-output": createSingleMetricLoadMetric(
          "sx-nonmarket-output",
          "非市场组总出力",
          buildQuarterRowsFromModule(bundle, "非市场机组总出力预测"),
          buildQuarterRowsFromModule(bundle, "非市场机组总出力"),
        ),
        "sx-renewable-output": createSingleMetricLoadMetric(
          "sx-renewable-output",
          "新能源总出力",
          shaanxiRenewableForecastRows,
          shaanxiRenewableActualRows,
        ),
        "sx-solar-total-output": createSingleMetricLoadMetric(
          "sx-solar-total-output",
          "光伏总出力",
          shaanxiSolarForecastRows,
          shaanxiSolarActualRows,
        ),
        "sx-wind-total-output": createSingleMetricLoadMetric(
          "sx-wind-total-output",
          "风电总出力",
          shaanxiWindForecastRows,
          shaanxiWindActualRows,
        ),
        "sx-hydro-output": createSingleMetricLoadMetric(
          "sx-hydro-output",
          "水电（含抽蓄）总出力",
          buildQuarterRowsFromModule(bundle, "水电（含抽蓄）总出力预测（日）"),
          buildQuarterRowsFromModule(bundle, "水电（含抽蓄）出力"),
        ),
      },
      tableMinWidth: 920,
      emptyText: "当前日期暂无陕西负荷信息 mock 数据。",
    });
  }

  function buildShaanxiTieLinePage(bundle) {
    return createSingleMetricInfoSubPage({
      title: "省间联络",
      description: "陕西交易中心省间联络线输电数据。",
      updateTime: bundle.dataUpdatedAt || "",
      statusSource: "陕西电力交易中心省间联络",
      dataSource: "陕西电力交易中心省间联络",
      tradeCenter: "shaanxi",
      secondaryTab: "省间联络",
      metric: createSingleMetricLoadMetric(
        "sx-tieline-output",
        "省间联络线输电",
        buildQuarterRowsFromModule(bundle, "省间联络线输电曲线预测"),
        buildQuarterRowsFromModule(bundle, "省间联络线输电情况"),
      ),
      emptyText: "当前日期暂无陕西省间联络 mock 数据。",
    });
  }

  function buildShaanxiThermalBiddingSpacePage(bundle) {
    return createSingleMetricInfoSubPage({
      title: "火电竞价空间",
      description: "陕西交易中心火电竞价空间数据。",
      updateTime: bundle.dataUpdatedAt || "",
      statusSource: "陕西电力交易中心火电竞价空间",
      dataSource: "陕西电力交易中心火电竞价空间",
      tradeCenter: "shaanxi",
      secondaryTab: "火电竞价空间",
      metric: createThermalBiddingSpaceMetric("sx-thermal-bidding-space", {
        systemLoadForecastRows: buildQuarterRowsFromModule(bundle, "系统负荷预测（日）"),
        systemLoadActualRows: buildQuarterRowsFromModule(bundle, "实际负荷"),
        renewableForecastRows: buildQuarterRowsFromModule(bundle, "新能源总出力预测（日）"),
        renewableActualRows: buildQuarterRowsFromModule(bundle, "新能源总出力"),
        hydroForecastRows: buildQuarterRowsFromModule(bundle, "水电（含抽蓄）总出力预测（日）"),
        hydroActualRows: buildQuarterRowsFromModule(bundle, "水电（含抽蓄）出力"),
        tieLineForecastRows: buildQuarterRowsFromModule(bundle, "省间联络线输电曲线预测"),
        tieLineActualRows: buildQuarterRowsFromModule(bundle, "省间联络线输电情况"),
        nonMarketForecastRows: buildQuarterRowsFromModule(bundle, "非市场机组总出力预测"),
        nonMarketActualRows: buildQuarterRowsFromModule(bundle, "非市场机组总出力"),
        includeNonMarketOutput: true,
      }),
      tableMinWidth: 2700,
      emptyText: "当前日期暂无陕西火电竞价空间 mock 数据。",
    });
  }

  function buildShaanxiLoadDetailPage(bundle) {
    return buildTreeComparePage({
      bundle: bundle,
      title: "负荷详情",
      description: "陕西交易中心供需运行全字段对比统一 mock 结构。",
      dataSource: "陕西电力交易中心负荷详情",
      filters: {
        tradeCenter: "shaanxi",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "负荷详情",
      },
      chartTitle: "供需运行多曲线对比",
      chartUnit: "MW",
      metricGroups: [
        {
          id: "sx-detail-system-load",
          label: "系统负荷",
          items: [
            { id: "sx-detail-system-load-forecast", groupId: "sx-detail-system-load", label: "系统负荷预测（日）", role: "forecast", moduleName: "系统负荷预测（日）", valueKey: "systemLoadForecast", color: "#5B8FF9", dasharray: "6 4" },
            { id: "sx-detail-system-load-actual", groupId: "sx-detail-system-load", label: "实际负荷", role: "actual", moduleName: "实际负荷", valueKey: "systemLoadActual", color: "#2FCB8F" },
          ],
        },
        {
          id: "sx-detail-generation",
          label: "发电出力",
          items: [
            { id: "sx-detail-generation-actual", groupId: "sx-detail-generation", label: "发电总出力", role: "actual", moduleName: "发电总出力", valueKey: "generationOutputActual", color: "#2D5BBA" },
            { id: "sx-detail-generation-forecast", groupId: "sx-detail-generation", label: "发电总出力预测", role: "forecast", moduleName: "发电总出力预测", valueKey: "generationOutputForecast", color: "#3D76DD", dasharray: "6 4" },
            { id: "sx-detail-nonmarket-actual", groupId: "sx-detail-generation", label: "非市场机组总出力", role: "actual", moduleName: "非市场机组总出力", valueKey: "nonMarketOutputActual", color: "#1F9D6B" },
            { id: "sx-detail-nonmarket-forecast", groupId: "sx-detail-generation", label: "非市场机组总出力预测", role: "forecast", moduleName: "非市场机组总出力预测", valueKey: "nonMarketOutputForecast", color: "#36B37E", dasharray: "6 4" },
          ],
        },
        {
          id: "sx-detail-renewable",
          label: "新能源出力",
          items: [
            { id: "sx-detail-renewable-actual", groupId: "sx-detail-renewable", label: "新能源总出力", role: "actual", moduleName: "新能源总出力", valueKey: "renewableOutputActual", color: "#F56C42" },
            { id: "sx-detail-renewable-forecast", groupId: "sx-detail-renewable", label: "新能源总出力预测（日）", role: "forecast", moduleName: "新能源总出力预测（日）", valueKey: "renewableOutputForecast", color: "#FF9D4D", dasharray: "6 4" },
          ],
        },
        {
          id: "sx-detail-hydro",
          label: "水电出力",
          items: [
            { id: "sx-detail-hydro-actual", groupId: "sx-detail-hydro", label: "水电（含抽蓄）出力", role: "actual", moduleName: "水电（含抽蓄）出力", valueKey: "hydroOutputActual", color: "#6D4DE3" },
            { id: "sx-detail-hydro-forecast", groupId: "sx-detail-hydro", label: "水电（含抽蓄）总出力预测（日）", role: "forecast", moduleName: "水电（含抽蓄）总出力预测（日）", valueKey: "hydroOutputForecast", color: "#8B6FF5", dasharray: "6 4" },
          ],
        },
        {
          id: "sx-detail-tieline",
          label: "省间联络线",
          items: [
            { id: "sx-detail-tieline-actual", groupId: "sx-detail-tieline", label: "省间联络线输电情况", role: "actual", moduleName: "省间联络线输电情况", valueKey: "tieLineActual", color: "#3F4C63" },
            { id: "sx-detail-tieline-forecast", groupId: "sx-detail-tieline", label: "省间联络线输电曲线预测", role: "forecast", moduleName: "省间联络线输电曲线预测", valueKey: "tieLineForecast", color: "#5E6C84", dasharray: "6 4" },
          ],
        },
      ],
      defaultVisibleSeriesIds: [
        "sx-detail-system-load-forecast",
        "sx-detail-system-load-actual",
        "sx-detail-generation-actual",
        "sx-detail-generation-forecast",
        "sx-detail-tieline-actual",
        "sx-detail-tieline-forecast",
      ],
      transformRows: function transformRows(rows) {
        return rows.map(function mapRow(row) {
          row.systemLoadDiff = typeof row.systemLoadActual === "number" && typeof row.systemLoadForecast === "number" ? roundNumber(row.systemLoadActual - row.systemLoadForecast) : null;
          row.generationOutputDiff = typeof row.generationOutputActual === "number" && typeof row.generationOutputForecast === "number" ? roundNumber(row.generationOutputActual - row.generationOutputForecast) : null;
          row.nonMarketOutputDiff = typeof row.nonMarketOutputActual === "number" && typeof row.nonMarketOutputForecast === "number" ? roundNumber(row.nonMarketOutputActual - row.nonMarketOutputForecast) : null;
          row.renewableOutputDiff = typeof row.renewableOutputActual === "number" && typeof row.renewableOutputForecast === "number" ? roundNumber(row.renewableOutputActual - row.renewableOutputForecast) : null;
          row.hydroOutputDiff = typeof row.hydroOutputActual === "number" && typeof row.hydroOutputForecast === "number" ? roundNumber(row.hydroOutputActual - row.hydroOutputForecast) : null;
          row.tieLineDiff = typeof row.tieLineActual === "number" && typeof row.tieLineForecast === "number" ? roundNumber(row.tieLineActual - row.tieLineForecast) : null;
          row.updatedAt = getLatestTextValue([
            row.systemLoadActualUpdatedAt,
            row.generationOutputActualUpdatedAt,
            row.nonMarketOutputActualUpdatedAt,
            row.renewableOutputActualUpdatedAt,
            row.hydroOutputActualUpdatedAt,
            row.tieLineActualUpdatedAt,
          ]);
          return row;
        });
      },
      tableColumns: [
        { key: "time", title: "时刻" },
        { key: "systemLoadForecast", title: "系统负荷预测（MW）" },
        { key: "systemLoadActual", title: "实际负荷（MW）" },
        { key: "systemLoadDiff", title: "系统负荷差值（MW）" },
        { key: "generationOutputActual", title: "发电总出力（MW）" },
        { key: "generationOutputForecast", title: "发电总出力预测（MW）" },
        { key: "generationOutputDiff", title: "发电总出力差值（MW）" },
        { key: "nonMarketOutputActual", title: "非市场机组总出力（MW）" },
        { key: "nonMarketOutputForecast", title: "非市场机组总出力预测（MW）" },
        { key: "nonMarketOutputDiff", title: "非市场机组总出力差值（MW）" },
        { key: "renewableOutputActual", title: "新能源总出力（MW）" },
        { key: "renewableOutputForecast", title: "新能源总出力预测（日）（MW）" },
        { key: "renewableOutputDiff", title: "新能源总出力差值（MW）" },
        { key: "hydroOutputActual", title: "水电（含抽蓄）出力（MW）" },
        { key: "hydroOutputForecast", title: "水电（含抽蓄）总出力预测（日）（MW）" },
        { key: "hydroOutputDiff", title: "水电出力差值（MW）" },
        { key: "tieLineActual", title: "省间联络线输电情况（MW）" },
        { key: "tieLineForecast", title: "省间联络线输电曲线预测（MW）" },
        { key: "tieLineDiff", title: "省间联络线差值（MW）" },
        { key: "updatedAt", title: "更新时间" },
      ],
      tableMinWidth: 2880,
      emptyText: "当前日期暂无陕西负荷详情 mock 数据。",
    });
  }

  function buildShaanxiUnitStatusPage(bundle) {
    var dataset = getBundleDatasets(bundle).infoUnitStatus || {};
    var unitTable = dataset.unitStatusTable || {};
    var quarterColumns = (unitTable.columns || []).filter(function filterColumn(column) {
      return /^\d{2}:\d{2}$/.test(column.key);
    });
    var shiftUnitStatusTimeTitle = Boolean(quarterColumns[0] && quarterColumns[0].key === "00:00");
    var unitRows = buildUnitStatusDisplayRows(unitTable.data || [], quarterColumns);

    return buildDisclosureTablePage({
      provinceCode: "sx",
      tabKey: "unitStatus",
      title: "机组状态",
      tableTitle: unitTable.title || "机组状态明细表",
      description: "陕西交易中心机组状态独立披露数据。",
      updateTime: dataset.updateTime || bundle.dataUpdatedAt || "",
      publishTime: dataset.publishTime || dataset.dataPublishTime || bundle.dataPublishTime || "",
      dataSource: dataset.dataSource || "陕西电力交易中心机组状态",
      updateSource: "陕西电力交易中心机组状态 mock",
      hasDataSource: dataset.hasDataSource !== false,
      datePickerMode: "range",
      filters: {
        tradeCenter: "shaanxi",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "机组状态",
        date: (dataset.filters && dataset.filters.date) || "",
      },
      columns: [
        { key: "runDate", title: "日期" },
        { key: "unitName", title: "机组名称" },
        { key: "operatingStatus", title: "运行状态" },
      ]
        .concat(quarterColumns.map(function mapColumn(column) {
          return { key: column.key, title: formatUnitStatusTimeColumnTitle(column.key, shiftUnitStatusTimeTitle) };
        })),
      rows: unitRows,
      tableMinWidth: unitTable.minWidth || 8840,
      fileList: dataset.fileList || [],
      emptyText: "当前日期暂无陕西机组状态 mock 数据。",
    });
  }

  function buildShaanxiMaintenancePage(bundle) {
    var dataset = getBundleDatasets(bundle).infoUnitStatus || {};
    var unitTable = dataset.unitStatusTable || {};
    var maintenanceChart = dataset.maintenanceChart || {};

    return {
      title: "机组检修容量",
      description: "陕西交易中心机组检修容量统一 mock 结构。",
      updateTime: dataset.updateTime || bundle.dataUpdatedAt || "",
      dataSource: dataset.dataSource || "陕西电力交易中心机组检修容量",
      filters: {
        tradeCenter: "shaanxi",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "机组检修容量",
      },
      viewType: "maintenanceComposite",
      maintenanceChart: {
        title: maintenanceChart.title || "机组检修容量趋势图",
        labels: cloneValue(maintenanceChart.labels || []),
        unit: maintenanceChart.unit || "MW",
        series: cloneValue(maintenanceChart.series || []),
      },
      unitStatusTable: {
        title: unitTable.title || "机组检修容量明细表",
        columns: cloneValue(unitTable.columns || []),
        data: cloneValue(unitTable.data || []),
        minWidth: unitTable.minWidth || 1280,
      },
      extraTables: [],
      emptyText: "当前日期暂无陕西机组检修容量 mock 数据。",
    };
  }

  function buildShaanxiReservePage(bundle) {
    var dataset = getBundleDatasets(bundle).infoReserve || {};
    var rows = cloneValue(dataset.tableData || []);
    return {
      title: "备用信息",
      description: "陕西交易中心系统备用信息统一 mock 结构。",
      updateTime: dataset.updateTime || bundle.dataUpdatedAt || "",
      dataSource: dataset.dataSource || "陕西电力交易中心系统备用信息",
      filters: {
        tradeCenter: "shaanxi",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "备用信息",
      },
      viewType: "lineTable",
      chartTitle: "系统备用容量趋势图",
      chartUnit: "MW",
      labelKey: "time",
      seriesDefinitions: [
        { id: "sx-reserve-positive", label: "正备用（上备用）", color: "#1677FF", valueKey: "positiveReserve" },
        { id: "sx-reserve-negative", label: "负备用（下备用）", color: "#2FCB8F", valueKey: "negativeReserve" },
      ],
      tableColumns: [
        { key: "date", title: "日期" },
        { key: "time", title: "时刻" },
        { key: "positiveReserve", title: "正备用 / 上备用（MW）" },
        { key: "negativeReserve", title: "负备用 / 下备用（MW）" },
        { key: "diffValue", title: "正负备用差值（MW）" },
        { key: "source", title: "数据来源" },
        { key: "updatedAt", title: "更新时间" },
      ],
      tableData: rows.map(function mapRow(row) {
        return {
          date: row.date,
          time: row.time,
          positiveReserve: row.positiveReserve,
          negativeReserve: row.negativeReserve,
          diffValue: typeof row.positiveReserve === "number" && typeof row.negativeReserve === "number" ? roundNumber(row.positiveReserve - row.negativeReserve) : null,
          source: row.source,
          updatedAt: row.updatedAt,
        };
      }),
      tableMinWidth: 1480,
      tooltipMode: "reserveDual",
      emptyText: "当前日期暂无陕西备用信息 mock 数据。",
    };
  }

  function buildUnifiedLoadInfoPage(tradeCenterKey, bundle, secondaryTab) {
    if (tradeCenterKey === "hunan") {
      if (secondaryTab === "负荷详情") {
        return buildHunanLoadDetailPage(bundle);
      }
      if (secondaryTab === "机组检修容量") {
        return buildHunanMaintenancePage(bundle);
      }
      if (secondaryTab === "备用信息") {
        return buildHunanReservePage(bundle);
      }
      if (secondaryTab === "机组状态") {
        return buildHunanUnitStatusPage(bundle);
      }
      if (secondaryTab === "发输变电设备检修计划") {
        return buildHunanTransmissionMaintenancePlanPage(bundle);
      }
      if (secondaryTab === "省间联络") {
        return buildHunanTieLinePage(bundle);
      }
      if (secondaryTab === "火电竞价空间") {
        return buildHunanThermalBiddingSpacePage(bundle);
      }
      return buildHunanLoadInfoPage(bundle);
    }

    if (tradeCenterKey === "shaanxi") {
      if (secondaryTab === "负荷详情") {
        return buildShaanxiLoadDetailPage(bundle);
      }
      if (secondaryTab === "机组检修容量") {
        return buildShaanxiMaintenancePage(bundle);
      }
      if (secondaryTab === "备用信息") {
        return buildShaanxiReservePage(bundle);
      }
      if (secondaryTab === "机组状态") {
        return buildShaanxiUnitStatusPage(bundle);
      }
      if (secondaryTab === "发输变电设备检修计划") {
        return buildUnavailableLoadInfoSubTabPage("shaanxi", bundle, secondaryTab);
      }
      if (secondaryTab === "省间联络") {
        return buildShaanxiTieLinePage(bundle);
      }
      if (secondaryTab === "火电竞价空间") {
        return buildShaanxiThermalBiddingSpacePage(bundle);
      }
      return buildShaanxiLoadInfoPage(bundle);
    }

    return null;
  }

  function buildFallbackPageData(tradeCenterKey, bundle, pageType, primaryTab, secondaryTab) {
    if (pageType === "rollingData") {
      return buildGenericRollingPage(bundle, tradeCenterKey);
    }
    if (pageType === "retailRelation") {
      return buildGenericRetailPage(bundle, tradeCenterKey);
    }
    if (pageType === "settlement") {
      return buildGenericSettlementPage(bundle, tradeCenterKey, primaryTab);
    }
    if (tradeCenterKey === "guangdong" && pageType === "infoDisclosure") {
      return buildGuangdongInfoPage(bundle, primaryTab, secondaryTab);
    }
    return null;
  }

  function getPageBundle(tradeCenter, pageType) {
    var bundle = getTradeCenterBundle(tradeCenter);
    return (bundle && bundle[pageType]) || null;
  }

  function getMarketPageData(options) {
    var request = options;

    if (typeof options === "string") {
      request = {
        pageType: options,
        tradeCenter: arguments[1],
        primaryTab: arguments[2],
        secondaryTab: arguments[3],
      };
    }

    request = request || {};
    var tradeCenterKey = normalizeTradeCenterKey(request.tradeCenter);
    var bundle = getTradeCenterBundle(tradeCenterKey);
    var catalog = getTradeCenterMarketCatalog(tradeCenterKey);
    var resolvedData = null;

    if (
      request.pageType === "infoDisclosure" &&
      request.primaryTab === "负荷信息" &&
      request.secondaryTab === "负荷信息"
    ) {
      if (tradeCenterKey === "guangdong") {
        resolvedData = buildGuangdongLoadPage(bundle);
      } else {
        resolvedData = buildUnifiedLoadInfoPage(tradeCenterKey, bundle, "负荷信息");
      }
    }

    if (!resolvedData && request.pageType === "infoDisclosure" && tradeCenterKey !== "guangdong" && request.primaryTab === "负荷信息") {
      resolvedData = buildUnifiedLoadInfoPage(tradeCenterKey, bundle, request.secondaryTab || "负荷信息");
    }

    if (
      !resolvedData &&
      request.pageType === "infoDisclosure" &&
      request.primaryTab === "全省统一出清价" &&
      tradeCenterKey !== "guangdong"
    ) {
      resolvedData = resolveCatalogEntry(catalog, request.pageType, request.primaryTab, request.secondaryTab);
    }

    if (!resolvedData && request.pageType === "infoDisclosure" && request.primaryTab === "全省统一出清价") {
      resolvedData = buildUnifiedProvinceClearingPricePage(tradeCenterKey, bundle);
    }

    if (!resolvedData && request.pageType === "infoDisclosure" && request.primaryTab === "交易结果") {
      resolvedData = buildUnifiedTradingResultPage(tradeCenterKey, bundle, request);
    }

    if (!resolvedData && request.pageType === "infoDisclosure" && request.primaryTab === "交易结果") {
      resolvedData = resolveCatalogEntry(catalog, request.pageType, request.primaryTab, request.secondaryTab);
    }

    if (!resolvedData && request.pageType === "infoDisclosure" && request.primaryTab === "出清电量" && tradeCenterKey !== "guangdong") {
      resolvedData = buildUnifiedClearingEnergyPage(tradeCenterKey, bundle);
    }

    if (!resolvedData && request.pageType === "infoDisclosure" && request.primaryTab === "节点电价") {
      resolvedData = buildUnifiedNodePricePage(tradeCenterKey, bundle);
    }

    if (!resolvedData) {
      resolvedData = resolveCatalogEntry(catalog, request.pageType, request.primaryTab, request.secondaryTab);
    }

    if (!resolvedData) {
      resolvedData = buildFallbackPageData(
        tradeCenterKey,
        bundle,
        request.pageType,
        request.primaryTab,
        request.secondaryTab,
      );
    }

    return ensurePageData(resolvedData, {
      title: request.secondaryTab || request.primaryTab || request.pageType || "",
      description: "",
      updateTime: bundle.dataUpdatedAt || "",
      publishTime: bundle.dataPublishTime || "",
      dataSource: bundle.dataSource || TRADE_CENTER_NAMES[tradeCenterKey] || "",
      filters: {
        tradeCenter: tradeCenterKey,
        pageType: request.pageType || "",
        primaryTab: request.primaryTab || "",
        secondaryTab: request.secondaryTab || "",
      },
      emptyText: (TRADE_CENTER_NAMES[tradeCenterKey] || "当前交易中心") + "暂无对应 mock 数据。",
    });
  }

  global.BOSS_MARKET_PAGE_DATA = {
    tradeCenterNames: cloneValue(TRADE_CENTER_NAMES),
    getPageBundle: getPageBundle,
    getMarketPageData: getMarketPageData,
    createEmptyPageData: createEmptyPageData,
  };
  global.getMarketPageData = getMarketPageData;
})(window);
