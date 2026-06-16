#!/usr/bin/env python3
"""Repair manually verified formula images in Shaanxi settlement policy outputs."""

from __future__ import annotations

import json
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path


WORKSPACE = Path(__file__).resolve().parents[1]
ROOT = Path("/Users/didi/Documents/codex售电市场政策结构化")
POLICY_DIR = ROOT / "陕西交易中心" / "2026年执行政策"
TOOLS_DIR = ROOT / "tools"
ZC_HTML_DIR = POLICY_DIR / "ZC_HTML"
ZC_STRUCTURED_DIR = POLICY_DIR / "ZC_STRUCTURED"

STEM = "【20260105】附件2陕西电力市场结算实施细则（连续试运行V2）"
PDF_PATH = POLICY_DIR / f"{STEM}.pdf"
MD_PATH = POLICY_DIR / f"{STEM}.md"

sys.path.insert(0, str(TOOLS_DIR))
sys.path.insert(0, str(WORKSPACE / "scripts"))

import convert_md_to_html as md_to_html  # type: ignore  # noqa: E402
import markdown_to_structured_json as md_to_json  # type: ignore  # noqa: E402
from parse_hunan_policy_pdfs_with_skill import render_formula_blocks  # type: ignore  # noqa: E402
from parse_shaanxi_policy_pdfs_with_skill import (  # type: ignore  # noqa: E402
    configure_structured_converter,
    postprocess_structured,
    rebuild_index,
    validate_markdown,
    write_report,
)


SETTLEMENT_PRICE_SECTION = r"""### 5.4. 结算电价

#### 5.4.1. 具备节点条件的发电侧主体以其所在物理节点的节点电价作为现货市场结算价格。

#### 5.4.2. 批发用户侧主体以统一结算点电价作为现货市场结算价格。

日前（实时）统一结算点电价取对应时段发电侧日前（实时）市场各节点出清电价的加权平均值。计算公式如下：

$$
P_{\mathrm{日前统一},t}=\frac{\sum_i(Q_{\mathrm{日前},i,t}\times P_{\mathrm{日前},i,t})}{\sum_i Q_{\mathrm{日前},i,t}}
$$

其中，$P_{\mathrm{日前统一},t}$ 为 t 时段日前现货市场统一结算点价格；$Q_{\mathrm{日前},i,t}$ 为 t 时段省内参与日前现货市场发电机组（场站）i 日前出清电量；$P_{\mathrm{日前},i,t}$ 为 t 时段省内参与日前现货市场发电机组（场站）i 所在节点日前出清价格。

$$
P_{\mathrm{实时统一},t}=\frac{\sum_i(Q_{\mathrm{实际},i,t}\times P_{\mathrm{实时},i,t})}{\sum_i Q_{\mathrm{实际},i,t}}
$$

其中，$P_{\mathrm{实时统一},t}$ 为 t 时段实时现货市场统一结算点价格；$Q_{\mathrm{实际},i,t}$ 为 t 时段省内参与实时现货市场发电机组（场站）i 实际上网电量；$P_{\mathrm{实时},i,t}$ 为 t 时段省内参与实时现货市场发电机组（场站）i 所在节点实时出清价格。

"""


def backup(paths: list[Path]) -> Path:
    backup_dir = Path("/private/tmp") / f"shaanxi_settlement_formula_repair_{datetime.now():%Y%m%d-%H%M%S}"
    for path in paths:
        if not path.exists():
            continue
        rel = path.relative_to(POLICY_DIR)
        dest = backup_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)
    return backup_dir


def replace_between(text: str, start_marker: str, end_marker: str, replacement: str) -> str:
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError(f"start marker not found: {start_marker}")
    end = text.find(end_marker, start)
    if end < 0:
        raise RuntimeError(f"end marker not found after {start_marker}: {end_marker}")
    return text[:start] + replacement + text[end:]


def repair_markdown(text: str) -> str:
    text = replace_between(
        text,
        "### 5.4. 结算电价",
        "#### 5.4.3. 零售用户",
        SETTLEMENT_PRICE_SECTION,
    )
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def mark_verified_formulas(structured: dict) -> dict:
    for formula in structured.get("formulas", []):
        latex = formula.get("latex") or ""
        if r"P_{\mathrm{日前统一},t}" in latex or r"P_{\mathrm{实时统一},t}" in latex:
            formula["parse_method"] = "manual_latex_reconstruction_from_pdf_page"
            formula["confidence"] = max(float(formula.get("confidence") or 0), 0.9)
            formula["review_required"] = False
    quality = structured.setdefault("quality_report", {})
    note = "5.4 结算电价中日前/实时统一结算点电价公式已由图片恢复为 LaTeX，并同步渲染至 HTML。"
    issues = quality.setdefault("blocking_issues", [])
    if note not in issues:
        issues.append(note)
    return structured


def rebuild_outputs() -> dict:
    md_text = repair_markdown(MD_PATH.read_text(encoding="utf-8"))
    MD_PATH.write_text(md_text, encoding="utf-8")

    html_path = md_to_html.convert_file(MD_PATH)
    html_text = render_formula_blocks(html_path.read_text(encoding="utf-8"))
    html_path.write_text(html_text, encoding="utf-8")
    ZC_HTML_DIR.mkdir(exist_ok=True)
    (ZC_HTML_DIR / f"{STEM}.html").write_text(html_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{STEM}.zc_skill.html").write_text(html_text, encoding="utf-8")

    base_report = md_to_json.load_base_report(PDF_PATH, ZC_HTML_DIR)
    structured = postprocess_structured(md_to_json.parse_markdown(MD_PATH, base_report))
    structured = mark_verified_formulas(structured)
    json_text = json.dumps(structured, ensure_ascii=False, indent=2)
    ZC_STRUCTURED_DIR.mkdir(exist_ok=True)
    (ZC_STRUCTURED_DIR / f"{STEM}.structured.json").write_text(json_text, encoding="utf-8")
    (ZC_STRUCTURED_DIR / f"{STEM}.zc_skill.structured.json").write_text(json_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{STEM}.json").write_text(json_text, encoding="utf-8")

    validation = validate_markdown(MD_PATH)
    write_report(STEM, structured, validation)
    rebuild_index()
    return structured


def main() -> int:
    configure_structured_converter()
    paths = [
        MD_PATH,
        MD_PATH.with_suffix(".html"),
        ZC_HTML_DIR / f"{STEM}.html",
        ZC_HTML_DIR / f"{STEM}.zc_skill.html",
        ZC_HTML_DIR / f"{STEM}.json",
        ZC_STRUCTURED_DIR / f"{STEM}.structured.json",
        ZC_STRUCTURED_DIR / f"{STEM}.zc_skill.structured.json",
        ZC_STRUCTURED_DIR / f"{STEM}.zc_skill.report.md",
    ]
    backup_dir = backup(paths)
    structured = rebuild_outputs()
    quality = structured.get("quality_report", {})
    print(f"backup_dir={backup_dir}")
    print(
        f"{STEM}: formulas={quality.get('formula_count')} "
        f"resolved={quality.get('resolved_formula_count')} "
        f"unresolved={quality.get('unresolved_formula_count')}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
