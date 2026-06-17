(function attachDownloadModal(global) {
  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderDownloadModal = function renderDownloadModal(options) {
    var escapeHtml = options.escapeHtml;
    return (
      '<div class="overlay-backdrop">' +
      '<div class="modal-card modal-card-wide download-date-modal">' +
      '<div class="modal-header"><strong>下载数据日期</strong><button class="notification-close" data-ui-action="close-download">' +
      options.renderIcon("close", "notification-close-icon") +
      "</button></div>" +
      '<div class="modal-body">' +
      '<div class="form-field form-field-inline"><div class="modal-label required-label">运行日期</div><div class="modal-field-control">' +
      options.datePickerHtml +
      "</div></div>" +
      (options.error ? '<div class="form-error">' + escapeHtml(options.error) + "</div>" : "") +
      "</div>" +
      '<div class="modal-footer">' +
      '<button class="ghost-btn" data-ui-action="close-download"><span>取消</span></button>' +
      '<button class="primary-btn" data-ui-action="confirm-download"><span>下载</span></button>' +
      "</div>" +
      "</div>" +
      "</div>"
    );
  };
})(window);
