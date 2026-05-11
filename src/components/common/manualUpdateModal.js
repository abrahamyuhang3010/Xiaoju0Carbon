(function attachManualUpdateModal(global) {
  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderManualUpdateModal = function renderManualUpdateModal(options) {
    var escapeHtml = options.escapeHtml;
    return (
      '<div class="overlay-backdrop">' +
      '<div class="modal-card modal-card-wide">' +
      '<div class="modal-header"><strong>手动更新</strong><button class="notification-close" data-ui-action="close-manual-update">' +
      options.renderIcon("close", "notification-close-icon") +
      "</button></div>" +
      '<div class="modal-body">' +
      '<div class="modal-label">更新方式</div>' +
      '<div class="radio-group">' +
      '<label class="radio-item"><input type="radio" name="updateMode" value="upload" ' +
      (options.mode === "upload" ? "checked" : "") +
      ' data-update-mode="upload" /><span>人工上传</span></label>' +
      '<label class="radio-item"><input type="radio" name="updateMode" value="pull" ' +
      (options.mode === "pull" ? "checked" : "") +
      ' data-update-mode="pull" /><span>系统拉取</span></label>' +
      "</div>" +
      (options.mode === "upload"
        ? '<div class="form-field"><div class="modal-label">原始文件</div><label class="upload-field"><input type="file" data-manual-upload-file /><span>' +
          escapeHtml(options.fileName || "选择文件（仅模拟，不真实上传）") +
          "</span></label></div>"
        : '<div class="form-field"><div class="modal-label">拉取日期</div>' + options.datePickerHtml + "</div>") +
      (options.error ? '<div class="form-error">' + escapeHtml(options.error) + "</div>" : "") +
      "</div>" +
      '<div class="modal-footer">' +
      '<button class="ghost-btn" data-ui-action="close-manual-update"><span>取消</span></button>' +
      '<button class="primary-btn" data-ui-action="confirm-manual-update"><span>确认</span></button>' +
      "</div>" +
      "</div>" +
      "</div>"
    );
  };
})(window);
