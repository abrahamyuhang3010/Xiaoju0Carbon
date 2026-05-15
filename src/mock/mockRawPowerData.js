(function attachMockRawPowerData(global) {
  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function buildDateRange(start, days) {
    var base = new Date(start + "T00:00:00");
    return Array.from({ length: days }, function createDate(_, index) {
      var nextDate = new Date(base.getTime());
      nextDate.setDate(base.getDate() + index);
      return nextDate.getFullYear() + "-" + pad(nextDate.getMonth() + 1) + "-" + pad(nextDate.getDate());
    });
  }

  function roundMwh(value) {
    return Number(Number(value).toFixed(3));
  }

  function sum(values) {
    return roundMwh(
      values.reduce(function accumulate(total, value) {
        return total + Number(value || 0);
      }, 0),
    );
  }

  function buildHourlyValues(template, dayIndex) {
    if (template.hourlyValues) {
      return template.hourlyValues.map(function adjustValue(value, hourIndex) {
        if (dayIndex === 0) {
          return roundMwh(value);
        }
        return roundMwh(Number(value) + dayIndex * 0.012 + ((hourIndex % 4) - 1.5) * 0.003);
      });
    }

    return Array.from({ length: 24 }, function createValue(_, hourIndex) {
      var morning = Math.max(0, Math.sin(((hourIndex - 6) / 24) * Math.PI * 2)) * template.morningPeak;
      var evening = Math.max(0, Math.sin(((hourIndex - 14) / 24) * Math.PI * 2)) * template.eveningPeak;
      var valley = hourIndex < 6 ? template.valleyOffset : 0;
      var pattern = template.pattern[hourIndex % template.pattern.length];
      return roundMwh(template.base + dayIndex * template.dayStep + morning + evening + valley + pattern);
    });
  }

  function buildHunanRow(sequence, date, template, dayIndex) {
    var hourlyValues = buildHourlyValues(template, dayIndex);
    var row = {
      "序号": sequence,
      "日期": date,
      "用户编号": template.userCode,
      "用户名称": template.userName,
    };

    hourlyValues.forEach(function assignHour(value, index) {
      row[index + 1 + "点电量"] = value;
    });

    return row;
  }

  function buildQuarterValues(template, dayIndex) {
    return Array.from({ length: 96 }, function createValue(_, index) {
      if (dayIndex === 0 && template.firstQuarterValues && index < template.firstQuarterValues.length) {
        return roundMwh(template.firstQuarterValues[index]);
      }

      var hour = Math.floor(index / 4);
      var daytime = Math.max(0, Math.sin(((hour - 7) / 24) * Math.PI * 2)) * template.daytimePeak;
      var evening = Math.max(0, Math.sin(((hour - 15) / 24) * Math.PI * 2)) * template.eveningPeak;
      var valley = hour < 6 ? template.valleyOffset : 0;
      var intraHour = template.intraHour[index % template.intraHour.length];
      return roundMwh(template.base + dayIndex * template.dayStep + daytime + evening + valley + intraHour);
    });
  }

  function buildShaanxiRow(date, template, dayIndex) {
    var quarterValues = buildQuarterValues(template, dayIndex);
    var row = {
      "日期": date,
      "电网名称": "陕西省电力公司",
      "户号": template.accountNo,
      "户号类型": "零售用户",
      "名称": template.userName,
      "代理售电公司": template.retailCompany,
      "总用电量": sum(quarterValues),
      "数据类型": "96",
      "尖": "",
      "峰": "",
      "平": "",
      "谷": "",
    };

    quarterValues.forEach(function assignSegment(value, index) {
      row["段" + (index + 1)] = value;
    });

    return row;
  }

  var hunanDates = buildDateRange("2026-05-05", 3);
  var hunanUserTemplates = [
    {
      userCode: "4303115926887",
      userName: "湖南优车新能源有限公司",
      hourlyValues: [
        0.18, 0.16, 0.05, 0.05, 0.05, 0.05,
        0.14, 0.07, 0.04, 0.1, 0.1, 0.15,
        0.27, 0.24, 0.22, 0.28, 0.31, 0.42,
        0.38, 0.33, 0.29, 0.26, 0.21, 0.19,
      ],
    },
    {
      userCode: "4303021748619",
      userName: "长沙星途充电服务有限公司",
      base: 0.19,
      morningPeak: 0.08,
      eveningPeak: 0.22,
      valleyOffset: -0.09,
      dayStep: 0.018,
      pattern: [-0.018, 0.012, -0.006, 0.02],
    },
    {
      userCode: "4303812376152",
      userName: "湘潭智造谷能源服务有限公司",
      base: 0.26,
      morningPeak: 0.1,
      eveningPeak: 0.28,
      valleyOffset: -0.12,
      dayStep: 0.022,
      pattern: [-0.024, 0.016, -0.01, 0.026],
    },
    {
      userCode: "4306029284735",
      userName: "岳阳港区综合能源站",
      base: 0.14,
      morningPeak: 0.07,
      eveningPeak: 0.18,
      valleyOffset: -0.07,
      dayStep: 0.014,
      pattern: [-0.014, 0.01, -0.008, 0.016],
    },
  ];

  var hunanRows = hunanDates.reduce(function accumulateRows(result, date, dayIndex) {
    return result.concat(
      hunanUserTemplates.map(function mapTemplate(template, userIndex) {
        return buildHunanRow(dayIndex * hunanUserTemplates.length + userIndex + 1, date, template, dayIndex);
      }),
    );
  }, []);

  var shaanxiDates = buildDateRange("2026-05-01", 8);
  var shaanxiUserTemplates = [
    {
      accountNo: "6103882654734",
      userName: "碧辟小桔新能源(深圳)有限责任公司",
      retailCompany: "北京小桔新能源汽车科技有限公司",
      base: 0.055,
      daytimePeak: 0.032,
      eveningPeak: 0.05,
      valleyOffset: -0.025,
      dayStep: 0.004,
      intraHour: [0, 0.007, 0.006, -0.002],
      firstQuarterValues: [0, 0.062, 0.061, 0, 0.062, 0.061],
    },
    {
      accountNo: "6103916847022",
      userName: "西安碧辟小桔新能源有限责任公司",
      retailCompany: "北京小桔新能源汽车科技有限公司",
      base: 0.028,
      daytimePeak: 0.022,
      eveningPeak: 0.034,
      valleyOffset: -0.014,
      dayStep: 0.003,
      intraHour: [0.002, 0.006, 0.006, 0.004],
      firstQuarterValues: [0.04, 0.08, 0.08, 0.08, 0.02, 0.02],
    },
    {
      accountNo: "6103928171366",
      userName: "陕西九电新能源有限责任公司",
      retailCompany: "北京小桔新能源汽车科技有限公司",
      base: 0.021,
      daytimePeak: 0.018,
      eveningPeak: 0.029,
      valleyOffset: -0.018,
      dayStep: 0.002,
      intraHour: [-0.002, 0.003, 0.004, 0],
      firstQuarterValues: [0, 0, 0, 0, 0, 0],
    },
    {
      accountNo: "6103935421168",
      userName: "陕西众成智慧能源有限公司",
      retailCompany: "北京小桔新能源汽车科技有限公司",
      base: 0.038,
      daytimePeak: 0.026,
      eveningPeak: 0.041,
      valleyOffset: -0.02,
      dayStep: 0.003,
      intraHour: [-0.001, 0.004, 0.006, 0.002],
      firstQuarterValues: [0.01, 0.012, 0.034, 0.021, 0.014, 0.009],
    },
  ];

  var shaanxiRows = shaanxiDates.reduce(function accumulateRows(result, date, dayIndex) {
    return result.concat(
      shaanxiUserTemplates.map(function mapTemplate(template) {
        return buildShaanxiRow(date, template, dayIndex);
      }),
    );
  }, []);

  global.BOSS_RAW_POWER_DATA_MOCK = {
    metadata: {
      hunan: {
        sheetName: "REPORT0",
        updateTime: "2026-05-06 08:30:00",
        publishTime: "2026-05-06 08:12:00",
        dataSource: "取数工具",
        unit: "MWh",
      },
      shaanxi: {
        sheetName: "用电量数据",
        updateTime: "2026-05-02 08:45:00",
        publishTime: "2026-05-02 08:20:00",
        dataSource: "取数工具",
        unit: "MWh",
      },
    },
    microgridMap: {
      "4303115926887": { microgridName: "长沙优车补能微电网", microgridId: "MG-430100-01" },
      "4303812376152": { microgridName: "湘潭智造谷微电网", microgridId: "MG-430300-03" },
      "6103882654734": { microgridName: "西安高新补能微电网", microgridId: "MG-610100-01" },
      "6103935421168": { microgridName: "渭南产业园综合微电网", microgridId: "MG-610500-04" },
    },
    hunan: {
      retailCompanyDailyElectricity: {
        sheetName: "REPORT0",
        rows: hunanRows,
      },
    },
    shaanxi: {
      userSideActualElectricity: {
        sheetName: "用电量数据",
        rows: shaanxiRows,
      },
    },
  };
})(window);
