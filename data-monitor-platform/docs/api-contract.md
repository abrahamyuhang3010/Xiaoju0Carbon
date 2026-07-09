# 数据监控预警平台 API 契约

版本：2026-06-15

本平台是独立前端应用，不依赖 BOSS 页面注册、菜单或 mock 模块。生产环境将 `config.js` 中的 `apiBaseUrl` 指向真实后端即可接入。

页面保持 PRD 范围：交易中心选择、取数通道监控、数据质量监控、筛选、概览、异常明细、详情抽屉、重新校验、忽略/取消忽略。前端默认请求真实 API；若本地演示环境没有后端，会自动使用 `data/seed-monitor-data.js` 作为预览数据。

## GET /api/data-monitor/snapshot

用途：返回当前交易中心的取数通道异常和数据质量异常。

请求参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `centerId` | string | 是 | `guangdong` / `hunan` / `shaanxi` |

请求头：

| Header | 说明 |
| --- | --- |
| `X-Data-Monitor-Contract` | 当前前端契约版本，例如 `2026-06-15` |

响应示例：

```json
{
  "generatedAt": "2026-06-10T11:40:00+08:00",
  "fetchRecords": [
    {
      "id": "guangdong-fetch-001",
      "centerId": "guangdong",
      "centerName": "广东交易中心",
      "businessModule": "信息披露-负荷信息",
      "dataName": "系统负荷预测",
      "runDateStart": "2026-06-10",
      "runDateEnd": "2026-06-10",
      "warningDate": "2026-06-10",
      "warningBatch": "11:40",
      "warningTime": "2026-06-10 11:40",
      "sourceType": "取数工具",
      "priority": "P0",
      "severity": "critical",
      "status": "任务未生成",
      "exceptionType": "调度执行异常",
      "description": "到达计划时间但未生成取数任务",
      "lastFetchTime": "",
      "notifyStatus": "通知失败",
      "ignored": false,
      "logUrl": "/logs/fetch/guangdong/9000",
      "businessUrl": "/market-data/guangdong/system-load-forecast"
    }
  ],
  "qualityRecords": [
    {
      "id": "guangdong-quality-001",
      "centerId": "guangdong",
      "centerName": "广东交易中心",
      "businessModule": "信息披露-负荷信息",
      "dataName": "系统负荷预测",
      "runDate": "2026-06-10",
      "priority": "P0",
      "severity": "critical",
      "checkTime": "2026-06-10 11:45:00",
      "status": "点位缺失",
      "exceptionType": "完整性异常",
      "ruleName": "分时类数据实际点位小于应有点位",
      "threshold": "应有24/96点",
      "actual": "实际23点",
      "description": "分时类数据实际点位小于应有点位",
      "ignored": false,
      "logUrl": "/logs/quality/guangdong/8000",
      "businessUrl": "/market-data/guangdong/system-load-forecast",
      "dimensions": {
        "expectedPoints": 24,
        "actualPoints": 23
      },
      "series": [
        { "label": "00:00", "current": 72, "baseline": 70 }
      ]
    }
  ]
}
```

字段约定：

| 字段 | 说明 |
| --- | --- |
| `severity` | `critical` / `major` / `minor`；缺省时前端会按优先级推断 |
| `notifyStatus` | `未通知` / `已通知` / `通知失败` |
| `ignored` | 已忽略记录在页面展示为“已忽略”，并出现“取消忽略” |
| `logUrl`、`businessUrl` | 详情抽屉底部按钮打开的目标地址 |
| `dimensions`、`series` | 质量异常图表数据；不支持图表时可省略 |

## POST /api/data-monitor/alerts/{id}/recheck

用途：点击“重新校验”后触发后端重新执行取数链路校验或质量规则校验。

请求体：

```json
{
  "kind": "fetch",
  "centerId": "guangdong"
}
```

响应：

```json
{
  "ok": true,
  "requestId": "recheck-20260610114500001"
}
```

## POST /api/data-monitor/alerts/{id}/ignore

用途：忽略或取消忽略异常。

请求体：

```json
{
  "kind": "quality",
  "centerId": "guangdong",
  "ignored": true
}
```

响应：

```json
{
  "ok": true
}
```

## 后端接入建议

1. 监控任务按 PRD 固定批次触发：D 日 11:40、D 日 18:30、D+1 日 11:40。
2. 取数成功必须同时满足：任务执行成功、目标数据已获取、解析成功、入库成功、状态正确回写。
3. 数据质量校验只在数据成功入库后触发；未入库异常归入取数通道监控。
4. 同一交易中心、运行日期、批次内多条异常由后端通知聚合逻辑处理；页面不展示通知汇总。
5. `ignored=true` 或已关闭异常不应重复触发告警。
