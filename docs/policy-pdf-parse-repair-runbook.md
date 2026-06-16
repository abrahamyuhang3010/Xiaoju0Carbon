# 政策 PDF 解析修复方法沉淀

本文沉淀最近几类湖南政策 PDF 解析修复的通用方法，适用于扫描件、OCR 噪声重、公式多、目录和正文结构容易错位的政策文件。

## 核心原则

1. PDF 页面图像是最终依据。OCR 文本、Markdown、HTML、JSON 互相不一致时，以 PDF 页面视觉内容为准。
2. 修复要可重复运行。每个脆弱文件优先写确定性的 `scripts/fix_*.py`，不要只手改产物。
3. 用稳定上下文定位，不依赖行号。优先用章节标题、公式图片文件名、段落起止文字、附件标题等锚点。
4. 同一份 Markdown 生成所有产物。修完后统一回写 `.md`、`.html`、`ZC_HTML/*.json`、`ZC_STRUCTURED/*.structured.json`、报告和索引。
5. 先备份再写入。脚本运行前把目标文件备份到 `/private/tmp/<task>_<timestamp>`。
6. 验收要覆盖 MD、HTML、JSON。不能只看 HTML 正常，结构化 JSON 也必须同步正确。

## 问题类型与修复模式

### 1. 目录和正文标题不一致

典型症状：

- 目录只剩少数条目，例如只显示 `10. 附则` 和 `附件`。
- 正文标题跳号，`2. 适用范围`、`3. 引用文件` 被并入 `1. 总述`。
- `具备单独计量条件6. 标题`、`申请仲裁检定8. 标题` 这类标题和上一段粘连。
- 目录页条目被误识别成正文标题，生成重复章节。

修复方法：

- 对目标文件定义权威目录常量，例如 `METER_TOC`，用 PDF 目录逐项抄准。
- 用正则替换整个 `## 目录` 块，保留为普通列表，不把目录条目提升成正文标题。
- 对正文粘连标题按编号重切：

```python
text = re.sub(
    r"\n+2[．.]\s*适用范围\s*(本细则适用于)",
    r"\n\n## 2. 适用范围\n\n\1",
    text,
    count=1,
)

text = re.sub(
    r"申请仲裁检定\s*8[．.]\s*计量数据采集管理",
    "申请仲裁检定。\n\n## 8. 计量数据采集管理",
    text,
    count=1,
)
```

- 主章使用 `## n. 标题`，小节使用 `### n.n 标题`，更深层级使用 `####`。
- 结构归一化要在公式和内联数学修复之后再跑一次，因为插入数学标记后可能暴露新的标题边界。

验收：

```bash
rg -n "^## |^### |^- " "<target>.md"
rg -n "<h2 class=\"heading\">(1\\. |2\\. |3\\. |4\\. |5\\. |6\\. |7\\. |8\\. |9\\. |10\\. )" "<target>.html"
```

### 2. 公式 OCR、图片公式和 LaTeX 错误

典型症状：

- Markdown 中残留 `![公式](...formula_pxxx_para_xx.png)`。
- HTML 显示原始 LaTeX `<div class="math-block"><code>...`。
- `\frac` 被 OCR 成控制字符或乱码，例如 `\x0c`。
- 上下标、prime、希腊字母、中文 `\mathrm{...}` 丢失。
- 公式解释段和公式本体错位或缺失。

修复方法：

- 渲染 PDF 对应页面并人工核对公式。
- 把公式写成常量，不内联散落在逻辑中：

```python
FORMULA_REPAIRS = {
    "formula_p017_para_01.png": r"R_N=R+\frac{R_{Y+1}-R}{Y+1}\times N",
}
```

- 按公式图片文件名替换为 Markdown 展示公式：

```python
def math_block(latex: str) -> str:
    return f"$$\n{latex.strip()}\n$$"

def replace_formula_image(text: str, filename: str, latex: str) -> str:
    return re.sub(
        rf"!\[公式\]\([^)]*{re.escape(filename)}\)",
        lambda _match: math_block(latex),
        text,
        count=1,
    )
```

- 公式说明段与公式一起修，避免只补公式不补变量解释。
- 内联变量统一包成 `$...$`，例如 `$R_N$`、`$T_1$`、`$P_{\mathrm{市场费率}}$`。
- HTML 生成后调用公式渲染后处理，确保没有原始 `<code>` 公式块。
- 对需要业务口径复核的公式，结构化 JSON 可保留 `review_required=true`，但不要算作未恢复公式。

验收：

```bash
rg -n '<div class="math-block"><code>|!\[公式\]|formula_p[0-9]+_para' "<target>.md" "<target>.html" ZC_HTML ZC_STRUCTURED
```

并检查：

- Markdown `$$...$$` 数量等于结构化 JSON `formula_count`。
- `unresolved_formula_count == 0`，除非报告中明确说明保留原因。

### 3. 水印、页码、时间戳和 OCR 噪声

典型症状：

- 页面斜水印、IP、日期、时间戳混入正文。
- 公司名水印被识别成章节或正文。
- 页码、页眉、页脚成为孤立段落。
- 噪声字符导致标题误判。

修复方法：

- 在基础解析阶段识别重复水印和已知噪声词。
- 在文档级 QA 修复中再次清理：

```python
text = re.sub(r"(?m)^.*?(?:北京小桔|京小桔|新能源汽车|技有限公).*?\n?", "", text)
text = re.sub(r"(?m)^\s*[0-9]{1,3}\s*$\n(?=\n?## )", "", text)
```

- 删除目录之后、正文之前的 heading-only 垃圾块。
- 清噪之后必须重新跑标题和列表归一化，避免噪声删除后产生新粘连。

验收：

```bash
rg -n "INLINE_MATH|@@IM|京小桔|新能源汽车|北京小桔|formula_p|\\x0c" "<target>.md" "<target>.html" ZC_HTML ZC_STRUCTURED
```

### 4. 附件和名词解释结构错位

典型症状：

- `附件`、`附件1`、`附件2` 缺失。
- `名词解释` 与正文粘连。
- 附件目录条目重复成为正文标题。
- 附件 1 和附件 2 的边界错乱。

修复方法：

- 对附件内容短、结构稳定的文件，直接定义权威附件块常量。
- 用稳定起止锚点替换附件尾段：

```python
METER_ATTACHMENT_SECTION = """## 附件

### 名词解释

电能计量点：...
"""

text = re.sub(
    r"## 附件\s*\n+名词解释.*\Z",
    lambda _match: METER_ATTACHMENT_SECTION.rstrip(),
    text,
    count=1,
    flags=re.S,
)
```

- 多附件文件要显式恢复 `## 附件1`、`## 附件2` 及目录列表。

验收：

```bash
rg -n "^## 附件|^### 名词解释|^- 附件" "<target>.md"
```

### 5. OCR 压扁表格

典型症状：

- 表格变成长段文字或单列列表。
- 合并单元格丢失。
- 数值被水印清理误删，例如 `1`、`2`、`0.2`、`0.2S`。
- HTML 表格正确但 JSON 表节点仍旧是旧结构。

修复方法：

- 从 PDF 页面图像重建 Markdown 表格，不信任压扁 OCR 文本。
- 在结构化 JSON 中同步修复 `tables`：

```python
structured["tables"] = [
    build_resolved_table(
        table_id,
        "表 1 电能计量装置分类细则",
        ["类型", "分类要求"],
        rows,
        "表 1 电能计量装置分类细则",
    )
]
quality["table_count"] = len(structured["tables"])
quality["unresolved_table_count"] = 0
```

- 表格标题、表头、行数、关键数值要和 PDF 页面逐项核对。

验收：

```bash
python3 -c "import json, pathlib; d=json.loads(pathlib.Path('<structured.json>').read_text()); print(d['quality_report'].get('table_count'), d['quality_report'].get('unresolved_table_count'))"
```

### 6. 编号列表、条文和正文误切

典型症状：

- `（1）...（2）...` 粘在同一段。
- `1）`、`2）` 被接在上一句后面。
- 正文里的 `1.` 被误提升成标题。
- `第X条...第Y条` 粘连。

修复方法：

- 先拆粘连条文，再做标题判定。
- 标题识别要看长度和上下文，正文列表不要随意升成 `##`。
- 对具体文档保留例外规则，例如注册文件中 `2. 基本信息` 应保留正文条目，而不是章节。

常用规则：

```python
text = re.sub(r"(按以下规则拟合)1）", r"\1：\n\n1）", text)
text = re.sub(r"(进行(?:拟合)?补全)2）", r"\1\n\n2）", text)
text = re.sub(r"(?<!^)(?<!\n)(第[一二三四五六七八九十百千万零〇两]+条)", r"\n\n\1", text)
```

验收：

```bash
rg -n "第[一二三四五六七八九十]+条.*第[一二三四五六七八九十]+条|（1）.*（2）|1）.*2）" "<target>.md"
```

## 推荐脚本结构

每个专项修复脚本建议保持这个骨架：

```python
ROOT = Path("/Users/didi/Documents/codex售电市场政策结构化")
POLICY_DIR = ROOT / "湖南交易中心" / "2026年执行政策"
ZC_HTML_DIR = POLICY_DIR / "ZC_HTML"
ZC_STRUCTURED_DIR = POLICY_DIR / "ZC_STRUCTURED"
STEM = "目标文件名不含后缀"

def backup(paths: list[Path]) -> Path:
    ...

def repair_markdown(text: str) -> str:
    text = cleanup_noise(text)
    text = repair_formulas(text)
    text = normalize_structure(text)
    return text.strip() + "\n"

def rebuild_outputs(pdf: Path) -> dict:
    md_path = pdf.with_suffix(".md")
    md_path.write_text(repair_markdown(md_path.read_text(encoding="utf-8")), encoding="utf-8")

    html_path = md_to_html.convert_file(md_path)
    html_text = render_formula_blocks(html_path.read_text(encoding="utf-8"))
    html_path.write_text(html_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{pdf.stem}.html").write_text(html_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{pdf.stem}.zc_skill.html").write_text(html_text, encoding="utf-8")

    base_report = md_to_json.load_base_report(pdf, ZC_HTML_DIR)
    structured = postprocess_structured(md_to_json.parse_markdown(md_path, base_report))
    json_text = json.dumps(structured, ensure_ascii=False, indent=2)
    (ZC_STRUCTURED_DIR / f"{pdf.stem}.structured.json").write_text(json_text, encoding="utf-8")
    (ZC_STRUCTURED_DIR / f"{pdf.stem}.zc_skill.structured.json").write_text(json_text, encoding="utf-8")
    (ZC_HTML_DIR / f"{pdf.stem}.json").write_text(json_text, encoding="utf-8")
    return structured
```

## 通用验收清单

修复完成前至少跑这些检查：

```bash
python3 scripts/validate_hunan_policy_parse_outputs.py

rg -n '<div class="math-block"><code>|INLINE_MATH|@@IM|formula_p[0-9]+_para|!\[公式\]|<figure class="formula-figure"|<img[^>]+formula' \
  "/Users/didi/Documents/codex售电市场政策结构化/湖南交易中心/2026年执行政策"

rg -n "京小桔|新能源汽车|北京小桔|技有限公|\\x0c|默认设置 至|若 到" \
  "/Users/didi/Documents/codex售电市场政策结构化/湖南交易中心/2026年执行政策"
```

单文件检查：

```bash
rg -n "^## |^### |^#### |^- " "<target>.md"

python3 -c "import json, pathlib; p=pathlib.Path('<structured.json>'); d=json.loads(p.read_text()); print(d['quality_report']); print([(c.get('number'), c.get('title')) for c in d.get('chapters', [])])"

shasum "<target>.html" "ZC_HTML/<target>.html" "ZC_HTML/<target>.zc_skill.html"
```

通过标准：

- 主章节数量和标题与 PDF 目录一致。
- Markdown、HTML、JSON 三类产物内容同步。
- 公式块数量一致，`unresolved_formula_count == 0`。
- HTML 无原始 `<code>` 公式块。
- 无公式图片占位、OCR 哨兵、水印、页码、时间戳残留。
- 表格数量、表头、行数、关键数值与 PDF 页面一致。
- 附件、名词解释、附表结构完整。
- 修复脚本可重复运行，不会把已修好的标题或目录再次改坏。

## 何时写专项脚本，何时放入批量 QA

- 单个文档有大量公式、表格或特殊章节时，写专项脚本，例如 `fix_hunan_meter_formula_mapping.py`。
- 多文档都有相同噪声、目录伪标题、附件错位时，沉淀到批量 QA 脚本，例如 `fix_hunan_policy_parse_qa_issues.py`。
- 专项脚本修复出的稳定规则，如果会被批量 QA 覆盖，必须同步到批量 QA，防止回退。
- 只有视觉核对过的公式、表格、附件内容才能写成权威替换常量。

## 已沉淀到本仓库的脚本例子

- `scripts/fix_hunan_spot_formula_mapping.py`：现货规则公式、内联数学、目录和正文粘连修复。
- `scripts/fix_hunan_settlement_formula_mapping.py`：结算规则大批公式段落和跨文件修复。
- `scripts/fix_hunan_freq_formula_mapping.py`：调频规则公式和表格节点修复。
- `scripts/fix_hunan_meter_formula_mapping.py`：计量规则目录、标题、表格、光伏拟合公式修复。
- `scripts/fix_hunan_retail_register_formulas.py`：零售/注册文件公式图片替换。
- `scripts/fix_midlong_matching_formula_latex.py`：中长期匹配算法公式恢复。
- `scripts/fix_hunan_policy_parse_qa_issues.py`：跨文件目录、附件、水印、条文、QA 兜底修复。
- `scripts/validate_hunan_policy_parse_outputs.py`：最终产物一致性和残留噪声检查。
