#!/usr/bin/env python3
"""Repair formula images in Hunan retail/register policy outputs."""

from __future__ import annotations

import json
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

sys.path.insert(0, str(TOOLS_DIR))
sys.path.insert(0, str(WORKSPACE / "scripts"))

import convert_md_to_html as md_to_html  # type: ignore  # noqa: E402
import markdown_to_structured_json as md_to_json  # type: ignore  # noqa: E402
from parse_hunan_policy_pdfs_with_skill import postprocess_structured, render_formula_blocks  # type: ignore  # noqa: E402


TARGET_STEMS = [
    "【20251024】5湖南省电力市场注册实施细则",
    "【20251024】6湖南省电力零售市场交易规则",
]

RETAIL_FORMULAS = {
    "formula_p007_para_01.png": r"P_{\mathrm{市场费率}}=P_{z\mathrm{平均}}\times K_{\mathrm{浮动}}",
    "formula_p007_para_02.png": r"P_{\mathrm{交易均价+服务费}}=P_{\mathrm{均}}+P_{\mathrm{服务}}",
    "formula_p008_para_03.png": r"P_{\mathrm{比例分成}}=P_{z\mathrm{平均}}-(P_{z\mathrm{平均}}-P_{\mathrm{均}})\times K_{\mathrm{分成}}",
    "formula_p008_para_04.png": r"P_{\mathrm{混合}}=P_{\mathrm{市场费率}}\times K_{\mathrm{混合}}+(P_{\mathrm{均}}+P_{\mathrm{服务}})\times(1-K_{\mathrm{混合}})",
    "formula_p008_para_05.png": r"P_{\mathrm{绿电}}=P_{\mathrm{电能量}}+P_{\mathrm{环境}}",
    "formula_p009_para_06.png": r"P_{\mathrm{交易均价+可变服务费}}=P_{\mathrm{均}}+P_{\mathrm{服务}}",
}


def backup(paths: list[Path]) -> Path:
    backup_dir = Path("/private/tmp") / f"hunan_retail_register_formula_repair_{datetime.now():%Y%m%d-%H%M%S}"
    for path in paths:
        if not path.exists():
            continue
        rel = path.relative_to(POLICY_DIR)
        dest = backup_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)
    return backup_dir


def math_block(latex: str) -> str:
    return f"$$\n{latex}\n$$"


def repair_markdown(stem: str, text: str) -> str:
    if "注册实施细则" in stem:
        text = re.sub(r"(?m)^!\[公式\]\([^)]*formula_p00[36]_para_0[12]\.png\)\n*", "", text)
        return re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"

    for filename, latex in RETAIL_FORMULAS.items():
        text = re.sub(
            rf"!\[公式\]\([^)]*{re.escape(filename)}\)",
            lambda _match, latex=latex: math_block(latex),
            text,
            count=1,
        )
    text = text.replace("P实#为通过市场费率类套餐确定的价格：P实半一K平动XP2平均", "P市场费率为通过市场费率类套餐确定的价格。")
    text = text.replace("P环镜通过售电公司在批发市场向发电企业购买绿色电力的环境价值确定", "P环境通过售电公司在批发市场向发电企业购买绿色电力的环境价值确定")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def rebuild_outputs(pdf: Path) -> dict:
    md_path = pdf.with_suffix(".md")
    md_text = repair_markdown(pdf.stem, md_path.read_text(encoding="utf-8"))
    md_path.write_text(md_text, encoding="utf-8")

    html_path = md_to_html.convert_file(md_path)
    html_text = render_formula_blocks(html_path.read_text(encoding="utf-8"))
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
    return structured


def rebuild_index() -> None:
    all_results: list[tuple[Path, dict]] = []
    for json_path in sorted(ZC_STRUCTURED_DIR.glob("*.structured.json")):
        try:
            data = json.loads(json_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        all_results.append((json_path, data))
    md_to_json.render_index(all_results, ZC_STRUCTURED_DIR / "index.json")


def main() -> int:
    pdfs = [POLICY_DIR / f"{stem}.pdf" for stem in TARGET_STEMS]
    paths: list[Path] = []
    for pdf in pdfs:
        stem = pdf.stem
        paths.extend(
            [
                pdf.with_suffix(".md"),
                pdf.with_suffix(".html"),
                ZC_HTML_DIR / f"{stem}.html",
                ZC_HTML_DIR / f"{stem}.json",
                ZC_STRUCTURED_DIR / f"{stem}.structured.json",
                ZC_STRUCTURED_DIR / f"{stem}.zc_skill.structured.json",
            ]
        )
    backup_dir = backup(paths)
    print(f"backup_dir={backup_dir}")
    for pdf in pdfs:
        structured = rebuild_outputs(pdf)
        q = structured.get("quality_report", {})
        print(f"{pdf.stem}: formulas={q.get('formula_count')} resolved={q.get('resolved_formula_count')} unresolved={q.get('unresolved_formula_count')}")
    rebuild_index()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
