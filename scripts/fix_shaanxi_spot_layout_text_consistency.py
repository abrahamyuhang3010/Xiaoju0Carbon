#!/usr/bin/env python3
"""Repair Shaanxi attachment 1 layout/text drift against the source PDF."""

from __future__ import annotations

import html
import json
import re
import shutil
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

import pdfplumber


WORKSPACE = Path(__file__).resolve().parents[1]
ROOT = Path("/Users/didi/Documents/codex售电市场政策结构化")
POLICY_DIR = ROOT / "陕西交易中心" / "2026年执行政策"
TOOLS_DIR = ROOT / "tools"
ZC_HTML_DIR = POLICY_DIR / "ZC_HTML"
ZC_STRUCTURED_DIR = POLICY_DIR / "ZC_STRUCTURED"
STEM = "【20260105】附件1陕西电力现货市场交易实施细则（连续试运行V2）"

PDF_PATH = POLICY_DIR / f"{STEM}.pdf"
MD_PATH = POLICY_DIR / f"{STEM}.md"
HTML_PATH = POLICY_DIR / f"{STEM}.html"
ZC_HTML_PATH = ZC_HTML_DIR / f"{STEM}.html"
ZC_SKILL_HTML_PATH = ZC_HTML_DIR / f"{STEM}.zc_skill.html"
ZC_HTML_JSON_PATH = ZC_HTML_DIR / f"{STEM}.json"
STRUCTURED_JSON_PATH = ZC_STRUCTURED_DIR / f"{STEM}.structured.json"
ZC_SKILL_STRUCTURED_JSON_PATH = ZC_STRUCTURED_DIR / f"{STEM}.zc_skill.structured.json"
REPORT_PATH = ZC_STRUCTURED_DIR / f"{STEM}.layout_text_audit.md"

sys.path.insert(0, str(TOOLS_DIR))
sys.path.insert(0, str(WORKSPACE / "scripts"))

import convert_md_to_html as md_to_html  # type: ignore  # noqa: E402
import markdown_to_structured_json as md_to_json  # type: ignore  # noqa: E402
from fix_hunan_spot_formula_mapping import render_latex_fragment  # type: ignore  # noqa: E402
from parse_hunan_policy_pdfs_with_skill import render_formula_blocks  # type: ignore  # noqa: E402
from parse_shaanxi_policy_pdfs_with_skill import (  # type: ignore  # noqa: E402
    configure_structured_converter,
    postprocess_structured,
    rebuild_index,
)


HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$")
PDF_NUM_HEADING_RE = re.compile(r"^(\d+(?:\.\d+)*\.)\s*(.+)$")
MD_NUM_HEADING_RE = re.compile(r"^(\d+(?:\.\d+)*\.?)\s*(.+)$")
PDF_TOC_RE = re.compile(r"^(\d+(?:\.\d+)*\.)\s*(.+?)\s*\.{3,}\s*(\d+)\s*$")
PAGE_MARK_RE = re.compile(r"^—\s*\d+\s*—$")
DISPLAY_FORMULA_RE = re.compile(r"(?ms)^\$\$\n.*?\n\$\$")
SECTION_RE = re.compile(r"(?ms)^#{2,6}\s+")
MATH_PARAGRAPH_STYLE = (
    "text-align:left !important;"
    "text-align-last:left !important;"
    "word-spacing:normal !important;"
    "letter-spacing:0 !important;"
)
LOAD_BALANCE_WRONG_FORMULA = r"\sum_i P_{i,t}+\sum_j T_{j,t}=\sum_k D_{k,t}"
LOAD_BALANCE_PDF_FORMULA = r"\sum P_t+\sum T_t=\sum D_t"
LOAD_BALANCE_WRONG_EXPLANATION = (
    r"其中，$\sum_i P_{i,t}$ 表示时段 $t$ 的系统发电出力总和，"
    r"$\sum_j T_{j,t}$ 表示时段 $t$ 的联络线计划功率总和（受入为正、送出为负），"
    r"$\sum_k D_{k,t}$ 为时段 $t$ 的系统负荷总和。"
)
LOAD_BALANCE_PDF_EXPLANATION = (
    r"其中，$\sum P_t$ 表示时段 $t$ 的系统发电出力总和，"
    r"$\sum T_t$ 表示时段 $t$ 的联络线计划功率总和（受入为正、送出为负），"
    r"$\sum D_t$ 为时段 $t$ 的系统负荷总和。"
)
QUOTE_SIMILARITY_LATEX = (
    r"W_{i,j}=1-\frac{\sum_{k\in[0\%,N\%,\ldots,100\%]}\sqrt{(P^i_k-P^j_k)^2}}"
    r"{1+100/N}\times\frac{1}{\mathrm{现货价格申报上限}}"
)
QUOTE_VECTOR_LATEX = r"V_i=\left|P_{0\%},P_{N\%},P_{2N\%},\ldots,P_{100\%}\right|"
QUOTE_SIMILARITY_DEFAULT_HTML_MARKER = (
    '<i>W</i><sub><i>i</i>,<i>j</i></sub><span class="math-op">=</span>'
    '<span class="math-numlit">1</span><span class="math-op">-</span><span class="math-frac">'
)
START_STOP_SWITCH_SPLIT_BLOCK = r"""$$
h_{i,t}=1,\quad a_{i,t}=1,\ a_{i,t-1}=0
$$

$$
h_{i,t}=0,\quad \mathrm{otherwise}
$$

$$
g_{i,t}=1,\quad a_{i,t}=0,\ a_{i,t-1}=1
$$

$$
g_{i,t}=0,\quad \mathrm{otherwise}
$$"""
START_STOP_SWITCH_PDF_BLOCK = r"""$$
h_{i,t}=1,\quad a_{i,t}=1,\ a_{i,t-1}=0
h_{i,t}=0,\quad \mathrm{otherwise}
g_{i,t}=1,\quad a_{i,t}=0,\ a_{i,t-1}=1
g_{i,t}=0,\quad \mathrm{otherwise}
$$"""
START_STOP_LIMIT_SPLIT_BLOCK = r"""$$
\sum_{t=1}^{T}h_{i,t}\le h^{\max}_i
$$

$$
\sum_{t=1}^{T}g_{i,t}\le g^{\max}_i
$$"""
START_STOP_LIMIT_PDF_BLOCK = r"""$$
\sum_{t=1}^{T}h_{i,t}\le h^{\max}_i
\sum_{t=1}^{T}g_{i,t}\le g^{\max}_i
$$"""
ETA_SWITCH_CASE_LATEX = r"""\eta_{i,t}=\begin{cases}
1, & \text{仅当 }\alpha_{i,t}=1\text{ 且 }\alpha_{i,t-1}=0\\
0, & \text{其余情况}
\end{cases}"""
GAMMA_SWITCH_CASE_LATEX = r"""\gamma_{i,t}=\begin{cases}
1, & \text{仅当 }\alpha_{i,t}=0\text{ 且 }\alpha_{i,t-1}=1\\
0, & \text{其余情况}
\end{cases}"""
INLINE_EMPTY_SUM_BIGOP_RE = re.compile(
    r'<span class="math-bigop"><span class="math-bigop-sup"></span>'
    r'<span class="math-bigop-symbol">∑</span>'
    r'<span class="math-bigop-sub"></span></span>\s*'
)
INLINE_MATH_CJK_LEFT_RE = re.compile(r'([\u4e00-\u9fff，。；：、（）【】《》])\s+(<span class="inline-math")')
INLINE_MATH_CJK_RIGHT_RE = re.compile(r'(</span>)\s+([\u4e00-\u9fff，。；：、（）【】《》])')


def iter_display_formula_bodies(md_text: str) -> list[str]:
    bodies: list[str] = []
    for match in DISPLAY_FORMULA_RE.finditer(md_text):
        block = match.group(0)
        bodies.append(block.removeprefix("$$\n").removesuffix("\n$$"))
    return bodies


def is_horizontal_formula_split_candidate(body: str) -> bool:
    lines = [line.strip() for line in body.splitlines() if line.strip()]
    if len(lines) <= 1:
        return False
    compact = re.sub(r"\s+", "", "".join(lines))
    if compact.startswith(r"\sum_{i=1}^{N}a_{i,t}P^{\max}_{i,t}\ge") or compact.startswith(
        r"\sum_{i=1}^{N}\alpha_{i,t}P^{\max}_{i,t}\ge"
    ):
        return True
    if compact.startswith(r"P_{i,t}-P_{i,t-1}\le"):
        return True
    if compact.startswith(r"P_{i,t-1}-P_{i,t}\le"):
        return True
    if compact.startswith(r"P^{\min}_{\mathrm{area}}\le"):
        return True
    if compact.startswith(r"P^{\min}_{s}\le"):
        return True
    if compact.startswith(r"\min\left\{") and "C^U" not in compact and "C^0" not in compact:
        return True
    return False


def formula_layout_issue_flags(md_text: str) -> dict[str, int]:
    bodies = iter_display_formula_bodies(md_text)
    objective_bodies = [
        body for body in bodies
        if body.lstrip().startswith(r"\min\left\{")
        and "C^G_{v,t}" in re.sub(r"\s+", "", body)
        and "L^+_{s,t}" in body
    ]
    return {
        "horizontal_formula_split_lines": sum(1 for body in bodies if is_horizontal_formula_split_candidate(body)),
        "display_formula_multiline_blocks": sum(
            1 for body in bodies if len([line for line in body.splitlines() if line.strip()]) > 1
        ),
        "objective_formula_count": len(objective_bodies),
        "objective_formula_uses_round_brackets": sum(1 for body in objective_bodies if r"M\left(" in body),
    }


def normalize_spaces(text: str) -> str:
    text = text.replace("\u3000", " ").replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+([，。；：！？、）】》])", r"\1", text)
    text = re.sub(r"([（【《])\s+", r"\1", text)
    return text.strip()


def normalize_pdf_text_for_compare(text: str) -> str:
    text = normalize_spaces(text)
    text = re.sub(r"<([^<>]{2,120}[\u4e00-\u9fff][^<>]{0,120})>", r"《\1》", text)
    return text


def read_pdf_pages() -> list[str]:
    pages: list[str] = []
    with pdfplumber.open(PDF_PATH) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text(x_tolerance=2, y_tolerance=3) or "")
    return pages


def extract_pdf_toc_lines(pdf_pages: list[str]) -> list[dict[str, str | int]]:
    entries: list[dict[str, str | int]] = []
    for page_text in pdf_pages[1:5]:
        for raw in page_text.splitlines():
            line = normalize_spaces(raw)
            match = PDF_TOC_RE.match(line)
            if not match:
                continue
            number, title, page = match.groups()
            title = normalize_pdf_text_for_compare(title)
            entries.append(
                {
                    "number": number,
                    "title": title,
                    "page": int(page),
                    "line": f"{number} {title} {'.' * 36} {page}",
                }
            )
    return entries


def pdf_heading_dict(pdf_pages: list[str]) -> dict[str, str]:
    headings: dict[str, str] = {}
    for page_text in pdf_pages[5:]:
        for raw in page_text.splitlines():
            line = normalize_pdf_text_for_compare(raw)
            if PAGE_MARK_RE.match(line):
                continue
            match = PDF_NUM_HEADING_RE.match(line)
            if not match:
                continue
            number, title = match.groups()
            title = title.strip()
            if not re.search(r"[\u4e00-\u9fff]", title):
                continue
            if re.match(r"^[\d.．＜<≤>=＝]", title):
                continue
            if len(title) > 48 or title.endswith(("。", "；", "，", "：")):
                continue
            if re.search(r"[=≤≥£å∑Σ]|供需比|浮动系数|收益系数", title):
                continue
            headings[number.rstrip(".")] = title
    return headings


def md_heading_dict(md_text: str) -> dict[str, tuple[str, int, str]]:
    headings: dict[str, tuple[str, int, str]] = {}
    for line_no, raw in enumerate(md_text.splitlines(), 1):
        match = HEADING_RE.match(raw)
        if not match:
            continue
        title = normalize_spaces(match.group(2))
        numeric = MD_NUM_HEADING_RE.match(title)
        if not numeric:
            continue
        number, heading_title = numeric.groups()
        headings[number.rstrip(".")] = (heading_title.strip(), line_no, raw)
    return headings


def md_toc_block(md_text: str) -> str:
    if "## 目录" not in md_text:
        return ""
    after = md_text.split("## 目录", 1)[1]
    if "\n## " in after:
        return after.split("\n## ", 1)[0]
    return after


def between_markers(text: str, start_marker: str, end_marker: str | None = None) -> str:
    start = text.find(start_marker)
    if start < 0:
        return ""
    if end_marker is None:
        return text[start:]
    end = text.find(end_marker, start)
    if end < 0:
        return text[start:]
    return text[start:end]


def model_layout_issue_flags(md_text: str) -> dict[str, int]:
    scuc = between_markers(
        md_text,
        "#### 5.7.1. 日前安全约束机组组合（SCUC）模型",
        "#### 5.7.2. 日前安全约束经济调度（SCED）模型",
    )
    sced = between_markers(
        md_text,
        "#### 5.7.2. 日前安全约束经济调度（SCED）模型",
        "### 5.8. 特殊机组在日前电能量市场中的出清机制",
    )
    model_text = scuc + "\n" + sced
    exact_glued = [
        "线路、变压器及断面极限功率为应对电网运行边界",
        "发电机组（群）必开约束出现以下情况时",
        "发电机组（群）必停约束出现以下情况时",
        "发电机组（群）出力上下限约束出现以下情况时",
        "新建机组调试新建的",
        "在运机组试验（调试）竞价日前",
        "调试阶段的新建机组调试阶段",
        "调试（试验）的在运机组批复同意",
        "。虚拟电厂出力/负荷及发电/用电费用",
    ]
    sced_explanation_missing_flags = {
        "sced_group_output_explanation_missing": int(SCED_GROUP_OUTPUT_EXPLANATION not in sced),
        "sced_ramp_explanation_missing": int(SCED_RAMP_EXPLANATION not in sced),
        "sced_network_flow_explanation_missing": int(SCED_NETWORK_FLOW_EXPLANATION not in sced),
        "sced_storage_explanation_missing": int(SCED_STORAGE_EXPLANATION not in sced),
        "sced_vpp_explanation_missing": int(SCED_VPP_EXPLANATION not in sced),
        "sced_storage_cycle_explanation_missing": int(SCED_STORAGE_CYCLE_EXPLANATION not in sced),
    }
    return {
        "known_subitem_title_body_glued": sum(md_text.count(token) for token in exact_glued),
        "model_constraint_title_body_glued": len(re.findall(r"(?m)^（\d+）[^。\n]{2,48}约束。.+", model_text)),
        "long_model_qizhong_paragraphs": len(re.findall(r"(?m)^其中：.{120,}$", model_text)),
        "scuc_missing_reserve_intro": int(bool(scuc) and "在确保系统功率平衡的前提下，为了防止系统负荷预测偏差" not in scuc),
        "startup_formula_missing_pdf_eta": int("C^U_{i,t}=\\eta_{i,t}C^U_i" not in scuc),
        "startup_explanation_missing_pdf_eta": int("$\\eta_{i,t}$ 表征机组 $i$ 在时段 $t$ 是否切换到启动状态" not in scuc),
        "no_load_formula_missing_pdf_alpha": int("C^0_{i,t}=\\alpha_{i,t}C^0_i" not in scuc),
        "load_balance_formula_has_extra_indices": model_text.count(LOAD_BALANCE_WRONG_FORMULA),
        "load_balance_explanation_has_extra_indices": model_text.count(LOAD_BALANCE_WRONG_EXPLANATION),
        "reserve_formula_extra_sum_k_for_d": scuc.count(r"\sum_kD_{k,t}") + scuc.count(r"\sum_k D_{k,t}"),
        "reserve_formula_d_has_k_subscript": scuc.count(r"\sum D_{k,t}"),
        "scuc_latin_state_a_tokens": len(re.findall(r"(?<![A-Za-z\\])a(?:_\{i,t(?:-1)?\}|\^\{ch\}|\^\{dis\}|\^L|\^G)", scuc)),
        "start_stop_uses_latin_hg": int("h_{i,t}" in scuc or "g_{i,t}" in scuc),
        "start_stop_missing_eta_gamma_cases": int(ETA_SWITCH_CASE_LATEX not in scuc or GAMMA_SWITCH_CASE_LATEX not in scuc),
        "area_net_start_stop_missing_pdf_eta_gamma": int(
            r"(\eta_{i,t}\bar P_i-\gamma_{i,t}\bar P_i)" not in scuc
        ),
        "alpha_overexpanded_tokens": model_text.count(r"\alph\alpha"),
        "start_stop_switch_split_blocks": scuc.count(START_STOP_SWITCH_SPLIT_BLOCK),
        "start_stop_limit_split_blocks": scuc.count(START_STOP_LIMIT_SPLIT_BLOCK),
        "scuc_objective_missing_pdf_cost_details": int("其中机组运行费用 $C_{i,t}(P_{i,t})$ 是与机组申报的各段出力区间" not in scuc),
        "sced_objective_missing_pdf_cost_details": int("是与机组申报的各段出力区间和对应能量价格有关的多段线性函数" not in sced),
        "sced_constraint_explanations_missing_total": sum(sced_explanation_missing_flags.values()),
        **sced_explanation_missing_flags,
        **formula_layout_issue_flags(md_text),
    }


def non_model_formula_issue_flags(md_text: str) -> dict[str, int]:
    return {
        "user_side_pricing_wrong_subscript_order": sum(
            md_text.count(token)
            for token in [
                r"LMP_{\mathrm{日前},t}",
                r"Q_{\mathrm{日前},m,t}",
                r"LMP_{\mathrm{日前},m,t}",
                r"LMP_{\mathrm{实时},t}",
                r"Q_{\mathrm{实时},m,t}",
                r"LMP_{\mathrm{实时},m,t}",
            ]
        ),
        "ancillary_linkage_wrong_subscript_order": sum(
            md_text.count(token)
            for token in [
                r"P^{\max}_{i,\mathrm{日前}}",
                r"P^{\min}_{i,\mathrm{日前}}",
                r"P^{\max}_{i,\mathrm{实时}}",
                r"P^{\min}_{i,\mathrm{实时}}",
                r"P^{\max}_{i,\mathrm{预出}}",
                r"P^{\min}_{i,\mathrm{预出}}",
                r"P^{\max}_{i,\mathrm{出清}}",
                r"P^{\min}_{i,\mathrm{出清}}",
                r"P_{i,\mathrm{日前预出清中标容量}}",
                r"P_{i,\mathrm{实时出清中标容量}}",
            ]
        ),
        "reference_offer_formula_uses_placeholder": md_text.count(
            r"P_{\mathrm{参考报价}}=\mathrm{电煤价格}\times\mathrm{煤耗参数}\times P"
        ),
        "quote_similarity_formula_wrong_semantics": md_text.count(
            r"H_{i,j}=1-\frac{\sqrt{\sum_k(P_{i,k}-P_{j,k})^2}}{P_{\mathrm{现货价格申报上限}}}"
        )
        + md_text.count(r"\sum_{k\in\{0\%,N\%,\ldots,100\%\}}")
        + md_text.count(r"$P_{i,k}$ 和 $P_{j,k}$"),
        "quote_vector_formula_uses_parentheses": md_text.count(
            r"V_i=(P_{0\%},P_{N\%},P_{2N\%},\ldots,P_{100\%})"
        ),
    }


def count_plain_inline_math_paragraphs(html_text: str) -> int:
    return len(
        re.findall(
            r'<p class="paragraph">(?:(?!</p>).)*inline-math(?:(?!</p>).)*</p>',
            html_text,
            flags=re.S,
        )
    )


def count_math_paragraphs_missing_inline_style(html_text: str) -> int:
    count = 0
    for match in re.finditer(r'<p class="paragraph math-paragraph"(?P<attrs>[^>]*)>', html_text):
        attrs = match.group("attrs")
        if "text-align:left !important" not in attrs:
            count += 1
    return count


def count_math_paragraph_cjk_spacing_gaps(html_text: str) -> int:
    total = 0
    for match in re.finditer(r'<p class="paragraph math-paragraph"[^>]*>(?P<body>.*?)</p>', html_text, re.S):
        body = match.group("body")
        total += len(INLINE_MATH_CJK_LEFT_RE.findall(body))
        total += len(INLINE_MATH_CJK_RIGHT_RE.findall(body))
    return total


def count_stale_inline_math_css_rules(html_text: str) -> int:
    style_match = re.search(r"(?s)<style>(?P<style>.*?)</style>", html_text)
    if not style_match:
        return 1
    style = style_match.group("style")
    stale_patterns = [
        r"\.inline-math\s*\{[^}]*margin:\s*0\s+0\.03em",
        r"\.inline-math\s*\{[^}]*font-size:\s*1\.04em",
        r"\.inline-math\s+sub,\s*\.inline-math\s+sup\s*\{[^}]*font-size:\s*0\.72em",
        r"\.inline-math\s+\.math-scripts\s+sup,\s*\.inline-math\s+\.math-scripts\s+sub\s*\{[^}]*line-height:\s*0\.78",
    ]
    return sum(1 for pattern in stale_patterns if re.search(pattern, style, re.S))


def count_missing_math_paragraph_inline_flow_css(html_text: str) -> int:
    style_match = re.search(r"(?s)<style>(?P<style>.*?)</style>", html_text)
    if not style_match:
        return 1
    style = style_match.group("style")
    required_patterns = [
        r"p\.math-paragraph\s+\.inline-math\s*\{[^}]*display:\s*inline",
        r"p\.math-paragraph\s+\.inline-math\s+\.math-scripts\s*\{[^}]*display:\s*inline",
        r"p\.math-paragraph\s+\.inline-math\s+\.math-scripts\s+sup,\s*p\.math-paragraph\s+\.inline-math\s+\.math-scripts\s+sub\s*\{[^}]*display:\s*inline",
    ]
    return sum(1 for pattern in required_patterns if not re.search(pattern, style, re.S))


def count_inline_empty_sum_bigops(html_text: str) -> int:
    total = 0
    for match in re.finditer(r'<p class="paragraph math-paragraph"[^>]*>(?P<body>.*?)</p>', html_text, re.S):
        total += len(INLINE_EMPTY_SUM_BIGOP_RE.findall(match.group("body")))
    return total


def audit_current(md_text: str, html_text: str, pdf_pages: list[str]) -> dict[str, Any]:
    pdf_toc = extract_pdf_toc_lines(pdf_pages)
    pdf_headings = pdf_heading_dict(pdf_pages)
    md_headings = md_heading_dict(md_text)
    toc_block = md_toc_block(md_text)

    heading_mismatches = []
    for number, pdf_title in pdf_headings.items():
        md_item = md_headings.get(number)
        if not md_item:
            heading_mismatches.append({"number": number, "pdf": pdf_title, "md": None, "line": None})
            continue
        md_title, line_no, raw = md_item
        if normalize_spaces(md_title) != normalize_spaces(pdf_title):
            heading_mismatches.append({"number": number, "pdf": pdf_title, "md": md_title, "line": line_no})

    toc_bullet_lines = [line for line in toc_block.splitlines() if line.strip().startswith("- ")]
    toc_page_number_lines = [line for line in toc_block.splitlines() if re.search(r"\.{3,}\s*\d+\s*$", line)]
    current_toc_text = normalize_spaces(re.sub(r"[-*]\s+", "", toc_block))
    toc_missing = [
        f"{item['number']} {item['title']}"
        for item in pdf_toc
        if normalize_spaces(f"{item['number']} {item['title']}") not in current_toc_text
    ]

    hard_break_risks = 0
    blocks = [block.strip() for block in re.split(r"\n\s*\n", md_text) if block.strip()]
    for prev, curr in zip(blocks, blocks[1:]):
        if prev.startswith("#") or curr.startswith("#") or prev.startswith("$$") or curr.startswith("$$"):
            continue
        if prev.startswith("|") or "\n|" in prev:
            continue
        if re.match(r"^（\d+）[^。；：，！？]{2,80}$", prev):
            continue
        if prev.endswith(("表达式：", "如下：", "包括：")):
            continue
        if prev.endswith(("。", "；", "：", "！", "？", "）", "”", "》")):
            continue
        if re.match(r"^[（(]?\d+[）)]", curr):
            continue
        hard_break_risks += 1

    html_issue_flags = {
        "filename_title_in_html": int(
            re.search(rf'<(?:h[1-6]|p)[^>]*>\s*{re.escape(STEM)}\s*</', html_text) is not None
        ),
        "toc_rendered_as_ul": len(re.findall(r'<ul class="toc-list">', html_text)),
        "toc_line_count": len(re.findall(r'class="toc-line', html_text)),
        "toc_line_count_mismatch": int(len(re.findall(r'class="toc-line', html_text)) != len(pdf_toc)),
        "h2_border_top_css": len(re.findall(r"h2\s*\{[^}]*border-top:\s*1px", html_text, re.S)),
        "card_shadow_css": len(re.findall(r"box-shadow:", html_text)),
        "missing_paragraph_text_indent_css": int("text-indent" not in html_text),
        "plain_inline_math_paragraphs": count_plain_inline_math_paragraphs(html_text),
        "math_paragraph_count": html_text.count('class="paragraph math-paragraph"'),
        "math_paragraph_inline_style_missing": count_math_paragraphs_missing_inline_style(html_text),
        "math_paragraph_cjk_spacing_gaps": count_math_paragraph_cjk_spacing_gaps(html_text),
        "stale_inline_math_css_rules": count_stale_inline_math_css_rules(html_text),
        "math_paragraph_inline_flow_css_missing": count_missing_math_paragraph_inline_flow_css(html_text),
        "inline_empty_sum_bigops": count_inline_empty_sum_bigops(html_text),
        "objective_formula_custom_render_count": html_text.count('class="objective-formula '),
        "objective_formula_default_min_brace_count": html_text.count('<span class="math-upright">min</span><span class="math-delim">{</span>'),
        "quote_similarity_formula_custom_render_count": html_text.count('class="quote-similarity-formula"'),
        "quote_similarity_formula_image_render_count": html_text.count('class="quote-similarity-image"'),
        "quote_similarity_formula_default_render_count": html_text.count(QUOTE_SIMILARITY_DEFAULT_HTML_MARKER),
        "html_alpha_overexpanded_tokens": html_text.count("<i>\\alph</i>") + html_text.count(r"\alph"),
    }

    text_issue_flags = {
        "filename_heading_in_md": int(md_text.startswith(f"# {STEM}")),
        "toc_bullet_lines": len(toc_bullet_lines),
        "toc_entries_without_pdf_page_numbers": max(0, len(pdf_toc) - len(toc_page_number_lines)),
        "known_heading_suffix_leaks": len(re.findall(r"^措施市场初期", md_text, flags=re.M)),
        "market_power_table_rows_missing": int("1.05" not in md_text or "1.15" not in md_text),
        "hard_break_risks": hard_break_risks,
        **model_layout_issue_flags(md_text),
        **non_model_formula_issue_flags(md_text),
    }

    return {
        "pdf_page_count": len(pdf_pages),
        "pdf_toc_entries": len(pdf_toc),
        "pdf_body_numeric_headings": len(pdf_headings),
        "heading_mismatches": heading_mismatches,
        "heading_mismatch_count": len(heading_mismatches),
        "toc_missing_entries": toc_missing,
        "toc_missing_entry_count": len(toc_missing),
        "text_issue_flags": text_issue_flags,
        "html_issue_flags": html_issue_flags,
    }


def backup_outputs() -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_dir = Path("/private/tmp") / f"shaanxi_spot_layout_text_consistency_{stamp}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    for path in [
        MD_PATH,
        HTML_PATH,
        ZC_HTML_PATH,
        ZC_SKILL_HTML_PATH,
        ZC_HTML_JSON_PATH,
        STRUCTURED_JSON_PATH,
        ZC_SKILL_STRUCTURED_JSON_PATH,
        REPORT_PATH,
        ZC_STRUCTURED_DIR / "index.json",
    ]:
        if not path.exists():
            continue
        rel = path.relative_to(POLICY_DIR)
        dest = backup_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)
    return backup_dir


def earliest_backup_audit(pdf_pages: list[str]) -> dict[str, Any] | None:
    backups = sorted(Path("/private/tmp").glob("shaanxi_spot_layout_text_consistency_*"))
    for backup_dir in backups:
        md_path = backup_dir / f"{STEM}.md"
        html_path = backup_dir / f"{STEM}.html"
        if not md_path.exists() or not html_path.exists():
            continue
        return audit_current(md_path.read_text(encoding="utf-8"), html_path.read_text(encoding="utf-8"), pdf_pages)
    return None


def build_toc_markdown(pdf_pages: list[str]) -> str:
    entries = extract_pdf_toc_lines(pdf_pages)
    if not entries:
        raise RuntimeError("failed to extract PDF TOC entries")
    lines = ["## 目录", ""]
    for entry in entries:
        indent = "  " * str(entry["number"]).rstrip(".").count(".")
        lines.append(f"{indent}{entry['line']}")
    return "\n".join(lines).rstrip()


def replace_cover_and_toc(md_text: str, pdf_pages: list[str]) -> str:
    first_body = re.search(r"(?m)^##\s+1[.．]\s*总述\s*$", md_text)
    if not first_body:
        raise RuntimeError("body start not found: ## 1. 总述")
    cover = """附件1

# 陕西电力现货市场交易实施细则

（连续试运行 V2.0）

2025 年 12 月"""
    toc = build_toc_markdown(pdf_pages)
    return f"{cover}\n\n{toc}\n\n{md_text[first_body.start():]}"


def replace_section(md_text: str, start_marker: str, end_marker: str, replacement: str) -> str:
    start = md_text.find(start_marker)
    if start < 0:
        raise RuntimeError(f"section start not found: {start_marker}")
    end = md_text.find(end_marker, start)
    if end < 0:
        raise RuntimeError(f"section end not found after {start_marker}: {end_marker}")
    return md_text[:start] + replacement.strip() + "\n\n" + md_text[end:]


GENERATOR_TEST_PLAN = """##### 5.2.2.5. 发电机组调试及试验计划

（1）新建机组调试

新建的非市场机组和未获得直接交易资格的市场机组在并网调试期间按照调试需求安排发电，完成满负荷试运行后，电力调度机构在保证电力供需平衡以及电网安全的前提下，按照系统运行需要和有关发电调度原则安排发电。

新建的获得直接交易资格的火电机组在并网调试期间按照调试需求安排发电；具备进入商业运营相关条件及技术条件当天（D）的次日（D+1），火电机组可参与（D+2）日的日前电能量市场申报及出清。

（2）在运机组试验（调试）

竞价日前一天（D-2）9:00 前，经电力调度机构审核同意于运行日进行试验（调试）的在运机组，需按调度管理规程在规定时间节点提交试验（调试）申请票，并同步报送运行日调试时段内每15 分钟的机组调试出力计划。机组调试时段的出力为经电力调度机构审核通过的出力计划，在确保电网安全供应的基础上，作为边界条件在日前电能量市场中优先出清、接受价格。非调试时段正常参与日前电能量市场出清。
"""


SPECIAL_TEST_UNIT_CLEARING = """#### 5.8.2. 调试（试验）机组

（1）调试阶段的新建机组

调试阶段的新建机组按照并网调试需求安排发电，纳入日前电能量市场出清的边界条件，作为价格接受者不参与市场优化和定价。

（2）调试（试验）的在运机组

批复同意运行日调试（试验）计划的在运发电机组，在调试（试验）时段内的机组状态为开机并固定出力，作为价格接受者不参与市场优化和定价。在非调试（试验）时段内，按照其日前电能量报价，正常组织市场出清形成机组发电计划。

对于因电厂原因的调试（试验）机组，若申报的调试（试验）计划不满足电力有序供应、电网安全稳定、调峰调频等要求，电力调度机构可根据需要对机组的调试（试验）出力曲线进行调整。

调试（试验）时段内的机组发电计划为其申报并经审核通过后的调试（试验）出力曲线，不参与市场定价。

对于因电网原因的调试（试验）机组，调试（试验）时段内的机组发电计划为电力调度机构安排的调试（试验）出力曲线，不参与市场定价，相应出力部分按必开补偿处理。
"""


SCUC_OBJECTIVE_EXPLANATION = """其中：

$N$ 表示机组的总台数；

$T$ 表示所考虑的总时段数，其中 D 日每 15 分钟一个时段，共 96 个时段，根据备用要求可额外增加 D+1、D+2 日负荷高峰、低谷时段；

$P_{i,t}$ 表示机组 $i$ 在时段 $t$ 的出力；

$C_{i,t}(P_{i,t})$、$C^U_{i,t}$、$C^0_{i,t}$ 分别为机组 $i$ 在时段 $t$ 的运行费用、启动费用和空载费用，其中机组运行费用 $C_{i,t}(P_{i,t})$ 是与机组申报的各段出力区间和对应能量价格有关的多段线性函数；

$C^G_{v,t}(P^G_{v,t})$、$C^L_{v,t}(P^L_{v,t})$ 分别为虚拟电厂 $v$ 在时段 $t$ 的发电费用、用电费用，其中发电费用是与虚拟电厂申报的各段出力区间和对应能量价格有关的多段线性函数，用电费用是与虚拟电厂申报的各段负荷区间和对应能量价格有关的多段线性函数；

$M$ 为网络潮流约束松弛罚因子；

$L^+_{s,t}$、$L^-_{s,t}$ 分别为线路、变压器及断面 $s$ 的正、反向潮流松弛变量；$NS$ 为线路、变压器及断面的集合。"""


SCED_OBJECTIVE_EXPLANATION = """其中：

$N$ 表示机组的总台数；

$T$ 表示所考虑的总时段数，每天考虑 96 时段，则 $T$ 为 96；

$P_{i,t}$ 表示机组 $i$ 在时段 $t$ 的出力；

$C_{i,t}(P_{i,t})$ 为机组 $i$ 在时段 $t$ 的运行费用，是与机组申报的各段出力区间和对应能量价格有关的多段线性函数；

$C^G_{v,t}(P^G_{v,t})$、$C^L_{v,t}(P^L_{v,t})$ 分别为虚拟电厂 $v$ 在时段 $t$ 的发电费用、用电费用，其中发电费用是与虚拟电厂申报的各段出力区间和对应能量价格有关的多段线性函数，用电费用是与虚拟电厂申报的各段负荷区间和对应能量价格有关的多段线性函数；

$M$ 为网络潮流约束松弛罚因子；

$L^+_{s,t}$、$L^-_{s,t}$ 分别为线路、变压器及断面 $s$ 的正、反向潮流松弛变量；$NS$ 为线路、变压器及断面的集合。"""

SCED_GROUP_OUTPUT_EXPLANATION = "其中，$P^{\\max}_{J,t}$、$P^{\\min}_{J,t}$ 表示发电主体群 $J$ 在时段 $t$ 的最大、最小出力。"

SCED_RAMP_EXPLANATION = "其中，$\\Delta P^U_i$ 为发电主体 $i$ 最大上爬坡速率，$\\Delta P^D_i$ 为发电主体 $i$ 最大下爬坡速率。"

SCED_NETWORK_FLOW_EXPLANATION = "其中，$P^{\\min}_{s}$ 和 $P^{\\max}_{s}$ 为线路、变压器及断面 $s$ 的潮流传输最小和最大限额；$G_{i-s}$ 为发电主体 $i$ 所在节点对线路、变压器及断面 $s$ 的功率转移分布因子；$G_{j-s}$ 为联络线 $j$ 所在节点对线路、变压器及断面 $s$ 的功率转移分布因子；$NK$ 为系统的节点数量；$G_{k-s}$ 为节点 $k$ 对线路、变压器及断面 $s$ 的功率转移分布因子；$D_{k,t}$ 为节点 $k$ 在时段 $t$ 的母线负荷值；$L^+_{s,t}$、$L^-_{s,t}$ 分别为线路、变压器及断面 $s$ 的正、反向潮流松弛变量。"

SCED_STORAGE_EXPLANATION = "其中，$P^{ch}_{e,t}$ 和 $P^{dis}_{e,t}$ 分别表示独立储能 $e$ 在时段 $t$ 的充电功率和放电功率；$P^{ch,\\max}_{e}$、$P^{ch,\\min}_{e}$ 和 $P^{dis,\\max}_{e}$、$P^{dis,\\min}_{e}$ 分别表示独立储能 $e$ 充电功率和放电功率的最大值、最小值；$\\alpha^{ch}_{e,t}$ 和 $\\alpha^{dis}_{e,t}$ 分别表示独立储能 $e$ 在时段 $t$ 的充电状态和放电状态，两者均为 0-1 变量；$SOC_{e,t}$ 表示独立储能 $e$ 在时段 $t$ 的荷电状态，$SOC^{\\min}_{e,t}$ 和 $SOC^{\\max}_{e,t}$ 分别表示独立储能 $e$ 在时段 $t$ 的荷电状态上下限；$\\eta^{ch}_e$ 和 $\\eta^{dis}_e$ 分别表示独立储能 $e$ 的充电效率和放电效率；$\\Delta t$ 表示充放电时段长度。"

SCED_VPP_EXPLANATION = "其中，$P^L_{v,t}$ 和 $P^G_{v,t}$ 分别表示虚拟电厂 $v$ 在时段 $t$ 的用电负荷和发电出力；$P^{G,\\max}_{v,t}$、$P^{G,\\min}_{v,t}$ 和 $P^{L,\\max}_{v,t}$、$P^{L,\\min}_{v,t}$ 分别表示虚拟电厂 $v$ 在时段 $t$ 的用电负荷和发电出力的最大值、最小值；$\\alpha^L_{v,t}$ 和 $\\alpha^G_{v,t}$ 分别表示虚拟电厂 $v$ 在时段 $t$ 的用电状态和发电状态，两者均为 0-1 变量。"

SCED_STORAGE_CYCLE_EXPLANATION = "其中，$\\bar{SOC}_e$ 表示独立储能 $e$ 的额定电能量容量；$N_{\\mathrm{circle}}$ 表示独立储能每日充放电循环次数上限。"


def repair_markdown_sections(md_text: str) -> str:
    text = replace_section(
        md_text,
        "##### 5.2.2.5. 发电机组调试及试验计划",
        "##### 5.2.2.6. 新能源场站发电预测",
        GENERATOR_TEST_PLAN,
    )
    text = replace_section(
        text,
        "#### 5.8.2. 调试（试验）机组",
        "#### 5.8.3. 最小连续开机时间内机组",
        SPECIAL_TEST_UNIT_CLEARING,
    )
    return text


def repair_grid_security_constraint_paragraphing(md_text: str) -> str:
    """Split PDF-standalone numbered constraint titles from their body text."""
    replacements = {
        "（1）线路、变压器及断面极限功率为应对电网运行边界的不确定性，确保电网安全稳定运行和可靠供应，现货市场组织须将线路、变压器、断面传输功率限值留出一定的控制裕度。原则上，按照在功率限值基础上扣除3％-5％后的限值作为日前出清约束要求。":
            "（1）线路、变压器及断面极限功率\n\n为应对电网运行边界的不确定性，确保电网安全稳定运行和可靠供应，现货市场组织须将线路、变压器、断面传输功率限值留出一定的控制裕度。原则上，按照在功率限值基础上扣除3％-5％后的限值作为日前出清约束要求。",
        "（2）发电机组（群）必开约束出现以下情况时，电力调度机构可设置必开机组：":
            "（2）发电机组（群）必开约束\n\n出现以下情况时，电力调度机构可设置必开机组：",
        "（3）发电机组（群）必停约束出现以下情况时，电力调度机构可设置必停机组，必停机组视为不可用状态：":
            "（3）发电机组（群）必停约束\n\n出现以下情况时，电力调度机构可设置必停机组，必停机组视为不可用状态：",
        "（4）发电机组（群）出力上下限约束出现以下情况时，电力调度机构设置发电机组（群）出力上下限约束：":
            "（4）发电机组（群）出力上下限约束\n\n出现以下情况时，电力调度机构设置发电机组（群）出力上下限约束：",
    }
    text = md_text
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def repair_model_layout(md_text: str) -> str:
    replacements = {
        "日前电能量市场出清计算的机组组合SCUC 的目标函数如下所示：": "日前电能量市场出清计算的机组组合 SCUC 的目标函数如下所示：",
        "日前电能量市场出清SCUC 的约束条件包括：": "日前电能量市场出清 SCUC 的约束条件包括：",
        "日前电能量市场出清SCED 的目标函数如下所示：": "日前电能量市场出清 SCED 的目标函数如下所示：",
        "日前电能量市场出清SCED 的约束条件包括：": "日前电能量市场出清 SCED 的约束条件包括：",
        "其中：$N$ 表示机组的总台数；$T$ 表示所考虑的总时段数，其中D 日每15 分钟一个时段，共96 个时段，根据备用要求可额外增加D+1、D+2 日负荷高峰、低谷时段；$P_{i,t}$ 表示机组 $i$ 在时段 $t$ 的出力；$C_{i,t}(P_{i,t})$、$C^U_{i,t}$、$C^0_{i,t}$ 分别为机组 $i$ 在时段 $t$ 的运行费用、启动费用和空载费用；$C^G_{v,t}(P^G_{v,t})$、$C^L_{v,t}(P^L_{v,t})$ 分别为虚拟电厂 $v$ 在时段 $t$ 的发电费用、用电费用；$M$ 为网络潮流约束松弛罚因子；$L^+_{s,t}$、$L^-_{s,t}$ 分别为线路、变压器及断面 $s$ 的正、反向潮流松弛变量；$NS$ 为线路、变压器及断面的集合。": SCUC_OBJECTIVE_EXPLANATION,
        "其中：$N$ 表示机组的总台数；$T$ 表示所考虑的总时段数，每天考虑96 时段，则 $T$ 为96；$P_{i,t}$ 表示机组 $i$ 在时段 $t$ 的出力；$C_{i,t}(P_{i,t})$ 为机组 $i$ 在时段 $t$ 的运行费用；$C^G_{v,t}(P^G_{v,t})$、$C^L_{v,t}(P^L_{v,t})$ 分别为虚拟电厂 $v$ 在时段 $t$ 的发电费用、用电费用；$M$ 为网络潮流约束松弛罚因子；$L^+_{s,t}$、$L^-_{s,t}$ 分别为线路、变压器及断面 $s$ 的正、反向潮流松弛变量；$NS$ 为线路、变压器及断面的集合。": SCED_OBJECTIVE_EXPLANATION,
        "其中，$C_{i,m}$ 为机组 $i$ 申报的第 $m$ 个出力区间对应的能量价格。": "其中，$NM$ 为机组报价总段数，$C_{i,m}$ 为机组 $i$ 申报的第 $m$ 个出力区间对应的能量价格。",
        "C^U_{i,t}=C^U_i h_{i,t}": "C^U_{i,t}=\\eta_{i,t}C^U_i",
        "C^U_{i,t}=h_{i,t}C^U_i": "C^U_{i,t}=\\eta_{i,t}C^U_i",
        "其中，$C^U_i$ 为机组 $i$ 申报的单次启动费用，$h_{i,t}$ 表征机组 $i$ 在时段 $t$ 是否切换到启动状态。": "其中，$C^U_i$ 为机组 $i$ 申报的单次启动费用，$\\eta_{i,t}$ 表征机组 $i$ 在时段 $t$ 是否切换到启动状态。",
        "C^0_{i,t}=C^0_i a_{i,t}": "C^0_{i,t}=a_{i,t}C^0_i",
        "其中，$C^0_i$ 为机组 $i$ 申报的空载费用，$a_{i,t}$ 表示可控发电主体 $i$ 在时段 $t$ 的运行状态，取值为0 时表示停运，取值为1 时表示在运。虚拟电厂出力/负荷及发电/用电费用的表达式与机组出力及运行费用的定义形式一致。": "其中，$C^0_i$ 为机组 $i$ 申报的空载费用，$a_{i,t}$ 表示可控发电主体 $i$ 在时段 $t$ 的运行状态，取值为 0 时表示停运，取值为 1 时表示在运。\n\n虚拟电厂出力/负荷及发电/用电费用的表达式与机组出力及运行费用的定义形式一致。",
        LOAD_BALANCE_WRONG_FORMULA: LOAD_BALANCE_PDF_FORMULA,
        LOAD_BALANCE_WRONG_EXPLANATION: LOAD_BALANCE_PDF_EXPLANATION,
        r"\sum_kD_{k,t}": r"\sum D_{k,t}",
        r"\sum_k D_{k,t}": r"\sum D_{k,t}",
        START_STOP_SWITCH_SPLIT_BLOCK: START_STOP_SWITCH_PDF_BLOCK,
        START_STOP_LIMIT_SPLIT_BLOCK: START_STOP_LIMIT_PDF_BLOCK,
        "（1）系统负荷平衡约束。对于每个时段 $t$，负荷平衡约束可以描述为：": "（1）系统负荷平衡约束\n\n对于每个时段 $t$，负荷平衡约束可以描述为：",
        "（2）系统正备用容量约束。需要保证每天的总开机容量满足系统的最小备用容量。系统正备用容量约束可以描述为：": "（2）系统正备用容量约束\n\n在确保系统功率平衡的前提下，为了防止系统负荷预测偏差、新能源发电功率预测偏差以及各种实际运行事故带来的系统供需不平衡波动，一般整个系统需要留有一定的备用容量。\n\n需要保证每天的总开机容量满足系统的最小备用容量。系统正备用容量约束可以描述为：",
        "（3）系统负备用容量约束。系统负备用容量约束可以描述为：": "（3）系统负备用容量约束\n\n系统负备用容量约束可以描述为：",
        "（4）发电出力上下限约束。发电主体的出力应该处于其最大/最小发电能力范围之内，其约束条件可以描述为：": "（4）发电出力上下限约束\n\n发电主体的出力应该处于其最大/最小发电能力范围之内，其约束条件可以描述为：",
        "（5）发电主体群出力上下限约束。发电主体群的出力应该处于其最大/最小出力范围之内，其约束条件可描述为：": "（5）发电主体群出力上下限约束\n\n发电主体群的出力应该处于其最大/最小出力范围之内，其约束条件可描述为：",
        "（6）发电主体爬坡约束。发电主体上爬坡或下爬坡时，均应满足爬坡速率要求。爬坡约束可描述为：": "（6）发电主体爬坡约束\n\n发电主体上爬坡或下爬坡时，均应满足爬坡速率要求。爬坡约束可描述为：",
        "（7）机组最小连续开停时间约束。由于火电机组的物理属性及实际运行需要，要求火电机组满足最小连续开机/停机时间。最小连续开停时间约束可以描述为：": "（7）机组最小连续开停时间约束\n\n由于火电机组的物理属性及实际运行需要，要求火电机组满足最小连续开机/停机时间。最小连续开停时间约束可以描述为：",
        "（8）机组最大启停次数约束。首先定义启动与停机的切换变量。$h_{i,t}$ 为机组 $i$ 在时段 $t$ 是否切换到启动状态；$g_{i,t}$ 表示机组 $i$ 在时段 $t$ 是否切换到停机状态：": "（8）机组最大启停次数约束\n\n首先定义启动与停机的切换变量。定义 $h_{i,t}$ 为机组 $i$ 在时段 $t$ 是否切换到启动状态；定义 $g_{i,t}$ 表示机组 $i$ 在时段 $t$ 是否切换到停机状态：",
        "（9）分区净启停机容量约束。因政府环保、保民生、促消纳等要求，区域内的机组净启停机容量应该处于指定最大/最小容量范围之内，其约束条件可以描述为：": "（9）分区净启停机容量约束\n\n因政府环保、保民生、促消纳等要求，区域内的机组净启停机容量应该处于指定最大/最小容量范围之内，其约束条件可以描述为：",
        "（10）网络潮流约束。网络潮流约束可以描述为：": "（10）网络潮流约束\n\n网络潮流约束可以描述为：",
        "（11）特殊机组状态约束。对于人工判断确定为必开机组的，其约束可描述为：": "（11）特殊机组状态约束\n\n对于人工判断确定为必开机组的，其约束可描述为：",
        "（12）同一火电厂单日最大开停机次数约束。同一火电厂 $N$ 台可优化开机的机组单日最大开机次数约束：": "（12）同一火电厂单日最大开停机次数约束\n\n同一火电厂 $N$ 台可优化开机的机组单日最大开机次数约束：",
        "（13）独立储能充放电功率及荷电状态约束。": "（13）独立储能充放电功率及荷电状态约束",
        "（14）一体化虚拟电厂发用电功率约束。": "（14）一体化虚拟电厂发用电功率约束",
        "（15）独立储能日充放电循环次数约束。": "（15）独立储能日充放电循环次数约束",
        "（6）实用化约束。机组固定出力约束，机组在特定时段内按照给定的发电计划运行，在此特定时段内该机组不参与经济调度计算，该约束可描述为：": "（6）实用化约束\n\n机组固定出力约束，机组在特定时段内按照给定的发电计划运行，在此特定时段内该机组不参与经济调度计算，该约束可描述为：",
    }
    text = md_text
    for old, new in replacements.items():
        text = text.replace(old, new)

    sced_output_marker = """P^{\\min}_{i,m}\\le P_{i,t,m}\\le P^{\\max}_{i,m}
$$

机组运行费用表达式："""
    if sced_output_marker in text:
        text = text.replace(
            sced_output_marker,
            """P^{\\min}_{i,m}\\le P_{i,t,m}\\le P^{\\max}_{i,m}
$$

其中，$NM$ 为机组报价总段数，$P_{i,t,m}$ 为机组 $i$ 在时段 $t$ 第 $m$ 个出力区间中的中标电力，$P^{\\max}_{i,m}$、$P^{\\min}_{i,m}$ 分别为机组 $i$ 申报的第 $m$ 个出力区间上、下界。

机组运行费用表达式：""",
            1,
        )

    sced_load_balance = """（1）系统负荷平衡约束。

$$
\\sum P_t+\\sum T_t=\\sum D_t
$$

（2）发电主体出力上下限约束。"""
    if sced_load_balance in text:
        text = text.replace(
            sced_load_balance,
            """（1）系统负荷平衡约束

对于每个时段 $t$，负荷平衡约束可以描述为：

$$
\\sum P_t+\\sum T_t=\\sum D_t
$$

其中，$\\sum P_t$ 表示时段 $t$ 的系统发电出力总和，$\\sum T_t$ 表示时段 $t$ 的联络线计划功率总和（受入为正、送出为负），$\\sum D_t$ 为时段 $t$ 的系统负荷总和。

（2）发电主体出力上下限约束

发电主体的出力应该处于其最大/最小发电能力范围之内，其约束条件可以描述为：""",
            1,
        )

    sced_cost_marker = """C_{i,t}(P_{i,t})=\\sum_{m=1}^{NM}C_{i,m}P_{i,t,m}
$$

虚拟电厂出力/负荷及发电/用电费用的表达式与机组出力及运行费用的定义形式一致。"""
    sced_section_start = text.find("#### 5.7.2. 日前安全约束经济调度（SCED）模型")
    if sced_section_start >= 0:
        marker_pos = text.find(sced_cost_marker, sced_section_start)
        if marker_pos >= 0:
            text = text.replace(
                sced_cost_marker,
                """C_{i,t}(P_{i,t})=\\sum_{m=1}^{NM}C_{i,m}P_{i,t,m}
$$

其中，$NM$ 为机组报价总段数，$C_{i,m}$ 为机组 $i$ 申报的第 $m$ 个出力区间对应的能量价格。

虚拟电厂出力/负荷及发电/用电费用的表达式与机组出力及运行费用的定义形式一致。""",
                1,
            )

    sced_constraint_replacements = {
        "（2）发电主体出力上下限约束。\n\n$$\nP^{\\min}_{i,t}\\le P_{i,t}\\le P^{\\max}_{i,t}\n$$": "（2）发电主体出力上下限约束\n\n发电主体的出力应该处于其最大/最小发电能力范围之内，其约束条件可以描述为：\n\n$$\nP^{\\min}_{i,t}\\le P_{i,t}\\le P^{\\max}_{i,t}\n$$",
        "（3）发电主体群出力上下限约束。\n\n$$": "（3）发电主体群出力上下限约束\n\n发电主体群的出力应该处于其最大/最小出力范围之内，其约束条件可描述为：\n\n$$",
        "（4）发电主体爬坡约束。\n\n$$": "（4）发电主体爬坡约束\n\n发电主体上爬坡或下爬坡时，均应满足爬坡速率要求。爬坡约束可描述为：\n\n$$",
        "（5）网络潮流约束。\n\n$$": "（5）网络潮流约束\n\n网络潮流约束可以描述为：\n\n$$",
        "（7）独立储能充放电功率及荷电状态约束。": "（7）独立储能充放电功率及荷电状态约束",
        "（8）一体化虚拟电厂发用电功率约束。": "（8）一体化虚拟电厂发用电功率约束",
        "（9）独立储能日充放电循环次数约束。": "（9）独立储能日充放电循环次数约束",
    }
    for old, new in sced_constraint_replacements.items():
        text = text.replace(old, new)
    return text


def repair_sced_constraint_explanations(md_text: str) -> str:
    """Restore SCED formula explanation paragraphs that were dropped between adjacent constraints."""
    replacements = {
        """$$
P^{\\min}_{J,t}\\le \\sum_{i\\in J}P_{i,t}\\le P^{\\max}_{J,t}
$$

（4）发电主体爬坡约束""": """$$
P^{\\min}_{J,t}\\le \\sum_{i\\in J}P_{i,t}\\le P^{\\max}_{J,t}
$$

""" + SCED_GROUP_OUTPUT_EXPLANATION + """

（4）发电主体爬坡约束""",
        """$$
P_{i,t-1}-P_{i,t}\\le \\Delta P^D_i
$$

（5）网络潮流约束""": """$$
P_{i,t-1}-P_{i,t}\\le \\Delta P^D_i
$$

""" + SCED_RAMP_EXPLANATION + """

（5）网络潮流约束""",
        """$$
P^{\\min}_{s}\\le \\sum_{i=1}^{N}G_{i-s}P_{i,t}+\\sum_{j=1}^{NT}G_{j-s}T_{j,t}-\\sum_{k=1}^{NK}G_{k-s}D_{k,t}-L^+_{s,t}+L^-_{s,t}\\le P^{\\max}_{s}
$$

（6）实用化约束""": """$$
P^{\\min}_{s}\\le \\sum_{i=1}^{N}G_{i-s}P_{i,t}+\\sum_{j=1}^{NT}G_{j-s}T_{j,t}-\\sum_{k=1}^{NK}G_{k-s}D_{k,t}-L^+_{s,t}+L^-_{s,t}\\le P^{\\max}_{s}
$$

""" + SCED_NETWORK_FLOW_EXPLANATION + """

（6）实用化约束""",
        """$$
SOC^{\\min}_{e,t}\\le SOC_{e,t}\\le SOC^{\\max}_{e,t}
$$

（8）一体化虚拟电厂发用电功率约束""": """$$
SOC^{\\min}_{e,t}\\le SOC_{e,t}\\le SOC^{\\max}_{e,t}
$$

""" + SCED_STORAGE_EXPLANATION + """

（8）一体化虚拟电厂发用电功率约束""",
        """$$
\\alpha^L_{v,t}+\\alpha^G_{v,t}=1,\\quad \\alpha^L_{v,t},\\alpha^G_{v,t}\\in\\{0,1\\}
$$

（9）独立储能日充放电循环次数约束""": """$$
\\alpha^L_{v,t}+\\alpha^G_{v,t}=1,\\quad \\alpha^L_{v,t},\\alpha^G_{v,t}\\in\\{0,1\\}
$$

""" + SCED_VPP_EXPLANATION + """

（9）独立储能日充放电循环次数约束""",
        """$$
\\frac{\\sum_{t=1}^{T}\\left(P^{dis}_{e,t}/\\eta^{dis}_e-\\eta^{ch}_eP^{ch}_{e,t}\\right)\\Delta t}{2\\bar{SOC}_e}\\le N_{\\mathrm{circle}}
$$

### 5.8. 特殊机组在日前电能量市场中的出清机制""": """$$
\\frac{\\sum_{t=1}^{T}\\left(P^{dis}_{e,t}/\\eta^{dis}_e-\\eta^{ch}_eP^{ch}_{e,t}\\right)\\Delta t}{2\\bar{SOC}_e}\\le N_{\\mathrm{circle}}
$$

""" + SCED_STORAGE_CYCLE_EXPLANATION + """

### 5.8. 特殊机组在日前电能量市场中的出清机制""",
    }
    text = md_text
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def repair_model_formula_semantics(md_text: str) -> str:
    """Restore PDF-visible SCUC/SCED symbols and formula semantics after OCR drift."""
    replacements = {
        "C^0_{i,t}=C^0_i a_{i,t}": r"C^0_{i,t}=\alpha_{i,t}C^0_i",
        "C^0_{i,t}=a_{i,t}C^0_i": r"C^0_{i,t}=\alpha_{i,t}C^0_i",
        "其中，$C^0_i$ 为机组 $i$ 申报的空载费用，$a_{i,t}$ 表示可控发电主体 $i$ 在时段 $t$ 的运行状态，取值为 0 时表示停运，取值为 1 时表示在运。": "其中，$C^0_i$ 为机组 $i$ 申报的空载费用，$\\alpha_{i,t}$ 表示可控发电主体 $i$ 在时段 $t$ 的运行状态，取值为 0 时表示停运，取值为 1 时表示在运。",
        "其中，$C^0_i$ 为机组 $i$ 申报的空载费用，$a_{i,t}$ 表示可控发电主体 $i$ 在时段 $t$ 的运行状态，取值为0 时表示停运，取值为1 时表示在运。": "其中，$C^0_i$ 为机组 $i$ 申报的空载费用，$\\alpha_{i,t}$ 表示可控发电主体 $i$ 在时段 $t$ 的运行状态，取值为 0 时表示停运，取值为 1 时表示在运。",
        r"\sum_{i=1}^{N}a_{i,t}P^{\max}_{i,t}\ge \sum D_{k,t}-\sum_{j=1}^{NT}T_{j,t}+R^U_t+\left(1-\mu^w_t\right)\sum_{k=1}^{N^W}P^w_{k,t}+\left(1-\mu^s_t\right)\sum_{m=1}^{N^S}P^s_{m,t}": r"\sum_{i=1}^{N}\alpha_{i,t}P^{\max}_{i,t}\ge \sum D_t-\sum_{j=1}^{NT}T_{j,t}+R^U_t+\left(1-\mu^w_t\right)\sum_{k=1}^{N^W}P^w_{k,t}+\left(1-\mu^s_t\right)\sum_{m=1}^{N^S}P^s_{m,t}",
        r"\sum_{i=1}^{N}a_{i,t}P^{\max}_{i,t}\ge \sum D_t-\sum_{j=1}^{NT}T_{j,t}+R^U_t+\left(1-\mu^w_t\right)\sum_{k=1}^{N^W}P^w_{k,t}+\left(1-\mu^s_t\right)\sum_{m=1}^{N^S}P^s_{m,t}": r"\sum_{i=1}^{N}\alpha_{i,t}P^{\max}_{i,t}\ge \sum D_t-\sum_{j=1}^{NT}T_{j,t}+R^U_t+\left(1-\mu^w_t\right)\sum_{k=1}^{N^W}P^w_{k,t}+\left(1-\mu^s_t\right)\sum_{m=1}^{N^S}P^s_{m,t}",
        r"\sum_{i=1}^{N}a_{i,t}P^{\min}_{i,t}\le \sum D_{k,t}-\sum_{j=1}^{NT}T_{j,t}-R^D_t": r"\sum_{i=1}^{N}\alpha_{i,t}P^{\min}_{i,t}\le \sum D_t-\sum_{j=1}^{NT}T_{j,t}-R^D_t",
        r"\sum_{i=1}^{N}a_{i,t}P^{\min}_{i,t}\le \sum D_t-\sum_{j=1}^{NT}T_{j,t}-R^D_t": r"\sum_{i=1}^{N}\alpha_{i,t}P^{\min}_{i,t}\le \sum D_t-\sum_{j=1}^{NT}T_{j,t}-R^D_t",
        r"a_{i,t}P^{\min}_{i,t}\le P_{i,t}\le a_{i,t}P^{\max}_{i,t}": r"\alpha_{i,t}P^{\min}_{i,t}\le P_{i,t}\le \alpha_{i,t}P^{\max}_{i,t}",
        r"P_{i,t}-P_{i,t-1}\le \Delta P^U_i a_{i,t-1}+P^{\min}_{i,t}(a_{i,t}-a_{i,t-1})+P^{\max}_{i,t}(1-a_{i,t})": r"P_{i,t}-P_{i,t-1}\le \Delta P^U_i \alpha_{i,t-1}+P^{\min}_{i,t}(\alpha_{i,t}-\alpha_{i,t-1})+P^{\max}_{i,t}(1-\alpha_{i,t})",
        r"P_{i,t-1}-P_{i,t}\le \Delta P^D_i a_{i,t}-P^{\min}_{i,t}(a_{i,t}-a_{i,t-1})+P^{\max}_{i,t}(1-a_{i,t-1})": r"P_{i,t-1}-P_{i,t}\le \Delta P^D_i \alpha_{i,t}-P^{\min}_{i,t}(\alpha_{i,t}-\alpha_{i,t-1})+P^{\max}_{i,t}(1-\alpha_{i,t-1})",
        r"T^D_{i,t}-(a_{i,t-1}-a_{i,t})T_D\ge0": r"T^D_{i,t}-(\alpha_{i,t}-\alpha_{i,t-1})T_D\ge0",
        r"T^U_{i,t}-(a_{i,t}-a_{i,t-1})T_U\ge0": r"T^U_{i,t}-(\alpha_{i,t-1}-\alpha_{i,t})T_U\ge0",
        "其中，$a_{i,t}$ 为机组 $i$ 在时段 $t$ 的启停状态；": "其中，$\\alpha_{i,t}$ 为机组 $i$ 在时段 $t$ 的启停状态；",
        r"T^U_{i,t}=\sum_{k=t-T_U}^{t-1}a_{i,k}": r"T^U_{i,t}=\sum_{k=t-T_U}^{t-1}\alpha_{i,k}",
        r"T^D_{i,t}=\sum_{k=t-T_D}^{t-1}(1-a_{i,k})": r"T^D_{i,t}=\sum_{k=t-T_D}^{t-1}(1-\alpha_{i,k})",
        "首先定义启动与停机的切换变量。定义 $h_{i,t}$ 为机组 $i$ 在时段 $t$ 是否切换到启动状态；定义 $g_{i,t}$ 表示机组 $i$ 在时段 $t$ 是否切换到停机状态：": "首先定义启动与停机的切换变量。定义 $\\eta_{i,t}$ 为机组 $i$ 在时段 $t$ 是否切换到启动状态；定义 $\\gamma_{i,t}$ 表示机组 $i$ 在时段 $t$ 是否切换到停机状态，$\\eta_{i,t}$、$\\gamma_{i,t}$ 满足如下条件：",
        "首先定义启动与停机的切换变量。$h_{i,t}$ 为机组 $i$ 在时段 $t$ 是否切换到启动状态；$g_{i,t}$ 表示机组 $i$ 在时段 $t$ 是否切换到停机状态：": "首先定义启动与停机的切换变量。定义 $\\eta_{i,t}$ 为机组 $i$ 在时段 $t$ 是否切换到启动状态；定义 $\\gamma_{i,t}$ 表示机组 $i$ 在时段 $t$ 是否切换到停机状态，$\\eta_{i,t}$、$\\gamma_{i,t}$ 满足如下条件：",
        START_STOP_SWITCH_PDF_BLOCK: f"$$\n{ETA_SWITCH_CASE_LATEX}\n$$\n\n$$\n{GAMMA_SWITCH_CASE_LATEX}\n$$",
        START_STOP_SWITCH_SPLIT_BLOCK: f"$$\n{ETA_SWITCH_CASE_LATEX}\n$$\n\n$$\n{GAMMA_SWITCH_CASE_LATEX}\n$$",
        START_STOP_LIMIT_PDF_BLOCK: r"""$$
\sum_i\sum_{t=1}^{T}\eta_{i,t}\le \eta^{\max}
$$

$$
\sum_i\sum_{t=1}^{T}\gamma_{i,t}\le \gamma^{\max}
$$""",
        START_STOP_LIMIT_SPLIT_BLOCK: r"""$$
\sum_i\sum_{t=1}^{T}\eta_{i,t}\le \eta^{\max}
$$

$$
\sum_i\sum_{t=1}^{T}\gamma_{i,t}\le \gamma^{\max}
$$""",
        r"P^{\min}_{\mathrm{area}}\le \sum_{i=1}^{N_{\mathrm{area}}}\sum_{t=1}^{T}(h_{i,t}-g_{i,t})P_i \le P^{\max}_{\mathrm{area}}": r"P^{\min}_{\mathrm{area}}\le \sum_{i=1}^{N_{\mathrm{area}}}\sum_{t=1}^{T}(\eta_{i,t}\bar P_i-\gamma_{i,t}\bar P_i) \le P^{\max}_{\mathrm{area}}",
        "其中，$P^{\\min}_{\\mathrm{area}}$ 和 $P^{\\max}_{\\mathrm{area}}$ 为该区域内机组净启停机容量的最小和最大限额；$N_{\\mathrm{area}}$ 为该区域内的机组集合；$P_i$ 为机组 $i$ 的额定容量。": "其中，$P^{\\min}_{\\mathrm{area}}$ 和 $P^{\\max}_{\\mathrm{area}}$ 为该区域内机组净启停机容量的最小和最大限额；$N_{\\mathrm{area}}$ 为该区域内的机组集合；$\\bar P_i$ 为机组 $i$ 的额定容量。",
        r"a_{i,t}=1,\quad \forall i\in I_{s1}": r"\alpha_{i,t}=1,\quad \forall i\in I_{s1}",
        r"a_{i,t}=0,\quad \forall i\in I_{s2}": r"\alpha_{i,t}=0,\quad \forall i\in I_{s2}",
        r"\sum_{i=1}^{N}\sum_{t=1}^{T}h_{i,t}\le U^{su}": r"\sum_{i=1}^{N}\sum_{t=1}^{T}\eta_{i,t}\le U^{su}",
        r"\sum_{i=1}^{N}\sum_{t=1}^{T}g_{i,t}\le U^{st}": r"\sum_{i=1}^{N}\sum_{t=1}^{T}\gamma_{i,t}\le U^{st}",
        r"0\le a^{ch}_{e,t}P^{ch,\min}_{e}\le P^{ch}_{e,t}\le a^{ch}_{e,t}P^{ch,\max}_{e}": r"\alpha^{ch}_{e,t}P^{ch,\min}_{e}\le P^{ch}_{e,t}\le \alpha^{ch}_{e,t}P^{ch,\max}_{e}\le0",
        r"0\le a^{dis}_{e,t}P^{dis,\min}_{e}\le P^{dis}_{e,t}\le a^{dis}_{e,t}P^{dis,\max}_{e}": r"0\le \alpha^{dis}_{e,t}P^{dis,\min}_{e}\le P^{dis}_{e,t}\le \alpha^{dis}_{e,t}P^{dis,\max}_{e}",
        r"a^{ch}_{e,t}+a^{dis}_{e,t}\le1,\quad a^{ch}_{e,t},a^{dis}_{e,t}\in\{0,1\}": r"\alpha^{ch}_{e,t}+\alpha^{dis}_{e,t}=1,\quad \alpha^{ch}_{e,t},\alpha^{dis}_{e,t}\in\{0,1\}",
        r"SOC_{e,t}=SOC_{e,t-1}+\eta^{ch}_{e}P^{ch}_{e,t}\Delta t-\frac{P^{dis}_{e,t}\Delta t}{\eta^{dis}_{e}}": r"SOC_{e,t}=SOC_{e,t-1}-\eta^{ch}_{e}P^{ch}_{e,t}\Delta t-\frac{P^{dis}_{e,t}\Delta t}{\eta^{dis}_{e}}",
        "$a^{ch}_{e,t}$ 和 $a^{dis}_{e,t}$": "$\\alpha^{ch}_{e,t}$ 和 $\\alpha^{dis}_{e,t}$",
        r"0\le a^L_{v,t}P^{L,\min}_{v,t}\le P^L_{v,t}\le a^L_{v,t}P^{L,\max}_{v,t}": r"\alpha^L_{v,t}P^{L,\min}_{v,t}\le P^L_{v,t}\le \alpha^L_{v,t}P^{L,\max}_{v,t}\le0",
        r"0\le a^G_{v,t}P^{G,\min}_{v,t}\le P^G_{v,t}\le a^G_{v,t}P^{G,\max}_{v,t}": r"0\le \alpha^G_{v,t}P^{G,\min}_{v,t}\le P^G_{v,t}\le \alpha^G_{v,t}P^{G,\max}_{v,t}",
        r"a^L_{v,t}+a^G_{v,t}\le1,\quad a^L_{v,t},a^G_{v,t}\in\{0,1\}": r"\alpha^L_{v,t}+\alpha^G_{v,t}=1,\quad \alpha^L_{v,t},\alpha^G_{v,t}\in\{0,1\}",
        "$a^L_{v,t}$ 和 $a^G_{v,t}$": "$\\alpha^L_{v,t}$ 和 $\\alpha^G_{v,t}$",
        r"\frac{\sum_{t=1}^{T}\left(P^{dis}_{e,t}/\eta^{dis}_e-P^{ch}_{e,t}\eta^{ch}_e\right)\Delta t}{2SOC_e}\le N^{circle}": r"\frac{\sum_{t=1}^{T}\left(P^{dis}_{e,t}/\eta^{dis}_e-\eta^{ch}_eP^{ch}_{e,t}\right)\Delta t}{2\bar{SOC}_e}\le N_{\mathrm{circle}}",
        "$SOC_e$ 表示独立储能 $e$ 的额定电能量容量；$N^{circle}$ 表示独立储能每日充放电循环次数上限。": "$\\bar{SOC}_e$ 表示独立储能 $e$ 的额定电能量容量；$N_{\\mathrm{circle}}$ 表示独立储能每日充放电循环次数上限。",
    }
    text = md_text
    for old, new in replacements.items():
        text = text.replace(old, new)
    while r"\alph\alpha" in text:
        text = text.replace(r"\alph\alpha", r"\alpha")
    return text


def repair_non_model_formula_semantics(md_text: str) -> str:
    """Restore PDF-visible formulas outside the SCUC/SCED model sections."""
    replacements = {
        r"LMP_{\mathrm{日前},t}=\frac{\sum_m Q_{\mathrm{日前},m,t}\times LMP_{\mathrm{日前},m,t}}{\sum_m Q_{\mathrm{日前},m,t}}": r"LMP_{t,\mathrm{日前}}=\frac{\sum_m\left(Q_{m,t,\mathrm{日前}}\times LMP_{m,t,\mathrm{日前}}\right)}{\sum_m Q_{m,t,\mathrm{日前}}}",
        r"其中，$LMP_{\mathrm{日前},t}$ 为时段 $t$ 的用户侧统一加权电价；$Q_{\mathrm{日前},m,t}$ 为时段 $t$ 机组 $m$ 的日前出清上网电量；$LMP_{\mathrm{日前},m,t}$ 为时段 $t$ 机组 $m$ 所在节点的日前电价。": r"其中，$LMP_{t,\mathrm{日前}}$ 为时段 $t$ 的用户侧统一加权电价；$Q_{m,t,\mathrm{日前}}$ 为时段 $t$ 机组 $m$ 的日前出清上网电量；$LMP_{m,t,\mathrm{日前}}$ 为时段 $t$ 机组 $m$ 所在节点的日前电价。",
        r"LMP_{\mathrm{实时},t}=\frac{\sum_m Q_{\mathrm{实时},m,t}\times LMP_{\mathrm{实时},m,t}}{\sum_m Q_{\mathrm{实时},m,t}}": r"LMP_{t,\mathrm{实时}}=\frac{\sum_m\left(Q_{m,t,\mathrm{实时}}\times LMP_{m,t,\mathrm{实时}}\right)}{\sum_m Q_{m,t,\mathrm{实时}}}",
        r"其中，$LMP_{\mathrm{实时},t}$ 为时段 $t$ 的用户侧统一加权电价；$Q_{\mathrm{实时},m,t}$ 为时段 $t$ 机组 $m$ 的实时出清上网电量；$LMP_{\mathrm{实时},m,t}$ 为时段 $t$ 机组 $m$ 所在节点的实时电价。": r"其中，$LMP_{t,\mathrm{实时}}$ 为时段 $t$ 的用户侧统一加权电价；$Q_{m,t,\mathrm{实时}}$ 为时段 $t$ 机组 $m$ 的实时出清上网电量；$LMP_{m,t,\mathrm{实时}}$ 为时段 $t$ 机组 $m$ 所在节点的实时电价。",
        r"P^{\max}_{i,\mathrm{日前}}=P^{\max}_{i,\mathrm{预出}}-P_{i,\mathrm{日前预出清中标容量}}": r"P_{i,\mathrm{日前}}^{\max}=P_i^{\max}-P_{i,\mathrm{预出清中标容量}}",
        r"P^{\min}_{i,\mathrm{日前}}=P^{\min}_{i,\mathrm{预出}}+P_{i,\mathrm{日前预出清中标容量}}": r"P_{i,\mathrm{日前}}^{\min}=P_i^{\min}+P_{i,\mathrm{预出清中标容量}}",
        r"P^{\max}_{i,\mathrm{实时}}=P^{\max}_{i,\mathrm{出清}}-P_{i,\mathrm{实时出清中标容量}}": r"P_{i,\mathrm{实时}}^{\max}=P_i^{\max}-P_{i,\mathrm{出清中标容量}}",
        r"P^{\min}_{i,\mathrm{实时}}=P^{\min}_{i,\mathrm{出清}}+P_{i,\mathrm{实时出清中标容量}}": r"P_{i,\mathrm{实时}}^{\min}=P_i^{\min}+P_{i,\mathrm{出清中标容量}}",
        r"P_{\mathrm{参考报价}}=\mathrm{电煤价格}\times\mathrm{煤耗参数}\times P": r"\mathrm{参考报价}=\mathrm{电煤价格}/1000\times302.4\times7000/5000\times P",
        r"V_i=(P_{0\%},P_{N\%},P_{2N\%},\ldots,P_{100\%})": QUOTE_VECTOR_LATEX,
        r"H_{i,j}=1-\frac{\sqrt{\sum_k(P_{i,k}-P_{j,k})^2}}{P_{\mathrm{现货价格申报上限}}}": QUOTE_SIMILARITY_LATEX,
        r"W_{i,j}=1-\frac{\sum_{k\in\{0\%,N\%,\ldots,100\%\}}\sqrt{(P^i_k-P^j_k)^2}}{1+100/N}\times\frac{1}{\mathrm{现货价格申报上限}}": QUOTE_SIMILARITY_LATEX,
        r"其中，$P_{i,k}$ 和 $P_{j,k}$ 为机组 $i$、$j$ 在容量分位 $k$ 对应的申报价格。": r"其中，$P^i_k$ 和 $P^j_k$ 为机组 $i$、$j$ 在容量分位 $k$ 对应的申报价格。",
    }
    text = md_text
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def collapse_horizontal_display_formulas(md_text: str) -> str:
    """Keep PDF-horizontal formulas as one source line so HTML renders one row."""
    replacements = {
        r"""\sum_{i=1}^{N}a_{i,t}P^{\max}_{i,t}
\ge
\sum D_{k,t}-\sum_{j=1}^{NT}T_{j,t}+R^U_t
+\sum_{k=1}^{N^W}(1-\mu^w_t)P^w_{k,t}
+\sum_{m=1}^{N^S}(1-\mu^s_t)P^s_{m,t}""": r"""\sum_{i=1}^{N}a_{i,t}P^{\max}_{i,t}\ge \sum D_{k,t}-\sum_{j=1}^{NT}T_{j,t}+R^U_t+\left(1-\mu^w_t\right)\sum_{k=1}^{N^W}P^w_{k,t}+\left(1-\mu^s_t\right)\sum_{m=1}^{N^S}P^s_{m,t}""",
        r"""\sum_{i=1}^{N}a_{i,t}P^{\max}_{i,t}
\ge
\sum_kD_{k,t}-\sum_{j=1}^{NT}T_{j,t}+R^U_t
+\sum_{k=1}^{N^W}(1-\mu^w_t)P^w_{k,t}
+\sum_{m=1}^{N^S}(1-\mu^s_t)P^s_{m,t}""": r"""\sum_{i=1}^{N}a_{i,t}P^{\max}_{i,t}\ge \sum D_{k,t}-\sum_{j=1}^{NT}T_{j,t}+R^U_t+\left(1-\mu^w_t\right)\sum_{k=1}^{N^W}P^w_{k,t}+\left(1-\mu^s_t\right)\sum_{m=1}^{N^S}P^s_{m,t}""",
        r"""\sum_{i=1}^{N}\alpha_{i,t}P^{\max}_{i,t}
\ge
\sum D_t-\sum_{j=1}^{NT}T_{j,t}+R^U_t
+\sum_{k=1}^{N^W}(1-\mu^w_t)P^w_{k,t}
+\sum_{m=1}^{N^S}(1-\mu^s_t)P^s_{m,t}""": r"""\sum_{i=1}^{N}\alpha_{i,t}P^{\max}_{i,t}\ge \sum D_t-\sum_{j=1}^{NT}T_{j,t}+R^U_t+\left(1-\mu^w_t\right)\sum_{k=1}^{N^W}P^w_{k,t}+\left(1-\mu^s_t\right)\sum_{m=1}^{N^S}P^s_{m,t}""",
        r"""P_{i,t}-P_{i,t-1}\le
\Delta P^U_i a_{i,t-1}+P^{\min}_{i,t}(a_{i,t}-a_{i,t-1})+P^{\max}_{i,t}(1-a_{i,t})""": r"""P_{i,t}-P_{i,t-1}\le \Delta P^U_i a_{i,t-1}+P^{\min}_{i,t}(a_{i,t}-a_{i,t-1})+P^{\max}_{i,t}(1-a_{i,t})""",
        r"""P_{i,t}-P_{i,t-1}\le
\Delta P^U_i \alpha_{i,t-1}+P^{\min}_{i,t}(\alpha_{i,t}-\alpha_{i,t-1})+P^{\max}_{i,t}(1-\alpha_{i,t})""": r"""P_{i,t}-P_{i,t-1}\le \Delta P^U_i \alpha_{i,t-1}+P^{\min}_{i,t}(\alpha_{i,t}-\alpha_{i,t-1})+P^{\max}_{i,t}(1-\alpha_{i,t})""",
        r"""P_{i,t-1}-P_{i,t}\le
\Delta P^D_i a_{i,t}-P^{\min}_{i,t}(a_{i,t}-a_{i,t-1})+P^{\max}_{i,t}(1-a_{i,t-1})""": r"""P_{i,t-1}-P_{i,t}\le \Delta P^D_i a_{i,t}-P^{\min}_{i,t}(a_{i,t}-a_{i,t-1})+P^{\max}_{i,t}(1-a_{i,t-1})""",
        r"""P_{i,t-1}-P_{i,t}\le
\Delta P^D_i \alpha_{i,t}-P^{\min}_{i,t}(\alpha_{i,t}-\alpha_{i,t-1})+P^{\max}_{i,t}(1-\alpha_{i,t-1})""": r"""P_{i,t-1}-P_{i,t}\le \Delta P^D_i \alpha_{i,t}-P^{\min}_{i,t}(\alpha_{i,t}-\alpha_{i,t-1})+P^{\max}_{i,t}(1-\alpha_{i,t-1})""",
        r"""P^{\min}_{\mathrm{area}}\le
\sum_{i=1}^{N_{\mathrm{area}}}\sum_{t=1}^{T}(h_{i,t}-g_{i,t})P_i
\le P^{\max}_{\mathrm{area}}""": r"""P^{\min}_{\mathrm{area}}\le \sum_{i=1}^{N_{\mathrm{area}}}\sum_{t=1}^{T}(h_{i,t}-g_{i,t})P_i \le P^{\max}_{\mathrm{area}}""",
        r"""P^{\min}_{\mathrm{area}}\le
\sum_{i=1}^{N_{\mathrm{area}}}\sum_{t=1}^{T}(\eta_{i,t}\bar P_i-\gamma_{i,t}\bar P_i)
\le P^{\max}_{\mathrm{area}}""": r"""P^{\min}_{\mathrm{area}}\le \sum_{i=1}^{N_{\mathrm{area}}}\sum_{t=1}^{T}(\eta_{i,t}\bar P_i-\gamma_{i,t}\bar P_i) \le P^{\max}_{\mathrm{area}}""",
        r"""P^{\min}_{s}\le
\sum_{i=1}^{N}G_{i-s}P_{i,t}
+\sum_{j=1}^{NT}G_{j-s}T_{j,t}
-\sum_{k=1}^{NK}G_{k-s}D_{k,t}
-L^+_{s,t}+L^-_{s,t}
\le P^{\max}_{s}""": r"""P^{\min}_{s}\le \sum_{i=1}^{N}G_{i-s}P_{i,t}+\sum_{j=1}^{NT}G_{j-s}T_{j,t}-\sum_{k=1}^{NK}G_{k-s}D_{k,t}-L^+_{s,t}+L^-_{s,t}\le P^{\max}_{s}""",
        r"""\min\left\{
\sum_{i=1}^{N}\sum_{t=1}^{T}C_{i,t}(P_{i,t})
+\sum_{v=1}^{V}\sum_{t=1}^{T}\left[C^G_{v,t}(P^G_{v,t})+C^L_{v,t}(P^L_{v,t})\right]
+\sum_{s=1}^{NS}\sum_{t=1}^{T}M\left(L^+_{s,t}+L^-_{s,t}\right)
\right\}""": r"""\min\left\{\sum_{i=1}^{N}\sum_{t=1}^{T}C_{i,t}(P_{i,t})+\sum_{v=1}^{V}\sum_{t=1}^{T}\left[C^G_{v,t}(P^G_{v,t})+C^L_{v,t}(P^L_{v,t})\right]+\sum_{s=1}^{NS}\sum_{t=1}^{T}M\left(L^+_{s,t}+L^-_{s,t}\right)\right\}""",
    }
    text = md_text
    for old_body, new_body in replacements.items():
        text = text.replace(f"$$\n{old_body}\n$$", f"$$\n{new_body}\n$$")
    return text


def repair_objective_formula_layouts(md_text: str) -> str:
    """Restore PDF-style SCUC/SCED objective formula source for custom HTML rendering."""
    scuc_pdf_body = r"""\min\left\{
\sum_{i=1}^{N}\sum_{t=1}^{T}\left[C_{i,t}(P_{i,t})+C^U_{i,t}+C^0_{i,t}\right]+\sum_{v=1}^{V}\sum_{t=1}^{T}\left[C^G_{v,t}(P^G_{v,t})+C^L_{v,t}(P^L_{v,t})\right]
+\sum_{s=1}^{NS}\sum_{t=1}^{T}M\left[L^+_{s,t}+L^-_{s,t}\right]
\right\}"""
    sced_pdf_body = r"""\min\left\{\sum_{i=1}^{N}\sum_{t=1}^{T}C_{i,t}(P_{i,t})+\sum_{v=1}^{V}\sum_{t=1}^{T}\left[C^G_{v,t}(P^G_{v,t})+C^L_{v,t}(P^L_{v,t})\right]+\sum_{s=1}^{NS}\sum_{t=1}^{T}M\left[L^+_{s,t}+L^-_{s,t}\right]\right\}"""
    replacements = {
        r"""\min\left\{
\sum_{i=1}^{N}\sum_{t=1}^{T}\left[C_{i,t}(P_{i,t})+C^U_{i,t}+C^0_{i,t}\right]
+\sum_{v=1}^{V}\sum_{t=1}^{T}\left[C^G_{v,t}(P^G_{v,t})+C^L_{v,t}(P^L_{v,t})\right]
+\sum_{s=1}^{NS}\sum_{t=1}^{T}M\left(L^+_{s,t}+L^-_{s,t}\right)
\right\}""": scuc_pdf_body,
        r"""\min\left\{
\sum_{i=1}^{N}\sum_{t=1}^{T}\left[C_{i,t}(P_{i,t})+C^U_{i,t}+C^0_{i,t}\right]+\sum_{v=1}^{V}\sum_{t=1}^{T}\left[C^G_{v,t}(P^G_{v,t})+C^L_{v,t}(P^L_{v,t})\right]
+\sum_{s=1}^{NS}\sum_{t=1}^{T}M\left[L^+_{s,t}+L^-_{s,t}\right]
\right\}""": scuc_pdf_body,
        r"""\min\left\{\sum_{i=1}^{N}\sum_{t=1}^{T}C_{i,t}(P_{i,t})+\sum_{v=1}^{V}\sum_{t=1}^{T}\left[C^G_{v,t}(P^G_{v,t})+C^L_{v,t}(P^L_{v,t})\right]+\sum_{s=1}^{NS}\sum_{t=1}^{T}M\left(L^+_{s,t}+L^-_{s,t}\right)\right\}""": sced_pdf_body,
        r"""\min\left\{\sum_{i=1}^{N}\sum_{t=1}^{T}C_{i,t}(P_{i,t})+\sum_{v=1}^{V}\sum_{t=1}^{T}\left[C^G_{v,t}(P^G_{v,t})+C^L_{v,t}(P^L_{v,t})\right]+\sum_{s=1}^{NS}\sum_{t=1}^{T}M\left[L^+_{s,t}+L^-_{s,t}\right]\right\}""": sced_pdf_body,
    }
    text = md_text
    for old_body, new_body in replacements.items():
        text = text.replace(f"$$\n{old_body}\n$$", f"$$\n{new_body}\n$$")
    return text


def repair_cross_page_paragraph_breaks(md_text: str) -> str:
    replacements = {
        "3）发电机组有功功率上调/下调爬坡速率，单位为MW/分钟，\n\n基于并网调度协议，原则上循环硫化床机组不得小于额定容量的1%/分钟，其余火电机组不得小于额定容量的1.5%/分钟；": "3）发电机组有功功率上调/下调爬坡速率，单位为MW/分钟，基于并网调度协议，原则上循环硫化床机组不得小于额定容量的1%/分钟，其余火电机组不得小于额定容量的1.5%/分钟；",
        "电力平衡预测值和实际值偏差包括系统负荷超短期预测偏差、\n\n新能源超短期预测偏差、火电实际出力执行偏差、水电实际出力执行偏差等。": "电力平衡预测值和实际值偏差包括系统负荷超短期预测偏差、新能源超短期预测偏差、火电实际出力执行偏差、水电实际出力执行偏差等。",
    }
    text = md_text
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def repair_markdown(md_text: str, pdf_pages: list[str]) -> str:
    text = replace_cover_and_toc(md_text, pdf_pages)
    text = repair_markdown_sections(text)
    text = repair_grid_security_constraint_paragraphing(text)
    text = repair_model_layout(text)
    text = collapse_horizontal_display_formulas(text)
    text = repair_model_formula_semantics(text)
    text = repair_non_model_formula_semantics(text)
    text = repair_sced_constraint_explanations(text)
    text = repair_objective_formula_layouts(text)
    text = repair_cross_page_paragraph_breaks(text)
    text = text.replace(
        "### 8.2. 市场力监测与管控\n\n措施市场初期，",
        "### 8.2. 市场力监测与管控措施\n\n市场初期，",
    )
    text = text.replace(
        "| 火电供需比区间 | 浮动系数 |\n| --- | --- |\n| 供需比 $\\le 1.5$ | 1.1 |\n| $1.5<供需比$ | 1.05 |",
        "| 火电供需比区间 | 浮动系数 |\n| --- | --- |\n| 供需比 $\\le 1.05$ | 1.3 |\n| $1.05<供需比\\le 1.15$ | 1.2 |\n| $1.15<供需比\\le 1.5$ | 1.1 |\n| $1.5<供需比$ | 1.05 |",
    )
    text = text.replace(
        "| 火电供需比区间 | 收益系数 |\n| --- | --- |\n| 供需比 $\\le 1.5$ | 1.2 |\n| $1.5<供需比$ | 1.1 |",
        "| 火电供需比区间 | 收益系数 |\n| --- | --- |\n| 供需比 $\\le 1.05$ | 1.5 |\n| $1.05<供需比\\le 1.15$ | 1.3 |\n| $1.15<供需比\\le 1.5$ | 1.2 |\n| $1.5<供需比$ | 1.1 |",
    )
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


PDF_LIKE_CSS = """
    :root {
      color-scheme: light;
      --paper: #ffffff;
      --text: #111111;
      --muted: #333333;
      --line: #d8d8d8;
      --formula-bg: #ffffff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #ffffff;
      color: var(--text);
      font-family: "Songti SC", "SimSun", "STSong", "Noto Serif CJK SC", serif;
      line-height: 2.02;
    }
    main {
      width: min(794px, 100vw);
      min-height: 1123px;
      margin: 0 auto;
      background: var(--paper);
      padding: 96px 96px 88px;
    }
    h1, h2, h3, h4, h5, h6 {
      margin: 1.05em 0 0.45em;
      line-height: 1.55;
      font-weight: 700;
      letter-spacing: 0;
    }
    h1 {
      margin: 0.35em 0 0.6em;
      font-size: 1.45rem;
      text-align: center;
    }
    h2 { font-size: 1.18rem; }
    h3 { font-size: 1.08rem; }
    h4, h5, h6 { font-size: 1rem; }
    p {
      margin: 0 0 0.65em;
      font-size: 1rem;
      text-align: justify;
      text-align-last: left;
      text-indent: 2em;
      word-break: break-word;
    }
    p.math-paragraph {
      text-align: left;
      text-align-last: left;
      word-spacing: normal;
    }
    .cover-label {
      margin: 0 0 1.1em;
      text-align: left;
      text-indent: 0;
    }
    .cover-title {
      margin-top: 2.8em;
      margin-bottom: 0.75em;
      font-size: 1.55rem;
      text-align: center;
    }
    .cover-subtitle,
    .cover-date {
      text-align: center;
      text-indent: 0;
    }
    .cover-date { margin-bottom: 2.8em; }
    .toc-title {
      margin-top: 1.8em;
      text-align: center;
      font-size: 1.28rem;
    }
    .toc-line {
      display: flex;
      align-items: baseline;
      gap: 0.28em;
      margin: 0 0 0.1em;
      text-align: left;
      text-indent: 0;
      color: var(--text);
      font-size: 0.98rem;
      line-height: 1.55;
      white-space: nowrap;
    }
    .toc-line.depth-1 { padding-left: 1.6em; }
    .toc-line.depth-2 { padding-left: 3.2em; }
    .toc-line.depth-3 { padding-left: 4.8em; }
    .toc-text { white-space: nowrap; }
    .toc-leader {
      flex: 1 1 auto;
      min-width: 2em;
      border-bottom: 1px dotted #777;
      transform: translateY(-0.32em);
    }
    .toc-page {
      min-width: 2em;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .formula-figure {
      margin: 1em 0;
      overflow-x: auto;
      text-align: center;
      text-indent: 0;
    }
    .formula-figure img {
      display: block;
      max-width: 100%;
      width: auto;
      height: auto;
      margin: 0 auto;
    }
    .math-block,
    .formula-render-html {
      margin: 1em 0;
      padding: 0;
      border: 0;
      background: transparent;
      overflow-x: auto;
      text-indent: 0;
    }
    .inline-math {
      display: inline-block;
      margin: 0;
      white-space: nowrap;
      font-family: "Times New Roman", "Cambria Math", "STIX Two Math", serif;
      font-size: 1em;
      line-height: 1;
      vertical-align: baseline;
    }
    .inline-math i { font-style: italic; }
    .inline-math .math-upright { font-style: normal; }
    .inline-math .inline-sum {
      font-family: "Times New Roman", "Cambria Math", "STIX Two Math", serif;
      font-size: 1em;
      line-height: 1;
      vertical-align: baseline;
    }
    .inline-math sub,
    .inline-math sup { font-size: 0.68em; line-height: 0; }
    .inline-math sub { vertical-align: -0.34em; }
    .inline-math sup { vertical-align: 0.5em; }
    .inline-math .math-scripts {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      margin-left: 1px;
      line-height: 0.7;
      vertical-align: middle;
      transform: translateY(-0.08em);
    }
    .inline-math .math-scripts sup,
    .inline-math .math-scripts sub {
      display: block;
      line-height: 0.74;
      vertical-align: baseline;
    }
    p.math-paragraph .inline-math {
      display: inline;
      margin: 0;
      padding: 0;
      white-space: nowrap;
      word-spacing: normal;
      letter-spacing: 0;
      vertical-align: baseline;
    }
    p.math-paragraph .inline-math .math-scripts {
      display: inline;
      margin-left: 0;
      line-height: 0;
      vertical-align: baseline;
      transform: none;
    }
    p.math-paragraph .inline-math .math-scripts sup,
    p.math-paragraph .inline-math .math-scripts sub {
      display: inline;
      line-height: 0;
      vertical-align: baseline;
    }
    p.math-paragraph .inline-math .math-scripts sup {
      vertical-align: 0.5em;
    }
    p.math-paragraph .inline-math .math-scripts sub {
      margin-left: -0.08em;
      vertical-align: -0.34em;
    }
    .latex-rendered {
      min-width: max-content;
      font-family: "Times New Roman", "Cambria Math", "STIX Two Math", serif;
      font-size: 1.05rem;
      line-height: 1.9;
      color: #111111;
    }
    .formula-line { white-space: nowrap; text-align: center; }
    .formula-line + .formula-line { margin-top: 0.18em; }
    .objective-latex-rendered {
      line-height: 1.35;
      text-align: center;
    }
    .objective-formula {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      min-width: max-content;
    }
    .objective-min {
      margin-right: 0.3em;
      font-style: normal;
      align-self: center;
    }
    .objective-brace {
      display: inline-block;
      margin: 0 0.08em;
      font-family: "Times New Roman", "Cambria Math", "STIX Two Math", serif;
      font-size: 4.7em;
      font-weight: 400;
      line-height: 0.78;
      transform: scaleY(1.28);
      transform-origin: center;
    }
    .objective-formula-one-row .objective-brace {
      font-size: 2.25em;
      line-height: 0.9;
      transform: scaleY(1.1);
    }
    .objective-body {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      line-height: 1.45;
    }
    .objective-row {
      white-space: nowrap;
      text-align: left;
    }
    .objective-row + .objective-row { margin-top: 0.22em; }
    .formula-line i { font-style: italic; }
    .objective-row i { font-style: italic; }
    .formula-line sub,
    .formula-line sup,
    .objective-row sub,
    .objective-row sup { font-size: 0.68em; line-height: 0; }
    .formula-line sub { vertical-align: -0.38em; }
    .formula-line sup,
    .objective-row sup { vertical-align: 0.58em; }
    .objective-row sub { vertical-align: -0.38em; }
    .formula-line .math-scripts {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      margin-left: 1px;
      line-height: 0.75;
      vertical-align: middle;
      transform: translateY(-0.05em);
    }
    .objective-row .math-scripts {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      margin-left: 1px;
      line-height: 0.75;
      vertical-align: middle;
      transform: translateY(-0.05em);
    }
    .formula-line .math-scripts sup,
    .formula-line .math-scripts sub,
    .objective-row .math-scripts sup,
    .objective-row .math-scripts sub {
      display: block;
      line-height: 0.82;
      vertical-align: baseline;
    }
    .math-op { padding: 0 0.08em; }
    .math-delim { padding: 0 0.03em; }
    .math-quad { display: inline-block; width: 1.2em; }
    .math-frac {
      display: inline-flex;
      flex-direction: column;
      align-items: stretch;
      vertical-align: middle;
      text-align: center;
      margin: 0 0.12em;
      line-height: 1.1;
    }
    .math-frac .math-num {
      display: block;
      border-bottom: 1px solid currentColor;
      padding: 0 0.18em 0.08em;
    }
    .math-frac .math-den {
      display: block;
      padding: 0.08em 0.18em 0;
    }
    .math-bigop {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      vertical-align: middle;
      margin: 0 0.08em;
      line-height: 1;
    }
    .math-bigop-symbol { font-size: 1.48em; line-height: 1; }
    .math-bigop-sup,
    .math-bigop-sub { font-size: 0.56em; line-height: 1; }
    .math-hat,
    .math-overline {
      display: inline-block;
      position: relative;
      line-height: 1;
    }
    .math-hat {
      padding-top: 0.18em;
    }
    .math-hat::before {
      content: "^";
      position: absolute;
      top: -0.46em;
      left: 50%;
      transform: translateX(-50%) scaleX(1.35);
      font-size: 0.82em;
      line-height: 1;
      font-family: "Times New Roman", "STIX Two Math", serif;
      font-style: normal;
      pointer-events: none;
    }
    .math-overline {
      border-top: 1px solid currentColor;
      padding-top: 0.04em;
    }
    .math-sqrt {
      display: inline-flex;
      align-items: stretch;
      vertical-align: middle;
      margin: 0 0.06em;
    }
    .math-sqrt-symbol {
      font-size: 1.18em;
      line-height: 1;
      transform: translateY(0.08em);
    }
    .math-sqrt-body {
      border-block-start: 0.06em solid currentColor;
      padding: 0.02em 0.08em 0;
    }
    .piecewise-latex-rendered {
      line-height: 1.55;
      text-align: center;
    }
    .piecewise-formula {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      min-width: max-content;
    }
    .piecewise-left {
      margin-right: 0.16em;
      white-space: nowrap;
    }
    .piecewise-brace {
      display: inline-block;
      margin: 0 0.14em 0 0;
      font-size: 2.8em;
      line-height: 0.86;
      transform: scaleY(1.28);
      transform-origin: center;
    }
    .piecewise-body {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.16em;
      line-height: 1.4;
    }
    .piecewise-row {
      display: grid;
      grid-template-columns: 1.2em auto;
      column-gap: 1.2em;
      align-items: baseline;
      text-align: left;
    }
    .piecewise-value {
      text-align: left;
    }
    .piecewise-condition {
      font-family: "Songti SC", "SimSun", "STSong", "Noto Serif CJK SC", serif;
      font-style: normal;
      white-space: nowrap;
    }
    .quote-similarity-latex-rendered {
      line-height: 1.28;
      text-align: center;
    }
    .quote-similarity-formula {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      min-width: max-content;
      white-space: nowrap;
    }
    .quote-sim-left {
      display: inline-flex;
      align-items: baseline;
      margin-right: 0.08em;
      white-space: nowrap;
    }
    .quote-sim-frac,
    .quote-sim-price-frac {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      text-align: center;
      line-height: 1.02;
      margin: 0 0.08em;
    }
    .quote-sim-num,
    .quote-sim-price-num {
      display: inline-flex;
      align-items: flex-end;
      justify-content: center;
      border-bottom: 1px solid currentColor;
      padding: 0 0.16em 0.03em;
      min-width: 100%;
    }
    .quote-sim-den,
    .quote-sim-price-den {
      display: block;
      padding: 0.04em 0.16em 0;
      min-width: 100%;
    }
    .quote-sim-side-sum {
      display: inline-flex;
      align-items: flex-end;
      line-height: 1;
      margin: 0 0.05em 0 0;
      vertical-align: middle;
      transform: translateY(0.02em);
    }
    .quote-sim-sum-symbol {
      font-size: 1.52em;
      line-height: 0.78;
    }
    .quote-sim-sum-sub {
      font-size: 0.56em;
      line-height: 1;
      white-space: nowrap;
      margin-left: 0.03em;
      transform: translateY(-0.08em);
    }
    .quote-sim-sqrt {
      display: inline-flex;
      align-items: flex-start;
      vertical-align: middle;
    }
    .quote-sim-root {
      font-size: 1.34em;
      line-height: 1;
      transform: translateY(0.05em);
    }
    .quote-sim-radicand {
      display: inline-block;
      border-top: 1px solid currentColor;
      padding: 0.02em 0.08em 0;
      line-height: 1.08;
    }
    .quote-sim-times {
      padding: 0 0.08em;
    }
    .quote-sim-price-label {
      font-family: "Songti SC", "SimSun", "STSong", "Noto Serif CJK SC", serif;
      font-style: normal;
      letter-spacing: 0;
      white-space: nowrap;
    }
    .math-block code {
      display: inline-block;
      white-space: pre;
      word-break: normal;
      overflow-wrap: normal;
      font-family: "Times New Roman", "Cambria Math", "STIX Two Math", serif;
      font-size: 1rem;
      line-height: 1.7;
      color: #111111;
    }
    .table-wrap {
      margin: 1.1em 0 1.4em;
      overflow-x: auto;
      text-indent: 0;
    }
    .doc-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 680px;
      font-size: 0.96rem;
      line-height: 1.65;
      background: #ffffff;
    }
    .doc-table th,
    .doc-table td {
      border: 1px solid var(--line);
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
      word-break: break-word;
    }
    .doc-table th {
      background: #f7f7f7;
      font-weight: 700;
    }
    @media (max-width: 720px) {
      main {
        width: 100vw;
        padding: 40px 28px 48px;
      }
      h1 { font-size: 1.36rem; }
      h2 { font-size: 1.12rem; }
      .toc-line {
        white-space: normal;
        align-items: flex-start;
      }
    }
"""


def replace_style(html_text: str) -> str:
    return re.sub(r"(?s)<style>.*?</style>", "<style>\n" + PDF_LIKE_CSS + "  </style>", html_text, count=1)


def normalize_latex_source(latex: str) -> str:
    latex = html.unescape(latex).strip()
    return "\n".join(line.rstrip() for line in latex.splitlines())


def piecewise_condition_html(first: str, first_value: str, second: str, second_value: str) -> str:
    return (
        '<span class="piecewise-text">仅当 </span>'
        f"{render_latex_fragment(first + '=' + first_value)}"
        '<span class="piecewise-text"> 且 </span>'
        f"{render_latex_fragment(second + '=' + second_value)}"
    )


def render_piecewise_switch_formula(variable_latex: str, rows: list[tuple[str, str]]) -> str:
    rendered_rows = []
    for value, condition in rows:
        rendered_rows.append(
            '<div class="piecewise-row">'
            f'<span class="piecewise-value">{render_latex_fragment(value)}</span>'
            f'<span class="piecewise-condition">{condition}</span>'
            "</div>"
        )
    return (
        '<div class="math-block formula-render formula-render-html">'
        '<div class="latex-rendered piecewise-latex-rendered" role="math">'
        '<div class="piecewise-formula">'
        f'<span class="piecewise-left">{render_latex_fragment(variable_latex + "=")}</span>'
        '<span class="piecewise-brace">{</span>'
        f'<div class="piecewise-body">{"".join(rendered_rows)}</div>'
        "</div></div></div>"
    )


def render_quote_similarity_formula() -> str:
    """Render the quote-similarity formula as searchable HTML, not an image."""
    left = render_latex_fragment(r"W_{i,j}=1-")
    sum_sub = render_latex_fragment(r"k\in[0\%,N\%,\ldots,100\%]")
    radicand = render_latex_fragment(r"(P^i_k-P^j_k)^2")
    denominator = render_latex_fragment(r"1+100/N")
    return (
        '<div class="math-block formula-render formula-render-html quote-similarity-render">'
        '<div class="latex-rendered quote-similarity-latex-rendered" role="math">'
        '<div class="quote-similarity-formula">'
        f'<span class="quote-sim-left">{left}</span>'
        '<span class="quote-sim-frac">'
        '<span class="quote-sim-num">'
        '<span class="quote-sim-side-sum">'
        '<span class="quote-sim-sum-symbol">∑</span>'
        f'<span class="quote-sim-sum-sub">{sum_sub}</span>'
        "</span>"
        '<span class="quote-sim-sqrt">'
        '<span class="quote-sim-root">√</span>'
        f'<span class="quote-sim-radicand">{radicand}</span>'
        "</span>"
        "</span>"
        f'<span class="quote-sim-den">{denominator}</span>'
        "</span>"
        '<span class="quote-sim-times">×</span>'
        '<span class="quote-sim-price-frac">'
        '<span class="quote-sim-price-num">1</span>'
        '<span class="quote-sim-price-den quote-sim-price-label">现货价格申报上限</span>'
        "</span>"
        "</div></div></div>"
    )


def render_shaanxi_special_formula_blocks(html_text: str) -> str:
    eta_html = render_piecewise_switch_formula(
        r"\eta_{i,t}",
        [
            ("1", piecewise_condition_html(r"\alpha_{i,t}", "1", r"\alpha_{i,t-1}", "0")),
            ("0", '<span class="piecewise-text">其余情况</span>'),
        ],
    )
    gamma_html = render_piecewise_switch_formula(
        r"\gamma_{i,t}",
        [
            ("1", piecewise_condition_html(r"\alpha_{i,t}", "0", r"\alpha_{i,t-1}", "1")),
            ("0", '<span class="piecewise-text">其余情况</span>'),
        ],
    )
    special_blocks = {
        normalize_latex_source(ETA_SWITCH_CASE_LATEX): eta_html,
        normalize_latex_source(GAMMA_SWITCH_CASE_LATEX): gamma_html,
        normalize_latex_source(QUOTE_SIMILARITY_LATEX): render_quote_similarity_formula(),
    }

    def replace(match: re.Match[str]) -> str:
        source = normalize_latex_source(match.group("body"))
        return special_blocks.get(source, match.group(0))

    return re.sub(r'<div class="math-block"><code>(?P<body>.*?)</code></div>', replace, html_text, flags=re.S)


def apply_cover_classes(html_text: str) -> str:
    html_text = html_text.replace('<title>陕西电力现货市场交易实施细则</title>', f"<title>{STEM}</title>", 1)
    html_text = html_text.replace('<p class="paragraph">附件1</p>', '<p class="cover-label">附件1</p>', 1)
    html_text = html_text.replace(
        '<h1 class="heading">陕西电力现货市场交易实施细则</h1>',
        '<h1 class="cover-title">陕西电力现货市场交易实施细则</h1>',
        1,
    )
    html_text = html_text.replace(
        '<p class="paragraph">（连续试运行 V2.0）</p>',
        '<p class="cover-subtitle">（连续试运行 V2.0）</p>',
        1,
    )
    html_text = html_text.replace(
        '<p class="paragraph">2025 年 12 月</p>',
        '<p class="cover-date">2025 年 12 月</p>',
        1,
    )
    return html_text


def render_toc_lines(html_text: str, pdf_pages: list[str]) -> str:
    pattern = re.compile(
        r'(<h2 class="toc-title">目录</h2>\n)(?P<body>.*?)(?=\s*<h2 class="heading">1\. 总述</h2>)',
        re.S,
    )

    def replace(match: re.Match[str]) -> str:
        rendered: list[str] = []
        for item in extract_pdf_toc_lines(pdf_pages):
            number = str(item["number"])
            title = str(item["title"])
            page = str(item["page"])
            depth = min(3, number.rstrip(".").count("."))
            text = html.escape(f"{number} {title.strip()}")
            rendered.append(
                f'      <p class="toc-line depth-{depth}">'
                f'<span class="toc-text">{text}</span>'
                f'<span class="toc-leader"></span>'
                f'<span class="toc-page">{html.escape(page)}</span>'
                f"</p>"
            )
        if not rendered:
            return match.group(0)
        return match.group(1) + "\n".join(rendered) + "\n"

    return pattern.sub(replace, html_text, count=1)


def mark_inline_math_paragraphs(html_text: str) -> str:
    html_text = re.sub(
        r'<p class="paragraph">(?P<body>(?:(?!</p>).)*inline-math(?:(?!</p>).)*)</p>',
        rf'<p class="paragraph math-paragraph" style="{MATH_PARAGRAPH_STYLE}">\g<body></p>',
        html_text,
        flags=re.S,
    )
    html_text = re.sub(
        r'<p class="paragraph math-paragraph"(?![^>]*\bstyle=)>',
        f'<p class="paragraph math-paragraph" style="{MATH_PARAGRAPH_STYLE}">',
        html_text,
    )
    html_text = re.sub(
        r'<p class="paragraph math-paragraph" style="(?![^"]*text-align:left !important)([^"]*)">',
        lambda m: f'<p class="paragraph math-paragraph" style="{MATH_PARAGRAPH_STYLE}{m.group(1)}">',
        html_text,
    )
    html_text = compact_inline_math_cjk_spacing(html_text)
    html_text = compact_inline_empty_sum_bigops(html_text)
    return html_text


def compact_inline_empty_sum_bigops(html_text: str) -> str:
    def compact(match: re.Match[str]) -> str:
        attrs = match.group("attrs")
        body = match.group("body")
        body = INLINE_EMPTY_SUM_BIGOP_RE.sub('<span class="inline-sum">∑</span>', body)
        return f'<p class="paragraph math-paragraph"{attrs}>{body}</p>'

    return re.sub(
        r'<p class="paragraph math-paragraph"(?P<attrs>[^>]*)>(?P<body>.*?)</p>',
        compact,
        html_text,
        flags=re.S,
    )


def compact_inline_math_cjk_spacing(html_text: str) -> str:
    def compact(match: re.Match[str]) -> str:
        attrs = match.group("attrs")
        body = match.group("body")
        body = INLINE_MATH_CJK_LEFT_RE.sub(r"\1\2", body)
        body = INLINE_MATH_CJK_RIGHT_RE.sub(r"\1\2", body)
        return f'<p class="paragraph math-paragraph"{attrs}>{body}</p>'

    return re.sub(
        r'<p class="paragraph math-paragraph"(?P<attrs>[^>]*)>(?P<body>.*?)</p>',
        compact,
        html_text,
        flags=re.S,
    )


def postprocess_html(html_text: str) -> str:
    return postprocess_html_with_pdf(html_text, read_pdf_pages())


def postprocess_html_with_pdf(html_text: str, pdf_pages: list[str]) -> str:
    html_text = render_shaanxi_special_formula_blocks(html_text)
    html_text = render_formula_blocks(html_text)
    html_text = replace_style(html_text)
    html_text = apply_cover_classes(html_text)
    html_text = render_toc_lines(html_text, pdf_pages)
    html_text = mark_inline_math_paragraphs(html_text)
    return html_text


def rebuild_structured(md_path: Path, html_text: str) -> dict[str, Any]:
    configure_structured_converter()
    base_report = md_to_json.load_base_report(PDF_PATH, ZC_HTML_DIR)
    structured = postprocess_structured(md_to_json.parse_markdown(md_path, base_report))
    quality = structured.setdefault("quality_report", {})
    quality["formula_count"] = len(structured.get("formulas", []))
    quality["resolved_formula_count"] = sum(1 for item in structured.get("formulas", []) if item.get("status") == "resolved")
    quality["unresolved_formula_count"] = sum(1 for item in structured.get("formulas", []) if item.get("status") == "unresolved")
    quality["html_pdf_layout_repair"] = {
        "cover_title_matches_pdf": True,
        "toc_uses_pdf_page_numbers": True,
        "paragraph_first_line_indent": True,
        "html_uses_pdf_like_styles": True,
        "root_html_bytes": len(html_text.encode("utf-8")),
    }
    return structured


def write_report(audit_before: dict[str, Any], audit_after: dict[str, Any], backup_dir: Path) -> None:
    before_mismatches = audit_before["heading_mismatches"][:20]
    after_mismatches = audit_after["heading_mismatches"][:20]
    report = [
        f"# {STEM} 版式与内容一致性修复报告",
        "",
        f"- 备份目录：`{backup_dir}`",
        f"- PDF 页数：{audit_before['pdf_page_count']}",
        f"- PDF 目录条目：{audit_before['pdf_toc_entries']}",
        f"- PDF 正文数字标题：{audit_before['pdf_body_numeric_headings']}",
        "",
        "## 首次问题统计（修复前）",
        "",
        f"- MD 文件名标题残留：{audit_before['text_issue_flags']['filename_heading_in_md']}",
        f"- MD 目录 bullet 行数：{audit_before['text_issue_flags']['toc_bullet_lines']}",
        f"- MD 目录缺少 PDF 页码/点线条目数：{audit_before['text_issue_flags']['toc_entries_without_pdf_page_numbers']}",
        f"- 标题与 PDF 不一致数量：{audit_before['heading_mismatch_count']}",
        f"- 标题后缀误粘到正文数量：{audit_before['text_issue_flags']['known_heading_suffix_leaks']}",
        f"- 市场力供需比表格缺档：{audit_before['text_issue_flags']['market_power_table_rows_missing']}",
        f"- 已知编号小标题与正文粘连数量：{audit_before['text_issue_flags']['known_subitem_title_body_glued']}",
        f"- 5.7 模型约束编号标题与正文粘连数量：{audit_before['text_issue_flags']['model_constraint_title_body_glued']}",
        f"- 5.7 模型超长“其中”说明段数量：{audit_before['text_issue_flags']['long_model_qizhong_paragraphs']}",
        f"- 应横排但被拆成多行的公式数量：{audit_before['text_issue_flags']['horizontal_formula_split_lines']}",
        f"- Display 公式多行块总数：{audit_before['text_issue_flags']['display_formula_multiline_blocks']}",
        f"- 目标函数数量：{audit_before['text_issue_flags']['objective_formula_count']}",
        f"- 目标函数误用圆括号 M(...) 数量：{audit_before['text_issue_flags']['objective_formula_uses_round_brackets']}",
        f"- SCUC 正备用解释段缺失：{audit_before['text_issue_flags']['scuc_missing_reserve_intro']}",
        f"- 启动费用公式缺少 PDF η 符号：{audit_before['text_issue_flags']['startup_formula_missing_pdf_eta']}",
        f"- 启动费用解释缺少 PDF η 符号：{audit_before['text_issue_flags']['startup_explanation_missing_pdf_eta']}",
        f"- 空载费用公式缺少 PDF α 符号：{audit_before['text_issue_flags']['no_load_formula_missing_pdf_alpha']}",
        f"- 系统负荷平衡公式误增 i/j/k 下标数量：{audit_before['text_issue_flags']['load_balance_formula_has_extra_indices']}",
        f"- 系统负荷平衡说明误增 i/j/k 下标数量：{audit_before['text_issue_flags']['load_balance_explanation_has_extra_indices']}",
        f"- 正/负备用公式 D 项求和号误增 k 下标数量：{audit_before['text_issue_flags']['reserve_formula_extra_sum_k_for_d']}",
        f"- 正/负备用公式 D 项变量误带 k,t 下标数量：{audit_before['text_issue_flags']['reserve_formula_d_has_k_subscript']}",
        f"- SCUC 状态变量残留拉丁 a 数量：{audit_before['text_issue_flags']['scuc_latin_state_a_tokens']}",
        f"- SCUC α 命令过度展开残留数量：{audit_before['text_issue_flags']['alpha_overexpanded_tokens']}",
        f"- 启停变量残留 h/g 符号：{audit_before['text_issue_flags']['start_stop_uses_latin_hg']}",
        f"- 启停条件缺少 PDF η/γ 分段式：{audit_before['text_issue_flags']['start_stop_missing_eta_gamma_cases']}",
        f"- 分区净启停容量缺少 PDF η/γ 与额定容量横线：{audit_before['text_issue_flags']['area_net_start_stop_missing_pdf_eta_gamma']}",
        f"- 机组最大启停次数条件式拆成独立公式块数量：{audit_before['text_issue_flags']['start_stop_switch_split_blocks']}",
        f"- 机组启停次数限制式拆成独立公式块数量：{audit_before['text_issue_flags']['start_stop_limit_split_blocks']}",
        f"- SCED 约束公式说明段缺失总数：{audit_before['text_issue_flags']['sced_constraint_explanations_missing_total']}",
        f"- SCED 发电主体群出力说明缺失：{audit_before['text_issue_flags']['sced_group_output_explanation_missing']}",
        f"- SCED 发电主体爬坡说明缺失：{audit_before['text_issue_flags']['sced_ramp_explanation_missing']}",
        f"- SCED 网络潮流说明缺失：{audit_before['text_issue_flags']['sced_network_flow_explanation_missing']}",
        f"- SCED 独立储能功率及 SOC 说明缺失：{audit_before['text_issue_flags']['sced_storage_explanation_missing']}",
        f"- SCED 一体化虚拟电厂说明缺失：{audit_before['text_issue_flags']['sced_vpp_explanation_missing']}",
        f"- SCED 独立储能循环次数说明缺失：{audit_before['text_issue_flags']['sced_storage_cycle_explanation_missing']}",
        f"- 用户侧定价公式下标顺序错误数量：{audit_before['text_issue_flags']['user_side_pricing_wrong_subscript_order']}",
        f"- 调频辅助服务衔接公式下标/容量项错误数量：{audit_before['text_issue_flags']['ancillary_linkage_wrong_subscript_order']}",
        f"- 市场力参考报价公式占位化数量：{audit_before['text_issue_flags']['reference_offer_formula_uses_placeholder']}",
        f"- 报价特征向量公式误用圆括号数量：{audit_before['text_issue_flags']['quote_vector_formula_uses_parentheses']}",
        f"- 报价相似度公式语义错误数量：{audit_before['text_issue_flags']['quote_similarity_formula_wrong_semantics']}",
        f"- HTML 使用列表目录数量：{audit_before['html_issue_flags']['toc_rendered_as_ul']}",
        f"- HTML 卡片阴影样式数量：{audit_before['html_issue_flags']['card_shadow_css']}",
        f"- HTML h2 顶部分隔线样式数量：{audit_before['html_issue_flags']['h2_border_top_css']}",
        f"- HTML 缺少正文首行缩进：{audit_before['html_issue_flags']['missing_paragraph_text_indent_css']}",
        f"- HTML 含内联公式但仍使用普通正文两端对齐的段落数量：{audit_before['html_issue_flags']['plain_inline_math_paragraphs']}",
        f"- HTML 内联公式专用段落数量：{audit_before['html_issue_flags']['math_paragraph_count']}",
        f"- HTML 内联公式段落缺少强制左对齐样式数量：{audit_before['html_issue_flags']['math_paragraph_inline_style_missing']}",
        f"- HTML 内联公式与中文之间残留空格数量：{audit_before['html_issue_flags']['math_paragraph_cjk_spacing_gaps']}",
        f"- HTML 旧版内联公式 CSS 残留规则数量：{audit_before['html_issue_flags']['stale_inline_math_css_rules']}",
        f"- HTML 内联公式段落文本流覆盖规则缺失数量：{audit_before['html_issue_flags']['math_paragraph_inline_flow_css_missing']}",
        f"- HTML 内联空上下标求和号仍按大公式渲染数量：{audit_before['html_issue_flags']['inline_empty_sum_bigops']}",
        f"- HTML 目标函数专用渲染数量：{audit_before['html_issue_flags']['objective_formula_custom_render_count']}",
        f"- HTML 目标函数默认小括号渲染残留数量：{audit_before['html_issue_flags']['objective_formula_default_min_brace_count']}",
        f"- HTML 报价相似度公式专用渲染数量：{audit_before['html_issue_flags']['quote_similarity_formula_custom_render_count']}",
        f"- HTML 报价相似度公式图片渲染残留数量：{audit_before['html_issue_flags']['quote_similarity_formula_image_render_count']}",
        f"- HTML 报价相似度公式默认渲染残留数量：{audit_before['html_issue_flags']['quote_similarity_formula_default_render_count']}",
        f"- HTML α 命令过度展开残留数量：{audit_before['html_issue_flags']['html_alpha_overexpanded_tokens']}",
        "",
        "## 修复后复核统计",
        "",
        f"- MD 文件名标题残留：{audit_after['text_issue_flags']['filename_heading_in_md']}",
        f"- MD 目录 bullet 行数：{audit_after['text_issue_flags']['toc_bullet_lines']}",
        f"- MD 目录缺少 PDF 页码/点线条目数：{audit_after['text_issue_flags']['toc_entries_without_pdf_page_numbers']}",
        f"- 标题与 PDF 不一致数量：{audit_after['heading_mismatch_count']}",
        f"- 标题后缀误粘到正文数量：{audit_after['text_issue_flags']['known_heading_suffix_leaks']}",
        f"- 市场力供需比表格缺档：{audit_after['text_issue_flags']['market_power_table_rows_missing']}",
        f"- 已知编号小标题与正文粘连数量：{audit_after['text_issue_flags']['known_subitem_title_body_glued']}",
        f"- 5.7 模型约束编号标题与正文粘连数量：{audit_after['text_issue_flags']['model_constraint_title_body_glued']}",
        f"- 5.7 模型超长“其中”说明段数量：{audit_after['text_issue_flags']['long_model_qizhong_paragraphs']}",
        f"- 应横排但被拆成多行的公式数量：{audit_after['text_issue_flags']['horizontal_formula_split_lines']}",
        f"- Display 公式多行块总数：{audit_after['text_issue_flags']['display_formula_multiline_blocks']}",
        f"- 目标函数数量：{audit_after['text_issue_flags']['objective_formula_count']}",
        f"- 目标函数误用圆括号 M(...) 数量：{audit_after['text_issue_flags']['objective_formula_uses_round_brackets']}",
        f"- SCUC 正备用解释段缺失：{audit_after['text_issue_flags']['scuc_missing_reserve_intro']}",
        f"- 启动费用公式缺少 PDF η 符号：{audit_after['text_issue_flags']['startup_formula_missing_pdf_eta']}",
        f"- 启动费用解释缺少 PDF η 符号：{audit_after['text_issue_flags']['startup_explanation_missing_pdf_eta']}",
        f"- 空载费用公式缺少 PDF α 符号：{audit_after['text_issue_flags']['no_load_formula_missing_pdf_alpha']}",
        f"- 系统负荷平衡公式误增 i/j/k 下标数量：{audit_after['text_issue_flags']['load_balance_formula_has_extra_indices']}",
        f"- 系统负荷平衡说明误增 i/j/k 下标数量：{audit_after['text_issue_flags']['load_balance_explanation_has_extra_indices']}",
        f"- 正/负备用公式 D 项求和号误增 k 下标数量：{audit_after['text_issue_flags']['reserve_formula_extra_sum_k_for_d']}",
        f"- 正/负备用公式 D 项变量误带 k,t 下标数量：{audit_after['text_issue_flags']['reserve_formula_d_has_k_subscript']}",
        f"- SCUC 状态变量残留拉丁 a 数量：{audit_after['text_issue_flags']['scuc_latin_state_a_tokens']}",
        f"- SCUC α 命令过度展开残留数量：{audit_after['text_issue_flags']['alpha_overexpanded_tokens']}",
        f"- 启停变量残留 h/g 符号：{audit_after['text_issue_flags']['start_stop_uses_latin_hg']}",
        f"- 启停条件缺少 PDF η/γ 分段式：{audit_after['text_issue_flags']['start_stop_missing_eta_gamma_cases']}",
        f"- 分区净启停容量缺少 PDF η/γ 与额定容量横线：{audit_after['text_issue_flags']['area_net_start_stop_missing_pdf_eta_gamma']}",
        f"- 机组最大启停次数条件式拆成独立公式块数量：{audit_after['text_issue_flags']['start_stop_switch_split_blocks']}",
        f"- 机组启停次数限制式拆成独立公式块数量：{audit_after['text_issue_flags']['start_stop_limit_split_blocks']}",
        f"- SCED 约束公式说明段缺失总数：{audit_after['text_issue_flags']['sced_constraint_explanations_missing_total']}",
        f"- SCED 发电主体群出力说明缺失：{audit_after['text_issue_flags']['sced_group_output_explanation_missing']}",
        f"- SCED 发电主体爬坡说明缺失：{audit_after['text_issue_flags']['sced_ramp_explanation_missing']}",
        f"- SCED 网络潮流说明缺失：{audit_after['text_issue_flags']['sced_network_flow_explanation_missing']}",
        f"- SCED 独立储能功率及 SOC 说明缺失：{audit_after['text_issue_flags']['sced_storage_explanation_missing']}",
        f"- SCED 一体化虚拟电厂说明缺失：{audit_after['text_issue_flags']['sced_vpp_explanation_missing']}",
        f"- SCED 独立储能循环次数说明缺失：{audit_after['text_issue_flags']['sced_storage_cycle_explanation_missing']}",
        f"- 用户侧定价公式下标顺序错误数量：{audit_after['text_issue_flags']['user_side_pricing_wrong_subscript_order']}",
        f"- 调频辅助服务衔接公式下标/容量项错误数量：{audit_after['text_issue_flags']['ancillary_linkage_wrong_subscript_order']}",
        f"- 市场力参考报价公式占位化数量：{audit_after['text_issue_flags']['reference_offer_formula_uses_placeholder']}",
        f"- 报价特征向量公式误用圆括号数量：{audit_after['text_issue_flags']['quote_vector_formula_uses_parentheses']}",
        f"- 报价相似度公式语义错误数量：{audit_after['text_issue_flags']['quote_similarity_formula_wrong_semantics']}",
        f"- HTML 使用列表目录数量：{audit_after['html_issue_flags']['toc_rendered_as_ul']}",
        f"- HTML 卡片阴影样式数量：{audit_after['html_issue_flags']['card_shadow_css']}",
        f"- HTML h2 顶部分隔线样式数量：{audit_after['html_issue_flags']['h2_border_top_css']}",
        f"- HTML 缺少正文首行缩进：{audit_after['html_issue_flags']['missing_paragraph_text_indent_css']}",
        f"- HTML 含内联公式但仍使用普通正文两端对齐的段落数量：{audit_after['html_issue_flags']['plain_inline_math_paragraphs']}",
        f"- HTML 内联公式专用段落数量：{audit_after['html_issue_flags']['math_paragraph_count']}",
        f"- HTML 内联公式段落缺少强制左对齐样式数量：{audit_after['html_issue_flags']['math_paragraph_inline_style_missing']}",
        f"- HTML 内联公式与中文之间残留空格数量：{audit_after['html_issue_flags']['math_paragraph_cjk_spacing_gaps']}",
        f"- HTML 旧版内联公式 CSS 残留规则数量：{audit_after['html_issue_flags']['stale_inline_math_css_rules']}",
        f"- HTML 内联公式段落文本流覆盖规则缺失数量：{audit_after['html_issue_flags']['math_paragraph_inline_flow_css_missing']}",
        f"- HTML 内联空上下标求和号仍按大公式渲染数量：{audit_after['html_issue_flags']['inline_empty_sum_bigops']}",
        f"- HTML 目标函数专用渲染数量：{audit_after['html_issue_flags']['objective_formula_custom_render_count']}",
        f"- HTML 目标函数默认小括号渲染残留数量：{audit_after['html_issue_flags']['objective_formula_default_min_brace_count']}",
        f"- HTML 报价相似度公式专用渲染数量：{audit_after['html_issue_flags']['quote_similarity_formula_custom_render_count']}",
        f"- HTML 报价相似度公式图片渲染残留数量：{audit_after['html_issue_flags']['quote_similarity_formula_image_render_count']}",
        f"- HTML 报价相似度公式默认渲染残留数量：{audit_after['html_issue_flags']['quote_similarity_formula_default_render_count']}",
        f"- HTML α 命令过度展开残留数量：{audit_after['html_issue_flags']['html_alpha_overexpanded_tokens']}",
        "",
        "## 修复前标题差异样例",
        "",
    ]
    if before_mismatches:
        for item in before_mismatches:
            report.append(f"- {item['number']}：PDF=`{item['pdf']}`；MD=`{item['md']}`；line={item['line']}")
    else:
        report.append("- 无")
    report.extend(["", "## 修复后标题差异样例", ""])
    if after_mismatches:
        for item in after_mismatches:
            report.append(f"- {item['number']}：PDF=`{item['pdf']}`；MD=`{item['md']}`；line={item['line']}")
    else:
        report.append("- 无")
    REPORT_PATH.write_text("\n".join(report).strip() + "\n", encoding="utf-8")


def validate_outputs(md_text: str, html_text: str, structured: dict[str, Any]) -> dict[str, Any]:
    quality = structured.get("quality_report", {})
    md_formula_count = len(DISPLAY_FORMULA_RE.findall(md_text))
    raw_math_code = html_text.count('<div class="math-block"><code>')
    result = {
        "md_formula_count": md_formula_count,
        "structured_formula_count": quality.get("formula_count"),
        "unresolved_formula_count": quality.get("unresolved_formula_count"),
        "html_raw_math_code": raw_math_code,
        "filename_heading_in_md": int(md_text.startswith(f"# {STEM}")),
        "toc_bullets_remaining": len(re.findall(r"(?m)^\\s*-\\s+\\d", md_toc_block(md_text))),
        "known_suffix_leaks": len(re.findall(r"^措施市场初期", md_text, flags=re.M)),
        "market_power_table_rows_restored": int(all(token in md_text for token in ["1.05", "1.15", "1.3", "1.5"])),
        "html_toc_ul_remaining": html_text.count('<ul class="toc-list">'),
        "html_toc_line_count": html_text.count('class="toc-line'),
        "html_has_text_indent": int("text-indent: 2em" in html_text),
        "html_plain_inline_math_paragraphs": count_plain_inline_math_paragraphs(html_text),
        "html_math_paragraph_count": html_text.count('class="paragraph math-paragraph"'),
        "html_math_paragraph_inline_style_missing": count_math_paragraphs_missing_inline_style(html_text),
        "html_math_paragraph_cjk_spacing_gaps": count_math_paragraph_cjk_spacing_gaps(html_text),
        "html_stale_inline_math_css_rules": count_stale_inline_math_css_rules(html_text),
        "html_math_paragraph_inline_flow_css_missing": count_missing_math_paragraph_inline_flow_css(html_text),
        "html_inline_empty_sum_bigops": count_inline_empty_sum_bigops(html_text),
        "html_math_hat_instances": html_text.count('class="math-hat"'),
        "html_math_hat_css_missing": int(".math-hat::before" not in html_text),
        "html_math_overline_instances": html_text.count('class="math-overline"'),
        "html_math_overline_border_css_missing": int("border-top: 1px solid currentColor" not in html_text),
        "html_objective_formula_custom_render_count": html_text.count('class="objective-formula '),
        "html_objective_formula_default_min_brace_count": html_text.count('<span class="math-upright">min</span><span class="math-delim">{</span>'),
        "html_quote_similarity_formula_custom_render_count": html_text.count('class="quote-similarity-formula"'),
        "html_quote_similarity_formula_image_render_count": html_text.count('class="quote-similarity-image"'),
        "html_quote_similarity_formula_default_render_count": html_text.count(QUOTE_SIMILARITY_DEFAULT_HTML_MARKER),
        "html_raw_inline_latex_commands": len(
            re.findall(
                r"<i>\\(?:sum|mathrm|le|times|hat|bar|overline|sqrt|ldots|begin|end|text|%|alpha|eta|gamma|mu|Delta|delta)</i>|\\(?:sum|mathrm|le|times|hat|bar|overline|sqrt|ldots|begin|end|text|%|alpha|eta|gamma|mu|Delta|delta)",
                html_text,
            )
        ),
    }
    result.update(model_layout_issue_flags(md_text))
    result.update(non_model_formula_issue_flags(md_text))
    result.update(
        {
            "html_startup_formula_missing_eta": int(
                not bool(re.search(r"机组启动费用表达式：(?s:.{0,900}?<i>η</i><sub><i>i</i>,<i>t</i></sub>)", html_text))
            ),
        "html_startup_explanation_missing_eta": int(
            not bool(re.search(r"机组启动费用表达式：(?s:.{0,1400}?<span class=\"inline-math\"><i>η</i><sub><i>i</i>,<i>t</i></sub></span>表征机组)", html_text))
        ),
        "html_has_scuc_reserve_intro": int("在确保系统功率平衡的前提下，为了防止系统负荷预测偏差" in html_text),
        "html_load_balance_formula_extra_indices": len(
            re.findall(
                r"系统负荷平衡约束(?s:.{0,1200}?<i>P</i><sub><i>i</i>,<i>t</i></sub>)(?s:.{0,700}?<i>T</i><sub><i>j</i>,<i>t</i></sub>)(?s:.{0,700}?<i>D</i><sub><i>k</i>,<i>t</i></sub>)",
                html_text,
            )
        ),
        "html_load_balance_pdf_formula_count": len(
            re.findall(
                r"系统负荷平衡约束(?s:.{0,1200}?<i>P</i><sub><i>t</i></sub>)(?s:.{0,700}?<i>T</i><sub><i>t</i></sub>)(?s:.{0,700}?<i>D</i><sub><i>t</i></sub>)",
                html_text,
            )
        ),
        "html_reserve_formula_extra_sum_k_for_d": len(
            re.findall(
                r"系统[正负]备用容量约束(?s:.{0,1200}?<span class=\"math-bigop-sub\"><i>k</i></span></span><i>D</i><sub><i>k</i>,<i>t</i></sub>)",
                html_text,
            )
        ),
        "html_start_stop_old_hg_condition_block_count": len(
            re.findall(
                r"机组最大启停次数约束(?s:.{0,1400}?<div class=\"formula-line\"><i>h</i><sub><i>i</i>,<i>t</i></sub><span class=\"math-op\">=</span><span class=\"math-numlit\">1</span>)(?s:.{0,1200}?<div class=\"formula-line\"><i>g</i><sub><i>i</i>,<i>t</i></sub><span class=\"math-op\">=</span><span class=\"math-numlit\">0</span>)",
                html_text,
            )
        ),
        "html_start_stop_piecewise_formula_count": html_text.count('class="piecewise-formula"'),
        "html_start_stop_latin_hg_remaining": len(
            re.findall(
                r"机组最大启停次数约束(?s:.{0,2200}?<i>[hg]</i><sub><i>i</i>,<i>t</i></sub>)",
                html_text,
            )
        ),
        "html_state_latin_a_remaining": len(
            re.findall(
                r"SCUC(?s:.{0,70000}?<i>a</i>(?:<sub><i>i</i>,<i>t</i>|<sup>(?:<i>ch</i>|<i>dis</i>|<i>L</i>|<i>G</i>)))",
                html_text,
            )
        ),
        "html_alpha_overexpanded_tokens": html_text.count("<i>\\alph</i>") + html_text.count(r"\alph"),
    }
    )
    return result


def run_repair() -> dict[str, Any]:
    pdf_pages = read_pdf_pages()
    md_before = MD_PATH.read_text(encoding="utf-8")
    html_before = HTML_PATH.read_text(encoding="utf-8")
    audit_before = audit_current(md_before, html_before, pdf_pages)
    audit_baseline = earliest_backup_audit(pdf_pages) or audit_before

    backup_dir = backup_outputs()
    md_after = repair_markdown(md_before, pdf_pages)
    MD_PATH.write_text(md_after, encoding="utf-8")

    generated_html_path = md_to_html.convert_file(MD_PATH)
    html_after = postprocess_html_with_pdf(generated_html_path.read_text(encoding="utf-8"), pdf_pages)
    for path in [HTML_PATH, ZC_HTML_PATH, ZC_SKILL_HTML_PATH]:
        path.write_text(html_after, encoding="utf-8")

    structured = rebuild_structured(MD_PATH, html_after)
    json_text = json.dumps(structured, ensure_ascii=False, indent=2)
    for path in [STRUCTURED_JSON_PATH, ZC_SKILL_STRUCTURED_JSON_PATH, ZC_HTML_JSON_PATH]:
        path.write_text(json_text, encoding="utf-8")
    rebuild_index()

    audit_after = audit_current(md_after, html_after, pdf_pages)
    write_report(audit_baseline, audit_after, backup_dir)
    validation = validate_outputs(md_after, html_after, structured)
    return {
        "backup_dir": str(backup_dir),
        "report_path": str(REPORT_PATH),
        "audit_before": audit_before,
        "audit_after": audit_after,
        "validation": validation,
    }


def run_audit_only() -> dict[str, Any]:
    pdf_pages = read_pdf_pages()
    md_text = MD_PATH.read_text(encoding="utf-8")
    html_text = HTML_PATH.read_text(encoding="utf-8")
    return audit_current(md_text, html_text, pdf_pages)


def run_spacing_fix_only() -> dict[str, Any]:
    pdf_pages = read_pdf_pages()
    md_text = MD_PATH.read_text(encoding="utf-8")
    html_before = HTML_PATH.read_text(encoding="utf-8")
    audit_before = audit_current(md_text, html_before, pdf_pages)
    backup_dir = backup_outputs()
    changed: list[str] = []
    for path in [HTML_PATH, ZC_HTML_PATH, ZC_SKILL_HTML_PATH]:
        html_text = path.read_text(encoding="utf-8")
        html_after = replace_style(html_text)
        html_after = mark_inline_math_paragraphs(html_after)
        if html_after != html_text:
            path.write_text(html_after, encoding="utf-8")
            changed.append(str(path))
    html_after = HTML_PATH.read_text(encoding="utf-8")
    audit_after = audit_current(md_text, html_after, pdf_pages)
    return {
        "backup_dir": str(backup_dir),
        "changed_html_files": changed,
        "audit_before": audit_before,
        "audit_after": audit_after,
        "validation": {
            "html_plain_inline_math_paragraphs": count_plain_inline_math_paragraphs(html_after),
            "html_math_paragraph_count": html_after.count('class="paragraph math-paragraph"'),
            "html_math_paragraph_inline_style_missing": count_math_paragraphs_missing_inline_style(html_after),
            "html_math_paragraph_cjk_spacing_gaps": count_math_paragraph_cjk_spacing_gaps(html_after),
            "html_stale_inline_math_css_rules": count_stale_inline_math_css_rules(html_after),
            "html_math_paragraph_inline_flow_css_missing": count_missing_math_paragraph_inline_flow_css(html_after),
            "html_raw_inline_latex_commands": len(
                re.findall(r"<i>\\(?:sum|mathrm|le|times|hat|%)</i>|\\(?:sum|mathrm|le|times|hat|%)", html_after)
            ),
        },
    }


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "repair"
    if mode == "audit":
        print(json.dumps(run_audit_only(), ensure_ascii=False, indent=2))
        return 0
    if mode == "spacing":
        print(json.dumps(run_spacing_fix_only(), ensure_ascii=False, indent=2))
        return 0
    if mode != "repair":
        print("usage: fix_shaanxi_spot_layout_text_consistency.py [audit|repair|spacing]", file=sys.stderr)
        return 2
    result = run_repair()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
