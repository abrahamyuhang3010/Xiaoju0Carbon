#!/usr/bin/env python3
"""Repair matching-algorithm formula OCR in Hunan mid-long-term policy outputs."""

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
from parse_hunan_policy_pdfs_with_skill import (  # type: ignore  # noqa: E402
    postprocess_structured,
    render_formula_blocks,
)


TARGET_STEMS = [
    "【20251024】1湖南省电力中长期交易实施细则",
    "【20260403】湖南省电力中长期市场实施细则",
]

FORMULA_Q = r"Q_{\mathrm{匹配}}=\min\{Q_{\mathrm{购方申报}},Q_{\mathrm{售方申报}}\}"
FORMULA_P = (
    r"P_{\mathrm{匹配}}=P_{\mathrm{售方申报}}+"
    r"(P_{\mathrm{购方申报}}-P_{\mathrm{售方申报}})\times K_{\mathrm{竞价}}"
)


def matching_section(prefix: str, default_half: bool) -> str:
    note = (
        "说明：竞价系数 $K_{\\mathrm{竞价}}$ 原则上取 0.5，"
        "也可随市场交易供需情况调整，由电力交易机构在市场交易公告中发布。"
        if default_half
        else "说明：竞价系数 $K_{\\mathrm{竞价}}$ 随市场交易供需情况调整，"
        "由电力交易机构在市场交易公告中发布。"
    )
    return f"""### {prefix} 依次按顺序对购方申报队列和售方申报队列中的电量进行匹配，匹配方法如下

#### {prefix}.1 从购方申报队列和售方申报队列中分别取最前方的申报数据

如果能够从购方申报队列和售方申报队列中取到数据，则进行下一步计算；如果购方申报队列或售方申报队列中的数据已经全部取完，则结束匹配计算。

#### {prefix}.2 比较购电报价和售电报价，进行以下计算

（1）如果购电报价不低于（≥）售电报价，则按以下方法确定匹配对的电量和价格：匹配电量 $Q_{{\\mathrm{{匹配}}}}$ 等于购方申报电量与售方申报电量的较小值，即：

$$
{FORMULA_Q}
$$

匹配价格 $P_{{\\mathrm{{匹配}}}}$ 由购电报价 $P_{{\\mathrm{{购方申报}}}}$、售电报价 $P_{{\\mathrm{{售方申报}}}}$、竞价系数 $K_{{\\mathrm{{竞价}}}}$ 确定，即：

$$
{FORMULA_P}
$$

购方或售方未匹配的剩余电量进入相应队列的最前方，并回到上一步继续取数据。

（2）如果购电报价低于（<）售电报价，则结束匹配计算。

{note}
"""


ROLLING_SECTION = """## 5. 滚动撮合交易出清算法

### 5.1 出清计算按照“价格优先、时间优先”原则进行撮合成交

### 5.2 若售方先于购方申报，且购方申报价格不低于（≥）售方申报价格时，按照售方申报价格成交，电量按照售方价格升序排序梯次成交

### 5.3 若购方先于售方申报，且购方申报价格不低于（≥）售方申报价格时，按照购方申报价格成交，电量按照购方价格降序排序梯次成交
"""


def backup(paths: list[Path]) -> Path:
    backup_dir = Path("/private/tmp") / f"hunan_midlong_formula_repair_{datetime.now():%Y%m%d-%H%M%S}"
    for path in paths:
        if not path.exists():
            continue
        rel = path.relative_to(POLICY_DIR)
        dest = backup_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)
    return backup_dir


def replace_section(text: str, prefix: str, default_half: bool) -> str:
    end_prefix = f"{int(prefix.split('.')[0])}.{int(prefix.split('.')[1]) + 1}"
    pattern = re.compile(rf"### {re.escape(prefix)} 依次按顺序.*?(?=\n### {re.escape(end_prefix)}\s)", re.S)
    replacement = matching_section(prefix, default_half).rstrip()
    text, count = pattern.subn(lambda _match: replacement, text, count=1)
    if count != 1:
        raise RuntimeError(f"未找到 {prefix} 段落")
    return text


def repair_markdown(stem: str, text: str) -> str:
    text = re.sub(r"(?m)^!\[公式\]\([^)]*formula_p063_para_0[12]\.png\)\n*", "", text)
    text = re.sub(r"(?m)^!\[公式\]\([^)]*formula_p066_para_03\.png\)\n*", "", text)

    text = replace_section(text, "1.4", default_half=True)
    text = replace_section(text, "2.4", default_half=False)

    pattern = re.compile(r"## 5\. 滚动撮合交易出清算法.*?(?=\n### 5\.4\s)", re.S)
    text, count = pattern.subn(lambda _match: ROLLING_SECTION.rstrip(), text, count=1)
    if count != 1 and stem == "【20251024】1湖南省电力中长期交易实施细则":
        pattern = re.compile(r"5\.滚动撮合交易出清算法.*?(?=\n### 5\.4\s)", re.S)
        rolling = "同，最终的成交价格也不同，并按成交价格结算。\n\n" + ROLLING_SECTION.rstrip()
        text, count = pattern.subn(lambda _match: rolling, text, count=1)
    if count != 1:
        raise RuntimeError(f"未找到 {stem} 的滚动撮合段落")

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
    structured = md_to_json.parse_markdown(md_path, base_report)
    structured = postprocess_structured(structured)
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
        print(
            f"{pdf.stem}: formulas={q.get('formula_count')} "
            f"resolved={q.get('resolved_formula_count')} "
            f"unresolved={q.get('unresolved_formula_count')}"
        )
    rebuild_index()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
