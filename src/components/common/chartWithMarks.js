(function attachChartWithMarks(global) {
  function averageOf(values) {
    return values.reduce(function sum(acc, value) {
      return acc + value;
    }, 0) / values.length;
  }

  function formatInteger(value) {
    return String(Math.round(value));
  }

  function formatValue(value, formatter) {
    if (!isRenderableNumber(value)) {
      return "--";
    }
    if (typeof formatter === "function") {
      return formatter(value);
    }
    return formatInteger(value);
  }

  function isRenderableNumber(value) {
    return typeof value === "number" && !Number.isNaN(value);
  }

  function stripHtml(value) {
    return String(value || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function sanitizeChartId(value) {
    return String(value || "echarts-chart").replace(/[^\w-]/g, "-");
  }

  function normalizeSeriesData(values) {
    return (values || []).map(function mapValue(value) {
      return isRenderableNumber(value) ? value : null;
    });
  }

  function formatTooltipText(value, escapeHtml) {
    return escapeHtml(String(value || "")).replace(/\n/g, "<br />");
  }

  function buildAxisLabelInterval(labels, every) {
    var labelEvery = every || 1;
    return function showAxisLabel(index) {
      return index % labelEvery === 0 || index === labels.length - 1;
    };
  }

  function createEchartsLineOption(options, visibleSeries, valueFormatter) {
    var escapeHtml = options.escapeHtml;
    var labels = options.labels || [];
    var enableDataZoom = options.enableTimeZoom || labels.length > 48;

    return {
      animationDuration: 450,
      color: visibleSeries.map(function mapColor(series) {
        return series.color;
      }),
      grid: {
        top: 34,
        right: 36,
        bottom: enableDataZoom ? 74 : 42,
        left: 58,
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        confine: true,
        appendToBody: true,
        className: "boss-echarts-tooltip",
        formatter: function formatTooltip(params) {
          var dataIndex = params && params.length ? params[0].dataIndex : 0;
          var label = labels[dataIndex] || "";
          var tooltip = options.tooltipFormatter
            ? options.tooltipFormatter(label, dataIndex, visibleSeries)
            : visibleSeries
                .map(function mapSeries(series) {
                  var value = series.values[dataIndex];
                  return series.label + ": " + formatValue(value, valueFormatter);
                })
                .join("\n");

          if (options.tooltipIsHtml) {
            return tooltip;
          }
          return formatTooltipText(label + "\n" + tooltip, escapeHtml);
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: labels,
        axisLabel: {
          color: "#718096",
          interval: buildAxisLabelInterval(labels, options.xLabelEvery),
        },
        axisLine: {
          lineStyle: { color: "#D8E0EC" },
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        name: "",
        nameTextStyle: {
          color: "#718096",
          fontWeight: 700,
          padding: [0, 0, 0, 4],
        },
        axisLabel: {
          color: "#718096",
          formatter: function formatAxisLabel(value) {
            return formatValue(value, valueFormatter);
          },
        },
        splitLine: {
          lineStyle: { color: "#ECF1F7" },
        },
      },
      dataZoom: enableDataZoom
        ? [
            {
              type: "inside",
              throttle: 40,
            },
            {
              type: "slider",
              height: 18,
              bottom: 16,
              borderColor: "#D8E0EC",
              fillerColor: "rgba(22, 119, 255, 0.14)",
              handleStyle: { color: "#1677FF" },
              textStyle: { color: "#718096" },
            },
          ]
        : [],
      series: visibleSeries.map(function mapSeries(series) {
        return {
          name: series.label,
          type: "line",
          data: normalizeSeriesData(series.values),
          connectNulls: !options.breakOnNull,
          showSymbol: labels.length <= 48,
          symbol: "circle",
          symbolSize: 5,
          smooth: false,
          lineStyle: {
            width: 2.6,
            type: series.dasharray ? "dashed" : "solid",
          },
          itemStyle: {
            color: series.color,
          },
          emphasis: {
            focus: "series",
          },
          markPoint: {
            symbolSize: 48,
            label: {
              formatter: function formatMarkPoint(params) {
                return params.name === "最大值" ? "最大" : "最小";
              },
            },
            data: [
              { type: "max", name: "最大值" },
              { type: "min", name: "最小值" },
            ],
          },
          markLine: {
            symbol: "none",
            lineStyle: {
              color: series.color,
              type: "dashed",
              opacity: 0.35,
            },
            label: {
              formatter: function formatAverageMark(params) {
                return "均值 " + formatValue(params.value, valueFormatter);
              },
            },
            data: [{ type: "average", name: "均值" }],
          },
        };
      }),
    };
  }

  function registerEchartsOption(chartId, option) {
    global.BOSS_ECHARTS_OPTIONS = global.BOSS_ECHARTS_OPTIONS || {};
    global.BOSS_ECHARTS_OPTIONS[chartId] = option;
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

  global.document.addEventListener("input", function handleChartTimeZoom(event) {
    var target = event.target;
    if (!target || !target.matches || !target.matches("[data-chart-zoom]")) {
      return;
    }

    var canvas = target.closest(".chart-canvas");
    var viewport = canvas ? canvas.querySelector("[data-chart-viewport]") : null;
    if (!viewport) {
      return;
    }

    var ratio = Math.max(0, Math.min(100, Number(target.value) || 0)) / 100;
    var maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    viewport.scrollLeft = maxScroll * ratio;
  });

  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.resetEchartsOptions = function resetEchartsOptions() {
    global.BOSS_ECHARTS_OPTIONS = {};
  };
  global.BOSS_COMPONENTS.disposeEchartsCharts = function disposeEchartsCharts() {
    var instances = global.BOSS_ECHARTS_INSTANCES || {};
    Object.keys(instances).forEach(function eachInstance(chartId) {
      if (instances[chartId] && typeof instances[chartId].dispose === "function") {
        instances[chartId].dispose();
      }
    });
    global.BOSS_ECHARTS_INSTANCES = {};
  };
  global.BOSS_COMPONENTS.renderEchartsChart = function renderEchartsChart(options) {
    var escapeHtml = options.escapeHtml;
    var chartId = sanitizeChartId(options.chartId);
    var height = options.height || 360;
    registerEchartsOption(chartId, options.option || {});

    return (
      '<div class="chart-canvas echarts-chart-canvas">' +
      (options.unit ? '<div class="chart-unit">' + escapeHtml(options.unit) + "</div>" : "") +
      (options.rightUnit ? '<div class="chart-unit chart-unit-right">' + escapeHtml(options.rightUnit) + "</div>" : "") +
      '<div class="echarts-chart" data-echarts-chart="' +
      escapeHtml(chartId) +
      '" style="height:' +
      height +
      'px" role="img" aria-label="' +
      escapeHtml(options.title || "趋势图") +
      '"></div></div>'
    );
  };
  global.BOSS_COMPONENTS.initEchartsCharts = function initEchartsCharts() {
    var charts = Array.from(global.document.querySelectorAll("[data-echarts-chart]"));
    var optionsMap = global.BOSS_ECHARTS_OPTIONS || {};
    var instances = global.BOSS_ECHARTS_INSTANCES || {};

    if (!global.echarts) {
      charts.forEach(function showMissingEcharts(element) {
        element.innerHTML = '<div class="echarts-chart-error">Apache ECharts 组件加载失败</div>';
      });
      return;
    }

    charts.forEach(function eachChart(element) {
      var chartId = element.getAttribute("data-echarts-chart");
      var option = optionsMap[chartId];
      if (!chartId || !option) {
        return;
      }
      if (instances[chartId] && typeof instances[chartId].dispose === "function") {
        instances[chartId].dispose();
      }
      instances[chartId] = global.echarts.init(element, null, { renderer: "canvas" });
      instances[chartId].setOption(option, true);
    });

    global.BOSS_ECHARTS_INSTANCES = instances;
  };

  if (!global.BOSS_ECHARTS_RESIZE_BOUND) {
    global.addEventListener("resize", function resizeEchartsCharts() {
      var instances = global.BOSS_ECHARTS_INSTANCES || {};
      Object.keys(instances).forEach(function eachInstance(chartId) {
        if (instances[chartId] && typeof instances[chartId].resize === "function") {
          instances[chartId].resize();
        }
      });
    });
    global.BOSS_ECHARTS_RESIZE_BOUND = true;
  }

  global.BOSS_COMPONENTS.renderChartWithMarks = function renderChartWithMarks(options) {
    var escapeHtml = options.escapeHtml;
    var renderEmptyState = options.renderEmptyState;
    var height = 360;
    var margin = { top: 26, right: 38, bottom: 50, left: 64 };
    var baseWidth = 1040;
    var width = options.enableTimeZoom ? Math.max(baseWidth, (options.labels || []).length * (options.zoomPointWidth || 18) + margin.left + margin.right) : baseWidth;
    var innerWidth = width - margin.left - margin.right;
    var innerHeight = height - margin.top - margin.bottom;
    var seriesList = options.series || [];
    var hiddenSeries = options.hiddenSeries || {};
    var inactiveSeriesIds = options.inactiveSeriesIds || [];
    var xLabelEvery = options.xLabelEvery || 1;
    var legendHtml = options.hideLegend
      ? ""
      : '<div class="chart-legend chart-legend-buttoned">' +
        seriesList
          .map(function mapLegend(series) {
            var inactive = inactiveSeriesIds.indexOf(series.id) >= 0;
            return (
              '<button class="legend-toggle ' +
              (hiddenSeries[series.id] || inactive ? "muted" : "") +
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
      return !hiddenSeries[item.id] && inactiveSeriesIds.indexOf(item.id) < 0;
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
        if (!isRenderableNumber(value)) {
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

    if (!values.length) {
      return (
        legendHtml +
        renderEmptyState({
          escapeHtml: escapeHtml,
          renderIcon: options.renderIcon,
          message: options.emptyMessage || "当前图表暂无可展示数据，请重新选择指标或筛选日期。",
        })
      );
    }

    var maxValue = Math.max.apply(null, values);
    var axisBase = getAxisBase(maxValue);
    var roundedMax = Math.max(axisBase, Math.ceil((maxValue * 1.12) / axisBase) * axisBase);
    var yTicks = Array.from({ length: 6 }, function createTick(_, index) {
      return Math.round((roundedMax / 5) * index);
    });
    var xStep = (options.labels || []).length > 1 ? innerWidth / ((options.labels || []).length - 1) : 0;
    var avgValue = averageOf(values);
    var valueFormatter = options.valueFormatter;

    return (
      legendHtml +
      global.BOSS_COMPONENTS.renderEchartsChart({
        chartId: options.chartId,
        title: options.title,
        unit: options.unit || "",
        height: 360,
        escapeHtml: escapeHtml,
        option: createEchartsLineOption(options, visibleSeries, valueFormatter),
      })
    );

    function xToPx(index) {
      if (options.labels.length <= 1) {
        return margin.left + innerWidth / 2;
      }
      return margin.left + index * xStep;
    }

    function yToPx(value) {
      return margin.top + innerHeight - (value / roundedMax) * innerHeight;
    }

    function buildPolylineSegments(series) {
      var segments = [];
      var currentSegment = [];

      series.values.forEach(function eachValue(value, index) {
        if (!isRenderableNumber(value)) {
          if (options.breakOnNull && currentSegment.length) {
            segments.push(currentSegment);
            currentSegment = [];
          }
          return;
        }
        currentSegment.push(xToPx(index) + "," + yToPx(value));
      });

      if (currentSegment.length) {
        segments.push(currentSegment);
      }

      return segments;
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
                return series.label + ": " + formatValue(value, valueFormatter);
              })
              .join(" | ");
        var rectX = xToPx(index) - (options.labels.length > 1 ? xStep / 2 : innerWidth / 2);
        var rectWidth = options.labels.length > 1 ? xStep : innerWidth;

        if (options.tooltipIsHtml) {
          var tooltipWidth = options.tooltipWidth || 280;
          var tooltipHeight = options.tooltipHeight || 158;
          var tooltipX = Math.min(Math.max(xToPx(index) + 10, margin.left), width - margin.right - tooltipWidth);
          var tooltipY = margin.top + 10;
          return (
            '<g class="chart-tooltip-group"><rect class="chart-hit-rect" x="' +
            rectX +
            '" y="' +
            margin.top +
            '" width="' +
            rectWidth +
            '" height="' +
            innerHeight +
            '"><title>' +
            escapeHtml(stripHtml(tooltip)) +
            '</title></rect><foreignObject class="chart-tooltip-popup" x="' +
            tooltipX +
            '" y="' +
            tooltipY +
            '" width="' +
            tooltipWidth +
            '" height="' +
            tooltipHeight +
            '"><div xmlns="http://www.w3.org/1999/xhtml" class="chart-tooltip-box">' +
            tooltip +
            "</div></foreignObject></g>"
          );
        }

        return (
          '<rect class="chart-hit-rect" x="' +
          rectX +
          '" y="' +
          margin.top +
          '" width="' +
          rectWidth +
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
        return buildPolylineSegments(series)
          .map(function mapSegment(segment) {
            return (
              '<polyline class="custom-chart-line" points="' +
              segment.join(" ") +
              '" style="stroke:' +
              series.color +
              ";stroke-dasharray:" +
              escapeHtml(series.dasharray || "") +
              ';"></polyline>'
            );
          })
          .join("");
      })
      .join("");

    var zoomViewportStart = options.enableTimeZoom ? '<div class="chart-scroll-viewport" data-chart-viewport="' + escapeHtml(options.chartId || "") + '">' : "";
    var zoomViewportEnd = options.enableTimeZoom ? "</div>" : "";
    var zoomBarHtml = options.enableTimeZoom
      ? '<label class="chart-time-zoom"><span>时间范围</span><input class="chart-time-range" type="range" min="0" max="100" value="0" data-chart-zoom="' +
        escapeHtml(options.chartId || "") +
        '" aria-label="时间范围缩放条" /></label>'
      : "";
    var svgStyle = options.enableTimeZoom ? ' style="min-width:' + width + 'px;"' : "";

    return (
      legendHtml +
      '<div class="chart-canvas ' +
      (options.enableTimeZoom ? "chart-canvas-zoomable" : "") +
      '"><div class="chart-unit">' +
      escapeHtml(options.unit || "") +
      "</div>" +
      zoomViewportStart +
      '<svg class="line-chart" viewBox="0 0 ' +
      width +
      " " +
      height +
      '" aria-label="' +
      escapeHtml(options.title) +
      '趋势图"' +
      svgStyle +
      ">" +
      gridLines +
      verticalLines +
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
      formatValue(avgValue, valueFormatter) +
      "</text>" +
      '<text class="point-label point-label-max" x="' +
      xToPx(maxPoint.index) +
      '" y="' +
      (yToPx(maxPoint.value) - 12) +
      '" text-anchor="middle">最大值 ' +
      formatValue(maxPoint.value, valueFormatter) +
      "</text>" +
      '<text class="point-label point-label-min" x="' +
      xToPx(minPoint.index) +
      '" y="' +
      (yToPx(minPoint.value) + 18) +
      '" text-anchor="middle">最小值 ' +
      formatValue(minPoint.value, valueFormatter) +
      "</text>" +
      seriesLines +
      hitAreas +
      "</svg>" +
      zoomViewportEnd +
      zoomBarHtml +
      "</div>"
    );
  };
})(window);
