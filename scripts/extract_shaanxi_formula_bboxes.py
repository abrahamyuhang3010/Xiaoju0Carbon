#!/usr/bin/env python3
"""Record Shaanxi formula image placeholder coordinates without writing assets."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


WORKSPACE = Path(__file__).resolve().parents[1]
ROOT = Path("/Users/didi/Documents/codex售电市场政策结构化")
POLICY_DIR = ROOT / "陕西交易中心" / "2026年执行政策"
TOOLS_DIR = ROOT / "tools"
DEPS_DIR = ROOT / ".codex_pdf_deps"
OUT_PATH = Path("/private/tmp/shaanxi_formula_bboxes.json")

sys.path.insert(0, str(DEPS_DIR))
sys.path.insert(0, str(TOOLS_DIR))
sys.path.insert(0, str(WORKSPACE / "scripts"))

import fitz  # type: ignore  # noqa: E402
import convert_pdfs_to_md as pdf_to_md  # type: ignore  # noqa: E402
from parse_shaanxi_policy_pdfs_with_skill import configure_pdf_converter  # type: ignore  # noqa: E402


FORMULA_RE = re.compile(r"!\[公式\]\(([^)]+)\)")


records: list[dict] = []


def _span_payload(span: dict) -> dict:
    return {
        "text": span.get("text", ""),
        "font": span.get("font", ""),
        "size": round(float(span.get("size", 0.0)), 2),
        "bbox": [round(float(v), 2) for v in span.get("bbox", [])],
    }


def _line_payload(raw_line: dict) -> dict:
    spans = raw_line.get("spans", [])
    return {
        "text": "".join(span.get("text", "") for span in spans),
        "bbox": [round(float(v), 2) for v in raw_line.get("bbox", [])],
        "spans": [_span_payload(span) for span in spans],
    }


def _block_payload(block: dict) -> dict:
    return {
        "text": pdf_to_md.block_text(block),
        "bbox": [round(float(v), 2) for v in block.get("bbox", [])],
        "lines": [_line_payload(line) for line in block.get("lines", [])],
    }


def _spans_overlapping(page: fitz.Page, bbox: tuple[float, float, float, float]) -> list[dict]:
    data = page.get_text("dict", sort=True)
    target = fitz.Rect(*bbox)
    lines: list[dict] = []
    for block in data.get("blocks", []):
        if "lines" not in block:
            continue
        for raw_line in block.get("lines", []):
            line_rect = fitz.Rect(*raw_line.get("bbox", [0, 0, 0, 0]))
            if not line_rect.intersects(target):
                continue
            spans = []
            for span in raw_line.get("spans", []):
                span_rect = fitz.Rect(*span.get("bbox", [0, 0, 0, 0]))
                if span_rect.intersects(target):
                    spans.append(_span_payload(span))
            if spans:
                payload = _line_payload(raw_line)
                payload["spans"] = spans
                lines.append(payload)
    return lines


def _assets_name(pdf: Path) -> str:
    return f"{pdf.with_suffix('').name}_assets"


def render_formula_image(pdf: Path, page: fitz.Page, page_idx: int, formula_idx: int, blocks: list[dict]) -> str:
    filename = f"formula_p{page_idx:03d}_{formula_idx:02d}.png"
    x0, y0, x1, y1 = pdf_to_md.union_bbox(blocks)
    rect = (
        max(0.0, x0 - 16),
        max(0.0, y0 - 14),
        min(float(page.rect.width), x1 + 16),
        min(float(page.rect.height), y1 + 14),
    )
    image_md = f"![公式]({_assets_name(pdf)}/{filename})"
    records.append(
        {
            "doc": pdf.stem,
            "page": page_idx,
            "formula_idx": formula_idx,
            "image_name": filename,
            "image_md": image_md,
            "kind": "block",
            "bbox": [round(float(v), 2) for v in (x0, y0, x1, y1)],
            "clip": [round(float(v), 2) for v in rect],
            "blocks": [_block_payload(block) for block in blocks],
        }
    )
    return image_md


def render_formula_line_image(
    pdf: Path,
    page: fitz.Page,
    page_idx: int,
    formula_idx: int,
    bbox: tuple[float, float, float, float],
) -> str:
    filename = f"formula_p{page_idx:03d}_{formula_idx:02d}.png"
    x0, y0, x1, y1 = bbox
    rect = (
        max(0.0, x0 - 12),
        max(0.0, y0 - 10),
        min(float(page.rect.width), x1 + 12),
        min(float(page.rect.height), y1 + 10),
    )
    image_md = f"![公式]({_assets_name(pdf)}/{filename})"
    records.append(
        {
            "doc": pdf.stem,
            "page": page_idx,
            "formula_idx": formula_idx,
            "image_name": filename,
            "image_md": image_md,
            "kind": "line",
            "bbox": [round(float(v), 2) for v in (x0, y0, x1, y1)],
            "clip": [round(float(v), 2) for v in rect],
            "lines": _spans_overlapping(page, bbox),
            "blocks": [],
        }
    )
    return image_md


def render_formula_paragraph_image(pdf: Path, doc: fitz.Document, lines: list[pdf_to_md.Line], image_idx: int) -> str:
    page_idx = lines[0].page
    filename = f"formula_p{page_idx:03d}_para_{image_idx:02d}.png"
    x0 = min(line.x0 for line in lines)
    y0 = min(line.y0 for line in lines)
    x1 = max(line.x1 for line in lines)
    y1 = max(line.y1 for line in lines)
    page = doc[page_idx - 1]
    rect = (
        max(0.0, x0 - 18),
        max(0.0, y0 - 14),
        min(float(page.rect.width), x1 + 18),
        min(float(page.rect.height), y1 + 14),
    )
    image_md = f"![公式]({_assets_name(pdf)}/{filename})"
    records.append(
        {
            "doc": pdf.stem,
            "page": page_idx,
            "formula_idx": image_idx,
            "image_name": filename,
            "image_md": image_md,
            "kind": "paragraph",
            "bbox": [round(float(v), 2) for v in (x0, y0, x1, y1)],
            "clip": [round(float(v), 2) for v in rect],
            "text_lines": [line.text for line in lines],
        }
    )
    return image_md


def main() -> int:
    configure_pdf_converter()
    pdf_to_md.render_formula_image = render_formula_image
    pdf_to_md.render_formula_line_image = render_formula_line_image
    pdf_to_md.render_formula_paragraph_image = render_formula_paragraph_image
    pdf_to_md.extract_lines_with_ocr = lambda _pdf: []

    pdfs = sorted(POLICY_DIR.glob("*.pdf"))
    for pdf in pdfs:
        before = len(records)
        lines = pdf_to_md.extract_lines(pdf)
        _markdown = pdf_to_md.markdown_for(pdf, lines)
        placeholders = sum(1 for line in lines if FORMULA_RE.fullmatch(line.text.strip()))
        print(f"{pdf.stem}: recorded={len(records) - before} line_placeholders={placeholders}")

    OUT_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"out={OUT_PATH}")
    print(f"records={len(records)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
