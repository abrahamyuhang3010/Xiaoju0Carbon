(function attachDownloadModal(global) {
  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderDownloadModal = function renderDownloadModal(options) {
    var escapeHtml = options.escapeHtml;
    return (
      '<div class="overlay-backdrop">' +
      '<div class="modal-card modal-card-wide">' +
      '<div class="modal-header"><strong>下载数据</strong><button class="notification-close" data-ui-action="close-download">' +
      options.renderIcon("close", "notification-close-icon") +
      "</button></div>" +
      '<div class="modal-body">' +
      '<div class="form-field"><div class="modal-label">日期范围</div>' +
      options.datePickerHtml +
      "</div>" +
      '<div class="form-field"><div class="modal-label">数据类型</div>' +
      '<select class="select-native" data-download-type>' +
      (options.dataTypes || [])
        .map(function mapOption(option) {
          return (
            '<option value="' +
            escapeHtml(option) +
            '" ' +
            (option === options.selectedType ? "selected" : "") +
            ">" +
            escapeHtml(option) +
            "</option>"
          );
        })
        .join("") +
      "</select></div>" +
      (options.error ? '<div class="form-error">' + escapeHtml(options.error) + "</div>" : "") +
      "</div>" +
      '<div class="modal-footer">' +
      '<button class="ghost-btn" data-ui-action="close-download"><span>取消</span></button>' +
      '<button class="primary-btn" data-ui-action="confirm-download"><span>确认下载</span></button>' +
      "</div>" +
      "</div>" +
      "</div>"
    );
  };
})(window);
