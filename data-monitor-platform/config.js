window.DATA_MONITOR_CONFIG = {
  appName: "数据监控预警",
  environment: "prod",
  defaultCenter: "guangdong",
  apiBaseUrl: "/api",
  requestTimeoutMs: 8000,
  centers: [
    { id: "guangdong", name: "广东交易中心", env: "prod / guangdong" },
    { id: "hunan", name: "湖南交易中心", env: "prod / hunan" },
    { id: "shaanxi", name: "陕西交易中心", env: "prod / shaanxi" },
  ],
  realDataContractVersion: "2026-06-15",
};
