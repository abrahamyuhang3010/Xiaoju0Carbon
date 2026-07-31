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
    // 左侧导航按《售电业务-菜单架构.xlsx》对齐：
    // 一级 = sidebarSections 顶层；二级分组带 toggleKey + children；三级叶子带 pageKey。
    // 标注 [表格未收录] 的项为代码原有、Excel 未收录，按要求保留不删。
    sidebarSections: [
      {
        label: "资产管理",
        toggleKey: "assetExpanded",
        children: [
          { label: "微电网管理", pageKey: "asset-microgrid-management" },
          { label: "设备中心", pageKey: "asset-device-center" },
          { label: "标签管理", pageKey: "asset-tag-management" },
          // [表格未收录] 以下两项 Excel 无，保留待定
          { label: "商户管理", pageKey: "asset-merchant-management" },
          { label: "虚拟电厂管理", pageKey: "asset-virtual-plant-management" },
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
          // [表格未收录] Excel 仅"虚拟电厂管理"，以下两项保留待定
          { label: "资源聚合", pageKey: "vpp-resource-aggregation" },
          { label: "站点监测", pageKey: "vpp-site-monitoring" },
        ],
      },
      {
        label: "辅助服务",
        toggleKey: "serviceExpanded",
        children: [
          {
            label: "市场交易",
            toggleKey: "serviceMarketExpanded",
            children: [
              { label: "需求响应", pageKey: "service-demand-response" },
              { label: "有序充电", pageKey: "service-orderly-charging" },
              { label: "可中断负荷", pageKey: "service-interruptible-load" },
            ],
          },
          {
            label: "结算管理",
            toggleKey: "serviceSettlementExpanded",
            children: [{ label: "市场结算", pageKey: "service-market-settlement" }],
          },
          {
            label: "商户服务",
            toggleKey: "serviceMerchantExpanded",
            children: [{ label: "商户触达", pageKey: "service-merchant-reach" }],
          },
        ],
      },
      {
        label: "售电业务",
        toggleKey: "saleExpanded",
        children: [
          {
            label: "市场数据",
            toggleKey: "marketExpanded",
            children: [
              { label: "信息披露", pageKey: "gd-info-disclosure" },
              { label: "日清月结", pageKey: "gd-settlement" },
              { label: "滚搓数据", pageKey: "rolling-data" },
              { label: "零售关系", pageKey: "gd-retail-relation" },
              // [表格未收录] Excel 无，保留待定
              { label: "数据监控", pageKey: "data-monitor" },
            ],
          },
          {
            label: "仿真平台",
            toggleKey: "simulationExpanded",
            children: [
              { label: "现货仿真回测", pageKey: "spot-trading-simulation" },
              { label: "现货模拟交易", pageKey: "spot-mock-trading" },
            ],
          },
          { label: "交易决策分析", pageKey: "simulation-decision-analysis" },
          {
            label: "策略中心",
            toggleKey: "strategyExpanded",
            children: [
              { label: "策略管理", pageKey: "strategy-management" },
              { label: "模型管理", pageKey: "model-management" },
              { label: "特征管理", pageKey: "feature-management" },
              // [表格未收录] 原"交易策略"分组下的现货交易策略，保留待定
              { label: "现货交易策略", pageKey: "spot-trading-strategy" },
            ],
          },
          {
            label: "客户服务",
            toggleKey: "customerServiceExpanded",
            children: [
              { label: "客户拓展", pageKey: "customer-expansion" },
              { label: "电费测算", pageKey: "electricity-cost-estimation" },
              { label: "用电用户管理", pageKey: "power-user-management" },
            ],
          },
          { label: "充电联合", pageKey: "charging-union" },
          // [表格未收录] 以下两项 Excel 无，保留待定
          {
            label: "智能算法",
            toggleKey: "algorithmExpanded",
            children: [
              { label: "日前负荷预测", pageKey: "day-ahead-load-prediction" },
              { label: "价差及现货价格预测", pageKey: "spot-price-prediction" },
            ],
          },
          { label: "充电电价定价工具", pageKey: "charging-pricing-tool" },
        ],
      },
      {
        label: "光储经营",
        toggleKey: "storageExpanded",
        children: [
          {
            label: "项目建设",
            toggleKey: "storageProjectExpanded",
            children: [
              { label: "测算工具", pageKey: "storage-calc-tool" },
              { label: "储能沙盘", pageKey: "storage-sandbox" },
              { label: "项目管理", pageKey: "storage-project-management" },
            ],
          },
          {
            label: "项目运营",
            toggleKey: "storageOperationExpanded",
            children: [
              { label: "运营大盘", pageKey: "storage-operation-dashboard" },
              { label: "光储测算", pageKey: "storage-estimation" },
              { label: "电价管理", pageKey: "storage-price-management" },
              { label: "控制策略", pageKey: "storage-control-strategy" },
            ],
          },
          {
            label: "收益结算",
            toggleKey: "storageRevenueExpanded",
            children: [
              { label: "收益报表", pageKey: "storage-revenue-report" },
              { label: "结算账单", pageKey: "storage-settlement-bill" },
            ],
          },
          {
            label: "治理平台",
            toggleKey: "storageGovernanceExpanded",
            children: [
              { label: "异常监控", pageKey: "storage-anomaly-monitor" },
              { label: "工单管理", pageKey: "storage-work-order" },
              { label: "日志诊断", pageKey: "storage-log-diagnosis" },
            ],
          },
          // [表格未收录] 以下两项 Excel 无，保留待定
          { label: "光储资产", pageKey: "solar-storage-assets" },
          { label: "经营分析", pageKey: "storage-operation-analysis" },
        ],
      },
      {
        label: "调度中心",
        toggleKey: "dispatchExpanded",
        children: [
          { label: "调度策略", pageKey: "dispatch-strategy" },
          { label: "调度成本配置", pageKey: "dispatch-cost-config" },
          {
            label: "哥伦布",
            toggleKey: "columbusExpanded",
            children: [
              { label: "新航线（实验平台）", pageKey: "columbus-new-route" },
              { label: "指南针（指标体系）", pageKey: "columbus-compass" },
              { label: "新大陆（派单引擎）", pageKey: "columbus-new-continent" },
            ],
          },
          // [表格未收录] 以下三项 Excel 无，保留待定
          { label: "取数监控", pageKey: "fetch-monitor" },
          { label: "取数任务", pageKey: "fetch-tasks" },
          { label: "异常告警", pageKey: "fetch-alerts" },
        ],
      },
      {
        label: "低碳家园",
        toggleKey: "lowCarbonExpanded",
        children: [
          { label: "任务管理", pageKey: "low-carbon-task-management" },
          { label: "用户任务列表", pageKey: "low-carbon-user-tasks" },
          { label: "用户低碳币管理", pageKey: "low-carbon-coin-management" },
        ],
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
