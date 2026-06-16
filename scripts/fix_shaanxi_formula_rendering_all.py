#!/usr/bin/env python3
"""Normalize formula rendering across all Shaanxi policy PDF outputs."""

from __future__ import annotations

import json
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
import markdown_to_structured_json as md_to_json  # type: ignore  # noqa: E402
from fix_shaanxi_settlement_formula_mapping import (  # type: ignore  # noqa: E402
    STEM as SETTLEMENT_STEM,
    mark_verified_formulas,
    repair_markdown as repair_settlement_markdown,
)
from parse_hunan_policy_pdfs_with_skill import render_formula_blocks  # type: ignore  # noqa: E402
from parse_shaanxi_policy_pdfs_with_skill import (  # type: ignore  # noqa: E402
    configure_structured_converter,
    postprocess_structured,
    rebuild_index,
    render_generated_toc_lists,
    validate_markdown,
    write_report,
)


def target_pdfs() -> list[Path]:
    return sorted(POLICY_DIR.glob("*.pdf"))


def output_paths_for(pdf: Path) -> list[Path]:
    stem = pdf.stem
    return [
        pdf.with_suffix(".md"),
        pdf.with_suffix(".html"),
        ZC_HTML_DIR / f"{stem}.html",
        ZC_HTML_DIR / f"{stem}.zc_skill.html",
        ZC_HTML_DIR / f"{stem}.json",
        ZC_STRUCTURED_DIR / f"{stem}.structured.json",
        ZC_STRUCTURED_DIR / f"{stem}.zc_skill.structured.json",
        ZC_STRUCTURED_DIR / f"{stem}.zc_skill.report.md",
    ]


def backup(paths: list[Path]) -> Path:
    backup_dir = Path("/private/tmp") / f"shaanxi_formula_rendering_all_{datetime.now():%Y%m%d-%H%M%S}"
    for path in paths:
        if not path.exists():
            continue
        rel = path.relative_to(POLICY_DIR)
        dest = backup_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)
    return backup_dir


def repair_known_markdown(stem: str, text: str) -> str:
    if stem == SETTLEMENT_STEM:
        return repair_settlement_markdown(text)
    return text


def rebuild_from_current_markdown(pdf: Path) -> dict:
    stem = pdf.stem
    md_path = pdf.with_suffix(".md")
    if not md_path.exists():
        raise FileNotFoundError(f"Missing Markdown for {pdf.name}: {md_path}")

    md_text = repair_known_markdown(stem, md_path.read_text(encoding="utf-8"))
    md_path.write_text(md_text, encoding="utf-8")

    html_path = md_to_html.convert_file(md_path)
    html_text = html_path.read_text(encoding="utf-8")
    html_text = render_formula_blocks(html_text)
    html_text = render_generated_toc_lists(html_text)
    html_path.write_text(html_text, encoding="utf-8")

    ZC_HTML_DIR.mkdir(exist_ok=True)
    (ZC_HTML_DIR / f"{stem}.html").write_text(html_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{stem}.zc_skill.html").write_text(html_text, encoding="utf-8")

    base_report = md_to_json.load_base_report(pdf, ZC_HTML_DIR)
    structured = postprocess_structured(md_to_json.parse_markdown(md_path, base_report))
    if stem == SETTLEMENT_STEM:
        structured = mark_verified_formulas(structured)

    json_text = json.dumps(structured, ensure_ascii=False, indent=2)
    ZC_STRUCTURED_DIR.mkdir(exist_ok=True)
    (ZC_STRUCTURED_DIR / f"{stem}.structured.json").write_text(json_text, encoding="utf-8")
    (ZC_STRUCTURED_DIR / f"{stem}.zc_skill.structured.json").write_text(json_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{stem}.json").write_text(json_text, encoding="utf-8")

    validation = validate_markdown(md_path)
    write_report(stem, structured, validation)
    return structured


def main() -> int:
    pdfs = target_pdfs()
    if not pdfs:
        print("No Shaanxi PDFs found.")
        return 1
    configure_structured_converter()

    paths: list[Path] = []
    for pdf in pdfs:
        paths.extend(output_paths_for(pdf))
    backup_dir = backup(paths)
    print(f"backup_dir={backup_dir}")

    processed: list[tuple[str, dict]] = []
    for pdf in pdfs:
        structured = rebuild_from_current_markdown(pdf)
        quality = structured.get("quality_report", {})
        processed.append((pdf.stem, quality))
        print(
            "{stem}: formulas={formulas} resolved={resolved} unresolved={unresolved}".format(
                stem=pdf.stem,
                formulas=quality.get("formula_count"),
                resolved=quality.get("resolved_formula_count"),
                unresolved=quality.get("unresolved_formula_count"),
            )
        )

    rebuild_index()
    total_formulas = sum(int((quality.get("formula_count") or 0)) for _stem, quality in processed)
    total_unresolved = sum(int((quality.get("unresolved_formula_count") or 0)) for _stem, quality in processed)
    print(f"summary: pdfs={len(processed)} formulas={total_formulas} unresolved={total_unresolved}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
