#!/usr/bin/env python3
"""Repair formula OCR in Hunan frequency-regulation policy outputs."""

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
STEM = "【20251024】3湖南省电力调频辅助服务市场交易实施细则"

sys.path.insert(0, str(TOOLS_DIR))
sys.path.insert(0, str(WORKSPACE / "scripts"))

import convert_md_to_html as md_to_html  # type: ignore  # noqa: E402
import markdown_to_structured_json as md_to_json  # type: ignore  # noqa: E402
from parse_hunan_policy_pdfs_with_skill import postprocess_structured, render_formula_blocks  # type: ignore  # noqa: E402


SECTION_10 = r"""第十条【综合调频性能指标】综合调频性能指标是评价调频服务质效的综合性指标，由调节速率、响应时间和调节精度三个子指标组成，按调频单元进行统计，计算方法如下。

（一）调节速率

$$
K_1^{i,j}=V^{i,j}/V_{p.u.}
$$

其中，$V^{i,j}$ 是调频单元 $i$ 第 $j$ 次响应 AGC 控制指令实际调节速率；$V_{p.u.}$ 是 AGC 调频单元平均标准调节速率，计算公式为 $V_{p.u.}=\mathrm{调频市场范围内各类经营主体的标准速率}\times\mathrm{各类经营主体的额定容量占比}$，$V_{p.u.}$ 按年度更新。

燃煤、火储机组 50% 额定容量及以上标准调节速率为额定容量的 1.2%/分钟，50% 额定容量以下标准调节速率为额定容量的 0.8%/分钟，燃气机组标准调节速率为额定容量的 4%/分钟，水电厂站标准调节速率为开机容量的 25%/分钟，储能标准调节速率为额定容量的 100%/分钟。后期上述参数如需调整，经政府主管部门审批通过后执行。

原则上参与调频机组（厂站）的调节范围应与现货市场保持一致；暂未参与现货市场的，燃气机组调节范围为 0 至额定容量，水电机组调节范围为单机最低振动区上限至全厂最大出力，储能调节范围为负额定容量至额定容量。

为避免调频单元过调节或超调节，设置 $K_1$ 最大值不超过 $K_1^U$，初始取值见附录。

（二）响应时间

$$
K_2^{i,j}=1-(T^{i,j}/T_0)
$$

其中，$T^{i,j}$ 是调频单元 $i$ 第 $j$ 次 AGC 指令下发至调频单元 AGC 动作的时间，$T_0$ 是标准响应时间，初始取值见附录。燃煤、火储、燃气机组考核响应时间为 60 秒，水电机组考核响应时间为 20 秒，储能考核响应时间为 5 秒。后期上述参数如需调整，经政府主管部门审批通过后执行。

（三）调节精度

$$
K_3^{i,j}=1-(E^{i,j}/E_0)
$$

其中，$E^{i,j}$ 是调频单元 $i$ 第 $j$ 次响应 AGC 指令后实际出力值与指令值的偏差量，$E_0$ 是允许误差，初始取值见附录。

（四）综合调频性能指标

$$
K^{i,j}=\lambda_1K_1^{i,j}+\lambda_2K_2^{i,j}+\lambda_3K_3^{i,j}
$$

其中，$K^{i,j}$ 是调频单元 $i$ 第 $j$ 次调节过程中的综合调频性能指标；$\lambda_1$、$\lambda_2$、$\lambda_3$ 为对应指标 $K_1^{i,j}$、$K_2^{i,j}$、$K_3^{i,j}$ 的权重系数，初始取值见附录。

（五）综合调频性能指标均值

$$
K^{i,t}=\frac{\sum_{j=1}^{N}K^{i,j}}{N}
$$

其中，$K^{i,t}$ 是交易时段 $t$ 内的综合调频性能指标 $K^{i,j}$ 的平均值，小数点后保留两位；$N$ 为交易时段 $t$ 内纳入统计的调节次数。
"""

SECTION_26 = r"""第二十六条【排序价格】为横向比较调频单元之间的性能差异，交易前将调频单元最近 5 个中标日的综合调频性能指标平均值进行归一化处理。

设第 $i$ 台调频单元的综合调频性能指标为 $K_i$，全部调频单元中综合调频性能指标的最大值为 $K_{\max}$，归一化之后的综合调频性能指标用 $P_i$ 表示，归一化公式：

$$
P_i=K_i/K_{\max}
$$

归一化之后，最大值为 1。以归一化后的调频单元综合调频性能指标 $P$ 将各调频单元的调频里程报价进行调整，作为调频里程排序价格。调频里程排序价格计算公式为：

$$
\mathrm{调频里程排序价格}=\frac{\mathrm{调频里程报价}}{P}
$$
"""

SECTION_38_TO_40 = r"""第三十八条 调频单元的调频里程服务费按小时计费，计算公式如下：

$$
R^{i,t}_{\mathrm{调频里程服务费}}=M\times\sum_{t=1}^{N}D^{i,t}\times B^t_{\mathrm{出清价格}}\times K^{i,t}
$$

其中，$D^{i,t}$ 为调频单元 $i$ 在交易时段 $t$ 内的调频里程；$B^t_{\mathrm{出清价格}}$ 为交易时段 $t$ 内调频里程日内统一出清价格；$K^{i,t}$ 为调频单元 $i$ 在交易时段 $t$ 内的综合调频性能指标均值，最大值不超过 2。

为合理控制调频市场服务费规模，设置服务费调节系数 $M$，计算公式如下：$M=\mathrm{已纳入调频市场分摊的日电量}/\mathrm{调度总发受电日电量}$。

第三十九条【分摊范围】根据国家相关文件要求，电力现货市场连续运行前，原则上不向用户侧疏导辅助服务费用，调频市场服务费由发电侧并网主体共同分担，分担范围如下：（一）已注册入市的发电侧并网主体，包括火电（燃煤、燃气、燃油及垃圾生物质电站等）、水力发电厂、风力发电场、光伏电站（不含分布式）等；（二）独立储能、抽水蓄能、虚拟电厂暂不参与分摊；（三）新建发电机组调试运行期间费用分摊按照有关规定执行。

电力现货市场连续运行后，符合要求的调频辅助服务费用（不含提供辅助服务过程中产生的电量费用），原则上由用户用电量和未参与电能量市场交易的上网电量共同分担，分担比例及费用传导机制另行制定。

第四十条【分摊费】分摊费先由电力现货市场实时发电执行偏差考核费冲抵，不足部分按照发电侧并网主体每小时加权上网电量的比例进行分摊，计算公式如下。发电侧并网主体交易时段需要支出的费用计算公式为：

$$
S^{i,t}=\frac{Q^{i,t}_{\mathrm{加权电量}}}{Q^t_{\mathrm{总加权电量}}}\times R^t_{\mathrm{服务费}}
$$

其中，$S^{i,t}$ 为发电侧并网主体 $i$ 在交易时段 $t$ 内需支出的费用；$Q^{i,t}_{\mathrm{加权电量}}$ 为发电侧并网主体 $i$ 在交易时段 $t$ 内的加权上网电量；$Q^t_{\mathrm{总加权电量}}$ 为所有发电侧并网主体在交易时段 $t$ 内的总加权上网电量；$R^t_{\mathrm{服务费}}$ 为交易时段 $t$ 内调频里程服务费总额。

发电侧并网主体 $i$ 的加权上网电量计算公式为：

$$
Q^{i,t}_{\mathrm{加权电量}}=Q^{i,t}_{\mathrm{上网电量}}\times N_i
$$

其中，$Q^{i,t}_{\mathrm{上网电量}}$ 为发电侧并网主体 $i$ 交易时段 $t$ 内的上网电量；$N_i$ 为该发电侧并网主体的分摊系数，分摊系数取值见附录：调频市场参数表。
"""

PARAM_TABLE_HEADERS = ["市场参数名称", "对应符号", "初始取值"]
PARAM_TABLE_ROWS = [
    ["调节速率权重系数", r"$\lambda_1$", "0.4"],
    ["响应时间权重系数", r"$\lambda_2$", "0.3"],
    ["调节精度权重系数", r"$\lambda_3$", "0.3"],
    ["综合调频性能指标准入门槛", r"$K_a$", "0.3"],
    ["标准响应时间", r"$T_0$", "60 秒"],
    ["调频单元调节允许误差", r"$E_0$", "2%额定容量"],
    ["调频单元调节速率指标上限", r"$K_1^U$", "3"],
    ["调频里程价格申报上限", r"$C^U$", "15 元/兆瓦"],
    ["调频里程价格申报下限", r"$C^L$", "4 元/兆瓦"],
    ["调频单元出清容量下限", r"$Q^L$", "10 兆瓦"],
    ["独立储能出清容量上限", r"$Q^U_{\mathrm{储能}}$", "额定容量"],
    ["水电出清容量上限", r"$Q^U_{\mathrm{水}}$", "50%额定容量"],
    ["水电强制出清容量上限范围", r"$Q^U_{\mathrm{水强制出清范围}}$", "50~200 兆瓦"],
    ["火电出清容量上限", r"$Q^U_{\mathrm{火}}$", "7.5%额定容量"],
    ["调频容量占总需求比例上限", r"$Q^U_{\mathrm{调频容量}}$", "20%"],
    ["储能中标容量占总需求比例上限", r"$Q^U_{\mathrm{储能}}$", "40%"],
    ["未申报调频服务的经营主体分摊系数", r"$N_{\mathrm{未申报经营主体}}$", "1.5"],
    ["其他电源分摊系数", r"$N_{\mathrm{其他电源}}$", "1"],
]

APPENDIX_PARAMS_TABLE = r"""## 附录

### 调频市场参数表

| 市场参数名称 | 对应符号 | 初始取值 |
| --- | --- | --- |
| 调节速率权重系数 | $\lambda_1$ | 0.4 |
| 响应时间权重系数 | $\lambda_2$ | 0.3 |
| 调节精度权重系数 | $\lambda_3$ | 0.3 |
| 综合调频性能指标准入门槛 | $K_a$ | 0.3 |
| 标准响应时间 | $T_0$ | 60 秒 |
| 调频单元调节允许误差 | $E_0$ | 2%额定容量 |
| 调频单元调节速率指标上限 | $K_1^U$ | 3 |
| 调频里程价格申报上限 | $C^U$ | 15 元/兆瓦 |
| 调频里程价格申报下限 | $C^L$ | 4 元/兆瓦 |
| 调频单元出清容量下限 | $Q^L$ | 10 兆瓦 |
| 独立储能出清容量上限 | $Q^U_{\mathrm{储能}}$ | 额定容量 |
| 水电出清容量上限 | $Q^U_{\mathrm{水}}$ | 50%额定容量 |
| 水电强制出清容量上限范围 | $Q^U_{\mathrm{水强制出清范围}}$ | 50~200 兆瓦 |
| 火电出清容量上限 | $Q^U_{\mathrm{火}}$ | 7.5%额定容量 |
| 调频容量占总需求比例上限 | $Q^U_{\mathrm{调频容量}}$ | 20% |
| 储能中标容量占总需求比例上限 | $Q^U_{\mathrm{储能}}$ | 40% |
| 未申报调频服务的经营主体分摊系数 | $N_{\mathrm{未申报经营主体}}$ | 1.5 |
| 其他电源分摊系数 | $N_{\mathrm{其他电源}}$ | 1 |

备注：

1. 调频市场参数表根据市场运营情况定期更新，以调频市场交易系统公布版本为准。
2. 未申报调频服务的经营主体指已纳入调频服务提供主体的火电和水电，其分摊系数按日计算，如当日参与调频市场申报则分摊系数为 1，如未参与申报则分摊系数为 1.5。经营主体如未达到准入门槛，视为未申报。
"""


def backup(paths: list[Path]) -> Path:
    backup_dir = Path("/private/tmp") / f"hunan_freq_formula_repair_{datetime.now():%Y%m%d-%H%M%S}"
    for path in paths:
        if not path.exists():
            continue
        rel = path.relative_to(POLICY_DIR)
        dest = backup_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)
    return backup_dir


def replace_between(text: str, start: str, end: str, replacement: str) -> str:
    pattern = re.compile(rf"{re.escape(start)}.*?(?={re.escape(end)})", re.S)
    text, count = pattern.subn(lambda _match: replacement.rstrip() + "\n\n", text, count=1)
    if count != 1:
        raise RuntimeError(f"未找到段落：{start}")
    return text


def replace_appendix_table(text: str) -> str:
    pattern = re.compile(r"(?:##\s+)?附录(?:\s*\n+###\s+调频市场参数表|调频市场参数表).*?\Z", re.S)
    text, count = pattern.subn(lambda _match: APPENDIX_PARAMS_TABLE.rstrip() + "\n", text, count=1)
    if count != 1:
        raise RuntimeError("未找到附录调频市场参数表")
    return text


def repair_markdown(text: str) -> str:
    text = replace_between(text, "第十条【综合调频性能指标】", "## 第三章 市场成员", SECTION_10)
    text = replace_between(text, "第二十六条【排序价格】", "第二十七条【安全校核】", SECTION_26)
    text = replace_between(text, "第三十八条 调频单元的调频里程服务费", "第四十一条【差错费用纠正】", SECTION_38_TO_40)
    text = replace_appendix_table(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def prune_spurious_tables(structured: dict) -> dict:
    context_before = None
    for table in structured.get("tables", []):
        if table.get("headers") == PARAM_TABLE_HEADERS and table.get("context_before"):
            context_before = table.get("context_before")
            break
    canonical_table = {
        "node_type": "table",
        "table_id": "T-0001",
        "page": None,
        "bbox": [0, 0, 0, 0],
        "context_before": context_before,
        "title": "调频市场参数表",
        "headers": PARAM_TABLE_HEADERS,
        "rows": PARAM_TABLE_ROWS,
        "confidence": 0.98,
        "status": "resolved",
        "raw_text": "\n".join(
            [" | ".join(PARAM_TABLE_HEADERS)] + [" | ".join(row) for row in PARAM_TABLE_ROWS]
        ),
    }

    def rewrite_refs(node):
        if isinstance(node, dict):
            if node.get("node_type") == "table_ref":
                node["table_id"] = "T-0001"
            for value in node.values():
                rewrite_refs(value)
        elif isinstance(node, list):
            for item in node:
                rewrite_refs(item)

    structured["tables"] = [canonical_table]
    rewrite_refs(structured.get("chapters", []))
    quality = structured.setdefault("quality_report", {})
    structured["unresolved_items"] = [
        item for item in structured.get("unresolved_items", []) if item.get("item_type") != "table"
    ]
    quality["table_count"] = 1
    quality["unresolved_table_count"] = 0
    return structured


def rebuild_outputs(pdf: Path) -> dict:
    md_path = pdf.with_suffix(".md")
    md_path.write_text(repair_markdown(md_path.read_text(encoding="utf-8")), encoding="utf-8")

    html_path = md_to_html.convert_file(md_path)
    html_text = render_formula_blocks(html_path.read_text(encoding="utf-8"))
    html_path.write_text(html_text, encoding="utf-8")
    ZC_HTML_DIR.mkdir(exist_ok=True)
    (ZC_HTML_DIR / f"{pdf.stem}.html").write_text(html_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{pdf.stem}.zc_skill.html").write_text(html_text, encoding="utf-8")

    base_report = md_to_json.load_base_report(pdf, ZC_HTML_DIR)
    structured = prune_spurious_tables(postprocess_structured(md_to_json.parse_markdown(md_path, base_report)))
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
    pdf = POLICY_DIR / f"{STEM}.pdf"
    paths = [
        pdf.with_suffix(".md"),
        pdf.with_suffix(".html"),
        ZC_HTML_DIR / f"{STEM}.html",
        ZC_HTML_DIR / f"{STEM}.zc_skill.html",
        ZC_HTML_DIR / f"{STEM}.json",
        ZC_STRUCTURED_DIR / f"{STEM}.structured.json",
        ZC_STRUCTURED_DIR / f"{STEM}.zc_skill.structured.json",
    ]
    backup_dir = backup(paths)
    print(f"backup_dir={backup_dir}")
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
