(function attachChartWithMarks(global) {
  function averageOf(values) {
    return values.reduce(function sum(acc, value) {
      return acc + value;
    }, 0) / values.length;
  }

  function formatInteger(value) {
    return String(Math.round(value));
  }

  function getAxisBase(maxValue) {
    if (maxValue >= 100000) {
      return 20000;
    }
    if (maxValue >= 10000) {
      return 2000;
    }
    if (maxValue >= 1000) {
      return 200;
    }
    if (maxValue >= 200) {
      return 50;
    }
    if (maxValue >= 50) {
      return 10;
    }
    if (maxValue >= 10) {
      return 5;
    }
    return 1;
  }

  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderChartWithMarks = function renderChartWithMarks(options) {
    var escapeHtml = options.escapeHtml;
    var renderEmptyState = options.renderEmptyState;
    var width = 1040;
    var height = 360;
    var margin = { top: 26, right: 38, bottom: 50, left: 64 };
    var innerWidth = width - margin.left - margin.right;
    var innerHeight = height - margin.top - margin.bottom;
    var seriesList = options.series || [];
    var hiddenSeries = options.hiddenSeries || {};
    var xLabelEvery = options.xLabelEvery || 1;
    var legendHtml = options.hideLegend
      ? ""
      : '<div class="chart-legend chart-legend-buttoned">' +
        seriesList
          .map(function mapLegend(series) {
            return (
              '<button class="legend-toggle ' +
              (hiddenSeries[series.id] ? "muted" : "") +
              '" data-chart-id="' +
              escapeHtml(options.chartId) +
              '" data-chart-legend="' +
              escapeHtml(series.id) +
              '">' +
              '<span class="legend-swatch" style="background:' +
              escapeHtml(series.color) +
              ';"></span>' +
              escapeHtml(series.label) +
              "</button>"
            );
          })
          .join("") +
        "</div>";
    var visibleSeries = seriesList.filter(function filterSeries(item) {
      return !hiddenSeries[item.id];
    });

    if (!visibleSeries.length) {
      return (
        legendHtml +
        renderEmptyState({
          escapeHtml: escapeHtml,
          renderIcon: options.renderIcon,
          message: options.emptyMessage || "当前图表暂无可展示序列，请重新选择图例。",
        })
      );
    }

    var values = [];
    var maxPoint = null;
    var minPoint = null;

    visibleSeries.forEach(function eachSeries(series) {
      series.values.forEach(function eachValue(value, index) {
        if (value === null || typeof value !== "number") {
          return;
        }
        values.push(value);
        if (!maxPoint || value > maxPoint.value) {
          maxPoint = { value: value, index: index };
        }
        if (!minPoint || value < minPoint.value) {
          minPoint = { value: value, index: index };
        }
      });
    });

    var maxValue = Math.max.apply(null, values);
    var axisBase = getAxisBase(maxValue);
    var roundedMax = Math.max(axisBase, Math.ceil((maxValue * 1.12) / axisBase) * axisBase);
    var yTicks = Array.from({ length: 6 }, function createTick(_, index) {
      return Math.round((roundedMax / 5) * index);
    });
    var xStep = options.labels.length > 1 ? innerWidth / (options.labels.length - 1) : 0;
    var avgValue = averageOf(values);

    function xToPx(index) {
      if (options.labels.length <= 1) {
        return margin.left + innerWidth / 2;
      }
      return margin.left + index * xStep;
    }

    function yToPx(value) {
      return margin.top + innerHeight - (value / roundedMax) * innerHeight;
    }

    function buildPolyline(series) {
      return series.values
        .map(function mapValue(value, index) {
          if (value === null || typeof value !== "number") {
            return null;
          }
          return xToPx(index) + "," + yToPx(value);
        })
        .filter(Boolean)
        .join(" ");
    }

    var gridLines = yTicks
      .map(function mapTick(tick) {
        var y = yToPx(tick);
        return (
          '<line class="grid-line" x1="' +
          margin.left +
          '" x2="' +
          (width - margin.right) +
          '" y1="' +
          y +
          '" y2="' +
          y +
          '"></line><text class="axis-label" x="' +
          (margin.left - 10) +
          '" y="' +
          (y + 4) +
          '" text-anchor="end">' +
          formatInteger(tick) +
          "</text>"
        );
      })
      .join("");

    var verticalLines = options.labels
      .map(function mapLabel(label, index) {
        if (index % xLabelEvery !== 0 && index !== options.labels.length - 1) {
          return "";
        }
        var x = xToPx(index);
        return (
          '<line class="grid-line grid-line-vertical" x1="' +
          x +
          '" x2="' +
          x +
          '" y1="' +
          margin.top +
          '" y2="' +
          (margin.top + innerHeight) +
          '"></line><text class="time-label" x="' +
          x +
          '" y="' +
          (height - 14) +
          '" text-anchor="middle">' +
          escapeHtml(label) +
          "</text>"
        );
      })
      .join("");

    var hitAreas = options.labels
      .map(function mapLabel(label, index) {
        var tooltip = options.tooltipFormatter
          ? options.tooltipFormatter(label, index, visibleSeries)
          : visibleSeries
              .map(function mapSeries(series) {
                var value = series.values[index];
                return series.label + ": " + (value === null ? "--" : formatInteger(value));
              })
              .join(" | ");
        return (
          '<rect class="chart-hit-rect" x="' +
          (xToPx(index) - (options.labels.length > 1 ? xStep / 2 : innerWidth / 2)) +
          '" y="' +
          margin.top +
          '" width="' +
          (options.labels.length > 1 ? xStep : innerWidth) +
          '" height="' +
          innerHeight +
          '"><title>' +
          escapeHtml(label + " " + tooltip) +
          "</title></rect>"
        );
      })
      .join("");

    var seriesLines = visibleSeries
      .map(function mapSeries(series) {
        return (
          '<polyline class="custom-chart-line" points="' +
          buildPolyline(series) +
          '" style="stroke:' +
          series.color +
          ';"></polyline>'
        );
      })
      .join("");

    return (
      legendHtml +
      '<div class="chart-canvas"><div class="chart-unit">' +
      escapeHtml(options.unit || "") +
      '</div><svg class="line-chart" viewBox="0 0 ' +
      width +
      " " +
      height +
      '" aria-label="' +
      escapeHtml(options.title) +
      '趋势图">' +
      gridLines +
      verticalLines +
      hitAreas +
      '<line class="avg-line" x1="' +
      margin.left +
      '" x2="' +
      (width - margin.right) +
      '" y1="' +
      yToPx(avgValue) +
      '" y2="' +
      yToPx(avgValue) +
      '"></line><text class="avg-label" x="' +
      (width - margin.right - 8) +
      '" y="' +
      (yToPx(avgValue) - 8) +
      '" text-anchor="end">均值 ' +
      avgValue.toFixed(1) +
      "</text>" +
      '<text class="point-label point-label-max" x="' +
      xToPx(maxPoint.index) +
      '" y="' +
      (yToPx(maxPoint.value) - 12) +
      '" text-anchor="middle">最大值 ' +
      formatInteger(maxPoint.value) +
      "</text>" +
      '<text class="point-label point-label-min" x="' +
      xToPx(minPoint.index) +
      '" y="' +
      (yToPx(minPoint.value) + 18) +
      '" text-anchor="middle">最小值 ' +
      formatInteger(minPoint.value) +
      "</text>" +
      seriesLines +
      "</svg></div>"
    );
  };
})(window);
