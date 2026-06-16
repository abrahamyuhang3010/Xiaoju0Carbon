#!/usr/bin/env python3
"""Regenerate the policy demo data from local policy file resources."""

from __future__ import annotations

import json
import re
import shutil
from datetime import datetime
from pathlib import Path


ROOT = Path("/Users/didi/Documents/codex售电市场政策结构化")
DEMO_DIR = ROOT / "demo"
APP_PATH = DEMO_DIR / "app.js"
INDEX_PATH = DEMO_DIR / "index.html"
FRAMEWORK_PATH = DEMO_DIR / "product-framework.md"

PROVINCES = [
    ("gd", "广东", "广东交易中心"),
    ("sx", "陕西", "陕西交易中心"),
    ("hn", "湖南", "湖南交易中心"),
]

DOMAIN_ORDER = ["综合", "中长期", "现货", "结算", "零售", "计量", "辅助服务", "准入", "披露", "省间"]


def parse_date(stem: str) -> str:
    match = re.search(r"【(\d{8})】", stem)
    if not match:
        return "2026-01-01"
    raw = match.group(1)
    return f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"


def classify(stem: str) -> tuple[str, str, str]:
    if "发布" in stem and "通知" in stem:
        return "发布通知", "综合", "政策文件总入口"
    if "工作方案" in stem:
        return "运行工作方案", "综合", "连续运行、组织流程、市场监测"
    if "省间" in stem:
        return "省间现货规则", "省间", "省间现货、购售电交易、结算管理"
    if "现货" in stem and "结算" not in stem:
        return "现货运行规则", "现货", "日前/实时市场、申报、出清"
    if "结算" in stem:
        return "结算实施细则" if "通知" not in stem else "结算补充通知", "结算", "日清月结、电能量费用、市场运营费用"
    if "中长期" in stem:
        return "中长期规则", "中长期", "年度、月度、挂牌、集中竞价"
    if "零售" in stem:
        return "零售市场规则", "零售", "零售套餐、零售合同、零售结算"
    if "计量" in stem:
        return "计量管理规则", "计量", "计量点、采集装置、数据拟合"
    if "调频" in stem:
        return "调频辅助服务规则", "辅助服务", "调频市场、计量与费用分摊"
    if "注册" in stem:
        return "注册准入规则", "准入", "主体注册、变更、退出"
    if "信息披露" in stem:
        return "信息披露规则", "披露", "披露内容、披露时点、主体责任"
    return "政策文件", "综合", "政策文件查阅"


def status_for(stem: str, structured_exists: bool) -> str:
    if "【20260521】广东电力中长期市场实施细则" in stem:
        return "待核对"
    return "已结构化" if structured_exists else "待结构化"


def read_quality(json_path: Path) -> dict:
    if not json_path.exists():
        return {}
    data = json.loads(json_path.read_text(encoding="utf-8"))
    return data.get("quality_report", {})


def count_md_chapters(md_path: Path) -> int:
    if not md_path.exists():
        return 0
    text = md_path.read_text(encoding="utf-8", errors="ignore")
    return sum(1 for line in text.splitlines() if line.startswith("## ") and "目录" not in line[:8])


def count_md_formulas(md_path: Path) -> int:
    if not md_path.exists():
        return 0
    return len(re.findall(r"(?ms)^\$\$\n.*?\n\$\$", md_path.read_text(encoding="utf-8", errors="ignore")))


def top_headings(md_path: Path, limit: int = 4) -> list[str]:
    if not md_path.exists():
        return []
    headings: list[str] = []
    for raw in md_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        if not raw.startswith("## "):
            continue
        title = raw.lstrip("#").strip()
        if title == "目录":
            continue
        headings.append(title)
        if len(headings) >= limit:
            break
    return headings


def file_url(path: Path | None) -> str:
    return str(path) if path and path.exists() else ""


def quality_checks(domain: str, q: dict, structured: bool) -> list[str]:
    checks: list[str] = []
    if structured:
        checks.append("结构化JSON已生成")
        if q.get("formula_count", 0):
            checks.append(f"公式{q.get('resolved_formula_count', 0)}/{q.get('formula_count', 0)}")
        if q.get("table_count", 0):
            checks.append(f"表格{q.get('table_count', 0) - q.get('unresolved_table_count', 0)}/{q.get('table_count', 0)}")
        if q.get("header_footer_noise_removed"):
            checks.append("页眉页脚/水印清理")
        if q.get("structured_from_markdown"):
            checks.append("MD/HTML/JSON同步")
    else:
        checks.extend(["PDF/MD/HTML已接入", "待生成结构化JSON", f"{domain}规则域"])
    return checks[:4]


def collect_files() -> tuple[list[dict], list[dict]]:
    files: list[dict] = []
    quality: list[dict] = []
    for region_id, region_name, exchange in PROVINCES:
        base = ROOT / exchange / "2026年执行政策"
        for pdf in sorted(base.glob("*.pdf")):
            stem = pdf.stem
            date = parse_date(stem)
            file_type, domain, related = classify(stem)
            md = base / f"{stem}.md"
            html = base / f"{stem}.html"
            zc_html = base / "ZC_HTML" / f"{stem}.html"
            structured_path = base / "ZC_STRUCTURED" / f"{stem}.structured.json"
            report_path = base / "ZC_STRUCTURED" / f"{stem}.zc_skill.report.md"
            structured_exists = structured_path.exists()
            q = read_quality(structured_path)
            status = status_for(stem, structured_exists)
            file_id = f"f-{region_id}-{date.replace('-', '')}-{len(files) + 1}"
            files.append(
                {
                    "id": file_id,
                    "regionId": region_id,
                    "date": date,
                    "name": f"{stem}.pdf",
                    "stem": stem,
                    "type": file_type,
                    "status": status,
                    "domain": domain,
                    "related": related,
                    "version": "当前结构化版本" if structured_exists else "已接入原始文件",
                    "pdfPath": file_url(pdf),
                    "mdPath": file_url(md),
                    "htmlPath": file_url(html if html.exists() else zc_html),
                    "structuredPath": file_url(structured_path),
                    "reportPath": file_url(report_path),
                    "headings": top_headings(md),
                }
            )
            chapters = q.get("chapter_count") if q else count_md_chapters(md)
            formulas = q.get("formula_count") if q else count_md_formulas(md)
            resolved_formulas = q.get("resolved_formula_count") if q else formulas
            tables = q.get("table_count") if q else 0
            unresolved_formulas = q.get("unresolved_formula_count") if q else 0
            unresolved_tables = q.get("unresolved_table_count") if q else 0
            quality.append(
                {
                    "id": f"pq-{region_id}-{date.replace('-', '')}-{len(quality) + 1}",
                    "regionId": region_id,
                    "fileId": file_id,
                    "name": stem,
                    "docType": q.get("document_classification") or "pdf+md+html",
                    "chapters": int(chapters or 0),
                    "formulas": int(formulas or 0),
                    "resolvedFormulas": int(resolved_formulas or 0),
                    "unresolvedFormulas": int(unresolved_formulas or 0),
                    "tables": int(tables or 0),
                    "unresolvedTables": int(unresolved_tables or 0),
                    "checks": quality_checks(domain, q, structured_exists),
                    "status": "已校验" if structured_exists and not unresolved_formulas and not unresolved_tables else status,
                }
            )
    return files, quality


def by_region(files: list[dict], region_id: str) -> list[dict]:
    return [item for item in files if item["regionId"] == region_id]


def domains_for(files: list[dict]) -> list[str]:
    present = {item["domain"] for item in files}
    return [domain for domain in DOMAIN_ORDER if domain in present]


def latest(files: list[dict], domain: str | None = None) -> dict | None:
    items = [item for item in files if domain is None or item["domain"] == domain]
    return sorted(items, key=lambda item: (item["date"], item["name"]), reverse=True)[0] if items else None


def source_name(file: dict | None) -> str:
    return file["stem"] if file else "现有文件资源未检索到独立文件"


def coverage_value(file: dict | None) -> str:
    if not file:
        return "当前资料集中未检索到独立政策文件，需从综合规则或结算文件继续索引。"
    headings = "、".join(file.get("headings") or [])
    suffix = f"；已识别章节：{headings}" if headings else ""
    return f"{file['name']}（{file['status']}）{suffix}"


def make_rules(files: list[dict], quality: list[dict]) -> list[dict]:
    rules: list[dict] = []
    for region_id, region_name, _exchange in PROVINCES:
        region_files = by_region(files, region_id)
        region_quality = [item for item in quality if item["regionId"] == region_id]
        structured_count = sum(1 for item in region_files if item["structuredPath"])
        pending_count = len(region_files) - structured_count

        domain_specs = [
            ("retail", "零售侧", "零售", "零售规则文件", latest(region_files, "零售")),
            ("mlt", "中长期", "中长期", "中长期主规则", latest(region_files, "中长期")),
            ("spot", "现货", "现货", "现货主规则", latest(region_files, "现货")),
            ("settlement", "结算", "结算", "结算主规则", latest(region_files, "结算")),
        ]
        for category, group, trade_type, name, file in domain_specs:
            rules.append(
                {
                    "regionId": region_id,
                    "category": category,
                    "group": group,
                    "tradeType": trade_type,
                    "name": name,
                    "value": coverage_value(file),
                    "source": source_name(file),
                    "risk": "medium" if not file or file["status"] != "已结构化" else "low",
                    "fileId": file["id"] if file else "",
                }
            )

        mlt_files = [item for item in region_files if item["domain"] == "中长期"]
        if len(mlt_files) >= 2:
            ordered = sorted(mlt_files, key=lambda item: item["date"])
            value = f"{ordered[0]['date']} 版本已接入；{ordered[-1]['date']} 版本为最新，需要以差异比对决定规则索引更新。"
            source = "；".join(item["stem"] for item in ordered[-2:])
        else:
            value = "当前资料集中仅有一个中长期版本，暂不形成版本差异任务。"
            source = source_name(mlt_files[0] if mlt_files else None)
        rules.append(
            {
                "regionId": region_id,
                "category": "mlt",
                "group": "中长期",
                "tradeType": "版本",
                "name": "中长期版本关系",
                "value": value,
                "source": source,
                "risk": "medium" if len(mlt_files) >= 2 else "low",
                "fileId": mlt_files[-1]["id"] if mlt_files else "",
            }
        )

        supporting = [item for item in region_files if item["domain"] in {"计量", "辅助服务", "准入", "披露", "省间", "综合"}]
        rules.append(
            {
                "regionId": region_id,
                "category": "risk",
                "group": "配套规则",
                "tradeType": "文件覆盖",
                "name": "配套与风险规则文件",
                "value": "；".join(f"{item['domain']}：{item['stem']}" for item in supporting) if supporting else "暂无独立配套规则文件。",
                "source": f"{len(supporting)}份配套文件",
                "risk": "low" if supporting else "medium",
                "fileId": supporting[0]["id"] if supporting else "",
            }
        )
        total_formulas = sum(item["formulas"] for item in region_quality)
        resolved_formulas = sum(item["resolvedFormulas"] for item in region_quality)
        rules.append(
            {
                "regionId": region_id,
                "category": "risk",
                "group": "质量门禁",
                "tradeType": "结构化",
                "name": "解析验收状态",
                "value": f"{len(region_files)}份文件已接入，{structured_count}份有结构化JSON，{pending_count}份待结构化；公式恢复 {resolved_formulas}/{total_formulas}。",
                "source": "本地ZC_STRUCTURED与文件目录",
                "risk": "medium" if pending_count else "low",
                "fileId": "",
            }
        )
    return rules


def make_regions(files: list[dict]) -> list[dict]:
    regions: list[dict] = []
    for region_id, region_name, exchange in PROVINCES:
        region_files = by_region(files, region_id)
        domains = domains_for(region_files)
        latest_file = latest(region_files)
        structured_count = sum(1 for item in region_files if item["structuredPath"])
        regions.append(
            {
                "id": region_id,
                "name": region_name,
                "exchange": exchange,
                "signedPower": f"{len(region_files)}份政策文件",
                "powerNote": f"{structured_count}份结构化，{len(region_files) - structured_count}份待结构化",
                "retailMode": "以政策文件和规则索引为准",
                "mltRatio": f"{len([item for item in region_files if item['domain'] == '中长期'])}份中长期文件",
                "settlement": f"{len([item for item in region_files if item['domain'] == '结算'])}份结算文件",
                "spotCurve": f"{len([item for item in region_files if item['domain'] == '现货'])}份现货文件",
                "risk": "存在待结构化/待核对文件" if any(item["status"] != "已结构化" for item in region_files) else "结构化校验通过",
                "marketTypes": domains,
                "latestFile": latest_file["name"] if latest_file else "",
            }
        )
    return regions


def grouped_by_date(files: list[dict]) -> list[tuple[str, str, list[dict]]]:
    groups: dict[tuple[str, str], list[dict]] = {}
    for file in files:
        groups.setdefault((file["regionId"], file["date"]), []).append(file)
    return [(region, date, sorted(items, key=lambda item: item["name"])) for (region, date), items in sorted(groups.items(), key=lambda item: item[0][1])]


def make_changes(files: list[dict]) -> list[dict]:
    changes: list[dict] = []
    for idx, (region_id, date, items) in enumerate(grouped_by_date(files), 1):
        domains = domains_for(items)
        pending = [item for item in items if item["status"] != "已结构化"]
        summary = f"接入{len(items)}份政策文件，覆盖{'、'.join(domains)}。"
        if pending:
            summary += f" 其中{len(pending)}份处于{pending[0]['status']}状态。"
        changes.append(
            {
                "id": f"c{idx}",
                "month": date[:7],
                "regionId": region_id,
                "policy": f"{date}政策文件批次",
                "summary": summary,
                "modules": domains,
                "risk": "medium" if pending or any("补充" in item["type"] for item in items) else "low",
                "fileIds": [item["id"] for item in items],
            }
        )
    return changes


def make_events(files: list[dict], quality: list[dict]) -> list[dict]:
    events: list[dict] = []
    for idx, (region_id, date, items) in enumerate(grouped_by_date(files), 1):
        domains = domains_for(items)
        events.append(
            {
                "id": f"e-policy-{idx}",
                "date": date,
                "regionId": region_id,
                "title": f"{len(items)}份政策文件接入",
                "type": "policy",
                "status": "done",
                "rule": "、".join(domains),
                "fileIds": [item["id"] for item in items],
            }
        )
    for idx, region_id in enumerate(["hn", "sx"], 1):
        items = [item for item in quality if item["regionId"] == region_id and item["status"] == "已校验"]
        if not items:
            continue
        formulas = sum(item["formulas"] for item in items)
        events.append(
            {
                "id": f"e-qa-{idx}",
                "date": "2026-06-15",
                "regionId": region_id,
                "title": f"{len(items)}份结构化文件校验通过",
                "type": "settlement",
                "status": "done",
                "rule": f"公式{formulas}个，未恢复0个",
                "fileIds": [],
            }
        )
    return sorted(events, key=lambda item: item["date"])


def make_repair_patterns(quality: list[dict]) -> list[dict]:
    structured = [item for item in quality if item["status"] == "已校验"]
    formulas = sum(item["formulas"] for item in structured)
    resolved = sum(item["resolvedFormulas"] for item in structured)
    tables = sum(item["tables"] for item in structured)
    unresolved = sum(item["unresolvedFormulas"] + item["unresolvedTables"] for item in structured)
    return [
        {
            "title": "真实文件资源汇总",
            "desc": "Demo数据从本地PDF、Markdown、HTML和结构化JSON生成，文件台账与目录资源保持一致。",
            "output": f"{len(quality)}份PDF资源接入，{len(structured)}份已有结构化验收。",
        },
        {
            "title": "公式结构化恢复",
            "desc": "湖南、陕西已用PDF页面核对恢复公式，并同步Markdown、HTML和结构化JSON。",
            "output": f"公式节点{resolved}/{formulas}已恢复，未恢复{sum(item['unresolvedFormulas'] for item in structured)}个。",
        },
        {
            "title": "表格与附件修复",
            "desc": "对OCR压扁表格、附件边界和名词解释进行重建，避免结构化节点回退。",
            "output": f"表格节点{tables}个，待解析表格{sum(item['unresolvedTables'] for item in structured)}个。",
        },
        {
            "title": "输出一致性校验",
            "desc": "校验公式块数量、原始公式图片残留、内联数学哨兵、水印页码和空标题。",
            "output": f"当前结构化批次待处理项{unresolved}个。",
        },
        {
            "title": "广东待结构化",
            "desc": "广东文件已接入PDF/MD/HTML，但尚未生成ZC_STRUCTURED质量报告。",
            "output": "7份广东文件标记为待结构化/待核对。",
        },
    ]


def js_const(name: str, value) -> str:
    return f"const {name} = {json.dumps(value, ensure_ascii=False, indent=2)};"


def replace_data_block(app_text: str, data_js: str) -> str:
    marker = "const state = {"
    idx = app_text.index(marker)
    return data_js.rstrip() + "\n\n" + app_text[idx:]


def patch_app_functions(app_text: str) -> str:
    app_text = app_text.replace(
        '''function init() {
  els.regionFilter.innerHTML = regions.map((r) => `<option value="${r.id}">${r.name}</option>`).join("");
  bindEvents();
  render();
}''',
        '''function init() {
  els.regionFilter.innerHTML = regions.map((r) => `<option value="${r.id}">${r.name}</option>`).join("");
  const months = availableMonths();
  els.monthFilter.innerHTML = months.map((month) => `<option value="${month}">${formatMonthLabel(month)}</option>`).join("");
  if (!months.includes(state.month)) state.month = months[0] || state.month;
  bindEvents();
  render();
}''',
    )
    insert_after = '''function formatDate(date) {
  return date.replaceAll("-", ".");
}
'''
    if "function availableMonths()" not in app_text:
        app_text = app_text.replace(
            insert_after,
            insert_after
            + '''
function formatMonthLabel(month) {
  const [year, value] = month.split("-");
  return `${year}年${Number(value)}月`;
}

function availableMonths() {
  return [...new Set([
    ...files.map((file) => file.date.slice(0, 7)),
    ...events.map((event) => event.date.slice(0, 7)),
    ...changes.map((change) => change.month)
  ])].sort().reverse();
}

''',
        )
    app_text = app_text.replace(
        '''function qualitySummaryForRegion(regionId) {
  const items = qualityForRegion(regionId);
  if (!items.length) return "待接入";
  const resolved = items.reduce((sum, item) => sum + item.resolvedFormulas, 0);
  const total = items.reduce((sum, item) => sum + item.formulas, 0);
  return total ? `${resolved}/${total}` : "无公式";
}''',
        '''function qualitySummaryForRegion(regionId) {
  const items = qualityForRegion(regionId);
  if (!items.length) return "待接入";
  const resolved = items.reduce((sum, item) => sum + item.resolvedFormulas, 0);
  const total = items.reduce((sum, item) => sum + item.formulas, 0);
  const pending = items.filter((item) => item.status !== "已校验").length;
  const formulaText = total ? `${resolved}/${total}` : "无公式";
  return pending ? `${formulaText} · ${pending}待处理` : formulaText;
}''',
    )
    app_text = app_text.replace(
        '''function qualityNoteForRegion(regionId) {
  const items = qualityForRegion(regionId);
  if (!items.length) return "暂无结构化验收数据";
  const unresolved = items.reduce((sum, item) => sum + item.unresolvedFormulas + item.unresolvedTables, 0);
  return unresolved === 0 ? `${items.length}份文件已通过结构化校验` : `${unresolved}项待复核`;
}''',
        '''function qualityNoteForRegion(regionId) {
  const items = qualityForRegion(regionId);
  if (!items.length) return "暂无结构化验收数据";
  const unresolved = items.reduce((sum, item) => sum + item.unresolvedFormulas + item.unresolvedTables, 0);
  const pending = items.filter((item) => item.status !== "已校验").length;
  if (pending) return `${items.length - pending}份已校验，${pending}份待结构化`;
  return unresolved === 0 ? `${items.length}份文件已通过结构化校验` : `${unresolved}项待复核`;
}''',
    )
    app_text = app_text.replace(
        '''    acc.unresolvedTables += item.unresolvedTables;
    return acc;
  }, { docs: 0, chapters: 0, formulas: 0, resolvedFormulas: 0, unresolvedFormulas: 0, tables: 0, unresolvedTables: 0 });
}''',
        '''    acc.unresolvedTables += item.unresolvedTables;
    if (item.status !== "已校验") acc.pendingDocs += 1;
    return acc;
  }, { docs: 0, chapters: 0, formulas: 0, resolvedFormulas: 0, unresolvedFormulas: 0, tables: 0, unresolvedTables: 0, pendingDocs: 0 });
}''',
    )
    insert_after = '''function statusLabel(status) {
  return { pending: "未开始", active: "进行中", done: "已完成", overdue: "逾期" }[status] || status;
}
'''
    if "function statusClass(" not in app_text:
        app_text = app_text.replace(
            insert_after,
            insert_after
            + '''
function statusClass(status) {
  if (["done", "已完成", "已校验", "已结构化", "生效中"].includes(status)) return "done";
  if (["active", "pending", "待核对", "待结构化", "待生成"].includes(status)) return "active";
  if (["overdue", "异常"].includes(status)) return "overdue";
  return "pending";
}

function fileLink(path, label) {
  if (!path) return "";
  return `<a class="file-link" href="file://${encodeURI(path)}" target="_blank" rel="noreferrer">${label}</a>`;
}

function fileLinks(file) {
  return [
    fileLink(file.pdfPath, "PDF"),
    fileLink(file.htmlPath, "HTML"),
    fileLink(file.mdPath, "MD"),
    fileLink(file.structuredPath, "JSON"),
    fileLink(file.reportPath, "报告")
  ].filter(Boolean).join(" ");
}

''',
        )
    app_text = app_text.replace(
        '''      ${metric("待复核项", `${totals.unresolvedFormulas + totals.unresolvedTables}项`, "未解析公式/表格")}''',
        '''      ${metric("待处理项", `${totals.unresolvedFormulas + totals.unresolvedTables + totals.pendingDocs}项`, "未解析公式/表格/待结构化")}''',
    )
    app_text = app_text.replace(
        '''              <td><span class="status done">${item.status}</span></td>''',
        '''              <td><span class="status ${statusClass(item.status)}">${item.status}</span></td>''',
    )
    app_text = app_text.replace(
        '''              <td><span class="status ${file.status === "待核对" ? "active" : "done"}">${file.status}</span></td>''',
        '''              <td><span class="status ${statusClass(file.status)}">${file.status}</span></td>''',
    )
    app_text = app_text.replace(
        '''        ${detail("政策依据", rule.source)}
        ${detail("版本状态", "2026 V1 · 当前生效")}''',
        '''        ${detail("政策依据", rule.source)}
        ${detail("文件入口", fileLinks(files.find((item) => item.id === rule.fileId) || {}))}
        ${detail("版本状态", "按本地政策文件资源生成")}''',
    )
    app_text = app_text.replace(
        '''        ${detail("关联规则", file.related)}
        ${detail("产品动作", file.status === "待核对" ? "进入文件差异比对，确认是否更新中长期交易规则索引。" : "作为规则索引和政策依据的可追溯来源。")}''',
        '''        ${detail("关联规则", file.related)}
        ${detail("版本关系", file.version || "当前版本")}
        ${detail("文件入口", fileLinks(file))}
        ${detail("产品动作", file.status === "待核对" ? "进入文件差异比对，确认是否更新中长期交易规则索引。" : file.status === "待结构化" ? "已接入文件台账，下一步生成结构化JSON和质量报告。" : "作为规则索引和政策依据的可追溯来源。")}''',
    )
    app_text = app_text.replace(
        '''        ${detail("关联规则", event.rule)}
        ${detail("操作建议", event.type === "spot" ? "确认日前申报曲线和现货敞口。" : "核对交易窗口、申报曲线和限价要求。")}''',
        '''        ${detail("关联规则", event.rule)}
        ${detail("关联文件", (event.fileIds || []).map((id) => files.find((file) => file.id === id)?.name).filter(Boolean).join("；") || "无")}
        ${detail("操作建议", event.type === "spot" ? "确认日前申报曲线和现货敞口。" : "核对交易窗口、申报曲线和限价要求。")}''',
    )
    return app_text


def patch_index(index_text: str) -> str:
    if 'data-page="quality"' not in index_text:
        index_text = index_text.replace(
            '''          <button class="nav-item" data-page="changes">
            <span class="nav-icon">↻</span>
            政策变更
          </button>''',
            '''          <button class="nav-item" data-page="changes">
            <span class="nav-icon">↻</span>
            政策变更
          </button>
          <button class="nav-item" data-page="quality">
            <span class="nav-icon">✓</span>
            解析质量
          </button>''',
        )
    index_text = re.sub(
        r'<select id="monthFilter">.*?</select>',
        '<select id="monthFilter"></select>',
        index_text,
        flags=re.S,
    )
    return index_text


def framework_text(files: list[dict], quality: list[dict]) -> str:
    structured = [item for item in quality if item["status"] == "已校验"]
    pending = [item for item in quality if item["status"] != "已校验"]
    formulas = sum(item["formulas"] for item in structured)
    resolved = sum(item["resolvedFormulas"] for item in structured)
    tables = sum(item["tables"] for item in structured)
    unresolved = sum(item["unresolvedFormulas"] + item["unresolvedTables"] for item in structured)
    by_province = []
    for region_id, region_name, _exchange in PROVINCES:
        region_files = by_region(files, region_id)
        region_quality = [item for item in quality if item["regionId"] == region_id]
        region_structured = [item for item in region_quality if item["status"] == "已校验"]
        by_province.append(
            f"- {region_name}：{len(region_files)}份文件，{len(region_structured)}份已结构化，"
            f"{len(region_files) - len(region_structured)}份待结构化/待核对。"
        )
    file_lines = "\n".join(f"- {item['date']}｜{item['regionId']}｜{item['domain']}｜{item['name']}｜{item['status']}" for item in files)
    return f"""# 售电市场政策文件查阅产品框架

## 产品定位

产品定位从“交易规则运营后台”调整为“市场政策文件查阅与规则索引系统”。

核心目标是让售电公司在进入不同地区市场时，能够先快速查到权威政策文件，再从文件定位到可执行规则：

```text
查文件 -> 看版本 -> 定位规则 -> 对比地区差异 -> 追踪政策变更 -> 形成交易/结算节点
```

## 当前本地资料集

{chr(10).join(by_province)}

总体资源：

- PDF文件：{len(files)}份
- 已生成结构化质量报告：{len(structured)}份
- 待结构化/待核对：{len(pending)}份
- 结构化公式节点：{resolved}/{formulas}
- 结构化表格节点：{tables}
- 未解析公式/表格：{unresolved}

## 一级模块

1. 文件总览：按地区展示政策文件数量、最新文件日期、覆盖规则域、已索引规则数和待核对文件。
2. 文件台账：按地区、发布日期、文件类型、规则域、状态管理政策文件。
3. 规则索引：从政策文件中抽取零售、中长期、现货、结算与风险约束规则。
4. 地区规则对比：横向比较广东、陕西、湖南等地区的规则差异。
5. 交易结算日历：将文件中的发布时间、交易申报、结算出单、复核等时间规则转成日历事项。
6. 政策变更追踪：按月份记录新增文件、补充通知、公告调整和规则变化。
7. 解析质量：展示每个政策文件的文档分型、章节数、公式恢复数、表格修复数、未解析项和验收状态。
8. 结构化配置：维护解析修复规则、输出契约、验收脚本和批量 QA 策略。

## 文件台账字段

```text
地区
交易中心
发布日期
文件名称
文件类型
规则域
文件状态
关联规则
版本关系
PDF / HTML / MD / JSON / 报告入口
产品动作
```

## 规则索引字段

```text
地区
规则分组
交易品种
规则项
当前规则
风险等级
政策依据
文件入口
版本状态
生效周期
```

## 当前文件清单

```text
{file_lines}
```

## 近期结构化修复沉淀

1. 目录与正文标题重切：目录保留为目录清单，正文按 `## / ### / ####` 重建章节层级，修复标题和段落粘连。
2. 公式结构化恢复：以 PDF 页面图像为准，将公式图片、OCR 乱码和损坏 LaTeX 恢复为可渲染公式，并补回变量解释段。
3. 水印与页码清理：按跨页复现规律清理时间戳、IP、页码、公司水印和 OCR 噪声，防止噪声被误判为标题。
4. 表格与附件重建：对 OCR 压扁表格和附件名词解释使用视觉核对后的权威块重建，并同步结构化 JSON。
5. 输出同步与防回退：从修复后的 Markdown 统一生成 HTML、ZC_HTML、ZC_STRUCTURED、报告和索引，并把稳定规则沉淀到批量 QA。
"""


def main() -> int:
    files, quality = collect_files()
    data_js = "\n\n".join(
        [
            js_const("regions", make_regions(files)),
            js_const("rules", make_rules(files, quality)),
            js_const("parseQuality", quality),
            js_const("repairPatterns", make_repair_patterns(quality)),
            js_const("changes", make_changes(files)),
            js_const("events", make_events(files, quality)),
            js_const("files", files),
        ]
    )
    backup_dir = Path("/private/tmp") / f"policy_demo_update_{datetime.now():%Y%m%d-%H%M%S}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    for path in [APP_PATH, INDEX_PATH, FRAMEWORK_PATH]:
        shutil.copy2(path, backup_dir / path.name)

    app_text = replace_data_block(APP_PATH.read_text(encoding="utf-8"), data_js)
    app_text = patch_app_functions(app_text)
    app_text = app_text.replace('regionId: "gd"', 'regionId: "hn"', 1)
    app_text = app_text.replace('month: "2026-05"', 'month: "2026-06"', 1)
    APP_PATH.write_text(app_text, encoding="utf-8")
    INDEX_PATH.write_text(patch_index(INDEX_PATH.read_text(encoding="utf-8")), encoding="utf-8")
    FRAMEWORK_PATH.write_text(framework_text(files, quality), encoding="utf-8")
    print(f"backup_dir={backup_dir}")
    print(f"files={len(files)} quality={len(quality)}")
    print(f"updated={APP_PATH}")
    print(f"updated={INDEX_PATH}")
    print(f"updated={FRAMEWORK_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
