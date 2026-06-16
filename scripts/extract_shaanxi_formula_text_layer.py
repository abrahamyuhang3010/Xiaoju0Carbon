#!/usr/bin/env python3
"""Extract PDF text-layer clues for Shaanxi formula image placeholders."""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path


WORKSPACE = Path(__file__).resolve().parents[1]
ROOT = Path("/Users/didi/Documents/codex售电市场政策结构化")
POLICY_DIR = ROOT / "陕西交易中心" / "2026年执行政策"
DEPS_DIR = ROOT / ".codex_pdf_deps"
AUDIT_JSON = Path("/private/tmp/shaanxi_formula_audit/inventory.json")
OUT_DIR = Path("/private/tmp/shaanxi_formula_text_layer")

sys.path.insert(0, str(DEPS_DIR))

import fitz  # type: ignore  # noqa: E402


FORMULA_RE = re.compile(r"!\[公式\]\(([^)]+)\)")
PAGE_RE = re.compile(r"formula_p(\d{3})")
SYMBOLISH_RE = re.compile(r"[åìüéùëûïíýîþ´∑Σ≤≥=+\-*/(){}\[\],]")


def load_inventory() -> list[dict]:
    if AUDIT_JSON.exists():
        return json.loads(AUDIT_JSON.read_text(encoding="utf-8"))
    inventory: list[dict] = []
    for md_path in sorted(POLICY_DIR.glob("*.md")):
        lines = md_path.read_text(encoding="utf-8").splitlines()
        occurrence = 0
        for line_idx, line in enumerate(lines):
            for match in FORMULA_RE.finditer(line):
                occurrence += 1
                rel = match.group(1)
                page_match = PAGE_RE.search(Path(rel).name)
                inventory.append(
                    {
                        "doc": md_path.stem,
                        "occurrence": occurrence,
                        "line": line_idx + 1,
                        "image_rel": rel,
                        "image_path": str(POLICY_DIR / rel),
                        "image_name": Path(rel).name,
                        "page": int(page_match.group(1)) if page_match else None,
                    }
                )
    return inventory


def line_text(line: dict) -> str:
    return "".join(span.get("text", "") for span in line.get("spans", []))


def block_text(block: dict) -> str:
    return "".join(line_text(line) for line in block.get("lines", []))


def span_payload(span: dict) -> dict:
    text = span.get("text", "")
    return {
        "text": text,
        "font": span.get("font"),
        "size": round(float(span.get("size", 0.0)), 2),
        "bbox": [round(float(v), 2) for v in span.get("bbox", [])],
    }


def line_payload(line: dict) -> dict:
    text = line_text(line)
    fonts = sorted({span.get("font", "") for span in line.get("spans", [])})
    return {
        "text": text,
        "bbox": [round(float(v), 2) for v in line.get("bbox", [])],
        "fonts": fonts,
        "spans": [span_payload(span) for span in line.get("spans", [])],
    }


def is_formulaish_block(block: dict) -> bool:
    text = block_text(block).strip()
    if not text:
        return False
    chinese = len(re.findall(r"[\u4e00-\u9fff]", text))
    fonts = " ".join(span.get("font", "") for line in block.get("lines", []) for span in line.get("spans", []))
    has_math_font = any(token in fonts for token in ("Symbol", "TimesNewRoman", "CambriaMath", "MT-Extra"))
    if chinese and not has_math_font:
        return False
    if SYMBOLISH_RE.search(text):
        return True
    if has_math_font and re.search(r"[A-Za-z0-9]", text) and chinese <= 8:
        return True
    return False


def extract_page_clues(pdf_path: Path, page_no: int) -> dict:
    doc = fitz.open(pdf_path)
    page = doc[page_no - 1]
    data = page.get_text("dict", sort=True)
    blocks = []
    for block_idx, block in enumerate(data.get("blocks", [])):
        if "lines" not in block or not is_formulaish_block(block):
            continue
        blocks.append(
            {
                "block_index": block_idx,
                "text": block_text(block),
                "bbox": [round(float(v), 2) for v in block.get("bbox", [])],
                "lines": [line_payload(line) for line in block.get("lines", [])],
            }
        )
    return {
        "pdf": str(pdf_path),
        "page": page_no,
        "page_size": [round(page.rect.width, 2), round(page.rect.height, 2)],
        "blocks": blocks,
    }


def write_markdown(page_records: list[dict], out_path: Path) -> None:
    lines = ["# Shaanxi Formula Text Layer Clues", ""]
    for record in page_records:
        lines.append(f"## {record['doc']} p{record['page']:03d}")
        lines.append("")
        lines.append("### Placeholders")
        for item in record["placeholders"]:
            before = (item.get("context_before") or "").replace("\n", " ")
            after = (item.get("context_after") or "").replace("\n", " ")
            lines.append(f"- `{item['image_name']}` line {item.get('line')}: {before[:70]} -> {after[:70]}")
        lines.append("")
        lines.append("### Text Layer Blocks")
        for block in record["text_layer"]["blocks"]:
            lines.append(f"- block {block['block_index']} bbox={block['bbox']} text=`{block['text']}`")
            for raw_line in block["lines"]:
                lines.append(f"  - line bbox={raw_line['bbox']} fonts={raw_line['fonts']} text=`{raw_line['text']}`")
        lines.append("")
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    inventory = load_inventory()
    by_doc_page: dict[tuple[str, int], list[dict]] = defaultdict(list)
    for item in inventory:
        page = item.get("page")
        if page is not None:
            by_doc_page[(item["doc"], int(page))].append(item)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    page_records: list[dict] = []
    for (doc, page_no), placeholders in sorted(by_doc_page.items()):
        pdf_path = POLICY_DIR / f"{doc}.pdf"
        if not pdf_path.exists():
            continue
        record = {
            "doc": doc,
            "page": page_no,
            "placeholders": placeholders,
            "text_layer": extract_page_clues(pdf_path, page_no),
        }
        page_records.append(record)

    json_path = OUT_DIR / "formula_text_layer_pages.json"
    md_path = OUT_DIR / "formula_text_layer_pages.md"
    json_path.write_text(json.dumps(page_records, ensure_ascii=False, indent=2), encoding="utf-8")
    write_markdown(page_records, md_path)
    print(f"records={len(page_records)}")
    print(f"json={json_path}")
    print(f"markdown={md_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
