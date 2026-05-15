(function attachPowerDataAdapter(global) {
  var HOURS = Array.from({ length: 24 }, function createHour(_, index) {
    return String(index).padStart(2, "0") + ":00";
  });

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

  function normalizeMarket(value) {
    var text = String(value || "").toLowerCase();
    if (text === "hunan" || text.indexOf("湖南") >= 0) {
      return "hunan";
    }
    if (text === "shaanxi" || text.indexOf("陕西") >= 0) {
      return "shaanxi";
    }
    return "guangdong";
  }

  function roundMwh(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    var numeric = Number(value);
    return Number.isNaN(numeric) ? null : Number(numeric.toFixed(3));
  }

  function normalizeDate(value) {
    if (value instanceof Date) {
      return value.getFullYear() + "-" + String(value.getMonth() + 1).padStart(2, "0") + "-" + String(value.getDate()).padStart(2, "0");
    }

    var text = String(value || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }

    var serial = Number(text);
    if (!Number.isNaN(serial) && serial > 25569) {
      var date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return date.getUTCFullYear() + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0");
    }

    return text;
  }

  function getRawPowerData() {
    return global.BOSS_RAW_POWER_DATA_MOCK || {};
  }

  function getMetadata(market) {
    var metadata = getRawPowerData().metadata || {};
    return metadata[market] || {};
  }

  function getMicrogrid(accountNo) {
    var map = getRawPowerData().microgridMap || {};
    var matched = map[String(accountNo || "")] || {};
    return {
      microgridName: matched.microgridName || "-",
      microgridId: matched.microgridId || "-",
    };
  }

  function buildUnifiedRow(options) {
    var microgrid = getMicrogrid(options.accountNo);
    return {
      market: options.market,
      date: normalizeDate(options.date),
      userCode: String(options.userCode || ""),
      userName: String(options.userName || ""),
      accountNo: String(options.accountNo || options.userCode || ""),
      meteringPointNo: String(options.meteringPointNo || "-"),
      microgridName: microgrid.microgridName,
      microgridId: microgrid.microgridId,
      hour: options.hour,
      electricity: roundMwh(options.electricity),
      unit: "MWh",
      updateTime: options.updateTime || "",
      publishTime: options.publishTime || "",
      dataSource: options.dataSource || "取数工具",
    };
  }

  function adaptHunanRows() {
    var raw = getRawPowerData();
    var rows = (((raw.hunan || {}).retailCompanyDailyElectricity || {}).rows || []);
    var metadata = getMetadata("hunan");

    return rows.reduce(function accumulateRows(result, row) {
      return result.concat(
        HOURS.map(function mapHour(hourLabel, hourIndex) {
          return buildUnifiedRow({
            market: "hunan",
            date: row["日期"],
            userCode: row["用户编号"],
            userName: row["用户名称"],
            accountNo: row["用户编号"],
            meteringPointNo: "-",
            hour: hourLabel,
            electricity: row[hourIndex + 1 + "点电量"],
            updateTime: metadata.updateTime,
            publishTime: metadata.publishTime,
            dataSource: metadata.dataSource,
          });
        }),
      );
    }, []);
  }

  function adaptShaanxiRows() {
    var raw = getRawPowerData();
    var rows = (((raw.shaanxi || {}).userSideActualElectricity || {}).rows || []);
    var metadata = getMetadata("shaanxi");

    return rows.reduce(function accumulateRows(result, row) {
      return result.concat(
        HOURS.map(function mapHour(hourLabel, hourIndex) {
          var electricity = [1, 2, 3, 4].reduce(function sumSegment(total, offset) {
            return total + Number(row["段" + (hourIndex * 4 + offset)] || 0);
          }, 0);

          return buildUnifiedRow({
            market: "shaanxi",
            date: row["日期"],
            userCode: row["户号"],
            userName: row["名称"],
            accountNo: row["户号"],
            meteringPointNo: "-",
            hour: hourLabel,
            electricity: electricity,
            updateTime: metadata.updateTime,
            publishTime: metadata.publishTime,
            dataSource: metadata.dataSource,
          });
        }),
      );
    }, []);
  }

  function adaptGuangdongRows() {
    var guangdong = global.BOSS_GUANGDONG_DATA_MOCK || {};
    var info = guangdong.infoDisclosure || {};
    var updateTime = String(info.statusText || guangdong.dataUpdatedAt || "").replace(/^数据更新时间：/, "").replace(/（.*$/, "");
    var rows = info.enterpriseRows || [];

    return rows.reduce(function accumulateRows(result, row) {
      var hourlyValues = row.hourlyValues || [];
      return result.concat(
        HOURS.map(function mapHour(hourLabel, hourIndex) {
          return {
            market: "guangdong",
            date: normalizeDate(row.date),
            userCode: String(row.userCode || ""),
            userName: String(row.userName || ""),
            accountNo: String(row.accountNo || row.userCode || ""),
            meteringPointNo: String(row.meteringPointNo || row.meterPointId || "-"),
            microgridName: row.microgridName || "-",
            microgridId: row.microgridId || "-",
            hour: hourLabel,
            electricity: roundMwh(hourlyValues[hourIndex]),
            unit: "MWh",
            updateTime: updateTime,
            publishTime: info.publishTime || guangdong.dataPublishTime || "",
            dataSource: "取数工具",
          };
        }),
      );
    }, []);
  }

  function getUserHourlyPowerData(market) {
    var marketKey = normalizeMarket(market);
    if (marketKey === "hunan") {
      return cloneValue(adaptHunanRows());
    }
    if (marketKey === "shaanxi") {
      return cloneValue(adaptShaanxiRows());
    }
    return cloneValue(adaptGuangdongRows());
  }

  function aggregateRows(rows, keys, buildRow) {
    var grouped = {};
    rows.forEach(function eachRow(row) {
      var groupKey = keys.map(function mapKey(key) {
        return row[key];
      }).join("|");

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          rows: [],
          electricity: 0,
          hasValue: false,
        };
      }

      grouped[groupKey].rows.push(row);
      if (typeof row.electricity === "number" && !Number.isNaN(row.electricity)) {
        grouped[groupKey].electricity += row.electricity;
        grouped[groupKey].hasValue = true;
      }
    });

    return Object.keys(grouped)
      .sort()
      .map(function mapGroup(groupKey) {
        return buildRow(grouped[groupKey].rows[0], grouped[groupKey]);
      });
  }

  function getRetailCompanyHourlyPowerData(market) {
    var rows = getUserHourlyPowerData(market);
    return aggregateRows(rows, ["date", "hour"], function buildRetailHourRow(firstRow, group) {
      return {
        market: firstRow.market,
        date: firstRow.date,
        userCode: "retail-company",
        userName: "售电公司",
        accountNo: "retail-company",
        meteringPointNo: "-",
        microgridName: "-",
        microgridId: "-",
        hour: firstRow.hour,
        electricity: group.hasValue ? roundMwh(group.electricity) : null,
        unit: "MWh",
        updateTime: firstRow.updateTime,
        publishTime: firstRow.publishTime,
        dataSource: firstRow.dataSource,
      };
    });
  }

  function getRetailCompanyDailyTotalData(market) {
    var rows = getUserHourlyPowerData(market);
    return aggregateRows(rows, ["date"], function buildDailyRow(firstRow, group) {
      return {
        market: firstRow.market,
        date: firstRow.date,
        electricity: group.hasValue ? roundMwh(group.electricity) : null,
        unit: "MWh",
        updateTime: firstRow.updateTime,
        publishTime: firstRow.publishTime,
        dataSource: firstRow.dataSource,
      };
    });
  }

  function inspectPowerDataAdapter(market) {
    var marketKey = normalizeMarket(market);
    var userRows = getUserHourlyPowerData(marketKey);
    var retailRows = getRetailCompanyHourlyPowerData(marketKey);
    var dailyRows = getRetailCompanyDailyTotalData(marketKey);
    var fields = [
      "market",
      "date",
      "userCode",
      "userName",
      "accountNo",
      "meteringPointNo",
      "microgridName",
      "microgridId",
      "hour",
      "electricity",
      "unit",
      "updateTime",
      "publishTime",
      "dataSource",
    ];

    return {
      market: marketKey,
      userRowCount: userRows.length,
      retailHourlyRowCount: retailRows.length,
      dailyRowCount: dailyRows.length,
      hoursPerUserDay: userRows.reduce(function countByUserDay(result, row) {
        var key = row.date + "|" + row.userCode;
        result[key] = (result[key] || 0) + 1;
        return result;
      }, {}),
      hasUnifiedFields: userRows.every(function checkRow(row) {
        return fields.every(function checkField(field) {
          return Object.prototype.hasOwnProperty.call(row, field);
        });
      }),
      sample: userRows[0] || null,
    };
  }

  global.BOSS_POWER_DATA_ADAPTER = {
    hours: HOURS.slice(),
    getUserHourlyPowerData: getUserHourlyPowerData,
    getRetailCompanyHourlyPowerData: getRetailCompanyHourlyPowerData,
    getRetailCompanyDailyTotalData: getRetailCompanyDailyTotalData,
    inspectPowerDataAdapter: inspectPowerDataAdapter,
  };
})(window);
