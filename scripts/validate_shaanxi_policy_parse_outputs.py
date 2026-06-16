#!/usr/bin/env python3
"""Validate Shaanxi policy parse outputs after formula LaTeX repairs."""

from __future__ import annotations

import json
import re
from pathlib import Path


POLICY_DIR = Path("/Users/didi/Documents/codex售电市场政策结构化/陕西交易中心/2026年执行政策")
ZC_HTML_DIR = POLICY_DIR / "ZC_HTML"
ZC_STRUCTURED_DIR = POLICY_DIR / "ZC_STRUCTURED"

DISPLAY_FORMULA_RE = re.compile(r"(?ms)^\$\$\n.*?\n\$\$")
FORMULA_IMAGE_RE = re.compile(r"!\[公式\]\(([^)]+)\)")
BAD_TEXT_RE = re.compile(
    r'<div class="math-block"><code>'
    r"|INLINE_MATH|@@IM|VQUZUOMA|VQZUOMA"
    r"|\\x0c"
    r"|品路公绍|名取相|京小桔|新能源汽车|技有限公|北京小桔|斗技"
)
CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def final_text_files() -> list[Path]:
    return (
        sorted(POLICY_DIR.glob("*.md"))
        + sorted(POLICY_DIR.glob("*.html"))
        + sorted(ZC_HTML_DIR.glob("*.html"))
        + sorted(ZC_HTML_DIR.glob("*.json"))
        + sorted(ZC_STRUCTURED_DIR.glob("*.json"))
    )


def main() -> int:
    failures: list[str] = []

    for path in final_text_files():
        text = path.read_text(encoding="utf-8", errors="ignore")
        match = BAD_TEXT_RE.search(text)
        if match:
            line = text.count("\n", 0, match.start()) + 1
            failures.append(f"bad_text:{path}:{line}:{match.group(0)}")
        match = CONTROL_CHAR_RE.search(text)
        if match:
            line = text.count("\n", 0, match.start()) + 1
            failures.append(f"control_char:{path}:{line}:U+{ord(match.group(0)):04X}")
        for idx, raw_line in enumerate(text.splitlines(), 1):
            if raw_line.strip() in {"##", "###", "####", "#####"}:
                failures.append(f"empty_heading:{path}:{idx}:{raw_line!r}")
                break

    rows: list[tuple[str, int, int, int | None, int | None, int | None]] = []
    for pdf_path in sorted(POLICY_DIR.glob("*.pdf")):
        stem = pdf_path.stem
        md_path = POLICY_DIR / f"{stem}.md"
        json_path = ZC_STRUCTURED_DIR / f"{stem}.structured.json"
        if not md_path.exists() or not json_path.exists():
            failures.append(f"missing_pair:{stem}:md={md_path.exists()}:json={json_path.exists()}")
            continue

        md_text = md_path.read_text(encoding="utf-8")
        display_formula_count = len(DISPLAY_FORMULA_RE.findall(md_text))
        formula_image_sources = FORMULA_IMAGE_RE.findall(md_text)
        formula_image_count = len(formula_image_sources)
        missing_images = [src for src in formula_image_sources if not (POLICY_DIR / src).exists()]
        if missing_images:
            failures.append(f"missing_formula_images:{stem}:count={len(missing_images)}")

        data = json.loads(json_path.read_text(encoding="utf-8"))
        quality = data.get("quality_report", {})
        formula_count = quality.get("formula_count")
        resolved = quality.get("resolved_formula_count")
        unresolved = quality.get("unresolved_formula_count")

        if formula_image_count:
            failures.append(f"formula_images_remaining:{stem}:count={formula_image_count}")

        expected_total = display_formula_count
        expected_resolved = display_formula_count
        expected_unresolved = 0
        rows.append((stem, expected_total, formula_count, expected_resolved, resolved, unresolved))

        if formula_count != expected_total:
            failures.append(f"formula_count_mismatch:{stem}:md={expected_total}:json={formula_count}")
        if resolved != expected_resolved:
            failures.append(f"resolved_count_mismatch:{stem}:md={expected_resolved}:json={resolved}")
        if unresolved != expected_unresolved:
            failures.append(f"unresolved_count_mismatch:{stem}:md={expected_unresolved}:json={unresolved}")

    if failures:
        print("VALIDATION_FAILED")
        for failure in failures:
            print(failure)
        print("formula_rows=")
        for row in rows:
            print(row)
        return 1

    print("VALIDATION_OK")
    for row in rows:
        print(row)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
