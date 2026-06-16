#!/usr/bin/env python3
"""Repair formula OCR in Hunan metering policy outputs."""

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
STEM = "【20251024】4湖南省电力市场计量实施细则"

sys.path.insert(0, str(TOOLS_DIR))
sys.path.insert(0, str(WORKSPACE / "scripts"))

import convert_md_to_html as md_to_html  # type: ignore  # noqa: E402
import markdown_to_structured_json as md_to_json  # type: ignore  # noqa: E402
from parse_hunan_policy_pdfs_with_skill import postprocess_structured, render_formula_blocks  # type: ignore  # noqa: E402


FORMULA_REPAIRS = {
    "formula_p017_para_01.png": r"R_N=R+\frac{R_{Y+1}-R}{Y+1}\times N",
    "formula_p018_para_02.png": r"R_N=R+\frac{(R_{Y+1}-R)(R1_N-R1)}{R1_{Y+1}-R1}",
    "formula_p020_para_04.png": r"W_x=(Q_{N+1}-Q_N)\times T_1+(Z_{N+1}-Z_N)\times T_2-(F_{N+1}-F_N)\times T_2",
    "formula_p021_para_05.png": r"W=\frac{W_1+W_2+W_3+W_4}{4}",
    "formula_p021_para_06.png": r"F_{ND}=F_{ND-1}+\frac{(Q_{ND}-Q_{ND-1})\times T_1+(Z_{ND}-Z_{ND-1})\times T_2-W}{T_2}",
}

METER_TOC = """## 目录

- 1. 总述
- 2. 适用范围
- 3. 引用文件
- 4. 职责分工
- 4.1 电网企业
- 4.2 发电企业
- 4.3 拥有配电网运营权的售电公司
- 5. 计量点设置
- 5.1 发电企业计量点设置
- 5.2 独立储能计量点设置
- 6. 电能计量及采集装置配置
- 6.1 电能计量装置配置
- 6.2 采集装置配置要求
- 7. 电能计量装置运行管理
- 7.1 投运前管理
- 7.2 现场检验管理
- 7.3 运行维护管理
- 7.4 计量装置申校管理
- 8. 计量数据采集管理
- 8.1 用电信息采集系统管理要求
- 8.2 计量数据异常处理
- 9. 数据拟合规则
- 9.1 以报量报价方式参与市场交易的经营主体
- 9.2 报量不报价方式参与市场交易的经营主体
- 9.3 不报量不报价方式参与市场交易的经营主体
- 10. 附则
- 附件
"""

EFFICIENCY_SECTION = r"""时段示值。

光伏发电效率因子公式：

$$
E=\frac{(R1_{1E}-R1_{1S})+(R2_{1E}-R2_{1S})+...+(R7_{1E}-R7_{1S})}{(R1_E-R1_S)+(R2_E-R2_S)+...+(R7_E-R7_S)}
$$

其中，$E$ 为光伏发电效率因子；$RD_E$ 为待拟合表计往前历史第 $D$ 天的发电时段后第一点示值；$RD_S$ 为待拟合表计往前历史第 $D$ 天的缺失段前第一点示值；$RD_{1E}$ 为参照表计往前历史第 $D$ 天的发电时段后第一点示值；$RD_{1S}$ 为参照表计往前历史第 $D$ 天的缺失段前第一点示值。

缺点示值计算公式：

$$
R_{S+N}=R_S+\frac{R1_{S+N}-R1_S}{E}
$$

其中，$R_{S+N}$ 为第 $N$ 个缺失点示值；$R_S$ 为缺失区间段前 1 个点示值；$R1_{S+N}$ 为参照表计同区间段第 $N$ 个点示值；$R1_S$ 为参照表计同区间段前 1 个点示值。
"""

REFERENCE_FIT_SECTION = r"""B. 若在发电区间段首尾点数据采集成功，但连续采集失败点数大于 2，采用“参考拟合法”拟合，用 A 中的方法先计算一个拟合反向电量，计算一个电量趋势作为拟合参照。计算公式如下：

$$
G_{ND}=G_{ND-1}+\frac{(G_{ND-ED}-G_{ND-1})\times(F_{ND}-G_{ND-1})}{F_{ND-ED}-G_{ND-1}}
$$

其中，$G_{ND}$ 为该用户上网表计反向有功电能示值曲线待拟合时点数据；$G_{ND-1}$ 为该用户上网表计反向有功电能示值曲线缺失段前一点数据；$G_{ND-ED}$ 为该用户上网表计反向有功电能示值曲线缺失段后一点数据；$F_{ND}$ 为该用户上网表计使用 A 中方法计算对应 $G_{ND}$ 的拟合点数据；$F_{ND-ED}$ 为该用户上网表计使用 A 中方法计算对应 $G_{ND-ED}$ 的拟合点数据。
"""

PV_RULE_I_INTRO = r"""#### 9.3.2 10千伏及以下光伏用户发电计量点、上网计量点

光伏发电时段可根据各单位实际情况设置，默认设置 6:00 至 18:00，其余时段为不发电时段。

（1）拟合规则 I

拟合规则 I 适用于消纳方式为自发自用余电上网的并网点表计（简称：发电表）和消纳方式为全额上网的上网计量点表计（简称：上网表）的采集数据拟合。

首先拟合不发电时段。若电能示值曲线采集失败点为 0:00（24:00）时，优先取用日冻结电能示值替代。

若 0:00 到 6:00、18:00 到 24:00 无首尾点且无日冻结示值，则分别取用最早采集的示值补全前半段，取最新采集的示值补全后半段，若仅采集到一个示值则分别补全整区间。若 [0:00,6:00] 无采集到示值，则取用前一日在未发电时段的最后一点采集示值进行拟合；若 [18:00,24:00] 无采集到示值，则取用当日发电时段的最后一点采集示值进行拟合，若发电时段数据均采集失败，则待完成发电时段拟合后再拟合本段曲线。参照案例如下：

1:45 时采集到的电能示值为 1，为 [0:00,6:00] 区间段的最早采集的示值，则 0:00、0:15、0:30、0:45、1:00、1:15、1:30 均拟合电能示值为 1。

最早采集示值与最新采集示值间的缺点采用“差值平均法”填补。参照案例如下：

1:45 时采集到的电能示值为 1，为 [0:00,6:00] 区间段的最早采集的示值；2:15 时采集到的电能示值为 1.1，为 [0:00,6:00] 区间段的最新采集的示值，则 2:00 时拟合电能示值为 1.05。

其次拟合发电时段。若缺失点位于光伏默认发电时段内，根据光伏发电特性，采用“同区域发电效率参考”的方式进行拟合。

A. 若在发电区间段连续采集失败点数小于等于 2，则采用“差值平均法”，取该缺失时段前后电能示值曲线平均值拟合。公式：
"""

PV_RULE_II_A_SECTION = r"""（2）拟合规则 II

拟合规则 II 适用于消纳方式为自发自用余电上网的上网计量点表计（简称：上网表）数据拟合。

不发电时段与发电区间段连续采集失败点数小于等于 2 与拟合规则 I 一致，不再赘述。

A. 若发电区间段尾点（即 18:00）电能示值曲线采集失败且未成功拟合，采用“实际用电量拟合法”进行拟合，上网表计反向电能示值曲线数据采用发电表、上网表正向电量（即用户表，下称：用户表）与实际用电计算得到。其中发电表、用户表分别采用上述“9.3.2 拟合规则 I”及“9.3.1 用户侧（含售电公司）拟合规则”。

待拟合表计拟合日往前倒推第 $X$ 个相似日在数据采集失败段的实际用电量计算方式如下：

$$
W_x=(Q_{N+1}-Q_N)\times T_1+(Z_{N+1}-Z_N)\times T_2-(F_{N+1}-F_N)\times T_2
$$

其中：

$W_x$ 为待拟合表计拟合日往前倒推第 $X$ 个相似日截止待拟合 $N$ 时点的实际用电量；

$Q_{N+1}$ 为该用户发电表计在拟合日往前倒推第 $X$ 个相似日在待拟合点的对应数据；

$Q_N$ 为该用户发电表计在拟合日往前倒推第 $X$ 个相似日在缺失段前一点的对应数据；

$Z_{N+1}$ 为该用户上网表计正向有功电能示值曲线在拟合日往前倒推第 $X$ 个相似日在待拟合点的对应数据；

$Z_N$ 为该用户上网表计正向有功电能示值曲线在拟合日往前倒推第 $X$ 个相似日在缺失段前一点的对应数据；

$F_{N+1}$ 为该用户上网表计反向有功电能示值曲线在拟合日往前倒推第 $X$ 个相似日在待拟合点的对应数据；

$F_N$ 为该用户上网表计反向有功电能示值曲线在拟合日往前倒推第 $X$ 个相似日在缺失段前一点的对应数据；

$T_1$ 为发电表计互感器的综合倍率；

$T_2$ 为上网表计互感器的综合倍率。

待拟合表计拟合日在待拟合时点实际用电量计算方式如下：

$$
W=\frac{W_1+W_2+W_3+W_4}{4}
$$

其中：

$W$ 为待拟合表计拟合日截止待拟合时点实际用电量；

$W_x$ 为待拟合表计拟合日往前倒推第 $X$ 个相似日截止待拟合时点的实际用电量；

相似日定义同“9.3.1 用户侧（含售电公司）拟合规则”。

上网表计反向电能示值曲线拟合计算方式如下：

$$
F_{ND}=F_{ND-1}+\frac{(Q_{ND}-Q_{ND-1})\times T_1+(Z_{ND}-Z_{ND-1})\times T_2-W}{T_2}
$$

其中：

$F_{ND}$ 为该用户上网表计反向有功电能示值曲线待拟合时点数据；

$F_{ND-1}$ 为该用户上网表计反向有功电能示值曲线缺失段前一点数据；

$Q_{ND}$ 为该用户发电表计在拟合日待拟合时点的对应数据；

$Q_{ND-1}$ 为该用户发电表计在拟合日曲线缺失段前一点的对应数据；

$Z_{ND}$ 为该用户上网表计正向有功电能示值曲线待拟合时点的对应数据；

$Z_{ND-1}$ 为该用户上网表计正向有功电能示值曲线缺失段前一点的对应数据；

$T_1$ 为发电表计互感器的综合倍率；

$T_2$ 为上网表计互感器的综合倍率。

若缺失点位于非光伏发电时段，则按未发电直接进行数据补全。

若上述计算结果为负，则将计算结果直接置为 0。
"""

PV_SPECIAL_CASE_SECTION = """（3）特殊情况拟合

对于因用户原因办理暂停以及拆除计量点流程表计、销户流程表计和电表更换流程跨日归档等特殊情况的拟合，按照“9.3.1 用户侧（含售电公司）拟合规则”等（5）、（6）进行拟合补全。
"""

METER_ATTACHMENT_SECTION = """## 附件

### 名词解释

电能计量点：各经营主体间包括电网企业之间、电网企业与发电企业之间、电网企业与电力用户之间、电网企业与拥有配电网运营权的售电公司之间、拥有配电网运营权的售电公司与其供电范围内用户之间、发电企业发电单元进行电能量结算、考核的计量点，简称电能计量点。

电能计量装置：由计量用电能表、电压互感器（或专用二次绕组）、电流互感器（或专用二次绕组）及其二次回路相连接组成的用于计量电能的装置，包括电能计量柜（箱、屏）、电能量采集终端。

电能量采集终端：安装在电能计量点的电能量采集设备，具有按一定规约对电能表数据进行采集、处理、分时存储、长时间保存和远方传输等功能。

采集成功：电能计量点电能表电能示值（包括日冻结电能示值和电能示值曲线）正常传输至用电信息采集系统，且数据完整、准确。

采集异常：电能计量点电能表电能示值（包括日冻结电能示值和电能示值曲线）采集正常，但与现场电能表计量示值不一致。

采集失败：电能计量点电能表、采集终端对用电信息采集系统命令无响应的，或者电能示值曲线采集不完整的。
"""

METER_CONFIGURATION_TABLES = """按计量对象重要程度和管理需要分为五类，分类细则如下表。

表 1 电能计量装置分类细则

| 类型 | 分类要求 |
|---|---|
| I 类 | 220kV 及以上贸易结算用电能计量装置 |
| I 类 | 500kV 及以上考核用电能计量装置 |
| I 类 | 计量单机容量 300MW 及以上发电机发电量的电能计量装置 |
| II 类 | 110（66）kV~220kV 贸易结算用电能计量装置 |
| II 类 | 220kV~500kV 考核用电能计量装置 |
| II 类 | 计量单机容量 100MW~300MW 及以上发电机发电量的电能计量装置 |
| III 类 | 10kV~110（66）kV 贸易结算用电能计量装置 |
| III 类 | 10kV~220kV 考核用电能计量装置 |
| III 类 | 计量 100MW 以下发电机发电量、发电企业厂（站）用电量的电能计量装置 |
| IV 类 | 380V~10kV 电能计量装置 |
| V 类 | 220V 单相电能计量装置 |

各类电能计量装置应配置的电能表、互感器准确度等级不低于下表标准。

表 2 准确度等级

| 电能计量装置类别 | 电能表（有功） | 电能表（无功） | 电力互感器（电压互感器） | 电力互感器（电流互感器） |
|---|---|---|---|---|
| I | 0.2S | 2 | 0.2 | 0.2S |
| II | 0.5S | 2 | 0.2 | 0.2S |
| III | 0.5S | 2 | 0.5 | 0.5S |
| IV | 1 | 2 | 0.5 | 0.5S |
| V | 2 | - | - | 0.5S |
"""

TABLE_1_HEADERS = ["类型", "分类要求"]
TABLE_1_ROWS = [
    ["I 类", "220kV 及以上贸易结算用电能计量装置"],
    ["I 类", "500kV 及以上考核用电能计量装置"],
    ["I 类", "计量单机容量 300MW 及以上发电机发电量的电能计量装置"],
    ["II 类", "110（66）kV~220kV 贸易结算用电能计量装置"],
    ["II 类", "220kV~500kV 考核用电能计量装置"],
    ["II 类", "计量单机容量 100MW~300MW 及以上发电机发电量的电能计量装置"],
    ["III 类", "10kV~110（66）kV 贸易结算用电能计量装置"],
    ["III 类", "10kV~220kV 考核用电能计量装置"],
    ["III 类", "计量 100MW 以下发电机发电量、发电企业厂（站）用电量的电能计量装置"],
    ["IV 类", "380V~10kV 电能计量装置"],
    ["V 类", "220V 单相电能计量装置"],
]
TABLE_2_HEADERS = [
    "电能计量装置类别",
    "电能表（有功）",
    "电能表（无功）",
    "电力互感器（电压互感器）",
    "电力互感器（电流互感器）",
]
TABLE_2_ROWS = [
    ["I", "0.2S", "2", "0.2", "0.2S"],
    ["II", "0.5S", "2", "0.2", "0.2S"],
    ["III", "0.5S", "2", "0.5", "0.5S"],
    ["IV", "1", "2", "0.5", "0.5S"],
    ["V", "2", "-", "-", "0.5S"],
]


def backup(paths: list[Path]) -> Path:
    backup_dir = Path("/private/tmp") / f"hunan_meter_formula_repair_{datetime.now():%Y%m%d-%H%M%S}"
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


def replace_formula_image(text: str, filename: str, latex: str) -> str:
    return re.sub(
        rf"!\[公式\]\([^)]*{re.escape(filename)}\)",
        lambda _match: math_block(latex),
        text,
        count=1,
    )


def repair_numbering_context(text: str) -> str:
    text = text.replace(
        "由交易机构组织相关经营主体确认后进行电量追退补9. 数据拟合规则",
        "由交易机构组织相关经营主体确认后进行电量追退补\n\n## 9. 数据拟合规则",
    )
    text = re.sub(r"(?m)^9\.(\d+)\s+(.+)$", r"### 9.\1 \2", text)
    text = re.sub(r"(直接跳至)\s*\n+\s*（([1-9]\d?)）", r"\1（\2）", text)
    text = re.sub(
        r"(按拟合规则)\s*\n+\s*（([1-9]\d?)）\s*(?:[—－\-一至到])?\s*\n+\s*（([1-9]\d?)）",
        r"\1（\2）—（\3）",
        text,
    )
    text = re.sub(r"(按以下规则拟合)1）", r"\1：\n\n1）", text)
    text = re.sub(r"(进行(?:拟合)?补全)2）", r"\1\n\n2）", text)
    text = re.sub(r"(按以下规则拟合)1\.", r"\1：\n\n1.", text)
    text = re.sub(r"(进行(?:拟合)?补全)2\.", r"\1\n\n2.", text)
    return re.sub(r"\n{3,}", "\n\n", text)


def repair_section_structure(text: str) -> str:
    text = re.sub(
        r"## 目录\s*\n(?:\s*-\s+[^\n]+\n?)*\s*(?=## 1\. 总述)",
        METER_TOC.rstrip() + "\n\n",
        text,
        count=1,
    )
    text = re.sub(
        r"\n+2[．.]\s*适用范围\s*(本细则适用于)",
        r"\n\n## 2. 适用范围\n\n\1",
        text,
        count=1,
    )
    text = re.sub(
        r"\n+3[．.]\s*引用文件\s*(《)",
        r"\n\n## 3. 引用文件\n\n\1",
        text,
        count=1,
    )
    text = text.replace("以现场拆表时间为\n\n准，", "以现场拆表时间为准，")
    text = text.replace("如为站\n\n用变或备供电源关口", "如为站用变或备供电源关口")
    text = re.sub(
        r"相关要求参照\s*8\.1\s*执行\s*5[．.]\s*计量点设置\s*",
        "相关要求参照 8.1 执行。\n\n## 5. 计量点设置\n\n",
        text,
        count=1,
    )
    text = text.replace("供\n\n心用电合同", "供用电合同")
    text = text.replace("供\n\n用电合同", "供用电合同")
    text = re.sub(r"(?m)^\s*20\.3\s*$\n+", "", text)
    text = re.sub(
        r"申请仲裁检定\s*8[．.]\s*计量数据采集管理",
        "申请仲裁检定。\n\n## 8. 计量数据采集管理",
        text,
        count=1,
    )
    text = text.replace("电3能计量装置", "电能计量装置")
    text = re.sub(
        r"(### 9\.2 报量不报价方式参与市场交易的经营主体)\s*\n+（1）",
        r"\1\n\n#### 9.2.1 独立储能电站\n\n（1）",
        text,
        count=1,
    )
    text = re.sub(
        r"(进行补全)(当虚拟电厂发电单元和用电单元采集数据缺失时，发电单元)\s*\n*\s*(拟合规则参照9\.3\.2执行，用电单元拟合规则参照9\.3\.1执行。)",
        r"\1。\n\n#### 9.2.2 虚拟电厂\n\n\2\3",
        text,
        count=1,
    )
    text = text.replace(
        "进行补全当虚拟电厂发电单元和用电单元采集数据缺失时，发电单元",
        "进行补全。\n\n#### 9.2.2 虚拟电厂\n\n当虚拟电厂发电单元和用电单元采集数据缺失时，发电单元拟合规则参照 9.3.2 执行，用电单元拟合规则参照 9.3.1 执行。",
    )
    text = re.sub(
        r"(### 9\.3 不报量不报价方式参与市场交易的经营主体)\s*\n+（1）",
        r"\1\n\n#### 9.3.1 用户侧（含售电公司）\n\n（1）",
        text,
        count=1,
    )
    text = re.sub(
        r"(计入月度调平电量)[。.]?光伏发电时段可根据各单位实际情况设置，默认设置\s*至，其余时段为不发电时段\s*\n+\s*（1）拟合规则拟合规则I.*?A\.若在发电区间段连续采集失败点数小于等于2，则采用“差值平均法”，取该缺失时段前后电能示值曲线平均值拟合公式：",
        r"\1。\n\n" + PV_RULE_I_INTRO.rstrip(),
        text,
        count=1,
        flags=re.S,
    )
    text = re.sub(
        r"其中，\$Y\$ 为总缺失点数\s*\n+\s*\$R_N\$ 为第 \$N\$ 点缺失点示值\s*\n+\s*\$R\$ 为缺失时段前一点示值；\$R_\{Y\+1\}\$ 为缺失时段后一点示值。B\. 若",
        "其中：\n\n$Y$ 为总缺失点数；\n\n$R_N$ 为第 $N$ 点缺失点示值；\n\n$R$ 为缺失时段前一点示值；\n\n$R_{Y+1}$ 为缺失时段后一点示值。\n\nB. 若",
        text,
        count=1,
    )
    text = re.sub(
        r"（2）拟合规则 II\s*\n+拟合规则 II.*?B\. 若",
        lambda _match: PV_RULE_II_A_SECTION.rstrip() + "\n\nB. 若",
        text,
        count=1,
        flags=re.S,
    )
    text = re.sub(
        r"（3）特殊情况拟合\s*\n+对于因用户原因办理暂停.*?（6）进行拟合补全\s*(?=## 10\. 附则)",
        lambda _match: PV_SPECIAL_CASE_SECTION.rstrip() + "\n\n",
        text,
        count=1,
        flags=re.S,
    )
    text = re.sub(
        r"(10\.1 本规则未尽事宜按照国家有关法律法规和规范性文件)\s*\n+\s*(规定处理)",
        r"\1\2",
        text,
        count=1,
    )
    text = re.sub(
        r"(10\.2 本实施细则自发布之日起施行，结合市场实际运营情)\s*\n+\s*(况，不定期修订)",
        "10.2 本实施细则自发布之日起施行，结合市场实际运营情况，不定期修订",
        text,
        count=1,
    )
    text = re.sub(
        r"## 附件\s*\n+名词解释.*\Z",
        lambda _match: METER_ATTACHMENT_SECTION.rstrip(),
        text,
        count=1,
        flags=re.S,
    )
    return re.sub(r"\n{3,}", "\n\n", text)


def repair_markdown(text: str) -> str:
    text = text.replace("\x0crac", r"\frac")
    text = text.replace("\x0c", r"\f")

    for filename, latex in FORMULA_REPAIRS.items():
        text = replace_formula_image(text, filename, latex)

    text = text.replace(
        "独立储能电站全部站用负荷（站用电由照明、空调、风机、水泵、二次及通信设备、操作辅助电源等六部分负荷组成）应由站用变供电，并应在站用变设置计量点，具备单独计量条件6. 电能计量及采集装置配置",
        "独立储能电站全部站用负荷（站用电由照明、空调、风机、水泵、二次及通信设备、操作辅助电源等六部分负荷组成）应由站用变供电，并应在站用变设置计量点，具备单独计量条件\n\n## 6. 电能计量及采集装置配置",
    )
    text = text.replace(
        "发电企业应安装厂站电能量采集终端；供/用电电压在 10kV及以上的分布式电源及用户，应安装专变采集终端；供/用电电压在10kV 以下的分布式电源及用户，应安装集中器或智能融合终端7． 电能计量装置运行管理",
        "发电企业应安装厂站电能量采集终端；供/用电电压在 10kV及以上的分布式电源及用户，应安装专变采集终端；供/用电电压在10kV 以下的分布式电源及用户，应安装集中器或智能融合终端\n\n## 7. 电能计量装置运行管理",
    )
    text = re.sub(
        r"按计量对象重要程度和管理需要分为五类，分类细则如下表.*?(?=其中，I类电能计量装置)",
        METER_CONFIGURATION_TABLES.rstrip() + "\n\n",
        text,
        count=1,
        flags=re.S,
    )

    text = text.replace("拟合公式（Ry+l-R）", "拟合公式：")
    text = text.replace("\n\n*NV +1其中Y为总缺失点数", "\n\n其中，$Y$ 为总缺失点数")
    text = text.replace("RN 为第N 点缺失点示值", "$R_N$ 为第 $N$ 点缺失点示值")
    text = text.replace("R 为缺失时段前一点示值Ry+1 为缺失时段后一点示值", "$R$ 为缺失时段前一点示值；$R_{Y+1}$ 为缺失时段后一点示值。")

    text = re.sub(
        rf"时段示值光伏发电效率因子公式\s*!\[公式\]\([^)]*{re.escape('formula_p019_para_03.png')}\).*?（2）拟合规则II",
        lambda _match: EFFICIENCY_SECTION.rstrip() + "\n\n（2）拟合规则II",
        text,
        count=1,
        flags=re.S,
    )

    text = text.replace("待拟合表计拟合日在待拟合时点实际用电量计算方式如下", "待拟合表计拟合日在待拟合时点实际用电量计算方式如下：")
    text = text.replace("上网表计反向电能示值曲线拟合计算方式如下", "上网表计反向电能示值曲线拟合计算方式如下：")
    text = text.replace("若KOw-Qw-）*T+LZND Z0-）*，一W」计算结果为负", "若上述计算结果为负")

    text = re.sub(
        rf"B\. 若在发电区间段首尾点数据采集成功.*?!\[公式\]\([^)]*{re.escape('formula_p022_para_07.png')}\)\s*!\[公式\]\([^)]*{re.escape('formula_p022_para_08.png')}\).*?（3）特殊情况拟合",
        lambda _match: REFERENCE_FIT_SECTION.rstrip() + "\n\n（3）特殊情况拟合",
        text,
        count=1,
        flags=re.S,
    )

    text = repair_numbering_context(text)
    text = repair_section_structure(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def table_raw_text(headers: list[str], rows: list[list[str]]) -> str:
    return "\n".join([" ".join(headers)] + [" ".join(row) for row in rows])


def build_resolved_table(
    table_id: str,
    title: str,
    headers: list[str],
    rows: list[list[str]],
    context_before: str,
) -> dict:
    return {
        "node_type": "table",
        "table_id": table_id,
        "page": None,
        "bbox": [0, 0, 0, 0],
        "context_before": context_before,
        "title": title,
        "headers": headers,
        "rows": rows,
        "confidence": 0.99,
        "status": "resolved",
        "raw_text": table_raw_text(headers, rows),
    }


def find_table_id(tables: list[dict], title: str, headers: list[str], fallback: str) -> str:
    for table in tables:
        if table.get("title") == title or table.get("headers") == headers:
            return str(table.get("table_id") or fallback)
    return fallback


def repair_structured_tables(structured: dict) -> dict:
    original_tables = [table for table in structured.get("tables", []) if isinstance(table, dict)]
    table_1_id = find_table_id(original_tables, "表 1 电能计量装置分类细则", TABLE_1_HEADERS, "T-0001")
    table_2_id = find_table_id(original_tables, "表 2 准确度等级", TABLE_2_HEADERS, "T-0002")
    structured["tables"] = [
        build_resolved_table(
            table_1_id,
            "表 1 电能计量装置分类细则",
            TABLE_1_HEADERS,
            TABLE_1_ROWS,
            "表 1 电能计量装置分类细则",
        ),
        build_resolved_table(
            table_2_id,
            "表 2 准确度等级",
            TABLE_2_HEADERS,
            TABLE_2_ROWS,
            "表 2 准确度等级",
        ),
    ]
    quality = structured.setdefault("quality_report", {})
    quality["table_count"] = len(structured["tables"])
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
    structured = repair_structured_tables(postprocess_structured(md_to_json.parse_markdown(md_path, base_report)))
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
        ZC_STRUCTURED_DIR / f"{STEM}.zc_skill.report.md",
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
