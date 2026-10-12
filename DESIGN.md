---
name: Superpowers 中文源码学习手册
description: 浅纸色与深绿色的中文译注本阅读界面
colors:
  paper: '#fffef9'
  canvas: '#f5f4ee'
  ink: '#23352f'
  muted: '#53655d'
  green: '#164d3d'
  green-hover: '#0d382b'
  pale: '#e9efe6'
  line: '#d8ded4'
  code: '#edf0e9'
  white: '#fff'
  danger: '#8b3a24'
  focus: '#48785b'
  file-active: '#dde8da'
  annotation: '#f5f7f0'
  preview: '#f4f6ef'
typography:
  display:
    fontFamily: '"Noto Serif SC","Source Han Serif SC","Songti SC","STSong",serif'
    fontSize: clamp(29px,3vw,42px)
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: -.02em
  headline:
    fontFamily: '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",system-ui,sans-serif'
    fontSize: 23px
    fontWeight: 650
    lineHeight: 1.4
  body:
    fontFamily: '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",system-ui,sans-serif'
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.8
  reading:
    fontFamily: '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",system-ui,sans-serif'
    fontSize: 16px
    lineHeight: 2
  action:
    fontFamily: '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",system-ui,sans-serif'
    fontSize: 14px
    fontWeight: 550
    lineHeight: 1.5
  mono:
    fontFamily: '"SFMono-Regular",Consolas,"Liberation Mono",monospace'
    fontSize: 13px
    lineHeight: 1.75
rounded:
  inline: 3px
  tree: 4px
  panel: 5px
  control: 6px
  preview: 7px
  diagram: 8px
spacing:
  compact: 6px
  small: 12px
  medium: 16px
  large: 24px
  section: 28px
  desktop-gutter: 56px
  mobile-gutter: 23px
components:
  button-primary:
    backgroundColor: '{colors.green}'
    textColor: '{colors.white}'
    typography: '{typography.action}'
    rounded: '{rounded.control}'
    padding: 11px 20px
  button-primary-hover:
    backgroundColor: '{colors.green-hover}'
  button-secondary:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.green}'
    typography: '{typography.action}'
    rounded: '{rounded.control}'
    padding: 9px 14px
  button-secondary-hover:
    backgroundColor: '{colors.pale}'
  field:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.panel}'
    padding: 10px 12px
  navigation:
    textColor: '{colors.muted}'
    height: 78px
  tag:
    backgroundColor: '{colors.pale}'
    textColor: '{colors.green}'
    rounded: '{rounded.tree}'
    padding: 2px 7px
  preview-panel:
    backgroundColor: '{colors.preview}'
    rounded: '{rounded.preview}'
  original-source:
    backgroundColor: '{colors.code}'
    textColor: '{colors.ink}'
    typography: '{typography.mono}'
    rounded: '{rounded.panel}'
    padding: 18px
---

# Design System: Superpowers 中文源码学习手册

## Overview

**Creative North Star: "中文译注本"**

界面像一本可以检索的中文译注本。浅纸色承载正文，深绿色标示链接、当前路径和主要操作；衬线标题提供书页气质，中文无衬线正文保持清晰。

目录紧凑，正文留出段落呼吸，中文解释与英文原文各有层次。视觉服务于持续阅读与理解，延续用户已确认的浅纸色与深绿方向。

**Key Characteristics:**
- 浅纸色正文与略深的目录底色。
- 深绿色贯穿链接、选中导航与操作。
- 中文标题、正文和源码各有清晰字体分工。
- 细分隔线建立结构，轻底色区分解释与原文。

来源：当前 `app/style.css`、`app/index.template.html`、`app/app.js`；提取日期 2026-10-12。frontmatter 为规范 token，侧车保存该格式无法表达的断点、动效、阴影和组件状态。

## Colors

纸色与低饱和深绿色构成主体。下列名称对应 frontmatter；侧车八阶 OKLCH 色阶仅供预览，是按源色计算的衍生值，当前生产 CSS 没有使用这些色阶。

### Primary

- **深林绿**（`green`）：链接、品牌线稿、主要按钮与当前导航。
- **浓林绿**（`green-hover`）：主要按钮悬停加深。
- **浅叶色**（`pale`）：悬停底色、元信息标签、一般提示。
- **叶影色**（`file-active`）：当前目录文件的底色。
- **苔绿焦点**（`focus`）：键盘可见焦点轮廓。

### Neutral

- **暖白纸面**（`paper`）：页头、阅读正文、表单与次要按钮。
- **浅灰纸背**（`canvas`）：外层画布与目录。
- **深墨绿**（`ink`）：基础文字；**灰绿文字**（`muted`）：辅助说明与元信息。
- **细灰绿线**（`line`）：列表、段落和容器的边界。
- **浅灰代码纸**（`code`）：代码与展开的原文。
- **纯白**（`white`）：深绿控件上的文字。
- **注释纸色**（`annotation`）：教学解释；**预览纸色**（`preview`）：Skill 预览。
- **赭红错误**（`danger`）：表单错误文字，属于语义提醒。

历史材料提醒另用当前 CSS 的羊皮纸色底、棕字与细边线；不要与一般教学解释混用。

## Typography

**Display Font:** frontmatter `display` 的中文衬线栈。

**Body Font:** `body` 的中文无衬线栈。

**Label/Mono Font:** 标签沿用正文栈，源码与路径使用 `mono` 的系统等宽栈。当前实现无外部字体加载；安装字体不同会带来允许的字形差异。

| Role | 用途 |
| --- | --- |
| `display` | 自适应字号的衬线页面主标题。 |
| `headline` | 二级标题。 |
| `body` | 普通正文与界面基础文字。 |
| `reading` | 中文释义，宽度上限 75ch。 |
| `action` | 主要、次要和文字按钮。 |
| `mono` | 展开的原文与源码。 |

目录文件项为 12px，说明标签以 11–13px 为主。760px 及以下页面主标题为 30px，文件标题为 27px，中文释义为 15px / 2，展开源码为 11px。以上均为现有响应式覆盖值。

**The Three Voices Rule.** 标题用中文衬线栈，正文用中文无衬线栈，路径与源码用等宽栈。

## Layout

桌面为侧栏树与正文两栏，页头在滚动顶部保持可见。默认页头高 78px、侧栏宽 282px；正文容器最大宽 1110px，内边距为 43px 56px 75px。

| 视口条件 | 实际覆盖 |
| --- | --- |
| ≥1600px | 侧栏 300px，正文顶边距 55px。 |
| ≤1200px | 侧栏 255px，正文内边距 36px 36px 65px。 |
| ≤1000px | 侧栏 230px，正文内边距 33px 27px 55px；练习与预览改成单栏。 |
| ≤760px | 页头 116px，品牌与导航分两行；目录成为 `min(330px,86vw)` 抽屉；正文内边距 30px 23px 53px。 |

目录紧凑、正文疏朗。frontmatter 的 spacing 记录实际常用尺寸，不代表项目存在未经实现的等比间距尺度。练习桌面双栏间距为 35px，1200px 及以下减为 24px。

架构图在较窄视口保留 620px 最小宽度并独立滚动；手机表格也可独立滚动。路径允许换行。打印样式隐藏导航与操作区，正文展开铺满。

## Elevation & Depth

主体通过底色、分隔线与文字层级表达深度。预览面板有边框和稍深底色，没有常驻阴影。实际阴影只有以下三类：

- 抽屉：`8px 0 30px #23352f1c`，表达遮挡。
- 提示条：`0 6px 20px #23352f25`，区分短暂提示与正文。
- 段落定位：`0 0 0 14px #f0f5e9`，向外扩展同色背景，不制造浮起效果。

**The Quiet Surface Rule.** 正文与列表保持平面；阴影只承担抽屉遮挡、临时提示和段落定位。

抽屉过渡为 0.22s，使用 `cubic-bezier(.16,1,.3,1)`。减少动态效果偏好关闭抽屉过渡与平滑滚动。按钮没有额外位移动效。

## Shapes

浅圆角与 1px 细边框为主。`inline` 圆角用于行内代码，`tree` 用于目录与解释，`panel` 用于字段与源码，`control` 用于操作按钮，`preview` 用于预览容器，`diagram` 用于图外框。具体数值见 frontmatter。

顶栏选中状态用 3px 底线，练习步骤选中状态用 2px 底线。文件树细竖线表达嵌套层级。

## Components

### Buttons

主要按钮为深绿底、纯白字，悬停加深；次要按钮为纸面底、绿色字与浅边线，悬停转为浅叶色。文字按钮无外框，悬停出现下划线。主要和次要按钮的内边距、圆角见 frontmatter。文字按钮为 6px 0 内边距。

按钮图文间隔为 9px，常规图标为 17px。禁用按钮透明度为 0.55，使用不可操作光标。所有可聚焦控件保留 3px 可见焦点轮廓与 4px 外偏移。

### Chips

元信息标签使用浅叶底、深绿字，是静态标注。平台筛选按钮未选中时为透明底加边线，选中时为深绿底和纯白字；不要把可操作筛选与静态标签混用。

### Cards / Containers

正文和课程列表用分隔线组织。Skill 预览是浅底、细边框、轻圆角容器；桌面粘附在页头下 28px，1000px 及以下回到普通文档流。头部内边距为 12px 17px，源码内边距为 19px。

### Inputs / Fields

练习字段使用纸面底、1px 描边和 panel 圆角，内边距见 frontmatter。字号为 14px、行高 1.8；多行字段最小高 138px，允许竖向调整。错误保留文字说明并使用 danger。

目录筛选与全站搜索各自通过 `focus-within` 轮廓表达聚焦，外偏移分别为 2px 和 3px。搜索容器里的输入去除内边框，容器焦点线必须保留。

### Navigation

顶栏未选项为灰绿，当前项为深绿且增加字重并显示底线；手机第二行可横向滚动。文件项悬停用浅叶色，当前文件使用 file-active 底色与深绿字。手机目录抽屉配遮罩和关闭按钮。

### Translation and Original

中文释义在段落主层，教学解释用 annotation 底色、深绿标签和灰绿字，桌面字号为 13px / 1.9，手机改为纵向 12px。原文通过原生 `details/summary` 按需展开，摘要为绿色 12px。内容以 code 底色、等宽字体呈现，最大高度 620px。原始代码保留单行并独立横向滚动；教学代码示例遵循现有换行规则。

## Do's and Don'ts

### Do:
- **Do** 保留现有纸色、深绿与细线的阅读语言。
- **Do** 保留按钮可见焦点及搜索容器的聚焦轮廓。
- **Do** 让长文件路径换行，让源码和宽表格独立滚动。
- **Do** 尊重减少动态效果偏好。

### Don't:
- **Don't** 给普通正文与列表添加常驻浮起阴影。
- **Don't** 把教学解释与原始源码混排成同一代码块。
- **Don't** 为当前离线字体栈添加外部加载依赖。
