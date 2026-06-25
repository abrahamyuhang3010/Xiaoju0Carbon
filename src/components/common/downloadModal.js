(function attachDownloadModal(global) {
  function formatMonthTitle(year, month) {
    return year + "年 " + String(month).padStart(2, "0") + "月";
  }

  function formatDateValue(year, month, day) {
    return year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  }

  function parseDateValue(value) {
    var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return null;
    }
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  function addMonths(date, offset) {
    return new Date(date.getFullYear(), date.getMonth() + offset, 1);
  }

  function isSameDate(a, b) {
    return Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
  }

  function getCalendarBaseDate(range) {
    var start = parseDateValue(range && range.start);
    return start || new Date(2026, 5, 1);
  }

  function renderCalendarMonth(options, monthDate) {
    var escapeHtml = options.escapeHtml;
    var startDate = parseDateValue(options.range && options.range.start);
    var endDate = parseDateValue(options.range && options.range.end);
    var year = monthDate.getFullYear();
    var month = monthDate.getMonth();
    var firstDay = new Date(year, month, 1);
    var startOffset = firstDay.getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var daysInPrevMonth = new Date(year, month, 0).getDate();
    var cells = [];
    var index;

    for (index = 0; index < 42; index += 1) {
      var dayNumber = index - startOffset + 1;
      var cellDate;
      var muted = false;
      if (dayNumber < 1) {
        cellDate = new Date(year, month - 1, daysInPrevMonth + dayNumber);
        muted = true;
      } else if (dayNumber > daysInMonth) {
        cellDate = new Date(year, month + 1, dayNumber - daysInMonth);
        muted = true;
      } else {
        cellDate = new Date(year, month, dayNumber);
      }

      var dateValue = formatDateValue(cellDate.getFullYear(), cellDate.getMonth() + 1, cellDate.getDate());
      var isStart = isSameDate(cellDate, startDate);
      var isEnd = isSameDate(cellDate, endDate);
      var inRange = startDate && endDate && cellDate > startDate && cellDate < endDate;
      var classes = ["download-calendar-day"];
      if (muted) {
        classes.push("muted");
      }
      if (inRange) {
        classes.push("in-range");
      }
      if (isStart || isEnd) {
        classes.push("selected");
      }

      cells.push(
        '<button type="button" class="' +
          classes.join(" ") +
          '" data-download-date="' +
          escapeHtml(dateValue) +
          '">' +
          escapeHtml(String(cellDate.getDate())) +
          "</button>"
      );
    }

    return (
      '<div class="download-calendar-month">' +
      '<div class="download-calendar-month-title">' +
      escapeHtml(formatMonthTitle(year, month + 1)) +
      "</div>" +
      '<div class="download-calendar-weekdays"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div>' +
      '<div class="download-calendar-grid">' +
      cells.join("") +
      "</div>" +
      "</div>"
    );
  }

  function renderRangePicker(options) {
    var escapeHtml = options.escapeHtml;
    var range = options.range || {};
    var baseDate = parseDateValue((options.calendarMonth || "") + "-01") || getCalendarBaseDate(range);
    var leftMonth = addMonths(baseDate, 0);
    var rightMonth = addMonths(baseDate, 1);
    var selectingStart = options.selectingPart !== "end";

    return (
      '<div class="download-range-picker">' +
      '<button type="button" class="download-range-trigger" data-ui-action="toggle-download-calendar">' +
      '<span class="download-range-input ' +
      (range.start ? "filled" : "") +
      '">' +
      escapeHtml(range.start || "开始日期") +
      "</span>" +
      '<span class="download-range-separator">→</span>' +
      '<span class="download-range-input ' +
      (range.end ? "filled" : "") +
      '">' +
      escapeHtml(range.end || "结束日期") +
      "</span>" +
      options.renderIcon("calendar", "download-range-calendar-icon") +
      "</button>" +
      (options.calendarOpen
        ? '<div class="download-calendar-panel">' +
          '<div class="download-calendar-header">' +
          '<button type="button" class="download-calendar-nav" data-ui-action="download-calendar-prev">' +
          options.renderIcon("chevron-right", "download-calendar-prev-icon") +
          "</button>" +
          '<span class="download-calendar-step">' +
          escapeHtml(selectingStart ? "请选择开始日期" : "请选择结束日期") +
          "</span>" +
          '<button type="button" class="download-calendar-nav" data-ui-action="download-calendar-next">' +
          options.renderIcon("chevron-right", "download-calendar-next-icon") +
          "</button>" +
          "</div>" +
          '<div class="download-calendar-months">' +
          renderCalendarMonth(options, leftMonth) +
          renderCalendarMonth(options, rightMonth) +
          "</div>" +
          "</div>"
        : "") +
      "</div>"
    );
  }

  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderDownloadModal = function renderDownloadModal(options) {
    var escapeHtml = options.escapeHtml;
    return (
      '<div class="overlay-backdrop">' +
      '<div class="modal-card download-date-modal">' +
      '<div class="modal-header"><strong>下载数据日期</strong><button class="notification-close" data-ui-action="close-download">' +
      options.renderIcon("close", "notification-close-icon") +
      "</button></div>" +
      '<div class="modal-body">' +
      '<div class="form-field form-field-inline"><div class="modal-label required-label">运行日期</div><div class="modal-field-control">' +
      renderRangePicker(options) +
      "</div></div>" +
      (options.error ? '<div class="form-error">' + escapeHtml(options.error) + "</div>" : "") +
      "</div>" +
      '<div class="modal-footer">' +
      '<button class="ghost-btn" data-ui-action="close-download"><span>取消</span></button>' +
      '<button class="primary-btn" data-ui-action="confirm-download"' +
      (!options.canSubmit || options.submitting ? " disabled" : "") +
      '><span>' +
      (options.submitting ? "下载中..." : "下载") +
      "</span></button>" +
      "</div>" +
      "</div>" +
      "</div>"
    );
  };
})(window);
