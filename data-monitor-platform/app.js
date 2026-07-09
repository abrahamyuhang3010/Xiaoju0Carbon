(function initDataMonitorPlatform() {
  const config = window.DATA_MONITOR_CONFIG;
  const seed = window.DATA_MONITOR_SEED;

  const state = {
    activeTab: "fetch",
    centerId: config.defaultCenter,
    apiBaseUrl: config.apiBaseUrl || "/api",
    fetchRecords: [],
    qualityRecords: [],
    usingSeed: false,
    selectedRecord: null,
    selectedRecordKind: "",
    ignoredIds: loadJson("dataMonitorIgnoredIds", []),
    filters: {
      fetch: {},
      quality: {},
    },
  };

  const elements = {
    centerSelect: document.getElementById("centerSelect"),
    fetchFilters: document.getElementById("fetchFilters"),
    qualityFilters: document.getElementById("qualityFilters"),
    fetchMetrics: document.getElementById("fetchMetrics"),
    qualityMetrics: document.getElementById("qualityMetrics"),
    fetchTableBody: document.getElementById("fetchTableBody"),
    qualityTableBody: document.getElementById("qualityTableBody"),
    toast: document.getElementById("toast"),
    drawerMask: document.getElementById("drawerMask"),
    detailDrawer: document.getElementById("detailDrawer"),
    drawerTitle: document.getElementById("drawerTitle"),
    drawerSubtitle: document.getElementById("drawerSubtitle"),
    drawerBody: document.getElementById("drawerBody"),
    drawerCloseBtn: document.getElementById("drawerCloseBtn"),
    drawerLogBtn: document.getElementById("drawerLogBtn"),
    drawerBizBtn: document.getElementById("drawerBizBtn"),
    drawerRecheckBtn: document.getElementById("drawerRecheckBtn"),
  };

  function boot() {
    hydratePersistedSettings();
    renderGlobalControls();
    renderFilterOptions();
    bindEvents();
    applyDefaultFilters();
    loadSnapshot();
  }

  function hydratePersistedSettings() {
    const storedSettings = loadJson("dataMonitorSettings", {});
    state.centerId = storedSettings.centerId || state.centerId;
  }

  function persistSettings() {
    saveJson("dataMonitorSettings", {
      centerId: state.centerId,
    });
  }

  function renderGlobalControls() {
    elements.centerSelect.innerHTML = config.centers
      .map((center) => option(center.id, center.name, center.id === state.centerId))
      .join("");
  }

  function renderFilterOptions() {
    const options = {
      modules: ["全部"].concat(seed.businessModules),
      priorities: ["全部"].concat(seed.priorities),
      fetchStatuses: ["全部"].concat(flattenStatus(seed.fetchTypes)),
      fetchTypes: ["全部"].concat(seed.fetchTypes.map((item) => item.type)),
      qualityStatuses: ["全部"].concat(flattenStatus(seed.qualityTypes)),
      qualityTypes: ["全部"].concat(seed.qualityTypes.map((item) => item.type)),
    };

    document.querySelectorAll("select[data-options]").forEach((select) => {
      const values = options[select.dataset.options] || ["全部"];
      select.innerHTML = values.map((value) => option(value === "全部" ? "" : value, value, false)).join("");
    });
  }

  function bindEvents() {
    elements.centerSelect.addEventListener("change", () => {
      state.centerId = elements.centerSelect.value;
      persistSettings();
      loadSnapshot();
    });

    document.querySelectorAll(".tab").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeTab = button.dataset.tab;
        document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
        document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
        document.getElementById(state.activeTab + "Panel").classList.add("active");
      });
    });

    elements.fetchFilters.addEventListener("submit", (event) => {
      event.preventDefault();
      state.filters.fetch = readForm(elements.fetchFilters);
      renderAll();
    });

    elements.qualityFilters.addEventListener("submit", (event) => {
      event.preventDefault();
      state.filters.quality = readForm(elements.qualityFilters);
      renderAll();
    });

    document.querySelectorAll("[data-reset]").forEach((button) => {
      button.addEventListener("click", () => {
        const kind = button.dataset.reset;
        const form = kind === "fetch" ? elements.fetchFilters : elements.qualityFilters;
        form.reset();
        setDefaultDates(form);
        state.filters[kind] = readForm(form);
        renderAll();
      });
    });

    elements.drawerCloseBtn.addEventListener("click", closeDrawer);
    elements.drawerMask.addEventListener("click", closeDrawer);
    elements.drawerRecheckBtn.addEventListener("click", () => {
      if (state.selectedRecord) recheckRecord(state.selectedRecordKind, state.selectedRecord.id);
    });
    elements.drawerLogBtn.addEventListener("click", () => openExternalLink(state.selectedRecord && state.selectedRecord.logUrl, "日志入口未配置"));
    elements.drawerBizBtn.addEventListener("click", () => openExternalLink(state.selectedRecord && state.selectedRecord.businessUrl, "业务页面入口未配置"));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDrawer();
    });
  }

  function applyDefaultFilters() {
    setDefaultDates(elements.fetchFilters);
    setDefaultDates(elements.qualityFilters);
    state.filters.fetch = readForm(elements.fetchFilters);
    state.filters.quality = readForm(elements.qualityFilters);
  }

  function setDefaultDates(form) {
    const defaults = {
      runStart: "2026-06-08",
      runEnd: "2026-06-10",
      warningDate: "2026-06-10",
      checkStart: "2026-06-10",
      checkEnd: "2026-06-10",
    };
    Object.keys(defaults).forEach((name) => {
      const field = form.elements[name];
      if (field && !field.value) field.value = defaults[name];
    });
  }

  async function loadSnapshot() {
    try {
      const snapshot = await getSnapshot();
      state.fetchRecords = applyIgnored(snapshot.fetchRecords);
      state.qualityRecords = applyIgnored(snapshot.qualityRecords);
      state.usingSeed = snapshot.usingSeed;
    } catch (error) {
      state.fetchRecords = [];
      state.qualityRecords = [];
      state.usingSeed = false;
      showToast(error.message || "数据加载失败");
    } finally {
      renderAll();
    }
  }

  async function getSnapshot() {
    try {
      const apiSnapshot = await fetchApiSnapshot();
      return Object.assign(apiSnapshot, { usingSeed: false });
    } catch (error) {
      return seedSnapshot();
    }
  }

  async function fetchApiSnapshot() {
    const url = buildApiUrl("/data-monitor/snapshot", { centerId: state.centerId });
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), config.requestTimeoutMs || 8000);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Data-Monitor-Contract": config.realDataContractVersion,
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      const payload = await response.json();
      return normalizeSnapshot(payload);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function seedSnapshot() {
    const center = seed.centers[state.centerId] || seed.centers[config.defaultCenter];
    return normalizeSnapshot({
      generatedAt: "2026-06-10T11:40:00+08:00",
      fetchRecords: center.fetchRecords,
      qualityRecords: center.qualityRecords,
    }, true);
  }

  function normalizeSnapshot(payload, usingSeed) {
    const data = payload && payload.data ? payload.data : payload || {};
    return {
      usingSeed: Boolean(usingSeed),
      generatedAt: data.generatedAt || payload.generatedAt || "",
      fetchRecords: normalizeFetchRecords(Array.isArray(data.fetchRecords) ? data.fetchRecords : []),
      qualityRecords: normalizeQualityRecords(Array.isArray(data.qualityRecords) ? data.qualityRecords : []),
    };
  }

  function normalizeFetchRecords(records) {
    return records.map((record, index) => {
      const normalized = Object.assign({}, record);
      normalized.id = String(record.id || "fetch-" + index);
      normalized.centerId = record.centerId || state.centerId;
      normalized.centerName = record.centerName || getCenterName(normalized.centerId);
      normalized.priority = record.priority || "P2";
      normalized.severity = record.severity || prioritySeverity(normalized.priority);
      normalized.runDateStart = record.runDateStart || record.runDate || "";
      normalized.runDateEnd = record.runDateEnd || record.runDateStart || record.runDate || "";
      normalized.warningBatch = record.warningBatch || getBatchFromTime(record.warningTime);
      normalized.warningTime = record.warningTime || joinDateTime(record.warningDate, normalized.warningBatch);
      normalized.status = record.status || record.currentStatus || "超时未取";
      normalized.exceptionType = record.exceptionType || record.type || "取数结果异常";
      normalized.notifyStatus = record.notifyStatus || "待通知";
      normalized.description = record.description || record.exceptionDescription || "";
      normalized.ignored = Boolean(record.ignored);
      return normalized;
    });
  }

  function normalizeQualityRecords(records) {
    return records.map((record, index) => {
      const normalized = Object.assign({}, record);
      normalized.id = String(record.id || "quality-" + index);
      normalized.centerId = record.centerId || state.centerId;
      normalized.centerName = record.centerName || getCenterName(normalized.centerId);
      normalized.priority = record.priority || "P2";
      normalized.severity = record.severity || prioritySeverity(normalized.priority);
      normalized.runDate = record.runDate || record.runDateStart || "";
      normalized.status = record.status || record.currentStatus || "数值越界";
      normalized.exceptionType = record.exceptionType || record.type || "数值异常";
      normalized.ruleName = record.ruleName || record.rule || record.description || "";
      normalized.notifyStatus = record.notifyStatus || "待通知";
      normalized.description = record.description || record.ruleName || "";
      normalized.ignored = Boolean(record.ignored);
      return normalized;
    });
  }

  function applyIgnored(records) {
    return records.map((record) => Object.assign({}, record, {
      ignored: record.ignored || state.ignoredIds.includes(record.id),
    }));
  }

  function renderAll() {
    renderFetch();
    renderQuality();
  }

  function renderFetch() {
    const records = filterFetchRecords();
    const activeRecords = records.filter((record) => !record.ignored);
    const totalExpected = Math.max(state.fetchRecords.length, activeRecords.length);
    const successCount = Math.max(totalExpected - activeRecords.length, 0);
    const typeCounts = countBy(activeRecords, "exceptionType");
    const metrics = [
      ["应取数据", totalExpected],
      ["取数成功数", successCount, "green"],
      ["异常状态类型数", unique(activeRecords.map((record) => record.status)).length, "red"],
      ["调度执行异常类型", typeCounts["调度执行异常"] || 0, "red"],
      ["访问认证异常类型", typeCounts["访问认证异常"] || 0, "red"],
      ["页面结构异常类型", typeCounts["页面结构异常"] || 0, "amber"],
      ["解析入库异常类型", typeCounts["解析入库异常"] || 0, "red"],
      ["人工上传异常类型", typeCounts["人工上传异常"] || 0, "amber"],
      ["通知异常类型", typeCounts["通知异常"] || 0, "amber"],
    ];
    elements.fetchMetrics.innerHTML = metrics.map((item) => metricCard(item[0], item[1], item[2])).join("");
    elements.fetchTableBody.innerHTML = renderFetchRows(records);
  }

  function renderQuality() {
    const records = filterQualityRecords();
    const activeRecords = records.filter((record) => !record.ignored);
    const checkedCount = Math.max(state.qualityRecords.length, activeRecords.length);
    const passedCount = Math.max(checkedCount - activeRecords.length, 0);
    const typeCounts = countBy(activeRecords, "exceptionType");
    const metrics = [
      ["校验数据数", checkedCount],
      ["校验通过数", passedCount, "green"],
      ["异常状态类型数", unique(activeRecords.map((record) => record.status)).length, "red"],
      ["完整性异常类型", typeCounts["完整性异常"] || 0, "red"],
      ["重复异常类型", typeCounts["重复异常"] || 0, "amber"],
      ["数值异常类型", typeCounts["数值异常"] || 0, "red"],
      ["波动异常类型", typeCounts["波动异常"] || 0, "violet"],
      ["关系异常类型", typeCounts["关系异常"] || 0, "red"],
      ["配置异常类型", typeCounts["配置异常"] || 0, "amber"],
    ];
    elements.qualityMetrics.innerHTML = metrics.map((item) => metricCard(item[0], item[1], item[2])).join("");
    elements.qualityTableBody.innerHTML = renderQualityRows(records);
  }

  function filterFetchRecords() {
    return state.fetchRecords.filter((record) => {
      const filters = state.filters.fetch;
      return matchesRange(record.runDateStart, filters.runStart, filters.runEnd)
        && matchesText(record.warningTime, filters.warningDate)
        && matchesExact(record.warningBatch, filters.warningBatch)
        && matchesExact(record.businessModule, filters.businessModule)
        && matchesFuzzy(record.dataName, filters.dataName)
        && matchesExact(record.priority, filters.priority)
        && matchesExact(record.status, filters.status)
        && matchesExact(record.exceptionType, filters.exceptionType);
    });
  }

  function filterQualityRecords() {
    return state.qualityRecords.filter((record) => {
      const filters = state.filters.quality;
      return matchesRange(record.runDate, filters.runStart, filters.runEnd)
        && matchesRange(record.checkTime, filters.checkStart, filters.checkEnd)
        && matchesExact(record.businessModule, filters.businessModule)
        && matchesFuzzy(record.dataName, filters.dataName)
        && matchesExact(record.priority, filters.priority)
        && matchesExact(record.status, filters.status)
        && matchesExact(record.exceptionType, filters.exceptionType);
    });
  }

  function renderFetchRows(records) {
    if (!records.length) {
      return "<tr><td colspan=\"12\" class=\"empty-state\">当前条件下无取数通道异常</td></tr>";
    }

    return records.map((record) => {
      return [
        "<tr class=\"" + (record.ignored ? "ignored" : "") + "\">",
        "<td>" + escapeHtml(record.businessModule) + "</td>",
        "<td>" + escapeHtml(record.dataName) + "</td>",
        "<td>" + escapeHtml(record.runDateStart) + " 至 " + escapeHtml(record.runDateEnd) + "</td>",
        "<td>" + escapeHtml(record.warningTime || "--") + "</td>",
        "<td>" + escapeHtml(record.sourceType || "--") + "</td>",
        "<td>" + priorityBadge(record.priority) + "</td>",
        "<td>" + exceptionBadge(record.status, record.severity) + "</td>",
        "<td>" + escapeHtml(record.exceptionType) + "</td>",
        "<td>" + escapeHtml(record.description || "--") + "</td>",
        "<td>" + escapeHtml(record.lastFetchTime || "--") + "</td>",
        "<td>" + notifyBadge(record.notifyStatus) + "</td>",
        "<td><div class=\"ops\">" + rowActions("fetch", record) + "</div></td>",
        "</tr>",
      ].join("");
    }).join("");
  }

  function renderQualityRows(records) {
    if (!records.length) {
      return "<tr><td colspan=\"9\" class=\"empty-state\">当前条件下无数据质量异常</td></tr>";
    }

    return records.map((record) => {
      return [
        "<tr class=\"" + (record.ignored ? "ignored" : "") + "\">",
        "<td>" + escapeHtml(record.businessModule) + "</td>",
        "<td>" + escapeHtml(record.dataName) + "</td>",
        "<td>" + escapeHtml(record.runDate) + "</td>",
        "<td>" + priorityBadge(record.priority) + "</td>",
        "<td>" + escapeHtml(record.checkTime || "--") + "</td>",
        "<td>" + exceptionBadge(record.status, record.severity) + "</td>",
        "<td>" + escapeHtml(record.exceptionType) + "</td>",
        "<td>" + escapeHtml(record.ruleName || "--") + "</td>",
        "<td><div class=\"ops\">" + rowActions("quality", record) + "</div></td>",
        "</tr>",
      ].join("");
    }).join("");
  }

  function rowActions(kind, record) {
    const ignoreButton = record.ignored
      ? "<button class=\"btn link muted\" type=\"button\" disabled>已忽略</button>"
      : "<button class=\"btn link\" type=\"button\" data-action=\"ignore\" data-kind=\"" + kind + "\" data-id=\"" + record.id + "\">忽略</button>";
    const restoreButton = record.ignored
      ? "<button class=\"btn link warning\" type=\"button\" data-action=\"ignore\" data-kind=\"" + kind + "\" data-id=\"" + record.id + "\">取消忽略</button>"
      : "";
    return [
      "<button class=\"btn link\" type=\"button\" data-action=\"detail\" data-kind=\"" + kind + "\" data-id=\"" + record.id + "\">详情</button>",
      "<button class=\"btn link\" type=\"button\" data-action=\"recheck\" data-kind=\"" + kind + "\" data-id=\"" + record.id + "\">重新校验</button>",
      ignoreButton,
      restoreButton,
    ].join("");
  }

  function metricCard(label, value, color) {
    return [
      "<div class=\"metric\">",
      "<div class=\"label\">" + escapeHtml(label) + "</div>",
      "<div class=\"value " + (color || "") + "\">" + escapeHtml(String(value)) + "</div>",
      "</div>",
    ].join("");
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const kind = button.dataset.kind;
    const id = button.dataset.id;
    if (button.dataset.action === "detail") openDrawer(kind, id);
    if (button.dataset.action === "recheck") recheckRecord(kind, id);
    if (button.dataset.action === "ignore") toggleIgnore(kind, id);
  });

  function openDrawer(kind, id) {
    const record = findRecord(kind, id);
    if (!record) return;
    state.selectedRecord = record;
    state.selectedRecordKind = kind;
    elements.drawerTitle.textContent = kind === "fetch" ? "取数通道异常详情" : "数据质量异常详情";
    elements.drawerSubtitle.textContent = record.centerName + " | " + record.dataName + " | " + record.status;
    elements.drawerBody.innerHTML = kind === "fetch" ? renderFetchDetail(record) : renderQualityDetail(record);
    elements.drawerMask.hidden = false;
    elements.detailDrawer.classList.add("show");
    elements.detailDrawer.setAttribute("aria-hidden", "false");
  }

  function closeDrawer() {
    elements.detailDrawer.classList.remove("show");
    elements.detailDrawer.setAttribute("aria-hidden", "true");
    elements.drawerMask.hidden = true;
  }

  function renderFetchDetail(record) {
    return [
      detailGroup("基础信息", [
        ["当前状态", exceptionBadge(record.status, record.severity)],
        ["异常类型", record.exceptionType],
        ["运行日期", record.runDateStart + " 至 " + record.runDateEnd],
        ["预警时间", record.warningTime || "--"],
      ]),
      textGroup("异常说明", record.description || "--"),
    ].join("");
  }

  function renderQualityDetail(record) {
    return [
      detailGroup("基础信息", [
        ["异常状态", exceptionBadge(record.status, record.severity)],
        ["异常类型", record.exceptionType],
        ["校验时间", record.checkTime || "--"],
        ["告警阈值", record.threshold || "按规则配置"],
        ["实际值", record.actual || "命中异常"],
      ]),
      chartGroup(record),
      textGroup("异常说明", record.description || record.ruleName || "--"),
    ].join("");
  }

  function detailGroup(title, rows) {
    return [
      "<div class=\"detail-group\">",
      "<div class=\"detail-title\">" + escapeHtml(title) + "</div>",
      "<div class=\"detail-grid\">",
      rows.map((row) => {
        return [
          "<div class=\"detail-cell\">",
          "<div class=\"detail-label\">" + escapeHtml(row[0]) + "</div>",
          "<div class=\"detail-value\">" + (isHtml(row[1]) ? row[1] : escapeHtml(row[1])) + "</div>",
          "</div>",
        ].join("");
      }).join(""),
      "</div>",
      "</div>",
    ].join("");
  }

  function textGroup(title, text) {
    return [
      "<div class=\"detail-group\">",
      "<div class=\"detail-title\">" + escapeHtml(title) + "</div>",
      "<div class=\"chart-note\">" + escapeHtml(text) + "</div>",
      "</div>",
    ].join("");
  }

  function chartGroup(record) {
    let chart = "";
    if (["点位缺失", "时间断点", "时间重复", "粒度异常"].includes(record.status)) {
      chart = pointChart(record);
    } else if (["环比异常", "同比异常", "均值偏离", "数值越界", "非法负值", "数据内容未更新"].includes(record.status)) {
      chart = lineChart(record);
    } else if (["汇总不一致", "计算关系异常", "枚举异常"].includes(record.status)) {
      chart = compareChart(record);
    } else {
      chart = "<div class=\"chart-note\">当前异常以异常字段、异常主体和异常记录样例为主展示。</div>";
    }
    return "<div class=\"detail-group\"><div class=\"detail-title\">异常图表</div>" + chart + "</div>";
  }

  function pointChart(record) {
    const expected = Number(record.dimensions && record.dimensions.expectedPoints) || 24;
    const visiblePoints = expected === 96 ? 24 : expected;
    const missingIndex = record.status === "时间断点" ? 15 : 10;
    const cells = Array.from({ length: visiblePoints }).map((_, index) => {
      const label = String(index).padStart(2, "0") + ":00";
      const missing = index === missingIndex || (record.status === "点位缺失" && index === visiblePoints - 2);
      return "<div class=\"hour-cell " + (missing ? "missing" : "") + "\">" + label + "</div>";
    }).join("");
    return [
      "<div class=\"chart-box\">",
      "<div class=\"hour-grid\">" + cells + "</div>",
      "<div class=\"chart-note\">红色点位表示命中异常的时段。陕西交易中心 96 点数据在此按小时聚合预览，详情以接口返回维度为准。</div>",
      "</div>",
    ].join("");
  }

  function lineChart(record) {
    const series = Array.isArray(record.series) && record.series.length ? record.series : [];
    const width = 620;
    const height = 220;
    const maxValue = Math.max(1, ...series.flatMap((item) => [item.current || 0, item.baseline || 0]));
    const current = series.map((item, index) => point(index, item.current, series.length, maxValue, width, height)).join(" ");
    const baseline = series.map((item, index) => point(index, item.baseline, series.length, maxValue, width, height)).join(" ");
    const focusIndex = Math.min(8, Math.max(series.length - 1, 0));
    const focus = series[focusIndex] ? point(focusIndex, series[focusIndex].current, series.length, maxValue, width, height).split(",") : ["490", "82"];
    return [
      "<div class=\"chart-box\">",
      "<div class=\"line-chart\"><div class=\"threshold\"></div><div class=\"threshold-label\">阈值线</div>",
      "<svg viewBox=\"0 0 " + width + " " + height + "\" preserveAspectRatio=\"none\">",
      "<polyline points=\"" + current + "\" fill=\"none\" stroke=\"#1769e0\" stroke-width=\"3\"/>",
      "<polyline points=\"" + baseline + "\" fill=\"none\" stroke=\"#138a4a\" stroke-width=\"3\"/>",
      "<circle cx=\"" + focus[0] + "\" cy=\"" + focus[1] + "\" r=\"6\" fill=\"#c92a2a\"/>",
      "</svg></div>",
      "<div class=\"chart-note\">蓝线为当前数据，绿线为参考数据。红点表示命中异常规则的时段或数值。</div>",
      "</div>",
    ].join("");
  }

  function compareChart(record) {
    const values = [
      ["配置目标值", 92, "126,530.20", ""],
      ["实际计算值", 88, "126,514.97", "red"],
      ["差异", 12, record.actual || "15.23", "amber"],
    ];
    return [
      "<div class=\"chart-box\"><div class=\"bar-compare\">",
      values.map((item) => {
        return "<div class=\"compare-row\"><span>" + item[0] + "</span><div class=\"bar-bg\"><div class=\"bar-fill " + item[3] + "\" style=\"width:" + item[1] + "%\"></div></div><strong>" + item[2] + "</strong></div>";
      }).join(""),
      "</div><div class=\"chart-note\">用于展示汇总不一致、计算关系异常、枚举异常等关系类异常。</div></div>",
    ].join("");
  }

  async function recheckRecord(kind, id) {
    const record = findRecord(kind, id);
    if (!record) return;
    try {
      if (!state.usingSeed) {
        await postAction("/data-monitor/alerts/" + encodeURIComponent(id) + "/recheck", { kind, centerId: state.centerId });
      }
      showToast("已发起重新校验：" + record.dataName);
    } catch (error) {
      showToast("重新校验提交失败：" + error.message);
    }
  }

  async function toggleIgnore(kind, id) {
    const record = findRecord(kind, id);
    if (!record) return;
    const nextIgnored = !record.ignored;
    try {
      if (!state.usingSeed) {
        await postAction("/data-monitor/alerts/" + encodeURIComponent(id) + "/ignore", {
          kind,
          centerId: state.centerId,
          ignored: nextIgnored,
        });
      }
      setIgnored(id, nextIgnored);
      showToast(nextIgnored ? "已忽略，后续通知将跳过该异常" : "已取消忽略");
      renderAll();
      if (state.selectedRecord && state.selectedRecord.id === id) {
        state.selectedRecord = findRecord(kind, id);
        openDrawer(kind, id);
      }
    } catch (error) {
      showToast("忽略状态更新失败：" + error.message);
    }
  }

  async function postAction(path, body) {
    const response = await fetch(buildApiUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.json().catch(() => ({}));
  }

  function setIgnored(id, ignored) {
    [state.fetchRecords, state.qualityRecords].forEach((records) => {
      records.forEach((record) => {
        if (record.id === id) record.ignored = ignored;
      });
    });
    const nextIds = new Set(state.ignoredIds);
    if (ignored) nextIds.add(id);
    else nextIds.delete(id);
    state.ignoredIds = Array.from(nextIds);
    saveJson("dataMonitorIgnoredIds", state.ignoredIds);
  }

  function findRecord(kind, id) {
    const records = kind === "fetch" ? state.fetchRecords : state.qualityRecords;
    return records.find((record) => record.id === id);
  }

  function buildApiUrl(path, params) {
    const base = normalizeApiBase(state.apiBaseUrl);
    const fullPath = base.replace(/\/$/, "") + path;
    const url = new URL(fullPath, window.location.origin);
    Object.keys(params || {}).forEach((key) => {
      if (params[key] !== undefined && params[key] !== "") url.searchParams.set(key, params[key]);
    });
    return url.toString();
  }

  function readForm(form) {
    const data = {};
    Array.from(new FormData(form).entries()).forEach(([key, value]) => {
      data[key] = String(value || "").trim();
    });
    return data;
  }

  function option(value, label, selected) {
    return "<option value=\"" + escapeHtml(value) + "\"" + (selected ? " selected" : "") + ">" + escapeHtml(label) + "</option>";
  }

  function flattenStatus(groups) {
    return groups.flatMap((group) => group.statuses.map((item) => item[0]));
  }

  function priorityBadge(priority) {
    const className = priority === "P0" ? "red" : priority === "P1" ? "amber" : priority === "P3" ? "gray" : "blue";
    return "<span class=\"badge " + className + "\">" + escapeHtml(priority || "--") + "</span>";
  }

  function exceptionBadge(status, severity) {
    const className = severity === "critical" ? "red" : severity === "major" ? "amber" : severity === "minor" ? "blue" : "violet";
    return "<span class=\"badge " + className + "\">" + escapeHtml(status || "--") + "</span>";
  }

  function notifyBadge(status) {
    const className = status === "已通知" ? "green" : status === "通知失败" ? "amber" : "gray";
    return "<span class=\"badge " + className + "\">" + escapeHtml(status || "待通知") + "</span>";
  }

  function prioritySeverity(priority) {
    if (priority === "P0") return "critical";
    if (priority === "P1") return "major";
    return "minor";
  }

  function matchesExact(value, filter) {
    return !filter || String(value || "") === filter;
  }

  function matchesText(value, filter) {
    return !filter || String(value || "").includes(filter);
  }

  function matchesFuzzy(value, filter) {
    return !filter || String(value || "").toLowerCase().includes(String(filter).toLowerCase());
  }

  function matchesRange(value, start, end) {
    if (!start && !end) return true;
    const dateText = String(value || "").slice(0, 10);
    if (!dateText) return false;
    if (start && dateText < start) return false;
    if (end && dateText > end) return false;
    return true;
  }

  function countBy(records, field) {
    return records.reduce((result, record) => {
      const key = record[field] || "--";
      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function getCenterName(centerId) {
    const center = config.centers.find((item) => item.id === centerId);
    return center ? center.name : centerId;
  }

  function getBatchFromTime(time) {
    if (!time) return "";
    if (time.includes("18:30")) return "18:30";
    if (time.includes("11:40")) return "11:40";
    return "";
  }

  function joinDateTime(date, batch) {
    if (!date && !batch) return "";
    if (!date) return batch || "";
    return date + " " + String(batch || "").replace("D+1 ", "");
  }

  function normalizeApiBase(value) {
    const trimmed = String(value || "/api").trim();
    return trimmed || "/api";
  }

  function point(index, value, length, maxValue, width, height) {
    const x = length <= 1 ? 0 : Math.round((index / (length - 1)) * width);
    const y = Math.round(height - (Number(value || 0) / maxValue) * (height - 24) - 12);
    return x + "," + y;
  }

  function openExternalLink(url, fallbackText) {
    if (!url) {
      showToast(fallbackText);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function isHtml(value) {
    return typeof value === "string" && value.includes("<span");
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function loadJson(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Local storage can be disabled in private contexts; the platform still works without it.
    }
  }

  function showToast(text) {
    elements.toast.textContent = text;
    elements.toast.style.display = "block";
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      elements.toast.style.display = "none";
    }, 1800);
  }

  boot();
})();
