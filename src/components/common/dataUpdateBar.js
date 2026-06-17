(function attachDataUpdateBar(global) {
  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderDataUpdateBar = function renderDataUpdateBar(options) {
    var escapeHtml = options.escapeHtml;
    var actions = options.actions || [];
    var updatedAt = options.updatedAt || "-";

    return (
      '<section class="panel status-panel data-update-bar">' +
      '<div class="status-text">' +
      "数据更新时间：<strong>" +
      escapeHtml(updatedAt) +
      "</strong>" +
      "<span>（" +
      escapeHtml(options.source) +
      "）</span>" +
      '<button class="status-link-button" data-ui-action="open-data-disclosure-time">数据披露时间</button>' +
      (options.hasCompare ? '<span class="compare-badge">已添加对比</span>' : "") +
      "</div>" +
      '<div class="status-actions">' +
      actions
        .map(function mapAction(action) {
          var className = action.variant === "primary" ? "primary-btn" : "ghost-btn";
          if (action.asMenu) {
            return (
              '<div class="action-more-dropdown">' +
              '<button class="' +
              className +
              '" data-ui-menu-trigger="' +
              escapeHtml(action.action || "more") +
              '">' +
              "<span>" +
              escapeHtml(action.label) +
              "</span></button>" +
              '<div class="action-more-menu">' +
              (action.menuItems || [])
                .map(function mapMenuItem(item) {
                  return '<button type="button" class="action-more-menu-item" data-ui-action="' + escapeHtml(item.action) + '">' + escapeHtml(item.label) + "</button>";
                })
                .join("") +
              "</div></div>"
            );
          }
          if (action.downloadMenu) {
            return (
              '<div class="action-more-dropdown action-download-dropdown">' +
              '<button class="' +
              className +
              '" data-ui-menu-trigger="' +
              escapeHtml(action.action || "download") +
              '">' +
              "<span>" +
              escapeHtml(action.label) +
              "</span></button>" +
              '<div class="action-more-menu action-download-menu">' +
              (action.menuItems || [])
                .map(function mapDownloadMenuItem(item) {
                  return '<button type="button" class="action-more-menu-item" data-ui-action="' + escapeHtml(item.action) + '">' + escapeHtml(item.label) + "</button>";
                })
                .join("") +
              "</div></div>"
            );
          }
          return (
            '<button class="' +
            className +
            '" data-ui-action="' +
            escapeHtml(action.action) +
            '">' +
            "<span>" +
            escapeHtml(action.label) +
            "</span></button>"
          );
        })
        .join("") +
      "</div>" +
      "</section>"
    );
  };
})(window);
