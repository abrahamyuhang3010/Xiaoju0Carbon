#!/usr/bin/env python3
"""Repair manually verified formula images in Shaanxi settlement policy outputs."""

from __future__ import annotations

import json
import html as html_lib
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

try:
    import pdfplumber  # type: ignore
except ImportError:  # pragma: no cover - fallback for non-bundled Python.
    pdfplumber = None  # type: ignore


WORKSPACE = Path(__file__).resolve().parents[1]
ROOT = Path("/Users/didi/Documents/codex售电市场政策结构化")
POLICY_DIR = ROOT / "陕西交易中心" / "2026年执行政策"
TOOLS_DIR = ROOT / "tools"
ZC_HTML_DIR = POLICY_DIR / "ZC_HTML"
ZC_STRUCTURED_DIR = POLICY_DIR / "ZC_STRUCTURED"

STEM = "【20260105】附件2陕西电力市场结算实施细则（连续试运行V2）"
SPOT_STEM = "【20260105】附件1陕西电力现货市场交易实施细则（连续试运行V2）"
PDF_PATH = POLICY_DIR / f"{STEM}.pdf"
MD_PATH = POLICY_DIR / f"{STEM}.md"
SPOT_HTML_PATH = POLICY_DIR / f"{SPOT_STEM}.html"

sys.path.insert(0, str(TOOLS_DIR))
sys.path.insert(0, str(WORKSPACE / "scripts"))

import convert_md_to_html as md_to_html  # type: ignore  # noqa: E402
import markdown_to_structured_json as md_to_json  # type: ignore  # noqa: E402
from parse_hunan_policy_pdfs_with_skill import render_formula_blocks  # type: ignore  # noqa: E402
from parse_shaanxi_policy_pdfs_with_skill import (  # type: ignore  # noqa: E402
    configure_structured_converter,
    postprocess_structured,
    rebuild_index,
    validate_markdown,
    write_report,
)
from policy_parse_regression_guard import apply_generic_html_repairs  # type: ignore  # noqa: E402


SETTLEMENT_PRICE_SECTION = r"""### 5.4. 结算电价

#### 5.4.1. 具备节点条件的发电侧主体以其所在物理节点的节点电价作为现货市场结算价格。

#### 5.4.2. 批发用户侧主体以统一结算点电价作为现货市场结算价格。

日前（实时）统一结算点电价取对应时段发电侧日前（实时）市场各节点出清电价的加权平均值。计算公式如下：

$$
P_{\mathrm{日前统一},t}=\frac{\sum_i(Q_{\mathrm{日前},i,t}\times P_{\mathrm{日前},i,t})}{\sum_i Q_{\mathrm{日前},i,t}}
$$

其中，$P_{\mathrm{日前统一},t}$ 为 t 时段日前现货市场统一结算点价格；$Q_{\mathrm{日前},i,t}$ 为 t 时段省内参与日前现货市场发电机组（场站）i 日前出清电量；$P_{\mathrm{日前},i,t}$ 为 t 时段省内参与日前现货市场发电机组（场站）i 所在节点日前出清价格。

$$
P_{\mathrm{实时统一},t}=\frac{\sum_i(Q_{\mathrm{实际},i,t}\times P_{\mathrm{实时},i,t})}{\sum_i Q_{\mathrm{实际},i,t}}
$$

其中，$P_{\mathrm{实时统一},t}$ 为 t 时段实时现货市场统一结算点价格；$Q_{\mathrm{实际},i,t}$ 为 t 时段省内参与实时现货市场发电机组（场站）i 实际上网电量；$P_{\mathrm{实时},i,t}$ 为 t 时段省内参与实时现货市场发电机组（场站）i 所在节点实时出清价格。

"""

FORMULA_REPLACEMENTS = [
    (
        r"""$$
P_{\mathrm{实时出清均价},t}=
\frac{\sum_i(Q_{\mathrm{实时},i,t}\times P_{\mathrm{实时},i,t})}{\sum_i Q_{\mathrm{实时},i,t}}
$$""",
        r"""$$
P_{\mathrm{实时出清均价},t}=\left[\sum_i\left(Q_{\mathrm{实时},i,t}\times P_{\mathrm{实时},i,t}\right)\right]/\sum_i Q_{\mathrm{实时},i,t}
$$""",
    ),
    (
        r"""$$
P_{\mathrm{月度实时},t}=
\frac{\sum_{d=1}^{D}\sum_{i=1}^{N}Q_{\mathrm{实际},i,t,d}\times P_{\mathrm{实时},i,t,d}}
{\sum_{d=1}^{D}\sum_{i=1}^{N}Q_{\mathrm{实际},i,t,d}}
$$""",
        r"""$$
P_{\mathrm{月度实时},t}=\frac{\sum_{i=1}^{N}\sum_{d=1}^{D}\sum_{t=1}^{t}\left(Q_{\mathrm{实际},i,t,d}\times P_{\mathrm{实时},i,t,d}\right)}{\sum_{i=1}^{N}\sum_{d=1}^{D}\sum_{t=1}^{t}Q_{\mathrm{实际},i,t,d}}
$$""",
    ),
    (
        r"""$$
P_{\mathrm{套餐价格},h}=P_{\mathrm{批发购电分时均价},h}+P_{\mathrm{浮动价差}}
$$""",
        r"""$$
P_{\mathrm{套餐价格},h}=P_{\mathrm{批发购电分时均价},h}\mathrm{（下同）}+P_{\mathrm{浮动价差}}
$$""",
    ),
    (
        r"""$$
P_{\mathrm{中长期},h}=
\frac{\sum_{d=1}^{D}\sum_{i=1}^{N}Q_{\mathrm{中长期合约},i,t,d}\times P_{\mathrm{中长期合约},i,t,d}}
{\sum_{d=1}^{D}\sum_{i=1}^{N}Q_{\mathrm{中长期合约},i,t,d}}
$$""",
        r"""$$
P_{\mathrm{中长期},h}=\frac{\sum_{i=1}^{N}\sum_{d=1}^{D}\sum_{t=1}^{t}\left(Q_{\mathrm{中长期合约},i,t,d}\times P_{\mathrm{中长期合约},i,t,d}\right)}{\sum_{i=1}^{N}\sum_{d=1}^{D}\sum_{t=1}^{t}Q_{\mathrm{中长期合约},i,t,d}}
$$""",
    ),
    (
        r"""$$
P_{\mathrm{现货日前},h}=
\frac{\sum_{d=1}^{D}\sum_{i=1}^{N}Q_{\mathrm{日前出清},i,t,d}\times P_{\mathrm{日前出清},i,t,d}}
{\sum_{d=1}^{D}\sum_{i=1}^{N}Q_{\mathrm{日前出清},i,t,d}}
$$""",
        r"""$$
P_{\mathrm{现货日前},h}=\frac{\sum_{i=1}^{N}\sum_{d=1}^{D}\sum_{t=1}^{t}\left(Q_{\mathrm{日前出清},i,t,d}\times P_{\mathrm{日前出清},i,t,d}\right)}{\sum_{i=1}^{N}\sum_{d=1}^{D}\sum_{t=1}^{t}Q_{\mathrm{日前出清},i,t,d}}
$$""",
    ),
    (
        r"""$$
P_{\mathrm{现货实时},h}=
\frac{\sum_{d=1}^{D}\sum_{i=1}^{N}Q_{\mathrm{实时出清},i,t,d}\times P_{\mathrm{实时出清},i,t,d}}
{\sum_{d=1}^{D}\sum_{i=1}^{N}Q_{\mathrm{实时出清},i,t,d}}
$$""",
        r"""$$
P_{\mathrm{现货实时},h}=\frac{\sum_{i=1}^{N}\sum_{d=1}^{D}\sum_{t=1}^{t}\left(Q_{\mathrm{实时出清},i,t,d}\times P_{\mathrm{实时出清},i,t,d}\right)}{\sum_{i=1}^{N}\sum_{d=1}^{D}\sum_{t=1}^{t}Q_{\mathrm{实时出清},i,t,d}}
$$""",
    ),
    (
        r"""$$
K_{1h}=
\frac{\sum_{d=1}^{D}\sum_{i=1}^{N}Q_{\mathrm{中长期合约},i,t,d}}
{\sum_{d=1}^{D}\sum_{i=1}^{N}Q_{\mathrm{实际用电量},i,t,d}}
$$""",
        r"""$$
K_{1h}=\frac{\sum_{i=1}^{N}\sum_{d=1}^{D}\sum_{t=1}^{t}Q_{\mathrm{中长期合约},i,t,d}}{\sum_{i=1}^{N}\sum_{d=1}^{D}\sum_{t=1}^{t}Q_{\mathrm{实际用电量},i,t,d}}
$$""",
    ),
    (
        r"""$$
K_{2h}=
\frac{\sum_{d=1}^{D}\sum_{i=1}^{N}Q_{\mathrm{售电公司日前出清},i,t,d}}
{\sum_{d=1}^{D}\sum_{i=1}^{N}Q_{\mathrm{实际用电量},i,t,d}}
$$""",
        r"""$$
K_{2h}=\frac{\sum_{i=1}^{N}\sum_{d=1}^{D}\sum_{t=1}^{t}Q_{\mathrm{售电公司日前出清},i,t,d}}{\sum_{i=1}^{N}\sum_{d=1}^{D}\sum_{t=1}^{t}Q_{\mathrm{实际用电量},i,t,d}}
$$""",
    ),
]

TOC_REPLACEMENTS = {
    "  - 9.1. 绿电交易中电能量和绿色电力环境（绿证）价值分开结":
        "  - 9.1. 绿电交易中电能量和绿色电力环境（绿证）价值分开结算",
    "  - 9.2. 同一电力用户/售电公司与多个发电企业签约，总用电量":
        "  - 9.2. 同一电力用户/售电公司与多个发电企业签约，总用电量低于总合同电量的",
    "  - 9.3. 陕西电力交易中心于每月25 日开展上月绿电交易环境":
        "  - 9.3. 陕西电力交易中心于每月25 日开展上月绿电交易环境价值清分结算工作",
    "  - 9.4. 偏差补偿费用按照合同约定的偏差补偿价格和绿色电力":
        "  - 9.4. 偏差补偿费用按照合同约定的偏差补偿价格和绿色电力环境价值偏差量计算",
    "  - 9.5. 售电公司应确保通过e-交易平台签订的批发侧绿电合同":
        "  - 9.5. 售电公司应确保通过e-交易平台签订的批发侧绿电合同全部分解至其代理零售用户",
    "  - 14.1. 经营主体对结算明细数据、结算依据计算过程、结算依":
        "  - 14.1. 经营主体对结算明细数据、结算依据计算过程、结算依据内容等提出查询",
    "  - 14.2. 结算调整是结算依据或电费账单正式发布后，因故需对":
        "  - 14.2. 结算调整是结算依据或电费账单正式发布后，因故需对结算依据、电费账单调整而开展的退补及清算工作",
    "  - 14.3. 开展追退补和清算时，首先应由电力交易机构编制追退":
        "  - 14.3. 开展追退补和清算时，首先应由电力交易机构编制追退补和清算的结算依据",
    "  - 14.4. 超过追溯期的差错电量等，原则上不再返回至历史月份":
        "  - 14.4. 超过追溯期的差错电量等，原则上不再返回至历史月份进行调整",
    "  - 14.5. 市场交易规则、结算规则、电价政策等发生变化，需要":
        "  - 14.5. 市场交易规则、结算规则、电价政策等发生变化，需要调整电费的",
    "  - 14.6. 已结算的绿色电力环境价值，不因参与绿色电力交易的":
        "  - 14.6. 已结算的绿色电力环境价值，不因参与绿色电力交易的历史月份计量差错退补开展联动调整",
    "  - 15.1. 发电侧电费结算纳入电网企业购电管理流程，由电网企":
        "  - 15.1. 发电侧电费结算纳入电网企业购电管理流程，由电网企业按月支付",
    "  - 15.2. 批发市场用户、零售市场用户到户电费，按照电网企业":
        "  - 15.2. 批发市场用户、零售市场用户到户电费，按照电网企业相关收费规定执行",
    "  - 15.3. 各经营主体应根据法规、政策文件、合约等，在约定期":
        "  - 15.3. 各经营主体应根据法规、政策文件、合约等，在约定期限内完成电费收付",
    "  - 15.4. 对因履约保函无法覆盖次月批零倒挂电费、且未及时追":
        "  - 15.4. 对因履约保函无法覆盖次月批零倒挂电费、且未及时追加保函的售电公司",
    "  - 15.5. 市场主体对电费账单存在异议时，须先按账单金额缴纳":
        "  - 15.5. 市场主体对电费账单存在异议时，须先按账单金额缴纳电费",
}

OVERLONG_HEADING_SPLITS = {
    "#### 5.3.7. 电力市场计量结算采用统一度量单位。原则上，电量单位为兆瓦时、保留三位小数或千瓦时、保留整数；电费单位为元，保留两位小数；电价单位为元/兆瓦时、保留三位小数或元/千瓦时、保留六位小数。":
        "#### 5.3.7. 电力市场计量结算采用统一度量单位。\n\n原则上，电量单位为兆瓦时、保留三位小数或千瓦时、保留整数；电费单位为元，保留两位小数；电价单位为元/兆瓦时、保留三位小数或元/千瓦时、保留六位小数。",
    "#### 5.4.5. 配套新能源省间送出超、少发电量按日分96 点结算，其为机组上网电量与省间执行电量的差值，均按照省内同类型电源实时现货市场均价结算（有节点价格的按节点价格结算），因结算价格与其省间合同价格差值产生的获利按日每小时全部回收。":
        "#### 5.4.5. 配套新能源省间送出超、少发电量按日分96 点结算\n\n其为机组上网电量与省间执行电量的差值，均按照省内同类型电源实时现货市场均价结算（有节点价格的按节点价格结算），因结算价格与其省间合同价格差值产生的获利按日每小时全部回收。",
    "#### 5.4.7. 已参与中长期交易，但暂不具备分时电量推送条件的经营主体按月结算，其中长期合约按合约价格结算，月度实际上网电量/用电量与中长期合约电量的偏差，按同类型电源/批发交易用户月度实时现货市场均价/月度统一结算点电价结算，因现货价格与中长期合约价格差值产生的获益全部回收。":
        "#### 5.4.7. 已参与中长期交易，但暂不具备分时电量推送条件的经营主体按月结算\n\n其中长期合约按合约价格结算，月度实际上网电量/用电量与中长期合约电量的偏差，按同类型电源/批发交易用户月度实时现货市场均价/月度统一结算点电价结算，因现货价格与中长期合约价格差值产生的获益全部回收。",
    "#### 5.4.8. 已经在电力交易平台注册生效的集中式领跑者项目、光伏扶贫，暂不具备分时电量推送条件时按月总结算，月度实际上网电量按有关市场交易均价结算，市场交易均价按《陕西省新能源发电项目可持续发展价格结算机制实施细则（试行）》中有关条款计算。":
        "#### 5.4.8. 已经在电力交易平台注册生效的集中式领跑者项目、光伏扶贫\n\n暂不具备分时电量推送条件时按月总结算，月度实际上网电量按有关市场交易均价结算，市场交易均价按《陕西省新能源发电项目可持续发展价格结算机制实施细则（试行）》中有关条款计算。",
    "#### 5.4.9. 电力用户如未及时与售电公司签订零售合同，也未参与批发市场交易，无合同月份的实际用电量全部视为现货偏差电量，按照月度分时实时现货市场出清均价的1.5 倍结算，分时出清均价为参与实时出清的发电企业各时段出清电量与出清价格的加权均价。":
        "#### 5.4.9. 电力用户如未及时与售电公司签订零售合同，也未参与批发市场交易\n\n无合同月份的实际用电量全部视为现货偏差电量，按照月度分时实时现货市场出清均价的1.5 倍结算，分时出清均价为参与实时出清的发电企业各时段出清电量与出清价格的加权均价。",
    "### 7.1. 火电及新能源发电企业电能量电费火电及新能源发电企业电能量电费":
        "### 7.1. 火电及新能源发电企业电能量电费\n\n火电及新能源发电企业电能量电费",
    "### 7.2. 水电发电企业电能量电费进入市场的水电发电企业按月结算":
        "### 7.2. 水电发电企业电能量电费\n\n进入市场的水电发电企业按月结算",
    "### 9.2. 同一电力用户/售电公司与多个发电企业签约，总用电量低于总合同电量的，该电力用户/售电公司对应于各发电企业的用电量按总用电量占总合同电量比重等比例调减;同一发电企业与多个电力用户/售电公司签约的，总上网电量低于总合同电量时，该发电企业对应于各电力用户/售电公司的上网电量按总上网电量占总合同电量比重等比例调减。":
        "### 9.2. 同一电力用户/售电公司与多个发电企业签约，总用电量低于总合同电量的\n\n该电力用户/售电公司对应于各发电企业的用电量按总用电量占总合同电量比重等比例调减;同一发电企业与多个电力用户/售电公司签约的，总上网电量低于总合同电量时，该发电企业对应于各电力用户/售电公司的上网电量按总上网电量占总合同电量比重等比例调减。",
    "#### 11.2.5. 上述涉及市场经营主体自身日前、实时均价计算时，如遇时段内各时点出清电量、实际上网电量/用电量均为零时，该时段均价取各时点价格的算术平均值；涉及中长期市场净合同均价计算时，均不含绿电环境价值权益；同类型电源市场均价计算时，均不含配套电源；风、光、水、储能以外的电源类型均纳入火电均价计算范围。":
        "#### 11.2.5. 上述涉及市场经营主体自身日前、实时均价计算时\n\n如遇时段内各时点出清电量、实际上网电量/用电量均为零时，该时段均价取各时点价格的算术平均值；涉及中长期市场净合同均价计算时，均不含绿电环境价值权益；同类型电源市场均价计算时，均不含配套电源；风、光、水、储能以外的电源类型均纳入火电均价计算范围。",
    "### 14.1. 经营主体对结算明细数据、结算依据计算过程、结算依据内容等向电力交易机构提出查询或就结算账单问题向电网企业提出查询的，收到结算查询后，电力交易机构或电网企业应及时确认及评估查询是否有效，可要求经营主体追加相关信息，若确认结算查询有效且需要修改结算依据或结算账单，应按规则进行调整。":
        "### 14.1. 经营主体对结算明细数据、结算依据计算过程、结算依据内容等提出查询\n\n经营主体向电力交易机构提出查询或就结算账单问题向电网企业提出查询的，收到结算查询后，电力交易机构或电网企业应及时确认及评估查询是否有效，可要求经营主体追加相关信息，若确认结算查询有效且需要修改结算依据或结算账单，应按规则进行调整。",
    "### 15.3. 各经营主体应根据法规、政策文件、合约等，在约定期限内完成电费收付，约定期限内未足额或未缴纳电费的市场主体，由电网企业提出使用履约保函，并将欠费信息反馈给交易中心，交易中心将欠费的市场主体方纳入市场信用管理。":
        "### 15.3. 各经营主体应根据法规、政策文件、合约等，在约定期限内完成电费收付\n\n约定期限内未足额或未缴纳电费的市场主体，由电网企业提出使用履约保函，并将欠费信息反馈给交易中心，交易中心将欠费的市场主体方纳入市场信用管理。",
    "##### 6.2.2.1. 调度机构于（M+1）月第3 个工作日（含第3 个工作日，下同）内，向交易机构推送水电发电企业偏差电量，市场成本补偿类费用日分摊结果，省间、省内辅助服务费用月度分摊结果、煤电机组月度最大出力认定和考核统计结果及其他需要推送的结果。":
        "##### 6.2.2.1. 调度机构于（M+1）月第3 个工作日（含第3 个工作日，下同）内\n\n向交易机构推送水电发电企业偏差电量，市场成本补偿类费用日分摊结果，省间、省内辅助服务费用月度分摊结果、煤电机组月度最大出力认定和考核统计结果及其他需要推送的结果。",
    "##### 6.2.2.3. 电网企业于（M+1）月第1 个工作日内，向交易机构推送发用两侧月度分时上网/用电量数据，交易机构于每月第5个工作日前向市场经营主体、相关电网企业出具上月结算依据（核对版），市场经营主体、相关电网企业应在1 个工作日内完成核对、异议反馈（若有）和确认，逾期视为已确认。":
        "##### 6.2.2.3. 电网企业于（M+1）月第1 个工作日内\n\n向交易机构推送发用两侧月度分时上网/用电量数据，交易机构于每月第5个工作日前向市场经营主体、相关电网企业出具上月结算依据（核对版），市场经营主体、相关电网企业应在1 个工作日内完成核对、异议反馈（若有）和确认，逾期视为已确认。",
}

PDF_TOC_RE = re.compile(r"^(\d+(?:\.\d+)*\.?)\s*(.+?)\s*\.{3,}\s*(\d+)\s*$")
PDF_TOC_FALLBACK = [
    ("1.", "概述", 3),
    ("2.", "适用范围", 3),
    ("3.", "术语定义", 3),
    ("4.", "市场结算权责", 5),
    ("5.", "市场结算", 8),
    ("6.", "结算时序", 15),
    ("7.", "批发市场结算", 18),
    ("8.", "零售用户结算", 23),
    ("9.", "绿色电力交易结算", 29),
    ("10.", "辅助服务市场费用结算", 30),
    ("11.", "市场运营费用计算", 31),
    ("12.", "市场平衡类费用计算", 43),
    ("13.", "费用分摊或返还", 44),
    ("14.", "结算查询及调整", 46),
    ("15.", "收付款管理", 49),
    ("16.", "附则", 50),
]


def backup(paths: list[Path]) -> Path:
    backup_dir = Path("/private/tmp") / f"shaanxi_settlement_formula_repair_{datetime.now():%Y%m%d-%H%M%S}"
    for path in paths:
        if not path.exists():
            continue
        rel = path.relative_to(POLICY_DIR)
        dest = backup_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)
    return backup_dir


def replace_between(text: str, start_marker: str, end_marker: str, replacement: str) -> str:
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError(f"start marker not found: {start_marker}")
    end = text.find(end_marker, start)
    if end < 0:
        raise RuntimeError(f"end marker not found after {start_marker}: {end_marker}")
    return text[:start] + replacement + text[end:]


def replace_between_if_present(text: str, start_marker: str, end_marker: str, replacement: str) -> str:
    start = text.find(start_marker)
    if start < 0:
        return text
    end = text.find(end_marker, start)
    if end < 0:
        return text
    return text[:start] + replacement + text[end:]


def normalize_spaces(text: str) -> str:
    text = text.replace("\u3000", " ").replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+([，。；：！？、）】》])", r"\1", text)
    text = re.sub(r"([（【《])\s+", r"\1", text)
    return text.strip()


def read_pdf_pages() -> list[str]:
    if pdfplumber is None:
        return []
    pages: list[str] = []
    with pdfplumber.open(PDF_PATH) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text(x_tolerance=2, y_tolerance=3) or "")
    return pages


def normalized_toc_number(number: str) -> str:
    return number.rstrip(".") + "."


def extract_pdf_toc_lines(pdf_pages: list[str] | None = None) -> list[dict[str, str | int]]:
    entries: list[dict[str, str | int]] = []
    pages = pdf_pages if pdf_pages is not None else read_pdf_pages()
    for page_text in pages[1:5]:
        for raw in page_text.splitlines():
            line = normalize_spaces(raw)
            match = PDF_TOC_RE.match(line)
            if not match:
                continue
            number, title, page = match.groups()
            entries.append(
                {
                    "number": normalized_toc_number(number),
                    "title": title,
                    "page": int(page),
                }
            )
    if entries:
        return entries
    return [{"number": n, "title": t, "page": p} for n, t, p in PDF_TOC_FALLBACK]


def render_markdown_toc(entries: list[dict[str, str | int]]) -> str:
    lines = ["## 目录", ""]
    for item in entries:
        number = str(item["number"])
        title = str(item["title"])
        page = int(item["page"])
        depth = max(0, number.rstrip(".").count("."))
        indent = "  " * depth
        lines.append(f"{indent}{number} {title} .................................... {page}")
    return "\n".join(lines)


def repair_cover_and_toc(text: str) -> str:
    body_match = re.search(r"(?m)^##\s+1[.．]\s*概述\s*$", text)
    if not body_match:
        raise RuntimeError("body start not found: ## 1. 概述")
    cover = "附件2\n\n# 陕西电力市场结算实施细则\n\n（连续试运行 V2.0）\n\n2025 年 12 月"
    toc = render_markdown_toc(extract_pdf_toc_lines())
    return f"{cover}\n\n{toc}\n\n{text[body_match.start():]}"


def repair_toc_entries(text: str) -> str:
    for old, new in TOC_REPLACEMENTS.items():
        text = text.replace(old, new)
    return text


def repair_split_heading_continuations(text: str) -> str:
    lines = text.splitlines()
    out: list[str] = []
    idx = 0
    heading_re = re.compile(r"^(#{3,6}\s+\d+(?:\.\d+)+\.?\s+.+)$")
    complete_tail_re = re.compile(r"(。|：|[）)]|费用|管理|结算|流程|事项|模式|市场|附则|义务|范围|建立)$")
    while idx < len(lines):
        line = lines[idx]
        stripped = line.strip()
        match = heading_re.match(stripped)
        if not match or complete_tail_re.search(stripped):
            out.append(line)
            idx += 1
            continue

        blank_idx = idx + 1
        if blank_idx >= len(lines) or lines[blank_idx].strip():
            out.append(line)
            idx += 1
            continue
        next_idx = blank_idx + 1
        if next_idx >= len(lines):
            out.append(line)
            idx += 1
            continue
        next_line = lines[next_idx].strip()
        if not next_line or next_line.startswith("#") or next_line == "$$" or next_line.startswith("|"):
            out.append(line)
            idx += 1
            continue

        # Join the continuation visible in the PDF. If a long body paragraph follows,
        # keep only the first sentence in the heading and leave the rest as body text.
        join_part = next_line
        rest = ""
        sentence_end = next_line.find("。")
        if sentence_end >= 0:
            join_part = next_line[: sentence_end + 1]
            rest = next_line[sentence_end + 1 :].strip()
            if len(join_part) > 90:
                out.append(line)
                idx += 1
                continue
        elif len(next_line) > 90:
            out.append(line)
            idx += 1
            continue

        out.append(f"{line}{join_part}")
        if rest:
            out.extend(["", rest])
        idx = next_idx + 1
    return "\n".join(out)


def repair_overlong_headings(text: str) -> str:
    for old, new in OVERLONG_HEADING_SPLITS.items():
        text = text.replace(old, new)
    return text


def repair_pdf_verified_formulas(text: str) -> str:
    for old, new in FORMULA_REPLACEMENTS:
        text = text.replace(old, new)
    return text


def repair_pdf_paragraph_boundaries(text: str) -> str:
    """Restore PDF-visible paragraph boundaries for clauses OCR promoted to headings."""
    text = replace_between_if_present(
        text,
        "### 5.2. 结算时段",
        "### 5.3. 结算管理",
        "### 5.2. 结算时段\n\n"
        "5.2.1 批发市场经营主体原则上以15 分钟为一个基本计量、清分及结算时段。"
        "零售用户原则按月每小时为基本结算时段。\n\n",
    )
    text = replace_between_if_present(
        text,
        "#### 5.3.1.",
        "#### 5.3.2.",
        "5.3.1 电力市场结算包括电能量交易结算、电力辅助服务交易结算、容量交易结算等。"
        "电费结算相关事宜应在电力用户、售电公司、发电企业与电网企业签订的电费结算协议中予以明确。"
        "除国家政策规定外，结算环节不得改变市场出清、交易合约量价等关键要素。\n\n",
    )
    text = text.replace(
        "5.3.4 市场运行产生的各项费用均独立记录，分类明确疏导。\n\n"
        "所有结算项目的分摊（返还）应根据“谁产生、谁负责，谁受益、谁承担”原则事先商定分摊（返还）方式，明确各方合理的权利与义务。",
        "5.3.4 市场运行产生的各项费用均独立记录，分类明确疏导。"
        "所有结算项目的分摊（返还）应根据“谁产生、谁负责，谁受益、谁承担”原则事先商定分摊（返还）方式，明确各方合理的权利与义务。",
    )
    text = replace_between_if_present(
        text,
        "#### 5.3.7.",
        "### 5.4. 结算电价",
        "5.3.7 电力市场计量结算采用统一度量单位。原则上，电量单位为兆瓦时、保留三位小数或千瓦时、保留整数；"
        "电费单位为元，保留两位小数；电价单位为元/兆瓦时、保留三位小数或元/千瓦时、保留六位小数。"
        "如国家政策文件对精度有进一步要求的，按相关政策文件执行。\n\n"
        "5.3.8 辅助服务市场结算原则、要求等按电力辅助服务市场有关规定执行。\n\n",
    )
    text = replace_between_if_present(
        text,
        "#### 5.4.2.",
        "$$\nP_{\\mathrm{日前统一},t}",
        "5.4.2 批发用户侧主体以统一结算点电价作为现货市场结算价格。"
        "日前（实时）统一结算点电价取对应时段发电侧日前（实时）市场各节点出清电价的加权平均值。计算公式如下：\n\n",
    )
    text = replace_between_if_present(
        text,
        "#### 5.4.5.",
        "#### 5.4.6.",
        "5.4.5 配套新能源省间送出超、少发电量按日分96 点结算，其为机组上网电量与省间执行电量的差值，"
        "均按照省内同类型电源实时现货市场均价结算（有节点价格的按节点价格结算），因结算价格与其省间合同价格差值产生的获利按日每小时全部回收。"
        "配套新能源转商运后无省间交易合同，其上网电量全部视为超发电量，暂不具备分时电量推送条件时，按省内同类型电源月度实时现货市场均价结算，"
        "具备分时电量推送条件后，按日同类型电源分时实时现货均价结算。配套新能源超发电量参与省内有关市场运营费用的分摊或分享，少发电量不参与。\n\n",
    )
    text = replace_between_if_present(
        text,
        "#### 5.4.7.",
        "#### 5.4.8.",
        "5.4.7 已参与中长期交易，但暂不具备分时电量推送条件的经营主体按月结算，其中长期合约按合约价格结算，"
        "月度实际上网电量/用电量与中长期合约电量的偏差，按同类型电源/批发交易用户月度实时现货市场均价/月度统一结算点电价结算，"
        "因现货价格与中长期合约价格差值产生的获益全部回收。具备分时电量推送条件后，执行市场统一规则。\n\n",
    )
    text = replace_between_if_present(
        text,
        "#### 5.4.8.",
        "#### 5.4.9.",
        "5.4.8 已经在电力交易平台注册生效的集中式领跑者项目、光伏扶贫，暂不具备分时电量推送条件时按月总结算，"
        "月度实际上网电量按有关市场交易均价结算，市场交易均价按《陕西省新能源发电项目可持续发展价格结算机制实施细则（试行）》中有关条款计算。"
        "具备条件后，按其所在节点价格结算（若其不具备节点电价条件，每日各时点上网电量按同类型电源对应时段实时现货市场均价结算）。\n\n",
    )
    text = replace_between_if_present(
        text,
        "#### 5.4.13.",
        "$$\nP_{\\mathrm{月度实时},t}",
        "5.4.13 电网企业代理购电工商业用户，居民农业（含线损）的偏差电量分开核算。"
        "电网企业代理工商业用户偏差电量按月分96 时结算，结算价格为各对应时段月度实时现货市场加权均价。"
        "居民、农业及线损产生的市场偏差电量按月分24 时结算（居民、农业及线损月度实际用电量按用电典型曲线分解至月24 时），"
        "结算价格为各对应时段月度实时现货市场加权均价。电网企业应按上述要求向交易机构分别提供相关电量信息。\n\n",
    )
    text = replace_between_if_present(
        text,
        "#### 5.4.14.",
        "## 6. 结算时序",
        "5.4.14 独立储能参与辅助服务市场在放电、充（用）电时分别按发电主体、用电主体参与辅助服务市场，"
        "同等接受各类考核。其辅助服务结算按辅助服务市场有关规则执行。\n\n",
    )
    text = replace_between_if_present(
        text,
        "### 6.1. 结算准备6.1.1",
        "### 6.2. 结算流程",
        "### 6.1. 结算准备\n\n"
        "6.1.1 电力交易机构在规定的时间内对结算所需基础数据进行收集及汇总。"
        "结算基础数据包括：市场经营主体档案数据、交易合同数据、电能量市场出清及调度执行数据、辅助服务市场费用计算结果、"
        "调试及商业运行时间、关口设置及电能计量数据、市场规则、电价政策文件，以及其他需电力交易机构合并出具结算依据的数据等。"
        "结算环节不得改变结算基础数据。\n\n",
    )
    text = replace_between_if_present(
        text,
        "#### 6.1.1.",
        "### 6.2. 结算流程",
        "6.1.1 电力交易机构在规定的时间内对结算所需基础数据进行收集及汇总。"
        "结算基础数据包括：市场经营主体档案数据、交易合同数据、电能量市场出清及调度执行数据、辅助服务市场费用计算结果、"
        "调试及商业运行时间、关口设置及电能计量数据、市场规则、电价政策文件，以及其他需电力交易机构合并出具结算依据的数据等。"
        "结算环节不得改变结算基础数据。\n\n",
    )
    text = replace_between_if_present(
        text,
        "##### 6.2.1.1.",
        "##### 6.2.1.2.",
        "6.2.1.1 电力调度机构每（D+1）日向交易机构推送运行日（D）日及日前（D-1）日省间、省内日前、实时市场出清结果、辅助服务市场出清及执行结果。"
        "具体包括:省间日前及日内市场每15分钟的出清电力和价格，省内日前及实时市场每15 分钟的出清电力和价格，"
        "辅助服务市场涉及电量清分部分的出清及执行结果；用户侧日前、实时市场出清结果、应急调度执行结果等。\n\n",
    )
    text = replace_between_if_present(
        text,
        "##### 6.2.1.2.",
        "##### 6.2.1.3.",
        "6.2.1.2 电网企业每（D+1）日向交易机构推送运行日（D）日各机组每15 分钟上网电量数据、用户每15 分钟用电量数据。\n\n",
    )
    text = replace_between_if_present(
        text,
        "##### 6.2.1.3.",
        "#### 6.2.2. 月（M）结算流程",
        "6.2.1.3 交易机构每（D+6）日发布运行日（D）日的临时日清分结算结果，发电企业、批发交易用户在（D+6）日18：00前完成临时日清分结算结果确认，逾期视为已确认。"
        "在月度正式结算依据出具前，因电量更正重推等原因产生的日清分结果变更，电力交易机构对涉及的变更日重新出具日清分结算结果。"
        "若月度正式结算依据出具后，按本规则调整结算相关条款执行。\n\n",
    )
    text = replace_between_if_present(
        text,
        "##### 6.2.2.3.",
        "##### 6.2.2.4.",
        "6.2.2.3 电网企业于（M+1）月第1 个工作日内，向交易机构推送发用两侧月度分时上网/用电量数据，"
        "交易机构于每月第5个工作日前向市场经营主体、相关电网企业出具上月结算依据（核对版），市场经营主体、相关电网企业应在1 个工作日内完成核对、异议反馈（若有）和确认，逾期视为已确认。"
        "市场经营主体、相关电网企业提出异议的，电力交易机构应在1 个工作日内组织市场经营主体、相关电网企业、相关电力调度机构进行核实，"
        "达成一致的，市场经营主体应对修正后的结算依据（核对版）在1 个工作日内完成核对和确认；因异议处理无法按时达成一致的，"
        "纳入下一结算周期进行结算、追退补或清算，异议处理不得影响无争议部分的电费结算。\n\n",
    )
    text = replace_between_if_present(
        text,
        "##### 6.2.2.5.",
        "##### 6.2.2.6.",
        "6.2.2.5 电网企业根据政策文件和电力交易机构推送的结算基础数据，核对结算依据，并按正式结算依据编制电费账单。\n\n",
    )
    text = text.replace(
        "6.3.1 当计量装置数据缺失、错误或不可用时，电网企业、\n\n"
        "电力调度机构应及时开展消缺、补采或根据规则补全计量数据，重新提供至电力交易机构。电力交易机构在满足结算条件的下一结算周期进行结算、追退补。",
        "6.3.1 当计量装置数据缺失、错误或不可用时，电网企业、电力调度机构应及时开展消缺、补采或根据规则补全计量数据，"
        "重新提供至电力交易机构。电力交易机构在满足结算条件的下一结算周期进行结算、追退补。",
    )
    text = replace_between_if_present(
        text,
        "#### 6.3.2.",
        "6.3.3 因政策调整",
        "6.3.2 市场经营主体和电网企业应保障档案数据的准确性、完整性和及时性，并在规定时间内通过电力交易平台完成更新、提交。"
        "未及时更新、提交的，电力交易机构以电力交易平台既有数据形成结算依据。\n\n",
    )
    text = replace_between_if_present(
        text,
        "#### 6.3.7.",
        "## 7. 批发市场结算",
        "6.3.7 结算依据或电费账单发布后，如市场经营主体存在异议，可在15 个工作日内分别向电力交易机构、电网企业提出结算问询。"
        "电力交易机构、电网企业在收到问询后，5 个工作日内确认和评估问询是否属实，经核查属实的，在满足结算条件的下一结算周期进行追退补或清算。\n\n",
    )
    for number in ["9.1", "9.2", "9.3", "9.4", "9.5"]:
        text = re.sub(
            rf"### {re.escape(number)}\\. ([^\n]+)\n\n([^#\n][\s\S]*?)(?=\n\n### 9\\.[2-5]\\.|\n\n## 10\\.)",
            lambda m: f"{number} {m.group(1)}{m.group(2).strip()}\n",
            text,
            count=1,
        )
    text = replace_between_if_present(
        text,
        "## 9. 绿色电力交易结算",
        "## 10. 辅助服务市场费用结算",
        "## 9. 绿色电力交易结算\n\n"
        "9.1 绿电交易中电能量和绿色电力环境（绿证）价值分开结算。"
        "电能量部分以电能量价格按照省内市场规则开展结算；绿色电力环境（绿证）价值部分按照当月合同电量、发电企业上网电量（扣除纳入可持续发展价格结算机制的电量）、"
        "电力用户用电量三者取小的原则确定结算电量（以兆瓦时为单位取整数，尾差在合同周期内滚动到次月核算），以绿色电力环境（绿证）价值结算，偏差部分按照合同明确的补偿条款执行。\n\n"
        "9.2 同一电力用户/售电公司与多个发电企业签约，总用电量低于总合同电量的，该电力用户/售电公司对应于各发电企业的用电量按总用电量占总合同电量比重等比例调减;"
        "同一发电企业与多个电力用户/售电公司签约的，总上网电量低于总合同电量时，该发电企业对应于各电力用户/售电公司的上网电量按总上网电量占总合同电量比重等比例调减。\n\n"
        "9.3 陕西电力交易中心于每月25 日开展上月绿电交易环境价值清分结算工作。"
        "批发侧完成绿色电力环境价值清分结算后，按照零售用户零售套餐约定的绿色电力需求电量比例予以分摊结算（以兆瓦时为单位取整数，尾差在合同周期内滚动到次月核算）。\n\n"
        "9.4 偏差补偿费用按照合同约定的偏差补偿价格和绿色电力环境价值偏差量计算，由违约方向合同对方支付补偿费用，批发侧、零售侧分别计算。"
        "以兆瓦时为单位取整造成的尾差，不计入偏差量。\n\n"
        "9.5 售电公司应确保通过e-交易平台签订的批发侧绿电合同全部分解至其代理零售用户，且分解的零售合同电量，应与在陕西电力交易平台签订的含绿电零售套餐的对应用户绿电需求电量一致。"
        "陕西电力交易中心依据陕西电力交易平台零售套餐签订的要素开展绿电环境价值清分及结算工作。\n\n",
    )
    text = replace_between_if_present(
        text,
        "#### 11.2.3.",
        "11.2.4 因自身原因",
        "11.2.3 对暂不具备分时电量推送条件，按照月度电量结算的经营主体开展中长期超额获利回收。"
        "其中长期净合同电量以外的偏差电量，因偏差电量结算价格低于（或高于）经营主体自身中长期净合同均价产生的超额获利，全部予以回收。\n\n",
    )
    text = replace_between_if_present(
        text,
        "#### 11.2.5.",
        "## 12. 市场平衡类费用计算",
        "11.2.5 上述涉及市场经营主体自身日前、实时均价计算时，如遇时段内各时点出清电量、实际上网电量/用电量均为零时，"
        "该时段均价取各时点价格的算术平均值；涉及中长期市场净合同均价计算时，均不含绿电环境价值权益；"
        "同类型电源市场均价计算时，均不含配套电源；风、光、水、储能以外的电源类型均纳入火电均价计算范围。"
        "回收价差的绝对值超出现货市场申报价格上限的，按上限执行；回收价差执行上限时，月度回收总费用不超过其当月电能量总费用（不包含市场运营费用的分摊及分享）。\n\n",
    )
    text = text.replace(
        "折算至5000 大卡动力煤后平均煤耗为423.36 克/千瓦时；调节系数由政府主管部门根据陕西电网实际运行情况制定，火电企业补偿费用值为负时不予补偿。",
        "折算至5000 大卡动力煤后平均煤耗为423.36 克/千瓦时；\n\n"
        "调节系数由政府主管部门根据陕西电网实际运行情况制定，火电企业补偿费用值为负时不予补偿。",
    )
    text = replace_between_if_present(
        text,
        "### 13.1.",
        "## 14. 结算查询及调整",
        "### 13.1. 市场运营费用分摊或分享\n\n"
        "成本补偿费用分摊或分享方式按照本细则有关条款执行；\n\n"
        "市场调节类费用中，发电侧回收费用向全体工商业用户返还，"
        "用电侧回收费用优先支付统调火电发电收益双向补偿费用，剩余部分向发电企业返还。"
        "发电企业按照实际上网电量比例分摊或返还；全体工商业用户按其实际用电量比例返还。返还电费纳入交易结算依据。\n\n"
        "市场平衡类费用中省间双轨制平衡费用由发电企业按照月度实际上网电量的比例分摊或分享；合约阻塞平衡费用由签订中长期合同的发电企业按照上网电量的比例分摊或分享；"
        "结构平衡费用按发电企业月度实际上网电量、全体工商业用户月度实际用电量的比例分摊或返还，发电侧部分按实际上网电量比例分摊或返还，"
        "用户侧部分按工商业用户实际用电量比例分摊或分享；新投机组清算的当年历史市场化上网电量累计参与清算月当月的结构平衡费用分摊或分享。分摊或返还电费纳入交易结算依据。\n\n"
        "上述市场补偿类、调节类、平衡类费用暂不向统调水电，未参与交易申报的光伏扶贫及分布式新能源分摊或返还。\n\n"
        "### 13.2. 其他费用分摊及返还\n\n"
        "因自身原因未按期转商运的发电企业，清算累计盈余费用向全体工商业用户按结算月实际用电量的比例返还。\n\n"
        "配套新能源超、少发电量回收的盈余费用，按月向统调火电发电机组（场站）以月度实际上网电量的比例返还。\n\n"
        "省间交易责任偏差中，因省间变更执行曲线产生的分摊费用，能明确到单个发电企业的，由相关发电企业承担；"
        "能明确到交易序列的，由序列内涉及的发电企业按合同电量比例分摊；无法明确的，按产生月份所有发电企业净售出外送合同电量比例分摊。"
        "因对侧省份变更执行曲线产生的分享费用，由陕西省内发电企业按省内净售出中长期合同比例分享。\n\n",
    )
    text = replace_between_if_present(
        text,
        "## 14. 结算查询及调整",
        "## 15. 收付款管理",
        "## 14. 结算查询及调整\n\n"
        "14.1 经营主体对结算明细数据、结算依据计算过程、结算依据内容等向电力交易机构提出查询或就结算账单问题向电网企业提出查询的，"
        "收到结算查询后，电力交易机构或电网企业应及时确认及评估查询是否有效，可要求经营主体追加相关信息，若确认结算查询有效且需要修改结算依据或结算账单，应按规则进行调整。\n\n"
        "14.2 结算调整是结算依据或电费账单正式发布后，因故需对结算依据、电费账单调整而开展的退补及清算工作。退补追溯期原则上6 个月内。\n\n"
        "（一）退补是指因计量、档案、合同、出清等数据差错、变更等原因以及其他规则允许情况而产生的结算调整工作。\n\n"
        "（二）清算是指因政策规则调整、临时电价结算等原因产生的结算调整工作。\n\n"
        "14.3 开展追退补和清算时，首先应由电力交易机构编制追退补和清算的结算依据，履行本规则中结算依据发布流程后，再由电网企业开展电费追退补和清算。\n\n"
        "14.4 超过追溯期的差错电量等，原则上不再返回至历史月份进行调整，在差错处理月份按照处理月份有关价格结算，且不再联动调整其它经营主体或其他市场运营费用等，具体如下：\n\n"
        "（一）电力用户差错电量按处理月当月电网企业代理购电价格结算，差错电量不计入当前月份偏差（或调平）电量。电力用户存在未入市前的修正电量，由电网企业予以清算。\n\n"
        "（二）发电企业差错电量按处理月当月自身电能量结算均价结算，差错电量不计入当前月份偏差（或调平）电量。\n\n"
        "14.4.1 未超出追溯期的结算调整应按照以下方式开展：\n\n"
        "（一）若结算错误影响多个经营主体，电力交易机构应重新进行结算计算，并在最近一次结算周期内完成调整；无法在最近一次结算周期内完成调整的，调整金额应在下个结算周期的结算依据中记为“结算调整科目”费用。\n\n"
        "（二）因结算基础数据错误、不可用或存在争议，需要提供方重新提供信息时，应在每月15 日前通过平台补推，并做好记录。电力交易机构收到补推数据后，按结算调整原则统筹处理。\n\n"
        "（三）电力交易机构根据调整后的计量数据、交易合同、出清结果、执行结果等基础数据重新进行整体重算。重算结果中各项结算科目与最近一次历史结算结果之差作为调整费用，纳入当前结算月份月度正式结算依据。\n\n"
        "（四）批发市场中，若日清计量或拟合、拆分的分时电量调整偏差绝对值的累计值小于其差错发生月总上网电量/用电量10%时或月总上网电量/用电量为零，"
        "分时电量调整偏差绝对值小于1兆瓦时时，原则上分时电量不再追溯至具体时段，只调整差错发生月份月结电量，"
        "电能量电费按照差错月份实时市场加权均价进行退补调整，并对其具备追溯条件的市场运行费用进行退补调整。"
        "超出10%的，具备分时追溯条件的返回至时点重新结算，不具备分时追溯条件的，电能量电费按小于10%的处理原则处理，"
        "并对其具备追溯条件的市场运行费用进行退补调整。因重结产生的费差纳入最近月份结算周期的结算依据中追退补。\n\n"
        "（五）对发电企业及批发交易用户的出清数据、分时电量数据等退补调整后，原则上不对统一结算点电价、批发购电分时均价、零售封顶价格进行调整。\n\n"
        "（六）电力用户差错电量电费退补纳入当前月份结算依据，并按照以下原则开展结算：无合同用户按照差错发生月份实时市场出清加权分时平均价格的1.5 倍进行电能量电费退补结算、"
        "零售用户按照差错发生月份零售合同分时价格进行退补结算；差错电量滚动纳入处理月当月市场运营费用分摊或分享计算；"
        "因差错电量产生的考核等费用调整纳入下一个结算周期予以分摊分享；若差错电量不具备分时条件，无合同用户按发生月份月度实时市场出清加权平均价格的1.5 倍结算，"
        "零售用户按其月度零售套餐均价结算（合同中无签约电量的，按算术平均值计算）。\n\n"
        "14.5 市场交易规则、结算规则、电价政策等发生变化，需要调整电费的，由电力交易机构依照相应规则或政策开展电费退补。"
        "因电量等差错调整结算产生的市场运营费用差额，滚动纳入最近一个月的结算周期相关科目，按照结算月当月的上网电量或用电量予以分摊或分享。"
        "因政策、规则调整，合同关键要素缺失等原因产生的市场运营费用差额，纳入最近一个月的结算周期相关科目，发电侧及售电公司按照历史月份相关市场主体的上网电量/用电量分摊或分享，"
        "工商业用户按结算月当月的用电量比例分摊或分享。若分摊或分享中存在已销户主体的，则分摊分享给其他主体。\n\n"
        "14.6 已结算的绿色电力环境价值，不因参与绿色电力交易的发电侧经营主体与电力用户的历史月份发、用电量计量差错退补开展联动调整。\n\n",
    )
    text = replace_between_if_present(
        text,
        "### 16.1.",
        "### 16.2. 其他事项",
        "### 16.1. 市场中止与管制\n\n"
        "在市场中止和价格管制时段，根据电力市场规则以及市场运营机构向政府部门报备的市场中止和管制措施开展结算。"
        "其中市场紧急中止与管制情况下所造成的成本，纳入电力市场本月或后续若干月的市场运营费用，由市场主体共同承担。\n\n",
    )
    return text


def repair_markdown(text: str) -> str:
    text = repair_cover_and_toc(text)
    text = replace_between(
        text,
        "### 5.4. 结算电价",
        "#### 5.4.3. 零售用户",
        SETTLEMENT_PRICE_SECTION,
    )
    text = repair_toc_entries(text)
    text = repair_split_heading_continuations(text)
    text = repair_overlong_headings(text)
    text = repair_pdf_verified_formulas(text)
    text = repair_pdf_paragraph_boundaries(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def attachment1_style_block() -> str:
    match = re.search(r"(?s)<style>(.*?)</style>", SPOT_HTML_PATH.read_text(encoding="utf-8"))
    if not match:
        raise RuntimeError(f"style block not found: {SPOT_HTML_PATH}")
    return match.group(1)


def apply_attachment1_style(html_text: str) -> str:
    style = attachment1_style_block()
    return re.sub(r"(?s)<style>.*?</style>", f"<style>{style}</style>", html_text, count=1)


def apply_cover_classes(html_text: str) -> str:
    html_text = re.sub(r"<title>.*?</title>", f"<title>{STEM}</title>", html_text, count=1, flags=re.S)
    html_text = html_text.replace('<p class="paragraph">附件2</p>', '<p class="cover-label">附件2</p>', 1)
    html_text = html_text.replace(
        '<h1 class="heading">陕西电力市场结算实施细则</h1>',
        '<h1 class="cover-title">陕西电力市场结算实施细则</h1>',
        1,
    )
    html_text = html_text.replace(
        '<p class="paragraph">（连续试运行 V2.0）</p>',
        '<p class="cover-subtitle">（连续试运行 V2.0）</p>',
        1,
    )
    html_text = html_text.replace(
        '<p class="paragraph">2025 年 12 月</p>',
        '<p class="cover-date">2025 年 12 月</p>',
        1,
    )
    return html_text


def render_toc_lines(html_text: str, pdf_pages: list[str]) -> str:
    pattern = re.compile(
        r'(<h2 class="toc-title">目录</h2>\n)(?P<body>.*?)(?=\s*<h2 class="heading">1\. 概述</h2>)',
        re.S,
    )

    def replace(match: re.Match[str]) -> str:
        rendered: list[str] = []
        for item in extract_pdf_toc_lines(pdf_pages):
            number = str(item["number"])
            title = str(item["title"])
            page = str(item["page"])
            depth = min(3, number.rstrip(".").count("."))
            text = html_lib.escape(f"{number} {title}")
            rendered.append(
                f'      <p class="toc-line depth-{depth}">'
                f'<span class="toc-text">{text}</span>'
                f'<span class="toc-leader"></span>'
                f'<span class="toc-page">{html_lib.escape(page)}</span>'
                f"</p>"
            )
        return match.group(1) + "\n".join(rendered) + "\n"

    return pattern.sub(replace, html_text, count=1)


def apply_attachment1_frontend(html_text: str) -> str:
    pdf_pages = read_pdf_pages()
    html_text = apply_attachment1_style(html_text)
    html_text = apply_cover_classes(html_text)
    html_text = render_toc_lines(html_text, pdf_pages)
    return html_text


def mark_verified_formulas(structured: dict) -> dict:
    for formula in structured.get("formulas", []):
        latex = formula.get("latex") or ""
        if r"P_{\mathrm{日前统一},t}" in latex or r"P_{\mathrm{实时统一},t}" in latex:
            formula["parse_method"] = "manual_latex_reconstruction_from_pdf_page"
            formula["confidence"] = max(float(formula.get("confidence") or 0), 0.9)
            formula["review_required"] = False
    quality = structured.setdefault("quality_report", {})
    note = "5.4 结算电价中日前/实时统一结算点电价公式已由图片恢复为 LaTeX，并同步渲染至 HTML。"
    issues = quality.setdefault("blocking_issues", [])
    if note not in issues:
        issues.append(note)
    return structured


def rebuild_outputs() -> dict:
    md_text = repair_markdown(MD_PATH.read_text(encoding="utf-8"))
    MD_PATH.write_text(md_text, encoding="utf-8")

    html_path = md_to_html.convert_file(MD_PATH)
    html_text = apply_generic_html_repairs(render_formula_blocks(html_path.read_text(encoding="utf-8")))
    html_text = apply_attachment1_frontend(html_text)
    html_path.write_text(html_text, encoding="utf-8")
    ZC_HTML_DIR.mkdir(exist_ok=True)
    (ZC_HTML_DIR / f"{STEM}.html").write_text(html_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{STEM}.zc_skill.html").write_text(html_text, encoding="utf-8")

    base_report = md_to_json.load_base_report(PDF_PATH, ZC_HTML_DIR)
    structured = postprocess_structured(md_to_json.parse_markdown(MD_PATH, base_report))
    structured = mark_verified_formulas(structured)
    json_text = json.dumps(structured, ensure_ascii=False, indent=2)
    ZC_STRUCTURED_DIR.mkdir(exist_ok=True)
    (ZC_STRUCTURED_DIR / f"{STEM}.structured.json").write_text(json_text, encoding="utf-8")
    (ZC_STRUCTURED_DIR / f"{STEM}.zc_skill.structured.json").write_text(json_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{STEM}.json").write_text(json_text, encoding="utf-8")

    validation = validate_markdown(MD_PATH)
    write_report(STEM, structured, validation)
    rebuild_index()
    return structured


def main() -> int:
    configure_structured_converter()
    paths = [
        MD_PATH,
        MD_PATH.with_suffix(".html"),
        ZC_HTML_DIR / f"{STEM}.html",
        ZC_HTML_DIR / f"{STEM}.zc_skill.html",
        ZC_HTML_DIR / f"{STEM}.json",
        ZC_STRUCTURED_DIR / f"{STEM}.structured.json",
        ZC_STRUCTURED_DIR / f"{STEM}.zc_skill.structured.json",
        ZC_STRUCTURED_DIR / f"{STEM}.zc_skill.report.md",
    ]
    backup_dir = backup(paths)
    structured = rebuild_outputs()
    quality = structured.get("quality_report", {})
    print(f"backup_dir={backup_dir}")
    print(
        f"{STEM}: formulas={quality.get('formula_count')} "
        f"resolved={quality.get('resolved_formula_count')} "
        f"unresolved={quality.get('unresolved_formula_count')}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
