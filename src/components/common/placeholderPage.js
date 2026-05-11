(function attachPlaceholderPage(global) {
  function fallbackEscape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderPlaceholderPage = function renderPlaceholderPage(options) {
    var escapeHtml = options.escapeHtml || fallbackEscape;

    return (
      '<div class="page-stack">' +
      '<section class="page-header">' +
      "<h1>功能建设中</h1>" +
      '<div class="overview-header-tip">' + escapeHtml(options.featureTitle || "") + "</div>" +
      "</section>" +
      '<section class="panel placeholder-panel placeholder-hero">' +
      '<div class="placeholder-copy">' +
      '<div class="placeholder-subtitle">' + escapeHtml(options.featureTitle || "平台能力入口") + "</div>" +
      "<p>当前功能为平台能力入口，后续将接入真实业务数据。</p>" +
      "</div>" +
      '<div class="placeholder-actions">' +
      '<button class="ghost-btn placeholder-back-btn" data-page-key="' + escapeHtml(options.returnPageKey || "business-center") + '">' +
      "<span>返回业务中心</span>" +
      "</button>" +
      "</div>" +
      "</section>" +
      "</div>"
    );
  };
})(window);
