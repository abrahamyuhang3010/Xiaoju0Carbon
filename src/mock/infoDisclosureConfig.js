(function attachInfoDisclosureConfig(global) {
  global.BOSS_INFO_DISCLOSURE_CONFIG = {
    title: "信息披露",
    primaryTabs: [
      "负荷信息",
      "全省统一出清价",
      "出清电量",
      "交易结果",
      "售电公司分时电量",
      "用电企业分时电量",
      "节点电价",
      "日前申报",
    ],
    secondaryTabs: {
      "负荷信息": ["负荷信息", "负荷详情", "机组检修容量", "备用信息"],
    },
    dataSourceAccess: {
      guangdong: {
        "负荷信息": true,
        "负荷详情": true,
        "机组检修容量": true,
        "备用信息": true,
        "全省统一出清价": true,
        "出清电量": true,
        "交易结果": true,
        "售电公司分时电量": true,
        "用电企业分时电量": true,
        "节点电价": true,
        "日前申报": true,
      },
      hunan: {
        "负荷信息": true,
        "负荷详情": false,
        "机组检修容量": true,
        "备用信息": true,
        "全省统一出清价": false,
        "出清电量": false,
        "交易结果": true,
        "售电公司分时电量": true,
        "用电企业分时电量": true,
        "节点电价": true,
        "日前申报": true,
      },
      shaanxi: {
        "负荷信息": true,
        "负荷详情": false,
        "机组检修容量": true,
        "备用信息": true,
        "全省统一出清价": false,
        "出清电量": false,
        "交易结果": true,
        "售电公司分时电量": true,
        "用电企业分时电量": true,
        "节点电价": true,
        "日前申报": true,
      },
    },
    noDataSourceMessage: "当前交易中心暂无可展示的信息披露数据",
    emptyStateMessage: "当前交易中心暂未接入该披露类型数据，请切换其他披露类型或手动更新数据。",
    tradeCenters: {
      guangdong: {
        name: "广东电力交易中心",
        description: "广东交易中心用于展示负荷、交易结果、分时电量及节点电价等披露数据。",
      },
      hunan: {
        name: "湖南电力交易中心",
        description: "湖南交易中心用于展示统一信息披露结构下的负荷、备用、价格及申报等披露数据。",
      },
      shaanxi: {
        name: "陕西电力交易中心",
        description: "陕西交易中心用于展示统一信息披露结构下的负荷、备用、价格及申报等披露数据。",
      },
    },
    marketMappings: {
      price: {
        hunan: "日前用户侧统一结算价格",
        shaanxi: "用户侧加权电价",
      },
      saleCompany: {
        hunan: "日用电信息（现货）",
        shaanxi: "售电公司日电量",
      },
      loadMetrics: {
        hunan: [
          {
            label: "系统负荷",
            items: [
              {
                id: "hn-system-load-forecast",
                label: "系统负荷预测（日）",
                dataType: "系统负荷",
                forecastModule: "系统负荷预测（日）",
                actualModule: "实际负荷",
              },
              {
                id: "hn-system-load-actual",
                label: "实际负荷",
                dataType: "系统负荷",
                forecastModule: "系统负荷预测（日）",
                actualModule: "实际负荷",
              },
            ],
          },
          {
            label: "发电出力",
            items: [
              {
                id: "hn-total-output-forecast",
                label: "发电总出力预测",
                dataType: "发电总出力",
                forecastModule: "发电总出力预测",
              },
              {
                id: "hn-nonmarket-output-forecast",
                label: "非市场机组总出力预测",
                dataType: "非市场机组总出力",
                forecastModule: "非市场机组总出力预测",
                actualModule: "非市场机组总出力",
              },
              {
                id: "hn-renewable-output-forecast",
                label: "新能源总出力预测（日）",
                dataType: "新能源总出力",
                forecastModule: "新能源总出力预测（日）",
                actualModule: "新能源总出力",
              },
              {
                id: "hn-hydro-output-forecast",
                label: "水电（含抽蓄）总出力预测（日）",
                dataType: "水电（含抽蓄）总出力",
                forecastModule: "水电（含抽蓄）总出力预测（日）",
                actualModule: "水电（含抽蓄）总出力",
              },
            ],
          },
          {
            label: "联络线",
            items: [
              {
                id: "hn-tieline-forecast",
                label: "省间联络线输电曲线预测",
                dataType: "省间联络线",
                forecastModule: "省间联络线输电曲线预测",
                actualModule: "省间联络线输电情况",
              },
              {
                id: "hn-tieline-actual",
                label: "省间联络线输电情况",
                dataType: "省间联络线",
                forecastModule: "省间联络线输电曲线预测",
                actualModule: "省间联络线输电情况",
              },
            ],
          },
        ],
        shaanxi: [
          {
            label: "系统负荷",
            items: [
              {
                id: "sx-system-load-forecast",
                label: "系统负荷预测（日）",
                dataType: "系统负荷",
                forecastModule: "系统负荷预测（日）",
                actualModule: "实际负荷",
              },
              {
                id: "sx-system-load-actual",
                label: "实际负荷",
                dataType: "系统负荷",
                forecastModule: "系统负荷预测（日）",
                actualModule: "实际负荷",
              },
            ],
          },
          {
            label: "发电出力",
            items: [
              {
                id: "sx-total-output",
                label: "发电总出力",
                dataType: "发电总出力",
                forecastModule: "发电总出力预测",
                actualModule: "发电总出力",
              },
              {
                id: "sx-total-output-forecast",
                label: "发电总出力预测",
                dataType: "发电总出力",
                forecastModule: "发电总出力预测",
                actualModule: "发电总出力",
              },
              {
                id: "sx-nonmarket-output",
                label: "非市场机组总出力",
                dataType: "非市场机组总出力",
                forecastModule: "非市场机组总出力预测",
                actualModule: "非市场机组总出力",
              },
              {
                id: "sx-nonmarket-output-forecast",
                label: "非市场机组总出力预测",
                dataType: "非市场机组总出力",
                forecastModule: "非市场机组总出力预测",
                actualModule: "非市场机组总出力",
              },
              {
                id: "sx-renewable-output",
                label: "新能源总出力",
                dataType: "新能源总出力",
                forecastModule: "新能源总出力预测（日）",
                actualModule: "新能源总出力",
              },
              {
                id: "sx-renewable-output-forecast",
                label: "新能源总出力预测（日）",
                dataType: "新能源总出力",
                forecastModule: "新能源总出力预测（日）",
                actualModule: "新能源总出力",
              },
              {
                id: "sx-hydro-output",
                label: "水电（含抽蓄）出力",
                dataType: "水电（含抽蓄）总出力",
                forecastModule: "水电（含抽蓄）总出力预测（日）",
                actualModule: "水电（含抽蓄）出力",
              },
              {
                id: "sx-hydro-output-forecast",
                label: "水电（含抽蓄）总出力预测（日）",
                dataType: "水电（含抽蓄）总出力",
                forecastModule: "水电（含抽蓄）总出力预测（日）",
                actualModule: "水电（含抽蓄）出力",
              },
            ],
          },
          {
            label: "联络线",
            items: [
              {
                id: "sx-tieline-actual",
                label: "省间联络线输电情况",
                dataType: "省间联络线",
                forecastModule: "省间联络线输电曲线预测",
                actualModule: "省间联络线输电情况",
              },
              {
                id: "sx-tieline-forecast",
                label: "省间联络线输电曲线预测",
                dataType: "省间联络线",
                forecastModule: "省间联络线输电曲线预测",
                actualModule: "省间联络线输电情况",
              },
            ],
          },
        ],
      },
    },
  };
})(window);
