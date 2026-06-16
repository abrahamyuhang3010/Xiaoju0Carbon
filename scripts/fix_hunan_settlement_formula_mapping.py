#!/usr/bin/env python3
"""Repair formula/image OCR in Hunan settlement policy outputs."""

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

MAIN_STEM = "【20251024】关于印发《湖南省电力市场结算实施细则》的通知（湘发改价调〔2025〕655号）"
AMEND_STEM = "【20260503】湘发改价调〔2026〕240号关于完善《湖南省电力市场结算实施细则》有关政策的通知"

sys.path.insert(0, str(TOOLS_DIR))
sys.path.insert(0, str(WORKSPACE / "scripts"))

import convert_md_to_html as md_to_html  # type: ignore  # noqa: E402
import markdown_to_structured_json as md_to_json  # type: ignore  # noqa: E402
from parse_hunan_policy_pdfs_with_skill import (  # type: ignore  # noqa: E402
    postprocess_structured,
    render_formula_blocks,
    split_numbered_items,
)


def math_block(latex: str) -> str:
    return f"\n\n$$\n{latex.strip()}\n$$\n\n"


def replace_formula_image(text: str, filename: str, replacement: str) -> str:
    return re.sub(
        rf"!\[公式\]\([^)]*{re.escape(filename)}\)",
        lambda _match: replacement,
        text,
        count=1,
    )


def backup(paths: list[Path]) -> Path:
    backup_dir = Path("/private/tmp") / f"hunan_settlement_formula_repair_{datetime.now():%Y%m%d-%H%M%S}"
    for path in paths:
        if not path.exists():
            continue
        rel = path.relative_to(POLICY_DIR)
        dest = backup_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)
    return backup_dir


AMEND_FORMULAS = {
    "formula_p005_para_03.png": "",
    "formula_p005_para_04.png": math_block(
        r"Q_{\mathrm{新能源省内现货结算}}=Q_{\mathrm{新能源实际上网}}-"
        r"(Q_{\mathrm{新能源实际上网}}-Q_{\mathrm{新能源省间现货}}-Q_{\mathrm{新能源华中调峰购入服务}}-"
        r"Q_{\mathrm{新能源应急调度}}-Q_{\mathrm{新能源省间合约}})\times J_{\mathrm{机制比例}}-"
        r"Q_{\mathrm{新能源省间现货}}-Q_{\mathrm{新能源华中调峰购入服务}}-Q_{\mathrm{新能源应急调度}}-Q_{\mathrm{新能源省间合约}}"
    ),
    "formula_p005_para_05.png": "当 $Q_{\\mathrm{新能源省内现货结算}}<0$ 时，取 0 值；",
    "formula_p005_para_06.png": (
        "当 $Q_{\\mathrm{新能源省内合约}}<Q_{\\mathrm{新能源省内现货结算}}\\times K_2$，"
        "且 $P_{\\mathrm{新能源中长期综合电价}}<P_{\\mathrm{新能源日前均价}}$ 时，"
    ),
    "formula_p007_para_07.png": math_block(
        r"Q_{\mathrm{新能源省内现货结算}}=Q_{\mathrm{新能源实际上网}}-"
        r"(Q_{\mathrm{新能源实际上网}}-Q_{\mathrm{新能源省间现货}}-Q_{\mathrm{新能源华中调峰购入服务}}-"
        r"Q_{\mathrm{新能源应急调度}}-Q_{\mathrm{新能源省间合约}})\times J_{\mathrm{机制比例}}-"
        r"Q_{\mathrm{新能源省间现货}}-Q_{\mathrm{新能源省间合约}}"
    ),
    "formula_p007_para_08.png": "当 $Q_{\\mathrm{新能源省内现货结算}}<0$ 时，取 0 值；",
    "formula_p007_para_09.png": (
        "当 $Q_{\\mathrm{新能源省内合约}}>Q_{\\mathrm{新能源省内现货结算}}\\times K_6$，"
        "且 $P_{\\mathrm{新能源中长期综合电价}}>P_{\\mathrm{新能源日前均价}}$ 时，"
    ),
    "formula_p008_para_10.png": (
        "当 $Q_{\\mathrm{上网},i}>0$，且 "
        "$Q_{\\mathrm{上网},i}-Q_{\\mathrm{省内合约},i}-Q_{\\mathrm{省间售出},i}>0$，且 "
        "$(Q_{\\mathrm{上网},i}-Q_{\\mathrm{省内合约},i}-Q_{\\mathrm{省间售出},i})\\times C_{\\mathrm{核定成本},i}"
        "-\\sum_t(R_{\\mathrm{省内日前},i,t}+R_{\\mathrm{省内实时},i,t})>0$ 时，该月予以补偿。"
    ),
    "formula_p008_para_11.png": "",
    "formula_p008_para_12.png": math_block(
        r"R_{\mathrm{火电机组运行补偿费用},i}=(Q_{\mathrm{上网},i}-Q_{\mathrm{省内合约},i}-Q_{\mathrm{省间售出},i})"
        r"\times C_{\mathrm{核定成本},i}-\sum_t(R_{\mathrm{省内日前},i,t}+R_{\mathrm{省内实时},i,t})"
    ),
    "formula_p009_para_13.png": math_block(
        r"Q_{\mathrm{火电省内现货结算}}=Q_{\mathrm{火电实际上网}}-Q_{\mathrm{火电省间现货}}-"
        r"Q_{\mathrm{火电华中备用}}+Q_{\mathrm{火电华中调峰售出}}-Q_{\mathrm{火电省间合约}}"
    ),
    "formula_p009_para_14.png": (
        "当 $Q_{\\mathrm{火电省内合约}}<Q_{\\mathrm{火电省内现货结算}}\\times K_1$，"
        "且 $P_{\\mathrm{火电中长期综合电价}}<P_{\\mathrm{火电日前均价}}$ 时，"
    ),
    "formula_p011_para_15.png": (
        "当 $Q_{\\mathrm{火电省内合约}}>Q_{\\mathrm{火电省内现货结算}}\\times K_5$，"
        "且 $P_{\\mathrm{火电中长期综合电价}}>P_{\\mathrm{火电日前均价}}$ 时，"
    ),
    "formula_p013_para_16.png": math_block(
        r"R_{\mathrm{日内非停回收}}=\sum_t(Q_{\mathrm{日前结算},t}-Q_{\mathrm{实时结算},t})"
        r"\times(P_{\mathrm{日前},t}-P_{\mathrm{实时},t})"
    ),
    "formula_p015_para_17.png": math_block(
        r"R_{\mathrm{省内实时}}=\sum_t[(Q_{\mathrm{上网},t}-Q_{\mathrm{非市场},t}-Q_{\mathrm{中长期},t}-Q_{\mathrm{省间},t})"
        r"\times P_{\mathrm{实时统一},t}]"
    ),
    "formula_p016_para_18.png": (
        "当 $Q_{\\mathrm{用户月度中长期合约},t}<Q_{\\mathrm{用户月度实际用电},t}\\times K_3$，"
        "且 $P_{\\mathrm{用户中长期综合电价},t}>P_{\\mathrm{参考点日前均价},t}$ 时，"
    ),
    "formula_p016_para_19.png": math_block(
        r"R_{\mathrm{用户侧中长期缺额回收},t}=\sum(Q_{\mathrm{用户月度实际用电},t}\times K_3-Q_{\mathrm{用户月度中长期合约},t})"
        r"\times(P_{\mathrm{用户中长期综合电价},t}-P_{\mathrm{参考点日前均价},t})\times h_3"
    ),
    "formula_p017_para_20.png": (
        "当 $Q_{\\mathrm{用户月度中长期合约},t}>Q_{\\mathrm{用户月度实际用电},t}\\times K_7$，"
        "且 $P_{\\mathrm{用户中长期综合电价},t}<P_{\\mathrm{参考点日前均价},t}$ 时，"
    ),
    "formula_p017_para_21.png": math_block(
        r"R_{\mathrm{用户侧中长期超额回收},t}=\sum(Q_{\mathrm{用户月度中长期合约},t}-Q_{\mathrm{用户月度实际用电},t}\times K_7)"
        r"\times(P_{\mathrm{参考点日前均价},t}-P_{\mathrm{用户中长期综合电价},t})\times h_7"
    ),
    "formula_p018_para_22.png": math_block(
        r"R_{\mathrm{售电公司}}=C_{\mathrm{零售电能量}}-R_{\mathrm{市场运营},\mathrm{售电}}-C_{\mathrm{批发用户}}+C_{\mathrm{退补}}"
    ),
    "formula_p018_para_23.png": "当 $R_{\\mathrm{储能}}<0$ 时，$R_{\\mathrm{储能补偿}}=-R_{\\mathrm{储能}}$；",
    "formula_p018_para_24.png": "当 $R_{\\mathrm{储能}}\\ge 0$ 时，$R_{\\mathrm{储能补偿}}=0$。",
    "formula_p019_para_25.png": math_block(
        r"Q_{\mathrm{间接参与省内现货结算}}=Q_{\mathrm{实际上网}}-Q_{\mathrm{省间现货}}-Q_{\mathrm{华中调峰购入服务}}-"
        r"Q_{\mathrm{应急调度}}-Q_{\mathrm{省间合约}}-Q_{\mathrm{非市场}}"
    ),
    "formula_p019_para_26.png": (
        "当 $Q_{\\mathrm{省内合约}}<Q_{\\mathrm{间接参与省内现货结算}}\\times K_{10}$，"
        "且 $P_{\\mathrm{间接参与中长期综合电价}}<P_{\\mathrm{现货综合},m}$ 时，"
    ),
    "formula_p019_para_27.png": math_block(
        r"R_{\mathrm{间接参与中长期缺额回收}}=\sum(Q_{\mathrm{间接参与省内现货结算}}\times K_{10}-Q_{\mathrm{省内合约}})"
        r"\times(P_{\mathrm{现货综合},m}-P_{\mathrm{间接参与中长期综合电价}})\times h_{10}"
    ),
    "formula_p021_para_28.png": math_block(
        r"Q_{\mathrm{间接参与省内现货结算}}=Q_{\mathrm{实际上网}}-Q_{\mathrm{省间现货}}-Q_{\mathrm{省间合约}}-Q_{\mathrm{非市场}}"
    ),
    "formula_p021_para_29.png": (
        "当 $Q_{\\mathrm{省内合约}}>Q_{\\mathrm{间接参与省内现货结算}}\\times K_{11}$，"
        "且 $P_{\\mathrm{间接参与中长期综合电价}}>P_{\\mathrm{现货综合},m}$ 时，"
    ),
    "formula_p021_para_30.png": math_block(
        r"R_{\mathrm{间接参与中长期超额回收}}=\sum(Q_{\mathrm{省内合约}}-Q_{\mathrm{间接参与省内现货结算}}\times K_{11})"
        r"\times(P_{\mathrm{间接参与中长期综合电价}}-P_{\mathrm{现货综合},m})\times h_{11}"
    ),
}


MAIN_FORMULAS = {
    "formula_p013_para_01.png": "各时段扣减定比电量=各时段抄见电量×月度定比值；",
    "formula_p014_para_02.png": "各时段扣减定量电量=月度定量电量/（核算周期实际天数×24），主表扣减定量结果小于零时按零计算。",
    "formula_p026_para_03.png": math_block(r"R_{\mathrm{调试}}=Q_{\mathrm{调试}}\times P_{\mathrm{调试}}"),
    "formula_p030_para_04.png": math_block(r"R_{\mathrm{省间合约}}=\sum(Q_{\mathrm{省间合约},t}\times P_{\mathrm{省间合约},t})"),
    "formula_p031_para_05.png": math_block(
        r"R_{\mathrm{省内日前}}=\sum[(Q_{\mathrm{日前结算},t}-Q_{\mathrm{中长期},t})\times P_{\mathrm{日前},t}]"
        "\n"
        r"Q_{\mathrm{中长期},t}=Q_{\mathrm{省内合约},t}+Q_{\mathrm{省间合约},t}"
        "\n"
        r"Q_{\mathrm{日前结算},t}=Q_{\mathrm{日前出清},t}-Q_{\mathrm{省间日前现货},t}-Q_{\mathrm{日前华中备用},t}+Q_{\mathrm{日前华中调峰售出服务},t}-Q_{\mathrm{日前华中调峰购入服务},t}-Q_{\mathrm{日前应急调度},t}-Q_{\mathrm{非市场},t}"
    ),
    "formula_p034_para_06.png": math_block(r"R_{\mathrm{调平}}=Q_{\mathrm{调平}}\times P_{\mathrm{现货综合},m}"),
    "formula_p034_para_07.png": "其中，$Q_{\\mathrm{调平}}$ 为机组（场站）月度上网结算电量与日清累计上网电量之差。",
    "formula_p036_para_08.png": math_block(
        r"C_{\mathrm{日前申报偏差}}=(Q_{\mathrm{日前申报},t}-Q_{\mathrm{实时},t}\times(1+\lambda))"
        r"\times(P_{\mathrm{日前统一},t}-P_{\mathrm{实时统一},t})"
    ),
    "formula_p038_para_09.png": math_block(
        r"R_{\mathrm{储能}}=R_{\mathrm{储能上网}}-C_{\mathrm{储能下网}}+C_{\mathrm{储能上网调平}}-C_{\mathrm{储能下网调平}}"
    ),
    "formula_p039_para_10.png": math_block(
        r"C_{\mathrm{储能上网}}=C_{\mathrm{储能上网中长期}}+C_{\mathrm{储能上网日前}}+C_{\mathrm{储能上网实时}}"
        "\n"
        r"C_{\mathrm{储能上网中长期}}=\sum Q_{\mathrm{储能上网中长期},t}\times P_{\mathrm{中长期},t}"
        "\n"
        r"C_{\mathrm{储能上网日前}}=\sum(Q_{\mathrm{日前放电},t}-Q_{\mathrm{储能上网中长期},t})\times P_{\mathrm{日前},t}"
        "\n"
        r"C_{\mathrm{储能上网实时}}=\sum(Q_{\mathrm{实时放电},t}-Q_{\mathrm{日前放电},t})\times P_{\mathrm{实时},t}"
    ),
    "formula_p040_para_11.png": math_block(
        r"C_{\mathrm{储能下网}}=C_{\mathrm{储能下网中长期}}+C_{\mathrm{储能下网日前}}+C_{\mathrm{储能下网实时}}"
        "\n"
        r"C_{\mathrm{储能下网中长期}}=\sum Q_{\mathrm{储能下网中长期},t}\times P_{\mathrm{中长期},t}"
        "\n"
        r"C_{\mathrm{储能下网日前}}=\sum(Q_{\mathrm{日前充电},t}-Q_{\mathrm{储能下网中长期},t})\times P_{\mathrm{日前},t}"
        "\n"
        r"C_{\mathrm{储能下网实时}}=-\sum(Q_{\mathrm{实时充电},t}-Q_{\mathrm{日前充电},t})\times P_{\mathrm{实时},t}"
    ),
    "formula_p040_para_12.png": math_block(
        r"C_{\mathrm{储能上网调平}}=\sum[(Q_{\mathrm{储能月度上网}}-Q_{\mathrm{储能上网实时}})\times P_{\mathrm{现货综合},m}]"
        "\n"
        r"C_{\mathrm{储能下网调平}}=-\sum[(Q_{\mathrm{储能月度下网}}-Q_{\mathrm{储能下网实时}})\times P_{\mathrm{现货综合},m}]"
    ),
    "formula_p043_para_13.png": math_block(r"C_{\mathrm{零售电能量}}=Q_{\mathrm{实际}}\times P_{\mathrm{套餐}}"),
    "formula_p043_para_14.png": "",
    "formula_p044_para_15.png": math_block(
        r"P_{\Sigma\mathrm{平均}}=\frac{C_{\Sigma\mathrm{中长期合约}}+C_{\Sigma\mathrm{日前}}+C_{\Sigma\mathrm{实时}}+C_{\Sigma\mathrm{日前申报偏差}}+C_{\Sigma\mathrm{调平}}}{Q_{\Sigma\mathrm{实际}}}"
    ),
    "formula_p045_para_16.png": math_block(
        r"P_{\mathrm{交易均价+服务费}}=P_{\mathrm{均}}+P_{\mathrm{服务}}"
        "\n"
        r"P_{\mathrm{均}}=\frac{C_{\mathrm{中长期合约}}+C_{\mathrm{日前}}+C_{\mathrm{实时}}+C_{\mathrm{日前申报偏差}}+C_{\mathrm{调平}}}{Q_{\Sigma\mathrm{实际代理}}}"
    ),
    "formula_p045_para_17.png": math_block(
        r"P_{\mathrm{比例分成}}=P_{\Sigma\mathrm{平均}}-(P_{\Sigma\mathrm{平均}}-P_{\mathrm{均}})\times K_{\mathrm{分成}}"
    ),
    "formula_p046_para_18.png": math_block(
        r"P_{\Sigma\mathrm{平均}}=\frac{C_{\Sigma\mathrm{中长期合约}}+C_{\Sigma\mathrm{日前}}+C_{\Sigma\mathrm{实时}}+C_{\Sigma\mathrm{日前申报偏差}}+C_{\Sigma\mathrm{调平}}}{Q_{\Sigma\mathrm{实际}}}"
    ),
    "formula_p048_para_19.png": math_block(r"P_{\mathrm{绿电}}=P_{\mathrm{电能量}}+P_{\mathrm{环境}}"),
    "formula_p049_para_20.png": math_block(r"R_{\mathrm{启动补偿},i}=\sum P_{\mathrm{启动},i}"),
    "formula_p051_para_21.png": math_block(
        r"R_{\mathrm{申报},i,t}=(1-h_{\mathrm{厂用},i})\times\left(1-\frac{Q_{\mathrm{省间售出},i,t}}{Q_{\mathrm{实际上网},i,t}}\right)\times ∫_0^{F_{\mathrm{实际},i,t}} C_{\mathrm{bid},i}(F)dF"
    ),
    "formula_p053_para_22.png": "当 $R_{\\mathrm{储能}}<0$ 时，$R_{\\mathrm{储能补偿}}=-R_{\\mathrm{储能}}$；",
    "formula_p053_para_23.png": "当 $R_{\\mathrm{储能}}\\ge 0$ 时，$R_{\\mathrm{储能补偿}}=0$。",
    "formula_p056_para_24.png": math_block(
        r"Q_{\mathrm{火电省内现货结算}}=Q_{\mathrm{火电实际上网}}-Q_{\mathrm{火电省间现货}}-Q_{\mathrm{火电华中备用}}+Q_{\mathrm{火电华中调峰售出}}-Q_{\mathrm{火电省间合约}}"
        "\n"
        r"R_{\mathrm{火电中长期缺额回收}}=(Q_{\mathrm{火电省内现货结算}}\times K_1-Q_{\mathrm{火电省内合约}})\times(P_{\mathrm{火电日前均价}}-P_{\mathrm{火电中长期综合电价}})\times h_1"
    ),
    "formula_p057_para_25.png": "",
    "formula_p057_para_26.png": (
        "当 $Q_{\\mathrm{新能源省内合约}}<Q_{\\mathrm{新能源省内现货结算}}\\times K_2$，"
        "且 $P_{\\mathrm{新能源中长期综合电价}}<P_{\\mathrm{新能源日前均价}}$ 时，"
        + math_block(
            r"R_{\mathrm{新能源中长期缺额回收}}=\sum(Q_{\mathrm{新能源省内现货结算}}\times K_2-Q_{\mathrm{新能源省内合约}})"
            r"\times(P_{\mathrm{新能源日前均价}}-P_{\mathrm{新能源中长期综合电价}})\times h_2"
        )
    ),
    "formula_p060_para_27.png": math_block(
        r"R_{\mathrm{虚拟电厂发电单元中长期缺额回收}}=\sum(Q_{\mathrm{虚拟电厂发电单元实际上网}}\times K_4-Q_{\mathrm{虚拟电厂发电单元中长期合约}})"
        r"\times(P_{\mathrm{参考点日前均价}}-P_{\mathrm{虚拟电厂发电单元中长期综合电价}})\times h_4"
    ),
    "formula_p062_para_28.png": (
        "当 $Q_{\\mathrm{新能源省内合约}}>Q_{\\mathrm{新能源省内现货结算}}\\times K_6$，"
        "且 $P_{\\mathrm{新能源中长期综合电价}}>P_{\\mathrm{新能源日前均价}}$ 时，"
    ),
    "formula_p062_para_29.png": math_block(
        r"R_{\mathrm{新能源中长期超额回收}}=\sum(Q_{\mathrm{新能源省内合约}}-Q_{\mathrm{新能源省内现货结算}}\times K_6)"
        r"\times(P_{\mathrm{新能源中长期综合电价}}-P_{\mathrm{新能源日前均价}})\times h_6"
    ),
    "formula_p065_para_30.png": math_block(
        r"R_{\mathrm{火电超额获益日回收}}=(R_{\mathrm{省内合约}}+R_{\mathrm{省内日前}}+R_{\mathrm{省内实时}})\times h_9"
    ),
    "formula_p068_para_31.png": "",
    "formula_p068_para_32.png": "",
    "formula_p068_para_33.png": math_block(r"Q_{\mathrm{实发},t}=\sum_{n=1}^{15}P_{\mathrm{实发},n}/60"),
    "formula_p068_para_34.png": math_block(
        r"P_{\mathrm{实时出清},n}=P_{\mathrm{实时出清},t-1}+n\times(P_{\mathrm{实时出清},t}-P_{\mathrm{实时出清},t-1})/15"
    ),
    "formula_p069_para_35.png": math_block(r"R_{\mathrm{偏差},t}=Q_{\mathrm{偏差},t}\times P_{\mathrm{考核}}\times r_2"),
    "formula_p069_para_36.png": "",
    "formula_p069_para_37.png": "",
    "formula_p070_para_38.png": math_block(
        r"Q_{\mathrm{偏差},t}=\max\{|Q_{\mathrm{实际},t}-Q_{\mathrm{日前申报},t}|-Q_{\mathrm{允许偏差},t},0\}"
    ),
    "formula_p070_para_39.png": "",
    "formula_p070_para_40.png": math_block(r"Q_{\mathrm{允许偏差},t}=\max\{Q_{\mathrm{日前申报},t}\times r_1,M\}"),
    "formula_p070_para_41.png": math_block(r"R_{\mathrm{偏差},t}=Q_{\mathrm{偏差},t}\times P_{\mathrm{考核}}\times r_2"),
    "formula_p077_para_42.png": math_block(
        r"Q_{\mathrm{退补}}=Q_{\mathrm{调整后}}-Q_{\mathrm{调整前}}"
        "\n"
        r"C_{\mathrm{售电公司调整}}=(P_{\mathrm{套餐}}-P_{\mathrm{售电公司电能量}})\times Q_{\mathrm{退补}}"
    ),
}


PLAIN_REPAIRS = [
    (
        r"R 新能源中长期缺额回收=.*?×h2\s*(?=\n\n其中：)",
        math_block(
            r"R_{\mathrm{新能源中长期缺额回收}}=(Q_{\mathrm{新能源省内现货结算}}\times K_2-Q_{\mathrm{新能源省内合约}})"
            r"\times(P_{\mathrm{新能源日前均价}}-P_{\mathrm{新能源中长期综合电价}})\times h_2"
        ),
    ),
    (
        r"R 新能源中长期超额回收=.*?×h6\s*(?=\n\n其中，)",
        math_block(
            r"R_{\mathrm{新能源中长期超额回收}}=(Q_{\mathrm{新能源省内合约}}-Q_{\mathrm{新能源省内现货结算}}\times K_6)"
            r"\times(P_{\mathrm{新能源中长期综合电价}}-P_{\mathrm{新能源日前均价}})\times h_6"
        ),
    ),
    (
        r"R 火电中长期缺额回收=.*?×h1\s*(?=\n\n其中：)",
        math_block(
            r"R_{\mathrm{火电中长期缺额回收}}=(Q_{\mathrm{火电省内现货结算}}\times K_1-Q_{\mathrm{火电省内合约}})"
            r"\times(P_{\mathrm{火电日前均价}}-P_{\mathrm{火电中长期综合电价}})\times h_1"
        ),
    ),
    (
        r"Q 火电省内现货结算=Q 火电实际上网.*?Q 火电省间合约\s*(?=\n\n)",
        math_block(
            r"Q_{\mathrm{火电省内现货结算}}=Q_{\mathrm{火电实际上网}}-Q_{\mathrm{火电省间现货}}-Q_{\mathrm{火电华中备用}}+Q_{\mathrm{火电华中调峰售出}}-Q_{\mathrm{火电省间合约}}"
        ),
    ),
    (
        r"R 火电中长期超额回收=.*?×h5\s*(?=\n\n其中，)",
        math_block(
            r"R_{\mathrm{火电中长期超额回收}}=(Q_{\mathrm{火电省内合约}}-Q_{\mathrm{火电省内现货结算}}\times K_5)"
            r"\times(P_{\mathrm{火电中长期综合电价}}-P_{\mathrm{火电日前均价}})\times h_5"
        ),
    ),
]


MAIN_NOISE_TOKENS = (
    "已%",
    "SY2",
    "$33",
    "GS/8G5",
    "30-64",
    "2~少",
    "省闽",
    "省阔",
    "省润",
    "日韵",
    "日消",
    "日當",
    "日散",
    "百苗",
    "鸡峰",
    "强峰",
    "调降",
    "緒能",
    "豬能",
    "儲能",
    "鐘能",
    "倘差",
    "湿塞",
    "不平的",
    "国收",
    "鐵额",
    "铁额",
    "虚报",
    "洼拟",
    "虚拟車",
    "电與",
)


def repair_main_first_formula_cluster(text: str) -> str:
    """Replace the first garbled OCR formula cluster with normalized math blocks."""
    intro = (
        "第四十三条 发电侧主体电能量电费包含非市场电能量电费、调试运行期电能量电费、"
        "省间日前电能量电费、省间日内电能量电费、省间合约电能量电费、省内合约电能量电费、"
        "省内日前电能量电费、省内实时电能量电费、调平电费。计算公式如下："
    )
    replacement = (
        intro
        + math_block(
            r"R=R_{\mathrm{非市场}}+R_{\mathrm{调试}}+R_{\mathrm{省间日前}}+R_{\mathrm{省间合约}}+"
            r"R_{\mathrm{省间日内}}+R_{\mathrm{省内合约}}+R_{\mathrm{省内日前}}+R_{\mathrm{省内实时}}+R_{\mathrm{调平}}"
        )
        + "其中，$R_{\\mathrm{非市场}}$ 为机组（场站）非市场电能量电费，"
        "$R_{\\mathrm{调试}}$ 为机组（场站）调试运行期电能量电费，"
        "$R_{\\mathrm{省间日前}}$ 为机组（场站）省间日前电能量电费，"
        "$R_{\\mathrm{省间日内}}$ 为机组（场站）省间日内电能量电费，"
        "$R_{\\mathrm{省间合约}}$ 为机组（场站）省间中长期合约电能量电费，"
        "$R_{\\mathrm{省内合约}}$ 为机组（场站）省内中长期合约电能量电费，"
        "$R_{\\mathrm{省内日前}}$ 为机组（场站）省内日前电能量电费，"
        "$R_{\\mathrm{省内实时}}$ 为机组（场站）省内实时电能量电费，"
        "$R_{\\mathrm{调平}}$ 为机组（场站）月度调平电能量电费。\n\n"
        "（一）发电侧主体非市场电能量电费按照未参与电能量市场交易的分时上网电量和"
        "政府价格主管部门批复上网电价计算非市场电能量电费。计算公式如下："
        + math_block(r"R_{\mathrm{非市场}}=\sum_t(Q_{\mathrm{非市场},t}\times P_{\mathrm{批复}})")
        + "其中，$Q_{\\mathrm{非市场},t}$ 为机组（场站）$t$ 时段未参与电能量市场交易的上网结算电量，"
        "$P_{\\mathrm{批复}}$ 为机组（场站）政府价格主管部门批复上网电价。\n\n"
        "（二）新建机组（场站）调试运行期间"
    )
    pattern = (
        r"第四十三条 发电侧主体电能量电费包含非市场电能量电费、调试运行期电能量电费、"
        r"省间日前电能量电费、省间日内电能量电费、省间合约电能量电费、省内合约电能量电费、"
        r"省内日前电能量电费、省内实时电能量电费、调平电费。计算公式如下[？?：:]?"
        r".*?政府价格主管部门批复上网电价（二）新建机组（场站）调试运行期间"
    )
    return re.sub(pattern, lambda _match: replacement, text, count=1, flags=re.S)


def repair_main_interprovincial_clusters(text: str) -> str:
    replacement = (
        "其中，$Q_{\\mathrm{调试}}$ 为机组（场站）调试运行期电量，"
        "$P_{\\mathrm{调试}}$ 为机组（场站）调试电量电价，执行政府价格主管部门批复或审定的价格。\n\n"
        "（三）机组（场站）参与或由市场运营机构代理参与省间日前电力现货交易、"
        "日前华中省间调峰及备用辅助服务交易、日前跨省跨区应急调度保省内消纳售电交易时，"
        "省间日前电能量电费按机组（场站）省间日前交易出清电量（或分配电量）和"
        "省间日前交易出清价格计算省间日前电能量电费。计算公式如下："
        + math_block(
            r"R_{\mathrm{省间日前}}=R_{\mathrm{省间日前现货}}+R_{\mathrm{日前华中备用}}+"
            r"R_{\mathrm{日前华中备用预留}}-R_{\mathrm{日前华中调峰售出服务}}+"
            r"R_{\mathrm{日前华中调峰购入服务}}+R_{\mathrm{日前应急调度}}"
            "\n"
            r"R_{\mathrm{省间日前现货}}=\sum_t(Q_{\mathrm{省间日前现货},t}\times P_{\mathrm{省间日前现货},t})"
            "\n"
            r"R_{\mathrm{日前华中备用}}=\sum_t(Q_{\mathrm{日前华中备用},t}\times P_{\mathrm{日前华中备用},t})"
            "\n"
            r"R_{\mathrm{日前华中备用预留}}=\sum_t[(Q_{\mathrm{日前华中备用预留},t}-Q_{\mathrm{日前华中备用日内调用},t})\times P_{\mathrm{日前华中备用预留},t}]"
            "\n"
            r"R_{\mathrm{日前华中调峰售出服务}}=\sum_t(Q_{\mathrm{日前华中调峰售出服务},t}\times P_{\mathrm{日前华中调峰售出服务},t})"
            "\n"
            r"R_{\mathrm{日前华中调峰购入服务}}=\sum_t(Q_{\mathrm{日前华中调峰购入服务},t}\times P_{\mathrm{日前华中调峰购入服务},t})"
            "\n"
            r"R_{\mathrm{日前应急调度}}=\sum_t(Q_{\mathrm{日前应急调度},t}\times P_{\mathrm{日前应急调度},t})"
        )
        + "（四）机组（场站）参与或由市场运营机构代理参与省间日内电力现货交易、"
        "日内华中省间调峰及备用辅助服务交易、日内跨省跨区应急调度保省内消纳售电交易时，"
        "省间日内电能量电费按机组（场站）省间日内交易出清电量（或分配电量）和"
        "省间日内交易出清价格计算省间日内电能量电费。计算公式如下："
        + math_block(
            r"R_{\mathrm{省间日内}}=R_{\mathrm{省间日内现货}}+R_{\mathrm{日内华中备用}}-"
            r"R_{\mathrm{日内华中调峰售出服务}}+R_{\mathrm{日内华中调峰购入服务}}+R_{\mathrm{日内应急调度}}"
            "\n"
            r"R_{\mathrm{省间日内现货}}=\sum_t(Q_{\mathrm{省间日内现货},t}\times P_{\mathrm{省间日内现货},t})"
            "\n"
            r"R_{\mathrm{日内华中备用}}=\sum_t(Q_{\mathrm{日内华中备用},t}\times P_{\mathrm{日内华中备用},t})"
            "\n"
            r"R_{\mathrm{日内华中调峰售出服务}}=\sum_t(Q_{\mathrm{日内华中调峰售出服务},t}\times P_{\mathrm{日内华中调峰售出服务},t})"
            "\n"
            r"R_{\mathrm{日内华中调峰购入服务}}=\sum_t(Q_{\mathrm{日内华中调峰购入服务},t}\times P_{\mathrm{日内华中调峰购入服务},t})"
            "\n"
            r"R_{\mathrm{日内应急调度}}=\sum_t(Q_{\mathrm{日内应急调度},t}\times P_{\mathrm{日内应急调度},t})"
        )
        + "（五）机组（场站）参与省间中长期合约电能量电费按照省间中长期合约电量和中长期合约价格计算。计算公式如下："
    )
    pattern = (
        r"其中Q 福试为机组（场站）调试运行期电量P调法为机组（场站）调试电量电价，"
        r"执行政府价格主管部门批复或审定的价格（三）机组（场站）参与或由市场运营机构代理参与省间日前电力现货交易、"
        r".*?（五）机组（场站）参与省间中长期合约电能量电费按照省间中长期合约电量和中长期合约价格计算。计算公式如下"
    )
    return re.sub(pattern, lambda _match: replacement, text, count=1, flags=re.S)


def is_main_ocr_formula_noise(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if re.search(r"^#{1,6}\s", stripped) or re.search(r"第[一二三四五六七八九十百千万零〇两]+[章节条]", stripped):
        return False
    if re.search(r"（[一二三四五六七八九十]+）", stripped):
        return False
    if stripped in {"时", "下"}:
        return True
    if any(token in stripped for token in MAIN_NOISE_TOKENS):
        return True
    formula_ops = sum(stripped.count(ch) for ch in "=＝×X＋+-－−∑ΣZ［］[]")
    starts_like_formula = bool(re.match(r"^[RCQP]\s*[\u4e00-\u9fffA-Za-z_]*\s*(?:=|二|三|一|十)", stripped))
    if starts_like_formula and formula_ops >= 2:
        return True
    if formula_ops >= 5 and re.search(r"[RCQP]\s*[\u4e00-\u9fffA-Za-z_]", stripped):
        return True
    return False


def remove_main_ocr_formula_noise(text: str) -> str:
    lines: list[str] = []
    in_math = False
    for line in text.splitlines():
        if line.strip() == "$$":
            in_math = not in_math
            lines.append(line)
            continue
        if not in_math and is_main_ocr_formula_noise(line):
            continue
        lines.append(line)
    return "\n".join(lines)


def remove_isolated_dollar_page_numbers(text: str) -> str:
    """Remove OCR page numbers that were misread as an opening inline-math marker."""
    text = re.sub(r"\$[0-9]{1,3}(?=\s*(?:\n|$))", "", text)
    text = re.sub(r"\$[0-9]{1,3}(?=第[一二三四五六七八九十百千万零〇两]+条)", "\n\n", text)
    return text


def merge_empty_section_headings(text: str) -> str:
    return re.sub(
        r"(?m)^###\s*\n+\s*(第[一二三四五六七八九十百千万零〇两]+节[^\n]+)$",
        r"### \1",
        text,
    )


def repair_amend_markdown(text: str) -> str:
    text = re.sub(
        r"贯彻落实《湖南省发展和改革委员会、湖南省能源局、国家能源局湖南监管\s*!\[公式\]\([^)]*formula_p002_para_01\.png\)\s*!\[公式\]\([^)]*formula_p002_para_02\.png\)\s*号）精神",
        "贯彻落实《湖南省发展和改革委员会、湖南省能源局、国家能源局湖南监管办公室关于印发<湖南省深化新能源上网电价市场化改革促进新能源高质量发展实施方案>的通知》（湘发改价调〔2025〕663号）精神",
        text,
        count=1,
        flags=re.S,
    )
    for filename, replacement in AMEND_FORMULAS.items():
        text = replace_formula_image(text, filename, replacement)
    for pattern, replacement in PLAIN_REPAIRS:
        text = re.sub(pattern, lambda _match, replacement=replacement: replacement, text, count=1, flags=re.S)
    text = re.sub(r"(?m)^\s*(均价时，|日前均价,t 时，|时，|前,i,t\+R 省内实时,i,t\)|非市场|接参与中长期综合电价\)×h10|电价-P 现货综合,m\)×h11)\s*$\n?", "", text)
    text = re.sub(r"\$?\d{1,2}(?=第[一二三四五六七八九十百千万零〇两]+条)", "\n\n", text)
    text = remove_isolated_dollar_page_numbers(text)
    text = split_numbered_items(text)
    text = merge_empty_section_headings(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def repair_main_markdown(text: str) -> str:
    for filename, replacement in MAIN_FORMULAS.items():
        text = replace_formula_image(text, filename, replacement)
    text = repair_main_first_formula_cluster(text)
    text = repair_main_interprovincial_clusters(text)
    for pattern, replacement in PLAIN_REPAIRS:
        text = re.sub(pattern, lambda _match, replacement=replacement: replacement, text, flags=re.S)
    text = text.replace("已%\n\n", "")
    text = text.replace("\n\n减定量结果小于零时按零计算", "")
    text = re.sub(r"(?m)^\s*(其中：|其中:)\s*$\n(?=\s*(其中：|其中:))", "", text)
    text = remove_main_ocr_formula_noise(text)
    text = re.sub(r"\$?\d{1,2}(?=第[一二三四五六七八九十百千万零〇两]+条)", "\n\n", text)
    text = remove_isolated_dollar_page_numbers(text)
    text = split_numbered_items(text)
    text = merge_empty_section_headings(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def rebuild_outputs(pdf: Path, stem: str) -> dict:
    md_path = pdf.with_suffix(".md")
    md_text = md_path.read_text(encoding="utf-8")
    md_text = repair_amend_markdown(md_text) if stem == AMEND_STEM else repair_main_markdown(md_text)
    md_path.write_text(md_text, encoding="utf-8")

    html_path = md_to_html.convert_file(md_path)
    html_text = render_formula_blocks(html_path.read_text(encoding="utf-8"))
    html_path.write_text(html_text, encoding="utf-8")
    ZC_HTML_DIR.mkdir(exist_ok=True)
    (ZC_HTML_DIR / f"{stem}.html").write_text(html_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{stem}.zc_skill.html").write_text(html_text, encoding="utf-8")

    base_report = md_to_json.load_base_report(pdf, ZC_HTML_DIR)
    structured = postprocess_structured(md_to_json.parse_markdown(md_path, base_report))
    json_text = json.dumps(structured, ensure_ascii=False, indent=2)
    ZC_STRUCTURED_DIR.mkdir(exist_ok=True)
    (ZC_STRUCTURED_DIR / f"{stem}.structured.json").write_text(json_text, encoding="utf-8")
    (ZC_STRUCTURED_DIR / f"{stem}.zc_skill.structured.json").write_text(json_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{stem}.json").write_text(json_text, encoding="utf-8")
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
    stems = [MAIN_STEM, AMEND_STEM]
    pdfs = [POLICY_DIR / f"{stem}.pdf" for stem in stems]
    paths: list[Path] = []
    for stem, pdf in zip(stems, pdfs):
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
    for stem, pdf in zip(stems, pdfs):
        structured = rebuild_outputs(pdf, stem)
        q = structured.get("quality_report", {})
        print(f"{stem}: formulas={q.get('formula_count')} resolved={q.get('resolved_formula_count')} unresolved={q.get('unresolved_formula_count')}")
    rebuild_index()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
