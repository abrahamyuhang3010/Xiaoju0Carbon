(function attachDownloadListModal(global) {
  function getStatusText(status) {
    if (status === "success" || status === "成功") {
      return "成功";
    }
    if (status === "failed" || status === "失败") {
      return "失败";
    }
    return "生成中";
  }

  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderDownloadListModal = function renderDownloadListModal(options) {
    var escapeHtml = options.escapeHtml;
    var rows = (options.tasks || [])
      .map(function mapTask(task) {
        var statusText = getStatusText(task.status);
        var statusClass = task.status === "success" || task.status === "成功"
          ? "success"
          : task.status === "failed" || task.status === "失败"
            ? "failed"
            : "creating";
        var actionHtml = "--";

        if (statusClass === "success") {
          actionHtml =
            '<button type="button" class="download-list-link" data-ui-action="download-task-file" data-task-id="' +
            escapeHtml(task.id) +
            '">下载文件</button>';
        }

        return (
          "<tr>" +
          '<td><span class="download-list-file-name" title="' +
          escapeHtml(task.fileName) +
          '">' +
          escapeHtml(task.fileName) +
          "</span></td>" +
          "<td>" +
          escapeHtml(task.createdAt) +
          "</td>" +
          '<td><span class="download-list-status ' +
          statusClass +
          '">' +
          escapeHtml(statusText) +
          "</span></td>" +
          "<td>" +
          actionHtml +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    return (
      '<div class="overlay-backdrop">' +
      '<div class="modal-card download-list-modal" role="dialog" aria-modal="true" aria-labelledby="download-list-title">' +
      '<div class="modal-header"><strong id="download-list-title">下载列表（保留最近7天的最近10个下载记录）</strong><button class="notification-close" data-ui-action="close-download-list">' +
      options.renderIcon("close", "notification-close-icon") +
      "</button></div>" +
      '<div class="modal-body">' +
      '<div class="download-list-alert">' +
      options.renderIcon("info", "download-list-alert-icon") +
      '<span>报表数据下载量最高限制为20万条，超过20万条的数据不会展示，请分批下载。</span>' +
      "</div>" +
      '<button type="button" class="download-list-refresh" data-ui-action="refresh-download-list">刷新下载列表</button>' +
      (options.loading
        ? '<div class="download-list-loading">加载中...</div>'
        : options.tasks && options.tasks.length
          ? '<div class="table-wrap download-list-table-wrap"><table class="data-table download-list-table"><thead><tr><th>文件名</th><th>创建时间</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
            rows +
            "</tbody></table></div>"
          : options.emptyStateHtml) +
      "</div>" +
      "</div>" +
      "</div>"
    );
  };
})(window);
