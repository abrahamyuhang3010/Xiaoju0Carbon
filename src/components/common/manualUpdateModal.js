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
    var uploadIconSvg =
      '<svg class="upload-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M 12 3 C 9.6655084 3 7.7006133 4.2494956 6.4296875 6.0136719 C 2.8854572 6.05389 0 8.9465993 0 12.5 C 0 16.078268 2.9217323 19 6.5 19 L 9 19 L 9 17 L 6.5 17 C 4.0022677 17 2 14.997732 2 12.5 C 2 10.002268 4.0022677 8 6.5 8 C 6.534993 8 6.6164592 8.0069899 6.75 8.0136719 L 7.3613281 8.0449219 L 7.6660156 7.5136719 C 8.5301088 6.0123517 10.137881 5 12 5 C 14.504527 5 16.55398 6.8254912 16.931641 9.2148438 L 17.083984 10.175781 L 18.048828 10.050781 C 18.272182 10.021699 18.414903 10 18.5 10 C 20.444423 10 22 11.555577 22 13.5 C 22 15.444423 20.444423 17 18.5 17 L 15 17 L 15 19 L 18.5 19 C 21.525577 19 24 16.525577 24 13.5 C 24 10.509638 21.577034 8.0762027 18.599609 8.0195312 C 17.729938 5.1415745 15.152096 3 12 3 z M 12 9 L 8 13 L 11 13 L 11 21 L 13 21 L 13 13 L 16 13 L 12 9 z"></path>' +
      "</svg>";
    var agentMonthHtml = options.showAgentMonth
      ? '<div class="form-field form-field-inline"><div class="modal-label">代理月份</div><div class="modal-field-control"><input class="filter-input filter-month-input modal-month-input" type="month" value="' +
        escapeHtml(options.agentMonth || "") +
        '" data-manual-update-agent-month /></div></div>'
      : "";
    var uploadHtml =
      '<div class="form-field form-field-inline"><div class="modal-label">' +
      escapeHtml(uploadLabel) +
      '</div><div class="modal-field-control"><label class="upload-field"><input type="file" data-manual-upload-file />' +
      uploadIconSvg +
      "<span>" +
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
