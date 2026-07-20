(function attachRollingMarket(global) {
  "use strict";

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatDate(date) {
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate())
    );
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

  function buildTimeLabels(stepMinutes, count) {
    return Array.from({ length: count }, function createLabel(_, index) {
      var totalMinutes = index * stepMinutes;
      var hour = Math.floor(totalMinutes / 60);
      var minute = totalMinutes % 60;
      if (totalMinutes === 24 * 60) {
        return "24:00";
      }
      return pad(hour) + ":" + pad(minute);
    });
  }

  function buildRollingTradeDates(baseDate, count) {
    var base = new Date(baseDate + "T00:00:00");
    var result = [];
    // 滚搓：以交易日期为基点，从 T+2 起向后取连续 count 个日历日（贴合录屏 7-17→7-19/20/21/22）
    for (var index = 0; index < count; index++) {
      var cursor = new Date(base.getTime());
      cursor.setDate(base.getDate() + 2 + index);
      result.push(formatDate(cursor));
    }
    return result;
  }

  function buildRollingTimeLabels() {
    return buildTimeLabels(60, 24).concat("24:00");
  }

  var SERIES_COLORS = ["#1677FF", "#52C41A", "#FA8C16", "#722ED1"];

  function buildRollingPriceSeries(rollingDates, basePrice, role, cap) {
    return rollingDates.map(function mapDate(date, dateIndex) {
      var dayIndex = dateIndex + 1;
      var values = buildRollingTimeLabels().map(function createValue(label, hour) {
        var daytime = Math.max(0, Math.sin(((hour - 7) / 24) * Math.PI * 2)) * 14;
        var peak = Math.max(0, Math.sin(((hour - 15) / 24) * Math.PI * 2)) * 22;
        var roleOffset = role === "seller" ? 4.5 : -4.5;
        var noise = ((hour % 3) - 1) * 3.2;
        var raw = basePrice + dayIndex * 2.4 + roleOffset + daytime + peak + noise;
        return round(Math.min(cap, Math.max(cap - 180, raw)));
      });
      return {
        date: date,
        color: SERIES_COLORS[dateIndex % SERIES_COLORS.length],
        values: values,
      };
    });
  }

  function buildRollingVolumeSeries(rollingDates, baseVolume, role) {
    return rollingDates.map(function mapDate(date, dateIndex) {
      var dayIndex = dateIndex + 1;
      var values = buildRollingTimeLabels().map(function createValue(label, hour) {
        var daytime = Math.max(0, Math.sin(((hour - 8) / 24) * Math.PI * 2)) * 38;
        var evening = Math.max(0, Math.sin(((hour - 18) / 24) * Math.PI * 2)) * 52;
        var roleOffset = role === "seller" ? -8 : 14;
        var noise = ((hour % 4) - 1.5) * 6;
        var raw = baseVolume + dayIndex * 5 + roleOffset + daytime + evening + noise;
        return round(Math.max(0.1, raw));
      });
      return {
        date: date,
        color: SERIES_COLORS[dateIndex % SERIES_COLORS.length],
        values: values,
      };
    });
  }

  function buildRollingSeriesStats(seriesList) {
    if (!seriesList.length) {
      return { mean: 0, high: 0, low: 0 };
    }
    var all = seriesList.reduce(function collect(out, series) {
      return out.concat(series.values);
    }, []);
    return {
      mean: average(all),
      high: round(Math.max.apply(null, all)),
      low: round(Math.min.apply(null, all)),
    };
  }

  function buildRollingDailySummary(rollingDates, priceSeller, priceBuyer, volSeller, volBuyer) {
    var summary = {};
    rollingDates.forEach(function each(date, dateIndex) {
      var sellerPriceVals = priceSeller[dateIndex].values;
      var buyerPriceVals = priceBuyer[dateIndex].values;
      var sellerVolVals = volSeller[dateIndex].values;
      var buyerVolVals = volBuyer[dateIndex].values;
      var allPrice = sellerPriceVals.concat(buyerPriceVals);
      summary[date] = {
        sellerPriceMean: average(sellerPriceVals),
        buyerPriceMean: average(buyerPriceVals),
        priceHigh: round(Math.max.apply(null, allPrice)),
        priceLow: round(Math.min.apply(null, allPrice)),
        sellerVolumeMean: average(sellerVolVals),
        buyerVolumeMean: average(buyerVolVals),
        volumeHigh: round(Math.max.apply(null, sellerVolVals.concat(buyerVolVals))),
        volumeLow: round(Math.min.apply(null, sellerVolVals.concat(buyerVolVals))),
      };
    });
    return summary;
  }

  function buildRollingMarketVolume(totalVolume, yMax) {
    var values = buildRollingTimeLabels().map(function createValue(label, hour) {
      var ramp = hour < 8 ? 0.18 : hour < 18 ? 0.62 : 0.32;
      return round((totalVolume * ramp) / 24 * (1 + ((hour % 3) - 1) * 0.08));
    });
    return { values: values, total: totalVolume, yMax: yMax };
  }

  function buildRollingMarketPrice(latest, yMax) {
    var values = buildRollingTimeLabels().map(function createValue(label, hour) {
      var wave = Math.max(0, Math.sin(((hour - 9) / 24) * Math.PI * 2)) * 6;
      return round(latest - 8 + wave + ((hour % 4) - 1.5) * 2);
    });
    return { values: values, latest: latest, yMax: yMax };
  }

  function buildRollingDailyMarket(tradeDate, basePrice, cap, baseVolume) {
    var rollingDates = buildRollingTradeDates(tradeDate, 4);
    var priceSeller = buildRollingPriceSeries(rollingDates, basePrice, "seller", cap);
    var priceBuyer = buildRollingPriceSeries(rollingDates, basePrice, "buyer", cap);
    var volSeller = buildRollingVolumeSeries(rollingDates, baseVolume, "seller");
    var volBuyer = buildRollingVolumeSeries(rollingDates, baseVolume, "buyer");
    var summary = buildRollingDailySummary(rollingDates, priceSeller, priceBuyer, volSeller, volBuyer);
    return {
      tradeDate: tradeDate,
      rollingDates: rollingDates,
      timeLabels: buildRollingTimeLabels(),
      price: {
        seller: Object.assign({ series: priceSeller }, buildRollingSeriesStats(priceSeller)),
        buyer: Object.assign({ series: priceBuyer }, buildRollingSeriesStats(priceBuyer)),
        summary: summary,
      },
      volume: {
        seller: Object.assign({ series: volSeller }, buildRollingSeriesStats(volSeller)),
        buyer: Object.assign({ series: volBuyer }, buildRollingSeriesStats(volBuyer)),
        summary: summary,
      },
      rolling: {
        tradeVolume: buildRollingMarketVolume(1327.6, 5000),
        tradePrice: buildRollingMarketPrice(350, 400),
      },
    };
  }

  function buildRollingWeeklyDates(start, count) {
    var base = new Date(start + "T00:00:00");
    var result = [];
    for (var index = 0; index < count; index++) {
      var next = new Date(base.getTime());
      next.setDate(base.getDate() + index * 7);
      result.push(formatDate(next));
    }
    return result;
  }

  function buildRollingMultiDay(basePrice, cap) {
    var weeklyDates = buildRollingWeeklyDates("2026-04-11", 14);
    var kline = weeklyDates.map(function mapDate(date, index) {
      var open = round(basePrice + Math.sin(index) * 18 + (index % 3) * 4);
      var close = round(open + ((index % 2) - 0.5) * 12);
      var high = round(Math.min(cap, Math.max(open, close) + 6 + (index % 4) * 2));
      var low = round(Math.max(cap - 180, Math.min(open, close) - 8 - (index % 3) * 3));
      var avg = round((open + close + high + low) / 4 + (index % 2) * 0.3);
      return { date: date, open: open, close: close, low: low, high: high, avg: avg };
    });
    var volume = weeklyDates.map(function mapDate(date, index) {
      return { date: date, volume: Math.round(1800 + Math.sin(index) * 600 + (index % 4) * 220) };
    });
    return { weeklyDates: weeklyDates, kline: kline, volume: volume };
  }

  global.BOSS_ROLLING_MARKET = {
    buildRollingDailyMarket: buildRollingDailyMarket,
    buildRollingMultiDay: buildRollingMultiDay,
    buildRollingTradeDates: buildRollingTradeDates,
  };
})(window);
