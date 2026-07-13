#!/usr/bin/env python3
"""Audit and safely repair recurring policy-PDF parse regressions.

This script is intentionally split into:

1. generic checks that are safe for every parsed policy document;
2. generic repairs that do not require interpreting formula semantics; and
3. optional document profiles for formulas that were manually verified
   against PDF page images.

Use it as a guardrail before considering a parsed MD/HTML pair complete.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Callable


WORKSPACE = Path(__file__).resolve().parents[1]
DEFAULT_POLICY_ROOT = Path("/Users/didi/Documents/codex售电市场政策结构化")
TOOLS_DIR = DEFAULT_POLICY_ROOT / "tools"

if TOOLS_DIR.exists():
    sys.path.insert(0, str(TOOLS_DIR))
sys.path.insert(0, str(WORKSPACE / "scripts"))

try:
    import pdfplumber  # type: ignore
except Exception:  # pragma: no cover - optional dependency in audit-only use
    pdfplumber = None  # type: ignore

try:
    import convert_md_to_html as md_to_html  # type: ignore
except Exception:  # pragma: no cover
    md_to_html = None  # type: ignore

try:
    import markdown_to_structured_json as md_to_json  # type: ignore
except Exception:  # pragma: no cover
    md_to_json = None  # type: ignore

try:
    from parse_hunan_policy_pdfs_with_skill import render_formula_blocks  # type: ignore
except Exception:  # pragma: no cover
    render_formula_blocks = None  # type: ignore


DISPLAY_FORMULA_RE = re.compile(r"(?ms)^\$\$\n(?P<body>.*?)\n\$\$")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$")
MD_NUM_HEADING_RE = re.compile(r"^(\d+(?:\.\d+)*\.?)\s*(.+)$")
PDF_NUM_HEADING_RE = re.compile(r"^(\d+(?:\.\d+)*\.)\s*(.+)$")
PDF_TOC_RE = re.compile(r"^(\d+(?:\.\d+)*\.)\s*(.+?)\s*\.{3,}\s*(\d+)\s*$")
PAGE_MARK_RE = re.compile(r"^[—\-]\s*\d+\s*[—\-]$")
INLINE_EMPTY_SUM_BIGOP_RE = re.compile(
    r'<span class="math-bigop"><span class="math-bigop-sup"></span>'
    r'<span class="math-bigop-symbol">∑</span>'
    r'<span class="math-bigop-sub"></span></span>\s*'
)
INLINE_MATH_CJK_LEFT_RE = re.compile(r'([\u4e00-\u9fff，。；：、（）【】《》])\s+(<span class="inline-math")')
INLINE_MATH_CJK_RIGHT_RE = re.compile(r'(</span>)\s+([\u4e00-\u9fff，。；：、（）【】《》])')

PLACEHOLDER_RE = re.compile(
    r"INLINE_MATH|@@IM|VQUZUOMA|VQZUOMA|原公式截图|data:image|_assets|!\[|"
    r"2026年5月18日|15:56|⋯"
)
RAW_HTML_LATEX_RE = re.compile(
    r"<i>\\(?:sum|mathrm|le|ge|times|hat|bar|overline|sqrt|ldots|begin|end|text|"
    r"%|alpha|eta|gamma|mu|Delta|delta)</i>|"
    r"\\(?:sum|mathrm|le|ge|times|hat|bar|overline|sqrt|ldots|begin|end|text|"
    r"%|alpha|eta|gamma|mu|Delta|delta)"
)
NUMBERED_TITLE_TAIL_RE = re.compile(
    r"^(?P<title>（\d+）[^。\n]{2,90}?"
    r"(?:约束|计划|机制|模型|定价|校核|流程|条件|范围|审核|处理|管控|衔接|测试|准备|申报|管理|机组|市场))"
    r"(?P<body>出现以下情况时|为应对|对于|因|在|首先|需要|系统|电力|机组|省内|日前|实时|"
    r"基于|市场|用户|发电|批复同意|竞价日).+$"
)
NUMBERED_TITLE_PERIOD_RE = re.compile(
    r"^(?P<title>（\d+）[^。\n]{2,90}?"
    r"(?:约束|计划|机制|模型|定价|校核|流程|条件|范围|审核|处理|管控|衔接|测试|准备|申报|管理|机组|市场))"
    r"[。．](?P<body>.+)$"
)
MATH_PARAGRAPH_STYLE = (
    "text-align:left !important;"
    "text-align-last:left !important;"
    "word-spacing:normal !important;"
    "letter-spacing:0 !important;"
)
REQUIRED_MATH_PARAGRAPH_CSS = """
    p.math-paragraph {
      text-align: left;
      text-align-last: left;
      word-spacing: normal;
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
"""
NORMALIZED_GLOBAL_INLINE_MATH_CSS = """    .inline-math {
      display: inline;
      margin: 0;
      white-space: nowrap;
      font-family: "Times New Roman", "Cambria Math", "STIX Two Math", serif;
      font-size: 1em;
      line-height: 1;
      vertical-align: baseline;
    }"""
NORMALIZED_GLOBAL_INLINE_SCRIPT_CSS = """    .inline-math .math-scripts {
      display: inline;
      margin-left: 0;
      line-height: 0;
      vertical-align: baseline;
      transform: none;
    }"""
NORMALIZED_GLOBAL_INLINE_SCRIPT_CHILD_CSS = """    .inline-math .math-scripts sup,
    .inline-math .math-scripts sub {
      display: inline;
      line-height: 0;
      vertical-align: baseline;
    }"""
NORMALIZED_GLOBAL_INLINE_SUBSUP_CSS = """    .inline-math sub,
    .inline-math sup { font-size: 0.75em; line-height: 0; }"""


@dataclass
class DocPaths:
    md: Path
    html: Path
    pdf: Path | None
    zc_html: Path | None = None
    zc_skill_html: Path | None = None
    zc_html_json: Path | None = None
    structured_json: Path | None = None
    zc_skill_structured_json: Path | None = None
    report: Path | None = None
    zc_index: Path | None = None

    @property
    def stem(self) -> str:
        return self.md.stem

    @property
    def base_dir(self) -> Path:
        return self.md.parent


@dataclass
class AuditResult:
    path: str
    info: dict[str, Any] = field(default_factory=dict)
    issues: dict[str, Any] = field(default_factory=dict)
    examples: dict[str, list[str]] = field(default_factory=dict)

    @property
    def issue_count(self) -> int:
        total = 0
        for value in self.issues.values():
            if isinstance(value, bool):
                total += int(value)
            elif isinstance(value, int):
                total += value
            elif isinstance(value, list):
                total += len(value)
            elif value:
                total += 1
        return total


def normalize_spaces(text: str) -> str:
    text = text.replace("\u3000", " ").replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+([，。；：！？、）】》])", r"\1", text)
    text = re.sub(r"([（【《])\s+", r"\1", text)
    return text.strip()


def read_text(path: Path | None) -> str:
    if not path or not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def derive_paths(md_path: Path, pdf_path: Path | None = None, html_path: Path | None = None) -> DocPaths:
    md_path = md_path.resolve()
    base = md_path.parent
    stem = md_path.stem
    html = (html_path or md_path.with_suffix(".html")).resolve()
    pdf = (pdf_path or md_path.with_suffix(".pdf")).resolve()
    if not pdf.exists():
        pdf = None
    zc_html_dir = base / "ZC_HTML"
    zc_structured_dir = base / "ZC_STRUCTURED"
    return DocPaths(
        md=md_path,
        html=html,
        pdf=pdf,
        zc_html=(zc_html_dir / f"{stem}.html") if zc_html_dir.exists() else None,
        zc_skill_html=(zc_html_dir / f"{stem}.zc_skill.html") if zc_html_dir.exists() else None,
        zc_html_json=(zc_html_dir / f"{stem}.json") if zc_html_dir.exists() else None,
        structured_json=(zc_structured_dir / f"{stem}.structured.json") if zc_structured_dir.exists() else None,
        zc_skill_structured_json=(zc_structured_dir / f"{stem}.zc_skill.structured.json")
        if zc_structured_dir.exists()
        else None,
        report=(zc_structured_dir / f"{stem}.parse_regression_guard.md") if zc_structured_dir.exists() else None,
        zc_index=(zc_structured_dir / "index.json") if zc_structured_dir.exists() else None,
    )


def read_pdf_pages(pdf_path: Path | None) -> list[str]:
    if not pdf_path or not pdfplumber:
        return []
    with pdfplumber.open(pdf_path) as pdf:
        return [page.extract_text(x_tolerance=2, y_tolerance=3) or "" for page in pdf.pages]


def extract_pdf_toc_lines(pdf_pages: list[str]) -> list[dict[str, str | int]]:
    entries: list[dict[str, str | int]] = []
    for page_text in pdf_pages[:6]:
        for raw in page_text.splitlines():
            line = normalize_spaces(raw)
            match = PDF_TOC_RE.match(line)
            if not match:
                continue
            number, title, page = match.groups()
            entries.append({"number": number, "title": title.strip(), "page": int(page)})
    return entries


def pdf_heading_dict(pdf_pages: list[str]) -> dict[str, str]:
    headings: dict[str, str] = {}
    for page_text in pdf_pages[5:]:
        for raw in page_text.splitlines():
            line = normalize_spaces(raw)
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
            if len(title) > 56 or title.endswith(("。", "；", "，", "：")):
                continue
            if re.search(r"[=≤≥£å∑Σ]|供需比|浮动系数|收益系数", title):
                continue
            headings[number.rstrip(".")] = title
    return headings


def md_heading_dict(md_text: str) -> dict[str, tuple[str, int]]:
    headings: dict[str, tuple[str, int]] = {}
    for line_no, raw in enumerate(md_text.splitlines(), 1):
        match = HEADING_RE.match(raw)
        if not match:
            continue
        title = normalize_spaces(match.group(2))
        numeric = MD_NUM_HEADING_RE.match(title)
        if not numeric:
            continue
        number, heading_title = numeric.groups()
        headings[number.rstrip(".")] = (heading_title.strip(), line_no)
    return headings


def md_toc_block(md_text: str) -> str:
    if "## 目录" not in md_text:
        return ""
    after = md_text.split("## 目录", 1)[1]
    if "\n## " in after:
        return after.split("\n## ", 1)[0]
    return after


def iter_display_formula_bodies(md_text: str) -> list[tuple[int, str]]:
    formulas: list[tuple[int, str]] = []
    for match in DISPLAY_FORMULA_RE.finditer(md_text):
        line_no = md_text[: match.start()].count("\n") + 1
        formulas.append((line_no, match.group("body")))
    return formulas


def is_horizontal_formula_split_candidate(body: str) -> bool:
    lines = [line.strip() for line in body.splitlines() if line.strip()]
    if len(lines) <= 1:
        return False
    compact = re.sub(r"\s+", "", "".join(lines))
    if compact.startswith((r"\begin{cases}", r"\eta_", r"\gamma_")) or r"\begin{cases}" in compact:
        return False
    if compact.startswith(r"\min\left\{") and ("C^U" in compact or "C^0" in compact):
        return False
    return bool(
        compact.startswith(
            (
                r"\sum",
                r"P_{",
                r"P^{",
                r"\frac",
                r"\min\left\{",
                r"LMP",
                r"W_{",
                r"H_{",
            )
        )
    )


def count_math_paragraphs_missing_inline_style(html_text: str) -> int:
    count = 0
    for match in re.finditer(r'<p class="paragraph math-paragraph"(?P<attrs>[^>]*)>', html_text):
        if "text-align:left !important" not in match.group("attrs"):
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
        return 1 if html_text else 0
    style = style_match.group("style")
    stale_patterns = [
        r"\.inline-math\s*\{[^}]*margin:\s*0\s+0\.03em",
        r"\.inline-math\s*\{[^}]*font-size:\s*1\.04em",
        r"\.inline-math\s+sub,\s*\.inline-math\s+sup\s*\{[^}]*font-size:\s*0\.72em",
        r"\.inline-math\s+\.math-scripts\s+sup,\s*\.inline-math\s+\.math-scripts\s+sub\s*\{[^}]*line-height:\s*0\.78",
    ]
    return sum(1 for pattern in stale_patterns if re.search(pattern, style, re.S))


def count_missing_math_paragraph_inline_flow_css(html_text: str) -> int:
    if not html_text:
        return 0
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


def outside_display_math_transform(md_text: str, fn: Callable[[str], str]) -> str:
    pieces: list[str] = []
    pos = 0
    for match in DISPLAY_FORMULA_RE.finditer(md_text):
        pieces.append(fn(md_text[pos : match.start()]))
        pieces.append(match.group(0))
        pos = match.end()
    pieces.append(fn(md_text[pos:]))
    return "".join(pieces)


def numbered_title_glued_candidates(md_text: str) -> list[str]:
    candidates: list[str] = []
    def collect(chunk: str) -> str:
        for raw in chunk.splitlines():
            line = raw.strip()
            if is_numbered_definition_line(line):
                continue
            if NUMBERED_TITLE_PERIOD_RE.match(line) or NUMBERED_TITLE_TAIL_RE.match(line):
                candidates.append(line)
        return chunk
    outside_display_math_transform(md_text, collect)
    return candidates


def is_numbered_definition_line(line: str) -> bool:
    """Return True for glossary-style numbered definitions, not layout joins."""
    return bool(re.match(r"^（\d+）[^：\n]{1,90}：", line))


def formula_needs_following_explanation(body: str) -> bool:
    compact = re.sub(r"\s+", "", body)
    if r"\begin{cases}" in compact:
        return False
    return any(token in compact for token in [r"\sum", r"\frac", r"\sqrt", r"\min\left"])


def formula_without_explanation_candidates(md_text: str) -> list[str]:
    candidates: list[str] = []
    for match in DISPLAY_FORMULA_RE.finditer(md_text):
        body = match.group("body")
        if not formula_needs_following_explanation(body):
            continue
        before = md_text[max(0, match.start() - 220) : match.start()]
        if any(
            phrase in before
            for phrase in [
                "可以用状态变量表示为",
                "限制可表达如下",
                "满足如下条件",
                "分别表示为",
            ]
        ):
            continue
        after = md_text[match.end() :]
        next_number = re.search(r"\n\n(?P<next>（\d+）[^。\n]{2,80})", after)
        if not next_number:
            continue
        between = after[: next_number.start()]
        if re.search(r"\n\n其中[，:：]", between):
            continue
        line_no = md_text[: match.start()].count("\n") + 1
        candidates.append(f"line {line_no}: formula followed by {next_number.group('next')}")
    return candidates


def long_qizhong_formula_paragraph_candidates(md_text: str) -> list[str]:
    candidates: list[str] = []
    for line_no, raw in enumerate(md_text.splitlines(), 1):
        line = raw.strip()
        if not re.match(r"^其中[:：].{120,}$", line):
            continue
        if line.count("$") >= 6 or line.count("；$") >= 2 or len(re.findall(r"\$[^$]+\$", line)) >= 3:
            candidates.append(f"line {line_no}: {line[:160]}")
    return candidates


def audit_document(paths: DocPaths) -> AuditResult:
    md_text = read_text(paths.md)
    html_text = read_text(paths.html)
    structured: dict[str, Any] = {}
    if paths.structured_json and paths.structured_json.exists():
        try:
            structured = json.loads(paths.structured_json.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            structured = {}
    pdf_pages = read_pdf_pages(paths.pdf)
    formulas = iter_display_formula_bodies(md_text)
    multiline_formula_examples = [
        f"line {line}: {' '.join(part.strip() for part in body.splitlines()[:2])[:120]}"
        for line, body in formulas
        if len([part for part in body.splitlines() if part.strip()]) > 1
    ]
    horizontal_candidates = [
        f"line {line}: {' '.join(part.strip() for part in body.splitlines()[:2])[:120]}"
        for line, body in formulas
        if is_horizontal_formula_split_candidate(body)
    ]
    objective_bodies = [
        (line, body)
        for line, body in formulas
        if body.lstrip().startswith(r"\min\left\{")
        and ("C^G" in re.sub(r"\s+", "", body) or "L^+" in body)
    ]
    pdf_toc = extract_pdf_toc_lines(pdf_pages)
    pdf_headings = pdf_heading_dict(pdf_pages)
    md_headings = md_heading_dict(md_text)
    heading_mismatches: list[str] = []
    for number, pdf_title in pdf_headings.items():
        md_item = md_headings.get(number)
        if not md_item:
            heading_mismatches.append(f"{number}: PDF={pdf_title}; MD=<missing>")
            continue
        md_title, line_no = md_item
        if normalize_spaces(md_title) != normalize_spaces(pdf_title):
            heading_mismatches.append(f"{number}: PDF={pdf_title}; MD={md_title}; line={line_no}")
    toc_block = md_toc_block(md_text)
    toc_page_number_lines = [line for line in toc_block.splitlines() if re.search(r"\.{3,}\s*\d+\s*$", line)]
    q = structured.get("quality_report", {}) if isinstance(structured, dict) else {}
    md_formula_count = len(formulas)
    html_rendered_formula_count = html_text.count('class="math-block formula-render formula-render-html')
    raw_math_code = html_text.count('<div class="math-block"><code>')
    issue_candidates = numbered_title_glued_candidates(md_text)
    formula_explanation_candidates = formula_without_explanation_candidates(md_text)
    long_qizhong_candidates = long_qizhong_formula_paragraph_candidates(md_text)

    issues = {
        "placeholders_or_image_refs": len(PLACEHOLDER_RE.findall(md_text + "\n" + html_text)),
        "html_raw_math_code": raw_math_code,
        "html_raw_inline_latex_commands": len(RAW_HTML_LATEX_RE.findall(html_text)),
        "formula_image_html_count": html_text.count("<img") + html_text.count("data:image"),
        "numbered_title_body_glued": len(issue_candidates),
        "long_qizhong_formula_paragraphs": len(long_qizhong_candidates),
        "formula_without_explanation_before_next_number": len(formula_explanation_candidates),
        "alpha_overexpanded_tokens": md_text.count(r"\alph\alpha") + html_text.count(r"\alph"),
        "objective_formula_uses_round_brackets": sum(1 for _, body in objective_bodies if r"M\left(" in body),
        "horizontal_formula_split_candidates": len(horizontal_candidates),
        "html_math_paragraph_inline_style_missing": count_math_paragraphs_missing_inline_style(html_text),
        "html_math_paragraph_cjk_spacing_gaps": count_math_paragraph_cjk_spacing_gaps(html_text),
        "html_stale_inline_math_css_rules": count_stale_inline_math_css_rules(html_text),
        "html_math_paragraph_inline_flow_css_missing": count_missing_math_paragraph_inline_flow_css(html_text),
        "html_inline_empty_sum_bigops": count_inline_empty_sum_bigops(html_text),
        "md_html_formula_count_mismatch": int(
            bool(html_text)
            and html_rendered_formula_count + raw_math_code != md_formula_count
        ),
        "md_structured_formula_count_mismatch": int(
            q.get("formula_count") is not None and q.get("formula_count") != md_formula_count
        ),
        "unresolved_formula_count": int(q.get("unresolved_formula_count") or 0),
        "heading_mismatch_count": len(heading_mismatches),
        "toc_entries_without_pdf_page_numbers": max(0, len(pdf_toc) - len(toc_page_number_lines)) if pdf_toc else 0,
        "quote_vector_formula_uses_parentheses": md_text.count(
            r"V_i=(P_{0\%},P_{N\%},P_{2N\%},\ldots,P_{100\%})"
        ),
        "quote_similarity_formula_wrong_semantics": md_text.count(
            r"H_{i,j}=1-\frac{\sqrt{\sum_k(P_{i,k}-P_{j,k})^2}}{P_{\mathrm{现货价格申报上限}}}"
        )
        + md_text.count(r"\sum_{k\in\{0\%,N\%,\ldots,100\%\}}")
        + md_text.count(r"$P_{i,k}$ 和 $P_{j,k}$"),
    }
    info = {
        "md_formula_count": md_formula_count,
        "html_rendered_formula_count": html_rendered_formula_count,
        "structured_formula_count": q.get("formula_count"),
        "display_formula_multiline_blocks": len(multiline_formula_examples),
        "objective_formula_count": len(objective_bodies),
        "pdf_page_count": len(pdf_pages),
        "pdf_toc_entries": len(pdf_toc),
        "pdf_numeric_headings": len(pdf_headings),
        "md_numeric_headings": len(md_headings),
    }
    examples = {
        "numbered_title_body_glued": issue_candidates[:20],
        "long_qizhong_formula_paragraphs": long_qizhong_candidates[:20],
        "horizontal_formula_split_candidates": horizontal_candidates[:20],
        "display_formula_multiline_blocks": multiline_formula_examples[:20],
        "formula_without_explanation_before_next_number": formula_explanation_candidates[:20],
        "heading_mismatches": heading_mismatches[:20],
    }
    return AuditResult(path=str(paths.md), info=info, issues=issues, examples=examples)


def split_numbered_titles(md_text: str) -> str:
    def transform(chunk: str) -> str:
        out: list[str] = []
        for raw in chunk.splitlines(keepends=True):
            line = raw.rstrip("\n")
            newline = "\n" if raw.endswith("\n") else ""
            stripped = line.strip()
            if is_numbered_definition_line(stripped):
                out.append(raw)
                continue
            prefix = line[: len(line) - len(line.lstrip())]
            match = NUMBERED_TITLE_PERIOD_RE.match(stripped)
            if not match:
                match = NUMBERED_TITLE_TAIL_RE.match(stripped)
            if match:
                body = stripped[len(match.group("title")) :]
                if body.startswith(("。", "．")):
                    body = body[1:]
                out.append(f"{prefix}{match.group('title')}\n\n{prefix}{body}{newline}")
            else:
                out.append(raw)
        return "".join(out)

    return outside_display_math_transform(md_text, transform)


def normalize_overexpanded_latex(md_text: str) -> str:
    while r"\alph\alpha" in md_text:
        md_text = md_text.replace(r"\alph\alpha", r"\alpha")
    return md_text


def apply_generic_md_repairs(md_text: str) -> str:
    text = normalize_overexpanded_latex(md_text)
    text = split_numbered_titles(text)
    text = text.replace(
        "。虚拟电厂出力/负荷及发电/用电费用",
        "。\n\n虚拟电厂出力/负荷及发电/用电费用",
    )
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def apply_rules_json(md_text: str, rules_path: Path | None) -> str:
    if not rules_path:
        return md_text
    data = json.loads(rules_path.read_text(encoding="utf-8"))
    text = md_text
    for item in data.get("markdown_replacements", []):
        old = item["old"]
        new = item["new"]
        count = int(item.get("count", 0))
        text = text.replace(old, new, count) if count > 0 else text.replace(old, new)
    return text


def apply_profile_md_repairs(md_text: str, profile: str) -> str:
    if profile in {"none", ""}:
        return md_text
    if profile != "shaanxi-spot-v2":
        raise ValueError(f"unknown profile: {profile}")
    import fix_shaanxi_spot_layout_text_consistency as shaanxi_spot  # type: ignore

    text = md_text
    for fn_name in [
        "repair_grid_security_constraint_paragraphing",
        "repair_model_layout",
        "collapse_horizontal_display_formulas",
        "repair_model_formula_semantics",
        "repair_non_model_formula_semantics",
        "repair_sced_constraint_explanations",
        "repair_objective_formula_layouts",
        "repair_cross_page_paragraph_breaks",
    ]:
        text = getattr(shaanxi_spot, fn_name)(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def ensure_math_paragraph_css(html_text: str) -> str:
    if not html_text:
        return html_text
    if "p.math-paragraph .inline-math .math-scripts" in html_text:
        return html_text
    if "</style>" in html_text:
        return html_text.replace("</style>", REQUIRED_MATH_PARAGRAPH_CSS + "  </style>", 1)
    return html_text


def normalize_global_inline_math_css(html_text: str) -> str:
    """Neutralize stale converter CSS that expands inline formula spacing."""
    if not html_text:
        return html_text
    replacements = [
        (r"(?ms)^    \.inline-math\s*\{.*?^    \}", NORMALIZED_GLOBAL_INLINE_MATH_CSS),
        (
            r"(?ms)^    \.inline-math sub,\n    \.inline-math sup\s*\{.*?^    \}",
            NORMALIZED_GLOBAL_INLINE_SUBSUP_CSS,
        ),
        (
            r"(?ms)^    \.inline-math \.math-scripts\s*\{.*?^    \}",
            NORMALIZED_GLOBAL_INLINE_SCRIPT_CSS,
        ),
        (
            r"(?ms)^    \.inline-math \.math-scripts sup,\n    \.inline-math \.math-scripts sub\s*\{.*?^    \}",
            NORMALIZED_GLOBAL_INLINE_SCRIPT_CHILD_CSS,
        ),
    ]
    for pattern, replacement in replacements:
        html_text = re.sub(pattern, replacement, html_text, count=1)
    return html_text


def normalize_residual_latex_html(html_text: str) -> str:
    """Render small LaTeX leftovers produced by lightweight inline parsing."""
    if not html_text:
        return html_text
    replacements = {
        r"<i>\times</i>": '<span class="math-op">×</span>',
        r"\%": "%",
    }
    for old, new in replacements.items():
        html_text = html_text.replace(old, new)
    return html_text


def compact_inline_empty_sum_bigops(html_text: str) -> str:
    def compact(match: re.Match[str]) -> str:
        attrs = match.group("attrs")
        body = INLINE_EMPTY_SUM_BIGOP_RE.sub('<span class="inline-sum">∑</span>', match.group("body"))
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
        body = INLINE_MATH_CJK_LEFT_RE.sub(r"\1\2", match.group("body"))
        body = INLINE_MATH_CJK_RIGHT_RE.sub(r"\1\2", body)
        return f'<p class="paragraph math-paragraph"{attrs}>{body}</p>'

    return re.sub(
        r'<p class="paragraph math-paragraph"(?P<attrs>[^>]*)>(?P<body>.*?)</p>',
        compact,
        html_text,
        flags=re.S,
    )


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
        lambda match: f'<p class="paragraph math-paragraph" style="{MATH_PARAGRAPH_STYLE}{match.group(1)}">',
        html_text,
    )
    return compact_inline_empty_sum_bigops(compact_inline_math_cjk_spacing(html_text))


def apply_profile_html_repairs(html_text: str, profile: str) -> str:
    if profile == "none" or not html_text:
        return html_text
    if profile != "shaanxi-spot-v2":
        raise ValueError(f"unknown profile: {profile}")
    import fix_shaanxi_spot_layout_text_consistency as shaanxi_spot  # type: ignore

    return shaanxi_spot.render_shaanxi_special_formula_blocks(html_text)


def apply_generic_html_repairs(html_text: str, profile: str = "none") -> str:
    if not html_text:
        return html_text
    html_text = apply_profile_html_repairs(html_text, profile)
    if render_formula_blocks is not None:
        html_text = render_formula_blocks(html_text)
    html_text = normalize_global_inline_math_css(html_text)
    html_text = normalize_residual_latex_html(html_text)
    html_text = ensure_math_paragraph_css(html_text)
    html_text = mark_inline_math_paragraphs(html_text)
    return html_text


def backup_outputs(paths: DocPaths) -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_dir = Path("/private/tmp") / f"policy_parse_regression_guard_{paths.stem}_{stamp}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    for path in [
        paths.md,
        paths.html,
        paths.zc_html,
        paths.zc_skill_html,
        paths.zc_html_json,
        paths.structured_json,
        paths.zc_skill_structured_json,
        paths.report,
        paths.zc_index,
    ]:
        if not path or not path.exists():
            continue
        try:
            rel = path.relative_to(paths.base_dir)
        except ValueError:
            rel = Path(path.name)
        dest = backup_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)
    return backup_dir


def rebuild_html(paths: DocPaths, profile: str) -> str:
    if md_to_html is not None:
        generated = md_to_html.convert_file(paths.md)
        html_text = generated.read_text(encoding="utf-8")
    else:
        html_text = read_text(paths.html)
    html_text = apply_generic_html_repairs(html_text, profile=profile)
    paths.html.write_text(html_text, encoding="utf-8")
    for mirror in [paths.zc_html, paths.zc_skill_html]:
        if mirror and mirror.parent.exists():
            mirror.write_text(html_text, encoding="utf-8")
    return html_text


def rebuild_structured(paths: DocPaths) -> dict[str, Any] | None:
    if md_to_json is None or not paths.pdf:
        return None
    if not paths.structured_json and not paths.zc_html_json:
        return None
    report_dir = paths.zc_html_json.parent if paths.zc_html_json else None
    base_report = md_to_json.load_base_report(paths.pdf, report_dir)
    structured = md_to_json.parse_markdown(paths.md, base_report)
    quality = structured.setdefault("quality_report", {})
    quality["formula_count"] = len(structured.get("formulas", []))
    quality["resolved_formula_count"] = sum(
        1 for item in structured.get("formulas", []) if item.get("status") == "resolved"
    )
    quality["unresolved_formula_count"] = sum(
        1 for item in structured.get("formulas", []) if item.get("status") == "unresolved"
    )
    for out_path in [paths.zc_html_json, paths.structured_json, paths.zc_skill_structured_json]:
        if out_path and out_path.parent.exists():
            out_path.write_text(json.dumps(structured, ensure_ascii=False, indent=2), encoding="utf-8")
    return structured


def write_report(paths: DocPaths, before: AuditResult, after: AuditResult | None, backup_dir: Path | None) -> None:
    report_path = paths.report or paths.md.with_suffix(".parse_regression_guard.md")
    lines: list[str] = [
        f"# {paths.stem} 解析回归检查报告",
        "",
        f"- MD：`{paths.md}`",
        f"- HTML：`{paths.html}`",
    ]
    if paths.pdf:
        lines.append(f"- PDF：`{paths.pdf}`")
    if backup_dir:
        lines.append(f"- 备份目录：`{backup_dir}`")
    lines.extend(["", "## 修复前", "", "### 信息项"])
    for key, value in before.info.items():
        lines.append(f"- {key}: {value}")
    lines.extend(["", "### 问题项"])
    for key, value in before.issues.items():
        lines.append(f"- {key}: {value}")
    for key, examples in before.examples.items():
        if examples:
            lines.extend(["", f"### 示例：{key}"])
            lines.extend(f"- {item}" for item in examples[:20])
    if after:
        lines.extend(["", "## 修复后", "", "### 信息项"])
        for key, value in after.info.items():
            lines.append(f"- {key}: {value}")
        lines.extend(["", "### 问题项"])
        for key, value in after.issues.items():
            lines.append(f"- {key}: {value}")
        for key, examples in after.examples.items():
            if examples:
                lines.extend(["", f"### 修复后示例：{key}"])
                lines.extend(f"- {item}" for item in examples[:20])
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")


def load_md_targets(args: argparse.Namespace) -> list[Path]:
    if args.md:
        return [Path(args.md)]
    root = Path(args.root or DEFAULT_POLICY_ROOT)
    return sorted(
        path
        for path in root.rglob("*.md")
        if "ZC_STRUCTURED" not in path.parts
        and "ZC_HTML" not in path.parts
        and ".codex_pdf_deps" not in path.parts
    )


def process_one(args: argparse.Namespace, md_path: Path) -> dict[str, Any]:
    paths = derive_paths(md_path, Path(args.pdf) if args.pdf else None, Path(args.html) if args.html else None)
    before = audit_document(paths)
    backup_dir: Path | None = None
    after: AuditResult | None = None
    should_repair = args.repair_safe or args.apply_profile or args.rules_json
    if should_repair:
        backup_dir = backup_outputs(paths)
        md_text = paths.md.read_text(encoding="utf-8")
        md_text = apply_generic_md_repairs(md_text) if args.repair_safe else md_text
        md_text = apply_rules_json(md_text, Path(args.rules_json) if args.rules_json else None)
        md_text = apply_profile_md_repairs(md_text, args.profile) if args.apply_profile else md_text
        paths.md.write_text(md_text, encoding="utf-8")
        html_profile = args.profile if args.apply_profile else "none"
        html_text = rebuild_html(paths, html_profile)
        if not args.skip_json:
            rebuild_structured(paths)
        # Re-read after rebuild so counts come from disk.
        after = audit_document(paths)
        # If HTML was rebuilt before structured JSON, make sure post-structured audit still sees the final HTML text.
        if html_text and not paths.html.exists():
            paths.html.write_text(html_text, encoding="utf-8")
    if not args.no_report:
        write_report(paths, before, after, backup_dir)
    result = {
        "md": str(paths.md),
        "report": str(paths.report or paths.md.with_suffix(".parse_regression_guard.md")),
        "before_issue_count": before.issue_count,
        "before": {"info": before.info, "issues": before.issues, "examples": before.examples},
    }
    if backup_dir:
        result["backup_dir"] = str(backup_dir)
    if after:
        result["after_issue_count"] = after.issue_count
        result["after"] = {"info": after.info, "issues": after.issues, "examples": after.examples}
    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit and safely repair recurring policy PDF parse issues in MD/HTML/JSON outputs."
    )
    parser.add_argument("--md", help="Target Markdown file. Omit with --root to scan all MD files.")
    parser.add_argument("--html", help="Target HTML file. Defaults to MD sibling .html.")
    parser.add_argument("--pdf", help="Target PDF file. Defaults to MD sibling .pdf if present.")
    parser.add_argument("--root", help="Root folder to scan when --md is omitted.")
    parser.add_argument("--repair-safe", action="store_true", help="Apply generic safe MD/HTML repairs.")
    parser.add_argument(
        "--profile",
        default="none",
        choices=["none", "shaanxi-spot-v2"],
        help="Select a manually verified document profile. Profile repairs are only written with --apply-profile.",
    )
    parser.add_argument(
        "--apply-profile",
        action="store_true",
        help="Apply the selected profile's semantic formula/layout repairs. Requires --profile other than none.",
    )
    parser.add_argument("--rules-json", help="Optional JSON file with additional exact markdown_replacements.")
    parser.add_argument("--skip-json", action="store_true", help="Do not rebuild structured JSON mirrors.")
    parser.add_argument("--no-report", action="store_true", help="Do not write a parse_regression_guard report file.")
    parser.add_argument("--fail-on-issues", action="store_true", help="Exit non-zero when issues remain.")
    parser.add_argument("--json", action="store_true", help="Print JSON summary.")
    args = parser.parse_args()
    if args.apply_profile and args.profile == "none":
        parser.error("--apply-profile requires --profile to select a verified profile.")
    return args


def main() -> int:
    args = parse_args()
    targets = load_md_targets(args)
    if not targets:
        print("No Markdown targets found.", file=sys.stderr)
        return 1
    summaries = [process_one(args, target) for target in targets]
    if args.json:
        print(json.dumps(summaries, ensure_ascii=False, indent=2))
    else:
        for item in summaries:
            after = item.get("after_issue_count")
            issue_count = after if after is not None else item["before_issue_count"]
            print(f"{item['md']}: issues={issue_count}; report={item['report']}")
            if "backup_dir" in item:
                print(f"  backup={item['backup_dir']}")
    if args.fail_on_issues:
        remaining = sum(int(item.get("after_issue_count", item["before_issue_count"])) for item in summaries)
        return 2 if remaining else 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
