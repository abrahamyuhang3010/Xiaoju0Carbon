(function attachDataUpdateBar(global) {
  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderDataUpdateBar = function renderDataUpdateBar(options) {
    var escapeHtml = options.escapeHtml;
    var renderIcon = options.renderIcon;
    var actions = options.actions || [];

    return (
      '<section class="panel status-panel data-update-bar">' +
      '<div class="status-text">' +
      "数据更新时间：<strong>" +
      escapeHtml(options.updatedAt) +
      "</strong>" +
      "<span>（" +
      escapeHtml(options.source) +
      "）</span>" +
      (options.hasCompare ? '<span class="compare-badge">已添加对比</span>' : "") +
      "</div>" +
      '<div class="status-actions">' +
      actions
        .map(function mapAction(action) {
          var className = action.variant === "primary" ? "primary-btn" : "ghost-btn";
          return (
            '<button class="' +
            className +
            '" data-ui-action="' +
            escapeHtml(action.action) +
            '">' +
            renderIcon(action.icon, "button-icon") +
            "<span>" +
            escapeHtml(action.label) +
            "</span></button>"
          );
        })
        .join("") +
      (options.showTaskEntry
        ? '<button class="task-entry-button" data-ui-action="open-download-tasks">下载列表</button>'
        : "") +
      "</div>" +
      "</section>"
    );
  };
})(window);
