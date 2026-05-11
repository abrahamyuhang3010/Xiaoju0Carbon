(function attachEmptyState(global) {
  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderEmptyState = function renderEmptyState(options) {
    var escapeHtml = options.escapeHtml;
    return (
      '<div class="empty-state">' +
      '<div class="empty-state-graphic">' +
      options.renderIcon("database", "empty-state-icon") +
      "</div>" +
      '<div class="empty-state-title">暂无数据</div>' +
      '<div class="empty-state-text">' +
      escapeHtml(options.message || "当前日期暂无交易中心披露数据，请切换日期或手动更新数据") +
      "</div>" +
      '<div class="empty-state-actions">' +
      '<button class="ghost-btn" data-ui-action="open-manual-update"><span>手动更新</span></button>' +
      '<button class="primary-btn" data-ui-action="refresh-empty-state"><span>刷新</span></button>' +
      "</div>" +
      "</div>"
    );
  };
})(window);
