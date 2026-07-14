(function attachPlatformMenuMock(global) {
  global.BOSS_PLATFORM_MENU_MOCK = {
    defaultPageKey: "business-center",
    topNavItems: [
      { label: "首页" },
      { label: "业务中心", active: true, caret: "up", pageKey: "business-center" },
      { label: "安全中心", caret: "down" },
      { label: "体验中心", caret: "down" },
      { label: "效能中心", caret: "down" },
      { label: "文化中心", caret: "down" },
      { label: "学习中心", caret: "down" },
    ],
    sidebarSections: [
      {
        label: "资产管理",
        toggleKey: "assetExpanded",
        children: [
          { label: "商户管理", pageKey: "asset-merchant-management" },
          { label: "微电网管理", pageKey: "asset-microgrid-management" },
          { label: "虚拟电厂管理", pageKey: "asset-virtual-plant-management" },
          { label: "设备中心", pageKey: "asset-device-center" },
          { label: "用电情况监测", pageKey: "asset-power-monitoring" },
        ],
      },
      {
        label: "合作方管理",
        toggleKey: "partnerExpanded",
        children: [
          { label: "资方管理", pageKey: "partner-funder-management" },
          { label: "设备商管理", pageKey: "partner-vendor-management" },
          { label: "商户管理", pageKey: "partner-merchant-management" },
        ],
      },
      {
        label: "虚拟电厂",
        toggleKey: "virtualPlantExpanded",
        children: [
          { label: "虚拟电厂管理", pageKey: "vpp-management" },
          { label: "资源聚合", pageKey: "vpp-resource-aggregation" },
          { label: "站点监测", pageKey: "vpp-site-monitoring" },
        ],
      },
      {
        label: "辅助服务",
        toggleKey: "serviceExpanded",
        children: [
          { label: "需求响应", pageKey: "service-demand-response" },
          { label: "有序充电", pageKey: "service-orderly-charging" },
          { label: "可中断负荷", pageKey: "service-interruptible-load" },
          { label: "市场结算", pageKey: "service-market-settlement" },
          { label: "商户触达", pageKey: "service-merchant-reach" },
        ],
      },
      {
        label: "售电业务",
        toggleKey: "saleExpanded",
        children: [
          {
            label: "仿真平台",
            toggleKey: "simulationExpanded",
            children: [
              { label: "现货仿真回测", pageKey: "spot-trading-simulation" },
              { label: "现货模拟交易", pageKey: "spot-mock-trading" },
              { label: "交易决策分析", pageKey: "simulation-decision-analysis" },
            ],
          },
          {
            label: "市场数据",
            toggleKey: "marketExpanded",
            children: [
              { label: "信息披露", pageKey: "gd-info-disclosure" },
              { label: "日清月结", pageKey: "gd-settlement" },
              { label: "零售关系", pageKey: "gd-retail-relation" },
              { label: "滚搓数据", pageKey: "rolling-data" },
              { label: "数据监控", pageKey: "data-monitor" },
            ],
          },
          {
            label: "交易策略",
            toggleKey: "strategyExpanded",
            children: [{ label: "现货交易策略", pageKey: "spot-trading-strategy" }],
          },
          {
            label: "智能算法",
            toggleKey: "algorithmExpanded",
            children: [
              { label: "日前负荷预测", pageKey: "day-ahead-load-prediction" },
              { label: "价差及现货价格预测", pageKey: "spot-price-prediction" },
            ],
          },
          { label: "用电用户管理", pageKey: "power-user-management" },
          { label: "充电电价定价工具", pageKey: "charging-pricing-tool" },
        ],
      },
      {
        label: "光储经营",
        toggleKey: "storageExpanded",
        children: [
          { label: "光储资产", pageKey: "solar-storage-assets" },
          { label: "经营分析", pageKey: "storage-operation-analysis" },
        ],
      },
      {
        label: "调度中心",
        toggleKey: "dispatchExpanded",
        children: [
          { label: "取数监控", pageKey: "fetch-monitor" },
          { label: "取数任务", pageKey: "fetch-tasks" },
          { label: "异常告警", pageKey: "fetch-alerts" },
        ],
      },
      {
        label: "低碳家园",
        toggleKey: "lowCarbonExpanded",
        children: [{ label: "低碳服务", pageKey: "low-carbon-service" }],
      },
      {
        label: "操作记录",
        toggleKey: "recordExpanded",
        children: [
          { label: "下载记录", pageKey: "download-record" },
          { label: "操作日志", pageKey: "operation-log" },
          { label: "审核记录", pageKey: "audit-record" },
        ],
      },
    ],
  };
})(window);
