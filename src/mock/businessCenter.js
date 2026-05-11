(function attachBusinessCenterMock(global) {
  global.BOSS_BUSINESS_CENTER_MOCK = {
    overviewSections: [
      {
        title: "资产管理",
        groups: [
          {
            title: "",
            items: [
              { label: "商户管理", pageKey: "asset-merchant-management" },
              { label: "微电网管理", pageKey: "asset-microgrid-management" },
              { label: "虚拟电厂管理", pageKey: "asset-virtual-plant-management" },
              { label: "设备中心", pageKey: "asset-device-center" },
              { label: "用电情况监测", pageKey: "asset-power-monitoring" },
            ],
          },
        ],
      },
      {
        title: "合作方管理",
        groups: [
          {
            title: "",
            items: [
              { label: "资方管理", pageKey: "partner-funder-management" },
              { label: "设备商管理", pageKey: "partner-vendor-management" },
              { label: "商户管理", pageKey: "partner-merchant-management" },
            ],
          },
        ],
      },
      {
        title: "虚拟电厂",
        groups: [
          {
            title: "",
            items: [
              { label: "虚拟电厂管理", pageKey: "vpp-management" },
              { label: "资源聚合", pageKey: "vpp-resource-aggregation" },
              { label: "站点监测", pageKey: "vpp-site-monitoring" },
            ],
          },
        ],
      },
      {
        title: "辅助服务",
        groups: [
          {
            title: "",
            items: [
              { label: "需求响应", pageKey: "service-demand-response" },
              { label: "有序充电", pageKey: "service-orderly-charging" },
              { label: "可中断负荷", pageKey: "service-interruptible-load" },
              { label: "市场结算", pageKey: "service-market-settlement" },
              { label: "商户触达", pageKey: "service-merchant-reach" },
            ],
          },
        ],
      },
      {
        title: "售电业务",
        wide: true,
        groups: [
          {
            title: "",
            items: [
              { label: "信息披露", pageKey: "gd-info-disclosure" },
              { label: "用电侧交易结果", pageKey: "gd-trade-result" },
              { label: "日清月结", pageKey: "gd-settlement" },
              { label: "零售关系", pageKey: "gd-retail-relation" },
              { label: "日前申报", pageKey: "gd-day-ahead-declaration" },
              { label: "现货交易仿真", pageKey: "spot-trading-simulation" },
              { label: "现货模拟交易", pageKey: "spot-mock-trading" },
              { label: "现货交易策略", pageKey: "spot-trading-strategy" },
              { label: "日前负荷预测", pageKey: "day-ahead-load-prediction" },
              { label: "价差及现货价格预测", pageKey: "spot-price-prediction" },
              { label: "用电用户管理", pageKey: "power-user-management" },
              { label: "充电电价定价工具", pageKey: "charging-pricing-tool" },
            ],
          },
        ],
      },
      {
        title: "电力交易驾驶舱",
        wide: true,
        groups: [
          {
            title: "",
            items: [
              { label: "现货交易策略", pageKey: "spot-trading-strategy" },
              { label: "月内滚撮交易", pageKey: "intramonth-rolling-trading" },
              { label: "电量数据导入", pageKey: "power-data-import" },
              { label: "负荷预测", pageKey: "day-ahead-load-prediction" },
              { label: "现货价格价差预测", pageKey: "spot-price-prediction" },
              { label: "仿真回测", pageKey: "spot-trading-simulation" },
              { label: "模拟交易", pageKey: "spot-mock-trading" },
            ],
          },
        ],
      },
    ],
  };
})(window);
