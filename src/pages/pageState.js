(function attachPageState(global) {
  var infoDisclosureConfig = global.BOSS_INFO_DISCLOSURE_CONFIG || {};
  var DEFAULT_CHECKED_METRICS = [
    "dispatch-load",
    "province-a",
    "province-b",
    "local-power",
    "wind",
    "solar",
    "thermal",
    "hydro",
    "hk-link",
    "west-east",
    "total-output",
    "spot-renewable",
    "dispatch-renewable",
    "hydro-total",
    "pump-plan",
  ];

  var DEFAULT_LOAD_DETAIL_HIDDEN = {
    "dispatch-forecast": true,
    "province-a-forecast": true,
    "province-b-forecast": true,
    "local-power-forecast": true,
    "hk-link-forecast": true,
    "west-east-forecast": true,
  };

  function cloneHiddenState(source) {
    var result = {};
    Object.keys(source || {}).forEach(function copy(key) {
      result[key] = source[key];
    });
    return result;
  }

  function createSidebarState() {
    return {
      assetExpanded: false,
      partnerExpanded: false,
      virtualPlantExpanded: false,
      serviceExpanded: false,
      saleExpanded: false,
      simulationExpanded: false,
      marketExpanded: false,
      guangdongExpanded: false,
      hunanExpanded: false,
      shaanxiExpanded: false,
      strategyExpanded: false,
      algorithmExpanded: false,
      storageExpanded: false,
      dispatchExpanded: false,
      lowCarbonExpanded: false,
      recordExpanded: false,
    };
  }

  function cloneTasks(records) {
    return (records || []).map(function mapTask(task) {
      return {
        id: task.id,
        fileName: task.fileName,
        createdAt: task.createdAt,
        status: task.status,
        source: task.source,
      };
    });
  }

  function cloneRange(range) {
    return {
      start: range.start,
      end: range.end,
    };
  }

  function formatDateValue(date) {
    function pad(value) {
      return String(value).padStart(2, "0");
    }

    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function buildRelativeDateRange(startOffsetDays, endOffsetDays) {
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() + startOffsetDays);
    end.setDate(end.getDate() + endOffsetDays);
    return {
      start: formatDateValue(start),
      end: formatDateValue(end),
    };
  }

  function getDefaultSaleCompanyRange() {
    return {
      start: "2026-05-25",
      end: "2026-05-29",
    };
  }

  function getTradeCenterByPageKey(pageKey) {
    if (pageKey === "gd-info-disclosure") {
      return "广东电力交易中心";
    }
    if (pageKey === "hn-data-disclosure") {
      return "湖南电力交易中心";
    }
    if (pageKey === "sx-data-disclosure") {
      return "陕西电力交易中心";
    }
    return "";
  }

  function isSupportedTradeCenter(centerName) {
    return (
      centerName === "广东电力交易中心" ||
      centerName === "湖南电力交易中心" ||
      centerName === "陕西电力交易中心"
    );
  }

  function createMarketDisclosureState(pageMock) {
    var tabs = (pageMock && pageMock.tabs) || [];
    var defaultRange = (pageMock && pageMock.defaultRange) || {
      start: "2026-05-03",
      end: "2026-05-09",
    };
    var defaultDate =
      (pageMock && pageMock.marketPageData && pageMock.marketPageData.defaultDate) ||
      (pageMock && pageMock.defaultDate) ||
      defaultRange.end ||
      defaultRange.start;
    var activeRange = {
      start: defaultDate,
      end: defaultDate,
    };

    return {
      activeTab: tabs[0] || "",
      filterRange: cloneRange(activeRange),
      appliedRange: cloneRange(activeRange),
      lastUpdatedAt: (pageMock && (pageMock.dataUpdatedAt || pageMock.updatedAt)) || "",
      queryCount: 0,
    };
  }

  global.BOSS_PAGE_STATE = {
    createInitialState: function createInitialState(options) {
      var registry = options.registry;
      var mock = options.mock;
      var appMocks = options.appMocks || {};
      var infoMock = (appMocks.guangdong && appMocks.guangdong.infoDisclosure) || {};
      var tradeResultMock = (appMocks.guangdong && appMocks.guangdong.tradeResult) || {};
      var settlementMock = (appMocks.guangdong && appMocks.guangdong.settlement) || {};
      var retailRelationMock = (appMocks.guangdong && appMocks.guangdong.retailRelation) || {};
      var declarationMock = (appMocks.guangdong && appMocks.guangdong.dayAheadDeclaration) || {};
      var rollingDataMock = (appMocks.guangdong && appMocks.guangdong.rollingData) || {};
      var hunanMock = appMocks.hunan || {};
      var shaanxiMock = appMocks.shaanxi || {};
      var hunanRollingMock = (hunanMock && hunanMock.rollingData) || {};
      var shaanxiRollingMock = (shaanxiMock && shaanxiMock.rollingData) || {};
      var fetchMonitorMock = appMocks.fetchMonitor || {};
      var operationRecordMock = appMocks.operationRecord || {};
      var simulationMock = appMocks.simulation || {};
      var algorithmMock = appMocks.algorithm || {};
      var tabs = infoDisclosureConfig.primaryTabs || infoMock.primaryTabs || infoMock.tabs || mock.primaryTabs || ["负荷信息"];
      var loadSecondaryTabs =
        (infoDisclosureConfig.secondaryTabs && infoDisclosureConfig.secondaryTabs["负荷信息"]) ||
        mock.secondaryTabs ||
        ["负荷信息"];
      var pageKey = registry.getPageKeyFromLocation(
        options.location || {
          hash: options.hash,
          pathname: options.pathname,
        }
      );
      var defaultEnterpriseRange = {
        start: "2026-05-29",
        end: "2026-05-29",
      };
      var defaultSaleCompanyRange = getDefaultSaleCompanyRange();
      var defaultHistoryAgentMonth = "2026-05";
      var defaultSellerHistoryRange = {
        start: "2026-05-25",
        end: "2026-05-29",
      };
      var defaultUserHistoryRange = {
        start: "2026-05-29",
        end: "2026-05-29",
      };
      var initialState = {
        currentPageKey: pageKey,
        sidebar: createSidebarState(),
        ui: {
          selectedTradeCenter: getTradeCenterByPageKey(pageKey) || "广东电力交易中心",
          tradeCenterOpen: false,
          activeDatePickerId: null,
          holidays: [
            { date: "2026-05-01", label: "劳动节", type: "holiday" },
            { date: "2026-05-02", label: "劳动节", type: "holiday" },
            { date: "2026-05-10", label: "调休", type: "adjustment" },
          ],
          runtimeRange: {
            start: "2026-05-08",
            end: "2026-05-08",
          },
          compareRangeDraft: {
            start: "2026-05-07",
            end: "2026-05-07",
          },
          manualPullRangeDraft: {
            start: "2026-05-02",
            end: "2026-05-08",
          },
          downloadRangeDraft: {
            start: "",
            end: "",
          },
          downloadCalendarOpen: false,
          downloadCalendarMonth: "2026-06",
          downloadSelectingPart: "start",
          downloadSubmitting: false,
          downloadListModalVisible: false,
          downloadListLoading: false,
          compareModalVisible: false,
          manualUpdateModalVisible: false,
          downloadModalVisible: false,
          disclosureTimeDrawerVisible: false,
          disclosureTimeFilters: {
            tradeCenter: getTradeCenterByPageKey(pageKey) === "湖南电力交易中心"
              ? "hunan"
              : getTradeCenterByPageKey(pageKey) === "陕西电力交易中心"
                ? "shaanxi"
                : "guangdong",
            dataKeyword: "",
            categoryKeyword: "",
          },
          disclosureTimePage: 1,
          hasCompare: false,
          compareError: "",
          manualUpdateMode: "upload",
          manualUpdateContext: "",
          manualUpdateTab: "",
          manualUploadFileName: "",
          manualUpdateAgentMonth: defaultHistoryAgentMonth,
          manualUpdateError: "",
          infoUpdateOverrides: {},
          downloadError: "",
          downloadDataType: "负荷信息",
          dataMonitorDetailDrawerVisible: false,
          dataMonitorSelectedRecordId: "",
          dataMonitorIgnoreConfirmVisible: false,
          dataMonitorPendingIgnoreId: "",
          dataMonitorIgnoreConfirmMode: "ignore",
          downloadRecordPage: 1,
          flashMessage: "",
          flashType: "info",
          copiedCellValue: "",
          copiedCellAt: 0,
          chartHiddenSeries: {
            "load-detail-chart": cloneHiddenState(DEFAULT_LOAD_DETAIL_HIDDEN),
          },
          tableSort: {},
        },
        info: {
          primaryTab: tabs[0],
          secondaryTab: loadSecondaryTabs[0],
          selectedMetric: "dispatch-load",
          profileViewMode: "",
          checkedMetrics: new Set(DEFAULT_CHECKED_METRICS),
          expandedMetrics: new Set(["local-power", "west-east", "hn-renewable-output", "sx-renewable-output"]),
          companyQueryAt: 0,
          enterpriseQueryAt: 0,
          contractCurveDetailTab: "电量明细",
          filters: {
            loadDetailRange: {
              start: "2026-05-08",
              end: "2026-05-08",
            },
            saleCompanyRange: {
              start: defaultSaleCompanyRange.start,
              end: defaultSaleCompanyRange.end,
            },
            saleCompanyAppliedRange: {
              start: defaultSaleCompanyRange.start,
              end: defaultSaleCompanyRange.end,
            },
            timeSharingRange: {
              start: defaultSaleCompanyRange.start,
              end: defaultSaleCompanyRange.end,
            },
            enterpriseRange: {
              start: defaultEnterpriseRange.start,
              end: defaultEnterpriseRange.end,
            },
            enterpriseUserCode: "",
            enterpriseUserName: "",
            enterpriseAccountNo: "",
            enterpriseMicrogridId: "",
            sellerHistoryAgentMonth: defaultHistoryAgentMonth,
            sellerHistoryRange: cloneRange(defaultSellerHistoryRange),
            sellerHistoryCompanyName: "全部",
            userHistoryAgentMonth: defaultHistoryAgentMonth,
            userHistoryRange: cloneRange(defaultUserHistoryRange),
            userHistoryUserCode: "",
            userHistoryUserName: "",
            userHistoryAccountNo: "",
            userHistoryMicrogridId: "",
            maintenanceRange: {
              start: "2026-05-08",
              end: "2026-05-08",
            },
            reserveRange: {
              start: "2026-05-08",
              end: "2026-05-08",
            },
            saleCompanyName: "全部",
            declarationType: "全部",
          },
        },
        tradeResult: {
          activeTab: (tradeResultMock.tabs && tradeResultMock.tabs[0]) || "全省统一出清价",
          selectedNode: "全省",
          filters: {
            marketRunRange: {
              start: (tradeResultMock.defaultRunDate || "2026-05-07"),
              end: (tradeResultMock.defaultRunDate || "2026-05-07"),
            },
            nodeRunRange: {
              start: (tradeResultMock.defaultRunDate || "2026-05-07"),
              end: (tradeResultMock.defaultRunDate || "2026-05-07"),
            },
            nodeKeyword: "",
          },
        },
        settlement: {
          activeTab: (settlementMock.tabs && settlementMock.tabs[0]) || "日清算",
          monthlySide: "购电侧",
          filters: {
            dailyRange: {
              start: "2026-05-03",
              end: "2026-05-09",
            },
            dailyUserName: "",
            dailyAccountNo: "",
            dailySellerCompanyName: "",
            dailySettlementUnitName: "",
            dailyStatementKey: "",
            dailyStatementType: "全部",
            dailyDataType: "全部",
            monthlyMonth: "2026-05",
            monthlyUserName: "",
            monthlyAccountNo: "",
            monthlySellerCompanyName: "",
            monthlyEnterpriseName: "",
            monthlyEnterpriseAccountNo: "",
            monthlyRetailUserCode: "",
            monthlyRetailUserName: "",
            monthlyRetailCity: "全部",
            monthlyRetailCategory: "全部",
            monthlyRetailEnergyMin: "",
            monthlyRetailEnergyMax: "",
            monthlyRetailFeeMin: "",
            monthlyRetailFeeMax: "",
          },
        },
        retailRelation: {
          filters: {
            userCode: "",
            userName: "",
            accountNo: "",
            status: "全部",
            cooperationRange: {
              start: (retailRelationMock.defaultRange && retailRelationMock.defaultRange.start) || "2026-01-01",
              end: (retailRelationMock.defaultRange && retailRelationMock.defaultRange.end) || "2026-12-31",
            },
          },
        },
        rollingData: {
          filters: {
            dateRange: cloneRange(rollingDataMock.defaultRange || {
              start: "2026-05-03",
              end: "2026-05-09",
            }),
            product: (rollingDataMock.productOptions && rollingDataMock.productOptions[0]) || "全部",
            hunanTradeDateRange: cloneRange((hunanRollingMock.longTermTradeResult && hunanRollingMock.longTermTradeResult.defaultRange) || {
              start: "2026-05-03",
              end: "2026-05-09",
            }),
            hunanTradeProduct:
              (hunanRollingMock.longTermTradeResult &&
                hunanRollingMock.longTermTradeResult.productOptions &&
                hunanRollingMock.longTermTradeResult.productOptions[0]) ||
              "全部",
            hunanContractPeriod:
              (hunanRollingMock.longTermTradeResult &&
                hunanRollingMock.longTermTradeResult.contractPeriodOptions &&
                hunanRollingMock.longTermTradeResult.contractPeriodOptions[0]) ||
              "全部",
            shaanxiCurveDate: {
              start:
                (shaanxiRollingMock.contractCurve && shaanxiRollingMock.contractCurve.defaultDate) ||
                "2026-05-09",
              end:
                (shaanxiRollingMock.contractCurve && shaanxiRollingMock.contractCurve.defaultDate) ||
                "2026-05-09",
            },
            shaanxiSequenceName:
              (shaanxiRollingMock.contractCurve &&
                shaanxiRollingMock.contractCurve.sequenceNameOptions &&
                shaanxiRollingMock.contractCurve.sequenceNameOptions[0]) ||
              "全部",
            shaanxiContractType:
              (shaanxiRollingMock.contractCurve &&
                shaanxiRollingMock.contractCurve.contractTypeOptions &&
                shaanxiRollingMock.contractCurve.contractTypeOptions[0]) ||
              "全部",
            shaanxiSellerUnit:
              (shaanxiRollingMock.contractCurve &&
                shaanxiRollingMock.contractCurve.sellerUnitOptions &&
                shaanxiRollingMock.contractCurve.sellerUnitOptions[0]) ||
              "全部",
            shaanxiBuyerUnit:
              (shaanxiRollingMock.contractCurve &&
                shaanxiRollingMock.contractCurve.buyerUnitOptions &&
                shaanxiRollingMock.contractCurve.buyerUnitOptions[0]) ||
              "全部",
            shaanxiContractName:
              (shaanxiRollingMock.contractCurve &&
                shaanxiRollingMock.contractCurve.contractNameOptions &&
                shaanxiRollingMock.contractCurve.contractNameOptions[0]) ||
              "全部",
            shaanxiTradeDate: {
              start:
                (shaanxiRollingMock.tradeOverview && shaanxiRollingMock.tradeOverview.defaultDate) ||
                "2026-05-09",
              end:
                (shaanxiRollingMock.tradeOverview && shaanxiRollingMock.tradeOverview.defaultDate) ||
                "2026-05-09",
            },
          },
        },
        declaration: {
          filters: {
            declarationRange: {
              start: (declarationMock.defaultDate && declarationMock.defaultDate.start) || "2026-05-09",
              end: (declarationMock.defaultDate && declarationMock.defaultDate.end) || "2026-05-09",
            },
            unit: "全部",
            status: "全部",
          },
        },
        simulation: {
          permissionVisible: true,
        },
        fetchMonitor: {
          filters: {
            tradeCenter: (fetchMonitorMock.filters && fetchMonitorMock.filters.tradeCenterOptions && fetchMonitorMock.filters.tradeCenterOptions[0]) || "全部",
            status: (fetchMonitorMock.filters && fetchMonitorMock.filters.statusOptions && fetchMonitorMock.filters.statusOptions[0]) || "全部",
            taskType: (fetchMonitorMock.filters && fetchMonitorMock.filters.taskTypeOptions && fetchMonitorMock.filters.taskTypeOptions[0]) || "全部",
            dateRange: cloneRange((fetchMonitorMock.filters && fetchMonitorMock.filters.defaultRange) || {
              start: "2026-05-03",
              end: "2026-05-09",
            }),
          },
        },
        operationRecord: {
          filters: {
            operatorKeyword: "",
            operationLogId: "",
            module: "全部",
            action: "全部",
            operationType: "",
            logRange: cloneRange((operationRecordMock.operationLog && operationRecordMock.operationLog.filters && operationRecordMock.operationLog.filters.defaultRange) || {
              start: "",
              end: "",
            }),
            expandedOperationLogIds: new Set(),
            operationLogPage: 1,
            auditApplicantKeyword: "",
            auditRecordId: "",
            auditType: "",
            auditTypeOpen: false,
            auditRangePickerOpen: false,
            auditRangeCalendarMonth: "2026-06",
            auditRangeSelectingPart: "start",
            expandedAuditRecordIds: new Set(),
            auditRecordPage: 1,
            auditRange: cloneRange((operationRecordMock.auditRecords && operationRecordMock.auditRecords.filters && operationRecordMock.auditRecords.filters.defaultRange) || {
              start: "2026-06-15 16:55:22",
              end: "2026-06-25 16:55:22",
            }),
          },
        },
        dataMonitor: {
          filters: {
            categoryPath: [],
          },
          ignoredIds: [],
          rollbackIgnoredIds: [],
          ignoredMeta: {},
        },
        spotTradingSimulation: {
          filters: {
            tradeCenter: (simulationMock.spotTradingSimulation &&
              simulationMock.spotTradingSimulation.filters &&
              simulationMock.spotTradingSimulation.filters.tradeCenterOptions &&
              simulationMock.spotTradingSimulation.filters.tradeCenterOptions[0]) ||
              "全部",
            strategyName: (simulationMock.spotTradingSimulation &&
              simulationMock.spotTradingSimulation.filters &&
              simulationMock.spotTradingSimulation.filters.strategyOptions &&
              simulationMock.spotTradingSimulation.filters.strategyOptions[0]) ||
              "全部",
            backtestRange: cloneRange(
              (simulationMock.spotTradingSimulation &&
                simulationMock.spotTradingSimulation.filters &&
                simulationMock.spotTradingSimulation.filters.defaultRange) || {
                start: "2026-05-03",
                end: "2026-05-09",
              },
            ),
          },
        },
        spotMockTrading: {
          filters: {
            strategy:
              (simulationMock.spotMockTrading &&
                simulationMock.spotMockTrading.filters &&
                simulationMock.spotMockTrading.filters.strategyOptions &&
                simulationMock.spotMockTrading.filters.strategyOptions[0]) ||
              "请选择交易策略",
            tradeRange: cloneRange(
              (simulationMock.spotMockTrading &&
                simulationMock.spotMockTrading.filters &&
                simulationMock.spotMockTrading.filters.defaultRange) || {
                start: "2026-05-06",
                end: "2026-05-09",
              },
            ),
          },
        },
        dayAheadLoadPrediction: {
          filters: {
            tradeCenter: (algorithmMock.dayAheadLoadPrediction &&
              algorithmMock.dayAheadLoadPrediction.filters &&
              algorithmMock.dayAheadLoadPrediction.filters.tradeCenterOptions &&
              algorithmMock.dayAheadLoadPrediction.filters.tradeCenterOptions[0]) ||
              "全部",
            userType: (algorithmMock.dayAheadLoadPrediction &&
              algorithmMock.dayAheadLoadPrediction.filters &&
              algorithmMock.dayAheadLoadPrediction.filters.userTypeOptions &&
              algorithmMock.dayAheadLoadPrediction.filters.userTypeOptions[0]) ||
              "全部",
            industryType: (algorithmMock.dayAheadLoadPrediction &&
              algorithmMock.dayAheadLoadPrediction.filters &&
              algorithmMock.dayAheadLoadPrediction.filters.industryTypeOptions &&
              algorithmMock.dayAheadLoadPrediction.filters.industryTypeOptions[0]) ||
              "全部",
            predictionDate: {
              start:
                (algorithmMock.dayAheadLoadPrediction &&
                  algorithmMock.dayAheadLoadPrediction.filters &&
                  algorithmMock.dayAheadLoadPrediction.filters.defaultDate) ||
                "2026-05-09",
              end:
                (algorithmMock.dayAheadLoadPrediction &&
                  algorithmMock.dayAheadLoadPrediction.filters &&
                  algorithmMock.dayAheadLoadPrediction.filters.defaultDate) ||
                "2026-05-09",
            },
          },
        },
        spotPricePrediction: {
          filters: {
            tradeCenter: (algorithmMock.spotPricePrediction &&
              algorithmMock.spotPricePrediction.filters &&
              algorithmMock.spotPricePrediction.filters.tradeCenterOptions &&
              algorithmMock.spotPricePrediction.filters.tradeCenterOptions[0]) ||
              "全部",
            predictionDate: {
              start:
                (algorithmMock.spotPricePrediction &&
                  algorithmMock.spotPricePrediction.filters &&
                  algorithmMock.spotPricePrediction.filters.defaultDate) ||
                "2026-05-09",
              end:
                (algorithmMock.spotPricePrediction &&
                  algorithmMock.spotPricePrediction.filters &&
                  algorithmMock.spotPricePrediction.filters.defaultDate) ||
                "2026-05-09",
            },
            priceType: (algorithmMock.spotPricePrediction &&
              algorithmMock.spotPricePrediction.filters &&
              algorithmMock.spotPricePrediction.filters.priceTypeOptions &&
              algorithmMock.spotPricePrediction.filters.priceTypeOptions[0]) ||
              "全部",
          },
        },
        marketDisclosure: {
          pages: {
            "hn-data-disclosure": createMarketDisclosureState(hunanMock),
            "sx-data-disclosure": createMarketDisclosureState(shaanxiMock),
          },
        },
        downloadTasks: cloneTasks((appMocks.downloadTasks && appMocks.downloadTasks.records) || []),
      };

      this.applyPageDefaults(initialState, pageKey, registry);
      return initialState;
    },
    applyPageDefaults: function applyPageDefaults(state, pageKey, registry) {
      var nextSidebar = createSidebarState();
      registry.getPage(pageKey).sidebarTrail.forEach(function openTrail(toggleKey) {
        nextSidebar[toggleKey] = true;
      });
      state.sidebar = nextSidebar;
      var pageTradeCenter = getTradeCenterByPageKey(pageKey);
      if (pageTradeCenter) {
        if (pageKey === "gd-info-disclosure" && isSupportedTradeCenter(state.ui.selectedTradeCenter)) {
          pageTradeCenter = state.ui.selectedTradeCenter;
        }
        state.ui.selectedTradeCenter = pageTradeCenter;
      }
      if (pageKey === "data-monitor") {
        state.ui.selectedTradeCenter = "广东交易中心";
        state.dataMonitor = state.dataMonitor || {};
        state.dataMonitor.filters = state.dataMonitor.filters || {};
        state.dataMonitor.filters.categoryPath = [];
      }
      if (pageKey === "spot-mock-trading") {
        state.simulation.permissionVisible = true;
      }
    },
    navigate: function navigate(state, pageKey, registry, location) {
      var nextPageKey = registry.getPage(pageKey).key;
      state.currentPageKey = nextPageKey;
      this.applyPageDefaults(state, nextPageKey, registry);
      var nextHash = registry.getHashFromPageKey(nextPageKey);
      if (location.hash !== "#" + nextHash) {
        location.hash = nextHash;
        return false;
      }
      return true;
    },
    syncFromHash: function syncFromHash(state, registry, location) {
      var nextPageKey = registry.getPageKeyFromHash(location.hash);
      state.currentPageKey = nextPageKey;
      this.applyPageDefaults(state, nextPageKey, registry);
    },
  };
})(window);
