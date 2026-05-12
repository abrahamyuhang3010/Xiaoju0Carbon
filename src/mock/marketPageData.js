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

  function createEmptyPageData(options) {
    return {
      title: options.title || "",
      description: options.description || "",
      updateTime: options.updateTime || "",
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
      return Number(row.totalFee || 0);
    });
    var daySeries = createSeries(
      "dailySettlementFee",
      "日清算总电费",
      rows.slice(0, 8).map(function mapRow(row) {
        return row.enterpriseName + " " + row.date.slice(5);
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
      tableColumns: [
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
    var metric = (info.metricSeries && info.metricSeries["dispatch-load"]) || {};
    var labels = info.quarterHours || [];
    var forecastSeries = createSeries("forecast", "统调负荷预测", labels, metric.forecast || [], "MW");
    var actualSeries = createSeries("actual", "统调负荷实际", labels, metric.actual || [], "MW");

    if (!labels.length) {
      return null;
    }

    return {
      title: "负荷信息",
      description: "广东交易中心统调负荷统一 mock 结构。",
      updateTime: info.statusText || bundle.dataUpdatedAt || "",
      dataSource: "广东电力交易中心负荷信息",
      filters: {
        tradeCenter: "guangdong",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "负荷信息",
      },
      summaryCards: buildSummaryCardsFromStats(actualSeries.stats, "MW", [{ label: "采样点", value: labels.length, unit: "个" }]),
      chartType: "line",
      chartUnit: "MW",
      chartSeries: [forecastSeries, actualSeries],
      tableColumns: [
        { key: "time", title: "时刻" },
        { key: "forecast", title: "预测值（MW）" },
        { key: "actual", title: "实际值（MW）" },
        { key: "diff", title: "偏差（MW）" },
      ],
      tableData: labels.map(function mapLabel(label, index) {
        var forecast = metric.forecast[index];
        var actual = metric.actual[index];
        return {
          time: label,
          forecast: forecast,
          actual: actual,
          diff: typeof actual === "number" && typeof forecast === "number" ? Number((actual - forecast).toFixed(1)) : null,
        };
      }),
      fileList: createMockFileList("gd-load-info", "2026-05-09", 3),
      emptyText: "当前日期暂无广东负荷信息 mock 数据。",
    };
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

  function buildGuangdongTradePricePage(bundle) {
    var tradeResult = bundle.tradeResult || {};
    var rows = tradeResult.hourlyRows || [];

    if (!rows.length) {
      return null;
    }

    var dayAheadSeries = createSeries(
      "dayaheadPrice",
      "日前出清价",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return Number(row.dayaheadPrice || 0); }),
      "元/MWh",
    );
    var realTimeSeries = createSeries(
      "realtimePrice",
      "实时出清价",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return Number(row.realtimePrice || 0); }),
      "元/MWh",
    );

    return {
      title: "全省统一出清价",
      description: "广东交易中心全省统一出清价统一 mock 结构。",
      updateTime: tradeResult.statusText || bundle.dataUpdatedAt || "",
      dataSource: "广东电力交易中心统一出清价",
      filters: {
        tradeCenter: "guangdong",
        pageType: "infoDisclosure",
        primaryTab: "全省统一出清价",
        secondaryTab: "",
      },
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
        { key: "dayaheadPrice", title: "日前出清价（元/MWh）" },
        { key: "realtimePrice", title: "实时出清价（元/MWh）" },
      ],
      tableData: cloneValue(rows),
      fileList: createMockFileList("gd-trade-price", "2026-05-09", 3),
      emptyText: "当前日期暂无广东统一出清价 mock 数据。",
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

  function buildGuangdongTradeResultPage(bundle) {
    var tradeResult = bundle.tradeResult || {};
    var rows = tradeResult.hourlyRows || [];

    if (!rows.length) {
      return null;
    }

    var dayAheadSeries = createSeries(
      "dayaheadSettlementPrice",
      "日前结算价格",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return Number(row.dayaheadSettlementPrice || 0); }),
      "元/MWh",
    );
    var realTimeSeries = createSeries(
      "realtimeSettlementPrice",
      "实时结算价格",
      rows.map(function mapRow(row) { return row.time; }),
      rows.map(function mapRow(row) { return Number(row.realtimeSettlementPrice || 0); }),
      "元/MWh",
    );

    return {
      title: "交易结果",
      description: "广东交易中心交易结果统一 mock 结构。",
      updateTime: tradeResult.statusText || bundle.dataUpdatedAt || "",
      dataSource: "广东电力交易中心交易结果",
      filters: {
        tradeCenter: "guangdong",
        pageType: "infoDisclosure",
        primaryTab: "交易结果",
        secondaryTab: "",
      },
      summaryCards: [
        { label: "日前结算峰值", value: dayAheadSeries.max, unit: "元/MWh" },
        { label: "实时结算峰值", value: realTimeSeries.max, unit: "元/MWh" },
        { label: "日前结算均值", value: dayAheadSeries.average, unit: "元/MWh" },
        { label: "实时结算均值", value: realTimeSeries.average, unit: "元/MWh" },
      ],
      chartType: "line",
      chartUnit: "元/MWh",
      chartSeries: [dayAheadSeries, realTimeSeries],
      tableColumns: [
        { key: "time", title: "时刻" },
        { key: "dayaheadSettlementPrice", title: "日前结算价格（元/MWh）" },
        { key: "realtimeSettlementPrice", title: "实时结算价格（元/MWh）" },
        { key: "dayaheadVolume", title: "日前电量（MWh）" },
        { key: "realtimeVolume", title: "实时电量（MWh）" },
      ],
      tableData: cloneValue(rows),
      fileList: createMockFileList("gd-trade-result", "2026-05-09", 3),
      emptyText: "当前日期暂无广东交易结果 mock 数据。",
    };
  }

  function buildGuangdongNodePricePage(bundle) {
    var tradeResult = bundle.tradeResult || {};
    var info = bundle.infoDisclosure || {};
    var series = (tradeResult.nodePriceSeries && tradeResult.nodePriceSeries["全省"]) || null;
    var labels = info.quarterHours || [];

    if (!series || !labels.length) {
      return null;
    }

    var dayAheadSeries = createSeries("dayAheadNodePrice", "日前节点电价", labels, series.dayAhead || [], "元/MWh");
    var realTimeSeries = createSeries("realTimeNodePrice", "实时节点电价", labels, series.realTime || [], "元/MWh");

    return {
      title: "节点电价",
      description: "广东交易中心全省节点电价统一 mock 结构。",
      updateTime: tradeResult.statusText || bundle.dataUpdatedAt || "",
      dataSource: "广东电力交易中心节点电价",
      filters: {
        tradeCenter: "guangdong",
        pageType: "infoDisclosure",
        primaryTab: "节点电价",
        secondaryTab: "",
      },
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
        { key: "dayAhead", title: "日前节点电价（元/MWh）" },
        { key: "realTime", title: "实时节点电价（元/MWh）" },
      ],
      tableData: labels.map(function mapLabel(label, index) {
        return {
          time: label,
          dayAhead: series.dayAhead[index],
          realTime: series.realTime[index],
        };
      }),
      fileList: createMockFileList("gd-node-price", "2026-05-09", 3),
      emptyText: "当前日期暂无广东节点电价 mock 数据。",
    };
  }

  function buildGuangdongDeclarationPage(bundle) {
    var declaration = bundle.dayAheadDeclaration || {};
    var rows = declaration.rows || [];

    if (!rows.length) {
      return null;
    }

    var grouped = {};
    rows.forEach(function eachRow(row) {
      grouped[row.time] = grouped[row.time] || {
        time: row.time,
        volume: 0,
        totalPrice: 0,
        count: 0,
      };
      grouped[row.time].volume += Number(row.volume || 0);
      grouped[row.time].totalPrice += Number(row.price || 0);
      grouped[row.time].count += 1;
    });

    var summaryRows = Object.keys(grouped)
      .sort()
      .map(function mapTime(time) {
        return {
          time: time,
          volume: grouped[time].volume,
          averagePrice: Number((grouped[time].totalPrice / Math.max(grouped[time].count, 1)).toFixed(1)),
        };
      });

    var volumeSeries = createSeries(
      "declarationVolume",
      "申报电量",
      summaryRows.map(function mapRow(row) { return row.time; }),
      summaryRows.map(function mapRow(row) { return row.volume; }),
      "MWh",
      "bar",
    );
    var priceSeries = createSeries(
      "declarationPrice",
      "申报均价",
      summaryRows.map(function mapRow(row) { return row.time; }),
      summaryRows.map(function mapRow(row) { return row.averagePrice; }),
      "元/MWh",
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
        { label: "申报记录数", value: rows.length, unit: "条" },
        { label: "申报电量峰值", value: volumeSeries.max, unit: "MWh" },
        { label: "申报均价峰值", value: priceSeries.max, unit: "元/MWh" },
        { label: "申报均价均值", value: priceSeries.average, unit: "元/MWh" },
      ],
      chartType: "mixed",
      chartUnit: "MWh / 元/MWh",
      chartSeries: [volumeSeries, priceSeries],
      tableColumns: [
        { key: "declarationDate", title: "申报日期" },
        { key: "unit", title: "交易单元" },
        { key: "time", title: "时刻" },
        { key: "volume", title: "申报电量（MWh）" },
        { key: "price", title: "申报价格（元/MWh）" },
        { key: "status", title: "申报状态" },
        { key: "updatedAt", title: "更新时间" },
      ],
      tableData: cloneValue(rows),
      fileList: createMockFileList("gd-dayahead-declaration", rows[0].declarationDate || "2026-05-09", 3),
      emptyText: "当前日期暂无广东日前申报 mock 数据。",
    };
  }

  function buildGuangdongInfoPage(bundle, primaryTab, secondaryTab) {
    var activeSecondaryTab = secondaryTab || "负荷信息";

    if (primaryTab === "负荷信息") {
      if (activeSecondaryTab === "机组检修容量") {
        return buildGuangdongMaintenancePage(bundle);
      }
      if (activeSecondaryTab === "备用信息") {
        return buildGuangdongReservePage(bundle);
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

  function buildHunanLoadInfoPage(bundle) {
    return buildTreeComparePage({
      bundle: bundle,
      title: "负荷信息",
      description: "湖南交易中心核心供需运行趋势统一 mock 结构。",
      dataSource: "湖南电力交易中心负荷信息",
      filters: {
        tradeCenter: "hunan",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "负荷信息",
      },
      chartTitle: "核心供需运行趋势",
      chartUnit: "MW",
      metricGroups: [
        {
          id: "hn-system-load",
          label: "系统负荷",
          items: [
            { id: "hn-system-load-forecast", groupId: "hn-system-load", label: "系统负荷预测（日）", role: "forecast", moduleName: "系统负荷预测（日）", valueKey: "systemLoadForecast", color: "#5B8FF9", dasharray: "6 4" },
            { id: "hn-system-load-actual", groupId: "hn-system-load", label: "实际负荷", role: "actual", moduleName: "实际负荷", valueKey: "systemLoadActual", color: "#2FCB8F" },
          ],
        },
        {
          id: "hn-generation-output",
          label: "发电出力",
          items: [
            { id: "hn-generation-output-forecast", groupId: "hn-generation-output", label: "发电总出力预测", role: "forecast", datasetKey: "infoGenerationOutput", sourceField: "forecastValue", valueKey: "generationOutputForecast", color: "#3D76DD", dasharray: "6 4" },
            { id: "hn-generation-output-actual", groupId: "hn-generation-output", label: "发电总出力", role: "actual", datasetKey: "infoGenerationOutput", sourceField: "actualValue", valueKey: "generationOutputActual", color: "#2D5BBA" },
            { id: "hn-nonmarket-output-forecast", groupId: "hn-generation-output", label: "非市场机组总出力预测", role: "forecast", moduleName: "非市场机组总出力预测", valueKey: "nonMarketOutputForecast", color: "#36B37E", dasharray: "6 4" },
            { id: "hn-nonmarket-output-actual", groupId: "hn-generation-output", label: "非市场机组总出力", role: "actual", moduleName: "非市场机组总出力", valueKey: "nonMarketOutputActual", color: "#1F9D6B" },
          ],
        },
        {
          id: "hn-renewable-output",
          label: "新能源出力",
          items: [
            { id: "hn-renewable-output-forecast", groupId: "hn-renewable-output", label: "新能源总出力预测（日）", role: "forecast", moduleName: "新能源总出力预测（日）", valueKey: "renewableOutputForecast", color: "#FF9D4D", dasharray: "6 4" },
            { id: "hn-renewable-output-actual", groupId: "hn-renewable-output", label: "新能源总出力", role: "actual", moduleName: "新能源总出力", valueKey: "renewableOutputActual", color: "#F56C42" },
          ],
        },
        {
          id: "hn-hydro-output",
          label: "水电出力",
          items: [
            { id: "hn-hydro-output-forecast", groupId: "hn-hydro-output", label: "水电（含抽蓄）总出力预测（日）", role: "forecast", moduleName: "水电（含抽蓄）总出力预测（日）", valueKey: "hydroOutputForecast", color: "#8B6FF5", dasharray: "6 4" },
            { id: "hn-hydro-output-actual", groupId: "hn-hydro-output", label: "水电（含抽蓄）总出力", role: "actual", moduleName: "水电（含抽蓄）总出力", valueKey: "hydroOutputActual", color: "#6D4DE3" },
          ],
        },
        {
          id: "hn-tieline-output",
          label: "省间联络线",
          items: [
            { id: "hn-tieline-forecast", groupId: "hn-tieline-output", label: "省间联络线输电曲线预测", role: "forecast", moduleName: "省间联络线输电曲线预测", valueKey: "tieLineForecast", color: "#5E6C84", dasharray: "6 4" },
            { id: "hn-tieline-actual", groupId: "hn-tieline-output", label: "省间联络线输电情况", role: "actual", moduleName: "省间联络线输电情况", valueKey: "tieLineActual", color: "#3F4C63" },
          ],
        },
      ],
      defaultVisibleSeriesIds: [
        "hn-system-load-forecast",
        "hn-system-load-actual",
        "hn-generation-output-forecast",
        "hn-generation-output-actual",
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
        { key: "generationOutputForecast", title: "发电总出力预测（MW）" },
        { key: "generationOutputActual", title: "发电总出力（MW）" },
        { key: "generationOutputDiff", title: "发电总出力差值（MW）" },
        { key: "nonMarketOutputForecast", title: "非市场机组总出力预测（MW）" },
        { key: "nonMarketOutputActual", title: "非市场机组总出力（MW）" },
        { key: "nonMarketOutputDiff", title: "非市场机组总出力差值（MW）" },
        { key: "renewableOutputForecast", title: "新能源总出力预测（MW）" },
        { key: "renewableOutputActual", title: "新能源总出力（MW）" },
        { key: "renewableOutputDiff", title: "新能源总出力差值（MW）" },
        { key: "hydroOutputForecast", title: "水电总出力预测（MW）" },
        { key: "hydroOutputActual", title: "水电总出力（MW）" },
        { key: "hydroOutputDiff", title: "水电总出力差值（MW）" },
        { key: "tieLineForecast", title: "省间联络线输电曲线预测（MW）" },
        { key: "tieLineActual", title: "省间联络线输电情况（MW）" },
        { key: "tieLineDiff", title: "省间联络线差值（MW）" },
        { key: "updatedAt", title: "更新时间" },
      ],
      tableMinWidth: 2860,
      emptyText: "当前日期暂无湖南负荷信息 mock 数据。",
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

  function buildHunanMaintenancePage(bundle) {
    var dataset = getBundleDatasets(bundle).infoMaintenanceComposite || {};
    var unitTable = dataset.unitStatusTable || {};
    var scheduleTable = dataset.extraTables && dataset.extraTables[0] ? dataset.extraTables[0] : {};
    var quarterColumns = (unitTable.columns || []).filter(function filterColumn(column) {
      return /^\d{2}:\d{2}$/.test(column.key);
    });
    var unitRows = (unitTable.data || []).map(function mapRow(row) {
      var nextRow = {
        runDate: row.runDate,
        unitName: row.unitName,
        unitCode: row.unitCode,
        operatingStatus: createBadgeCell(row.operatingStatus, getUnitStatusTone(row.operatingStatus)),
        updatedAt: row.updatedAt,
      };

      quarterColumns.forEach(function eachColumn(column) {
        var value = row[column.key];
        var statusText = "停机";
        if (row.operatingStatus === "检修") {
          statusText = "检修";
        } else if (row.operatingStatus === "备用") {
          statusText = Number(value || 0) > 0 ? "运行" : "备用";
        } else if (row.operatingStatus === "受限运行") {
          statusText = Number(value || 0) > 0 ? "运行" : "停机";
        } else if (Number(value || 0) > 0) {
          statusText = "运行";
        }
        nextRow[column.key] = createBadgeCell(statusText, getUnitStatusTone(statusText), statusText);
      });

      return nextRow;
    });
    var scheduleRows = (scheduleTable.data || []).map(function mapRow(row) {
      var nextRow = cloneValue(row);
      nextRow.planStatus = createBadgeCell(row.planStatus, getPlanStatusTone(row.planStatus));
      return nextRow;
    });

    return {
      title: "机组检修容量",
      description: "湖南交易中心机组状态与检修计划统一 mock 结构。",
      updateTime: dataset.updateTime || bundle.dataUpdatedAt || "",
      dataSource: dataset.dataSource || "湖南电力交易中心机组检修容量",
      filters: {
        tradeCenter: "hunan",
        pageType: "infoDisclosure",
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
          .concat(quarterColumns.map(function mapColumn(column) {
            return { key: column.key, title: column.title };
          }))
          .concat([{ key: "updatedAt", title: "更新时间" }]),
        data: unitRows,
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
          data: scheduleRows,
          minWidth: 1640,
        },
      ],
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
      dataSource: dataset.dataSource || "湖南电力交易中心系统备用信息",
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
      tableColumns: [
        { key: "date", title: "日期" },
        { key: "time", title: "时刻" },
        { key: "positiveReserve", title: "正备用（MW）" },
        { key: "negativeReserve", title: "负备用（MW）" },
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
      tableMinWidth: 1420,
      tooltipMode: "reserveDual",
      emptyText: "当前日期暂无湖南备用信息 mock 数据。",
    };
  }

  function buildShaanxiLoadInfoPage(bundle) {
    return buildTreeComparePage({
      bundle: bundle,
      title: "负荷信息",
      description: "陕西交易中心核心供需运行趋势统一 mock 结构。",
      dataSource: "陕西电力交易中心负荷信息",
      filters: {
        tradeCenter: "shaanxi",
        pageType: "infoDisclosure",
        primaryTab: "负荷信息",
        secondaryTab: "负荷信息",
      },
      chartTitle: "核心供需运行趋势",
      chartUnit: "MW",
      metricGroups: [
        {
          id: "sx-system-load",
          label: "系统负荷",
          items: [
            { id: "sx-system-load-forecast", groupId: "sx-system-load", label: "系统负荷预测（日）", role: "forecast", moduleName: "系统负荷预测（日）", valueKey: "systemLoadForecast", color: "#5B8FF9", dasharray: "6 4" },
            { id: "sx-system-load-actual", groupId: "sx-system-load", label: "实际负荷", role: "actual", moduleName: "实际负荷", valueKey: "systemLoadActual", color: "#2FCB8F" },
          ],
        },
        {
          id: "sx-generation-output",
          label: "发电出力",
          items: [
            { id: "sx-generation-output-actual", groupId: "sx-generation-output", label: "发电总出力", role: "actual", moduleName: "发电总出力", valueKey: "generationOutputActual", color: "#2D5BBA" },
            { id: "sx-generation-output-forecast", groupId: "sx-generation-output", label: "发电总出力预测", role: "forecast", moduleName: "发电总出力预测", valueKey: "generationOutputForecast", color: "#3D76DD", dasharray: "6 4" },
            { id: "sx-nonmarket-output-actual", groupId: "sx-generation-output", label: "非市场机组总出力", role: "actual", moduleName: "非市场机组总出力", valueKey: "nonMarketOutputActual", color: "#1F9D6B" },
            { id: "sx-nonmarket-output-forecast", groupId: "sx-generation-output", label: "非市场机组总出力预测", role: "forecast", moduleName: "非市场机组总出力预测", valueKey: "nonMarketOutputForecast", color: "#36B37E", dasharray: "6 4" },
          ],
        },
        {
          id: "sx-renewable-output",
          label: "新能源出力",
          items: [
            { id: "sx-renewable-output-actual", groupId: "sx-renewable-output", label: "新能源总出力", role: "actual", moduleName: "新能源总出力", valueKey: "renewableOutputActual", color: "#F56C42" },
            { id: "sx-renewable-output-forecast", groupId: "sx-renewable-output", label: "新能源总出力预测（日）", role: "forecast", moduleName: "新能源总出力预测（日）", valueKey: "renewableOutputForecast", color: "#FF9D4D", dasharray: "6 4" },
          ],
        },
        {
          id: "sx-hydro-output",
          label: "水电出力",
          items: [
            { id: "sx-hydro-output-actual", groupId: "sx-hydro-output", label: "水电（含抽蓄）出力", role: "actual", moduleName: "水电（含抽蓄）出力", valueKey: "hydroOutputActual", color: "#6D4DE3" },
            { id: "sx-hydro-output-forecast", groupId: "sx-hydro-output", label: "水电（含抽蓄）总出力预测（日）", role: "forecast", moduleName: "水电（含抽蓄）总出力预测（日）", valueKey: "hydroOutputForecast", color: "#8B6FF5", dasharray: "6 4" },
          ],
        },
        {
          id: "sx-tieline-output",
          label: "省间联络线",
          items: [
            { id: "sx-tieline-actual", groupId: "sx-tieline-output", label: "省间联络线输电情况", role: "actual", moduleName: "省间联络线输电情况", valueKey: "tieLineActual", color: "#3F4C63" },
            { id: "sx-tieline-forecast", groupId: "sx-tieline-output", label: "省间联络线输电曲线预测", role: "forecast", moduleName: "省间联络线输电曲线预测", valueKey: "tieLineForecast", color: "#5E6C84", dasharray: "6 4" },
          ],
        },
      ],
      defaultVisibleSeriesIds: [
        "sx-system-load-forecast",
        "sx-system-load-actual",
        "sx-generation-output-actual",
        "sx-generation-output-forecast",
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
        { key: "generationOutputForecast", title: "发电总出力预测（MW）" },
        { key: "generationOutputActual", title: "发电总出力（MW）" },
        { key: "generationOutputDiff", title: "发电总出力差值（MW）" },
        { key: "nonMarketOutputForecast", title: "非市场机组总出力预测（MW）" },
        { key: "nonMarketOutputActual", title: "非市场机组总出力（MW）" },
        { key: "nonMarketOutputDiff", title: "非市场机组总出力差值（MW）" },
        { key: "renewableOutputForecast", title: "新能源总出力预测（MW）" },
        { key: "renewableOutputActual", title: "新能源总出力（MW）" },
        { key: "renewableOutputDiff", title: "新能源总出力差值（MW）" },
        { key: "hydroOutputForecast", title: "水电（含抽蓄）总出力预测（MW）" },
        { key: "hydroOutputActual", title: "水电（含抽蓄）出力（MW）" },
        { key: "hydroOutputDiff", title: "水电出力差值（MW）" },
        { key: "tieLineForecast", title: "省间联络线输电曲线预测（MW）" },
        { key: "tieLineActual", title: "省间联络线输电情况（MW）" },
        { key: "tieLineDiff", title: "省间联络线差值（MW）" },
        { key: "updatedAt", title: "更新时间" },
      ],
      tableMinWidth: 2920,
      emptyText: "当前日期暂无陕西负荷信息 mock 数据。",
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

  function buildShaanxiMaintenancePage(bundle) {
    var dataset = getBundleDatasets(bundle).infoUnitStatus || {};
    var unitTable = dataset.unitStatusTable || {};
    var quarterColumns = (unitTable.columns || []).filter(function filterColumn(column) {
      return /^\d{2}:\d{2}$/.test(column.key);
    });
    var unitRows = (unitTable.data || []).map(function mapRow(row) {
      var nextRow = {
        runDate: row.runDate,
        disclosureType: row.disclosureType,
        unitId: row.unitId,
        unitName: row.unitName,
        operatingStatus: createBadgeCell(
          row.operatingStatus === "受限运行" ? "异常" : row.operatingStatus,
          getUnitStatusTone(row.operatingStatus === "受限运行" ? "异常" : row.operatingStatus),
        ),
        updatedAt: row.updatedAt,
      };

      quarterColumns.forEach(function eachColumn(column) {
        var value = row[column.key];
        var statusText = "停机";
        if (row.operatingStatus === "检修") {
          statusText = "检修";
        } else if (row.operatingStatus === "备用") {
          statusText = Number(value || 0) > 0 ? "运行" : "备用";
        } else if (row.operatingStatus === "受限运行") {
          statusText = Number(value || 0) > 0 ? "异常" : "停机";
        } else if (Number(value || 0) > 0) {
          statusText = "运行";
        }
        nextRow[column.key] = createBadgeCell(statusText, getUnitStatusTone(statusText), statusText);
      });

      return nextRow;
    });

    return {
      title: "机组检修容量",
      description: "陕西交易中心机组状态统一 mock 结构。",
      updateTime: dataset.updateTime || bundle.dataUpdatedAt || "",
      dataSource: dataset.dataSource || "陕西电力交易中心机组状态",
      filters: {
        tradeCenter: "shaanxi",
        pageType: "infoDisclosure",
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
          .concat(quarterColumns.map(function mapColumn(column) {
            return { key: column.key, title: column.title };
          }))
          .concat([{ key: "updatedAt", title: "更新时间" }]),
        data: unitRows,
        minWidth: 9240,
      },
      extraTables: [],
      emptyText: "当前日期暂无陕西机组状态 mock 数据。",
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

    if (request.pageType === "infoDisclosure" && tradeCenterKey !== "guangdong" && request.primaryTab === "负荷信息") {
      resolvedData = buildUnifiedLoadInfoPage(tradeCenterKey, bundle, request.secondaryTab || "负荷信息");
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
