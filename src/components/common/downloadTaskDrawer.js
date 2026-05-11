(function attachDownloadTaskDrawer(global) {
  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderDownloadTaskDrawer = function renderDownloadTaskDrawer(options) {
    var escapeHtml = options.escapeHtml;
    var rows = (options.tasks || [])
      .map(function mapTask(task) {
        var actionHtml = "--";
        if (task.status === "成功") {
          actionHtml = '<button class="table-text-button" data-ui-action="download-task-file" data-task-id="' + escapeHtml(task.id) + '">下载文件</button>';
        } else if (task.status === "失败") {
          actionHtml = '<button class="table-text-button" data-ui-action="retry-download-task" data-task-id="' + escapeHtml(task.id) + '">重新下载</button>';
        }

        return (
          "<tr>" +
          "<td>" +
          escapeHtml(task.fileName) +
          "</td>" +
          "<td>" +
          escapeHtml(task.createdAt) +
          "</td>" +
          "<td><span class=\"task-status " +
          escapeHtml(task.status) +
          '">' +
          escapeHtml(task.status) +
          "</span></td>" +
          "<td>" +
          actionHtml +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    return (
      '<div class="drawer-overlay">' +
      '<aside class="drawer-panel">' +
      '<div class="drawer-header"><strong>下载任务列表</strong><button class="notification-close" data-ui-action="close-download-tasks">' +
      options.renderIcon("close", "notification-close-icon") +
      "</button></div>" +
      '<div class="drawer-body">' +
      (options.tasks && options.tasks.length
        ? '<div class="table-wrap drawer-table-wrap"><table class="data-table"><thead><tr><th>文件名</th><th>创建时间</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
          rows +
          "</tbody></table></div>"
        : options.emptyStateHtml) +
      "</div>" +
      "</aside>" +
      "</div>"
    );
  };
})(window);
