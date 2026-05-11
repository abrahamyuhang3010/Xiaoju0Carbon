(function attachPermissionNotification(global) {
  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderPermissionNotification = function renderPermissionNotification(options) {
    var escapeHtml = options.escapeHtml;
    return (
      '<aside class="permission-notification" role="status" aria-live="polite"><div class="notification-icon">' +
      options.renderIcon("alert", "notification-alert-icon") +
      '</div><div class="notification-content"><div class="notification-header"><strong>' +
      escapeHtml(options.title) +
      '</strong><button class="notification-close" data-ui-action="' +
      escapeHtml(options.closeAction || "close-permission-notification") +
      '" aria-label="关闭">' +
      options.renderIcon("close", "notification-close-icon") +
      '</button></div><div class="notification-path">' +
      escapeHtml(options.path) +
      '</div><div class="notification-message">' +
      escapeHtml(options.message) +
      '</div><button class="notification-link">' +
      escapeHtml(options.actionText) +
      "</button></div></aside>"
    );
  };
})(window);
