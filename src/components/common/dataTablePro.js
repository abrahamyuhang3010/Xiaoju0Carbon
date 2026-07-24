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
    var useColumnWidth = Boolean(options.useColumnWidth);
    var fixedLeft = 0;
    var columns = (options.columns || []).map(function normalize(column, index) {
      if (typeof column === "string") {
        return {
          key: "col-" + index,
          label: column,
          sortable: true,
          fixed: false,
          fixedSide: "",
          width: 128,
          left: 0,
          right: 0,
        };
      }
      var width = Number(column.width || 128);
      var fixedSide = column.fixed === "right" || column.fixedRight ? "right" : column.fixed ? "left" : "";
      var normalizedColumn = {
        key: column.key || "col-" + index,
        label: column.label || column.title || column.key || "列" + (index + 1),
        sortable: column.sortable !== false,
        draggable: column.draggable !== false,
        fixed: Boolean(fixedSide),
        fixedSide: fixedSide,
        width: width,
        left: 0,
        right: 0,
      };
      if (normalizedColumn.fixedSide === "left") {
        normalizedColumn.left = fixedLeft;
        fixedLeft += width;
      }
      return normalizedColumn;
    });
    var columnOrder = Array.isArray(options.columnOrder) ? options.columnOrder : [];
    if (columnOrder.length) {
      var fixedLeftColumns = columns.filter(function filterFixedLeftColumn(column) {
        return column.fixedSide === "left";
      });
      var fixedRightColumns = columns.filter(function filterFixedRightColumn(column) {
        return column.fixedSide === "right";
      });
      var scrollColumns = columns.filter(function filterScrollColumn(column) {
        return !column.fixed;
      });
      scrollColumns.sort(function compareColumns(a, b) {
        var aIndex = columnOrder.indexOf(a.key);
        var bIndex = columnOrder.indexOf(b.key);
        if (aIndex < 0 && bIndex < 0) {
          return 0;
        }
        if (aIndex < 0) {
          return 1;
        }
        if (bIndex < 0) {
          return -1;
        }
        return aIndex - bIndex;
      });
      columns = fixedLeftColumns.concat(scrollColumns).concat(fixedRightColumns);
    }
    var fixedRight = 0;
    for (var rightIndex = columns.length - 1; rightIndex >= 0; rightIndex -= 1) {
      if (columns[rightIndex].fixedSide === "right") {
        columns[rightIndex].right = fixedRight;
        fixedRight += columns[rightIndex].width;
      }
    }
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

    // Header groups: build the parent (group) row first so the sub-header row below can
    // skip un-grouped columns (they are rendered with rowspan="2" in the group row).
    var headerGroups = Array.isArray(options.headerGroups) ? options.headerGroups : [];
    var groupHead = "";
    // column-key -> group-key map; built unconditionally so the sub-header row can
    // skip un-grouped columns (those are rendered with rowspan="2" in the group row).
    var columnGroupByKey = {};
    if (headerGroups.length) {
      headerGroups.forEach(function mapGroup(group) {
        (group.keys || []).forEach(function mapKey(key) {
          columnGroupByKey[key] = group.key || group.label;
        });
      });
      // Walk the final column order and emit a group <th> (colspan) for consecutive columns
      // sharing the same group, or a rowspan="2" <th> for un-grouped columns.
      var groupCells = [];
      var i = 0;
      while (i < columns.length) {
        var groupKey = columnGroupByKey[columns[i].key];
        if (!groupKey) {
          // Un-grouped column: spans both header rows.
          var col = columns[i];
          var colFixedClass = col.fixed ? "table-fixed-col table-fixed-" + col.fixedSide : "";
          var colClassName = colFixedClass ? ' class="table-group-cell ' + colFixedClass + '"' : ' class="table-group-cell"';
          var colStyleAttr = col.fixedSide === "left"
            ? ' style="left:' + escapeHtml(String(col.left)) + "px;width:" + escapeHtml(String(col.width)) + "px;min-width:" + escapeHtml(String(col.width)) + 'px;"'
            : col.fixedSide === "right"
              ? ' style="right:' + escapeHtml(String(col.right)) + "px;width:" + escapeHtml(String(col.width)) + "px;min-width:" + escapeHtml(String(col.width)) + 'px;"'
              : col.width
                ? ' style="min-width:' + escapeHtml(String(col.width)) + 'px;"'
                : "";
          groupCells.push("<th" + colClassName + colStyleAttr + ' rowspan="2"><span>' + escapeHtml(col.label) + "</span></th>");
          i += 1;
          continue;
        }
        // Grouped run: count consecutive columns sharing this group key.
        var span = 0;
        var runWidth = 0;
        while (i + span < columns.length && columnGroupByKey[columns[i + span].key] === groupKey) {
          runWidth += columns[i + span].width;
          span += 1;
        }
        var group = headerGroups.filter(function findGroup(g) {
          return (g.key || g.label) === groupKey;
        })[0] || { label: groupKey };
        groupCells.push(
          '<th class="table-group-cell" colspan="' +
          escapeHtml(String(span)) +
          '"' +
          (runWidth ? ' style="min-width:' + escapeHtml(String(runWidth)) + 'px;"' : "") +
          "><span>" +
          escapeHtml(group.label) +
          "</span></th>"
        );
        i += span;
      }
      groupHead = "<tr class=\"table-group-row\">" + groupCells.join("") + "</tr>";
    }

    // Sub-header row. When header groups exist, un-grouped columns are already rendered
    // in the group row with rowspan="2", so they must be skipped here to avoid duplication.
    var head = columns
      .filter(function keepGroupedOnlyWhenGrouped(column) {
        return !headerGroups.length || columnGroupByKey[column.key];
      })
      .map(function mapColumn(column) {
        var direction = sortState.key === column.key ? sortState.direction : "";
        var thAttrs = "";
        var fixedClass = column.fixed ? "table-fixed-col table-fixed-" + column.fixedSide : "";
        var className = fixedClass ? ' class="' + fixedClass + '"' : "";
        var style = column.fixedSide === "left"
          ? ' style="left:' + escapeHtml(String(column.left)) + "px;width:" + escapeHtml(String(column.width)) + "px;min-width:" + escapeHtml(String(column.width)) + 'px;"'
          : column.fixedSide === "right"
            ? ' style="right:' + escapeHtml(String(column.right)) + "px;width:" + escapeHtml(String(column.width)) + "px;min-width:" + escapeHtml(String(column.width)) + 'px;"'
            : column.width
              ? ' style="' +
                (useColumnWidth ? "width:" + escapeHtml(String(column.width)) + "px;" : "") +
                "min-width:" +
                escapeHtml(String(column.width)) +
                'px;"'
              : "";
        if (options.enableColumnDrag && column.sortable !== false && column.draggable !== false) {
          thAttrs =
            ' draggable="true" data-table-id="' +
            escapeHtml(options.tableId) +
            '" data-column-drag-key="' +
            escapeHtml(column.key) +
            '"';
        }
        if (column.sortable === false) {
          return "<th" + className + style + thAttrs + "><span>" + escapeHtml(column.label) + "</span></th>";
        }
        return (
          "<th" +
          className +
          style +
          thAttrs +
          ">" +
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
              var actionCellClassName = column.fixed ? ' class="table-fixed-col table-fixed-' + escapeHtml(column.fixedSide) + '"' : "";
              var actionCellStyle = column.fixedSide === "left"
                ? ' style="left:' + escapeHtml(String(column.left)) + "px;width:" + escapeHtml(String(column.width)) + "px;min-width:" + escapeHtml(String(column.width)) + 'px;"'
                : column.fixedSide === "right"
                  ? ' style="right:' + escapeHtml(String(column.right)) + "px;width:" + escapeHtml(String(column.width)) + "px;min-width:" + escapeHtml(String(column.width)) + 'px;"'
                  : column.width
                    ? ' style="' +
                      (useColumnWidth ? "width:" + escapeHtml(String(column.width)) + "px;" : "") +
                      "min-width:" +
                      escapeHtml(String(column.width)) +
                      'px;"'
                    : "";
              return (
                "<td" + actionCellClassName + actionCellStyle + '><div class="table-action-group">' +
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
              (String(column.label).indexOf("差值") >= 0 || String(column.label).indexOf("价差") >= 0) &&
              displayValue !== "--" &&
              !Number.isNaN(Number(displayValue)) &&
              Number(displayValue) < 0;
            var cellClassName = [
              column.fixed ? "table-fixed-col table-fixed-" + column.fixedSide : "",
              negative ? "table-negative" : "",
              extraClassName,
            ]
              .filter(Boolean)
              .join(" ");
            var cellStyle = column.fixedSide === "left"
              ? ' style="left:' + escapeHtml(String(column.left)) + "px;width:" + escapeHtml(String(column.width)) + "px;min-width:" + escapeHtml(String(column.width)) + 'px;"'
              : column.fixedSide === "right"
                ? ' style="right:' + escapeHtml(String(column.right)) + "px;width:" + escapeHtml(String(column.width)) + "px;min-width:" + escapeHtml(String(column.width)) + 'px;"'
                : column.width
                  ? ' style="' +
                    (useColumnWidth ? "width:" + escapeHtml(String(column.width)) + "px;" : "") +
                    "min-width:" +
                    escapeHtml(String(column.width)) +
                    'px;"'
                  : "";
            var copyable = !(value && typeof value === "object" && value.copyable === false);
            var contentHtml = value && typeof value === "object" && value.html !== undefined
              ? value.html
              : value && typeof value === "object" && value.badge
                ? '<span class="table-badge table-badge-' + escapeHtml(value.tone || "default") + '">' + escapeHtml(displayValue) + "</span>"
                : '<span class="table-cell-text">' + escapeHtml(displayValue) + "</span>";
            return (
              '<td class="' +
              cellClassName +
              '"' +
              cellStyle +
              ">" +
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
      '<div class="table-wrap table-pro-wrap"><table class="data-table" data-table-id="' +
      escapeHtml(options.tableId) +
      '"' +
      (options.minWidth ? ' style="min-width:' + escapeHtml(String(options.minWidth)) + 'px;"' : "") +
      "><thead>" +
      groupHead +
      "<tr>" +
      head +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table></div>"
    );
  };
})(window);
