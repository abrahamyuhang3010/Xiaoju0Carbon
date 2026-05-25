(function attachTradeCenterSelector(global) {
  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderTradeCenterSelector = function renderTradeCenterSelector(options) {
    var escapeHtml = options.escapeHtml;
    var renderIcon = options.renderIcon;
    var dropdown = "";

    function getOptionLabel(option) {
      if (option === "湖南电力交易中心") {
        return "湖南交易中心";
      }
      if (option === "陕西电力交易中心") {
        return "陕西交易中心";
      }
      return option || "";
    }

    if (options.isOpen) {
      dropdown =
        '<div class="selector-dropdown trade-center-dropdown">' +
        (options.options || [])
          .map(function mapOption(option) {
            return (
              '<button class="selector-option ' +
              (option === options.selected ? "active" : "") +
              '" data-trade-center-select="' +
              escapeHtml(option) +
              '">' +
              "<span>" +
              escapeHtml(getOptionLabel(option)) +
              "</span>" +
              "</button>"
            );
          })
          .join("") +
        "</div>";
    }

    return (
      '<div class="selector-shell trade-center-selector">' +
      '<button class="select-like selector-trigger" data-trade-center-toggle="main">' +
      "<span>" +
      escapeHtml(getOptionLabel(options.selected)) +
      "</span>" +
      renderIcon("chevron-down", "inline-caret-icon") +
      "</button>" +
      dropdown +
      "</div>"
    );
  };
})(window);
