#!/usr/bin/env python3
"""Repair Shaanxi policy PDF parse outputs with the local policy-PDF workflow."""

from __future__ import annotations

import html
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

sys.path.insert(0, str(TOOLS_DIR))
sys.path.insert(0, str(WORKSPACE / "scripts"))

import convert_md_to_html as md_to_html  # type: ignore  # noqa: E402
import convert_pdfs_to_md as pdf_to_md  # type: ignore  # noqa: E402
import markdown_to_structured_json as md_to_json  # type: ignore  # noqa: E402
from parse_hunan_policy_pdfs_with_skill import render_formula_blocks  # type: ignore  # noqa: E402


PUNCT_END = tuple("。！？；：.!?;:")
CN_NUM = "一二三四五六七八九十百千万零〇两"
PAGE_MARK_RE = re.compile(r"^[—\-－–]?\s*[一二三四五六七八九十百千万\d]+\s*[—\-－–]+\s*$")
DOT_LEADER_RE = re.compile(r"[.。·⋯…]{4,}\s*\d*\s*$")
TOC_PAGE_RE = re.compile(r"\.{4,}\s*\d+\s*$")
IMAGE_RE = re.compile(r"^!\[[^\]]*\]\([^)]+\)$")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$")
CHAPTER_RE = re.compile(rf"^(第[{CN_NUM}]+章)\s*(.*)$")
SECTION_RE = re.compile(rf"^(第[{CN_NUM}]+节)\s*(.*)$")
ARTICLE_RE = re.compile(rf"^(第[{CN_NUM}]+条)\s*(.*)$")
NUMERIC_DOTTED_HEADING_RE = re.compile(r"^(\d+\.\d+(?:\.\d+)*)(?:[.．])?\s*(.+)$")
NUMERIC_MAIN_HEADING_RE = re.compile(r"^(\d+)(?:[.．]|\s+)(.+)$")
STANDALONE_NUM_RE = re.compile(r"^\d{1,2}[.．]?$")
CN_OUTLINE_RE = re.compile(rf"^([{CN_NUM}]+)、([^（(。；：:，,]{{1,28}})(.*)$")
CN_ENUM_RE = re.compile(rf"^([（(][{CN_NUM}]+[）)])\s*(.+)$")
PAREN_DIGIT_RE = re.compile(r"^([（(]\d+[）)])\s*(.+)$")
BODY_START_RE = re.compile(
    rf"^(?:#{{1,6}}\s*)?(?:"
    rf"(?:\d+[.．]?\s*)?(?:总述|概述|适用范围|引用文件|术语定义|基本要求)"
    rf"|第[{CN_NUM}]+章\s*总则"
    rf"|一、\s*工作目标"
    rf")"
)
STRUCTURAL_MARKER_RE = re.compile(rf"第[{CN_NUM}]+(?:章|节|条)")
KNOWN_NUMERIC_TITLES = tuple(
    sorted(
        {
            "总述",
            "概述",
            "适用范围",
            "引用文件",
            "术语定义",
            "市场成员",
            "日前省内现货交易",
            "实时省内现货交易",
            "市场衔接机制",
            "市场力监测与管控",
            "发电侧偏差考核机制",
            "特殊情况处理机制",
            "附则",
            "基本要求",
            "职责分工",
            "关口电能计量设备管理",
            "计量数据管理",
            "封印管理",
            "数据拟合规则",
            "相关术语",
            "省间现货购电",
            "交易申报预校核",
            "交易执行偏差处理",
            "违约考核",
            "结算管理",
            "组织方式",
            "边界条件",
            "市场核定参数",
            "事前信息发布",
            "交易申报",
            "交易出清",
            "组织流程",
            "事后发布及结算",
            "日前电能量市场的交易组织流程",
            "日前电能量市场出清数学模型",
            "特殊机组在日前电能量市场中的出清机制",
            "日前电能量市场安全校核",
            "日前电能量市场定价",
            "日前调度计划",
            "实时电能量市场的交易组织流程",
            "实时电能量市场出清数学模型",
            "特殊机组在实时电能量市场中的出清机制",
            "实时电能量市场安全校核",
            "实时电能量市场定价",
            "实时运行调整",
            "其他说明事项",
            "工作联系人",
            "关口电能计量设备管理目的",
            "关口电能计量设备管理要求",
        },
        key=len,
        reverse=True,
    )
)


ORIGINAL_IS_FORMULA_LINE = pdf_to_md.is_formula_line
ORIGINAL_SHOULD_RENDER_FORMULA_PARAGRAPH = pdf_to_md.should_render_formula_paragraph
ORIGINAL_COLLAPSE_IMAGE_BLOCKS = md_to_json.collapse_image_blocks


def target_pdfs() -> list[Path]:
    return sorted(POLICY_DIR.glob("*.pdf"))


def backup_outputs(pdfs: list[Path]) -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_dir = Path("/private/tmp") / f"shaanxi_policy_pdf_parse_{stamp}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    for pdf in pdfs:
        stem = pdf.stem
        candidates = [
            pdf.with_suffix(".md"),
            pdf.with_suffix(".html"),
            pdf.parent / f"{stem}_assets",
            ZC_HTML_DIR / f"{stem}.html",
            ZC_HTML_DIR / f"{stem}.zc_skill.html",
            ZC_HTML_DIR / f"{stem}.json",
            ZC_STRUCTURED_DIR / f"{stem}.structured.json",
            ZC_STRUCTURED_DIR / f"{stem}.zc_skill.structured.json",
            ZC_STRUCTURED_DIR / f"{stem}.zc_skill.report.md",
        ]
        for path in candidates:
            if not path.exists():
                continue
            rel = path.relative_to(POLICY_DIR)
            dest = backup_dir / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            if path.is_dir():
                shutil.copytree(path, dest, dirs_exist_ok=True)
            else:
                shutil.copy2(path, dest)
    return backup_dir


def looks_like_policy_reference(text: str) -> bool:
    if re.search(r"<[^<>]{2,120}[\u4e00-\u9fff][^<>]{0,120}>", text):
        return True
    if "《" in text or "》" in text:
        return True
    if re.search(r"(?:通知|规则|方案|细则|办法|条例|文件|发改|国能发)", text) and not re.search(r"[=＝∑Σ]", text):
        return True
    return False


def shaanxi_is_formula_line(text: str) -> bool:
    compact = text.strip()
    chinese = len(re.findall(r"[\u4e00-\u9fff]", compact))
    core_math = bool(re.search(r"[=＝∑Σ≤≥+\-*/]", compact))
    if looks_like_policy_reference(compact):
        return False
    if chinese >= 12 and not core_math:
        return False
    if chinese >= 26 and not re.search(r"[=＝∑Σ]", compact):
        return False
    if chinese >= 18 and re.search(r"[，。；：、]", compact) and not re.search(r"[=＝∑Σ]", compact):
        return False
    return ORIGINAL_IS_FORMULA_LINE(text)


def shaanxi_should_render_formula_paragraph(text: str) -> bool:
    compact = text.strip()
    chinese = len(re.findall(r"[\u4e00-\u9fff]", compact))
    if looks_like_policy_reference(compact):
        return False
    if chinese >= 26 and not re.search(r"[=＝∑Σ]", compact):
        return False
    return ORIGINAL_SHOULD_RENDER_FORMULA_PARAGRAPH(text)


def configure_pdf_converter() -> None:
    pdf_to_md.is_formula_line = shaanxi_is_formula_line
    pdf_to_md.should_render_formula_paragraph = shaanxi_should_render_formula_paragraph


def preserve_formula_image_blocks(blocks: list[md_to_html.Block]) -> list[md_to_html.Block]:
    return blocks


def configure_structured_converter() -> None:
    md_to_json.collapse_image_blocks = preserve_formula_image_blocks


def normalize_policy_quotes(text: str) -> str:
    return re.sub(r"<([^<>]{2,160}[\u4e00-\u9fff][^<>]{0,160})>", r"《\1》", text)


def clean_block_text(text: str) -> str:
    text = text.replace("\u3000", " ").replace("\xa0", " ")
    text = normalize_policy_quotes(text)
    text = text.replace("（连续试运行V2.0）", "（连续试运行 V2.0）")
    text = re.sub(r"总\s+述", "总述", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s+([，。；：！？、）】》])", r"\1", text)
    text = re.sub(r"([（【《])\s+", r"\1", text)
    return text.strip()


def is_page_or_toc_noise(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return False
    if DOT_LEADER_RE.search(stripped) or TOC_PAGE_RE.search(stripped):
        return True
    if PAGE_MARK_RE.fullmatch(stripped):
        return True
    if re.fullmatch(r"[.。·⋯… ]+\d*\s*", stripped):
        return True
    if re.fullmatch(r"目|录", stripped):
        return True
    return False


def is_body_start_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped or DOT_LEADER_RE.search(stripped):
        return False
    return bool(BODY_START_RE.match(stripped))


def nonblank_after(lines: list[str], start: int, limit: int = 8) -> list[str]:
    found: list[str] = []
    for idx in range(start, min(len(lines), start + limit)):
        stripped = lines[idx].strip()
        if stripped:
            found.append(stripped)
    return found


def is_fragmented_body_start(lines: list[str], idx: int) -> bool:
    if not STANDALONE_NUM_RE.fullmatch(lines[idx].strip()):
        return False
    fragments = nonblank_after(lines, idx + 1, 8)[:3]
    if any(is_pdf_toc_noise_line(fragment) for fragment in fragments):
        return False
    joined = clean_block_text("".join(fragments)).lstrip("#").strip()
    return joined.startswith(("总述", "概述", "适用范围", "引用文件", "术语定义"))


def is_pdf_toc_noise_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if DOT_LEADER_RE.search(stripped) or TOC_PAGE_RE.search(stripped):
        return True
    if re.fullmatch(r"\.{4,}\s*\d*", stripped):
        return True
    return False


def remove_pdf_toc(markdown_text: str) -> str:
    lines = markdown_text.splitlines()
    toc_start: int | None = None
    for idx, line in enumerate(lines[:260]):
        stripped = line.strip()
        if re.fullmatch(r"#{1,6}\s*目录", stripped) or stripped == "目录":
            toc_start = idx
            break
        if stripped == "目":
            next_nonblank = next((line.strip() for line in lines[idx + 1 : idx + 6] if line.strip()), "")
            if next_nonblank.startswith("录"):
                toc_start = idx
                break
        if stripped.startswith("录") and DOT_LEADER_RE.search(stripped):
            toc_start = idx
            break
    if toc_start is None:
        return markdown_text

    toc_end: int | None = None
    toc_noise_count = 0
    for idx in range(toc_start + 1, len(lines)):
        if is_pdf_toc_noise_line(lines[idx]):
            toc_noise_count += 1
        if idx - toc_start < 8:
            continue
        if toc_noise_count >= 4 and is_body_start_line(lines[idx]):
            toc_end = idx
            break
        if toc_noise_count >= 4 and is_fragmented_body_start(lines, idx):
            toc_end = idx
            break
        if (
            STANDALONE_NUM_RE.fullmatch(lines[idx].strip())
            and idx + 2 < len(lines)
            and is_body_start_line(lines[idx + 2])
        ):
            toc_end = idx
            break
    if toc_end is None:
        return markdown_text
    return "\n".join(lines[:toc_start] + lines[toc_end:])


def split_blocks(markdown_text: str) -> list[str]:
    blocks: list[str] = []
    current: list[str] = []
    for raw in markdown_text.splitlines():
        line = raw.rstrip()
        if not line.strip():
            if current:
                blocks.append("\n".join(current).strip())
                current = []
            continue
        current.append(line)
    if current:
        blocks.append("\n".join(current).strip())
    return blocks


def split_structural_markers(text: str) -> str:
    def replace(match: re.Match[str]) -> str:
        start = match.start()
        if start == 0:
            return match.group(0)
        before = text[max(0, start - 8) : start]
        if before.endswith(("《", "（", "(", "第")):
            return match.group(0)
        if re.search(r"(?:依据|按照|根据|参照|符合|执行|见|所称|规定|第[一二三四五六七八九十百千万零〇两]+条[及和与、])$", before):
            return match.group(0)
        return "\n\n" + match.group(0)

    return STRUCTURAL_MARKER_RE.sub(replace, text)


def strip_heading_marker(block: str) -> tuple[int, str]:
    match = HEADING_RE.match(block.strip())
    if not match:
        return 0, block.strip()
    return len(match.group(1)), match.group(2).strip()


def parse_numeric_heading(text: str) -> tuple[str, str] | None:
    match = NUMERIC_DOTTED_HEADING_RE.match(text)
    if match:
        return match.group(1), match.group(2)
    match = NUMERIC_MAIN_HEADING_RE.match(text)
    if match:
        return match.group(1), match.group(2)
    return None


def title_has_bad_heading_signal(title: str) -> bool:
    if not re.search(r"[\u4e00-\u9fff]", title):
        return True
    if re.match(r"^(?:\d+[）)]|[）)、，,]|[及和与])", title.strip()):
        return True
    if DOT_LEADER_RE.search(title) or TOC_PAGE_RE.search(title):
        return True
    if re.search(r"[=＝∑Σ≤≥<>＜＞]", title):
        return True
    numeric = parse_numeric_heading(title)
    if numeric:
        number, rest = numeric
        rest = rest.strip()
        if re.match(r"^[及和与、，,）)]", rest.strip()):
            return True
        if re.match(r"^(?:为|号[）)]|市场运行产生|因|若|当|其中|按照|根据)", rest):
            return True
        parts_raw = number.split(".")
        if any(part.startswith("0") and len(part) > 1 for part in parts_raw):
            return True
        parts = [int(part) for part in parts_raw if part.isdigit()]
        if not parts or parts[0] > 18 or any(part <= 0 or part > 30 for part in parts[1:]):
            return True
        if re.match(r"^\d+[）)]", rest.strip()):
            return True
    if re.search(r"(?:元/兆瓦时|兆瓦时|千瓦时|装机容量|小时|分钟|供需比|阈值|系数|偏差率|停机小时数)", title):
        return True
    if len(title) > 72:
        return True
    if title.endswith(PUNCT_END):
        return True
    return False


def plausible_numeric_heading(number: str, title: str) -> bool:
    title = clean_block_text(title).strip(" .。")
    if re.match(r"^(?:号[）)]|为|市场运行产生|因|若|当|其中|按照|根据)", title):
        return False
    if title_has_bad_heading_signal(title):
        return False
    parts_raw = number.split(".")
    if any(part.startswith("0") and len(part) > 1 for part in parts_raw):
        return False
    parts = [int(part) for part in number.split(".") if part.isdigit()]
    if not parts or parts[0] <= 0 or parts[0] > 18:
        return False
    if len(parts) > 1 and any(part <= 0 or part > 30 for part in parts[1:]):
        return False
    if len(parts) == 1 and parts[0] > 16 and not re.search(r"附则|争议|免责|法律|责任", title):
        return False
    return True


def split_known_numeric_heading(text: str, original_level: int = 0) -> list[str] | None:
    parsed = parse_numeric_heading(text)
    if not parsed:
        return None
    number, rest = parsed
    rest = clean_block_text(rest)
    if not rest:
        return None
    if DOT_LEADER_RE.search(rest) or TOC_PAGE_RE.search(rest):
        return None
    for title in KNOWN_NUMERIC_TITLES:
        if not rest.startswith(title):
            continue
        remainder = rest[len(title) :].strip()
        if remainder and re.match(r"^(?!\d+[）)])[\dA-Za-z%/＋+\-＜<=]", remainder):
            continue
        if not plausible_numeric_heading(number, title):
            return None
        level = 2 if "." not in number else min(6, number.count(".") + 2)
        blocks = [f"{'#' * level} {number}. {title}"]
        if remainder:
            blocks.append(remainder)
        return blocks
    return None


def split_cn_outline_heading(text: str) -> list[str] | None:
    match = CN_OUTLINE_RE.match(text)
    if not match:
        return None
    number, title, rest = match.groups()
    title = clean_block_text(title)
    rest = clean_block_text(rest)
    if not title or len(title) > 18 or title_has_bad_heading_signal(title):
        return None
    blocks = [f"## {number}、{title}"]
    if rest:
        blocks.append(rest)
    return blocks


def split_intro_heading(text: str) -> list[str] | None:
    stripped = clean_block_text(text)
    for title in ("总述", "概述"):
        if stripped.startswith(title) and len(stripped) > len(title):
            return [f"## 1. {title}", stripped[len(title) :].strip()]
    return None


def heading_from_text(text: str, original_level: int = 0) -> str | None:
    stripped = clean_block_text(text).strip()
    if not stripped:
        return None
    if stripped in {"附件", "附件1", "附件2", "附件3", "附件4", "附件5"}:
        return f"## {stripped}"

    chapter = CHAPTER_RE.match(stripped)
    if chapter and not title_has_bad_heading_signal(chapter.group(2)):
        return f"## {chapter.group(1)} {chapter.group(2).strip()}".rstrip()

    section = SECTION_RE.match(stripped)
    if section and not title_has_bad_heading_signal(section.group(2)):
        return f"### {section.group(1)} {section.group(2).strip()}".rstrip()

    article = ARTICLE_RE.match(stripped)
    if article and original_level and len(article.group(2).strip()) <= 20:
        return f"#### {article.group(1)} {article.group(2).strip()}".rstrip()

    numeric = parse_numeric_heading(stripped)
    if numeric:
        number, title = numeric
        if original_level and plausible_numeric_heading(number, title):
            level = 2 if "." not in number else min(6, number.count(".") + 2)
            return f"{'#' * level} {number}. {clean_block_text(title)}"
        return None

    if original_level and original_level <= 3 and not re.match(r"^\d", stripped) and not title_has_bad_heading_signal(stripped):
        return f"{'#' * original_level} {stripped}"
    return None


def should_merge_blocks(prev: str, curr: str) -> bool:
    prev_level, prev_text = strip_heading_marker(prev)
    curr_level, curr_text = strip_heading_marker(curr)
    if prev_level or curr_level:
        return False
    if IMAGE_RE.fullmatch(prev_text) or IMAGE_RE.fullmatch(curr_text):
        return False
    if re.fullmatch(r"附(?:表|录|件)[一二三四五六七八九十\d]+", prev_text):
        return False
    if STANDALONE_NUM_RE.fullmatch(prev_text) or STANDALONE_NUM_RE.fullmatch(curr_text):
        return False
    if re.search(r"〔\d{4}〕\s*$", prev_text) and re.match(r"^\d+\s*号(?:[）)、，,及和 ]|$)", curr_text):
        return True
    if re.search(r"〔\d{4}\s*$", prev_text) and re.match(r"^〕?\s*\d+\s*号(?:[）)、，,及和 ]|$)", curr_text):
        return True
    if re.match(rf"^(?:第[{CN_NUM}]+[章节条]|[{CN_NUM}]+、|[（(][{CN_NUM}\d]+[）)]|\d+[.．]\s*\S)", curr_text):
        return False
    if prev_text.endswith(PUNCT_END):
        return False
    if len(prev_text) <= 20 and len(curr_text) <= 30:
        return False
    if re.search(r"[\u4e00-\u9fffA-Za-z0-9）》”]$", prev_text) and re.match(r"^[\u4e00-\u9fffA-Za-z0-9（《“]", curr_text):
        return True
    return False


def split_inline_outline(block: str) -> list[str]:
    level, text = strip_heading_marker(block)
    if level or IMAGE_RE.fullmatch(text):
        return [block]
    text = clean_block_text(text)
    text = re.sub(rf"(?<=[。；])([{CN_NUM}]+、)", r"\n\1", text)
    text = re.sub(rf"(?<=[。；])([（(][{CN_NUM}]+[）)])", r"\n\1", text)
    text = re.sub(r"(?<=[。；])([（(]\d+[）)])", r"\n\1", text)
    parts = [part.strip() for part in text.splitlines() if part.strip()]
    if len(parts) <= 1:
        return [block]
    return parts


def normalize_blocks(blocks: list[str]) -> list[str]:
    cleaned: list[str] = []
    idx = 0
    while idx < len(blocks):
        raw = blocks[idx].strip()
        level, text = strip_heading_marker(raw)
        text = clean_block_text(text)
        if not text or is_page_or_toc_noise(text):
            idx += 1
            continue
        if DOT_LEADER_RE.fullmatch(text):
            idx += 1
            continue
        if STANDALONE_NUM_RE.fullmatch(text) and idx + 1 < len(blocks):
            next_level, next_text = strip_heading_marker(blocks[idx + 1])
            next_text = clean_block_text(next_text)
            combined_blocks = split_known_numeric_heading(f"{text.rstrip('.．')} {next_text}", next_level or 2)
            if combined_blocks:
                cleaned.extend(combined_blocks)
                idx += 2
                continue
            idx += 1
            continue
        if IMAGE_RE.fullmatch(text):
            cleaned.append(text)
            idx += 1
            continue
        split_intro = split_intro_heading(text)
        if split_intro:
            cleaned.extend(split_intro)
            idx += 1
            continue
        split_numeric = split_known_numeric_heading(text, level)
        if split_numeric:
            cleaned.extend(split_numeric)
            idx += 1
            continue
        split_cn = split_cn_outline_heading(text)
        if split_cn:
            cleaned.extend(split_cn)
            idx += 1
            continue
        heading = heading_from_text(text, level)
        if heading:
            cleaned.append(heading)
        else:
            cleaned.extend(split_inline_outline(text))
        idx += 1

    merged: list[str] = []
    for block in cleaned:
        if merged and should_merge_blocks(merged[-1], block):
            merged[-1] = clean_block_text(merged[-1] + block)
        else:
            merged.append(block)
    normalized: list[str] = []
    for block in merged:
        split_intro = split_intro_heading(block)
        if split_intro:
            normalized.extend(split_intro)
        else:
            normalized.append(block)
    return normalized


def normalize_generated_markdown(markdown_text: str) -> str:
    markdown_text = remove_pdf_toc(markdown_text)
    markdown_text = split_structural_markers(markdown_text)
    markdown_text = re.sub(r"(?m)^#{1,6}\s*$\n?", "", markdown_text)
    blocks = normalize_blocks(split_blocks(markdown_text))
    text = "\n\n".join(blocks)
    text = re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"
    text = remove_existing_generated_toc(text)
    return insert_generated_toc(text)


def remove_existing_generated_toc(text: str) -> str:
    lines = text.splitlines()
    start = next((idx for idx, line in enumerate(lines) if re.fullmatch(r"##\s+目录", line.strip())), None)
    if start is None:
        return text
    end = None
    for idx in range(start + 1, len(lines)):
        if lines[idx].startswith("## ") and lines[idx].strip() != "## 目录":
            end = idx
            break
    if end is None:
        return text
    return "\n".join(lines[:start] + lines[end:]).strip() + "\n"


def toc_candidate(line: str) -> tuple[int, str] | None:
    match = HEADING_RE.match(line.strip())
    if not match:
        return None
    level = len(match.group(1))
    title = match.group(2).strip()
    if title == "目录" or title.startswith("附件"):
        return None
    if level not in {2, 3}:
        return None
    if title_has_bad_heading_signal(title):
        return None
    if ARTICLE_RE.match(title):
        return None
    return level, title


def collect_toc_entries(text: str) -> list[str]:
    entries: list[str] = []
    seen: set[str] = set()
    for line in text.splitlines():
        candidate = toc_candidate(line)
        if not candidate:
            continue
        level, title = candidate
        if title in seen:
            continue
        seen.add(title)
        indent = "  " * max(0, level - 2)
        entries.append(f"{indent}- {title}")
    return entries


def insert_generated_toc(text: str) -> str:
    entries = collect_toc_entries(text)
    if not entries:
        return text.strip() + "\n"
    lines = text.splitlines()
    first_entry_title = entries[0].lstrip("- ").strip()
    insert_at = None
    for idx, line in enumerate(lines):
        candidate = toc_candidate(line)
        if candidate and candidate[1] == first_entry_title:
            insert_at = idx
            break
    if insert_at is None:
        insert_at = 1
    toc = ["## 目录", "", *entries, ""]
    return "\n".join(lines[:insert_at] + toc + lines[insert_at:]).strip() + "\n"


def inject_toc_css(html_text: str) -> str:
    if ".toc-list" in html_text:
        return html_text
    css = """
    .toc-list {
      margin: 0 0 1.3em;
      padding-left: 1.2em;
      color: var(--muted);
      font-size: 0.96rem;
      line-height: 1.7;
    }
    .toc-list li { margin: 0 0 0.22em; }
"""
    return html_text.replace("    .toc-line {\n", css + "    .toc-line {\n", 1)


def render_generated_toc_lists(html_text: str) -> str:
    pattern = re.compile(
        r'(<h2 class="toc-title">目录</h2>\n)(?P<body>(?:\s*<p class="paragraph">.*?</p>\n?)+)',
        re.S,
    )

    def replace(match: re.Match[str]) -> str:
        body = match.group("body")
        raw = " ".join(html.unescape(item) for item in re.findall(r'<p class="paragraph">(.*?)</p>', body, re.S))
        items = [item.strip() for item in re.split(r"\s*-\s*", raw) if item.strip()]
        if len(items) < 2:
            return match.group(0)
        rendered = "\n".join(f"      <li>{html.escape(item)}</li>" for item in items)
        return f'{match.group(1)}    <ul class="toc-list">\n{rendered}\n    </ul>\n'

    return pattern.sub(replace, inject_toc_css(html_text), count=1)


def postprocess_structured(data: dict) -> dict:
    quality = data.setdefault("quality_report", {})
    formulas = data.get("formulas", [])
    quality["formula_count"] = len(formulas)
    quality["resolved_formula_count"] = sum(1 for item in formulas if item.get("status") == "resolved")
    quality["unresolved_formula_count"] = sum(1 for item in formulas if item.get("status") == "unresolved")
    quality.setdefault("blocking_issues", [])
    note = "已按 parse-pdf-policy-docs 流程重建 MD/HTML；图片公式保留为可展示资产，未逐项人工 LaTeX 化。"
    if note not in quality["blocking_issues"]:
        quality["blocking_issues"].append(note)
    return data


def write_report(stem: str, structured: dict, validation: dict) -> None:
    quality = structured.get("quality_report", {})
    report = f"""# {stem} 解析修复报告

## 修复范围

- 重跑 PDF 文本抽取，并修正陕西文件中政策引用被误判为公式图片的问题。
- 重建 Markdown 目录，清理 PDF 点线页码目录、页脚页码和跨页硬断行。
- 重新生成同名 HTML、ZC_HTML HTML/JSON 与 ZC_STRUCTURED 结构化 JSON。

## 校验结果

- 章节数：{quality.get("chapter_count")}
- 公式/图片公式节点：{quality.get("formula_count")}
- 缺失图片引用：{validation.get("missing_images")}
- 残留目录点线：{validation.get("toc_dot_lines")}
- 可疑标题：{validation.get("suspicious_headings")}
"""
    ZC_STRUCTURED_DIR.mkdir(exist_ok=True)
    (ZC_STRUCTURED_DIR / f"{stem}.zc_skill.report.md").write_text(report, encoding="utf-8")


def validate_markdown(md_path: Path) -> dict:
    text = md_path.read_text(encoding="utf-8")
    images = re.findall(r"!\[[^\]]*\]\(([^)]+)\)", text)
    missing = [src for src in images if not (md_path.parent / src).exists()]
    toc_section = ""
    if "## 目录" in text:
        toc_section = text.split("## 目录", 1)[1].split("\n## ", 1)[0]
    suspicious_headings = [
        line
        for line in text.splitlines()
        if line.startswith("##")
        and (title_has_bad_heading_signal(strip_heading_marker(line)[1]) or DOT_LEADER_RE.search(line))
    ]
    hard_breaks = 0
    blocks = split_blocks(text)
    for prev, curr in zip(blocks, blocks[1:]):
        if should_merge_blocks(prev, curr):
            hard_breaks += 1
    return {
        "missing_images": len(missing),
        "toc_dot_lines": len(DOT_LEADER_RE.findall(toc_section)),
        "suspicious_headings": len(suspicious_headings),
        "hard_break_risks": hard_breaks,
        "toc_entries": len(collect_toc_entries(text)),
    }


def process_pdf(pdf: Path) -> tuple[dict, dict]:
    lines = pdf_to_md.extract_lines(pdf)
    md_text = pdf_to_md.markdown_for(pdf, lines)
    md_text = normalize_generated_markdown(md_text)
    md_path = pdf.with_suffix(".md")
    md_path.write_text(md_text, encoding="utf-8")

    html_path = md_to_html.convert_file(md_path)
    html_text = html_path.read_text(encoding="utf-8")
    html_text = render_formula_blocks(html_text)
    html_text = render_generated_toc_lists(html_text)
    html_path.write_text(html_text, encoding="utf-8")

    ZC_HTML_DIR.mkdir(exist_ok=True)
    (ZC_HTML_DIR / f"{pdf.stem}.html").write_text(html_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{pdf.stem}.zc_skill.html").write_text(html_text, encoding="utf-8")

    base_report = md_to_json.load_base_report(pdf, ZC_HTML_DIR)
    structured = postprocess_structured(md_to_json.parse_markdown(md_path, base_report))
    json_text = json.dumps(structured, ensure_ascii=False, indent=2)
    ZC_STRUCTURED_DIR.mkdir(exist_ok=True)
    (ZC_STRUCTURED_DIR / f"{pdf.stem}.structured.json").write_text(json_text, encoding="utf-8")
    (ZC_STRUCTURED_DIR / f"{pdf.stem}.zc_skill.structured.json").write_text(json_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{pdf.stem}.json").write_text(json_text, encoding="utf-8")

    validation = validate_markdown(md_path)
    write_report(pdf.stem, structured, validation)
    return structured, validation


def rebuild_index() -> None:
    results: list[tuple[Path, dict]] = []
    for json_path in sorted(ZC_STRUCTURED_DIR.glob("*.structured.json")):
        if json_path.name.endswith(".zc_skill.structured.json"):
            continue
        try:
            data = json.loads(json_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        results.append((json_path, data))
    md_to_json.render_index(results, ZC_STRUCTURED_DIR / "index.json")


def main() -> int:
    pdfs = target_pdfs()
    if not pdfs:
        print("No Shaanxi PDFs found.")
        return 1
    configure_pdf_converter()
    configure_structured_converter()
    backup_dir = backup_outputs(pdfs)
    print(f"backup_dir={backup_dir}")
    summaries: list[dict] = []
    for idx, pdf in enumerate(pdfs, start=1):
        print(f"[{idx}/{len(pdfs)}] {pdf.name}", flush=True)
        structured, validation = process_pdf(pdf)
        quality = structured.get("quality_report", {})
        summary = {
            "stem": pdf.stem,
            "chapters": quality.get("chapter_count"),
            "formulas": quality.get("formula_count"),
            **validation,
        }
        summaries.append(summary)
        print(json.dumps(summary, ensure_ascii=False), flush=True)
    rebuild_index()
    print("updated_count=" + str(len(summaries)))
    print("validation_summary=" + json.dumps(summaries, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
