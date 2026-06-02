#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from pypdf import PdfReader


DEFAULT_INPUT_DIR = Path("/Users/didi/Desktop/归档/湖南交易中心/2026年执行政策")
DEFAULT_OUTPUT_DIR = Path("/Users/didi/Desktop/归档/湖南交易中心/2026年执行政策_MD")
SCRIPT_DIR = Path(__file__).resolve().parent
OCR_SCRIPT = SCRIPT_DIR / "ocr_pdf_pages_jxa.js"

IP_PATTERN = re.compile(r"(?<!\d)(?:\d{2,3}[.，。]){3}\d{1,3}(?!\d)")
TIME_PATTERN = re.compile(
    r"\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日\s*\d{1,2}\s*[:：]\s*\d{2}(?:\s*[:：.]\s*\d{1,2})?"
)
WATERMARK_DATE_ONLY_PATTERN = re.compile(r"2026\s*年\s*5\s*月\s*18\s*日")
WATERMARK_TIME_FRAGMENT_PATTERN = re.compile(
    r"(?:\d{2,4}\s*年\s*)?(?:(?:\d{1,2}\s*)?月\s*)?\d{1,2}\s*日\s*\d{1,2}\s*(?:(?:[:：.]\s*)?\d{1,2}){0,2}"
)
KNOWN_WATERMARK_PATTERNS = [
    re.compile(r"xjnychanpin", re.I),
    re.compile(r"北京小桔新能源汽车科技有限公司"),
]
KNOWN_WATERMARK_TEXTS = {"侯可军"}
FORMULA_CHARS = set("=＝×*/＋+-－−≤≥<>∑Σ√{}_")
FORMULA_KEYWORDS = (
    "计算公式",
    "公式如下",
    "其中，",
    "当 ",
    "若 ",
    "取值",
    "系数",
    "电价",
    "电量",
    "费用",
)
GARBLED_PATTERN = re.compile(r"�")


@dataclass
class PageResult:
    page: int
    source: str
    text: str
    raw_text: str = ""
    ocr_used: bool = False
    watermark_removed_count: int = 0
    formula_count: int = 0
    table_count: int = 0
    formula_review_required: bool = False
    warnings: list[str] = field(default_factory=list)
    formula_asset_paths: list[str] = field(default_factory=list)


@dataclass
class FileReport:
    pdf_file: str
    md_file: str
    page_count: int = 0
    output_char_count: int = 0
    watermark_removed_count: int = 0
    formula_count: int = 0
    table_count: int = 0
    ocr_used: bool = False
    has_warnings: bool = False
    warnings: list[str] = field(default_factory=list)
    conversion_method: str = ""
    formula_review_required: bool = False
    watermark_residual_risk: bool = False
    sample_pages: dict[str, int | None] = field(default_factory=dict)
    status: str = "success"
    error: str = ""


def normalize_for_count(text: str) -> str:
    text = text.strip()
    text = re.sub(r"\s+", "", text)
    text = text.replace("：", ":").replace("，", ".").replace("。", ".")
    return text


def is_known_watermark_text(text: str) -> bool:
    compact = normalize_for_count(text)
    if not compact:
        return False
    if IP_PATTERN.fullmatch(compact) or TIME_PATTERN.search(compact):
        return True
    if WATERMARK_DATE_ONLY_PATTERN.fullmatch(compact):
        return True
    if WATERMARK_TIME_FRAGMENT_PATTERN.fullmatch(compact):
        return True
    if any(pattern.search(compact) for pattern in KNOWN_WATERMARK_PATTERNS):
        return True
    if compact in KNOWN_WATERMARK_TEXTS:
        return True
    if re.fullmatch(r"(侯可军){2,}", compact):
        return True
    # Common OCR variants/fragments of the same diagonal IP watermark.
    digits = re.sub(r"\D", "", compact)
    if digits.startswith("22112") and len(digits) >= 8 and len(compact) <= 16:
        return True
    if compact in {"12.30", ".12.30", "221.1230.35", "221.，1230.35"}:
        return True
    return False


def split_text_lines(text: str) -> list[str]:
    return [line.strip() for line in (text or "").splitlines() if line.strip()]


def detect_repeated_watermarks(page_texts: list[str]) -> set[str]:
    page_presence: dict[str, set[int]] = defaultdict(set)
    total_counts: Counter[str] = Counter()
    for page_idx, text in enumerate(page_texts, start=1):
        for line in split_text_lines(text):
            compact = normalize_for_count(line)
            if not compact or len(compact) > 40:
                continue
            if is_known_watermark_text(line) or len(compact) <= 20:
                page_presence[compact].add(page_idx)
                total_counts[compact] += 1
    page_count = max(1, len(page_texts))
    repeated: set[str] = set()
    for compact, pages in page_presence.items():
        count = total_counts[compact]
        if is_known_watermark_text(compact):
            if len(pages) >= 2 or count >= 4:
                repeated.add(compact)
        elif len(pages) >= max(3, int(page_count * 0.25)) and count >= len(pages):
            repeated.add(compact)
    return repeated


def remove_watermark_lines(lines: list[str], repeated: set[str]) -> tuple[list[str], int, bool]:
    cleaned: list[str] = []
    removed = 0
    residual_risk = False
    for line in lines:
        compact = normalize_for_count(line)
        if not compact:
            continue
        if compact in repeated or is_known_watermark_text(compact):
            removed += 1
            continue
        stripped = line
        for pattern in KNOWN_WATERMARK_PATTERNS:
            before = stripped
            stripped = pattern.sub("", stripped)
            if before != stripped:
                removed += 1
        before = stripped
        stripped = IP_PATTERN.sub("", stripped)
        stripped = TIME_PATTERN.sub("", stripped)
        stripped = WATERMARK_DATE_ONLY_PATTERN.sub("", stripped)
        stripped = WATERMARK_TIME_FRAGMENT_PATTERN.sub("", stripped)
        if before != stripped:
            removed += 1
        stripped = re.sub(r"(?:侯可军\s*){2,}", "", stripped)
        stripped = re.sub(r"\s+[年月日：:]+$", "", stripped)
        stripped = stripped.strip()
        if re.fullmatch(r"[年月日：:]+", stripped):
            removed += 1
            continue
        if stripped:
            if is_possible_residual_watermark(stripped):
                residual_risk = True
            cleaned.append(stripped)
    return cleaned, removed, residual_risk


def is_possible_residual_watermark(text: str) -> bool:
    compact = normalize_for_count(text)
    if any(pattern.search(compact) for pattern in KNOWN_WATERMARK_PATTERNS):
        return True
    if IP_PATTERN.search(compact) or TIME_PATTERN.search(compact):
        return True
    if WATERMARK_DATE_ONLY_PATTERN.search(compact):
        return True
    if WATERMARK_TIME_FRAGMENT_PATTERN.search(compact):
        return True
    if compact.count("侯可军") >= 2:
        return True
    return False


def clean_chinese_spacing(text: str) -> str:
    text = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])", "", text)
    text = re.sub(r"\s+([，。；：、！？）】》])", r"\1", text)
    text = re.sub(r"([（【《])\s+", r"\1", text)
    text = re.sub(r"\s{3,}", "  ", text)
    return text.strip()


def maybe_heading(line: str) -> str:
    raw = line.strip()
    compact = re.sub(r"\s+", "", raw)
    if not compact:
        return ""
    if compact in {"目录", "附件", "附表"}:
        return f"## {compact}"
    if re.match(r"^第[一二三四五六七八九十百零〇]+章", compact):
        return "## " + clean_chinese_spacing(raw)
    if re.match(r"^第[一二三四五六七八九十百零〇]+条", compact):
        return "### " + clean_chinese_spacing(raw)
    if re.match(r"^[一二三四五六七八九十]+、", compact) and len(compact) <= 45:
        return "## " + clean_chinese_spacing(raw)
    if re.match(r"^附(件|表)\s*[一二三四五六七八九十\d]*", compact) and len(compact) <= 50:
        return "## " + clean_chinese_spacing(raw)
    return clean_chinese_spacing(raw)


def looks_formula_line(line: str) -> bool:
    compact = re.sub(r"\s+", "", line)
    if len(compact) < 3:
        return False
    strong_ops = set("=＝×*/－−≤≥<>∑Σ√")
    has_strong_op = any(ch in compact for ch in strong_ops)
    if not has_strong_op:
        return False
    if any(keyword in line for keyword in FORMULA_KEYWORDS) and (
        re.search(r"[A-Za-zα-ωΑ-Ω]", compact) or "=" in compact or "＝" in compact
    ):
        return True
    formula_char_count = sum(1 for ch in compact if ch in FORMULA_CHARS)
    latin_or_symbol = len(re.findall(r"[A-Za-zα-ωΑ-Ω]", compact))
    has_qpr = bool(re.search(r"[QPRKJh]\s*[\u4e00-\u9fffA-Za-z0-9_]*", line))
    if "=" in compact or "＝" in compact:
        return formula_char_count >= 1 and (latin_or_symbol >= 1 or has_qpr or len(compact) <= 90)
    if ("×" in compact or "∑" in compact or "≤" in compact or "≥" in compact) and (latin_or_symbol >= 1 or has_qpr):
        return True
    return False


def format_formula_block(lines: list[str]) -> tuple[list[str], int]:
    out: list[str] = []
    formula_count = 0
    in_formula = False
    formula_buffer: list[str] = []

    def flush() -> None:
        nonlocal formula_count, formula_buffer, in_formula
        if formula_buffer:
            out.append("$$")
            out.extend(formula_buffer)
            out.append("$$")
            out.append("")
            formula_count += 1
        formula_buffer = []
        in_formula = False

    for line in lines:
        clean = maybe_heading(line)
        if not clean:
            flush()
            continue
        starts_formula_context = any(key in clean for key in ("计算公式如下", "公式如下"))
        if starts_formula_context:
            flush()
            out.append(clean)
            in_formula = True
            continue
        if in_formula and (looks_formula_line(clean) or re.match(r"^[A-Za-zQPRKJhα-ωΑ-Ω]", clean)):
            formula_buffer.append(clean)
            continue
        if looks_formula_line(clean):
            flush()
            formula_buffer.append(clean)
            flush()
            continue
        flush()
        out.append(clean)
    flush()
    return out, formula_count


def count_table_lines(lines: list[str]) -> int:
    count = 0
    for line in lines:
        if line.count("|") >= 2:
            count += 1
        elif len(re.findall(r"\s{2,}", line)) >= 2 and len(line) < 160:
            count += 1
    return count


def markdown_table_from_rows(rows: list[list[str]]) -> list[str]:
    if not rows:
        return []
    col_count = max(len(row) for row in rows)
    if col_count < 2:
        return [" ".join(rows[0])]
    normalized = []
    for row in rows:
        normalized.append([clean_chinese_spacing(cell) for cell in row] + [""] * (col_count - len(row)))
    out = ["| " + " | ".join(normalized[0]) + " |"]
    out.append("|" + "|".join(["---"] * col_count) + "|")
    for row in normalized[1:]:
        out.append("| " + " | ".join(row) + " |")
    return out


def render_table_like_lines(lines: list[str]) -> tuple[list[str], int]:
    out: list[str] = []
    table_count = 0
    pending: list[list[str]] = []

    def flush() -> None:
        nonlocal table_count, pending
        if len(pending) >= 2:
            out.extend(markdown_table_from_rows(pending))
            out.append("")
            table_count += 1
        elif pending:
            out.extend(clean_chinese_spacing(" ".join(row)) for row in pending)
        pending = []

    for line in lines:
        if "|" in line and line.count("|") >= 2:
            cells = [cell.strip() for cell in line.strip("|").split("|") if cell.strip()]
            if len(cells) >= 2:
                pending.append(cells)
                continue
        split_cells = [cell.strip() for cell in re.split(r"\s{2,}", line) if cell.strip()]
        if len(split_cells) >= 3 and len(line) < 180:
            pending.append(split_cells)
            continue
        flush()
        out.append(line)
    flush()
    return out, table_count


def group_ocr_observations(observations: list[dict[str, Any]], repeated: set[str]) -> tuple[list[str], int, bool]:
    filtered: list[dict[str, Any]] = []
    removed = 0
    residual_risk = False
    for obs in observations:
        text = str(obs.get("text", "")).strip()
        compact = normalize_for_count(text)
        if not compact:
            continue
        if compact in {"年", "月", "日"}:
            removed += 1
            continue
        if compact in repeated or is_known_watermark_text(compact):
            removed += 1
            continue
        left = float(obs.get("x", 0))
        top = 1 - float(obs.get("y", 0)) - float(obs.get("h", 0))
        if re.fullmatch(r"[.\d，。]+", compact) and len(compact) <= 10 and (left < 0.12 or left > 0.80 or top < 0.08 or top > 0.88):
            removed += 1
            continue
        if float(obs.get("confidence", 1.0)) < 0.35 and is_possible_residual_watermark(text):
            removed += 1
            continue
        if is_possible_residual_watermark(text):
            residual_risk = True
        obs = dict(obs)
        obs["top"] = top
        obs["left"] = left
        obs["height"] = float(obs.get("h", 0))
        obs["text"] = text
        filtered.append(obs)

    filtered.sort(key=lambda item: (item["top"], item["left"]))
    rows: list[list[dict[str, Any]]] = []
    for obs in filtered:
        if not rows:
            rows.append([obs])
            continue
        row = rows[-1]
        row_top = sum(item["top"] for item in row) / len(row)
        tolerance = max(0.012, max(item["height"] for item in row + [obs]) * 0.55)
        if abs(obs["top"] - row_top) <= tolerance:
            row.append(obs)
        else:
            rows.append([obs])

    lines: list[str] = []
    for row in rows:
        row.sort(key=lambda item: item["left"])
        if len(row) >= 3:
            gaps = [row[i]["left"] - (row[i - 1]["left"] + float(row[i - 1].get("w", 0))) for i in range(1, len(row))]
            if sum(1 for gap in gaps if gap > 0.035) >= 2:
                cells = [clean_chinese_spacing(item["text"]) for item in row]
                lines.append("| " + " | ".join(cells) + " |")
                continue
        parts: list[str] = []
        previous_right = None
        for item in row:
            text = clean_chinese_spacing(item["text"])
            if not text:
                continue
            if previous_right is not None:
                gap = item["left"] - previous_right
                if gap > 0.08:
                    parts.append("  ")
                elif gap > 0.02:
                    parts.append(" ")
            parts.append(text)
            previous_right = item["left"] + float(item.get("w", 0))
        line = clean_chinese_spacing("".join(parts))
        if line:
            lines.append(line)
    cleaned_lines, inline_removed, inline_risk = remove_watermark_lines(lines, set())
    return cleaned_lines, removed + inline_removed, inline_risk


def run_ocr(pdf_path: Path, start_page: int, end_page: int, scale: float) -> dict[int, dict[str, Any]]:
    cmd = [
        "osascript",
        "-l",
        "JavaScript",
        str(OCR_SCRIPT),
        str(pdf_path),
        str(start_page),
        str(end_page),
        str(scale),
    ]
    proc = subprocess.run(cmd, text=True, capture_output=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout).strip() or f"OCR failed with code {proc.returncode}")
    pages: dict[int, dict[str, Any]] = {}
    for line in (proc.stdout + "\n" + proc.stderr).splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        data = json.loads(line)
        pages[int(data["page"])] = data
    return pages


def render_page_asset(pdf_path: Path, page_no: int, asset_path: Path, scale: float = 2.0) -> None:
    asset_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "osascript",
        "-l",
        "JavaScript",
        str(OCR_SCRIPT),
        str(pdf_path),
        str(page_no),
        str(page_no),
        str(scale),
        str(asset_path),
    ]
    subprocess.run(cmd, text=True, capture_output=True, check=False)


def extract_pypdf_pages(reader: PdfReader) -> tuple[list[str], list[str]]:
    plain_pages: list[str] = []
    layout_pages: list[str] = []
    for page in reader.pages:
        plain_pages.append(page.extract_text() or "")
        try:
            layout_pages.append(page.extract_text(extraction_mode="layout") or "")
        except Exception:
            layout_pages.append(plain_pages[-1])
    return plain_pages, layout_pages


def use_text_layer(cleaned_lines: list[str], raw_text: str) -> bool:
    joined = "\n".join(cleaned_lines)
    if len(joined) < 280:
        return False
    raw_len = max(1, len(raw_text.strip()))
    if len(joined) / raw_len < 0.35:
        return False
    cjk_count = len(re.findall(r"[\u4e00-\u9fff]", joined))
    return cjk_count >= 80


def choose_title(pdf_path: Path, pages: list[PageResult]) -> str:
    stem_title = re.sub(r"^【\d+】\d?", "", pdf_path.stem).strip()
    candidates: list[str] = []
    for page in pages[:3]:
        for line in split_text_lines(page.text):
            compact = re.sub(r"\s+", "", line)
            if not compact or compact.startswith("<!--"):
                continue
            if "|" in line or WATERMARK_TIME_FRAGMENT_PATTERN.search(compact):
                continue
            if compact in {"文件", "通知", "目录"} or re.fullmatch(r"[—\-–一\d]+", compact):
                continue
            if len(compact) >= 8 and not is_possible_residual_watermark(compact):
                candidates.append(clean_chinese_spacing(line.lstrip("#").strip()))
    if candidates:
        title = max(candidates[:8], key=len)
        if len(title) <= 60:
            return title
    return stem_title


def validate_markdown(md_text: str, report: FileReport, pdf_name: str) -> None:
    warnings = report.warnings
    if not md_text.strip():
        warnings.append("Markdown 输出为空")
    if GARBLED_PATTERN.search(md_text) and len(GARBLED_PATTERN.findall(md_text)) >= 3:
        warnings.append("检测到较多替换字符 �")
    if re.search(r"\n{5,}", md_text):
        warnings.append("检测到大量连续空行")
    if any(is_possible_residual_watermark(line) for line in md_text.splitlines()):
        report.watermark_residual_risk = True
        warnings.append("存在明显水印残留风险，需人工复核")
    if report.formula_count > 0 and "$$" not in md_text and "公式需人工复核" not in md_text:
        warnings.append("检测到公式页但未发现 LaTeX 块或复核标记")
    page_markers = len(re.findall(rf"<!-- source: {re.escape(pdf_name)} \| page: \d+ -->", md_text))
    if page_markers != report.page_count:
        warnings.append(f"页码标记数量异常：{page_markers}/{report.page_count}")
    report.has_warnings = bool(warnings)


def build_page_markdown(pdf_name: str, page: PageResult) -> str:
    lines = [f"<!-- source: {pdf_name} | page: {page.page} -->", ""]
    page_lines = split_text_lines(page.text)
    page_lines, table_count = render_table_like_lines(page_lines)
    page.table_count += table_count
    formatted_lines, formula_count = format_formula_block(page_lines)
    page.formula_count += formula_count
    lines.extend(formatted_lines)
    if page.formula_review_required:
        lines.append("")
        lines.append("> 公式需人工复核：本页公式来自 OCR 或版式碎片化抽取，已尽量保留文本。")
        for asset in page.formula_asset_paths:
            lines.append(f"![formula-review-page-{page.page}]({asset})")
    lines.append("")
    return "\n".join(lines)


def convert_pdf(pdf_path: Path, input_dir: Path, output_dir: Path, converted_at: str, scale: float) -> FileReport:
    relative_pdf = pdf_path.relative_to(input_dir)
    relative_md = relative_pdf.with_suffix(".md")
    md_path = output_dir / relative_md
    asset_dir = output_dir / "assets" / relative_pdf.with_suffix("").as_posix()
    if asset_dir.exists():
        shutil.rmtree(asset_dir)
    report = FileReport(pdf_file=str(relative_pdf), md_file=str(relative_md))
    reader = PdfReader(str(pdf_path))
    report.page_count = len(reader.pages)
    plain_pages, layout_pages = extract_pypdf_pages(reader)
    repeated_text = detect_repeated_watermarks(plain_pages + layout_pages)

    cleaned_text_pages: dict[int, list[str]] = {}
    text_layer_good_pages: set[int] = set()
    for idx, raw_text in enumerate(layout_pages, start=1):
        lines, removed, residual = remove_watermark_lines(split_text_lines(raw_text), repeated_text)
        if use_text_layer(lines, raw_text):
            text_layer_good_pages.add(idx)
        cleaned_text_pages[idx] = lines

    ocr_needed = [page_no for page_no in range(1, report.page_count + 1) if page_no not in text_layer_good_pages]
    ocr_pages: dict[int, dict[str, Any]] = {}
    if ocr_needed:
        # Run whole-document OCR once; mixed PDFs still benefit from OCR page screenshots and uniform handling.
        ocr_pages = run_ocr(pdf_path, 1, report.page_count, scale)
        report.ocr_used = True

    repeated_ocr: set[str] = set()
    if ocr_pages:
        page_texts = []
        for page_no in range(1, report.page_count + 1):
            obs_text = "\n".join(str(obs.get("text", "")) for obs in ocr_pages.get(page_no, {}).get("observations", []))
            page_texts.append(obs_text)
        repeated_ocr = detect_repeated_watermarks(page_texts)

    pages: list[PageResult] = []
    for page_no in range(1, report.page_count + 1):
        warnings: list[str] = []
        if page_no in text_layer_good_pages:
            raw = layout_pages[page_no - 1]
            lines, removed, residual_risk = remove_watermark_lines(split_text_lines(raw), repeated_text)
            source = "pypdf-layout"
            ocr_used = False
        else:
            data = ocr_pages.get(page_no, {"observations": []})
            lines, removed, residual_risk = group_ocr_observations(data.get("observations", []), repeated_ocr)
            raw = "\n".join(obs.get("text", "") for obs in data.get("observations", []))
            source = "macos-vision-ocr"
            ocr_used = True
            if not lines:
                warnings.append("本页 OCR 未识别到有效正文")
        line_formula_count = sum(1 for line in lines if looks_formula_line(line))
        formula_review = bool(line_formula_count and ocr_used)
        asset_paths: list[str] = []
        if formula_review:
            asset_path = asset_dir / f"page-{page_no:03d}-formula-review.png"
            render_page_asset(pdf_path, page_no, asset_path, scale=2.0)
            asset_paths.append(str(asset_path.relative_to(output_dir)))
            warnings.append("公式需人工复核")
        if residual_risk:
            warnings.append("疑似水印残留，需人工复核")
        page_result = PageResult(
            page=page_no,
            source=source,
            text="\n".join(lines),
            raw_text=raw,
            ocr_used=ocr_used,
            watermark_removed_count=removed,
            formula_count=line_formula_count,
            formula_review_required=formula_review,
            warnings=warnings,
            formula_asset_paths=asset_paths,
        )
        pages.append(page_result)

    title = choose_title(pdf_path, pages)
    page_markdown = [build_page_markdown(pdf_path.name, page) for page in pages]
    report.watermark_removed_count = sum(page.watermark_removed_count for page in pages)
    report.formula_count = sum(page.formula_count for page in pages)
    report.table_count = sum(page.table_count for page in pages)
    report.formula_review_required = any(page.formula_review_required for page in pages)
    report.conversion_method = "mixed:pypdf-layout+macos-vision-ocr" if report.ocr_used else "pypdf-layout"
    report.warnings = sorted({warning for page in pages for warning in page.warnings})

    front_matter = [
        "---",
        f'source_pdf: "{pdf_path.name}"',
        f'converted_at: "{converted_at}"',
        f"page_count: {report.page_count}",
        f'conversion_method: "{report.conversion_method}"',
        f"watermark_cleaned: {str(report.watermark_removed_count > 0).lower()}",
        f"ocr_used: {str(report.ocr_used).lower()}",
        f"formula_review_required: {str(report.formula_review_required).lower()}",
        "---",
        "",
        f"# {title}",
        "",
    ]
    md_text = "\n".join(front_matter + page_markdown)
    md_text = re.sub(r"\n{4,}", "\n\n\n", md_text).strip() + "\n"
    md_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text(md_text, encoding="utf-8")

    report.output_char_count = len(md_text)
    formula_pages = [page.page for page in pages if page.formula_count > 0]
    report.sample_pages = {
        "first": 1 if report.page_count else None,
        "toc": find_toc_page(pages),
        "body": find_body_page(pages),
        "formula": formula_pages[0] if formula_pages else None,
    }
    validate_markdown(md_text, report, pdf_path.name)
    return report


def find_toc_page(pages: list[PageResult]) -> int | None:
    for page in pages:
        if "目录" in page.text:
            return page.page
    return None


def find_body_page(pages: list[PageResult]) -> int | None:
    for page in pages:
        if len(page.text) > 500 and ("第" in page.text or "一、" in page.text):
            return page.page
    for page in pages:
        if len(page.text) > 300:
            return page.page
    return None


def write_index(output_dir: Path, reports: list[FileReport]) -> None:
    lines = [
        "# 湖南交易中心 2026年执行政策 Markdown 转换索引",
        "",
        "| 序号 | 原PDF | Markdown | 页数 | 是否使用OCR | 是否有公式复核 | 备注 |",
        "|---|---|---|---:|---|---|---|",
    ]
    for idx, report in enumerate(reports, start=1):
        note = "；".join(report.warnings[:3]) if report.warnings else ""
        if report.status != "success":
            note = report.error or "转换失败"
        lines.append(
            f"| {idx} | {report.pdf_file} | {report.md_file} | {report.page_count} | "
            f"{'是' if report.ocr_used else '否'} | {'是' if report.formula_review_required else '否'} | {note} |"
        )
    (output_dir / "index.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_reports(output_dir: Path, reports: list[FileReport], pdfs: list[Path]) -> None:
    manifest_lines = [str(path) for path in pdfs]
    (output_dir / "pdf_file_manifest.txt").write_text("\n".join(manifest_lines) + "\n", encoding="utf-8")

    report_dicts = []
    for report in reports:
        item = {
            "pdf_file": report.pdf_file,
            "md_file": report.md_file,
            "page_count": report.page_count,
            "output_char_count": report.output_char_count,
            "watermark_removed_count": report.watermark_removed_count,
            "formula_count": report.formula_count,
            "table_count": report.table_count,
            "ocr_used": report.ocr_used,
            "has_warnings": report.has_warnings,
            "warnings": report.warnings,
            "conversion_method": report.conversion_method,
            "formula_review_required": report.formula_review_required,
            "watermark_residual_risk": report.watermark_residual_risk,
            "sample_pages": report.sample_pages,
            "status": report.status,
            "error": report.error,
        }
        report_dicts.append(item)
    (output_dir / "conversion_report.json").write_text(
        json.dumps(report_dicts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    csv_fields = [
        "pdf_file",
        "md_file",
        "page_count",
        "output_char_count",
        "watermark_removed_count",
        "formula_count",
        "table_count",
        "ocr_used",
        "has_warnings",
        "warnings",
    ]
    with (output_dir / "conversion_report.csv").open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=csv_fields)
        writer.writeheader()
        for report in reports:
            writer.writerow(
                {
                    "pdf_file": report.pdf_file,
                    "md_file": report.md_file,
                    "page_count": report.page_count,
                    "output_char_count": report.output_char_count,
                    "watermark_removed_count": report.watermark_removed_count,
                    "formula_count": report.formula_count,
                    "table_count": report.table_count,
                    "ocr_used": report.ocr_used,
                    "has_warnings": report.has_warnings,
                    "warnings": "；".join(report.warnings),
                }
            )

    failed = [report for report in reports if report.status != "success"]
    failed_lines = [f"{report.pdf_file}\t{report.error}" for report in failed]
    (output_dir / "failed_files.txt").write_text("\n".join(failed_lines) + ("\n" if failed_lines else ""), encoding="utf-8")


def ensure_every_pdf_has_md(pdfs: list[Path], input_dir: Path, output_dir: Path, reports: list[FileReport]) -> None:
    report_by_pdf = {report.pdf_file: report for report in reports}
    for pdf in pdfs:
        rel = pdf.relative_to(input_dir)
        report = report_by_pdf.get(str(rel))
        if not report or report.status != "success":
            continue
        md_path = output_dir / rel.with_suffix(".md")
        if not md_path.exists():
            report.status = "failed"
            report.error = "缺少对应 Markdown 输出"
            report.has_warnings = True
            report.warnings.append("缺少对应 Markdown 输出")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert Hunan policy PDFs to RAG-friendly Markdown.")
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--ocr-scale", type=float, default=2.0)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_dir = args.input_dir.expanduser().resolve()
    output_dir = args.output_dir.expanduser().resolve()
    if not input_dir.exists():
        print(f"输入目录不存在：{input_dir}", file=sys.stderr)
        return 2
    if not OCR_SCRIPT.exists():
        print(f"OCR 辅助脚本不存在：{OCR_SCRIPT}", file=sys.stderr)
        return 2

    pdfs = sorted(input_dir.rglob("*.pdf"))
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "assets").mkdir(parents=True, exist_ok=True)

    print(f"发现 PDF：{len(pdfs)}")
    for path in pdfs:
        print(f"- {path}")

    reports: list[FileReport] = []
    converted_at = datetime.now().astimezone().isoformat(timespec="seconds")
    for idx, pdf_path in enumerate(pdfs, start=1):
        rel = pdf_path.relative_to(input_dir)
        print(f"[{idx}/{len(pdfs)}] 转换：{rel}", flush=True)
        try:
            report = convert_pdf(pdf_path, input_dir, output_dir, converted_at, scale=args.ocr_scale)
            reports.append(report)
            print(
                f"  OK 页数={report.page_count} OCR={'是' if report.ocr_used else '否'} "
                f"公式={report.formula_count} 表格={report.table_count} 警告={len(report.warnings)}",
                flush=True,
            )
        except Exception as exc:  # noqa: BLE001
            report = FileReport(pdf_file=str(rel), md_file=str(rel.with_suffix(".md")), status="failed", error=str(exc))
            report.has_warnings = True
            report.warnings = [str(exc)]
            reports.append(report)
            print(f"  FAILED {exc}", flush=True)

    ensure_every_pdf_has_md(pdfs, input_dir, output_dir, reports)
    write_index(output_dir, reports)
    write_reports(output_dir, reports, pdfs)

    success = sum(1 for report in reports if report.status == "success")
    failed = len(reports) - success
    formula_review = any(report.formula_review_required for report in reports)
    watermark_risk = any(report.watermark_residual_risk for report in reports)
    failed_reports = [report for report in reports if report.status != "success"]

    print("\n=== 转换完成 ===")
    print(f"总共发现 PDF：{len(pdfs)}")
    print(f"成功转换：{success}")
    print(f"失败：{failed}")
    print(f"输出目录：{output_dir}")
    print(f"转换报告 CSV：{output_dir / 'conversion_report.csv'}")
    print(f"转换报告 JSON：{output_dir / 'conversion_report.json'}")
    print(f"是否存在公式需人工复核：{'是' if formula_review else '否'}")
    print(f"是否存在水印残留风险：{'是' if watermark_risk else '否'}")
    if failed_reports:
        print("失败文件列表和原因：")
        for report in failed_reports:
            print(f"- {report.pdf_file}: {report.error}")
    else:
        print("失败文件列表和原因：无")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
