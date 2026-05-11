(function attachStandardDatePicker(global) {
  function formatDisplay(value) {
    if (!value) {
      return "--";
    }
    return value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$1年$2月$3日");
  }

  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderStandardDatePicker = function renderStandardDatePicker(options) {
    var escapeHtml = options.escapeHtml;
    var renderIcon = options.renderIcon;
    var range = options.range || {};
    var startValue = range.start || "";
    var endValue = range.end || range.start || "";
    var holidayHtml = (options.holidays || [])
      .map(function mapHoliday(item) {
        return (
          '<span class="holiday-chip ' +
          (item.type === "adjustment" ? "adjustment" : "holiday") +
          '">' +
          escapeHtml(item.date) +
          " " +
          escapeHtml(item.label) +
          "</span>"
        );
      })
      .join("");

    return (
      '<div class="selector-shell standard-date-picker">' +
      '<button class="date-picker-trigger" data-date-picker-toggle="' +
      escapeHtml(options.id) +
      '">' +
      '<span class="date-field">' +
      escapeHtml(formatDisplay(startValue)) +
      "</span>" +
      (options.mode === "range"
        ? '<span class="date-sep">' +
          renderIcon("chevron-right", "date-arrow-icon") +
          '</span><span class="date-field">' +
          escapeHtml(formatDisplay(endValue)) +
          "</span>"
        : "") +
      '<span class="calendar-button" aria-hidden="true">' +
      renderIcon("calendar", "calendar-icon-svg") +
      "</span>" +
      "</button>" +
      (options.isOpen
        ? '<div class="selector-dropdown date-picker-dropdown">' +
          '<div class="date-picker-title">' +
          escapeHtml(options.mode === "range" ? "选择日期范围" : "选择日期") +
          "</div>" +
          '<div class="date-input-group">' +
          '<label class="date-input-item"><span>开始日期</span><input class="date-input-native" type="date" value="' +
          escapeHtml(startValue) +
          '" data-date-input="' +
          escapeHtml(options.id) +
          ':start" /></label>' +
          (options.mode === "range"
            ? '<label class="date-input-item"><span>结束日期</span><input class="date-input-native" type="date" value="' +
              escapeHtml(endValue) +
              '" data-date-input="' +
              escapeHtml(options.id) +
              ':end" /></label>'
            : "") +
          "</div>" +
          '<div class="holiday-legend">' +
          holidayHtml +
          "</div>" +
          '<div class="dropdown-actions">' +
          '<button class="ghost-btn" data-date-picker-cancel="' +
          escapeHtml(options.id) +
          '"><span>取消</span></button>' +
          '<button class="primary-btn" data-date-picker-apply="' +
          escapeHtml(options.id) +
          '"><span>确认</span></button>' +
          "</div>" +
          "</div>"
        : "") +
      "</div>"
    );
  };
})(window);
