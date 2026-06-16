#!/usr/bin/env python3
"""Inventory Shaanxi formula image placeholders and build review sheets."""

from __future__ import annotations

import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path("/Users/didi/Documents/codex售电市场政策结构化")
POLICY_DIR = ROOT / "陕西交易中心" / "2026年执行政策"
OUT_DIR = Path("/private/tmp/shaanxi_formula_audit")
SHEETS_DIR = OUT_DIR / "sheets"

FORMULA_RE = re.compile(r"!\[公式\]\(([^)]+)\)")
PAGE_RE = re.compile(r"formula_p(\d{3})")


def short_stem(stem: str) -> str:
    stem = stem.replace("【20260105】", "").replace("【20260304】", "")
    stem = stem.replace("（连续试运行V2）", "")
    stem = re.sub(r"[《》关于印发的通知国家能源局西北监管局 陕西省发展和改革委员会]+", "", stem)
    return stem[:36] or "doc"


def image_sha1(path: Path) -> str:
    h = hashlib.sha1()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def surrounding_lines(lines: list[str], line_idx: int) -> tuple[str, str]:
    before = ""
    for idx in range(line_idx - 1, -1, -1):
        candidate = lines[idx].strip()
        if candidate and not FORMULA_RE.search(candidate):
            before = candidate
            break
    after = ""
    for idx in range(line_idx + 1, len(lines)):
        candidate = lines[idx].strip()
        if candidate and not FORMULA_RE.search(candidate):
            after = candidate
            break
    return before, after


def collect_inventory() -> list[dict]:
    inventory: list[dict] = []
    for md_path in sorted(POLICY_DIR.glob("*.md")):
        lines = md_path.read_text(encoding="utf-8").splitlines()
        occurrence = 0
        for line_idx, line in enumerate(lines):
            for match in FORMULA_RE.finditer(line):
                occurrence += 1
                rel = match.group(1)
                image_path = POLICY_DIR / rel
                page_match = PAGE_RE.search(Path(rel).name)
                page = int(page_match.group(1)) if page_match else None
                width = height = None
                digest = ""
                if image_path.exists():
                    with Image.open(image_path) as img:
                        width, height = img.size
                    digest = image_sha1(image_path)
                before, after = surrounding_lines(lines, line_idx)
                inventory.append(
                    {
                        "doc": md_path.stem,
                        "md_path": str(md_path),
                        "occurrence": occurrence,
                        "line": line_idx + 1,
                        "image_rel": rel,
                        "image_path": str(image_path),
                        "image_name": Path(rel).name,
                        "page": page,
                        "width": width,
                        "height": height,
                        "sha1": digest,
                        "context_before": before,
                        "context_after": after,
                    }
                )
    return inventory


def load_font(size: int) -> ImageFont.ImageFont:
    for candidate in (
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
    ):
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def make_sheet(items: list[dict], out_path: Path) -> None:
    label_font = load_font(18)
    note_font = load_font(14)
    thumb_w = 520
    padding = 18
    label_h = 56
    rows: list[tuple[dict, Image.Image, int]] = []
    for item in items:
        image_path = Path(item["image_path"])
        if not image_path.exists():
            continue
        img = Image.open(image_path).convert("RGB")
        scale = min(1.0, thumb_w / max(1, img.width))
        target = (max(1, int(img.width * scale)), max(1, int(img.height * scale)))
        thumb = img.resize(target, Image.Resampling.LANCZOS)
        rows.append((item, thumb, label_h + thumb.height + padding))
    if not rows:
        return
    sheet_w = thumb_w + padding * 2
    sheet_h = padding + sum(row_h for _item, _thumb, row_h in rows)
    sheet = Image.new("RGB", (sheet_w, sheet_h), "white")
    draw = ImageDraw.Draw(sheet)
    y = padding
    for item, thumb, row_h in rows:
        title = f"{item['image_name']}  {item.get('width')}x{item.get('height')}"
        draw.text((padding, y), title, fill=(20, 24, 32), font=label_font)
        context = (item.get("context_before") or item.get("context_after") or "")[:58]
        if context:
            draw.text((padding, y + 28), context, fill=(90, 96, 110), font=note_font)
        sheet.paste(thumb, (padding, y + label_h))
        y += row_h
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)


def build_sheets(inventory: list[dict]) -> list[str]:
    by_doc_page: dict[tuple[str, int], list[dict]] = defaultdict(list)
    for item in inventory:
        page = item.get("page")
        if page is not None:
            by_doc_page[(item["doc"], page)].append(item)

    written: list[str] = []
    for (doc, page), items in sorted(by_doc_page.items()):
        doc_dir = SHEETS_DIR / short_stem(doc)
        out_path = doc_dir / f"page_{page:03d}.png"
        make_sheet(items, out_path)
        if out_path.exists():
            written.append(str(out_path))
    return written


def write_reports(inventory: list[dict], sheets: list[str]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "inventory.json").write_text(json.dumps(inventory, ensure_ascii=False, indent=2), encoding="utf-8")
    by_doc = Counter(item["doc"] for item in inventory)
    by_doc_page = Counter((item["doc"], item.get("page")) for item in inventory)
    unique = len({item["sha1"] for item in inventory if item.get("sha1")})

    lines = [
        "# Shaanxi Formula Image Audit",
        "",
        f"- total placeholders: {len(inventory)}",
        f"- unique image hashes: {unique}",
        f"- review sheets: {len(sheets)}",
        "",
        "## By Document",
        "",
    ]
    for doc, count in by_doc.most_common():
        lines.append(f"- {doc}: {count}")
    lines.extend(["", "## Formula-Heavy Pages", ""])
    for (doc, page), count in by_doc_page.most_common(80):
        lines.append(f"- {doc} p{page:03d}: {count}")
    (OUT_DIR / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    inventory = collect_inventory()
    sheets = build_sheets(inventory)
    write_reports(inventory, sheets)
    print(f"inventory={OUT_DIR / 'inventory.json'}")
    print(f"summary={OUT_DIR / 'summary.md'}")
    print(f"sheets={SHEETS_DIR}")
    print(f"placeholders={len(inventory)} sheets={len(sheets)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
