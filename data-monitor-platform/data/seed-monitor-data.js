window.DATA_MONITOR_SEED = (function buildSeedData() {
  const businessModules = [
    "信息披露-负荷信息",
    "信息披露-全省统一出清价",
    "信息披露-出清电量",
    "信息披露-交易结果",
    "信息披露-分时电量",
    "信息披露-节点电价",
    "信息披露-日前申报",
    "日清月结",
    "滚搓数据",
    "零售关系",
  ];

  const dataNames = [
    "系统负荷预测",
    "日前交易结果",
    "售电公司分时电量",
    "节点电价",
    "日前申报电量",
    "日清算结果",
    "零售关系管理",
    "中长期滚搓交易15分钟行情数据",
  ];

  const priorities = ["P0", "P1", "P2", "P3"];

  const fetchTypes = [
    {
      type: "调度执行异常",
      statuses: [
        ["任务未生成", "到达计划取数时间后，系统未生成对应取数任务"],
        ["任务未触发", "任务已配置但未按计划执行"],
        ["任务排队超时", "任务长时间处于排队状态，超过最大等待时间"],
        ["任务执行超时", "任务长时间处于执行中，超过最大执行时长"],
      ],
    },
    {
      type: "访问认证异常",
      statuses: [
        ["交易中心登录失败", "账号、密码、验证码或登录流程异常"],
        ["CA/UKey异常", "CA证书未识别、UKey未连接、证书过期或被锁定"],
        ["登录态失效", "交易中心登录态过期，导致后续访问失败"],
        ["权限不足", "账号无目标菜单、数据页面、导出按钮或接口权限"],
      ],
    },
    {
      type: "交易中心访问异常",
      statuses: [
        ["交易中心不可用", "交易中心页面打不开、系统维护或接口不可访问"],
        ["请求超时", "页面或接口请求超过超时时间"],
        ["风控拦截", "访问频率、IP或账号行为触发交易中心限制"],
      ],
    },
    {
      type: "页面结构异常",
      statuses: [
        ["页面元素变化", "按钮、输入框、下拉框等元素定位失败"],
        ["查询入口变化", "运行日期、代理月份等查询入口变化"],
        ["导出入口变化", "下载或导出入口变化或消失"],
        ["页面路径变化", "URL、菜单路径或Tab层级变化"],
        ["表格结构变化", "表头、列顺序或分页方式变化"],
        ["页面交互逻辑变化", "查询、下载、弹窗流程变化"],
        ["页面加载方式变化", "静态表格变为异步或懒加载"],
      ],
    },
    {
      type: "参数异常",
      statuses: [
        ["查询参数错误", "运行日期、代理月份、交易中心或用户范围等参数错误"],
        ["查询范围超限", "单次拉取日期范围超过系统或交易中心限制"],
        ["代理月份错误", "代理月份与运行日期规则不一致"],
        ["运行日期错误", "运行日期入参错误"],
      ],
    },
    {
      type: "取数结果异常",
      statuses: [
        ["超时未取", "到达预警时间后，目标数据仍无成功入库记录"],
        ["取数失败", "任务执行失败，未成功获取目标数据"],
        ["源端未披露", "已成功访问交易中心，但源端暂无数据或文件未生成"],
        ["返回空数据", "任务执行成功，但接口、页面或文件返回数据为空"],
        ["部分成功", "多日期、多用户、多节点或多数据项中仅部分取回"],
        ["取回数据未更新", "重新取回后源端数据内容未刷新"],
      ],
    },
    {
      type: "文件异常",
      statuses: [
        ["文件下载失败", "文件下载链接失效、下载中断或下载失败"],
        ["文件为空", "下载文件大小为0或无有效内容"],
        ["文件损坏", "文件无法打开、格式损坏或内容异常"],
        ["文件类型不符", "文件格式与配置不一致"],
        ["文件日期不匹配", "文件内日期与目标运行日期不一致"],
      ],
    },
    {
      type: "解析入库异常",
      statuses: [
        ["解析失败", "文件或接口返回内容无法解析为结构化数据"],
        ["字段结构变化", "表头、字段名称、字段顺序或类型与配置不一致"],
        ["字段缺失", "关键字段不存在"],
        ["字段新增", "源端新增未知字段"],
        ["字段类型变化", "字段类型与配置不一致"],
        ["字段映射失败", "源字段无法匹配系统目标字段"],
        ["入库失败", "数据解析成功，但写入数据库失败"],
        ["主键冲突", "业务主键重复导致写入失败"],
        ["数据库连接失败", "数据库不可用或连接失败"],
      ],
    },
    {
      type: "状态同步异常",
      statuses: [
        ["状态回写失败", "数据已入库，但任务状态未正确回写"],
        ["页面状态不一致", "任务显示成功但业务页面无数据，或数据已存在但任务显示失败"],
        ["任务状态不一致", "调度任务状态与业务状态不一致"],
        ["数据更新时间异常", "数据更新时间缺失或异常"],
      ],
    },
    {
      type: "人工上传异常",
      statuses: [
        ["上传文件类型不符", "人工上传文件类型不符合要求"],
        ["上传文件日期不匹配", "上传文件日期与目标日期不一致"],
        ["上传文件重复", "上传文件与已有文件重复"],
        ["上传文件解析失败", "人工上传文件解析失败"],
        ["上传文件入库失败", "人工上传文件写入失败"],
      ],
    },
    {
      type: "通知异常",
      statuses: [
        ["通知对象为空", "未配置通知对象"],
        ["通知发送失败", "异常通知发送失败"],
        ["通知内容生成失败", "通知文案或模板渲染失败"],
      ],
    },
  ];

  const qualityTypes = [
    {
      type: "完整性异常",
      statuses: [
        ["点位缺失", "分时类数据实际点位小于应有点位", "应有24/96点", "实际23点"],
        ["日期缺失", "应存在某运行日期或结算日期数据但实际缺失", "目标日期应有数据", "无记录"],
        ["主体缺失", "应存在售电公司、用户、节点等主体数据但实际缺失", "目标主体应完整", "缺少3个主体"],
        ["字段空值", "必填字段为空、NULL、空字符串或无有效值", "核心字段非空", "电量为空"],
      ],
    },
    {
      type: "重复异常",
      statuses: [["重复数据", "同一业务主键下存在多条有效记录", "业务主键唯一", "重复2条"]],
    },
    {
      type: "数值异常",
      statuses: [
        ["数值越界", "数值字段超出配置上下限", "按数据项上下限配置", "-120MW"],
        ["非法负值", "不应为负的字段出现负值", "数值>=0", "-8.6MWh"],
      ],
    },
    {
      type: "波动异常",
      statuses: [
        ["环比异常", "当前值较上一日或上一周期偏差超过阈值", "环比<=30%", "偏差42%"],
        ["同比异常", "当前值较去年同期或同类周期偏差超过阈值", "同比<=40%", "偏差58%"],
        ["均值偏离", "当前值较近7日或近30日均值偏差超过阈值", "偏离均值<=35%", "偏差47%"],
      ],
    },
    {
      type: "时间异常",
      statuses: [
        ["时间断点", "时段不连续，缺少中间时段", "时间序列连续", "缺少15:00"],
        ["时间重复", "同一运行日期下同一时段出现多条有效记录", "同一时段唯一", "15:00重复2条"],
        ["粒度异常", "实际时间粒度与配置不一致", "广东/湖南24点，陕西96点", "返回24点但应为96点"],
      ],
    },
    {
      type: "关系异常",
      statuses: [
        ["汇总不一致", "汇总值与明细合计不一致", "差异<=0.01", "差异15.23元"],
        ["计算关系异常", "字段之间的计算关系不成立", "计算差异<=0.01", "价差不一致"],
        ["枚举异常", "字段值不在合法枚举范围内", "枚举值合法", "未知状态"],
      ],
    },
    {
      type: "时效异常",
      statuses: [["数据内容未更新", "连续批次或日期内容异常一致", "内容应随批次变化", "连续3日一致"]],
    },
    {
      type: "配置异常",
      statuses: [
        ["质量规则未配置", "已入库数据未配置质量校验规则", "必须存在启用规则", "无规则"],
        ["质量规则执行失败", "规则表达式、阈值或查询逻辑执行失败", "规则可执行", "执行失败"],
      ],
    },
  ];

  const centerOffsets = {
    guangdong: 0,
    hunan: 1,
    shaanxi: 2,
  };

  const centerNames = {
    guangdong: "广东交易中心",
    hunan: "湖南交易中心",
    shaanxi: "陕西交易中心",
  };

  function pick(list, index) {
    return list[index % list.length];
  }

  function dateByOffset(offset) {
    const dates = ["2026-06-10", "2026-06-09", "2026-06-08"];
    return pick(dates, offset);
  }

  function timeByOffset(offset) {
    const minutes = String(20 + (offset % 39)).padStart(2, "0");
    return "2026-06-10 11:" + minutes + ":" + String((offset * 7) % 60).padStart(2, "0");
  }

  function priorityByIndex(index) {
    if (index % 7 === 0 || index % 11 === 0) return "P0";
    if (index % 5 === 0) return "P1";
    if (index % 13 === 0) return "P3";
    return "P2";
  }

  function badgeSeverity(priority, index) {
    if (priority === "P0") return "critical";
    if (priority === "P1" || index % 4 === 0) return "major";
    return "minor";
  }

  function buildFetchRecords(centerId) {
    const records = [];
    const centerOffset = centerOffsets[centerId] || 0;
    let cursor = 0;
    fetchTypes.forEach((group) => {
      group.statuses.forEach((item) => {
        const [status, description] = item;
        const index = cursor + centerOffset * 3;
        const priority = priorityByIndex(index);
        const runDate = dateByOffset(index);
        const warningBatch = index % 3 === 2 ? "D+1 11:40" : index % 2 === 0 ? "11:40" : "18:30";
        const warningDate = warningBatch === "D+1 11:40" ? "2026-06-11" : "2026-06-10";
        records.push({
          id: centerId + "-fetch-" + String(cursor + 1).padStart(3, "0"),
          centerId,
          centerName: centerNames[centerId],
          businessModule: pick(businessModules, index),
          dataName: pick(dataNames, index),
          runDateStart: runDate,
          runDateEnd: runDate,
          warningDate,
          warningBatch,
          warningTime: warningDate + " " + warningBatch.replace("D+1 ", ""),
          sourceType: pick(["取数工具", "接口拉取", "人工上传"], index),
          priority,
          severity: badgeSeverity(priority, index),
          status,
          exceptionType: group.type,
          description,
          lastFetchTime: index % 6 === 0 ? "" : timeByOffset(index),
          notifyStatus: index % 9 === 0 ? "通知失败" : "已通知",
          ignored: false,
          taskId: "collector-" + centerId + "-" + String(9000 + cursor),
          traceId: "trace-" + centerId + "-" + String(202606100000 + cursor),
          retryCount: index % 4,
          owner: pick(["采数一组", "采数二组", "质量平台", "交易数据组"], index),
          logUrl: "/logs/fetch/" + centerId + "/" + String(9000 + cursor),
          businessUrl: "/market-data/" + centerId + "/" + encodeURIComponent(pick(dataNames, index)),
        });
        cursor += 1;
      });
    });
    return records;
  }

  function buildQualityRecords(centerId) {
    const records = [];
    const centerOffset = centerOffsets[centerId] || 0;
    let cursor = 0;
    qualityTypes.forEach((group) => {
      group.statuses.forEach((item) => {
        const [status, description, threshold, actual] = item;
        const index = cursor + centerOffset * 4;
        const priority = priorityByIndex(index);
        const runDate = dateByOffset(index);
        records.push({
          id: centerId + "-quality-" + String(cursor + 1).padStart(3, "0"),
          centerId,
          centerName: centerNames[centerId],
          businessModule: pick(businessModules, index),
          dataName: pick(dataNames, index),
          runDate,
          priority,
          severity: badgeSeverity(priority, index),
          checkTime: timeByOffset(index + 5),
          status,
          exceptionType: group.type,
          ruleName: description,
          threshold,
          actual,
          description,
          notifyStatus: index % 6 === 0 ? "通知失败" : "已通知",
          ignored: false,
          taskId: "quality-" + centerId + "-" + String(8000 + cursor),
          traceId: "qtrace-" + centerId + "-" + String(202606100000 + cursor),
          owner: pick(["质量规则组", "交易数据组", "采数一组"], index),
          logUrl: "/logs/quality/" + centerId + "/" + String(8000 + cursor),
          businessUrl: "/market-data/" + centerId + "/" + encodeURIComponent(pick(dataNames, index)),
          dimensions: {
            expectedPoints: centerId === "shaanxi" ? 96 : 24,
            actualPoints: status === "点位缺失" ? (centerId === "shaanxi" ? 92 : 23) : centerId === "shaanxi" ? 96 : 24,
            affectedSubjects: 1 + (index % 5),
            sampleField: pick(["price", "quantity", "load", "amount", "status"], index),
          },
          series: Array.from({ length: 12 }).map((_, i) => ({
            label: String(i * 2).padStart(2, "0") + ":00",
            current: 72 + i * 4 + (i === 8 ? 24 : 0) + centerOffset * 3,
            baseline: 70 + i * 3 + centerOffset * 2,
          })),
        });
        cursor += 1;
      });
    });
    return records;
  }

  const centers = ["guangdong", "hunan", "shaanxi"];
  const byCenter = {};
  centers.forEach((centerId) => {
    byCenter[centerId] = {
      fetchRecords: buildFetchRecords(centerId),
      qualityRecords: buildQualityRecords(centerId),
    };
  });

  return {
    businessModules,
    dataNames,
    priorities,
    fetchTypes,
    qualityTypes,
    centers: byCenter,
  };
})();
