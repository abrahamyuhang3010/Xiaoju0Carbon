# BOSS 前端间距规范 (Spacing Spec)

> 适用项目：`/Users/didi/Desktop/projects/BOSS`（纯静态 JS 预览项目，样式集中在 `styles.css`）。
> 版本：1.0（2026-07-15）。

## 1. 目标

对全站页面/组件的**间距**进行统一化、规范化：消除散落的硬编码 `px` 值，统一到一套基于 **4px 网格** 的设计 token，使所有页面的组件间距、内外边距遵循同一刻度。

**范围**：仅调整设计规范（间距 token 化 + 偏移值对齐到网格），不改动任何页面内容与交互功能。

## 2. 适用属性

间距 token 仅用于下列「间距」语义的 CSS 属性：

| 属性 | 是否 token 化 |
|------|--------------|
| `padding` / `padding-*` | ✅ |
| `margin` / `margin-*` | ✅ |
| `gap` / `row-gap` / `column-gap` | ✅ |
| `width` / `height` / `min-*` / `max-*` | ❌（结构尺寸，不在间距范围） |
| `border-radius` | ❌（圆角，使用 `--radius-*`） |
| `top` / `left` / `right` / `bottom` / `inset` | ❌（定位偏移，多为锚点值，不强制对齐） |
| `border-width` | ❌（边框宽度） |
| `font-size` / `line-height` | ❌（排版尺寸） |

## 3. 间距 Token 刻度（4px 网格）

在 `styles.css` 的 `:root` 中定义：

```css
/* —— 间距规范 Spacing tokens（4px 网格）—— */
--space-0: 2px;   /* 微间距：图标↔文字、紧凑徽标 */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;  /* 基准间距 */
--space-5: 20px;
--space-6: 24px;
--space-7: 28px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px; /* 结构性大间距 */
--space-22: 88px; /* 刻意宽间距（多列筛选网格列间距） */
```

> `--space-0` 取 2px 是为保留紧凑 UI（图标按钮、徽标）所需的微间距，避免被强行拉到 4px 而破坏紧凑外观。`1px` 视为边框级数值，不纳入间距 token。

## 4. 原值 → Token 映射表

历史散落值就近对齐到上述刻度（四舍五入到最近的网格 token）：

| 原值 | Token | 实际值 |
|------|-------|--------|
| 1px | 保留 | 1px |
| 2px | `--space-0` | 2px |
| 3px | `--space-0` | 2px |
| 4px | `--space-1` | 4px |
| 5px | `--space-1` | 4px |
| 6px | `--space-2` | 8px |
| 7px | `--space-2` | 8px |
| 8px | `--space-2` | 8px |
| 9px | `--space-2` | 8px |
| 10px | `--space-3` | 12px |
| 11px | `--space-3` | 12px |
| 12px | `--space-3` | 12px |
| 13px | `--space-3` | 12px |
| 14px | `--space-4` | 16px |
| 15px | `--space-4` | 16px |
| 16px | `--space-4` | 16px |
| 18px | `--space-4` | 16px |
| 20px | `--space-5` | 20px |
| 22px | `--space-6` | 24px |
| 24px | `--space-6` | 24px |
| 26px | `--space-7` | 28px |
| 28px | `--space-7` | 28px |
| 30px | `--space-7` | 28px |
| 32px | `--space-8` | 32px |
| 36px | `--space-8` | 32px |
| 38px | `--space-10` | 40px |
| 40px | `--space-10` | 40px |
| 42px | `--space-12` | 48px |
| 48px | `--space-12` | 48px |
| 52px | `--space-12` | 48px |
| 56px | `--space-12` | 48px |
| 64px | `--space-16` | 64px |
| 86px | `--space-22` | 88px |

## 5. 使用约定

- 新增样式一律使用 `var(--space-*)`，禁止再写裸 `px` 间距。
- 多值简写按位置分别替换，例如 `padding: 0 22px 16px` → `padding: 0 var(--space-6) var(--space-4)`。
- 含 `0` 的间距保持 `0`（不写成 `var(--space-0)`），保留简写语义。
- 响应式断点（`@media`）内同样遵循本规范。

## 6. 变更范围记录

- 修改文件：`styles.css`（间距 token 化 + 偏移值对齐）。
- 未修改：`main.js`、`src/**`（JS 中无内联间距样式，间距全在 CSS）。
- 功能/内容：零改动，仅视觉间距规范化。
