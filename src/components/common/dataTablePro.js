(function attachDataTablePro(global) {
  function parseSortableValue(value) {
    if (value === null || value === undefined) {
      return Number.NEGATIVE_INFINITY;
    }

    if (value && typeof value === "object") {
      if (value.sortValue !== undefined) {
        return parseSortableValue(value.sortValue);
      }
      if (value.text !== undefined) {
        return parseSortableValue(value.text);
      }
      return Number.NEGATIVE_INFINITY;
    }

    var stringValue = String(value).replace(/[,%\s元MWWh至年月日:]/g, "");
    var numericValue = Number(stringValue);
    return Number.isNaN(numericValue) ? String(value) : numericValue;
  }

  global.BOSS_COMPONENTS = global.BOSS_COMPONENTS || {};
  global.BOSS_COMPONENTS.renderDataTablePro = function renderDataTablePro(options) {
    var escapeHtml = options.escapeHtml;
    var renderEmptyState = options.renderEmptyState;
    var columns = (options.columns || []).map(function normalize(column, index) {
      if (typeof column === "string") {
        return {
          key: "col-" + index,
          label: column,
          sortable: true,
        };
      }
      return {
        key: column.key || "col-" + index,
        label: column.label,
        sortable: column.sortable !== false,
      };
    });
    var rows = (options.rows || []).slice();
    var sortState = options.sortState || {};

    if (sortState.key && sortState.direction) {
      var sortIndex = columns.findIndex(function findColumn(column) {
        return column.key === sortState.key;
      });
      if (sortIndex >= 0) {
        rows.sort(function compare(a, b) {
          var aValue = parseSortableValue(Array.isArray(a) ? a[sortIndex] : a[columns[sortIndex].key]);
          var bValue = parseSortableValue(Array.isArray(b) ? b[sortIndex] : b[columns[sortIndex].key]);
          if (aValue === bValue) {
            return 0;
          }
          return sortState.direction === "asc" ? (aValue > bValue ? 1 : -1) : aValue > bValue ? -1 : 1;
        });
      }
    }

    if (!rows.length) {
      return renderEmptyState({
        escapeHtml: escapeHtml,
        renderIcon: options.renderIcon,
        message: "当前日期暂无交易中心披露数据，请切换日期或手动更新数据",
      });
    }

    var head = columns
      .map(function mapColumn(column) {
        var direction = sortState.key === column.key ? sortState.direction : "";
        if (column.sortable === false) {
          return "<th><span>" + escapeHtml(column.label) + "</span></th>";
        }
        return (
          "<th>" +
          '<button class="table-header-sort" data-table-id="' +
          escapeHtml(options.tableId) +
          '" data-sort-key="' +
          escapeHtml(column.key) +
          '">' +
          "<span>" +
          escapeHtml(column.label) +
          '</span><span class="table-header-icons"><span class="table-drag-handle"></span><span class="sort-indicator ' +
          (direction || "none") +
          '"></span></span></button>' +
          "</th>"
        );
      })
      .join("");

    var body = rows
      .map(function mapRow(row) {
        var cells = columns
          .map(function mapColumn(column, index) {
            var value = Array.isArray(row) ? row[index] : row[column.key];
            if (value && typeof value === "object" && Array.isArray(value.actions)) {
              return (
                '<td><div class="table-action-group">' +
                value.actions
                  .map(function mapAction(action) {
                    var attrs = "";
                    if (action.action) {
                      attrs += ' data-ui-action="' + escapeHtml(action.action) + '"';
                    }
                    if (action.recordId) {
                      attrs += ' data-record-id="' + escapeHtml(action.recordId) + '"';
                    }
                    if (action.payload) {
                      attrs += ' data-action-payload="' + escapeHtml(action.payload) + '"';
                    }
                    return '<button class="table-text-button"' + attrs + ">" + escapeHtml(action.label) + "</button>";
                  })
                  .join("") +
                "</div></td>"
              );
            }

            var displayValue = value && typeof value === "object" && value.text !== undefined ? value.text : value;
            var extraClassName = value && typeof value === "object" && value.className ? value.className : "";
            var negative =
              String(column.label).indexOf("差值") >= 0 &&
              displayValue !== "--" &&
              !Number.isNaN(Number(displayValue)) &&
              Number(displayValue) < 0;
            var copyable = !(value && typeof value === "object" && value.copyable === false);
            var contentHtml = value && typeof value === "object" && value.badge
              ? '<span class="table-badge table-badge-' + escapeHtml(value.tone || "default") + '">' + escapeHtml(displayValue) + "</span>"
              : '<span class="table-cell-text">' + escapeHtml(displayValue) + "</span>";
            return (
              '<td class="' +
              [negative ? "table-negative" : "", extraClassName].filter(Boolean).join(" ") +
              '">' +
              '<div class="table-cell-shell">' +
              contentHtml +
              (copyable
                ? '<button class="table-copy-btn" data-copy-cell="' + escapeHtml(displayValue) + '" title="复制单元格内容">复制</button>'
                : "") +
              "</div></td>"
            );
          })
          .join("");
        return "<tr>" + cells + "</tr>";
      })
      .join("");

    return (
      '<div class="table-wrap table-pro-wrap"><table class="data-table"' +
      (options.minWidth ? ' style="min-width:' + escapeHtml(String(options.minWidth)) + 'px;"' : "") +
      "><thead><tr>" +
      head +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table></div>"
    );
  };
})(window);
