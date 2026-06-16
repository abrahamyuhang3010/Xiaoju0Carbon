#!/usr/bin/env python3
"""Repair QA issues found in Hunan 2026 policy Markdown/HTML outputs."""

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
ARCHIVE_DIR = POLICY_DIR / "_intermediate_previews"

MIDLONG_20251024 = "【20251024】1湖南省电力中长期交易实施细则"
SPOT_STEM = "【20251024】2湖南省电力现货市场交易实施细则"
FREQ_STEM = "【20251024】3湖南省电力调频辅助服务市场交易实施细则"
METER_STEM = "【20251024】4湖南省电力市场计量实施细则"
REGISTER_STEM = "【20251024】5湖南省电力市场注册实施细则"
RETAIL_STEM = "【20251024】6湖南省电力零售市场交易规则"
SETTLEMENT_STEM = "【20251024】关于印发《湖南省电力市场结算实施细则》的通知（湘发改价调〔2025〕655号）"
MIDLONG_20260403 = "【20260403】湖南省电力中长期市场实施细则"
AMEND_STEM = "【20260503】湘发改价调〔2026〕240号关于完善《湖南省电力市场结算实施细则》有关政策的通知"

TARGET_STEMS = [
    MIDLONG_20251024,
    FREQ_STEM,
    METER_STEM,
    REGISTER_STEM,
    RETAIL_STEM,
    SETTLEMENT_STEM,
    MIDLONG_20260403,
    AMEND_STEM,
]

sys.path.insert(0, str(TOOLS_DIR))
sys.path.insert(0, str(WORKSPACE / "scripts"))

import convert_md_to_html as md_to_html  # type: ignore  # noqa: E402
import markdown_to_structured_json as md_to_json  # type: ignore  # noqa: E402
from parse_hunan_policy_pdfs_with_skill import (  # type: ignore  # noqa: E402
    postprocess_structured,
    render_formula_blocks,
)


def math_block(latex: str) -> str:
    return f"\n\n$$\n{latex.strip()}\n$$\n\n"


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

METER_ATTACHMENT_SECTION = """## 附件

### 名词解释

电能计量点：各经营主体间包括电网企业之间、电网企业与发电企业之间、电网企业与电力用户之间、电网企业与拥有配电网运营权的售电公司之间、拥有配电网运营权的售电公司与其供电范围内用户之间、发电企业发电单元进行电能量结算、考核的计量点，简称电能计量点。

电能计量装置：由计量用电能表、电压互感器（或专用二次绕组）、电流互感器（或专用二次绕组）及其二次回路相连接组成的用于计量电能的装置，包括电能计量柜（箱、屏）、电能量采集终端。

电能量采集终端：安装在电能计量点的电能量采集设备，具有按一定规约对电能表数据进行采集、处理、分时存储、长时间保存和远方传输等功能。

采集成功：电能计量点电能表电能示值（包括日冻结电能示值和电能示值曲线）正常传输至用电信息采集系统，且数据完整、准确。

采集异常：电能计量点电能表电能示值（包括日冻结电能示值和电能示值曲线）采集正常，但与现场电能表计量示值不一致。

采集失败：电能计量点电能表、采集终端对用电信息采集系统命令无响应的，或者电能示值曲线采集不完整的。
"""

RETAIL_ATTACHMENT_SECTION = """## 附件

### 名词解释

电力批发市场：发电企业和电力批发用户或售电公司之间进行电力交易的市场，主要包括通过市场化方式开展的中长期电能量市场和现货电能量市场。

电力零售市场：在批发市场的基础上，由售电公司（含虚拟电厂、负荷聚合商等）和电力用户自主开展交易的市场。

零售用户：指通过零售市场向售电公司购电的电力用户。

电力交易平台：指由电力交易机构建设运营的支撑电力市场化交易业务开展的技术支持系统（含零售商城、“e-交易”APP 等）。

零售套餐：指售电公司与零售用户确定购售电结算价格的标准化商品，售电公司可根据自身经营特性制定相应的零售套餐，零售用户可自由选择购买。

零售合同：零售双方达成电力零售交易后形成的合同（协议），具备法律约束力。
"""

MIDLONG_20260403_APPENDIX_1_AND_2 = """## 附件1

### 名词解释

#### 1. 新型经营主体

新型经营主体是指具备电力、电量调节能力且具有新技术特征、新运营模式的配电环节各类资源，可分为单一技术类新型经营主体和资源聚合类新型经营主体。其中，单一技术类新型经营主体主要包括分布式光伏、分散式风电、储能等分布式电源和可调节负荷；资源聚合类新型经营主体主要包括虚拟电厂（负荷聚合商）和智能微电网等，配电环节具备相应特征的源网荷储一体化项目可视作智能微电网。

#### 2. 按日连续开市

按日连续开市是指电力交易机构在每日（工作日或自然日）组织电力中长期交易的活动。

#### 3. 交易序列

交易序列是指由电力交易机构在电力交易平台中，按照不同交易方式、不同交易执行周期等要素建立的交易组织集合。

#### 4. 集中竞价交易

集中竞价交易是指针对已明确时段、数量、单位、执行周期等要素的电力产品，经营主体等在规定截止时间前集中申报价格，由电力交易平台汇总经营主体等提交的交易申报信息进行“统一边际出清”或“撮合匹配、边际出清”。

#### 5. 滚动撮合交易

滚动撮合交易是指针对已明确时段、数量、单位、执行周期等要素的电力产品，在规定的交易起止时间内，经营主体等可以随时提交购电或者售电信息，电力交易平台依据申报顺序进行滚动撮合，按照对手方价格优先、时间优先等原则成交。

#### 6. 挂牌交易

挂牌交易指经营主体等通过电力交易平台，将需求电量或者可供电量的数量和价格等信息对外发布要约，由符合资格要求的另一方提出接受该要约的申请。挂牌交易按照摘牌情况成交，可由电力产品或服务的卖方（或买方）一方挂牌，另一方摘牌；也可允许买卖两方在自身发用电能力范围内同步挂牌、摘牌。

#### 7. 绿色电力

绿色电力是指符合国家有关政策要求的风电（含分散式风电和海上风电）、太阳能发电（含分布式光伏发电和光热发电）、常规水电、生物质发电、地热能发电、海洋能发电等已建档立卡的可再生能源发电项目所产生的全部电量。初期，参与绿色电力交易的可再生能源发电项目为风电、光伏发电项目，条件成熟时，可逐步扩大至符合条件的其他可再生能源。

#### 8. 电力市场风险类型

（1）电力供需失衡风险

电力供需失衡风险指电力供应与需求大幅波动、超出正常预测偏差范围，影响电力系统供需平衡的风险。

（2）市场价格异常风险

市场价格异常风险指某地区、时段市场价格持续偏高或偏低，波动范围或持续时间明显超过正常变化范围的风险。

（3）不正当竞争风险

不正当竞争风险指经营主体违规行使市场力操纵市场价格、持留容量、达成垄断协议等，或串通报价、哄抬价格，并严重影响交易结果的风险。

（4）技术支持系统运行异常风险

技术支持系统运行异常风险指支撑电力市场的各类技术支持系统出现异常或不可用状态，或因黑客、恶意代码等攻击、干扰和破坏等行为，造成被攻击系统及其中数据的安全性、完整性和可用性被破坏，影响市场正常运行的风险。

（5）合同违约风险

合同违约风险指经营主体失信、失去正常履约能力、存在争议或不可抗力等原因而不能正常履行已签订的电力中长期合同的风险。

（6）其他市场风险

其他市场风险指经营主体交易申报差错、滥用高频量化交易、提供虚假注册资料获取交易资格等，影响市场正常秩序的风险。

## 附件2

### 1. 集中竞价统一出清算法

1.1 出清计算"""


def target_paths_for_stem(stem: str) -> list[Path]:
    return [
        POLICY_DIR / f"{stem}.md",
        POLICY_DIR / f"{stem}.html",
        ZC_HTML_DIR / f"{stem}.html",
        ZC_HTML_DIR / f"{stem}.zc_skill.html",
        ZC_HTML_DIR / f"{stem}.json",
        ZC_STRUCTURED_DIR / f"{stem}.structured.json",
        ZC_STRUCTURED_DIR / f"{stem}.zc_skill.structured.json",
        ZC_STRUCTURED_DIR / f"{stem}.zc_skill.report.md",
    ]


def backup_outputs() -> Path:
    backup_dir = Path("/private/tmp") / f"hunan_policy_parse_qa_repair_{datetime.now():%Y%m%d-%H%M%S}"
    paths: list[Path] = []
    for stem in TARGET_STEMS + [SPOT_STEM]:
        paths.extend(target_paths_for_stem(stem))
    paths.extend(POLICY_DIR.glob("*.ocr_preview.*"))
    paths.extend(POLICY_DIR.glob("*.textlayer_backup.*"))
    paths.extend([ZC_STRUCTURED_DIR / "index.json", ZC_HTML_DIR / "index.html"])
    for path in paths:
        if not path.exists():
            continue
        rel = path.relative_to(POLICY_DIR)
        dest = backup_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)
    return backup_dir


def archive_intermediate_previews() -> list[Path]:
    ARCHIVE_DIR.mkdir(exist_ok=True)
    moved: list[Path] = []
    for path in sorted(list(POLICY_DIR.glob("*.ocr_preview.*")) + list(POLICY_DIR.glob("*.textlayer_backup.*"))):
        dest = ARCHIVE_DIR / path.name
        if dest.exists():
            dest = ARCHIVE_DIR / f"{path.stem}.{datetime.now():%Y%m%d%H%M%S}{path.suffix}"
        shutil.move(str(path), str(dest))
        moved.append(dest)
    return moved


def remove_duplicate_toc_heading_block(text: str) -> str:
    """Remove heading-only blocks generated from the PDF table of contents."""
    lines = text.splitlines()
    toc_idx = next((i for i, line in enumerate(lines) if line.strip() == "## 目录"), None)
    if toc_idx is None:
        return text

    after_toc = toc_idx + 1
    body_like = [
        re.compile(r"^第[一二三四五六七八九十百千万零〇两]+条"),
        re.compile(r"^第一条"),
        re.compile(r"^\d+[.．]\d*\s"),
    ]
    first_body = None
    for i in range(after_toc, len(lines)):
        stripped = lines[i].strip()
        if any(pattern.match(stripped) for pattern in body_like):
            first_body = i
            break
    if first_body is None:
        return text

    # After the TOC list, generated garbage usually consists only of headings,
    # blank lines, isolated page numbers, and watermark fragments until body.
    block_start = None
    for i in range(after_toc, first_body):
        stripped = lines[i].strip()
        if stripped.startswith("## ") and stripped != "## 目录":
            block_start = i
            break
    if block_start is None:
        return text

    removable = True
    for line in lines[block_start:first_body]:
        stripped = line.strip()
        if not stripped:
            continue
        if re.match(r"^#{2,6}\s+", stripped):
            continue
        if re.fullmatch(r"[0-9]{1,3}", stripped):
            continue
        if re.search(r"名词解释|附件|出清算法|预挂牌|新能源汽车|有限公|[.。…]{2,}", stripped):
            continue
        removable = False
        break
    if not removable:
        return text
    return "\n".join(lines[:block_start] + lines[first_body:])


def cleanup_common_noise(text: str) -> str:
    # Repair lines where diagonal watermarks split a valid sentence. These are
    # handled before broad watermark-line deletion so the surrounding prose is kept.
    text = text.replace("新能源汽车地方电网企业", "地方电网企业")
    text = text.replace("根据经营主体需求临时\n\n；京小桔新能源汽车开展分时段合同转让交易", "根据经营主体需求临时开展分时段合同转让交易")
    text = text.replace("确保市\n\n新能源汽车场平稳运行", "确保市场平稳运行")
    text = text.replace("电力交易机—40 一\n\n；京小桔新能源汽车构发布预成交结果", "电力交易机构发布预成交结果")
    text = text.replace("按照额定容量等比例计\n\n新能源汽车算各自上网电量", "按照额定容量等比例计算各自上网电量")
    text = text.replace("按照\n\n京小桔交易规则组织", "按照交易规则组织")
    text = text.replace("K\n\n吉取值范围", "K取值范围")
    text = text.replace("6宗小档单一售电公司", "单一售电公司")
    text = text.replace("省能源o^局", "省能源局")

    replacements = {
        "\x0crac": r"\frac",
        "\x0cr": r"\fr",
        "\times": r"\times",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = re.sub(r"(?m)^名词解释：\d*出清算法预挂牌招标交易机制\s*$\n?", "", text)
    text = re.sub(r"(?m)^.*?(?:北京小桔|京小桔|新能源汽车|技有限公|斗技自限公司).*?\n?", "", text)
    text = re.sub(r"(?m)^(?:孓|吉糸|吉|法袋；?\s*）?|新能源汽车分时段电价。)\s*$\n?", "", text)
    text = re.sub(r"\s*[—-]\s*\d{1,3}\s*[一-]\s*", "", text)
    text = re.sub(r"(?m)^名取相.*?\n?", "", text)
    text = re.sub(r"(?m)^30\.35!1（/\s*$\n?", "", text)
    text = re.sub(r"(?m)^\s*[0-9]{1,3}\s*$\n(?=\n?## )", "", text)
    text = re.sub(r"(?m)^湖南省发展和改革委员会办公室2025年9月29日印发\d*\s*$\n?", "", text)
    text = re.sub(
        r"(?m)^#{2,6}[ \t]*\n+"
        r"(第[一二三四五六七八九十百千万零〇两]+节[ \t]+[^\n]+)$",
        r"### \1",
        text,
    )
    text = re.sub(r"(?m)^#{2,6}[ \t]*\n+", "", text)
    text = re.sub(r"(?m)^### (第[一二三四五六七八九十百千万零〇两]+条)\s*$", r"\1", text)
    text = re.sub(r"(?m)^### (\d+\.\d+) (.{16,})$", r"\1 \2", text)
    text = re.sub(r"(?m)^## ([1-9]\d?[.．]\s*第[一二三四五六七八九十百千万零〇两]+条)", r"\1", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def split_glued_articles(text: str) -> str:
    text = re.sub(r"(?<!^)(?<!\n)(?<!# )(第[一二三四五六七八九十百千万零〇两]+条)", r"\n\n\1", text)
    text = re.sub(r"(?<!^)(?<!\n)(?<!# )(第[一二三四五六七八九十百千万零〇两]+节)", r"\n\n\1", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def repair_heading_and_noise(text: str) -> str:
    text = remove_duplicate_toc_heading_block(text)
    text = cleanup_common_noise(text)
    text = split_glued_articles(text)
    text = cleanup_common_noise(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def replace_between(text: str, start: str, end: str, replacement: str, *, count: int = 1) -> str:
    pattern = re.escape(start) + r".*?" + re.escape(end)
    new_text, n = re.subn(pattern, lambda _m: replacement, text, count=count, flags=re.S)
    if n == 0:
        raise RuntimeError(f"marker replacement failed: {start[:40]} ... {end[:40]}")
    return new_text


def replace_line_matching(text: str, pattern: str, replacement: str) -> str:
    new_text, n = re.subn(pattern, lambda _m: replacement, text, count=1, flags=re.M)
    if n == 0:
        raise RuntimeError(f"line replacement failed: {pattern}")
    return new_text


def repair_meter_numbering_context(text: str) -> str:
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


def repair_meter_section_structure(text: str) -> str:
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


def repair_meter(text: str) -> str:
    text = repair_heading_and_noise(text)
    text = text.replace("\x0c", "\\f")
    text = text.replace("=\\frac", r"=\frac")
    text = text.replace("+\\frac", r"+\frac")
    text = text.replace("+\frac", r"+\frac")
    text = text.replace(")\times", r")\times")
    text = text.replace(")\t imes", r")\times")
    text = text.replace("B.若", "B. 若")
    text = text.replace("（2）拟合规则II拟合规则II", "（2）拟合规则 II\n\n拟合规则 II")
    text = repair_meter_numbering_context(text)
    text = repair_meter_section_structure(text)
    return text


def repair_register(text: str) -> str:
    text = repair_heading_and_noise(text)
    text = re.sub(r"(?m)^### (\d+\.\d+) (.{15,})$", r"\1 \2", text)
    text = text.replace("## 2. 基本信息", "2. 基本信息")
    text = re.sub(r"(?m)^## ([1-9]\d?[.．]\s*基本信息)$", r"\1", text)
    return text


def repair_retail(text: str) -> str:
    text = repair_heading_and_noise(text)
    text = text.replace("代理3购电价格", "代理购电价格")
    text = re.sub(
        r"## 附件\s*\n+名词解释.*\Z",
        lambda _match: RETAIL_ATTACHMENT_SECTION.rstrip(),
        text,
        count=1,
        flags=re.S,
    )
    return text


def repair_freq(text: str) -> str:
    text = repair_heading_and_noise(text)
    return text


def repair_midlong(text: str) -> str:
    text = repair_heading_and_noise(text)
    text = text.replace("- 附件1\n- 附件3", "- 附件1\n- 附件2\n- 附件3")
    text = text.replace("### 第二节 市场成员的权利和义务15", "### 第二节 市场成员的权利和义务")
    text = text.replace("### 第三节 市场成员义务《。", "### 第三节 市场成员义务")
    text = text.replace("### 第七节 月度挂牌交易…....", "### 第七节 月度挂牌交易")
    text = text.replace("### 第十节 绿色电力交易…….", "### 第十节 绿色电力交易")
    text = re.sub(
        r"## 附件1\s*\n+名词解释1\. 新型经营主体.*?1\.1 出清计算",
        lambda _match: MIDLONG_20260403_APPENDIX_1_AND_2,
        text,
        count=1,
        flags=re.S,
    )
    text = re.sub(r"(偏差量)(第一百一十四条)", r"\1\n\n\2", text)
    text = re.sub(r"(结算依据)(第一百一十五条)", r"\1\n\n\2", text)
    text = re.sub(r"(组成)(第三十九条)", r"\1\n\n\2", text)
    text = re.sub(r"(购售同期抄表结算)(第一百三十七条)", r"\1\n\n\2", text)
    text = re.sub(r"(电费结算的依据)(第一百三十八条)", r"\1\n\n\2", text)
    return text


SETTLEMENT_REPLACEMENTS: list[tuple[str, str, str]] = [
    (
        "（一）发电侧主体非市场电能量电费按照未参与电能量市场交易的分时上网电量",
        "（二）新建机组（场站）调试运行期间",
        "（一）发电侧主体非市场电能量电费按照未参与电能量市场交易的分时上网电量和政府价格主管部门批复上网电价计算非市场电能量电费。计算公式如下："
        + math_block(r"R_{\mathrm{非市场}}=\sum_t(Q_{\mathrm{非市场},t}\times P_{\mathrm{批复}})")
        + "其中，$Q_{\\mathrm{非市场},t}$ 为机组（场站）$t$ 时段未参与电能量市场交易的上网结算电量，$P_{\\mathrm{批复}}$ 为机组（场站）政府价格主管部门批复上网电价。\n\n（二）新建机组（场站）调试运行期间",
    ),
    (
        "（三）机组（场站）参与或由市场运营机构代理参与省间日前电力现货交易",
        "（五）机组（场站）参与省间中长期合约电能量电费按照省间中长期合约电量和中长期合约价格计算。计算公式如下",
        "（三）机组（场站）参与或由市场运营机构代理参与省间日前电力现货交易、日前华中省间调峰及备用辅助服务交易、日前跨省跨区应急调度保省内消纳售电交易时，省间日前电能量电费按机组（场站）省间日前交易出清电量（或分配电量）和省间日前交易出清价格计算。计算公式如下："
        + math_block(
            r"R_{\mathrm{省间日前}}=R_{\mathrm{省间日前现货}}+R_{\mathrm{日前华中备用}}+R_{\mathrm{日前华中备用预留}}-R_{\mathrm{日前华中调峰售出服务}}+R_{\mathrm{日前华中调峰购入服务}}+R_{\mathrm{日前应急调度}}"
            "\n"
            r"R_{\mathrm{省间日前现货}}=\sum_t(Q_{\mathrm{省间日前现货},t}\times P_{\mathrm{省间日前现货},t})"
        )
        + "（四）机组（场站）参与或由市场运营机构代理参与省间日内电力现货交易、日内华中省间调峰及备用辅助服务交易、日内跨省跨区应急调度保省内消纳售电交易时，省间日内电能量电费按机组（场站）省间日内交易出清电量（或分配电量）和省间日内交易出清价格计算。计算公式如下："
        + math_block(
            r"R_{\mathrm{省间日内}}=R_{\mathrm{省间日内现货}}+R_{\mathrm{日内华中备用}}-R_{\mathrm{日内华中调峰售出服务}}+R_{\mathrm{日内华中调峰购入服务}}+R_{\mathrm{日内应急调度}}"
            "\n"
            r"R_{\mathrm{省间日内现货}}=\sum_t(Q_{\mathrm{省间日内现货},t}\times P_{\mathrm{省间日内现货},t})"
        )
        + "（五）机组（场站）参与省间中长期合约电能量电费按照省间中长期合约电量和中长期合约价格计算。计算公式如下",
    ),
    (
        "（六）机组（场站）省内合约电能量电费按照省内中长期合约电量和中长期合约价格",
        "（七）机组（场站）省内日前电能量电费根据省内日前市场",
        "（六）机组（场站）省内合约电能量电费按照省内中长期合约电量和中长期合约价格、日前市场节点电价与中长期结算参考点的日前节点电价的差值计算。计算公式如下："
        + math_block(r"R_{\mathrm{省内合约}}=\sum_t[Q_{\mathrm{省内合约},t}\times(P_{\mathrm{省内合约},t}+P_{\mathrm{日前},t}-P_{\mathrm{参考点日前},t})]")
        + "其中，$Q_{\\mathrm{省内合约},t}$ 为机组（场站）$t$ 时段省内中长期合约电量，$P_{\\mathrm{省内合约},t}$ 为机组（场站）$t$ 时段省内中长期合约价格，$P_{\\mathrm{日前},t}$ 为机组（场站）$t$ 时段的日前市场节点电价，$P_{\\mathrm{参考点日前},t}$ 为中长期结算参考点 $t$ 时段日前市场节点电价。\n\n（七）机组（场站）省内日前电能量电费根据省内日前市场",
    ),
    (
        "（八）直接参与现货市场的机组（场站），其省内实时电能量电费",
        "（九）不直接参与现货市场的市场化机组（场站），其省内实时电能量电费",
        "（八）直接参与现货市场的机组（场站），其省内实时电能量电费根据省内实时市场结算电量与日前市场出清电量之间的差额，以及省内实时市场节点电价计算。计算公式如下："
        + math_block(
            r"R_{\mathrm{省内实时}}=\sum_t[(Q_{\mathrm{实时结算},t}-Q_{\mathrm{日前出清},t})\times P_{\mathrm{实时},t}]"
            "\n"
            r"Q_{\mathrm{实时结算},t}=Q_{\mathrm{上网},t}-Q_{\mathrm{省间日内现货},t}-Q_{\mathrm{日内华中备用},t}+Q_{\mathrm{日内华中调峰售出服务},t}-Q_{\mathrm{日内华中调峰购入服务},t}-Q_{\mathrm{日内应急调度},t}"
        )
        + "其中，$Q_{\\mathrm{实时结算},t}$ 为机组（场站）省内实时市场 $t$ 时段结算电量，$P_{\\mathrm{实时},t}$ 为机组（场站）$t$ 时段的实时市场节点电价，$Q_{\\mathrm{上网},t}$ 为机组（场站）$t$ 时段实际上网电量。\n\n（九）不直接参与现货市场的市场化机组（场站），其省内实时电能量电费",
    ),
    (
        "（九）不直接参与现货市场的市场化机组（场站），其省内实时电能量电费",
        "经营主体共用同一上网关口计量点的新能源项目",
        "（九）不直接参与现货市场的市场化机组（场站），其省内实时电能量电费根据实际上网结算电量与中长期合约电量之间的差额，以及实时市场统一结算点电价计算。计算公式如下："
        + math_block(r"R_{\mathrm{省内实时}}=\sum_t[(Q_{\mathrm{上网},t}-Q_{\mathrm{非市场},t}-Q_{\mathrm{中长期},t})\times P_{\mathrm{实时统一},t}]")
        + "其中，$Q_{\\mathrm{上网},t}$ 为机组（场站）$t$ 时段实际上网电量，$Q_{\\mathrm{非市场},t}$ 为未参与电能量市场交易的上网结算电量，$P_{\\mathrm{实时统一},t}$ 为实时市场 $t$ 时段的统一结算点电价。\n\n经营主体共用同一上网关口计量点的新能源项目",
    ),
    (
        "（五）批发市场用户调平电费结算按照月实际用电量",
        "（六）售电公司代理的零售用户发生跨月电能量退补时",
        "（五）批发市场用户调平电费结算按照月实际用电量与日清累计实际分时用电量之间的差额，以及现货市场月度综合价格计算。计算公式如下："
        + math_block(r"C_{\mathrm{调平}}=\sum_t[(Q_{\mathrm{月度},t}-Q_{\mathrm{实时},t})\times P_{\mathrm{现货综合},m}]")
        + "其中，$C_{\\mathrm{调平}}$ 为批发市场用户月度调平电费，$Q_{\\mathrm{月度},t}$ 为月度实际用电量，$Q_{\\mathrm{实时},t}$ 为日清累计实际分时用电量，$P_{\\mathrm{现货综合},m}$ 为现货市场月度综合价格。\n\n（六）售电公司代理的零售用户发生跨月电能量退补时",
    ),
    (
        "（二）阻塞风险对冲费用阻塞风险对冲费用是在结算环节",
        "（三）火电机组运行补偿费用火电机组运行补偿费用",
        "（二）阻塞风险对冲费用阻塞风险对冲费用是在结算环节对参与现货市场日清分的发电企业产生的中长期合约阻塞费用进行回收或补偿。计算公式如下："
        + math_block(r"R_{\mathrm{阻塞风险对冲费用},i}=\sum_t[Q_{\mathrm{省内合约},i,t}\times(P_{\mathrm{参考点日前},t}-P_{\mathrm{日前},i,t})]\times K_{\mathrm{阻塞对冲}}")
        + "其中，$Q_{\\mathrm{省内合约},i,t}$ 为机组（场站）$i$ 在 $t$ 时段中长期合约分解电量，$P_{\\mathrm{参考点日前},t}$ 为日前市场 $t$ 时段的用户侧统一结算点电价，$P_{\\mathrm{日前},i,t}$ 为机组（场站）$i$ 所在节点日前电价，$K_{\\mathrm{阻塞对冲}}$ 为阻塞风险对冲费用的回收或补偿比例。\n\n（三）火电机组运行补偿费用火电机组运行补偿费用",
    ),
    (
        "（二）市场发用电量不平衡偏差费用市场发用电量不平衡偏差费用",
        "（三）市场结构类不平衡费用市场结构类不平衡费用",
        "（二）市场发用电量不平衡偏差费用市场发用电量不平衡偏差费用是指现货模式下市场发电侧按日前市场出清电量结算，用户侧按日前申报电量结算，发用两侧结算电量存在不平衡导致的不平衡费用。计算公式如下："
        + math_block(r"R_{\mathrm{市场发用电量不平衡费用}}=\sum_t[(Q_{\mathrm{市场用户日前申报},t}-Q_{\mathrm{市场机组日前出清},t})\times(P_{\mathrm{日前统一},t}-P_{\mathrm{实时统一},t})]")
        + "其中，$Q_{\\mathrm{市场用户日前申报},t}$ 为日前市场用户 $t$ 时段总申报电量，$Q_{\\mathrm{市场机组日前出清},t}$ 为日前市场机组（场站）$t$ 时段总出清电量，$P_{\\mathrm{日前统一},t}$ 为日前市场 $t$ 时段用户侧统一结算点电价，$P_{\\mathrm{实时统一},t}$ 为实时市场 $t$ 时段用户侧统一结算点电价。\n\n（三）市场结构类不平衡费用市场结构类不平衡费用",
    ),
    (
        "（三）市场结构类不平衡费用市场结构类不平衡费用主要指",
        "第五十四条 市场调节类费用包括",
        "（三）市场结构类不平衡费用市场结构类不平衡费用主要指由于计划与市场双轨制等原因，导致出现的偏差费用。计算公式如下："
        + math_block(r"R_{\mathrm{市场结构类不平衡费用}}=R_{\mathrm{总不平衡费用}}-R_{\mathrm{市场发用电量不平衡费用}}-R_{\mathrm{阻塞不平衡费用}}")
        + "市场结构类不平衡费用按月度实际用电量比例向电力用户分摊或返还。\n\n第五十四条 市场调节类费用包括",
    ),
    (
        "第六十六条 发电侧主体月度总电费包含电能量电费",
        "第六十七条 售电公司月度总电费包含",
        "第六十六条 发电侧主体月度总电费包含电能量电费、市场运营费用、辅助服务费用、煤电容量电费、绿色环境价值费用和跨月调整退补费用。计算公式如下："
        + math_block(r"R_{\mathrm{发电}}=R_{\mathrm{电能量}}+R_{\mathrm{市场运营}}+R_{\mathrm{辅助}}+R_{\mathrm{容量}}+R_{\mathrm{绿色价值}}+R_{\mathrm{退补}}")
        + "发电侧市场运营费用包含成本补偿类费用、市场平衡类费用、市场调节类费用。计算公式如下："
        + math_block(
            r"R_{\mathrm{市场运营}}=R_{\mathrm{成本补偿}}+R_{\mathrm{市场平衡}}+R_{\mathrm{市场调节}}"
            "\n"
            r"R_{\mathrm{成本补偿}}=R_{\mathrm{启动}}+R_{\mathrm{阻塞风险对冲费用及分摊}}+R_{\mathrm{火电机组运行}}+R_{\mathrm{储能补偿及分摊}}"
            "\n"
            r"R_{\mathrm{市场平衡}}=R_{\mathrm{阻塞不平衡费用及返还}}+R_{\mathrm{发用电不平衡费用及返还}}"
            "\n"
            r"R_{\mathrm{市场调节}}=R_{\mathrm{发电侧中长期缺额回收费用}}+R_{\mathrm{发电侧中长期超额回收费用}}+R_{\mathrm{用户侧中长期缺额回收费用返还}}+R_{\mathrm{用户侧中长期超额回收费用返还}}+R_{\mathrm{火电超额获益日回收费用}}+R_{\mathrm{实时发电执行偏差考核费用及返还}}+R_{\mathrm{日内临时非计划停运机组收益回收费用}}"
        )
        + "第六十七条 售电公司月度总电费包含",
    ),
    (
        "第六十七条 售电公司月度总电费包含",
        "第六十八条 独立新型储能月度总电费包含",
        "第六十七条 售电公司月度总电费包含批发市场电能量电费、市场运营费用、零售市场电能量电费及跨月调整退补费用。计算公式如下："
        + math_block(r"R_{\mathrm{售电公司}}=C_{\mathrm{零售电能量}}+R_{\mathrm{市场运营,售电}}-C_{\mathrm{批发用户}}+C_{\mathrm{退补}}")
        + "其中，售电公司市场运营费用包含用户侧中长期缺额回收费用、用户侧中长期超额回收费用。计算公式如下："
        + math_block(r"R_{\mathrm{市场运营,售电}}=R_{\mathrm{用户侧中长期缺额回收费用}}+R_{\mathrm{用户侧中长期超额回收费用}}")
        + "第六十八条 独立新型储能月度总电费包含",
    ),
    (
        "第六十八条 独立新型储能月度总电费包含",
        "第六十九条 虚拟电厂发电单元月度总电费参照",
        "第六十八条 独立新型储能月度总电费包含电能量电费、储能补偿费用、辅助服务费用及跨月调整退补费用。计算公式如下："
        + math_block(r"R_{\mathrm{独立新型储能}}=R_{\mathrm{储能上网}}+R_{\mathrm{储能下网}}+R_{\mathrm{储能补偿}}+R_{\mathrm{辅助服务}}+R_{\mathrm{退补}}")
        + "第六十九条 虚拟电厂发电单元月度总电费参照",
    ),
    (
        "第七十条 电力用户参与现货市场后，其月度总电费包含市场电能量电费",
        "第七十一条 根据市场规则应向电力用户分摊或返还的市场运营费用",
        "第七十条 电力用户参与现货市场后，其月度总电费包含市场电能量电费、输配电费、上网环节线损费用、系统运行费用、政府性基金及附加、基本电费和功率因数调整电费等。其中，输配电费、上网环节线损费用、系统运行费用、政府性基金及附加、基本电费和功率因数调整电费等由电网企业按照政府有关规定执行。计算公式如下："
        + math_block(r"C_{\mathrm{用户}}=C_{\mathrm{市场电能量}}+C_{\mathrm{输配}}+C_{\mathrm{上网环节线损}}+C_{\mathrm{系统运行}}+C_{\mathrm{政府性基金及附加}}+C_{\mathrm{基本电费}}+C_{\mathrm{功率因数调整}}")
        + "其中，$C_{\\mathrm{市场电能量}}$ 为电力用户市场化电能量电费，$C_{\\mathrm{输配}}$ 为输配电费，$C_{\\mathrm{上网环节线损}}$ 为上网环节线损费用，$C_{\\mathrm{系统运行}}$ 为系统运行费用，$C_{\\mathrm{基本电费}}$ 为基本电费，$C_{\\mathrm{功率因数调整}}$ 为功率因数调整电费。\n\n第七十一条 根据市场规则应向电力用户分摊或返还的市场运营费用",
    ),
]


def repair_settlement(text: str) -> str:
    text = repair_heading_and_noise(text)
    for start, end, replacement in SETTLEMENT_REPLACEMENTS:
        text = replace_between(text, start, end, replacement)
    text = re.sub(r"(?m)^敬迎宾楚酎.*?\n?", "", text)
    text = re.sub(r"(?m)^国家能源局湖南监管办公室湖南省能源局关于印发.*?湖南省电\s*$", "", text)
    text = re.sub(r"(?m)^力市场结算实施细则》。现印发给你们，请遵照执行\s*$", "", text)
    text = re.sub(r"(?m)^2\s*$\n?", "", text)
    text = re.sub(r"(?m)^S\s*$\n?", "", text)
    text = re.sub(r"(?m)^### (第[一二三四五六七八九十百千万零〇两]+节)\s+(.+)$", r"### \1 \2", text)
    text = re.sub(r"(?<!\n)(第[一二三四五六七八九十百千万零〇两]+条)", r"\n\n\1", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def repair_amend(text: str) -> str:
    text = repair_heading_and_noise(text)
    text = re.sub(r"(?m)^## ([1-9]\d?[.．]\s+第[一二三四五六七八九十百千万零〇两]+条)", r"\1", text)
    text = re.sub(r"(?m)^## ([1-9]\d?[.．]\s+机组.+)$", r"\1", text)
    text = re.sub(r"(?m)^P 实时,t 为", r"$P_{\\mathrm{实时},t}$ 为", text)
    text = re.sub(r"(?m)^Q 实时结算,t为", r"$Q_{\\mathrm{实时结算},t}$ 为", text)
    text = re.sub(r"(?m)^Q 日前结算,t为", r"$Q_{\\mathrm{日前结算},t}$ 为", text)
    text = re.sub(r"(?m)^P 参考点日前均价,t为", r"$P_{\\mathrm{参考点日前均价},t}$ 为", text)
    return text


REPAIR_BY_STEM = {
    MIDLONG_20251024: repair_midlong,
    FREQ_STEM: repair_freq,
    METER_STEM: repair_meter,
    REGISTER_STEM: repair_register,
    RETAIL_STEM: repair_retail,
    SETTLEMENT_STEM: repair_settlement,
    MIDLONG_20260403: repair_midlong,
    AMEND_STEM: repair_amend,
}


def write_report(stem: str, structured: dict, notes: list[str]) -> None:
    quality = structured.get("quality_report", {})
    note_lines = "\n".join(f"- {note}" for note in notes)
    report = f"""# {stem} QA 修复报告

## 修复范围

{note_lines}
- 已重新生成同名 HTML、ZC_HTML JSON、ZC_STRUCTURED JSON 与索引。

## 结果

- 章节数：{quality.get("chapter_count")}
- 公式节点：{quality.get("formula_count")}
- 未恢复公式数：{quality.get("unresolved_formula_count")}
- 未解析表格数：{quality.get("unresolved_table_count")}
"""
    (ZC_STRUCTURED_DIR / f"{stem}.zc_skill.report.md").write_text(report, encoding="utf-8")


def rebuild_outputs(stem: str, notes: list[str]) -> dict:
    md_path = POLICY_DIR / f"{stem}.md"
    pdf_path = POLICY_DIR / f"{stem}.pdf"
    text = md_path.read_text(encoding="utf-8")
    repaired = REPAIR_BY_STEM[stem](text)
    md_path.write_text(repaired, encoding="utf-8")

    html_path = md_to_html.convert_file(md_path)
    html_text = render_formula_blocks(html_path.read_text(encoding="utf-8"))
    html_path.write_text(html_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{stem}.html").write_text(html_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{stem}.zc_skill.html").write_text(html_text, encoding="utf-8")

    base_report = md_to_json.load_base_report(pdf_path, ZC_HTML_DIR)
    structured = postprocess_structured(md_to_json.parse_markdown(md_path, base_report))
    json_text = json.dumps(structured, ensure_ascii=False, indent=2)
    (ZC_STRUCTURED_DIR / f"{stem}.structured.json").write_text(json_text, encoding="utf-8")
    (ZC_STRUCTURED_DIR / f"{stem}.zc_skill.structured.json").write_text(json_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{stem}.json").write_text(json_text, encoding="utf-8")
    write_report(stem, structured, notes)
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


def validate_outputs() -> dict[str, list[str]]:
    checks: dict[str, list[str]] = {}
    patterns = {
        "raw_html_math": re.compile(r'<div class="math-block"><code>'),
        "formula_image_ref": re.compile(r'!\[公式\]|<figure class="formula-figure"|<img[^>]+formula'),
        "bad_control_char": re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]"),
        "known_noise": re.compile(r"INLINE_MATH|@@IM|VQUZUOMA|VQZUOMA|品路公绍|名取相|京小桔|新能源汽车|公式如下C湖平|E=\x0c|\\x0c"),
    }
    for path in sorted(list(POLICY_DIR.glob("*.md")) + list(POLICY_DIR.glob("*.html"))):
        if ARCHIVE_DIR in path.parents:
            continue
        if ".ocr_preview" in path.name or ".textlayer_backup" in path.name:
            checks.setdefault("intermediate_root", []).append(str(path))
        text = path.read_text(encoding="utf-8", errors="ignore")
        for name, pattern in patterns.items():
            if pattern.search(text):
                checks.setdefault(name, []).append(str(path))
    return checks


def main() -> int:
    backup_dir = backup_outputs()
    print(f"backup_dir={backup_dir}")
    moved = archive_intermediate_previews()
    if moved:
        print("archived_intermediates=" + str(len(moved)))
    notes_by_stem = {
        MIDLONG_20251024: ["移除目录伪标题块", "清理页码/水印残留", "拆分粘连条文"],
        FREQ_STEM: ["移除目录伪标题块"],
        METER_STEM: ["修复损坏的 LaTeX 控制字符", "清理目录伪标题与列表误标题"],
        REGISTER_STEM: ["修正文内条目被误切成标题的问题"],
        RETAIL_STEM: ["清理目录伪标题与页码残留"],
        SETTLEMENT_STEM: ["移除目录伪标题块和 OCR 噪声", "按稳定上下文恢复多处公式段落", "拆分粘连条文"],
        MIDLONG_20260403: ["移除目录伪标题块", "清理水印残片", "拆分粘连条文"],
        AMEND_STEM: ["降低条款编号误标题等级", "恢复公式解释中的内联变量"],
    }
    for idx, stem in enumerate(TARGET_STEMS, 1):
        print(f"[{idx}/{len(TARGET_STEMS)}] {stem}", flush=True)
        structured = rebuild_outputs(stem, notes_by_stem[stem])
        q = structured.get("quality_report", {})
        print(
            f"  chapters={q.get('chapter_count')} formulas={q.get('formula_count')} "
            f"unresolved={q.get('unresolved_formula_count')}",
            flush=True,
        )
    rebuild_index()
    failures = validate_outputs()
    if failures:
        print("validation_warnings=" + json.dumps(failures, ensure_ascii=False, indent=2))
    else:
        print("validation_warnings={}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
