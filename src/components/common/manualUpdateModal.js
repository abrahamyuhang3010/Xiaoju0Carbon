(function attachManualUpdateModal(global) {
  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderManualUpdateModal = function renderManualUpdateModal(options) {
    var escapeHtml = options.escapeHtml;
    var title = options.title || "手动更新";
    var confirmText = options.confirmText || "确认";
    var uploadLabel = options.uploadLabel || "原始文件";
    var uploadPlaceholder = options.uploadPlaceholder || "选择文件（仅模拟，不真实上传）";
    var pullLabel = options.pullLabel || "拉取日期";
    var disableSubmit = options.canSubmit === false;
    var agentMonthHtml = options.showAgentMonth
      ? '<div class="form-field"><div class="modal-label">代理月份</div><input class="filter-input filter-month-input modal-month-input" type="month" value="' +
        escapeHtml(options.agentMonth || "") +
        '" data-manual-update-agent-month /></div>'
      : "";
    var uploadHtml =
      '<div class="form-field form-field-inline"><div class="modal-label">' +
      escapeHtml(uploadLabel) +
      '</div><div class="modal-field-control"><label class="upload-field"><input type="file" data-manual-upload-file /><span class="upload-icon"></span><span>' +
      escapeHtml(options.fileName || uploadPlaceholder) +
      "</span></label>" +
      (options.uploadHint ? '<div class="form-hint">' + escapeHtml(options.uploadHint) + "</div>" : "") +
      "</div></div>";
    var pullHtml =
      '<div class="form-field form-field-inline"><div class="modal-label">' +
      escapeHtml(pullLabel) +
      '</div><div class="modal-field-control">' +
      options.datePickerHtml +
      (options.pullHint ? '<div class="form-hint">' + escapeHtml(options.pullHint) + "</div>" : "") +
      "</div></div>";
    var bodyFields = options.mode === "upload" ? agentMonthHtml + uploadHtml : agentMonthHtml + pullHtml;
    return (
      '<div class="overlay-backdrop">' +
      '<div class="modal-card modal-card-wide update-data-modal">' +
      '<div class="modal-header"><strong>' +
      escapeHtml(title) +
      '</strong><button class="notification-close" data-ui-action="close-manual-update">' +
      options.renderIcon("close", "notification-close-icon") +
      "</button></div>" +
      '<div class="modal-body">' +
      '<div class="form-field form-field-inline"><div class="modal-label">更新方式</div><div class="modal-field-control">' +
      '<div class="radio-group">' +
      '<label class="radio-item"><input type="radio" name="updateMode" value="upload" ' +
      (options.mode === "upload" ? "checked" : "") +
      ' data-update-mode="upload" /><span>人工上传</span></label>' +
      '<label class="radio-item"><input type="radio" name="updateMode" value="pull" ' +
      (options.mode === "pull" ? "checked" : "") +
      ' data-update-mode="pull" /><span>系统拉取</span></label>' +
      "</div></div></div>" +
      bodyFields +
      (options.error ? '<div class="form-error">' + escapeHtml(options.error) + "</div>" : "") +
      "</div>" +
      '<div class="modal-footer">' +
      '<button class="ghost-btn" data-ui-action="close-manual-update"><span>取消</span></button>' +
      '<button class="primary-btn" data-ui-action="confirm-manual-update"' +
      (disableSubmit ? " disabled" : "") +
      "><span>" +
      escapeHtml(confirmText) +
      "</span></button>" +
      "</div>" +
      "</div>" +
      "</div>"
    );
  };
})(window);
