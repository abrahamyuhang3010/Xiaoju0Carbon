#!/usr/bin/env python3
"""Reparse Hunan policy PDFs with the local parse-pdf-policy-docs workflow.

This script intentionally excludes the already hand-repaired spot market
document and rewrites only the sibling Markdown/HTML outputs for the other
PDFs in the 2026 policy folder.
"""

from __future__ import annotations

import json
import html
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path


WORKSPACE = Path(__file__).resolve().parents[1]
ROOT = Path("/Users/didi/Documents/codex售电市场政策结构化")
POLICY_DIR = ROOT / "湖南交易中心" / "2026年执行政策"
TOOLS_DIR = ROOT / "tools"
ZC_HTML_DIR = POLICY_DIR / "ZC_HTML"
ZC_STRUCTURED_DIR = POLICY_DIR / "ZC_STRUCTURED"

EXCLUDED_STEM = "【20251024】2湖南省电力现货市场交易实施细则"
OCR_PREVIEW_FALLBACK_STEMS = {"【20260403】湖南省电力中长期市场实施细则"}

sys.path.insert(0, str(TOOLS_DIR))
sys.path.insert(0, str(WORKSPACE / "scripts"))

import convert_md_to_html as md_to_html  # type: ignore  # noqa: E402
import convert_pdfs_to_md as pdf_to_md  # type: ignore  # noqa: E402
import markdown_to_structured_json as md_to_json  # type: ignore  # noqa: E402
from fix_hunan_spot_formula_mapping import render_inline_math, render_latex_display  # type: ignore  # noqa: E402


FORMULA_RENDER_CSS = """
    .inline-math {
      display: inline-block;
      margin: 0 0.03em;
      white-space: nowrap;
      font-family: "Times New Roman", "Cambria Math", "STIX Two Math", serif;
      font-size: 1.04em;
      line-height: 1;
      vertical-align: baseline;
    }
    .inline-math i { font-style: italic; }
    .inline-math .math-upright { font-style: normal; }
    .inline-math sub,
    .inline-math sup { font-size: 0.72em; line-height: 0; }
    .inline-math sub { vertical-align: -0.36em; }
    .inline-math sup { vertical-align: 0.52em; }
    .inline-math .math-scripts {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      margin-left: 1px;
      line-height: 0.74;
      vertical-align: middle;
      transform: translateY(-0.08em);
    }
    .inline-math .math-scripts sup,
    .inline-math .math-scripts sub {
      display: block;
      line-height: 0.78;
      vertical-align: baseline;
    }
    .formula-render-html {
      margin: 1.1em 0;
      padding: 12px 14px;
      border: 1px solid var(--line);
      background: var(--formula-bg);
      overflow-x: auto;
    }
    .latex-rendered {
      min-width: max-content;
      font-family: "Times New Roman", "Cambria Math", "STIX Two Math", serif;
      font-size: 1.16rem;
      line-height: 1.9;
      color: #111827;
    }
    .formula-line { white-space: nowrap; text-align: center; }
    .formula-line + .formula-line { margin-top: 0.18em; }
    .formula-line i { font-style: italic; }
    .formula-line sub,
    .formula-line sup { font-size: 0.68em; line-height: 0; }
    .formula-line sub { vertical-align: -0.38em; }
    .formula-line sup { vertical-align: 0.58em; }
    .formula-line .math-scripts {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      margin-left: 1px;
      line-height: 0.75;
      vertical-align: middle;
      transform: translateY(-0.05em);
    }
    .formula-line .math-scripts sup,
    .formula-line .math-scripts sub {
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
    .math-overline {
      display: inline-block;
      text-decoration: overline;
      text-decoration-thickness: 1px;
      text-decoration-skip-ink: none;
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
    .piecewise-text {
      font-family: "Songti SC", "SimSun", "STSong", "Noto Serif CJK SC", serif;
      font-style: normal;
    }
"""

WATERMARK_LINE_RE = re.compile(
    r"^\s*(?:"
    r"(?:20?26|226|26|16|316)\s*年\s*5\s*月\s*18\s*日(?:\s*\d{1,2}(?::\d{1,2}){0,2})?"
    r"|(?:[I1l]?\d{0,4}|20?26|2026|226|206|026|26|16|316)\s*年\s*5\s*月(?:\s*18\s*日)?(?:\s*\d{1,2}(?::\d{1,2}){0,2})?"
    r"|(?:\d{1,2}\s*)?18\s*日\s*\d{1,2}(?:(?:[:：.]\s*)?\d{1,2}){0,2}"
    r"|年\s*5\s*月|月\s*18\s*日.*"
    r"|\d{1,2}[:：]\d{2}(?::\d{2})?"
    r"|(?:\d{1,3}[.，。]){3}\d{1,3}"
    r"|30\.35|30\.3\s*5|221\.12(?:\s*/)?"
    r"|VQUZUOMA|VQZUOMA|x[a-z]*chanpi[a-z]*|北京小[桔福].*|侯可军"
    r"|[.。⋯…]*\d{1,4}\s*$"
    r")\s*$",
    re.I,
)
INLINE_WATERMARK_RE = re.compile(
    r"(?:"
    r"(?:20?26|226|26|16|316)\s*年\s*5\s*月\s*18\s*日(?:\s*\d{1,2}(?::\d{1,2}){0,2})?"
    r"|(?:\d{1,2}\s*)?18\s*日\s*\d{1,2}(?:(?:[:：.]\s*)?\d{1,2}){0,2}"
    r"|[①②③④⑤⑥⑦⑧⑨⑩]?\s*年\s*\$?\s*月\s*\d{1,2}(?::\d{1,2}){1,2}(?:\d{4}年\d{1,2}月\d{1,2}\S*)?"
    r"|VQUZUOMA|VQZUOMA|x[a-z]*chanpi[a-z]*|x[a-z]*nychanpin"
    r"|北京小[桔福]新能源汽车科技有限(?:公司|公)?|新能源汽车科技有限(?:公司|公)?|科技有限(?:公司|公)?|斗技有限(?:公司|公)?|侯可军"
    r")",
    re.I,
)
INLINE_WATERMARK_SHARD_RE = re.compile(
    r"(?:"
    r"[I1l]?\d{0,4}\s*年\s*5\s*月(?:\s*18\s*日)?"
    r"|(?<!20)0?26\s*年"
    r"|20?26\s*年\s*5\d{1,2}"
    r"|5\s*月\s*18\s*日\S*"
    r"|月\s*18\s*日"
    r"|20?26\s*2\s*月"
    r"|20?26\s*年\s*5\s*(?:号|%)\S*"
    r"|[18]\s*日\s*15[:：]?\d{2}(?::\d{2})?"
    r"|2A3255\s*年\s*5\s*月\S*"
    r"|(?:东|分推沙南)?S\d*公\d+"
    r")",
    re.I,
)
BODY_START_PATTERNS = [
    re.compile(r"^(?:#{1,6}\s*)?(?:第一章|1[.．]\s*总|1\s+总|一、\s*总|总则\b)"),
    re.compile(r"^(?:#{1,6}\s*)?第[一二三四五六七八九十百千万零〇两]+条\b"),
]
NUMERIC_MAIN_HEADING_RE = re.compile(r"^(?:#{1,6}\s*)?([1-9]\d?)[.．]\s*(.{1,40})$")
NUMERIC_SUB_HEADING_RE = re.compile(r"^(?:#{1,6}\s*)?(\d+(?:\.\d+)+)\s*(.{1,80})$")
MULTI_TOC_ITEM_RE = re.compile(r"[1-9]\d?[.．].{1,40}?[1-9]\d?[.．]")
SUSPICIOUS_PREFIX_RE = re.compile(r"^(?:#{1,6}\s*)?\.*(?:30\.35|30\.3\s*5|221\.12(?:\s*/)?|12\.30|1\.12)\s*")
SUSPICIOUS_STRUCTURAL_RE = re.compile(r"^(?:#{1,6}\s*)?(?:30\.35|30\.3\s*5|221\.12|12\.30|1\.12)(?:\s*/)?\s*$")
CN_SECTION_SPLIT_RE = re.compile(r"(?<!^)(?<!\n)(第[一二三四五六七八九十百千万零〇两]+节)")
ARTICLE_MARKER_RE = re.compile(r"第([一二三四五六七八九十百千万零〇两]+)条")
CN_ENUM_MARKER_RE = re.compile(r"([（(][一二三四五六七八九十]+[）)])")
MAIN_TITLE_WORDS = (
    "总则",
    "适用范围",
    "引用文件",
    "术语定义",
    "基本条件",
    "市场成员",
    "交易品种",
    "交易方式",
    "价格机制",
    "交易组织",
    "经营主体市场注册",
    "计量与结算",
    "信息披露",
    "风险防控",
    "监督管理",
    "异议处理",
    "法律责任",
    "免责条款",
    "附则",
)
MAIN_TITLE_RE = re.compile(
    rf"(?<!^)(?<!\n)(?<!\d)([1-9]\d?[.．]\s*(?:{'|'.join(re.escape(title) for title in MAIN_TITLE_WORDS)}))"
)


def target_pdfs() -> list[Path]:
    return [pdf for pdf in sorted(POLICY_DIR.glob("*.pdf")) if pdf.stem != EXCLUDED_STEM]


def backup_outputs(pdfs: list[Path]) -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_dir = Path("/private/tmp") / f"hunan_policy_pdf_parse_{stamp}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    for pdf in pdfs:
        stem = pdf.stem
        candidates = [
            pdf.with_suffix(".md"),
            pdf.with_suffix(".html"),
            ZC_HTML_DIR / f"{stem}.html",
            ZC_HTML_DIR / f"{stem}.json",
            ZC_STRUCTURED_DIR / f"{stem}.structured.json",
            ZC_STRUCTURED_DIR / f"{stem}.zc_skill.structured.json",
            ZC_STRUCTURED_DIR / f"{stem}.zc_skill.report.md",
        ]
        for path in candidates:
            if path.exists():
                rel = path.relative_to(POLICY_DIR)
                dest = backup_dir / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, dest)
    return backup_dir


def strip_watermark_residuals(text: str) -> str:
    cleaned: list[str] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            cleaned.append("")
            continue
        line = SUSPICIOUS_PREFIX_RE.sub("", line).strip()
        if WATERMARK_LINE_RE.fullmatch(line):
            continue
        line = re.sub(r"^\.\d+\s*", "", line)
        line = INLINE_WATERMARK_RE.sub("", line)
        line = INLINE_WATERMARK_SHARD_RE.sub("", line)
        line = re.sub(r"(?<!〔)\s*2026\s*$", "", line)
        line = line.replace("⋯", "...")
        line = line.replace("|", "")
        line = re.sub(r"\.{4,}\s*\d+\s*$", "", line).strip()
        line = re.sub(r"\s{2,}", " ", line).strip()
        if line:
            cleaned.append(line)
    return "\n".join(cleaned)


def is_body_start(line: str) -> bool:
    stripped = line.strip()
    if MULTI_TOC_ITEM_RE.search(stripped) or SUSPICIOUS_STRUCTURAL_RE.match(stripped):
        return False
    return any(pattern.match(stripped) for pattern in BODY_START_PATTERNS)


def remove_existing_toc(text: str) -> tuple[str, list[str]]:
    lines = text.splitlines()
    toc_start = next((idx for idx, line in enumerate(lines) if line.strip() in {"## 目录", "# 目录", "目录"}), None)
    if toc_start is None:
        return text, []
    toc_end = None
    for idx in range(toc_start + 1, len(lines)):
        if is_body_start(lines[idx]):
            toc_end = idx
            break
    if toc_end is None:
        return text, []
    removed = lines[toc_start:toc_end]
    return "\n".join(lines[:toc_start] + lines[toc_end:]), removed


def remove_leading_duplicate_heading_block(text: str) -> str:
    lines = text.splitlines()
    headings: list[tuple[int, str]] = []
    for idx, line in enumerate(lines):
        stripped = line.strip()
        match = re.match(r"^##\s+(?!目录$)(.+)$", stripped)
        if match:
            title = re.sub(r"\s+", "", match.group(1).strip())
            headings.append((idx, title))
    for pos, (first_idx, first_title) in enumerate(headings):
        for second_idx, second_title in headings[pos + 1 :]:
            if second_title != first_title:
                continue
            nonblank = [line.strip() for line in lines[first_idx:second_idx] if line.strip()]
            if len(nonblank) < 3:
                continue
            if all(re.match(r"^##\s+(?!目录$).+", line) for line in nonblank):
                return "\n".join(lines[:first_idx] + lines[second_idx:])
    return text


def heading_line(line: str) -> str:
    stripped = line.strip()
    if not stripped:
        return line
    if re.fullmatch(r"#{1,6}", stripped):
        return ""
    if SUSPICIOUS_STRUCTURAL_RE.match(stripped):
        return ""
    if stripped.startswith("# "):
        return stripped
    existing_heading = re.match(r"^#{2,6}\s+(.+)$", stripped)
    if existing_heading:
        stripped = existing_heading.group(1).strip()
        stripped = SUSPICIOUS_PREFIX_RE.sub("", stripped).strip()
    chapter_match = re.match(r"^(?:#{1,6}\s*)?(第[一二三四五六七八九十百千万零〇两]+章)\s*(.{0,50})$", stripped)
    if chapter_match:
        return f"## {chapter_match.group(1)} {chapter_match.group(2).strip()}".rstrip()
    section_match = re.match(r"^(?:#{1,6}\s*)?(第[一二三四五六七八九十百千万零〇两]+节)\s*(.{0,50})$", stripped)
    if section_match:
        return f"### {section_match.group(1)} {section_match.group(2).strip()}".rstrip()
    article_match = re.match(r"^(?:#{1,6}\s*)?(第[一二三四五六七八九十百千万零〇两]+条)(.*)$", stripped)
    if article_match and not article_match.group(2).strip():
        return f"### {article_match.group(1)}"
    attachment_match = re.match(r"^(附件(?:\s*\d+)?(?:[：:].{1,50}|.{0,20})?)$", stripped)
    if attachment_match:
        return f"## {attachment_match.group(1).strip()}"
    sub_match = NUMERIC_SUB_HEADING_RE.match(stripped)
    if sub_match:
        number, title = sub_match.groups()
        if (
            not number.startswith("0.")
            and not (number.count(".") == 1 and re.search(r"权重系数|分摊系数|响应时间|调节精度|额定容量|门槛", title))
            and not re.search(r"[。；！？/%]|兆瓦|千瓦|秒|元", title)
            and not MULTI_TOC_ITEM_RE.search(title)
            and len(title) <= 60
        ):
            level = min(6, number.count(".") + 2)
            return f"{'#' * level} {number} {title.strip()}"
        return stripped
    main_match = NUMERIC_MAIN_HEADING_RE.match(stripped)
    if main_match:
        number, title = main_match.groups()
        if (
            not re.match(r"\d", title.strip())
            and not re.search(r"[。；！？/%]|兆瓦|千瓦|秒|元", title)
            and not MULTI_TOC_ITEM_RE.search(title)
            and len(title) <= 32
        ):
            return f"## {number}. {title.strip()}"
    return stripped


def normalize_headings(text: str) -> str:
    return "\n".join(heading_line(line) for line in text.splitlines())


def chinese_number_to_int(text: str) -> int | None:
    digits = {"零": 0, "〇": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
    if not text:
        return None
    if text in digits:
        return digits[text]
    if text == "十":
        return 10
    if "百" in text:
        head, _, tail = text.partition("百")
        value = (digits.get(head, 1) if head else 1) * 100
        if tail:
            tail_value = chinese_number_to_int(tail)
            if tail_value is None:
                return None
            value += tail_value
        return value
    if "十" in text:
        head, _, tail = text.partition("十")
        value = (digits.get(head, 1) if head else 1) * 10
        if tail:
            if tail not in digits:
                return None
            value += digits[tail]
        return value
    value = 0
    for char in text:
        if char not in digits:
            return None
        value = value * 10 + digits[char]
    return value


def is_reference_article_marker(line: str, start: int, marker_end: int) -> bool:
    before = line[max(0, start - 8):start]
    after = line[marker_end:marker_end + 8].lstrip()
    immediate_before = line[start - 1:start]
    if immediate_before in {"、", "，", ","}:
        return True
    if immediate_before in {"及", "和", "与"} and re.search(r"第[一二三四五六七八九十百千万零〇两]+条[及和与]$", before):
        return True
    if re.match(
        r"(?:第[一二三四五六七八九十百千万零〇两]+[款项目项]|[一二三四五六七八九十百千万零〇两]+、|"
        r"规定|执行|要求|办理|处理|约定|明确|所称|有关|相关|的)",
        after,
    ):
        return True
    if re.search(r"(?:见|按|照|依|据|根据|符合|参照|适用|按照|前款|上述|下列)$", before) and not re.match(r"[\u4e00-\u9fff]+市场|[\u4e00-\u9fff]+交易|[\u4e00-\u9fff]+规则", after):
        return True
    return False


def split_glued_articles_in_line(line: str) -> str:
    matches = list(ARTICLE_MARKER_RE.finditer(line))
    if len(matches) < 2:
        return line
    split_points: list[int] = []
    previous_number = chinese_number_to_int(matches[0].group(1))
    if previous_number is None:
        return line
    for match in matches[1:]:
        current_number = chinese_number_to_int(match.group(1))
        if current_number is None:
            continue
        if current_number > previous_number and not is_reference_article_marker(line, match.start(), match.end()):
            split_points.append(match.start())
            previous_number = current_number
    if not split_points:
        return line
    pieces: list[str] = []
    last = 0
    for point in split_points:
        piece = line[last:point].strip()
        if piece:
            pieces.append(piece)
        last = point
    tail = line[last:].strip()
    if tail:
        pieces.append(tail)
    return "\n\n".join(pieces)


def split_glued_articles(text: str) -> str:
    return "\n".join(split_glued_articles_in_line(line) for line in text.splitlines())


def split_glued_cn_enums_in_line(line: str) -> str:
    matches = list(CN_ENUM_MARKER_RE.finditer(line))
    if not matches:
        return line
    split_points = [match.start() for match in matches if match.start() > 0]
    if not split_points:
        return line
    pieces: list[str] = []
    last = 0
    for point in split_points:
        piece = line[last:point].strip()
        if piece:
            pieces.append(piece)
        last = point
    tail = line[last:].strip()
    if tail:
        pieces.append(tail)
    return "\n\n".join(pieces)


def split_glued_cn_enums(text: str) -> str:
    return "\n".join(split_glued_cn_enums_in_line(line) for line in text.splitlines())


PAREN_NUMBER_MARKER_RE = re.compile(r"（\d{1,2}）")


def is_inline_parenthesized_number_marker(line: str, start: int, marker_end: int) -> bool:
    before = re.sub(r"\s+", "", line[:start])
    after = re.sub(r"\s+", "", line[marker_end:])
    if not before:
        return False
    if re.search(r"(?:按拟合规则|拟合规则|直接跳至|跳至|按|按照|依据|根据|参照|适用|执行|见|至)$", before[-16:]):
        return True
    if re.search(r"（\d{1,2}）[—－\-一至到]$", before):
        return True
    if re.match(r"^[—－\-一至到、，,及和]", after):
        return True
    if re.match(r"^(?:进行|补全|拟合)", after) and re.search(r"(?:规则|第[一二三四五六七八九十百千万零〇两\d]+[条款项]?)$", before[-16:]):
        return True
    if not after and not re.search(r"[。；：:！？!?]$", before):
        return True
    return False


def split_parenthesized_number_items_in_line(line: str) -> str:
    matches = list(PAREN_NUMBER_MARKER_RE.finditer(line))
    if not matches:
        return line
    split_points = [
        match.start()
        for match in matches
        if match.start() > 0 and not is_inline_parenthesized_number_marker(line, match.start(), match.end())
    ]
    if not split_points:
        return line
    pieces: list[str] = []
    last = 0
    for point in split_points:
        piece = line[last:point].strip()
        if piece:
            pieces.append(piece)
        last = point
    tail = line[last:].strip()
    if tail:
        pieces.append(tail)
    return "\n\n".join(pieces)


def split_parenthesized_number_items(text: str) -> str:
    return "\n".join(split_parenthesized_number_items_in_line(line) for line in text.splitlines())


def split_numbered_items(text: str) -> str:
    text = re.sub(r"子?第九[賁章]\s*监督管理", "\n\n第九章 监督管理\n\n", text)
    text = CN_SECTION_SPLIT_RE.sub(r"\n\n\1", text)
    text = split_glued_articles(text)
    text = split_glued_cn_enums(text)
    text = MAIN_TITLE_RE.sub(r"\n\n\1", text)
    text = split_parenthesized_number_items(text)
    text = re.sub(r"(?<!\n)\s+([1-9]\d?）)", r"\n\n\1", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def collect_toc_entries(text: str) -> list[str]:
    entries: list[str] = []
    seen: set[str] = set()
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("#"):
            continue
        level = len(stripped) - len(stripped.lstrip("#"))
        if level != 2:
            continue
        title = stripped[level:].strip()
        if title == "目录" or not title:
            continue
        normalized_title = title.strip(" .。•，,、")
        if title.startswith("第") and "条" in title[:6]:
            continue
        if SUSPICIOUS_STRUCTURAL_RE.match(title):
            continue
        if MULTI_TOC_ITEM_RE.search(title) or len(title) > 48 or re.search(r"[。；！？]", title):
            continue
        if not (
            re.match(r"^第[一二三四五六七八九十百千万零〇两]+章\b", normalized_title)
            or normalized_title.startswith("附件")
            or (
                re.match(r"^[1-9]\d?[.．]", normalized_title)
                and any(word in normalized_title for word in MAIN_TITLE_WORDS)
            )
        ):
            continue
        if normalized_title not in seen:
            seen.add(normalized_title)
            entries.append(f"- {normalized_title}")
    return entries


def insert_toc(text: str) -> str:
    entries = collect_toc_entries(text)
    if not entries:
        return text
    lines = text.splitlines()
    insert_at = 1
    if len(lines) > 2 and lines[1].strip() == "" and lines[2].strip() and not lines[2].startswith("#"):
        insert_at = 3
    toc = ["", "## 目录", "", *entries, ""]
    return "\n".join(lines[:insert_at] + toc + lines[insert_at:])


def postprocess_markdown(text: str) -> str:
    text = strip_watermark_residuals(text)
    text, _removed_toc = remove_existing_toc(text)
    text = split_numbered_items(text)
    text = normalize_headings(text)
    text = split_numbered_items(text)
    text = normalize_headings(text)
    text = remove_leading_duplicate_heading_block(text)
    text = re.sub(r"(?m)^#{1,6}\s*$\n?", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"
    text = insert_toc(text)
    return re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"


def inject_formula_css(html_text: str) -> str:
    if ".formula-render-html" in html_text and ".inline-math" in html_text:
        return normalize_formula_figure_css(html_text)
    return html_text.replace("    .math-block code {\n", FORMULA_RENDER_CSS + "    .math-block code {\n", 1)


def normalize_formula_figure_css(html_text: str) -> str:
    html_text = re.sub(
        r"""(?s)    \.formula-figure \{\n      margin: 1\.1em 0;\n      overflow-x: auto;\n    \}\n""",
        "    .formula-figure {\n"
        "      margin: 1.1em 0;\n"
        "      overflow-x: auto;\n"
        "      text-align: center;\n"
        "    }\n",
        html_text,
        count=1,
    )
    html_text = re.sub(
        r"""(?s)    \.formula-figure img \{\n      display: block;\n      max-width: none;\n      width: auto;\n      height: auto;\n      min-width: min\(100%, max-content\);\n    \}\n""",
        "    .formula-figure img {\n"
        "      display: block;\n"
        "      max-width: 100%;\n"
        "      width: auto;\n"
        "      height: auto;\n"
        "      margin: 0 auto;\n"
        "    }\n",
        html_text,
        count=1,
    )
    return html_text


def render_formula_blocks(html_text: str) -> str:
    pattern = re.compile(r'<div class="math-block"><code>(.*?)</code></div>', re.S)

    def replace(match: re.Match[str]) -> str:
        latex = match.group(1)
        latex = latex.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
        return render_latex_display(latex.strip())

    html_text = normalize_formula_figure_css(inject_formula_css(html_text))
    html_text = pattern.sub(replace, html_text)
    html_text = render_inline_math(html_text)
    html_text = render_toc_lists(html_text)
    return html_text


def inject_toc_css(html_text: str) -> str:
    if ".toc-list" in html_text:
        return html_text
    toc_css = """
    .toc-list {
      margin: 0 0 1.2em;
      padding-left: 1.2em;
      color: var(--muted);
      font-size: 0.96rem;
      line-height: 1.7;
    }
    .toc-list li {
      margin: 0 0 0.24em;
    }
"""
    return html_text.replace("    .toc-line {\n", toc_css + "    .toc-line {\n", 1)


def render_toc_lists(html_text: str) -> str:
    pattern = re.compile(
        r'(<h2 class="toc-title">目录</h2>\n)\s*<p class="paragraph">((?:-\s*[^<]+)+)</p>',
        re.S,
    )

    def replace(match: re.Match[str]) -> str:
        raw_items = html.unescape(match.group(2))
        items = [item.strip() for item in re.split(r"\s*-\s*", raw_items) if item.strip()]
        if len(items) < 2:
            return match.group(0)
        rendered_items = "\n".join(f"      <li>{html.escape(item)}</li>" for item in items)
        return f'{match.group(1)}    <ul class="toc-list">\n{rendered_items}\n    </ul>'

    html_text = inject_toc_css(html_text)
    return pattern.sub(replace, html_text)


def scrub_structured_value(value):
    if isinstance(value, str):
        return strip_watermark_residuals(value).strip()
    if isinstance(value, list):
        cleaned = [scrub_structured_value(item) for item in value]
        return [item for item in cleaned if item not in ("", [], {})]
    if isinstance(value, dict):
        return {key: scrub_structured_value(item) for key, item in value.items()}
    return value


def postprocess_structured(data: dict) -> dict:
    data = scrub_structured_value(data)
    quality = data.setdefault("quality_report", {})
    formulas = data.get("formulas", [])
    quality["formula_count"] = len(formulas)
    quality["resolved_formula_count"] = sum(1 for item in formulas if item.get("status") == "resolved")
    quality["unresolved_formula_count"] = sum(1 for item in formulas if item.get("status") == "unresolved")
    quality.setdefault("blocking_issues", [])
    note = "已按 parse-pdf-policy-docs 流程重新生成 MD/HTML；图片公式保留为可展示内容，未逐项人工 LaTeX 化的公式仍需专项复核。"
    if note not in quality["blocking_issues"]:
        quality["blocking_issues"].append(note)
    return data


def write_report(stem: str, structured: dict) -> None:
    quality = structured.get("quality_report", {})
    report = f"""# {stem} 解析修复报告

## 修复范围

- 已重新从 PDF 生成 Markdown，并清理目录、水印、页码与 OCR 残留。
- 已重新生成同名 HTML，并将 Markdown 公式块渲染为 HTML 公式结构。
- 已同步更新结构化 JSON。
- 图片公式已保留为 HTML 可展示图片；未逐项人工恢复为 LaTeX 的图片公式标记为后续复核风险。

## 结果

- 章节数：{quality.get("chapter_count")}
- 公式节点：{quality.get("formula_count")}
- 未恢复为 LaTeX 的公式：{quality.get("unresolved_formula_count")}
"""
    ZC_STRUCTURED_DIR.mkdir(exist_ok=True)
    (ZC_STRUCTURED_DIR / f"{stem}.zc_skill.report.md").write_text(report, encoding="utf-8")


def process_pdf(pdf: Path) -> dict:
    fallback = pdf.with_suffix(".ocr_preview.md")
    if pdf.stem in OCR_PREVIEW_FALLBACK_STEMS and fallback.exists():
        md_text = fallback.read_text(encoding="utf-8")
    else:
        lines = pdf_to_md.extract_lines(pdf)
        md_text = pdf_to_md.markdown_for(pdf, lines)
    md_text = postprocess_markdown(md_text)
    md_path = pdf.with_suffix(".md")
    md_path.write_text(md_text, encoding="utf-8")

    html_path = md_to_html.convert_file(md_path)
    html_text = render_formula_blocks(html_path.read_text(encoding="utf-8"))
    html_path.write_text(html_text, encoding="utf-8")

    ZC_HTML_DIR.mkdir(exist_ok=True)
    (ZC_HTML_DIR / f"{pdf.stem}.html").write_text(html_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{pdf.stem}.zc_skill.html").write_text(html_text, encoding="utf-8")

    base_report = md_to_json.load_base_report(pdf, ZC_HTML_DIR)
    structured = md_to_json.parse_markdown(md_path, base_report)
    structured = postprocess_structured(structured)
    ZC_STRUCTURED_DIR.mkdir(exist_ok=True)
    json_text = json.dumps(structured, ensure_ascii=False, indent=2)
    (ZC_STRUCTURED_DIR / f"{pdf.stem}.structured.json").write_text(json_text, encoding="utf-8")
    (ZC_STRUCTURED_DIR / f"{pdf.stem}.zc_skill.structured.json").write_text(json_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{pdf.stem}.json").write_text(json_text, encoding="utf-8")
    write_report(pdf.stem, structured)
    return structured


def rebuild_index(processed: list[tuple[Path, dict]]) -> None:
    all_results: list[tuple[Path, dict]] = []
    for json_path in sorted(ZC_STRUCTURED_DIR.glob("*.structured.json")):
        try:
            data = json.loads(json_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        all_results.append((json_path, data))
    md_to_json.render_index(all_results, ZC_STRUCTURED_DIR / "index.json")


def main() -> int:
    pdfs = target_pdfs()
    if not pdfs:
        print("No target PDFs found.")
        return 1
    backup_dir = backup_outputs(pdfs)
    print(f"backup_dir={backup_dir}")
    processed: list[tuple[Path, dict]] = []
    for idx, pdf in enumerate(pdfs, start=1):
        print(f"[{idx}/{len(pdfs)}] {pdf.name}", flush=True)
        structured = process_pdf(pdf)
        processed.append((ZC_STRUCTURED_DIR / f"{pdf.stem}.structured.json", structured))
        q = structured.get("quality_report", {})
        print(
            "  chapters={chapters} formulas={formulas} unresolved={unresolved}".format(
                chapters=q.get("chapter_count"),
                formulas=q.get("formula_count"),
                unresolved=q.get("unresolved_formula_count"),
            ),
            flush=True,
        )
    rebuild_index(processed)
    print("updated_count=" + str(len(processed)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
