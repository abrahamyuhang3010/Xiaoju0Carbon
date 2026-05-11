(function attachTradeCenterSelector(global) {
  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderTradeCenterSelector = function renderTradeCenterSelector(options) {
    var escapeHtml = options.escapeHtml;
    var renderIcon = options.renderIcon;
    var dropdown = "";

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
              escapeHtml(option) +
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
      escapeHtml(options.selected) +
      "</span>" +
      renderIcon("chevron-down", "inline-caret-icon") +
      "</button>" +
      dropdown +
      "</div>"
    );
  };
})(window);
