(function attachCompareModal(global) {
  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderCompareModal = function renderCompareModal(options) {
    var escapeHtml = options.escapeHtml;
    return (
      '<div class="overlay-backdrop">' +
      '<div class="modal-card">' +
      '<div class="modal-header"><strong>添加对比</strong><button class="notification-close" data-ui-action="close-compare">' +
      options.renderIcon("close", "notification-close-icon") +
      "</button></div>" +
      '<div class="modal-body">' +
      '<div class="modal-label">对比日期</div>' +
      options.datePickerHtml +
      (options.error ? '<div class="form-error">' + escapeHtml(options.error) + "</div>" : "") +
      "</div>" +
      '<div class="modal-footer">' +
      '<button class="ghost-btn" data-ui-action="close-compare"><span>取消</span></button>' +
      '<button class="primary-btn" data-ui-action="confirm-compare"><span>确认</span></button>' +
      "</div>" +
      "</div>" +
      "</div>"
    );
  };
})(window);
