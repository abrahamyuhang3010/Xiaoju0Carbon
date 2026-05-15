(function attachInfoDisclosureTradeData(global) {
  var MOCK_DATE = "2026-05-07";
  var MOCK_UPDATE_TIME = "2026-05-07 14:00:00";
  var MOCK_PUBLISH_TIME = "2026-05-07 13:45:00";
  var MOCK_SOURCE = "取数工具";
  var CENTER_NAMES = {
    guangdong: "广东电力交易中心",
    hunan: "湖南电力交易中心",
    shaanxi: "陕西电力交易中心",
  };

  function roundNumber(value, digits) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return null;
    }

    return Number(value.toFixed(typeof digits === "number" ? digits : 2));
  }

  function buildPriceSpread(dayAheadValue, realTimeValue) {
    if (typeof dayAheadValue !== "number" || typeof realTimeValue !== "number") {
      return null;
    }

    return roundNumber(realTimeValue - dayAheadValue, 2);
  }

  function averageValidNumbers(values) {
    var validValues = (values || []).filter(function filterValue(value) {
      return typeof value === "number" && !Number.isNaN(value);
    });

    if (!validValues.length) {
      return null;
    }

    return roundNumber(
      validValues.reduce(function accumulate(total, value) {
        return total + value;
      }, 0) / validValues.length,
      2,
    );
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function buildQuarterEndLabels() {
    return Array.from({ length: 96 }, function createLabel(_, index) {
      var totalMinutes = (index + 1) * 15;
      var hour = Math.floor(totalMinutes / 60);
      var minute = totalMinutes % 60;
      return pad(hour) + ":" + pad(minute);
    });
  }

  function buildHourLabels() {
    return Array.from({ length: 24 }, function createLabel(_, index) {
      return pad(index) + ":00";
    });
  }

  function buildNodePricePoints(timeLabels, dayAheadValues, realTimeValues) {
    return (timeLabels || []).slice(0, 96).map(function mapPoint(time, index) {
      var dayAheadNodePrice = roundNumber(dayAheadValues[index], 2);
      var realTimeNodePrice = roundNumber(realTimeValues[index], 2);

      return {
        time: time,
        dayAheadNodePrice: dayAheadNodePrice,
        realTimeNodePrice: realTimeNodePrice,
        spread: buildPriceSpread(dayAheadNodePrice, realTimeNodePrice),
      };
    });
  }

  function aggregateNodePrice96To24(points96) {
    return Array.from({ length: 24 }, function createHourPoint(_, hourIndex) {
      var segment = (points96 || []).slice(hourIndex * 4, hourIndex * 4 + 4);
      var dayAheadNodePrice = averageValidNumbers(
        segment.map(function mapPoint(point) {
          return point && point.dayAheadNodePrice;
        }),
      );
      var realTimeNodePrice = averageValidNumbers(
        segment.map(function mapPoint(point) {
          return point && point.realTimeNodePrice;
        }),
      );

      return {
        time: pad(hourIndex) + ":00",
        dayAheadNodePrice: dayAheadNodePrice,
        realTimeNodePrice: realTimeNodePrice,
        spread: buildPriceSpread(dayAheadNodePrice, realTimeNodePrice),
      };
    });
  }

  function getSourceValues(sourceGroup, fieldName, fallbackValues) {
    var values = sourceGroup && sourceGroup[fieldName];
    return Array.isArray(values) && values.length ? values : fallbackValues;
  }

  function getSourceNodeValues(sourceGroup, nodeIndex, fallbackValues) {
    var nodes = (sourceGroup && sourceGroup.selectedNodes) || [];
    var values = nodes[nodeIndex] && nodes[nodeIndex].values;
    return Array.isArray(values) && values.length ? values : fallbackValues;
  }

  function buildNode(nodeName, nodeType, timeLabels, dayAheadValues, realTimeValues) {
    return {
      nodeName: nodeName,
      nodeType: nodeType,
      category: nodeType,
      points: buildNodePricePoints(timeLabels, dayAheadValues, realTimeValues),
    };
  }

  function buildTradingPoints(dayAheadVolumeValues, realTimeVolumeValues, dayAheadPriceValues, realTimePriceValues) {
    return HOURS_24.map(function mapPoint(time, index) {
      return {
        time: time,
        dayAheadVolume: roundNumber(dayAheadVolumeValues[index], 2),
        realTimeVolume: roundNumber(realTimeVolumeValues[index], 2),
        dayAheadSettlementPrice: roundNumber(dayAheadPriceValues[index], 2),
        realTimeSettlementPrice: roundNumber(realTimePriceValues[index], 2),
      };
    });
  }

  function sourceSettlementPrices(sourceGroup) {
    return HOURS_24.map(function mapPrice(_, index) {
      var point = sourceGroup && sourceGroup.points && sourceGroup.points[index];
      return point && typeof point.price === "number" ? point.price : null;
    });
  }

  function buildCenterNodePrice(centerKey, nodes) {
    return {
      centerName: CENTER_NAMES[centerKey],
      date: MOCK_DATE,
      updateTime: MOCK_UPDATE_TIME,
      publishTime: MOCK_PUBLISH_TIME,
      source: MOCK_SOURCE,
      nodes: nodes,
    };
  }

  function buildCenterTradingResult(centerKey, points) {
    return {
      centerName: CENTER_NAMES[centerKey],
      date: MOCK_DATE,
      updateTime: MOCK_UPDATE_TIME,
      publishTime: MOCK_PUBLISH_TIME,
      source: MOCK_SOURCE,
      volumeSource: "stable-placeholder",
      points: points,
    };
  }

  var NODE_PRICE_TIMES_96 = buildQuarterEndLabels();
  var HOURS_24 = buildHourLabels();
  var gdSource = global.BOSS_GD_TRADE_DISCLOSURE_SOURCE || {};
  var gdNodeDayAhead = gdSource.nodeDayAhead || {};
  var gdNodeRealTime = gdSource.nodeRealTime || {};
  var gdTimeLabels = Array.isArray(gdNodeDayAhead.times) && gdNodeDayAhead.times.length ? gdNodeDayAhead.times : NODE_PRICE_TIMES_96;
  var gdProvinceDayAhead = getSourceValues(gdNodeDayAhead, "province", []);
  var gdProvinceRealTime = getSourceValues(gdNodeRealTime, "province", []);
  var gdSettlementDayAhead = sourceSettlementPrices(gdSource.settlementDayAhead);
  var gdSettlementRealTime = sourceSettlementPrices(gdSource.settlementRealTime);
  var gdPlaceholderDayAheadVolume = [
    6120, 5980, 5820, 5660, 5580, 5460, 5620, 6040, 6680, 7520, 8240, 8620,
    8740, 8520, 8260, 8040, 8220, 8640, 9020, 9340, 9580, 9260, 8640, 7820,
  ];
  var gdPlaceholderRealTimeVolume = [
    5800, 5800, 5740, 5770, 5740, 5680, 5540, 6150, 6840, 7740, 7920, 8440,
    8660, 8630, 8420, 8260, 7900, 8460, 8940, 9450, 9740, 9480, 8320, 7640,
  ];

  var hunanProvinceDayAhead = [341.24,342.66,338.85,340.24,334.81,336.19,332.38,333.79,328.41,329.87,326.16,327.69,322.47,326.33,325.04,329,326.2,330.24,329.11,333.21,330.54,334.69,333.65,337.82,335.2,339.38,338.35,342.51,346.86,350.99,349.89,353.96,351.2,355.2,353.96,357.87,354.93,358.73,357.28,360.97,357.79,354.34,352.63,356.04,352.59,355.85,353.85,356.96,353.2,356.16,353.85,356.65,352.59,355.24,352.63,355.14,350.79,353.17,350.28,352.53,347.93,352.29,351.4,355.63,353,357.09,355.9,359.82,356.86,360.6,359.05,362.6,369.24,372.59,370.62,373.76,369.99,372.91,370.52,373.23,369.04,371.55,368.75,371.06,366.47,358.59,355.43,357.38,352.45,354.25,350.78,352.45,347.26,348.82,345.13,346.6];
  var hunanProvinceRealTime = [326.88,328.91,333.45,334.3,319.47,321.58,326.22,327.21,312.56,317.41,324.82,328.59,316.7,321.75,329.35,333.27,321.52,326.7,334.39,338.39,326.7,331.91,339.61,343.6,331.88,337.03,344.65,348.55,343.7,348.71,356.18,359.89,347.84,352.64,359.87,363.33,351.02,355.54,362.48,365.64,353.02,350.22,356.83,359.66,346.7,350.56,356.83,359.32,346.02,349.54,355.48,357.64,344.02,347.23,352.87,354.74,340.84,346.34,354.27,358.42,346.79,351.98,359.58,363.38,351.38,356.17,363.35,366.72,354.28,358.61,365.33,368.23,365.3,369.15,375.38,377.78,364.37,367.74,373.49,375.43,361.56,364.48,369.8,371.32,357.05,349.59,354.55,355.74,341.16,343.41,348.11,349.06,334.28,336.36,340.91,341.75];
  var hunanJiangyaDayAhead = [347.42,347.78,343.92,345.25,341.58,341.91,338.06,339.42,335.8,336.21,332.46,333.95,330.48,333.09,331.55,335.26,334,336.78,335.39,339.24,338.1,340.98,339.68,343.59,342.5,345.41,344.12,348.02,353.9,356.76,355.41,359.22,358,360.74,359.25,362.91,361.52,364.08,362.39,365.83,364.22,359.55,357.61,360.8,358.92,360.97,358.75,361.66,359.5,361.26,358.75,361.37,358.92,360.4,357.61,359.95,357.22,358.43,355.39,357.48,354.52,357.54,356.3,360.19,359.02,361.78,360.27,363.88,362.4,364.84,362.99,366.25,374.42,376.5,374.28,377.16,374.95,376.64,374.03,376.54,373.94,375.26,372.29,374.42,371.48,362.45,359.15,360.97,357.72,358.41,354.83,356.41,352.93,353.4,349.64,351.04];
  var hunanJiangyaRealTime = [333.48,335.63,338.68,339.56,326.56,328.79,331.96,332.98,320.16,325.01,330.82,334.49,324.3,329.35,335.35,339.17,329.12,334.3,340.39,344.29,334.3,339.51,345.61,349.5,339.48,344.63,350.65,354.45,351.3,356.31,362.18,365.79,355.44,360.24,365.87,369.23,358.62,363.14,368.48,371.54,360.62,357.82,362.83,365.56,354.3,358.16,362.83,365.22,353.62,357.14,361.48,363.54,351.62,354.83,358.87,360.64,348.44,353.81,360,363.93,353.88,358.94,364.81,368.39,357.98,362.66,368.13,371.3,360.46,364.71,369.74,372.46,371.17,374.96,379.53,381.79,370.04,373.38,377.51,379.33,367.16,370.08,373.82,375.26,362.72,355.3,358.71,359.85,347.02,349.35,352.53,353.46,340.46,342.64,345.7,346.54];
  var hunanChangshaDayAhead = [356.26,356.38,352.48,353.77,349.45,349.53,345.62,346.93,342.66,342.83,339.03,340.47,336.36,339.07,337.83,341.84,340.3,343.2,342.13,346.29,344.88,347.89,346.92,351.16,349.8,352.84,351.88,356.11,361.72,364.71,363.67,367.8,366.3,369.16,367.97,371.93,370.24,372.88,371.47,375.2,373.25,368.64,366.95,370.39,368.15,370.23,368.24,371.36,368.8,370.56,368.24,371.03,368.15,369.59,366.95,369.44,366.25,367.4,364.47,366.68,363.24,366.48,365.67,369.98,368.62,371.58,370.45,374.43,372.72,375.31,373.8,377.38,385.26,387.42,385.48,388.63,386.06,387.78,385.39,388.09,385.07,386.35,383.53,385.8,382.36,373.24,370.02,371.91,368.12,368.65,365.11,366.7,362.62,362.9,359.12,360.51];
  var hunanChangshaRealTime = [343.45,345,347.26,348.05,335.76,337.41,339.8,340.74,328.64,333.19,338.51,342.38,333.2,337.97,343.48,347.53,338.51,343.41,349.03,353.16,344.2,349.14,354.77,358.89,349.89,354.77,360.32,364.33,362.2,366.92,372.29,376.11,366.76,371.24,376.35,379.89,370.25,374.43,379.23,382.43,372.45,369.28,373.71,376.55,366.2,369.65,373.71,376.18,365.45,368.53,372.23,374.33,363.25,365.99,369.35,371.14,359.76,364.89,370.64,374.82,365.81,370.61,376.01,379.81,370.39,374.77,379.73,383.07,373.19,377.09,381.56,384.4,384.01,387.4,391.36,393.69,382.8,385.69,389.16,391.01,379.64,382.07,385.1,386.52,374.75,366.79,369.45,370.54,358.46,360.21,362.62,363.47,351.19,352.78,355.05,355.8];
  var hunanTradingDayAheadPrice = [348.25,347.4,344.79,334.78,334.9,342.4,366.48,364.9,366.42,374.4,380,377.02,376.32,381.4,383.62,377.02,378.91,386.4,390.69,385.68,382.36,384.4,383.38,373.56];
  var hunanTradingRealTimePrice = [343.6,328.6,328.21,335.37,329.3,340.24,363.6,360.36,370.8,378.83,371.89,380.29,381.6,373.09,377.39,387.11,381.3,390.19,391.31,381.95,384.8,384.28,368.42,368.14];
  var hunanTradingDayAheadVolume = [287.73,281.94,276.18,271.62,268.44,266.85,272.36,289.41,314.86,342.27,365.72,379.64,384.95,377.42,361.88,349.34,356.72,374.61,397.83,416.45,424.62,409.38,374.26,331.54];
  var hunanTradingRealTimeVolume = [281.66,277.52,272.34,269.18,265.71,263.92,270.48,286.37,309.42,337.16,359.83,372.58,378.41,370.35,356.92,345.08,351.67,369.24,392.71,409.96,418.37,402.55,368.92,326.88];

  var shaanxiProvinceDayAhead = [338.66,339.41,336.54,337.76,332.77,333.49,330.62,331.86,326.93,327.72,324.94,326.31,321.52,324.52,323.97,327.57,325,328.17,327.77,331.5,329.05,332.32,332.01,335.8,333.4,336.7,336.39,340.18,344.75,348,347.63,351.33,348.8,351.93,351.43,354.98,352.28,355.23,354.53,357.87,354.95,350.67,349.72,352.81,349.63,352.08,350.86,353.66,350.2,352.36,350.86,353.38,349.63,351.51,349.72,351.97,347.95,349.57,347.53,349.53,345.28,348.72,348.5,352.32,349.88,353.06,352.57,356.1,353.35,356.21,355.39,358.57,365.46,367.96,366.76,369.56,366.07,368.18,366.6,369.01,365.14,366.87,364.91,366.96,362.72,354.1,351.8,353.53,348.99,350.08,347.5,348.97,344.19,345.06,342.3,343.59];
  var shaanxiProvinceRealTime = [344.47,335.93,340,341.98,337.98,329.51,333.68,335.8,331.96,325.93,332.56,337.13,335.75,329.91,336.7,341.42,340.16,334.43,341.31,346.1,344.9,339.2,346.09,350.87,349.64,343.88,350.7,355.39,361.05,355.17,361.84,366.37,364.84,358.76,365.22,369.52,367.75,361.41,367.61,371.63,369.58,355.95,361.84,365.56,363.2,356.26,361.84,365.25,362.58,355.33,360.61,363.71,360.75,353.22,358.22,361.06,357.84,352.32,359.34,364.2,362.98,357.18,363.91,368.44,366.89,360.74,367.09,371.24,369.3,362.74,368.68,372.42,380.04,373.06,378.57,381.88,379.07,371.67,376.76,379.66,376.46,368.67,373.39,375.92,372.38,354.26,358.67,360.91,357.1,348.74,352.93,354.98,351,342.49,346.56,348.52];
  var shaanxiYantaDayAhead = [345.22,345.96,342.78,343.99,338.89,339.59,336.39,337.61,332.55,333.31,330.21,331.55,326.64,329.76,329.03,332.74,330.2,333.49,332.92,336.77,334.35,337.74,337.25,341.18,338.8,342.22,341.75,345.66,350.25,353.63,353.08,356.91,354.4,357.66,356.97,360.64,357.96,361.03,360.15,363.6,360.7,356.53,355.39,358.59,355.41,357.97,356.55,359.46,356,358.26,356.55,359.17,355.41,357.39,355.39,357.73,353.7,355.4,353.15,355.23,350.96,354.63,354.33,358.37,356.04,359.44,358.86,362.6,359.95,363.01,362.08,365.45,372.42,375.09,373.75,376.72,373.27,375.53,373.78,376.32,372.46,374.3,372.14,374.29,370.04,361.5,358.97,360.76,356.17,357.3,354.47,355.97,351.11,352,348.95,350.25];
  var shaanxiYantaRealTime = [351.05,342.59,346.34,348.4,344.08,335.7,339.55,341.75,337.59,331.81,338.27,343.09,341.55,335.95,342.59,347.56,346.16,340.67,347.41,352.45,351.1,345.65,352.39,357.43,356.04,350.54,357.21,362.15,367.65,362.01,368.53,373.29,371.61,365.76,372.05,376.58,374.64,368.53,374.55,378.79,376.55,363.13,368.84,372.76,370.2,363.46,368.84,372.43,369.55,362.49,367.55,370.83,367.64,360.28,365.05,368.06,364.61,359.4,366.33,371.49,370.17,364.68,371.29,376.12,374.44,368.57,374.8,379.21,377.12,370.82,376.6,380.57,388.03,381.27,386.59,390.1,387.1,379.88,384.76,387.83,384.39,376.76,381.23,383.91,380.1,362.12,366.25,368.62,364.52,356.27,360.16,362.31,358.02,349.6,353.37,355.41];
  var shaanxiYulinDayAhead = [331.32,332.19,329.44,330.89,325.92,326.77,324.02,325.48,320.57,321.47,318.82,320.39,315.61,318.55,317.93,321.54,318.8,321.89,321.41,325.15,322.51,325.7,325.29,329.09,326.5,329.71,329.31,333.1,337.49,340.65,340.19,343.91,341.2,344.26,343.67,347.25,344.39,347.28,346.52,349.9,346.84,342.51,341.53,344.68,341.38,343.8,342.57,345.47,341.9,344.07,342.57,345.2,341.38,343.28,341.53,343.91,339.84,341.5,339.52,341.68,337.39,340.72,340.41,344.24,341.6,344.7,344.14,347.7,344.79,347.59,346.72,349.96,356.72,359.2,357.98,360.88,357.28,359.4,357.83,360.37,356.43,358.19,356.28,358.48,354.21,345.66,343.44,345.35,340.79,341.97,339.5,341.17,336.39,337.38,334.72,336.24];
  var shaanxiYulinRealTime = [336.99,328.55,332.63,334.72,330.94,322.58,326.76,328.97,325.34,319.26,325.73,330.24,328.9,322.99,329.62,334.27,333.05,327.24,333.95,338.68,337.5,331.72,338.45,343.16,341.95,336.13,342.78,347.41,353.1,347.16,353.67,358.14,356.66,350.53,356.85,361.1,359.4,353.03,359.09,363.09,361.11,347.47,353.25,356.96,354.7,347.76,353.25,356.67,354.11,346.89,352.09,355.23,352.4,344.9,349.85,352.73,349.66,344.05,350.87,355.64,354.43,348.56,355.1,359.57,358.05,351.84,358.05,362.16,360.27,353.68,359.5,363.22,370.93,363.95,369.37,372.68,370,362.63,367.65,370.59,367.54,359.8,364.48,367.08,363.71,345.66,350.06,352.39,348.77,340.5,344.69,346.85,343.07,334.67,338.75,340.82];
  var shaanxiTradingDayAheadPrice = [313.17,312.1,309.7,300.71,300.71,307.1,330.49,329.1,330.31,337.1,342.09,339.49,338.79,343.1,345.19,339.49,341.38,348.1,352.26,348.15,345.34,347.1,346.37,337.76];
  var shaanxiTradingRealTimePrice = [322.4,306.39,308.34,314.29,307.9,319.16,342.4,336.74,348.2,354.91,347.76,356.75,358.4,348.05,354.06,362.16,355.9,365.24,366.65,355.5,360.2,359.33,344.29,345.64];
  var shaanxiTradingDayAheadVolume = [248.62,242.87,237.45,233.16,230.52,229.18,235.74,251.33,276.48,304.72,329.65,344.18,350.92,344.56,331.27,319.84,326.35,342.91,365.28,384.13,391.76,377.28,342.46,301.52];
  var shaanxiTradingRealTimeVolume = [244.18,239.54,234.22,230.85,227.96,226.88,232.91,248.72,271.34,298.65,323.48,337.76,344.11,337.05,325.83,315.26,321.47,337.62,359.74,377.86,386.92,371.54,337.18,296.94];

  var nodePriceMockByCenter = {
    guangdong: buildCenterNodePrice("guangdong", [
      buildNode("全省", "全省", gdTimeLabels, gdProvinceDayAhead, gdProvinceRealTime),
      buildNode(
        "广东.横琴站/220kV.Ⅰ母",
        "其他",
        gdTimeLabels,
        getSourceNodeValues(gdNodeDayAhead, 2, gdProvinceDayAhead),
        getSourceNodeValues(gdNodeRealTime, 2, gdProvinceRealTime),
      ),
      buildNode(
        "广东.狮洋站/500kV.Ⅱ母",
        "其他",
        gdTimeLabels,
        getSourceNodeValues(gdNodeDayAhead, 4, gdProvinceDayAhead),
        getSourceNodeValues(gdNodeRealTime, 4, gdProvinceRealTime),
      ),
    ]),
    hunan: buildCenterNodePrice("hunan", [
      buildNode("全省", "全省", NODE_PRICE_TIMES_96, hunanProvinceDayAhead, hunanProvinceRealTime),
      buildNode("湖南.江垭A2厂/220kV.Ⅱ母", "其他", NODE_PRICE_TIMES_96, hunanJiangyaDayAhead, hunanJiangyaRealTime),
      buildNode("湖南.长沙东站/500kV.Ⅰ母", "其他", NODE_PRICE_TIMES_96, hunanChangshaDayAhead, hunanChangshaRealTime),
    ]),
    shaanxi: buildCenterNodePrice("shaanxi", [
      buildNode("全省", "全省", NODE_PRICE_TIMES_96, shaanxiProvinceDayAhead, shaanxiProvinceRealTime),
      buildNode("陕西.雁塔变/330kV.Ⅰ母", "其他", NODE_PRICE_TIMES_96, shaanxiYantaDayAhead, shaanxiYantaRealTime),
      buildNode("陕西.榆林北变/330kV.Ⅱ母", "其他", NODE_PRICE_TIMES_96, shaanxiYulinDayAhead, shaanxiYulinRealTime),
    ]),
  };

  var tradingResultMockByCenter = {
    guangdong: buildCenterTradingResult(
      "guangdong",
      buildTradingPoints(gdPlaceholderDayAheadVolume, gdPlaceholderRealTimeVolume, gdSettlementDayAhead, gdSettlementRealTime),
    ),
    hunan: buildCenterTradingResult(
      "hunan",
      buildTradingPoints(hunanTradingDayAheadVolume, hunanTradingRealTimeVolume, hunanTradingDayAheadPrice, hunanTradingRealTimePrice),
    ),
    shaanxi: buildCenterTradingResult(
      "shaanxi",
      buildTradingPoints(shaanxiTradingDayAheadVolume, shaanxiTradingRealTimeVolume, shaanxiTradingDayAheadPrice, shaanxiTradingRealTimePrice),
    ),
  };

  global.nodePriceMockByCenter = nodePriceMockByCenter;
  global.tradingResultMockByCenter = tradingResultMockByCenter;
  global.aggregateNodePrice96To24 = aggregateNodePrice96To24;
  global.BOSS_NODE_PRICE_MOCK_BY_CENTER = nodePriceMockByCenter;
  global.BOSS_TRADING_RESULT_MOCK_BY_CENTER = tradingResultMockByCenter;
})(window);
