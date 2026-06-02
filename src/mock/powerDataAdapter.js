(function attachPowerDataAdapter(global) {
  var HOURS = Array.from({ length: 24 }, function createHour(_, index) {
    return String(index).padStart(2, "0") + ":00";
  });
  var MAY_2026_START = "2026-05-01";
  var MAY_2026_DAYS = 31;
  var MAY_2026_MONTH = "2026-05";
  var SELLER_POWER_MULTIPLIER = 12.1;
  var generatedUserRowsCache = {};
  var generatedSellerHistoryRowsCache = {};
  var generatedUserHistoryRowsCache = {};
  var generatedRetailHourlyRowsCache = {};
  var generatedRetailDailyRowsCache = {};

  var SELLER_COMPANY_BY_MARKET = {
    guangdong: {
      code: "SD-GD-XJ-2026",
      name: "小桔能源售电（广东）有限公司",
    },
    hunan: {
      code: "SD-HN-XJ-2026",
      name: "滴滴电力（湖南）有限公司",
    },
    shaanxi: {
      code: "SD-SX-XJ-2026",
      name: "滴滴电力（陕西）有限公司",
    },
  };

  var MARKET_META = {
    guangdong: {
      updateTime: "2026-05-29 11:35:33",
      publishTime: "2026-05-29 10:55:00",
      dataSource: "取数工具",
      codePrefix: "GD",
      accountPrefix: "4401",
      meterPrefix: "MP-GD",
      microgridPrefix: "MG-440",
      names: [
        "广州南沙小桔充电站",
        "广州番禺公交补能中心",
        "佛山顺德智能仓储",
        "深圳前海商超门店",
        "东莞松山湖制造工厂",
        "珠海横琴新能源科技",
        "中山园区综合站点",
        "惠州小桔便民充电点",
        "江门先进装备工厂",
        "广州白云物流港",
      ],
      microgrids: [
        "南沙智充微电网",
        "番禺公交微电网",
        "顺德仓储微电网",
        "前海商业微电网",
        "松山湖制造微电网",
        "横琴绿能微电网",
        "中山园区微电网",
        "惠州便民站微电网",
        "江门装备微电网",
        "白云物流微电网",
      ],
    },
    hunan: {
      updateTime: "2026-05-29 10:46:00",
      publishTime: "2026-05-29 10:20:00",
      dataSource: "取数工具",
      codePrefix: "HN",
      accountPrefix: "4301",
      meterPrefix: "MP-HN",
      microgridPrefix: "MG-430",
      names: [
        "长沙高铁南站补能中心",
        "株洲公交充电站群",
        "湘潭园区仓储企业",
        "岳阳临港商超门店",
        "常德先进制造工厂",
        "郴州新能源科技公司",
        "衡阳园区综合站点",
        "长沙小桔便民充电点",
        "益阳装备制造工厂",
        "岳阳物流港仓储",
      ],
      microgrids: [
        "长沙南站综合微电网",
        "株洲公交微电网",
        "湘潭智造谷微电网",
        "岳阳临港商业微电网",
        "常德制造微电网",
        "郴州绿能微电网",
        "衡阳园区微电网",
        "长沙便民站微电网",
        "益阳装备微电网",
        "岳阳物流微电网",
      ],
    },
    shaanxi: {
      updateTime: "2026-05-29 10:58:00",
      publishTime: "2026-05-29 10:35:00",
      dataSource: "取数工具",
      codePrefix: "SX",
      accountPrefix: "6101",
      meterPrefix: "MP-SX",
      microgridPrefix: "MG-610",
      names: [
        "西安高新补能中心",
        "咸阳物流港充电站",
        "宝鸡综合仓储企业",
        "西安曲江商超门店",
        "渭南产业园制造工厂",
        "榆林新能源科技公司",
        "汉中园区综合站点",
        "西安小桔便民充电点",
        "铜川装备制造工厂",
        "渭南物流港仓储",
      ],
      microgrids: [
        "西安高新补能微电网",
        "咸阳物流港微电网",
        "宝鸡仓储微电网",
        "曲江商业微电网",
        "渭南产业园微电网",
        "榆林绿能微电网",
        "汉中园区微电网",
        "西安便民站微电网",
        "铜川装备微电网",
        "渭南物流微电网",
      ],
    },
  };

  var USER_PROFILE_TEMPLATES = [
    { type: "charging", scale: 1.36 },
    { type: "charging", scale: 0.96 },
    { type: "warehouse", scale: 4.8 },
    { type: "supermarket", scale: 1.22 },
    { type: "factory", scale: 6.15 },
    { type: "tech", scale: 2.25 },
    { type: "park", scale: 1.65 },
    { type: "smallCharging", scale: 0.18 },
    { type: "factory", scale: 3.65 },
    { type: "warehouse", scale: 2.75 },
  ];

  var PROFILE_SHAPES = {
    charging: [0.62, 0.75, 0.68, 0.55, 0.48, 0.44, 0.56, 0.72, 0.8, 0.7, 0.54, 0.5, 0.84, 0.95, 0.86, 0.7, 0.72, 0.84, 1.05, 1.15, 1.18, 1.08, 0.92, 0.74],
    smallCharging: [0.5, 0.58, 0.42, 0.2, 0.12, 0.1, 0.26, 0.48, 0.62, 0.5, 0.32, 0.3, 0.58, 0.7, 0.62, 0.44, 0.46, 0.58, 0.82, 0.9, 0.86, 0.76, 0.58, 0.44],
    warehouse: [0.32, 0.3, 0.26, 0.25, 0.26, 0.3, 0.42, 0.62, 0.78, 0.82, 0.7, 0.66, 0.78, 0.84, 0.88, 0.92, 0.96, 0.9, 0.72, 0.58, 0.48, 0.42, 0.38, 0.34],
    supermarket: [0.12, 0.1, 0.08, 0.08, 0.08, 0.1, 0.18, 0.32, 0.58, 0.74, 0.72, 0.68, 0.82, 0.88, 0.92, 0.96, 0.98, 1, 0.98, 0.94, 0.86, 0.72, 0.42, 0.18],
    factory: [0.22, 0.19, 0.16, 0.15, 0.16, 0.2, 0.36, 0.62, 0.9, 0.96, 0.78, 0.72, 0.86, 0.92, 0.96, 0.98, 0.95, 0.86, 0.62, 0.45, 0.38, 0.32, 0.28, 0.24],
    tech: [0.22, 0.2, 0.18, 0.18, 0.2, 0.24, 0.38, 0.6, 0.82, 0.88, 0.76, 0.72, 0.86, 0.92, 0.9, 0.86, 0.82, 0.74, 0.54, 0.42, 0.36, 0.32, 0.28, 0.24],
    park: [0.28, 0.25, 0.22, 0.2, 0.22, 0.28, 0.42, 0.6, 0.76, 0.8, 0.68, 0.64, 0.82, 0.88, 0.9, 0.86, 0.84, 0.88, 0.92, 0.9, 0.82, 0.68, 0.5, 0.34],
  };

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

  function roundPower(value, digits) {
    var numeric = Number(value);
    return Number.isNaN(numeric) ? null : Number(numeric.toFixed(digits));
  }

  function pad(value, length) {
    return String(value).padStart(length || 2, "0");
  }

  function buildDateRange(start, days) {
    var base = new Date(start + "T00:00:00");
    return Array.from({ length: days }, function createDate(_, index) {
      var date = new Date(base.getTime());
      date.setDate(base.getDate() + index);
      return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
    });
  }

  function isMay2026Date(date) {
    return date >= MAY_2026_START && date <= "2026-05-31";
  }

  function isWeekend(date) {
    var day = new Date(date + "T00:00:00").getDay();
    return day === 0 || day === 6;
  }

  function getMarketMeta(market) {
    return MARKET_META[market] || MARKET_META.guangdong;
  }

  function getSellerCompany(market) {
    return SELLER_COMPANY_BY_MARKET[market] || SELLER_COMPANY_BY_MARKET.guangdong;
  }

  function buildGeneratedUserTemplates(market) {
    var meta = getMarketMeta(market);
    return USER_PROFILE_TEMPLATES.map(function mapTemplate(template, index) {
      return {
        userCode: meta.codePrefix + "USER" + pad(index + 1, 3),
        userName: meta.names[index],
        accountNo: meta.accountPrefix + pad(86000 + index * 173, 7),
        meteringPointNo: meta.meterPrefix + "-" + pad(index + 1, 4),
        microgridName: meta.microgrids[index],
        microgridId: meta.microgridPrefix + "-" + pad(index + 1, 3),
        type: template.type,
        scale: template.scale,
      };
    });
  }

  function getProfileWeekendOffset(type, weekend) {
    if (!weekend) {
      return 0;
    }
    if (type === "factory") {
      return -0.16;
    }
    if (type === "warehouse") {
      return -0.08;
    }
    if (type === "tech") {
      return -0.06;
    }
    if (type === "supermarket") {
      return 0.12;
    }
    if (type === "charging" || type === "smallCharging") {
      return 0.08;
    }
    return 0.03;
  }

  function buildGeneratedUserPowerValue(template, date, dayIndex, hourIndex, userIndex) {
    var shape = PROFILE_SHAPES[template.type] || PROFILE_SHAPES.park;
    var dayWave = Math.sin((dayIndex + 1) * 0.73 + userIndex * 0.41) * 0.035;
    var weekdayFactor = 1 + getProfileWeekendOffset(template.type, isWeekend(date));
    var dayPattern = ((dayIndex + userIndex) % 5 - 2) * 0.007;
    var hourWave = Math.sin((hourIndex + 1) * (userIndex + 2) * 0.19 + dayIndex * 0.23) * 0.032;
    var hourPattern = ((dayIndex + hourIndex + userIndex) % 7 - 3) * 0.006;
    var value = template.scale * shape[hourIndex] * (weekdayFactor + dayWave + dayPattern) * (1 + hourWave + hourPattern);

    if (template.type === "smallCharging" && hourIndex >= 2 && hourIndex <= 5 && (dayIndex + hourIndex + userIndex) % 4 === 0) {
      value = 0;
    }

    return Math.max(0, roundPower(value, 3));
  }

  function buildGeneratedUserHourlyRows(market) {
    var marketKey = normalizeMarket(market);
    if (generatedUserRowsCache[marketKey]) {
      return generatedUserRowsCache[marketKey];
    }

    var meta = getMarketMeta(marketKey);
    var templates = buildGeneratedUserTemplates(marketKey);
    var rows = [];

    buildDateRange(MAY_2026_START, MAY_2026_DAYS).forEach(function eachDate(date, dayIndex) {
      templates.forEach(function eachTemplate(template, userIndex) {
        HOURS.forEach(function eachHour(hour, hourIndex) {
          rows.push({
            market: marketKey,
            date: date,
            userCode: template.userCode,
            userName: template.userName,
            accountNo: template.accountNo,
            meteringPointNo: template.meteringPointNo,
            microgridName: template.microgridName,
            microgridId: template.microgridId,
            hour: hour,
            electricity: buildGeneratedUserPowerValue(template, date, dayIndex, hourIndex, userIndex),
            unit: "MWh",
            updateTime: meta.updateTime,
            publishTime: meta.publishTime,
            dataSource: meta.dataSource,
          });
        });
      });
    });

    generatedUserRowsCache[marketKey] = rows;
    return rows;
  }

  function mergeGeneratedRows(generatedRows, legacyRows, dateKey) {
    return generatedRows.concat(
      (legacyRows || []).filter(function filterLegacyRow(row) {
        return !isMay2026Date(row && row[dateKey || "date"]);
      }),
    );
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
    var generatedRows = buildGeneratedUserHourlyRows(marketKey);
    var legacyRows;

    if (marketKey === "hunan") {
      legacyRows = adaptHunanRows();
    } else if (marketKey === "shaanxi") {
      legacyRows = adaptShaanxiRows();
    } else {
      legacyRows = adaptGuangdongRows();
    }
    return cloneValue(mergeGeneratedRows(generatedRows, legacyRows, "date"));
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
    var marketKey = normalizeMarket(market);
    if (generatedRetailHourlyRowsCache[marketKey]) {
      return cloneValue(generatedRetailHourlyRowsCache[marketKey]);
    }

    var sellerCompany = getSellerCompany(marketKey);
    var rows = getUserHourlyPowerData(marketKey);
    var retailRows = aggregateRows(rows, ["date", "hour"], function buildRetailHourRow(firstRow, group) {
      var isGeneratedMayRow = isMay2026Date(firstRow.date);
      return {
        market: firstRow.market,
        date: firstRow.date,
        userCode: sellerCompany.code,
        userName: sellerCompany.name,
        accountNo: sellerCompany.code,
        meteringPointNo: "-",
        microgridName: "-",
        microgridId: "-",
        hour: firstRow.hour,
        electricity: group.hasValue
          ? (isGeneratedMayRow ? roundPower(group.electricity * SELLER_POWER_MULTIPLIER, 5) : roundMwh(group.electricity))
          : null,
        unit: "MWh",
        updateTime: firstRow.updateTime,
        publishTime: firstRow.publishTime,
        dataSource: firstRow.dataSource,
      };
    });
    generatedRetailHourlyRowsCache[marketKey] = retailRows;
    return cloneValue(retailRows);
  }

  function getRetailCompanyDailyTotalData(market) {
    var marketKey = normalizeMarket(market);
    if (generatedRetailDailyRowsCache[marketKey]) {
      return cloneValue(generatedRetailDailyRowsCache[marketKey]);
    }

    var rows = getRetailCompanyHourlyPowerData(marketKey);
    var dailyRows = aggregateRows(rows, ["date"], function buildDailyRow(firstRow, group) {
      return {
        market: firstRow.market,
        date: firstRow.date,
        electricity: group.hasValue ? roundPower(group.electricity, isMay2026Date(firstRow.date) ? 5 : 3) : null,
        unit: "MWh",
        updateTime: firstRow.updateTime,
        publishTime: firstRow.publishTime,
        dataSource: firstRow.dataSource,
      };
    });
    generatedRetailDailyRowsCache[marketKey] = dailyRows;
    return cloneValue(dailyRows);
  }

  function getSellerHourlyPowerHistoryRows(market) {
    var marketKey = normalizeMarket(market);
    if (generatedSellerHistoryRowsCache[marketKey]) {
      return cloneValue(generatedSellerHistoryRowsCache[marketKey]);
    }

    var sellerCompany = getSellerCompany(marketKey);
    var dailyMap = {};
    getRetailCompanyDailyTotalData(marketKey).forEach(function eachDailyRow(row) {
      if (isMay2026Date(row.date)) {
        dailyMap[row.date] = row.electricity;
      }
    });

    var rows = getRetailCompanyHourlyPowerData(marketKey)
      .filter(function filterMaySellerRow(row) {
        return isMay2026Date(row.date);
      })
      .map(function mapSellerHistoryRow(row) {
        return {
          agentMonth: MAY_2026_MONTH,
          sellerCompanyCode: sellerCompany.code,
          sellerCompanyName: sellerCompany.name,
          usageDate: row.date,
          hour: row.hour,
          power: row.electricity,
          dailyPower: dailyMap[row.date],
          userCount: USER_PROFILE_TEMPLATES.length,
          dataSource: "历史回溯",
          updateTime: row.updateTime,
        };
      });

    generatedSellerHistoryRowsCache[marketKey] = rows;
    return cloneValue(rows);
  }

  function getUserHourlyPowerHistoryRows(market) {
    var marketKey = normalizeMarket(market);
    if (generatedUserHistoryRowsCache[marketKey]) {
      return cloneValue(generatedUserHistoryRowsCache[marketKey]);
    }

    var sellerCompany = getSellerCompany(marketKey);
    var rows = getUserHourlyPowerData(marketKey)
      .filter(function filterMayUserRow(row) {
        return isMay2026Date(row.date);
      })
      .map(function mapUserHistoryRow(row) {
        return {
          agentMonth: MAY_2026_MONTH,
          sellerCompanyCode: sellerCompany.code,
          sellerCompanyName: sellerCompany.name,
          powerUserCode: row.userCode,
          powerUserName: row.userName,
          accountNo: row.accountNo,
          meterPointNo: row.meteringPointNo,
          microgridName: row.microgridName,
          microgridId: row.microgridId,
          usageDate: row.date,
          hour: row.hour,
          power: row.electricity,
          dataSource: "历史回溯",
          updateTime: row.updateTime,
        };
      });

    generatedUserHistoryRowsCache[marketKey] = rows;
    return cloneValue(rows);
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
      sellerHistoryRowCount: getSellerHourlyPowerHistoryRows(marketKey).length,
      userHistoryRowCount: getUserHourlyPowerHistoryRows(marketKey).length,
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
    getSellerHourlyPowerHistoryRows: getSellerHourlyPowerHistoryRows,
    getUserHourlyPowerHistoryRows: getUserHourlyPowerHistoryRows,
    inspectPowerDataAdapter: inspectPowerDataAdapter,
  };
})(window);
