(function attachDownloadTasksMock(global) {
  global.BOSS_DOWNLOAD_TASKS_MOCK = {
    summary: {
      retainDays: 7,
      maxVisibleRecords: 10,
      maxRowsPerFile: 200000,
    },
    records: [
      {
        id: "dl-gd-001",
        fileName: "信息披露_负荷信息_20260501至20260507.xls",
        createdAt: "2026-05-09 09:12:33",
        status: "成功",
        source: "广东交易中心",
      },
      {
        id: "dl-gd-002",
        fileName: "用电侧交易结果_节点电价_20260508.xls",
        createdAt: "2026-05-09 10:08:17",
        status: "排队中",
        source: "广东交易中心",
      },
      {
        id: "dl-hn-003",
        fileName: "湖南数据披露_系统负荷预测_20260501至20260509.xls",
        createdAt: "2026-05-09 10:26:45",
        status: "失败",
        source: "湖南交易中心",
      },
    ],
  };
})(window);
