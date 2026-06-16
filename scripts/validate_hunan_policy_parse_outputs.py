#!/usr/bin/env python3
"""Validate final Hunan policy parse outputs after QA repairs."""

from __future__ import annotations

import json
import re
from pathlib import Path


POLICY_DIR = Path("/Users/didi/Documents/codex售电市场政策结构化/湖南交易中心/2026年执行政策")
ZC_HTML_DIR = POLICY_DIR / "ZC_HTML"
ZC_STRUCTURED_DIR = POLICY_DIR / "ZC_STRUCTURED"

BAD_TEXT_RE = re.compile(
    r'<div class="math-block"><code>'
    r"|INLINE_MATH|@@IM|VQUZUOMA|VQZUOMA"
    r"|formula_p[0-9]+_para_[0-9]+\.png|!\[公式\]"
    r"|<figure class=\"formula-figure\"|<img[^>]+formula"
    r"|品路公绍|名取相|京小桔|新能源汽车|技有限公|北京小桔|斗技"
    r"|公式如下C湖平|\\x0c"
    r"|默认设置 至 ，|若 到 、 到|若［,］|即 ）"
    r"|销户流用户侧|拟合规则”第|名词解释电|名词解释1\.|新型经营主体新型经营主体"
    r"|按日连续开市按日连续开市|滚动撮合交易滚动撮合交易|购买零售合同："
)
CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
DISPLAY_FORMULA_RE = re.compile(r"(?ms)^\$\$\n.*?\n\$\$")


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

    root_intermediates = sorted(POLICY_DIR.glob("*.ocr_preview.*")) + sorted(POLICY_DIR.glob("*.textlayer_backup.*"))
    for path in root_intermediates:
        failures.append(f"intermediate_in_root: {path}")

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

    rows: list[tuple[str, int, int | None, int | None]] = []
    for pdf_path in sorted(POLICY_DIR.glob("*.pdf")):
        stem = pdf_path.stem
        md_path = POLICY_DIR / f"{stem}.md"
        json_path = ZC_STRUCTURED_DIR / f"{stem}.structured.json"
        if not md_path.exists() or not json_path.exists():
            failures.append(f"missing_pair:{stem}:md={md_path.exists()}:json={json_path.exists()}")
            continue
        md_count = len(DISPLAY_FORMULA_RE.findall(md_path.read_text(encoding="utf-8")))
        data = json.loads(json_path.read_text(encoding="utf-8"))
        quality = data.get("quality_report", {})
        json_count = quality.get("formula_count")
        unresolved = quality.get("unresolved_formula_count")
        rows.append((stem, md_count, json_count, unresolved))
        if md_count != json_count or unresolved != 0:
            failures.append(f"formula_mismatch:{stem}:md={md_count}:json={json_count}:unresolved={unresolved}")

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
